#!/usr/bin/env python3
"""Save yeshiva.org.il (פרשני wiki) pages into the private cache using the installed Google Chrome.

The site is behind a Cloudflare challenge, so plain HTTP clients get 403. This drives the real Chrome
(visible window, its own persistent profile in ~/.daf-ai-chrome) via Playwright, waits for the
challenge to clear, and saves the article text as yeshiva_a.txt / yeshiva_b.txt. Run on the Mac.

usage: python tools/fetch_browser.py [--days 21] [--start YYYY-MM-DD] [--refresh] [--cache ../daf-ai-sources]
requires: pip install playwright   (uses channel="chrome"; no browser download)
"""
import argparse, datetime as dt, os, sys, time, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dafyomi import daf_for  # noqa: E402

HEB = "אבגדהוזחטיכלמנסעפצקרשת"


def heb_num(n):
    vals = [(400, "ת"), (300, "ש"), (200, "ר"), (100, "ק"), (90, "צ"), (80, "פ"), (70, "ע"), (60, "ס"), (50, "נ"),
            (40, "מ"), (30, "ל"), (20, "כ"), (10, "י"), (9, "ט"), (8, "ח"), (7, "ז"), (6, "ו"), (5, "ה"), (4, "ד"),
            (3, "ג"), (2, "ב"), (1, "א")]
    out, tail = "", ""
    if n % 100 in (15, 16):
        tail, n = ("טו" if n % 100 == 15 else "טז"), n - n % 100
    for v, c in vals:
        while n >= v:
            out, n = out + c, n - v
    return out + tail


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=21)
    ap.add_argument("--start", default=None)
    ap.add_argument("--refresh", action="store_true")
    ap.add_argument("--cache", default=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "daf-ai-sources"))
    a = ap.parse_args()
    from playwright.sync_api import sync_playwright
    start = dt.date.fromisoformat(a.start) if a.start else dt.date.today()
    todo, seen = [], set()
    for i in range(a.days):
        he, sef, slug, daf = daf_for(start + dt.timedelta(days=i))
        if (slug, daf) in seen:
            continue
        seen.add((slug, daf))
        for amud in "ab":
            p = os.path.join(os.path.abspath(a.cache), slug, str(daf), f"yeshiva_{amud}.txt")
            if a.refresh or not os.path.exists(p):
                url = "https://www.yeshiva.org.il/wiki/index.php/" + urllib.parse.quote(
                    f"פרשני:בבלי:{he.replace(' ', '_')}_{heb_num(daf)}_{'א' if amud == 'a' else 'ב'}")
                todo.append((slug, daf, amud, url, p))
    if not todo:
        print("nothing to fetch")
        return
    with sync_playwright() as pw:
        ctx = pw.chromium.launch_persistent_context(os.path.expanduser("~/.daf-ai-chrome"), channel="chrome",
                                                    headless=False, viewport={"width": 1100, "height": 800})
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        for slug, daf, amud, url, p in todo:
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=60000)
                for _ in range(30):  # wait for the challenge to clear
                    if page.locator("#mw-content-text").count():
                        break
                    time.sleep(1)
                if not page.locator("#mw-content-text").count():
                    print(f"{slug}/{daf}{amud}: blocked or not found ({page.title()})")
                    continue
                if "אין כרגע טקסט בדף זה" in page.inner_text("#mw-content-text"):
                    print(f"{slug}/{daf}{amud}: page does not exist yet")
                    continue
                text = page.inner_text("#mw-content-text")
                os.makedirs(os.path.dirname(p), exist_ok=True)
                with open(p, "w", encoding="utf8") as f:
                    f.write(f"# {page.url}\n\n{text}\n")
                print(f"{slug}/{daf}{amud}: saved {len(text)} chars")
                time.sleep(3)  # be polite
            except Exception as e:
                print(f"{slug}/{daf}{amud}: ERROR {e}")
        ctx.close()


if __name__ == "__main__":
    main()
