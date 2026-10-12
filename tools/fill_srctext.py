#!/usr/bin/env python3
"""fill_srctext.py — fill a page's `srctext` from the cache, so the model never writes verbatim Gemara.

    python tools/fill_srctext.py --cache <daf-ai-sources> data/<slug>/<daf>.json

For every sugya section with a `ref` (e.g. Bekhorot.18a.12-18b.2 or Bekhorot.18b.17-19a.1) it writes
srctext[ref] = {"t": "בכורות י״ח ע״א – ע״ב", "p": [vocalised segments]} from sefaria_he_{a,b}.json.
Segments listed in the section's optional `skip` (e.g. ["18a.3"]) become a lone "…" (content boundary).
Existing entries are left as they are unless --force.
"""
import argparse, json, os, re

ONES = 'אבגדהוזחט'
TENS = 'יכלמנסעפצ'


def heb(n):
    s = ''
    if n >= 100:
        s += 'קרשת'[n // 100 - 1]; n %= 100
    if n in (15, 16):
        s += 'ט' + ONES[n - 10]
    else:
        if n >= 10: s += TENS[n // 10 - 1]
        if n % 10: s += ONES[n % 10 - 1]
    return s + '׳' if len(s) == 1 else s[:-1] + '״' + s[-1]


REF = re.compile(r'^(?P<tr>[A-Z][A-Za-z_]+)\.(?P<d1>\d+)(?P<a1>[ab])\.(?P<s1>\d+)(?:-(?:(?P<d2>\d+)(?P<a2>[ab])\.)?(?P<s2>\d+))?$')


def segs(cache, slug, daf, a):
    p = os.path.join(cache, slug, str(daf), f'sefaria_he_{a}.json')
    j = json.load(open(p, encoding='utf-8'))
    return j['segments'] if 'segments' in j else j['he']


def fill(cache, page, force=False):
    d = json.load(open(page, encoding='utf-8'))
    slug, he = d['slug'], d['tractate_he']
    src = d.setdefault('srctext', {})
    n = 0
    for s in d['sections']:
        ref = s.get('ref')
        if not ref or (ref in src and not force):
            continue
        m = REF.match(ref)
        if not m:
            raise SystemExit(f'bad ref {ref}')
        d1, a1, s1 = int(m['d1']), m['a1'], int(m['s1'])
        d2, a2 = (int(m['d2']), m['a2']) if m['d2'] else (d1, a1)
        s2 = int(m['s2'] or s1)
        skip = set(s.get('skip', []))
        out, daf, a, first = [], d1, a1, True
        while True:
            g = segs(cache, slug, daf, a)
            lo = s1 if first else 1
            hi = s2 if (daf, a) == (d2, a2) else len(g)
            for i in range(lo, hi + 1):
                key = f'{daf}{a}.{i}'
                if key in skip:
                    if not out or out[-1] != '…':
                        out.append('…')
                else:
                    out.append(g[i - 1])
            if (daf, a) == (d2, a2):
                break
            first = False
            daf, a = (daf, 'b') if a == 'a' else (daf + 1, 'a')
        am = {'a': 'ע״א', 'b': 'ע״ב'}
        t = f'{he} {heb(d1)} {am[a1]}'
        if (d1, a1) != (d2, a2):
            t += f' – {am[a2]}' if d1 == d2 else f' – {heb(d2)} {am[a2]}'
        src[ref] = {'t': t, 'p': out}
        n += 1
    json.dump(d, open(page, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    open(page, 'a', encoding='utf-8').write('\n')
    return n


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--cache', required=True)
    ap.add_argument('--force', action='store_true')
    ap.add_argument('pages', nargs='+')
    a = ap.parse_args()
    for p in a.pages:
        print(p, 'srctext entries written:', fill(a.cache, p, a.force))
