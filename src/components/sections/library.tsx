"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { SOUNDSCAPES, getSoundscape, type SoundscapeId } from "@/lib/soundscapes";
import { usePlayer } from "@/store/player";
import { EqualizerBars } from "./site-header";

export default function Library() {
  const active = usePlayer((s) => s.active);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const playSoundscape = usePlayer((s) => s.playSoundscape);
  const stopAll = usePlayer((s) => s.stopAll);
  const [hovered, setHovered] = useState<SoundscapeId | null>(null);

  return (
    <section id="library" aria-label="Soundscape library" className="relative mt-24 sm:mt-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-moon-300/80">The Library</p>
            <h2 className="mt-3 font-serif text-3xl font-light text-moon-100 sm:text-4xl">
              Six rooms of quiet
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-mist-400">
            Each room loops forever, tuned for sleep — never a sudden end, never an ad.
          </p>
        </div>

        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SOUNDSCAPES.map((s, idx) => {
            const isActive = isPlaying && active === s.id;
            return (
              <article
                key={s.id}
                onMouseEnter={() => setHovered(s.id)}
                onMouseLeave={() => setHovered(null)}
                className={`group relative overflow-hidden rounded-3xl transition-all duration-500 ${
                  isActive
                    ? "ring-1 ring-moon-200/45 shadow-[0_0_50px_-8px_rgba(205,180,124,0.35)]"
                    : "ring-1 ring-white/5 hover:ring-moon-200/25"
                }`}
                style={{ transitionDelay: `${idx * 12}ms` }}
              >
                {/* art */}
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={s.image}
                    alt={`${s.name} artwork`}
                    loading="lazy"
                    className={`h-full w-full object-cover transition-transform duration-[3.5s] ease-out ${
                      hovered === s.id || isActive ? "scale-[1.06]" : "scale-100"
                    }`}
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-[linear-gradient(185deg,transparent_30%,rgba(4,6,15,0.9)_96%)]"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-24 opacity-70 mix-blend-screen"
                    style={{ background: `radial-gradient(60% 100% at 50% 115%, ${s.glow}, transparent)` }}
                  />
                  <span className="glass-chip absolute right-3.5 top-3.5 rounded-full px-2.5 py-1 text-[10px] tracking-widest text-mist-200">
                    {s.duration.toUpperCase()}
                  </span>
                </div>

                {/* body */}
                <div className="relative -mt-9 px-5 pb-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-serif text-[22px] leading-tight text-moon-100">{s.name}</h3>
                      <p className="mt-0.5 text-xs text-mist-400">{s.tagline}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => (isActive ? stopAll() : playSoundscape(s.id as SoundscapeId))}
                      aria-label={isActive ? `Pause ${s.name}` : `Play ${s.name}`}
                      className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                        isActive
                          ? "bg-moon-200 text-night-950 shadow-[0_0_28px_rgba(236,226,200,0.4)]"
                          : "bg-moon-200/10 text-moon-100 ring-1 ring-moon-200/25 hover:bg-moon-200 hover:text-night-950"
                      }`}
                    >
                      {isActive ? (
                        <Pause className="h-4 w-4 fill-current" aria-hidden="true" />
                      ) : (
                        <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-mist-300/90">
                    {s.description}
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <span
                      className={`flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] transition-opacity duration-500 ${
                        isActive ? "text-moon-300" : "text-mist-500 opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {isActive ? (
                        <>
                          <EqualizerBars active /> now drifting
                        </>
                      ) : (
                        getSoundscape(s.id).bpmHint
                      )}
                    </span>
                    <span
                      aria-hidden="true"
                      className="h-px flex-1 mx-3 opacity-40"
                      style={{ background: `linear-gradient(90deg, transparent, ${s.hue}55, transparent)` }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
