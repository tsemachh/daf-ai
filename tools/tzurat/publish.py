"""Turn an aligned Vilna page (align.py output) into the site's tzurat-hadaf asset + data.
usage: publish.py <slug> <daf> <amud a|b> <page.png> <match.json>
Writes site/static/tz-<slug>-<daf><amud>.png (4 grays) and data/<slug>/<daf>.json["tzurat"][amud]
= {img,w,h,src,r:{sectionId:[[x,y,w,h] in % of the image]}}"""
import json, sys, os
from collections import defaultdict
from PIL import Image, ImageOps
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
slug, daf, amud, png, mj = sys.argv[1:6]
im = Image.open(png).convert("L")
box = ImageOps.invert(im).point(lambda v: 255 if v > 60 else 0).getbbox()
x0, y0, x1, y1 = box; x0, y0 = max(0, x0 - 20), max(0, y0 - 20); x1, y1 = min(im.width, x1 + 20), min(im.height, y1 + 20)
W = 1500; sc = W / (x1 - x0); H = round((y1 - y0) * sc)
name = f"tz-{slug}-{daf}{amud}.png"
im.crop((x0, y0, x1, y1)).resize((W, H), Image.LANCZOS).quantize(4).save(os.path.join(ROOT, "site", "static", name), optimize=True)
dp = os.path.join(ROOT, "data", slug, f"{daf}.json"); d = json.load(open(dp, encoding="utf8"))
seg2s = {}
for s in d["sections"]:
    for st in s.get("steps", []):
        g = str(st.get("seg", ""))
        if g.startswith(f"{daf}{amud}."):
            seg2s.setdefault(int(g.split(".")[1]), s["id"])
rows = defaultdict(list)
for w in json.load(open(mj)):
    sid = seg2s.get(w["seg"]) or seg2s.get(max([k for k in seg2s if k <= w["seg"]] or [min(seg2s)]))
    rows[(sid, round(w["y"] / 40))].append(w)
r = defaultdict(list)
clusters = []
for (sid, _), ws in rows.items():   # split a row on wide gaps (a neighbouring column); keep only pieces holding a matched word
    ws = sorted(ws, key=lambda w: w["x"]); cur = [ws[0]]
    for w in ws[1:]:
        if w["x"] - max(v["x"] + v["w"] for v in cur) > 70: clusters.append((sid, cur)); cur = [w]
        else: cur.append(w)
    clusters.append((sid, cur))
for sid, ws in sorted(clusters, key=lambda kv: (min(w["y"] for w in kv[1]), -max(w["x"] for w in kv[1]))):
    if not any(w.get("m", 1) for w in ws): continue
    a = min(w["x"] for w in ws) - 6; b = min(w["y"] for w in ws) - 6; c = max(w["x"] + w["w"] for w in ws) + 6; e = max(w["y"] + w["h"] for w in ws) + 6
    r[sid].append([round((a - x0) * sc / W * 100, 2), round((b - y0) * sc / H * 100, 2), round((c - a) * sc / W * 100, 2), round((e - b) * sc / H * 100, 2)])
tz = d.setdefault("tzurat", {})
tz[amud] = {"img": name, "w": W, "h": H, "src": "HebrewBooks · ש״ס וילנא", "r": dict(r)}
import re
txt = json.dumps(d, ensure_ascii=False, indent=1)
txt = re.sub(r"\[\s+(-?[\d.]+),\s+(-?[\d.]+),\s+(-?[\d.]+),\s+(-?[\d.]+)\s+\]", r"[\1,\2,\3,\4]", txt)
open(dp, "w", encoding="utf8").write(txt + "\n")
print(name, W, H, {k: len(v) for k, v in r.items()})
