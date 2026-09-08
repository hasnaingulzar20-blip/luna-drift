"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "@/store/player";

/**
 * The moon rides an arc across the top of the page at a 12-hour pace,
 * driven purely by the clock — independent of any session.
 * Tapping it toggles full-bleed immersion.
 */
export default function MoonArc() {
  const toggleImmersive = usePlayer((s) => s.toggleImmersive);
  const immersive = usePlayer((s) => s.immersive);
  const [pos, setPos] = useState({ x: 50, y: 18, fraction: 0.5 });

  useEffect(() => {
    const compute = () => {
      const now = new Date();
      const hours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
      // rises at 18:00, zenith at midnight, sets at 06:00 — a 12-hour traverse
      const fraction = ((hours - 18 + 24) % 12) / 12;
      const x = -8 + fraction * 116; // viewport %
      const y = 84 - Math.sin(Math.PI * fraction) * 70; // viewport-height %
      setPos({ x, y, fraction });
    };
    const raf = requestAnimationFrame(compute);
    const t = setInterval(compute, 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(t);
    };
  }, []);

  const waxing = pos.fraction < 0.5;

  return (
    <>
      {/* faint trajectory arc */}
      <svg
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[1] h-[60vh] w-full"
        viewBox="0 0 100 60"
        preserveAspectRatio="none"
      >
        <path
          d="M -6 52 Q 50 -14 106 52"
          fill="none"
          stroke="rgba(205,180,124,0.10)"
          strokeWidth="0.18"
          strokeDasharray="1.2 2.2"
          strokeLinecap="round"
        />
      </svg>

      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-[2] transition-all duration-1000 ease-linear"
        style={{
          left: `${pos.x}%`,
          top: `${pos.y}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        {/* halo */}
        <div className="anim-breathe absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(205,180,124,0.16)_0%,rgba(143,161,196,0.07)_45%,transparent_70%)]" />

        <button
          type="button"
          onClick={toggleImmersive}
          aria-label={immersive ? "Exit immersive mode" : "Enter immersive mode — hide interface"}
          aria-pressed={immersive}
          className="group relative block h-16 w-16 cursor-pointer rounded-full outline-none transition-transform duration-700 hover:scale-110 focus-visible:ring-2 focus-visible:ring-moon-300/60 sm:h-20 sm:w-20"
          title="Tap for true full-bleed immersion"
        >
          <span className="moon-glow block h-full w-full rounded-full bg-[radial-gradient(circle_at_38%_36%,#f9f4e6_0%,#ece2c8_42%,#d6c193_78%,#c3ab7c_100%)] transition-shadow duration-700" />
          {/* crescent shadow */}
          <span
            className="absolute inset-0 rounded-full bg-night-950/85"
            style={{
              clipPath: waxing
                ? "ellipse(58% 96% at 24% 44%)"
                : "ellipse(58% 96% at 76% 44%)",
              filter: "blur(1px)",
              opacity: 0.92,
            }}
          />
          {/* craters */}
          <span aria-hidden="true" className="absolute left-[30%] top-[30%] h-[7%] w-[7%] rounded-full bg-[#c9b284]/60" />
          <span aria-hidden="true" className="absolute left-[52%] top-[22%] h-[5%] w-[5%] rounded-full bg-[#c9b284]/50" />
          <span aria-hidden="true" className="absolute left-[42%] top-[54%] h-[9%] w-[9%] rounded-full bg-[#c9b284]/40" />
          {/* hint ring on hover */}
          <span className="absolute -inset-2 rounded-full border border-moon-200/0 transition-all duration-500 group-hover:border-moon-200/25 group-hover:shadow-[0_0_30px_rgba(236,226,200,0.25)]" />
        </button>

        {/* phase caption in immersive mode keeps a whisper of context */}
        <span className="pointer-events-none absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap font-serif text-[11px] italic tracking-widest text-moon-200/50 opacity-0 transition-opacity duration-1000 [.immersive_&]:opacity-100">
          tap to return
        </span>
      </div>
    </>
  );
}
