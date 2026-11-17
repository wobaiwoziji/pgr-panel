"""量参考图/渲染图里白色条带的上边斜率，用来对齐倾斜角。"""

import sys

import numpy as np
from PIL import Image
from scipy import ndimage


def slope_of(img, box, label):
    x0, y0, x1, y1 = box
    sub = img[y0:y1, x0:x1]
    r, g, b = sub[..., 0], sub[..., 1], sub[..., 2]
    white = (r > 200) & (g > 200) & (b > 200)
    ys, xs = np.where(white)
    if len(xs) < 200:
        print(f"{label}: 没有白色区域")
        return
    # 每一列取最上面的白像素，拟合直线
    cols = {}
    for x, y in zip(xs, ys):
        if x not in cols or y < cols[x]:
            cols[x] = y
    xs_sorted = np.array(sorted(cols))
    ys_sorted = np.array([cols[x] for x in xs_sorted])
    k = np.polyfit(xs_sorted, ys_sorted, 1)[0]
    print(f"{label}: 上边 y = {k:+.4f}x + c  → {np.degrees(np.arctan(k)):+.2f}°  (n={len(xs_sorted)})")


for path in sys.argv[1:]:
    img = np.asarray(Image.open(path).convert("RGB")).astype(int)
    print(f"== {path}")
    slope_of(img, (120, 40, 620, 150), "  标题条")
    slope_of(img, (120, 360, 560, 430), "  第一行标签")
    slope_of(img, (120, 510, 560, 590), "  第二行标签")
