"""生成应用图标 build/icon.ico（256 多尺寸）：深蓝底 + 投影球。"""

import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ICONS = os.path.join(HERE, "..", "public", "assets", "_game", "icons")
OUT = os.path.join(HERE, "..", "build", "icon.ico")

S = 512


def main():
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # 圆角深蓝底
    d.rounded_rectangle((0, 0, S, S), radius=96, fill=(14, 34, 62, 255))
    d.rounded_rectangle((18, 18, S - 18, S - 18), radius=82, outline=(90, 150, 215, 90), width=3)

    def layer(name, size, color=None):
        p = os.path.join(ICONS, name)
        if not os.path.exists(p):
            return None
        im = Image.open(p).convert("RGBA")
        im = im.resize((size, size), Image.LANCZOS)
        if color:
            # 用 alpha 当遮罩上色
            solid = Image.new("RGBA", im.size, color)
            solid.putalpha(im.getchannel("A"))
            im = solid
        return im

    ring = layer("lens_ring.png", int(S * 0.8))
    petals = layer("lens_petals.png", int(S * 0.8 * 0.7), (107, 178, 245, 235))
    core = layer("lens_core.png", int(S * 0.8 * 0.3), (255, 255, 255, 255))

    for l in (petals, ring, core):
        if l:
            img.alpha_composite(l, ((S - l.width) // 2, (S - l.height) // 2))

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    img.save(OUT, sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print(OUT)


if __name__ == "__main__":
    main()
