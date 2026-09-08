"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock3, MoonStar, Play, X } from "lucide-react";
import { usePlayer } from "@/store/player";
import { SOUNDSCAPES, TONIGHTS_PICK, getSoundscape, type SoundscapeId } from "@/lib/soundscapes";

/**
 * The wake window — the journal already knows which hours usually hold the
 * drift (nightHours). When the clock closes in on that peak and the night is
 * still silent, a quiet chip wonders out loud whether tonight's drift should
 * begin. Dismissed once per day; never nags mid-drift.
 */

const DAY_KEY = "luna-nudge-day";
const RECHECK_MS = 10 * 60_000; // re-evaluate while the tab rests open
const MIN_HISTORY_MINUTES = 20; // too little data, too shy to speak up

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function hourLabel(h: number) {
  const suffix = h >= 12 ? "pm" : "am";
  const base = h % 12 === 0 ? 12 : h % 12;
  return `${base}${suffix}`;
}

function withinWindow(nowHour: number, peak: number) {
  const diff = Math.abs(nowHour - peak);
  return Math.min(diff, 24 - diff) <= 1;
}

export default function WakeWindowNudge() {
  const [hint, setHint] = useState<{ id: SoundscapeId; peak: number } | null>(null);
  const [resumed, setResumed] = useState(false);

  const evaluate = useCallback(async () => {
    const s = usePlayer.getState();
    if (s.isPlaying) return;
    try {
      const res = await fetch("/api/profile", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { nightHours?: number[]; insights?: { topSoundscape?: string | null } };
      const hours = data.nightHours;
      if (!Array.isArray(hours) || hours.length !== 24) return;
      let peak = -1;
      let peakMinutes = 0;
      hours.forEach((m, h) => {
        if (m > peakMinutes) {
          peakMinutes = m;
          peak = h;
        }
      });
      if (peak < 0 || peakMinutes < MIN_HISTORY_MINUTES) return;
      if (!withinWindow(new Date().getHours(), peak)) return;
      try {
        if (localStorage.getItem(DAY_KEY) === todayKey()) return;
      } catch {
        /* storage blocked — allow the nudge */
      }
      const top = data.insights?.topSoundscape;
      const id = SOUNDSCAPES.some((sc) => sc.id === top) ? (top as SoundscapeId) : TONIGHTS_PICK;
      setHint({ id, peak });
    } catch {
      /* offline — the night can manage without its reminder */
    }
  }, []);

  useEffect(() => {
    // let the intro curtain and the restore chip settle in first
    const first = window.setTimeout(() => void evaluate(), 5000);
    const interval = window.setInterval(() => void evaluate(), RECHECK_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [evaluate]);

  // a started drift quietly withdraws the invitation
  useEffect(() => {
    const unsub = usePlayer.subscribe((s) => {
      if (s.isPlaying) setHint((cur) => (cur ? null : cur));
    });
    return unsub;
  }, []);

  if (!hint) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DAY_KEY, todayKey());
    } catch {
      /* noop */
    }
    setHint(null);
  };

  const begin = () => {
    usePlayer.getState().playSoundscape(hint.id);
    setResumed(true);
    window.setTimeout(dismiss, 2600);
  };

  const sc = getSoundscape(hint.id);

  return (
    <div
      role="dialog"
      aria-label="Your usual drift hour is approaching"
      className="fixed bottom-24 left-4 z-[69] w-[min(92vw,20.5rem)] sm:left-6"
    >
      <div className="glass-chip relative overflow-hidden rounded-2xl p-4 shadow-[0_24px_70px_-20px_rgba(2,4,12,0.95)] ring-1 ring-moon-200/25">
        <div
          aria-hidden="true"
          className="anim-breathe pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(205,180,124,0.14),transparent_70%)]"
        />
        {resumed ? (
          <p className="relative flex items-center gap-2 text-sm text-moon-100" aria-live="polite">
            <MoonStar className="h-4 w-4 text-moon-300" aria-hidden="true" />
            the usual hour, honored…
          </p>
        ) : (
          <div className="relative">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-moon-300/80">
                  <Clock3 className="h-3 w-3" aria-hidden="true" />
                  your usual drift hour
                </p>
                <p className="mt-1 truncate font-serif text-base text-moon-100">{sc.name}</p>
                <p className="text-[11px] text-mist-500">
                  most nights begin near {hourLabel(hint.peak)}
                </p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss tonight's drift-hour suggestion"
                className="rounded-full p-1.5 text-mist-400 transition hover:bg-moon-200/10 hover:text-moon-100"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              onClick={begin}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-moon-200 px-4 py-2 text-xs font-medium text-night-950 transition hover:bg-moon-100"
            >
              <Play className="h-3 w-3 fill-current" aria-hidden="true" />
              begin the drift
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
