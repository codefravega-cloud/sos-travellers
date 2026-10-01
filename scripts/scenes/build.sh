#!/bin/sh
# Resizes the generated landscapes in scripts/scenes/raw/<scene>.png into the page backgrounds in public/images/scenes/.
set -e
cd "$(dirname "$0")/../.."
for src in scripts/scenes/raw/*.png; do
  scene=$(basename "$src" .png)
  sips -s format jpeg -s formatOptions 62 --resampleWidth 1920 "$src" --out "public/images/scenes/$scene.jpg" >/dev/null
  echo "$scene: $(du -h "public/images/scenes/$scene.jpg" | cut -f1)"
done
