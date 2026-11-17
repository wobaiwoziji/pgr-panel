from pathlib import Path
from PIL import Image
import numpy as np

root = Path(__file__).parent
workspace = root.parents[2]
reference = np.array(Image.open(workspace / "reference" / "open_ref.png").convert("RGB"))
regions = {
    "friend": (55, 690, 155, 785),
    "camera": (155, 700, 275, 815),
    "group": (275, 710, 400, 840),
    "settings": (395, 720, 535, 855),
}
angle = 10

for name, (x0, y0, x1, y1) in regions.items():
    crop = reference[y0:y1, x0:x1]
    mask = crop.min(axis=2) > 175
    ys, xs = np.where(mask)
    ref_box = (x0 + xs.min(), y0 + ys.min())

    asset = Image.open(workspace / "public" / "assets" / "_game" / "icons" / f"icon_{name}.png").convert("RGBA")
    scale = min(54 / asset.width, 54 / asset.height)
    resized = asset.resize((round(asset.width * scale), round(asset.height * scale)), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (54, 54))
    canvas.paste(resized, ((54 - resized.width) // 2, (54 - resized.height) // 2), resized)
    rotated = canvas.rotate(-angle, expand=True, resample=Image.Resampling.BICUBIC)
    alpha = np.array(rotated.getchannel("A"))
    ays, axs = np.where(alpha > 20)
    visible_x = 27 + axs.min() - rotated.width / 2
    visible_y = 27 + ays.min() - rotated.height / 2
    button = (ref_box[0] - 4 - visible_x, ref_box[1] - 4 - visible_y)
    print(name, f"left: {button[0]:.3f}px; top: {button[1]:.3f}px;")
