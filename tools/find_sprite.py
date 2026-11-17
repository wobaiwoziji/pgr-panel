"""Grep sprite_index.jsonl.

    python tools/find_sprite.py download 下载 icon
"""

import argparse
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(HERE, "sprite_index.jsonl")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("terms", nargs="+")
    ap.add_argument("--index", default=INDEX)
    ap.add_argument("--max", type=int, default=120)
    args = ap.parse_args()

    pat = re.compile("|".join(re.escape(t) for t in args.terms), re.IGNORECASE)
    seen = set()
    shown = 0
    total = 0
    with open(args.index, encoding="utf-8") as f:
        for line in f:
            rec = json.loads(line)
            for t, name, w, h in rec["s"]:
                if not pat.search(name):
                    continue
                total += 1
                if shown < args.max and name not in seen:
                    seen.add(name)
                    print(f"{t:9} {w:5}x{h:<5} {rec['bundle']}  {name}")
                    shown += 1
    print(f"-- {total} hits, {len(seen)} unique names, showing {shown}", flush=True)


if __name__ == "__main__":
    main()
