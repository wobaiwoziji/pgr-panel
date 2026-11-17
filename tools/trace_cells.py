"""从参考帧里逐块抠出四边形（黑格子 / 白标签条 / 标题条），供 CSS clip-path 使用。"""

import json
import sys

import numpy as np
from PIL import Image
from scipy import ndimage


def quads(mask, min_area, max_area, max_w, max_h):
    lab, n = ndimage.label(mask)
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        if sl is None:
            continue
        reg = lab[sl] == i
        area = int(reg.sum())
        if not (min_area <= area <= max_area):
            continue
        ys, xs = np.where(reg)
        if xs.max() - xs.min() > max_w or ys.max() - ys.min() > max_h:
            continue
        # 四边形近似：用四个极值点（左上下、右上下）
        y0, y1 = ys.min(), ys.max()
        top = ys <= y0 + 2
        bot = ys >= y1 - 2
        if top.sum() < 3 or bot.sum() < 3:
            continue
        ox, oy = sl[1].start, sl[0].start
        tl = (ox + int(xs[top].min()), oy + int(y0))
        tr = (ox + int(xs[top].max()), oy + int(y0))
        bl = (ox + int(xs[bot].min()), oy + int(y1))
        br = (ox + int(xs[bot].max()), oy + int(y1))
        out.append({"area": area, "tl": tl, "tr": tr, "bl": bl, "br": br})
    out.sort(key=lambda q: (q["tl"][1] // 60, q["tl"][0]))
    return out


def main():
    path = sys.argv[1]
    im = np.asarray(Image.open(path).convert("RGB")).astype(int)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]

    black = (r < 34) & (g < 36) & (b < 44)
    black = ndimage.binary_closing(black, np.ones((5, 5)))

    cells = quads(black, 6000, 26000, 200, 200)
    print(f"黑块 {len(cells)} 个:")
    for q in cells:
        w = q["tr"][0] - q["tl"][0]
        h = q["bl"][1] - q["tl"][1]
        skew = (q["bl"][0] - q["tl"][0]) / max(1, h)
        print(
            f"  {q['tl']}→{q['tr']} / {q['bl']}→{q['br']}  {w}×{h}  "
            f"斜切 {np.degrees(np.arctan(-skew)):+.2f}°"
        )

    out = {"size": [im.shape[1], im.shape[0]], "cells": cells}
    with open("traced.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print("saved traced.json")


if __name__ == "__main__":
    main()
