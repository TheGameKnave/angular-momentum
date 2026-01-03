/**
 * Application version history and changelog
 * @description Array of changelog entries tracking version releases, dates, descriptions, and changes
 */
export const changeLog = [
  {
    version: "21.2.5",
    date: "2026-01-02",
    description: "Deep link routing through proxy",
    changes: [
      "Deep link routing through proxy",
    ]
  },
  {
    version: "21.2.4",
    date: "2026-01-02",
    description: "macOS signing fix",
    changes: [
      "Fix macOS code signing by removing Associated Domains entitlement from desktop builds",
      "Add Check for Updates menu item in desktop app toolbar",
    ]
  },
  {
    version: "21.2.3",
    date: "2026-01-02",
    description: "Markdown assets, OG images",
    changes: [
      "Fix .slugignore excluding markdown files from Heroku builds",
      "Fix service worker navigation fallback for asset files",
      "OG image buildpacks for production",
    ]
  },
  {
    version: "21.2.2",
    date: "2026-01-01",
    description: "iOS provisioning",
    changes: [
      "Fix iOS provisioning profile specifier (use name instead of UUID)",
      "Add Associated Domains capability for Universal Links",
    ]
  },
  {
    version: "21.2.1",
    date: "2026-01-01",
    description: "New patch",
    changes: [
      "empty change for prod incrementation",
    ]
  },
  {
    version: "21.2.0",
    date: "2026-01-01",
    description: "Deep linking, service worker fixes",
    changes: [
      "Universal Links (iOS) and App Links (Android) for mobile apps",
      "Fix service worker caching API/GraphQL/WebSocket requests",
      "Fix version indicator showing when client is ahead of server",
      "Separate ANGULAR_ENV from NODE_ENV for Heroku builds",
      "Post-deploy smoke tests",
    ]
  },
  {
    version: "21.1.4",
    date: "2025-12-28",
    description: "Update dialog, scroll, tests",
    changes: [
      "Fix update dialog showing same version twice",
      "Bottom menu scroll indicator",
      "Connectivity service improvements",
      "E2E phone screenshot isolation",
      "Service worker analytics bypass",
      "Turnstile token required in production",
    ]
  },
  {
    version: "21.1.3",
    date: "2025-12-28",
    description: "android tauri build update",
    changes: [
      "android tauri build update",
    ]
  },
  {
    version: "21.1.2",
    date: "2025-12-27",
    description: "translations/feature gate",
    changes: [
      "Translate timezones",
      "Translate notification statuses",
      "Correct feature gate behavior"
    ]
  },
  {
    version: "21.1.1",
    date: "2025-12-27",
    description: "New build",
    changes: [
      "dependencies",
    ]
  },
  {
    version: "21.1.0",
    date: "2025-12-26",
    description: "SSR, i18n, testing",
    changes: [
      "Server-side rendering (SSR) with Angular 21",
      "Turkish translation",
      "Lighthouse CI integration",
      "E2E visual regression testing with Playwright",
      "Smoke tests for deployed environments",
      "Security headers (CSP, HSTS, etc.)",
      "Menu CLS fix for smoother page loads",
    ]
  },
  {
    version: "21.0.1",
    date: "2025-12-13",
    description: "translations, user data",
    changes: [
      "en-GB and swedish chef translation",
      "promote anoonymous data to user storage on login",
    ]
  },
  {
    version: "21.0.0",
    date: "2025-12-05",
    description: "Angular 21",
    changes: [
      "ng21 upgrade",
      "zoneless change detection",
    ]
  },
  {
    version: "20.0.2",
    date: "2025-12-05",
    description: "Scrolling",
    changes: [
      "Scroll headers and footers + horizontal",
    ]
  },
  {
    version: "20.0.1",
    date: "2025-12-04",
    description: "Scroll indicators, etc.",
    changes: [
      "installer links correction",
      "no cookie consent in apps",
      "ui styling adjustments",
      "scroll indicators",
    ]
  },
  {
    version: "20.0.0",
    date: "2025-11-28",
    description: "gigantic: AUTH etc.",
    changes: [
      "Menu anchor consolidation",
      "Privacy policy center",
      "Cookie consent banner",
      "Auth system via supabase",
    ]
  },
  {
    version: "0.20.13",
    date: "2025-11-05",
    description: "Automated deploy scripts",
    changes: [
      "Deploy scripts for android and iOS"
    ]
  },
  {
    version: "0.20.12",
    date: "2025-10-30",
    description: "Deploy scripts WIP",
    changes: [
      "external installers styling update",
      "changelog service, menu, and warnings",
      "bump version script to add changelog entry",
      "semver github tagging"
    ]
  },
  {
    version: "0.20.11",
    date: "2025-10-13",
    description: "Versioning UX",
    changes: [
      "App version > changeLog menu",
      "i18n validation (ICU in addition to existing AJV schema)",
      "Menu scrolling",
      "Nav scrolling fix",
      "Installer distro button/link list",
      "Noto Color emoji font for l10n flag display (mostly on Windows)",
      "privacy.md file for linking through repository"
    ]
  },
  {
    version: "0.20.10",
    date: "2025-10-07",
    description: "Versioning for app discovery",
    changes: [
      "Version bump for app discovery testing"
    ]
  },
  {
    version: "0.20.9",
    date: "2025-10-05",
    description: "Divergent app icon",
    changes: [
      "App icon fix for android"
    ]
  },
  {
    version: "0.20.8",
    date: "2025-10-04",
    description: "Platform behavior",
    changes: [
      "iOs styling quirks (header padding)",
      "cross-platform menu/footer behavior",
      "mobile small screen behavior"
    ]
  },
  {
    version: "0.20.7",
    date: "2025-10-03",
    description: "iOS and connectivity",
    changes: [
      "iOS builds",
      "Connectivity service"
    ]
  },
  {
    version: "0.20.6",
    date: "2025-10-02",
    description: "Cleaning up Tauri builds",
    changes: [
      "86 CDN for local assets",
      "move away from cookies in favor of local storage"
    ]
  },
  {
    version: "0.20.5",
    date: "2025-09-29",
    description: "more installers work",
    changes: [
      "disentangle iOS and MAcOS build patterns",
      "update readme, fix remote names"
    ]
  },
  {
    version: "0.20.4",
    date: "2025-09-28",
    description: "Versioning for app discovery",
    changes: [
      "Version bump for app discovery testing"
    ]
  },
  {
    version: "0.20.3",
    date: "2025-09-29",
    description: "Maintenance",
    changes: [
      "Tauri signing fixes",
      "adjust logging"
    ]
  },
  {
    version: "0.20.2",
    date: "2025-09-27",
    description: "PrimeNG + build fixes",
    changes: [
      "Cargo Tauri plugin updater",
      "mobile scrolling dock",
      "primeNG initial implementation",
      "styling for feature list, indexedDB components"
    ]
  },
  {
    version: "0.20.1",
    date: "2025-08-01",
    description: "CDN + feature flag gating",
    changes: [
      "host assets on CDN",
      "some feature flag gating"
    ]
  },
  {
    version: "0.20.0",
    date: "2025-07-27",
    description: "Angular 20",
    changes: [
      "Angular 20"
    ]
  },
]