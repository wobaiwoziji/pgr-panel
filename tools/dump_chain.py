"""从某个 UI 节点往上打印父链，含完整四元数 / 缩放 / RectTransform 数据。"""

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
        tr[o.path_id] = (d, getattr(go, "m_Name", "?"), o.type.name)

    roots = [(pid, v) for pid, v in tr.items() if root.lower() in v[1].lower()]
    if not roots:
        print("not found")
        return

    pid, (d, name, typ) = roots[0]
    chain = []
    seen = set()
    while pid and pid not in seen:
        seen.add(pid)
        v = tr.get(pid)
        if not v:
            break
        dd, nm, tp = v
        chain.append((nm, tp, dd))
        f = getattr(dd, "m_Father", None)
        pid = f.path_id if f else 0

    for nm, tp, dd in reversed(chain):
        q = getattr(dd, "m_LocalRotation", None)
        p = getattr(dd, "m_LocalPosition", None) or getattr(dd, "m_AnchoredPosition", None)
        s = getattr(dd, "m_LocalScale", None)
        qs = f"q=({q.x:.4f},{q.y:.4f},{q.z:.4f},{q.w:.4f})" if q else ""
        ps = f"p=({p.x:.1f},{p.y:.1f},{p.z:.1f})" if p else ""
        ss = f"s=({s.x:.3f},{s.y:.3f},{s.z:.3f})" if s else ""
        print(f"{nm[:34]:34} {tp:14} {ps:26} {qs:44} {ss}")


if __name__ == "__main__":
    main()
