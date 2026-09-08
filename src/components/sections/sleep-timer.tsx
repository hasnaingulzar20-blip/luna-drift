"use client";

import { useState } from "react";
import {
  AlarmClock,
  BellRing,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  ListMusic,
  Moon,
  Play,
  Plus,
  Sunrise,
  Timer as TimerIcon,
  Trash2,
  X,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Ornament from "@/components/atmosphere/ornament";
import { usePlayer } from "@/store/player";
import {
  SOUNDSCAPES,
  getSoundscape,
  type SoundscapeId,
} from "@/lib/soundscapes";
import {
  SEQUENCE_MAX_STEPS,
  STEP_MAX_MINUTES,
  STEP_MIN_MINUTES,
  WIND_DOWN_SEQUENCES,
  clampStepMinutes,
  totalSequenceMinutes,
  type SequenceSound,
  type WindDownSequence,
  type WindDownStep,
} from "@/lib/sequences";

function formatRemaining(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const SILENCE_LABEL = "Silence";

function stepLabel(sound: SequenceSound): string {
  return sound === "silence" ? SILENCE_LABEL : getSoundscape(sound).name;
}

/** A small room → minutes chip used in sequence flows. */
function StepChip({
  step,
  state = "idle",
  remaining,
}: {
  step: WindDownStep;
  state?: "idle" | "done" | "current" | "ahead";
  remaining?: number;
}) {
  const base =
    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] transition-all duration-500 ring-1";
  const look =
    state === "current"
      ? "bg-moon-200/15 text-moon-100 ring-moon-200/50 shadow-[0_0_18px_rgba(236,226,200,0.18)]"
      : state === "done"
        ? "bg-white/[0.02] text-mist-500 ring-white/6 line-through decoration-mist-600/60"
        : state === "ahead"
          ? "bg-white/[0.03] text-mist-300 ring-white/10"
          : "bg-white/[0.03] text-mist-300 ring-white/10";
  return (
    <span className={`${base} ${look}`}>
      {step.soundscape === "silence" ? (
        <Moon className="h-3 w-3 text-mist-500" aria-hidden="true" />
      ) : (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: getSoundscape(step.soundscape as SoundscapeId).hue }}
        />
      )}
      {stepLabel(step.soundscape)}
      <span className="font-mono text-[10px] text-mist-500">{step.minutes}′</span>
      {state === "current" && remaining !== undefined && (
        <span className="font-mono text-[10px] text-moon-200" aria-live="polite">
          {formatRemaining(remaining)}
        </span>
      )}
    </span>
  );
}

