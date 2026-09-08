"use client";

import { useEffect, useRef } from "react";
import { usePlayer } from "@/store/player";
import { audioEngine } from "@/lib/audio-engine";

interface Star {
  x: number;
  y: number;
  r: number;
  baseAlpha: number;
  phase: number;
  speed: number;
  warm: boolean;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

/**
 * Full-viewport starfield. Twinkle intensity is driven by the player store's
 * starIntensity, which gently dims as the sleep timer drains.
 */
export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let stars: Star[] = [];
    let shooters: ShootingStar[] = [];
    let nextShooter = performance.now() + 6000;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const seed = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const count = Math.min(460, Math.round((w * h) / 4200));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() < 0.85 ? Math.random() * 1.1 + 0.3 : Math.random() * 1.6 + 1,
        baseAlpha: Math.random() * 0.55 + 0.25,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.9 + 0.25,
        warm: Math.random() < 0.18,
      }));
    };

    seed();
    window.addEventListener("resize", seed);

    let last = performance.now();
    let audioLevel = 0;
    let lastAudioSample = 0;
    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const intensity = usePlayer.getState().starIntensity;

      // audio-reactive shimmer: sample the live soundscape ~10×/s and ease
      // toward it, so the sky breathes with the room that is playing
      if (now - lastAudioSample > 100) {
        lastAudioSample = now;
        const target = usePlayer.getState().isPlaying ? audioEngine.getLevel() : 0;
        audioLevel += (target - audioLevel) * 0.25;
      }
      const shimmer = audioLevel;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // slow drift
      const drift = reduced ? 0 : 2.2 * dt;

      for (const s of stars) {
        s.y += drift * (0.4 + s.r * 0.4);
        if (s.y > h + 2) s.y = -2;
        const tw = 0.62 + 0.38 * Math.sin(now * 0.001 * s.speed + s.phase);
        // bigger stars answer the sound a little more than faint ones
        const boost = 1 + shimmer * 0.55 * (0.45 + s.r * 0.4);
        const alpha = Math.min(1, s.baseAlpha * tw * intensity * boost);
        if (alpha <= 0.015) continue;
        const r = s.r * (1 + shimmer * 0.3);
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fillStyle = s.warm
          ? `rgba(236, 226, 200, ${alpha})`
          : `rgba(214, 224, 250, ${alpha})`;
        ctx.fill();
        // faint halo on the brightest few — warms further while sound flows
        if (s.r > 1.4) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, r * 3.2, 0, Math.PI * 2);
          ctx.fillStyle = s.warm
            ? `rgba(205, 180, 124, ${alpha * (0.08 + shimmer * 0.12)})`
            : `rgba(160, 178, 220, ${alpha * (0.07 + shimmer * 0.11)})`;
          ctx.fill();
        }
      }

      // shooting stars — rarer and slower as the night winds down
      if (!reduced && now > nextShooter) {
        nextShooter = now + (6000 + Math.random() * 16000) / Math.max(intensity, 0.4);
        const fromLeft = Math.random() < 0.5;
        shooters.push({
          x: fromLeft ? Math.random() * w * 0.3 : w * (0.7 + Math.random() * 0.3),
          y: Math.random() * h * 0.35,
          vx: (fromLeft ? 1 : -1) * (260 + Math.random() * 160),
          vy: 120 + Math.random() * 80,
          life: 0,
          maxLife: 0.9 + Math.random() * 0.5,
        });
      }
      shooters = shooters.filter((sh) => sh.life < sh.maxLife);
      for (const sh of shooters) {
        sh.life += dt;
        sh.x += sh.vx * dt;
        sh.y += sh.vy * dt;
        const p = sh.life / sh.maxLife;
        const fade = Math.sin(Math.PI * Math.min(p, 1));
        const tail = 90 + 60 * fade;
        const grad = ctx.createLinearGradient(sh.x, sh.y, sh.x - (sh.vx / Math.hypot(sh.vx, sh.vy)) * tail, sh.y - (sh.vy / Math.hypot(sh.vx, sh.vy)) * tail);
        grad.addColorStop(0, `rgba(240, 240, 255, ${0.75 * fade * intensity})`);
        grad.addColorStop(1, "rgba(240, 240, 255, 0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(sh.x - (sh.vx / Math.hypot(sh.vx, sh.vy)) * tail, sh.y - (sh.vy / Math.hypot(sh.vx, sh.vy)) * tail);
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", seed);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
