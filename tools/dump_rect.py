"""Dump a UI prefab's hierarchy with RectTransform numbers (exact layout)."""

import json
import os
import sys

import UnityPy

MATRIX = r"D:\Punishing Gray Raven\Punishing Gray Raven Game\PGR_Data\StreamingAssets\resource\matrix"


def load(bundle):
    raw = open(os.path.join(MATRIX, bundle), "rb").read()
    off = raw.find(b"UnityFS", 0, 256)
    return UnityPy.load(raw[off:])


def main():
    bundle = sys.argv[1]
    filt = sys.argv[2] if len(sys.argv) > 2 else ""
    env = load(bundle)

    objs = {}
    for o in env.objects:
        try:
            objs[o.path_id] = (o.type.name, o.read())
        except Exception:
            pass

    # GameObject -> 组件
    def go_info(go):
        name = getattr(go, "m_Name", "?")
        comps = []
        for c in getattr(go, "m_Component", []):
            pid = c.component.path_id if hasattr(c, "component") else getattr(c, "path_id", None)
            if pid in objs:
                comps.append(pid)
        return name, comps

    parents = {}
    for pid, (t, d) in objs.items():
        if t != "Transform":
            continue
        f = getattr(d, "m_Father", None)
        fp = f.path_id if f else 0
        go_pid = d.m_GameObject.path_id if getattr(d, "m_GameObject", None) else 0
        parents[pid] = (fp, go_pid)

    rows = []
    for pid, (t, d) in objs.items():
        if t not in ("RectTransform", "Transform"):
            continue
        go = d.m_GameObject.read() if getattr(d, "m_GameObject", None) else None
        if go is None:
            continue
        name = getattr(go, "m_Name", "?")
        fp, _ = parents.get(pid, (0, 0))
        fr = objs.get(fp, (None, None))[1]
        parent_name = getattr(fr.m_GameObject.read(), "m_Name", "") if fr else ""
        row = {
            "name": name,
            "parent": parent_name,
            "type": t,
            "active": bool(getattr(go, "m_IsActive", True)),
        }
        if t == "RectTransform":
            ap = getattr(d, "m_AnchoredPosition", None)
            sd = getattr(d, "m_SizeDelta", None)
            piv = getattr(d, "m_Pivot", None)
            anc = getattr(d, "m_AnchorMin", None), getattr(d, "m_AnchorMax", None)
            rot = getattr(d, "m_LocalRotation", None)
            row.update(
                {
                    "anchored": [round(ap.x, 2), round(ap.y, 2)] if ap else None,
                    "size": [round(sd.x, 2), round(sd.y, 2)] if sd else None,
                    "pivot": [round(piv.x, 3), round(piv.y, 3)] if piv else None,
                    "anchors": [[round(anc[0].x, 3), round(anc[0].y, 3)], [round(anc[1].x, 3), round(anc[1].y, 3)]]
                    if anc[0] and anc[1]
                    else None,
                    "rotZ": round(getattr(rot, "z", 0), 4) if rot else None,
                }
            )
        rows.append(row)

    hit = [r for r in rows if not filt or filt.lower() in r["name"].lower()]
    print(f"total transforms: {len(rows)}, matched '{filt}': {len(hit)}")
    out = os.path.join(os.path.dirname(__file__), "rect_dump.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=1)
    print("dumped ->", out)

    for r in hit[:60]:
        print(
            f"{r['name'][:34]:34} parent={r['parent'][:22]:22} "
            f"pos={r.get('anchored')} size={r.get('size')} rot={r.get('rotZ')} active={r['active']}"
        )


if __name__ == "__main__":
    main()
