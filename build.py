#!/usr/bin/env python3
"""Static site generator for daf-ai.

data/<slug>/<daf>.json  ->  dist/<slug>/<daf>/index.html
                        ->  dist/<slug>/index.html   (masechet index)
                        ->  dist/index.html          (home)
No third-party dependencies (Cloudflare Pages: build command `python build.py`, output `dist`).
"""
import datetime as dt, glob, html, json, os, re, shutil, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "tools"))
import dafyomi  # noqa: E402  (local Daf Yomi calendar)

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(ROOT, "dist")
_dsp = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "dafspoiler.json")
DAFSPOILER = json.load(open(_dsp, encoding="utf8")) if os.path.exists(_dsp) else {}
_swp = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "swdaf.json")
SWDAF = json.load(open(_swp, encoding="utf8")) if os.path.exists(_swp) else {}
SW_CREDIT = "באדיבות Simon Wolf (www.swdaf.com)"
_sws = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "swdaf_sec.json")
SWSEC = json.load(open(_sws, encoding="utf8")) if os.path.exists(_sws) else {}   # "<folder>/<file>" -> section id
_swh = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "swdaf_he.json")
SWHE = json.load(open(_swh, encoding="utf8")) if os.path.exists(_swh) else {}   # file name -> Hebrew title


# site slug -> swdaf folder (also the feed's ?mas=), where the names differ
SW_DIR = {"sukkah": "succah", "rosh-hashanah": "rosh_hashana", "megillah": "megilah", "moed-katan": "moed_katan",
          "chagigah": "chagiga", "bava-kamma": "bava_kama", "bava-metzia": "bava_metzia", "bava-batra": "bava_batra",
          "avodah-zarah": "avoda_zara", "chullin": "chulin", "keritot": "kreitot", "niddah": "nidah"}


def sw_charts(slug, daf):
    """Simon Wolf's charts / source sheets for a daf — linked at the source (with permission), so his updates show through."""
    out, dr = [], SW_DIR.get(slug, slug)
    for f in SWDAF.get(dr, {}).get(str(daf), []):
        t = re.sub(r"^[A-Za-z_]+?\d+_?", "", f).rsplit(".", 1)[0].replace("_", " ").strip() or "דף עזר"
        out.append({"href": f"https://www.swdaf.com/docDownload/{dr}/{f}", "title": SWHE.get(f, t), "en": t, "sec": SWSEC.get(f"{dr}/{f}", "")})
    return out
DAFS = {}  # (slug, daf) -> daf json, filled in main(); used for links between the parts of a split sugya
SITE_TITLE = "דפי חזרה ולימוד — הדף היומי"
BRAND = "דף צמח"   # the site's short name — what people search for
FOOT = ("נוצר על ידי סוכן AI (Claude) ונבדק אוטומטית מול לשון הגמרא — מומלץ לעיין במקור. "
        "ההסבר נכתב כעזר ללימוד ואינו מחליף עיון בגמרא ובמפרשים. להלכה למעשה — יש לשאול רב.")
HEB = {1: "א", 2: "ב", 3: "ג", 4: "ד", 5: "ה", 6: "ו", 7: "ז", 8: "ח", 9: "ט", 10: "י", 20: "כ", 30: "ל",
       40: "מ", 50: "נ", 60: "ס", 70: "ע", 80: "פ", 90: "צ", 100: "ק", 200: "ר", 300: "ש", 400: "ת"}


def heb_num(n):
    out = ""
    for v in (400, 300, 200, 100):
        while n >= v:
            out += HEB[v]; n -= v
    if n in (15, 16):
        out += "ט" + HEB[n - 9]; n = 0
    for v in (90, 80, 70, 60, 50, 40, 30, 20, 10):
        if n >= v:
            out += HEB[v]; n -= v
    if n:
        out += HEB[n]
    return out[:-1] + "״" + out[-1] if len(out) > 1 else out + "׳"


esc = html.escape


SOURCES = [
    ("ספריא", "https://www.sefaria.org/", "לשון הגמרא (נוסח וילנא), ביאור שטיינזלץ, פסוקים ומקורות הלכה"),
    ("הדף היומי — daf-yomi.com", "https://daf-yomi.com/", "לוח הדף היומי וחומרי ״ללמוד ולהבין״"),
    ("כולל עיון הדף — dafyomi.co.il", "https://www.dafyomi.co.il/", "סיכומי נקודות וטבלאות עזר"),
    ("ישיבה — yeshiva.org.il", "https://www.yeshiva.org.il/wiki/", "ביאור ״פרשני״"),
    ("אתר סיני — שיעורי הדף היומי של הרב אורי בריליאנט", "https://www.sinai.org.il/", "שיעורים, סיכומים, תרשימים וחוברות ״דף מאיר״ — לבדיקת מהלך הסוגיות וההסברים"),
    ("Daf Spoiler — הכנה לדף היומי, הרב נפתלי רמתי", "https://dafspoiler.com/", "סיכום והכנה לכל דף בשאלות ותשובות — לבדיקת הרקע והמקרה של כל סוגיה (ברשות הכותב)"),
    ("SW Daf — Simon Wolf", "https://www.swdaf.com/", "תרשימים, מפות ודפי מקורות לדף — מקושרים במקור (באדיבות Simon Wolf)"),
    ("דיקטה — הנקדן", "https://nakdan.dicta.org.il/", "ניקוד אוטומטי של הטקסט לפני ההקראה בקול"),
]


def logo_html(up):
    st = os.path.join(ROOT, "site", "static")
    if os.path.exists(os.path.join(st, "shefing-logo.png")):
        dark = ""
        if os.path.exists(os.path.join(st, "shefing-logo-white.webp")):
            dark = (f'<source srcset="{up}shefing-logo-white.webp" type="image/webp" width="91" height="28" '
                    f'media="(prefers-color-scheme: dark)">')
        light = f'<source srcset="{up}shefing-logo.webp" type="image/webp" width="128" height="28">' \
            if os.path.exists(os.path.join(st, "shefing-logo.webp")) else ""
        return (f'<picture>{dark}{light}<img class="sponsor-logo" src="{up}shefing-logo.png" alt="Shefing" '
                f'width="128" height="28" loading="lazy" decoding="async"></picture>')
    return '<span class="sponsor-word">Shefing</span>'


def credits(up=""):
    items = "".join(f'<li><a href="{u}" rel="noopener">{esc(n)}</a> — {esc(d)}</li>' for n, u, d in SOURCES)
    return f"""<section class="credits" aria-label="קרדיטים">
  <a class="sponsor" href="https://shefing.com/" rel="noopener">
    <span class="sponsor-row" dir="ltr"><span class="sponsor-by">Powered by</span>{logo_html(up)}</span>
    <span class="sponsor-note">עיבוד ה־AI (הטוקנים) בחסות Shefing</span>
  </a>
  <h2>מקורות</h2>
  <ul>{items}</ul>
  <p class="credits-note">הדפים נבנים ונבדקים על ידי סוכן AI מתוך המקורות האלה; ניסוח ההסברים מקורי. לשון הגמרא מובאת מספריא.</p>
</section>
"""


def jscript(obj, **attrs):
    a = "".join(f' {k.replace("_", "-") if k != "cls" else "class"}="{v}"' for k, v in attrs.items())
    return f'<script type="application/json"{a}>' + json.dumps(obj, ensure_ascii=False).replace("</", "<\\/") + "</script>"


SITE_URL = "https://daf.tsemach.dev"
CATALOG = {"pages": [], "mas": {}}  # filled in main(); embedded for the progress runtime


def il_today():
    try:
        from zoneinfo import ZoneInfo
        return dt.datetime.now(ZoneInfo("Asia/Jerusalem")).date()
    except Exception:
        return dt.date.today()


