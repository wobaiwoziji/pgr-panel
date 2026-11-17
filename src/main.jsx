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
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [bar, setBar] = useState({ top: 0, range: 0, ratio: 1 });
  const { time, date } = useClock();
  const gridRef = useRef(null);
  const panel = cfg.panel || FALLBACK.panel;

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (window.pgr) {
        const c = await window.pgr.getConfig();
        if (!alive) return;
        if (c?.panel) setCfg(c);
        const s = c?.runtime?.scale;
        if (s && s > 0 && s !== 1) document.documentElement.style.setProperty("--scale", String(s));
        return;
      }
      try {
        const r = await fetch("/config.json");
        if (r.ok) {
          const c = await r.json();
          if (alive && c?.panel) setCfg(c);
        }
      } catch {
        /* 预览用内置数据 */
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

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
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  // ── 九宫格：滚轮滚动 + 白色滑块的滚动条 ──
  const rows = [];
  for (let i = 0; i < (panel.buttons || []).length; i += 3) {
    rows.push((panel.buttons || []).slice(i, i + 3));
  }

  const GRID_H = 413;

  useEffect(() => {
    const el = gridRef.current;
    if (!el || !el.scrollHeight) return;
    setBar({
      top: el.scrollTop,
      range: Math.max(0, el.scrollHeight - el.clientHeight),
      ratio: el.clientHeight / el.scrollHeight,
    });
  }, [panel.buttons]);

  const onScroll = (e) => {
    const el = e.currentTarget;
    const range = Math.max(1, el.scrollHeight - el.clientHeight);
    setBar({ top: el.scrollTop, range, ratio: el.clientHeight / el.scrollHeight });
  };

  const thumbH = Math.max(40, GRID_H * bar.ratio);
  const thumbTop = bar.range > 0 ? (bar.top / bar.range) * (GRID_H - thumbH) : 0;

  const dragThumb = (e) => {
    const el = gridRef.current;
    if (!el) return;
    e.preventDefault();
    const scale = el.getBoundingClientRect().height / el.offsetHeight || 1;
    const startY = e.clientY;
    const startTop = el.scrollTop;
    const maxTop = Math.max(1, GRID_H - thumbH);
    const move = (ev) => {
      el.scrollTop = startTop + (((ev.clientY - startY) / scale) / maxTop) * bar.range;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

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

  return (
    <div className="stage">
      <div className={`holo hit ${open ? "is-open" : ""}`}>
        <div className="tilt">
          <div className="plane" data-ed="plane" />
          <i className="ray" style={{ left: 638, top: 94, width: 718, transform: "rotate(89.68deg)" }} />
          <i className="ray" style={{ left: 536, top: 865, width: 118, transform: "rotate(-26.6deg)" }} />

          <div className="hed" data-ed="hed">
            <span className="hed-time">{time}</span>
            <span className="hed-date">{date}</span>
          </div>

          <div className="body">
            <div className="media" data-ed="media">
              <div className="cover" />
              <div className="media-text">
                <div className="media-status">{panel.media?.status}</div>
                <div className="media-title">{panel.media?.title}</div>
              </div>
            </div>

            <div className="grid" ref={gridRef} onScroll={onScroll}>
              <div className="track">
                {rows.map((row, ri) => (
                  <div className="row" key={ri}>
                    {row.map((b) => (
                      <button className="cell" key={b.id} onClick={(e) => run(e, b.id)} aria-label={b.label || b.id}>
                        <span className="cell-box" data-ed={`box-${b.id}`}>
                          <img
                            src={ASSET + b.icon + ".png"}
                            alt=""
                            draggable="false"
                            data-ed={`icon-${b.id}`}
                          />
                        </span>
                        {b.label ? (
                          <span className="cell-label" data-ed={`label-${b.id}`}>
                            <span className="cell-label-text">{b.label}</span>
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="scroll" data-ed="scroll">
              <div className="scroll-track" />
              <div
                className="scroll-thumb"
                style={{ top: thumbTop, height: thumbH }}
                onPointerDown={dragThumb}
              />
            </div>

            <div className="quick">
              {(panel.quick || []).map((q) => (
                <button key={q.id} onClick={(e) => run(e, q.id)} title={q.id}>
                  <img
                    src={ASSET + q.icon + ".png"}
                    alt=""
                    draggable="false"
                    data-ed={`quick-${q.id}`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button type="button" className="lens hit" data-ed="lens" onClick={toggle} aria-label={open ? "收起面板" : "展开面板"}>
        <i className="l-ring" />
        <i className="l-petals" />
        <i className="l-core" />
      </button>

      <button data-ed="dock" className={`dock hit ${open ? "is-hidden" : ""}`} onClick={toggle}>
        <span className="dock-time">{time}</span>
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
