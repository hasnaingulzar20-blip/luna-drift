"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { audioEngine } from "@/lib/audio-engine";
import {
  SOUNDSCAPES,
  TONIGHTS_PICK,
  type MixerLayerId,
  type MixPreset,
  type SoundscapeId,
} from "@/lib/soundscapes";
import {
  SEQUENCE_MAX_CUSTOM,
  clampStepMinutes,
  type WindDownSequence,
  type WindDownStep,
} from "@/lib/sequences";

export type TimerDuration = 30 | 60 | 90 | null;

export interface CustomPreset {
  id: string;
  name: string;
  base: SoundscapeId;
  rain: number;
  wind: number;
  fire: number;
  createdAt: number;
}

export interface WakeAlarm {
  enabled: boolean;
  time: string; // "HH:MM" 24h
  lastFiredDay: string | null; // guards against double-firing on one day
}

/** runtime view of the wind-down sequence that is playing right now */
export interface ActiveSequence {
  seqId: string;
  name: string;
  steps: WindDownStep[];
  stepIndex: number;
  stepEndsAt: number; // epoch ms when the current step hands over
  stepRemaining: number; // seconds, display only
  lastSound: SoundscapeId | null; // for the journal record at the end
}

const MAX_PRESETS = 12;

const SOUNDSCAPE_IDS = SOUNDSCAPES.map((s) => s.id) as SoundscapeId[];

