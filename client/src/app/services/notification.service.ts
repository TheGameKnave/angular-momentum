import { DestroyRef, Injectable, signal, inject } from '@angular/core';
import { sendNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';
import { TranslocoService } from '@jsverse/transloco';
import { LogService } from './log.service';
import { SocketIoService } from './socket.io.service';
import { UserSettingsService } from './user-settings.service';
import { UserStorageService } from './user-storage.service';
import { Notification, NotificationOptions, LocalizedNotificationPayload } from '../models/data.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NOTIFICATION_CONFIG } from '@app/constants/service.constants';

/** Base key for notification storage (will be prefixed with user scope) */
const NOTIFICATIONS_STORAGE_KEY = 'app_notifications';

/**
 * Service for managing notifications across web and Tauri platforms.
 *
 * Handles notification permissions, display, and history management.
 * Supports both browser notifications (using Web Notification API and Service Worker)
 * and native notifications (using Tauri plugin).
 *
 * Features:
 * - Cross-platform notification support (Web, PWA, Tauri)
 * - WebSocket-based notification delivery from server
 * - Automatic translation of notification content
 * - Notification history with read/unread tracking
 * - LocalStorage persistence for notification history
 * - Permission management for both web and native platforms
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly logService = inject(LogService);
  private readonly socketService = inject(SocketIoService);
  private readonly translocoService = inject(TranslocoService);
  private readonly userSettingsService = inject(UserSettingsService);
  private readonly userStorageService = inject(UserStorageService);
  private readonly destroyRef = inject(DestroyRef);

  permissionGranted = signal<boolean>(false);
  notifications = signal<Notification[]>([]);
  unreadCount = signal<number>(0);
  private readonly isTauri = '__TAURI__' in globalThis;

  constructor() {
    this.loadNotificationsFromStorage();
    this.listenForWebSocketNotifications();
    this.listenForLocalizedNotifications();
    this.initializePermissionSync();
  }

  /**
   * Initialize permission state synchronously (no async operations).
   * For Tauri, permission will be checked lazily when actually showing notifications.
   * For web platforms, checks the current Notification.permission status.
   */
  private initializePermissionSync(): void {
    if (!this.isTauri && 'Notification' in globalThis) {
      try {
        const granted = Notification.permission === 'granted';
        this.permissionGranted.set(granted);
      } catch (error) {
        // Silently fail - permission will be checked when actually needed
        this.logService.log('Error initializing notification permission', error);
      }
    }
  }

  /**
   * Listen for notifications from WebSocket.
   * The server sends translation keys, which we store for later translation.
   * We also translate immediately for native OS notifications.
   * Automatically formats timestamp parameters for the client's locale and timezone.
   */
  private listenForWebSocketNotifications(): void {
    this.socketService.listen<NotificationOptions>('notification').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (notification) => {
        this.logService.log('Received notification from WebSocket', notification);

        // Extract params from data field if present
        let params: Record<string, unknown> | undefined;
        if (notification.data && typeof notification.data === 'object') {
          const dataObj = notification.data as { params?: Record<string, unknown> };
          params = dataObj.params;

          // Format timestamp params for the client's locale and timezone
          if (typeof params?.['time'] === 'string') {
            params['time'] = this.formatTimestampWithTimezone(params['time']);
          }
        }

        // Store original keys for dynamic translation on display
        // Translate for native OS notifications (which can't translate dynamically)
        const notificationWithKeys: NotificationOptions = {
          ...notification,
          titleKey: notification.title,
          bodyKey: notification.body,
          params,
          title: this.translocoService.translate(notification.title, params || {}),
          body: this.translocoService.translate(notification.body, params || {})
        };

        this.show(notificationWithKeys);
      },
      error: (error: unknown) => {
        this.logService.log('Error receiving WebSocket notification', error);
      }
    });
  }

  /**
   * Listen for localized notifications from WebSocket.
   * Server sends all language variants; we store all of them and pick the correct one on display.
   * This allows notifications to update when the user changes language.
   * Falls back to English if the current locale is not available.
   */
  private listenForLocalizedNotifications(): void {
    this.socketService.listen<LocalizedNotificationPayload>('localized-notification').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (payload) => {
        this.logService.log('Received localized notification from WebSocket', payload);

        const locale = this.translocoService.getActiveLang();
        const title = this.getLocalizedString(payload.title, locale);
        const body = this.getLocalizedString(payload.body, locale);

        // Format timestamp params for the client's locale and timezone
        let params = payload.params;
        if (params && typeof params['time'] === 'string') {
          params = { ...params, time: this.formatTimestampWithTimezone(params['time']) };
        }

        // Apply ICU formatting for native OS notifications (which can't re-translate)
        const formattedTitle = params ? this.translocoService.translate(title, params) : title;
        const formattedBody = params ? this.translocoService.translate(body, params) : body;

        // Store all language variants so notifications update when language changes
        const notificationOptions: NotificationOptions = {
          title: formattedTitle,
          body: formattedBody,
          localizedTitle: payload.title,
          localizedBody: payload.body,
          icon: payload.icon,
          tag: payload.tag,
          params
        };

        this.show(notificationOptions);
      },
      error: (error: unknown) => {
        this.logService.log('Error receiving localized notification', error);
      }
    });
  }

  /**
   * Get the string for the current locale from a localized strings object.
   * Falls back to English if the current locale is not available.
   * @param strings - Object with language codes as keys and translations as values
   * @param locale - Current locale code
   * @returns The string for the current locale or English fallback
   */
  private getLocalizedString(strings: Record<string, string>, locale: string): string {
    return strings[locale] ?? strings['en-US'] ?? '';
  }

  /**
   * Format a timestamp string according to the user's timezone preference.
   * @param timestamp - ISO timestamp string
   * @returns Formatted timestamp in the user's preferred timezone
   */
  private formatTimestampWithTimezone(timestamp: string): string {
    const userTimezone = this.userSettingsService.settings()?.timezone ?? this.userSettingsService.detectTimezone();

    try {
      return new Date(timestamp).toLocaleString(undefined, {
        timeZone: userTimezone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      // Fallback to default formatting if timezone is invalid
      this.logService.log('Error formatting timestamp with timezone', error);
      return new Date(timestamp).toLocaleString();
    }
  }

  /**
   * Check if notifications are supported in the current environment.
   * @returns True if running in Tauri or if browser supports Notification API and Service Workers
   */
  isSupported(): boolean {
    // istanbul ignore next - Browser API feature detection
    return this.isTauri || ('Notification' in globalThis && 'serviceWorker' in navigator);
  }

  /**
   * Check current permission status.
   * Updates the permissionGranted signal with the current status.
   * @returns Promise resolving to true if notification permission is granted
   */
  async checkPermission(): Promise<boolean> {
    try {
      // istanbul ignore next - Tauri API integration testing
      if (this.isTauri) {
        const granted = await isPermissionGranted();
        this.permissionGranted.set(granted);
        return granted;
      } else if ('Notification' in globalThis) {
        const granted = Notification.permission === 'granted';
        this.permissionGranted.set(granted);
        return granted;
      }
      return false;
    } catch (error) {
      this.logService.log('Error checking notification permission', error);
      return false;
    }
  }

  /**
   * Request notification permission from the user.
   * Updates the permissionGranted signal with the result.
   * @returns Promise resolving to true if permission was granted
   */
  async requestPermission(): Promise<boolean> {
    try {
      // istanbul ignore next - Tauri API integration testing
      if (this.isTauri) {
        const permission = await requestPermission();
        const granted = permission === 'granted';
        this.permissionGranted.set(granted);
        this.logService.log(`Tauri notification permission: ${permission}`);
        return granted;
      } else if ('Notification' in globalThis) {
        const permission = await Notification.requestPermission();
        const granted = permission === 'granted';
        this.permissionGranted.set(granted);
        this.logService.log(`Web notification permission: ${permission}`);
        return granted;
      }
      return false;
    } catch (error) {
      this.logService.log('Error requesting notification permission', error);
      return false;
    }
  }

  /**
   * Show a notification to the user.
   * Automatically selects the appropriate notification method based on platform (Tauri, Service Worker, or basic).
   * Stores the notification in history and checks permission before displaying.
   * @param options - Notification configuration including title, body, icon, and custom data
   * @returns Promise resolving to the unique notification ID
   */
  async show(options: NotificationOptions): Promise<string> {
    const notificationId = this.generateId();

    // Store notification in history with both translated text and localized variants
    // Localized variants allow re-translation on language change in notification center
    const notification: Notification = {
      id: notificationId,
      title: options.title,
      body: options.body,
      titleKey: options.titleKey,
      bodyKey: options.bodyKey,
      localizedTitle: options.localizedTitle,
      localizedBody: options.localizedBody,
      params: options.params,
      icon: options.icon,
      data: options.data,
      timestamp: new Date(),
      read: false
    };

    this.addNotification(notification);

    // Check permission before showing
    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      this.logService.log('Notification permission not granted');
      return notificationId;
    }

    // istanbul ignore next - Tauri API, Service Worker, and Browser Notification API integration testing
    try {
      if (this.isTauri) {
        this.logService.log('Showing Tauri notification');
        await this.showTauriNotification(options);
      } else if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        this.logService.log('Showing service worker notification');
        await this.showWebNotification(options, notificationId);
      } else {
        this.logService.log('Showing basic notification (no service worker)', {
          hasServiceWorker: 'serviceWorker' in navigator,
          hasController: navigator.serviceWorker?.controller !== null
        });
        await this.showBasicNotification(options);
      }

      this.logService.log('Notification shown', { id: notificationId, title: options.title });
    } catch (error) {
      this.logService.log('Error showing notification', error);
    }
    // istanbul ignore next
    return notificationId;
  }

  /**
   * Show notification using Tauri plugin.
   * Uses the native notification system on desktop platforms.
   * @param options - Notification options including title, body, and icon
   */
  // istanbul ignore next - Tauri API integration testing
  private async showTauriNotification(options: NotificationOptions): Promise<void> {
    this.logService.log('Sending Tauri notification with options:', {
      title: options.title,
      body: options.body,
      icon: options.icon
    });

    try {
      // Ensure body is not undefined
      const notificationPayload = {
        title: options.title,
        body: options.body || '',
        icon: options.icon
      };

      this.logService.log('Tauri notification payload:', notificationPayload);

      await sendNotification(notificationPayload);

      this.logService.log('Tauri notification sent successfully');
    } catch (error) {
      this.logService.log('Tauri notification failed:', error);
      throw error;
    }
  }

  /**
   * Show notification using Service Worker (for PWA).
   * Used when running as a Progressive Web App with an active service worker.
   * @param options - Notification options including title, body, icon, and additional settings
   * @param id - Unique notification identifier
   */
  // istanbul ignore next - Service Worker integration testing
  private async showWebNotification(options: NotificationOptions, id: string): Promise<void> {
    const registration = await navigator.serviceWorker.ready;

    const notificationOptions: NotificationOptions = {
      title: options.title,
      body: options.body,
      icon: options.icon ?? '/assets/icons/icon-192x192.png',
      tag: options.tag ?? id,
      requireInteraction: options.requireInteraction || false,
      silent: options.silent || false,
      data: options.data ? {
        ...(options.data as Record<string, unknown>),
        notificationId: id,
        timestamp: Date.now()
      } : {
        notificationId: id,
        timestamp: Date.now()
      }
    };

    // Cast to any for showNotification because the browser API has additional properties
    await registration.showNotification(options.title, notificationOptions);
  }

  /**
   * Show notification using basic Notification API.
   * Fallback method when Service Worker is not available.
   * Sets up event handlers for click, show, error, and close events.
   * @param options - Notification options including title, body, icon, and additional settings
   */
  // istanbul ignore next - Browser Notification API integration testing
  private async showBasicNotification(options: NotificationOptions): Promise<void> {
    try {
      this.logService.log('Creating basic notification with options', {
        title: options.title,
        body: options.body,
        icon: options.icon,
        permission: Notification.permission
      });

      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon ?? '/assets/icons/icon-192x192.png',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        data: options.data
      });

      this.logService.log('Basic notification created successfully');

      // Handle notification click
      notification.onclick = () => {
        this.logService.log('Notification clicked');
        globalThis.focus();
        notification.close();
      };

      // Log when notification is shown
      notification.onshow = () => {
        this.logService.log('Notification displayed');
      };

      // Log errors
      notification.onerror = (error) => {
        this.logService.log('Notification error', error);
      };

      // Log when closed
      notification.onclose = () => {
        this.logService.log('Notification closed');
      };
    } catch (error) {
      this.logService.log('Failed to create basic notification', error);
      throw error;
    }
  }

  /**
   * Add notification to history.
   * Updates the unread count and persists to localStorage.
   * @param notification - Notification object to add to history
   */
  private addNotification(notification: Notification): void {
    const notifications = this.notifications();
    this.notifications.set([notification, ...notifications]);
    this.updateUnreadCount();
    this.saveNotificationsToStorage();
  }

  /**
   * Mark a specific notification as read.
   * @param notificationId - Unique identifier of the notification to mark as read
   */
  markAsRead(notificationId: string): void {
    const notifications = this.notifications();
    const updated = notifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    this.notifications.set(updated);
    this.updateUnreadCount();
    this.saveNotificationsToStorage();
  }

  /**
   * Mark all notifications as read.
   */
  markAllAsRead(): void {
    const notifications = this.notifications();
    const updated = notifications.map(n => ({ ...n, read: true }));
    this.notifications.set(updated);
    this.updateUnreadCount();
    this.saveNotificationsToStorage();
  }

  /**
   * Delete a specific notification from history.
   * @param notificationId - Unique identifier of the notification to delete
   */
  deleteNotification(notificationId: string): void {
    const notifications = this.notifications();
    const filtered = notifications.filter(n => n.id !== notificationId);
    this.notifications.set(filtered);
    this.updateUnreadCount();
    this.saveNotificationsToStorage();
  }

  /**
   * Clear all notifications from history.
   */
  clearAll(): void {
    this.notifications.set([]);
    this.unreadCount.set(0);
    this.saveNotificationsToStorage();
  }

  /**
   * Update the unread notification count signal.
   */
  private updateUnreadCount(): void {
    const count = this.notifications().filter(n => !n.read).length;
    this.unreadCount.set(count);
  }

  /**
   * Save notifications to localStorage using user-scoped key.
   * Limits storage to the most recent notifications to prevent excessive storage usage.
   */
  private saveNotificationsToStorage(): void {
    try {
      const storageKey = this.userStorageService.prefixKey(NOTIFICATIONS_STORAGE_KEY);
      const notifications = this.notifications();
      // Keep only last N notifications
      const toSave = notifications.slice(0, NOTIFICATION_CONFIG.MAX_STORED_NOTIFICATIONS);
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    } catch (error) {
      // istanbul ignore next - localStorage error handling
      this.logService.log('Error saving notifications to storage', error);
    }
  }

  /**
   * Load notifications from localStorage using user-scoped key.
   * Converts timestamp strings back to Date objects.
   */
  private loadNotificationsFromStorage(): void {
    try {
      const storageKey = this.userStorageService.prefixKey(NOTIFICATIONS_STORAGE_KEY);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const notifications = JSON.parse(stored) as Notification[];
        // Convert timestamp strings back to Date objects
        notifications.forEach(n => {
          n.timestamp = new Date(n.timestamp);
        });
        this.notifications.set(notifications);
        this.updateUnreadCount();
      }
    } catch (error) {
      // istanbul ignore next - localStorage error handling
      this.logService.log('Error loading notifications from storage', error);
    }
  }

  /**
   * Reload notifications from storage.
   * Called after user login/logout to switch to the appropriate user-scoped storage.
   */
  reloadFromStorage(): void {
    this.notifications.set([]);
    this.unreadCount.set(0);
    this.loadNotificationsFromStorage();
  }

  /**
   * Generate unique notification ID using timestamp and UUID.
   * @returns Unique notification identifier string
   */
  private generateId(): string {
    return `notification_${Date.now()}_${crypto.randomUUID()}`;
  }

  /**
   * Show a test notification (useful for development and testing).
   * Displays a sample notification to verify the notification system is working.
   */
  async showTestNotification(): Promise<void> {
    await this.show({
      title: 'Test Notification',
      body: 'This is a test notification from Angular Momentum!',
      icon: '/assets/icons/icon-192x192.png',
      data: { type: 'test' }
    });
  }
}
