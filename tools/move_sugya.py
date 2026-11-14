#!/usr/bin/env python3
"""move_sugya.py — move a whole sugya that crosses the daf break from the page that holds it to the other page
(owner rule, 2026-11-14: a sugya that starts at the end of a daf but has its main part on the next daf belongs
to the next daf). Mechanical part only; storyline, thesis, card topics, reading time and the quiz balance are
fixed by hand afterwards (the script prints what is left).

    python tools/move_sugya.py <slug> <N> --to next     # last section of daf N (ends_next) -> first of daf N+1 (starts_prev)
    python tools/move_sugya.py <slug> <N> --to prev     # first section of daf N (starts_prev) -> last of daf N-1 (ends_next)
    python tools/move_sugya.py --scan [--min 0.6]       # list crossing sugyot held on the wrong page

Section ids of the page that keeps its sections are never renumbered: the moved section gets a free id
(next: the lowest free sK before the receiving page's first id, e.g. s1 or s0; prev: one past the last id).
Moved along: srctext, the slide group, quiz items (their 's' is re-pointed — counts then need balancing to 8),
step tags ("… · דף X"), amud label, to_next. The page image (tzurat) rectangles of the moved sugya are dropped
from the giving page; the receiving page shows none for it until its amud is re-aligned.
"""
import argparse, glob, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.environ.get('DAF_CACHE', os.path.join(os.path.dirname(ROOT), 'daf-ai-sources'))
SL = {'Arakhin': 'arachin', 'Bekhorot': 'bechorot', 'Beitzah': 'beitzah', 'Berakhot': 'berachot', 'Keritot': 'keritot',
      'Meilah': 'meilah', 'Niddah': 'niddah', 'Sukkah': 'sukkah', 'Tamid': 'tamid', 'Temurah': 'temurah', 'Shabbat': 'shabbat'}
ONES = 'אבגדהוזחט'; TENS = 'יכלמנסעפצ'


