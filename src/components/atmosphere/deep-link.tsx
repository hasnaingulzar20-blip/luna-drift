"use client";

import { useEffect, useState } from "react";
import { MoonStar, Play, X } from "lucide-react";
import { usePlayer } from "@/store/player";
import {
  SOUNDSCAPES,
  TONIGHTS_PICK,
  getSoundscape,
  type SoundscapeId,
} from "@/lib/soundscapes";

/**
 * Android home-screen shortcuts arrive asking for a room: /?sc=rain, /?sc=pick.
 * Audio still needs a human touch, so nothing auto-plays into the dark —
 * a small chip offers to begin it instead. Yields to an interrupted drift
 * (the restore chip tells a more important story) and to a live room.
 */

const RESTORE_KEY = "luna-restore";

function resolveScape(raw: string | null): SoundscapeId | null {
  if (!raw) return null;
  if (raw === "pick") return TONIGHTS_PICK.id;
  return SOUNDSCAPES.some((s) => s.id === raw) ? (raw as SoundscapeId) : null;
}

export default function DeepLink() {
  const [scape, setScape] = useState<SoundscapeId | null>(null);
  const [beginning, setBeginning] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const asked = resolveScape(params.get("sc"));
    if (!asked) return;

    // the ask never lingers in the address bar, whichever way the night goes
    params.delete("sc");
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/?${qs}` : "/");

    // let the intro curtain pass; an interrupted drift or a live room wins
    const t = window.setTimeout(() => {
      let restoreWaiting = false;
      try {
        restoreWaiting = Boolean(window.sessionStorage.getItem(RESTORE_KEY));
      } catch {
        /* storage shy — no restore, deep link may speak */
      }
      if (!usePlayer.getState().isPlaying && !restoreWaiting) {
        setScape(asked);
        // fade away on its own if ignored for a while
        window.setTimeout(() => setScape((cur) => (cur ? null : cur)), 60_000);
      }
    }, 2800);
    return () => window.clearTimeout(t);
  }, []);

  if (!scape) return null;

  const begin = () => {
    usePlayer.getState().playSoundscape(scape);
    setBeginning(true);
    window.setTimeout(() => setScape(null), 2600);
  };

  const sc = getSoundscape(scape);

  return (
    <div
      role="dialog"
      aria-label="A soundscape arrived with the link"
      className="immersive-hide fixed bottom-24 left-1/2 z-[68] w-[min(92vw,20.5rem)] -translate-x-1/2"
    >
      <div className="glass-chip relative overflow-hidden rounded-2xl p-4 text-center shadow-[0_24px_70px_-20px_rgba(2,4,12,0.95)] ring-1 ring-moon-200/25">
        <div
          aria-hidden="true"
          className="anim-breathe pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(205,180,124,0.14),transparent_70%)]"
        />
        {beginning ? (
          <p
            className="relative flex items-center justify-center gap-2 text-sm text-moon-100"
            aria-live="polite"
          >
            <MoonStar className="h-4 w-4 text-moon-300" aria-hidden="true" />
            and so the {sc.name.toLowerCase()} begins…
          </p>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => setScape(null)}
              aria-label="Dismiss the linked soundscape"
              className="absolute -right-1 -top-1 rounded-full p-1.5 text-mist-400 transition hover:bg-moon-200/10 hover:text-moon-100"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <p className="flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-moon-300/80">
              <MoonStar className="h-3 w-3" aria-hidden="true" />
              it asked for a room
            </p>
            <p className="mt-1 font-serif text-base text-moon-100">{sc.name}</p>
            <p className="mt-0.5 text-[11px] text-mist-500">drifted in with the link</p>
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
