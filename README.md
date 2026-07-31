# angular-momentum

This repo is intended to allow spooling up Angular projects in a monorepo rapidly, with a minimum of configuration.

## Current features
* Angular 21 w/ Zoneless change detection &  Node 24.11.1
* Parallel server/client execution
* Bare-bones api proxy to the back-end *
* Frontend environment detection *
* Auto-unsub from subscriptions
* Heroku deployment
* cookie consent banner *
* Google Analytics
* Service worker to persist app and manage versions *
* Typescript with node for back-end
* Client & Server unit testing via jasmine
* Benchmark memory usage and response times (throttled for mobile) in tests
* Internationalization (i18n) with Transloco *
* IndexedDB for offline storage *
* Documentation enforced via husky
* e2e testing with Playwright + snapshots
* 100% coverage in unit tests (jasmine for client and jest for server)
* Feature flags *
* CI/CD (github actions, sonar)
* Hotjar script for user behavior analysis
* Websockets to reconcile disparities between server and local data *
* public api with GraphQL *
* DB-agnostic query layer
* Network connectivity detection *
* CDN for static assets and binary distros
* Tauri app signing and (desktop) auto-updating for distribution to Android, iOS, macOS, Windows, and Linux.
* Automatic platform deploys via Github Actions
* Supabase(?) user management (emails and password resetting, etc) *
* timezone detection AND user-setting *
* Push notifications (WebSocket-based) for Web, PWA, and all Tauri platforms *
* toast notifications *
* Server-side rendering
* Lighthouse CI to mitigate performance slip

(* indicates a feature that’s visible in the sample app)

## Pending features

* CDN for static assets and binary distros, depending on Tauri's ability to cache assets

## Maintenance TODO

Known issues from the 2026-07 architecture/test audit, tabled for future sessions. (The critical items — deploy gates, coverage enforcement, Sonar quality-gate check, mutation auth, og-image SSRF allowlist — were fixed at the time.)

### Security
- [ ] Verify the Tauri CSP (added 2026-07, see [docs/CONTENT_SECURITY_POLICY.md](docs/CONTENT_SECURITY_POLICY.md)) on all targets — watch the webview console for violations: GA/Hotjar after cookie consent, websocket connect, Supabase auth, IPC calls.
- [ ] The web app has NO CSP: `server/index.ts` passes `contentSecurityPolicy: 'none'` with a comment claiming index.html defines one in a meta tag — no such meta tag exists. Define one (the Tauri policy is the origin inventory to start from; see [docs/CONTENT_SECURITY_POLICY.md](docs/CONTENT_SECURITY_POLICY.md)).

### Reliability
- [ ] user-settings routes return raw Postgres `error.message` to clients (schema-leaking, untranslatable). Move to curated `{ code, message }` responses — keep a human-readable message for dev/debugging, never the raw DB text.
- [ ] Supabase-error catalog hardening (parked, needs design first): make the code map an exhaustive `Record<ErrorCode, string>` instead of `Partial`, map `AuthRetryableFetchError` to a dedicated "can't reach the server" key, and stop passing the raw message even inside the "Something went wrong: {detail}" shell. The helper used to be byte-identical in AM and Rosterizer; the 2026-07 AM rewrite (code-keyed map, wrapped fallback) has NOT been copied to Rz yet — port it there at the next Rz burst, then build the hardening in AM and copy again.

