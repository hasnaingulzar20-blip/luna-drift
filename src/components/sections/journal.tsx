"use client";

import { useCallback, useEffect, useState } from "react";
import { Flame, Clock3, MoonStar, Sparkles } from "lucide-react";
import { getSoundscape, type SoundscapeId } from "@/lib/soundscapes";

interface SessionRow {
  id: string;
  soundscape: string;
  minutes: number;
  completed: boolean;
  endedAt: string;
}

interface ProfileData {
  streak: number;
  totalMinutes: number;
  week: { day: string; minutes: number }[];
  recent: SessionRow[];
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

function prettyName(id: string) {
  try {
    return getSoundscape(id as SoundscapeId).name;
  } catch {
    return id;
  }
}

export default function Journal() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/profile", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      /* keep last known */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const onRecorded = () => void load();
    window.addEventListener("luna:session-recorded", onRecorded);
    return () => window.removeEventListener("luna:session-recorded", onRecorded);
  }, [load]);

  const maxWeek = Math.max(30, ...(data?.week.map((d) => d.minutes) ?? [0]));
  const totalHours = data ? Math.floor(data.totalMinutes / 60) : 0;
  const restMinutes = data ? data.totalMinutes % 60 : 0;

  return (
    <section id="journal" aria-label="Your sleep journal" className="relative mt-24 sm:mt-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-moon-300/80">Sleep Journal</p>
            <h2 className="mt-3 font-serif text-3xl font-light text-moon-100 sm:text-4xl">
              Every night, kept like a pressed flower
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-mist-400">
            Streaks and minutes accrue quietly whenever a drift runs its course.
          </p>
        </div>

        <div className="mt-9 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          {/* stat cards */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="glass-panel relative overflow-hidden rounded-3xl p-6">
              <div
                aria-hidden="true"
                className="anim-breathe absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(205,180,124,0.18),transparent_70%)]"
              />
              <Flame className="h-5 w-5 text-moon-300" aria-hidden="true" />
              <p className="mt-5 font-serif text-5xl font-light text-moon-100">
                {loading ? "—" : data?.streak ?? 0}
              </p>
              <p className="mt-1 text-sm text-mist-300">night streak</p>
              <p className="mt-3 text-xs leading-relaxed text-mist-500">
                {data && data.streak > 1
                  ? "the moon has watched over you in a row"
                  : "return tomorrow to begin a chain of nights"}
              </p>
            </div>

            <div className="glass-panel relative overflow-hidden rounded-3xl p-6">
              <div
                aria-hidden="true"
                className="anim-breathe absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(143,161,196,0.16),transparent_70%)]"
                style={{ animationDelay: "1.4s" }}
              />
              <Clock3 className="h-5 w-5 text-mist-200" aria-hidden="true" />
              <p className="mt-5 font-serif text-5xl font-light text-moon-100">
                {loading ? "—" : totalHours}
                <span className="ml-1.5 text-xl text-mist-400">h</span>
                <span className="ml-3 text-2xl text-mist-300">{restMinutes}</span>
                <span className="ml-1 text-xl text-mist-400">m</span>
              </p>
              <p className="mt-1 text-sm text-mist-300">slept with sound</p>
              <p className="mt-3 text-xs leading-relaxed text-mist-500">
                minutes of drift completed, all nights counted together
              </p>
            </div>

            {/* recent sessions */}
            <div className="glass-panel rounded-3xl p-6 sm:col-span-2">
              <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-mist-400">
                <Sparkles className="h-3 w-3 text-moon-300/80" aria-hidden="true" /> recent drifts
              </p>
              <div className="mt-4 max-h-56 space-y-2.5 overflow-y-auto pr-1">
                {!loading && (!data || data.recent.length === 0) && (
                  <p className="flex items-center gap-2 rounded-xl bg-moon-200/[0.04] px-4 py-3.5 text-xs text-mist-400">
                    <MoonStar className="h-3.5 w-3.5 text-moon-300/70" aria-hidden="true" />
                    Nothing yet — tonight&apos;s first drift will be recorded here.
                  </p>
                )}
                {data?.recent.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.025] px-4 py-3 ring-1 ring-white/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-moon-100">{prettyName(s.soundscape)}</p>
                      <p className="text-[11px] text-mist-500">{relTime(s.endedAt)}</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      {s.completed && (
                        <span className="rounded-full bg-moon-200/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-moon-300">
                          full
                        </span>
                      )}
                      <span className="font-mono text-xs text-mist-300">{s.minutes}m</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* week chart */}
          <div className="glass-panel relative overflow-hidden rounded-3xl p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-mist-400">this week&apos;s rest</p>
              <p className="font-mono text-xs text-mist-500">minutes / night</p>
            </div>
            <div className="mt-8 flex h-48 items-end justify-between gap-2.5 sm:gap-4">
              {(data?.week ?? Array.from({ length: 7 }, () => ({ day: "", minutes: 0 }))).map(
                (d, i) => {
                  const h = Math.max(3, Math.round((d.minutes / maxWeek) * 100));
                  const isToday = i === (data?.week.length ?? 7) - 1;
                  return (
                    <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                      <span className="font-mono text-[10px] text-mist-500">
                        {d.minutes > 0 ? d.minutes : ""}
                      </span>
                      <div
                        className={`w-full max-w-9 rounded-lg transition-all duration-700 ${
                          isToday
                            ? "bg-gradient-to-t from-moon-500/50 to-moon-200 shadow-[0_0_18px_rgba(205,180,124,0.3)]"
                            : d.minutes > 0
                              ? "bg-gradient-to-t from-night-500/70 to-mist-400/60"
                              : "bg-white/[0.05]"
                        }`}
                        style={{ height: `${h}%` }}
                        role="img"
                        aria-label={`${d.day}: ${d.minutes} minutes`}
                      />
                      <span className={`text-[10px] ${isToday ? "text-moon-300" : "text-mist-500"}`}>
                        {d.day}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
            <p className="mt-6 border-t border-white/5 pt-4 text-xs leading-relaxed text-mist-500">
              A drift counts once it has carried you at least a minute. Timers that run to their
              fade are marked <span className="text-moon-300">full</span>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
