"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Wind } from "lucide-react";

type Phase = "inhale" | "hold" | "exhale";

const PHASES: { name: Phase; seconds: number; label: string }[] = [
  { name: "inhale", seconds: 4, label: "Breathe in through the nose" },
  { name: "hold", seconds: 7, label: "Hold, gently" },
  { name: "exhale", seconds: 8, label: "Release through the mouth" },
];

const ORB_IN = 0.62;
const ORB_OUT = 1;

export default function Breathe() {
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [left, setLeft] = useState(PHASES[0].seconds);
  const [cycles, setCycles] = useState(0);
  const phaseStart = useRef<number>(0);

  const phase = PHASES[phaseIdx];

  // phase clock — driven by timestamps so background tabs stay honest
  useEffect(() => {
    if (!running) return;
    phaseStart.current = Date.now();
    let raf = 0;
    let lastTick = -1;
    const loop = () => {
      const elapsed = (Date.now() - phaseStart.current) / 1000;
      const remain = Math.max(0, Math.ceil(phase.seconds - elapsed));
      if (remain !== lastTick) {
        lastTick = remain;
        setLeft(remain);
      }
      if (elapsed >= phase.seconds) {
        setPhaseIdx((i) => {
          const next = (i + 1) % PHASES.length;
          if (next === 0) setCycles((c) => c + 1);
          return next;
        });
        return; // effect re-runs on phaseIdx change
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, phaseIdx, phase.seconds]);

  const reset = () => {
    setRunning(false);
    setPhaseIdx(0);
    setLeft(PHASES[0].seconds);
    setCycles(0);
  };

  const orbTransform = useMemo(() => {
    if (!running) return `scale(${ORB_IN})`;
    if (phase.name === "inhale") return `scale(${ORB_OUT})`;
    if (phase.name === "hold") return `scale(${ORB_OUT})`;
    return `scale(${ORB_IN})`;
  }, [running, phase]);

  const orbDurationMs = running
    ? phase.name === "inhale"
      ? 4000
      : phase.name === "exhale"
        ? 8000
        : 400
    : 1200;

  const ringPct = running
    ? 1 - (Date.now() - phaseStart.current) / (phase.seconds * 1000)
    : 1;

  return (
    <section id="breathe" aria-label="Breathing guide" className="relative mt-24 sm:mt-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="glass-panel relative overflow-hidden rounded-[2rem] p-6 sm:p-10">
          <div
            aria-hidden="true"
            className="anim-drift pointer-events-none absolute -top-24 -right-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(183,163,214,0.12),transparent_70%)]"
          />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-moon-300/80">
                <Wind className="h-3.5 w-3.5" aria-hidden="true" />
                Breathing Guide
              </p>
              <h2 className="mt-3 font-serif text-3xl font-light text-moon-100 sm:text-4xl">
                Four · seven · eight
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-mist-300">
                The classic pre-sleep breath: inhale for four, hold for seven, release for eight.
                Follow the moon as it swells and softens — a few cycles and the body believes the
                night.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRunning((r) => !r)}
                  aria-pressed={running}
                  className={`flex h-12 items-center gap-2.5 rounded-full px-6 text-sm transition-all duration-300 ${
                    running
                      ? "bg-moon-200 text-night-950 shadow-[0_0_28px_rgba(236,226,200,0.35)]"
                      : "bg-moon-200/10 text-moon-100 ring-1 ring-moon-200/30 hover:bg-moon-200 hover:text-night-950"
                  }`}
                >
                  {running ? (
                    <Pause className="h-4 w-4 fill-current" aria-hidden="true" />
                  ) : (
                    <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                  )}
                  {running ? "Pause guide" : "Begin breathing"}
                </button>
                {(cycles > 0 || phaseIdx !== 0 || left !== PHASES[0].seconds) && (
                  <button
                    type="button"
                    onClick={reset}
                    className="flex h-12 items-center gap-2 rounded-full bg-white/[0.03] px-5 text-sm text-mist-300 ring-1 ring-white/10 transition hover:bg-moon-200/10 hover:text-moon-100"
                    aria-label="Reset breathing guide"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset
                  </button>
                )}
                {cycles > 0 && (
                  <span className="text-xs text-mist-400" aria-live="polite">
                    {cycles} {cycles === 1 ? "cycle" : "cycles"} completed
                  </span>
                )}
              </div>
            </div>

            {/* the breathing moon */}
            <div className="mx-auto flex flex-col items-center">
              <div className="relative flex h-52 w-52 items-center justify-center sm:h-60 sm:w-60">
                {/* orbit ring with progress dash */}
                <svg
                  viewBox="0 0 120 120"
                  className="absolute inset-0 h-full w-full -rotate-90"
                  aria-hidden="true"
                >
                  <circle cx="60" cy="60" r="56" fill="none" stroke="rgba(159,173,216,0.10)" strokeWidth="1.5" />
                  <circle
                    cx="60"
                    cy="60"
                    r="56"
                    fill="none"
                    stroke={phase.name === "exhale" ? "rgba(143,161,196,0.55)" : "rgba(236,226,200,0.55)"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * Math.max(0, Math.min(1, ringPct))}`}
                    className="transition-[stroke-dashoffset] duration-300 ease-linear"
                  />
                </svg>

                {/* glow halo */}
                <div
                  aria-hidden="true"
                  className="absolute h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(236,226,200,0.22),rgba(143,161,196,0.08)_55%,transparent_72%)] transition-all ease-in-out"
                  style={{
                    transform: orbTransform,
                    transitionDuration: `${orbDurationMs}ms`,
                    filter: "blur(6px)",
                  }}
                />
                {/* core */}
                <div
                  className="relative flex h-28 w-28 items-center justify-center rounded-full bg-[radial-gradient(circle_at_38%_34%,#f9f4e6_0%,#ece2c8_45%,#cdb47c_100%)] shadow-[0_0_50px_rgba(236,226,200,0.35)] transition-transform ease-in-out sm:h-32 sm:w-32"
                  style={{
                    transform: orbTransform,
                    transitionDuration: `${orbDurationMs}ms`,
                  }}
                  role="img"
                  aria-label={`Breathing phase: ${phase.label}, ${left} seconds remaining`}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-night-950/25"
                    style={{
                      clipPath:
                        phaseIdx % 2 === 0
                          ? "ellipse(56% 92% at 26% 44%)"
                          : "ellipse(56% 92% at 74% 44%)",
                      filter: "blur(1px)",
                    }}
                  />
                  <span className="relative font-mono text-3xl text-night-950/90">{left}</span>
                </div>
              </div>

              <p className="mt-5 h-5 text-center font-serif text-lg italic text-moon-200" aria-live="polite">
                {running ? phase.label : "press begin when you're settled"}
              </p>
              <p className="mt-1 text-center text-[11px] uppercase tracking-[0.25em] text-mist-500">
                {running ? phase.name : "4 · 7 · 8"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
