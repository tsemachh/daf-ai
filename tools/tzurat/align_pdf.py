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
def gemara_font(fid):
    size, fam = fonts[fid]
    return re.search(r"\+Vilna(,Bold)?$", fam) is not None and 17 <= size <= 50
subprocess.run(["pdftoppm", "-r", str(DPI), "-png", "-singlefile", pdf, out], check=True)
sc = DPI / 72 / ZOOM
O = []   # (norm, x, y, w, h, line-key)
for m in re.finditer(r'<text top="([\d.-]+)" left="([\d.-]+)" width="([\d.-]+)" height="([\d.-]+)" font="(\d+)">(.*?)</text>', xml, re.S):
    top, left, width, height, fid, txt = m.groups()
    top, left, width, height = map(float, (top, left, width, height))
    if not gemara_font(fid) or top < 60 * ZOOM: continue
    txt = html.unescape(re.sub(r"<[^>]+>", "", txt))[::-1]          # pdftohtml hands RTL runs out reversed
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
