"use client";

import { useEffect, useState } from "react";
import { Link2, X } from "lucide-react";
import { usePlayer } from "@/store/player";
import { getSoundscape, type SoundscapeId } from "@/lib/soundscapes";

/**
 * Shareable mix links: a single custom preset encoded into the URL hash
 * (#mix=…). Opening such a link shows a quiet banner offering to keep the mix.
 */

export interface ShareablePreset {
  name: string;
  base: SoundscapeId;
  rain: number;
  wind: number;
  fire: number;
}

function base64UrlEncode(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Build a shareable URL carrying a single preset in the hash. */
export function buildMixLink(preset: ShareablePreset): string {
  const payload = {
    app: "luna-drift",
    kind: "mix-presets",
    version: 1,
    presets: [preset],
  };
  const json = JSON.stringify(payload);
  return `${window.location.origin}${window.location.pathname}#mix=${base64UrlEncode(json)}`;
}

interface DecodedMix {
  json: string;
  preset: ShareablePreset;
}

function decodeMixLink(hash: string): DecodedMix | null {
  const m = hash.match(/#mix=([A-Za-z0-9\-_]+)/);
  if (!m) return null;
  try {
    let b64 = m[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as { presets?: unknown };
    const p = (Array.isArray(parsed?.presets) ? parsed.presets : [])[0] as
      | Record<string, unknown>
      | undefined;
    if (!p || typeof p.name !== "string" || typeof p.base !== "string") return null;
    const num = (v: unknown) => typeof v === "number" && v >= 0 && v <= 1 ? v : null;
    const rain = num(p.rain);
    const wind = num(p.wind);
    const fire = num(p.fire);
    if (rain === null || wind === null || fire === null) return null;
    return {
      json,
      preset: {
        name: p.name.slice(0, 32),
        base: p.base as SoundscapeId,
        rain,
        wind,
        fire,
      },
    };
  } catch {
    return null;
  }
}

export default function SharedMixBanner() {
  const [shared, setShared] = useState<DecodedMix | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const check = () => {
      const found = decodeMixLink(window.location.hash);
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
    const res = usePlayer.getState().importPresets(shared.json);
    setAdded(res.added > 0);
    if (res.added > 0) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      window.setTimeout(() => setShared(null), 3600);
    } else {
      // already on the shelf (name collision) — say so, then dismiss
      window.setTimeout(dismiss, 2400);
    }
  };

  const pct = (v: number) => Math.round(v * 100);

  return (
    <div
      role="dialog"
      aria-label="Shared mix arrived with this link"
      className="fixed bottom-6 left-1/2 z-[70] w-[min(92vw,26rem)] -translate-x-1/2 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="glass-chip relative overflow-hidden rounded-2xl p-5 shadow-[0_24px_70px_-20px_rgba(2,4,12,0.95)] ring-1 ring-moon-200/25">
        <div
          aria-hidden="true"
          className="anim-breathe pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(205,180,124,0.14),transparent_70%)]"
        />
        {added ? (
          <p className="relative flex items-center gap-2 text-sm text-moon-100" aria-live="polite">
            <Link2 className="h-4 w-4 text-moon-300" aria-hidden="true" />
            “{shared.preset.name}” now sits on your shelf.
          </p>
        ) : (
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.24em] text-moon-300/80">
                  a mix drifted in with this link
                </p>
                <p className="mt-1.5 truncate font-serif text-lg text-moon-100">
                  {shared.preset.name}
                </p>
                <p className="mt-0.5 text-[11px] text-mist-400">
                  {getSoundscape(shared.preset.base).name} · rain {pct(shared.preset.rain)} · wind{" "}
                  {pct(shared.preset.wind)} · fire {pct(shared.preset.fire)}
                </p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss shared mix"
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
                Add to shelf
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
