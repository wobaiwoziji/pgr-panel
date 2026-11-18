const { app, BrowserWindow, ipcMain, shell, screen, Menu, globalShortcut, Tray, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");
const { nowPlaying, findCover } = require("./media.cjs");
const ROOT = app.getAppPath();
// 打包后配置和 PowerShell 脚本在 resources 目录里（不是 asar 内部）
const RES = app.isPackaged ? process.resourcesPath : ROOT;
const CONFIG_PATH = path.join(RES, "config.json");

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return { window: { width: 440, height: 690, margin: 24 }, panel: { buttons: [], quick: [] }, actions: {} };
  }
}

const config = readConfig();
const W = { width: 460, height: 660, margin: 24, acrylic: false, desktopOnly: true, ...(config.window || {}) };

// 校对用：PGR_SIZE=760x892 强制窗口尺寸
if (process.env.PGR_SIZE) {
  const [w, h] = process.env.PGR_SIZE.split("x").map(Number);
  if (w > 0 && h > 0) {
    W.width = w;
    W.height = h;
    W.margin = 0;
  }
}

function expand(value) {
  return String(value || "").replace(/%([^%]+)%/g, (_, k) => process.env[k] || "");
}

let win = null;
let tray = null;

// 把窗口限制在屏幕工作区内，避免缩放/拖动后跑到看不见的地方
function clampPos(x, y, w, h) {
  const cx = Math.round(x + w / 2);
  const cy = Math.round(y + h / 2);
  const area = screen.getDisplayNearestPoint({ x: cx, y: cy }).workArea;
  const nx = Math.max(area.x, Math.min(Math.round(x), area.x + area.width - w));
  const ny = Math.max(area.y, Math.min(Math.round(y), area.y + area.height - h));
  return { x: nx, y: ny };
}

function homePos(w = W.width, h = W.height) {
  const area = screen.getPrimaryDisplay().workArea;
  return {
    x: area.x + area.width - w - W.margin,
    y: area.y + area.height - h - W.margin,
  };
}

function resetPos() {
  if (!win) return;
  const b = win.getBounds();
  const home = homePos(b.width, b.height);
  const p = clampPos(home.x, home.y, b.width, b.height);
  win.setPosition(p.x, p.y);
  win.show();
}

function toggleShow() {
  if (!win) return;
  if (win.isVisible()) win.hide();
  else win.show();
}

// 托盘：常驻右下角「隐藏的图标」里，关掉面板也能从这儿叫回来
function createTray() {
  const iconPath = app.isPackaged ? path.join(RES, "tray.ico") : path.join(ROOT, "build", "icon.ico");
  try {
    tray = new Tray(nativeImage.createFromPath(iconPath));
  } catch {
    return;
  }
  tray.setToolTip("PGR Panel");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "显示 / 收起", click: toggleShow },
      { label: "回到右下角", click: resetPos },
      { label: "重新加载", click: () => win?.reload() },
      { label: "打开配置", click: () => shell.openPath(CONFIG_PATH) },
      { type: "separator" },
      { label: "退出", click: () => app.quit() },
    ])
  );
  tray.on("click", toggleShow);
}

const STATE_PATH = path.join(app.getPath("userData"), "window-state.json");

function loadPos() {
  try {
    const s = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    if (typeof s.x === "number" && typeof s.y === "number") return s;
  } catch {
    /* 首次启动 */
  }
  return null;
}

function savePos() {
  if (!win || win.isDestroyed() || win.isMinimized()) return;
  const [x, y] = win.getPosition();
  try {
    fs.writeFileSync(STATE_PATH, JSON.stringify({ x, y }));
  } catch {
    /* 忽略 */
  }
}

