# Fork Configuration Checklist

This checklist covers everything you need to change when forking Angular Momentum as a springboard for your own project.

---

## 1. Project Name (Global Replace)

Replace all variations of the project name throughout the codebase:

| Pattern | Example Usage |
|---------|---------------|
| `angular-momentum` | package names, URLs |
| `angularmomentum` | identifiers, domains |
| `angularMomentum` | camelCase references |
| `AngularMomentum` | PascalCase references |
| `Angular Momentum` | display names |

**Key files to update:**
- [ ] `package.json` (root) - name, siteUrl, repository
- [ ] `client/package.json` - name, siteUrl
- [ ] `server/package.json` - name
- [ ] `client/angular.json` - project name, output path
- [ ] `client/src-tauri/tauri.conf.json` - productName, identifier, frontendDist

---

## 2. Domain Names & URLs

| Current Value | Location | Notes |
|---------------|----------|-------|
| `angularmomentum.app` | `client/src/environments/environment.prod.ts` | Production domain |
| `staging.angularmomentum.app` | `client/src/environments/environment.stage.ts` | Staging domain |
| `dev.angularmomentum.app` | `server/constants/server.constants.ts` | CORS allowed origins |

**Files to update:**
- [ ] `client/src/environments/environment.prod.ts`
- [ ] `client/src/environments/environment.stage.ts`
- [ ] `server/constants/server.constants.ts` (CORS origins)
- [ ] `client/src-tauri/tauri.conf.json` (deep link host)

---

## 3. GitHub Configuration

| Item | Current Value | Location |
|------|---------------|----------|
| Owner/Org | `TheGameKnave` | package.json, workflows |
| Repository | `angular-momentum` | package.json, tauri.conf.json |

**Files to update:**
- [ ] `package.json` (repository URL)
- [ ] `client/src-tauri/tauri.conf.json` (updater endpoint)
- [ ] `client/src/app/constants/app.constants.ts` (release download URLs)
- [ ] `.github/workflows/build_test.yml` (SonarCloud project key)
- [ ] `.github/workflows/deploy.yml` (Heroku, Google Play references)
- [ ] `sonar-project.properties`

---

## 4. Third-Party Services

### Heroku (Web Deployment)
- [ ] Create new Heroku app
- [ ] Update app name in `.github/workflows/deploy.yml` (line 31)
- [ ] Add GitHub Secret: `HEROKU_API_KEY`

### SonarCloud (Code Quality)
- [ ] Create SonarCloud organization and project
- [ ] Update `sonar-project.properties`:
  - `sonar.projectKey`
  - `sonar.organization`
- [ ] Update `.github/workflows/build_test.yml` (lines 136-137)
- [ ] Add GitHub Secret: `SONAR_TOKEN`

### Cloudflare (CDN/Security)
- [ ] Set up Cloudflare zone for your domain
- [ ] Add to server `.env`:
  - `CLOUDFLARE_ZONE_ID`
  - `CLOUDFLARE_API_TOKEN`

### Turnstile (Bot Protection)
- [ ] Create Turnstile widget in Cloudflare dashboard
- [ ] Update site keys in environment files:
  - `client/src/environments/environment.ts` (test key)
  - `client/src/environments/environment.prod.ts` (production key)
  - `client/src/environments/environment.stage.ts` (staging key)
- [ ] Add to server `.env`: `TURNSTILE_SECRET_KEY`

### Supabase (Database/Auth)
- [ ] Create new Supabase project
- [ ] Update all environment files with new project URL and public key:
  - `client/src/environments/environment.ts`
  - `client/src/environments/environment.prod.ts`
  - `client/src/environments/environment.stage.ts`
  - `client/src/environments/environment.local.ts`
- [ ] Add GitHub Secrets:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`

---

## 5. iOS / App Store Configuration

| Item | Current Value | Action Required |
|------|---------------|-----------------|
| App ID | `6753187258` | Register new app in App Store Connect |
| Bundle ID | `app.angularmomentum` | Change to your identifier |
| Team ID | (secret) | Use your Apple Team ID |
| Signing Identity | `Developer ID Application: Kevin Duda (7386GL7C2C)` | Use your signing identity |

**Files to update:**
- [ ] `client/src-tauri/tauri.conf.json`:
  - `identifier`
  - `macOS.signingIdentity`
  - `iOS.developmentTeam`
- [ ] `client/src/app/constants/app.constants.ts` (App Store URL)

**GitHub Secrets to add:**
- [ ] `APPLE_TEAM_ID`
- [ ] `APPLE_ID`
- [ ] `APPLE_PASSWORD`
- [ ] `MAC_CERT` (macOS signing certificate)
- [ ] `MAC_CERT_PASSWORD`
- [ ] `APPLE_SIGNING_IDENTITY`
- [ ] `IOS_CERTIFICATE`
- [ ] `IOS_CERTIFICATE_PASSWORD`
- [ ] `IOS_MOBILE_PROVISION`
- [ ] `APPSTORE_ISSUER_ID`
- [ ] `APPSTORE_API_KEY_ID`
- [ ] `APPSTORE_API_PRIVATE_KEY`

---

## 6. Android / Play Store Configuration

| Item | Current Value | Action Required |
|------|---------------|-----------------|
| Package Name | `app.angularmomentum` | Register in Google Play Console |
| Play Store URL | `https://play.google.com/store/apps/details?id=app.angularmomentum` | Update after registration |

