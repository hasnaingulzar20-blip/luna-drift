"use client";

import { useEffect, useState } from "react";
import { MoonStar, Play, X } from "lucide-react";
import { usePlayer } from "@/store/player";
import { SOUNDSCAPES, getSoundscape, type SoundscapeId } from "@/lib/soundscapes";

/**
 * "The drift was interrupted" — if the tab was closed (or refreshed) while a
 * room was still playing, the next visit offers to pick the drift back up.
 * Remembered for six hours; resuming or dismissing clears it.
 */

const KEY = "luna-restore";
const MAX_AGE_MS = 6 * 3600_000;

function relDrift(at: number): string {
  const mins = Math.round((Date.now() - at) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return "last night";
}

export default function RestoreChip() {
  const [hint, setHint] = useState<{ id: SoundscapeId; at: number } | null>(null);
  const [resumed, setResumed] = useState(false);

  // remember an interruption: the page hidden while a room was still live
  useEffect(() => {
    const save = () => {
      const s = usePlayer.getState();
      if (s.isPlaying && s.active) {
        try {
          sessionStorage.setItem(KEY, JSON.stringify({ id: s.active, at: Date.now() }));
        } catch {
          /* storage blocked — nothing to restore, which is fine */
        }
      }
    };
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, []);

  // on the next visit, offer to continue (only if the sound really stopped)
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(KEY);
    } catch {
      return;
    }
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { id?: unknown; at?: unknown };
      const valid =
        typeof parsed.id === "string" &&
        SOUNDSCAPES.some((s) => s.id === parsed.id) &&
        typeof parsed.at === "number" &&
        Date.now() - parsed.at <= MAX_AGE_MS &&
        Date.now() - parsed.at >= 0;
      if (!valid) throw new Error("stale or malformed");
      // let the intro curtain pass before whispering about it
      const t = window.setTimeout(() => {
        if (!usePlayer.getState().isPlaying) {
          setHint({ id: parsed.id as SoundscapeId, at: parsed.at as number });
        }
        // fade away on its own if ignored for a while
        window.setTimeout(() => setHint((cur) => (cur ? null : cur)), 60_000);
      }, 2600);
      return () => window.clearTimeout(t);
    } catch {
      try {
        sessionStorage.removeItem(KEY);
      } catch {
        /* noop */
      }
    }
  }, []);

  if (!hint) return null;

  const clear = () => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* noop */
    }
    setHint(null);
  };

  const resume = () => {
    usePlayer.getState().playSoundscape(hint.id);
    setResumed(true);
    window.setTimeout(clear, 2600);
  };

  const sc = getSoundscape(hint.id);

  return (
    <div
      role="dialog"
      aria-label="An interrupted drift can be resumed"
      className="fixed bottom-24 right-4 z-[69] w-[min(92vw,20.5rem)] sm:right-6"
    >
      <div className="glass-chip relative overflow-hidden rounded-2xl p-4 shadow-[0_24px_70px_-20px_rgba(2,4,12,0.95)] ring-1 ring-moon-200/25">
        <div
          aria-hidden="true"
          className="anim-breathe pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(205,180,124,0.14),transparent_70%)]"
        />
        {resumed ? (
          <p className="relative flex items-center gap-2 text-sm text-moon-100" aria-live="polite">
            <MoonStar className="h-4 w-4 text-moon-300" aria-hidden="true" />
            and the night continues…
          </p>
        ) : (
          <div className="relative">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-moon-300/80">
                  <MoonStar className="h-3 w-3" aria-hidden="true" />
                  the drift was interrupted
                </p>
                <p className="mt-1 truncate font-serif text-base text-moon-100">{sc.name}</p>
                <p className="text-[11px] text-mist-500">{relDrift(hint.at)}</p>
              </div>
              <button
                type="button"
                onClick={clear}
                aria-label="Dismiss resume suggestion"
                className="rounded-full p-1.5 text-mist-400 transition hover:bg-moon-200/10 hover:text-moon-100"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              onClick={resume}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-moon-200 px-4 py-2 text-xs font-medium text-night-950 transition hover:bg-moon-100"
            >
              <Play className="h-3 w-3 fill-current" aria-hidden="true" />
              pick up the drift
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
