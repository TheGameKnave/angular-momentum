/**
 * Type declarations for the Tauri notification plugin.
 * Provides TypeScript support for the @tauri-apps/plugin-notification package.
 *
 * This module enables native desktop notifications in Tauri applications,
 * integrating with the operating system's notification system.
 *
 * @see {@link https://github.com/tauri-apps/plugins-workspace/tree/v2/plugins/notification}
 */
declare module '@tauri-apps/plugin-notification' {
  /**
   * Configuration options for displaying a Tauri notification.
   * Defines the content and appearance of native OS notifications.
   *
   * @property title - The notification heading (required)
   * @property body - The main notification message content
   * @property icon - Path to the notification icon file (relative to Tauri's public directory)
   */
  export interface TauriNotificationOptions {
    title: string;
    body?: string;
    icon?: string;
  }

  /**
   * Permission state for displaying notifications.
   * Follows the Web Notifications API permission model.
   *
   * - 'granted': The user has explicitly granted permission for notifications
   * - 'denied': The user has explicitly denied permission for notifications
   * - 'default': Permission has not been requested yet (treated as denied)
   */
  export type Permission = 'granted' | 'denied' | 'default';

  /**
   * Sends a native OS notification through Tauri.
   * Can accept either a configuration object or a simple string message.
   *
   * @param options - Notification configuration object or simple string message
   * @returns Promise that resolves when the notification is sent
   * @throws Error if notification permission is denied
   *
   * @example
   * // Send with full options
   * await sendNotification({
   *   title: 'Hello',
   *   body: 'World',
   *   icon: 'icon.png'
   * });
   *
   * @example
   * // Send simple message
   * await sendNotification('Hello World');
   */
  export function sendNotification(options: TauriNotificationOptions | string): Promise<void>;

  /**
   * Checks if notification permission has been granted.
   * Does not trigger a permission request if permission is undetermined.
   *
   * @returns Promise resolving to true if permission is granted, false otherwise
   *
   * @example
   * const hasPermission = await isPermissionGranted();
   * if (!hasPermission) {
   *   await requestPermission();
   * }
   */
  export function isPermissionGranted(): Promise<boolean>;

  /**
   * Requests notification permission from the user.
   * Displays the OS permission dialog if permission hasn't been determined.
   *
   * @returns Promise resolving to the permission state after the request
   *
   * @example
   * const permission = await requestPermission();
   * if (permission === 'granted') {
   *   await sendNotification('Permission granted!');
   * }
   */
  export function requestPermission(): Promise<Permission>;
}
