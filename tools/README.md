# 解包工具

从 `D:\Punishing Gray Raven` 提取战双 UI 素材（仅供个人学习/临摹，勿分发）。

## 环境

```
pip install unitypy pillow --index-url https://pypi.org/simple
```

## 资源位置

```
PGR_Data\StreamingAssets\resource\matrix\*.uab   79824 个, 64GB, 文件名为哈希
```

每个 `.uab` 前 32 字节是私有的 `HARUINKUROGAME` 头，去掉后就是标准 UnityFS（Unity 2022.3.5f1c1），
UnityPy 可直接解析。少量 bundle 走 UnityCN 加密，会被跳过。

## 流程

```powershell
# 1. 建路径索引（哪些 bundle 装了 /ui/ 资源）       ~7 分钟
python tools/index_bundles.py

# 2. 建对象名索引（Sprite / Texture2D / Font）      ~7 分钟
python tools/index_sprites.py

# 3. 找东西
python tools/find_sprite.py download 下载 icon
python tools/search_index.py ui/font

# 4. 按名字批量导出
python tools/export_sprites.py --match "UiMain" --out out\mainui
python tools/export_sprites.py --match "." --bundle "^97b9621f" --out out\mainui

# 5. 精选导出（面板实际要用的一套）
python tools/export_assets.py
```

## 关键 bundle

| bundle | 内容 |
|---|---|
| `97b9621f5052bdfa.uab` | `atlas/uimain.ab`：主界面 145 张 Sprite（图标、按钮底、hover 框） |
| `2d96ab29bd134fb8.uab` | 右侧二级面板的渐变底 / 变化背景 |
| `354b7b331837dc57.uab` | `FontZh` 中文字体（TTF） |
| `e2f5ad57207dfc09.uab` | `TitleSys` 标题字体（TTF） |

## 辅助

```powershell
python tools/dump_bundle.py <bundle.uab>        # 看单个 bundle 里有啥
python tools/contact_sheet.py <dir> <out.png>   # 生成带文件名的预览拼图
```
