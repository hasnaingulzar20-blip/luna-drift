"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import {
  CloudMoon,
  MoonStar,
  NotebookPen,
  Sparkles,
  Sun,
  Sunrise,
  Trash2,
} from "lucide-react";
import Ornament from "@/components/atmosphere/ornament";

interface DreamRow {
  id: string;
  body: string;
  mood: string;
  createdAt: string;
}

const MOODS = [
  { key: "calm", label: "calm", Icon: MoonStar },
  { key: "hopeful", label: "hopeful", Icon: Sunrise },
  { key: "melancholy", label: "melancholy", Icon: CloudMoon },
  { key: "strange", label: "strange", Icon: Sparkles },
  { key: "joyful", label: "joyful", Icon: Sun },
] as const;

const MOOD_ACCENT: Record<string, string> = {
  calm: "#c7d3f4",
  hopeful: "#f0b98a",
  melancholy: "#8fa1c4",
  strange: "#cdb47c",
  joyful: "#ece2c8",
};

const MAX_BODY = 400;

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "last night" : `${days} nights ago`;
}

export default function DreamNotes() {
  const [dreams, setDreams] = useState<DreamRow[] | null>(null);
  const [text, setText] = useState("");
  const [mood, setMood] = useState<string>("calm");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dreams", { cache: "no-store" });
      if (res.ok) {
        const j = (await res.json()) as { dreams: DreamRow[] };
        setDreams(j.dreams);
      }
    } catch {
      /* keep whatever we have */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    const body = text.trim();
    if (!body || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/dreams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, mood }),
      });
      if (res.ok) {
        const j = (await res.json()) as { dream: DreamRow };
        setDreams((d) => [j.dream, ...(d ?? [])]);
        setText("");
      } else {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "The dream slipped away — try once more.");
      }
    } catch {
      setError("The dream slipped away — try once more.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setDreams((d) => d?.filter((x) => x.id !== id) ?? null);
    try {
      await fetch(`/api/dreams?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch {
      /* it will come back on next load if the delete failed */
    }
  };

  return (
    <div className="glass-panel relative mt-5 overflow-hidden rounded-3xl p-6 sm:p-8">
      <div
        aria-hidden="true"
        className="anim-drift pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(183,163,214,0.10),transparent_70%)]"
      />
      <Ornament />
      <div className="relative mt-7 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        {/* write a dream */}
        <div>
          <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-mist-300">
            <NotebookPen className="h-3.5 w-3.5 text-moon-300" aria-hidden="true" />
            dream notebook
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-mist-400">
            Woke from something worth keeping? Two lines now, before it dissolves — dreams fade
            faster than moonlight on a wall.
          </p>

          <div className="mt-5">
            <label htmlFor="dream-text" className="sr-only">
              Write down your dream
            </label>
            <textarea
              id="dream-text"
              value={text}
              maxLength={MAX_BODY}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              rows={4}
              placeholder="I was walking through a house with no ceilings, and…"
              className="w-full resize-none rounded-2xl border border-moon-200/15 bg-white/[0.03] px-4 py-3.5 text-sm leading-relaxed text-moon-100 outline-none transition placeholder:text-mist-600 focus:border-moon-200/40 focus:bg-moon-200/[0.05]"
            />
            <div className="mt-1.5 flex items-center justify-between">
              <span className="font-mono text-[10px] text-mist-600">
                {text.length}/{MAX_BODY}
              </span>
              {error && <span className="text-[11px] text-ember-300">{error}</span>}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-mist-500">its weather</p>
            <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Dream mood">
              {MOODS.map(({ key, label, Icon }) => {
                const selected = mood === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setMood(key)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] transition-all duration-300 ${
                      selected
                        ? "text-night-950"
                        : "bg-white/[0.03] text-mist-300 ring-1 ring-white/10 hover:text-moon-100"
                    }`}
                    style={
                      selected
                        ? {
                            background: MOOD_ACCENT[key],
                            boxShadow: `0 0 16px ${MOOD_ACCENT[key]}55`,
                          }
                        : undefined
                    }
                  >
                    <Icon className="h-3 w-3" aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void save()}
            disabled={!text.trim() || saving}
            className="mt-5 flex h-11 items-center gap-2 rounded-full bg-moon-200 px-6 text-sm font-medium text-night-950 shadow-[0_0_24px_rgba(236,226,200,0.25)] transition hover:bg-moon-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
          >
            {saving ? "Keeping it…" : "Keep this dream"}
          </button>
        </div>

        {/* kept dreams */}
        <div className="min-w-0">
          <p className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-mist-500">
            <span>kept dreams</span>
            {dreams && dreams.length > 0 && (
              <span className="font-mono normal-case tracking-normal">
                {dreams.length} kept
              </span>
            )}
          </p>
          <div className="mt-3 max-h-72 space-y-2.5 overflow-y-auto pr-1">
            {dreams === null && (
              <div className="space-y-2.5" aria-hidden="true">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-xl bg-white/[0.03] ring-1 ring-white/5"
                    style={{ animationDelay: `${i * 0.3}s` }}
                  />
                ))}
              </div>
            )}
            {dreams !== null && dreams.length === 0 && (
              <p className="flex items-center gap-2 rounded-xl bg-moon-200/[0.04] px-4 py-3.5 text-xs text-mist-400">
                <MoonStar className="h-3.5 w-3.5 text-moon-300/70" aria-hidden="true" />
                Nothing kept yet — the first one is usually the strangest.
              </p>
            )}
            {dreams?.map((d) => {
              const moodMeta = MOODS.find((m) => m.key === d.mood) ?? MOODS[0];
              const accent = MOOD_ACCENT[d.mood] ?? MOOD_ACCENT.calm;
              return (
                <article
                  key={d.id}
                  className="group relative flex items-start gap-3 rounded-xl bg-white/[0.025] px-4 py-3.5 ring-1 ring-white/5 transition hover:ring-moon-200/20"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1"
                    style={
                      {
                        background: `${accent}14`,
                        boxShadow: `0 0 12px ${accent}22`,
                        "--tw-ring-color": `${accent}55`,
                      } as CSSProperties
                    }
                  >
                    <moodMeta.Icon className="h-3.5 w-3.5" style={{ color: accent }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-moon-100/90">
                      {d.body}
                    </p>
                    <p className="mt-1.5 text-[11px] text-mist-500">
                      <span style={{ color: `${accent}bb` }}>{moodMeta.label}</span> ·{" "}
                      {relTime(d.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void remove(d.id)}
                    aria-label="Let this dream go"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-mist-600 opacity-0 ring-1 ring-white/10 transition hover:bg-red-500/10 hover:text-red-300 focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
