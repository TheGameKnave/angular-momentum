/**
 * Translation key constants for programmatically-used translations.
 * These keys are used dynamically in code (not in templates) and need
 * special handling for static analysis validation.
 *
 * Categories:
 * - AUTH_ERROR_KEYS: Error messages returned from AuthService
 * - SEMVER_KEYS: Version difference message keys
 * - COMPONENT_NAME_KEYS: Component names from COMPONENT_LIST
 *
 * @see translation-key-usage.ts for validation logic
 */

// ============================================================================
// Type definitions for constant structures
// ============================================================================

/** Structure for semver message mappings */
interface SemverMessageEntry {
  readonly key: string;
  readonly var: string;
}

/** Structure for translation key-value constants */
type TranslationKeyRecord = Record<string, string>;

// ============================================================================
// Constants
// ============================================================================

/**
 * Error message translation keys from AuthService.
 * These are set as error.message and translated via translate(result.error.message).
 */
export const AUTH_ERROR_KEYS = [
  "error.Authentication service not initialized",
  "error.Login failed",
  "error.Invalid credentials",
  "error.Invalid username format",
  "error.Sign up failed",
  "error.Verification failed",
  "error.Failed to resend verification code",
  "error.Password reset failed",
  "error.Password update failed",
  "error.Email update failed",
  "error.Not authenticated",
  "error.Failed to export data",
  "error.Failed to delete account",
  "error.Failed to update username",
  "error.Failed to delete username",
  "error.Current password is incorrect",
  "error.Username is required",
  "error.Username not available",
] as const;

/**
 * Semver message translation key mappings.
 * Used in menu-change-log.component.ts for version difference messages.
 * Maps ChangeImpact type to translation key and ICU variable name.
 */
export const SEMVER_MESSAGE_MAP = {
  patch: { key: "menu.patch(es)", var: "patches" },
  minor: { key: "menu.minor version(s)", var: "minors" },
  major: { key: "menu.major version(s)", var: "majors" },
} as const satisfies Record<string, SemverMessageEntry>;

/**
 * Semver message translation keys (derived from SEMVER_MESSAGE_MAP for validation).
 */
export const SEMVER_KEYS = Object.values(SEMVER_MESSAGE_MAP).map(v => v.key);

/**
 * Component name keys (non-namespaced).
 * Used for feature flags and component identification.
 * For translation, use getNavTranslationKey() helper.
 */
export const COMPONENT_NAMES = {
  FEATURES: "Features",
  GRAPHQL_API: "GraphQL API",
  INDEXEDDB: "IndexedDB",
  INSTALLERS: "Installers",
  NOTIFICATIONS: "Notifications",
} as const satisfies TranslationKeyRecord;

/**
 * Arbitrary feature names (non-component features).
 * Single source of truth - ArbitraryFeatureName type is derived from this.
 */
export const ARBITRARY_FEATURE_NAMES = [
  "App Version",
  "Environment",
  "Language",
] as const;

/**
 * Type for arbitrary feature names, derived from ARBITRARY_FEATURE_NAMES.
 */
export type ArbitraryFeatureName = typeof ARBITRARY_FEATURE_NAMES[number];

/**
 * Helper to get the nav-namespaced translation key for a component name.
 */
export function getNavTranslationKey(componentName: string): string {
  return `nav.${componentName}`;
}

/**
 * Helper to get the feature-namespaced translation key for a feature flag.
 */
export function getFeatureTranslationKey(featureName: string): string {
  return `feature.${featureName}`;
}

/**
 * Component name translation keys (namespaced) for validation.
 * These are the actual keys in translation files (nav.Features, etc.)
 */
export const COMPONENT_NAME_KEYS = Object.values(COMPONENT_NAMES).map(name => `nav.${name}`);

/**
 * Feature flag translation keys (namespaced) for validation.
 * Includes both component features and arbitrary features.
 */
