const { execFile } = require("child_process");
const path = require("path");

const SCRIPT = path.join(__dirname, "nowplaying.ps1");
let cache = { at: 0, data: null, busy: false };

function run() {
  return new Promise((resolve) => {
    execFile(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", SCRIPT],
      { timeout: 6000, windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout) => {
        if (err) return resolve({ ok: false, reason: String(err.message || err) });
        try {
          resolve(JSON.parse((stdout || "").trim() || '{"ok":false}'));
        } catch {
          resolve({ ok: false, reason: "bad-json" });
        }
      }
    );
  });
}

/** 2 秒缓存，避免每次轮询都起一个 PowerShell */
async function nowPlaying() {
  const now = Date.now();
  if (cache.data && now - cache.at < 2000) return cache.data;
  if (cache.busy) return cache.data || { ok: false };
  cache.busy = true;
  const data = await run();
  cache = { at: Date.now(), data, busy: false };
  return data;
}

module.exports = { nowPlaying };
