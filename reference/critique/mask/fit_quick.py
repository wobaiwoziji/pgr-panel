from pathlib import Path
from PIL import Image
import numpy as np

root = Path(__file__).parent
workspace = root.parents[2]
reference = np.array(Image.open(root.parent.parent / "open_ref.png").convert("RGB"))
regions = {
    "friend": (55, 690, 155, 785),
    "camera": (155, 700, 275, 815),
    "group": (275, 710, 400, 840),
    "settings": (395, 720, 535, 855),
}

for name, (x0, y0, x1, y1) in regions.items():
    crop = reference[y0:y1, x0:x1]
    mask = crop.min(axis=2) > 175
    ys, xs = np.where(mask)
    ref_box = (x0 + xs.min(), y0 + ys.min(), x0 + xs.max(), y0 + ys.max())

    asset = Image.open(workspace / "public" / "assets" / "_game" / "icons" / f"icon_{name}.png").convert("RGBA")
    alpha = np.array(asset.getchannel("A"))
    ays, axs = np.where(alpha > 20)
    asset_box = (axs.min(), ays.min(), axs.max(), ays.max())
    scale = min(54 / asset.width, 54 / asset.height)
    drawn_w, drawn_h = asset.width * scale, asset.height * scale
    offset_x = 4 + (54 - drawn_w) / 2 + asset_box[0] * scale
    offset_y = 4 + (54 - drawn_h) / 2 + asset_box[1] * scale
    button = (round(ref_box[0] - offset_x, 3), round(ref_box[1] - offset_y, 3))
    print(name, "reference", ref_box, "asset", asset.size, asset_box, "button", button)
