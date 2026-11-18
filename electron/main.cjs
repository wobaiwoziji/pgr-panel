const { app, BrowserWindow, ipcMain, shell, screen, Menu, globalShortcut } = require("electron");
const path = require("path");
const fs = require("fs");
const { nowPlaying } = require("./media.cjs");
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
  const x = area.x + area.width - W.width - W.margin;
  const y = area.y + area.height - W.height - W.margin;

  win = new BrowserWindow({
    width: W.width,
    height: W.height,
    x: saved ? saved.x : x,
    y: saved ? saved.y : y,
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
  win.on("close", savePos);

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
    Menu.buildFromTemplate([
      { label: "重新加载", click: () => win.reload() },
      { label: "打开配置", click: () => shell.openPath(CONFIG_PATH) },
      { type: "separator" },
      { label: "退出", click: () => app.quit() },
    ]).popup({ window: win });
  });
}

ipcMain.handle("pgr:nowplaying", () => nowPlaying(path.join(RES, "nowplaying.ps1")));

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

app.on("will-quit", () => globalShortcut.unregisterAll());

app.on("window-all-closed", () => app.quit());
