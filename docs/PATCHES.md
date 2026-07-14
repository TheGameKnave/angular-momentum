# Patch Ledger for Downstream Sites

If you templated your app from Angular Momentum and then modified the code, you can't
pull updates from this repo — but you can port them. This file is the living ledger of
what changed in each AM release, written as *intent-level* patches (what changed, why,
and where) rather than raw diffs, because your code has diverged and diffs won't apply.

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
suites.

If you templated from a version older than 21.3.8, first reconcile against the
in-app changelog (`server/data/changeLog.ts`) and git history up to 21.3.8 — this
ledger starts there.

---

## 21.4.0 — 2026-07-13

- [ ] **[server] [client] WebSocket auth-expiry eviction + silent client recovery**
  (`31bc253`, `bcb55e6`)
  The server now reads the JWT `exp` claim when a socket authenticates and schedules
  an eviction: at expiry the socket leaves its user room, auth state is cleared, and
  the server emits `auth-expired` to that socket. The client listens for
  `auth-expired`, refreshes its Supabase session, and re-emits `authenticate` with the
  fresh token (or signs out if the session is truly dead).
  *Apply:* port the expiry timer into your websocket auth handler and add the
  `auth-expired` listener wherever your client manages socket auth. Without this, a
  tab left open past token expiry keeps receiving user-room broadcasts it should no
  longer get (server side) and/or silently stops syncing (client side).

- [ ] **[build/deploy] Supervised web dyno; compiled server JS** (`87c0b17`)
  The old Procfile backgrounded the API via `ts-node` in a subshell — Heroku only
  watched the SSR process, so an API crash left a dyno serving an app whose every
  API/websocket call failed until the daily cycle. Now `scripts/heroku-web.mjs` starts
  the compiled API (`server/tsconfig.build.json`, built during `heroku-postbuild`),
  polls `/api/health` before starting SSR (replaces `sleep 3`), exits non-zero when
  either child dies (Heroku restarts the dyno), and forwards SIGTERM.
  *Apply:* if your Procfile still backgrounds one process behind another, port the
  supervisor wholesale (it's self-contained) and add a server build step. Note
  `typescript` must live in `dependencies` if your host prunes devDeps.

- [ ] **[tauri] Content Security Policy for the webview** (`8e59a5a`, `1d5d06f`,
  `0847162`)
  `tauri.conf.json` shipped `"csp": null` — any XSS ran unrestricted with reach into
  the Tauri IPC surface. Now a real policy, with three hard-won concessions:
  `'unsafe-eval'` (the ICU translation compiler builds functions at runtime — without
  it the app black-screens), `dangerousDisableAssetCspModification: ["style-src"]`
  (Tauri's injected style hashes neutralize the `'unsafe-inline'` Angular's runtime
  styles require), and `'unsafe-hashes'` + a sha256 for the async-CSS `onload`
  handler. Full reasoning and test procedure: `docs/CONTENT_SECURITY_POLICY.md`.
  *Apply:* copy the policy, then **replace the origins with yours** (API domain,
  Supabase project, analytics). Test with a bundled `--debug` build, never `tauri dev`
  (dev mode doesn't apply the policy), and clear the app's webview storage between
  attempts — the service worker caches the old policy's HTML.

- [ ] **[server] Test-only endpoints require a loopback peer** (`8a1fc19`)
  All `/api/auth/test/*` endpoints (user create/delete/cleanup) now verify the TCP
  peer is loopback in addition to the environment check, so a misconfigured
  NODE_ENV can't expose user-management endpoints to the network.
  *Apply:* port the guard middleware if you kept the test endpoints.

- [ ] **[server] og-image endpoint rate-limited and capped** (`402b56d`)
  The screenshot endpoint gets a rate limit and a response cap on top of the existing
  host allowlist (see 21.3.8), closing the resource-exhaustion angle.

- [ ] **[server] Unauthenticated username-creation endpoints removed** (`d389a10`)
  Username creation now happens only through the authenticated signup flow.
  *Apply:* if your fork kept the standalone endpoints, remove or auth-gate them.

- [ ] **[test] E2E trustworthiness overhaul** (`8332ed6`, `0064eaf`, and fixes)
  All if-visible guards became unconditional assertions (three checks referenced
  selectors that never existed and had silently never run); all hard waits became
  state-based waits except labeled measurement windows; full-page visual assertions
  get a 0.005 pixel-ratio override with the footer version masked so releases don't
  churn baselines; new end-to-end test forces websocket auth expiry via a
  loopback-guarded test endpoint and asserts the client recovers. Also: the shared
  login helper now handles the auth menu opening in signup mode (its default on a
  fresh open — only protected-route redirects auto-open in login mode).
  *Apply (if you kept AM's e2e suite):* the guard/wait patterns port mechanically;
  the login-helper fix matters for any spec that logs in from a public page. CI
  caveat: `Notification.permission` on macOS requires OS-level authorization —
  assert your UI mirrors the browser's report, don't assert 'granted'.

## 21.3.8 — 2026-07-10

- [ ] **[server] Mutations require authentication (REST + GraphQL)** (`423c27a`,
  `c3549ff`)
  Feature-flag and notification mutations previously accepted unauthenticated writes;
  reads stay public.
  *Apply:* audit every state-changing route/resolver your fork added on the same
  pattern — the templated code's mutation surface was open by default.

- [ ] **[server] og-image screenshot endpoint restricted to own hosts** (`c3549ff`)
  The endpoint would screenshot arbitrary URLs (SSRF). Now allowlisted to the app's
  own origins.
  *Apply:* if you kept og-image generation, allowlist your domains.

- [ ] **[build/deploy] Deploys gated on CI success + Sonar quality gate** (`423c27a`,
  `014c549`)
  The deploy workflow now fires only after the build/test workflow succeeds, and the
  Sonar quality gate is enforced (on main).
  *Apply:* check your deploy workflow's trigger — the templated one deployed on push
  regardless of test results.

- [ ] **[test] 100% coverage mandate enforced in jest/karma configs** (`423c27a`)
  Coverage thresholds are now hard-coded in the tooling instead of by convention.

- [ ] **[server] ngsw-worker.js served with no-cache from SSR** (`3537c54`)
  Service-worker updates were delayed by HTTP caching of the worker script itself.

- [ ] **[tauri] Android minSdkVersion 35 → 24** (`3537c54`)
  Restores Play Store device availability lost to an over-aggressive minimum.

- [ ] **[build/deploy] Version bumps update every lockfile occurrence** (`01924ed`)
  `bump_version.js` previously missed some lockfile entries, producing mismatched
  installs.

- [ ] **[build/deploy] Xcode 26 build fixes for iOS/mobile CI** (`f488165`,
  `79816a6`) — port if your mobile CI pins Xcode.