### Mobile / Tauri (backported from the Rosterizer 2026-07-30 debugging session)
- [ ] Mobile dev logins fail intermittently: `tauri [android|ios] dev` sometimes routes the webview through Tauri's `tauri.localhost` proxy, which drops POST bodies (tauri-apps/tauri#13166) — assets and health checks work so the app looks online, but every login 400s with an empty body. What selects proxy vs. direct devUrl is not understood. Diagnostic: open the webview inspector and check the page origin — `tauri.localhost` means proxied (logins will fail); a LAN-IP origin means direct (fine). The CLI `--host` flag should force the direct path but is UNTESTED — verify it, then script it into `tauri:android`/`tauri:ios`. `ng serve` already binds 0.0.0.0 either way.
- [ ] Android icon: `npm run tauri:icons` (added 2026-07) is the only sanctioned way to regenerate icons — bare `tauri icon` emits adaptive foregrounds with the artwork at ~90% of the 108dp canvas, which launchers crop to the center 66dp safe zone. The script runs `tauri icon` then `scripts/android-adaptive-icons.js`, which rebuilds the foregrounds with the artwork at 40% of the canvas (≈60% of the visible circle, matching stock icons), a white background layer, and a monochrome layer for Android 13 themed icons. AM went adaptive 2026-07 — the legacy small-cube-in-white-disc look was the launcher shrinking the padded legacy PNG. Verify on-device after next regen; Rz still uses the strip-the-adaptive-layer ritual and should adopt this script instead. Desktop/iOS sources stay padded (~87% artwork in `src-tauri/icon.png`); the script derives the Android framing from the same file.

### Test quality
- [ ] `auth.routes.spec.ts` has 5 spots passing fresh unlistened apps to supertest (should share hoisted listeners like the rest of the file).
- [ ] Audit remaining whole-method istanbul ignores for testable logic (notification dispatch routing, IndexedDB migration chain).
- [ ] `auth.service.ts` window/document listeners have no removal path — spec-side hygiene is fixed, but the service itself should register them via `DestroyRef` so TestBed teardown removes them.
- [ ] E2E: add `data-testid` to logout/tabs/panels. Note: snapshot baselines are darwin-only — CI must stay on macOS runners until Linux baselines exist. (2026-07: the guard/hard-wait purge is done — three never-running checks were unmasked and fixed; 3 kept waits are labeled measurement windows in performance.spec.)
- [ ] E2E flake tail (retry-passers, ~1-2 per run): notifications server-broadcast remains occasionally flaky under Supabase latency. (Root-caused and fixed 2026-07: storage-promotion seeding raced the IndexedDB load; indexeddb post-logout raced Supabase session clearing — the reloaded page booted still-authenticated and showed user-scoped data.)
- [ ] `responsive.spec.ts` touch-target test is vacuous: it scopes to `main button…` but no `<main>` element exists in any template, so the loop never runs.
- [ ] Cosmetic: Tauri (WebKit) logs one "WebSocket is closed before the connection is established" at startup; live sync works (verified via cross-client theme broadcast). Likely a double-connect — `SocketIoService`'s connectivity effect calls `socket.connect()` while ngx-socket-io also auto-connects; the losing attempt is torn down mid-handshake.
- [ ] `performance.spec.ts` measures evaluate-round-trips against a 48ms threshold and asserts heap growth without forced GC — structurally flaky.

### Next major (Angular 22 × PrimeNG licensing)
- [ ] Angular 22 is out (21 is in LTS until ~mid-2027), but PrimeNG 22 goes **commercial** — a paid UI lib is a non-starter for a template whose forks inherit the dependency. Decide at next session start, checking: (1) confirmed PrimeNG 22 license terms, (2) whether a viable OSS fork of the MIT code emerged. Options: bridge on PrimeNG 21 under Angular 22 (peer override) while the fork situation clarifies; adopt the fork; migrate to Angular Material; or go CDK+custom ("no UI-lib lock-in" is a real selling point for a boilerplate). Migration surface (measured 2026-07): 18 modules / 29 files / ~80 instances, mostly primitives — dialogs/menus are already homegrown on CDK; hard remainders are select-with-typeahead, toast, accordion, tooltip, and the Lara theme. Any path churns all visual baselines and the `p-*` e2e selectors in one shot. Upgrade tripwires either way: `patch-ngsw.js` string-matches Angular's generated worker (watch for the `[patch-ngsw]` success line), and e2e `waitForAngular` relies on zone-based testability APIs if 22 pushes zoneless.

