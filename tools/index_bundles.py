"""Scan PGR .uab bundles and index container paths that look like UI / font assets.

Usage:
    python tools/index_bundles.py [--min-size 8192] [--workers 7]
Writes tools/bundle_index.jsonl  ({"bundle": name, "paths": [...]})
"""

import argparse
import json
import os
import re
import sys
import time
from concurrent.futures import ProcessPoolExecutor

import UnityPy

MATRIX = r"D:\Punishing Gray Raven\Punishing Gray Raven Game\PGR_Data\StreamingAssets\resource\matrix"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bundle_index.jsonl")
FILTER = re.compile(r"(/ui/|/font|\.ttf|\.otf)", re.IGNORECASE)
HEADER_TAIL = 256


def scan(path):
    try:
        with open(path, "rb") as f:
            raw = f.read()
        off = raw.find(b"UnityFS", 0, HEADER_TAIL)
        if off < 0:
            return None
        env = UnityPy.load(raw[off:])
        hits = sorted({k for k in env.container if FILTER.search(k)})
        return (os.path.basename(path), hits) if hits else None
    except Exception:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--matrix", default=MATRIX)
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--min-size", type=int, default=8192)
    ap.add_argument("--workers", type=int, default=max(1, (os.cpu_count() or 2) - 1))
    args = ap.parse_args()

    files = []
    for name in os.listdir(args.matrix):
        if not name.lower().endswith(".uab"):
            continue
        p = os.path.join(args.matrix, name)
        try:
            if os.path.getsize(p) >= args.min_size:
                files.append(p)
        except OSError:
            pass

    total = len(files)
    print(f"scanning {total} bundles with {args.workers} workers", flush=True)
    t0 = time.time()
    done = 0
    hits = 0
    with open(args.out, "w", encoding="utf-8") as out, ProcessPoolExecutor(args.workers) as pool:
        for res in pool.map(scan, files, chunksize=16):
            done += 1
            if res:
                hits += 1
                out.write(json.dumps({"bundle": res[0], "paths": res[1]}, ensure_ascii=False) + "\n")
            if done % 2000 == 0:
                el = time.time() - t0
                print(f"  {done}/{total}  hit={hits}  {done / el:.0f} files/s", flush=True)

    print(f"done in {time.time() - t0:.0f}s, {hits} bundles matched -> {args.out}", flush=True)


if __name__ == "__main__":
    main()
