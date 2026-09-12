#!/bin/bash
# Generate slow, soothing narration for the three sleep stories (wav format)
cd /home/z/my-project

gen() {
  local text="$1"; local out="$2"
  for attempt in 1 2 3 4 5; do
    if z-ai tts -i "$text" -o "$out" --voice jam --speed 0.8 --format wav; then
      echo "OK: $out"
      return 0
    fi
    echo "retry $attempt for $out..."
    sleep $((attempt * 10))
  done
  echo "FAILED: $out"
}

gen "The keeper climbs the spiral stairs the way he has for thirty years — slowly, one hand on the cool iron rail, counting the steps out of habit rather than need. One hundred and six. At the top, the great lens waits in its bath of brass and glass, and beyond it the sea lies flat and dark as poured ink. He lights the wick with a wooden match, and the flame stands up straight, then leans, then settles — the way it always does, as if taking its seat for the night. The lens begins to turn. Light sweeps out across the water: once, and then again, every eight seconds, unhurried as a heartbeat." public/narration/story-lighthouse.wav
sleep 3
gen "The train leaves at eleven minutes past nine, and it is never late. Its carriages glow like a string of amber beads drawn slowly across the white shoulder of the valley, and inside each bead there is warmth, and quiet, and the particular hush of people who are all agreeing, without a word, to fall asleep. Outside, snow falls in slow diagonals. It does not land so much as arrive — settling on the pines, on the track's dark spine, on the little station roofs with their single lit lamps." public/narration/story-train.wav
sleep 3
gen "High above the ordinary weather there is a garden that only opens at night, when the moon has finished checking on the tide and has a moment to spare. Its paths are made of packed cloud — firm underfoot, faintly silver, and they give a little with each step the way fresh snow does. Here grow the moonflowers, which open once a night and only halfway, as if they have all the time that has ever existed and see no reason to rush any of it." public/narration/story-cloudgarden.wav
echo "ALL NARRATION DONE"
