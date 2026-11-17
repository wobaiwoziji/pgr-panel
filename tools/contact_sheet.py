"""Build a labeled contact sheet of PNGs for quick visual inspection."""

import os
import sys
from PIL import Image, ImageDraw

src = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(src, "_sheet.png")
cell = 170
pad = 8
cols = 8

files = sorted(f for f in os.listdir(src) if f.lower().endswith(".png") and not f.startswith("_"))
rows = (len(files) + cols - 1) // cols
W = cols * (cell + pad) + pad
H = rows * (cell + pad + 16) + pad
sheet = Image.new("RGB", (W, H), (24, 24, 28))
d = ImageDraw.Draw(sheet)

for i, f in enumerate(files):
    im = Image.open(os.path.join(src, f)).convert("RGBA")
    im.thumbnail((cell - 16, cell - 16))
    x = pad + (i % cols) * (cell + pad)
    y = pad + (i // cols) * (cell + pad + 16)
    bg = Image.new("RGBA", (cell, cell), (60, 60, 68, 255))
    bg.alpha_composite(im, ((cell - im.width) // 2, (cell - im.height) // 2))
    sheet.paste(bg.convert("RGB"), (x, y))
    d.text((x + 2, y + cell + 2), f[:-4][:26], fill=(230, 230, 230))

sheet.save(out)
print(out, sheet.size, len(files))
