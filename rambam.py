"""Rambam learning pages (/rambam/<work>/<perek>/) — a learning mode of its own, not the daf layout.

The Rambam is learned halacha by halacha: the text of each halacha is cut into short clauses, and each clause is
followed directly by its explanation (text → explanation → text …), so every word is taught, in order.
Data: data_rambam/<work>/<perek>.json (schema: tasks/rambam-brief.md). The page reuses the site shell (page(),
quiz, slides, notes, progress) through the build module `B`; the layout, CSS (site/rambam.css) and the reading
tools (site/rambam.js) are separate.
"""
import glob
import shutil
import json
import os
import re

WORKS = {"teshuva": {"he": "הלכות תשובה", "sef": "Mishneh_Torah,_Repentance", "chapters": 10, "sefer": "ספר המדע"}}
HEB = "אבגדהוזחטיכלמנסעפצקרשת"


def hnum(n):
    """1 → א׳, 11 → י״א (halachot and chapters stay well under 100)."""
    tens, ones = divmod(n, 10)
    s = ("" if not tens else "יכלמנסעפצ"[tens - 1]) + ("" if not ones else HEB[ones - 1])
    s = s.replace("יה", "טו").replace("יו", "טז")
    return s + "׳" if len(s) == 1 else s[:-1] + "״" + s[-1]


def norm_t(s):
    return " ".join(s.split())


def check(d, texts):
    """Every halacha's clauses, joined, must be its text exactly (the whole halacha is taught, in order)."""
    errs = []
    for h in d["halachot"]:
        got = norm_t(" ".join(p["t"] for g in h["groups"] for p in g["parts"]))
        if got != norm_t(texts[h["n"] - 1]):
            errs.append(f"halacha {h['n']}: clauses do not join to the text")
    return errs


def parts_html(B, parts, hid, start):
    out, i = [], start
    for p in parts:
        i += 1
        x = p.get("x", "")
        w = p.get("w") or []
        words = ("<p class=\"r-w\">" + " · ".join(f"<b>{B.esc(a)}</b> — {B.esc(b)}" for a, b in w) + "</p>") if w else ""
        ask = p.get("ask")
        askh = (f'<div class="r-ask"><span class="r-ask-q">בדקי את עצמך: {ask["q"]}</span>'
                f'<button class="reveal" type="button">הצג תשובה</button><div class="ans" hidden="">{ask["a"]}</div></div>') if ask else ""
        aid = B.render_step_aid({"aid": p["aid"]}, f"{hid}-aid{i}") if p.get("aid") else ""
        out.append(f'<li class="r-part" id="{hid}-{i}"><p class="r-t">{B.esc(p["t"])}</p>'
                   f'<div class="r-x">{x}{words}{askh}{aid}</div></li>')
    return "\n".join(out), i


def halacha_html(B, h, key, full):
    hid = f"{key}-{h['id']}"
    n = 0
    body = []
    for g in h["groups"]:
        if g.get("title"):
            body.append(f'<h4 class="r-sub">{B.esc(g["title"])}</h4>')
        lis, n = parts_html(B, g["parts"], hid, n)
        body.append(f'<ol class="r-parts">{lis}</ol>')
    think = h.get("think")
    thinkh = (f'<div class="think"><div class="lbl">חשבו לפני שממשיכים</div><p>{think["q"]}</p>'
              f'<button class="reveal" type="button">הצג תשובה</button><div class="ans" hidden="">{think["a"]}</div></div>') if think else ""
    label = f"הלכה {hnum(h['n'])}" if h.get("n") else "פתיחה"
    return f"""<section class="sugya rh" id="{hid}">
  <div class="amud">{label}</div>
  <h3>{B.esc(h['title'])}</h3>
  {f'<p class="r-gist"><b>בקצרה:</b> {h["gist"]}</p>' if h.get("gist") else ''}
  <details class="r-full"><summary>לשון {label} ברצף</summary><p class="r-text">{B.esc(full)}</p></details>
  {"".join(body)}
  {f'<p class="r-sum"><b>מה למדנו:</b> {h["sum"]}</p>' if h.get("sum") else ''}
  {thinkh}
</section>"""


