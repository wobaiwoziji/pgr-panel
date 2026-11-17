from pathlib import Path
from PIL import Image

root = Path(__file__).parent
image = Image.open(root / "overlay.png").convert("RGB")
for name, box in {
    "overlay-grid.png": (45, 155, 455, 575),
    "overlay-quick.png": (20, 530, 425, 677),
    "overlay-top.png": (55, 0, 485, 180),
}.items():
    crop = image.crop(box)
    crop = crop.resize((crop.width * 2, crop.height * 2), Image.Resampling.LANCZOS)
    crop.save(root / name)
    print(name, (root / name).stat().st_size, crop.size)
