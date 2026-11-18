const { execFile } = require("child_process");
const path = require("path");

const DEFAULT_SCRIPT = path.join(__dirname, "nowplaying.ps1");
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

/** 2 秒缓存，避免每次轮询都起一个 PowerShell */
async function nowPlaying(script) {
  const now = Date.now();
  if (cache.data && now - cache.at < 2000) return cache.data;
  if (cache.busy) return cache.data || { ok: false };
  cache.busy = true;
  const data = await run(script);
  cache = { at: Date.now(), data, busy: false };
  return data;
}

const covers = new Map();

/**
 * 播放器不提供封面时（本地音乐很常见），按歌名 + 歌手去 iTunes 搜一张。
 * 放在主进程里做，避开渲染进程的 CORS。
 */
async function findCover({ title, artist } = {}) {
  const q = `${artist || ""} ${title || ""}`.trim();
  if (!q) return "";
  if (covers.has(q)) return covers.get(q);

  const url =
    "https://itunes.apple.com/search?term=" +
    encodeURIComponent(q) +
    "&entity=song&limit=5";
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
  covers.set(q, hit);
  if (covers.size > 300) covers.delete(covers.keys().next().value);
  return hit;
}

module.exports = { nowPlaying, findCover };
