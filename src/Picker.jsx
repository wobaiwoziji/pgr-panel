import React, { useEffect, useState } from "react";

/**
 * 点选报名字：按 I 进入，点任意区块就会告诉你它是哪一个，
 * 并自动复制编号到剪贴板，直接贴给 AI 就行。
 */
export default function Picker() {
  const [on, setOn] = useState(false);
  const [log, setLog] = useState([]);
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key.toLowerCase() === "i") setOn((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("picking", on);
    return () => document.body.classList.remove("picking");
  }, [on]);

  useEffect(() => {
    if (!on) return;

    const describe = (el) => {
      const id = el.dataset.ed || "?";
      const cell = el.closest(".cell");
      let where = "";
      if (cell) {
        const cells = Array.from(document.querySelectorAll(".cell"));
        const i = cells.indexOf(cell);
        const row = Math.floor(i / 3) + 1;
        const col = (i % 3) + 1;
        const text = cell.querySelector(".cell-label")?.textContent?.trim() || "";
        where = `第${row}行 第${col}列 · ${text} · `;
      }
      const kind =
        {
          plane: "蓝色底板",
          hed: "标题条",
          media: "播放卡",
          scroll: "滚动条",
          lens: "镜头",
          dock: "收起态时间条",
        }[id] || (id.startsWith("icon-") ? "图标" : id.startsWith("box-") ? "黑块" : id.startsWith("label-") ? "标签条" : id.startsWith("quick-") ? "底部图标" : id);

      return `${where}${kind}【${id}】`;
    };

    const onClick = (e) => {
      const el = e.target.closest("[data-ed]");
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      const text = describe(el);
      setLog((l) => [text, ...l].slice(0, 8));
      setFlash(text);
      setTimeout(() => setFlash(null), 2200);
      navigator.clipboard?.writeText(text).catch(() => {});
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [on]);

  if (!on) {
    return (
      <button className="pk-toggle" onClick={() => setOn(true)} title="点选报名字 (I)">
        点选
      </button>
    );
  }

  return (
    <>
      <div className="pk-bar">
        <b>点选模式</b>
        <span>点任意区块 → 自动复制编号</span>
        <button onClick={() => setOn(false)}>退出</button>
      </div>
      {flash && <div className="pk-flash">{flash}</div>}
      {log.length > 0 && (
        <div className="pk-log">
          {log.map((t, i) => (
            <div key={i}>{t}</div>
          ))}
        </div>
      )}
    </>
  );
}
