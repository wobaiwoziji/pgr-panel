# PGR 悬浮面板

仿「战双帕弥什」主界面右侧二级菜单的桌面悬浮窗。Electron + Vite + React，素材来自游戏本体解包。

## 跑起来

```powershell
npm install
npm run dev        # 网页预览 http://localhost:5173（等比缩放到窗口大小）
npm run start      # 构建 + 启动桌面悬浮窗
```

设计画布固定 **760×892**（和游戏截帧 1:1），网页预览按窗口等比缩放；
桌面窗是 472×554，靠 `--scale` 整体缩放，所以两边是同一份布局。

## 窗口行为

- 无边框 / 透明 / **贴在桌面上**：不置顶，任何窗口一开就盖住它，桌面上才看得到
- 不占任务栏、不进 Alt+Tab
- **点击穿透**：鼠标不在面板上时，鼠标事件直接落到桌面；移进面板才接管
- 位置自动记住（`%APPDATA%\pgr-panel\window-state.json`）
- 右键面板 → 重新加载 / 打开配置 / 退出
- 拖动：面板空白处按住即可拖

想让它常驻最上层，把 `config.json` 里 `window.desktopOnly` 改成 `false`。

## 自己调样式

**方式一：调参面板（推荐）**

打开 http://localhost:5173 ，按 `T` 打开右下角的调参面板。10 个滑杆直接改倾角、块高、标签高、滚动条位置，实时生效，值存在 localStorage。调好后点「复制数值」，把结果发给我，我写回 CSS。

**方式二：开发者工具**

桌面窗口里按 `F12` 或 `Ctrl+Shift+I` 打开 Chromium DevTools，可以在 Elements 面板直接改任意样式，或在 Console 里执行：

```js
document.documentElement.style.setProperty("--v-cell-skew", "-9deg")
```

两种方式改的是同一批 CSS 变量，互不冲突。

## 改按钮行为

编辑根目录 `config.json`，不用重新打包：

```json
"actions": {
  "download": { "type": "path", "value": "%USERPROFILE%\\Downloads" },
  "website":  { "type": "url",  "value": "https://pgr.kurogame.net" }
}
```

- `path` → `shell.openPath`，能开文件夹、exe、文档
- `url` → 默认浏览器
- `config` → 用默认程序打开 `config.json`
- 支持 `%USERPROFILE%` 这类环境变量

## 结构

```
electron/main.cjs     窗口、点击穿透、IPC 动作分发
electron/preload.cjs  contextBridge 暴露 window.pgr
src/main.jsx          面板组件 + 时钟 + 展开收起 + 命中测试
src/panel.css         全部样式（tokens 在 :root）
public/assets/_game/  解包出来的图标和字体
tools/                解包脚本，见 tools/README.md
```

## 交互

默认**收起**：右下角一条蓝色斜条显示时间，右端是投影镜头。
点时间条或镜头 → 全息面板从镜头位置向上展开（`scaleY` + 淡入，260ms），再点一次收起，`Esc` 也能收起。

## 投影效果

- `.plane` —— 低透明蓝色四边形板 + 双向细网格；上方倒三角与下方正三角以镜头中心为共同顶点，不再对整板叠加额外 3D 旋转和放大
- `.grid` —— 三行格子按参考帧逐格定位，黑格使用约 `-6deg` 的 `skewX`；白色图标用反向变换保持正对屏幕
- `.lens` —— 三层叠出来的光圈，全部用游戏原图：
  `lens_ring`（外圈刻度）+ `lens_petals`（四瓣，用 filter 调成蓝）+ `lens_core`（中心白环）
- 展开动画以镜头为原点（`transform-origin: 84.5% 90.6%`），从右下角镜头位置向上投出
- 展开 / 收起校对图：`out/refined_open.png`、`out/refined_closed.png`；双三角投影校对图：`out/triangles_final.png`

## 素材来源

`public/assets/_game/` 全部来自本机游戏客户端解包，**仅个人学习用，不要分发**（已 gitignore）。

图标是白色位图，`icon_settings.png` 是脚本画的（游戏里没有干净版本的齿轮）。

## 已知可继续做的

- 「正在播放」目前是静态文案，后续可接 Windows SMTC 读真实播放信息
- 面板边缘原本是 shader 做的有机轮廓，现在是四边形主板与双投影面的近似，未复原完整 shader
- 没有开机自启 / 托盘图标


## 免责声明

本项目是**非官方同人作品**，与库洛游戏（Kuro Games）无关，未获授权或认可。
游戏素材版权归库洛游戏所有，仅用于个人学习研究，禁止商用与二次分发。

完整条款见 [DISCLAIMER.md](./DISCLAIMER.md)。

## 素材说明

public/assets/_game/ 里的图标和字体来自《战双帕弥什》客户端解包（具体流程见 	ools/README.md），
版权归库洛游戏所有，**仅供学习研究，请勿商用或二次分发**。

如果不想带着这些素材，删除该目录后用 	ools/export_assets.py 从本地游戏重新导出即可。
