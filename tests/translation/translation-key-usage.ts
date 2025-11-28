import * as fs from 'fs';
import * as path from 'path';
import { ALL_PROGRAMMATIC_KEYS } from '../../client/src/app/constants/translations.constants';

/**
 * Validates that all translation keys used in the application
 * exist in all language files, and detects untranslated bare text.
 *
 * Scans:
 * - Component templates for {{ t('key') }} and t('key')
 * - TypeScript files for translocoService.translate('key') and selectTranslate('key')
 * - Constants/helpers for _KEYS arrays and Messages objects containing translation keys
 * - Templates for hardcoded text that should be translated
 *
 * Checks that all keys exist in: en, de, es, fr, zh-CN, zh-TW
 */

interface TranslationFile {
  lang: string;
  path: string;
  keys: string[];
}

/**
 * Recursively find files matching a pattern
 */
function findFiles(dir: string, pattern: RegExp, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findFiles(filePath, pattern, fileList);
    } else if (pattern.test(filePath)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Extract translation keys from template content.
 * Handles keys containing apostrophes by matching quote types properly.
 * Filters out dynamic/partial keys (e.g., 'nav.' from 'nav.' + p.name).
 */
function extractTemplateKeys(content: string): string[] {
  const keys: string[] = [];
  let match: RegExpExecArray | null;

  // Match t('key') with single quotes - key can contain double quotes but not single quotes
  // Use negative lookahead to skip dynamic concatenation like t('nav.' + p.name)
  const singleQuoteRegex = /(?<![a-zA-Z])t\('([^']+)'(?!\s*\+)/g;
  while ((match = singleQuoteRegex.exec(content)) !== null) {
    const key = match[1];
    // Skip partial keys that end with a dot (from dynamic concatenation)
    if (!key.endsWith('.')) {
      keys.push(key);
    }
  }

  // Match t("key") with double quotes - key can contain single quotes/apostrophes but not double quotes
  const doubleQuoteRegex = /(?<![a-zA-Z])t\("([^"]+)"(?!\s*\+)/g;
  while ((match = doubleQuoteRegex.exec(content)) !== null) {
    const key = match[1];
    // Skip partial keys that end with a dot (from dynamic concatenation)
    if (!key.endsWith('.')) {
      keys.push(key);
    }
  }

  return keys;
}

/**
 * Extract translation keys from TypeScript content (services and components).
 * Handles keys containing apostrophes by matching quote types properly.
 */
function extractTsKeys(content: string): string[] {
  const keys: string[] = [];
  let match: RegExpExecArray | null;

  // Match translate('key') with single quotes
  const translateSingleRegex = /(?:translocoService|transloco|translate)\.translate\(\s*'([^']+)'/g;
  while ((match = translateSingleRegex.exec(content)) !== null) {
    keys.push(match[1]);
  }

  // Match translate("key") with double quotes
  const translateDoubleRegex = /(?:translocoService|transloco|translate)\.translate\(\s*"([^"]+)"/g;
  while ((match = translateDoubleRegex.exec(content)) !== null) {
    keys.push(match[1]);
  }

  // Match selectTranslate('key') with single quotes
  const selectTranslateSingleRegex = /\.selectTranslate\(\s*'([^']+)'/g;
  while ((match = selectTranslateSingleRegex.exec(content)) !== null) {
    keys.push(match[1]);
  }

  // Match selectTranslate("key") with double quotes
  const selectTranslateDoubleRegex = /\.selectTranslate\(\s*"([^"]+)"/g;
  while ((match = selectTranslateDoubleRegex.exec(content)) !== null) {
    keys.push(match[1]);
  }

  return keys;
}

/**
 * Extract translation keys from constant definition files.
 * Scans for arrays of strings and object values that are translation keys.
 * Handles keys containing apostrophes by matching complete string literals.
 */
