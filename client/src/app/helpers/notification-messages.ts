/**
 * Notification message translation keys and default text values.
 * These constants define the available notification templates used throughout the application.
 *
 * In production applications, these keys should ideally be sent from the server
 * rather than hardcoded client-side, allowing the server to broadcast notification
 * keys that each client can translate to their selected language.
 *
 * Message groups:
 * - Welcome: Initial greeting notification for new users
 * - Feature Update: Alerts about new features or updates
 * - Maintenance: System maintenance and downtime notifications
 * - Achievement: Success and milestone notifications
 *
 * Each notification group contains:
 * - TITLE: The notification heading
 * - BODY: The main message content (may contain {param} placeholders)
 * - LABEL: Category label for the notification type
 *
 * @readonly
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

/**
 * Type-safe union of all notification message values.
 * Represents any valid notification message string from the NotificationMessages constant.
 * Use this type to ensure type safety when working with notification message content.
 */
export type NotificationMessageKey = typeof NotificationMessages[keyof typeof NotificationMessages];
