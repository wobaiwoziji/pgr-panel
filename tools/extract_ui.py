"""Extract sprites / textures from PGR bundles listed in bundle_index.jsonl.

Usage:
    python tools/extract_ui.py --match "/ui/" --out assets/_game/ui
    python tools/extract_ui.py --match "font|\\.ttf|\\.otf" --out assets/_game/font
"""

import argparse
import json
import os
import re
import sys
import time

import UnityPy

HERE = os.path.dirname(os.path.abspath(__file__))
MATRIX = r"D:\Punishing Gray Raven\Punishing Gray Raven Game\PGR_Data\StreamingAssets\resource\matrix"
INDEX = os.path.join(HERE, "bundle_index.jsonl")
HEADER_TAIL = 256

EXT_MAP = {
    "Sprite": ".png",
    "Texture2D": ".png",
}


def safe_name(path):
    name = path.rsplit("/", 1)[-1]
    return re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name)


def load_bundle(path):
    with open(path, "rb") as f:
        raw = f.read()
    off = raw.find(b"UnityFS", 0, HEADER_TAIL)
    if off < 0:
        return None
    return UnityPy.load(raw[off:])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--index", default=INDEX)
    ap.add_argument("--matrix", default=MATRIX)
    ap.add_argument("--match", default="/ui/")
    ap.add_argument("--exclude", default=None)
    ap.add_argument("--out", default=os.path.join(HERE, "..", "assets", "_game", "ui"))
    ap.add_argument("--types", default="Sprite,Texture2D")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    match = re.compile(args.match, re.IGNORECASE)
    exclude = re.compile(args.exclude, re.IGNORECASE) if args.exclude else None
    want_types = {t.strip() for t in args.types.split(",") if t.strip()}

    out_dir = os.path.abspath(args.out)
    os.makedirs(out_dir, exist_ok=True)
    manifest_path = os.path.join(out_dir, "_manifest.jsonl")

    jobs = []
    with open(args.index, encoding="utf-8") as f:
        for line in f:
            rec = json.loads(line)
            paths = [p for p in rec["paths"] if match.search(p) and not (exclude and exclude.search(p))]
            if paths:
                jobs.append((rec["bundle"], paths))

    if args.limit:
        jobs = jobs[: args.limit]

    print(f"{len(jobs)} bundles to process", flush=True)
    t0 = time.time()
    saved = 0
    failed = 0

    with open(manifest_path, "a", encoding="utf-8") as man:
        for i, (bundle, paths) in enumerate(jobs, 1):
            env = load_bundle(os.path.join(args.matrix, bundle))
            if env is None:
                failed += 1
                continue
            for p in paths:
                pptr = env.container.get(p)
                if pptr is None:
                    continue
                try:
                    obj = pptr.read()
                    tname = pptr.type.name
                    if tname not in want_types:
                        continue
                    img = getattr(obj, "image", None)
                    if img is None:
                        continue
                    ext = EXT_MAP.get(tname, ".png")
                    fname = safe_name(p) + ext
                    target = os.path.join(out_dir, fname)
                    base, e = os.path.splitext(target)
                    n = 1
                    while os.path.exists(target):
                        n += 1
                        target = f"{base}_{n}{e}"
                    img.save(target)
                    saved += 1
                    man.write(
                        json.dumps(
                            {
                                "file": os.path.basename(target),
                                "type": tname,
                                "w": img.width,
                                "h": img.height,
                                "path": p,
                                "bundle": bundle,
                            },
                            ensure_ascii=False,
                        )
                        + "\n"
                    )
                except Exception:
                    failed += 1
            if i % 20 == 0:
                print(f"  {i}/{len(jobs)}  saved={saved}  {time.time() - t0:.0f}s", flush=True)

    print(f"done: {saved} images, {failed} errors, {time.time() - t0:.0f}s -> {out_dir}", flush=True)


if __name__ == "__main__":
    main()
