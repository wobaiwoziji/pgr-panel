"""用面板上的细密网格纹理定位全息板的轮廓。"""

import sys

import numpy as np
from PIL import Image
from scipy import ndimage

path = sys.argv[1]
im = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
H, W, _ = im.shape

gray = im.mean(axis=2)
med = ndimage.median_filter(gray, size=7)
hf = np.abs(gray - med)
energy = ndimage.uniform_filter(hf, size=9)

mask = energy > max(2.5, np.percentile(energy, 88))
mask = ndimage.binary_closing(mask, np.ones((15, 15)))
mask = ndimage.binary_opening(mask, np.ones((9, 9)))
mask = ndimage.binary_fill_holes(mask)

lab, n = ndimage.label(mask)
if n == 0:
    print("no region")
    raise SystemExit
sizes = ndimage.sum(mask, lab, range(1, n + 1))
k = int(np.argmax(sizes)) + 1
reg = lab == k
ys, xs = np.where(reg)
print(f"bbox x {xs.min()}..{xs.max()} y {ys.min()}..{ys.max()} area {int(reg.sum())}")

vis = np.asarray(Image.open(path).convert("RGB")).copy()
edge = reg ^ ndimage.binary_erosion(reg, np.ones((3, 3)))
vis[edge] = [255, 40, 40]
Image.fromarray(vis).save(path.replace(".png", "_trace.png"))
print("saved", path.replace(".png", "_trace.png"))

# 逐行左右边界（每 4% 高度取一点）
rows = np.arange(ys.min(), ys.max(), max(1, (ys.max() - ys.min()) // 24))
left, right = [], []
for y in rows:
    xr = xs[ys == y]
    if len(xr) == 0:
        continue
    left.append((xr.min(), y))
    right.append((xr.max(), y))
print("LEFT:")
for x, y in left:
    print(f"  {x / W * 100:.1f}% {y / H * 100:.1f}%")
print("RIGHT:")
for x, y in right[::-1]:
    print(f"  {x / W * 100:.1f}% {y / H * 100:.1f}%")