function extractConstantKeys(content: string): string[] {
  const keys: string[] = [];
  let match: RegExpExecArray | null;

  // Pattern to match complete string literals (handles apostrophes/quotes inside strings)
  // Matches: 'string' or "string" where the string can contain the OTHER quote type
  // Uses negative lookahead to ensure we match the same quote type for open/close
  const extractStrings = (text: string): string[] => {
    const result: string[] = [];
    // Match double-quoted strings (can contain single quotes/apostrophes)
    const doublePattern = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
    let m;
    while ((m = doublePattern.exec(text)) !== null) {
      result.push(m[1]);
    }
    // Match single-quoted strings (can contain double quotes) - only if no apostrophe inside
    // For single quotes, we need to be careful as apostrophes look like single quotes
    // Only match if the content doesn't look like it spans multiple strings
    const singlePattern = /'([^'\\]*(?:\\.[^'\\]*)*)'/g;
    while ((m = singlePattern.exec(text)) !== null) {
      // Skip if this looks like it matched across strings (contains newline + quote patterns)
      if (!m[1].includes('",') && !m[1].includes("',")) {
        result.push(m[1]);
      }
    }
    return result;
  };

  // Match string values in exported const arrays: export const FOO = ['key1', 'key2']
  // Look for arrays with _KEYS suffix or Messages suffix
  const arrayPattern = /(?:_KEYS|Messages)\s*=\s*\[([^\]]+)\]/g;
  while ((match = arrayPattern.exec(content)) !== null) {
    const arrayContent = match[1];
    extractStrings(arrayContent).forEach(s => keys.push(s));
  }

  // Match string values in exported const objects: export const Messages = { KEY: 'value' }
  // Use lazy match to handle braces inside string values (e.g., ICU {seconds})
  const objectPattern = /(?:Messages|MESSAGES)\s*=\s*\{([\s\S]*?)\}\s*(?:as\s+const)?;/g;
  while ((match = objectPattern.exec(content)) !== null) {
    const objectContent = match[1];
    // For object values, look for KEY: 'value' or KEY: "value" patterns
    const valuePattern = /:\s*(['"])((?:(?!\1)[^\\]|\\.)*)\1/g;
    let valueMatch;
    while ((valueMatch = valuePattern.exec(objectContent)) !== null) {
      keys.push(valueMatch[2]);
    }
  }

  return keys;
}

interface BareTextMatch {
  text: string;
  line: number;
}

/**
 * Patterns that are allowed as bare text (not requiring translation)
 */
const ALLOWED_BARE_TEXT_PATTERNS = [
  /^[\s\d\p{P}\p{S}]*$/u,           // Only whitespace, numbers, punctuation, symbols
  /^@[\w.-]+$/,                      // @mentions
  /^[\w.+-]+@[\w.-]+\.\w+$/,         // Email addresses
  /^https?:\/\//,                    // URLs
  /^[A-Z][A-Z0-9_]*$/,               // Constants like API_KEY
  /^\{\{.*\}\}$/,                    // Angular interpolations
  /^@(if|for|switch|else|case|defer|empty|placeholder|loading|error)\b/, // Angular control flow
  /^#[a-fA-F0-9]{3,8}$/,             // Hex colors
  /^\d+(\.\d+)?(px|em|rem|%|vh|vw)?$/, // CSS values
  /^v?\d+\.\d+(\.\d+)?$/,            // Version numbers
  /^&\w+;$/,                          // HTML entities like &nbsp;
];

/**
 * Known technical terms and brand names that don't need translation
 */
const ALLOWED_BARE_WORDS = new Set([
  'Angular', 'Momentum', 'GraphQL', 'API', 'REST', 'JSON', 'HTTP', 'HTTPS',
  'OAuth', 'JWT', 'CSS', 'HTML', 'JavaScript', 'TypeScript', 'Node.js',
  'npm', 'GitHub', 'Google', 'Facebook', 'Twitter', 'LinkedIn',
  'iOS', 'Android', 'Windows', 'Mac', 'Linux', 'Chrome', 'Firefox', 'Safari',
  'OK', 'ID', 'URL', 'UI', 'UX', 'FAQ', 'TODO', 'N/A',
  'Ko-fi', 'Logo', 'Supabase', 'Resend', 'PrimeNG', 'Transloco',
  'Analytics', 'Hotjar', 'Cloudflare', 'Turnstile',
]);

/**
 * Detect bare (untranslated) text in HTML template content
 */
function detectBareText(content: string): BareTextMatch[] {
  const bareTextMatches: BareTextMatch[] = [];
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Skip HTML comments
    if (line.includes('<!--') || line.includes('-->')) return;

    // Remove Angular interpolations {{ ... }}
    let processedLine = line.replace(/\{\{[^}]*\}\}/g, '');

    // Remove HTML tags but keep text content
    // Match text between > and <
    const textBetweenTags = processedLine.match(/>([^<]+)</g);

    if (textBetweenTags) {
      textBetweenTags.forEach(match => {
        // Extract just the text (remove > and <)
        const text = match.slice(1, -1).trim();

        if (!text) return;

        // Check if it matches any allowed pattern
        if (ALLOWED_BARE_TEXT_PATTERNS.some(pattern => pattern.test(text))) return;

        // Check if it's a single allowed word
        if (ALLOWED_BARE_WORDS.has(text)) return;

        // Check if all words are allowed
        const words = text.split(/\s+/);
        if (words.every(word => ALLOWED_BARE_WORDS.has(word) || /^[\d\p{P}\p{S}]+$/u.test(word))) return;

        // Skip very short text (likely punctuation or single chars)
        if (text.length < 2) return;

        // Skip if it looks like a CSS class or Angular directive
        if (/^[a-z][a-zA-Z0-9-]*$/.test(text) && text.length < 20) return;

        // Skip text containing Angular template syntax fragments
        if (/[@(){}?.!]/.test(text) && /[a-z]+[A-Z]|\.|\(|\)/.test(text)) return;

        bareTextMatches.push({ text, line: index + 1 });
      });
    }

    // Also check for text in certain attributes that should be translated
    const translatableAttrs = ['placeholder', 'title', 'alt', 'aria-label'];
    translatableAttrs.forEach(attr => {
      const attrRegex = new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, 'g');
      let attrMatch;
      while ((attrMatch = attrRegex.exec(line)) !== null) {
        const text = attrMatch[1].trim();

        // Skip if it's an interpolation or translation
        if (text.includes('{{') || text.includes('t(')) return;
        if (ALLOWED_BARE_TEXT_PATTERNS.some(pattern => pattern.test(text))) return;
        if (text.length < 2) return;

        bareTextMatches.push({ text: `[${attr}] ${text}`, line: index + 1 });
      }
    });
  });

  return bareTextMatches;
}


