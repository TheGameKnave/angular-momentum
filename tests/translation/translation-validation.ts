import { exec } from 'child_process';
import { SUPPORTED_LANGUAGES } from '../../client/src/app/helpers/constants';
import * as path from 'path';
// TODO hire someone to fix this horrible crap

const schemaPath = path.join(__dirname, 'translation.schema.json');
const translationsDir = path.join(__dirname, '..', '..', 'client', 'src', 'assets', 'i18n');
const ajvPath = path.join(__dirname, '..', '..', 'node_modules', '.bin', 'ajv');


SUPPORTED_LANGUAGES.forEach((lang) => {
  const command = `${ajvPath} -s ${schemaPath} -d ${translationsDir}/${lang}.json --strict=false`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Validation failed for ${lang}.json:\n`, stderr);
    } else {
      console.log(`Validation passed for ${lang}.json`);
    }
  });
});