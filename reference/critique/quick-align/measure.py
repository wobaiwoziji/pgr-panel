from pathlib import Path
from PIL import Image
import numpy as np

root = Path(__file__).parent
current = np.array(Image.open(root / "current.png").convert("RGB"))
reference = np.array(Image.open(root.parent.parent / "open_ref.png").convert("RGB"))
scale = 458.8799743652344 / 760 * 1.25
regions = {
    "friend": (55, 690, 155, 790),
    "camera": (155, 700, 275, 815),
    "group": (275, 710, 400, 840),
    "settings": (395, 720, 535, 855),
}
positions = {
    "friend": (77, 703),
    "camera": (180, 717),
    "group": (293, 730),
    "settings": (416, 748),
}

for name, (x0, y0, x1, y1) in regions.items():
    ref_crop = reference[y0:y1, x0:x1]
    ref_mask = ref_crop.min(axis=2) > 175
    rys, rxs = np.where(ref_mask)
    ref_box = np.array([x0 + rxs.min(), y0 + rys.min(), x0 + rxs.max(), y0 + rys.max()], dtype=float)

    sx0, sy0, sx1, sy1 = [round(v * scale) for v in (x0, y0, x1, y1)]
    cur_crop = current[sy0:sy1, sx0:sx1]
    cur_mask = cur_crop.min(axis=2) > 200
    cys, cxs = np.where(cur_mask)
    cur_box = np.array([(sx0 + cxs.min()) / scale, (sy0 + cys.min()) / scale, (sx0 + cxs.max()) / scale, (sy0 + cys.max()) / scale])
    delta = ref_box - cur_box
    old = positions[name]
    print(name)
    print("  reference", [round(v, 3) for v in ref_box])
    print("  current   ", [round(v, 3) for v in cur_box])
    print("  delta     ", [round(v, 3) for v in delta])
    print("  next      ", [round(old[0] + delta[0], 3), round(old[1] + delta[1], 3)])