function dayKeyOf(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export interface ImportResult {
  added: number;
  skipped: number;
}

interface PlayerState {
  /* playback */
  active: SoundscapeId | null;
  sessionStartedAt: number | null;
  isPlaying: boolean;

  /* favorites & resume */
  favorites: SoundscapeId[];
  lastPlayed: { id: SoundscapeId; at: number } | null;

  /* mixer */
  mix: Record<MixerLayerId, number>;
  masterVolume: number;
  customPresets: CustomPreset[];
  trims: Partial<Record<SoundscapeId, number>>; // per-soundscape room level

  /* wake light */
  wakeAlarm: WakeAlarm;
  waking: boolean; // sunrise overlay is glowing right now

  /* the last bell */
  chimeOnEnd: boolean;

  /* sleep timer */
  timerDuration: TimerDuration; // planned minutes (for display/record)
  timerEndsAt: number | null;
  remainingSeconds: number;
  starIntensity: number; // 0.2..1 — dims as timer drains

  /* wind-down sequences */
  sequence: ActiveSequence | null; // live handover (not persisted)
  customSequences: WindDownSequence[]; // the personal shelf (persisted)

  /* immersion */
  immersive: boolean;

  playSoundscape: (id: SoundscapeId) => void;
  stopAll: (record?: boolean) => void;
  setMixLayer: (id: MixerLayerId, v: number) => void;
  setMasterVolume: (v: number) => void;
  applyPreset: (p: Pick<MixPreset, "base" | "rain" | "wind" | "fire">) => void;
  toggleFavorite: (id: SoundscapeId) => void;
  saveCustomPreset: (name: string) => CustomPreset | null;
  deleteCustomPreset: (id: string) => void;
  exportPresets: () => string;
  importPresets: (json: string) => ImportResult;
  setTrim: (id: SoundscapeId, v: number) => void;
  setWakeTime: (time: string) => void;
  setWakeEnabled: (enabled: boolean) => void;
  dismissWake: () => void;
  checkWake: () => void;
  setChimeOnEnd: (v: boolean) => void;
  startTimer: (minutes: Exclude<TimerDuration, null>) => void;
  cancelTimer: () => void;
  startSequence: (seq: WindDownSequence) => void;
  cancelSequence: () => void; // ends the handover, keeps the current room playing
  saveSequence: (name: string, steps: WindDownStep[]) => WindDownSequence | null;
  deleteSequence: (id: string) => void;
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
      trims: {},

      wakeAlarm: { enabled: false, time: "06:45", lastFiredDay: null },
      waking: false,

      chimeOnEnd: true,

      timerDuration: null,
      timerEndsAt: null,
      remainingSeconds: 0,
      starIntensity: 1,

      sequence: null,
      customSequences: [],

      immersive: false,

      favorites: [],
      lastPlayed: null,

      mix: { rain: 0, wind: 0, fire: 0 },
      masterVolume: 0.85,
      customPresets: [],

      playSoundscape: (id) => {
        audioEngine.setBaseTrim(id, get().trims[id] ?? 1);
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
          lastPlayed: { id, at: Date.now() },
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
          sequence: null,
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

      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((f) => f !== id)
            : [...s.favorites, id],
        })),

      saveCustomPreset: (name) => {
        const trimmed = name.trim().slice(0, 32);
        if (!trimmed) return null;
        const s = get();
        const preset: CustomPreset = {
          id: `cp-${Date.now().toString(36)}`,
          name: trimmed,
          base: s.active ?? TONIGHTS_PICK,
          rain: s.mix.rain,
          wind: s.mix.wind,
          fire: s.mix.fire,
          createdAt: Date.now(),
        };
        set({ customPresets: [...s.customPresets, preset].slice(-MAX_PRESETS) });
        return preset;
      },

      deleteCustomPreset: (id) =>
        set((s) => ({ customPresets: s.customPresets.filter((p) => p.id !== id) })),

      exportPresets: () => {
        const s = get();
        return JSON.stringify(
          {
            app: "luna-drift",
            kind: "mix-presets",
            version: 1,
            presets: s.customPresets.map((p) => ({
              name: p.name,
              base: p.base,
              rain: p.rain,
              wind: p.wind,
              fire: p.fire,
            })),
          },
          null,
          2
        );
      },

      importPresets: (json) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(json);
        } catch {
          return { added: 0, skipped: 0 };
        }
        const list =
          Array.isArray(parsed)
            ? parsed
            : parsed && typeof parsed === "object" && Array.isArray((parsed as { presets?: unknown }).presets)
              ? (parsed as { presets: unknown[] }).presets
              : [];
        const s = get();
        const seen = new Set(s.customPresets.map((p) => p.name.toLowerCase()));
        const toAdd: CustomPreset[] = [];
        let skipped = 0;
        for (const raw of list) {
          if (!raw || typeof raw !== "object") { skipped++; continue; }
          const r = raw as Record<string, unknown>;
          const name = typeof r.name === "string" ? r.name.trim().slice(0, 32) : "";
          const base = r.base as SoundscapeId;
          const num = (v: unknown) => (typeof v === "number" && v >= 0 && v <= 1 ? v : null);
          const rain = num(r.rain);
          const wind = num(r.wind);
          const fire = num(r.fire);
          if (!name || !SOUNDSCAPE_IDS.includes(base) || rain === null || wind === null || fire === null) {
            skipped++;
            continue;
          }
          if (seen.has(name.toLowerCase())) { skipped++; continue; }
          seen.add(name.toLowerCase());
          toAdd.push({
            id: `cp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            name,
            base,
            rain,
            wind,
            fire,
            createdAt: Date.now(),
          });
          if (s.customPresets.length + toAdd.length >= MAX_PRESETS) break;
        }
        if (toAdd.length > 0) {
          set({ customPresets: [...s.customPresets, ...toAdd].slice(-MAX_PRESETS) });
        }
        return { added: toAdd.length, skipped };
      },

      setTrim: (id, v) => {
        set((s) => ({ trims: { ...s.trims, [id]: v } }));
        audioEngine.setBaseTrim(id, v);
      },

      setWakeTime: (time) =>
        set((s) => ({ wakeAlarm: { ...s.wakeAlarm, time, lastFiredDay: null } })),

      setWakeEnabled: (enabled) => {
        const s = get();
        if (enabled) {
          // enabling after the alarm has already passed today arms it for tomorrow
          const now = new Date();
          const [h, m] = s.wakeAlarm.time.split(":").map(Number);
          const nowMin = now.getHours() * 60 + now.getMinutes();
          const passed = nowMin >= (h || 0) * 60 + (m || 0);
          set({
            wakeAlarm: {
              ...s.wakeAlarm,
              enabled,
              lastFiredDay: passed ? dayKeyOf(now) : null,
            },
          });
        } else {
          set({ wakeAlarm: { ...s.wakeAlarm, enabled, lastFiredDay: null } });
        }
      },

      dismissWake: () => set({ waking: false }),

      checkWake: () => {
        const s = get();
        if (s.waking || !s.wakeAlarm.enabled) return;
        const now = new Date();
        const today = dayKeyOf(now);
        if (s.wakeAlarm.lastFiredDay === today) return;
        const [h, m] = s.wakeAlarm.time.split(":").map(Number);
        const target = (h || 0) * 60 + (m || 0);
        const nowMin = now.getHours() * 60 + now.getMinutes();
        // fire inside a 10-minute window past the target so an evening enable never blasts
        if (nowMin >= target && nowMin - target < 10) {
          set({ wakeAlarm: { ...s.wakeAlarm, lastFiredDay: today }, waking: true });
          audioEngine.playChime("sunrise");
          // if a soundscape drifted through the night, ease it into the morning
          if (s.isPlaying) s.stopAll();
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            try {
              navigator.vibrate([180, 260, 180]);
            } catch {
              /* vibration is a bonus, never a requirement */
            }
          }
        }
      },

      setChimeOnEnd: (v) => set({ chimeOnEnd: v }),

      startTimer: (minutes) => {
        set({
          timerDuration: minutes,
          timerEndsAt: Date.now() + minutes * 60_000,
          remainingSeconds: minutes * 60,
          sequence: null, // the timer takes over the ending
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

      startSequence: (seq) => {
        if (!seq.steps.length) return;
        const s = get();
        s.cancelTimer(); // the sequence owns the ending now
        const first = seq.steps[0];
        if (first.soundscape === "silence") {
          audioEngine.stopAll(2.5);
          set({ active: null, isPlaying: false });
        } else {
          s.playSoundscape(first.soundscape);
        }
        set({
          sequence: {
            seqId: seq.id,
            name: seq.name,
            steps: seq.steps,
            stepIndex: 0,
            stepEndsAt: Date.now() + first.minutes * 60_000,
            stepRemaining: first.minutes * 60,
            lastSound: first.soundscape === "silence" ? null : first.soundscape,
          },
        });
      },

      cancelSequence: () => set({ sequence: null }),

      saveSequence: (name, steps) => {
        const trimmed = name.trim().slice(0, 32);
        if (!trimmed || steps.length === 0) return null;
        const s = get();
        const seq: WindDownSequence = {
          id: `ws-${Date.now().toString(36)}`,
          name: trimmed,
          steps: steps.map((st, i) => ({
            id: `s${i}`,
            soundscape: st.soundscape,
            minutes: clampStepMinutes(st.minutes),
          })),
        };
        set({
          customSequences: [...s.customSequences, seq].slice(-SEQUENCE_MAX_CUSTOM),
        });
        return seq;
      },

      deleteSequence: (id) =>
        set((s) => ({
          customSequences: s.customSequences.filter((x) => x.id !== id),
        })),

      toggleImmersive: () => set((s) => ({ immersive: !s.immersive })),
      setImmersive: (v) => set({ immersive: v }),

      tick: () => {
        const s = get();

        // ── wind-down sequence handover ──
        if (s.sequence) {
          const seq = s.sequence;
          const stepRemaining = Math.max(
            0,
            Math.round((seq.stepEndsAt - Date.now()) / 1000)
          );
          if (stepRemaining <= 0) {
            const next = seq.steps[seq.stepIndex + 1];
            if (!next) {
              // the last step was silence itself — end quietly, log the drift
              audioEngine.stopAll(2.5);
              const minutes = s.sessionStartedAt
                ? Math.max(1, Math.round((Date.now() - s.sessionStartedAt) / 60000))
                : 0;
              if (minutes >= 1) {
                void recordSession({
                  soundscape: seq.lastSound ?? "mix",
                  minutes,
                  completed: true,
                });
              }
              set({
                sequence: null,
                active: null,
                isPlaying: false,
                sessionStartedAt: null,
                timerDuration: null,
                timerEndsAt: null,
                remainingSeconds: 0,
                starIntensity: 1,
              });
            } else {
              // hand the night over to the next room
              if (next.soundscape === "silence") {
                audioEngine.stopAll(2.5);
                set({ active: null, isPlaying: false });
              } else {
                get().playSoundscape(next.soundscape);
              }
              set({
                sequence: {
                  ...seq,
                  stepIndex: seq.stepIndex + 1,
                  stepEndsAt: Date.now() + next.minutes * 60_000,
                  stepRemaining: next.minutes * 60,
                  lastSound:
                    next.soundscape === "silence"
                      ? seq.lastSound
                      : next.soundscape,
                },
              });
            }
          } else {
            set({ sequence: { ...seq, stepRemaining } });
          }
        }

        if (!s.timerEndsAt) return;
        const remaining = Math.max(0, Math.round((s.timerEndsAt - Date.now()) / 1000));
        const total = (s.timerDuration ?? 30) * 60;

        if (remaining <= 0) {
          // natural end — the long fade has already happened over the last 60s
          if (s.chimeOnEnd) audioEngine.playChime("complete");
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
        favorites: s.favorites,
        lastPlayed: s.lastPlayed,
        customPresets: s.customPresets,
        trims: s.trims,
        wakeAlarm: s.wakeAlarm,
        chimeOnEnd: s.chimeOnEnd,
        customSequences: s.customSequences,
      }),
    }
  )
);
