#!/usr/bin/env python3
"""fill_verses.py — store the text of every verse a page links to in data/sources.json, so verse quotes open in the
in-page dialog (the site falls back to fetching Sefaria on click, which is slower and fails offline).

    python tools/fill_verses.py            # all pages
    python tools/fill_verses.py --dry      # only list the missing refs

Finds references the way site/app.js does — "(בראשית טו, ו)" or "בראשית טו, ו" as whole words, chapter ≤150,
verse ≤176 — collects those not yet in data/sources.json and fetches each from
https://www.sefaria.org/api/texts/<ref>?lang=he&context=0. Needs network access to www.sefaria.org.
"""
import argparse, glob, json, os, re, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H = "א-ת"
NUM = {c: v for c, v in zip("אבגדהוזחטיכךלמםנןסעפףצץקרשת", [1,2,3,4,5,6,7,8,9,10,20,20,30,40,40,50,50,60,70,80,80,90,90,100,200,300,400])}


def books():
    js = open(os.path.join(ROOT, "site", "app.js"), encoding="utf-8").read()
    m = re.search(r"var BOOKS=\{(.*?)\};", js)
    return dict(re.findall(r"'([^']+)':'([^']+)'", m[1]))


def gem(w):
    return sum(NUM.get(c, 0) for c in w)


def refs(text, B):
    R = re.compile("(" + "|".join(sorted(map(re.escape, B), key=len, reverse=True)) + rf")\s+([{H}]{{1,3}})[׳']?,\s*([{H}]{{1,3}})[׳']?")
    for m in R.finditer(text):
        before = text[m.start() - 1] if m.start() else " "
        after = text[m.end()] if m.end() < len(text) else " "
        if re.match(f"[{H}]", before) or re.match(f"[{H}]", after): continue
        c, v = gem(m[2]), gem(m[3])
        if not (0 < c <= 150 and 0 < v <= 176): continue
        yield f"{B[m[1]]}.{c}.{v}"


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--dry", action="store_true"); a = ap.parse_args()
    B = books(); sp = os.path.join(ROOT, "data", "sources.json"); S = json.load(open(sp, encoding="utf-8"))
    want = set()
    for f in glob.glob(os.path.join(ROOT, "data", "*", "[0-9]*.json")):
        want |= set(refs(json.dumps(json.load(open(f, encoding="utf-8")), ensure_ascii=False), B))
    miss = sorted(k for k in want if k not in S)
    print(f"{len(want)} verse refs, {len(miss)} missing")
    if a.dry:
        print("\n".join(miss)); return
    bad = []
    for k in miss:
        try:
            req = urllib.request.Request(f"https://www.sefaria.org/api/texts/{k}?lang=he&context=0&commentary=0", headers={"User-Agent": "daf-ai"})
            j = json.load(urllib.request.urlopen(req, timeout=20))
            he = j.get("he"); he = he if isinstance(he, list) else [he]
            p = [re.sub(r"<[^>]+>", "", str(t)).replace("&nbsp;", " ").strip() for t in he if t]
            if not p: raise ValueError("empty")
            t = re.sub(r"[״׳]", "", j.get("heRef") or k).replace(":", ", ")   # "דברים ט״ו:י״ז" → "דברים טו, יז", as the existing entries
            S[k] = {"t": t, "p": p}
        except Exception as e:
            bad.append(f"{k} ({e})")
    json.dump(S, open(sp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"added {len(miss) - len(bad)}" + (f"; failed: {', '.join(bad)}" if bad else ""))


if __name__ == "__main__":
    main()
