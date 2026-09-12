"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { audioEngine } from "@/lib/audio-engine";
import { usePlayer } from "@/store/player";

/**
 * Full-page weather — when a room is live, the whole night catches its climate:
 * Snowfall dusts the viewport with drifting flakes, Rain on Glass pulls thin
 * streaks of rain past the edges of the screen, and Hearth & Ember sends sparks
 * climbing the bottom of the frame. All three brighten with the live loudness
 * (--wl, fed from the audio engine's analyser). Sits between the sky and the
 * interface (z-[7]), purely decorative, respectful of reduced motion.
 */

type Weather = "snow" | "rain" | "ember" | null;

/** deterministic pseudo-random so every mount drifts the same way */
function rand(seed: number) {
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const SNOW_COUNT = 34;
const RAIN_COUNT = 20;
const EMBER_COUNT = 14;

export default function WeatherLayer() {
  const active = usePlayer((s) => s.active);
  const isPlaying = usePlayer((s) => s.isPlaying);

  const live: Weather =
    isPlaying && active === "snow"
      ? "snow"
      : isPlaying && active === "rain"
        ? "rain"
        : isPlaying && active === "fireplace"
          ? "ember"
          : null;

  // linger briefly after the weather stops so it fades rather than vanishes
  const [shown, setShown] = useState<Weather>(null);
  const [fading, setFading] = useState(false);
  const [prevLive, setPrevLive] = useState<Weather>(null);

  // render-time sync: capture the newest weather the moment it changes
  if (live !== prevLive) {
    setPrevLive(live);
    if (live) {
      setShown(live);
      setFading(false);
    } else {
      setFading(true);
    }
  }

  useEffect(() => {
    if (live || !fading) return;
    const t = window.setTimeout(() => setShown(null), 2400);
    return () => window.clearTimeout(t);
  }, [live, fading]);

  // audio-reactive brightness: a slow rAF writes the smoothed RMS into --wl
  // on the layer; every flake/streak/ember keyframe adds it into its opacity
  const layerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!live) return;
    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    let raf = 0;
    let level = 0;
    const el = layerRef.current;
    if (!el) return;
    const loop = () => {
      const target = audioEngine.getLevel();
      level += (target - level) * 0.07; // gentle easing — weather never flickers
      el.style.setProperty("--wl", level < 0.005 ? "0" : level.toFixed(3));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      el.style.setProperty("--wl", "0");
    };
  }, [live]);

  const flakes = useMemo(() => {
    if (shown !== "snow") return [];
    return Array.from({ length: SNOW_COUNT }, (_, i) => {
      const r = (n: number) => rand(i * 7 + n * 131);
      const size = 2 + r(1) * 3.6; // 2–5.6 px
      const depth = (size - 2) / 3.6; // 0 far → 1 near
      return {
        key: i,
        left: r(2) * 100,
        size,
        duration: 17 - depth * 8 + r(3) * 4, // near flakes fall faster
        delay: -r(4) * 24, // negative → the sky is already mid-snowfall
        drift: 26 + r(5) * 62, // px of sideways wander
        opacity: 0.28 + depth * 0.5,
        blur: depth < 0.34 ? 1.6 : depth < 0.7 ? 0.7 : 0,
      };
    });
  }, [shown]);

  const streaks = useMemo(() => {
    if (shown !== "rain") return [];
    return Array.from({ length: RAIN_COUNT }, (_, i) => {
      const r = (n: number) => rand(i * 11 + n * 197);
      return {
        key: i,
        left: r(1) * 100,
        length: 54 + r(2) * 62,
        duration: 1.05 + r(3) * 0.9,
        delay: -r(4) * 2.2,
        opacity: 0.14 + r(5) * 0.2,
      };
    });
  }, [shown]);

  const embers = useMemo(() => {
    if (shown !== "ember") return [];
    return Array.from({ length: EMBER_COUNT }, (_, i) => {
      const r = (n: number) => rand(i * 13 + n * 61);
      const size = 2 + r(1) * 3; // 2–5 px
      return {
        key: i,
        left: 4 + r(2) * 92, // % across the bottom edge
        size,
        duration: 7 + r(3) * 9, // 7–16 s to climb
        delay: -r(4) * 16, // negative → the hearth is already alive
        drift: (r(5) - 0.5) * 56, // px of sideways wander, both directions
        opacity: 0.3 + r(6) * 0.45,
        blur: size < 3 ? 0.6 : 0,
      };
    });
  }, [shown]);

  if (!shown) return null;

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[7] overflow-hidden motion-reduce:hidden transition-opacity duration-[2200ms] ease-out data-[fading]:opacity-0"
      data-fading={live ? undefined : "true"}
    >
      {shown === "snow" &&
        flakes.map((f) => (
          <span
            key={f.key}
            className="absolute top-0 rounded-full bg-moon-100"
            style={{
              left: `${f.left}%`,
              width: f.size,
              height: f.size,
              opacity: f.opacity,
              filter: f.blur ? `blur(${f.blur}px)` : undefined,
              boxShadow: "0 0 6px rgba(247,243,232,0.45)",
              animation: `weather-snow ${f.duration}s linear ${f.delay}s infinite`,
              willChange: "transform",
              ["--wx" as string]: `${f.drift}px`,
              ["--o" as string]: f.opacity,
            }}
          />
        ))}
      {shown === "rain" &&
        streaks.map((s) => (
          <span
            key={s.key}
            className="absolute top-0 w-px bg-gradient-to-b from-transparent via-moon-100/70 to-transparent"
            style={{
              left: `${s.left}%`,
              height: s.length,
              opacity: s.opacity,
              filter: "blur(0.4px)",
              animation: `weather-rain ${s.duration}s linear ${s.delay}s infinite`,
              willChange: "transform",
              ["--o" as string]: s.opacity,
            }}
          />
        ))}
      {shown === "ember" &&
        embers.map((e) => (
          <span
            key={e.key}
            className="absolute bottom-[-6px] rounded-full bg-ember-300"
            style={{
              left: `${e.left}%`,
              width: e.size,
              height: e.size,
              opacity: e.opacity,
              filter: e.blur ? `blur(${e.blur}px)` : undefined,
              boxShadow: "0 0 8px rgba(240,163,86,0.65), 0 0 2px rgba(255,214,158,0.9)",
              animation: `weather-ember ${e.duration}s linear ${e.delay}s infinite`,
              willChange: "transform, opacity",
              ["--wx" as string]: `${e.drift}px`,
              ["--o" as string]: e.opacity,
            }}
          />
        ))}
    </div>
  );
}