def render_page(B, d, meta, work, texts, have, glossary):
    key, n = d["key"], d["perek"]
    hs = list(d["halachot"])
    if d.get("opening"):
        op = dict(d["opening"]); op.setdefault("id", "h0"); op.setdefault("title", "פתיחה: כותרת ההלכות")
        op.setdefault("groups", [{"parts": op.get("parts", [])}]); op.pop("n", None)
        hs = [op] + hs
    secs = [halacha_html(B, h, key, texts[h["n"] - 1] if h.get("n") else h.get("t", "")) for h in hs]
    sections = "\n\n".join(secs)
    nav = "\n".join(f'    <li><a href="#{key}-{h["id"]}"><span class="amud">{"הלכה " + hnum(h["n"]) if h.get("n") else "פתיחה"}</span>{B.esc(h["title"])}</a></li>' for h in hs)
    story = (f'<details class="storyline"><summary class="sl-h">מבנה הפרק</summary>{"".join(f"<p>{x}</p>" for x in B.split_paras(d["storyline"], 160))}</details>'
             if d.get("storyline") else "")
    pn = []
    for k, fmt in ((n - 1, "→ פרק {}"), (n + 1, "פרק {} ←")):
        if k in have:
            pn.append(f'<a class="back" href="../{k}/">{fmt.format(hnum(k))}</a>')
    pager = f'<div class="pager">{"".join(pn)}</div>' if pn else ""
    links = "\n".join(f'    <li><a href="{B.esc(l["href"])}">{B.esc(l["text"])}</a></li>' for l in d.get("links", []))
    sl = d.get("slides")
    mins = next((m for m in d.get("meta", []) if "דק" in m), "")
    meta_s = "".join(f"<span>{B.esc(m)}</span>" for m in d.get("meta", []) if m != mins) + '<span class="ai-badge">נוצר על ידי סוכן AI</span>'
    article = f"""<article class="daf rmb" data-kind="rambam" id="{key}" data-tractate="{meta['sef']}" data-daf="{n}">
<div class="topnav"><span><a class="back" href="../../../">דף הבית</a> · <a class="back" href="../">{meta['he']}</a></span></div>
<header>
  <div class="eyebrow">{B.esc(d.get('eyebrow', ''))}</div>
  <div class="titlerow"><h1>{B.esc(d['title'])}</h1><span class="tmeta">{f'<span>{B.esc(mins)}</span>' if mins else ''}<a class="src" target="_blank" rel="noopener" href="https://www.sefaria.org/{meta['sef']}.{n}?lang=he">ספריא</a></span></div>
  <p class="thesis">{d['thesis']}</p>
  <div class="meta">{meta_s}{'<button class="sl-btn sl-page" type="button" data-sl="*">📊 מצגת הפרק</button>' if sl else ''}<span class="sec-tools pg-tools"></span></div>
  <div class="r-how"><b>איך לומדים:</b> כל הלכה מחולקת לקטעים קצרים — קודם <span class="r-t-chip">לשון הרמב״ם</span> ומיד אחריו ההסבר.</div>
  <div class="controls r-modes" role="group" aria-label="אופן הלימוד">
    <button class="btn" data-rm="learn" aria-pressed="true" type="button" title="לשון הרמב״ם וההסבר אחרי כל קטע">לימוד</button>
    <button class="btn" data-rm="test" aria-pressed="false" type="button" title="ההסברים מוסתרים — נסי להסביר לבד, והקישי על קטע לגילוי">בדיקה עצמית</button>
    <button class="btn" data-rm="text" aria-pressed="false" type="button" title="רק לשון הרמב״ם, ברצף">רק הרמב״ם</button>
    <button class="btn" data-role="learned" aria-pressed="false" type="button" title="סמני את כל ההלכות כנלמדו">למדתי</button>
  </div>
</header>

<nav class="map" aria-label="מפת ההלכות">
  <h2>מהלך הפרק</h2>
  <ol>
{nav}
  </ol>
</nav>
<div class="to-quiz-row"><a class="to-quiz" href="#{key}-quiz">✎ שאלות חשיבה על הפרק — בסוף הדף ↓</a>{'<button class="to-quiz sl-btn" type="button" data-sl="*">📊 מצגת הפרק — לחזרה מהירה</button>' if sl else ''}</div>
{story}

{sections}
{B.jscript(sl, cls="sl-data") if sl else ""}
<section class="sugya" id="{key}-quiz">
  <div class="amud">בסוף הפרק</div>
  <h3>שאלות חשיבה <span class="score" data-role="score"></span></h3>
  <div class="quiz" data-role="quizBox"></div>
  <button class="btn" data-role="resetQuiz" type="button" style="margin-top:14px">התחל מחדש</button>
</section>
{pager}

<section class="sugya" id="{key}-more">
  <div class="amud">להעמקה</div>
  <h3>מקורות</h3>
  <ul class="links">
{links}
  </ul>
</section>
{B.credits('../../../')}
<footer>{B.esc(d.get('footer', ''))}</footer>
{B.jscript(d['quiz'], cls='qdata')}
</article>"""
    gl = {k: v for k, v in glossary.items() if k in article}
    body = f"""<link rel="stylesheet" href="../../../rambam.css?v={B.ASSET_V}">
<div class="wrap" id="app">
{article}
</div>
{B.jscript({}, id='srctext')}
{B.jscript(gl, id='glossary')}
{B.catalog_json()}
<script src="../../../app.js" defer></script>
<script src="../../../progress.js" defer></script>
<script src="../../../rambam.js?v={B.ASSET_V}" defer></script>"""
    desc = re.sub("<[^>]+>", "", d["thesis"])
    return B.page(f"{d['title']} · {meta['he']} לרמב״ם · {B.BRAND}", body, desc, depth=3,
                  canonical=f"{B.SITE_URL}/rambam/{work}/{n}/")


