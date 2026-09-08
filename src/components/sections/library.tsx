"use client";

import { useMemo, useState } from "react";
import { Dices, Moon, Pause, Play, Star } from "lucide-react";
import { SOUNDSCAPES, TONIGHTS_PICK, getSoundscape, type SoundscapeId } from "@/lib/soundscapes";
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
  const [surprised, setSurprised] = useState(false);

  // a stranger room, chosen kindly: never the one already playing
  const surprise = () => {
    const s = usePlayer.getState();
    const pool = SOUNDSCAPES.filter((sc) => sc.id !== s.active);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    s.playSoundscape(pick.id);
    setSurprised(true);
    window.setTimeout(() => setSurprised(false), 2400);
  };

  const visible = useMemo(
    () =>
      filter === "favorites"
        ? SOUNDSCAPES.filter((s) => favorites.includes(s.id))
        : SOUNDSCAPES,
    [filter, favorites]
  );

  return (
    <section id="library" aria-label="Soundscape library" className="relative mt-24 scroll-mt-28 sm:mt-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-moon-300/80">
              <span className="text-moon-300/40" aria-hidden="true">II</span>
              <span className="mx-1.5 text-white/20" aria-hidden="true">·</span>The Library
            </p>
            <h2 className="mt-3 font-serif text-3xl font-light text-moon-100 sm:text-4xl">
              Nine rooms of quiet
            </h2>
          </div>

          {/* surprise + filter chips */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={surprise}
              aria-label="Let the night choose a room for you"
              title="let the night choose"
              className="group flex h-9 items-center gap-2 rounded-full border border-dashed border-moon-200/25 px-4 text-xs text-mist-300 transition hover:border-moon-200/50 hover:bg-moon-200/10 hover:text-moon-100"
            >
              <Dices
                className="h-3.5 w-3.5 transition-transform duration-500 group-hover:rotate-180"
                aria-hidden="true"
              />
              {surprised ? "the night chose…" : "surprise me"}
            </button>
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

                    {/* weather flourishes — each room breathes its own element on hover */}
                    {s.id === "snow" && (hovered === s.id || isActive) && (
                      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
                        {Array.from({ length: 16 }).map((_, i) => (
                          <span
                            key={i}
                            className="anim-snow absolute rounded-full bg-white/85"
                            style={{
                              left: `${(i * 61 + 13) % 100}%`,
                              top: "-8px",
                              width: `${2 + (i % 3)}px`,
                              height: `${2 + (i % 3)}px`,
                              animationDelay: `${(i % 8) * 0.9}s`,
                              animationDuration: `${6.5 + (i % 5) * 1.6}s`,
                              opacity: 0,
                            }}
                          />
                        ))}
                      </div>
                    )}
                    {s.id === "fireplace" && (hovered === s.id || isActive) && (
                      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
                        {Array.from({ length: 9 }).map((_, i) => (
                          <span
                            key={i}
                            className="anim-ember absolute rounded-full"
                            style={{
                              left: `${8 + ((i * 37) % 84)}%`,
                              bottom: "6px",
                              width: `${2 + (i % 2)}px`,
                              height: `${2 + (i % 2)}px`,
                              background: i % 2 === 0 ? "#f0b98a" : "#e09659",
                              boxShadow: "0 0 6px rgba(224,150,89,0.8)",
                              animationDelay: `${(i % 6) * 0.7}s`,
                              animationDuration: `${4.5 + (i % 4) * 1.3}s`,
                              opacity: 0,
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* tonight's pick — a small crescent ties the card to the hero */}
                    {s.id === TONIGHTS_PICK && (
                      <span className="glass-chip absolute bottom-3 left-3.5 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] tracking-widest text-moon-200">
                        <Moon className="h-3 w-3" aria-hidden="true" />
                        tonight&apos;s pick
                      </span>
                    )}

                    {/* sheen sweep — moonlight crossing the glass on hover */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 -translate-x-[135%] bg-[linear-gradient(105deg,transparent_40%,rgba(236,226,200,0.09)_48%,rgba(236,226,200,0.16)_50%,rgba(236,226,200,0.09)_52%,transparent_60%)] transition-transform duration-[1500ms] ease-out group-hover:translate-x-[135%]"
                    />

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

                    {/* "sounds like" chips */}
                    <div className="mt-3 flex flex-wrap gap-1.5" aria-label={`${s.name} sounds like`}>
                      {s.notes.map((n) => (
                        <span
                          key={n}
                          className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5 text-[10px] tracking-wide text-mist-400 transition-colors duration-500 group-hover:border-moon-200/20 group-hover:text-mist-300"
                        >
                          {n}
                        </span>
                      ))}
                    </div>

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
