#!/usr/bin/env python3
"""Static site generator for daf-ai.

data/<slug>/<daf>.json  ->  dist/<slug>/<daf>/index.html
                        ->  dist/<slug>/index.html   (masechet index)
                        ->  dist/index.html          (home)
No third-party dependencies (Cloudflare Pages: build command `python build.py`, output `dist`).
"""
import glob, html, json, os, re, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(ROOT, "dist")
SITE_TITLE = "דפי לימוד — הדף היומי"
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
    ("״דף מאיר״ — הרב אורי בריליאנט, אתר סיני", "https://www.sinai.org.il/", "חוברת לבדיקת מסכת בכורות (דפים ב–טז)"),
]


def logo_html(up):
    if os.path.exists(os.path.join(ROOT, "site", "static", "shefing-logo.png")):
        dark = ""
        if os.path.exists(os.path.join(ROOT, "site", "static", "shefing-logo-white.png")):
            dark = f'<source srcset="{up}shefing-logo-white.png" media="(prefers-color-scheme: dark)">'
        return f'<picture>{dark}<img class="sponsor-logo" src="{up}shefing-logo.png" alt="Shefing" height="28"></picture>'
    return '<span class="sponsor-word">Shefing</span>'


def credits(up=""):
    items = "".join(f'<li><a href="{u}" rel="noopener">{esc(n)}</a> — {esc(d)}</li>' for n, u, d in SOURCES)
    return f"""<section class="credits" aria-label="קרדיטים">
  <a class="sponsor" href="https://shefing.com/" rel="noopener" aria-label="Powered by Shefing">
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


def page(title, body, desc="", depth=0):
    up = "../" * depth
    return f"""<!doctype html>
<html lang="he" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500;700;900&family=Assistant:wght@400;600;700;800&display=swap">
<link rel="stylesheet" href="{up}app.css">
</head><body>
{body}
</body></html>
"""


# ---------------------------------------------------------------- daf page
def render_steps(steps):
    out = ['  <ol class="steps">']
    for k, s in enumerate(steps):
        cls = ' class="hideable"' if s.get("hideable") else ""
        p = f' data-p="{s["p"]}"' if "p" in s else ""
        t = f' {s["type"]}' if s.get("type") else ""
        out.append(f'    <li{cls} data-k="{k}"{p}><span class="tag{t}">{s["tag"]}</span><span class="body">{s["body"]}</span></li>')
    out.append("  </ol>")
    return "\n".join(out)


def render_section(d, s):
    sid = f'{d["key"]}-{s["id"]}'
    ref = f' data-ref="{s["ref"]}"' if s.get("ref") else ""
    parts = [f'<section class="sugya" id="{sid}">', f'  <div class="amud"{ref}>{s["amud"]}</div>']
    if s.get("title"):
        parts.append(f'  <h3>{s["title"]}</h3>')
    if s["kind"] == "raw":
        parts.append("  " + s["html"])
    else:
        if s.get("quote"):
            parts.append(f'  <blockquote>{s["quote"]["text"]}<cite>{s["quote"]["cite"]}</cite></blockquote>')
        if s.get("flow"):
            parts.append(f'  <details class="flowd"><summary>בקצרה — על מה הסוגיה</summary><p class="explain flow">{s["flow"]}</p></details>')
        if s.get("pre"):
            parts.append("  " + s["pre"])
        parts.append(render_steps(s["steps"]))
        if s.get("post"):
            parts.append("  " + s["post"])
    parts.append("</section>")
    return "\n".join(parts)


def render_daf(d, prev, nxt, glossary, sources):
    key = d["key"]
    meta = "".join(f"<span>{esc(m)}</span>" for m in d["meta"])
    nav = "\n".join(f'    <li><a href="#{key}-{n["id"]}"><span class="amud">{n["amud"]}</span>{n["title"]}</a></li>' for n in d["nav"])
    story = (f'<details class="storyline"><summary class="sl-h">הקדמה — הסיפור של הדף</summary><p>{d["storyline"]}</p></details>'
             if d.get("storyline") else "")
    sections = "\n\n".join(render_section(d, s) for s in d["sections"])
    links = "\n".join(f'    <li><a href="{esc(l["href"])}">{esc(l["text"])}</a></li>' for l in d.get("links", []))
    pn = []
    if prev:
        pn.append(f'<a class="back" href="../{prev}/">→ דף {heb_num(prev)}</a>')
    if nxt:
        pn.append(f'<a class="back" href="../{nxt}/">דף {heb_num(nxt)} ←</a>')
    pager = f'<div class="pager">{"".join(pn)}</div>' if pn else ""
    article = f"""<article class="daf" id="{key}" data-tractate="{d['tractate']}" data-daf="{d['daf']}">
<div class="topnav"><a class="back" href="../../">דף הבית</a> · <a class="back" href="../">מסכת {d['tractate_he']}</a></div>

<header>
  <div class="eyebrow">{esc(d['eyebrow'])}</div>
  <h1>{esc(d['title'])}</h1>
  <p class="thesis">{d['thesis']}</p>
  <div class="meta"><span class="ai-badge">נוצר על ידי סוכן AI</span>{meta}</div>
  <div class="controls">
    <button class="btn" data-role="mode" aria-pressed="false" type="button">מצב חברותא: הסתר תשובות</button>
  </div>
