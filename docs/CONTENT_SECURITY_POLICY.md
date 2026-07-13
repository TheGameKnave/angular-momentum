# Content Security Policy (CSP)

The Tauri desktop/mobile webview ships with a Content Security Policy: an allowlist of
what the app may load and execute. Anything not on the list is blocked by the webview
engine itself. Its job is to contain XSS — injected script can't run, and can't reach
the Tauri IPC surface — even if an escaping bug slips through.

**Where it lives:** `client/src-tauri/tauri.conf.json` → `app.security.csp` (one string).

**Web note:** the web app currently has *no* CSP — `server/index.ts` passes
`contentSecurityPolicy: 'none'` (see README Maintenance TODO). When one is added, the
Tauri policy is the origin inventory to start from.

---

## When you have to touch it (and when you don't)

Day-to-day feature work does **not** touch the CSP. New components, routes, services,
styles, API endpoints on the existing server — all covered by `'self'` and the
existing origins.

You only need to edit the policy when a change crosses an **origin or execution
boundary**:

| Change | What to add |
|--------|-------------|
| New third-party script (analytics, widget) | its origin in `script-src`, plus whatever it connects to in `connect-src` |
| New API/websocket host | `https://` + `wss://` origins in `connect-src` |
| Remote images/fonts | origin in `img-src` / `font-src` |
| Embedded iframe | origin in `frame-src` |
| Inline event handler in raw HTML | **don't** — refactor to addEventListener/Angular bindings, or hash the exact handler (see below) |

**How a violation looks:** the feature silently does nothing in the Tauri app, and the
webview console shows `Refused to load/execute ... Content Security Policy`. The error
names the directive and the blocked origin — that's your one-line fix.

---

## The non-obvious parts of our config

### 0. `'unsafe-eval'` in `script-src`

The i18n stack requires it: translations are JSON loaded at runtime, and
`@messageformat/core` (via `transloco-messageformat`) compiles each ICU message into a
JavaScript function using the `Function` constructor. Without `'unsafe-eval'`, the
compile throws `EvalError` during bootstrap, translation loading dies, and since every
template sits inside `*transloco`, the app renders a black screen.

This is a measured concession, not a hole: `'unsafe-eval'` lets *already-allowed,
already-running* scripts evaluate strings. Injected markup still can't execute —
inline scripts, inline handlers, and foreign script origins remain blocked, which is
what stops XSS from getting a foothold in the first place. Don't add new
eval-dependent code on the strength of this entry, though — it exists for the ICU
compiler.


### 1. `dangerousDisableAssetCspModification: ["style-src"]`

Tauri normally rewrites the CSP at build time, adding sha256 hashes for every inline
`<script>`/`<style>` in the bundled HTML (that's how its own IPC bootstrap scripts are
allowed). But per the CSP spec, **the presence of any hash in a directive makes
`'unsafe-inline'` ignored** in that directive.

Angular injects component styles at runtime — those can never be hashed at build time,
so they need `'unsafe-inline'` in `style-src` to stay effective. Hence: Tauri's hash
injection is disabled for `style-src` only. `script-src` keeps Tauri's hashes (we want
those; inline scripts in `index.html` are hashed automatically).

Symptom if this regresses: the app renders black/unstyled and the console fills with
`Refused to apply a stylesheet`.

### 2. `'unsafe-hashes' 'sha256-MhtPZXr7+LpJUY5qtMutB+qWfQtMaPccfe7QXtCcEYc='`

The Angular build loads non-critical CSS asynchronously via
`<link media="print" onload="this.media='all'">`. Plain hashes only match `<script>`
elements; `'unsafe-hashes'` lets them also match inline **event handlers**. That hash
is exactly `this.media='all'` and nothing else — compute a replacement with:

```sh
printf "the-handler-code" | openssl dgst -sha256 -binary | base64
```

Symptom if this regresses: stylesheets stay `media="print"` → page renders unstyled.

---

## How to test a CSP change

`tauri dev` does **not** apply this policy (dev mode uses the separate, unset `devCsp`
field). Only a bundled build tests it:

```sh
cd client && npm run tauri build -- --debug
```

`--debug` keeps devtools enabled so you can watch the console. Then exercise each
directive:

1. App renders styled (bundled assets, `style-src`, `font-src`)
2. Log in (`connect-src` → Supabase)
3. Change a setting from a second session and watch it sync (`connect-src` → wss API)
4. Accept cookies → GA/Hotjar load without violations (`script-src` + analytics `connect-src`)

The updater is Rust-side and unaffected by the webview CSP.

**Service-worker caveat:** Tauri injects the CSP as a meta tag into the bundled
`index.html`, and ngsw caches that HTML in the webview's persistent storage — which
survives relaunches *and* rebuilds. If you change the CSP and still see the old
violations, you're being served the cached page. Clear the app's webview data and
relaunch:

```sh
rm -rf ~/Library/WebKit/app.angularmomentum ~/Library/Caches/app.angularmomentum
```

(Same mechanism in production: after an update, users get the new CSP one
service-worker refresh late. It self-heals; no action needed.)

Platform coverage: a macOS build tests WKWebView, which iOS also uses. Windows
(WebView2), Linux (WebKitGTK), and Android come from CI — the one Windows-specific
allowance (`http://ipc.localhost` for Tauri IPC) is already in `connect-src`.

---

## Forking

The policy hardcodes this project's origins. If you forked the repo, replace in the
`csp` string (see also `docs/FORK_CHECKLIST.md`):

- `angularmomentum.app` (https + wss) → your API domain
- `tyoyznpjxppchdyydbnf.supabase.co` (https + wss) → your Supabase project
- The GA/Hotjar origins → whatever analytics you actually use (or delete them)
