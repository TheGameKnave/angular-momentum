import { exec } from 'child_process';
import { SUPPORTED_LANGUAGES } from '../../client/src/app/helpers/constants';
import * as path from 'path';
import fs from 'fs';

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
      /**/console.log(`Validation passed for ${lang}.json`);

      // Step 2: ICU plural validation
      try {
        const translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        Object.entries(translations).forEach(([key, value]) => {
          if (typeof value === 'string') {
            try {
              parse(value);
            } catch (icuError: unknown) {
              if (icuError instanceof Error) {
                console.error(`ICU parse error in ${lang}.json for key "${key}":`, icuError.message);
              } else {
                console.error(`ICU parse error in ${lang}.json for key "${key}":`, icuError);
              }
            }
          }
        });

        console.log(`ICU parse check completed for ${lang}.json`);
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
