/**
 * Validates server-side notification translations.
 * Ensures all notifications have all required languages and valid ICU syntax.
 */

import * as path from 'path';
import * as fs from 'fs';
import { NOTIFICATIONS } from '../../server/data/notifications.js';
import { SUPPORTED_LANGUAGES } from '../../shared/languages.js';

// --- resolve ICU parser from root node_modules ---
const parserPath = path.join(__dirname, '..', '..', 'node_modules', '@formatjs', 'icu-messageformat-parser');
const { parse } = require(parserPath);

interface ValidationError {
  notificationId: string;
  field: string;
  language?: string;
  message: string;
}

const errors: ValidationError[] = [];

/**
 * Validate that a localized string object has all required languages
 */
function validateLocalizedStrings(
  notificationId: string,
  field: string,
  strings: Record<string, string>
): void {
  for (const lang of SUPPORTED_LANGUAGES) {
    if (!strings[lang]) {
      errors.push({
        notificationId,
        field,
        language: lang,
        message: `Missing translation for language: ${lang}`,
      });
    } else if (typeof strings[lang] !== 'string' || strings[lang].trim() === '') {
      errors.push({
        notificationId,
        field,
        language: lang,
        message: `Empty or invalid translation for language: ${lang}`,
      });
    }
  }
}

/**
 * Validate ICU MessageFormat syntax in strings
 */
function validateICUSyntax(
  notificationId: string,
  field: string,
  strings: Record<string, string>
): void {
  for (const lang of SUPPORTED_LANGUAGES) {
    const value = strings[lang];
    if (value) {
      try {
        parse(value);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({
          notificationId,
          field,
          language: lang,
          message: `ICU parse error: ${message}`,
        });
      }
    }
  }
}

/**
 * Main validation function
 */
function validateNotifications(): void {
  /**/console.log('🔍 Validating server notification translations...\n');

  const notificationIds = Object.keys(NOTIFICATIONS);
  /**/console.log(`Found ${notificationIds.length} notification definitions\n`);

  for (const id of notificationIds) {
    const notification = NOTIFICATIONS[id as keyof typeof NOTIFICATIONS];

    // Validate title
    if (!notification.title) {
      errors.push({ notificationId: id, field: 'title', message: 'Missing title object' });
    } else {
      validateLocalizedStrings(id, 'title', notification.title);
      validateICUSyntax(id, 'title', notification.title);
    }

    // Validate body
    if (!notification.body) {
      errors.push({ notificationId: id, field: 'body', message: 'Missing body object' });
    } else {
      validateLocalizedStrings(id, 'body', notification.body);
      validateICUSyntax(id, 'body', notification.body);
    }

    // Validate label
    if (!notification.label) {
      errors.push({ notificationId: id, field: 'label', message: 'Missing label object' });
    } else {
      validateLocalizedStrings(id, 'label', notification.label);
      validateICUSyntax(id, 'label', notification.label);
    }

    /**/console.log(`✓ Validated: ${id}`);
  }

  // Report results
  if (errors.length > 0) {
    console.error('\n❌ Validation errors found:\n');
    for (const error of errors) {
      const langInfo = error.language ? ` [${error.language}]` : '';
      console.error(`  ${error.notificationId}.${error.field}${langInfo}: ${error.message}`);
    }
    process.exit(1);
  } else {
    /**/console.log('\n✅ All notification translations validated successfully');
  }
}

// Run validation
try {
  validateNotifications();
} catch (error) {
  console.error('Error during validation:', error);
  process.exit(1);
}