def yomi_date(slug, daf):
    """Daf Yomi date of slug/daf in the cycle nearest to today (ISO string), or None."""
    off = 0
    for he, sef, sl, first, last in dafyomi.MASECHTOT:
        if sl == slug and first <= daf <= last:
            off += daf - first
            break
        off += last - first + 1
    else:
        return None
    n = (il_today() - dafyomi.CYCLE_START).days
    base = dafyomi.CYCLE_START + dt.timedelta(days=(n // dafyomi.CYCLE_LEN) * dafyomi.CYCLE_LEN + off)
    if (base - il_today()).days < -dafyomi.CYCLE_LEN // 2:
        base += dt.timedelta(days=dafyomi.CYCLE_LEN)
    return base.isoformat()


def short(t, n):
    """Cut at a word boundary, with an ellipsis."""
    return t if len(t) <= n else t[:n].rsplit(" ", 1)[0].rstrip(" ,;:—–-") + "…"


def catalog_json():
    return jscript(CATALOG, id="catalog")


ORDER = {sl: i for i, (_, _, sl, _, _) in enumerate(dafyomi.MASECHTOT)}
BOUNDS = {sl: (he, first, last) for he, _, sl, first, last in dafyomi.MASECHTOT}
HAVE = set()   # (slug, daf) of every published page; filled in main()


def neighbour(slug, daf, step):
    """The next (step=1) / previous (step=-1) daf in Shas order, across a masechet's end — if published."""
    he, first, last = BOUNDS[slug]
    if first <= daf + step <= last:
        k = (slug, daf + step)
    else:
        i = ORDER[slug] + step
        if not 0 <= i < len(dafyomi.MASECHTOT):
            return None
        _, _, sl, f2, l2 = dafyomi.MASECHTOT[i]
        k = (sl, f2 if step > 0 else l2)
    return k if k in HAVE else None


def navbar(slug="", daf=0, up=""):
    """Sticky bar on every page: → previous · [masechet daf ▾] (opens the jump panel, nav.js) · next ← · היום."""
    def link(k, cls, arrow):
        if not k:
            return f'<span class="dn-arrow {cls}" aria-hidden="true"></span>'
        lbl = (f"דף {heb_num(k[1])}" if k[0] == slug else f"{BOUNDS[k[0]][0]} {heb_num(k[1])}")
        return (f'<a class="dn-arrow {cls}" href="{up}{k[0]}/{k[1]}/" rel="{"next" if cls == "dn-next" else "prev"}" '
                f'title="{lbl}" aria-label="{lbl}">{arrow}<span class="dn-lbl">{lbl}</span></a>')
    if slug and daf:
        cur = f"{BOUNDS[slug][0]} {heb_num(daf)}"
    elif slug:
        cur = f"מסכת {BOUNDS[slug][0]}"
    else:
        cur = "מעבר לדף"
    prev = link(neighbour(slug, daf, -1), "dn-prev", "→") if daf else ""
    nxt = link(neighbour(slug, daf, 1), "dn-next", "←") if daf else ""
    return (f'<nav class="dnav" data-slug="{slug}" data-daf="{daf or ""}" aria-label="ניווט בין דפים">'
            f'{prev}<button class="dn-pick" type="button" aria-haspopup="dialog" aria-expanded="false">'
            f'<span>{cur}</span><span class="dn-car" aria-hidden="true">▾</span></button>{nxt}'
            f'<a class="dn-today" href="#" hidden>היום</a></nav>')


CSS = " ".join(open(os.path.join(ROOT, "site", "app.css"), encoding="utf8").read().split())
# cache-busting version for the scripts: a new deploy never runs against a stale cached copy
import hashlib  # noqa: E402
ASSET_V = hashlib.sha1(b"".join(open(os.path.join(ROOT, "site", f), "rb").read()
                                for f in ("app.js", "progress.js", "pwa.js", "nav.js", "sw.js", "app.css"))).hexdigest()[:8]


def git_dates():
    """last commit date (YYYY-MM-DD) per data/ file — the sitemap's <lastmod>. Empty on a shallow clone
    (every file would show the same date, which tells Google nothing)."""
    import subprocess
    try:
        if subprocess.run(["git", "rev-parse", "--is-shallow-repository"], cwd=ROOT, capture_output=True,
                          text=True).stdout.strip() != "false":
            return {}
        out = subprocess.run(["git", "log", "--format=@%cs", "--name-only", "--", "data/"], cwd=ROOT,
                             capture_output=True, text=True, timeout=60).stdout
    except Exception:
        return {}
    dates, cur = {}, None
    for ln in out.splitlines():
        if ln.startswith("@"):
            cur = ln[1:]
        elif ln and cur:
            dates.setdefault(ln, cur)
    return dates


def ldjson(d):
    """schema.org data for a daf page: breadcrumb (home › masechet › daf) and the page as a LearningResource."""
    url = f"{SITE_URL}/{d['slug']}/{d['daf']}/"
    mas = f"מסכת {d['tractate_he']}"
    g = [{"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "דפי חזרה ולימוד", "item": f"{SITE_URL}/"},
            {"@type": "ListItem", "position": 2, "name": mas, "item": f"{SITE_URL}/{d['slug']}/"},
            {"@type": "ListItem", "position": 3, "name": d["title"], "item": url}]},
         {"@type": "LearningResource", "@id": url, "url": url, "name": f"{d['title']} — דף חזרה ולימוד",
          "description": re.sub("<[^>]+>", "", d["thesis"]), "inLanguage": "he",
          "learningResourceType": "דף חזרה", "educationalUse": "חזרה ולימוד הדף היומי",
          "about": {"@type": "CreativeWork", "name": f"תלמוד בבלי, {mas}, דף {d['title'].split(' ', 1)[-1]}"},
          "isPartOf": {"@type": "WebSite", "name": BRAND, "url": f"{SITE_URL}/"},
          "isAccessibleForFree": True}]
    return ('<script type="application/ld+json">' +
            json.dumps({"@context": "https://schema.org", "@graph": g}, ensure_ascii=False).replace("</", "<\\/") + "</script>")


FEED_V = "v1"
FEED_TERMS = {
    "credit": "מקור: דף צמח — daf.tsemach.dev (יש להציג קרדיט עם קישור לדף המקורי בכל דף)",
    "ai_note": "התוכן נכתב על ידי סוכן AI ונבדק אוטומטית מול לשון הגמרא — יש להציג הערה זו לצד התוכן.",
    "use": "לשימוש לא מסחרי בלבד, בתיאום עם בעל האתר. יש למשוך מהכתובת באופן שוטף (לפחות פעם ביום) — הדפים מתוקנים כל לילה.",
    "sources": "לשון הגמרא המנוקדת: ספריא (William Davidson Edition, CC BY-NC). ההסברים: דף צמח, על בסיס שטיינזלץ, רש״י ועזרי לימוד.",
}




NOINDEX = ("lab/", "review/", "feedback/", "offline/")   # utility pages and the model-comparison lab stay out of search


def seo_pass():
    """Every indexable page gets a self canonical; utility pages get noindex (Search Console: duplicate/thin pages)."""
    for root, _, files in os.walk(DIST):
        if "index.html" not in files: continue
        rel = os.path.relpath(root, DIST).replace(os.sep, "/")
        rel = "" if rel == "." else rel + "/"
        f = os.path.join(root, "index.html"); h = open(f, encoding="utf8").read(); h0 = h
        if rel.startswith(NOINDEX) and 'name="robots"' not in h:
            h = h.replace("<head>", '<head>\n<meta name="robots" content="noindex">', 1)
        elif 'name="robots"' not in h and 'rel="canonical"' not in h:
            h = h.replace("<title>", f'<link rel="canonical" href="{SITE_URL}/{rel}">\n<title>', 1)
        if h != h0: open(f, "w", encoding="utf8").write(h)

def write_llms(alld, by_slug):
    """llms.txt (llmstxt.org): a short map of the site for AI agents — what it is, the terms, the JSON feed, every daf."""
    L = [f"# {BRAND} — דפי חזרה ולימוד לדף היומי", "",
         "> Hebrew interactive review pages for each daf of Daf Yomi (Babylonian Talmud): every give-and-take move of the "
         "sugya as its own step in plain Hebrew, Gemara quotes, summary aids and 8 understanding questions per daf. "
         "Written by an AI agent (Claude), checked against the Gemara text by an independent agent, corrected nightly "
         "from reader notes. Not a halachic ruling source.", "",
         "Prefer the JSON feed over scraping HTML: it carries the same content in a stable structure, with credit terms.", "",
         f"Terms: {FEED_TERMS['use']} {FEED_TERMS['credit']}. {FEED_TERMS['ai_note']}", "",
         "## Machine-readable",
         f"- [Feed documentation]({SITE_URL}/feed/): fields, terms and usage of the JSON feed",
         f"- [Feed index]({SITE_URL}/feed/v1/index.json): every daf with its JSON URL and last change",
         f"- [Glossary]({SITE_URL}/feed/v1/glossary.json): sages and terms used on the pages",
         f"- [Sitemap]({SITE_URL}/sitemap.xml)", "",
         "## About",
         f"- [How the pages are made]({SITE_URL}/about/): sources, writing, independent review, reader notes",
         f"- [Architecture]({SITE_URL}/architecture.html)",
         f"- [Changes]({SITE_URL}/changes/)", ""]
    for slug, ds in by_slug.items():
        L.append(f"## מסכת {ds[0]['tractate_he']} ({ds[0]['tractate']})")
        L += [f"- [{d['title']}]({SITE_URL}/{slug}/{d['daf']}/): {d.get('thesis', '')} — JSON: {SITE_URL}/feed/v1/{slug}/{d['daf']}.json" for d in ds]
        L.append("")
    open(os.path.join(DIST, "llms.txt"), "w", encoding="utf8").write("\n".join(L))

def write_feed(alld, glossary, lm):
    """Read-only JSON feed for partner apps (agreed use): /feed/v1/index.json, /feed/v1/<slug>/<daf>.json,
    /feed/v1/glossary.json. Same content as the daf pages, plus `_meta` with credit, links and the
    note-form deep link (?note=1 or ?note=<section id>). CORS-open via _headers."""
    base = os.path.join(DIST, "feed", FEED_V)
    os.makedirs(base, exist_ok=True)
    idx = []
    for d in alld:
        k = f"{d['slug']}/{d['daf']}"
        url = f"{SITE_URL}/{k}/"
        meta = {"url": url, "json": f"{SITE_URL}/feed/{FEED_V}/{k}.json", "date": yomi_date(d["slug"], d["daf"]),
                "updated": lm.get(f"{k}/"), "note_url": url + "?note=1", "note_url_section": url + "?note={section_id}",
                **FEED_TERMS}
        os.makedirs(os.path.join(base, d["slug"]), exist_ok=True)
        json.dump({"_meta": meta, **d}, open(os.path.join(base, d["slug"], f"{d['daf']}.json"), "w", encoding="utf8"),
                  ensure_ascii=False, separators=(",", ":"))
        idx.append({"slug": d["slug"], "tractate": d["tractate"], "tractate_he": d["tractate_he"], "daf": d["daf"],
                    "title": d["title"], "thesis": re.sub("<[^>]+>", "", d["thesis"]), "date": meta["date"],
                    "updated": meta["updated"], "url": url, "json": meta["json"]})
    json.dump({"version": FEED_V, "site": BRAND, "site_url": f"{SITE_URL}/", "docs": f"{SITE_URL}/feed/",
               "generated": il_today().isoformat(), "terms": FEED_TERMS, "glossary": f"{SITE_URL}/feed/{FEED_V}/glossary.json",
               "count": len(idx), "pages": idx},
              open(os.path.join(base, "index.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
    json.dump(glossary, open(os.path.join(base, "glossary.json"), "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))
    doc = os.path.join(ROOT, "content", "feed.html")
    if os.path.exists(doc):
        open(os.path.join(DIST, "feed", "index.html"), "w", encoding="utf8").write(page(
            "פיד הנתונים · " + BRAND, open(doc, encoding="utf8").read(), "פיד JSON לשותפים: דפי הלימוד של דף צמח", depth=1))


# "צור קשר": any [data-contact] link opens the note dialog in contact mode; app.js is loaded on first use. /#contact opens it too.
CONTACT_JS = ("""<script>(function(){function go(){if(window.dafContact)return window.dafContact();var s=document.createElement('script');"""
              """s.src="/app.js";s.onload=function(){window.dafContact&&window.dafContact()};document.head.appendChild(s)}"""
              """document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-contact]');if(!b)return;e.preventDefault();e.stopPropagation();go()},true);"""
              """if(location.hash==='#contact')go()})();</script>""")


def page(title, body, desc="", depth=0, og="site.png", canonical="", ld=""):
    up = "../" * depth
    ogi = f"{SITE_URL}/og/{og}"
    canon = f'<link rel="canonical" href="{canonical}">\n' if canonical else ""
    body = re.sub(r'((?:app|progress)\.js)(")', rf'\1?v={ASSET_V}\2', body)
    if 'class="dnav"' in body:
        body += f'\n<script src="/nav.js?v={ASSET_V}" defer></script>'
    body += f'\n<script src="/pwa.js?v={ASSET_V}" defer></script>'
    return f"""<!doctype html>
<html lang="he" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{esc(title)}</title>
{canon}{ld}<meta name="description" content="{esc(desc)}">
<meta property="og:site_name" content="{BRAND}"><meta property="og:type" content="website"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc)}">
<meta property="og:image" content="{ogi}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:locale" content="he_IL">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="{ogi}">
<link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#2B4C7E"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/favicon.ico" sizes="32x32"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/assistant-hebrew.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/frank-hebrew.woff2" as="font" type="font/woff2" crossorigin>
<style>{CSS}</style>
</head><body>
{body}
</body></html>
"""


# ---------------------------------------------------------------- daf page
def render_steps(steps, ref=None):
    out = ['  <ol class="steps">']
    for k, s in enumerate(steps):
        cls = ""  # חברותא hides answer steps (type a/c) client-side; the old per-step "hideable" flag is ignored
        p = f' data-p="{s["p"]}"' if "p" in s else ""
        if s.get("seg"):   # the Gemara segment this step explains (מורחב shows it under the step)
            p += f' data-seg="{s["seg"]}"'
        t = f' {s["type"]}' if s.get("type") else ""
        tg = s["tag"]
        if " · " in tg:  # "קושיה · רב אשי" → type, then the speaker on its own smaller line
            a_, b_ = tg.split(" · ", 1)
            tg = f'{a_}<span class="tsp">{b_}</span>'
        body = s["body"]
        if ref and "לא הורחב כאן" in body:  # the full Gemara wording is always one tap away
            body += f' <a class="src-full" href="https://www.sefaria.org/{ref}?lang=he" target="_blank" rel="noopener">לשון הגמרא המלאה בספריא ↗</a>'
        short = f'<span class="sbody">{s["short"]}</span>' if s.get("short") else ""   # תמצית: the step in one line
        out.append(f'    <li{cls} data-k="{k}"{p}><span class="tag{t}">{tg}</span><span class="body">{body}</span>{short}</li>')
    out.append("  </ol>")
    return "\n".join(out)


def render_table(t):
    """Opinions × cases matrix: {"title", "cols": [corner, opinion…], "rows": [[case, cell…], …]}."""
    head = "".join(f"<th>{c}</th>" for c in t["cols"])
    labels = [re.sub(r"<[^>]+>", "", str(c)).replace('"', "&quot;").strip() for c in t["cols"]]
    def cell(i, c):
        if i == 0:
            return f"<th>{c}</th>"
        lab = labels[i] if i < len(labels) else ""
        return f'<td data-l="{lab}">{c}</td>' if lab else f"<td>{c}</td>"
    rows = "".join("<tr>" + "".join(cell(i, c) for i, c in enumerate(r)) + "</tr>" for r in t["rows"])
    title = f'<div class="mtx-h">{t["title"]}</div>' if t.get("title") else ""
    note = f'<p class="ch-n mtx-n">{t["note"]}</p>' if t.get("note") else ""
    return f'  <div class="mtx">{title}<div class="mtx-s"><table><thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table></div>{note}</div>'


def render_decide(t):
    """If → then cards: {"title", "branches": [{"if": str, "then": [str, …]}, …]}."""
    cards = "".join(f'<div class="dc-b"><div class="dc-if"><span>אם</span> {b["if"]}</div><ul>'
                    + "".join(f"<li>{x}</li>" for x in b["then"]) + "</ul></div>" for b in t["branches"])
    title = f'<div class="mtx-h">{t["title"]}</div>' if t.get("title") else ""
    return f'  <div class="dc">{title}<div class="dc-g">{cards}</div></div>'


def render_chain(t):
    """Source chain: {"title", "links": [{"k": label, "t": text}, …], "note"?} — verse → derivation → rule → result."""
    items = "".join(f'<li><span class="ch-k">{x["k"]}</span><span class="ch-t">{x["t"]}</span></li>' for x in t["links"])
    title = f'<div class="mtx-h">{t["title"]}</div>' if t.get("title") else ""
    note = f'<p class="ch-n">{t["note"]}</p>' if t.get("note") else ""
    return f'  <div class="ch">{title}<ol>{items}</ol>{note}</div>'


def render_calc(t):
    """Worked numbers: {"title", "rows": [[label, value, cite?]], "lines": [[label, value]], "note"?}."""
    def row(r, cls=""):
        cite = f'<span class="cl-c">{r[2]}</span>' if len(r) > 2 and r[2] else ""
        return f'<li class="{cls}"><span class="cl-l">{r[0]}{cite}</span><span class="cl-v">{r[1]}</span></li>'
    body = "".join(row(r) for r in t["rows"]) + "".join(row(r, "sum") for r in t.get("lines", []))
    title = f'<div class="mtx-h">{t["title"]}</div>' if t.get("title") else ""
    note = f'<p class="ch-n">{t["note"]}</p>' if t.get("note") else ""
    return f'  <div class="ch cl">{title}<ul>{body}</ul>{note}</div>'


def _seq_split(x):
    """'move — answer' (or a short 'label: text') → (head, tail) so each card reads as a bold line plus its answer."""
    if " — " in x:
        h, t = x.split(" — ", 1)
        return h, t
    m = re.match(r"^([^:]{2,45}):\s+(.+)$", x)
    return (m[1], m[2]) if m and m[1].count("״") % 2 == 0 else ("", x)



def render_kt(k):
    """״לימא כתנאי״ made explicit, shown open before the steps: the question being tied to tannaim and its two
    sides, the tannaim's dispute, and each round of the give-and-take (proposal → rejection → where it lands).
    {"q", "sides": [{"label","say"}, {"label","say"}], "tannaim": [{"who","say"}], "rounds": [{"k","t","res"?}]}"""
    sides = "".join(f'<div class="kt-s"><b>{x.get("label","")}</b><span>{x["say"]}</span></div>' for x in k.get("sides", []))
    tn = "".join(f'<li><b>{x["who"]}:</b> {x["say"]}</li>' for x in k.get("tannaim", []))
    RES = {"נדחה": "no", "נדחית": "no", "מסקנה": "ok", "נשאר": "ok", "מתקבל": "ok"}
    rd = "".join(f'<li><span class="kt-k">{x["k"]}</span> {x["t"]}'
                 + (f' <span class="kt-res {RES.get(x["res"], "")}">{x["res"]}</span>' if x.get("res") else "") + "</li>"
                 for x in k.get("rounds", []))
    return ('  <details class="kt nogl" open><summary class="kt-h">לימא כתנאי — מה תולים במה?</summary>'
            f'<p class="kt-q"><b>השאלה:</b> {k["q"]}</p>'
            + (f'<div class="kt-sides">{sides}</div>' if sides else "")
            + (f'<div class="kt-t"><div class="kt-l">{k.get("src") or "מחלוקת התנאים"}</div><ul>{tn}</ul></div>' if tn else "")
            + (f'<div class="kt-t"><div class="kt-l">שלבי ההעמדה</div><ol class="kt-r">{rd}</ol></div>' if rd else "")
            + "</details>")


def _num(v):
    return f'<bdi>{v:g}</bdi>' 


FIGS = os.path.join(ROOT, "content", "figs")


def render_fig(figs):
    """Our own drawings for what a sugya talks about (parts of the eye, the ear, a coin…), where no outside
    sheet covers it: [{"src": "<content/figs/NAME.svg>", "cap": "…"}]. The SVG is ours, inlined, themed by CSS."""
    out = []
    for f in figs:
        fp = os.path.join(FIGS, f["src"] + ".svg")
        if not os.path.exists(fp):   # never break the build over a drawing still being made
            print("WARNING: missing drawing", f["src"]); continue
        svg = open(fp, encoding="utf8").read().strip()
        cap = f'<figcaption>{f["cap"]}</figcaption>' if f.get("cap") else ""
        view = f'<p class="fig-view">👁 {f["view"]}</p>' if f.get("view") else ""
        # colour key — only for the colours this drawing actually uses
        keys = [(c, t) for c, t in (("no", "אדום — מום / פסול"), ("ok", "ירוק — אינו מום / כשר"), ("ld", "קו מקווקו — מצביע על החלק"))
                if f'class="{c}' in svg or f' {c}"' in svg or f'class="sm {c}' in svg]
        key = ('<p class="fig-key">' + " · ".join(f'<span class="k-{c}">{t}</span>' for c, t in keys) + "</p>") if keys else ""
        ai = '<p class="fig-ai">איור שנוצר על ידי AI ונבדק מול הגמרא ורש״י · <button type="button" class="fig-fb">ראיתם טעות? כתבו הערה</button></p>'
        out.append(f'<figure class="fig">{view}{svg}{key}{cap}{ai}</figure>')
    return "".join(out)


def render_drawings(alld):
    """/drawings/: every drawing on the site in one place, by masechet, each linking to its sugya's עזרים."""
    groups, seen = {}, {}
    for d in alld:
        for s in d["sections"]:
            for f in s.get("fig") or []:
                if not os.path.exists(os.path.join(FIGS, f["src"] + ".svg")):
                    continue
                k = f["src"]
                link = (f'../{d["slug"]}/{d["daf"]}/#{d["key"]}-{s["id"]}-aids', f'{d["title"]} · {s.get("title", "")}')
                if k in seen:
                    seen[k]["links"].append(link); continue
                seen[k] = {"f": f, "links": [link]}
                groups.setdefault(d["tractate_he"], []).append(k)
    n = len(seen)
    toc = " ".join(f'<a class="back" href="#m-{i}">{esc(m)} ({len(ks)})</a>' for i, (m, ks) in enumerate(groups.items()))
    body = []
    for i, (m, ks) in enumerate(groups.items()):
        cards = []
        for k in ks:
            e = seen[k]
            fig = re.sub(r'<p class="fig-ai">.*?</p>', "", render_fig([e["f"]]), flags=re.S)
            links = " ".join(f'<a href="{h}">{esc(t)} ←</a>' for h, t in e["links"])
            cards.append(f'<article class="dr-card">{fig}<p class="dr-go">{links}</p></article>')
        body.append(f'<h2 class="dr-m" id="m-{i}">מסכת {esc(m)}</h2>' + "".join(cards))
    return n, page(
        "איורים · " + SITE_TITLE,
        f'<div class="wrap" id="app"><section><a class="back" href="../">→ דף הבית</a><header>'
        f'<div class="eyebrow">עזרים</div><h1>כל האיורים</h1>'
        f'<p class="thesis">{n} איורים שציירנו לסוגיות — מומים, סוכה, מקומות ומידות. כל איור מוביל לסוגיה שלו.</p></header>'
        f'<p class="about-link">{toc}</p>'
        f'<p class="fig-ai">האיורים נוצרו על ידי AI ונבדקו מול הגמרא ורש״י. ראיתם טעות? כתבו הערה מתוך הסוגיה עצמה.</p>'
        f'{"".join(body)}<footer>{FOOT}</footer></section></div>', "כל האיורים באתר, לפי מסכת", depth=1)


def render_scale(sc):
    """Measures drawn to scale, so the learner sees how the opinions / sizes compare:
    {"title", "groups": [{"label", "unit", "min"?, "bars": [{"name", "v", "note"?}], "note"?}]}.
    `min` > 0 zooms in (the bar starts there, marked), for differences of half a finger on a cubit."""
    out = []
    for g in sc["groups"]:
        lo = g.get("min", 0); hi = max(b["v"] for b in g["bars"])
        rows = []
        for k, b in enumerate(g["bars"]):
            w = 100 * (b["v"] - lo) / max(hi - lo, 1e-9)
            note = f'<span class="scl-n">{b["note"]}</span>' if b.get("note") else ""
            rows.append(f'<div class="scl-r c{k % 4}"><span class="scl-name">{b["name"]}</span>'
                        f'<span class="scl-bar"><i style="width:{max(w, 2):.1f}%"></i></span>'
                        f'<span class="scl-v">{_num(b["v"])} {g.get("unit", "")}</span>{note}</div>')
        zoom = f'<div class="scl-z">מוגדל: הפסים מתחילים ב־{_num(lo)} {g.get("unit", "")}, כדי שההבדל ייראה</div>' if lo else ""
        gnote = f'<div class="scl-gn">{g["note"]}</div>' if g.get("note") else ""
        out.append(f'<div class="scl-g"><div class="scl-l">{g["label"]}</div>{"".join(rows)}{zoom}{gnote}</div>')
    title = f'<div class="mtx-h">{sc["title"]}</div>' if sc.get("title") else ""
    return f'  <div class="scl nogl">{title}{"".join(out)}</div>'

def render_seq(t):
    """Order of events (a story, a process or a chain of moves): {"title", "items": [str, …]} — numbered cards
    joined by arrows; an item 'move — answer' shows the move bold and the answer under it."""
    def card(i, x):
        h, tl = _seq_split(x)
        head = f'<span class="sq-h">{h}</span>' if h else ""
        return f'<li><span class="sq-n">{i}</span><span class="sq-b">{head}<span class="sq-t">{tl}</span></span></li>'
    items = "".join(card(i, x) for i, x in enumerate(t["items"], 1))
    title = f'<div class="mtx-h">{t["title"]}</div>' if t.get("title") else ""
    return f'  <div class="ch sq">{title}<ol>{items}</ol></div>'


MAP_KINDS = {"מבאר": "exp", "מעמיד": "exp", "חולק": "dis", "דוחה": "rej", "מקשה": "rej", "פוסק כ": "hal", "הלכה כ": "hal",
             "מסייע": "sup", "מוכיח": "sup", "מציע": "pro"}


def render_map(m, mid=""):
    """Map of views — who said what, who explains / disputes / rules like whom, and where it ends up.
    {"title", "tiers": [{"label", "nodes": [{"id", "name", "say", "rejected"?}]}],
     "links": [{"from", "to": id | [ids], "k": "מבאר|חולק|דוחה|מקשה|הלכה כ|מסייע|מציע|…", "note"?}], "end"?}
    Arrows are drawn by app.js over the cards; each card also lists its links in words (narrow screens, no JS)."""
    names = {n["id"]: n["name"] for t in m["tiers"] for n in t["nodes"]}
    out_links = {}
    for l in m.get("links", []):
        tos = l["to"] if isinstance(l["to"], list) else [l["to"]]
        out_links.setdefault(l["from"], []).append((l["k"], [names.get(t, t) for t in tos], l.get("note", "")))
    tiers, tones = [], []
    for t in m["tiers"]:
        nodes = []
        for n in t["nodes"]:
            rel = "".join(f'<li class="k-{MAP_KINDS.get(k, "exp")}"><b>{esc(k)}</b> {esc(", ".join(ts))}{(" — " + esc(nt)) if nt else ""}</li>'
                          for k, ts, nt in out_links.get(n["id"], []))
            cls = "vm-node rej" if n.get("rejected") else "vm-node"
            nodes.append(f'<div class="{cls}" data-id="{esc(n["id"])}"><b class="vm-name">{n["name"]}</b>'
                         f'<span class="vm-say">{n["say"]}</span>{f"<ul class=vm-rel>{rel}</ul>" if rel else ""}</div>')
        tone = t.get("tone") or ("a" if "אמורא" in t["label"] else "t1" if "יסוד" in t["label"] else "t2" if "תנא" in t["label"] else "a")
        tones.append((tone, t["label"]))
        tiers.append(f'<div class="vm-tier tone-{tone}"><div class="vm-lbl">{t["label"]}</div><div class="vm-row">{"".join(nodes)}</div></div>')
    links = json.dumps([{"f": l["from"], "t": l["to"] if isinstance(l["to"], list) else [l["to"]], "k": l["k"],
                         "c": MAP_KINDS.get(l["k"], "exp")} for l in m.get("links", [])], ensure_ascii=False)
    title = f'<div class="mtx-h">{m["title"]}</div>' if m.get("title") else ""
    end = f'<div class="vm-end"><b>לאן זה מתכנס</b> {m["end"]}</div>' if m.get("end") else ""
    kinds = []
    for l in m.get("links", []):
        c = MAP_KINDS.get(l["k"], "exp")
        if (l["k"], c) not in kinds:
            kinds.append((l["k"], c))
    leg = ("".join(f'<span class="lg-n tone-{t}"><i></i>{esc(lb)}</span>' for t, lb in tones)
           + ('<span class="lg-n tone-rej"><i></i>הצעה שנדחתה</span>' if any(n.get("rejected") for t in m["tiers"] for n in t["nodes"]) else "")
           + "".join(f'<span class="lg-k k-{c}"><i></i>{esc(k)}</span>' for k, c in kinds))
    title += f'<div class="vm-leg">{leg}</div>'
    share = f'<button class="vm-share" type="button" data-share="#{mid}" aria-label="קישור למפה">🔗 קישור למפה</button>' if mid else ""
    return (f'  <div class="vmap" id="{mid}" data-links="{esc(links)}">{share}{title}<div class="vm-body">{"".join(tiers)}'
            f'<svg class="vm-svg" aria-hidden="true"></svg></div>{end}</div>')


def cont_link(d, s, way):
    """Links between the two parts of a sugya split across dapim (amud label or "cont": "next"/"prev")."""
    amud = s.get("amud", "")
    if way == "next" and s.get("cont") != "next" and "ממשיך" not in amud and not s.get("ends_next"):
        # unlabelled: still link if this is the daf's last sugya and the next daf opens with "המשך מדף…"
        mine = [x for x in d["sections"] if x.get("kind") != "raw" and x["id"] != "sum"]
        n = DAFS.get((d["slug"], d["daf"] + 1))
        first = next((x for x in (n or {}).get("sections", []) if x.get("kind") != "raw"), None)
        if not (mine and mine[-1] is s and first and (first.get("cont") == "prev" or "המשך" in first.get("amud", ""))):
            return ""
    if way == "next":
        n = DAFS.get((d["slug"], d["daf"] + 1))
        if not n:
            return f'  <p class="cont nogl">הסוגיה ממשיכה בדף {heb_num(d["daf"] + 1)}</p>'
        secs = [x for x in n["sections"] if x.get("kind") != "raw"]
        t = next((x for x in secs if x.get("cont") == "prev" or "המשך" in x.get("amud", "")), secs[0] if secs else None)
        if not t:
            return ""
        if s.get("ends_next"):
            return f'  <a class="cont" href="../{n["daf"]}/#{n["key"]}-{t["id"]}">סוף הסוגיה (מראש דף {heb_num(n["daf"])}) מובא כאן; לעיון שם ←</a>'
        return f'  <a class="cont" href="../{n["daf"]}/#{n["key"]}-{t["id"]}">המשך הסוגיה בדף {heb_num(n["daf"])} ←</a>'
    if way == "prev" and not (s.get("cont") == "prev" or "המשך מדף" in amud or "המשך האגדה מדף" in amud):
        # unlabelled: link if this is the daf's first sugya and the previous daf's last one says "ממשיך"
        mine = [x for x in d["sections"] if x.get("kind") != "raw"]
        pd = DAFS.get((d["slug"], d["daf"] - 1))
        plast = [x for x in (pd or {}).get("sections", []) if x.get("kind") != "raw" and x["id"] != "sum"]
        if not (mine and mine[0] is s and plast and (plast[-1].get("cont") == "next" or "ממשיך" in plast[-1].get("amud", ""))):
            return ""
    if way == "prev":
        p = DAFS.get((d["slug"], d["daf"] - 1))
        if not p:
            return ""
        secs = [x for x in p["sections"] if x.get("kind") != "raw" and x["id"] != "sum"]
        t = next((x for x in reversed(secs) if x.get("cont") == "next" or "ממשיך" in x.get("amud", "")), secs[-1] if secs else None)
        if not t:
            return ""
        return f'  <a class="cont prev" href="../{p["daf"]}/#{p["key"]}-{t["id"]}">→ תחילת הסוגיה בדף {heb_num(p["daf"])}</a>'
    return ""



HEB_L = "\u05d0-\u05ea"
def split_paras(t, target=150):
    """Split a "בקצרה" paragraph into short paragraphs (~2 sentences) at sentence ends outside parentheses."""
    sents, buf, q, par, i = [], "", False, 0, 0
    tags = re.compile(r"<[^>]+>")
    while i < len(t):
        m = tags.match(t, i)
        if m: buf += m.group(0); i = m.end(); continue
        c = t[i]; buf += c
        if c == "(": par += 1
        elif c == ")": par = max(0, par - 1)
        elif c in ".?!;" and not par and (i + 1 == len(t) or t[i+1] == " "):
            sents.append(buf.strip()); buf = ""
        i += 1
    if buf.strip(): sents.append(buf.strip())
    paras, cur = [], ""
    L = lambda z: len(re.sub(r"<[^>]+>", "", z))
    for x in sents:
        if cur and L(cur) + L(x) > target and L(cur) >= 50: paras.append(cur); cur = x
        else: cur = (cur + " " + x).strip()
    if cur:
        if paras and len(re.sub(r"<[^>]+>", "", cur)) < 40: paras[-1] += " " + cur
        else: paras.append(cur)
    return paras


def flow_paras(t, target=150):
    return '<div class="explain flow">' + "".join(f"<p>{x}</p>" for x in split_paras(t, target)) + "</div>"

def render_section(d, s):
    sid = f'{d["key"]}-{s["id"]}'
    ref = f' data-ref="{s["ref"]}"' if s.get("ref") else ""
    stg = ""
    if s.get("stages"):   # milestones of a long sugya: [{"at": step index, "q": the question of this stage, "a": its answer}]
        stg = " data-stages='" + json.dumps(s["stages"], ensure_ascii=False).replace("&", "&amp;").replace("'", "&#39;") + "'"
    parts = [f'<section class="sugya{" stgd" if stg else ""}" id="{sid}"{stg}>', f'  <div class="amud"{ref}>{s["amud"]}</div>']
    if s.get("title"):
        parts.append(f'  <h3>{s["title"]}</h3>')
    if s["kind"] != "raw":
        parts.append(cont_link(d, s, "prev"))
    if s["kind"] == "raw":
        parts.append("  " + s["html"])
    else:
        if s.get("quote"):
            parts.append(f'  <blockquote>{s["quote"]["text"]}<cite>{s["quote"]["cite"]}</cite></blockquote>')
        if s.get("unlock"):   # the case / concept the Gemara assumes the learner knows — shown at every reading level
            parts.append(f'  <details class="unlock"><summary class="unlock-h">🔑 מפתח לסוגיה</summary><p>{s["unlock"]}</p></details>')
        if s.get("flow"):
            parts.append(f'  <details class="flowd"><summary>בקצרה — על מה הסוגיה</summary>{flow_paras(s["flow"])}</details>')
        if s.get("pre"):
            parts.append("  " + s["pre"])
        if s.get("map"):   # say up front that a map exists — it helps most before learning the sugya
            parts.append('  <button class="aid-hint" type="button" data-open-aid="map">🗺️ יש מפת שיטות לסוגיה — מי אמר מה ואיך זה מתכנס. הצג ←</button>')
        if s.get("kt"):
            parts.append(render_kt(s["kt"]))
        parts.append(render_steps(s["steps"], s.get("ref")))
        if s.get("scale"):
            parts.append(render_scale(s["scale"]))
        aids, names = [], []
        if s.get("table"):
            aids.append(render_table(s["table"])); names.append("טבלת שיטות")
        if s.get("decide"):
            aids.append(render_decide(s["decide"])); names.append("אם… אז…")
        if s.get("chain"):
            aids.append(render_chain(s["chain"])); names.append("שרשרת לימוד")
        if s.get("calc"):
            aids.append(render_calc(s["calc"])); names.append("חשבון")
        if s.get("seq"):
            aids.append(render_seq(s["seq"])); names.append("סדר האירועים")
        if s.get("fig"):
            aids.append(render_fig(s["fig"])); names.append("איור")
        if s.get("map"):
            aids.append(render_map(s["map"], f"{sid}-map")); names.append("מפת השיטות")
        swc = [c for c in sw_charts(d["slug"], d["daf"]) if c["sec"] == s["id"]]
        if swc:   # Simon Wolf's sheet for this sugya, linked at the source (with permission)
            aids.append('<div class="sw-aid">' + "".join(
                f'<a class="sw-sec" title="{esc(c["en"])}" href="{esc(c["href"])}" target="_blank" rel="noopener" data-external="1">📊 {esc(c["title"])} <small>(PDF)</small></a>' for c in swc)
                + '<p class="sw-cr">באדיבות <bdi dir="ltr">Simon Wolf (<a href="https://www.swdaf.com/" target="_blank" rel="noopener" data-external="1">www.swdaf.com</a>)</bdi></p></div>')
            names.append("דף עזר של Simon Wolf" if len(swc) == 1 else "דפי עזר של Simon Wolf")
        if aids:
            parts.append(f'  <details class="aids" id="{sid}-aids"><summary>עזרים — {" · ".join(names)}</summary>' + "\n".join(aids) + "</details>")
        if s.get("post"):
            parts.append("  " + s["post"])
        parts.append(cont_link(d, s, "next"))
    parts.append("</section>")
    return "\n".join(parts)


def lab_registry():
    p = os.path.join(ROOT, "lab", "index.json")
    return json.load(open(p, encoding="utf8")) if os.path.exists(p) else []


LAB = {}


def render_daf(d, prev, nxt, glossary, sources):
    key = d["key"]
    mins = [m for m in d["meta"] if "דקות" in m]
    meta = "".join(f"<span>{esc(m)}</span>" for m in d["meta"] if m not in mins and m.strip() != "עמודים א–ב")
    meta += '<span class="ai-badge">נוצר על ידי סוכן AI</span>'
    # the masechet is already in the breadcrumb and the title
    # perek goes next to the title as "פרק ב׳"; "הדף היומי" and the masechet (in breadcrumb + title) are dropped
    ORD = {"ראשון": "א׳", "שני": "ב׳", "שלישי": "ג׳", "רביעי": "ד׳", "חמישי": "ה׳", "שישי": "ו׳", "שביעי": "ז׳",
           "שמיני": "ח׳", "תשיעי": "ט׳", "עשירי": "י׳"}
    perek, rest = "", []
    for x in (y.strip() for y in d["eyebrow"].split(" · ")):
        if x in ("הדף היומי", f"מסכת {d['tractate_he']}"): continue
        if "פרק" in x:
            perek = re.sub(r"פרק (\S+)", lambda m: "פרק " + ORD.get(m.group(1), m.group(1)), x)
            perek = perek.replace("סוף ", "").replace("ותחילת", "–").replace(" – פרק ", "–")
            continue
        rest.append(x)
    eyebrow = " · ".join(rest)
    mins = esc(mins[0].replace("דקות לימוד", "דק׳").replace("דקות", "דק׳")) if mins else ""
    nav = "\n".join(f'    <li><a href="#{key}-{n["id"]}"><span class="amud">{n["amud"]}</span>{n["title"]}</a></li>' for n in d["nav"])
    story = (f'<details class="storyline"><summary class="sl-h">הקדמה — הסיפור של הדף</summary>{"".join(f"<p>{x}</p>" for x in split_paras(d["storyline"], 160))}</details>'
             if d.get("storyline") else "")
    sections = "\n\n".join(render_section(d, s) for s in d["sections"])
    lk = list(d.get("links", []))
    ds = DAFSPOILER.get(d["slug"])
    if ds and d["daf"] in ds.get("dapim", []) and not any("dafspoiler.com" in l["href"] for l in lk):
        lk.append({"href": f'https://dafspoiler.com/index.html?masechta={ds["id"]}&daf={d["daf"]}',
                   "text": "הכנה לדף — Daf Spoiler (הרב נפתלי רמתי)"})
    links = "\n".join(f'    <li><a href="{esc(l["href"])}">{esc(l["text"])}</a></li>' for l in lk)
    sw = sw_charts(d["slug"], d["daf"])
    SWC = 'באדיבות <bdi dir="ltr">Simon Wolf (<a href="https://www.swdaf.com/" target="_blank" rel="noopener" data-external="1">www.swdaf.com</a>)</bdi>'
    if sw:
        links += (f'\n    <li class="sw-li">תרשימים ודפי עיון — {SWC}<ul>'
                  + "".join(f'<li><a href="{esc(c["href"])}" target="_blank" rel="noopener" data-external="1" title="{esc(c["en"])}">{esc(c["title"])} <small>(PDF)</small></a>'
                          + (f' · <a href="#{key}-{c["sec"]}-aids">בסוגיה ↑</a>' if c["sec"] else "") + '</li>' for c in sw)
                  + '</ul></li>')
    sw_top = (f'<a class="to-quiz to-sw" href="#{key}-more"><span>📊 {"דף עזר" if len(sw) == 1 else f"{len(sw)} דפי עזר"} לדף · <bdi dir="ltr">Simon Wolf</bdi> ↓</span></a>' if sw else "")
    pn = []
    for k, fmt in ((neighbour(d["slug"], d["daf"], -1), '→ {}'), (neighbour(d["slug"], d["daf"], 1), '{} ←')):
        if k:
            lbl = f"דף {heb_num(k[1])}" if k[0] == d["slug"] else f"{BOUNDS[k[0]][0]} {heb_num(k[1])}"
            pn.append(f'<a class="back" href="../../{k[0]}/{k[1]}/">{fmt.format(lbl)}</a>')
    tree_btn = ('    <button class="btn" data-role="tree" aria-pressed="false" type="button" title="תצוגת עץ: כל שלב מוזח תחת השלב שעליו הוא עונה">עץ</button>\n'
                if any(s.get("steps") for s in d["sections"]) else "")
    pager = f'<div class="pager">{"".join(pn)}</div>' if pn else ""
    article = f"""<article class="daf" id="{key}" data-tractate="{d['tractate']}" data-daf="{d['daf']}">
<div class="topnav"><span><a class="back" href="../../">דף הבית</a> · <a class="back" href="../">מסכת {d['tractate_he']}</a></span></div>
{navbar(d['slug'], d['daf'], '../../')}

<header>
  {f'<div class="eyebrow">{esc(eyebrow)}</div>' if eyebrow else ''}
  <div class="titlerow"><h1>{esc(d['title'])}</h1><span class="tmeta">{f'<span class="perek">{esc(perek)}</span>' if perek else ''}{f'<span>{mins}</span>' if mins else ''}<a class="src" target="_blank" rel="noopener" href="https://www.sefaria.org/{d['tractate']}.{d['daf']}a?lang=he">ספריא</a></span></div>
  <p class="thesis">{d['thesis']}</p>
  <div class="meta">{meta}<span class="sec-tools pg-tools"></span></div>
  <div class="legend"><span class="lg-gem">״לשון הגמרא״</span><span>ביאור</span><span class="lp">חכם</span><span class="lt">מושג</span><span>— הקש על מילה מסומנת או על ציטוט להסבר</span></div>
  <div class="controls">
    <button class="btn btn-ic" data-role="prefs" aria-expanded="false" type="button" aria-label="הגדרות" title="הגדרות">⚙</button>
    <button class="btn" data-role="mode" aria-pressed="false" type="button" title="מצב חברותא: התשובות מוסתרות — הקש על שלב לגילוי">חברותא</button>
{tree_btn}    <button class="btn" data-role="learned" aria-pressed="false" type="button" title="סמן את כל הסוגיות בדף כנלמדו">למדתי</button>
  </div>
</header>

<nav class="map" aria-label="מפת הסוגיות">
  <h2>מהלך הדף</h2>
  <ol>
{nav}
  </ol>
</nav>
<a class="to-quiz" href="#{key}-quiz">✎ שאלות הבנה על הדף — בסוף הדף ↓</a>
{sw_top}
{story}

{sections}

<section class="sugya" id="{key}-quiz">
  <div class="amud">בסוף הדף</div>
  <h3>שאלות הבנה <span class="score" data-role="score"></span></h3>
  <div class="quiz" data-role="quizBox"></div>
  <button class="btn" data-role="resetQuiz" type="button" style="margin-top:14px">התחל מחדש</button>
</section>
{pager}

<section class="sugya" id="{key}-more">
  <div class="amud">להעמקה</div>
  <h3>מקורות להעמקה</h3>
  <ul class="links">
{links}
  </ul>
</section>
{credits('../../')}
<footer>{esc(d.get('footer') or FOOT)}</footer>

{jscript(d['quiz'], cls='qdata')}
</article>"""
    blob = article
    gl = {k: v for k, v in glossary.items() if k in blob}
    src = dict(sources)  # shared verses / halacha (small); the hub links only those cited on the page
    src.update(d.get("srctext", {}))
    body = f"""<div class="wrap" id="app">
{article}
</div>
{jscript(src, id='srctext')}
{jscript(gl, id='glossary')}
{catalog_json()}
<script src="../../app.js" defer></script>
<script src="../../progress.js" defer></script>
<!-- Sefaria Linker v3, tracking only: lists this page in Sefaria's "Web Pages" panel for the texts it cites; excludeFromLinking keeps the page UI untouched -->
<script src="https://www.sefaria.org/linker.v3.js" charset="utf-8" defer></script>
<script>addEventListener("load",function(){{try{{sefaria.link({{whitelistSelector:".daf header h1",excludeFromLinking:"title,body",contentLang:"hebrew",interfaceLang:"hebrew"}})}}catch(e){{}}}});</script>"""
    desc = re.sub("<[^>]+>", "", d["thesis"])
    og = f"{d['slug']}-{d['daf']}.png"
    if not os.path.exists(os.path.join(ROOT, "site", "og", og)):
        og = "site.png"
    return page(f"{d['title']} · דף חזרה ולימוד · {BRAND}", body, desc, depth=2, og=og,
                canonical=f"{SITE_URL}/{d['slug']}/{d['daf']}/", ld=ldjson(d) + "\n")


# ---------------------------------------------------------------- index pages
def card(d, href):
    c = d.get("card", {})
    stats = f"<span>{len(d['nav'])} סוגיות</span><span>{len(d['quiz'])} שאלות חזרה</span><span>נבדק מול הגמרא</span>"
    return f"""  <a class="card" href="{href}">
    <div class="top"><h3>{esc(d['title'])}</h3><span class="date">{esc(c.get('date', ''))}</span></div>
    <p>{esc(c.get('topics', ''))}</p>
    <div class="stats">{stats}</div>
  </a>"""


def render_masechet(slug, dafim):
    first = dafim[0]
    cards = "\n".join(card(d, f"./{d['daf']}/") for d in sorted(dafim, key=lambda x: -x["daf"]))
    body = f"""<div class="wrap" id="app"><section>
<a class="back" href="../">→ דף הבית</a>
{navbar(slug, 0, '../')}
<header>
  <div class="eyebrow">דפי חזרה ולימוד · נוצר על ידי סוכן AI</div>
  <h1>מסכת {first['tractate_he']}</h1>
  <p class="thesis">{len(dafim)} דפים זמינים</p>
</header>
<div id="progress-mas" data-slug="{slug}"></div>
<div class="cards">
{cards}
</div>
{credits('../')}
<footer>{FOOT}</footer>
</section></div>
{catalog_json()}
<script src="../progress.js"></script>"""
    return page(f"מסכת {first['tractate_he']} · דפי חזרה ולימוד", body, f"דפי חזרה ולימוד למסכת {first['tractate_he']}", depth=1)


def changelog():
    p = os.path.join(ROOT, "data", "changelog.json")
    return json.load(open(p, encoding="utf8")) if os.path.exists(p) else []


def fmt_day(iso):
    y, m, d = iso.split("-")
    return f"{int(d)}.{int(m)}"


def whatsnew(limit=None, link=True):
    log, out, n = changelog(), [], 0
    for e in log:
        items = e["items"] if limit is None else e["items"][:max(0, limit - n)]
        if not items:
            break
        n += len(items)
        out.append(f'<li><span class="wn-d">{fmt_day(e["date"])}</span><ul>' + "".join(f"<li>{x}</li>" for x in items) + "</ul></li>")
    if not out:
        return ""
    more = '<a class="back" href="./changes/">כל השינויים ←</a>' if link else ""
    return f'<section class="wn"><h2 class="sec-h">מה חדש באתר</h2><ul class="wn-l">{"".join(out)}</ul>{more}</section>'



def howto_block():
    """Home: the "how to use it in three minutes" guide, in a dialog opened from its tile (progress.js)."""
    return """<dialog class="howto pg-dlg" id="howto" aria-label="איך משתמשים">
  <div class="pg-dlg-h"><h2>איך משתמשים — בשלוש דקות</h2><button class="btn" type="button" data-close>סגור</button></div>
  <p class="howto-lead">מה עושה את ההבדל: <b>חזרה שבודקת שבאמת הבנתם</b>, ו<b>חלוקה לסוגיות עם מעקב התקדמות</b> — כך יודעים בדיוק מה כבר יושב ומה עוד לא. ואפשר לחזור <b>בכל רגע פנוי</b>: בתור בסופר, באוטובוס — מהטלפון, גם בלי חיבור. מתחברים עם Google — ומתחילים במחשב וממשיכים בטלפון מאותה נקודה.</p>
  <ol>
    <li><b>בוחרים דף ומתקדמים סוגיה אחר סוגיה.</b> דף היום מופיע ראשון. כל סוגיה שקראתם מסומנת ✓ ב״מהלך הדף״, וסרגל בצד מראה איפה אתם.</li>
    <li><b>קוראים את מהלך הסוגיה.</b> כל שלב מתויג — משנה, קושיה, תירוץ, מסקנה — ובתצוגת עץ כל שלב מוזח תחת השלב שעליו הוא עונה. ״בקצרה״ נותן את התמונה במשפט־שניים.</li>
    <li><b>רוצים לבדוק את עצמכם תוך כדי?</b> כפתור ״חברותא״ מסתיר את התשובות: עוצרים, מנסים לענות, ומקישים על השלב כדי לגלות ולסמן אם ידעתם.</li>
    <li><b>נעזרים במקור.</b> הקשה על ציטוט מהגמרא מביאה את ביאור שטיינזלץ (ורש״י כשיש); הקשה על שם או מונח מסומן מסבירה מי ומה; כפתור ״הגמרא״ פותח את לשון הגמרא.</li>
    <li><b>בודקים את עצמכם.</b> שאלות החזרה בסוף הדף בודקות שהבנתם, לא רק שקראתם; שאלה שטעיתם בה חוזרת אליכם אחרי יום, ואחר כך אחרי 3, 7 ו־21 ימים. 🔊 בכל סוגיה מקריא אותה בקול.</li>
  </ol>
</dialog>
<script>(function(){var d=document.getElementById('howto');d.querySelector('[data-close]').onclick=function(){d.close()};
d.addEventListener('click',function(e){if(e.target===d)d.close()});d.addEventListener('close',function(){try{localStorage.setItem('howto-seen','1')}catch(e){}});})();</script>"""


def home_data():
    """What the home tiles need from the build: the latest site change and the active lab comparison."""
    log = changelog()
    wn = {"d": fmt_day(log[0]["date"]), "x": re.sub("<[^>]+>", "", log[0]["items"][0])[:90]} if log and log[0]["items"] else None
    lab = None
    if LAB:
        e = list(LAB.values())[-1]
        lab = {"page": f"{e['slug']}/{e['daf']}", "title": e["title"]}
    nfig = len({f["src"] for d in DAFS.values() for x in d["sections"] for f in (x.get("fig") or []) if os.path.exists(os.path.join(FIGS, f["src"] + ".svg"))})
    return jscript({"wn": wn, "lab": lab, "figs": nfig}, id="home-data")


def render_home(by_slug, latest, about):
    mas = " ".join(f'<a href="./{s}/">מסכת {ds[0]["tractate_he"]}</a>' for s, ds in by_slug.items())
    body = f"""<div class="wrap" id="app"><section id="home">
<header class="home-h">
  <div class="home-top"><div class="eyebrow">{BRAND}</div></div>
  <h1>דפי חזרה ולימוד לדף היומי</h1>
  <div class="meta"><span class="ai-badge">נוצר ע״י AI</span><span>נבדק בקריאה אנושית</span><a id="today-users" class="back" href="./stats/" hidden></a></div>
</header>
{navbar()}
<div id="progress-home"></div>
<noscript><p class="home-mas">{mas}</p></noscript>
{howto_block()}
<p class="about-link"><a class="back" href="./about/">איך נבנים הדפים</a> <a class="back" href="./ideas/">רעיונות לשיפור</a> <a class="back" href="./notes/">הערות קוראים</a> <a class="back" href="./stats/">נתוני ביקורים</a> <a class="back" href="./changes/">כל השינויים</a> <a class="back" href="./drawings/">כל האיורים</a> <a class="back" href="./privacy/">פרטיות</a> <a class="back" href="#contact" data-contact>✉ צור קשר</a></p>
{credits('')}
<footer>{FOOT}</footer>
</section></div>
{catalog_json()}
{home_data()}
<script src="progress.js"></script>
{CONTACT_JS}"""
    site_ld = {"@context": "https://schema.org", "@type": "WebSite", "name": BRAND, "url": f"{SITE_URL}/",
               "alternateName": ["דפי חזרה ולימוד", "דף צמח — הדף היומי", "daf.tsemach.dev"], "inLanguage": "he",
               "description": "דפי חזרה ולימוד אינטראקטיביים לדף היומי"}
    return page(f"{BRAND} — דפי חזרה ולימוד לדף היומי", body,
                f"{BRAND}: דפי חזרה ולימוד אינטראקטיביים לדף היומי — מהלך הסוגיה, תצוגת עץ, מקורות ושאלות חזרה",
                canonical=f"{SITE_URL}/", ld='<script type="application/ld+json">' + json.dumps(site_ld, ensure_ascii=False) + "</script>\n")


def render_feedback(by_slug):
    names = {slug: ds[0]["tractate_he"] for slug, ds in by_slug.items()}
    body = f"""<div class="wrap" id="app"><section id="fbtrack">
<a class="back" href="../">→ דף הבית</a>
<header>
  <div class="eyebrow">הערות קוראים</div>
  <h1>מעקב אחר ההערות שלי</h1>
  <p class="thesis">כאן מופיע מצב הטיפול בהערות ששלחתם מהדפדפן הזה, או דרך קישור המעקב שקיבלתם.</p>
</header>
<div id="fb-list" class="fb-list" aria-live="polite"><p class="fb-muted">טוען…</p></div>
<p class="fb-muted">כל הערה נבדקת מול לשון הגמרא בסבב העדכון הלילי. ההערות אנונימיות; כתובת מייל, אם נמסרה, משמשת רק לעדכון ונמחקת אחריו.</p>
{credits('../')}
<footer>{FOOT}</footer>
</section></div>
{jscript(names, id="fb-names")}
<script src="../app.js" defer></script>"""
    return page("מעקב הערות · " + SITE_TITLE, body, "מצב הטיפול בהערות קוראים", depth=1)


def lab_version_page(d, slug, glossary, sources, model):
    """A full daf page for the comparison lab: absolute links, no progress tracking or notes."""
    g = dict(glossary); g.update(d.get("glossextra", {}))
    src = dict(sources); src.update(d.get("srcextra", {}))
    html = render_daf(d, None, None, g, src)
    html = html.replace('="../../', '="/').replace('href="../', f'href="/{slug}/')
    html = re.sub(r'<script src="/progress\.js[^"]*" defer></script>', "", html)
    html = html.replace('<html lang="he"', '<html class="lab" lang="he"', 1)
    html = html.replace("<head>", '<head>\n<meta name="robots" content="noindex"><base target="_top">', 1)
    return html


def render_lab(glossary, sources):
    for e in LAB.values():
        slug, daf = e["slug"], e["daf"]
        base = os.path.join(DIST, "lab", slug, str(daf))
        for v in e["versions"]:
            d = DAFS[(slug, daf)] if not v.get("file") else json.load(open(os.path.join(ROOT, "lab", v["file"]), encoding="utf8"))
            os.makedirs(os.path.join(base, v["id"]), exist_ok=True)
            open(os.path.join(base, v["id"], "index.html"), "w", encoding="utf8").write(lab_version_page(d, slug, glossary, sources, v["model"]))
        cfg = {"page": f"{slug}/{daf}", "versions": [{"id": v["id"], "model": v["model"], "note": v.get("note", "")} for v in e["versions"]]}
        body = f"""<div class="wrap wide" id="app"><section id="lab">
<a class="back" href="/{slug}/{daf}/">→ חזרה ל{esc(e["title"])}</a>
<header>
  <div class="eyebrow">ניסוי · השוואת מודלים</div>
  <h1>{esc(e["title"])}: {NVER.get(len(e["versions"]), str(len(e["versions"])))} גרסאות</h1>
  <p class="thesis">אותו דף ואותם מקורות — מודלים שונים או תהליכי כתיבה שונים כתבו אותו. שמות הגרסאות מוסתרים עד שתבחרו איזו גרסה עזרה לכם יותר.</p>
</header>
<label class="lab-sync"><input type="checkbox" checked> גלילה משותפת — כל הגרסאות נגללות יחד לאותה סוגיה</label>
<div class="lab-tabs" role="tablist"></div>
<div class="lab-frames"></div>
<div class="lab-vote">
  <p class="lab-q">איזו גרסה עזרה לך יותר להבין את הדף?</p>
  <div class="lab-btns"></div>
  <p class="lab-res" aria-live="polite"></p>
</div>
<p class="fb-muted">ההתקדמות וההערות נשמרות רק בדף הרגיל. ההצבעה אנונימית.</p>
</section></div>
{jscript(cfg, id="lab-cfg")}
<script>{LAB_JS}</script>"""
        open(os.path.join(base, "index.html"), "w", encoding="utf8").write(page(f"השוואת גרסאות · {e['title']} · " + SITE_TITLE, body, "שתי גרסאות של אותו דף, שכתבו מודלים שונים — השוו והצביעו", depth=3))


NVER = {2: "שתי", 3: "שלוש", 4: "ארבע"}

LAB_JS = r"""(function(){
var C=JSON.parse(document.getElementById('lab-cfg').textContent), V=C.versions.slice(), L='אבגד', SAME=V.length>2?'כולן דומות':'שתיהן דומות';
var ord; try{ord=JSON.parse(localStorage.getItem('lab-order-'+C.page))}catch(e){}
if(!ord||ord.length!==V.length){ord=V.map(function(v){return v.id}); for(var q=ord.length-1;q>0;q--){var r=Math.floor(Math.random()*(q+1)), t=ord[q]; ord[q]=ord[r]; ord[r]=t} try{localStorage.setItem('lab-order-'+C.page,JSON.stringify(ord))}catch(e){}}
V.sort(function(a,b){return ord.indexOf(a.id)-ord.indexOf(b.id)});
var tabs=document.querySelector('.lab-tabs'), fr=document.querySelector('.lab-frames'), cur=0; fr.style.setProperty('--n',V.length);
/* more than two versions: one page at a time, tabs switch between them (keeping the same sugya in view) */
if(V.length>2) document.getElementById('lab').classList.add('lab-tabbed');
var btns=document.querySelector('.lab-btns'), res=document.querySelector('.lab-res');
var voted=null; try{voted=localStorage.getItem('lab-vote-'+C.page)}catch(e){}
function name(i){return voted?V[i].model:'גרסה '+L[i]}
var panes=V.map(function(v,i){var w=document.createElement('div'); w.className='lab-pane'+(i?'':' on');
  var h=document.createElement('div'); h.className='lab-h'; w.appendChild(h);
  var f=document.createElement('iframe'); f.src=v.id+'/'; f.loading='eager'; f.title='גרסה '+L[i]; w.appendChild(f); fr.appendChild(w); return {w:w,h:h,v:v}});
var tb=V.map(function(v,i){var b=document.createElement('button'); b.type='button'; b.className='btn'+(i?'':' on'); b.setAttribute('role','tab');
  b.onclick=function(){ if(i===cur) return; var pos=null; try{pos=where(panes[cur].w.querySelector('iframe').contentWindow)}catch(e){}
    tb.forEach(function(x,j){x.classList.toggle('on',j===i)}); panes.forEach(function(p,j){p.w.classList.toggle('on',j===i)}); cur=i;
    /* the pane was display:none: wait two frames so its iframe lays out at full width before scrolling it */
    /* the pane was hidden: its page re-lays out at full width over the next moments, so re-apply the position a few times */
    if(link&&pos){var tw=panes[i].w.querySelector('iframe').contentWindow; [0,80,200,450,900].forEach(function(ms){setTimeout(function(){try{go(tw,pos)}catch(e){}},ms)})} }; tabs.appendChild(b); return b});
function paint(){V.forEach(function(v,i){tb[i].textContent=name(i); panes[i].h.textContent=name(i)+(voted&&v.note?' — '+v.note:'')})}
function show(c){fetch('/api/lab/votes?page='+encodeURIComponent(C.page)).then(function(r){return r.json()}).then(function(j){
  var n=j.counts||{}, t=0; Object.keys(n).forEach(function(k){t+=n[k]});
  res.textContent=(c?'תודה! ':'')+'בחרת: '+(voted==='same'?SAME:V.filter(function(v){return v.id===voted})[0].model)+(t?' · עד עכשיו '+t+' הצבעות: '+V.map(function(v){return v.model+' '+(n[v.id]||0)}).join(' · ')+(n.same?' · דומות '+n.same:''):'');
}).catch(function(){})}
V.map(function(v,i){return [i]}).concat([['same']]).forEach(function(a){var b=document.createElement('button'); b.type='button'; b.className='btn';
  b.textContent=a[0]==='same'?SAME:'גרסה '+L[a[0]];
  b.onclick=function(){var id=a[0]==='same'?'same':V[a[0]].id, vid='';try{vid=localStorage.getItem('daf-vid')||''}catch(e){}
    fetch('/api/lab/vote',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({page:C.page,choice:id,vid:vid})}).then(function(){
      voted=id; try{localStorage.setItem('lab-vote-'+C.page,id)}catch(e){} paint(); show(true); btns.hidden=true; document.querySelector('.lab-q').textContent='הגרסאות נחשפו:'});};
  btns.appendChild(b)});
/* linked scrolling: both versions keep the same sugya in view (same section ids on both pages) */
var link=true, lock=0, chk=document.querySelector('.lab-sync input');
if(chk){chk.onchange=function(){link=chk.checked}}
function anchors(doc){return [].slice.call(doc.querySelectorAll('section.sugya[id]'))}
function where(win){var doc=win.document, y=win.scrollY, a=anchors(doc), best=null;
  a.forEach(function(el){var t=el.getBoundingClientRect().top+y; if(t<=y+4) best={el:el,t:t}});
  if(!best) return {abs:y};
  var h=Math.max(1,best.el.offsetHeight); return {id:best.el.id, f:Math.min(1,(y-best.t)/h)};}
function go(win,p){var doc=win.document, el=p.id?doc.getElementById(p.id):null;
  var y=el?el.getBoundingClientRect().top+win.scrollY+p.f*el.offsetHeight:(p.abs||0);
  win.__lab=Date.now(); win.scrollTo(0,Math.max(0,y));}
function others(i){return panes.filter(function(p,j){return j!==i&&p.w.offsetParent!==null})}   /* hidden tabs sync when shown */
panes.forEach(function(p,i){var f=p.w.querySelector('iframe');
  f.addEventListener('load',function(){var w; try{w=f.contentWindow; w.document}catch(e){return}
    var raf=0; w.addEventListener('scroll',function(){ if(!link||Date.now()-(w.__lab||0)<250) return; if(raf) return;
      raf=w.requestAnimationFrame(function(){raf=0; var pos=where(w); others(i).forEach(function(o){try{go(o.w.querySelector('iframe').contentWindow,pos)}catch(e){}});});},{passive:true});
    /* opening a sugya's details in one version opens it in the other too, so the positions stay comparable */
    w.document.addEventListener('toggle',function(e){var d=e.target; if(!link||!d.closest) return; var sec=d.closest('section[id]'); if(!sec) return;
      var k=[].indexOf.call(sec.querySelectorAll('details'),d);
      others(i).forEach(function(o){try{var od=o.w.querySelector('iframe').contentWindow.document.getElementById(sec.id); var t=od&&od.querySelectorAll('details')[k]; if(t&&t.open!==d.open) t.open=d.open;}catch(e){}});},true);
  });});
paint(); if(voted){btns.hidden=true; document.querySelector('.lab-q').textContent='הגרסאות נחשפו:'; show(false)}
})();"""


def render_privacy():
    body = f"""<div class="wrap" id="app"><section>
<a class="back" href="../">→ דף הבית</a>
<header>
  <div class="eyebrow">פרטיות</div>
  <h1>מדיניות פרטיות</h1>
  <p class="thesis">האתר נבנה כדי ללמוד, לא כדי לאסוף מידע. זה כל מה שנשמר, ולמה.</p>
</header>
<div class="about">
<h2>בלי חשבון</h2>
<p>ההתקדמות שלכם (סוגיות שנלמדו, רצף, קצב, שאלות לחזרה) נשמרת רק בדפדפן שלכם. לספירת מבקרים נשמר בדפדפן מזהה אקראי, בלי כתובת IP ובלי עוגיות. Cloudflare Web Analytics מודד צפיות באופן מצטבר ובלי עוגיות.</p>
<h2>כניסה עם Google (לא חובה)</h2>
<p>אם תתחברו, נשמרים: מזהה החשבון של Google, השם הפרטי, כתובת המייל וההתקדמות — כדי שתוכלו להמשיך מכל מכשיר. לא נשמרת סיסמה, ואין גישה לשום מידע אחר בחשבון. החיבור נשמר בעוגייה מאובטחת אחת לשם כך בלבד.</p>
<h2>הערות קוראים</h2>
<p>ההערה נשמרת כדי לבדוק אותה ולתקן את הדף. שם לא חובה. כתובת מייל, אם נמסרה, משמשת רק לעדכון אחד כשההערה טופלה, ונמחקת מיד אחריו. נוסח ההערה מוצג בדף ההערות הציבורי רק אם סימנתם שמותר.</p>
<h2>שיתוף עם אחרים</h2>
<p>״שאל על הסוגיה״: השאלה נשלחת יחד עם החומר של הסוגיה ל־Claude (Anthropic) כדי לנסח תשובה. השאלה והתשובה נשמרות בלי שם ובלי כתובת IP, ומוצגות ללומדים אחרים תחת ״שאלות קודמות״ של אותה סוגיה (בעל האתר יכול להסתיר כל שאלה). אל תכתבו בשאלה פרטים אישיים.</p>
<p>המידע לא נמכר ולא מועבר לאף גורם. הוא נשמר בתשתית של Cloudflare; מיילים נשלחים דרך Resend.</p>
<h2>מחיקה</h2>
<p>להתנתקות: בהגדרות (⚙). למחיקת החשבון וההתקדמות השמורה בו, או לכל שאלה: <a href="mailto:me@tsemach.dev">me@tsemach.dev</a>.</p>
</div>
{credits('../')}
<footer>{FOOT}</footer>
</section></div>"""
    return page("מדיניות פרטיות · " + SITE_TITLE, body, "מה נשמר באתר דפי חזרה ולימוד ולמה", depth=1)


def render_notes(by_slug):
    names = {slug: ds[0]["tractate_he"] for slug, ds in by_slug.items()}
    body = f"""<div class="wrap" id="app"><section id="fbpublic">
<a class="back" href="../">→ דף הבית</a>
<header>
  <div class="eyebrow">הערות קוראים</div>
  <h1>הערות שטופלו</h1>
  <p class="thesis">כל הערה נבדקת מול לשון הגמרא. כאן מופיעות ההערות שטופלו והתגובה לכל אחת, בלי שמות. נוסח ההערה מוצג רק כששולחה הסכים לכך.</p>
  <p class="fb-muted" id="fb-sum"></p>
</header>
<div id="fb-list" class="fb-list" aria-live="polite"><p class="fb-muted">טוען…</p></div>
<p class="fb-muted"><a class="back" href="../feedback/">ההערות שלי ←</a></p>
{credits('../')}
<footer>{FOOT}</footer>
</section></div>
{jscript(names, id="fb-names")}
<script src="../app.js" defer></script>"""
    return page("הערות קוראים · " + SITE_TITLE, body, "הערות הקוראים שטופלו והתגובות להן", depth=1)



def write_pwa():
    """Installable app + offline reading: manifest, service worker (versioned with the assets), /offline/ page."""
    sw = open(os.path.join(ROOT, "site", "sw.js"), encoding="utf8").read().replace("__ASSET_V__", ASSET_V)
    open(os.path.join(DIST, "sw.js"), "w", encoding="utf8").write(sw)
    man = {"name": SITE_TITLE, "short_name": BRAND, "lang": "he", "dir": "rtl", "start_url": "/?source=pwa", "scope": "/",
           "display": "standalone", "background_color": "#F3F4EF", "theme_color": "#2B4C7E",
           "description": "דף אינטראקטיבי לכל יום — לחזרה, לסיכום ולבדיקת ההבנה. עובד גם בלי חיבור.",
           "icons": [{"src": "/icon-192.png", "sizes": "192x192", "type": "image/png"},
                     {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png"},
                     {"src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}
    json.dump(man, open(os.path.join(DIST, "manifest.webmanifest"), "w", encoding="utf8"), ensure_ascii=False)
    os.makedirs(os.path.join(DIST, "offline"), exist_ok=True)
    body = """<div class="wrap" id="app"><section><header><h1>אין חיבור לאינטרנט</h1>
<p class="thesis">הדף הזה עוד לא נשמר במכשיר. אלה הדפים שכבר שמורים וזמינים לקריאה:</p></header>
<ul class="offline-list" id="saved"><li class="fb-muted">בודק…</li></ul>
<p class="fb-muted">כל דף שפותחים נשמר אוטומטית, וגם שבעת הדפים האחרונים נשמרים מראש כשיש חיבור.</p>
<p><a class="back" href="/">→ דף הבית</a></p></section></div>
<script>
(function(){var ul=document.getElementById('saved'), H={};
try{JSON.parse(document.getElementById('catalog').textContent).pages.forEach(function(p){H['/'+p.k+'/']=p})}catch(e){}
if(!window.caches){ul.innerHTML='<li>הדפדפן אינו תומך בשמירה.</li>';return}
caches.open('pages-v1').then(function(c){return c.keys()}).then(function(ks){
  var re=/^\\/([a-z_]+)\\/(\\d+)\\/$/, items=[];
  ks.forEach(function(r){var u=new URL(r.url), m=u.pathname.match(re); if(m) items.push({h:u.pathname, s:m[1], d:+m[2]})});
  items.sort(function(a,b){return a.s.localeCompare(b.s)||a.d-b.d});
  ul.innerHTML=''; if(!items.length){ul.innerHTML='<li>עוד אין דפים שמורים.</li>';return}
  items.forEach(function(it){var li=document.createElement('li'), a=document.createElement('a'); a.href=it.h; var c=H[it.h]; a.textContent=c?c.h:(it.s+' '+it.d); if(c&&c.t){var t=document.createElement('span'); t.className='fb-muted'; t.textContent=' — '+c.t; li.append(a,t); ul.appendChild(li); return} li.appendChild(a); ul.appendChild(li)});
}).catch(function(){ul.innerHTML='<li>לא ניתן לקרוא את הדפים השמורים.</li>'});})();
</script>"""
    open(os.path.join(DIST, "offline", "index.html"), "w", encoding="utf8").write(
        page("אין חיבור · " + SITE_TITLE, catalog_json() + body, "קריאה בלי חיבור", depth=1))


def main():
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)
    for f in ("app.css", "app.js", "progress.js", "pwa.js", "nav.js"):
        shutil.copy(os.path.join(ROOT, "site", f), os.path.join(DIST, f))
    shutil.copytree(os.path.join(ROOT, "site", "fonts"), os.path.join(DIST, "fonts"))
    if os.path.isdir(os.path.join(ROOT, "site", "og")):
        shutil.copytree(os.path.join(ROOT, "site", "og"), os.path.join(DIST, "og"))
    for f in glob.glob(os.path.join(ROOT, "site", "static", "*")):
        shutil.copy(f, DIST)
    if os.path.isdir(os.path.join(ROOT, "content", "figs", "img")):   # background images under our drawings (labels stay in the SVG)
        shutil.copytree(os.path.join(ROOT, "content", "figs", "img"), os.path.join(DIST, "figs"))
    glossary = json.load(open(os.path.join(ROOT, "data", "glossary.json"), encoding="utf8"))
    sources = json.load(open(os.path.join(ROOT, "data", "sources.json"), encoding="utf8"))
    by_slug = {}
    for f in sorted(glob.glob(os.path.join(ROOT, "data", "*", "*.json"))):
        d = json.load(open(f, encoding="utf8"))
        by_slug.setdefault(d["slug"], []).append(d)
    CATALOG["pages"].clear(); CATALOG["mas"].clear(); HAVE.clear()
    pk_path = os.path.join(ROOT, "data", "perakim.json")
    perakim = json.load(open(pk_path, encoding="utf8")) if os.path.exists(pk_path) else {}
    for slug, ds in by_slug.items():
        HAVE.update((slug, d["daf"]) for d in ds)
        for he, sef, sl, first, last in dafyomi.MASECHTOT:
            if sl == slug:
                CATALOG["mas"][slug] = {"he": he, "tr": sef, "first": first, "last": last, "o": ORDER[slug],
                                        "p": [[x["he"], x["from"], x["to"]] for x in perakim.get(slug, [])]}
        for d in sorted(ds, key=lambda x: x["daf"]):
            CATALOG["pages"].append({"k": f"{slug}/{d['daf']}", "s": slug, "d": d["daf"],
                                     "h": f"{d['tractate_he']} {heb_num(d['daf'])}",
                                     "t": short(re.sub("<[^>]+>", "", d["thesis"]), 130),
                                     "n": [n["id"] for n in d["nav"]], "y": yomi_date(slug, d["daf"])})
    DAFS.clear()
    for slug, ds in by_slug.items():
        for d in ds:
            DAFS[(slug, d["daf"])] = d
    LAB.clear()
    for e in lab_registry():
        LAB[(e["slug"], e["daf"])] = e
    alld = []
    for slug, ds in by_slug.items():
        ds.sort(key=lambda x: x["daf"])
        nums = [d["daf"] for d in ds]
        for i, d in enumerate(ds):
            prev = nums[i - 1] if i > 0 and nums[i - 1] == d["daf"] - 1 else None
            nxt = nums[i + 1] if i + 1 < len(nums) and nums[i + 1] == d["daf"] + 1 else None
            out = os.path.join(DIST, slug, str(d["daf"]))
            os.makedirs(out, exist_ok=True)
            html = render_daf(d, prev, nxt, glossary, sources)
            if (slug, d["daf"]) in LAB:
                html = html.replace("</header>", f'</header>\n<p class="lab-link"><a href="/lab/{slug}/{d["daf"]}/">🧪 ניסוי: השוו את הדף הזה לגרסה שהכין מודל אחר ←</a></p>', 1)
            open(os.path.join(out, "index.html"), "w", encoding="utf8").write(html)
            alld.append(d)
        open(os.path.join(DIST, slug, "index.html"), "w", encoding="utf8").write(render_masechet(slug, ds))
    render_lab(glossary, sources)
    about_p = os.path.join(ROOT, "content", "home_about.html")
    about = open(about_p, encoding="utf8").read() if os.path.exists(about_p) else ""
    # newest by Daf Yomi date; dapim prepared far ahead (the "ahead" queue) stay off the home page until their week
    horizon = (il_today() + dt.timedelta(days=7)).isoformat()
    dated = [(yomi_date(d["slug"], d["daf"]) or "", d) for d in alld]
    latest = [d for y, d in sorted(dated, key=lambda x: x[0], reverse=True) if y and y <= horizon]
    open(os.path.join(DIST, "index.html"), "w", encoding="utf8").write(render_home(by_slug, latest, about))
    # quiz bank for spaced review (fetched by progress.js on /review/ and for the "yesterday" opener)
    def quiz_ctx(d):   # each review question knows its sugya's title, so it makes sense days later
        titles = {n["id"]: re.sub("<[^>]+>", "", n["title"]) for n in d["nav"]}
        return [dict(q, st=titles[q["s"]]) if q.get("s") in titles else q for q in d["quiz"]]
    json.dump({f"{d['slug']}/{d['daf']}": quiz_ctx(d) for d in alld}, open(os.path.join(DIST, "quiz.json"), "w", encoding="utf8"),
              ensure_ascii=False, separators=(",", ":"))
    os.makedirs(os.path.join(DIST, "review"), exist_ok=True)
    open(os.path.join(DIST, "review", "index.html"), "w", encoding="utf8").write(page(
        "חזרה · " + SITE_TITLE,
        f'<div class="wrap" id="app"><section><a class="back" href="../">→ דף הבית</a><header>'
        f'<div class="eyebrow">חזרה מרווחת</div><h1 id="rv-title">חזרה היום</h1>'
        f'<p class="thesis" id="rv-sub">שאלות מדפים שלמדתם — כל שאלה חוזרת אחרי יום, 3, 7, 21 ו־60 ימים.</p></header>'
        f'<div id="review-app" aria-live="polite"></div><footer>{FOOT}</footer></section></div>'
        f'{catalog_json()}<script src="../progress.js" defer></script>', "חזרה מרווחת על שאלות מהדפים שנלמדו", depth=1))
    os.makedirs(os.path.join(DIST, "about"), exist_ok=True)
    open(os.path.join(DIST, "about", "index.html"), "w", encoding="utf8").write(page(
        "איך נבנים הדפים · " + SITE_TITLE,
        f'<div class="wrap" id="app"><section><a class="back" href="../">→ דף הבית</a><header>'
        f'<div class="eyebrow">אודות</div><h1>איך נבנים הדפים</h1></header>'
        f'{about}<p class="about-link"><a class="back" href="#contact" data-contact>✉ צור קשר</a></p>{credits("../")}<footer>{FOOT}</footer></section></div>{CONTACT_JS}', "תהליך הבנייה והבדיקה של דפי החזרה והלימוד", depth=1))
    ideas_p = os.path.join(ROOT, "content", "ideas.html")
    if os.path.exists(ideas_p):
        os.makedirs(os.path.join(DIST, "ideas"), exist_ok=True)
        open(os.path.join(DIST, "ideas", "index.html"), "w", encoding="utf8").write(page(
            "רעיונות לשיפור · " + SITE_TITLE,
            f'<div class="wrap" id="app"><section><a class="back" href="../">→ דף הבית</a><header>'
            f'<div class="eyebrow">בתכנון</div><h1>רעיונות לשיפור</h1>'
            f'<p class="thesis">מה אנחנו שוקלים להוסיף לאתר. שום דבר כאן עדיין לא פעיל.</p></header>'
            f'{open(ideas_p, encoding="utf8").read()}<footer>{FOOT}</footer></section></div>', "רעיונות לשיפור האתר", depth=1))
    os.makedirs(os.path.join(DIST, "changes"), exist_ok=True)
    open(os.path.join(DIST, "changes", "index.html"), "w", encoding="utf8").write(page(
        "מה חדש · " + SITE_TITLE,
        f'<div class="wrap" id="app"><section><a class="back" href="../">→ דף הבית</a><header>'
        f'<div class="eyebrow">התקדמות</div><h1>מה חדש באתר</h1>'
        f'<p class="thesis">כל השיפורים, מהחדש לישן.</p></header>{whatsnew(None, link=False)}'
        f'<footer>{FOOT}</footer></section></div>', "שינויים ושיפורים באתר", depth=1))
    os.makedirs(os.path.join(DIST, "drawings"), exist_ok=True)
    _, dr_html = render_drawings(alld)
    open(os.path.join(DIST, "drawings", "index.html"), "w", encoding="utf8").write(dr_html)
    os.makedirs(os.path.join(DIST, "stats"), exist_ok=True)
    open(os.path.join(DIST, "stats", "index.html"), "w", encoding="utf8").write(page(
        "נתוני ביקורים · " + SITE_TITLE,
        f'<div class="wrap" id="app"><section><a class="back" href="../">→ דף הבית</a><header>'
        f'<div class="eyebrow">שקיפות</div><h1>נתוני ביקורים</h1>'
        f'<p class="thesis">כמה לומדים משתמשים באתר — ספירה אנונימית, בלי עוגיות ובלי מידע מזהה.</p></header>'
        f'<div id="stats-app" aria-live="polite"><p class="pg-hint">טוען…</p></div>'
        f'<p class="pg-hint st-note">כל דפדפן מקבל מזהה אקראי שנשמר רק אצלו; השרת סופר כמה מזהים שונים נכנסו בכל יום, ואת המדינה בלבד. '
        f'לא נשמרים כתובת IP, שם או דפים שנקראו. הספירה התחילה באוקטובר 2026.</p>'
        f'<footer>{FOOT}</footer></section></div>'
        f'{catalog_json()}<script src="../progress.js" defer></script>', "נתוני ביקורים אנונימיים באתר", depth=1))
    os.makedirs(os.path.join(DIST, "feedback"), exist_ok=True)
    open(os.path.join(DIST, "feedback", "index.html"), "w", encoding="utf8").write(render_feedback(by_slug))
    os.makedirs(os.path.join(DIST, "privacy"), exist_ok=True)
    open(os.path.join(DIST, "privacy", "index.html"), "w", encoding="utf8").write(render_privacy())
    os.makedirs(os.path.join(DIST, "notes"), exist_ok=True)
    open(os.path.join(DIST, "notes", "index.html"), "w", encoding="utf8").write(render_notes(by_slug))
    urls = ["", "about/", "ideas/", "changes/", "drawings/", "stats/", "notes/", "privacy/"] + [f"{slug}/" for slug in by_slug] + [f"{d['slug']}/{d['daf']}/" for d in alld]
    gd = git_dates()
    lm = {f"{d['slug']}/{d['daf']}/": gd[f"data/{d['slug']}/{d['daf']}.json"] for d in alld if f"data/{d['slug']}/{d['daf']}.json" in gd}
    for slug in by_slug:   # a masechet page changes when any of its dapim do
        ds = [v for k, v in lm.items() if k.startswith(slug + "/")]
        if ds: lm[f"{slug}/"] = max(ds)
    if lm: lm[""] = max(lm.values())
    open(os.path.join(DIST, "sitemap.xml"), "w", encoding="utf8").write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{SITE_URL}/{u}</loc>{f'<lastmod>{lm[u]}</lastmod>' if u in lm else ''}</url>\n" for u in urls) + "</urlset>\n")
    write_feed(alld, glossary, lm)
    open(os.path.join(DIST, "robots.txt"), "w", encoding="utf8").write(
        f"User-agent: *\nDisallow: /admin/\nDisallow: /api/\nSitemap: {SITE_URL}/sitemap.xml\n")
    write_llms(alld, by_slug)
    open(os.path.join(DIST, "404.html"), "w", encoding="utf8").write(page(
        "הדף לא נמצא · " + SITE_TITLE,
        f'<div class="wrap" id="app"><section><header><h1>הדף לא נמצא</h1>'
        f'<p class="thesis">הכתובת אינה קיימת. <a href="/">לדף הבית</a></p></header></section></div>', "הדף לא נמצא"))
    write_pwa()
    seo_pass()
    print(f"built {len(alld)} dafim in {len(by_slug)} masechtot -> {DIST}")


if __name__ == "__main__":
    main()
