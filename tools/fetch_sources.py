#!/usr/bin/env python3
"""Fill the private source cache (../daf-ai-sources) for upcoming dapim.

Fetches only sources that allow plain HTTP clients:
  - Sefaria API: Vilna Hebrew (per segment) and Steinsaltz English, both amudim
  - dafyomi.co.il: "points" and Hebrew tables pages
yeshiva.org.il (פרשני wiki) sits behind a Cloudflare challenge and is saved separately by a real
browser as yeshiva_a.txt / yeshiva_b.txt (see README in the cache repo). Existing files are kept
unless --refresh.

usage: python tools/fetch_sources.py [--days 21] [--start YYYY-MM-DD] [--refresh] [--cache ../daf-ai-sources]
"""
import argparse, datetime as dt, html, json, os, re, sys, time, urllib.error, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dafyomi import daf_for  # noqa: E402

UA = "daf-ai source cache (+https://daf-ai.pages.dev)"
# slug -> (dafyomi.co.il directory, file prefix)
DAFYOMI_CO_IL = {"bechorot": ("bechoros", "be"), "arachin": ("erchin", "er"), "temurah": ("temurah", "tm"),
                 "keritot": ("kerisus", "kr"), "meilah": ("meilah", "ml"), "niddah": ("nidah", "ni")}


def get(url, binary=False):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "he,en"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data, cs = r.read(), r.headers.get_content_charset()
    except urllib.error.URLError as e:
        # Some networks (e.g. a filtering proxy) re-sign TLS with a CA that lives only in the macOS
        # keychain; the system curl trusts it, Python's bundle does not. Verification stays on.
        if "CERTIFICATE_VERIFY_FAILED" not in str(e):
            raise
        import subprocess
        data = subprocess.run(["curl", "-sfL", "-m", "60", "-A", UA, url], check=True, capture_output=True).stdout
        cs = None
    if binary:
        return data, cs
    return data.decode(cs or "utf-8", "replace")


def strip_tags(s):
    s = re.sub(r"(?is)<(script|style).*?</\1>", " ", s)
    s = re.sub(r"(?i)<br\s*/?>|</p>|</tr>|</li>|</h\d>", "\n", s)
    s = html.unescape(re.sub(r"<[^>]+>", "", s))
    return re.sub(r"[ \t ]+", " ", re.sub(r"\n\s*\n+", "\n\n", s)).strip()


def save(path, content, refresh):
    if os.path.exists(path) and not refresh:
        return "kept"
    os.makedirs(os.path.dirname(path), exist_ok=True)
    mode = "wb" if isinstance(content, bytes) else "w"
    with open(path, mode, **({} if mode == "wb" else {"encoding": "utf8"})) as f:
        f.write(content)
    return "saved"


def fetch_daf(he, sef, slug, daf, cache, refresh):
    out = os.path.join(cache, slug, str(daf))
    log = {}
    for amud in "ab":
        ref = f"{sef.replace(' ', '_')}.{daf}{amud}"
        p = os.path.join(out, f"sefaria_he_{amud}.json")
        if refresh or not os.path.exists(p):
            j = json.loads(get(f"https://www.sefaria.org/api/texts/{ref}?lang=he&context=0&commentary=0"))
            seg = [strip_tags(x) for x in j.get("he", [])]
            log[p] = save(p, json.dumps({"ref": ref, "segments": seg}, ensure_ascii=False, indent=1), True)
            time.sleep(0.5)
        p = os.path.join(out, f"steinsaltz_en_{amud}.json")
        if refresh or not os.path.exists(p):
            j = json.loads(get(f"https://www.sefaria.org/api/v3/texts/{ref}?version=english"))
            vers = j.get("versions") or [{}]
            txt = vers[0].get("text", [])
            seg = [strip_tags(x) if isinstance(x, str) else x for x in txt]
            log[p] = save(p, json.dumps({"ref": ref, "version": vers[0].get("versionTitle"), "segments": seg},
                                        ensure_ascii=False, indent=1), True)
            time.sleep(0.5)
    if slug in DAFYOMI_CO_IL:
        d, pre = DAFYOMI_CO_IL[slug]
        for kind, url in (("points", f"https://www.dafyomi.co.il/{d}/points/{pre}-ps-{daf:03d}.htm"),
                          ("tables", f"https://www.dafyomi.co.il/{d}/hebcharts/{pre}-tl-{daf:03d}.htm")):
            p = os.path.join(out, f"dafyomi_co_il_{kind}.txt")
            if refresh or not os.path.exists(p):
                try:
                    raw, cs = get(url, binary=True)
                    text = raw.decode(cs or "windows-1255", "replace")
                    log[p] = save(p, f"# {url}\n\n" + strip_tags(text), True)
                except Exception as e:  # missing page is fine
                    log[p] = f"skip ({e})"
                time.sleep(0.5)
    for amud in "ab":
        p = os.path.join(out, f"yeshiva_{amud}.txt")
        log[p] = "present" if os.path.exists(p) else "MISSING (needs real browser)"
    meta = os.path.join(out, "meta.json")
    m = json.load(open(meta, encoding="utf8")) if os.path.exists(meta) else {}
    m.update({"tractate_he": he, "tractate": sef, "slug": slug, "daf": daf,
              "fetched_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")})
    json.dump(m, open(meta, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    return log


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=21)
    ap.add_argument("--start", default=None)
    ap.add_argument("--refresh", action="store_true")
    ap.add_argument("--cache", default=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "daf-ai-sources"))
    a = ap.parse_args()
    start = dt.date.fromisoformat(a.start) if a.start else dt.date.today()
    seen = set()
    for i in range(a.days):
        he, sef, slug, daf = daf_for(start + dt.timedelta(days=i))
        if (slug, daf) in seen:
            continue
        seen.add((slug, daf))
        try:
            log = fetch_daf(he, sef, slug, daf, os.path.abspath(a.cache), a.refresh)
            miss = [os.path.basename(k) for k, v in log.items() if "MISSING" in v or v.startswith("skip")]
            print(f"{start + dt.timedelta(days=i)} {slug}/{daf}: ok" + (f"  missing: {', '.join(miss)}" if miss else ""))
        except Exception as e:
            print(f"{slug}/{daf}: ERROR {e}")


if __name__ == "__main__":
    main()
