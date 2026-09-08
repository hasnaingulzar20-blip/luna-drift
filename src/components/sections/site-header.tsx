"use client";

import { useEffect, useState } from "react";
import { Moon, Square, Sunrise } from "lucide-react";
import { usePlayer } from "@/store/player";
import { getSoundscape } from "@/lib/soundscapes";

function formatRemaining(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function EqualizerBars({ active }: { active: boolean }) {
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`w-[2.5px] rounded-full bg-moon-300 ${active ? "animate-pulse" : ""}`}
          style={
            active
              ? {
                  height: "100%",
                  animation: `breathe ${0.9 + i * 0.35}s ease-in-out ${i * 0.2}s infinite`,
                  transformOrigin: "bottom",
                }
              : { height: "30%" }
          }
        />
      ))}
    </span>
  );
}

export default function SiteHeader() {
  const active = usePlayer((s) => s.active);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const timerDuration = usePlayer((s) => s.timerDuration);
  const remainingSeconds = usePlayer((s) => s.remainingSeconds);
  const sequence = usePlayer((s) => s.sequence);
  const stopAll = usePlayer((s) => s.stopAll);
  const wakeAlarm = usePlayer((s) => s.wakeAlarm);
  const dawnMode = usePlayer((s) => s.dawnMode);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const nav = [
    { href: "#tonight", label: "Tonight" },
    { href: "#library", label: "Library" },
    { href: "#mixer", label: "Mixer" },
    { href: "#stories", label: "Stories" },
    { href: "#breathe", label: "Breathe" },
    { href: "#timer", label: "Timer" },
    { href: "#journal", label: "Journal" },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // the section drifting through the middle of the screen lights its nav link
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const sections = nav
      .map((n) => document.getElementById(n.href.slice(1)))
      .filter((el): el is HTMLElement => !!el);
    if (sections.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div
        className={`mx-auto mt-3 flex max-w-6xl items-center justify-between gap-3 rounded-2xl px-4 py-2.5 sm:px-5 transition-all duration-500 ${
          scrolled
            ? "glass-chip shadow-[0_18px_50px_-20px_rgba(2,4,12,0.9)] bg-night-900/70"
            : "glass-chip"
        }`}
      >
        <a href="#tonight" className="group flex items-center gap-2.5">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-moon-200/10 ring-1 ring-moon-200/30 transition group-hover:ring-moon-200/60">
            <Moon className="h-4 w-4 text-moon-200 transition-transform duration-500 group-hover:-rotate-12" />
          </span>
          <span className="font-serif text-lg tracking-wide text-moon-100">
            Luna <span className="italic text-moon-300">Drift</span>
          </span>
        </a>

        <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
          {nav.map((n) => {
            const isActive = activeSection === n.href.slice(1);
            return (
              <a
                key={n.href}
                href={n.href}
                aria-current={isActive ? "true" : undefined}
                className={`relative rounded-full px-3 py-1.5 text-[13px] transition-all duration-300 hover:bg-moon-200/8 hover:text-moon-100 ${
                  isActive ? "bg-moon-200/10 text-moon-100" : "text-mist-300"
                }`}
              >
                {n.label}
                <span
                  aria-hidden="true"
                  className={`absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-moon-200 transition-all duration-500 ${
                    isActive ? "opacity-90 shadow-[0_0_8px_rgba(236,226,200,0.9)]" : "opacity-0"
                  }`}
                />
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {isPlaying && active && (
            <div className="glass-chip flex items-center gap-2.5 rounded-full px-3 py-1.5">
              <EqualizerBars active />
              <span className="hidden text-xs text-mist-200 sm:block">
                {getSoundscape(active).name}
              </span>
              {timerDuration && (
                <span className="rounded-full bg-moon-200/10 px-2 py-0.5 font-mono text-[11px] text-moon-200">
                  {formatRemaining(remainingSeconds)}
                </span>
              )}
              {sequence && (
                <span
                  className="rounded-full bg-moon-200/10 px-2 py-0.5 font-mono text-[10px] tracking-wide text-moon-200"
                  title={`Wind-down: ${sequence.name} — step ${sequence.stepIndex + 1} of ${sequence.steps.length}`}
                >
                  WD {sequence.stepIndex + 1}/{sequence.steps.length}
                </span>
              )}
              {dawnMode && (
                <span
                  className="rounded-full bg-ember-400/10 px-2 py-0.5 font-mono text-[10px] tracking-wide text-ember-300"
                  title="Drifting till dawn — the room whispers until morning"
                >
                  till dawn
                </span>
              )}
              <button
                type="button"
                onClick={() => stopAll()}
                aria-label="Stop all sound"
                className="rounded-full p-1 text-mist-300 transition hover:bg-moon-200/10 hover:text-moon-100"
              >
                <Square className="h-3 w-3 fill-current" />
              </button>
            </div>
          )}
          <a
            href="#timer"
            className="hidden rounded-full border border-moon-200/25 px-3.5 py-1.5 text-xs text-moon-200 transition hover:border-moon-200/50 hover:bg-moon-200/10 sm:block"
          >
            Set a timer
          </a>
          {wakeAlarm.enabled && (
            <a
              href="#timer"
              aria-label={`Wake light armed for ${wakeAlarm.time}`}
              title={`Wake light armed for ${wakeAlarm.time}`}
              className="flex items-center gap-1.5 rounded-full border border-ember-300/35 bg-ember-400/10 px-3 py-1.5 text-xs text-ember-300 transition hover:border-ember-300/60 hover:bg-ember-400/20"
            >
              <Sunrise className="h-3 w-3" aria-hidden="true" />
              <span className="font-mono">{wakeAlarm.time}</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
