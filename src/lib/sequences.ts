import type { SoundscapeId } from "./soundscapes";

/**
 * Wind-down sequences: rooms that hand you over to each other, then to
 * silence. A sequence plays each step for its allotted minutes and crossfades
 * into the next — the last step is usually "silence" itself.
 */
export type SequenceSound = SoundscapeId | "silence";

export interface WindDownStep {
  id: string;
  soundscape: SequenceSound;
  /** minutes this step lasts (1..120) */
  minutes: number;
}

export interface WindDownSequence {
  id: string;
  name: string;
  steps: WindDownStep[];
}

export const SEQUENCE_MAX_STEPS = 4;
export const SEQUENCE_MAX_CUSTOM = 8;
export const STEP_MIN_MINUTES = 1;
export const STEP_MAX_MINUTES = 120;

export const WIND_DOWN_SEQUENCES: WindDownSequence[] = [
  {
    id: "wd-rain-still",
    name: "Rain into Stillness",
    steps: [
      { id: "s0", soundscape: "rain", minutes: 20 },
      { id: "s1", soundscape: "piano", minutes: 15 },
      { id: "s2", soundscape: "silence", minutes: 10 },
    ],
  },
  {
    id: "wd-ocean-embers",
    name: "Ocean to Embers",
    steps: [
      { id: "s0", soundscape: "ocean", minutes: 25 },
      { id: "s1", soundscape: "fireplace", minutes: 15 },
      { id: "s2", soundscape: "silence", minutes: 10 },
    ],
  },
  {
    id: "wd-long-goodnight",
    name: "The Long Goodnight",
    steps: [
      { id: "s0", soundscape: "forest", minutes: 30 },
      { id: "s1", soundscape: "train", minutes: 20 },
      { id: "s2", soundscape: "silence", minutes: 15 },
    ],
  },
];

export function totalSequenceMinutes(steps: WindDownStep[]): number {
  return steps.reduce((a, s) => a + s.minutes, 0);
}

export function clampStepMinutes(m: number): number {
  if (!Number.isFinite(m)) return STEP_MIN_MINUTES;
  return Math.min(STEP_MAX_MINUTES, Math.max(STEP_MIN_MINUTES, Math.round(m)));
}