**Files to update:**
- [ ] `client/src-tauri/tauri.conf.json` (`identifier`)
- [ ] `client/src/app/constants/app.constants.ts` (Play Store URL)
- [ ] `.github/workflows/deploy.yml` (package name references)

**GitHub Secrets to add:**
- [ ] `ANDROID_RELEASE_KEYSTORE_BASE64`
- [ ] `ANDROID_KEYSTORE_PASSWORD`
- [ ] `ANDROID_KEY_ALIAS`
- [ ] `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`

---

## 7. Tauri Desktop App

**GitHub Secrets to add:**
- [ ] `TAURI_SIGNING_PRIVATE_KEY`
- [ ] `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- [ ] `GH_TOKEN` (for creating releases)

> **Note:** macOS signing secrets (`MAC_CERT`, `MAC_CERT_PASSWORD`, `APPLE_SIGNING_IDENTITY`) are shared with iOS and listed in Section 5.

---

## 8. Company/Branding Information

Update your company/organization details:

**File:** `client/src/app/constants/app.constants.ts`
- [ ] `companyName` (currently: `GameKnave Design`)
- [ ] `supportEmail` (currently: `admin@gameknave.com`)

---

## 9. Server Environment Variables

Copy `server/.env.example` to `server/.env` and configure:

```env
NODE_ENV=development
APP_PORT=4200
PORT=4201
API_PORT=4201

# Database
DB_USER=your_db_user
DB_PASS=your_db_password
DB_HOST=your_db_host
DB_NAME=your_db_name

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key

# Cloudflare
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_API_TOKEN=your_api_token
TURNSTILE_SECRET_KEY=your_turnstile_secret
```

---

## 10. E2E Testing

Update test email domain used for cleanup:

**Files:**
- [ ] `tests/e2e/data/test-users.ts` - change `@angular-momentum.test`
- [ ] `server/routes/auth.routes.ts` - update test user cleanup pattern

---

## 11. Complete GitHub Secrets Reference

| Secret | Service | Required For |
|--------|---------|--------------|
| `SONAR_TOKEN` | SonarCloud | Code quality analysis |
| `HEROKU_API_KEY` | Heroku | Web deployment |
| `GH_TOKEN` | GitHub | Lighthouse CI upload |
| `SUPABASE_URL` | Supabase | E2E tests |
| `SUPABASE_SERVICE_KEY` | Supabase | E2E tests |
| `TAURI_SIGNING_PRIVATE_KEY` | Tauri | Desktop app updates |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Tauri | Signing key password |
| `MAC_CERT` | Apple | macOS code signing |
| `MAC_CERT_PASSWORD` | Apple | Certificate password |
| `APPLE_SIGNING_IDENTITY` | Apple | macOS signing identity |
| `APPLE_ID` | Apple | macOS notarization |
| `APPLE_PASSWORD` | Apple | App-specific password |
| `APPLE_TEAM_ID` | Apple | Team identifier |
| `IOS_CERTIFICATE` | Apple | iOS signing cert |
| `IOS_CERTIFICATE_PASSWORD` | Apple | iOS cert password |
| `IOS_MOBILE_PROVISION` | Apple | Provisioning profile |
| `APPSTORE_ISSUER_ID` | Apple | App Store Connect |
| `APPSTORE_API_KEY_ID` | Apple | App Store Connect |
| `APPSTORE_API_PRIVATE_KEY` | Apple | App Store Connect |
| `ANDROID_RELEASE_KEYSTORE_BASE64` | Google | Android signing |
| `ANDROID_KEYSTORE_PASSWORD` | Google | Keystore password |
| `ANDROID_KEY_ALIAS` | Google | Key alias |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Google | Play Store upload |

> **Note:** Cloudflare secrets (`CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN`) and `TURNSTILE_SECRET_KEY` are server-side environment variables only, not GitHub Actions secrets.

---

## Quick Start Order

For the fastest path to a working fork:

1. **Global find/replace** project name variations
2. **Update domains** in environment files and constants
3. **Create Supabase project** and update credentials
4. **Set up Cloudflare** (optional but recommended)
5. **Configure GitHub Secrets** (start with `HEROKU_API_KEY`, `SUPABASE_*`)
6. **Test web deployment** before tackling mobile
7. **Set up mobile signing** (iOS/Android) when ready for app stores
