import { exec } from 'child_process';
import { SUPPORTED_LANGUAGES } from '../../shared/languages.js';
import * as path from 'path';
import * as fs from 'fs';

// --- Typographical Character Validation ---
// Enforces smart typography: curly quotes, proper ellipsis, etc.

interface TypographicalIssue {
  pattern: RegExp;
  name: string;
  suggestion: string;
}

const LAZY_TYPOGRAPHY: TypographicalIssue[] = [
  { pattern: /\.{3}/g, name: 'three dots', suggestion: '… (ellipsis U+2026)' },
  { pattern: /(?<![{])'(?![}])/g, name: 'straight apostrophe', suggestion: '’ (curly apostrophe U+2019)' },
  // Exclude quotes in HTML attributes (preceded by = or following < until >)
  { pattern: /(?<![{=\\])"(?![}\s>])/g, name: 'straight double quote', suggestion: '\u201C or \u201D (curly quotes)' },
  { pattern: /(?<=\s)--(?=\s)/g, name: 'double hyphen', suggestion: '\u2014 (em dash for separation) or \u2013 (en dash for a range)' },
  { pattern: /[a-zA-Z]\s-\s[a-zA-Z]/g, name: 'space-separated hyphen', suggestion: '\u2014 (em dash)' },
];

interface TypographyMatch {
  issue: TypographicalIssue;
  match: string;
  position: number;
}

/**
 * Check text for typography issues.
 * @param text - Text to check for typography issues
 * @returns Array of typography matches found
 */
function checkTypography(text: string): TypographyMatch[] {
  const issues: TypographyMatch[] = [];

  for (const issue of LAZY_TYPOGRAPHY) {
    let match;
    const regex = new RegExp(issue.pattern.source, issue.pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      issues.push({ issue, match: match[0], position: match.index });
    }
  }

  return issues;
}

// --- resolve ICU parser from root node_modules ---
const parserPath = path.join(__dirname, '..', '..', 'node_modules', '@formatjs', 'icu-messageformat-parser');
const { parse } = require(parserPath);

const schemaPath = path.join(__dirname, 'translation.schema.json');
const translationsDir = path.join(__dirname, '..', '..', 'client', 'src', 'assets', 'i18n');
const ajvPath = path.join(__dirname, '..', '..', 'node_modules', '.bin', 'ajv');

SUPPORTED_LANGUAGES.forEach((lang) => {
  const filePath = path.join(translationsDir, `${lang}.json`);

  // Step 1: AJV schema validation
  const command = `${ajvPath} validate -s ${schemaPath} ${filePath} --strict=false`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      /**/console.error(`Validation failed for ${lang}.json:\n`, stderr);
    } else {
      /**/console.log(`✓ Validation passed for ${lang}.json`);

      // Step 2: ICU plural validation
      try {
        const translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Keys using Transloco interpolation syntax (not ICU MessageFormat)
        // These use {{}} syntax which isn't valid ICU
        const translocoInterpolationKeys = [
          'time.Days ago',
          'time.Hours ago',
          'time.Minutes ago',
        ];

        const typographyWarnings: string[] = [];

        // Recursively walk through nested objects
        /**
         * Recursively validate translation entries for ICU and typography.
         * @param obj - Object containing translation entries
         * @param prefix - Key prefix for nested entries
         */
        const validateEntries = (obj: Record<string, unknown>, prefix = ''): void => {
          Object.entries(obj).forEach(([key, value]) => {
            const fullKey = prefix ? `${prefix}.${key}` : key;

            if (typeof value === 'string') {
              // Skip ICU validation for known Transloco interpolation keys
              if (translocoInterpolationKeys.includes(fullKey)) {
                return;
              }
              try {
                parse(value);
              } catch (icuError: unknown) {
                if (icuError instanceof Error) {
                  console.error(`ICU parse error in ${lang}.json for key "${fullKey}":`, icuError.message);
                } else {
                  console.error(`ICU parse error in ${lang}.json for key "${fullKey}":`, icuError);
                }
              }

              // Step 3: Typography validation
              const keyIssues = checkTypography(key);
              const valueIssues = checkTypography(value);

              keyIssues.forEach(({ issue, match }) => {
                typographyWarnings.push(`  key "${fullKey}": ${issue.name} "${match}" → use ${issue.suggestion}`);
              });

              valueIssues.forEach(({ issue, match }) => {
                typographyWarnings.push(`  value for "${fullKey}": ${issue.name} "${match}" → use ${issue.suggestion}`);
              });
            } else if (typeof value === 'object' && value !== null) {
              validateEntries(value as Record<string, unknown>, fullKey);
            }
          });
        }

        validateEntries(translations);

        /**/console.log(`✓ ICU parse check completed for ${lang}.json`);

        if (typographyWarnings.length > 0) {
          console.warn(`⚠️  Typography warnings in ${lang}.json:`);
          typographyWarnings.forEach(w => console.warn(w));
        } else {
          /**/console.log(`✓ Typography check passed for ${lang}.json`);
        }
      } catch (jsonError: unknown) {
        if (jsonError instanceof Error) {
          console.error(`Failed to read or parse ${lang}.json:`, jsonError.message);
        } else {
          console.error(`Failed to read or parse ${lang}.json:`, jsonError);
        }
      }
    }
  });
});