export const FEATURE_FLAG_KEYS = [
  ...Object.values(COMPONENT_NAMES).map(name => `feature.${name}`),
  ...ARBITRARY_FEATURE_NAMES.map(name => `feature.${name}`),
];

/**
 * Server-side notification IDs.
 * These map to notification definitions in server/data/notifications.ts.
 * Server sends all language variants; client picks the correct one.
 */
export const NOTIFICATION_IDS = {
  WELCOME: 'welcome',
  FEATURE_UPDATE: 'feature_update',
  MAINTENANCE: 'maintenance',
  ACHIEVEMENT: 'achievement',
} as const;

export type NotificationId = typeof NOTIFICATION_IDS[keyof typeof NOTIFICATION_IDS];

/** Structure for notification key mappings */
interface NotificationKeyEntry {
  readonly titleKey: string;
  readonly bodyKey: string;
  readonly labelKey: string;
  readonly severity: 'success' | 'info' | 'warn' | 'secondary';
}

/**
 * Maps notification IDs to their i18n keys and UI metadata.
 * Used for both local notifications (client-side display) and UI rendering.
 * Server notifications only need the ID; client uses this map for display.
 */
export const NOTIFICATION_KEY_MAP: Record<NotificationId, NotificationKeyEntry> = {
  welcome: {
    titleKey: "notification.Welcome!",
    bodyKey: "notification.Thanks for trying Angular Momentum—your modern Angular starter kit!",
    labelKey: "notification.Welcome Message",
    severity: 'success',
  },
  feature_update: {
    titleKey: "notification.New Feature Available",
    bodyKey: "notification.Check out the latest updates in the Features section!",
    labelKey: "notification.Feature Update",
    severity: 'info',
  },
  maintenance: {
    titleKey: "notification.System Maintenance",
    bodyKey: "notification.Scheduled maintenance will occur tonight at {time}.",
    labelKey: "notification.Maintenance Alert",
    severity: 'warn',
  },
  achievement: {
    titleKey: "notification.Achievement Unlocked",
    bodyKey: "notification.You successfully tested the notification system!",
    labelKey: "notification.Achievement",
    severity: 'secondary',
  },
} as const;

/**
 * Notification message translation keys (derived from NOTIFICATION_KEY_MAP).
 * @deprecated Use NOTIFICATION_KEY_MAP directly for cleaner access.
 */
export const NOTIFICATION_MESSAGES = {
  WELCOME_TITLE: NOTIFICATION_KEY_MAP.welcome.titleKey,
  WELCOME_BODY: NOTIFICATION_KEY_MAP.welcome.bodyKey,
  WELCOME_LABEL: NOTIFICATION_KEY_MAP.welcome.labelKey,
  FEATURE_UPDATE_TITLE: NOTIFICATION_KEY_MAP.feature_update.titleKey,
  FEATURE_UPDATE_BODY: NOTIFICATION_KEY_MAP.feature_update.bodyKey,
  FEATURE_UPDATE_LABEL: NOTIFICATION_KEY_MAP.feature_update.labelKey,
  MAINTENANCE_TITLE: NOTIFICATION_KEY_MAP.maintenance.titleKey,
  MAINTENANCE_BODY: NOTIFICATION_KEY_MAP.maintenance.bodyKey,
  MAINTENANCE_LABEL: NOTIFICATION_KEY_MAP.maintenance.labelKey,
  ACHIEVEMENT_TITLE: NOTIFICATION_KEY_MAP.achievement.titleKey,
  ACHIEVEMENT_BODY: NOTIFICATION_KEY_MAP.achievement.bodyKey,
  ACHIEVEMENT_LABEL: NOTIFICATION_KEY_MAP.achievement.labelKey,
} as const;

/**
 * Notification message keys as array for validation.
 * Derived from NOTIFICATION_KEY_MAP to avoid using deprecated NOTIFICATION_MESSAGES.
 */
export const NOTIFICATION_KEYS = Object.values(NOTIFICATION_KEY_MAP).flatMap(
  entry => [entry.titleKey, entry.bodyKey, entry.labelKey]
);

