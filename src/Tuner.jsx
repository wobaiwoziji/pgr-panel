import React, { useEffect, useState } from "react";

/* 可视化调参面板：按 T 开关，拖动即时生效，点「复制」把值贴给 AI */
const CONTROLS = [
  { key: "--v-cell-skew", label: "格子斜率", min: -14, max: 0, step: 0.05, unit: "deg" },
  { key: "--v-panel-skew", label: "标题/卡片/滚动条斜率", min: -14, max: 0, step: 0.05, unit: "deg" },
  { key: "--v-hed-tilt", label: "标题横向", min: -8, max: 4, step: 0.05, unit: "deg" },
  { key: "--v-media-tilt", label: "卡片横向", min: -8, max: 4, step: 0.05, unit: "deg" },
  { key: "--v-row1", label: "第一行横向", min: -3, max: 6, step: 0.05, unit: "deg" },
  { key: "--v-row2", label: "第二行横向", min: -3, max: 6, step: 0.05, unit: "deg" },
  { key: "--v-row3", label: "第三行横向", min: -3, max: 6, step: 0.05, unit: "deg" },
  { key: "--v-box-h", label: "黑块高度", min: 70, max: 130, step: 1, unit: "px" },
  { key: "--v-label-h", label: "标签条高度", min: 28, max: 56, step: 1, unit: "px" },
  { key: "--v-scroll-x", label: "滚动条位置", min: 540, max: 640, step: 1, unit: "px" },
];

const STORE = "pgr-tune";

function readStored() {
  try {
    return JSON.parse(localStorage.getItem(STORE) || "{}");
  } catch {
    return {};
  }
}

export default function Tuner() {
  const [show, setShow] = useState(false);
  const [vals, setVals] = useState(() => {
    const saved = readStored();
    const root = getComputedStyle(document.documentElement);
    const out = {};
    for (const c of CONTROLS) {
      const fallback = parseFloat(root.getPropertyValue(c.key)) || 0;
      out[c.key] = typeof saved[c.key] === "number" ? saved[c.key] : fallback;
    }
    return out;
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "t" || e.key === "T") {
        if (e.target instanceof HTMLInputElement) return;
        setShow((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    for (const c of CONTROLS) {
      document.documentElement.style.setProperty(c.key, `${vals[c.key]}${c.unit}`);
    }
    localStorage.setItem(STORE, JSON.stringify(vals));
  }, [vals]);

  if (!show) {
    return (
      <button className="tuner-toggle" onClick={() => setShow(true)} title="调参面板 (T)">
        调参
      </button>
    );
  }

  const css = CONTROLS.map((c) => `${c.key}: ${vals[c.key]}${c.unit};`).join("\n");

  return (
    <div className="tuner">
      <div className="tuner-head">
        <span>调参面板</span>
        <button onClick={() => setShow(false)}>×</button>
      </div>

      {CONTROLS.map((c) => (
        <label className="tuner-row" key={c.key}>
          <span className="tuner-name">{c.label}</span>
          <input
            type="range"
            min={c.min}
            max={c.max}
            step={c.step}
            value={vals[c.key]}
            onChange={(e) => setVals((v) => ({ ...v, [c.key]: Number(e.target.value) }))}
          />
          <span className="tuner-val">
            {vals[c.key]}
            {c.unit}
          </span>
        </label>
      ))}

      <div className="tuner-actions">
        <button
          onClick={() => {
            navigator.clipboard?.writeText(css);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? "已复制" : "复制数值"}
        </button>
        <button
          onClick={() => {
            localStorage.removeItem(STORE);
            location.reload();
          }}
        >
          重置
        </button>
      </div>
    </div>
  );
}
