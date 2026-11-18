import React, { useEffect, useRef } from "react";

/**
 * 投影粒子：从镜头位置向上飘的光点。
 * 画布与设计画布同尺寸（760×892），完全屏幕对齐，不参与倾斜。
 */
const W = 760;
const H = 892;
const ORIGIN = { x: 631, y: 835 };
const DEFAULT_COUNT = 72;

export default function Particles({ active = true, count = DEFAULT_COUNT }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !active) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const rnd = (a, b) => a + Math.random() * (b - a);

    const spawn = (born) => {
      const a = rnd(-2.35, -1.45); // 朝上方偏左
      const speed = rnd(34, 96);
      return {
        x: ORIGIN.x + rnd(-26, 26),
        y: ORIGIN.y + rnd(-16, 16),
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        r: rnd(1, 3),
        life: rnd(1.8, 3.6),
        born,
        wob: rnd(0.4, 1.4),
        phase: rnd(0, Math.PI * 2),
      };
    };

    let t0 = performance.now();
    let ps = Array.from({ length: Math.max(0, count) }, () => spawn(t0 - Math.random() * 2500));
    let raf = 0;

    const frame = (now) => {
      const dt = Math.min(64, now - t0) / 1000;
      t0 = now;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";

      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        const age = (now - p.born) / 1000;
        if (age > p.life) {
          ps[i] = spawn(now);
          continue;
        }
        p.x += (p.vx + Math.sin(now / 900 + p.phase) * 8 * p.wob) * dt;
        p.y += p.vy * dt;

        const k = age / p.life;
        const alpha = Math.sin(Math.PI * k) * 0.85;
        ctx.beginPath();
        ctx.fillStyle = `rgba(150, 205, 255, ${alpha.toFixed(3)})`;
        ctx.arc(p.x, p.y, p.r * (1 - k * 0.35), 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active, count]);

  if (!active) return null;
  return <canvas className="particles" ref={ref} />;
}
