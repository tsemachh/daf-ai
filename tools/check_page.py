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
            if m and k not in stepsegs:
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
