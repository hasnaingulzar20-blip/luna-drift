"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  warm: boolean;
}

/** A faint trailing light that follows the cursor through the dark. */
export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particles: Particle[] = [];
    let raf = 0;
    let lastEmit = 0;

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastEmit < 16) return;
      lastEmit = now;
      particles.push({
        x: e.clientX + (Math.random() - 0.5) * 4,
        y: e.clientY + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 12,
        vy: -6 - Math.random() * 14,
        life: 0,
        maxLife: 0.55 + Math.random() * 0.5,
        size: 1.4 + Math.random() * 2.6,
        warm: Math.random() < 0.6,
      });
      if (particles.length > 90) particles = particles.slice(-90);
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      particles = particles.filter((p) => p.life < p.maxLife);
      for (const p of particles) {
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
        const t = p.life / p.maxLife;
        const fade = Math.sin(Math.PI * t);
        const alpha = 0.34 * fade;
        const r = p.size * (1 + t * 1.6);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
        if (p.warm) {
          g.addColorStop(0, `rgba(236, 226, 200, ${alpha})`);
          g.addColorStop(0.4, `rgba(205, 180, 124, ${alpha * 0.4})`);
        } else {
          g.addColorStop(0, `rgba(214, 224, 250, ${alpha})`);
          g.addColorStop(0.4, `rgba(143, 161, 196, ${alpha * 0.4})`);
        }
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[70]"
    />
  );
}
