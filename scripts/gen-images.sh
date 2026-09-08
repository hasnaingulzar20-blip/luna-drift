#!/bin/bash
# Generate all Luna Drift artwork — sequential with retries (API rate limits)
cd /home/z/my-project
STYLE="deep navy night palette, dark atmospheric, soft moonlight, dreamy, muted indigo and warm ivory accents, cinematic, grain, high quality"

gen() {
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

gen "Rain falling at night over a calm dark lake seen from a cabin window, warm lamplight reflection, $STYLE" public/images/sc-rain.png 1344x768
sleep 4
gen "Midnight pine forest from below, stars through canopy, fireflies, $STYLE" public/images/sc-forest.png 1152x864
sleep 4
gen "Slow ocean waves arriving on a dark shore under a crescent moon, long exposure, foam glow, $STYLE" public/images/sc-ocean.png 1152x864
sleep 4
gen "Empty late night cafe corner table by a fogged window, porcelain cup, warm low light, street lamp outside, $STYLE" public/images/sc-cafe.png 1152x864
sleep 4
gen "Hearth fire burnt down to glowing embers and sparks in a dark cozy room, $STYLE" public/images/sc-fireplace.png 1152x864
sleep 4
gen "Upright piano in a dark room lit by window moonlight, dust motes, sheet music, $STYLE" public/images/sc-piano.png 1152x864
sleep 4
gen "A lonely lighthouse on rocks at night sweeping warm light across calm dark sea, stars, $STYLE" public/images/story-lighthouse.png 1344x768
sleep 4
gen "Glowing night train crossing a snowy valley under moonlight, warm lit windows, falling snow, pine forest, $STYLE" public/images/story-train.png 1344x768
sleep 4
gen "Floating garden above the clouds at night, moonflowers glowing silver, path of packed cloud, stars pond, $STYLE" public/images/story-cloudgarden.png 1344x768
echo "ALL IMAGES DONE"
