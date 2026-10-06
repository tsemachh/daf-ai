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
DAFS = {}  # (slug, daf) -> daf json, filled in main(); used for links between the parts of a split sugya
SITE_TITLE = "דפי חזרה ולימוד — הדף היומי"
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


def catalog_json():
    return jscript(CATALOG, id="catalog")


CSS = " ".join(open(os.path.join(ROOT, "site", "app.css"), encoding="utf8").read().split())
# cache-busting version for the scripts: a new deploy never runs against a stale cached copy
import hashlib  # noqa: E402
ASSET_V = hashlib.sha1(b"".join(open(os.path.join(ROOT, "site", f), "rb").read()
                                for f in ("app.js", "progress.js"))).hexdigest()[:8]


def page(title, body, desc="", depth=0, og="site.png", canonical=""):
    up = "../" * depth
    ogi = f"{SITE_URL}/og/{og}"
    canon = f'<link rel="canonical" href="{canonical}">\n' if canonical else ""
    body = re.sub(r'((?:app|progress)\.js)(")', rf'\1?v={ASSET_V}\2', body)
    return f"""<!doctype html>
<html lang="he" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{esc(title)}</title>
{canon}<meta name="description" content="{esc(desc)}">
<meta property="og:site_name" content="דפי חזרה ולימוד"><meta property="og:type" content="website"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc)}">
<meta property="og:image" content="{ogi}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:locale" content="he_IL">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="{ogi}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/favicon.ico" sizes="32x32"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/assistant-hebrew.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/frank-hebrew.woff2" as="font" type="font/woff2" crossorigin>
<style>{CSS}</style>
</head><body>
{body}
</body></html>
"""


# ---------------------------------------------------------------- daf page
def render_steps(steps):
    out = ['  <ol class="steps">']
    for k, s in enumerate(steps):
        cls = ""  # חברותא hides answer steps (type a/c) client-side; the old per-step "hideable" flag is ignored
        p = f' data-p="{s["p"]}"' if "p" in s else ""
        t = f' {s["type"]}' if s.get("type") else ""
        tg = s["tag"]
        if " · " in tg:  # "קושיה · רב אשי" → type, then the speaker on its own smaller line
            a_, b_ = tg.split(" · ", 1)
            tg = f'{a_}<span class="tsp">{b_}</span>'
        out.append(f'    <li{cls} data-k="{k}"{p}><span class="tag{t}">{tg}</span><span class="body">{s["body"]}</span></li>')
    out.append("  </ol>")
    return "\n".join(out)


def render_table(t):
    """Opinions × cases matrix: {"title", "cols": [corner, opinion…], "rows": [[case, cell…], …]}."""
    head = "".join(f"<th>{c}</th>" for c in t["cols"])
    rows = "".join("<tr>" + "".join((f"<th>{c}</th>" if i == 0 else f"<td>{c}</td>") for i, c in enumerate(r)) + "</tr>"
                   for r in t["rows"])
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


def render_seq(t):
    """Order of events (a story or a process): {"title", "items": [str, …]}."""
    items = "".join(f"<li>{x}</li>" for x in t["items"])
    title = f'<div class="mtx-h">{t["title"]}</div>' if t.get("title") else ""
    return f'  <div class="ch sq">{title}<ol>{items}</ol></div>'


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
def split_paras(t, target=200):
    """Split a "בקצרה" paragraph into short paragraphs (~2 sentences) at sentence ends outside parentheses."""
    sents, buf, q, par, i = [], "", False, 0, 0
    tags = re.compile(r"<[^>]+>")
    while i < len(t):
        m = tags.match(t, i)
        if m: buf += m.group(0); i = m.end(); continue
        c = t[i]; buf += c
        if c == "(": par += 1
        elif c == ")": par = max(0, par - 1)
        elif c in ".?!" and not par and (i + 1 == len(t) or t[i+1] == " "):
            sents.append(buf.strip()); buf = ""
        i += 1
    if buf.strip(): sents.append(buf.strip())
    paras, cur = [], ""
    L = lambda z: len(re.sub(r"<[^>]+>", "", z))
    for x in sents:
        if cur and L(cur) + L(x) > target and L(cur) >= 60: paras.append(cur); cur = x
        else: cur = (cur + " " + x).strip()
    if cur:
        if paras and len(re.sub(r"<[^>]+>", "", cur)) < 60: paras[-1] += " " + cur
        else: paras.append(cur)
    return paras