function createWindow() {
  const area = screen.getPrimaryDisplay().workArea;
  const saved = loadPos();
  const start = saved
    ? clampPos(saved.x, saved.y, W.width, W.height)
    : { x: area.x + area.width - W.width - W.margin, y: area.y + area.height - W.height - W.margin };

  win = new BrowserWindow({
    width: W.width,
    height: W.height,
    x: start.x,
    y: start.y,
    frame: false,
    transparent: !W.acrylic,
    backgroundColor: "#00000000",
    hasShadow: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    // 桌面挂件：不置顶，只压着壁纸，别的窗口一开就盖住它
    alwaysOnTop: !W.desktopOnly,
    show: false,
    backgroundMaterial: W.acrylic ? "acrylic" : "none",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  win.setAlwaysOnTop(!W.desktopOnly, "normal");
  win.setVisibleOnAllWorkspaces(true);

  // 空白处不挡桌面：默认鼠标穿透，鼠标移到面板上时由渲染进程切回来
  win.setIgnoreMouseEvents(true, { forward: true });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(ROOT, "dist", "index.html"));
  }

  win.once("ready-to-show", () => win.show());

  win.on("moved", savePos);
  win.on("close", () => {
    stopDrag();
    savePos();
  });

  // 开发用：PGR_CAPTURE=<png 路径> 启动后截一张窗口内容就退出
  if (process.env.PGR_CAPTURE) {
    win.webContents.once("did-finish-load", () => {
      setTimeout(async () => {
        if (process.env.PGR_OPEN) {
          await win.webContents.executeJavaScript(`document.querySelector('.dock')?.click()`);
          await new Promise((r) => setTimeout(r, 500));
        }
        if (process.env.PGR_EVAL) {
          await win.webContents.executeJavaScript(process.env.PGR_EVAL);
          await new Promise((r) => setTimeout(r, 600));
        }
        if (process.env.PGR_DEBUG) {
          const dbg = await win.webContents.executeJavaScript(
            `JSON.stringify(['.hed','.media','.grid','.cell','.cell-box','.cell-label','.quick','.plane'].map(s=>{const e=document.querySelector(s);if(!e)return [s,null];const r=e.getBoundingClientRect();return [s,[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]]}))`
          );
          console.log("DBG", dbg);
        }
        const img = await win.webContents.capturePage();
        fs.writeFileSync(process.env.PGR_CAPTURE, img.toPNG());
        app.quit();
      }, 900);
    });
  }

  // F12 / Ctrl+Shift+I 打开开发者工具，可实时改任意样式
  win.webContents.on("before-input-event", (event, input) => {
    const k = (input.key || "").toLowerCase();
    if (k === "f12" || (input.control && input.shift && k === "i")) {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  win.webContents.on("context-menu", () => {
    // 拖动投影时右键不该弹菜单
    if (Date.now() < menuBlockUntil) return;
    Menu.buildFromTemplate([
      { label: "重新加载", click: () => win.reload() },
      { label: "打开配置", click: () => shell.openPath(CONFIG_PATH) },
      { type: "separator" },
      { label: "退出", click: () => app.quit() },
    ]).popup({ window: win });
  });
}

ipcMain.handle("pgr:nowplaying", () => nowPlaying(path.join(RES, "nowplaying.ps1")));
// 拖拽投影：按住镜头球移动整个窗口（主进程跟光标，省 IPC）
let dragTimer = null;
let menuBlockUntil = 0;
function stopDrag() {
  if (dragTimer) clearInterval(dragTimer);
  dragTimer = null;
  menuBlockUntil = Date.now() + 500;
}

ipcMain.on("pgr:drag-start", () => {
  if (!win) return;
  stopDrag();
  menuBlockUntil = 0;
  const c0 = screen.getCursorScreenPoint();
  const [x0, y0] = win.getPosition();
  const started = Date.now();
  dragTimer = setInterval(() => {
    if (!win || win.isDestroyed() || Date.now() - started > 30000) return stopDrag();
    const c = screen.getCursorScreenPoint();
    try {
      const b = win.getBounds();
      const p = clampPos(x0 + c.x - c0.x, y0 + c.y - c0.y, b.width, b.height);
      win.setPosition(p.x, p.y);
    } catch {
      stopDrag();
    }
  }, 16);
});

ipcMain.on("pgr:drag-end", stopDrag);

ipcMain.handle("pgr:cover", (_e, q) => findCover(q));

// 整体缩放：窗口跟着一起变，右下角保持不动，并且不许超出屏幕
ipcMain.handle("pgr:zoom", (_e, z) => {
  if (!win) return false;
  const b = win.getBounds();
  const area = screen.getDisplayNearestPoint({
    x: Math.round(b.x + b.width / 2),
    y: Math.round(b.y + b.height / 2),
  }).workArea;
  const fit = Math.min(area.width / W.width, area.height / W.height);
  const zz = Math.min(1.4, Math.max(0.5, Math.min(Number(z) || 1, fit)));
  const nw = Math.round(W.width * zz);
  const nh = Math.round(W.height * zz);
  const pos = clampPos(b.x + b.width - nw, b.y + b.height - nh, nw, nh);
  win.setBounds({ ...pos, width: nw, height: nh });
  // 实际生效的缩放，渲染进程照着它改 --zoom，避免画面被窗口裁掉
  return zz;
});

ipcMain.handle("pgr:config", () => ({
  ...config,
  runtime: { scale: process.env.PGR_SCALE ? Number(process.env.PGR_SCALE) : W.width / 760 },
}));

ipcMain.on("pgr:interactive", (_e, on) => {
  if (win) win.setIgnoreMouseEvents(!on, { forward: true });
});

ipcMain.handle("pgr:launch", async (_e, id) => {
  const action = (config.actions || {})[id];
  if (!action) return { ok: false, error: `no action for ${id}` };

  if (action.type === "url") {
    await shell.openExternal(expand(action.value));
    return { ok: true };
  }
  if (action.type === "path") {
    const target = expand(action.value);
    if (!fs.existsSync(target)) return { ok: false, error: `不存在: ${target}` };
    const err = await shell.openPath(target);
    return err ? { ok: false, error: err } : { ok: true };
  }
  if (action.type === "config") {
    await shell.openPath(CONFIG_PATH);
    return { ok: true };
  }
  return { ok: false, error: `unknown type ${action.type}` };
});

ipcMain.on("pgr:quit", () => app.quit());

app.whenReady().then(() => {
  createWindow();
  createTray();

  // 兜底：Ctrl+Alt+Q 随时退出（面板没有窗口边框，容易关不掉）
  globalShortcut.register("Control+Alt+Q", () => app.quit());
  globalShortcut.register("Control+Alt+H", () => {
    if (!win || win.isDestroyed()) return;
    win.isVisible() ? win.hide() : win.show();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => {
  stopDrag();
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => app.quit());
