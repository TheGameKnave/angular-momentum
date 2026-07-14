# Patch Ledger for Downstream Sites

If you templated your app from Angular Momentum and then modified the code, you can't
pull updates from this repo — but you can port them. This file is the living ledger of
what changed in each AM release, organized by *concern* (what was wrong, what fixed it,
why you care) rather than by commit or line — your code has diverged, so raw diffs
won't apply. Commit hashes are included as reference anchors for digging deeper.

**Maintainers:** every release gets an entry here, in the same commit as the version
bump (alongside `server/data/changeLog.ts`). The changelog says what shipped; this file
says how a diverged fork applies it. `bump_version.js` inserts a `TODO(release)`
placeholder automatically, and the pre-commit hook refuses to commit until it's
replaced with the real entry.

## How to use this file downstream

1. **Your copy of this file arrived with the template** — it's already in your repo,
   and from the moment you diverge, it becomes *your ledger* while upstream's version
   is the source you re-sync from. (Templated from before 21.4.0? Fetch this file
   from upstream once to seed your copy.)
2. **Record your watermark** at the top of your copy: `Synced through AM <version>` —
   the AM version you templated from, then whatever you've caught up to since. Your
   app's own version numbers are irrelevant here — AM's version is the only anchor,
   and it lives in your copy, not in any code.
3. **Work each unchecked item**: apply it, adapt it, or consciously skip it. Check it
   off either way and note *how* you applied it — your implementation of a feature may
   be unique, and the note is what makes the next patch against that area tractable.
4. **To catch up later**: fetch the current version of this file from AM, prepend any
   entries newer than your watermark to your copy, and repeat step 3.

Item tags: **[server]** **[client]** **[build/deploy]** **[tauri]** **[test]** —
test-only items can't break your production app; port them if you kept AM's test
suites. A `*Superseded:*` line means later releases changed or replaced the work —
read it before spending effort, especially when auditing several releases at once.

This ledger covers every release after **21.2.19** (the earliest template snapshot in
the wild). If you templated from something older, first reconcile against the in-app
changelog (`server/data/changeLog.ts`) and git history up to 21.2.19.

---

## 21.4.1 — 2026-07-14

- [ ] **[build/deploy] Deploys keyed off releases, not commits** (`5de81cf`)
  Every green push to main triggered the full deploy chain — Heroku rebuild plus all
  five Tauri platform builds — even for docs or tooling changes that altered no app
  content. Fixed with a `check-release` gate job in the deploy workflow: if the
  current version already has a GitHub release, the whole chain skips; a new
  (unreleased) version deploys as before, and manual `workflow_dispatch` always
  forces a deploy (the retry/redeploy lever).
  *Apply:* if you kept AM's deploy workflow, port the gate job and point the
  downstream jobs' conditions at its output. If your fork deploys differently, the
  transferable idea is: gate on "is this version already released," not on "did CI
  pass."

- [ ] **[build/deploy] This ledger, and the tooling that keeps it honest**
  (`5aec961`, `4aff60b`, `f08e71f`, `50900c2`)
  docs/PATCHES.md itself shipped in this release, backfilled to the 21.2.19 template
  baseline. The release tooling enforces it upstream: `bump_version.js` inserts a
  `TODO(release)` placeholder entry on every bump, and the pre-commit hook refuses
  all commits until it's replaced with real notes (it also blocks empty changelog
  placeholder entries). Fork safety is built in: bumps only write the ledger when
  the package name and repository match upstream, so your own releases never stamp
  your versions into a file keyed to AM's.
  *Apply:* nothing to port — your copy of the ledger and the guard arrived with
  these files. Start using it: record your watermark and work the entries. If you
  want the same fill-before-committing discipline for your own changelog, the hook
  pattern transfers directly.