</header>

<nav class="map" aria-label="מפת הסוגיות">
  <h2>מהלך הדף</h2>
  <ol>
{nav}
  </ol>
</nav>
{story}

{sections}

<section class="sugya" id="{key}-quiz">
  <div class="amud">חזרה</div>
  <h3>בחן את עצמך <span class="score" data-role="score"></span></h3>
  <div class="quiz" data-role="quizBox"></div>
  <button class="btn" data-role="resetQuiz" type="button" style="margin-top:14px">התחל מחדש</button>
</section>

<section class="sugya">
  <div class="amud">להעמקה</div>
  <h3>מקורות באתר דף יומי</h3>
  <ul class="links">
{links}
  </ul>
</section>
{pager}
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
<script src="../../app.js"></script>"""
    desc = re.sub("<[^>]+>", "", d["thesis"])
    return page(f"{d['title']} · דף לימוד", body, desc, depth=2)


# ---------------------------------------------------------------- index pages
def card(d, href):
    c = d.get("card", {})
    stats = "".join(c.get("stats_html", [])) or f"<span>{len(d['nav'])} סוגיות</span><span>{len(d['quiz'])} שאלות חזרה</span>"
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
<header>
  <div class="eyebrow">דפי לימוד · נוצר על ידי סוכן AI</div>
  <h1>מסכת {first['tractate_he']}</h1>
  <p class="thesis">{len(dafim)} דפים זמינים</p>
</header>
<div class="cards">
{cards}
</div>
{credits('../')}
<footer>{FOOT}</footer>
</section></div>"""
    return page(f"מסכת {first['tractate_he']} · דפי לימוד", body, f"דפי לימוד למסכת {first['tractate_he']}", depth=1)


def render_home(by_slug, latest, about):
    cards = "\n".join(card(d, f"./{d['slug']}/{d['daf']}/") for d in latest)
    mas = "\n".join(f'  <a class="card" href="./{s}/"><div class="top"><h3>מסכת {ds[0]["tractate_he"]}</h3>'
                    f'<span class="date">{len(ds)} דפים</span></div></a>' for s, ds in by_slug.items())
    body = f"""<div class="wrap" id="app"><section id="home">
<header>
  <div class="eyebrow">דפי לימוד · הדף היומי</div>
  <h1>{SITE_TITLE}</h1>
  <p class="thesis">דף לימוד אינטראקטיבי לכל יום — לחזרה, לסיכום ולבדיקת ההבנה</p>
  <div class="meta"><span class="ai-badge">נוצר על ידי סוכן AI</span><span>מתעדכן מדי יום</span></div>
</header>
<h2 class="sec-h" style="margin-top:28px">הדפים האחרונים</h2>
<div class="cards">
{cards}
</div>
<h2 class="sec-h" style="margin-top:28px">מסכתות</h2>
<div class="cards">
{mas}
</div>
{about}
{credits('')}
<footer>{FOOT}</footer>
</section></div>"""
    return page(SITE_TITLE, body, "דפי לימוד אינטראקטיביים לדף היומי: מהלך הסוגיה, תצוגת עץ, מקורות ושאלות חזרה")


def main():
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)
    for f in ("app.css", "app.js"):
        shutil.copy(os.path.join(ROOT, "site", f), os.path.join(DIST, f))
    for f in glob.glob(os.path.join(ROOT, "site", "static", "*")):
        shutil.copy(f, DIST)
    glossary = json.load(open(os.path.join(ROOT, "data", "glossary.json"), encoding="utf8"))
    sources = json.load(open(os.path.join(ROOT, "data", "sources.json"), encoding="utf8"))
    by_slug = {}
    for f in sorted(glob.glob(os.path.join(ROOT, "data", "*", "*.json"))):
        d = json.load(open(f, encoding="utf8"))
        by_slug.setdefault(d["slug"], []).append(d)
    alld = []
    for slug, ds in by_slug.items():
        ds.sort(key=lambda x: x["daf"])
        nums = [d["daf"] for d in ds]
        for i, d in enumerate(ds):
            prev = nums[i - 1] if i > 0 and nums[i - 1] == d["daf"] - 1 else None
            nxt = nums[i + 1] if i + 1 < len(nums) and nums[i + 1] == d["daf"] + 1 else None
            out = os.path.join(DIST, slug, str(d["daf"]))
            os.makedirs(out, exist_ok=True)
            open(os.path.join(out, "index.html"), "w", encoding="utf8").write(render_daf(d, prev, nxt, glossary, sources))
            alld.append(d)
        open(os.path.join(DIST, slug, "index.html"), "w", encoding="utf8").write(render_masechet(slug, ds))
    about_p = os.path.join(ROOT, "content", "home_about.html")
    about = open(about_p, encoding="utf8").read() if os.path.exists(about_p) else ""
    latest = sorted(alld, key=lambda d: d.get("order", d["daf"]), reverse=True)[:7]
    open(os.path.join(DIST, "index.html"), "w", encoding="utf8").write(render_home(by_slug, latest, about))
    print(f"built {len(alld)} dafim in {len(by_slug)} masechtot -> {DIST}")


if __name__ == "__main__":
    main()
