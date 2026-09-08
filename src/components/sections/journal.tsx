"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardCopy,
  Clock3,
  Download,
  FileDown,
  Flame,
  MoonStar,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { getSoundscape, type SoundscapeId } from "@/lib/soundscapes";
import { downloadNightCard } from "@/lib/night-card";
import DreamNotes from "./dream-notes";

interface SessionRow {
  id: string;
  soundscape: string;
  minutes: number;
  completed: boolean;
  endedAt: string;
}

interface InsightData {
  sessions: number;
  avgMinutes: number;
  bestNight: { day: string; minutes: number } | null;
  topSoundscape: string | null;
  topSoundscapeMinutes: number;
}

interface MonthCell {
  date: string;
  day: string;
  minutes: number;
}

interface ProfileData {
  streak: number;
  totalMinutes: number;
  week: { day: string; minutes: number }[];
  month?: MonthCell[];
  monthOffset?: number;
  recent: SessionRow[];
  insights?: InsightData;
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

/** download the whole ledger as CSV */
async function exportLedger() {
  try {
    const res = await fetch("/api/sessions", { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as {
      sessions: { soundscape: string; minutes: number; completed: boolean; endedAt: string }[];
    };
    const esc = (v: string | number | boolean) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      "date,soundscape,minutes,completed",
      ...json.sessions.map((s) =>
        [esc(new Date(s.endedAt).toISOString().slice(0, 16).replace("T", " ")), esc(s.soundscape), s.minutes, s.completed].join(",")
      ),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "luna-drift-ledger.csv";
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    /* the ledger can wait */
  }
}

/** build the gentle weekly digest text and copy it to the clipboard */
function buildDigest(data: ProfileData): string {
  const week = data.week ?? [];
  const nights = week.filter((d) => d.minutes > 0).length;
  const weekTotal = week.reduce((sum, d) => sum + d.minutes, 0);
  const best = week.reduce<{ day: string; minutes: number } | null>(
    (b, d) => (d.minutes > 0 && (!b || d.minutes > b.minutes) ? d : b),
    null
  );
  const hours = Math.floor(data.totalMinutes / 60);
  const rest = data.totalMinutes % 60;
  const top = data.insights?.topSoundscape ? prettyName(data.insights.topSoundscape) : null;
  const lines = [
    "the week that was — Luna Drift",
    `· ${nights} night${nights === 1 ? "" : "s"} with rest`,
  ];
  if (best) lines.push(`· best night ${best.day}, ${best.minutes} min`);
  if (top) lines.push(`· most heard: ${top}`);
  if (data.streak > 0) lines.push(`· a ${data.streak}-night streak, still burning`);
  lines.push(`· ${hours}h ${rest}m altogether`);
  if (weekTotal > 0) lines.push(`· ${weekTotal} min this week`);
  return lines.join("\n");
}

export default function Journal() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);
  const [digestCopied, setDigestCopied] = useState(false);

  const copyDigest = useCallback(async () => {
    if (!data || (data.insights?.sessions ?? 0) === 0) return;
    const text = buildDigest(data);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard API can be shy — fall back to a hidden textarea
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* give quietly */
      }
      ta.remove();
    }
    setDigestCopied(true);
    window.setTimeout(() => setDigestCopied(false), 2200);
  }, [data]);

  const load = useCallback(
    async (offset: number) => {
      try {
        const res = await fetch(`/api/profile?monthOffset=${offset}`, { cache: "no-store" });
        if (res.ok) {
          const json = (await res.json()) as ProfileData;
          setData((prev) =>
            offset === 0 || !prev
              ? json
              : // navigating: swap only the constellation, keep stats anchored to tonight
                { ...prev, month: json.month, monthOffset: json.monthOffset }
          );
        }
      } catch {
        /* keep last known */
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void load(monthOffset);
  }, [load, monthOffset]);

  useEffect(() => {
    const onRecorded = () => void load(monthOffset);
    window.addEventListener("luna:session-recorded", onRecorded);
    return () => window.removeEventListener("luna:session-recorded", onRecorded);
  }, [load, monthOffset]);

  const maxWeek = Math.max(30, ...(data?.week.map((d) => d.minutes) ?? [0]));
  const totalHours = data ? Math.floor(data.totalMinutes / 60) : 0;
  const restMinutes = data ? data.totalMinutes % 60 : 0;

  const monthCells = data?.month ?? [];
  const monthHasData = monthCells.length === 35;
  const monthTotal = monthCells.reduce((sum, d) => sum + d.minutes, 0);
  const monthNights = monthCells.filter((d) => d.minutes > 0).length;
  const windowRange =
    monthHasData && monthCells.length > 1
      ? `${monthCells[0].date} — ${monthCells[monthCells.length - 1].date}`
      : null;

  // sparkline geometry — the shape of the week, drawn over a quiet axis
  const weekData = data?.week ?? [];
  const nonZeroWeek = weekData.some((d) => d.minutes > 0);
  const sparkW = 300;
  const sparkH = 44;
  const sparkPoints = (() => {
    if (weekData.length < 2) return "";
    const step = sparkW / (weekData.length - 1);
    return (
      weekData
        .map((d, i) => {
          const x = i * step;
          const y = sparkH - 6 - (d.minutes / maxWeek) * (sparkH - 12);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ") || ""
    );
  })();

  return (
    <section id="journal" aria-label="Your sleep journal" className="relative mt-24 scroll-mt-28 sm:mt-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-moon-300/80">
              <span className="text-moon-300/40" aria-hidden="true">VII</span>
              <span className="mx-1.5 text-white/20" aria-hidden="true">·</span>Sleep Journal
            </p>
            <h2 className="mt-3 font-serif text-3xl font-light text-moon-100 sm:text-4xl">
              Every night, kept like a pressed flower
            </h2>
          </div>
          <div className="flex items-center gap-5">
            <p className="max-w-xs text-sm leading-relaxed text-mist-400">
              Streaks and minutes accrue quietly whenever a drift runs its course.
            </p>
            <button
              type="button"
              onClick={() =>
                data &&
                downloadNightCard({
                  streak: data.streak,
                  totalMinutes: data.totalMinutes,
                  topSoundscape: data.insights?.topSoundscape
                    ? prettyName(data.insights.topSoundscape)
                    : null,
                  week: data.week,
                })
              }
              disabled={!data || data.totalMinutes === 0}
              className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-moon-200/25 px-4 text-xs text-moon-200 transition hover:border-moon-200/50 hover:bg-moon-200/10 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Download a shareable night card image"
              title={
                data && data.totalMinutes > 0
                  ? "Save a shareable night card"
                  : "Complete a drift first — then the card writes itself"
              }
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">night card</span>
            </button>
            <button
              type="button"
              onClick={() => void copyDigest()}
              disabled={!data || (data.insights?.sessions ?? 0) === 0}
              className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/12 px-4 text-xs text-mist-300 transition hover:border-moon-200/40 hover:text-moon-100 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Copy a weekly digest as text"
              title={
                data && (data.insights?.sessions ?? 0) > 0
                  ? "Copy a gentle summary of your week"
                  : "No drifts recorded yet"
              }
            >
              {digestCopied ? (
                <ClipboardCheck className="h-3.5 w-3.5 text-moon-300" aria-hidden="true" />
              ) : (
                <ClipboardCopy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">{digestCopied ? "copied" : "digest"}</span>
            </button>
            <button
              type="button"
              onClick={() => void exportLedger()}
              disabled={!data || (data.insights?.sessions ?? 0) === 0}
              className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/12 px-4 text-xs text-mist-300 transition hover:border-moon-200/40 hover:text-moon-100 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Export all sessions as CSV"
              title={
                data && (data.insights?.sessions ?? 0) > 0
                  ? "Download every recorded drift as a CSV ledger"
                  : "No drifts recorded yet"
              }
            >
              <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">ledger</span>
            </button>
          </div>
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
                        className={`w-full max-w-9 rounded-lg transition-all duration-700 hover:brightness-125 ${
                          isToday
                            ? "bg-gradient-to-t from-moon-500/50 to-moon-200 shadow-[0_0_18px_rgba(205,180,124,0.3)]"
                            : d.minutes > 0
                              ? "bg-gradient-to-t from-night-500/70 to-mist-400/60"
                              : "bg-white/[0.05]"
                        }`}
                        style={{ height: `${h}%` }}
                        role="img"
                        aria-label={`${d.day}: ${d.minutes} minutes`}
                        title={`${d.day} — ${d.minutes} min`}
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

            {/* the shape of the week — a quiet trend line */}
            {nonZeroWeek && sparkPoints && (
              <div className="mt-4 rounded-2xl bg-white/[0.02] px-5 py-4 ring-1 ring-white/6">
                <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-mist-500">
                  <TrendingUp className="h-3 w-3 text-moon-300/80" aria-hidden="true" />
                  the shape of your week
                </p>
                <svg
                  viewBox={`0 0 ${sparkW} ${sparkH}`}
                  className="mt-2 h-11 w-full"
                  preserveAspectRatio="none"
                  role="img"
                  aria-label={`Trend of nightly rest across the week, best day ${data?.insights?.bestNight?.day ?? "—"}`}
                >
                  <defs>
                    <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(236,226,200,0.28)" />
                      <stop offset="100%" stopColor="rgba(236,226,200,0)" />
                    </linearGradient>
                    <linearGradient id="sparkLine" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#9fadd8" />
                      <stop offset="100%" stopColor="#ece2c8" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points={`0,${sparkH} ${sparkPoints} ${sparkW},${sparkH}`}
                    fill="url(#sparkFill)"
                  />
                  <polyline
                    points={sparkPoints}
                    fill="none"
                    stroke="url(#sparkLine)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {weekData.map((d, i) => {
                    if (d.minutes === 0) return null;
                    const step = sparkW / (weekData.length - 1);
                    const x = i * step;
                    const y = sparkH - 6 - (d.minutes / maxWeek) * (sparkH - 12);
                    return (
                      <circle key={i} cx={x} cy={y} r="2.4" fill="#ece2c8">
                        <title>{`${d.day}: ${d.minutes} min`}</title>
                      </circle>
                    );
                  })}
                </svg>
              </div>
            )}

            {/* insights strip */}
            {data?.insights && data.insights.sessions > 0 && (
              <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                <div
                  className="rounded-2xl bg-white/[0.03] px-4 py-3.5 ring-1 ring-white/6"
                  aria-label="Average drift length"
                >
                  <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-mist-500">
                    <Clock3 className="h-3 w-3 text-mist-400" aria-hidden="true" /> avg drift
                  </p>
                  <p className="mt-1.5 font-serif text-2xl font-light text-moon-100">
                    {data.insights.avgMinutes}
                    <span className="ml-1 text-sm text-mist-400">min</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-mist-500">
                    across {data.insights.sessions} drift{data.insights.sessions === 1 ? "" : "s"}
                  </p>
                </div>
                <div
                  className="rounded-2xl bg-white/[0.03] px-4 py-3.5 ring-1 ring-white/6"
                  aria-label="Best night this week"
                >
                  <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-mist-500">
                    <MoonStar className="h-3 w-3 text-moon-300/80" aria-hidden="true" /> best night
                  </p>
                  <p className="mt-1.5 font-serif text-2xl font-light text-moon-100">
                    {data.insights.bestNight ? data.insights.bestNight.day : "—"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-mist-500">
                    {data.insights.bestNight
                      ? `${data.insights.bestNight.minutes} min of rest`
                      : "the week is still young"}
                  </p>
                </div>
                <div
                  className="rounded-2xl bg-white/[0.03] px-4 py-3.5 ring-1 ring-white/6"
                  aria-label="Most heard soundscape"
                >
                  <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-mist-500">
                    <Sparkles className="h-3 w-3 text-moon-300/80" aria-hidden="true" /> most heard
                  </p>
                  <p className="mt-1.5 truncate font-serif text-2xl font-light text-moon-100">
                    {data.insights.topSoundscape ? prettyName(data.insights.topSoundscape) : "—"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-mist-500">
                    {data.insights.topSoundscape
                      ? `${data.insights.topSoundscapeMinutes} min together`
                      : "no favorite yet"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── the constellation of the month ── */}
        {data && data.month && data.month.length === 35 && (
          <div className="glass-panel relative mt-5 overflow-hidden rounded-3xl p-6 sm:p-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-10 -top-14 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(236,226,200,0.06),transparent_70%)]"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <p className="text-xs uppercase tracking-widest text-mist-400">
                  {monthOffset === 0 ? "the last five weeks, night by night" : "another stretch of sky"}
                </p>
                {windowRange && (
                  <span className="rounded-full bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] text-mist-400 ring-1 ring-white/8">
                    {windowRange}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* window navigation — wander back through older skies */}
                <button
                  type="button"
                  onClick={() => setMonthOffset((o) => Math.min(11, o + 1))}
                  disabled={monthOffset >= 11}
                  aria-label="Show the previous five weeks"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-mist-400 ring-1 ring-white/10 transition hover:bg-moon-200/10 hover:text-moon-100 disabled:cursor-not-allowed disabled:opacity-25"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setMonthOffset((o) => Math.max(0, o - 1))}
                  disabled={monthOffset === 0}
                  aria-label="Show the five weeks closer to tonight"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-mist-400 ring-1 ring-white/10 transition hover:bg-moon-200/10 hover:text-moon-100 disabled:cursor-not-allowed disabled:opacity-25"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {/* legend */}
              <div className="flex items-center gap-4 text-[10px] text-mist-500" aria-hidden="true">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full ring-1 ring-white/25" /> silent night
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-moon-200/70" /> rested
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded-full bg-moon-200 shadow-[0_0_10px_rgba(236,226,200,0.5)]" /> long night
                </span>
              </div>
            </div>

            {(() => {
              const month = data.month;
              const maxMonth = Math.max(30, ...month.map((d) => d.minutes));
              const todayIdx = monthOffset === 0 ? month.length - 1 : -1;
              const colLabels = month.slice(0, 7).map((d) => d.day);
              return (
                <>
                  <div className="mt-5 grid grid-cols-7 gap-2 sm:gap-2.5" aria-hidden="true">
                    {colLabels.map((l) => (
                      <span key={l} className="text-center text-[9px] uppercase tracking-[0.2em] text-mist-600">
                        {l}
                      </span>
                    ))}
                  </div>
                  <div
                    className="mt-2 grid grid-cols-7 gap-2 sm:gap-2.5"
                    role="img"
                    aria-label={`Constellation of the last five weeks: ${month.filter((d) => d.minutes > 0).length} nights with rest, brightest ${maxMonth} minutes`}
                  >
                    {month.map((d, i) => {
                      const intensity = d.minutes / maxMonth;
                      const size = d.minutes > 0 ? 5 + intensity * 10 : 5;
                      const isToday = i === todayIdx;
                      return (
                        <div key={i} className="group flex items-center justify-center">
                          <span
                            className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-700 ${
                              isToday ? "ring-1 ring-moon-200/40" : ""
                            }`}
                          >
                            {d.minutes > 0 ? (
                              <span
                                className={`block rounded-full bg-moon-200 transition-all duration-700 group-hover:scale-125 ${isToday ? "animate-pulse" : ""}`}
                                style={{
                                  width: `${size}px`,
                                  height: `${size}px`,
                                  opacity: 0.45 + intensity * 0.55,
                                  boxShadow: `0 0 ${4 + intensity * 14}px rgba(236,226,200,${0.25 + intensity * 0.45})`,
                                }}
                              />
                            ) : (
                              <span className="block h-1.5 w-1.5 rounded-full ring-1 ring-white/20 transition-transform duration-500 group-hover:scale-150 group-hover:ring-white/45" />
                            )}
                            {isToday && (
                              <span
                                aria-hidden="true"
                                className="absolute inset-0 rounded-full border border-moon-200/25"
                              />
                            )}
                            {/* quiet tooltip — surfaces on hover */}
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute -top-9 z-10 whitespace-nowrap rounded-lg bg-night-950/95 px-2.5 py-1 font-mono text-[10px] text-moon-100 opacity-0 shadow-[0_4px_18px_rgba(0,0,0,0.5)] ring-1 ring-white/10 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:opacity-100"
                            >
                              {d.date} · {d.minutes > 0 ? `${d.minutes}m` : "silent"}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-[11px] leading-relaxed text-mist-500">
                    each star is a night — the brighter it burns, the longer the drift.
                    {monthOffset === 0
                      ? " tonight keeps a small ring."
                      : monthTotal > 0
                        ? ` ${monthNights} night${monthNights === 1 ? "" : "s"} with rest · ${Math.floor(monthTotal / 60)}h ${monthTotal % 60}m in this stretch of sky.`
                        : " no drifts lit this stretch of sky."}
                  </p>
                </>
              );
            })()}
          </div>
        )}

        {/* ── dream notebook ── */}
        <DreamNotes />
      </div>
    </section>
  );
}
