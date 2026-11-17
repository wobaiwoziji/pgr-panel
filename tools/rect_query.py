import json
import sys

rows = json.load(open(r"D:\ui\tools\rect_dump.json", encoding="utf-8"))
pat = sys.argv[1] if len(sys.argv) > 1 else "Btn"
minw = float(sys.argv[2]) if len(sys.argv) > 2 else 0
for r in rows:
    n = r["name"]
    p = r.get("anchored")
    s = r.get("size")
    if n.startswith(pat) and s and p and abs(s[0]) >= minw and abs(s[1]) >= minw:
        print(f"{n:26} pos=({p[0]:8.1f},{p[1]:8.1f}) size=({s[0]:7.1f},{s[1]:7.1f}) rot={r.get('rotZ')}")
