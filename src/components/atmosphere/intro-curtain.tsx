"use client";

import { useEffect, useState } from "react";
import { Moon } from "lucide-react";

/**
 * A one-time entrance: the night settles over the screen for a breath,
 * then dissolves. Shown once per browser session; skipped entirely for
 * visitors who prefer reduced motion.
 */

type CurtainState = "hidden" | "shown" | "leaving";

export default function IntroCurtain() {
  const [state, setState] = useState<CurtainState>("hidden");

  useEffect(() => {
    try {
      if (sessionStorage.getItem("luna-intro-seen")) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    } catch {
      return; // storage blocked — skip the flourish rather than force it
    }

    const timers: number[] = [];
    timers.push(
      window.setTimeout(() => setState("shown"), 120),
      window.setTimeout(() => setState("leaving"), 1750),
      window.setTimeout(() => {
        setState("hidden");
        try {
          sessionStorage.setItem("luna-intro-seen", "1");
        } catch {
          /* storage blocked — the curtain may simply return next load */
        }
      }, 2700)
    );

    // any early intent (click / key) lifts the curtain at once
    const skip = () => {
      timers.forEach((t) => window.clearTimeout(t));
      setState((cur) => (cur === "shown" ? "leaving" : cur));
      window.setTimeout(() => setState("hidden"), 900);
    };
    window.addEventListener("pointerdown", skip, { once: true });
    window.addEventListener("keydown", skip, { once: true });

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
    };
  }, []);

  if (state === "hidden") return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-[95] flex flex-col items-center justify-center bg-night-950 transition-opacity duration-[900ms] ease-out ${
        state === "shown" ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(236,226,200,0.22),transparent_70%)]" />
        <Moon className="h-10 w-10 text-moon-200 drop-shadow-[0_0_18px_rgba(236,226,200,0.6)]" strokeWidth={1.25} />
      </div>
      <p className="mt-5 font-serif text-xl uppercase tracking-[0.42em] text-moon-200">
        Luna Drift
      </p>
      <p className="mt-2.5 text-[10px] uppercase tracking-[0.5em] text-mist-600">
        the night is patient
      </p>
    </div>
  );
}
