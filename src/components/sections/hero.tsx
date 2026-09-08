"use client";

import { useEffect, useRef, useState } from "react";
import { Headphones, History, MoonStar, Pause, Play } from "lucide-react";
import { usePlayer } from "@/store/player";
import { audioEngine } from "@/lib/audio-engine";
import { TONIGHTS_PICK, getSoundscape, type SoundscapeId } from "@/lib/soundscapes";

function moonPhase(date: Date): { label: string; illumination: number } {
  // synodic month reference: known new moon 2000-01-06 18:14 UTC
  const synodic = 29.530588853;
  const newMoon = Date.UTC(2000, 0, 6, 18, 14);
  const days = (date.getTime() - newMoon) / 86400000;
  const phase = ((days % synodic) + synodic) % synodic / synodic; // 0..1
  const illumination = Math.round((1 - Math.cos(2 * Math.PI * phase)) / 2 * 100);
  const names: [number, string][] = [
    [0.03, "New Moon"],
    [0.22, "Waxing Crescent"],
    [0.28, "First Quarter"],
    [0.47, "Waxing Gibbous"],
    [0.53, "Full Moon"],
    [0.72, "Waning Gibbous"],
    [0.78, "Last Quarter"],
    [0.97, "Waning Crescent"],
    [1.01, "New Moon"],
  ];
  const label = names.find(([limit]) => phase < limit)?.[1] ?? "New Moon";
  return { label, illumination };
}

function greeting(h: number) {
  if (h < 5) return "The deep of night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "The deep of night";
}

function relDrift(at: number) {
  const mins = Math.round((Date.now() - at) / 60000);
  if (mins < 1) return "moments ago";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "last night" : `${days} nights ago`;
}

