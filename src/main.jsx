import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./panel.css";
import "./tuner.css";
import "./editor.css";
import "./picker.css";
import "./compare.css";
import Tuner from "./Tuner.jsx";
import Editor from "./Editor.jsx";
import Picker from "./Picker.jsx";
import Compare from "./Compare.jsx";
import Particles from "./Particles.jsx";

const ASSET = "./assets/_game/icons/";
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
  const [bar, setBar] = useState({ top: 0, range: 0, ratio: 1 });
  const { time, date } = useClock();
  const gridRef = useRef(null);
  const panel = cfg.panel || FALLBACK.panel;

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
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 读取系统「正在播放」
  useEffect(() => {
    if (!window.pgr?.nowPlaying) return;
    let alive = true;
    const tick = async () => {
      try {
        const r = await window.pgr.nowPlaying();
        if (!alive) return;
        if (r?.ok && (r.title || r.cover)) {
          setNp({ title: r.title || "", artist: r.artist || "", cover: r.cover || "", playing: !!r.playing });
        } else {
          setNp({ title: "", artist: "", cover: "", playing: false });
        }
      } catch {
        /* 忽略 */
      }
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const toggle = useCallback(() => setOpen((v) => !v), []);

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
    <div className="stage">
      <div className={`holo hit ${open ? "is-open" : ""}`}>
        {/* 唯一做倾斜的一层；里面全是正矩形 */}
        <div className="tilt" data-ed="tilt">
          <Particles active={open} />

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
              <span className={`cover ${np.cover ? "has-img" : ""}`}>
                {np.cover ? (
                  <img className={np.playing ? "spin" : ""} src={np.cover} alt="" draggable="false" />
                ) : null}
              </span>
              <span className="media-text">
                <b>正在播放</b>
                <i>{np.title || panel.media?.title}</i>
                {np.artist ? <u>{np.artist}</u> : null}
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
                      >
                        <span className="cell-box" data-ed={`box-${b.id}`}>
                          <img src={ASSET + b.icon + ".png"} alt="" draggable="false" data-ed={`icon-${b.id}`} />
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
                <button key={q.id} onClick={(e) => run(e, q.id)} title={q.id}>
                  <img src={ASSET + q.icon + ".png"} alt="" draggable="false" data-ed={`quick-${q.id}`} />
                </button>
              ))}
            </div>
          </div>

          {/* 镜头跟着面板一起，贴在右下角 */}
          <div className="lens hit" data-ed="lens" onClick={toggle}>
            <i className="l-ring" />
            <i className="l-petals" />
            <i className="l-core" />
          </div>
        </div>
      </div>

      <button className={`dock hit ${open ? "is-hidden" : ""}`} data-ed="dock" onClick={toggle}>
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
