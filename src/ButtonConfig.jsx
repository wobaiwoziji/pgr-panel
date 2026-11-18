import React, { useEffect, useState } from "react";
import "./button-config.css";

const ASSET = "./assets/_game/icons/";
const ICONS = [
  "icon_website",
  "icon_team_recommend",
  "icon_team_edit",
  "icon_cloud_gaming",
  "icon_wallpaper",
  "icon_comic",
  "icon_download",
  "icon_export",
  "icon_strategy",
  "icon_friend",
  "icon_group",
  "icon_camera",
  "icon_settings",
];

const iconSrc = (icon) => (icon && icon.startsWith("data:") ? icon : ASSET + icon + ".png");

/**
 * 右键九宫格 / 底部快捷按钮弹出的小面板：
 * 改文字、换图标、指定打开的文件或网址。
 */
export default function ButtonConfig({ target, onClose, onSaved }) {
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!target) return;
    setLabel(target.label || "");
    setIcon(target.icon || "");
    const a = target.action;
    setValue(a?.value || "");
  }, [target]);

  if (!target) return null;

  const isQuick = target.kind === "quick";

  const save = async () => {
    if (!window.pgr?.update) return onClose();
    setBusy(true);
    const v = value.trim();
    const action = v ? { type: /^https?:\/\//i.test(v) ? "url" : "path", value: v } : null;
    const patch = { icon, action };
    if (!isQuick) patch.label = label.trim();
    await window.pgr.update({ kind: target.kind, id: target.id, patch });
    setBusy(false);
    onSaved?.();
    onClose();
  };

  const pickFile = async () => {
    if (!window.pgr?.pickFile) return;
    const p = await window.pgr.pickFile();
    if (p) setValue(p);
  };

  const pickImage = async () => {
    if (!window.pgr?.pickImage) return;
    const d = await window.pgr.pickImage();
    if (d) setIcon(d);
  };

  return (
    <div className="bc-mask hit" onPointerDown={onClose}>
      <div className="bc-panel" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
        <header className="bc-head">
          <b>{isQuick ? "快捷按钮" : "按钮设置"}</b>
          <button className="bc-x" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>

        {!isQuick && (
          <label className="bc-row">
            <span>文字</span>
            <input value={label} maxLength={12} onChange={(e) => setLabel(e.target.value)} placeholder="白色标签文字" />
          </label>
        )}

        <div className="bc-title">图标</div>
        <div className="bc-icons">
          {ICONS.map((name) => (
            <button
              key={name}
              className={`bc-icon ${icon === name ? "on" : ""}`}
              onClick={() => setIcon(name)}
              title={name.replace("icon_", "")}
            >
              <img src={iconSrc(name)} alt="" draggable="false" />
            </button>
          ))}
          {icon && icon.startsWith("data:") ? (
            <button className="bc-icon on" title="自定义图片">
              <img src={icon} alt="" draggable="false" />
            </button>
          ) : null}
        </div>
        <button className="bc-link" onClick={pickImage}>
          用本地图片当图标…
        </button>

        <div className="bc-title">点击后打开</div>
        <input
          className="bc-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="C:\\程序.exe 或 https://…（留空 = 不打开）"
          spellCheck={false}
        />
        <div className="bc-actions">
          <button onClick={pickFile}>浏览…</button>
          <button onClick={() => setValue("")}>清空</button>
        </div>

        <div className="bc-foot">
          <button className="bc-cancel" onClick={onClose}>
            取消
          </button>
          <button className="bc-save" onClick={save} disabled={busy}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
