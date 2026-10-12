#!/usr/bin/env python3
"""apply_review.py — apply the reviewer's patches (§5c) and its glossary entries, without a model.

    python tools/apply_review.py data/<slug>/<daf>.json <cache>/<slug>/<daf>/review.json

review.json: {"patches": [{"where": "s3.steps[4].body" | "s3.flow" | "s6.steps[5]" | "quiz[2]" | …,
"op": "replace" | "insert_after", "severity": "ERROR|OMISSION|THIN|DOUBTFUL", "new": …}], "glossary": {…}}
DOUBTFUL patches are NOT applied (they go to the report). Inserts are applied last, from the end of
each section backwards, so earlier indexes in other patches stay valid. Glossary keys that already
exist are left alone. Prints a count per severity.
"""
import json, re, sys
from collections import Counter

ROOT = __import__('os').path.dirname(__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
TOK = re.compile(r'([^.\[\]]+)|\[(\d+)\]')


def resolve(d, where):
    parts = [m.group(1) if m.group(1) is not None else int(m.group(2)) for m in TOK.finditer(where)]
    if isinstance(parts[0], str) and parts[0] != 'quiz' and parts[0] not in d:   # section id
        sec = next(s for s in d['sections'] if s['id'] == parts[0])
        obj, parts = sec, parts[1:]
    else:
        obj = d
    for p in parts[:-1]:
        obj = obj[p]
    return obj, parts[-1]


def main(page, review):
    d = json.load(open(page, encoding='utf-8'))
    r = json.load(open(review, encoding='utf-8'))
    done, skipped = Counter(), []
    inserts = []
    for p in r.get('patches', []):
        if p.get('severity') == 'DOUBTFUL':
            skipped.append(p['where']); continue
        if p.get('op', 'replace') == 'insert_after':
            inserts.append(p); continue
        obj, key = resolve(d, p['where'])
        if p['new'] is None and isinstance(obj, dict):   # a null patch removes the field (e.g. a dropped unlock)
            obj.pop(key, None)
        else:
            obj[key] = p['new']
        done[p['severity']] += 1
    for p in sorted(inserts, key=lambda p: [int(x) for x in re.findall(r'\d+', p['where'])], reverse=True):
        obj, key = resolve(d, p['where'])
        obj.insert(key + 1, p['new'])
        done[p['severity']] += 1
    gl_p = f'{ROOT}/data/glossary.json'
    gl = json.load(open(gl_p, encoding='utf-8'))
    added = [k for k, v in r.get('glossary', {}).items() if k not in gl]
    for k in added:   # site format {"t": type, "d": text}; accept {"type","text"} too
        v = r['glossary'][k]
        gl[k] = {'t': v.get('t') or v.get('type'), 'd': v.get('d') or v.get('text')}
    if added:
        json.dump(gl, open(gl_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        open(gl_p, 'a', encoding='utf-8').write('\n')
    json.dump(d, open(page, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    open(page, 'a', encoding='utf-8').write('\n')
    print('applied', dict(done), '| DOUBTFUL left for the report:', skipped, '| glossary added:', added)


if __name__ == '__main__':
    main(*sys.argv[1:3])
