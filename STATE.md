# 当前状态（2026-11-18）

## 是什么

战双帕弥什风格的桌面全息面板：Electron + Vite + React，素材从本机游戏解包。
收起态是底部时间条 + 投影镜头，点一下从镜头投出全息菜单。

## 跑起来

```powershell
cd D:\ui
npm run dev        # 网页预览 http://localhost:5173
npm run start      # 桌面悬浮窗（构建 dist 后启动）
```

## 目录

```
electron/main.cjs     窗口、点击穿透、IPC、F12 开 DevTools、PGR_CAPTURE 截图
electron/preload.cjs  contextBridge → window.pgr
src/main.jsx          面板结构
src/panel.css         全部样式 + 调参变量
src/Tuner.jsx         按 T 的滑杆面板
src/Editor.jsx        按 E 的拖拽/属性编辑器
src/editor.css        编辑器样式
config.json           18 个按钮、图标、点击行为
public/assets/_game/  解包出的图标与字体（勿分发）
tools/                解包 / 测量 / 下载相关脚本
ui_params.txt         从 prefab 抓到的原始 UI 数值
```

## 已确认的关键数值

面板 prefab：`assets/product/ui/prefab/uimain.prefab`（bundle `825ed38c271a1c9d.uab`），
游戏画布 900×1080，轴心在面板右边中点：

| 节点 | 位置 | 尺寸 |
|---|---|---|
| RImgBg 背景板 | (0,0) | 610×980 |
| PanelTitle 标题条 | (-33,428) | 594×42 |
| BtnMusicPlayer 播放卡 | (-10,300) | 548×158 |
| PanelBottom 底部栏 | (-33,-380) | 594×122 |
| Triangle1 上三角 | (144.8,0) | 600×848 |
| Triangle2 下三角 | (0,-450) | 578.9×297.1 |
| GridIcon 镜头 | (-121.9,-417) | 210×210（三层 210/148/64）|

九宫格按钮是运行时动态生成的，prefab 里没有；格子尺寸只能从录屏量（114/123/132 宽）。

当前 CSS 用 760×892 画布，所有角度走 CSS 变量（见 panel.css `:root` 的 `--v-*`）。

## 已完成

- 解包链路：index_bundles → index_sprites → export_assets
- 18 个按钮 + 滚轮滚动 + 白滑块灰沟槽滚动条
- 收起/展开动画、时钟、点击穿透、桌面挂件模式（不置顶）
- 按 T 调参面板；按 E 拖拽编辑器（拖动/缩放/旋转/倾斜）
- 点击穿透 bug 已修（`.quick` 曾铺满全屏吞掉所有点击）

## 待办 / 已知偏差

- 面板几何尚未按上面的 prefab 数值重排（当前仍是按截图量的）
- 播放卡比例偏方（422×141 vs 应为 453×130 @0.826）
- 镜头偏小（68 vs 应为 173 @0.826）
- 「正在播放」是静态文案，未接 SMTC
- 没有托盘图标 / 开机自启

## 复现截图

```powershell
$env:PGR_SIZE="684x803"; $env:PGR_SCALE="0.9"; $env:PGR_OPEN="1"
$env:PGR_CAPTURE="D:\ui\out\shot.png"
node node_modules/electron/cli.js .
```
