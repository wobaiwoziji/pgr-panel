const fs = require("fs");
const path = require("path");
const { app, nativeImage } = require("electron");
const mm = require("music-metadata");

const INDEX_FILE = path.join(app.getPath("userData"), "local-music.json");
const AUDIO = new Set([".mp3", ".flac", ".m4a", ".aac", ".ogg", ".opus", ".wav", ".wma", ".ape"]);

let root = "";
let files = [];

function load() {
  try {
    const j = JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"));
    root = typeof j.root === "string" ? j.root : "";
    files = Array.isArray(j.files) ? j.files.filter((f) => typeof f === "string") : [];
  } catch {
    root = "";
    files = [];
  }
}

function save() {
  try {
    fs.writeFileSync(INDEX_FILE, JSON.stringify({ root, files }), "utf8");
  } catch {
    /* 忽略 */
  }
}

function walk(dir, depth = 0, out = []) {
  let list = [];
  try {
    list = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of list) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (depth < 6 && !e.name.startsWith(".")) walk(p, depth + 1, out);
    } else if (AUDIO.has(path.extname(e.name).toLowerCase())) {
      out.push(p);
    }
  }
  return out;
}

function status() {
  return { root, count: files.length };
}

/** 选好目录后扫一次文件名（不读标签，很快），之后所有查找都走这份清单 */
function setFolder(dir) {
  root = dir || "";
  files = root ? walk(root) : [];
  coverCache.clear();
  save();
  return status();
}

/* ── 按歌名找本地文件里的内嵌封面 ── */
const coverCache = new Map();

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\.(mp3|flac|m4a|aac|ogg|opus|wav|wma|ape)$/i, "")
    .replace(/^\s*\d+[\s._-]+/, "")
    .replace(/[()[\]{}（）【】]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shrink(buf, format) {
  try {
    const img = nativeImage.createFromBuffer(buf);
    if (img.isEmpty()) return "";
    const small = img.resize({ width: 220, height: 220, quality: "good" });
    const jpeg = small.toJPEG(82);
    return "data:image/jpeg;base64," + jpeg.toString("base64");
  } catch {
    return `data:${format || "image/jpeg"};base64,` + buf.toString("base64");
  }
}

async function findLocalCover({ title, artist } = {}) {
  const t = norm(title);
  if (!t || !files.length) return "";
  const key = `${t}|${norm(artist)}`;
  if (coverCache.has(key)) return coverCache.get(key);

  const hits = files.filter((f) => norm(path.basename(f)).includes(t));
  hits.sort((a, b) => norm(path.basename(a)).length - norm(path.basename(b)).length);

  for (const f of hits.slice(0, 6)) {
    try {
      const meta = await mm.parseFile(f, { duration: false, skipPostHeaders: true, includeChapters: false });
      const pic = meta.common.picture && meta.common.picture[0];
      if (!pic) continue;
      const url = shrink(Buffer.from(pic.data), pic.format);
      if (!url) continue;
      coverCache.set(key, url);
      return url;
    } catch {
      /* 换下一个候选 */
    }
  }
  coverCache.set(key, "");
  return "";
}

load();

module.exports = { setFolder, status, findLocalCover };
