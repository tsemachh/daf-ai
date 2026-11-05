#!/usr/bin/env python3
"""merge_cross.py — put a sugya that was split across two dapim (``"cont": "next"`` on daf N, ``"cont": "prev"``
on daf N+1) whole on ONE page (owner rule, 2026-11-05). Mechanical part only; the wording (recap step, flow,
storyline, quiz) is fixed by hand afterwards.

    python tools/merge_cross.py <slug> <N> --into next|prev [--drop K ...] [--cache DIR]

--into next : the part on daf N moves to daf N+1 (its steps first, tagged "… · דף N"); N+1's section gets
              ``starts_prev``, its ref starts on daf N; daf N loses the section and gets top-level ``to_next``.
--into prev : the part on daf N+1 moves to daf N (appended, tagged "… · דף N+1"); N's section gets
              ``ends_next``; daf N+1 loses the section.
--drop K    : indexes (in the receiving section, after the merge) of steps to delete — e.g. the receiving page's
              old "רקע" recap or the giver's "where it is heading" step. p and stage indexes are re-mapped.
Quiz items that pointed to the removed section are listed (they must be moved or rewritten by hand).
"""
import argparse, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HEB = {1: 'א', 2: 'ב', 3: 'ג', 4: 'ד', 5: 'ה', 6: 'ו', 7: 'ז', 8: 'ח', 9: 'ט', 10: 'י', 20: 'כ', 30: 'ל', 40: 'מ', 50: 'נ', 60: 'ס', 70: 'ע'}


def heb(n):
    t, o = n // 10 * 10, n % 10
    s = (HEB.get(t, '') + HEB.get(o, '')).replace('יה', 'טו').replace('יו', 'טז')
    return s + '׳' if len(s) == 1 else s[:-1] + '״' + s[-1]


def load(slug, n):
    p = os.path.join(ROOT, 'data', slug, f'{n}.json')
    return p, json.load(open(p, encoding='utf-8'))


def save(p, d):
    t = json.dumps(d, ensure_ascii=False, indent=1)
    t = re.sub(r"\[\s+(-?[\d.]+),\s+(-?[\d.]+),\s+(-?[\d.]+),\s+(-?[\d.]+)\s+\]", r"[\1,\2,\3,\4]", t)
    open(p, 'w', encoding='utf-8').write(t + '\n')


def tag_daf(steps, n):
    for st in steps:
        if f'דף {heb(n)}' not in st.get('tag', ''):
            st['tag'] = f'{st["tag"]} · דף {heb(n)}'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('slug'); ap.add_argument('n', type=int)
    ap.add_argument('--into', choices=['next', 'prev'], required=True)
    ap.add_argument('--drop', type=int, nargs='*', default=[])
    a = ap.parse_args()
    pa, A = load(a.slug, a.n); pb, B = load(a.slug, a.n + 1)
    sa = next(s for s in A['sections'] if s.get('cont') == 'next')
    sb = next(s for s in B['sections'] if s.get('cont') == 'prev')
    ra = re.match(r'^([A-Za-z_]+)\.(\d+[ab]\.\d+)(?:-(?:\d+[ab]\.)?\d+)?$', sa['ref'])
    rb = re.match(r'^([A-Za-z_]+)\.(?:(\d+[ab])\.)?\d+(?:-((?:\d+[ab]\.)?\d+))?$', sb['ref'])
    end_b = sb['ref'].split('-')[-1] if '-' in sb['ref'] else sb['ref'].split('.', 1)[1]
    if '.' not in end_b:   # "Bekhorot.52a.1-7" → "52a.7"
        end_b = re.match(r'^[A-Za-z_]+\.(\d+[ab])\.', sb['ref'])[1] + '.' + end_b
    ref = f'{ra[1]}.{ra[2]}-{end_b}'
    if a.into == 'next':
        keep, give, giver, gpath, kpath, K = sb, sa, A, pa, pb, B
        moved = [dict(st) for st in sa['steps']]; tag_daf(moved, a.n)
        off = len(moved)
        for st in sb['steps']:
            if 'p' in st: st['p'] += off
        for g in sb.get('stages', []):
            g['at'] += off
        for st in moved:   # p inside the moved block stays as is
            pass
        sb['steps'] = moved + sb['steps']
        if sa.get('stages'):
            sb['stages'] = sa['stages'] + sb.get('stages', [])
        sb['ref'] = ref; sb.pop('cont', None); sb['starts_prev'] = True
        if sa.get('unlock') and not sb.get('unlock'):
            sb['unlock'] = sa['unlock']
        A['to_next'] = sa['ref']
        A['sections'] = [s for s in A['sections'] if s is not sa]
        A['nav'] = [x for x in A.get('nav', []) if x.get('id') != sa['id']]
        recv, removed_id, qpage = sb, sa['id'], A
    else:
        moved = [dict(st) for st in sb['steps']]; tag_daf(moved, a.n + 1)
        off = len(sa['steps'])
        for st in moved:
            if 'p' in st: st['p'] += off
        st_b = [dict(g, at=g['at'] + off) for g in sb.get('stages', [])]
        sa['steps'] = sa['steps'] + moved
        if st_b:
            sa['stages'] = sa.get('stages', []) + st_b
        sa['ref'] = ref; sa.pop('cont', None); sa['ends_next'] = True
        B['sections'] = [s for s in B['sections'] if s is not sb]
        B['nav'] = [x for x in B.get('nav', []) if x.get('id') != sb['id']]
        recv, removed_id, qpage = sa, sb['id'], B
    # drop steps by index (receiving section), re-mapping p and stages
    if a.drop:
        drop = set(a.drop); old = recv['steps']; new_idx = {}
        kept = []
        for i, st in enumerate(old):
            if i in drop: continue
            new_idx[i] = len(kept); kept.append(st)
        def remap(i):
            while i >= 0 and i not in new_idx: i -= 1
            return new_idx.get(i)
        for st in kept:
            if 'p' in st:
                q = remap(st['p'])
                if q is None or q >= kept.index(st): st.pop('p')
                else: st['p'] = q
        recv['steps'] = kept
        if recv.get('stages'):
            ns = []
            for g in recv['stages']:
                at = g['at']
                while at in drop: at += 1
                if at in new_idx and all(x['at'] != new_idx[at] for x in ns): ns.append(dict(g, at=new_idx[at]))
            recv['stages'] = ns
    if recv.get('stages'):
        recv['stages'] = sorted(recv['stages'], key=lambda g: g['at'])
        recv['stages'][0]['at'] = 0   # the first stage opens the section (its q may need rewording to cover the moved steps)
        if len(recv['stages']) < 2: recv.pop('stages')
    # srctext of the old refs is stale; drop it (fill_srctext --force refills)
    for D in (A, B):
        refs = {s.get('ref') for s in D['sections']}
        D['srctext'] = {k: v for k, v in (D.get('srctext') or {}).items() if k in refs}
    save(pa, A); save(pb, B)
    stale = [i for i, q in enumerate(qpage.get('quiz', [])) if q.get('s') == removed_id]
    print(f'{a.slug} {a.n}->{a.n + 1}: into {a.into}; receiving section {recv["id"]} now {len(recv["steps"])} steps, ref {ref}')
    print(f'  quiz items on daf {qpage["daf"]} that pointed to the removed {removed_id}: {stale}')
    print(f'  steps of {recv["id"]}: ' + ' | '.join(f'{i}:{st["tag"][:24]}' for i, st in enumerate(recv['steps'])))


if __name__ == '__main__':
    main()