def flow_paras(t, target=200):
    return '<div class="explain flow">' + "".join(f"<p>{x}</p>" for x in split_paras(t, target)) + "</div>"

def render_section(d, s):
    sid = f'{d["key"]}-{s["id"]}'
    ref = f' data-ref="{s["ref"]}"' if s.get("ref") else ""
    parts = [f'<section class="sugya" id="{sid}">', f'  <div class="amud"{ref}>{s["amud"]}</div>']
    if s.get("title"):
        parts.append(f'  <h3>{s["title"]}</h3>')
    if s["kind"] != "raw":
        parts.append(cont_link(d, s, "prev"))
    if s["kind"] == "raw":
        parts.append("  " + s["html"])
    else:
        if s.get("quote"):
            parts.append(f'  <blockquote>{s["quote"]["text"]}<cite>{s["quote"]["cite"]}</cite></blockquote>')
        if s.get("flow"):
            parts.append(f'  <details class="flowd"><summary>בקצרה — על מה הסוגיה</summary>{flow_paras(s["flow"])}</details>')
        if s.get("pre"):
            parts.append("  " + s["pre"])
        parts.append(render_steps(s["steps"]))
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
        if aids:
            parts.append(f'  <details class="aids"><summary>עזרים — {" · ".join(names)}</summary>' + "\n".join(aids) + "</details>")
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
    story = (f'<details class="storyline"><summary class="sl-h">הקדמה — הסיפור של הדף</summary>{"".join(f"<p>{x}</p>" for x in split_paras(d["storyline"], 240))}</details>'
             if d.get("storyline") else "")
    sections = "\n\n".join(render_section(d, s) for s in d["sections"])
    links = "\n".join(f'    <li><a href="{esc(l["href"])}">{esc(l["text"])}</a></li>' for l in d.get("links", []))
    pn = []
    if prev:
        pn.append(f'<a class="back" href="../{prev}/">→ דף {heb_num(prev)}</a>')
    if nxt:
        pn.append(f'<a class="back" href="../{nxt}/">דף {heb_num(nxt)} ←</a>')
    tree_btn = ('    <button class="btn" data-role="tree" aria-pressed="false" type="button" title="תצוגת עץ: כל שלב מוזח תחת השלב שעליו הוא עונה">עץ</button>\n'
                if any(s.get("steps") for s in d["sections"]) else "")
    pager = f'<div class="pager">{"".join(pn)}</div>' if pn else ""
    article = f"""<article class="daf" id="{key}" data-tractate="{d['tractate']}" data-daf="{d['daf']}">
<div class="topnav"><span><a class="back" href="../../">דף הבית</a> · <a class="back" href="../">מסכת {d['tractate_he']}</a></span></div>

<header>
  {f'<div class="eyebrow">{esc(eyebrow)}</div>' if eyebrow else ''}
  <div class="titlerow"><h1>{esc(d['title'])}</h1><span class="tmeta">{f'<span class="perek">{esc(perek)}</span>' if perek else ''}{f'<span>{mins}</span>' if mins else ''}<a class="src" target="_blank" rel="noopener" href="https://www.sefaria.org/{d['tractate']}.{d['daf']}a?lang=he">ספריא</a></span></div>
  <p class="thesis">{d['thesis']}</p>
  <div class="meta">{meta}</div>
  <div class="legend"><span class="lp">חכם</span><span class="lt">מושג</span><span>— הקש על מילה מסומנת או על ציטוט להסבר</span></div>
  <div class="controls">
    <button class="btn btn-ic" data-role="prefs" aria-expanded="false" type="button" aria-label="הגדרות" title="הגדרות">⚙</button>
    <button class="btn" data-role="mode" aria-pressed="false" type="button" title="מצב חברותא: התשובות מוסתרות — הקש על שלב לגילוי">חברותא</button>
{tree_btn}    <button class="btn" data-role="fb" type="button" title="הערה על הדף">הערה</button>
    <button class="btn" data-role="learned" aria-pressed="false" type="button" title="סמן את כל הסוגיות בדף כנלמדו">למדתי</button>
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
{pager}

<section class="sugya">
  <div class="amud">להעמקה</div>
  <h3>מקורות באתר דף יומי</h3>
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
    return page(f"{d['title']} · דף חזרה ולימוד", body, desc, depth=2, og=og,
                canonical=f"{SITE_URL}/{d['slug']}/{d['daf']}/")


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


def lab_banner():
    if not LAB:
        return ""
    e = list(LAB.values())[-1]
    pg = f"{e['slug']}/{e['daf']}"
    return f"""<div class="lab-ban" id="lab-ban" data-page="{pg}" hidden>
  <a href="/lab/{pg}/"><b>🧪 ניסוי חדש:</b> אותו דף, שני מודלים — {esc(e['title'])} בשתי גרסאות. איזו עוזרת יותר? <span>השוו והצביעו ←</span></a>
  <button type="button" class="lab-x" aria-label="הסתר">×</button>