- [ ] **[test] E2E determinism: durable logout, permission mirroring** (`aa3f827`,
  `eadde21`)
  Two portable lessons from chasing CI-only failures. (1) Logout is only durable
  once the auth provider clears its persisted session — navigating right after the
  UI updates can boot the next page still authenticated; the indexeddb scoping test
  now polls until the Supabase token is gone from localStorage, and its post-reload
  logged-out check asserts positive signals (header rendered, zero profile links)
  instead of a not-visible check that passes vacuously on a booting page. (2)
  `Notification.permission` on macOS requires OS-level authorization, absent on CI
  runners — the permission test now asserts the UI mirrors whatever the browser
  reports rather than assuming the context grant surfaces as 'granted'.
  *Apply (if you kept AM's e2e suite):* port both patterns; they generalize to any
  test that reloads after logout or asserts on browser-mediated permission state.

## 21.4.0 — 2026-07-13

- [ ] **[server] [client] WebSocket auth-expiry eviction + silent client recovery**
  (`31bc253`, `bcb55e6`)
  Sockets that authenticated once stayed in their user's broadcast room forever, even
  after the auth token expired. The server now reads the JWT `exp` claim at
  authentication and schedules an eviction: at expiry the socket leaves its user room
  and receives an `auth-expired` event. The client listens for it, refreshes its
  session, and silently re-authenticates the socket — or signs the user out if the
  session is truly dead.
  *Apply:* add the expiry timer to your websocket auth handler and the `auth-expired`
  listener wherever your client manages socket auth (AM: `server/services/
  websocketService.ts`, `client/src/app/services/user-settings.service.ts`). Without
  it, a tab left open past expiry keeps receiving user broadcasts it shouldn't, or
  silently stops syncing.

- [ ] **[build/deploy] Supervised web dyno; compiled server JS** (`87c0b17`)
  The Procfile backgrounded the API via `ts-node` in a subshell, so Heroku only
  watched the SSR process — an API crash left the dyno serving an app whose every
  API/websocket call failed until the daily cycle, and a `sleep 3` raced API boot.
  Fixed with a small supervisor (`scripts/heroku-web.mjs`): starts the compiled API
  (new `server/tsconfig.build.json`, built during `heroku-postbuild`), waits for
  `/api/health` before starting SSR, exits non-zero when either child dies so the
  platform restarts the dyno, and forwards SIGTERM for graceful shutdown.
  *Apply:* if your Procfile backgrounds one process behind another, port the
  supervisor wholesale (it's self-contained) and add a server compile step. Requires
  the `/api/health` endpoint (21.3.0) and the `process.cwd()` static-path fix
  (21.3.0). `typescript` must live in `dependencies` if your host prunes devDeps.

- [ ] **[tauri] Content Security Policy for the webview** (`8e59a5a`, `1d5d06f`,
  `0847162`)
  The desktop/mobile shells shipped `"csp": null` — any XSS ran unrestricted, with
  reach into the Tauri IPC surface. Fixed by defining a real policy in
  `tauri.conf.json`, with three hard-won concessions: `'unsafe-eval'` (the ICU
  translation compiler builds functions at runtime — without it the app
  black-screens), style-hash injection disabled via
  `dangerousDisableAssetCspModification: ["style-src"]` (injected hashes neutralize
  the `'unsafe-inline'` Angular's runtime styles require), and `'unsafe-hashes'` plus
  one sha256 for the async-CSS `onload` handler. Full reasoning and test procedure:
  `docs/CONTENT_SECURITY_POLICY.md`.
  *Apply:* copy the policy, then **replace the origins with yours** (API domain,
  Supabase project, analytics). Test with a bundled `--debug` build — `tauri dev`
  doesn't apply the policy — and clear the app's webview storage between attempts,
  because the service worker caches the old policy's HTML.

- [ ] **[server] Test-only endpoints require a loopback peer** (`8a1fc19`)
  The `/api/auth/test/*` endpoints (user create/delete/cleanup) were guarded only by
  NODE_ENV — one misconfiguration away from exposing user management to the network.
  They now also verify the TCP peer is loopback.
  *Apply:* port the guard middleware if you kept the test endpoints.

- [ ] **[server] og-image endpoint rate-limited and capped** (`402b56d`)
  The screenshot endpoint drives headless Chromium; even host-allowlisted (21.3.8) it
  was open to resource exhaustion. Now rate-limited with a response cap.

- [ ] **[server] Unauthenticated username-creation endpoints removed** (`d389a10`)
  Username creation happens only through the authenticated signup flow now — the
  standalone REST endpoint had stayed open even after 21.3.8's mutation auth-gating
  (it lived on the auth router, which that middleware deliberately didn't wrap).
  *Apply:* if your fork kept the standalone endpoints, remove or auth-gate them.

- [ ] **[test] E2E trustworthiness overhaul** (`8332ed6`, `0064eaf`, and follow-ups)
  The suite could pass while features were broken: dozens of assertions were wrapped
  in if-visible guards (three referenced selectors that never existed, so those checks
  had literally never run), and ~139 hard `waitForTimeout` calls made it slow and
  flaky. Fixed by making every check unconditional, replacing sleeps with state-based
  waits, loosening full-page visual comparisons slightly (0.005 ratio) with the footer
  version masked so releases don't churn baselines, and adding an end-to-end test that
  forces websocket auth expiry (via a loopback-guarded test endpoint) and asserts the
  client recovers. Two portable gotchas surfaced: the shared login helper must handle
  the auth menu opening in signup mode (its default on a fresh open), and
  `Notification.permission` on macOS requires OS-level authorization — assert your UI
  mirrors what the browser reports, never assert 'granted' on CI.
  *Apply (if you kept AM's e2e suite):* audit for the same three rot patterns —
  conditional guards, hard waits, and selectors that don't exist (they fail silently
  inside `.catch(() => false)`).

## 21.3.8 — 2026-07-10

*Note: 21.3.8 was never deployed on its own — it shipped to production together with
21.4.0. Its README "Maintenance TODO" additions are a preview of 21.4.0's work, not
open items you must adopt.*

- [ ] **[server] Mutations require authentication (REST + GraphQL)** (`c3549ff`)
  Feature-flag and notification mutations accepted unauthenticated writes — anyone who
  could reach the API could flip flags for every connected client or send
  notifications. Fixed with a `requireAuthForMutations` middleware (reads stay
  public; non-GET requires a valid Supabase Bearer token) wrapping the affected
  routers, and a GraphQL-level check that parses each document and applies the same
  rule only to mutation operations.
  *Apply:* port the middleware (`server/middleware/requireAuth.ts`) and wrap every
  state-changing router your fork added on the templated pattern — the mutation
  surface was open by default. Note it deliberately no-ops in development/test
  NODE_ENV; verify production actually enforces.
  *Superseded:* extended in 21.4.0 — the unauthenticated username-creation endpoint
  wasn't covered by this middleware and was removed outright (`d389a10`).

- [ ] **[server] og-image screenshot endpoint restricted to own hosts** (`c3549ff`)
  Classic SSRF: the endpoint screenshotted whatever URL the caller supplied, meaning
  anything the server could reach — internal services included. Fixed by parsing the
  URL, restricting to http(s), and checking the hostname against a hard-coded
  allowlist of the app's own origins.
  *Apply:* if you kept og-image generation, port the allowlist block and **use your
  domains**.
  *Superseded:* extended in 21.4.0 with a rate limit and response cap (`402b56d`) —
  apply both together.

- [ ] **[build/deploy] Deploy and quality gates made real** (`014c549`)
  Three gates looked like gates but weren't: the deploy workflow's `workflow_run`
  trigger fires on *failed* CI too and the success check was commented out (every
  push deployed regardless of tests); the Sonar step only waited for analysis to
  finish, never checking the quality gate verdict; and the local test harness had no
  error handling, so a failing step scrolled past and `npm test` exited green. Fixed
  by requiring `workflow_run.conclusion == 'success'` on all deploy jobs, querying
  Sonar's `project_status` API and failing on anything but OK, and running the test
  harness under `set -euo pipefail`.
  *Apply:* check your deploy workflow's trigger conditions first — this is the one
  that ships broken builds.
  *Superseded:* refined twice later. 21.4.0 (`1429dc7`) enforces the Sonar gate on
  main only (SonarCloud's plan refuses gate data for other branches, and the original
  died silently there). After 21.4.0 (`5de81cf`), a `check-release` job keys the
  whole deploy chain off whether the current version is already released, so
  housekeeping merges stop triggering redeploys. Port the current workflow state.

- [ ] **[test] 100% coverage mandate enforced in tooling** (`014c549`)
  The coverage bar was convention only. Now hard-coded: jest `coverageThreshold` and
  karma `coverageReporter.check`, all four metrics.
  *Apply:* set thresholds to whatever bar your fork actually holds — but set
  something, or the number is decorative.

- [ ] **[server] ngsw-worker.js served no-cache from the server users actually hit**
  (`3537c54`)
  21.3.6 added no-cache headers for the service-worker script — on the API server,
  which browsers never ask for it. The SSR server was still serving it through
  `express.static` with a 1-year maxAge, so worker updates could stall for a day or
  more. Fixed with an explicit no-cache route on the SSR side.
  *Apply:* find which of your processes actually answers `/ngsw-worker.js` (devtools
  Network tab) and make *that one* send no-cache — misattributing this was the bug.

- [ ] **[tauri] Android minSdkVersion 35 → 24** (`3537c54`)
  minSdk 35 limited the app to Android 15+, hiding it from nearly every Play Store
  device. One-line config change; check what your native plugins actually require.

- [ ] **[client] rel="noopener noreferrer" on external target=_blank links**
  (`3537c54`)
  The external donation link handed the opened page a `window.opener` handle back
  into the app (reverse tabnabbing). Fixed on the templated anchor.
  *Apply:* grep your fork for every `target="_blank"` you've added and add the rel.

- [ ] **[build/deploy] Version bumps update every lockfile occurrence** (`01924ed`)
  The bump script's lockfile patterns lacked the global flag, so only the first
  name/version pair was updated each release — lockfile entries silently drifted
  behind. Fixed with `/g` and a re-sync.
  *Apply:* grep your lockfiles for your own old version numbers; the drift is
  probably already there.
  *Superseded:* the script gained more responsibilities after 21.4.0 (patch-ledger
  placeholder + upstream detection) — take the current `bump_version.js` wholesale
  if syncing past that.

- [ ] **[build/deploy] Xcode 26 migration finished for mobile CI** (`f488165`,
  `79816a6`)
  App Store uploads now require the iOS 26 SDK, but CI runners default to older
  Xcode. CI explicitly selects Xcode 26.3, and the iOS project weak-links the Swift
  compatibility shims Xcode 26 dropped (Tauri's precompiled binaries still reference
  them; the link otherwise fails). This is the finished state of the migration
  started in 21.3.7 — port this state, not 21.3.7's intermediate.

## 21.3.7 — 2026-06-24

- [ ] **[server] [client] Turnstile CAPTCHA removed — bot defense is email OTP +
  rate limiting** (`7713456`, `39e4b74`)
  The Cloudflare Turnstile pipeline (invisible widget on signup, token smuggled
  through Supabase metadata, server-side verify that admin-deleted failures) was
  removed entirely. Nothing new replaced it: the two replacement mechanisms — email
  OTP verification (unverified signups never get a session) and API rate limiting —
  already existed in the template. The teardown spans the client widget and its form
  plumbing, the server verify service and its env keys, the i18n strings, the
  privacy-policy paragraph, and the CAPTCHA docs; the signup-verification webhook
  was kept as a payload-validating stub for future server-side signup checks. As a
  side effect, the focus-coordination machinery the widget required collapsed to a
  simple focus-on-open, and signup visual baselines were re-shot.
  *Apply:* if your fork ported Turnstile from an earlier AM state, first verify OTP
  + rate limiting work, then tear Turnstile out (the `7713456` diff is the
  checklist). If you never had it, check this off.

- [ ] **[build/deploy] Post-build scripts no longer swallow ng build flags**
  (`bdd0392`)
  `npm run build -- --flag` appended the flag to the *whole* script chain, so
  post-build scripts (like the service-worker patcher) received it as their argument
  and misfired. Fixed by splitting `ng build` into its own `build:ng` script so `--`
  reaches only the Angular CLI.
  *Apply:* if your build script chains anything after `ng build`, split it the same
  way — any flagged invocation is currently corrupting your post-build steps.

- [ ] **[server] [client] ReDoS regex fixes** (`2710150`)
  Two polynomial-backtracking regexes reachable from user input — the slug pipe and
  the username hyphen-trimming pattern — could burn CPU on crafted input. Fixed by
  restructuring into sequential, anchored passes.
  *Apply:* port both if you kept the slug pipe or username sanitization; they're
  drop-in (`client/src/app/pipes/slug.pipe.ts`,
  `server/constants/username.constants.ts`).

- [ ] **[build/deploy] iOS deployment target → 17.0** (`b8f4ca7`)
  First half of the Xcode 26 migration (raising the target lets the linker drop
  pre-17 Swift compat requirements), plus a tauri-action pin bump off a deprecated
  Node runtime.
  *Superseded:* 21.3.8 finishes this migration — port that state instead.

- [ ] **[test] Empty e2e test bodies got real assertions** (`2710150`)
  Several e2e tests ended without asserting anything — green no matter what.
  *Superseded:* 21.4.0's e2e overhaul rewrote the same specs far more aggressively;
  skip straight to that state if you're porting the suite.

## 21.3.6 — 2026-06-22

- [ ] **[client] [server] Service-worker offline resilience overhaul** (`e2016d7`)
  Five coordinated fixes to how the PWA survives bad networks, each preventing a
  distinct failure. (1) A post-build script (`client/scripts/patch-ngsw.js`) defers
  the generated worker's `skipWaiting()` until its asset cache is fully populated —
  otherwise a network drop mid-install activates a worker with a half-empty cache and
  the app 504s offline instead of serving the previous version (angular/angular#45377).
  (2) Data groups switch from network-first to cache-first (`performance` strategy)
  with shorter timeouts, so gateway errors from a flaky network can't clobber good
  cached data. (3) Asset groups get `updateMode: lazy` so a partial background update
  can't wedge navigation. (4) The worker script itself is served with no-cache
  headers so browsers actually pick up new workers. (5) `navigator.storage.persist()`
  is requested at startup so the browser doesn't silently evict the cache and
  IndexedDB under disk pressure.
  *Apply:* each piece is independent; (1) is the highest-value and is a copy-in
  script chained after `ng build` — after Angular upgrades, confirm the
  `[patch-ngsw]` success line still appears in build output.
  *Superseded:* (4) was incomplete — 21.3.8 discovered the *SSR* server (the one
  browsers actually hit) was still serving the worker with a 1-year cache; apply
  both halves.

- [ ] **[client] Eviction-resistant IndexedDB cache store** (`e2016d7`)
  Even with persistent storage, the SW cache is the most eviction-prone tier. A new
  IndexedDB `cache` object store (migration v4) with raw-key `getCache`/`setCache`
  on the IDB service gives critical app data a fallback that survives SW cache loss.
  *Apply:* if you kept AM's versioned-migration system, add the migration and the two
  service methods — but use your database's next free version number, not literally 4.

- [ ] **[test] Hoisted-listener conversion completed; socket leak sealed** (`a9910c8`)
  Finishes 21.3.5's server-spec work: the last per-call supertest listeners became
  shared hoisted servers, and a cross-test `app.set('io')` leak got cleanup hooks.
  Together with 21.3.5's item this is one concern — see that entry.

## 21.3.5 — 2026-04-26

- [ ] **[client] Signup streamlined** (`e29eab7`, `b99a61c`, `96cdaca`)
  Confirm-password was dropped (friction without protection — the complexity
  validator already catches typos), the username field prefills from the email
  prefix on blur (sanitized to the allowed charset), and auth fields auto-focus
  every time the menu opens, not just first mount.
  *Apply:* drop your confirm-password field and its i18n strings; port `onEmailBlur`
  from `auth-signup.component.ts`.
  *Superseded:* the focus wiring was entangled with the Turnstile CAPTCHA and got
  simplified when 21.3.7 removed it — take the focus logic from the 21.3.7 state.

- [ ] **[client] Anonymous-preferences reset detects the browser language**
  (`e69454e`)
  Logout reset preferences to a hardcoded `en-US` — wrong for every non-English
  browser. Fixed by matching `navigator.languages` against the supported list (with
  the same parser SSR uses), and cleaning up a persist-plugin key that made
  never-customized users trip the "import local data?" dialog with phantom data.
  *Apply:* port `detectBrowserLanguage()` in `user-settings.service.ts`; the key
  cleanup only matters if you kept the anonymous-data-import flow.

- [ ] **[client] Dialog UX fixes: onCancel callback + iOS tap-outside dismiss**
  (`e7437b6`, `0445939`)
  Two dialog-layer bugs: the import dialog detected cancellation by polling a signal
  every 100ms (leaked timers), fixed with a proper `onCancel` callback fired by
  `dismiss()`; and on iOS WKWebView, tapping outside a dialog did nothing because the
  CSS that enables touch-scrolling shadows the CDK backdrop — fixed by also listening
  on the overlay pane and dismissing when the tap lands in the gutter.
  *Apply:* both port to any fork that kept AM's CDK-overlay dialog pattern
  (`confirm-dialog.service.ts`, `dialog-base.component.ts`,
  `dialog-menu.component.ts`).

- [ ] **[client] Feature-monitor skips its first tick until flags hydrate**
  (`1c6524a`)
  Feature flags are fail-closed before they load, so the route monitor bounced deep
  links to gated routes back to `/` the moment flags arrived. Fixed with a one-shot
  latch that swallows the first emission.
  *Apply:* any fork that redirects off feature-flag state in an effect has this
  deep-link race — add the same latch.

- [ ] **[client] Small UX/logging cleanups** (`1def518`, `78a8d37`)
  The avatar initial now prefers the chosen username over the email's first letter;
  SSR-time fetch failures (expected during prerender) log at debug level instead of
  error; the dev proxy stops flooding e2e logs.
  *Apply:* grab what applies; all are one- or two-line changes referenced from the
  hashes.

- [ ] **[test] One hoisted supertest listener per server spec file** (`2e42d45`)
  Per-call supertest listeners produced socket-hang-up flakes under parallel jest.
  Every server spec now creates one shared `http.Server` in `beforeAll` and runs all
  requests against it. Completed in 21.3.6 (`a9910c8`), which converted the last
  stragglers and sealed a cross-test `app.set('io')` leak. This is AM house style
  for all server specs now.
  *Apply (if you kept AM's server test suite):* grep for `request(app` — every hit
  becomes `request(server)` against a hoisted listener.

- [ ] **[tauri] Android build targets JDK 17** (`8232f65`)
  Current Android Gradle Plugin and Kotlin toolchains require 17; the generated
  project still targeted 1.8 and broke on up-to-date SDKs. Set source/target
  compatibility and `jvmTarget` to 17 in the generated `build.gradle.kts`.

- [ ] **[server] ~~Turnstile log sanitization~~ — skip** (`a35e88c`)
  Sanitized attacker-influenced CAPTCHA error codes before logging them.
  *Superseded:* 21.3.7 removed Turnstile entirely; nothing to port unless your fork
  keeps a Turnstile integration. The general lesson stands: sanitize third-party
  response fields before logging them.

## 21.3.4 — 2026-04-09

- [ ] **[test] Playwright timezone pinned so visual baselines survive CI**
  (`0233316`)
  Screenshot baselines captured locally (US Pacific) diverged on CI (UTC) wherever
  the UI renders times. Fixed by pinning `timezoneId` to a fixed, DST-free offset in
  the Playwright config.
  *Apply:* pin a timezone in your config, then re-capture any baselines that render
  times.

- [ ] **[build/deploy] Sonar scanner via npx instead of a downloaded binary**
  (`61e880e`)
  CI curled a platform-pinned scanner zip; now it runs `npx sonar-scanner` backed by
  a devDependency. Skip if you don't use SonarCloud; if you do, port together with
  21.3.8's quality-gate enforcement.

## 21.3.3 / 21.3.2 — 2026-04-09

- [ ] **[build/deploy] Everything the production build invokes must live in
  `dependencies`** (`82f1c3c`, `eab1e66`)
  Two same-day hotfixes for one durable rule: Heroku prunes devDependencies, so
  `ng` wasn't on PATH at build time (21.3.2 moved `@angular/cli`), and then the
  build failed one package deeper (21.3.3 moved `@angular/build`). The project hit
  this a third time in 21.4.0 (`typescript`, for the server compile).
  *Apply:* audit your fork's whole build chain in one pass instead of playing
  whack-a-mole — on any host that prunes devDeps, every binary and library your
  production build touches goes in `dependencies`. AM's current `package.json` files
  are the reference for where things landed.

## 21.3.1 — 2026-04-09

- [ ] **[server] Express 5 SSR fixes** (`547554b`)
  Express 5 rejects the bare `'*'` catch-all (the SSR server crashed on startup) —
  it's now `'/{*splat}'`. And `CommonEngine` needs `allowedHosts` or localhost
  requests silently fall back to client-side rendering, making SSR look broken in
  local testing and Lighthouse runs.
  *Apply:* change your catch-all pattern when you take Express 5; add **your**
  domains to `allowedHosts`.

- [ ] **[test] Karma-wide fetch mock for the health endpoint; Actions bumps**
  (`547554b`)
  Companion to 21.3.0's health check: a global fetch wrapper in `karma-setup.js`
  answers `/api/health` so unit tests don't 404-spam. Also routine
  checkout/setup-node v3→v4 bumps in CI.

## 21.3.0 — 2026-04-09

- [ ] **[server] [client] Real `/api/health` endpoint for connectivity checks**
  (`72fcf47`)
  "Online" was verified by fetching the favicon — which proves static serving, not
  API liveness. A lightweight `GET /api/health` was added and the connectivity
  service pings it instead.
  *Apply:* add the endpoint and repoint your connectivity checker. This endpoint
  becomes load-bearing later: 21.4.0's dyno supervisor polls it at startup, and the
  Karma mock in 21.3.1 depends on it.

- [ ] **[build/deploy] SSR static path resolves from `process.cwd()`** (`0a0914d`)
  The API server resolved the client's dist directory relative to `__dirname`, which
  breaks when the server runs as compiled JS from a build directory. Fixed by
  resolving from the process working directory.
  *Apply:* prerequisite for 21.4.0's compiled-server supervisor — fix your path
  resolution now if you compile the server. (Same commit scoped Sonar's sources and
  quieted a tsconfig warning; copy-the-line items.)

- [ ] **[server] Security dependency bumps — `express-rate-limit` IPv6 bypass**
  (`44c5a73`)
  The production-relevant one: `express-rate-limit` < 8.3.2 has an IPv6 rate-limit
  bypass, and rate limiting guards real endpoints here (and becomes the og-image
  defense in 21.4.0). Bump to ≥ 8.3.2 regardless of anything else in this release.

- [ ] **[client] Share menu: social buttons, QR code, native share sheet**
  (`beb40ef`, `72fcf47`)
  New optional header menu offering social-platform share buttons, a QR code of the
  current URL with a branded overlay, and the native OS share sheet where available.
  Wiring spans the component directory, provider setup in the app config, a few new
  dependencies, styles, and strings in every locale file.
  *Apply:* optional feature — port it with your own branding and locales, or skip
  cleanly; nothing later in the ledger depends on it.

- [ ] **[test] Share-menu visual specs; screenshot threshold moved into config**
  (`4ae34cd`)
  Visual specs for the new menu, and `maxDiffPixelRatio` became a strict config-level
  global instead of per-test settings.
  *Superseded:* partially by 21.4.0, which keeps the strict global but loosens
  full-page shots (0.005) and masks the footer version. Apply both in one pass if
  catching up that far.