### Housekeeping
- [ ] `lowdb` is 6 majors old (or gets replaced with a real store when forked).
- [ ] CI perf: `cargo install tauri-cli --locked` still compiles from source on every mobile build (~10 min) — switch to cargo-binstall or cache the installed binary. (npm/rust caching and concurrency groups are done.)
- [ ] GraphQL plumbing: hoist `createHandler` out of the per-request path (also double-runs `express.json`), consider disabling introspection + adding a depth limit before the schema grows.
- [ ] Sonar: the blanket S1186 suppression for `**/*` should become targeted suppressions; some excluded files have specs (`ssr-language.provider.ts`, `translations.constants.ts`) and shouldn't be coverage-excluded.
- [ ] `deploy.sh`'s fixed `sleep 30` before smoke tests could poll the Heroku releases API instead.

## License
This project is licensed under the MIT License (see [LICENSE](https://github.com/TheGameKnave/angular-momentum/blob/main/LICENSE) file for details).

### Using This as a Base for Your Own App?
- If you modify and distribute this **library itself**, you must keep it MIT-licensed.
- If you use this library as a foundation to build **your own application**, you can license your application however you choose.
- Setup: work through [docs/FORK_CHECKLIST.md](docs/FORK_CHECKLIST.md). Staying current after you've diverged: your copy of [docs/PATCHES.md](docs/PATCHES.md) (it ships with the template) becomes your ledger — record the AM version you started from and follow its protocol to port upstream changes patch by patch.

## Quick start

### Node

Install node `24.11.1` Recommended to install NVM to manage node versions.

Install NPM 10.8.1 (should be bundled with node).

### Angular cli

Install Angular CLI to allow executing commands: `npm i -g @angular/cli`

### Install modules

From the root, run `npm ci`

### Environment variables

Create your `.env` file from the `.env.example` **and** ***never*** **commit sensitive information like API keys or passwords or usernames or email addresses**


### git branches

Develop against branches from `dev` feature branch using prefix `feature/` or `defect/`. `main` is for production releases, `staging` is to test prod.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the front- and back-end concurrently. See above.  
**This is the preferred method of running a local**

### `npm run client`

Runs only the front-end of the app (on port 4200) in development mode.  
Open [http://localhost:4200](http://localhost:4200) to view it in the browser.

The page will reload if you make edits.

### `npm run server`

Runs only the back-end of the app (on port 4201) in development mode.  
Open [http://localhost:4201/api](http://localhost:4201/api) to view it in the browser.

This will display the API responses.

## Tests

* from root, run `npm test` for full test suite, below (best to ensure green 100% coverage before any PRs to `dev`)

### Translation Testing

* from root, run `npm run test:translation` to uncover any gaps in translation files, relative to schema (will not detect completely missing schema keys; refer to browser errors for that)

### Unit Testing

* from root, run `npm run test:server` and `npm run test:client` to execute each unit test suite independently

### Playwright end-to-end testing

* from root, run `npm run test:e2e`
Runs e2e tests including visual regression tests.

* from root, run `npm run test:e2e:ui`
Opens the Playwright UI for interactive test running and debugging.

* from root, run `npm run test:e2e:headed`
Runs e2e tests with browser visible.

#### Visual regression testing
Playwright captures screenshots during tests and compares them against baseline snapshots.

* from root, run `npm run test:e2e:accept`
Accept all screenshot diffs and overwrite baseline snapshots.

### SonarCloud code hygiene testing

The scanner is included as a dev dependency (`sonarqube-scanner`) — no separate download needed.

1. Get a token from [SonarCloud](https://sonarcloud.io/account/security)
2. Add it to `server/.env`:
   ```
   SONAR_TOKEN=your_token_here
   ```
3. Run from project root: `npm run sonar`

## Deployment

### Install Heroku CLI

* mac (requires homebrew): `brew tap heroku/brew && brew install heroku`
* linux: `sudo snap install --classic heroku`

### Add Heroku to Git

`heroku git:remote -a <APP_NAME>-dev`
`git remote rename heroku heroku-dev`  
`heroku git:remote -a <APP_NAME>-staging`  
`git remote rename heroku heroku-staging`  
`heroku git:remote -a <APP_NAME>`  
`git remote rename heroku heroku-production`

### Deploy

From root:  
`npm run deploy:dev`  
`npm run deploy:staging`  
`npm run deploy:production`

## Tauri

This repo utilizes Tauri to publish native apps for Windows, MacOS, Linux, Android, and iOS. Some of the scripts are fairly straightforward, but all require external dependencies: at the very least, Rust; and likely xCode and/or Android Studio. For more information, see the [Tauri documentation](https://tauri.app/). It's best to spin up a completely blank repo and follow the instructions on the Tauri website along with generous usage of ChatGPT to get your external tools running.

After your pipeline is configured, the following scripts are useful.

from `client`, while running a server locally:
* `npm run tauri:dev` to dev-build and deploy to local machine.
* `npm run tauri:android` to dev-build and deploy to Android simulator.
* `npm run tauri:ios` to dev-build and deploy to iOS simulator.

from `client`, while remote server is running:
* `npm run tauri build` to build a standalone dev release for Windows, MacOS, and Linux.
* `npm run tauri android dev` to build a standalone dev release for Android. (set `tauri.conf.json` devUrl to `https://angularmomentum.app`) to enable live server features.
* `npm run tauri ios build -- --export-method app-store-connect` to build a release for iOS.
* `npx tauri ios build --debug --target aarch64-sim` to build a debug prod release for iOS.

### Tauri configuration

Tauri desktop builds can have update tar.gz files that can be downloaded and installed automatically. Manually edit `latest.json` with the signature of each built update zip, and host them on a CDN (see below).

* e.g. `cat "src-tauri/target/release/bundle/macos/Angular Momentum.app.tar.gz.sig"` to retrieve the signature.

### Tauri platform builds

#### Windows
Run on a windows install; run `npm run tauri build` to build a standalone release for Windows.

#### MacOS
See build instructions above.

#### Linux
On a linux install; run `npm run tauri build` to build a standalone release for Linux.

## Push Notifications

The app includes a complete push notification system that works across all platforms (Web, PWA, Desktop, Mobile).

### Architecture

- **NotificationService** - Main service for managing notifications, permissions, and notification history
- **NotificationCenterComponent** - UI component with bell icon, badge, and dropdown notification center
- **WebSocket Delivery** - Real-time notification delivery via Socket.IO
- **GraphQL API** - Backend mutations for sending notifications
- **Platform Support**:
  - **Web/PWA**: Uses Web Notifications API + Service Worker
  - **Tauri (Desktop/Mobile)**: Uses `tauri-plugin-notification` for native OS notifications

### API Reference

**NotificationService Methods:**
- `show(options)` - Show a notification
- `requestPermission()` - Request notification permission
- `checkPermission()` - Check current permission status
- `isSupported()` - Check if notifications are supported
- `markAsRead(id)` - Mark notification as read
- `clearAll()` - Clear all notifications

**Reactive Signals:**
- `permissionGranted` - Permission status
- `notifications` - All notifications array
- `unreadCount` - Number of unread notifications

**Backend Functions:**
- `broadcastNotification(io, notification)` - Send to all clients
- `sendNotificationToUser(io, socketId, notification)` - Send to specific user
- `sendNotificationToRoom(io, room, notification)` - Send to room/group

### Feature Flag

Push notifications are controlled by the `Notifications` feature flag. Toggle via GraphQL (mutations require a Supabase session outside development/test — pass `Authorization: Bearer <access token>`):

```graphql
mutation {
  updateFeatureFlag(key: "Notifications", value: true) {
    key
    value
  }
}
```

### Platform Notes

- **Web/PWA**: Requires HTTPS in production, service worker registration
- **Tauri Desktop**: Native OS notifications, works even when app is closed
- **Tauri Mobile**: Requires notification permissions in platform-specific configs

~~## CDN~~

~~This repo relies on serving assets from a CDN. The current implementation is linode/akamai but you'll want to replace that with your preferred provider.~~

~~### Structure~~

```
angularmomentum/
├── assets/
│   ├── production/
│   └── staging/
├── dist/
│   └── (future versioned releases folders here)
```
