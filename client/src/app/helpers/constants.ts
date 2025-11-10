/**
 * List of supported language codes for internationalization.
 * These codes correspond to available translation files in the i18n system.
 */
export const SUPPORTED_LANGUAGES: string[] = [
  'en', // English
  'de', // German
  'fr', // French
  'es', // Spanish
  'zh-CN', // Chinese (Simplified)
  'zh-TW', // Chinese (Traditional)
];

/**
 * Bootstrap-style responsive breakpoints in pixels.
 * These values define the minimum viewport width for each screen size category.
 * Used for responsive design and layout adjustments.
 *
 * @property sm - Small screens (576px and up)
 * @property md - Medium screens (768px and up)
 * @property lg - Large screens (992px and up)
 * @property xl - Extra large screens (1200px and up)
 */
export const SCREEN_SIZES: Record<'sm' | 'md' | 'lg' | 'xl', number> = {
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
};

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
    url: 'https://github.com/TheGameKnave/angular-momentum/releases/latest/download/Angular.Momentum_{version}_x64_en-US_windows.msi',
  },
  {
    name: 'Mac',
    icon: 'pi-apple',
    url: 'https://github.com/TheGameKnave/angular-momentum/releases/latest/download/Angular.Momentum_{version}_x64_darwin.dmg',
  },
  {
    name: 'Linux',
    icon: 'pi-desktop',
    url: 'https://github.com/TheGameKnave/angular-momentum/releases/latest/download/Angular.Momentum_{version}_amd64_linux.AppImage',
  },
];

/**
 * Platform detection patterns using regular expressions.
 * Used to identify the user's operating system from the user agent string.
 * Patterns are matched case-insensitively against the navigator.userAgent.
 *
 * @property platform - Human-readable platform name
 * @property regex - Regular expression pattern to match in user agent string
 */
export const PLATFORMS: { platform: string; regex: RegExp }[] = [
  { platform: 'Windows', regex: /Windows/i },
  { platform: 'Mac',     regex: /Mac/i },
  { platform: 'Linux',   regex: /Linux/i },
  { platform: 'Android', regex: /Android/i },
  { platform: 'iOS',     regex: /iOS/i },
];