</div>
<script>(function(){{var b=document.getElementById('lab-ban'),p=b.dataset.page;try{{if(localStorage.getItem('lab-vote-'+p)||localStorage.getItem('lab-hide-'+p))return}}catch(e){{}}
b.hidden=false;b.querySelector('.lab-x').onclick=function(){{b.remove();try{{localStorage.setItem('lab-hide-'+p,'1')}}catch(e){{}}}}}})();</script>"""


def render_home(by_slug, latest, about):
    cards = "\n".join(card(d, f"./{d['slug']}/{d['daf']}/") for d in latest)
    mas = "\n".join(f'  <a class="card" href="./{s}/"><div class="top"><h3>מסכת {ds[0]["tractate_he"]}</h3>'
                    f'<span class="date">{len(ds)} דפים</span></div></a>' for s, ds in by_slug.items())
    body = f"""<div class="wrap" id="app"><section id="home">
<header>
  <h1>{SITE_TITLE}</h1>
  <p class="thesis">דף אינטראקטיבי לכל יום — לחזרה, לסיכום ולבדיקת ההבנה</p>
  <div class="meta"><span class="ai-badge">נוצר על ידי סוכן AI</span><span>מתעדכן מדי יום</span><a id="today-users" class="back" href="./stats/" hidden></a></div>
