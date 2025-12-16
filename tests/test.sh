echo "\nValidating migration versions\n\n"
cd tests && npx tsx migration-version-check.ts

echo "\nValidating istanbul ignore justifications\n\n"
npx tsx istanbul-justification-check.ts

echo "\nRunning translation validation\n\n"
cd translation && npx tsx translation-validation.ts

echo "\nRunning notification validation\n\n"
npx tsx notification-validation.ts

echo "\nRunning translation key usage check\n\n"
npx tsx translation-key-usage.ts

echo "\nBuilding the client\n\n"
cd ../../client && npm run build

echo "\nRunning server linting\n\n"
cd ../server && npx eslint --ext .ts

echo "\nRunning server tests\n\n"
cd ../server && npm test

echo "\nRunning client linting\n\n"
cd ../client && npx eslint --ext .ts src/

echo "\nRunning client tests\n\n"
cd ../client && npm test

echo "\nRunning e2e tests\n\n"
cd ../ && npx playwright test --config=tests/e2e/playwright.config.ts --project=chromium --project=chromium-features --project=chromium-feature-toggles

echo "\nRunning sonar-scanner\n\n"
npm run sonar