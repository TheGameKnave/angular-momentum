/**
 * Notification message translation keys
 * These keys map to entries in the i18n translation files
 *
 * Note: In production apps, this should live on the server so that
 * the server sends translation keys (not translated text) to clients,
 * allowing each client to display notifications in their selected language.
 */

export const NotificationMessages = {
  // Welcome notification
  WELCOME_TITLE: 'Welcome!',
  WELCOME_BODY: 'Thanks for trying Angular Momentum - your modern Angular starter kit!',
  WELCOME_LABEL: 'Welcome Message',

  // Feature update notification
  FEATURE_UPDATE_TITLE: 'New Feature Available',
  FEATURE_UPDATE_BODY: 'Check out the latest updates in the Features section!',
  FEATURE_UPDATE_LABEL: 'Feature Update',

  // System maintenance notification
  MAINTENANCE_TITLE: 'System Maintenance',
  MAINTENANCE_BODY: 'Scheduled maintenance will occur tonight at {time}.',
  MAINTENANCE_LABEL: 'Maintenance Alert',

  // Achievement notification
  ACHIEVEMENT_TITLE: 'Achievement Unlocked',
  ACHIEVEMENT_BODY: 'You successfully tested the notification system!',
  ACHIEVEMENT_LABEL: 'Achievement',
} as const;

export type NotificationMessageKey = typeof NotificationMessages[keyof typeof NotificationMessages];