function HandArrow() {
  return (
    <span aria-hidden="true" className="text-mist-600">
      →
    </span>
  );
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
  const sequence = usePlayer((s) => s.sequence);
  const customSequences = usePlayer((s) => s.customSequences);
  const startSequence = usePlayer((s) => s.startSequence);
  const cancelSequence = usePlayer((s) => s.cancelSequence);
  const saveSequence = usePlayer((s) => s.saveSequence);
  const deleteSequence = usePlayer((s) => s.deleteSequence);

  /* builder state */
  const [building, setBuilding] = useState(false);
  const [buildName, setBuildName] = useState("");
  const [buildSteps, setBuildSteps] = useState<WindDownStep[]>([
    { id: "b0", soundscape: "rain", minutes: 20 },
  ]);

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
              <p className="text-[11px] uppercase tracking-[0.3em] text-moon-300/80">
                <span className="text-moon-300/40" aria-hidden="true">VI</span>
                <span className="mx-1.5 text-white/20" aria-hidden="true">·</span>Sleep Timer
              </p>
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
                  <p className="mt-1.5 flex items-start gap-1.5 text-[10px] leading-relaxed text-mist-600">
                    <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                    web alarms need an open tab — leave Luna Drift resting in a background tab
                    overnight
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

          {/* ── wind-down sequences ── */}
          <Ornament className="mt-10" />
          <div className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-mist-300">
                <ListMusic className="h-3.5 w-3.5 text-moon-300" aria-hidden="true" />
                wind-down sequences
              </p>
              <p className="text-[11px] italic text-mist-500">
                rooms that hand you over to each other, then to silence
              </p>
            </div>

            {sequence ? (
              /* ── active sequence ── */
              <div className="mt-4 rounded-2xl border border-moon-200/25 bg-moon-200/[0.05] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-serif text-lg text-moon-100">{sequence.name}</p>
                    <p className="mt-0.5 text-[11px] text-mist-400" aria-live="polite">
                      step {sequence.stepIndex + 1} of {sequence.steps.length} ·{" "}
                      {stepLabel(sequence.steps[sequence.stepIndex]?.soundscape ?? "silence")} ·{" "}
                      {formatRemaining(sequence.stepRemaining)} in this room
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={cancelSequence}
                    className="flex items-center gap-1.5 rounded-full bg-white/[0.04] px-4 py-2 text-xs text-mist-300 ring-1 ring-white/10 transition hover:bg-moon-200/10 hover:text-moon-100"
                  >
                    <X className="h-3 w-3" aria-hidden="true" /> end the handover
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {sequence.steps.map((st, i) => (
                    <span key={st.id} className="flex items-center gap-2">
                      {i > 0 && <HandArrow />}
                      <StepChip
                        step={st}
                        state={i < sequence.stepIndex ? "done" : i === sequence.stepIndex ? "current" : "ahead"}
                        remaining={i === sequence.stepIndex ? sequence.stepRemaining : undefined}
                      />
                    </span>
                  ))}
                </div>

                {/* overall progress through the whole handover */}
                {(() => {
                  const totalSec = sequence.steps.reduce((a, st) => a + st.minutes * 60, 0);
                  const beforeSec = sequence.steps
                    .slice(0, sequence.stepIndex)
                    .reduce((a, st) => a + st.minutes * 60, 0);
                  const elapsed =
                    beforeSec + Math.max(0, sequence.steps[sequence.stepIndex].minutes * 60 - sequence.stepRemaining);
                  const overall = Math.min(100, Math.max(2, (elapsed / totalSec) * 100));
                  return (
                    <div className="mt-5">
                      <div className="h-1 overflow-hidden rounded-full bg-white/8">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-moon-200/50 to-moon-200 transition-[width] duration-1000 ease-linear"
                          style={{ width: `${overall}%` }}
                        />
                      </div>
                      <p className="mt-2 text-right font-mono text-[10px] text-mist-600">
                        {formatRemaining(Math.max(0, totalSec - elapsed))} of quiet left
                      </p>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <>
                {/* ── premade sequences ── */}
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {WIND_DOWN_SEQUENCES.map((seq) => (
                    <button
                      key={seq.id}
                      type="button"
                      onClick={() => startSequence(seq)}
                      data-seq-start={seq.id}
                      aria-label={`Start wind-down sequence ${seq.name}, ${totalSequenceMinutes(seq.steps)} minutes`}
                      className="group flex flex-col rounded-2xl bg-white/[0.02] p-5 text-left ring-1 ring-white/6 transition hover:bg-moon-200/[0.06] hover:ring-moon-200/30"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-serif text-base text-moon-100">{seq.name}</span>
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-moon-200/10 text-moon-100 ring-1 ring-moon-200/25 transition group-hover:bg-moon-200 group-hover:text-night-950">
                          <Play className="ml-0.5 h-3 w-3 fill-current" aria-hidden="true" />
                        </span>
                      </span>
                      <span className="mt-3 flex flex-wrap items-center gap-1.5">
                        {seq.steps.map((st, i) => (
                          <span key={st.id} className="flex items-center gap-1.5">
                            {i > 0 && <HandArrow />}
                            <StepChip step={st} state="ahead" />
                          </span>
                        ))}
                      </span>
                      <span className="mt-3 font-mono text-[10px] uppercase tracking-widest text-mist-600">
                        {totalSequenceMinutes(seq.steps)} min total
                      </span>
                    </button>
                  ))}
                </div>

                {/* ── your sequences shelf ── */}
                {customSequences.length > 0 && (
                  <div className="mt-5 space-y-2.5">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-moon-300/70">
                      your handovers
                    </p>
                    {customSequences.map((seq) => (
                      <div
                        key={seq.id}
                        className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-moon-200/15 bg-moon-200/[0.05] px-4 py-3 transition hover:border-moon-200/35"
                      >
                        <button
                          type="button"
                          onClick={() => startSequence(seq)}
                          className="min-w-0 flex-1 text-left"
                          aria-label={`Start ${seq.name}`}
                        >
                          <span className="block text-sm text-moon-100">{seq.name}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-1.5">
                            {seq.steps.map((st, i) => (
                              <span key={st.id} className="flex items-center gap-1.5">
                                {i > 0 && <HandArrow />}
                                <StepChip step={st} state="ahead" />
                              </span>
                            ))}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSequence(seq.id)}
                          aria-label={`Delete sequence ${seq.name}`}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-mist-500 opacity-0 ring-1 ring-white/10 transition hover:bg-red-500/10 hover:text-red-300 focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── builder ── */}
                {building ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const saved = saveSequence(buildName, buildSteps);
                      if (saved) {
                        setBuildName("");
                        setBuildSteps([{ id: "b0", soundscape: "rain", minutes: 20 }]);
                        setBuilding(false);
                      }
                    }}
                    className="mt-4 rounded-2xl border border-moon-200/20 bg-white/[0.03] p-5"
                  >
                    <label htmlFor="seq-name" className="text-[10px] uppercase tracking-[0.24em] text-moon-300/70">
                      name this handover
                    </label>
                    <input
                      id="seq-name"
                      value={buildName}
                      onChange={(e) => setBuildName(e.target.value)}
                      placeholder="Soft rain, then nothing…"
                      maxLength={32}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-night-950/40 px-4 py-2.5 text-sm text-moon-100 outline-none transition placeholder:text-mist-600 focus:border-moon-200/40"
                    />

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-moon-300/70">
                        the rooms, in order
                      </p>
                      {/* quick fill — one tap gives every step the same length */}
                      <div className="flex items-center gap-1.5">
                        <span className="mr-0.5 text-[10px] tracking-wide text-mist-600">quick fill</span>
                        {[5, 10, 15, 20, 30].map((n) => (
                          <button
                            key={n}
                            type="button"
                            disabled={buildSteps.length === 0}
                            onClick={() =>
                              setBuildSteps((prev) => prev.map((p) => ({ ...p, minutes: n })))
                            }
                            aria-label={`Set every step to ${n} minutes`}
                            className="rounded-full bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] text-mist-400 ring-1 ring-white/8 transition hover:bg-moon-200/10 hover:text-moon-100 disabled:opacity-30"
                          >
                            {n}m
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2 space-y-2">
                      {buildSteps.map((st, i) => (
                        <div key={st.id} className="flex items-center gap-2">
                          <span className="w-5 shrink-0 text-center font-mono text-[11px] text-mist-600">
                            {i + 1}
                          </span>
                          <div className="flex shrink-0 flex-col">
                            <button
                              type="button"
                              disabled={i === 0}
                              onClick={() =>
                                setBuildSteps((prev) => {
                                  const next = [...prev];
                                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                                  return next;
                                })
                              }
                              aria-label={`Move ${stepLabel(st.soundscape)} step ${i + 1} earlier`}
                              className="flex h-4 w-5 items-center justify-center text-mist-600 transition hover:text-moon-200 disabled:opacity-20 disabled:hover:text-mist-600"
                            >
                              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              disabled={i === buildSteps.length - 1}
                              onClick={() =>
                                setBuildSteps((prev) => {
                                  const next = [...prev];
                                  [next[i + 1], next[i]] = [next[i], next[i + 1]];
                                  return next;
                                })
                              }
                              aria-label={`Move ${stepLabel(st.soundscape)} step ${i + 1} later`}
                              className="flex h-4 w-5 items-center justify-center text-mist-600 transition hover:text-moon-200 disabled:opacity-20 disabled:hover:text-mist-600"
                            >
                              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                          <Select
                            value={st.soundscape}
                            onValueChange={(v) =>
                              setBuildSteps((prev) =>
                                prev.map((p) => (p.id === st.id ? { ...p, soundscape: v as SequenceSound } : p))
                              )
                            }
                          >
                            <SelectTrigger
                              aria-label={`Soundscape for step ${i + 1}`}
                              className="h-9 flex-1 rounded-xl border-white/10 bg-night-950/40 text-sm text-moon-100"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-white/10 bg-night-900/95 text-moon-100">
                              {SOUNDSCAPES.map((sc) => (
                                <SelectItem key={sc.id} value={sc.id} className="text-sm">
                                  {sc.name}
                                </SelectItem>
                              ))}
                              <SelectItem value="silence" className="text-sm">
                                {SILENCE_LABEL}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="glass-chip flex shrink-0 items-center gap-1 rounded-xl px-3 py-1.5">
                            <input
                              type="number"
                              min={STEP_MIN_MINUTES}
                              max={STEP_MAX_MINUTES}
                              value={st.minutes}
                              onChange={(e) =>
                                setBuildSteps((prev) =>
                                  prev.map((p) =>
                                    p.id === st.id
                                      ? { ...p, minutes: clampStepMinutes(Number(e.target.value)) }
                                      : p
                                  )
                                )
                              }
                              aria-label={`Minutes for step ${i + 1}`}
                              className="w-10 bg-transparent text-right font-mono text-sm text-moon-100 outline-none [color-scheme:dark]"
                            />
                            <span className="text-[11px] text-mist-500">min</span>
                          </div>
                          {buildSteps.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setBuildSteps((prev) => prev.filter((p) => p.id !== st.id))}
                              aria-label={`Remove step ${i + 1}`}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-mist-500 ring-1 ring-white/10 transition hover:bg-red-500/10 hover:text-red-300"
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {buildSteps.length < SEQUENCE_MAX_STEPS && (
                        <button
                          type="button"
                          onClick={() =>
                            setBuildSteps((prev) => [
                              ...prev,
                              {
                                id: `b${Date.now().toString(36)}`,
                                soundscape: "silence",
                                minutes: 10,
                              },
                            ])
                          }
                          className="flex items-center gap-1.5 rounded-xl border border-dashed border-white/12 px-3.5 py-2 text-xs text-mist-400 transition hover:border-moon-200/30 hover:text-moon-100"
                        >
                          <Plus className="h-3 w-3" aria-hidden="true" /> add a room
                        </button>
                      )}
                      <span className="ml-auto flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setBuilding(false);
                            setBuildName("");
                          }}
                          className="rounded-full px-4 py-2 text-xs text-mist-400 transition hover:text-moon-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!buildName.trim()}
                          className="flex items-center gap-1.5 rounded-full bg-moon-200 px-4 py-2 text-xs font-medium text-night-950 transition hover:bg-moon-100 disabled:opacity-30"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" /> keep it
                        </button>
                      </span>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setBuilding(true)}
                    className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 px-4 py-3 text-xs text-mist-400 transition hover:border-moon-200/30 hover:text-moon-100"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    compose your own handover
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
