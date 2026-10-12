#!/usr/bin/env python3
"""backfill_seg.py — give every step of older pages a `seg` (the Gemara segment it explains), by script.

    python tools/backfill_seg.py --cache <daf-ai-sources> data/*/*.json [--dry]

For each sugya, the segments of its ref range are read from the cache. Each step's ״quoted״ Gemara
phrases are matched to those segments (niqqud and punctuation ignored), moving forward through the
sugya; a step without a matching quote takes the segment of the step before it (the first step: the
sugya's first segment). Steps that already have `seg` are left alone. Prints the match rate per page.
"""
import argparse, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fill_srctext import REF  # noqa: E402

NIQ = re.compile(r'[֑-ׇ]')
TAG = re.compile(r'<[^>]+>')


def norm(t):
    t = NIQ.sub('', TAG.sub('', t or ''))
    t = re.sub(r'[^א-ת ]+', ' ', t.replace('־', ' '))
    return re.sub(r'\s+', ' ', t).strip()


def amud_segs(cache, slug, daf, a):
    p = os.path.join(cache, slug, str(daf), f'sefaria_he_{a}.json')
    if not os.path.exists(p):
        return None
    j = json.load(open(p, encoding='utf-8'))
    return j['segments'] if 'segments' in j else j['he']


def expand(cache, slug, ref):
    m = REF.match(ref)
    d1, a1, s1 = int(m['d1']), m['a1'], int(m['s1'])
    d2, a2 = (int(m['d2']), m['a2']) if m['d2'] else (d1, a1)
    s2 = int(m['s2'] or s1)
    out, daf, a, lo = [], d1, a1, s1
    while True:
        g = amud_segs(cache, slug, daf, a)
        if g is None:
            return out
        hi = s2 if (daf, a) == (d2, a2) else len(g)
        out += [(f'{daf}{a}.{i}', norm(g[i - 1])) for i in range(lo, min(hi, len(g)) + 1)]
        if (daf, a) == (d2, a2):
            return out
        daf, a = (daf, 'b') if a == 'a' else (daf + 1, 'a')
        lo = 1


def quotes(body):
    return [norm(q) for q in re.findall(r'״([^״]{2,})״', TAG.sub('', body or '')) if len(norm(q).split()) >= 1]


def run(cache, page, dry=False):
    d = json.load(open(page, encoding='utf-8'))
    tot = hit = 0
    for s in d['sections']:
        if not s.get('ref') or not s.get('steps'):
            continue
        segs = expand(cache, d['slug'], s['ref'])
        if not segs:
            continue
        pos, last = 0, segs[0][0]
        for st in s['steps']:
            if st.get('seg'):
                keys = [k for k, _ in segs]
                if st['seg'] in keys:
                    pos = keys.index(st['seg']); last = st['seg']
                continue
            tot += 1
            found = None
            for q in quotes(st.get('body')):
                ws = q.split()
                probe = ' '.join(ws[:6])
                order = list(range(pos, len(segs))) + list(range(0, pos))   # forward first, then wrap
                for i in order:
                    if probe and probe in segs[i][1]:
                        found = i; break
                if found is not None:
                    break
            if found is not None:
                pos = found; last = segs[found][0]; hit += 1
            st['seg'] = last
    if not dry:
        json.dump(d, open(page, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        open(page, 'a', encoding='utf-8').write('\n')
    return tot, hit


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--cache', required=True)
    ap.add_argument('--dry', action='store_true')
    ap.add_argument('pages', nargs='+')
    a = ap.parse_args()
    T = H = 0
    for p in a.pages:
        t, h = run(a.cache, p, a.dry)
        T += t; H += h
        if t:
            print(f'{p}: {h}/{t} steps matched by quote, the rest inherit the previous step\'s segment')
    print(f'total: {H}/{T} matched ({100 * H // max(1, T)}%)')
