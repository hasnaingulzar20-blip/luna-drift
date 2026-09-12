"use client";

import { useEffect, useRef, useState } from "react";
import { getMoonPhase, nightsUntilFullMoon } from "@/lib/moon";

/**
 * A tiny CSS moon that shows tonight's actual phase — a lit disc with a
 * shadow disc sliding across it. Crude astronomy, honest silhouette.
 * The shadow is placed by direct DOM write after mount: phase math differs
 * by float dust between server and client, and hydration must never have
 * to fight over a style attribute.
 */
function MoonDisc({ illumination, waxing }: { illumination: number; waxing: boolean }) {
  const shadowRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = shadowRef.current;
    if (!el) return;
    const d = Math.round((1 - illumination) * 200); // % of the disc to slide the shadow
    el.style.transform = `translateX(${waxing ? -d : d}%)`;
    el.style.opacity = "1";
  }, [illumination, waxing]);
  return (
    <span
      aria-hidden="true"
      className="relative mt-0.5 inline-block h-[18px] w-[18px] shrink-0 overflow-hidden rounded-full bg-moon-100/90 shadow-[0_0_9px_rgba(236,226,200,0.45)]"
    >
      <span
        ref={shadowRef}
        className="absolute inset-0 rounded-full opacity-0 transition-[transform,opacity] duration-700"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, rgba(10,14,28,0.96), rgba(6,9,20,1))",
        }}
      />
    </span>
  );
}

export default function SiteFooter() {
  // computed lazily on first render — the phase drifts slowly enough
  // that a per-mount read is all the footer needs
  const [moon] = useState(() => {
    const p = getMoonPhase();
    const full = nightsUntilFullMoon();
    return { name: p.name, illumination: p.illumination, full, waxing: p.phase < 0.5 };
  });

  return (
    <footer className="mt-auto">
      <div className="mx-auto max-w-6xl px-5 pb-8 pt-16">
        <div className="hairline" />
        <div className="mt-7 flex flex-col items-center justify-between gap-5 pb-[env(safe-area-inset-bottom)] sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-moon-200/10 ring-1 ring-moon-200/25">
              <span className="block h-3 w-3 rounded-full bg-moon-200 shadow-[0_0_10px_rgba(236,226,200,0.6)]" />
            </span>
            <span className="font-serif text-base tracking-wide text-moon-100">
              Luna <span className="italic text-moon-300">Drift</span>
            </span>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-mist-400">
            <a href="#tonight" className="transition hover:text-moon-200">Tonight</a>
            <a href="#library" className="transition hover:text-moon-200">Library</a>
            <a href="#mixer" className="transition hover:text-moon-200">Mixer</a>
            <a href="#stories" className="transition hover:text-moon-200">Stories</a>
            <a href="#breathe" className="transition hover:text-moon-200">Breathe</a>
            <a href="#timer" className="transition hover:text-moon-200">Timer</a>
            <a href="#journal" className="transition hover:text-moon-200">Journal</a>
          </nav>

          <p className="text-center text-[11px] italic leading-relaxed text-mist-500">
            sleep well — the moon keeps watch
            <span className="mt-0.5 flex items-center justify-center gap-1.5 not-italic text-mist-500" suppressHydrationWarning>
              <MoonDisc illumination={moon.illumination} waxing={moon.waxing} />
              tonight: {moon.name} · {Math.round(moon.illumination * 100)}% lit
            </span>
            <span className="block not-italic text-mist-600" suppressHydrationWarning>
              {moon.full === 0
                ? "the moon is full tonight"
                : moon.full === 1
                  ? "full moon tomorrow night"
                  : `full moon in ${moon.full} nights`}
            </span>
            <span className="mt-0.5 block not-italic text-mist-600">made for quiet hours · headphones advised</span>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("luna:show-shortcuts"))}
              className="mt-1 block font-mono text-[10px] not-italic tracking-wide text-mist-600/80 underline decoration-mist-700/60 underline-offset-4 transition hover:text-moon-300 hover:decoration-moon-300/50"
            >
              space play/pause · 1–9 soundscapes · m immersion · ? all keys
            </button>
          </p>
        </div>
      </div>
    </footer>
  );
}
