"use client";

import { useEffect, useMemo, useState } from "react";
import { usePlayer } from "@/store/player";

/**
 * Full-page weather — when a room is live, the whole night catches its climate:
 * Snowfall dusts the viewport with drifting flakes, Rain on Glass pulls thin
 * streaks of rain past the edges of the screen. Sits between the sky and the
 * interface (z-[7]), purely decorative, respectful of reduced motion.
 */

type Weather = "snow" | "rain" | null;

/** deterministic pseudo-random so every mount drifts the same way */
function rand(seed: number) {
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const SNOW_COUNT = 34;
const RAIN_COUNT = 20;

export default function WeatherLayer() {
  const active = usePlayer((s) => s.active);
  const isPlaying = usePlayer((s) => s.isPlaying);

  const live: Weather =
    isPlaying && active === "snow" ? "snow" : isPlaying && active === "rain" ? "rain" : null;

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

  if (!shown) return null;

  return (
    <div
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
    </div>
  );
}
