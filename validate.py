#!/usr/bin/env python3
"""Content checks for data/**.json. Exit code 1 on any error (run before every commit/build).

usage: python validate.py [data/bechorot/12.json ...]   (default: all)
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
REQ = ["key", "tractate", "slug", "tractate_he", "daf", "title", "eyebrow", "thesis", "meta", "nav", "sections", "quiz"]
STEP_TYPES = {"", "q", "a", "c"}


def check(path, glossary):
    errs, warns = [], []
    d = json.load(open(path, encoding="utf8"))
    E = lambda m: errs.append(m)
    for k in REQ:
        if k not in d:
            E(f"missing field {k}")
    if errs:
        return errs, warns
    if d["key"] != f'{d["slug"]}{d["daf"]}':
        E(f'key {d["key"]} != slug+daf')
    if os.path.basename(path) != f'{d["daf"]}.json':
        E("file name must be <daf>.json")
    ids = [s["id"] for s in d["sections"]]
    if len(ids) != len(set(ids)):
        E("duplicate section ids")
    for n in d["nav"]:
        if n["id"] not in ids:
            E(f'nav -> missing section {n["id"]}')
    src = d.get("srctext", {})
    sugyot = 0
    for s in d["sections"]:
        where = f'section {s["id"]}'
        t = s.get("table")
        if t is not None:
            if not isinstance(t, dict) or not t.get("cols") or not t.get("rows"):
                E(f"{where}: table needs cols and rows")
            elif any(len(r) != len(t["cols"]) for r in t["rows"]):
                E(f"{where}: every table row needs {len(t['cols'])} cells")
        dc = s.get("decide")
        if dc is not None and (not isinstance(dc, dict) or not dc.get("branches")
                               or any(not b.get("if") or not b.get("then") for b in dc["branches"])):
            E(f"{where}: decide needs branches with 'if' and 'then'")
        ch = s.get("chain")
        if ch is not None and (not isinstance(ch, dict) or len(ch.get("links", [])) < 2
                               or any(not x.get("k") or not x.get("t") for x in ch["links"])):
            E(f"{where}: chain needs ≥2 links with 'k' and 't'")
        cl = s.get("calc")
        if cl is not None and (not isinstance(cl, dict) or not cl.get("rows") or any(len(r) < 2 for r in cl["rows"])):
            E(f"{where}: calc needs rows of [label, value, cite?]")
        sq = s.get("seq")
        if sq is not None and (not isinstance(sq, dict) or len(sq.get("items", [])) < 2):
            E(f"{where}: seq needs ≥2 items")
        if s.get("cont") not in (None, "next", "prev"):
            E(f"{where}: cont must be 'next' or 'prev'")
        if s["kind"] == "sugya":
            sugyot += 1
            if not s.get("ref"):
                E(f"{where}: no data-ref")
            elif s["ref"] not in src:
                E(f'{where}: srctext missing for {s["ref"]}')
            elif not re.match(r"^[A-Z][A-Za-z_]+\.\d+[ab]\.\d+(-(\d+[ab]\.)?\d+)?$", s["ref"]):
                E(f'{where}: bad ref {s["ref"]}')
            steps = s.get("steps", [])
            if not steps:
                E(f"{where}: no steps")
            for i, st in enumerate(steps):
                if st.get("type", "") not in STEP_TYPES:
                    E(f'{where} step {i}: bad type {st.get("type")}')
                if "p" in st and not (0 <= st["p"] < i):
                    E(f'{where} step {i}: parent {st["p"]} must be an earlier step')
                if not st.get("body", "").strip():
                    E(f"{where} step {i}: empty body")
            if len(steps) > 2 and not s.get("flow"):
                warns.append(f"{where}: no 'בקצרה' summary")
        elif s["kind"] != "raw":
            E(f'{where}: unknown kind {s["kind"]}')
    if not d.get("storyline"):
        warns.append("no storyline (הקדמה)")
    q = d["quiz"]
    if len(q) != 8:
        E(f"quiz has {len(q)} items (need 8)")
    longest = 0
    for i, it in enumerate(q):
        o = it.get("o")
        if not (isinstance(o, list) and len(o) in (3, 4) and isinstance(it.get("a"), int) and 0 <= it["a"] < len(o)
                and it.get("q") and it.get("e")):
            E(f"quiz item {i} malformed")
            continue
        if "w" in it and not (isinstance(it["w"], dict) and all(str(k).isdigit() and int(k) < len(o) and int(k) != it["a"] for k in it["w"])):
            E(f"quiz item {i}: 'w' must map wrong-option indexes to short explanations")
        lens = [len(x) for x in o]
        if lens[it["a"]] == max(lens) and lens.count(max(lens)) == 1 and max(lens) > 1.4 * sorted(lens)[-2]:
            longest += 1
    # the answer should not be guessable from option length (site shuffles positions, not lengths)
    if longest >= 4:
        warns.append(f"quiz: in {longest}/8 items the correct option is clearly the longest — balance option lengths")
    for s in d["sections"]:
        for st in s.get("steps", []):
            if "לא הורחב כאן" in st.get("body", ""):
                warns.append(f"section {s['id']}: a step says 'לא הורחב כאן' — give at least a one-line gist")
    # compound sage names must have their own glossary key (else a shorter key marks part of them)
    text = json.dumps(d, ensure_ascii=False)
    for m in re.finditer(r"(רבי|רב|רבן) [א-ת]+(?: (?:בן|בר|בריה ד|ברבי)[א-ת]*(?: [א-ת]+)?| ה[א-ת]{3,}י)", text):
        name = m.group(0)
        if name not in glossary and not any(name in k for k in glossary):
            warns.append(f"compound name without glossary key: {name}")
    return errs, warns


def main(paths):
    glossary = json.load(open(os.path.join(ROOT, "data", "glossary.json"), encoding="utf8"))
    for k, v in glossary.items():
        if v.get("t") not in {"תנא", "אמורא", "מושג", "מונח", "מקום"}:
            print(f"glossary: bad type for {k}")
    paths = paths or sorted(glob.glob(os.path.join(ROOT, "data", "*", "*.json")))
    bad = 0
    for p in paths:
        errs, warns = check(p, glossary)
        rel = os.path.relpath(p, ROOT)
        for w in sorted(set(warns)):
            print(f"WARN  {rel}: {w}")
        for e in errs:
            print(f"ERROR {rel}: {e}")
        bad += bool(errs)
    print(f"{len(paths)} files, {bad} with errors")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main(sys.argv[1:])
