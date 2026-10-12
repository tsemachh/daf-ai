#!/usr/bin/env python3
"""pack_daf.py — one compact, segment-aligned study pack per daf (the ONLY input the writer reads).

    python tools/pack_daf.py --cache <daf-ai-sources> --slug berachot --daf 2 [--out pack.md]

Per segment of both amudim: G = Gemara (niqqud stripped), S = Hebrew Steinsaltz (HTML stripped),
R = Rashi, M = auto-detected shakla-vetarya moves (hints). Then:
  * the first segments of the NEXT daf (to finish a sugya that runs over the page break),
  * the previous daf's last sugya from data/ (for the "המשך מדף" opening),
  * the Sinai summary (sinai.txt), if cached — a cross-check of the flow, never copied.
English Steinsaltz, vocalised text and raw API metadata are left out on purpose (token cost).
"""
import argparse, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NIQ = re.compile(r'[֑-ׇ]')
TAG = re.compile(r'<[^>]+>')
MARKERS = ['מיתיבי', 'איתיביה', 'איתיבי', 'ורמינהו', 'מאי טעמא', 'מנא הני מילי', 'מנהני מילי',
           'למאי נפקא מינה', 'וליגמר', 'בשלמא', 'הכא במאי עסקינן', 'לא קשיא', 'שאני', 'דלמא', 'דילמא',
           'ממאי', 'איכא דאמרי', 'לישנא אחרינא', 'תא שמע', 'תניא נמי הכי', 'תניא כוותיה', 'תיובתא',
           'קשיא', 'שמע מינה', 'ואיבעית אימא', 'איבעיא להו', 'תיקו', 'והא ', 'ולא?', 'אמר מר',
           'פשיטא', 'מהו דתימא', 'קא משמע לן', 'מתני׳', 'גמ׳', 'הדרן']
NEXT_SEGS = 8


def clean(t):
    t = NIQ.sub('', TAG.sub('', t or '')).replace('־', '-')
    return re.sub(r'\s+', ' ', t).strip()


def load(path):
    if not os.path.exists(path):
        return None
    j = json.load(open(path, encoding='utf-8'))
    return j['segments'] if 'segments' in j else j.get('he')


def amud(cache, slug, daf, a):
    d = os.path.join(cache, slug, str(daf))
    g = load(os.path.join(d, f'sefaria_he_{a}.json'))
    if g is None:
        return None
    s = load(os.path.join(d, f'steinsaltz_he_{a}.json')) or []
    r = load(os.path.join(d, f'rashi_he_{a}.json')) or []
    return g, s, r


def seg_lines(label, i, g, s, r):
    out = [f'[{label}.{i}] G: {clean(g)}']
    if s:
        out.append(f'  S: {clean(s)}')
    rr = r if isinstance(r, list) else [r]
    rt = ' | '.join(clean(x) for x in rr if x)
    if rt:
        out.append(f'  R: {rt}')
    m = [k.strip() for k in MARKERS if k in clean(g)]
    if m:
        out.append(f'  M: {", ".join(dict.fromkeys(m))}')
    return out


def build(cache, slug, daf):
    meta_p = os.path.join(cache, slug, str(daf), 'meta.json')
    meta = json.load(open(meta_p, encoding='utf-8')) if os.path.exists(meta_p) else {}
    out = [f'# {meta.get("tractate_he", slug)} {daf} ({meta.get("tractate", "")})',
           'Format: [<daf><amud>.<seg>] G=Gemara S=Steinsaltz R=Rashi M=detected moves (hints only)', '']
    for a in 'ab':
        am = amud(cache, slug, daf, a)
        if not am:
            continue
        g, s, r = am
        out.append(f'## {daf}{a}')
        for i, seg in enumerate(g, 1):
            out += seg_lines(f'{daf}{a}', i, seg, s[i-1] if i-1 < len(s) else '', r[i-1] if i-1 < len(r) else [])
        out.append('')
    nx = amud(cache, slug, daf + 1, 'a')
    if nx:
        g, s, r = nx
        out.append(f'## {daf+1}a — opening of the NEXT daf (only to finish a sugya that runs over; covered in full tomorrow)')
        for i, seg in enumerate(g[:NEXT_SEGS], 1):
            out += seg_lines(f'{daf+1}a', i, seg, s[i-1] if i-1 < len(s) else '', r[i-1] if i-1 < len(r) else [])
        out.append('')
    prev = os.path.join(ROOT, 'data', slug, f'{daf-1}.json')
    if os.path.exists(prev):
        p = json.load(open(prev, encoding='utf-8'))
        last = [x for x in p['sections'] if x.get('steps')][-1]
        out += [f'## Previous daf ({daf-1}) — its last sugya', f'title: {clean(last["title"])}',
                f'ref: {last.get("ref", "")}  ends_next: {bool(last.get("ends_next"))}  cont: {last.get("cont", "")}',
                f'flow: {clean(last.get("flow", ""))}', f'last step: {clean(last["steps"][-1]["body"])}', '']
    dsp = os.path.join(cache, slug, str(daf), 'dafspoiler.txt')
    if os.path.exists(dsp):
        out += ['## Daf Spoiler summary (Rav Naftali Ramati, used with permission) — a case framing per topic; use it to check `unlock` and to find application cases; paraphrase, never copy',
                re.sub(r'\n{2,}', '\n', re.sub(r'[ \t]{2,}', ' ', open(dsp, encoding='utf-8').read().strip())), '']
    sinai = os.path.join(cache, slug, str(daf), 'sinai.txt')
    if os.path.exists(sinai):
        out += ['## Sinai summary (cross-check of flow and conclusions; paraphrase, never copy)',
                re.sub(r'\n{2,}', '\n', open(sinai, encoding='utf-8').read().strip()), '']
    return '\n'.join(out) + '\n'


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--cache', required=True)
    ap.add_argument('--slug', required=True)
    ap.add_argument('--daf', type=int, required=True)
    ap.add_argument('--out')
    a = ap.parse_args()
    out = a.out or os.path.join(a.cache, a.slug, str(a.daf), 'pack.md')
    open(out, 'w', encoding='utf-8').write(build(a.cache, a.slug, a.daf))
    print(out, os.path.getsize(out), 'bytes')
