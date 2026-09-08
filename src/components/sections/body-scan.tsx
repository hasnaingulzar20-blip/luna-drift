"use client";

import { useEffect, useRef, useState } from "react";
import { Feather, Pause, Play, RotateCcw } from "lucide-react";

/**
 * Guided body scan — a slow sweep of attention from the brow down to the
 * feet. Text-led, timestamp-driven (honest in background tabs), with gentle
 * haptics on each station change.
 */

interface Station {
  name: string;
  line: string;
}

const STATIONS: Station[] = [
  { name: "the brow", line: "Let the forehead smooth, like still water." },
  { name: "the jaw", line: "Unclench. Let the teeth drift apart." },
  { name: "the shoulders", line: "Let them fall away from the ears." },
  { name: "the arms", line: "Heavy, warm — done carrying the day." },
  { name: "the hands", line: "Fingers uncurl. Nothing left to hold." },
  { name: "the breath", line: "Watch it come and go, without steering." },
  { name: "the belly", line: "Soft. Rising, falling, soft again." },
  { name: "the hips", line: "Let the weight sink into the bed." },
  { name: "the legs", line: "Long and heavy, all the way down." },
  { name: "the feet", line: "Toes loose. The walking is over." },
  { name: "all of you", line: "Rest now. Nothing more to do." },
];

const PACES = [30, 45, 60] as const;

export default function BodyScan() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [pace, setPace] = useState<number>(45);
  const [stationIdx, setStationIdx] = useState(0);
  const [left, setLeft] = useState(pace);
  const stationStart = useRef<number>(0);

  // station clock — driven by timestamps so background tabs stay honest
  useEffect(() => {
    if (!running) return;
    stationStart.current = Date.now();
    let raf = 0;
    let lastTick = -1;
    const loop = () => {
      const elapsed = (Date.now() - stationStart.current) / 1000;
      const remain = Math.max(0, Math.ceil(pace - elapsed));
      if (remain !== lastTick) {
        lastTick = remain;
        setLeft(remain);
      }
      if (elapsed >= pace) {
        setStationIdx((i) => {
          if (i + 1 >= STATIONS.length) {
            setRunning(false);
            setDone(true);
            return i;
          }
          return i + 1;
        });
        return; // effect re-runs on stationIdx change
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, stationIdx, pace]);

  // a single soft pulse as attention moves on
  useEffect(() => {
    if (!running || typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    try {
      navigator.vibrate(24);
    } catch {
      /* vibration is a bonus, never a requirement */
    }
  }, [running, stationIdx]);

  const begin = () => {
    setDone(false);
    setStationIdx(0);
    setLeft(pace);
    setRunning(true);
  };

  const reset = () => {
    setRunning(false);
    setDone(false);
    setStationIdx(0);
    setLeft(pace);
  };

  const station = STATIONS[stationIdx];
  const settled = !running && stationIdx === 0 && !done && left === pace;

  return (
    <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1fr_auto]">
      <div>
        <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-moon-300/80">
          <Feather className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-white/20" aria-hidden="true">·</span>
          Body Scan
        </p>
        <h3 className="mt-3 font-serif text-2xl font-light text-moon-100 sm:text-3xl">
          Let go, head to toe
        </h3>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-mist-300">
          A slow sweep of attention through the body. Each stop is held for a moment —
          feel it soften, then move on. By the toes, most people are already half asleep.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2" role="group" aria-label="Pace per station">
          <span className="mr-1 text-[10px] uppercase tracking-[0.22em] text-mist-500">pace</span>
          {PACES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPace(p);
                if (!running) setLeft(p);
              }}
              aria-pressed={pace === p}
              disabled={running}
              className={`rounded-full px-3.5 py-1.5 font-mono text-[11px] transition-all duration-300 ring-1 disabled:opacity-40 ${
                pace === p
                  ? "bg-moon-200/15 text-moon-100 ring-moon-200/40"
                  : "bg-white/[0.03] text-mist-400 ring-white/10 hover:bg-moon-200/10 hover:text-moon-100"
              }`}
            >
              {p}s
            </button>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => (done ? begin() : setRunning((r) => !r))}
            aria-pressed={running}
            className={`flex h-11 items-center gap-2.5 rounded-full px-6 text-sm transition-all duration-300 ${
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
            {running ? "Pause the sweep" : done ? "Sweep once more" : "Begin the sweep"}
          </button>
          {!settled && (
            <button
              type="button"
              onClick={reset}
              className="flex h-11 items-center gap-2 rounded-full bg-white/[0.03] px-5 text-sm text-mist-300 ring-1 ring-white/10 transition hover:bg-moon-200/10 hover:text-moon-100"
              aria-label="Reset the body scan"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset
            </button>
          )}
          {running && (
            <span className="text-xs text-mist-400" aria-live="polite">
              station {stationIdx + 1} of {STATIONS.length} · {left}s
            </span>
          )}
        </div>

        <p className="mt-5 h-5 max-w-md font-serif text-base italic text-moon-200" aria-live="polite">
          {done
            ? "The sweep is done — rest exactly as you are."
            : running
              ? station.line
              : settled
                ? "Lie down somewhere soft before you begin."
                : "Paused — the body will wait for you."}
        </p>
      </div>

      {/* the station ladder */}
      <nav aria-label="Body scan stations" className="mx-auto w-full max-w-xs lg:w-80">
        <ol className="relative space-y-1 pl-6">
          {/* the connecting thread */}
          <span
            aria-hidden="true"
            className="absolute bottom-3 left-[7px] top-3 w-px bg-gradient-to-b from-moon-200/40 via-white/10 to-transparent"
          />
          {STATIONS.map((st, i) => {
            const isPast = done || i < stationIdx;
            const isCurrent = running && i === stationIdx;
            return (
              <li key={st.name} className="relative">
                <span
                  aria-hidden="true"
                  className={`absolute -left-6 top-1/2 h-[9px] w-[9px] -translate-y-1/2 rounded-full transition-all duration-700 ${
                    isCurrent
                      ? "scale-125 bg-moon-200 shadow-[0_0_14px_rgba(236,226,200,0.85)]"
                      : isPast
                        ? "bg-moon-200/45"
                        : "bg-transparent ring-1 ring-white/20"
                  }`}
                />
                <div
                  className={`rounded-xl px-3.5 py-2 transition-all duration-500 ${
                    isCurrent
                      ? "bg-moon-200/[0.07] ring-1 ring-moon-200/25"
                      : "ring-1 ring-transparent"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={`text-[13px] transition-colors duration-500 ${
                        isCurrent
                          ? "text-moon-100"
                          : isPast
                            ? "text-mist-500 line-through decoration-mist-600/50"
                            : "text-mist-300"
                      }`}
                    >
                      {st.name}
                    </span>
                    {isCurrent && (
                      <span className="font-mono text-[10px] text-moon-200" aria-hidden="true">
                        {left}s
                      </span>
                    )}
                  </div>
                  {isCurrent && (
                    <p className="mt-0.5 text-[11px] italic leading-relaxed text-mist-300">
                      {st.line}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
