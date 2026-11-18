import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./panel.css";
import "./tuner.css";
import "./editor.css";
import "./picker.css";
import "./compare.css";
import "./settings.css";
import Tuner from "./Tuner.jsx";
import Editor from "./Editor.jsx";
import Picker from "./Picker.jsx";
import Compare from "./Compare.jsx";
import Particles from "./Particles.jsx";
import Settings from "./Settings.jsx";
import ButtonConfig from "./ButtonConfig.jsx";

const ASSET = "./assets/_game/icons/";
const iconSrc = (icon) => (icon && icon.startsWith("data:") ? icon : ASSET + icon + ".png");
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

const FALLBACK = {
  panel: {
    media: { status: "正在播放", title: "可Linda 制作：战双帕弥什" },
    buttons: [],
    quick: [],
  },
};

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const md = `${now.getMonth() + 1}/${now.getDate()}`;
  return { time: `${hh}:${mm}`, date: `${md} 星期${WEEK[now.getDay()]}` };
}

export default function App() {
  const [cfg, setCfg] = useState(FALLBACK);
  const [open, setOpen] = useState(() => !window.pgr);
  const [toast, setToast] = useState("");
  const [np, setNp] = useState({ title: "", artist: "", cover: "", playing: false });
  const [btnCfg, setBtnCfg] = useState(null);
  const openBtnCfg = (t) => {
    setBtnCfg(t);
    window.pgr?.modal?.(true);
  };
  const closeBtnCfg = () => {
    setBtnCfg(null);
    window.pgr?.modal?.(false);
  };
  const refreshCfg = async () => {
    if (!window.pgr?.getConfig) return;
    const c = await window.pgr.getConfig();
    if (c?.panel) setCfg(c);
  };
  const [showSet, setShowSet] = useState(false);
  const openSettings = () => {
    setShowSet(true);
    window.pgr?.modal?.(true);
  };
  const closeSettings = () => {
    setShowSet(false);
    window.pgr?.modal?.(false);
  };
  const [musicDbg, setMusicDbg] = useState("检测中…");
  const [ui, setUi] = useState(() => {
    try {
      return { particles: 72, grid: 85, beam: 100, zoom: 100, motion: true, particleOn: true, onlineCover: true, ...JSON.parse(localStorage.getItem("pgr-ui") || "{}") };
    } catch {
      return { particles: 72, grid: 85, beam: 100, zoom: 100, motion: true, particleOn: true, onlineCover: true };
    }
  });

  // 设置实时生效
  const zoomApplied = useRef(null);
  const draggingRef = useRef(false);
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--g1", ((0.26 * ui.grid) / 100).toFixed(3));
    r.style.setProperty("--g2", ((0.21 * ui.grid) / 100).toFixed(3));
    r.style.setProperty("--beam", (ui.beam / 100).toFixed(2));
    const z = (ui.zoom ?? 100) / 100;
    r.style.setProperty("--zoom", z.toFixed(2));
    // 首次是 100% 就别动窗口（可能被 PGR_SIZE 指定过尺寸）
    if (window.pgr?.zoom && zoomApplied.current !== z) {
      const first = zoomApplied.current === null;
      zoomApplied.current = z;
      if (!first || z !== 1) {
        // 主进程会按屏幕大小夹一次，返回真正生效的比例
        window.pgr.zoom(z).then((zz) => {
          if (typeof zz === "number" && Math.abs(zz - z) > 0.005) {
            r.style.setProperty("--zoom", zz.toFixed(2));
            zoomApplied.current = zz;
          }
        });
      }
    }
    document.body.classList.toggle("no-motion", !ui.motion);
    localStorage.setItem("pgr-ui", JSON.stringify(ui));
  }, [ui]);
  const [bar, setBar] = useState({ top: 0, range: 0, ratio: 1 });
  const { time, date } = useClock();
  const gridRef = useRef(null);
  const panel = cfg.panel || FALLBACK.panel;
  const titleRef = useRef(null);
  const [marquee, setMarquee] = useState(false);
  const titleText = np.title || "未在播放";

  // 标题放不下才滚动（右 → 左）
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const measure = () => {
      const span = el.querySelector("span");
      if (!span || !el.clientWidth) return;
      const textW = span.offsetWidth - (el.classList.contains("marquee") ? 60 : 0);
      setMarquee(textW > el.clientWidth + 1);
    };
    measure();
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [titleText, open]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (window.pgr) {
        const c = await window.pgr.getConfig();
        if (!alive) return;
        if (c?.panel) setCfg(c);
        const s = c?.runtime?.scale;
        if (s > 0 && s !== 1) document.documentElement.style.setProperty("--scale", String(s));
        return;
      }
      try {
        const r = await fetch("/config.json");
        if (r.ok) {
          const c = await r.json();
          if (alive && c?.panel) setCfg(c);
        }
      } catch {
        /* 预览 */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 点击穿透：只有指针落在真实内容上才接管
  useEffect(() => {
    if (!window.pgr) return;
    let inside = null;
    const apply = (hit) => {
      if (hit === inside) return;
      inside = hit;
      window.pgr.setInteractive(hit);
    };
    const onMove = (e) => {
      if (draggingRef.current) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      apply(!!el && !!el.closest(".hit"));
    };
    const off = () => apply(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", off);
    window.addEventListener("blur", off);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", off);
      window.removeEventListener("blur", off);
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      closeSettings();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 读取系统「正在播放」：有歌时 1.4s 一探，空转时放慢到 3.5s，换歌响应更快
  useEffect(() => {
    if (!window.pgr?.nowPlaying) return;
    let alive = true;
    let timer = null;

    const tick = async () => {
      let hasTrack = false;
      try {
        const r = await window.pgr.nowPlaying();
        if (!alive) return;
        if (r?.ok && (r.title || r.cover)) {
          hasTrack = !!r.title;
          const base = { title: r.title || "", artist: r.artist || "", cover: r.cover || "", playing: !!r.playing };
          // 播放器给了封面就用它；没给就沿用这首歌已经补到的在线封面，避免每轮都闪一下
          setNp((prev) =>
            !base.cover && prev.title === base.title && prev.cover ? { ...base, cover: prev.cover } : base
          );
          setMusicDbg(base.cover ? "已连接 · 有封面" : "已连接 · 播放器没给封面");
          // 封面：先找本地音乐目录里的内嵌封面（最快），没有再上网搜
          if (!base.cover && base.title) {
            let url = "";
            if (window.pgr?.localCover) {
              url = await window.pgr.localCover({ title: base.title, artist: base.artist });
            }
            if (!url && ui.onlineCover !== false && window.pgr?.cover) {
              url = await window.pgr.cover({ title: base.title, artist: base.artist });
            }
            if (!alive) return;
            if (url) setNp((p) => (p.title === base.title && !p.cover ? { ...p, cover: url } : p));
          }
        } else {
          setNp({ title: "", artist: "", cover: "", playing: false });
          setMusicDbg(`未连接 · ${r?.reason || "无会话"}`);
        }
      } catch {
        /* 忽略 */
      }
      if (!alive) return;
      timer = setTimeout(tick, hasTrack ? 1000 : 3500);
    };

    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [ui.onlineCover]);

  // 换歌时保留上一张封面一小会儿，新图到了再淡入，避免中间闪一下空白
  const [art, setArt] = useState("");
  useEffect(() => {
    if (np.cover) {
      setArt(np.cover);
      return;
    }
    const t = setTimeout(() => setArt(""), 1600);
    return () => clearTimeout(t);
  }, [np.cover, np.title]);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  // 上报面板在窗口里的实际留白（拖动/展开/缩放后各测一次）
  const measureInsets = () => {
    if (!window.pgr?.insets) return;
    const el = document.querySelector(".holo.is-open .panel") || document.querySelector(".dock");
    if (!el) return;
    const r = el.getBoundingClientRect();
    window.pgr.insets({
      l: Math.max(0, Math.round(r.left)),
      t: Math.max(0, Math.round(r.top)),
      r: Math.max(0, Math.round(window.innerWidth - r.right)),
      b: Math.max(0, Math.round(window.innerHeight - r.bottom)),
    });
  };

  useEffect(() => {
    measureInsets();
    const t1 = setTimeout(measureInsets, 300);
    const t2 = setTimeout(measureInsets, 900);
    window.addEventListener("resize", measureInsets);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", measureInsets);
    };
  }, [open, ui.zoom]);

  // 右键按住投影球拖整个挂件；左键只负责展开/收起
  const startDrag = (e) => {
    if (!window.pgr?.dragStart || e.button !== 2) return;
    e.preventDefault();
    measureInsets();
    draggingRef.current = true;
    const onUp = () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("blur", onUp);
      draggingRef.current = false;
      window.pgr.dragEnd();
    };
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("blur", onUp);
    window.pgr.dragStart();
  };

  const noMenu = (e) => e.preventDefault();

  const run = async (e, id) => {
    e.stopPropagation();
    if (!window.pgr) {
      setToast(`预览模式：${id}`);
      setTimeout(() => setToast(""), 1200);
      return;
    }
    const res = await window.pgr.launch(id);
    if (!res?.ok) {
      setToast(res?.error || "打开失败");
      setTimeout(() => setToast(""), 1800);
    }
  };

  const rows = [];
  for (let i = 0; i < (panel.buttons || []).length; i += 3) rows.push(panel.buttons.slice(i, i + 3));

  const GRID_H = 468;
  const onScroll = (e) => {
    const el = e.currentTarget;
    const range = Math.max(1, el.scrollHeight - el.clientHeight);
    setBar({ top: el.scrollTop, range, ratio: el.clientHeight / el.scrollHeight });
  };
  const thumbH = Math.max(56, GRID_H * bar.ratio);
  const thumbTop = bar.range > 1 ? (bar.top / bar.range) * (GRID_H - thumbH) : 0;
  const dragThumb = (e) => {
    const el = gridRef.current;
    if (!el) return;
    e.preventDefault();
    const scale = el.getBoundingClientRect().height / el.offsetHeight || 1;
    const y0 = e.clientY;
    const t0 = el.scrollTop;
    const max = Math.max(1, GRID_H - thumbH);
    const move = (ev) => (el.scrollTop = t0 + ((ev.clientY - y0) / scale / max) * bar.range);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <>
      <div className="stage">
      <div className={`holo hit ${open ? "is-open" : ""}`}>
        {/* 唯一做倾斜的一层；里面全是正矩形 */}
        <div className="tilt" data-ed="tilt">
          <Particles active={open && ui.particleOn} count={ui.particles} />

        {/* 投影轨迹：两片三角，边贴面板上下沿，角连镜头 */}
          <div className="tri tri-top" />
          <div className="tri tri-bottom" />

          <div className="panel">
            <div className="plane-shadow" />
            <div className="plane" data-ed="plane" />

            <div className="hed-shadow" />
            <div className="hed hit" data-ed="hed">
              <span className="hed-time">{time}</span>
              <span className="hed-date">{date}</span>
            </div>

            <div className="media hit" data-ed="media">
              {np.title ? <span className="media-sweep" key={np.title} /> : null}
              <span className={`cover ${art ? "has-img" : ""}`}>
                {art ? (
                  <span className="cover-art" key={art}>
                    <img src={art} alt="" draggable="false" />
                  </span>
                ) : null}
              </span>
              <span className="media-text">
                <b>{np.title ? "正在播放" : "音乐"}</b>
                <i
                  key={titleText}
                  ref={titleRef}
                  className={`${marquee ? "marquee" : ""} ${np.title ? "" : "idle"}`}
                  title={titleText}
                >
                  <em>
                    <span>{titleText}</span>
                    {marquee ? <span aria-hidden="true">{titleText}</span> : null}
                  </em>
                </i>
                {np.artist ? <u key={np.artist}>{np.artist}</u> : null}
              </span>
            </div>

            <div className="grid hit" ref={gridRef} onScroll={onScroll}>
              <div className="track">
                {rows.map((row, ri) => (
                  <div className="row" key={ri}>
                    {row.map((b, ci) => (
                      <button
                        className="cell"
                        key={b.id}
                        style={{ "--i": ri * 3 + ci }}
                        onClick={(e) => run(e, b.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.pgr?.suppressMenu?.();
                          openBtnCfg({
                            kind: "cell",
                            id: b.id,
                            label: b.label,
                            icon: b.icon,
                            action: cfg.actions?.[b.id],
                          });
                        }}
                      >
                        <span className="cell-box" data-ed={`box-${b.id}`}>
                          <img src={iconSrc(b.icon)} alt="" draggable="false" data-ed={`icon-${b.id}`} />
                        </span>
                        {b.label ? (
                          <span className="cell-label" data-ed={`label-${b.id}`}>
                            {b.label}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="scrollbar hit" data-ed="scroll">
              <i className="sb-track" />
              <i className="sb-thumb" style={{ top: thumbTop, height: thumbH }} onPointerDown={dragThumb} />
            </div>

            <div className="quick hit" data-ed="quick">
              {(panel.quick || []).map((q) => (
                <button
                  key={q.id}
                  onClick={(e) => {
                    if (q.id === "settings") {
                      e.stopPropagation();
                      openSettings();
                      return;
                    }
                    run(e, q.id);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.pgr?.suppressMenu?.();
                    openBtnCfg({ kind: "quick", id: q.id, icon: q.icon, action: cfg.actions?.[q.id] });
                  }}
                  title={q.id}
                >
                  <img src={iconSrc(q.icon)} alt="" draggable="false" data-ed={`quick-${q.id}`} />
                </button>
              ))}
            </div>
          </div>

          {/* 镜头跟着面板一起，贴在右下角 */}
          <div
            className="lens hit"
            data-ed="lens"
            onPointerDown={startDrag}
            onClick={toggle}
            onContextMenu={noMenu}
          >
            <i className="l-ring" />
            <i className="l-petals" />
            <i className="l-core" />
          </div>
        </div>
      </div>

      <button
        className={`dock hit ${open ? "is-hidden" : ""}`}
        data-ed="dock"
        onPointerDown={startDrag}
        onClick={toggle}
        onContextMenu={noMenu}
      >
        <span className="dock-time">{time}</span>
        <span className="dock-lens">
          <i className="l-ring" />
          <i className="l-petals" />
          <i className="l-core" />
        </span>
      </button>

      {toast && <div className="toast">{toast}</div>}
      {(!window.pgr || location.search.includes("tune")) && <Tuner />}
      {(!window.pgr || location.search.includes("edit")) && <Editor />}
      {(!window.pgr || location.search.includes("pick")) && <Picker />}
      {location.search.includes("compare") && <Compare />}
      </div>

      <Settings
        open={showSet}
        value={ui}
        onChange={setUi}
        onClose={closeSettings}
        version="0.3"
        music={musicDbg}
        onOpenConfig={() =>
          window.pgr ? window.pgr.launch("settings") : setToast("预览模式：配置文件")
        }
      />

      <ButtonConfig target={btnCfg} onClose={closeBtnCfg} onSaved={refreshCfg} />
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);

if (!window.pgr) {
  document.body.classList.add("preview");
  const fit = () => {
    const s = Math.min(window.innerWidth / 760, window.innerHeight / 892) * 0.96;
    document.documentElement.style.setProperty("--scale", String(s));
  };
  fit();
  window.addEventListener("resize", fit);
}
