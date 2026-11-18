const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const DEFAULT_SCRIPT = path.join(__dirname, "nowplaying.ps1");
// 轮询缓存：有歌时短一点，换歌反应更快；空转时拉长，少起 PowerShell
let cache = { at: 0, data: null, busy: false };

function run(script) {
  return new Promise((resolve) => {
    execFile(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script || DEFAULT_SCRIPT],
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

async function nowPlaying(script) {
  const now = Date.now();
  const ttl = cache.data?.ok ? 900 : 2000;
  if (cache.data && now - cache.at < ttl) return cache.data;
  if (cache.busy) return cache.data || { ok: false };
  cache.busy = true;
  const data = await run(script);
  cache = { at: Date.now(), data, busy: false };
  return data;
}

/* ── 在线封面：内存 + 磁盘缓存，同一首歌第二次播放秒出 ── */
const COVER_FILE = path.join(app.getPath("userData"), "covers.json");
let covers = {};
try {
  covers = JSON.parse(fs.readFileSync(COVER_FILE, "utf8")) || {};
} catch {
  covers = {};
}

let saveTimer = null;
function persist() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const keys = Object.keys(covers);
      if (keys.length > 800) for (const k of keys.slice(0, keys.length - 800)) delete covers[k];
      fs.writeFileSync(COVER_FILE, JSON.stringify(covers), "utf8");
    } catch {
      /* 忽略 */
    }
  }, 800);
}

/**
 * 播放器不提供封面时（本地音乐很常见），按歌名 + 歌手去 iTunes 搜一张。
 * 放在主进程里做，避开渲染进程的 CORS。
 */
async function findCover({ title, artist } = {}) {
  const q = `${artist || ""} ${title || ""}`.trim();
  if (!q) return "";
  if (q in covers) return covers[q];

  const url =
    "https://itunes.apple.com/search?term=" + encodeURIComponent(q) + "&entity=song&limit=5";
  let hit = "";
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    const res = await fetch(url, { signal: ctl.signal });
    clearTimeout(t);
    const json = await res.json();
    const first = (json.results || [])[0];
    if (first?.artworkUrl100) hit = String(first.artworkUrl100).replace("100x100", "600x600");
  } catch {
    hit = "";
  }
  // 只有查到才写盘，避免把"没搜到"永久记住
  if (hit) {
    covers[q] = hit;
    persist();
  }
  return hit;
}

module.exports = { nowPlaying, findCover };
