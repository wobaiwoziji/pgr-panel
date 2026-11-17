"""逐格测量参考帧里黑色方块的四角，判断真实的倾斜方向。"""

import sys

import numpy as np
from PIL import Image
from scipy import ndimage

im = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(np.int16)
H, W, _ = im.shape
r, g, b = im[..., 0], im[..., 1], im[..., 2]

# 黑格子：三通道都很暗
mask = (r < 30) & (g < 32) & (b < 40)
mask = ndimage.binary_closing(mask, np.ones((5, 5)))
lab, n = ndimage.label(mask)
sizes = ndimage.sum(mask, lab, range(1, n + 1))

cands = []
for i, sl in enumerate(ndimage.find_objects(lab), 1):
    if sl is None or sizes[i - 1] < 5000:
        continue
    y0, y1 = sl[0].start, sl[0].stop
    x0, x1 = sl[1].start, sl[1].stop
    # 排除横跨整个画面的背景暗区
    if x1 - x0 > 220 or y1 - y0 > 200:
        continue
    cands.append((i, x0, y0, x1, y1))

cands.sort(key=lambda c: (c[2] // 100, c[1]))

for i, x0, y0, x1, y1 in cands:
    reg = lab[y0:y1, x0:x1] == i
    ys, xs = np.where(reg)
    yy0, yy1 = ys.min(), ys.max()
    # 顶边/底边的 x 范围（取最上面/最下面 4 行）
    top = xs[ys <= yy0 + 3]
    bot = xs[ys >= yy1 - 3]
    ltop, rtop = int(top.min()), int(top.max())
    lbot, rbot = int(bot.min()), int(bot.max())
    h = yy1 - yy0
    w = max(rtop - ltop, rbot - lbot)
    skew = (lbot - ltop) / max(1, h)
    print(f"cell x{x0:4d} y{y0:4d} {x1-x0:3d}x{h:3d}  top[{ltop:3d},{rtop:3d}] bot[{lbot:3d},{rbot:3d}]  skewX={skew:+.3f} ({np.degrees(np.arctan(skew)):+.1f}deg)")
