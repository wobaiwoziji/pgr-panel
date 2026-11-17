import React, { useState } from "react";

/**
 * 对照校准：把参考帧垫在面板正下方（同一 760×892 画布），
 * 你可以一边看一边调 T 面板的滑杆，直到完全贴合，再把数值发出来。
 */
export default function Compare() {
  const [op, setOp] = useState(55);
  const [on, setOn] = useState(true);
  const [blink, setBlink] = useState(false);

  return (
    <>
      {on && (
        <img
          className={`ref-under ${blink ? "blink" : ""}`}
          src="./ref/open.png"
          alt=""
          style={{ opacity: op / 100 }}
          draggable="false"
        />
      )}
      <div className="cmp-bar">
        <b>对照模式</b>
        <label>
          参考图
          <input
            type="range"
            min="0"
            max="100"
            value={op}
            onChange={(e) => setOp(Number(e.target.value))}
          />
          <em>{op}%</em>
        </label>
        <button onClick={() => setOn((v) => !v)}>{on ? "关掉底图" : "显示底图"}</button>
        <button onClick={() => setBlink((v) => !v)}>{blink ? "停止闪烁" : "闪烁对比"}</button>
        <span className="cmp-hint">按 T 调滑杆对齐 · 按 I 点选查编号</span>
      </div>
    </>
  );
}
