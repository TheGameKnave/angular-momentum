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

echo "\nRunning sonar-scanner\n\n"
cd ../ && npm run sonar

echo "\nRunning Lighthouse CI\n\n"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Kill any existing processes on ports 4000 and 4201
lsof -ti:4000 | xargs kill -9 2>/dev/null || true
lsof -ti:4201 | xargs kill -9 2>/dev/null || true
cd "$REPO_ROOT/server" && NODE_ENV=production node build/server/index.js &
API_PID=$!
sleep 2
cd "$REPO_ROOT" && PORT=4000 node client/dist/angular-momentum/server/server.mjs &
SSR_PID=$!
sleep 3
cd "$REPO_ROOT" && npx @lhci/cli autorun
LHCI_EXIT=$?
kill $SSR_PID 2>/dev/null || true
kill $API_PID 2>/dev/null || true
if [ $LHCI_EXIT -ne 0 ]; then
  exit $LHCI_EXIT
fi

echo "\nRunning e2e tests\n\n"
npm run test:e2e
