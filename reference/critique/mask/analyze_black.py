from pathlib import Path
from PIL import Image
import numpy as np

root = Path(__file__).parent


def components(path, crop, threshold=24):
    image = np.array(Image.open(path).convert("RGB").crop(crop))
    mask = image.max(axis=2) < threshold
    parent = []
    areas = []
    boxes = []
    previous = []

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    def union(a, b):
        a, b = find(a), find(b)
        if a != b:
            parent[b] = a

    for y, row in enumerate(mask):
        padded = np.pad(row.astype(np.int8), (1, 1))
        changes = np.diff(padded)
        starts = np.flatnonzero(changes == 1)
        ends = np.flatnonzero(changes == -1) - 1
        current = []
        for x0, x1 in zip(starts, ends):
            if x1 - x0 + 1 < 3:
                continue
            idx = len(parent)
            parent.append(idx)
            areas.append(int(x1 - x0 + 1))
            boxes.append([int(x0), y, int(x1), y])
            for px0, px1, pidx in previous:
                if x0 <= px1 and px0 <= x1:
                    union(idx, pidx)
            current.append((x0, x1, idx))
        previous = current

    grouped = {}
    for idx in range(len(parent)):
        root_id = find(idx)
        if root_id not in grouped:
            grouped[root_id] = [0, [10**9, 10**9, -1, -1]]
        grouped[root_id][0] += areas[idx]
        box = grouped[root_id][1]
        own = boxes[idx]
        box[0] = min(box[0], own[0])
        box[1] = min(box[1], own[1])
        box[2] = max(box[2], own[2])
        box[3] = max(box[3], own[3])

    result = []
    for area, box in grouped.values():
        if area >= 2500:
            x0, y0, x1, y1 = box
            result.append({"area": area, "box": [x0 + crop[0], y0 + crop[1], x1 + crop[0], y1 + crop[1]]})
    return sorted(result, key=lambda item: (item["box"][1], item["box"][0]))


for path in [root / "reference.png", root / "overlay.png", root.parent.parent / "open_ref.png"]:
    image = Image.open(path)
    crop = (0, int(image.height * 0.22), image.width, int(image.height * 0.9))
    print(path.name, image.size)
    for item in components(path, crop):
        print(item)