/**
 * Change log translation keys.
 * Used in menu-change-log.component.ts for version update messages.
 */
export const CHANGE_LOG_MESSAGES = {
  APP_OUT_OF_DATE: "menu.This app is {semver} out of date.",
  CLEAR_CACHE: "menu.If it doesn’t update momentarily, please try to clear your cache and refresh your browser.",
  USE_WEBAPP_BEFORE: "menu.If you encounter problems, use the web version at",
  USE_WEBAPP_AFTER: "menu.until an app update is ready.",
} as const satisfies TranslationKeyRecord;

export const CHANGE_LOG_KEYS = Object.values(CHANGE_LOG_MESSAGES);

/**
 * Supabase error helper translation keys.
 * Used in supabase-error.helper.ts to map Supabase errors to user-friendly messages.
 * These support ICU message format with dynamic values like {seconds}.
 */
export const SUPABASE_ERROR_MESSAGES = {
  RATE_LIMIT: "error.For security purposes, you can only request this after another {seconds} seconds.",
  OTP_EXPIRED: "error.Your verification code has expired or is invalid. Please request a new one.",
  EMAIL_NOT_CONFIRMED: "error.Please verify your email address before signing in.",
  INVALID_OTP: "error.Invalid or expired code. Please try again.",
} as const satisfies TranslationKeyRecord;

export const SUPABASE_ERROR_KEYS = Object.values(SUPABASE_ERROR_MESSAGES);

/**
 * Validation requirement translation keys.
 * Used in auth forms for username/password/email validation hints.
 */
export const VALIDATION_KEYS = [
  "validation.3–30 characters",
  "validation.Most Unicode characters allowed (emojis, accents, etc.)",
  "validation.Avoid profanity or hate-speech",
  "validation.8+ characters with 1 uppercase, 1 lowercase, 1 number, 1 symbol",
  "validation.OR 20+ characters (no other requirements)",
  "validation.Valid email address format",
  "validation.Example: user@example.com",
  "profile.Without a username, your profile is private",
] as const;

/**
 * Connectivity status translation keys.
 * Used in connectivity.service.ts for online/offline status messages.
 */
export const CONNECTIVITY_KEYS = [
  "connectivity.You are currently offline",
] as const;

/**
 * Environment display translation keys.
 * Used in app.component.ts for environment badge display.
 */
export const ENVIRONMENT_KEYS = [
  "menu.{environmentName} environment",
  "menu.Development",
  "menu.Production",
] as const;

/**
 * Relative time formatting translation keys.
 * Used by RelativeTimePipe for time display (past and future).
 */
export const TIME_KEYS = [
  // Past times
  "time.years ago",
  "time.months ago",
  "time.weeks ago",
  "time.days ago",
  "time.hours ago",
  "time.minutes ago",
  "time.Just now",
  // Future times
  "time.in years",
  "time.in months",
  "time.in weeks",
  "time.in days",
  "time.in hours",
  "time.in minutes",
  "time.Momentarily",
] as const;

/**
 * Accessibility (a11y) translation keys.
 * Used for screen readers and accessibility labels.
 */
export const A11Y_KEYS = [
  "a11y.{name} Logo",
  "a11y.unread",
  "a11y.Read",
  "a11y.Unread",
  "a11y.Open menu",
  "a11y.Close menu",
] as const;

/**
 * Privacy-related translation keys.
 * Used in cookie-consent.service.ts and privacy components.
 * Keys must match exactly what"s in the translation JSON files.
 */
export const PRIVACY_KEYS = [
  "privacy.Privacy",
  "privacy.Privacy Policy",
  "privacy.We use cookies to improve your experience and analyze site usage.",
  "privacy.Learn more",
  "privacy.Last updated {date}",
  "privacy.This privacy notice for {companyName} describes how and why we might collect, store, use, and/or share your information when you use our services.",
  "privacy.Questions or concerns?",
  "privacy.Please contact us at",
  "privacy.Summary",
  "privacy.We collect minimal personal information (email, username, password) to provide authentication services…",
  "privacy.Complete Privacy Policy",
] as const;

