# Adding a New Language

This guide covers the 3 files that need updates when adding a new language.

## 1. Add the language code to `shared/languages.ts`

```typescript
export const SUPPORTED_LANGUAGES = [
  'en-US',
  'en-GB',
  'de',
  'fr',
  'es',
  'zh-CN',
  'zh-TW',
  'sv-SE',  // <-- add new language here
] as const;
```

This is the single source of truth. The `LocalizedStrings` type is derived from this array.

## 2. Create the translation file `client/src/assets/i18n/{lang}.json`

Copy an existing translation file (e.g., `en-US.json`) and translate all values:

```bash
cp client/src/assets/i18n/en-US.json client/src/assets/i18n/{lang}.json
```

The file structure must match the schema in `tests/translation/translation.schema.json`.

## 3. Add translations to `server/data/notifications.ts`

Add the new language key to each notification's `title`, `body`, and `label` objects:

```typescript
welcome: {
  title: {
    'en-US': 'Welcome!',
    // ... other languages
    '{lang}': 'Translated welcome!',  // <-- add to each field
  },
  // ... same for body and label
},
```

## Validation

Run validation to catch missing translations:

```bash
# Client translation files
npm run test:translation

# Server notifications
npm run test:notification
```

These validate against `SUPPORTED_LANGUAGES` and will fail if any language is missing.

## What you DON'T need to update

- **Test files** - Specs use `as LocalizedStrings` casts with just `en-US` and `es`
- **Transloco testing module** - Only loads `en-US` and `es` for tests
- **Schema files** - Validation is done programmatically against `SUPPORTED_LANGUAGES`
