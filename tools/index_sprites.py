"""Second pass: index Sprite / Texture2D / Font object names inside PGR bundles.

Writes tools/sprite_index.jsonl  ({"bundle": name, "s": [[type, name, w, h], ...]})
"""

import argparse
import json
import os
import time
from concurrent.futures import ProcessPoolExecutor

import UnityPy

MATRIX = r"D:\Punishing Gray Raven\Punishing Gray Raven Game\PGR_Data\StreamingAssets\resource\matrix"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "sprite_index.jsonl")
WANT = ("Sprite", "Texture2D", "Font")


def scan(path):
    try:
        with open(path, "rb") as f:
            raw = f.read()
        off = raw.find(b"UnityFS", 0, 256)
        if off < 0:
            return None
        env = UnityPy.load(raw[off:])
        rows = []
        for o in env.objects:
            t = o.type.name
            if t not in WANT:
                continue
            try:
                d = o.read()
                name = getattr(d, "m_Name", "")
                if not name:
                    continue
                w = getattr(d, "m_Width", 0) or 0
                h = getattr(d, "m_Height", 0) or 0
                if t == "Sprite":
                    r = getattr(d, "m_Rect", None)
                    if r is not None:
                        w, h = int(r.width), int(r.height)
                rows.append([t, name, int(w), int(h)])
            except Exception:
                continue
        return (os.path.basename(path), rows) if rows else None
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
    rows_total = 0
    with open(args.out, "w", encoding="utf-8") as out, ProcessPoolExecutor(args.workers) as pool:
        for res in pool.map(scan, files, chunksize=16):
            done += 1
            if res:
                rows_total += len(res[1])
                out.write(json.dumps({"bundle": res[0], "s": res[1]}, ensure_ascii=False) + "\n")
            if done % 2000 == 0:
                el = time.time() - t0
                print(f"  {done}/{total}  objs={rows_total}  {done / el:.0f} files/s", flush=True)

    print(f"done in {time.time() - t0:.0f}s, {rows_total} objects -> {args.out}", flush=True)


if __name__ == "__main__":
    main()
