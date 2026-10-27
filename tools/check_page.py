#!/usr/bin/env python3
"""check_page.py — mechanical checks on a daf page, so no model tokens go to them.

    python tools/check_page.py --cache <daf-ai-sources> data/<slug>/<daf>.json

ERRORS (exit 1): a segment of the daf in no section; overlapping section refs; a step without `seg`
(pages made with the slim pipeline); a segment with detected moves (M:) but no step pointing at it;
quiz not 8 or an item without a valid `s`; `p` not pointing back.
REPORT: quote share of step text (target ≤ 30%), steps per section, and GLOSSARY CANDIDATES — sage
names in the step text with no glossary key (the writer adds only these, never reads glossary.json).
"""
import argparse, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pack_daf import MARKERS, clean  # noqa: E402
from fill_srctext import REF  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TAG = re.compile(r'<[^>]+>')
SAGE = re.compile(r'^(רבי|רב|רבן|רבה|רבא|ר׳|ר\'|מר|אביי|שמואל|עולא|בן|בר|אבא|חכמים|רש״י|ת״ק)( |$)')
# a bold phrase of ≥2 words, not already inside ״…״, that is not a sage's name → a Gemara quote missing its marks
BARE = re.compile(r'(?<!״)<b>((?:(?!</b>).)+? (?:(?!</b>).)+?)</b>(?!״)')


def _fix(m):
    return m.group(0) if SAGE.match(m.group(1)) else f'״<b>{m.group(1).replace("״", "")}</b>״'


def fix_quotes(raw):
    raw = raw.replace('״״<b>', '״<b>').replace('</b>״״', '</b>״')   # doubled marks from writers
    return BARE.sub(_fix, raw)


NAME = re.compile(r'(?<![א-ת])((?:רבי|רב|רבן|רבה|רבא|מר|אבא|בר|בן) [א-ת״׳\']+(?: (?:בר|בן|בריה דרב|בריה דרבי|ברבי) [א-ת״׳\']+)?)')


def nseg(cache, slug, daf, a):
    p = os.path.join(cache, slug, str(daf), f'sefaria_he_{a}.json')
    if not os.path.exists(p):
        return 0, []
    j = json.load(open(p, encoding='utf-8'))
    g = j['segments'] if 'segments' in j else j['he']
    return len(g), g


