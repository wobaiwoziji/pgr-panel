"""Curated export of the assets needed by the PGR-style desktop panel.

    python tools/export_assets.py
Writes into assets/_game/{icons,fonts}/
"""

import json
import os
import struct

import UnityPy

HERE = os.path.dirname(os.path.abspath(__file__))
MATRIX = r"D:\Punishing Gray Raven\Punishing Gray Raven Game\PGR_Data\StreamingAssets\resource\matrix"
ROOT = os.path.abspath(os.path.join(HERE, "..", "public", "assets", "_game"))

# bundle, object name, output name, kind
ITEMS = [
    # 按钮底板 / 状态
    ("97b9621f5052bdfa.uab", "UiMainBtnShadow", "cell_shadow", "image"),
    ("97b9621f5052bdfa.uab", "MainBtn01", "cell_black", "image"),
    ("97b9621f5052bdfa.uab", "MainBtn03A", "cell_white", "image"),
    ("97b9621f5052bdfa.uab", "MainBtn04A", "cell_gray", "image"),
    ("97b9621f5052bdfa.uab", "UiMainBtnActiveKuang", "cell_hover_frame", "image"),
    # 六个主按钮
    ("97b9621f5052bdfa.uab", "UiMainIconDownLoad", "icon_download", "image"),
    ("97b9621f5052bdfa.uab", "UiMainIconLogo", "icon_website", "image"),
    ("97b9621f5052bdfa.uab", "UiMainIconFriend", "icon_team_recommend", "image"),
    ("97b9621f5052bdfa.uab", "UiMainIconCK", "icon_team_edit", "image"),
    ("97b9621f5052bdfa.uab", "UiMainIconCloudGaming", "icon_cloud_gaming", "image"),
    ("97b9621f5052bdfa.uab", "UiMainIconLogo2", "icon_wallpaper", "image"),
    ("97b9621f5052bdfa.uab", "UiMainIconLogoCartoon", "icon_comic", "image"),
    ("97b9621f5052bdfa.uab", "MainUpload", "icon_export", "image"),
    ("97b9621f5052bdfa.uab", "UiMainIconLogoStrategy", "icon_strategy", "image"),
    # 投影镜头 / 容器装饰
    ("97b9621f5052bdfa.uab", "UMainBtnChangeIcon04", "lens", "image"),
    ("97b9621f5052bdfa.uab", "UiMainSecondBtn02", "bar_slant", "image"),
    # 底部四个
    ("97b9621f5052bdfa.uab", "UiMainIconScene01", "icon_friend", "image"),
    ("97b9621f5052bdfa.uab", "MainBtnCam01", "icon_camera", "image"),
    ("97b9621f5052bdfa.uab", "UiMainIconCY", "icon_group", "image"),
    ("97b9621f5052bdfa.uab", "MainSD01", "icon_setting", "image"),
    # 状态条 / 箭头
    ("97b9621f5052bdfa.uab", "MainBtnXz01", "arrow_xz01", "image"),
    ("97b9621f5052bdfa.uab", "MainBtnXz02", "arrow_xz02", "image"),
    ("97b9621f5052bdfa.uab", "UiMainSecondBtn01", "panel_tab_01", "image"),
    ("97b9621f5052bdfa.uab", "UiMainSecondBtn02", "panel_tab_02", "image"),
    # 面板底
    ("2d96ab29bd134fb8.uab", "UiMainRightMidSecondBg02", "panel_bg_02", "image"),
    ("2d96ab29bd134fb8.uab", "UiMainRightMidSecondBg07", "panel_bg_07", "image"),
    # 字体
    ("354b7b331837dc57.uab", "FontZh", "font_zh", "font"),
    ("e2f5ad57207dfc09.uab", "TitleSys", "font_title", "font"),
]

HEADER_TAIL = 256


def load(name):
    with open(os.path.join(MATRIX, name), "rb") as f:
        raw = f.read()
    off = raw.find(b"UnityFS", 0, HEADER_TAIL)
    if off < 0:
        return None
    return UnityPy.load(raw[off:])


def main():
    cache = {}
    ok = 0
    for bundle, obj_name, out_name, kind in ITEMS:
        env = cache.get(bundle)
        if env is None:
            env = load(bundle)
            if env is None:
                print(f"MISS bundle {bundle}")
                continue
            cache[bundle] = env

        done = False
        for o in env.objects:
            try:
                d = o.read()
            except Exception:
                continue
            if getattr(d, "m_Name", None) != obj_name:
                continue
            sub = "fonts" if kind == "font" else "icons"
            os.makedirs(os.path.join(ROOT, sub), exist_ok=True)
            if kind == "font":
                data = getattr(d, "m_FontData", None)
                if not data:
                    continue
                target = os.path.join(ROOT, sub, out_name + ".ttf")
                with open(target, "wb") as f:
                    f.write(bytes(data))
            else:
                img = getattr(d, "image", None)
                if img is None:
                    continue
                target = os.path.join(ROOT, sub, out_name + ".png")
                img.save(target)
            print(f"  {kind:5} {obj_name:28} -> {os.path.relpath(target, ROOT)}")
            ok += 1
            done = True
            break
        if not done:
            print(f"MISS {bundle} {obj_name}")

    print(f"exported {ok}/{len(ITEMS)}")


if __name__ == "__main__":
    main()
