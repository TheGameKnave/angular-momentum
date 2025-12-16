#!/bin/bash
# Copy webkit (default) snapshots to chromium/firefox variants that are missing or failed
# Only copies when: target doesn't exist OR a failed actual exists in test-results
# Usage: ./copy-snapshots.sh

SNAPSHOT_DIR="tests/e2e/run/visual.spec.ts-snapshots"
RESULTS_DIR="tests/e2e/screenshots/test-results"

cd "$(dirname "$0")/../.." || exit 1

if [ ! -d "$SNAPSHOT_DIR" ]; then
  echo "Error: Snapshot directory not found: $SNAPSHOT_DIR"
  exit 1
fi

count=0
for file in "$SNAPSHOT_DIR"/*-darwin.png; do
  [ -f "$file" ] || continue

  filename=$(basename "$file")

  # Skip if already a browser-specific file (contains -chromium- or -firefox-)
  if [[ "$filename" == *-chromium-* ]] || [[ "$filename" == *-firefox-* ]]; then
    continue
  fi

  base="${filename%-darwin.png}"

  for browser in chromium firefox; do
    target="$SNAPSHOT_DIR/${base}-${browser}-darwin.png"

    # Check if there's a failed actual in test-results (indicates failure)
    failed_actual=$(find "$RESULTS_DIR" -name "${base}-actual.png" -path "*-${browser}*" 2>/dev/null | head -1)

    # Copy if: target missing OR failed actual exists
    if [ ! -f "$target" ] || [ -n "$failed_actual" ]; then
      cp "$file" "$target"
      ((count++))
      echo "  Copied: ${base}-${browser}-darwin.png"
    fi
  done
done

if [ $count -eq 0 ]; then
  echo "No snapshots needed copying (all up to date)"
else
  echo "Copied $count snapshot(s)"
fi
