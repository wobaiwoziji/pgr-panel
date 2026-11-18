import React from "react";

/**
 * 面板设置：外观 / 动效 / 插件位。
 * 值由 App 持有并存 localStorage，这里只负责渲染和回调。
 */
export default function Settings({ open, value, onChange, onClose, version, onOpenConfig }) {
  if (!open) return null;

  const set = (k, v) => onChange({ ...value, [k]: v });

  return (
    <div className="set-mask hit" onClick={onClose}>
      <div className="set-panel" onClick={(e) => e.stopPropagation()}>
        <header className="set-head">
          <b>面板设置</b>
          <button className="set-x" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>

        <section className="set-sec">
          <h4>外观</h4>
          <label className="set-row">
            <span>粒子数量</span>
            <input
              type="range"
              min="0"
              max="140"
              step="2"
              value={value.particles}
              onChange={(e) => set("particles", Number(e.target.value))}
            />
            <b>{value.particles}</b>
          </label>
          <label className="set-row">
            <span>网格纹理</span>
            <input type="range" min="0" max="100" step="1" value={value.grid} onChange={(e) => set("grid", Number(e.target.value))} />
            <b>{value.grid}%</b>
          </label>
          <label className="set-row">
            <span>投影光带</span>
            <input
              type="range"
              min="0"
              max="200"
              step="5"
              value={value.beam ?? 100}
              onChange={(e) => set("beam", Number(e.target.value))}
            />
            <b>{value.beam ?? 100}%</b>
          </label>
        </section>

        <section className="set-sec">
          <h4>动效</h4>
          <label className="set-row">
            <span>界面动画</span>
            <button
              className={`set-switch ${value.motion ? "on" : ""}`}
              onClick={() => set("motion", !value.motion)}
              aria-pressed={value.motion}
            >
              <i />
            </button>
            <b>{value.motion ? "开" : "关"}</b>
          </label>
          <label className="set-row">
            <span>投影粒子</span>
            <button
              className={`set-switch ${value.particleOn ? "on" : ""}`}
              onClick={() => set("particleOn", !value.particleOn)}
              aria-pressed={value.particleOn}
            >
              <i />
            </button>
            <b>{value.particleOn ? "开" : "关"}</b>
          </label>
        </section>

        <section className="set-sec">
          <h4>插件</h4>
          <div className="set-empty">
            暂无插件
            <em>后续可在这里挂载新的功能模块</em>
          </div>
        </section>

        <section className="set-sec">
          <h4>交流</h4>
          <div className="set-group">
            <div className="set-group-info">
              <b>露娜bot交流群</b>
              <span>群号 1091767355</span>
              <button
                className="set-copy"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText("1091767355");
                  } catch {
                    /* 忽略 */
                  }
                }}
              >
                复制群号
              </button>
              <em>有想法、想聊 UI、想加功能的都可以进来</em>
            </div>
            <div className="set-qr">
              <img src="./qq-group.png" alt="QQ 群二维码" draggable="false" />
            </div>
          </div>
        </section>

        <footer className="set-foot">
          <span>PGR Panel v{version}</span>
          <div className="set-foot-btns">
            <button onClick={onOpenConfig}>打开配置文件</button>
            <button className="set-quit" onClick={() => window.pgr?.quit?.()}>
              退出程序
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
