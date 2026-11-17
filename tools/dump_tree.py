"""打印某个 UI 节点的完整子树（名字 / 锚点位置 / 尺寸 / 旋转）。"""

import os
import sys

import UnityPy

MATRIX = r"D:\Punishing Gray Raven\Punishing Gray Raven Game\PGR_Data\StreamingAssets\resource\matrix"


def main():
    bundle, root = sys.argv[1], sys.argv[2]
    raw = open(os.path.join(MATRIX, bundle), "rb").read()
    env = UnityPy.load(raw[raw.find(b"UnityFS", 0, 256):])

    tr = {}
    for o in env.objects:
        if o.type.name not in ("RectTransform", "Transform"):
            continue
        try:
            d = o.read()
            go = d.m_GameObject.read()
        except Exception:
            continue
        tr[o.path_id] = {
            "name": getattr(go, "m_Name", "?"),
            "active": bool(getattr(go, "m_IsActive", True)),
            "parent": d.m_Father.path_id if getattr(d, "m_Father", None) else 0,
            "children": [c.path_id for c in getattr(d, "m_Children", [])],
            "pos": getattr(d, "m_AnchoredPosition", None),
            "size": getattr(d, "m_SizeDelta", None),
            "rot": getattr(d, "m_LocalRotation", None),
            "scale": getattr(d, "m_LocalScale", None),
            "pivot": getattr(d, "m_Pivot", None),
            "anchor": (getattr(d, "m_AnchorMin", None), getattr(d, "m_AnchorMax", None)),
            "is_rect": o.type.name == "RectTransform",
        }

    roots = [k for k, v in tr.items() if root.lower() in v["name"].lower()]
    if not roots:
        print("not found:", root)
        return
    print(f"found {len(roots)} node(s) matching '{root}'")

    def fmt(v):
        p = v["pos"]
        s = v["size"]
        r = v["rot"]
        pivot = v["pivot"]
        a = v["anchor"]
        return (
            f"pos=({p.x:.1f},{p.y:.1f}) " if p else "pos=- "
        ) + (f"size=({s.x:.1f},{s.y:.1f}) " if s else "size=- ") + (
            f"rotZ={r.z:.3f} " if r else ""
        ) + (f"pivot=({pivot.x:.2f},{pivot.y:.2f}) " if pivot else "") + (
            f"anchor=({a[0].x:.2f},{a[0].y:.2f})-({a[1].x:.2f},{a[1].y:.2f})" if a[0] and a[1] else ""
        )

    def walk(pid, depth=0):
        v = tr.get(pid)
        if not v:
            return
        mark = "" if v["active"] else "  [off]"
        print("  " * depth + f"{v['name']}{mark}  {fmt(v)}")
        if depth >= 6:
            return
        for c in v["children"]:
            walk(c, depth + 1)

    for r in roots[:3]:
        walk(r)


if __name__ == "__main__":
    main()
