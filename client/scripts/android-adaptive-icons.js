/**
 * Rebuild the Android adaptive icon layers from src-tauri/icon.png.
 *
 * `tauri icon` emits adaptive foregrounds by copying the source artwork at
 * ~90% of the 108dp canvas — but launchers only show the center 66dp safe
 * zone, so the artwork gets cropped. This script overwrites those foregrounds
 * with the artwork scaled to ARTWORK_FRACTION of the canvas (visually matching
 * stock Google icons), writes a white <background> layer, and emits the
 * mipmap-anydpi-v26 adaptive-icon XML (with a monochrome layer for Android 13
 * themed icons).
 *
 * Requires ImageMagick (`magick`) on PATH. Run via `npm run tauri:icons`.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'src-tauri', 'icon.png');
const RES = path.join(__dirname, '..', 'src-tauri', 'gen', 'android', 'app', 'src', 'main', 'res');

// Adaptive foreground canvas is 108dp; these are the per-density pixel sizes.
const DENSITIES = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

// Fraction of the 108dp canvas the artwork's bounding box should occupy.
// 0.40 ≈ glyph filling ~60% of the visible 72dp circle, like stock icons.
// Must stay under 0.61 (the 66dp safe zone) or launchers will crop it.
const ARTWORK_FRACTION = 0.5;

const ADAPTIVE_XML = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;

const BACKGROUND_XML = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#FFFFFF</color>
</resources>
`;

try {
  execFileSync('magick', ['-version'], { stdio: 'ignore' });
} catch {
  console.error('ImageMagick (`magick`) not found on PATH — adaptive icons NOT generated.');
  process.exit(1);
}

for (const [dir, canvas] of Object.entries(DENSITIES)) {
  const target = Math.round(canvas * ARTWORK_FRACTION);
  const out = path.join(RES, dir, 'ic_launcher_foreground.png');
  execFileSync('magick', [
    SOURCE,
    '-trim', '+repage',
    '-resize', `${target}x${target}`,
    '-background', 'none',
    '-gravity', 'center',
    '-extent', `${canvas}x${canvas}`,
    out,
  ]);
  console.log(`✓ ${dir}/ic_launcher_foreground.png (${canvas}px canvas, ${target}px artwork)`);
}

fs.mkdirSync(path.join(RES, 'mipmap-anydpi-v26'), { recursive: true });
fs.writeFileSync(path.join(RES, 'mipmap-anydpi-v26', 'ic_launcher.xml'), ADAPTIVE_XML);
fs.mkdirSync(path.join(RES, 'values'), { recursive: true });
fs.writeFileSync(path.join(RES, 'values', 'ic_launcher_background.xml'), BACKGROUND_XML);
console.log('✓ mipmap-anydpi-v26/ic_launcher.xml + values/ic_launcher_background.xml');
