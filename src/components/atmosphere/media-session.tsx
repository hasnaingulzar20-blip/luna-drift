"use client";

import { useEffect } from "react";
import { usePlayer } from "@/store/player";
import { getSoundscape, TONIGHTS_PICK } from "@/lib/soundscapes";

/**
 * Bridges playback to the OS media session — lockscreen / media-key controls,
 * artwork, and correct play/pause state on phones.
 */
export default function MediaSessionBridge() {
  const active = usePlayer((s) => s.active);
  const isPlaying = usePlayer((s) => s.isPlaying);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (!ms) return;

    if (active && isPlaying) {
      const sc = getSoundscape(active);
      try {
        ms.metadata = new MediaMetadata({
          title: sc.name,
          artist: sc.tagline,
          album: "Luna Drift — sleep soundscapes",
          artwork: [{ src: sc.image, sizes: "1152x864", type: "image/png" }],
        });
        ms.playbackState = "playing";
      } catch {
        /* MediaMetadata unsupported — ignore */
      }
    } else {
      ms.playbackState = isPlaying ? "playing" : "paused";
    }

    try {
      ms.setActionHandler("play", () => {
        const s = usePlayer.getState();
        s.playSoundscape(s.active ?? TONIGHTS_PICK);
      });
      ms.setActionHandler("pause", () => usePlayer.getState().stopAll());
      ms.setActionHandler("stop", () => usePlayer.getState().stopAll());
    } catch {
      /* action handlers unsupported — ignore */
    }
  }, [active, isPlaying]);

  useEffect(() => {
    return () => {
      if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
        try {
          navigator.mediaSession?.setActionHandler("play", null);
          navigator.mediaSession?.setActionHandler("pause", null);
          navigator.mediaSession?.setActionHandler("stop", null);
        } catch {
          /* noop */
        }
      }
    };
  }, []);

  return null;
}
