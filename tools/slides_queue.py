"""Next dafim that still need a NotebookLM teacher deck, in daf-yomi order (the masechet being learned next first).
usage: python3 tools/slides_queue.py [N]   (default 6)"""
import json, os, sys, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORDER = ["arachin", "temurah", "keritot", "meilah", "kinnim", "tamid", "middot", "niddah", "berachot", "sukkah"]   # Bechorot is done; Arachin starts after it
n = int(sys.argv[1]) if len(sys.argv) > 1 else 6
out = []
for slug in ORDER:
    for f in sorted(glob.glob(os.path.join(ROOT, "data", slug, "*.json")), key=lambda p: int(os.path.basename(p)[:-5])):
        d = json.load(open(f, encoding="utf8"))
        if not (d.get("slides") or {}).get("g"):
            out.append(f"{slug} {os.path.basename(f)[:-5]}")
print("\n".join(out[:n]))
