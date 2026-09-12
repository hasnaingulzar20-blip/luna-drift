#!/bin/bash
# Round 10 — generate the 4th sleep story assets (cover art + narration, wav)
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

gen_image "An old mapmaker's shop at night seen from a cobbled lane, warm lantern light spilling from a tall window onto hand-drawn maps of slow winding rivers, a tiny paper boat on ink, $STYLE" public/images/story-cartographer.png 1152x864
sleep 4
# NOTE: TTS input is capped at 1024 chars — narration is a condensed retelling, not the full reader text
gen_tts "At the end of Lantern Row there is a shop that opens only after dark. Its sign is a small painted river, and the window says: Maps of Slow Rivers, Drawn While You Wait. Nobody has ever been kept waiting. That is rather the point. The mapmaker works by lamplight with a pot of ink the color of a closed eye. She draws the slow rivers — the ones that appear only at night, wide and quiet, running through every town that ever needed one. By morning they have folded themselves back into the land, leaving the streets dry and the sleepers rested. Her rivers are never straight. A straight river, she says, is in a hurry, and a river in a hurry wakes people up." public/narration/story-cartographer.wav
echo "ROUND 10 STORY ASSETS DONE"
