web: (cd server && API_PORT=${API_PORT:-4201} ts-node index.ts &) && sleep 3 && PLAYWRIGHT_BROWSERS_PATH=$PWD/client/.playwright node client/dist/angular-momentum/server/server.mjs
