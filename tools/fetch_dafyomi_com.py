#!/usr/bin/env python3
"""Add study aids hosted on daf-yomi.com to the private source cache.

daf-yomi.com's HTML pages sit behind a bot challenge, so the routine reads the daf's page with the
WebFetch tool (https://www.daf-yomi.com/dafyomi.aspx?d=<day>&m=<month>&y=<year>) and saves the file
links as a manifest: one "title<TAB>url" per line. The files themselves (Data/UploadedFiles/…) are
static and download normally. This script downloads the useful ones once (most cover a range of
dapim, e.g. "(ב-יט)"), extracts text, and records which dapim each covers.

Private cache only: paraphrase, never copy (same rule as the rest of the cache).

usage: python tools/fetch_dafyomi_com.py --cache ../daf-ai-sources --slug bechorot --daf 17 --manifest links.tsv
"""
import argparse, json, os, re, shutil, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_sources import get  # noqa: E402  (falls back to curl when Python's CA bundle is missing)

KEEP = ["סיכומי סוגיות", "מחודדים בפיך", "תמצית מסקנות", "שאלות חזרה", "דרך ישרה", "שינון",
        "סיכום דברי הגמרא", "גמרא סדורה", "עיקרי הדינים", "הלכות הדף", "מראה מקומות", "עוז והדר",
        "גמרא ערוך ומבואר"]
SKIP = ["תמונה", "ילדים", "להדפסה"]  # image, kids' sheet, duplicate print layout
NUM = {'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10, 'כ': 20, 'ל': 30,
       'מ': 40, 'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90, 'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400}


def heb(s):
    return sum(NUM.get(c, 0) for c in s)


def span(title):
    m = re.search(r"\(([א-ת]{1,3})(?:\s*-\s*([א-ת]{1,3}))?\)", title)
    if not m:
        return None, None  # masechet- or perek-wide
    a = heb(m.group(1))
    return a, heb(m.group(2)) if m.group(2) else a


def text_of(path):
    if path.endswith(".pdf"):
        if shutil.which("pdftotext"):
            return subprocess.run(["pdftotext", path, "-"], capture_output=True, text=True).stdout
        try:
            from pdfminer.high_level import extract_text  # pip install pdfminer.six
            return extract_text(path)
        except Exception:
            return ""
    if path.endswith(".doc"):
        for cmd in (["antiword", path], ["textutil", "-convert", "txt", "-stdout", path]):
            if shutil.which(cmd[0]):
                return subprocess.run(cmd, capture_output=True, text=True).stdout
    return ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", required=True); ap.add_argument("--slug", required=True)
    ap.add_argument("--daf", type=int, required=True); ap.add_argument("--manifest", required=True)
    a = ap.parse_args()
    base = os.path.join(a.cache, a.slug, "_dyc"); os.makedirs(base, exist_ok=True)
    idx_p = os.path.join(base, "index.json")
    idx = json.load(open(idx_p, encoding="utf8")) if os.path.exists(idx_p) else {}
    mine = []
    for line in open(a.manifest, encoding="utf8"):
        if "\t" not in line:
            continue
        title, url = [x.strip() for x in line.split("\t", 1)]
        url = url.split("#")[0]
        if url.startswith("/"):
            url = "https://www.daf-yomi.com" + url
        m = re.search(r"/DY_Item/(\d+)-sFile\.(pdf|doc)$", url)
        if not m or not any(k in title for k in KEEP) or any(k in title for k in SKIP):
            continue
        fid, ext = m.group(1), m.group(2)
        lo, hi = span(title)
        if fid not in idx:
            path = os.path.join(base, f"{fid}.{ext}")
            try:
                data, _ = get(url, binary=True)
                if not data[:5] in (b"%PDF-", b"\xd0\xcf\x11\xe0\xa1"):
                    raise ValueError("not a PDF/DOC (blocked?)")
                open(path, "wb").write(data)
                txt = text_of(path)
                open(os.path.join(base, f"{fid}.txt"), "w", encoding="utf8").write(txt)
                idx[fid] = {"title": title, "url": url, "from": lo, "to": hi, "chars": len(txt)}
                print(f"saved {fid} {title} ({len(txt)} chars)")
                time.sleep(1)
            except Exception as e:
                print(f"skip {fid} {title}: {e}")
                continue
        mine.append(fid)
    json.dump(idx, open(idx_p, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    out = os.path.join(a.cache, a.slug, str(a.daf)); os.makedirs(out, exist_ok=True)
    json.dump([{"id": f, **idx[f]} for f in mine], open(os.path.join(out, "dafyomi_com.json"), "w", encoding="utf8"),
              ensure_ascii=False, indent=1)
    print(f"{a.slug}/{a.daf}: {len(mine)} aids listed in dafyomi_com.json")


if __name__ == "__main__":
    main()
