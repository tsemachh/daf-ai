"""One-time migration: split the legacy single-file hub (claude.ai artifact) into
per-daf JSON content files + shared glossary + home content.

usage: python tools/extract_from_hub.py path/to/hub.html
"""
import json, re, sys, os
from bs4 import BeautifulSoup, NavigableString

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRACTATES = {"Bekhorot": ("bechorot", "בכורות")}


def inner(el):
    return "".join(str(c) for c in el.contents).strip()


def parse_steps(ol):
    steps = []
    for li in ol.find_all("li", recursive=False):
        tag = li.find("span", class_="tag")
        body = li.find("span", class_="body")
        cls = [c for c in (tag.get("class") or []) if c != "tag"]
        st = {
            "tag": tag.get_text(),
            "type": cls[0] if cls else "",
            "hideable": "hideable" in (li.get("class") or []),
            "body": inner(body),
        }
        if li.get("data-p") is not None:
            st["p"] = int(li["data-p"])
        steps.append(st)
    return steps


def parse_section(sec):
    """Structured when the section has one ol.steps; otherwise kept as raw html."""
    sid = sec.get("id") or ""
    ols = sec.find_all("ol", class_="steps", recursive=False)
    amud = sec.find("div", class_="amud", recursive=False)
    h3 = sec.find("h3", recursive=False)
    out = {"id": sid.split("-", 1)[1] if "-" in sid else sid,
           "amud": amud.get_text() if amud else "",
           "ref": amud.get("data-ref") if amud else None,
           "title": inner(h3) if h3 else ""}
    if len(ols) != 1:
        rest = [str(c) for c in sec.children
                if not (getattr(c, "name", None) and (c is amud or c is h3))]
        out["kind"] = "raw"
        out["html"] = "".join(rest).strip()
        return out
    ol = ols[0]
    out["kind"] = "sugya"
    out["quote"] = None
    out["flow"] = None
    pre, post, seen_ol = [], [], False
    for c in sec.children:
        if isinstance(c, NavigableString):
            continue
        if c is amud or c is h3:
            continue
        if c is ol:
            seen_ol = True
            continue
        if c.name == "blockquote" and not seen_ol and out["quote"] is None and not pre:
            cite = c.find("cite")
            ctext = cite.get_text() if cite else ""
            if cite:
                cite.extract()
            out["quote"] = {"text": inner(c), "cite": ctext}
            continue
        if c.name == "details" and "flowd" in (c.get("class") or []):
            out["flow"] = inner(c.find("p"))
            continue
        (post if seen_ol else pre).append(str(c))
    out["pre"] = "".join(pre).strip()
    out["steps"] = parse_steps(ol)
    out["post"] = "".join(post).strip()
    return out


def main(path):
    soup = BeautifulSoup(open(path, encoding="utf8").read(), "html.parser")
    srctext = json.loads(soup.find("script", id="srctext").string)
    glossary = json.loads(soup.find("script", id="glossary").string)
    json.dump(glossary, open(os.path.join(ROOT, "data", "glossary.json"), "w", encoding="utf8"),
              ensure_ascii=False, indent=1)

    cards = {}
    for a in soup.select("#home a.card"):
        key = a["href"].lstrip("#")
        cards[key] = {
            "topics": a.find("p").get_text(),
            "date": a.find("span", class_="date").get_text(),
            "stats": [inner(s) for s in a.select(".stats > span")],
            "stats_html": [str(s) for s in a.select(".stats > span")],
        }

    for art in soup.find_all("article", class_="daf"):
        key = art["id"]
        tr = art["data-tractate"]
        slug, tr_he = TRACTATES[tr]
        daf = int(art["data-daf"])
        hdr = art.find("header")
        d = {
            "key": key, "tractate": tr, "slug": slug, "tractate_he": tr_he, "daf": daf,
            "title": hdr.find("h1").get_text(),
            "eyebrow": hdr.find("div", class_="eyebrow").get_text(),
            "thesis": inner(hdr.find("p", class_="thesis")),
            "meta": [s.get_text() for s in hdr.select(".meta > span") if "ai-badge" not in (s.get("class") or [])],
            "nav": [], "storyline": None, "sections": [], "quiz": [], "links": [],
            "footer": art.find("footer", recursive=False).get_text() if art.find("footer", recursive=False) else "",
            "card": cards.get(key, {}),
        }
        nav = art.find("nav", class_="map")
        for a in nav.select("li a"):
            am = a.find("span", class_="amud")
            amt = am.get_text()
            am.extract()
            d["nav"].append({"id": a["href"].split("-", 1)[1], "amud": amt, "title": inner(a)})
        sl = art.find("details", class_="storyline")
        if sl:
            d["storyline"] = inner(sl.find("p"))
        for sec in art.find_all("section", class_="sugya", recursive=False):
            sid = sec.get("id") or ""
            if sid.endswith("-quiz"):
                continue
            links = sec.find("ul", class_="links")
            if links and not sid:
                d["links"] = [{"href": a["href"], "text": a.get_text()} for a in links.find_all("a")]
                continue
            d["sections"].append(parse_section(sec))
        q = art.find("script", class_="qdata")
        d["quiz"] = json.loads(q.string) if q else []
        refs = set()
        for s in d["sections"]:
            if s.get("ref"):
                refs.add(s["ref"])
        blob = json.dumps(d, ensure_ascii=False)
        d["srctext"] = {k: v for k, v in srctext.items() if k in refs}
        # verse / halacha entries are resolved at build time from data/sources.json
        out = os.path.join(ROOT, "data", slug, f"{daf}.json")
        json.dump(d, open(out, "w", encoding="utf8"), ensure_ascii=False, indent=1)
        print("wrote", out, len(blob))

    other = {k: v for k, v in srctext.items() if not re.match(r"^[A-Z][a-z]+\.\d+[ab]", k)}
    json.dump(other, open(os.path.join(ROOT, "data", "sources.json"), "w", encoding="utf8"),
              ensure_ascii=False, indent=1)
    print("shared sources", len(other), "glossary", len(glossary))

    home = soup.find("section", id="home")
    extra = [str(s) for s in home.find_all("section", class_="sugya", recursive=False)]
    open(os.path.join(ROOT, "content", "home_about.html"), "w", encoding="utf8").write("\n\n".join(extra))


if __name__ == "__main__":
    main(sys.argv[1])
