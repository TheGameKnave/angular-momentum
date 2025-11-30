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

/**
 * Error message translation keys from AuthService.
 * These are set as error.message and translated via translate(result.error.message).
 */
export const AUTH_ERROR_KEYS = [
  'error.Authentication service not initialized',
  'error.Login failed',
  'error.Invalid credentials',
  'error.Invalid username format',
  'error.Sign up failed',
  'error.Verification failed',
  'error.Failed to resend verification code',
  'error.Password reset failed',
  'error.Password update failed',
  'error.Email update failed',
  'error.Not authenticated',
  'error.Failed to export data',
  'error.Failed to delete account',
  'error.Failed to update username',
  'error.Failed to delete username',
  'error.Current password is incorrect',
  'error.Username is required',
  'error.Username not available',
] as const;

/**
 * Semver message translation key mappings.
 * Used in menu-change-log.component.ts for version difference messages.
 * Maps ChangeImpact type to translation key and ICU variable name.
 */
export const SEMVER_MESSAGE_MAP = {
  patch: { key: 'menu.patch(es)', var: 'patches' },
  minor: { key: 'menu.minor version(s)', var: 'minors' },
  major: { key: 'menu.major version(s)', var: 'majors' },
} as const;

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
  FEATURES: 'Features',
  GRAPHQL_API: 'GraphQL API',
  INDEXEDDB: 'IndexedDB',
  INSTALLERS: 'Installers',
  NOTIFICATIONS: 'Notifications',
} as const;

/**
 * Helper to get the nav-namespaced translation key for a component name.
 */
export function getNavTranslationKey(componentName: string): string {
  return `nav.${componentName}`;
}

/**
 * Component name translation keys (namespaced) for validation.
 * These are the actual keys in translation files (nav.Features, etc.)
 */
export const COMPONENT_NAME_KEYS = Object.values(COMPONENT_NAMES).map(name => `nav.${name}`);

/**
 * Notification message translation keys.
 * Source of truth for notification messages used in NotificationMessages.
 */
export const NOTIFICATION_MESSAGES = {
  // Welcome notification
  WELCOME_TITLE: 'notification.Welcome!',
  WELCOME_BODY: 'notification.Thanks for trying Angular Momentum—your modern Angular starter kit!',
  WELCOME_LABEL: 'notification.Welcome Message',

  // Feature update notification
  FEATURE_UPDATE_TITLE: 'notification.New Feature Available',
  FEATURE_UPDATE_BODY: 'notification.Check out the latest updates in the Features section!',
  FEATURE_UPDATE_LABEL: 'notification.Feature Update',

  // System maintenance notification
  MAINTENANCE_TITLE: 'notification.System Maintenance',
  MAINTENANCE_BODY: 'notification.Scheduled maintenance will occur tonight at {time}.',
  MAINTENANCE_LABEL: 'notification.Maintenance Alert',

  // Achievement notification
  ACHIEVEMENT_TITLE: 'notification.Achievement Unlocked',
  ACHIEVEMENT_BODY: 'notification.You successfully tested the notification system!',
  ACHIEVEMENT_LABEL: 'notification.Achievement',
} as const;

/**
 * Notification message keys as array for validation.
 */
export const NOTIFICATION_KEYS = Object.values(NOTIFICATION_MESSAGES);

/**
 * Change log translation keys.
 * Used in menu-change-log.component.ts for version update messages.
 */
export const CHANGE_LOG_MESSAGES = {
  APP_OUT_OF_DATE: 'menu.This app is {semver} out of date.',
  CLEAR_CACHE: "menu.If it doesn’t update momentarily, please try to clear your cache and refresh your browser.",
  USE_WEBAPP: 'menu.If you encounter problems, you can use the webapp until an app update is ready.',
} as const;

export const CHANGE_LOG_KEYS = Object.values(CHANGE_LOG_MESSAGES);

/**
 * Supabase error helper translation keys.
 * Used in supabase-error.helper.ts to map Supabase errors to user-friendly messages.
 * These support ICU message format with dynamic values like {seconds}.
 */
export const SUPABASE_ERROR_MESSAGES = {
  RATE_LIMIT: 'error.For security purposes, you can only request this after another {seconds} seconds.',
  OTP_EXPIRED: 'error.Your verification code has expired or is invalid. Please request a new one.',
  EMAIL_NOT_CONFIRMED: 'error.Please verify your email address before signing in.',
  INVALID_OTP: 'error.Invalid or expired code. Please try again.',
} as const;

export const SUPABASE_ERROR_KEYS = Object.values(SUPABASE_ERROR_MESSAGES);

