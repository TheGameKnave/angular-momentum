import { Type } from "@angular/core";
import { ComponentName } from "@app/helpers/component-list";
import { ArbitraryFeatureName } from "@app/constants/translations.constants";
// Import for local use
import type { LocalizedStrings } from "@shared/languages";
// Re-export for consumers (direct export...from satisfies linter)
export type { LocalizedStrings } from "@shared/languages";

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
 * Represents an entry in the COMPONENT_LIST registry.
 * Defines the structure for navigable page components with their metadata.
 *
 * @property name - Display name (used in UI, routing, and as translation key)
 * @property component - Angular component class reference
 * @property icon - PrimeIcons CSS class for the component's icon
 * @property route - Optional custom route path (defaults to slugified name)
 * @property featureFlagged - If true, visibility is controlled by feature flags (fail-closed)
 */
export interface ComponentListEntry {
  readonly name: string;
  readonly route?: string;
  readonly component: Type<unknown>;
  readonly icon: string;
  readonly featureFlagged?: boolean;
}

/**
 * @deprecated Use ComponentListEntry instead
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
 * For server-sent localized notifications:
 * - localizedTitle/localizedBody store all language variants
 * - title/body store the initially translated text for native OS notifications
 * - On display, current locale is picked from localizedTitle/localizedBody
 *
 * For key-based notifications (legacy):
 * - titleKey/bodyKey store the translation keys for dynamic translation on display
 * - title/body store the translated text for native OS notifications
 * - params stores translation parameters (e.g., {time: '10:00 PM'})
 *
 * For non-translatable notifications (e.g., user-generated):
 * - title/body contain the final display text
 * - titleKey/bodyKey and localizedTitle/localizedBody are undefined
 *
 * @property id - Unique identifier for the notification
 * @property title - Notification heading (translated text for native notifications)
 * @property body - Main notification message (translated text for native notifications)
 * @property titleKey - Optional translation key for title (legacy key-based translations)
 * @property bodyKey - Optional translation key for body (legacy key-based translations)
 * @property localizedTitle - Optional all-language title variants (server-sent notifications)
 * @property localizedBody - Optional all-language body variants (server-sent notifications)
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
  localizedTitle?: LocalizedStrings;
  localizedBody?: LocalizedStrings;
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
 * @property titleKey - Original translation key for title (legacy key-based translations)
 * @property bodyKey - Original translation key for body (legacy key-based translations)
 * @property localizedTitle - All-language title variants (server-sent notifications)
 * @property localizedBody - All-language body variants (server-sent notifications)
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
  localizedTitle?: LocalizedStrings;
  localizedBody?: LocalizedStrings;
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
 * Minimal notification reference for server-side localized notifications.
 * All display content is derived from NOTIFICATION_KEY_MAP using the ID.
 *
 * @property id - Server-side notification ID (maps to server/data/notifications.ts)
 * @property params - Optional dynamic values for parameterized messages (e.g., {time})
 */
export interface PredefinedNotification {
  id: string;
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

// LocalizedStrings is re-exported from @shared/languages at top of file

/**
 * Server-sent notification payload with all language variants.
 * Client picks the correct language based on active locale.
 *
 * @property title - Localized title strings for all languages
 * @property body - Localized body strings for all languages
 * @property label - Localized label strings for all languages
 * @property params - Optional ICU MessageFormat parameters (e.g., {time})
 * @property icon - Optional icon class (e.g., 'pi pi-sparkles')
 * @property tag - Optional tag to group or replace notifications
 */
export interface LocalizedNotificationPayload {
  title: LocalizedStrings;
  body: LocalizedStrings;
  label: LocalizedStrings;
  params?: Record<string, unknown>;
  icon?: string;
  tag?: string;
}

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