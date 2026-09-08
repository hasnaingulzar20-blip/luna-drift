"use client";

import { useEffect, useState } from "react";
import { Sunrise, X } from "lucide-react";
import { usePlayer } from "@/store/player";

/**
 * The wake light — when the alarm fires, the whole screen slowly warms
 * from the horizon up, like dawn through a window. Dismiss to return.
 */
export default function WakeLight() {
  const waking = usePlayer((s) => s.waking);
  const wakeAlarm = usePlayer((s) => s.wakeAlarm);
  const dismissWake = usePlayer((s) => s.dismissWake);
  const [glow, setGlow] = useState(false);
  const [now, setNow] = useState("");

  // ramp the dawn in over ~70 seconds once fired
  useEffect(() => {
    if (!waking) return;
    const raf = requestAnimationFrame(() => setGlow(true));
    const fmt = () =>
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    const first = setTimeout(() => setNow(fmt()), 60);
    const t = setInterval(() => setNow(fmt()), 1000);
    return () => {
      // reset for the next dawn — cleanup runs after unmount of the glow tree
      cancelAnimationFrame(raf);
      clearTimeout(first);
      clearInterval(t);
      setGlow(false);
      setNow("");
    };
  }, [waking]);

  if (!waking) return null;

  return (
    <div
      role="alertdialog"
      aria-label="Wake light — good morning"
      className="fixed inset-0 z-[90]"
    >
      {/* the dawn itself */}
      <div
        aria-hidden="true"
        className="absolute inset-0 transition-opacity ease-in-out"
        style={{
          opacity: glow ? 1 : 0,
          transitionDuration: "70s",
          background:
            "radial-gradient(120% 70% at 50% 108%, rgba(240,185,138,0.55) 0%, rgba(224,150,89,0.32) 30%, rgba(120,80,70,0.16) 55%, transparent 78%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 transition-opacity ease-out"
        style={{
          opacity: glow ? 0.85 : 0,
          transitionDuration: "95s",
          background:
            "linear-gradient(0deg, rgba(236,180,120,0.22) 0%, rgba(180,120,90,0.10) 40%, transparent 70%)",
        }}
      />

      {/* the rising sun */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 -translate-x-1/2 transition-all ease-in-out"
        style={{
          bottom: "-16vh",
          opacity: glow ? 0.95 : 0,
          transitionDuration: "80s",
        }}
      >
        <div className="h-56 w-56 rounded-full bg-[radial-gradient(circle_at_45%_40%,#ffedcd_0%,#f0b98a_45%,rgba(224,150,89,0.4)_75%,transparent_100%)] blur-[2px]" />
        <div className="absolute inset-0 -m-16 rounded-full bg-[radial-gradient(circle,rgba(240,185,138,0.35),transparent_65%)] blur-xl" />
      </div>

      {/* copy + dismiss */}
      <div
        className={`absolute inset-x-0 bottom-[12vh] flex flex-col items-center gap-5 px-6 text-center transition-all duration-[3000ms] ease-out ${
          glow ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.35em] text-night-950/70">
          <Sunrise className="h-3.5 w-3.5" aria-hidden="true" />
          wake light · {wakeAlarm.time}
        </p>
        <h2 className="font-serif text-5xl font-light text-night-950/85 text-glow sm:text-6xl">
          Good morning
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-night-950/60">
          The light came up slowly, the way it does through curtains. When you&apos;re ready —
          and not a minute before.
        </p>
        <p className="font-mono text-4xl font-light text-night-950/75" aria-live="polite">
          {now}
        </p>
        <button
          type="button"
          onClick={dismissWake}
          className="mt-2 flex h-12 items-center gap-2 rounded-full bg-night-950/70 px-7 text-sm text-moon-100 ring-1 ring-moon-100/20 backdrop-blur-md transition hover:bg-night-950/85 hover:ring-moon-100/40"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          I&apos;m awake
        </button>
      </div>
    </div>
  );
}
