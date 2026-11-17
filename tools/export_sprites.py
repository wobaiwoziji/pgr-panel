"""Export Sprite / Texture2D assets by name from PGR bundles.

    python tools/export_sprites.py --match "icon_" --out assets/_game/icons
    python tools/export_sprites.py --match "^ui|^Ui" --max 512 --out out/ui
"""

import argparse
import json
import os
import re
import time

import UnityPy

HERE = os.path.dirname(os.path.abspath(__file__))
MATRIX = r"D:\Punishing Gray Raven\Punishing Gray Raven Game\PGR_Data\StreamingAssets\resource\matrix"
INDEX = os.path.join(HERE, "sprite_index.jsonl")


def safe_name(name):
    return re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name)


def load_bundle(path):
    with open(path, "rb") as f:
        raw = f.read()
    off = raw.find(b"UnityFS", 0, 256)
    if off < 0:
        return None
    return UnityPy.load(raw[off:])


def collect(match, types, min_size, max_size, limit, bundle_pat=None):
    pat = re.compile(match)
    bpat = re.compile(bundle_pat) if bundle_pat else None
    buckets = {}
    with open(INDEX, encoding="utf-8") as f:
        for line in f:
            rec = json.loads(line)
            if bpat and not bpat.search(rec["bundle"]):
                continue
            for t, name, w, h in rec["s"]:
                if t not in types or not pat.search(name):
                    continue
                if min_size and max(w, h) < min_size:
                    continue
                if max_size and max(w, h) > max_size:
                    continue
                buckets.setdefault(rec["bundle"], set()).add(name)
    items = sorted((b, n) for b, ns in buckets.items() for n in ns)
    if limit:
        items = items[:limit]
    return items


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--match", required=True)
    ap.add_argument("--out", default=os.path.join(HERE, "..", "assets", "_game", "export"))
    ap.add_argument("--types", default="Sprite,Texture2D")
    ap.add_argument("--min", type=int, default=0)
    ap.add_argument("--max", type=int, default=0)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--bundle", default=None, help="regex filter on bundle file name")
    args = ap.parse_args()

    types = {t.strip() for t in args.types.split(",") if t.strip()}
    items = collect(args.match, types, args.min, args.max, args.limit, args.bundle)
    print(f"{len(items)} assets matched", flush=True)

    out_dir = os.path.abspath(args.out)
    os.makedirs(out_dir, exist_ok=True)

    by_bundle = {}
    for b, n in items:
        by_bundle.setdefault(b, set()).add(n)

    t0 = time.time()
    saved = 0
    with open(os.path.join(out_dir, "_manifest.jsonl"), "a", encoding="utf-8") as man:
        for i, (bundle, names) in enumerate(by_bundle.items(), 1):
            env = load_bundle(os.path.join(MATRIX, bundle))
            if env is None:
                continue
            for o in env.objects:
                t = o.type.name
                if t not in types:
                    continue
                try:
                    d = o.read()
                    name = getattr(d, "m_Name", "")
                    if name not in names:
                        continue
                    img = getattr(d, "image", None)
                    if img is None:
                        continue
                    target = os.path.join(out_dir, safe_name(name) + ".png")
                    n = 1
                    while os.path.exists(target):
                        n += 1
                        target = os.path.join(out_dir, f"{safe_name(name)}_{n}.png")
                    img.save(target)
                    saved += 1
                    man.write(json.dumps({"file": os.path.basename(target), "name": name, "type": t,
                                          "w": img.width, "h": img.height, "bundle": bundle},
                                         ensure_ascii=False) + "\n")
                except Exception:
                    continue
            if i % 20 == 0:
                print(f"  {i}/{len(by_bundle)} bundles  saved={saved}  {time.time() - t0:.0f}s", flush=True)

    print(f"done: {saved} images -> {out_dir}", flush=True)


if __name__ == "__main__":
    main()
