"""Search bundle_index.jsonl for asset paths.

Usage:
    python tools/search_index.py down 载 下载
    python tools/search_index.py --bundle-only "font"
"""

import argparse
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(HERE, "bundle_index.jsonl")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("terms", nargs="+")
    ap.add_argument("--index", default=INDEX)
    ap.add_argument("--max", type=int, default=200)
    args = ap.parse_args()

    pat = re.compile("|".join(re.escape(t) for t in args.terms), re.IGNORECASE)
    shown = 0
    total = 0
    with open(args.index, encoding="utf-8") as f:
        for line in f:
            rec = json.loads(line)
            for p in rec["paths"]:
                if pat.search(p):
                    total += 1
                    if shown < args.max:
                        print(f"{rec['bundle']}\t{p}")
                        shown += 1
    print(f"-- {total} matches, showing {shown}", flush=True)


if __name__ == "__main__":
    main()
