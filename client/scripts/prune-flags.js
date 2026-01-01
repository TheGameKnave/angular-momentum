#!/usr/bin/env node
/**
 * Post-build script to remove unused country flags from the dist folder.
 * This significantly reduces the number of files cached by the service worker.
 *
 * Derives needed flags from:
 * - src/assets/i18n/*.json files (source of truth for supported languages)
 * - i18n-l10n-flags library (same as getCountry() in transloco-loader.service.ts)
 * - Custom overrides matching transloco-loader.service.ts
 *
 * Usage: node scripts/prune-flags.js [dist-path]
 * Default dist-path: dist/angular-momentum/browser
 */

const fs = require('fs');
const path = require('path');

// Custom overrides - must match LANGUAGE_OVERRIDES in transloco-loader.service.ts
const LANGUAGE_OVERRIDES = {
  'en-MT': { flag: 'twain' },
  'sv-BO': { flag: 'bork' },
};

/**
 * Get country/flag code for a language.
 * Mirrors getCountry() logic from transloco-loader.service.ts
 */
function getCountry(lang, languages) {
  // Check for custom override first
  if (LANGUAGE_OVERRIDES[lang]) {
    return LANGUAGE_OVERRIDES[lang].flag;
  }

  if (!lang.includes('-')) {
    // Language without locale (e.g., 'de') - get first locale from i18n-l10n-flags
    const langData = languages[lang];
    if (langData && langData.locales) {
      const firstLocale = Object.keys(langData.locales)[0];
      return firstLocale.split('-')[1].toLowerCase();
    }
    return lang; // fallback
  } else {
    // Language with locale (e.g., 'en-US') - extract country code
    return lang.split('-')[1].toLowerCase();
  }
}

// Load i18n-l10n-flags library
let LANGUAGES;
try {
  LANGUAGES = require('i18n-l10n-flags').LANGUAGES;
} catch (err) {
  console.error('[prune-flags] Failed to load i18n-l10n-flags:', err.message);
  process.exit(1);
}

// Get supported languages from i18n folder
const i18nDir = path.join(__dirname, '../src/assets/i18n');
if (!fs.existsSync(i18nDir)) {
  console.log(`[prune-flags] i18n directory not found: ${i18nDir}`);
  process.exit(0);
}

const supportedLanguages = fs.readdirSync(i18nDir)
  .filter(file => file.endsWith('.json'))
  .map(file => path.basename(file, '.json'));

// Derive needed flags from supported languages
const neededFlags = new Set(
  supportedLanguages.map(lang => getCountry(lang, LANGUAGES))
);

console.log(`[prune-flags] Supported languages: ${supportedLanguages.join(', ')}`);
console.log(`[prune-flags] Needed flags: ${[...neededFlags].join(', ')}`);

// Prune unused flags from dist
const distPath = process.argv[2] || 'dist/angular-momentum/browser';
const flagsDir = path.join(distPath, 'assets/icons/vendor/flags');

if (!fs.existsSync(flagsDir)) {
  console.log(`[prune-flags] Flags directory not found: ${flagsDir}`);
  process.exit(0);
}

const files = fs.readdirSync(flagsDir);
let removed = 0;

files.forEach(file => {
  const flagCode = path.basename(file, path.extname(file));
  if (!neededFlags.has(flagCode)) {
    fs.unlinkSync(path.join(flagsDir, file));
    removed++;
  }
});

console.log(`[prune-flags] Removed ${removed} unused flags, kept ${neededFlags.size} needed flags`);
