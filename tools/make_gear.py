"""Draw the gear glyph that the uimain atlas doesn't ship as a clean sprite."""

import math
import os

from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "assets", "_game", "icons", "icon_settings.png")
S = 512
TEETH = 8
R_OUT = 236
R_BODY = 186
R_HOLE = 62


def main():
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = S / 2
    pts = []
    for i in range(TEETH * 2):
        a0 = (i / (TEETH * 2)) * math.tau - math.pi / 2
        r = R_OUT if i % 2 == 0 else R_BODY
        pts.append((c + r * math.cos(a0), c + r * math.sin(a0)))
    # 齿形用梯形：每个齿给一点宽度
    poly = []
    for i in range(TEETH):
        a = (i / TEETH) * math.tau - math.pi / 2
        half = math.tau / TEETH / 2
        w = half * 0.52
        poly.append((c + R_BODY * math.cos(a - half), c + R_BODY * math.sin(a - half)))
        poly.append((c + R_OUT * math.cos(a - w), c + R_OUT * math.sin(a - w)))
        poly.append((c + R_OUT * math.cos(a + w), c + R_OUT * math.sin(a + w)))
        poly.append((c + R_BODY * math.cos(a + half), c + R_BODY * math.sin(a + half)))
    d.polygon(poly, fill=(255, 255, 255, 255))
    d.ellipse((c - R_HOLE, c - R_HOLE, c + R_HOLE, c + R_HOLE), fill=(0, 0, 0, 0))
    out = os.path.abspath(OUT)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    img.resize((128, 128), Image.LANCZOS).save(out)
    print(out)


if __name__ == "__main__":
    main()
