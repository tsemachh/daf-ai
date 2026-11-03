"""Align a typeset (text) page PDF of the Gemara — the Nehardea edition pages daf-yomi.com serves — to the
Sefaria segments of that amud, without OCR: the PDF carries its own text with positions and fonts.
usage: align_pdf.py <slug> <daf> <a|b> <page.pdf> <out-prefix>
Writes <out-prefix>.png (the page at 150 dpi) and <out-prefix>.json — the words of the Gemara column,
each with its segment number and pixel box — the same shape align.py produces, for publish.py."""
import json, re, sys, difflib, subprocess, os, html
slug, daf, amud, pdf, out = sys.argv[1:6]
SRC = os.environ.get("DAF_SOURCES", "/home/claude/daf-ai-sources")
DPI = 150
ZOOM = 1.5     # pdftohtml zoom: its font sizes and coordinates are reported at this scale
segs = json.load(open(f"{SRC}/{slug}/{daf}/sefaria_he_{amud}.json"))["segments"]
FIN = str.maketrans("ךםןףץ", "כמנפצ")
def norm(w):
    w = re.sub(r"[֑-ׇ]", "", w); w = re.sub(r"[^א-ת]", "", w); return w.translate(FIN)
S, SI = [], []
for i, t in enumerate(segs):
    for w in re.sub(r"<[^>]+>", "", t).split():
        n = norm(w)
        if n: S.append(n); SI.append(i + 1)
# --- the PDF's own words (pdftohtml coordinates are MediaBox points × ZOOM; pdftoppm renders the same box) ---
subprocess.run(["pdftohtml", "-xml", "-i", "-q", "-zoom", str(ZOOM), pdf, out + "_x"], check=True)
xml = open(out + "_x.xml", encoding="utf8").read(); os.remove(out + "_x.xml")
fonts = {m.group(1): (float(m.group(2)), m.group(3)) for m in re.finditer(r'<fontspec id="(\d+)" size="([\d.]+)" family="([^"]+)"', xml)}
TEXT = re.compile(r'<text top="([\d.-]+)" left="([\d.-]+)" width="([\d.-]+)" height="([\d.-]+)" font="(\d+)">(.*?)</text>', re.S)
def runs():
    for m in TEXT.finditer(xml):
        top, left, width, height = map(float, m.groups()[:4])
        yield top, left, width, height, m.group(5), html.unescape(re.sub(r"<[^>]+>", "", m.group(6)))[::-1]   # pdftohtml hands RTL runs out reversed
# Which fonts carry the Gemara itself? Font names differ between files (some are just TT4544Ao00), so decide by the
# text: a font is a Gemara font when it is large enough and nearly all of its words occur in the Sefaria text of the
# amud (Rashi and Tosafot quote the Gemara too, but only a third of their words are in it).
from collections import defaultdict
SW = {w for w in S if len(w) >= 3}
tot, hit = defaultdict(int), defaultdict(int)
for top, left, width, height, fid, txt in runs():
    for w in txt.split():
        n = norm(w)
        if len(n) >= 3: tot[fid] += 1; hit[fid] += n in SW
def wordy(fid):
    size = fonts[fid][0]
    if not 16 <= size <= 50 or not tot[fid]: return False
    return hit[fid] / tot[fid] >= (0.75 if tot[fid] >= 4 else 0.5)
# Rashi's and Tosafot's opening words (דיבור המתחיל) pass that test too — they quote the Gemara — so keep only the
# fonts whose runs sit inside the Gemara column: on the same lines as runs of the body font (the one with most words).
cand = [f for f in tot if wordy(f)]
body = max(cand, key=lambda f: hit[f]) if cand else None
body_runs = [(t, l, w, h) for t, l, w, h, f, _ in runs() if f == body]
def in_column(t, l, w, h):
    for bt, bl, bw, bh in body_runs:
        if abs(bt - t) < 1.5 * max(h, bh) and min(l + w, bl + bw) - max(l, bl) > 0.5 * w: return True
    return False
ok = {}
for f in cand:
    rs = [(t, l, w, h) for t, l, w, h, ff, _ in runs() if ff == f]
    ok[f] = f == body or sum(in_column(*r) for r in rs) >= 0.7 * len(rs)
def gemara_font(fid): return ok.get(fid, False)
subprocess.run(["pdftoppm", "-r", str(DPI), "-png", "-singlefile", pdf, out], check=True)
sc = DPI / 72 / ZOOM
O = []   # (norm, x, y, w, h, line-key)
for top, left, width, height, fid, txt in runs():
    if not gemara_font(fid) or top < 60 * ZOOM: continue
    words = txt.split()
    if not words: continue
    total = sum(len(w) for w in words) + len(words) - 1
    x = left + width                                                  # RTL: the first word sits at the right edge
    for w in words:
        ww = width * len(w) / total
        n = norm(w)
        if len(n) >= 1: O.append((n, round((x - ww) * sc), round(top * sc), round(ww * sc), round(height * sc), round(top)))
        x -= ww + width / total
sm = difflib.SequenceMatcher(None, [o[0] for o in O], S, autojunk=False)
anch = {}
for a, b, n in sm.get_matching_blocks():
    for k in range(n): anch[a + k] = b + k
print(f"{daf}{amud}: pdf words {len(O)}, source words {len(S)}, matched {len(anch)}", file=sys.stderr)
keys = sorted(anch); seg = [None] * len(O)
for i in range(len(O)):
    if i in anch: seg[i] = SI[anch[i]]; continue
    p = [k for k in keys if k < i]; q = [k for k in keys if k > i]
    if p and q and SI[anch[p[-1]]] == SI[anch[q[0]]]: seg[i] = SI[anch[p[-1]]]
    elif p and q: seg[i] = SI[anch[p[-1]]] if i - p[-1] <= q[0] - i else SI[anch[q[0]]]
    elif p: seg[i] = SI[anch[p[-1]]]
    elif q: seg[i] = SI[anch[q[0]]]
from collections import Counter
lm = Counter(o[5] for i, o in enumerate(O) if i in anch)     # matched words per line
res = [(o, seg[i], i in anch) for i, o in enumerate(O) if seg[i] and lm[o[5]] >= 1]
json.dump([dict(seg=s, x=o[1], y=o[2], w=o[3], h=o[4], m=int(m)) for o, s, m in res], open(out + ".json", "w"))
