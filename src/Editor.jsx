import React, { useCallback, useEffect, useRef, useState } from "react";

const STORE = "pgr-layout";

/**
 * 直接拖拽编辑器：按 E 进入。
 * 拖元素 = 移动 · 拖四角 = 等比缩放 · 拖顶部圆柄 = 旋转 · Shift 吸附 15°
 */
export default function Editor() {
  const [on, setOn] = useState(false);
  const [sel, setSel] = useState(null);
  const [box, setBox] = useState(null);
  const [copied, setCopied] = useState(false);
  const [ids, setIds] = useState([]);
  const [edits, setEdits] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORE) || "{}");
    } catch {
      return {};
    }
  });
  const elRef = useRef(null);
  const selRef = useRef(null);
  const editsRef = useRef(edits);
  editsRef.current = edits;

  /* ── 快捷键 ── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key.toLowerCase() === "e") setOn((v) => !v);
      if (e.key === "Escape") {
        setSel(null);
        selRef.current = null;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ── 写回 CSS 变量 ── */
  const apply = useCallback((id, v) => {
    const el = document.querySelector(`[data-ed="${id}"]`);
    if (!el) return;
    el.style.setProperty("--edx", `${v.dx || 0}px`);
    el.style.setProperty("--edy", `${v.dy || 0}px`);
    el.style.setProperty("--erot", `${v.rot || 0}deg`);
    el.style.setProperty("--esc", `${v.sc || 1}`);
    el.style.setProperty("--eskx", `${v.skx || 0}deg`);
    el.style.setProperty("--esky", `${v.sky || 0}deg`);
  }, []);

  useEffect(() => {
    document.querySelectorAll("[data-ed]").forEach((el) => {
      const v = edits[el.dataset.ed];
      if (v) apply(el.dataset.ed, v);
    });
    localStorage.setItem(STORE, JSON.stringify(edits));
  }, [edits, apply]);

  /* ── 选中框跟随 ── */
  const syncBox = useCallback(() => {
    const id = selRef.current;
    const el = id ? document.querySelector(`[data-ed="${id}"]`) : null;
    if (!el) {
      setBox(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setBox({ x: r.x, y: r.y, w: r.width, h: r.height });
  }, []);

  useEffect(() => {
    syncBox();
    if (!on) return;
    const id = setInterval(syncBox, 120);
    window.addEventListener("scroll", syncBox, true);
    window.addEventListener("resize", syncBox);
    return () => {
      clearInterval(id);
      window.removeEventListener("scroll", syncBox, true);
      window.removeEventListener("resize", syncBox);
    };
  }, [on, sel, syncBox]);

  /* ── 拖动 / 缩放 / 旋转 ── */
  const start = useCallback(
    (e, mode) => {
      const el = elRef.current;
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();

      const id = el.dataset.ed;
      const cur = editsRef.current[id] || { dx: 0, dy: 0, rot: 0, sc: 1 };
      const rect = el.getBoundingClientRect();
      const scale = rect.width / el.offsetWidth || 1;
      const cx = rect.x + rect.width / 2;
      const cy = rect.y + rect.height / 2;
      const d0 = Math.hypot(e.clientX - cx, e.clientY - cy) || 1;
      const a0 = Math.atan2(e.clientY - cy, e.clientX - cx);
      const p0 = { x: e.clientX, y: e.clientY };

      const move = (ev) => {
        const next = { ...cur };
        if (mode === "move") {
          next.dx = Math.round(cur.dx + (ev.clientX - p0.x) / scale);
          next.dy = Math.round(cur.dy + (ev.clientY - p0.y) / scale);
        } else if (mode === "scale") {
          const d = Math.hypot(ev.clientX - cx, ev.clientY - cy);
          next.sc = Math.max(0.2, Math.min(4, +(cur.sc * (d / d0)).toFixed(3)));
        } else {
          const a = Math.atan2(ev.clientY - cy, ev.clientX - cx);
          let deg = cur.rot + ((a - a0) * 180) / Math.PI;
          if (ev.shiftKey) deg = Math.round(deg / 15) * 15;
          next.rot = Math.round(deg);
        }
        apply(id, next);
        editsRef.current = { ...editsRef.current, [id]: next };
        setEdits(editsRef.current);
        syncBox();
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [apply, syncBox]
  );

  useEffect(() => {
    if (!on) return;
    const onDown = (e) => {
      if (e.target.closest(".ed-ui")) return;
      const el = e.target.closest("[data-ed]");
      if (!el) {
        selRef.current = null;
        setSel(null);
        return;
      }
      elRef.current = el;
      selRef.current = el.dataset.ed;
      setSel(el.dataset.ed);
      start(e, "move");
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [on, start]);

  useEffect(() => {
    document.body.classList.toggle("editing", on);
    if (on) {
      setIds(Array.from(document.querySelectorAll("[data-ed]")).map((el) => el.dataset.ed));
    } else {
      selRef.current = null;
      setSel(null);
    }
    return () => document.body.classList.remove("editing");
  }, [on]);

  const pick = (id) => {
    const el = document.querySelector(`[data-ed="${id}"]`);
    if (!el) return;
    elRef.current = el;
    selRef.current = id;
    setSel(id);
    syncBox();
  };

  const resetSel = () => {
    if (!sel) return;
    const next = { ...editsRef.current };
    delete next[sel];
    editsRef.current = next;
    setEdits(next);
    const el = document.querySelector(`[data-ed="${sel}"]`);
    if (el) {
      ["--edx", "--edy", "--erot", "--esc"].forEach((k) => el.style.removeProperty(k));
    }
    syncBox();
  };

  if (!on) {
    return (
      <button className="ed-toggle ed-ui" onClick={() => setOn(true)} title="拖拽编辑 (E)">
        编辑
      </button>
    );
  }

  const cur = (sel && edits[sel]) || { dx: 0, dy: 0, rot: 0, sc: 1 };

  return (
    <>
      <div className="ed-bar ed-ui">
        <select
          className="ed-ui ed-pick"
          value={sel || ""}
          onChange={(e) => pick(e.target.value)}
        >
          <option value="">选择元素…</option>
          {ids.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <span className="ed-nums">
          {Math.round(cur.dx)} , {Math.round(cur.dy)} px · {cur.sc}× · {cur.rot}°
        </span>
        <button
          className="ed-ui"
          onClick={() => {
            navigator.clipboard?.writeText(JSON.stringify(edits, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? "已复制" : "复制 JSON"}
        </button>
        <button className="ed-ui" onClick={resetSel}>
          复位选中
        </button>
        <button
          className="ed-ui"
          onClick={() => {
            localStorage.removeItem(STORE);
            location.reload();
          }}
        >
          重置全部
        </button>
        <button className="ed-ui" onClick={() => setOn(false)}>
          退出
        </button>
      </div>

      {box && (
        <div className="ed-frame ed-ui" style={{ left: box.x, top: box.y, width: box.w, height: box.h }}>
          <span className="ed-handle tl ed-ui" onPointerDown={(e) => start(e, "scale")} />
          <span className="ed-handle tr ed-ui" onPointerDown={(e) => start(e, "scale")} />
          <span className="ed-handle bl ed-ui" onPointerDown={(e) => start(e, "scale")} />
          <span className="ed-handle br ed-ui" onPointerDown={(e) => start(e, "scale")} />
          <span className="ed-rot ed-ui" onPointerDown={(e) => start(e, "rot")} />
        </div>
      )}

      {sel && (
        <div className="ed-props ed-ui">
          <div className="ed-props-head">{sel}</div>
          {[
            { k: "skx", label: "倾斜 X", min: -30, max: 30, step: 0.5, unit: "deg", def: 0 },
            { k: "sky", label: "倾斜 Y", min: -30, max: 30, step: 0.5, unit: "deg", def: 0 },
            { k: "rot", label: "旋转", min: -180, max: 180, step: 1, unit: "deg", def: 0 },
            { k: "sc", label: "缩放", min: 0.2, max: 3, step: 0.05, unit: "×", def: 1 },
            { k: "dx", label: "左右", min: -300, max: 300, step: 1, unit: "px", def: 0 },
            { k: "dy", label: "上下", min: -300, max: 300, step: 1, unit: "px", def: 0 },
          ].map((f) => (
            <label className="ed-prop" key={f.k}>
              <span>{f.label}</span>
              <input
                type="range"
                min={f.min}
                max={f.max}
                step={f.step}
                value={cur[f.k] ?? f.def}
                onChange={(e) => {
                  const next = { ...cur, [f.k]: Number(e.target.value) };
                  apply(sel, next);
                  editsRef.current = { ...editsRef.current, [sel]: next };
                  setEdits(editsRef.current);
                  syncBox();
                }}
              />
              <b>
                {cur[f.k] ?? f.def}
                {f.unit}
              </b>
            </label>
          ))}
          <button
            className="ed-ui ed-prop-reset"
            onClick={() => {
              const next = { ...editsRef.current };
              delete next[sel];
              editsRef.current = next;
              setEdits(next);
              const el = document.querySelector(`[data-ed="${sel}"]`);
              if (el) ["--edx", "--edy", "--erot", "--esc", "--eskx", "--esky"].forEach((k) => el.style.removeProperty(k));
              syncBox();
            }}
          >
            复位这个元素
          </button>
        </div>
      )}
    </>
  );
}