def expand(ref, cache, slug):
    m = REF.match(ref)
    d1, a1, s1 = int(m['d1']), m['a1'], int(m['s1'])
    d2, a2 = (int(m['d2']), m['a2']) if m['d2'] else (d1, a1)
    s2 = int(m['s2'] or s1)
    out, daf, a, lo = [], d1, a1, s1
    while True:
        hi = s2 if (daf, a) == (d2, a2) else nseg(cache, slug, daf, a)[0]
        out += [f'{daf}{a}.{i}' for i in range(lo, hi + 1)]
        if (daf, a) == (d2, a2):
            return out
        daf, a = (daf, 'b') if a == 'a' else (daf + 1, 'a')
        lo = 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cache', required=True)
    ap.add_argument('--no-seg', action='store_true', help='older pages without step seg fields')
    ap.add_argument('--fix-quotes', action='store_true', help='wrap bare multi-word <b> Gemara phrases in ״…״ and save')
    ap.add_argument('page')
    a = ap.parse_args()
    d = json.load(open(a.page, encoding='utf-8'))
    if a.fix_quotes:
        n = 0
        for s in d['sections']:
            for st in s.get('steps', []):
                new = fix_quotes(st.get('body', ''))
                n += new != st.get('body', '')
                st['body'] = new
        json.dump(d, open(a.page, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        open(a.page, 'a', encoding='utf-8').write('\n')
        print('fixed quote marks in', n, 'steps')
    slug, daf = d['slug'], d['daf']
    errs, warn = [], []
    want = {}
    for am in 'ab':
        n, g = nseg(a.cache, slug, daf, am)
        for i in range(1, n + 1):
            want[f'{daf}{am}.{i}'] = [k.strip() for k in MARKERS if k in clean(g[i - 1])]
    seen = {}
    secs = [s for s in d['sections'] if s.get('kind', 'sugya') == 'sugya' and s.get('ref')]
    covers = [s for s in d['sections'] if s.get('ref')]   # raw sections (tables, riddles) with a ref also cover their segments
    for s in covers:
        for k in expand(s['ref'], a.cache, slug):
            if k in seen:
                errs.append(f'{k} in both {seen[k]} and {s["id"]}')
            seen[k] = s['id']
    prevcov = set()
    prev_p = os.path.join(os.path.dirname(os.path.abspath(a.page)), f'{daf - 1}.json')
    if os.path.exists(prev_p):   # the previous daf may finish a sugya into this one (ends_next) — those segments are covered there
        for s in json.load(open(prev_p, encoding='utf-8'))['sections']:
            if s.get('ref'):
                for k in expand(s['ref'], a.cache, slug):
                    if k not in seen:
                        seen[k] = f'daf {daf - 1} {s["id"]}'; prevcov.add(k)
    for k in want:
        if k not in seen:
            errs.append(f'segment {k} is in no section')
    stepsegs, body, quoted = set(), 0, 0
    for s in secs:
        for i, st in enumerate(s.get('steps', [])):
            if 'p' in st and not (0 <= st['p'] < i):
                errs.append(f'{s["id"]} step {i}: p={st["p"]} must point back')
            if st.get('seg'):
                stepsegs.add(st['seg'])
            elif not a.no_seg:
                errs.append(f'{s["id"]} step {i}: no seg')
            raw = st.get('body', '')
            if any(not SAGE.match(m.group(1)) for m in BARE.finditer(raw)):
                errs.append(f'{s["id"]} step {i}: Gemara phrase in <b> without ״…״ — write ״<b>…</b>״ (or run with --fix-quotes)')
            t = TAG.sub('', raw)
            body += len(t)
            quoted += sum(len(q) for q in re.findall(r'״([^״]{2,})״', t))
    if not a.no_seg:
        for k, m in want.items():
            if m and k not in stepsegs and k not in prevcov:
                errs.append(f'segment {k} has moves ({", ".join(m)}) but no step')
    for s in d['sections']:   # think boxes: question + collapsed answer
        post = s.get('post') or ''
        if 'think' in post and (post.count('class="think"') + post.count("class='think'")) > post.count('class="ans"'):
            errs.append(f'{s["id"]}: think box without a collapsed answer (div.ans hidden + button.reveal)')
    for s in secs:   # a sugya that opens with a passage from elsewhere usually needs its background set up
        segs0 = nseg(a.cache, slug, int(re.match(r'^[A-Za-z_]+\.(\d+)', s['ref'])[1]), re.match(r'^[A-Za-z_]+\.\d+([ab])', s['ref'])[1])[1]
        try:
            first = clean(segs0[int(re.match(r'^[A-Za-z_]+\.\d+[ab]\.(\d+)', s['ref'])[1]) - 1])
        except (IndexError, TypeError):
            first = ''
        if not s.get('unlock') and re.match(r'^(תנן התם|תניא התם)', first):
            warn.append(f'{s["id"]}: opens with ״{first[:12]}…״ (a new topic) but has no `unlock` — add the background case in 1–2 sentences')
    ns = [st for s in secs for st in s.get('steps', [])]
    miss = sum(1 for st in ns if not st.get('short'))
    if ns and miss and miss < len(ns):
        errs.append(f'{miss} of {len(ns)} steps have no `short` (one-line summary for תמצית)')
    elif ns and miss and not a.no_seg:
        warn.append('no step has `short` (one-line summary for תמצית) — new pages must have it')
    long_ = [st['short'] for st in ns if len((st.get('short') or '').split()) > 14]
    if long_:
        warn.append(f'{len(long_)} `short` lines over 14 words, e.g. ״{long_[0][:40]}…״')
    for s in secs:   # ״לימא כתנאי״ needs its kt box (reader note, Bechorot 39)
        m = re.match(r'^[A-Za-z_]+\.(\d+)([ab])\.(\d+)(?:-(?:(\d+)([ab])\.)?(\d+))?', s['ref'])
        txt = ''
        if m:
            d1, a1, i1 = int(m[1]), m[2], int(m[3]); d2, a2 = (int(m[4]), m[5]) if m[4] else (d1, a1); i2 = int(m[6] or i1)
            for dd, aa in ([(d1, a1)] if (d1, a1) == (d2, a2) else [(d1, a1), (d2, a2)]):
                g = nseg(a.cache, slug, dd, aa)[1]
                lo = i1 if (dd, aa) == (d1, a1) else 1
                hi = i2 if (dd, aa) == (d2, a2) else len(g)
                txt += ' '.join(clean(x) for x in g[lo - 1:hi])
        if re.search(r'(לימא|נימא)\s+כתנאי|כתנאי:', txt) and not s.get('kt'):
            errs.append(f'{s["id"]}: the Gemara asks ״לימא כתנאי״ but the section has no `kt` box (question, two sides, tannaim, rounds)')
    OPN = re.compile(r'^(ו?יתיב|ו?תיב|ו?אמר ליה|אמרו ליה|ו?אמרי ליה|א״ל|הדר|ו?אזל|אתא|אתו|שלחו? ליה|כי אתא)(\s|$)')
    for prv, s in zip(secs, secs[1:]):   # a section opening mid-conversation usually continues the previous one (note #32)
        m = re.match(r'^[A-Za-z_]+\.(\d+)([ab])\.(\d+)', s['ref'])
        g = nseg(a.cache, slug, int(m[1]), m[2])[1] if m else []
        try:
            first = clean(g[int(m[3]) - 1])
        except (IndexError, TypeError):
            first = ''
        if OPN.match(first) and not s.get('new_sugya'):
            warn.append(f'{s["id"]} opens mid-conversation (״{first[:20]}…״) — if it continues {prv["id"]}\'s question or story, '
                        f'merge it into {prv["id"]} as a stage; if it is a new topic, set "new_sugya": true')
    LBL = re.compile(r'^(מקור|ברייתא|משנה|המשך|דיון|סיכום|קושיה|תירוץ|שאלה|שלב|ראיה|תיובתא|מסקנה)\b[^?]{0,25}:')
    for s in secs:   # a stage q is the stage's own question, not a label (note #30)
        for x in s.get('stages') or []:
            if LBL.match(x.get('q', '')) or not x.get('q', '').rstrip().endswith('?'):
                errs.append(f'{s["id"]}: stage q ״{x.get("q","")[:40]}״ — write the question the stage asks (״מה המקור ש…?״), not a label')
    for s in secs:   # milestones of long sugyot
        n_ = len(s.get('steps', [])); sg = s.get('stages')
        if sg:
            ats = [x.get('at') for x in sg]
            if ats[0] != 0 or any(not isinstance(a_, int) for a_ in ats) or ats != sorted(set(ats)) or ats[-1] > n_ - 2 \
                    or any(b_ - a_ < 2 for a_, b_ in zip(ats, ats[1:] + [n_])) or not all(x.get('q') and x.get('a') for x in sg):
                errs.append(f'{s["id"]}: bad `stages` (first at 0, increasing, ≥2 steps each, q and a) — {ats} of {n_} steps')
        elif n_ >= 10 and not a.no_seg:
            errs.append(f'{s["id"]}: {n_} steps but no `stages` (2–5 milestones with q/a)')
    for s in d['sections']:   # aids readable on a phone (reader notes #9, #26)
        t_ = s.get('table') or {}
        lab = [r[0] for r in t_.get('rows', []) if r] + [c_ for c_ in t_.get('cols', []) if c_]
        lng = [x for x in lab if len(TAG.sub('', str(x)).split()) > 7]
        if lng:
            warn.append(f'{s["id"]}: table label over 7 words (״{TAG.sub("", str(lng[0]))[:30]}…״) — keep row labels short (≤6 words) so the columns stay balanced')
        if len((s.get('seq') or {}).get('items', [])) > 8:
            warn.append(f'{s["id"]}: `seq` has {len(s["seq"]["items"])} cards — ≤8')
        for st in s.get('steps', []):   # ״…״ opens Steinsaltz: only Gemara words (note #14)
            for q_ in re.findall(r'״([^״]{2,40})״', TAG.sub('', st.get('body', ''))):
                if re.match(r'^(ב?דף [א-ת]|בעמוד [אב]|לעיל)', q_):
                    errs.append(f'{s["id"]}: ״{q_}״ is a page reference, not Gemara — write it without quote marks')
    # worked-numbers boxes: every row and total is [label, value] or [label, value, cite] — a bare string breaks the
    # two-column layout (it was split letter by letter: ״ס״ | ״ך״), and the cite is for readers (״משנה״, ״ו׳ ע״א״), not a seg id
    for s in d['sections']:
        for c_ in ([s['calc']] if isinstance(s.get('calc'), dict) else s.get('calc') or []):
            for part in ('rows', 'lines'):
                for r_ in c_.get(part, []):
                    if not (isinstance(r_, list) and 2 <= len(r_) <= 3 and all(isinstance(x, str) for x in r_)):
                        errs.append(f'{s["id"]}: calc {part} item must be [label, value] or [label, value, cite] — got {str(r_)[:50]}; put explanations in `note`')
                    elif len(r_) == 3 and re.fullmatch(r'\d+[ab]\.\d+', r_[2].strip()):
                        errs.append(f'{s["id"]}: calc cite ״{r_[2]}״ is a segment id — write a source a reader knows (משנה, ברייתא, רש״י, ו׳ ע״א)')
    # our own drawings (content/figs/*.svg): every label names its Gemara line (data-seg) and says nothing the sugya
    # doesn't — its words must be found in the Gemara, Rashi or our explanation of this daf (no invented terms)
    figs = [(s['id'], f['src']) for s in d['sections'] for f in s.get('fig', [])]
    if figs:
        corpus = ' '.join(TAG.sub('', st.get('body', '')) for s in d['sections'] for st in s.get('steps', []))
        corpus += ' ' + ' '.join(clean(x) for am in 'ab' for x in nseg(a.cache, slug, daf, am)[1])
        for am in 'ab':
            rp = os.path.join(a.cache, slug, str(daf), f'rashi_he_{am}.json')
            if os.path.exists(rp):
                corpus += ' ' + clean(json.dumps(json.load(open(rp, encoding='utf-8')), ensure_ascii=False))
        norm = lambda t: re.sub(r'[\u0591-\u05C7״׳"\'()\[\]:;,.·—\-–?!]', ' ', t)
        corpus = ' ' + ' '.join(norm(corpus).split()) + ' '
        STOP = {'ר', 'רבי', 'של', 'את', 'כל', 'או', 'גם', 'לא', 'אם', 'על', 'עם', 'זה', 'זו', 'הוא', 'היא'}
        for sid, src in figs:
            fp = os.path.join(ROOT, 'content', 'figs', src + '.svg')
            if not os.path.exists(fp):
                errs.append(f'{sid}: fig {src}.svg not found'); continue
            for attrs, lab in re.findall(r'<text([^>]*)>([^<]*)</text>', open(fp, encoding='utf-8').read()):
                sg = re.search(r'data-seg="([^"]+)"', attrs)
                if not sg:
                    errs.append(f'{sid}: fig {src}: label ״{lab}״ has no data-seg (the Gemara line it comes from)'); continue
                if sg.group(1) not in want and sg.group(1) not in stepsegs:
                    errs.append(f'{sid}: fig {src}: label ״{lab}״ data-seg={sg.group(1)} is not a line of this daf')
                toks = [t for t in norm(lab).split() if len(t) > 1 and t not in STOP]
                miss = [t for t in toks if not any(f' {v}' in corpus for v in [t] + [x + t for x in 'והבלמשכד'] + ([t[1:]] if t[0] in 'והבלמשכד' and len(t) > 2 else []))]
                if toks and len(miss) > len(toks) // 4:
                    errs.append(f'{sid}: fig {src}: label ״{lab}״ — words not in the Gemara/Rashi/explanation: {", ".join(miss)}')
    nu = sum(1 for s in secs if s.get('unlock'))
    if secs and nu > max(1, len(secs) // 3):
        warn.append(f'{nu} of {len(secs)} sugyot have an `unlock` — keep it only where a learner jumping in would miss the case (aim ≤ 1/3)')
    q = d.get('quiz', [])
    ids = {s['id'] for s in d['sections']}
    if len(q) != 8:
        errs.append(f'quiz has {len(q)} items (need 8)')
    for i, it in enumerate(q):
        if it.get('s') not in ids:
            errs.append(f'quiz {i}: s={it.get("s")} is not a section id')
    gl = json.load(open(os.path.join(ROOT, 'data', 'glossary.json'), encoding='utf-8'))
    text = ' '.join(TAG.sub('', st.get('body', '')) for s in secs for st in s.get('steps', []))
    gem = ' '.join(clean(x) for am in 'ab' for x in nseg(a.cache, slug, daf, am)[1])
    names = {n.rstrip('״׳\'') for n in NAME.findall(text)}
    cand = sorted(n for n in names if n in gem and n not in gl and not any(n in k for k in gl))
    share = 100 * quoted // max(1, body)
    print(f'{a.page}: {len(secs)} sugyot, {sum(len(s.get("steps", [])) for s in secs)} steps, quotes {share}% of step text')
    if share > 30:
        warn.append(f'quotes {share}% > 30%: explain more, quote less')
    if cand:
        print('GLOSSARY CANDIDATES (add only if a real name/term):', ', '.join(cand))
    for w in warn:
        print('WARN', w)
    for e in errs:
        print('ERROR', e)
    sys.exit(1 if errs else 0)


if __name__ == '__main__':
    main()
