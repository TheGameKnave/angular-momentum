import { Type } from "@angular/core";
import { ComponentName } from "@app/helpers/component-list";
import { ArbitraryFeatureName } from "@app/constants/translations.constants";

export type ArbitraryFeatures = Record<ArbitraryFeatureName, boolean>;
export type ComponentFlags = Record<ComponentName, boolean>;

/**
 * Combined type representing all feature flags in the application.
 * Merges both arbitrary features and component-based feature flags.
 */
export type FeatureFlagResponse = ArbitraryFeatures & ComponentFlags;

/**
 * Generic API response wrapper.
 */
export interface ApiResponse {
  data: unknown; // You can replace 'any' with a more specific type if you know what it is
}

/**
 * Semantic versioning impact levels.
 * Follows semantic versioning (semver) conventions for indicating the scope of changes.
 */
export type ChangeImpact = 'patch' | 'minor' | 'major';

/**
 * Represents a dynamically loaded Angular component with metadata.
 * Used for dynamic component rendering in the application.
 *
 * @property name - Display name of the component
 * @property component - Angular component class reference
 * @property icon - Icon class name (typically PrimeIcons)
 */
export interface ComponentInstance {
  name: string,
  component: Type<unknown>,
  icon: string,
}

/**
 * Represents a single feature flag configuration.
 * Feature flags enable or disable specific application features at runtime.
 *
 * @property key - Unique identifier for the feature flag
 * @property value - Boolean indicating if the feature is enabled
 */
export interface FeatureFlag {
  key: string;
  value: boolean;
}

/**
 * Represents installer information for a specific platform.
 * Contains metadata for downloading and installing the application.
 *
 * @property name - Platform name (e.g., 'Windows', 'Mac', 'Linux')
 * @property icon - Icon class name for the platform
 * @property url - Download URL for the installer
 */
export interface Installer {
  name: string;
  icon: string;
  url: string;
}

/**
 * Represents a notification in the application's notification system.
 * Stores notification metadata and tracking information.
 *
 * For translatable notifications (e.g., from WebSocket broadcasts):
 * - titleKey/bodyKey store the translation keys for dynamic translation on display
 * - title/body store the translated text for native OS notifications
 * - params stores translation parameters (e.g., {time: '10:00 PM'})
 *
 * For non-translatable notifications (e.g., user-generated):
 * - title/body contain the final display text
 * - titleKey/bodyKey are undefined
 *
 * @property id - Unique identifier for the notification
 * @property title - Notification heading (translated text for native notifications)
 * @property body - Main notification message (translated text for native notifications)
 * @property titleKey - Optional translation key for title (for in-app display)
 * @property bodyKey - Optional translation key for body (for in-app display)
 * @property params - Optional translation parameters for parameterized messages
 * @property icon - Optional icon URL or class name
 * @property data - Optional arbitrary data associated with the notification
 * @property timestamp - When the notification was created
 * @property read - Whether the notification has been read by the user
 */
export interface Notification {
  id: string;
  title: string;
  body: string;
  titleKey?: string;
  bodyKey?: string;
  params?: Record<string, unknown>;
  icon?: string;
  data?: unknown;
  timestamp: Date;
  read: boolean;
}

/**
 * Configuration options for creating and sending notifications.
 * Based on the Web Notifications API specification.
 *
 * @property title - Notification title (translated text for display)
 * @property body - Notification message body (translated text for display)
 * @property titleKey - Original translation key for title (for re-translation on language change)
 * @property bodyKey - Original translation key for body (for re-translation on language change)
 * @property icon - URL or path to notification icon
 * @property tag - Identifier for grouping related notifications
 * @property requireInteraction - Whether notification stays visible until user interacts
 * @property silent - Whether notification should be silent (no sound/vibration)
 * @property data - Arbitrary data to associate with the notification
 * @property params - Translation parameters for parameterized messages (e.g., {time: '10:00 PM'})
 */
export interface NotificationOptions {
  title: string;
  body: string;
  titleKey?: string;
  bodyKey?: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  data?: unknown;
  params?: Record<string, unknown>;
}

/**
 * GraphQL mutation response for sending notifications.
 * Represents the structure returned by the sendNotification mutation.
 *
 * @property data - GraphQL response wrapper
 * @property data.sendNotification - Mutation result
 * @property data.sendNotification.success - Whether the notification was sent successfully
 * @property data.sendNotification.message - Response message (success or error details)
 */
export interface SendNotificationResponse {
  data: {
    sendNotification: {
      success: boolean;
      message: string;
    };
  };
}

/**
 * Template for predefined notification messages.
 * Includes both translation keys (for server-side broadcasts) and
 * translated text (for client-side display and local notifications).
 *
 * @property titleKey - i18n translation key for the title (used by server)
 * @property bodyKey - i18n translation key for the body (used by server)
 * @property title - Localized title text ready for display
 * @property body - Localized body text ready for display
 * @property icon - Icon class name or URL
 * @property label - Category label for the notification type
 * @property severity - Visual severity level for UI styling
 * @property params - Dynamic values for parameterized messages (e.g., timestamps, usernames)
 */
export interface PredefinedNotification {
  titleKey?: string; // Translation key for title (for server broadcasts)
  bodyKey?: string; // Translation key for body (for server broadcasts)
  title: string; // Translated title (for display and local notifications)
  body: string; // Translated body (for display and local notifications)
  icon: string;
  label: string;
  severity: 'success' | 'info' | 'warn' | 'secondary';
  // Translation parameters (for parameterized messages like timestamps)
  params?: Record<string, unknown>;
}

/**
 * Permission state for Tauri notification plugin.
 * Mirrors the Web Notifications API permission states.
 *
 * - 'granted': User has granted notification permission
 * - 'denied': User has denied notification permission
 * - 'default': Permission has not been requested or determined yet
 */
export type TauriPermission = 'granted' | 'denied' | 'default';

/**
 * Configuration options for Tauri desktop notifications.
 * Used when sending native OS notifications through the Tauri framework.
 *
 * @property title - Notification title (required)
 * @property body - Notification message body
 * @property icon - Path to notification icon file
 */
export interface TauriNotificationOptions {
  title: string;
  body?: string;
  icon?: string;
}