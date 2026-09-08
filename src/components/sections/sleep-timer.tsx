"use client";

import { AlarmClock, BellRing, Moon, Sunrise, Timer as TimerIcon, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import Ornament from "@/components/atmosphere/ornament";
import { usePlayer } from "@/store/player";

function formatRemaining(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function SleepTimer() {
  const timerDuration = usePlayer((s) => s.timerDuration);
  const remainingSeconds = usePlayer((s) => s.remainingSeconds);
  const starIntensity = usePlayer((s) => s.starIntensity);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const startTimer = usePlayer((s) => s.startTimer);
  const cancelTimer = usePlayer((s) => s.cancelTimer);
  const wakeAlarm = usePlayer((s) => s.wakeAlarm);
  const setWakeTime = usePlayer((s) => s.setWakeTime);
  const setWakeEnabled = usePlayer((s) => s.setWakeEnabled);
  const chimeOnEnd = usePlayer((s) => s.chimeOnEnd);
  const setChimeOnEnd = usePlayer((s) => s.setChimeOnEnd);

  const progress = timerDuration
    ? 1 - remainingSeconds / (timerDuration * 60)
    : 0;
  const circumference = 2 * Math.PI * 54;
  const fading = timerDuration !== null && remainingSeconds <= 60 && remainingSeconds > 0;

  return (
    <section id="timer" aria-label="Sleep timer" className="relative mt-24 scroll-mt-28 sm:mt-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="glass-panel relative overflow-hidden rounded-[2rem] p-6 sm:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(205,180,124,0.08),transparent_70%)]"
          />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-moon-300/80">Sleep Timer</p>
              <h2 className="mt-3 font-serif text-3xl font-light text-moon-100 sm:text-4xl">
                Drift off, then silence
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-mist-300">
                Choose how long tonight&apos;s drift should last. Over the final minute the sound
                eases away in a long fade, and the stars above begin to dim with you.
              </p>

              <div className="mt-8 flex flex-wrap gap-3" role="group" aria-label="Timer length">
                {([30, 60, 90] as const).map((m) => {
                  const isActiveTimer = timerDuration === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => startTimer(m)}
                      aria-pressed={isActiveTimer}
                      className={`flex h-14 w-20 flex-col items-center justify-center rounded-2xl text-sm transition-all duration-300 ${
                        isActiveTimer
                          ? "bg-moon-200 text-night-950 shadow-[0_0_30px_rgba(236,226,200,0.35)]"
                          : "bg-white/[0.03] text-moon-100 ring-1 ring-white/10 hover:bg-moon-200/10 hover:ring-moon-200/30"
                      }`}
                    >
                      <TimerIcon className="mb-1 h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                      {m} min
                    </button>
                  );
                })}
                {timerDuration !== null && (
                  <button
                    type="button"
                    onClick={cancelTimer}
                    className="flex h-14 items-center gap-2 rounded-2xl bg-white/[0.03] px-5 text-sm text-mist-300 ring-1 ring-white/10 transition hover:bg-moon-200/10 hover:text-moon-100"
                    aria-label="Cancel sleep timer"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" /> Cancel
                  </button>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-mist-400">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2 w-2 rounded-full bg-star-200 transition-opacity duration-1000"
                    style={{ opacity: starIntensity }}
                  />
                  stars twinkle {starIntensity > 0.8 ? "gently" : starIntensity > 0.45 ? "softer" : "sleepily"}
                </span>
                {!isPlaying && (
                  <span className="text-mist-500">start a soundscape first, then set the timer</span>
                )}
              </div>
            </div>

            {/* countdown dial */}
            <div className="mx-auto flex flex-col items-center">
              <div className={`relative h-40 w-40 sm:h-44 sm:w-44 ${fading ? "animate-pulse" : ""}`}>
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(159,173,216,0.12)" strokeWidth="4" />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="url(#timerGrad)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - progress)}
                    className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                  />
                  <defs>
                    <linearGradient id="timerGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#ece2c8" />
                      <stop offset="100%" stopColor="#cdb47c" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Moon
                    className={`mb-1.5 h-4 w-4 text-moon-300 transition-opacity duration-1000 ${timerDuration ? "" : "opacity-30"}`}
                    aria-hidden="true"
                  />
                  <span className="font-mono text-2xl text-moon-100" aria-live="polite">
                    {timerDuration ? formatRemaining(remainingSeconds) : "--:--"}
                  </span>
                  <span className="mt-1 text-[10px] uppercase tracking-[0.25em] text-mist-500">
                    {timerDuration ? (fading ? "fading out" : "drifting") : "no timer"}
                  </span>
                </div>
              </div>
              {fading && (
                <p className="mt-3 animate-pulse text-xs italic text-moon-300/80">
                  the long fade has begun…
                </p>
              )}
            </div>
          </div>

          {/* ── endings: wake light + last bell ── */}
          <Ornament className="mt-10" />
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {/* wake light */}
            <div className="relative overflow-hidden rounded-2xl bg-white/[0.02] p-5 ring-1 ring-white/6">
              <div
                aria-hidden="true"
                className="anim-breathe pointer-events-none absolute -bottom-14 -right-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(240,185,138,0.16),transparent_70%)]"
              />
              <div className="relative flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-mist-300">
                    <Sunrise className="h-3.5 w-3.5 text-ember-300" aria-hidden="true" />
                    wake light
                  </p>
                  <p className="mt-2 max-w-xs text-xs leading-relaxed text-mist-400">
                    At the hour you choose, the screen slowly warms like dawn through curtains —
                    and a faraway bell rings the room awake.
                  </p>
                  <p className="mt-2 font-mono text-[11px] text-moon-300/90" aria-live="polite">
                    {wakeAlarm.enabled ? `armed for ${wakeAlarm.time}` : "off — sleep without a schedule"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="glass-chip flex items-center gap-2 rounded-full px-3 py-1.5">
                    <AlarmClock className="h-3.5 w-3.5 text-moon-200" aria-hidden="true" />
                    <input
                      type="time"
                      value={wakeAlarm.time}
                      onChange={(e) => setWakeTime(e.target.value)}
                      aria-label="Wake light time"
                      className="bg-transparent font-mono text-sm text-moon-100 outline-none [color-scheme:dark]"
                    />
                  </div>
                  <Switch
                    checked={wakeAlarm.enabled}
                    onCheckedChange={setWakeEnabled}
                    aria-label="Enable wake light"
                    className="data-[state=checked]:bg-ember-400/80"
                  />
                </div>
              </div>
            </div>

            {/* the last bell */}
            <div className="relative overflow-hidden rounded-2xl bg-white/[0.02] p-5 ring-1 ring-white/6">
              <div
                aria-hidden="true"
                className="anim-breathe pointer-events-none absolute -bottom-14 -right-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(205,180,124,0.14),transparent_70%)]"
                style={{ animationDelay: "1.2s" }}
              />
              <div className="relative flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-mist-300">
                    <BellRing className="h-3.5 w-3.5 text-moon-300" aria-hidden="true" />
                    the last bell
                  </p>
                  <p className="mt-2 max-w-xs text-xs leading-relaxed text-mist-400">
                    When a timer runs its course, one very soft bell marks the end — then
                    nothing at all. Off means silence takes you the rest of the way.
                  </p>
                </div>
                <Switch
                  checked={chimeOnEnd}
                  onCheckedChange={setChimeOnEnd}
                  aria-label="Ring a soft bell when the timer completes"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