export default function Hero() {
  const active = usePlayer((s) => s.active);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const playSoundscape = usePlayer((s) => s.playSoundscape);
  const stopAll = usePlayer((s) => s.stopAll);
  const lastPlayed = usePlayer((s) => s.lastPlayed);

  const pick = getSoundscape(TONIGHTS_PICK);
  const isThisActive = isPlaying && active === TONIGHTS_PICK;

  // resume chip: last played, only when it isn't the live room or tonight's pick
  const resumeItem =
    lastPlayed && lastPlayed.id !== TONIGHTS_PICK && (!isPlaying || active !== lastPlayed.id)
      ? { id: lastPlayed.id as SoundscapeId, at: lastPlayed.at, sc: getSoundscape(lastPlayed.id as SoundscapeId) }
      : null;

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    const raf = requestAnimationFrame(update);
    const t = setInterval(update, 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(t);
    };
  }, []);
  const phase = now ? moonPhase(now) : null;

  // audio-reactive glow over the artwork (gentle, rAF-driven)
  // analyser-driven when the context is live; falls back to a slow
  // synthetic breathe so the art still glows in silent environments
  const pulseRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isPlaying) {
      if (pulseRef.current) pulseRef.current.style.opacity = "0";
      return;
    }
    let raf = 0;
    let level = 0;
    const start = performance.now();
    const loop = (t: number) => {
      const organic = audioEngine.getLevel();
      const synthetic =
        0.28 + 0.16 * Math.sin(((t - start) / 9000) * Math.PI * 2); // ~9s breathe
      const raw = Math.max(organic, organic > 0.001 ? 0 : synthetic * 0.8);
      level += (raw - level) * 0.06; // extra smoothing for a slow breathe
      if (pulseRef.current) {
        pulseRef.current.style.opacity = String(Math.min(0.75, level * 2.2));
        pulseRef.current.style.transform = `scale(${1 + level * 0.045})`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

  return (
    <section id="tonight" aria-label="Tonight's pick" className="relative scroll-mt-24 pt-32 sm:pt-36">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        {/* ── copy side ── */}
        <div>
          <p className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-moon-300/80">
            <MoonStar className="h-3.5 w-3.5" aria-hidden="true" />
            Tonight&apos;s pick
            {now && (
              <span className="text-mist-400 normal-case tracking-normal">
                · {greeting(now.getHours())}, {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>

          <h1 className="mt-5 font-serif text-5xl font-light leading-[1.05] text-glow text-moon-100 sm:text-6xl lg:text-7xl">
            {pick.name}
          </h1>
          <p className="mt-3 font-serif text-xl italic text-mist-200/90">
            a {pick.duration} drift into sleep
          </p>

          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-mist-300">
            {pick.description}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            {/* play button with orbit ring */}
            <button
              type="button"
              onClick={() => (isThisActive ? stopAll() : playSoundscape(TONIGHTS_PICK))}
              aria-label={isThisActive ? "Pause tonight's soundscape" : "Play tonight's soundscape"}
              className="group relative flex h-20 w-20 items-center justify-center rounded-full sm:h-24 sm:w-24"
            >
              <span
                aria-hidden="true"
                className={`absolute inset-0 rounded-full border border-moon-200/25 ${isThisActive ? "anim-spin-slower border-dashed" : ""}`}
              />
              {/* orbiting moonlet */}
              <span
                aria-hidden="true"
                className="anim-spin-slower pointer-events-none absolute -inset-1"
              >
                <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-moon-200/80 shadow-[0_0_10px_rgba(236,226,200,0.8)]" />
              </span>
              <span
                aria-hidden="true"
                className={`absolute inset-2 rounded-full bg-[radial-gradient(circle,rgba(236,226,200,0.16),transparent_70%)] transition-opacity duration-700 ${isThisActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              />
              <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-moon-200 text-night-950 shadow-[0_0_36px_rgba(236,226,200,0.35)] transition-transform duration-300 group-hover:scale-105 sm:h-16 sm:w-16">
                {isThisActive ? (
                  <Pause className="h-6 w-6 fill-current" aria-hidden="true" />
                ) : (
                  <Play className="ml-0.5 h-6 w-6 fill-current" aria-hidden="true" />
                )}
              </span>
            </button>

            <div className="flex flex-col gap-1">
              <span className="text-sm text-moon-100">
                {isThisActive ? "Drifting — sleep well" : "Begin tonight's drift"}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-mist-400">
                <Headphones className="h-3 w-3" aria-hidden="true" />
                loops seamlessly · wakes no one
              </span>
            </div>
          </div>

          {/* continue where you drifted */}
          {resumeItem && (
            <button
              type="button"
              onClick={() => playSoundscape(resumeItem.id)}
              className="group/resume mt-5 flex w-full max-w-md items-center gap-3.5 rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3 text-left backdrop-blur-sm transition-all duration-300 hover:border-moon-200/30 hover:bg-moon-200/[0.06] sm:w-auto sm:max-w-none sm:pr-6"
            >
              <img
                src={resumeItem.sc.image}
                alt=""
                aria-hidden="true"
                className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-moon-300/80">
                  <History className="h-3 w-3" aria-hidden="true" />
                  continue where you drifted
                </span>
                <span className="mt-0.5 block truncate text-sm text-moon-100">
                  {resumeItem.sc.name}
                  <span className="ml-2 text-[11px] text-mist-500">{relDrift(resumeItem.at)}</span>
                </span>
              </span>
              <span className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-moon-200/10 text-moon-100 ring-1 ring-moon-200/25 transition group-hover/resume:bg-moon-200 group-hover/resume:text-night-950">
                <Play className="ml-0.5 h-3.5 w-3.5 fill-current" aria-hidden="true" />
              </span>
            </button>
          )}

          <div className="mt-8 flex flex-wrap gap-2">
            {[pick.duration, "looping", "48 kHz", phase ? `${phase.label} · ${phase.illumination}% lit` : "…"].map(
              (t) => (
                <span
                  key={t}
                  className="glass-chip rounded-full px-3 py-1 text-[11px] tracking-wide text-mist-300"
                >
                  {t}
                </span>
              )
            )}
          </div>
        </div>

        {/* ── art side ── */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div
            aria-hidden="true"
            className="anim-drift absolute -inset-6 rounded-[3rem] bg-[radial-gradient(circle_at_60%_35%,rgba(205,180,124,0.14),transparent_65%)]"
          />
          <div className="glass-panel relative overflow-hidden rounded-[2.2rem] p-2.5">
            <div className="relative overflow-hidden rounded-[1.8rem]">
              <img
                src={pick.image}
                alt={`Moonlit rainfall over a dark lake — artwork for ${pick.name}`}
                className="aspect-[4/3] w-full object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[linear-gradient(200deg,transparent_40%,rgba(4,6,15,0.75))]"
              />
              {/* audio-reactive glow — breathes with the live soundscape */}
              <div
                ref={pulseRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-0 transition-none mix-blend-screen"
                style={{
                  background:
                    "radial-gradient(90% 70% at 50% 100%, rgba(236,226,200,0.20), transparent 70%)",
                }}
              />
              {/* animated rain streaks over the artwork */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                {Array.from({ length: 14 }).map((_, i) => (
                  <span
                    key={i}
                    className="absolute w-px rounded-full bg-gradient-to-b from-transparent via-mist-200/40 to-transparent"
                    style={{
                      left: `${(i * 7.3 + 4) % 100}%`,
                      height: `${18 + (i % 4) * 8}%`,
                      top: "-30%",
                      animation: `rain-fall ${1.4 + (i % 5) * 0.35}s linear ${i * 0.22}s infinite`,
                    }}
                  />
                ))}
              </div>

              <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
                <div>
                  <p className="font-serif text-lg italic text-moon-100">Session 01</p>
                  <p className="text-xs text-mist-300">rain · distant thunder · night air</p>
                </div>
                <span className="glass-chip rounded-full px-2.5 py-1 font-mono text-[11px] text-moon-200">
                  {isThisActive ? "playing" : "45:00"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
