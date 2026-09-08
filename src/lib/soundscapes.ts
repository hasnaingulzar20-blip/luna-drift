export type SoundscapeId =
  | "rain"
  | "forest"
  | "ocean"
  | "cafe"
  | "fireplace"
  | "piano";

export interface Soundscape {
  id: SoundscapeId;
  name: string;
  tagline: string;
  description: string;
  duration: string;
  bpmHint: string;
  /** tailwind-ready art classes for the card canvas fallback */
  hue: string;
  glow: string;
  image: string;
}

export const SOUNDSCAPES: Soundscape[] = [
  {
    id: "rain",
    name: "Rain on Glass",
    tagline: "Steady rainfall & far thunder",
    description:
      "A slow, patient rain against the window — droplets gathering, sliding, and releasing. The softest thunder rolls somewhere beyond the hills.",
    duration: "45 min",
    bpmHint: "looping",
    hue: "#8fa1c4",
    glow: "rgba(143,161,196,0.35)",
    image: "/images/sc-rain.png",
  },
  {
    id: "forest",
    name: "Midnight Forest",
    tagline: "Leaves, crickets & night birds",
    description:
      "A pine hollow after dark. Wind combs through the canopy, crickets thread the silence, and an owl calls once — far away, unhurried.",
    duration: "60 min",
    bpmHint: "looping",
    hue: "#7fae9a",
    glow: "rgba(127,174,154,0.32)",
    image: "/images/sc-forest.png",
  },
  {
    id: "ocean",
    name: "Slow Tide",
    tagline: "Waves arriving nine seconds apart",
    description:
      "The sea breathing against a dark shore. Each swell gathers, curls, and dissolves into foam — nine and a half seconds between heartbeats of water.",
    duration: "60 min",
    bpmHint: "looping",
    hue: "#6f9ec4",
    glow: "rgba(111,158,196,0.35)",
    image: "/images/sc-ocean.png",
  },
  {
    id: "cafe",
    name: "Empty Café, Late",
    tagline: "Low murmurs & porcelain",
    description:
      "The last café on the corner, ten minutes before closing. Muffled voices, a cup set down softly, the espresso machine cooling into silence.",
    duration: "45 min",
    bpmHint: "looping",
    hue: "#cdb47c",
    glow: "rgba(205,180,124,0.3)",
    image: "/images/sc-cafe.png",
  },
  {
    id: "fireplace",
    name: "Hearth & Ember",
    tagline: "Crackle, pop, warm hum",
    description:
      "A fire settled into embers. Wood shifts, sparks rise and vanish, and a low warm hum fills the room the way lamplight used to.",
    duration: "90 min",
    bpmHint: "looping",
    hue: "#e09659",
    glow: "rgba(224,150,89,0.32)",
    image: "/images/sc-fireplace.png",
  },
  {
    id: "piano",
    name: "Piano Hum",
    tagline: "Long chords dissolving",
    description:
      "A piano in the next room playing chords so slowly they melt into one another. Felt hammers, soft pedal, notes chosen almost at random.",
    duration: "45 min",
    bpmHint: "looping",
    hue: "#b7a3d6",
    glow: "rgba(183,163,214,0.28)",
    image: "/images/sc-piano.png",
  },
];

export const TONIGHTS_PICK: SoundscapeId = "rain";

export const getSoundscape = (id: SoundscapeId): Soundscape =>
  SOUNDSCAPES.find((s) => s.id === id) ?? SOUNDSCAPES[0];

/** Mixer layer metadata (rain / wind / fire) */
export const MIXER_LAYERS = [
  {
    id: "rain" as const,
    name: "Rainfall",
    blurb: "droplets on the window",
    icon: "cloud-rain",
  },
  {
    id: "wind" as const,
    name: "Wind",
    blurb: "through pine and eaves",
    icon: "wind",
  },
  {
    id: "fire" as const,
    name: "Fire",
    blurb: "crackle of low embers",
    icon: "flame",
  },
] as const;

export type MixerLayerId = (typeof MIXER_LAYERS)[number]["id"];

export interface MixPreset {
  name: string;
  blurb: string;
  base: SoundscapeId;
  rain: number;
  wind: number;
  fire: number;
}

export const MIX_PRESETS: MixPreset[] = [
  {
    name: "Storm over the Cabin",
    blurb: "heavy rain · rattling wind · fire barely alive",
    base: "rain",
    rain: 0.85,
    wind: 0.6,
    fire: 0.3,
  },
  {
    name: "Camp by the Lake",
    blurb: "gentle tide · breeze off water · strong hearth",
    base: "ocean",
    rain: 0.1,
    wind: 0.35,
    fire: 0.8,
  },
  {
    name: "Pines at Dusk",
    blurb: "forest air · soft wind · warm embers",
    base: "forest",
    rain: 0.2,
    wind: 0.55,
    fire: 0.45,
  },
  {
    name: "Last Train Home",
    blurb: "piano hum · thin rain · still air",
    base: "piano",
    rain: 0.5,
    wind: 0.15,
    fire: 0.1,
  },
];
