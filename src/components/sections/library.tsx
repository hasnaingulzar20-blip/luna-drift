"use client";

import { useMemo, useState } from "react";
import { Pause, Play, Star } from "lucide-react";
import { SOUNDSCAPES, getSoundscape, type SoundscapeId } from "@/lib/soundscapes";
import { usePlayer } from "@/store/player";
import { EqualizerBars } from "./site-header";

type Filter = "all" | "favorites";

export default function Library() {
  const active = usePlayer((s) => s.active);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const playSoundscape = usePlayer((s) => s.playSoundscape);
  const stopAll = usePlayer((s) => s.stopAll);
  const favorites = usePlayer((s) => s.favorites);
  const toggleFavorite = usePlayer((s) => s.toggleFavorite);
  const [hovered, setHovered] = useState<SoundscapeId | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(
    () =>
      filter === "favorites"
        ? SOUNDSCAPES.filter((s) => favorites.includes(s.id))
        : SOUNDSCAPES,
    [filter, favorites]
  );

  return (
    <section id="library" aria-label="Soundscape library" className="relative mt-24 sm:mt-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-moon-300/80">The Library</p>
            <h2 className="mt-3 font-serif text-3xl font-light text-moon-100 sm:text-4xl">
              Seven rooms of quiet
            </h2>
          </div>

          {/* filter chips */}
          <div
            role="tablist"
            aria-label="Filter soundscapes"
            className="flex items-center gap-1.5 rounded-full bg-white/[0.03] p-1 ring-1 ring-white/8"
          >
            {(
              [
                { key: "all" as Filter, label: "All rooms" },
                { key: "favorites" as Filter, label: "Favorites" },
              ]
            ).map((f) => {
              const selected = filter === f.key;
              return (
                <button
                  key={f.key}
                  role="tab"
                  aria-selected={selected}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs tracking-wide transition-all duration-300 ${
                    selected
                      ? "bg-moon-200 text-night-950 shadow-[0_0_18px_rgba(236,226,200,0.25)]"
                      : "text-mist-300 hover:text-moon-100"
                  }`}
                >
                  {f.key === "favorites" && (
                    <Star
                      className={`h-3 w-3 ${selected ? "fill-night-950" : "fill-moon-300/40 text-moon-300"}`}
                      aria-hidden="true"
                    />
                  )}
                  {f.label}
                  {f.key === "favorites" && favorites.length > 0 && (
                    <span
                      className={`font-mono text-[10px] ${selected ? "text-night-950/70" : "text-mist-500"}`}
                    >
                      {favorites.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="glass-panel mt-9 flex flex-col items-center gap-3 rounded-3xl px-6 py-14 text-center">
            <span className="relative flex h-12 w-12 items-center justify-center">
              <Star className="h-6 w-6 text-moon-300/50" aria-hidden="true" />
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(205,180,124,0.2),transparent_70%)]"
              />
            </span>
            <p className="font-serif text-xl italic text-moon-100">No favorites yet</p>
            <p className="max-w-xs text-sm leading-relaxed text-mist-400">
              Tap the star on any room and it will wait for you here — a shelf of familiar nights.
            </p>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="mt-2 rounded-full bg-moon-200/10 px-4 py-2 text-xs text-moon-100 ring-1 ring-moon-200/25 transition hover:bg-moon-200/20"
            >
              Browse all rooms
            </button>
          </div>
        ) : (
          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((s, idx) => {
              const isActive = isPlaying && active === s.id;
              const isFavorite = favorites.includes(s.id);
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

                    {/* favorite star */}
                    <button
                      type="button"
                      onClick={() => toggleFavorite(s.id)}
                      aria-pressed={isFavorite}
                      aria-label={isFavorite ? `Remove ${s.name} from favorites` : `Add ${s.name} to favorites`}
                      className={`absolute left-3.5 top-3.5 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition-all duration-300 ${
                        isFavorite
                          ? "bg-night-950/60 text-moon-200 ring-1 ring-moon-200/50 shadow-[0_0_16px_rgba(236,226,200,0.35)]"
                          : "bg-night-950/40 text-mist-300 ring-1 ring-white/10 opacity-0 hover:text-moon-200 focus-visible:opacity-100 group-hover:opacity-100"
                      }`}
                    >
                      <Star className={`h-4 w-4 ${isFavorite ? "fill-moon-200" : ""}`} aria-hidden="true" />
                    </button>
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
                          <>
                            {isFavorite && (
                              <Star className="h-3 w-3 fill-moon-300/50 text-moon-300" aria-hidden="true" />
                            )}
                            {getSoundscape(s.id).bpmHint}
                          </>
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
        )}
      </div>
    </section>
  );
}
