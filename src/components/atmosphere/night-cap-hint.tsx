"use client";

import { useEffect, useRef, useState } from "react";
import { Moon, MoonStar, X } from "lucide-react";
import { usePlayer } from "@/store/player";

/**
 * Past eleven, the night cap makes itself known: the first time a drift
 * begins in the late hours, a small chip offers to ceiling the sudden louds.
 * Once per visit; turning it on is one tap, ignoring it is silence.
 */

const SEEN_KEY = "luna-nightcap-hint";
const AUTO_HIDE_MS = 14_000;

function lateHour() {
  const h = new Date().getHours();
  return h >= 23 || h < 5;
}

export default function NightCapHint() {
  const [hint, setHint] = useState<"offer" | "done" | null>(null);
  const wasPlaying = useRef(false);

  useEffect(() => {
    const unsub = usePlayer.subscribe((s) => {
      if (s.isPlaying && !wasPlaying.current) {
        // a drift began — if it's late and the ceiling is off, whisper once
        if (lateHour() && !s.nightCap) {
          let seen = false;
          try {
            seen = sessionStorage.getItem(SEEN_KEY) === "1";
          } catch {
            /* storage blocked — still show, but never nag on re-render */
          }
          if (!seen) {
            try {
              sessionStorage.setItem(SEEN_KEY, "1");
            } catch {
              /* noop */
            }
            setHint("offer");
            window.setTimeout(
              () => setHint((cur) => (cur === "offer" ? null : cur)),
              AUTO_HIDE_MS
            );
          }
        }
      }
      wasPlaying.current = s.isPlaying;
    });
    return unsub;
  }, []);

  if (!hint) return null;

  const dismiss = () => setHint(null);

  const accept = () => {
    usePlayer.getState().setNightCap(true);
    setHint("done");
    window.setTimeout(dismiss, 2400);
  };

  return (
    <div
      role="dialog"
      aria-label="A night cap is suggested for the late hours"
      className="fixed bottom-24 left-4 z-[69] w-[min(92vw,20.5rem)] sm:left-6"
    >
      <div className="glass-chip relative overflow-hidden rounded-2xl p-4 shadow-[0_24px_70px_-20px_rgba(2,4,12,0.95)] ring-1 ring-moon-200/25">
        <div
          aria-hidden="true"
          className="anim-breathe pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(205,180,124,0.13),transparent_70%)]"
        />
        {hint === "done" ? (
          <p className="relative flex items-center gap-2 text-sm text-moon-100" aria-live="polite">
            <MoonStar className="h-4 w-4 text-moon-300" aria-hidden="true" />
            the night softens…
          </p>
        ) : (
          <div className="relative">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-moon-300/80">
                  <Moon className="h-3 w-3" aria-hidden="true" />
                  it&apos;s late
                </p>
                <p className="mt-1 font-serif text-[15px] leading-snug text-moon-100">
                  ease the sudden louds?
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-mist-500">
                  the night cap keeps thunder and horns gentle
                </p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss the night cap suggestion"
                className="rounded-full p-1.5 text-mist-400 transition hover:bg-moon-200/10 hover:text-moon-100"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              onClick={accept}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-moon-200 px-4 py-2 text-xs font-medium text-night-950 transition hover:bg-moon-100"
            >
              <Moon className="h-3 w-3 fill-current" aria-hidden="true" />
              turn on the night cap
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
