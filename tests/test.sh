echo "\nRunning translation validation\n\n"
cd tests/translation && npx ts-node translation-validation.ts

echo "\nRunning translation key usage check\n\n"
npx ts-node translation-key-usage.ts

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

# echo "\nRunning e2e tests\n\n"
# cd ../tests/e2e && node clean_screenshots && node test_runner

# echo "\nRunning screenshot diff tests\n\n"
# cd ../../ && npx testcafe-blink-diff tests/e2e/screenshots --compare accepted:tested --open --threshold 0.003