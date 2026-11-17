"""根据参考帧里三个黑格子的四角，反解 CSS 透视参数（含整体缩放）。

输出：perspective(P) rotateY(a) rotateX(b) rotateZ(c) + transform-origin + 缩放。
"""

import numpy as np
from scipy.optimize import minimize

# ── 平面布局（和 panel.css 保持一致）──
PANEL = (140.0, 74.0)
GRID = (32.0, 202.0)
CELL_W, BOX_H = 128.0, 100.0
GAP_X, GAP_Y = 16.0, 12.0

REF = [
    [(155, 283), (256, 283), (244, 386), (145, 386)],
    [(280, 281), (391, 281), (380, 388), (269, 388)],
    [(417, 279), (538, 279), (528, 391), (407, 391)],
]


def flat_cells():
    out = []
    for c in range(3):
        x = PANEL[0] + GRID[0] + c * (CELL_W + GAP_X)
        y = PANEL[1] + GRID[1]
        out.append([(x, y), (x + CELL_W, y), (x + CELL_W, y + BOX_H), (x, y + BOX_H)])
    return out


FLAT = flat_cells()


def project(pts, params, origin):
    P, a, b, c, sc = params
    a, b, c = np.radians([a, b, c])
    ca, sa = np.cos(a), np.sin(a)
    cb, sb = np.cos(b), np.sin(b)
    cc, scc = np.cos(c), np.sin(c)
    Rz = np.array([[cc, -scc, 0], [scc, cc, 0], [0, 0, 1]])
    Rx = np.array([[1, 0, 0], [0, cb, -sb], [0, sb, cb]])
    Ry = np.array([[ca, 0, sa], [0, 1, 0], [-sa, 0, ca]])
    R = Ry @ Rx @ Rz

    ox, oy = origin
    out = []
    for (x, y) in pts:
        v = np.array([x - ox, y - oy, 0.0]) * sc
        v = R @ v
        w = 1.0 - v[2] / P
        out.append((ox + v[0] / w, oy + v[1] / w))
    return np.array(out)


def loss(params, origin):
    if params[0] < 200:
        return 1e9
    err = 0.0
    for flat, ref in zip(FLAT, REF):
        got = project(flat, params, origin)
        err += float(np.sum((got - np.array(ref, dtype=float)) ** 2))
    return err


def main():
    origin = (PANEL[0] + 480 * 0.6, PANEL[1] + 745 * 0.42)
    best = None
    for a0 in (-6, -12, -18, 6, 12):
        for b0 in (-6, 0, 6, 12):
            for P0 in (600, 1000, 1600):
                r = minimize(
                    loss,
                    x0=[P0, a0, b0, -1.0, 1.0],
                    args=(origin,),
                    method="Nelder-Mead",
                    options={"maxiter": 12000, "xatol": 1e-5, "fatol": 1e-5},
                )
                if best is None or r.fun < best.fun:
                    best = r
    P, a, b, c, sc = best.x
    print(f"perspective({P:.0f}px) rotateY({a:.2f}deg) rotateX({b:.2f}deg) rotateZ({c:.2f}deg)")
    print(f"scale {sc:.3f}   origin {origin[0] / 760 * 100:.1f}% {origin[1] / 892 * 100:.1f}%")
    print(f"RMS {np.sqrt(best.fun / 12):.2f} px")


if __name__ == "__main__":
    main()
