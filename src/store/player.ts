"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { audioEngine } from "@/lib/audio-engine";
import type { MixerLayerId, MixPreset, SoundscapeId } from "@/lib/soundscapes";

export type TimerDuration = 30 | 60 | 90 | null;

interface PlayerState {
  /* playback */
  active: SoundscapeId | null;
  sessionStartedAt: number | null;
  isPlaying: boolean;

  /* mixer */
  mix: Record<MixerLayerId, number>;
  masterVolume: number;

  /* sleep timer */
  timerDuration: TimerDuration; // planned minutes (for display/record)
  timerEndsAt: number | null;
  remainingSeconds: number;
  starIntensity: number; // 0.2..1 — dims as timer drains

  /* immersion */
  immersive: boolean;

  playSoundscape: (id: SoundscapeId) => void;
  stopAll: (record?: boolean) => void;
  setMixLayer: (id: MixerLayerId, v: number) => void;
  setMasterVolume: (v: number) => void;
  applyPreset: (p: MixPreset) => void;
  startTimer: (minutes: Exclude<TimerDuration, null>) => void;
  cancelTimer: () => void;
  toggleImmersive: () => void;
  setImmersive: (v: boolean) => void;
  tick: () => void;
}

async function recordSession(payload: {
  soundscape: string;
  minutes: number;
  completed: boolean;
}) {
  try {
    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    window.dispatchEvent(new CustomEvent("luna:session-recorded"));
  } catch {
    /* offline — journal sync can wait */
  }
}

export const usePlayer = create<PlayerState>()(
  persist(
    (set, get) => ({
      active: null,
      sessionStartedAt: null,
      isPlaying: false,

      mix: { rain: 0, wind: 0, fire: 0 },
      masterVolume: 0.85,

      timerDuration: null,
      timerEndsAt: null,
      remainingSeconds: 0,
      starIntensity: 1,

      immersive: false,

      playSoundscape: (id) => {
        void audioEngine.playBase(id);
        audioEngine.setMasterVolume(get().masterVolume);
        audioEngine.resetFade();
        // re-apply any active mixer layers over the new base
        const mix = get().mix;
        (Object.keys(mix) as MixerLayerId[]).forEach((k) => {
          if (mix[k] > 0) audioEngine.setMixLayer(k, mix[k]);
        });
        set({
          active: id,
          isPlaying: true,
          sessionStartedAt: get().sessionStartedAt ?? Date.now(),
        });
      },

      stopAll: (record = true) => {
        const s = get();
        audioEngine.stopAll(1.4);
        // journal: only log meaningful listening
        if (record && s.sessionStartedAt) {
          const minutes = Math.round((Date.now() - s.sessionStartedAt) / 60000);
          if (minutes >= 1) {
            void recordSession({
              soundscape: s.active ?? "mix",
              minutes,
              completed: false,
            });
          }
        }
        set({
          active: null,
          isPlaying: false,
          sessionStartedAt: null,
          timerDuration: null,
          timerEndsAt: null,
          remainingSeconds: 0,
          starIntensity: 1,
        });
      },

      setMixLayer: (id, v) => {
        set((s) => ({ mix: { ...s.mix, [id]: v } }));
        if (get().isPlaying) audioEngine.setMixLayer(id, v);
      },

      setMasterVolume: (v) => {
        set({ masterVolume: v });
        audioEngine.setMasterVolume(v);
      },

      applyPreset: (p) => {
        set({
          mix: { rain: p.rain, wind: p.wind, fire: p.fire },
        });
        if (get().isPlaying) {
          audioEngine.setMixLayer("rain", p.rain);
          audioEngine.setMixLayer("wind", p.wind);
          audioEngine.setMixLayer("fire", p.fire);
        } else {
          get().playSoundscape(p.base);
        }
      },

      startTimer: (minutes) => {
        set({
          timerDuration: minutes,
          timerEndsAt: Date.now() + minutes * 60_000,
          remainingSeconds: minutes * 60,
        });
      },

      cancelTimer: () => {
        audioEngine.resetFade();
        set({
          timerDuration: null,
          timerEndsAt: null,
          remainingSeconds: 0,
          starIntensity: 1,
        });
      },

      toggleImmersive: () => set((s) => ({ immersive: !s.immersive })),
      setImmersive: (v) => set({ immersive: v }),

      tick: () => {
        const s = get();
        if (!s.timerEndsAt) return;
        const remaining = Math.max(0, Math.round((s.timerEndsAt - Date.now()) / 1000));
        const total = (s.timerDuration ?? 30) * 60;

        if (remaining <= 0) {
          // natural end — the long fade has already happened over the last 60s
          audioEngine.stopAll(1.2);
          const minutes = s.sessionStartedAt
            ? Math.max(
                s.timerDuration ?? 0,
                Math.round((Date.now() - s.sessionStartedAt) / 60000)
              )
            : (s.timerDuration ?? 0);
          void recordSession({
            soundscape: s.active ?? "mix",
            minutes: Math.max(minutes, s.timerDuration ?? 0),
            completed: true,
          });
          set({
            active: null,
            isPlaying: false,
            sessionStartedAt: null,
            timerDuration: null,
            timerEndsAt: null,
            remainingSeconds: 0,
            starIntensity: 0.35,
          });
          return;
        }

        if (remaining <= 60) {
          // long fade-out over the final minute
          audioEngine.setFadeFactor(remaining / 60, 1.1);
        }

        set({
          remainingSeconds: remaining,
          starIntensity: Math.max(0.2, 0.2 + 0.8 * (remaining / total)),
        });
      },
    }),
    {
      name: "luna-drift-player",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        mix: s.mix,
        masterVolume: s.masterVolume,
      }),
    }
  )
);