/**
 * Validation requirement translation keys.
 * Used in auth forms for username/password/email validation hints.
 */
export const VALIDATION_KEYS = [
  'validation.3–30 characters',
  'validation.Most Unicode characters allowed (emojis, accents, etc.)',
  'validation.Avoid profanity or hate-speech',
  'validation.8+ characters with 1 uppercase, 1 lowercase, 1 number, 1 symbol',
  'validation.OR 20+ characters (no other requirements)',
  'validation.Valid email address format',
  'validation.Example: user@example.com',
  'profile.Without a username, your profile is private',
] as const;

/**
 * Connectivity status translation keys.
 * Used in connectivity.service.ts for online/offline status messages.
 */
export const CONNECTIVITY_KEYS = [
  'connectivity.You are currently offline',
] as const;

/**
 * Environment display translation keys.
 * Used in app.component.ts for environment badge display.
 */
export const ENVIRONMENT_KEYS = [
  'menu.{environmentName} environment',
  'menu.Development',
  'menu.Production',
] as const;

/**
 * Relative time formatting translation keys.
 * Used in notification-center for time display.
 */
export const TIME_KEYS = [
  'time.{count}d ago',
  'time.{count}h ago',
  'time.{count}m ago',
  'time.Just now',
] as const;

/**
 * Accessibility (a11y) translation keys.
 * Used for screen readers and accessibility labels.
 */
export const A11Y_KEYS = [
  'a11y.{name} Logo',
  'a11y.unread',
  'a11y.Read',
  'a11y.Unread',
  'a11y.Open menu',
  'a11y.Close menu',
] as const;

/**
 * Privacy-related translation keys.
 * Used in cookie-consent.service.ts and privacy components.
 * Keys must match exactly what's in the translation JSON files.
 */
export const PRIVACY_KEYS = [
  'privacy.Privacy',
  'privacy.Privacy Policy',
  'privacy.We use cookies to improve your experience and analyze site usage.',
  'privacy.Learn more',
  'privacy.Last updated {date}',
  'privacy.This privacy notice for {companyName} describes how and why we might collect, store, use, and/or share your information when you use our services.',
  'privacy.Questions or concerns?',
  'privacy.Please contact us at',
  'privacy.Summary',
  'privacy.We collect minimal personal information (email, username, password) to provide authentication services…',
  'privacy.Complete Privacy Policy',
] as const;

/**
 * Auth template keys with special characters (apostrophes).
 * These keys contain apostrophes and need to be added as programmatic keys
 * because the regex extraction may not pick them up properly from templates.
 */
export const AUTH_TEMPLATE_KEYS = [
  'auth.We’ve sent a 6-digit verification code to:',
  'auth.Didn’t receive the code? Check your spam folder, whitelist support@angularmomentum.app, or try logging in if you already have an account.',
  'menu.If it doesn’t update momentarily, please try to clear your cache and refresh your browser.',
] as const;

/**
 * Page content keys used in templates but not detected by regex
 * (long keys, property bindings, etc.)
 */
export const PAGE_CONTENT_KEYS = [
  'page.Sends a notification only to your current browser/device. Uses the NotificationService directly.',
  'page.Sends a notification via GraphQL to the server, which broadcasts it to ALL connected clients via WebSocket.',
  'page.Tauri apps use native OS notifications. Web/PWA uses browser notifications via Service Worker.',
  'page.Unable to load API documentation. Please check your connection and try again.',
] as const;

/**
 * Profile page keys used in templates but not detected by regex
 */
export const PROFILE_PAGE_KEYS = [
  'auth.If an account with that information exists, a password reset email has been sent.',
  'profile.Permanently delete your account and all associated data. This action cannot be undone.',
  'profile.We use cookies for analytics (Google Analytics, Hotjar) to improve your experience. You can change your preference at any time.',
  'profile.A verification link will be sent to your new email address. You must click the link to complete the change.',
  'profile.Verification email sent! Please check your new email address and click the confirmation link.',
] as const;

/**
 * All programmatically-used translation keys combined.
 * Used by translation-key-usage.ts to validate these keys exist in translation files.
 */
export const ALL_PROGRAMMATIC_KEYS = [
  ...AUTH_ERROR_KEYS,
  ...SEMVER_KEYS,
  ...COMPONENT_NAME_KEYS,
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
  ...PAGE_CONTENT_KEYS,
  ...PROFILE_PAGE_KEYS,
] as const;

export type AuthErrorKey = typeof AUTH_ERROR_KEYS[number];
export type SemverKey = typeof SEMVER_KEYS[number];
export type ComponentNameKey = typeof COMPONENT_NAME_KEYS[number];