def heb(n):
    s = ''
    if n >= 100: s += 'קרשת'[n // 100 - 1]; n %= 100
    if n in (15, 16): s += 'ט' + ONES[n - 10]; n = 0
    if n >= 10: s += TENS[n // 10 - 1]; n %= 10
    if n: s += ONES[n - 1]
    return s + '׳' if len(s) == 1 else s[:-1] + '״' + s[-1]


def path(slug, n): return os.path.join(ROOT, 'data', slug, f'{n}.json')
def load(slug, n): return json.load(open(path(slug, n), encoding='utf-8'))
def save(slug, n, d): json.dump(d, open(path(slug, n), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
def num(sid): return int(re.sub(r'\D', '', sid) or 0)


def seglens(slug, daf, amud):
    p = os.path.join(CACHE, slug, str(daf), f'sefaria_he_{amud}.json')
    if not os.path.exists(p): return None
    out = []
    for x in json.load(open(p, encoding='utf-8'))['segments']:
        x = x if isinstance(x, str) else ' '.join(x)
        out.append(len(re.sub('[֑-ׇ]', '', re.sub('<[^>]+>', '', x))))
    return out


RX = re.compile(r'^(\w+)\.(\d+)([ab])\.(\d+)-(\d+)([ab])\.(\d+)$')


def split_chars(ref):
    """chars of the ref's text on its first daf and on its second daf (None if the cache lacks it)"""
    m = RX.match(ref or '')
    if not m or m[2] == m[5]: return None
    slug = SL[m[1]]; d1, a1, x1, d2, a2, x2 = int(m[2]), m[3], int(m[4]), int(m[5]), m[6], int(m[7])
    L = R = 0
    for am in (['a', 'b'] if a1 == 'a' else ['b']):
        z = seglens(slug, d1, am)
        if z is None: return None
        L += sum(z[(x1 - 1 if am == a1 else 0):])
    for am in (['a', 'b'] if a2 == 'b' else ['a']):
        z = seglens(slug, d2, am)
        if z is None: return None
        R += sum(z[:(x2 if am == a2 else len(z))])
    return L, R


def scan(minshare):
    """the rule: the earlier daf keeps a crossing sugya only if it holds at least `minshare` of its text"""
    rows = []
    for f in sorted(glob.glob(os.path.join(ROOT, 'data', '*', '*.json'))):
        if not re.search(r'/\d+\.json$', f): continue
        d = json.load(open(f, encoding='utf-8'))
        for s in d.get('sections', []):
            sp = split_chars(s.get('ref'))
            if not sp: continue
            L, R = sp; share = L / (L + R)
            want = 'prev' if share >= minshare else 'next'
            held = 'prev' if s.get('ends_next') else 'next'
            if want != held:
                rows.append((d['slug'], d['daf'], s['id'], s['ref'], round(share, 2), 'next' if want == 'next' else 'prev'))
    return rows


def tag_fix(steps, giver, receiver_daf, to):
    """steps on the other daf carry '… · דף X'; steps on the receiving page's own daf carry none"""
    for st in steps:
        seg = st.get('seg', '')
        m = re.match(r'(\d+)[ab]', seg)
        on = int(m[1]) if m else None
        t = re.sub(r'\s*·\s*דף [^·]+$', '', st.get('tag', ''))
        if on is not None and on != receiver_daf:
            t = f"{t} · דף {heb(on)}"
        st['tag'] = t


def move(slug, n, to):
    if to == 'next':
        gn, rn = n, n + 1
    else:
        gn, rn = n, n - 1
    G, R = load(slug, gn), load(slug, rn)
    s = G['sections'][-1] if to == 'next' else G['sections'][0]
    assert (s.get('ends_next') if to == 'next' else s.get('starts_prev')), 'that section does not cross the break'
    old = s['id']; ids = [x['id'] for x in R['sections']]
    if to == 'next':
        k = num(ids[0]) - 1
        if k < 0 or f's{k}' in ids: raise SystemExit(f'no free id before {ids[0]} on {slug}/{rn}')
        new = f's{k}'
        s.pop('ends_next', None); s['starts_prev'] = True
        s['amud'] = f"עמוד א · מתחיל בדף {heb(gn)}"
        R['sections'].insert(0, s); G['sections'].pop()
    else:
        new = f's{max(num(i) for i in ids) + 1}'
        s.pop('starts_prev', None); s['ends_next'] = True
        s['amud'] = f"עמוד ב · נמשך לדף {heb(gn)}"
        R['sections'].append(s); G['sections'].pop(0)
    s['id'] = new
    tag_fix(s['steps'], gn, rn, to)
    # nav
    nv = next((x for x in G['nav'] if x['id'] == old), None)
    G['nav'] = [x for x in G['nav'] if x['id'] != old]
    item = {'id': new, 'amud': s['amud'], 'title': s['title']}
    R['nav'] = ([item] + R['nav']) if to == 'next' else (R['nav'] + [item])
    # srctext
    st = G.get('srctext') or {}
    if s.get('ref') in st:
        R.setdefault('srctext', {})[s['ref']] = st.pop(s['ref'])
        if to == 'next':
            R['srctext'] = {s['ref']: R['srctext'].pop(s['ref']), **R['srctext']}
    # slides
    gs, rs = G.get('slides'), R.get('slides')
    if gs and old in gs.get('g', {}):
        files = gs['g'].pop(old)
        if rs:
            g = rs['g']; keys = list(g)
            pos = (1 if keys and keys[0] == 'intro' else 0) if to == 'next' else (len(keys) - (1 if keys and keys[-1] == 'end' else 0))
            keys.insert(pos, new); g[new] = files
            rs['g'] = {k: g[k] for k in keys}
        else:
            print(f'NOTE: {slug}/{rn} has no deck — the moved slides ({len(files)}) were dropped')
    # tzurat
    for am in (G.get('tzurat') or {}).values():
        am.get('r', {}).pop(old, None)
    # quiz
    mq = [q for q in G['quiz'] if q.get('s') == old]
    G['quiz'] = [q for q in G['quiz'] if q.get('s') != old]
    for q in mq: q['s'] = new
    R['quiz'] = (mq + R['quiz']) if to == 'next' else (R['quiz'] + mq)
    # to_next on the earlier page
    if to == 'next':
        m = RX.match(s['ref']); a1 = m[3]
        lens = seglens(slug, gn, 'b')
        if a1 == 'a':
            G['to_next'] = f"{m[1]}.{gn}a.{m[4]}-{gn}b.{len(lens) if lens else 1}"
        else:
            G['to_next'] = f"{m[1]}.{gn}b.{m[4]}-{len(lens) if lens else m[4]}"
    else:
        R.pop('to_next', None)
    save(slug, gn, G); save(slug, rn, R)
    print(f'moved {slug}/{gn} {old} -> {slug}/{rn} {new} ({s["ref"]}); quiz now {len(G["quiz"])} / {len(R["quiz"])}')
    print('LEFT BY HAND: both storylines; thesis + card topics + stats (סוגיות count) + reading time; quiz back to 8 each;'
          ' any step that recaps or previews the moved sugya.')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('slug', nargs='?'); ap.add_argument('n', nargs='?', type=int)
    ap.add_argument('--to', choices=['next', 'prev']); ap.add_argument('--scan', action='store_true')
    ap.add_argument('--min', type=float, default=0.6)
    a = ap.parse_args()
    if a.scan:
        for r in scan(a.min): print(*r)
    else:
        move(a.slug, a.n, a.to)