</header>
{lab_banner()}
<div id="progress-home"></div>
<h2 class="sec-h" style="margin-top:28px">הדפים האחרונים</h2>
<div class="cards">
{cards}
</div>
<h2 class="sec-h" style="margin-top:28px">מסכתות</h2>
<div class="cards">
{mas}
</div>
{whatsnew(5)}
<p class="about-link"><a class="back" href="./about/">איך נבנים הדפים ומה נבדק ←</a> <a class="back" href="./ideas/">רעיונות לשיפור ←</a> <a class="back" href="./notes/">הערות קוראים ←</a> <a class="back" href="./stats/">נתוני ביקורים ←</a> <a class="back" href="./changes/">כל השינויים ←</a> <a class="back" href="./privacy/">פרטיות ←</a></p>
{credits('')}
<footer>{FOOT}</footer>
</section></div>
{catalog_json()}
<script src="progress.js"></script>"""
    return page(SITE_TITLE, body, "דפי חזרה ולימוד אינטראקטיביים לדף היומי: מהלך הסוגיה, תצוגת עץ, מקורות ושאלות חזרה")


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
  <h1>{esc(e["title"])}: שתי גרסאות</h1>
  <p class="thesis">אותו דף, אותם מקורות ואותה בדיקה אוטומטית — שני מודלים שונים כתבו אותו. שמות המודלים מוסתרים עד שתבחרו איזו גרסה עזרה לכם יותר.</p>
</header>
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


LAB_JS = r"""(function(){
var C=JSON.parse(document.getElementById('lab-cfg').textContent), V=C.versions.slice(), L='אב';
var ord; try{ord=JSON.parse(localStorage.getItem('lab-order-'+C.page))}catch(e){}
if(!ord||ord.length!==V.length){ord=V.map(function(v){return v.id}); if(Math.random()<.5) ord.reverse(); try{localStorage.setItem('lab-order-'+C.page,JSON.stringify(ord))}catch(e){}}
V.sort(function(a,b){return ord.indexOf(a.id)-ord.indexOf(b.id)});
var tabs=document.querySelector('.lab-tabs'), fr=document.querySelector('.lab-frames'), btns=document.querySelector('.lab-btns'), res=document.querySelector('.lab-res');
var voted=null; try{voted=localStorage.getItem('lab-vote-'+C.page)}catch(e){}
function name(i){return voted?V[i].model:'גרסה '+L[i]}
var panes=V.map(function(v,i){var w=document.createElement('div'); w.className='lab-pane'+(i?'':' on');
  var h=document.createElement('div'); h.className='lab-h'; w.appendChild(h);
  var f=document.createElement('iframe'); f.src=v.id+'/'; f.loading=i?'lazy':'eager'; f.title='גרסה '+L[i]; w.appendChild(f); fr.appendChild(w); return {w:w,h:h,v:v}});
var tb=V.map(function(v,i){var b=document.createElement('button'); b.type='button'; b.className='btn'+(i?'':' on'); b.setAttribute('role','tab');
  b.onclick=function(){tb.forEach(function(x,j){x.classList.toggle('on',j===i)}); panes.forEach(function(p,j){p.w.classList.toggle('on',j===i)})}; tabs.appendChild(b); return b});
function paint(){V.forEach(function(v,i){tb[i].textContent=name(i); panes[i].h.textContent=name(i)+(voted&&v.note?' — '+v.note:'')})}
function show(c){fetch('/api/lab/votes?page='+encodeURIComponent(C.page)).then(function(r){return r.json()}).then(function(j){
  var n=j.counts||{}, t=0; Object.keys(n).forEach(function(k){t+=n[k]});
  res.textContent=(c?'תודה! ':'')+'בחרת: '+(voted==='same'?'שתיהן דומות':V.filter(function(v){return v.id===voted})[0].model)+(t?' · עד עכשיו '+t+' הצבעות: '+V.map(function(v){return v.model+' '+(n[v.id]||0)}).join(' · ')+(n.same?' · דומות '+n.same:''):'');
}).catch(function(){})}
[[0],[1],['same']].forEach(function(a){var b=document.createElement('button'); b.type='button'; b.className='btn';
  b.textContent=a[0]==='same'?'שתיהן דומות':'גרסה '+L[a[0]];
  b.onclick=function(){var id=a[0]==='same'?'same':V[a[0]].id, vid='';try{vid=localStorage.getItem('daf-vid')||''}catch(e){}
    fetch('/api/lab/vote',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({page:C.page,choice:id,vid:vid})}).then(function(){
      voted=id; try{localStorage.setItem('lab-vote-'+C.page,id)}catch(e){} paint(); show(true); btns.hidden=true; document.querySelector('.lab-q').textContent='הגרסאות נחשפו:'});};
  btns.appendChild(b)});
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
<p>המידע לא נמכר ולא מועבר לאף גורם. הוא נשמר בתשתית של Cloudflare; מיילים נשלחים דרך Resend.</p>
<h2>מחיקה</h2>
<p>להתנתקות: בהגדרות (⚙). למחיקת החשבון וההתקדמות השמורה בו, או לכל שאלה: <a href="mailto:tsemachh@gmail.com">tsemachh@gmail.com</a>.</p>
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


def main():
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)
    for f in ("app.css", "app.js", "progress.js"):
        shutil.copy(os.path.join(ROOT, "site", f), os.path.join(DIST, f))
    shutil.copytree(os.path.join(ROOT, "site", "fonts"), os.path.join(DIST, "fonts"))
    if os.path.isdir(os.path.join(ROOT, "site", "og")):
        shutil.copytree(os.path.join(ROOT, "site", "og"), os.path.join(DIST, "og"))
    for f in glob.glob(os.path.join(ROOT, "site", "static", "*")):
        shutil.copy(f, DIST)
    glossary = json.load(open(os.path.join(ROOT, "data", "glossary.json"), encoding="utf8"))
    sources = json.load(open(os.path.join(ROOT, "data", "sources.json"), encoding="utf8"))
    by_slug = {}
    for f in sorted(glob.glob(os.path.join(ROOT, "data", "*", "*.json"))):
        d = json.load(open(f, encoding="utf8"))
        by_slug.setdefault(d["slug"], []).append(d)
    CATALOG["pages"].clear(); CATALOG["mas"].clear()
    pk_path = os.path.join(ROOT, "data", "perakim.json")
    perakim = json.load(open(pk_path, encoding="utf8")) if os.path.exists(pk_path) else {}
    for slug, ds in by_slug.items():
        for he, sef, sl, first, last in dafyomi.MASECHTOT:
            if sl == slug:
                CATALOG["mas"][slug] = {"he": he, "first": first, "last": last,
                                        "p": [[x["he"], x["from"], x["to"]] for x in perakim.get(slug, [])]}
        for d in sorted(ds, key=lambda x: x["daf"]):
            CATALOG["pages"].append({"k": f"{slug}/{d['daf']}", "s": slug, "d": d["daf"],
                                     "h": f"{d['tractate_he']} {heb_num(d['daf'])}",
                                     "t": re.sub("<[^>]+>", "", d["thesis"])[:110],
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
    latest = sorted(alld, key=lambda d: d.get("order", d["daf"]), reverse=True)[:7]
    open(os.path.join(DIST, "index.html"), "w", encoding="utf8").write(render_home(by_slug, latest, about))
    # quiz bank for spaced review (fetched by progress.js on /review/ and for the "yesterday" opener)
    json.dump({f"{d['slug']}/{d['daf']}": d["quiz"] for d in alld}, open(os.path.join(DIST, "quiz.json"), "w", encoding="utf8"),
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
        f'<div class="eyebrow">לסוקרים ולמתעניינים</div><h1>איך נבנים הדפים ומה נבדק</h1></header>'
        f'{about}{credits("../")}<footer>{FOOT}</footer></section></div>', "תהליך הבנייה והבדיקה של דפי החזרה והלימוד", depth=1))
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
    urls = ["", "about/", "ideas/", "changes/", "stats/", "notes/", "privacy/"] + [f"{slug}/" for slug in by_slug] + [f"{d['slug']}/{d['daf']}/" for d in alld]
    open(os.path.join(DIST, "sitemap.xml"), "w", encoding="utf8").write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{SITE_URL}/{u}</loc></url>\n" for u in urls) + "</urlset>\n")
    open(os.path.join(DIST, "robots.txt"), "w", encoding="utf8").write(
        f"User-agent: *\nDisallow: /admin/\nDisallow: /api/\nSitemap: {SITE_URL}/sitemap.xml\n")
    open(os.path.join(DIST, "404.html"), "w", encoding="utf8").write(page(
        "הדף לא נמצא · " + SITE_TITLE,
        f'<div class="wrap" id="app"><section><header><h1>הדף לא נמצא</h1>'
        f'<p class="thesis">הכתובת אינה קיימת. <a href="/">לדף הבית</a></p></header></section></div>', "הדף לא נמצא"))
    print(f"built {len(alld)} dafim in {len(by_slug)} masechtot -> {DIST}")


if __name__ == "__main__":
    main()