/**
 * Load all translation files and their keys
 */
function loadTranslationFiles(): TranslationFile[] {
  const translationsDir = path.join(__dirname, '..', '..', 'client', 'src', 'assets', 'i18n');
  const langFiles = fs.readdirSync(translationsDir).filter(file => file.endsWith('.json'));

  return langFiles.map(file => {
    const filePath = path.join(translationsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(content);
    const lang = file.replace('.json', '');

    // Recursively collect all keys from nested objects
    const keys: string[] = [];
    /**
     * Recursively collect translation keys from nested objects.
     * @param obj - Object to traverse
     * @param prefix - Key prefix for nested keys
     */
    function collectKeys(obj: any, prefix = ''): void {
      for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          collectKeys(obj[key], fullKey);
        } else {
          keys.push(fullKey);
        }
      }
    }
    collectKeys(json);

    return { lang, path: filePath, keys };
  });
}

/**
 * Main validation function
 */
function validateTranslations(): void {
  /**/console.log('🔍 Scanning for translation keys in templates...');

  // Scan all component templates
  const clientDir = path.join(__dirname, '..', '..', 'client', 'src', 'app');
  const templateFiles = findFiles(clientDir, /\.component\.html$/);
  const usedKeysSet = new Set<string>();

  templateFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const keys = extractTemplateKeys(content);
    keys.forEach(key => usedKeysSet.add(key));
  });

  /**/console.log(`✓ Found ${usedKeysSet.size} unique keys in ${templateFiles.length} templates`);

  // Scan all TypeScript files (services and components)
  /**/console.log('🔍 Scanning for translation keys in TypeScript files...');
  const tsFiles = findFiles(clientDir, /\.(service|component)\.ts$/);

  tsFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const keys = extractTsKeys(content);
    keys.forEach(key => usedKeysSet.add(key));
  });

  /**/console.log(`✓ Found ${usedKeysSet.size} keys after scanning TypeScript files`);

  // Scan constants and helpers for translation key definitions
  /**/console.log('🔍 Scanning constants and helpers for translation key definitions...');
  const constantFiles = [
    ...findFiles(path.join(clientDir, 'constants'), /\.ts$/),
    ...findFiles(path.join(clientDir, 'helpers'), /\.ts$/),
  ];

  constantFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const keys = extractConstantKeys(content);
    keys.forEach(key => usedKeysSet.add(key));
  });

  /**/console.log(`✓ Found ${usedKeysSet.size} total unique keys`);

  // Load all translation files
  /**/console.log('🔍 Loading translation files...');
  const translationFiles = loadTranslationFiles();
  /**/console.log(`✓ Loaded ${translationFiles.length} translation files`);

  // Check for missing keys in each language
  let hasErrors = false;

  translationFiles.forEach(translationFile => {
    const missingKeys: string[] = [];
    const translationKeysSet = new Set(translationFile.keys);

    usedKeysSet.forEach(usedKey => {
      if (!translationKeysSet.has(usedKey)) {
        missingKeys.push(usedKey);
      }
    });

    if (missingKeys.length > 0) {
      hasErrors = true;
      console.error(`\n❌ Missing translations in ${translationFile.lang}:`);
      missingKeys.forEach(key => console.error(`   - ${key}`));
    } else {
      /**/console.log(`✓ ${translationFile.lang}: All keys present`);
    }
  });

  // Check for unused keys (keys in translation files but not used in code)
  /**/console.log('\n🔍 Checking for unused translation keys...');
  const allTranslationKeysSet = new Set<string>();
  translationFiles.forEach(tf => tf.keys.forEach(k => allTranslationKeysSet.add(k)));

  // Count initial unused keys before usageType resolution (for reporting)
  let initialUnusedCount = 0;
  allTranslationKeysSet.forEach(translationKey => {
    if (!usedKeysSet.has(translationKey)) {
      initialUnusedCount++;
    }
  });

  // Check for untranslated bare text in templates
  /**/console.log('\n🔍 Checking for untranslated bare text in templates...');
  const bareTextFiles: { file: string; matches: BareTextMatch[] }[] = [];

  templateFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const matches = detectBareText(content);
    if (matches.length > 0) {
      bareTextFiles.push({
        file: path.relative(clientDir, file),
        matches
      });
    }
  });

  if (bareTextFiles.length > 0) {
    console.warn(`\n⚠️  Found untranslated bare text in ${bareTextFiles.length} file(s):`);
    bareTextFiles.forEach(({ file, matches }) => {
      console.warn(`\n   ${file}:`);
      matches.forEach(m => console.warn(`     Line ${m.line}: "${m.text}"`));
    });
  } else {
    /**/console.log('✓ No untranslated bare text found');
  }

  // Add programmatic keys to usedKeysSet (they're used dynamically in code)
  /**/console.log('\n🔍 Adding programmatic keys from translations.constants.ts...');
  ALL_PROGRAMMATIC_KEYS.forEach(key => usedKeysSet.add(key));
  /**/console.log(`✓ Added ${ALL_PROGRAMMATIC_KEYS.length} programmatic keys`);

  // Re-check unused keys after adding programmatic keys
  const finalUnusedKeys: string[] = [];
  allTranslationKeysSet.forEach(translationKey => {
    if (!usedKeysSet.has(translationKey)) {
      finalUnusedKeys.push(translationKey);
    }
  });

  // Report results
  const resolvedCount = initialUnusedCount - finalUnusedKeys.length;
  if (resolvedCount > 0) {
    /**/console.log(`✓ Programmatic keys resolved ${resolvedCount} keys from unused detection`);
  }

  if (finalUnusedKeys.length > 0) {
    console.warn(`\n⚠️  Found ${finalUnusedKeys.length} unused translation keys:`);
    finalUnusedKeys.forEach(key => console.warn(`   - ${key}`));
    console.warn(`\n   If these keys are used programmatically, add them to the appropriate constant`);
    console.warn(`   in translations.constants.ts (e.g., AUTH_ERROR_KEYS, NOTIFICATION_MESSAGES, etc.)`);
  } else {
    /**/console.log('✓ No unused translation keys found');
  }

  if (hasErrors) {
    console.error('\n❌ Translation validation failed');
    process.exit(1);
  } else {
    /**/console.log('\n✅ All translations validated successfully');
  }
}

// Run validation
try {
  validateTranslations();
} catch (error) {
  console.error('Error during validation:', error);
  process.exit(1);
}
