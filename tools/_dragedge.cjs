const { spawn, execFileSync } = require("child_process");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdpTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch("http://127.0.0.1:9222/json/list");
      const list = await r.json();
      const page = list.find((t) => t.type === "page");
      if (page) return page;
    } catch {}
    await sleep(300);
  }
  throw new Error("no cdp target");
}

let seq = 0;
function call(ws, method, params = {}) {
  const id = ++seq;
  return new Promise((resolve) => {
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id !== id) return;
      ws.removeEventListener("message", onMsg);
      resolve(m.result);
    };
    ws.addEventListener("message", onMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

function cursorTo(x, y) {
  execFileSync("powershell", [
    "-NoProfile",
    "-Command",
    `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x},${y})`,
  ]);
}
function cursorPos() {
  const out = execFileSync("powershell", [
    "-NoProfile",
    "-Command",
    "Add-Type -AssemblyName System.Windows.Forms; $p=[System.Windows.Forms.Cursor]::Position; \"$($p.X),$($p.Y)\"",
  ]).toString();
  const [x, y] = out.trim().split(",").map(Number);
  return { x, y };
}

(async () => {
  const app = spawn("node", ["node_modules/electron/cli.js", ".", "--remote-debugging-port=9222"], {
    cwd: "D:\\ui",
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let appLog = "";
  app.stdout.on("data", (d) => (appLog += d.toString()));
  app.stderr.on("data", (d) => (appLog += d.toString()));

  try {
    const target = await cdpTarget();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res) => ws.addEventListener("open", res));
    await sleep(1500);
    const ev = async (expr, awaitPromise = false) =>
      (await call(ws, "Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise })).result?.value;

    // 展开面板
    await ev("document.querySelector('.dock').click()");
    await sleep(900);
    console.log("open?", await ev("!!document.querySelector('.holo.is-open')"));
    console.log("insets in page", await ev(
      "(()=>{const p=document.querySelector('.panel').getBoundingClientRect();return JSON.stringify({inner:[innerWidth,innerHeight],panel:[Math.round(p.left),Math.round(p.right),Math.round(p.top),Math.round(p.bottom)]})})()"
    ));
    console.log("bounds", await ev("window.pgr.bounds()", true));

    const c0 = cursorPos();
    await ev("window.pgr.dragStart()");
    await sleep(150);
    cursorTo(Math.min(c0.x + 60, 1500), Math.min(c0.y, 500));
    await sleep(700);
    await ev("window.pgr.dragEnd()");
    await sleep(300);
    console.log("bounds2", await ev("window.pgr.bounds()", true));
    ws.close();
  } finally {
    app.kill();
    await sleep(300);
    const lines = appLog.split(/\r?\n/).filter((l) => l.includes("[drag]") || l.includes("[zoom]"));
    console.log(lines.slice(0, 3).join("\n"));
    console.log("...");
    console.log(lines.slice(-2).join("\n"));
    process.exit(0);
  }
})();
