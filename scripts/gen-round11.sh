#!/bin/bash
# Round 11 — generate the 5th sleep story assets (cover art + narration, wav)
cd /home/z/my-project
STYLE="deep navy night palette, dark atmospheric, soft moonlight, dreamy, muted indigo and warm ivory accents, cinematic, grain, high quality"

gen_image() {
  local prompt="$1"; local out="$2"; local size="$3"
  for attempt in 1 2 3 4 5; do
    if z-ai image -p "$prompt" -o "$out" -s "$size"; then
      echo "OK: $out"
      return 0
    fi
    echo "retry $attempt for $out after backoff..."
    sleep $((attempt * 12))
  done
  echo "FAILED: $out"
}

gen_tts() {
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

gen_image "A small vintage passenger ferry crossing a calm dark sea at night, warm lamplight glowing on its wooden deck, a soft wake of silver light behind it, distant small islands each with a single glowing lantern, starry sky, $STYLE" public/images/story-ferry.png 1152x864
sleep 4
# NOTE: TTS input is capped at 1024 chars — narration is a condensed retelling, not the full reader text
gen_tts "The last ferry leaves from the quiet pier at half past ten, and it carries no commuters — only sleepers wrapped in wool blankets, going wherever the water decides. Nobody checks tickets. The only fare is the day you hand over at the gangway, and the ferryman stacks the days neatly under his lantern, to be returned lighter by morning. The deck chairs face the stern, so the wake becomes the evening's only entertainment: a long silver ribbon unspooling across the black water, closing gently behind you — the sea's way of saying that today is taken care of. Somewhere below, the engine hums a note too low to name, felt in the floorboards more than heard. Out in the dark, islands pass with a single lantern lit apiece, and the ferry dips its horn once, softly — hello, sleep well. The ferryman brings blankets folded in thirds, heavy in the way that means stay. And the last thing the night asks of you is nothing at all. Sleep now. The ferryman has the watch." public/narration/story-ferry.wav
echo "ROUND 11 STORY ASSETS DONE"
