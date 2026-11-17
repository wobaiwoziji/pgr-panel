from pathlib import Path
from PIL import Image
import numpy as np

root = Path(__file__).parent
workspace = root.parents[2]
reference = np.array(Image.open(workspace / "reference" / "open_ref.png").convert("RGB"))
regions = {
    "friend": (55, 690, 155, 790),
    "camera": (155, 700, 275, 815),
    "group": (275, 710, 400, 840),
    "settings": (395, 720, 535, 855),
}


def render(asset, scale, angle):
    size = max(1, round(54 * scale))
    scale_asset = min(size / asset.width, size / asset.height)
    resized = asset.resize((round(asset.width * scale_asset), round(asset.height * scale_asset)), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size))
    canvas.paste(resized, ((size - resized.width) // 2, (size - resized.height) // 2), resized)
    rotated = canvas.rotate(-angle, expand=True, resample=Image.Resampling.BICUBIC)
    alpha = np.array(rotated.getchannel("A"))
    ys, xs = np.where(alpha > 180)
    box = (xs.min(), ys.min(), xs.max(), ys.max())
    return rotated, box


for name, (x0, y0, x1, y1) in regions.items():
    crop = reference[y0:y1, x0:x1]
    mask = crop.min(axis=2) > 175
    ys, xs = np.where(mask)
    ref = (x0 + xs.min(), y0 + ys.min(), x0 + xs.max(), y0 + ys.max())
    target_w, target_h = ref[2] - ref[0], ref[3] - ref[1]
    asset = Image.open(workspace / "public" / "assets" / "_game" / "icons" / f"icon_{name}.png").convert("RGBA")
    _, baseline = render(asset, 1, 10)
    best = None
    for scale in np.arange(0.85, 1.46, 0.025):
        for angle in np.arange(6, 20.1, 0.5):
            rotated, box = render(asset, float(scale), float(angle))
            w, h = box[2] - box[0], box[3] - box[1]
            score = (w - target_w) ** 2 + (h - target_h) ** 2
            if best is None or score < best[0]:
                best = (score, float(scale), float(angle), rotated, box)
    score, scale, angle, rotated, box = best
    visible_x = 27 + box[0] - rotated.width / 2
    visible_y = 27 + box[1] - rotated.height / 2
    button = (ref[0] - 4 - visible_x, ref[1] - 4 - visible_y)
    print(name)
    print("  target", (target_w, target_h), "baseline", (baseline[2] - baseline[0], baseline[3] - baseline[1]))
    print("  fit", f"scale={scale:.3f}", f"angle={angle:.1f}", "size", (box[2] - box[0], box[3] - box[1]), "score", score)
    print("  css", f"left: {button[0]:.3f}px; top: {button[1]:.3f}px;")
