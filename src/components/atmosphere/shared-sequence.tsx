"use client";

import { useEffect, useRef, useState } from "react";
import { Link2, X } from "lucide-react";
import { usePlayer } from "@/store/player";
import { getSoundscape, type SoundscapeId } from "@/lib/soundscapes";
import { totalSequenceMinutes, type SequenceSound } from "@/lib/sequences";
import { base64UrlDecode, base64UrlEncode } from "@/components/atmosphere/shared-mix";

/**
 * Shareable wind-down links: a whole handover encoded into the URL hash
 * (#seq=…), mirroring the #mix= pattern. Opening such a link shows a quiet
 * banner offering to keep the sequence on the personal shelf.
 */

export interface ShareableSequence {
  name: string;
  steps: { soundscape: SequenceSound; minutes: number }[];
}

/** Build a shareable URL carrying a wind-down sequence in the hash. */
export function buildSequenceLink(seq: {
  name: string;
  steps: { soundscape: SequenceSound; minutes: number }[];
}): string {
  const payload = {
    app: "luna-drift",
    kind: "sequence",
    version: 1,
    name: seq.name,
    steps: seq.steps.map((s) => ({ soundscape: s.soundscape, minutes: s.minutes })),
  };
  const json = JSON.stringify(payload);
  return `${window.location.origin}${window.location.pathname}#seq=${base64UrlEncode(json)}`;
}

interface DecodedSequence {
  raw: unknown;
  seq: ShareableSequence;
}

function decodeSequenceLink(hash: string): DecodedSequence | null {
  const m = hash.match(/#seq=([A-Za-z0-9\-_]+)/);
  if (!m) return null;
  const json = base64UrlDecode(m[1]);
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const name = typeof parsed.name === "string" ? parsed.name.trim().slice(0, 32) : "";
    if (!name || !Array.isArray(parsed.steps) || parsed.steps.length === 0) return null;
    const steps: { soundscape: SequenceSound; minutes: number }[] = [];
    for (const rawStep of parsed.steps.slice(0, 4)) {
      if (!rawStep || typeof rawStep !== "object") return null;
      const st = rawStep as Record<string, unknown>;
      if (typeof st.soundscape !== "string" || typeof st.minutes !== "number") return null;
      steps.push({ soundscape: st.soundscape as SequenceSound, minutes: st.minutes });
    }
    if (steps.length === 0) return null;
    return { raw: parsed, seq: { name, steps } };
  } catch {
    return null;
  }
}

function stepLabel(sound: SequenceSound): string {
  return sound === "silence" ? "Silence" : getSoundscape(sound as SoundscapeId).name;
}

export default function SharedSequenceBanner() {
  const [shared, setSharedState] = useState<DecodedSequence | null>(null);
  const [added, setAdded] = useState(false);
  const sharedRef = useRef<DecodedSequence | null>(null);

  // every new arrival resets the accepted flag, so a second link always
  // shows a fresh offer instead of a stale "added" note
  const setShared = (next: DecodedSequence | null) => {
    sharedRef.current = next;
    setSharedState(next);
    setAdded(false);
  };

  useEffect(() => {
    const check = () => {
      const found = decodeSequenceLink(window.location.hash);
      if (!found) return;
      // deferred so the first paint stays consistent with the server render
      const id = window.setTimeout(() => setShared(found), 0);
      return () => window.clearTimeout(id);
    };
    const cleanup = check();
    window.addEventListener("hashchange", check);
    return () => {
      window.removeEventListener("hashchange", check);
      cleanup?.();
    };
  }, []);

  if (!shared) return null;

  const dismiss = () => {
    setShared(null);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  };

  const keep = () => {
    const ok = usePlayer.getState().importSequence(shared.raw);
    setAdded(ok);
    if (ok) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      window.setTimeout(() => {
        if (sharedRef.current === shared) setShared(null);
      }, 3600);
    } else {
      // already on the shelf (name collision) — say so, then dismiss
      window.setTimeout(() => {
        if (sharedRef.current === shared) dismiss();
      }, 2400);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Shared wind-down sequence arrived with this link"
      className="fixed bottom-6 left-1/2 z-[70] w-[min(92vw,26rem)] -translate-x-1/2 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="glass-chip relative overflow-hidden rounded-2xl p-5 shadow-[0_24px_70px_-20px_rgba(2,4,12,0.95)] ring-1 ring-moon-200/25">
        <div
          aria-hidden="true"
          className="anim-breathe pointer-events-none absolute -left-10 -top-14 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(183,163,214,0.15),transparent_70%)]"
        />
        {added ? (
          <p className="relative flex items-center gap-2 text-sm text-moon-100" aria-live="polite">
            <Link2 className="h-4 w-4 text-moon-300" aria-hidden="true" />
            “{shared.seq.name}” now waits on your shelf.
          </p>
        ) : (
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.24em] text-moon-300/80">
                  a handover drifted in with this link
                </p>
                <p className="mt-1.5 truncate font-serif text-lg text-moon-100">
                  {shared.seq.name}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-mist-400">
                  {shared.seq.steps.map((st, i) => (
                    <span key={`${st.soundscape}-${i}`} className="flex items-center gap-1">
                      {i > 0 && <span className="text-mist-600">→</span>}
                      <span>
                        {stepLabel(st.soundscape)}{" "}
                        <span className="font-mono text-[10px] text-mist-500">
                          {Math.round(st.minutes)}′
                        </span>
                      </span>
                    </span>
                  ))}
                  <span className="ml-1 font-mono text-[10px] text-mist-600">
                    · {totalSequenceMinutes(
                      shared.seq.steps.map((s, i) => ({
                        id: `d${i}`,
                        soundscape: s.soundscape,
                        minutes: s.minutes,
                      }))
                    )}{" "}
                    min
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss shared sequence"
                className="rounded-full p-1.5 text-mist-400 transition hover:bg-moon-200/10 hover:text-moon-100"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={keep}
                className="flex-1 rounded-full bg-moon-200 px-4 py-2 text-xs font-medium text-night-950 transition hover:bg-moon-100"
              >
                Add to handovers
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="flex-1 rounded-full bg-white/[0.04] px-4 py-2 text-xs text-mist-300 ring-1 ring-white/10 transition hover:bg-moon-200/10 hover:text-moon-100"
              >
                Not now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
