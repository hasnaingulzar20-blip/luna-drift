export interface SleepStory {
  id: string;
  title: string;
  narrator: string;
  minutes: number;
  theme: string;
  cover: string;
  narrationAudio: string;
  excerpt: string;
  /** full bedtime text, displayed in the reader dialog */
  body: string[];
}

export const STORIES: SleepStory[] = [
  {
    id: "lighthouse",
    title: "The Lighthouse Keeper's Lantern",
    narrator: "Jam · slow British narration",
    minutes: 32,
    theme: "Sea · lamplight · safe harbours",
    cover: "/images/story-lighthouse.png",
    narrationAudio: "/narration/story-lighthouse.wav",
    excerpt:
      "The keeper climbs the spiral stairs the way he has for thirty years — slowly, with the lamp's warmth at his back, counting the steps out of habit rather than need.",
    body: [
      "The keeper climbs the spiral stairs the way he has for thirty years — slowly, one hand on the cool iron rail, counting the steps out of habit rather than need. One hundred and six. At the top, the great lens waits in its bath of brass and glass, and beyond it the sea lies flat and dark as poured ink.",
      "He lights the wick with a wooden match, and the flame stands up straight, then leans, then settles — the way it always does, as if taking its seat for the night. The lens begins to turn. Light sweeps out across the water: once, and then again, every eight seconds, unhurried as a heartbeat.",
      "Below, the cottage is warm. The kettle has been filled for morning. His supper plate is washed and turned face-down on the cloth, and his chair is drawn up beside the small round window where he can watch the light go round.",
      "Out on the water, a fishing boat slides home. The keeper does not know its name, but the boat knows his light — it has been leaning on this beam of eight-second-gentleness since before he was born, and it will lean on it long after. That is the whole of his work: to leave the lamp on so that no one has to wonder.",
      "He winds the clockwork. Tick by heavy tick, the lens keeps turning. The wind outside has lain down in the grass like a dog at the end of a long day. Somewhere below, the sea lifts a page of itself and sets it back down.",
      "The keeper takes his seat. His breath slows to match the light. Sweep — and the waves are there. Sweep — and they are gone. Nothing is asked of him now until morning. The lamp carries the watch. The sea carries the sound. And the little room carries him, the way a cupped hand carries water.",
    ],
  },
  {
    id: "train",
    title: "The Night Train Through the Snow Valley",
    narrator: "Jam · slow British narration",
    minutes: 38,
    theme: "Railway · falling snow · warm windows",
    cover: "/images/story-train.png",
    narrationAudio: "/narration/story-train.wav",
    excerpt:
      "The train leaves at eleven minutes past nine, and it is never late. Its carriages glow like a string of amber beads drawn slowly across the white shoulder of the valley.",
    body: [
      "The train leaves at eleven minutes past nine, and it is never late. Its carriages glow like a string of amber beads drawn slowly across the white shoulder of the valley, and inside each bead there is warmth, and quiet, and the particular hush of people who are all agreeing, without a word, to fall asleep.",
      "Your compartment is small and soft-lined. The seat accepts you. Across from you, a stranger's newspaper has already slipped from their hands, and the page rises and falls with the swaying of the carriage, breathing with the train.",
      "Outside, snow falls in slow diagonals. It does not land so much as arrive — settling on the pines, on the track's dark spine, on the little station roofs with their single lit lamps, each one a small gold period at the end of a long white sentence.",
      "The rhythm beneath you is older than any of the towns you pass. Du-dun… du-dun… a heartbeat the length of a valley. The windows are cool to the temple. The heater under the seat ticks softly, thinking its own thoughts.",
      "Somewhere ahead there is a tunnel, and inside the tunnel there is a moment of perfect darkness and perfect warmth — the lamplight dimmed to a memory — and then the valley opens again, wider and whiter, holding the moon the way a dish holds a single plum.",
      "You do not know which stop is yours, and tonight it does not matter. The conductor has quietly decided not to wake anyone. The train rocks you the way you were rocked before you could remember anything at all. Du-dun… du-dun… The snow keeps arriving. The valley keeps receiving it. The amber beads keep sliding toward morning.",
    ],
  },
  {
    id: "cloudgarden",
    title: "The Cloud Garden",
    narrator: "Jam · slow British narration",
    minutes: 29,
    theme: "Floating isles · soft rain · no hurry",
    cover: "/images/story-cloudgarden.png",
    narrationAudio: "/narration/story-cloudgarden.wav",
    excerpt:
      "High above the ordinary weather there is a garden that only opens at night, when the moon has finished checking on the tide and has a moment to spare.",
    body: [
      "High above the ordinary weather there is a garden that only opens at night, when the moon has finished checking on the tide and has a moment to spare. Its paths are made of packed cloud — firm underfoot, faintly silver, and they give a little with each step the way fresh snow does.",
      "Here grow the moonflowers, which open once a night and only halfway, as if they have all the time that has ever existed and see no reason to rush any of it. Their petals are cool to the touch and hold light the way the inside of a shell does.",
      "There is a gardener, of course, though gardener is too busy a word. She drifts from bed to bed, thinning the mist, tying back the wind with ribbons of fog. When she hums, the clouds above the garden hum back a half-second later, which is why people on far beaches sometimes hear the sky breathing.",
      "There is a pond in the garden, shallow and endless, where the stars come down to warm their feet. They sit along the rim like tired travellers, dimming themselves politely, and the water holds them so gently that not one ripple is made.",
      "Take the bench by the moonflowers. It has been waiting — it was grown for this, curved exactly to the shape of a resting back. The mist rises past your ankles like a slow tide. Above you, below you, all around you, the night is doing exactly one thing at a time: opening, softly, petal by petal.",
      "The gardener passes and does not ask your name. In the cloud garden, no one has to be anyone. You are simply the warmest shape on the bench. The moonflowers lean a half-degree closer. The stars soak their feet. And somewhere very far below, the ordinary weather carries on without you, politely holding your place until morning.",
    ],
  },
  {
    id: "cartographer",
    title: "The Mapmaker of Slow Rivers",
    narrator: "Jam · slow British narration",
    minutes: 35,
    theme: "Maps · lantern light · unhurried water",
    cover: "/images/story-cartographer.png",
    narrationAudio: "/narration/story-cartographer.wav",
    excerpt:
      "At the end of Lantern Row there is a shop that opens only after dark, where a mapmaker draws the slow rivers — the wide, quiet waters that carry a town's worries out toward morning.",
    body: [
      "At the end of Lantern Row there is a shop that opens only after dark. Its sign is a small painted river, and beneath the window, in letters gone soft with weather, it says: Maps of Slow Rivers, Drawn While You Wait. Nobody has ever been kept waiting. That is rather the point.",
      "The mapmaker works by lamplight at a desk of worn oak, with a pot of ink the color of a closed eye. She draws the slow rivers — the ones that appear only at night, wide and quiet, running through every town that ever needed one. By morning they have folded themselves back into the ordinary land, leaving the streets dry and the sleepers rested.",
      "Her rivers are never straight. A straight river, she says, is in a hurry, and a river in a hurry wakes people up. So each one she draws leans into its curves the way a sleeper turns into a cool pillow: a long bend to carry the day's arguments, a shallow stretch where the unfinished thoughts settle like silt, an oxbow where anything unsaid can rest for a while and decide, gently, whether it ever needs saying.",
      "Tonight there is a traveler at the door, coat heavy with the day. She does not ask what happened. She inks the far bank, sets down a small paper boat, and slides the map across the desk. Set yourself anywhere, she says. The current does the rest. The traveler steps onto the paper as onto a landing stage, and the river takes the coat's weight first, then, kindly, the rest.",
      "What the rivers carry, no one quite knows. The mapmaker has her suspicions — she has watched whole seasons drift under the little bridge on sheet eleven: examinations, arguments, the ninth unread letter, a harvest that fell short, a chair at a table now pulled in. All of it moving at walking-at-most speed, all of it arriving somewhere seaward and being folded into the salt, which has room for everything.",
      "By the time the lamplight goes pale, the map is dry. She rolls it, ties it with gray string, and sets it by the door for whoever needed it most tonight. Then she washes the brush, banks the lamp, and stands a while in the doorway listening to her own handiwork go by — the slow water, taking its time, carrying the town toward morning without waking a single soul.",
    ],
  },
];

export const getStory = (id: string) => STORIES.find((s) => s.id === id);
