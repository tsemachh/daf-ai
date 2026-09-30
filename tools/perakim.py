#!/usr/bin/env python3
"""Write data/perakim.json — each masechet's chapters (perakim) as daf ranges, from Sefaria's index.

Run once (and again only if a new masechet is added to dafyomi.MASECHTOT):  python tools/perakim.py
A daf where one perek ends and the next begins is listed in both ranges.
"""
import json, os, re, sys, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dafyomi import MASECHTOT  # noqa: E402
from fetch_sources import get  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def daf_of(ref):
    m = re.search(r"(\d+)[ab]", ref)
    return int(m.group(1)) if m else None


out = {}
for he, sef, slug, first, last in MASECHTOT:
    try:
        idx = json.loads(get("https://www.sefaria.org/api/v2/raw/index/" + urllib.parse.quote(sef)))
        nodes = idx["alt_structs"]["Chapters"]["nodes"]
    except Exception as e:  # noqa: BLE001
        print(f"skip {slug}: {e}", file=sys.stderr)
        continue
    per = []
    for n in nodes:
        a, _, b = n["wholeRef"].rpartition(" ")[2].partition("-")
        fa, fb = daf_of(a), daf_of(b or a)
        name = next((t["text"] for t in n.get("titles", []) if t.get("lang") == "he" and t.get("primary")),
                    next((t["text"] for t in n.get("titles", []) if t.get("lang") == "he"), ""))
        if fa:
            per.append({"he": name, "from": max(fa, first), "to": min(fb or fa, last)})
    out[slug] = per
    print(slug, len(per))
json.dump(out, open(os.path.join(ROOT, "data", "perakim.json"), "w", encoding="utf8"), ensure_ascii=False, indent=0)
