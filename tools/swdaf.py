#!/usr/bin/env python3
"""Add Simon Wolf's daf charts (swdaf.com, used with permission) to data/swdaf.json.

The container can't reach swdaf.com, so the nightly run reads the feed with WebFetch
(https://www.swdaf.com/swrss.php?mas=<masechet>) and passes the PDF URLs here:
    python tools/swdaf.py add https://www.swdaf.com/docDownload/bechorot/bechorot050_Gold_Silver.pdf ...
Pages link to the PDFs at the source (never copied), credited "באדיבות Simon Wolf (www.swdaf.com)".
"""
import json, os, re, sys

P = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "swdaf.json")
RX = re.compile(r"^https://www\.swdaf\.com/docDownload/([a-z]+)/(\1(\d+)_[A-Za-z0-9_]+\.pdf)$")


def main(a):
    if not a or a[0] != "add":
        sys.exit(__doc__)
    d = json.load(open(P, encoding="utf8")) if os.path.exists(P) else {}
    new = 0
    for u in a[1:]:
        m = RX.match(u.strip())
        if not m:
            print("skip (not a swdaf daf PDF):", u); continue
        slug, f, n = m.group(1), m.group(2), str(int(m.group(3)))
        lst = d.setdefault(slug, {}).setdefault(n, [])
        if f not in lst:
            lst.append(f); lst.sort(); new += 1
    json.dump(d, open(P, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print(f"swdaf: {new} new chart(s)")


if __name__ == "__main__":
    main(sys.argv[1:])
