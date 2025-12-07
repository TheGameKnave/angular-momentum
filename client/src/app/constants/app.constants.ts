// Re-export language constants from shared source of truth
export { SUPPORTED_LANGUAGES, SupportedLanguage } from '@shared/languages';

/**
 * Application metadata constants.
 * Centralized configuration for branding and legal information.
 */
export const APP_METADATA = {
  /** Company/organization name for legal documents */
  companyName: 'GameKnave Design',
  /** Privacy policy last updated date (ISO format for localization) */
  privacyUpdatedDate: '2025-10-05',
  /** Support email address */
  supportEmail: 'admin@gameknave.com',
} as const;

/**
 * Platform-specific installer configurations for Angular Momentum.
 * Each entry contains platform information, icon class, and download URL.
 * URLs may contain {version} placeholder for dynamic version replacement.
 *
 * Structure:
 * - name: Platform name (iOS, Android, Windows, Mac, Linux)
 * - icon: PrimeIcons CSS class for the platform icon
 * - url: Direct download URL or app store link
 */
export const INSTALLERS: Record<'name' | 'icon' | 'url', string>[] = [
  {
    name: 'iOS',
    icon: 'pi-mobile',
    url: 'https://apps.apple.com/us/app/angular-momentum/id6753187258',
  },
  {
    name: 'Android',
    icon: 'pi-android',
    url: 'https://play.google.com/store/apps/details?id=app.angularmomentum',
  },
  {
    name: 'Windows',
    icon: 'pi-microsoft',
    url: 'https://github.com/TheGameKnave/angular-momentum/releases/latest/download/Angular.Momentum_{version}_x64_en-US.msi',
  },
  {
    name: 'Mac',
    icon: 'pi-apple',
    url: 'https://github.com/TheGameKnave/angular-momentum/releases/latest/download/Angular.Momentum_{version}_x64.dmg',
  },
  {
    name: 'Linux',
    icon: 'pi-desktop',
    url: 'https://github.com/TheGameKnave/angular-momentum/releases/latest/download/Angular.Momentum_{version}_amd64_AppImage',
  },
];

/**
 * Platform detection patterns using regular expressions.
 * Used to identify the user's operating system from the user agent string.
 * Patterns are matched case-insensitively against the navigator.userAgent.
 *
 * IMPORTANT: Order matters! More specific patterns must come before general ones.
 * iOS/Android must be checked before Mac/Linux because mobile user agents often
 * contain desktop OS names (e.g., iPhone says "like Mac OS X").
 *
 * @property platform - Human-readable platform name
 * @property regex - Regular expression pattern to match in user agent string
 */
export const PLATFORMS: { platform: string; regex: RegExp }[] = [
  { platform: 'iOS',     regex: /iPhone|iPad|iPod/i },
  { platform: 'Android', regex: /Android/i },
  { platform: 'Windows', regex: /Windows/i },
  { platform: 'Mac',     regex: /Mac/i },
  { platform: 'Linux',   regex: /Linux/i },
];