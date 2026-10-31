"""Publish a NotebookLM slide deck (PDF export) onto a daf page.
usage: slides_publish.py <slug> <daf> <deck.pdf> <map> [--drop 9,13]
map: which slides belong to which sugya, 1-based, e.g. "intro:1 s1:2-4 s2:5-6 s3:7-9 s4:10-11 s5:12-13 end:14-15"
Writes site/static/sl-<slug>-<daf>-NN.webp and data/<slug>/<daf>.json["slides"]."""
import json, os, re, subprocess, sys, tempfile, glob
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
slug, daf, pdf, mp = sys.argv[1:5]
drop = set()
if "--drop" in sys.argv:
    drop = {int(x) for x in sys.argv[sys.argv.index("--drop") + 1].split(",")}
tmp = tempfile.mkdtemp()
subprocess.run(["pdfimages", "-png", pdf, os.path.join(tmp, "i")], check=True)
imgs = [f for f in sorted(glob.glob(os.path.join(tmp, "i-*.png"))) if Image.open(f).mode != "L" and Image.open(f).width > 600]
for old in glob.glob(os.path.join(ROOT, "site", "static", f"sl-{slug}-{daf}-*.webp")):  # NOTE: a patched slide must get a new file name (…v2) — images are browser-cached for a week
    os.remove(old)
files = {}
for n, f in enumerate(imgs, 1):
    if n in drop:
        continue
    name = f"sl-{slug}-{daf}-{n:02d}.webp"
    Image.open(f).convert("RGB").save(os.path.join(ROOT, "site", "static", name), quality=76, method=6)
    files[n] = name
groups = {}
for part in mp.split():
    k, r = part.split(":")
    a, _, b = r.partition("-")
    groups[k] = [files[i] for i in range(int(a), int(b or a) + 1) if i in files]
dp = os.path.join(ROOT, "data", slug, f"{daf}.json")
d = json.load(open(dp, encoding="utf8"))
d["slides"] = {"src": "NotebookLM", "w": 1376, "h": 768, "g": groups}
txt = json.dumps(d, ensure_ascii=False, indent=1)
txt = re.sub(r"\[\s+(-?[\d.]+),\s+(-?[\d.]+),\s+(-?[\d.]+),\s+(-?[\d.]+)\s+\]", r"[\1,\2,\3,\4]", txt)
open(dp, "w", encoding="utf8").write(txt + "\n")
print(len(imgs), "slides;", {k: len(v) for k, v in groups.items()}, "size", sum(os.path.getsize(os.path.join(ROOT, "site", "static", v)) for v in files.values()) // 1024, "KB")
