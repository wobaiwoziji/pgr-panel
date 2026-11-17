# 交接说明：战双帕弥什风格 · 桌面全息面板（交给 Kimi）

一个 Electron + Vite + React 的桌面悬浮小工具：仿《战双帕弥什》主界面右侧的**全息投影菜单**。
收起时是底部一条蓝色时间条 + 投影镜头；点一下，菜单从镜头位置"投"出来。

当前进度约 **75%**：结构、交互、素材、可调工具都通了，**卡在最后的视觉贴合**上。

---

## 1. 先跑起来

```powershell
cd D:\ui
npm install
npm run dev      # 网页预览 → http://localhost:5173
npm run start    # 桌面悬浮窗（先 vite build）
```

预览页会按窗口大小自动缩放，默认收起；**点底部蓝色时间条**展开菜单。

---

## 2. 三个内置调试工具（重要，交付物的一部分）

| 键 | 工具 | 用途 |
|---|---|---|
| `T` | 调参面板 | 10 个滑杆：格子斜率 / 标题斜率 / 各行横向 / 块高 / 标签高 / 滚动条位置。改的是 CSS 变量 |
| `E` | 拖拽编辑器 | 点选任意元素 → 拖动移动、四角缩放、顶部圆点旋转；右侧属性面板可拖「倾斜 X/Y / 旋转 / 缩放 / 位移」 |
| `I` | 点选报名字 | 点任意区块，顶部弹出它的编号（如 `第2行 第2列 · 官方壁纸 · 黑块【box-wallpaper】`）并自动复制 |

这三个只在**网页预览**里出现，桌面窗口不显示，避免误触。
`E` 和 `I` 的改动存在 localStorage，点「复制 JSON」可以把结果带出来。

---

## 3. 目录

```
electron/main.cjs      透明无边框窗、点击穿透、IPC 开程序、F12 DevTools、PGR_CAPTURE 截图
electron/preload.cjs   contextBridge → window.pgr
src/main.jsx           面板结构（底板/标题条/播放卡/九宫格/滚动条/底部图标/镜头）
src/panel.css          全部样式；:root 里是调参变量
src/Tuner.jsx          T 面板
src/Editor.jsx         E 编辑器
src/Picker.jsx         I 点选
config.json            18 个按钮、图标名、点击后打开什么
public/assets/_game/   从游戏解包出来的白色图标 + 中文字体（勿分发）
tools/                 解包 / 测量脚本
ui_params.txt          从游戏 prefab 抓到的原始 UI 数值
reference/             录屏、截帧、当前渲染图
```

---

## 4. 素材来源（已解包好，不用再做）

游戏装在 `D:\Punishing Gray Raven`。bundle 里有 32 字节私有头 `HARUINKUROGAME`，去掉后是标准 UnityFS（Unity 2022.3.5f1c1），UnityPy 可直接读。

- 图标全部来自 `atlas/uimain.ab`（bundle `97b9621f5052bdfa.uab`）的 145 张 Sprite
- 字体 `FontZh`（bundle `354b7b331837dc57.uab`）
- 镜头是 `UMainBtnChangeIcon01/02/03` 三层叠出来的，比例 100% / 70% / 30%

脚本：`tools/index_bundles.py` → `index_sprites.py` → `export_assets.py`。

---

## 5. 已经确定的数值

**画布 760×892**，蓝色底板是 `clip-path` 多边形：
`polygon(24.5% 10.8%, 84% 10.5%, 69.8% 97%, 11.3% 91.5%)`
→ 左边 7.93°，右边 7.96°，取 **7.95°** 作为全局倾斜角。

从录屏逐帧量出来的（`tools/slope.py` 可复现）：

| 元素 | 参考帧实测 |
|---|---|
| 白色标题条上边斜率 | −4.48° |
| 第一行标签上边 | +0.94° |
| 第二行标签上边 | +1.54° |

游戏 prefab（`uimain.prefab`）里的相对尺寸：

| 节点 | 尺寸 |
|---|---|
| RImgBg 背景板 | 610 × 980 |
| PanelTitle 标题条 | 594 × 42 |
| BtnMusicPlayer 播放卡 | 548 × 158 |
| PanelBottom 底部栏 | 594 × 122 |
| Triangle1 / Triangle2 | 600×848 / 578.9×297.1 |
| GridIcon 镜头 | 210（三层 210/148/64）|

注意：**九宫格按钮不在 prefab 里**（运行时动态生成），只能按截帧量。

---

## 6. 当前状态

已经做完：

- 18 个按钮 + 滚轮滚动 + 自绘滚动条（白滑块 / 灰沟槽，倾斜与面板一致）
- 收起/展开动画、实时时钟、点击穿透、桌面挂件模式（不置顶）
- 所有元素已统一到 `skewX(−7.95°)`，和底板左右边严格平行（变换矩阵一致）
- 点击行为走 `config.json`，能开网址/文件夹/程序

**主要待办（按优先级）**

1. **视觉贴合**：现在偏"平"，参考图里整块板是**透视投影**——上边略抬、右边宽左边窄、越往下越大。纯 2D skew 做不出这个效果，可能需要 `perspective + rotateY/rotateX`，或者用 SVG/matrix3d 精确映射四角。
2. **两片投影三角**：参考图上方一片、下方一片，尖角指向右下镜头。prefab 里叫 `Triangle1 / Triangle2`，目前实现得很淡。
3. **颜色**：底板应该更透更深，现在是偏灰的蓝。
4. **镜头**：偏小偏淡，游戏里是 210px 的粗环 + 亮芯。
5. 「正在播放」还是静态文案，可以接 Windows SMTC 读真实播放。
6. 没有托盘图标 / 开机自启。

---

## 7. 校对方法

```powershell
# 固定尺寸截图（窗口别超过屏幕高度，否则会被压扁）
$env:PGR_SIZE="684x803"; $env:PGR_SCALE="0.9"; $env:PGR_OPEN="1"
$env:PGR_CAPTURE="D:\ui\out\shot.png"
node node_modules/electron/cli.js .
```

测量工具：

```powershell
python tools\slope.py out\frames\f_004.png out\shot.png   # 白条/标签行的斜率
python tools\cell_geom.py out\frames\f_004.png            # 黑格子四角与斜切角
python tools\dump_tree.py 825ed38c271a1c9d.uab PanelRightMidSecond   # prefab 子树与精确尺寸
```

`reference/open_ref.png`（展开态）和 `reference/closed_ref.png`（收起态）是从录屏抽的帧，760×892，和画布同尺寸，可以直接叠着比。

---

## 8. 一句话任务

**把这块面板做成和 `reference/open_ref.png` 一样的透视投影质感，保持现有交互与素材，别再退化成平面 skew。**