/**
 * Auth template keys with special characters (apostrophes).
 * These keys contain apostrophes and need to be added as programmatic keys
 * because the regex extraction may not pick them up properly from templates.
 */
export const AUTH_TEMPLATE_KEYS = [
  "auth.Bot check failed. This may be due to network issues or security restrictions. Please reload the page…",
  "auth.If this persists,",
  "auth.contact support",
  "auth.for help.",
] as const;

/**
 * Storage import dialog keys.
 * Used in menu-auth.component.ts when prompting to import anonymous data on login.
 */
export const STORAGE_IMPORT_KEYS = [
  "auth.Import Local Data",
  "auth.This device has saved data from before you logged in. Would you like to import it? (existing data won’t be overwritten)",
  "auth.Import",
  "auth.Skip",
] as const;

/**
 * Data migration keys.
 * Used in data-migration.service.ts for migration status messages.
 */
export const MIGRATION_KEYS = [
  "migration.Your data has been updated to a new format.",
] as const;

/**
 * Page content keys used in templates but not detected by regex
 * (long keys, property bindings, etc.)
 */
export const PAGE_CONTENT_KEYS = [
  "page.Sends a notification only to your current browser/device. Uses the NotificationService directly.",
  "page.Sends a notification via GraphQL to the server, which broadcasts it to ALL connected clients via WebSocket.",
  "page.Tauri apps use native OS notifications. Web/PWA uses browser notifications via Service Worker.",
  "page.Unable to load API documentation. Please check your connection and try again.",
] as const;

/**
 * Profile page keys used in templates but not detected by regex
 */
export const PROFILE_PAGE_KEYS = [
  "auth.If an account with that information exists, a password reset email has been sent.",
  "profile.Permanently delete your account and all associated data. This action cannot be undone.",
  "profile.Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.",
  "privacy.We use cookies for analytics (Google Analytics, Hotjar) to improve your experience. You can change your preference at any time.",
  "profile.A verification link will be sent to your new email address. You must click the link to complete the change.",
  "profile.Verification email sent! Please check your new email address and click the confirmation link.",
] as const;

/**
 * Dialog default label translation keys.
 * Used as fallbacks in DialogConfirmComponent when options don't specify labels.
 */
export const DIALOG_DEFAULT_LABELS = {
  OK: 'OK',
  CANCEL: 'Cancel',
} as const;

export const DIALOG_LABEL_KEYS = Object.values(DIALOG_DEFAULT_LABELS);

/**
 * All programmatically-used translation keys combined.
 * Used by translation-key-usage.ts to validate these keys exist in translation files.
 */
export const ALL_PROGRAMMATIC_KEYS = [
  ...AUTH_ERROR_KEYS,
  ...SEMVER_KEYS,
  ...COMPONENT_NAME_KEYS,
  ...FEATURE_FLAG_KEYS,
  ...NOTIFICATION_KEYS,
  ...CHANGE_LOG_KEYS,
  ...SUPABASE_ERROR_KEYS,
  ...VALIDATION_KEYS,
  ...CONNECTIVITY_KEYS,
  ...ENVIRONMENT_KEYS,
  ...TIME_KEYS,
  ...A11Y_KEYS,
  ...PRIVACY_KEYS,
  ...AUTH_TEMPLATE_KEYS,
  ...STORAGE_IMPORT_KEYS,
  ...MIGRATION_KEYS,
  ...PAGE_CONTENT_KEYS,
  ...PROFILE_PAGE_KEYS,
  ...DIALOG_LABEL_KEYS,
] as const;

export type AuthErrorKey = typeof AUTH_ERROR_KEYS[number];
export type SemverKey = typeof SEMVER_KEYS[number];
export type ComponentNameKey = typeof COMPONENT_NAME_KEYS[number];
