#!/bin/bash
# Accept failed visual regression test screenshots as new baselines
# Copies *-actual.png files from test-results to the snapshots folder
# Usage: ./copy-snapshots.sh

SNAPSHOT_DIR="tests/e2e/screenshots/visual.spec.ts-snapshots"
RESULTS_DIR="tests/e2e/screenshots/test-results"

cd "$(dirname "$0")/../.." || exit 1

if [ ! -d "$RESULTS_DIR" ]; then
  echo "No test-results directory found. Run tests first."
  exit 0
fi

count=0
processed=""

# Find all *-actual.png files in test-results
while IFS= read -r actual_file; do
  [ -f "$actual_file" ] || continue

  # Get the filename (e.g., page-features-actual.png)
  filename=$(basename "$actual_file")

  # Extract the base name without -actual.png (e.g., page-features)
  base="${filename%-actual.png}"

  # Get the parent directory name to extract browser info
  # e.g., visual-Visual-Regression-Tests-page-features-chromium-retry1
  parent_dir=$(basename "$(dirname "$actual_file")")

  # Extract browser from parent directory name
  browser=""
  if [[ "$parent_dir" == *"-webkit"* ]]; then
    browser="webkit"
  elif [[ "$parent_dir" == *"-chromium"* ]]; then
    browser="chromium"
  elif [[ "$parent_dir" == *"-firefox"* ]]; then
    browser="firefox"
  fi

  if [ -z "$browser" ]; then
    echo "  Skipped (unknown browser): $actual_file"
    continue
  fi

  # Build target key and filename
  target_key="${base}-${browser}"
  target="$SNAPSHOT_DIR/${target_key}-darwin.png"

  # Skip if already processed (handles retry duplicates)
  if [[ "$processed" == *"|${target_key}|"* ]]; then
    continue
  fi
  processed="${processed}|${target_key}|"

  cp "$actual_file" "$target"
  ((count++))
  echo "  Updated: ${target_key}-darwin.png"

done < <(find "$RESULTS_DIR" -name "*-actual.png" -type f 2>/dev/null)

if [ $count -eq 0 ]; then
  echo "No snapshots needed updating (all up to date)"
else
  echo "Updated $count snapshot(s)"
fi