def render_all(B, glossary):
    root = os.path.join(B.ROOT, "data_rambam")
    if not os.path.isdir(root):
        return
    for work in sorted(os.listdir(root)):
        meta = WORKS.get(work)
        if not meta:
            continue
        files = sorted(glob.glob(os.path.join(root, work, "*.json")), key=lambda f: int(os.path.basename(f)[:-5]))
        ds = [json.load(open(f, encoding="utf8")) for f in files]
        have = {d["perek"] for d in ds}
        cards = []
        for d in ds:
            n = d["perek"]
            texts = json.load(open(os.path.join(root, work, "text", f"{n}.json"), encoding="utf8"))
            errs = check(d, texts)
            if errs:
                raise SystemExit(f"rambam {work} {n}: " + "; ".join(errs))
            out = os.path.join(B.DIST, "rambam", work, str(n))
            os.makedirs(out, exist_ok=True)
            open(os.path.join(out, "index.html"), "w", encoding="utf8").write(render_page(B, d, meta, work, texts, have, glossary))
            cards.append(f'<a class="card" href="./{n}/"><span class="c-daf">פרק {hnum(n)}</span><span class="c-t">{B.esc(d["title"])}</span>'
                         f'<span class="c-s">{B.esc(re.sub("<[^>]+>", "", d["thesis"]))}</span></a>')
        idx = B.page(f"{meta['he']} לרמב״ם · {B.BRAND}", f"""<div class="wrap" id="app"><section>
<a class="back" href="../../">→ דף הבית</a>
<h1>{meta['he']} לרמב״ם</h1>
<p class="thesis">דפי לימוד לפי פרקים: כל הלכה מחולקת לקטעים — לשון הרמב״ם ומיד אחריו ההסבר, עזרים ושאלות חשיבה.</p>
<div class="cards">
{chr(10).join(cards)}
</div></section></div>""", f"{meta['he']} לרמב״ם — דפי לימוד", depth=2)
        open(os.path.join(B.DIST, "rambam", work, "index.html"), "w", encoding="utf8").write(idx)
