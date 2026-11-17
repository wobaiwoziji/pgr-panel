"""Measure the hologram panel geometry from a reference frame."""

import sys

import numpy as np
from PIL import Image
from scipy import ndimage

path = sys.argv[1]
im = np.asarray(Image.open(path).convert("RGB")).astype(np.int16)
H, W, _ = im.shape
print("size", W, H)

r, g, b = im[..., 0], im[..., 1], im[..., 2]


def boxes(mask, min_area, label=""):
    lab, n = ndimage.label(mask)
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        if sl is None:
            continue
        area = (lab[sl] == i).sum()
        if area < min_area:
            continue
        y0, y1 = sl[0].start, sl[0].stop
        x0, x1 = sl[1].start, sl[1].stop
        out.append((area, x0, y0, x1 - x0, y1 - y0))
    out.sort(reverse=True)
    if label:
        print(f"-- {label}: {len(out)}")
    for a, x, y, w, h in out[:24]:
        print(f"   x={x:4d} y={y:4d} w={w:4d} h={h:4d} area={a}")
    return out


# 白色块（标题条、标签条）
white = (r > 205) & (g > 205) & (b > 205)
boxes(white, 900, "white")

# 近黑块（格子底板）
dark = (r < 28) & (g < 28) & (b < 34)
boxes(dark, 2500, "dark")

# 蓝色板
blue = (b > r + 12) & (b > 55) & (b < 210)
lab, n = ndimage.label(blue)
sizes = ndimage.sum(blue, lab, range(1, n + 1))
if len(sizes):
    k = int(np.argmax(sizes)) + 1
    ys, xs = np.where(lab == k)
    print(f"-- blue plane: x {xs.min()}..{xs.max()}  y {ys.min()}..{ys.max()}  px={len(xs)}")
