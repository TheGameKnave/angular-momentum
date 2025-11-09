import { DestroyRef, Injectable, signal } from '@angular/core';
import { sendNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';
import { TranslocoService } from '@jsverse/transloco';
import { LogService } from './log.service';
import { SocketIoService } from './socket.io.service';
import { Notification, NotificationOptions } from '../models/data.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  // Signal to track notification permission state
  permissionGranted = signal<boolean>(false);

  // Signal to track all notifications
  notifications = signal<Notification[]>([]);

  // Signal to track unread count
  unreadCount = signal<number>(0);

  // Check if running in Tauri
  private readonly isTauri = '__TAURI__' in window;

  constructor(
    private readonly logService: LogService,
    private readonly socketService: SocketIoService,
    private readonly translocoService: TranslocoService,
    private readonly destroyRef: DestroyRef,
  ) {
    this.loadNotificationsFromStorage();
    this.listenForWebSocketNotifications();
    // Initialize permission state synchronously for web, Tauri will be checked lazily when needed
    this.initializePermissionSync();
  }

  /**
   * Initialize permission state synchronously (no async operations)
   * For Tauri, permission will be checked lazily when actually showing notifications
   */
  private initializePermissionSync(): void {
    if (!this.isTauri && 'Notification' in window) {
      try {
        const granted = Notification.permission === 'granted';
        this.permissionGranted.set(granted);
      } catch (error) {
        // Silently fail - permission will be checked when actually needed
        this.logService.log('NotificationService', 'Error initializing notification permission', error);
      }
    }
  }

  /**
   * Listen for notifications from WebSocket
   * Note: The server sends translation keys, which we translate here on the client
   * so each client sees the notification in their selected language
   */
  private listenForWebSocketNotifications(): void {
    this.socketService.listen<NotificationOptions>('notification').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (notification) => {
        this.logService.log('NotificationService', 'Received notification from WebSocket', notification);

        // Extract params from data field if present
        let params: Record<string, unknown> | undefined;
        if (notification.data && typeof notification.data === 'object') {
          const dataObj = notification.data as { params?: Record<string, unknown> };
          params = dataObj.params;

          // Format timestamp params for the client's locale
          if (typeof params?.['time'] === 'string') {
            params['time'] = new Date(params['time']).toLocaleString();
          }
        }

        // Translate the notification title and body if they are translation keys
        // Pass params for parameterized translations (e.g., timestamps)
        const translatedNotification: NotificationOptions = {
          ...notification,
          title: this.translocoService.translate(notification.title, params || {}),
          body: this.translocoService.translate(notification.body, params || {})
        };

        this.show(translatedNotification);
      },
      error: (error: unknown) => {
        this.logService.log('NotificationService', 'Error receiving WebSocket notification', error);
      }
    });
  }

  /**
   * Check if notifications are supported in the current environment
   */
  isSupported(): boolean {
    /* istanbul ignore next - Browser API feature detection */
    return this.isTauri || ('Notification' in window && 'serviceWorker' in navigator);
  }

  /**
   * Check current permission status
   */
  async checkPermission(): Promise<boolean> {
    try {
      /* istanbul ignore next - Tauri API integration testing */
      if (this.isTauri) {
        const granted = await isPermissionGranted();
        this.permissionGranted.set(granted);
        return granted;
      } else if ('Notification' in window) {
        const granted = Notification.permission === 'granted';
        this.permissionGranted.set(granted);
        return granted;
      }
      return false;
    } catch (error) {
      this.logService.log('NotificationService', 'Error checking notification permission', error);
      return false;
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    try {
      /* istanbul ignore next - Tauri API integration testing */
      if (this.isTauri) {
        const permission = await requestPermission();
        const granted = permission === 'granted';
        this.permissionGranted.set(granted);
        this.logService.log('NotificationService', `Tauri notification permission: ${permission}`);
        return granted;
      } else if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        const granted = permission === 'granted';
        this.permissionGranted.set(granted);
        this.logService.log('NotificationService', `Web notification permission: ${permission}`);
        return granted;
      }
      return false;
    } catch (error) {
      this.logService.log('NotificationService', 'Error requesting notification permission', error);
      return false;
    }
  }

  /**
   * Show a notification
   */
  async show(options: NotificationOptions): Promise<string> {
    const notificationId = this.generateId();

    // Store notification in history
    const notification: Notification = {
      id: notificationId,
      title: options.title,
      body: options.body,
      icon: options.icon,
      data: options.data,
      timestamp: new Date(),
      read: false
    };

    this.addNotification(notification);

    // Check permission before showing
    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      this.logService.log('NotificationService', 'Notification permission not granted');
      return notificationId;
    }

    /* istanbul ignore next - Tauri API, Service Worker, and Browser Notification API integration testing */
    try {
      if (this.isTauri) {
        this.logService.log('NotificationService', 'Showing Tauri notification');
        await this.showTauriNotification(options);
      } else if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        this.logService.log('NotificationService', 'Showing service worker notification');
        await this.showWebNotification(options, notificationId);
      } else {
        this.logService.log('NotificationService', 'Showing basic notification (no service worker)', {
          hasServiceWorker: 'serviceWorker' in navigator,
          hasController: navigator.serviceWorker?.controller !== null
        });
        await this.showBasicNotification(options);
      }

      this.logService.log('NotificationService', 'Notification shown', { id: notificationId, title: options.title });
    } catch (error) {
      this.logService.log('NotificationService', 'Error showing notification', error);
    }
    /* istanbul ignore next */
    return notificationId;
  }

  /**
   * Show notification using Tauri plugin
   */
  /* istanbul ignore next - Tauri API integration testing */
  private async showTauriNotification(options: NotificationOptions): Promise<void> {
    this.logService.log('NotificationService', 'Sending Tauri notification with options:', {
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

      this.logService.log('NotificationService', 'Tauri notification payload:', notificationPayload);

      await sendNotification(notificationPayload);

      this.logService.log('NotificationService', 'Tauri notification sent successfully');
    } catch (error) {
      this.logService.log('NotificationService', 'Tauri notification failed:', error);
      throw error;
    }
  }

  /**
   * Show notification using Service Worker (for PWA)
   */
  /* istanbul ignore next - Service Worker integration testing */
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
   * Show notification using basic Notification API
   */
  /* istanbul ignore next - Browser Notification API integration testing */
  private async showBasicNotification(options: NotificationOptions): Promise<void> {
    try {
      this.logService.log('NotificationService', 'Creating basic notification with options', {
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

      this.logService.log('NotificationService', 'Basic notification created successfully');

      // Handle notification click
      notification.onclick = () => {
        this.logService.log('NotificationService', 'Notification clicked');
        window.focus();
        notification.close();
      };

      // Log when notification is shown
      notification.onshow = () => {
        this.logService.log('NotificationService', 'Notification displayed');
      };

      // Log errors
      notification.onerror = (error) => {
        this.logService.log('NotificationService', 'Notification error', error);
      };

      // Log when closed
      notification.onclose = () => {
        this.logService.log('NotificationService', 'Notification closed');
      };
    } catch (error) {
      this.logService.log('NotificationService', 'Failed to create basic notification', error);
      throw error;
    }
  }

  /**
   * Add notification to history
   */
  private addNotification(notification: Notification): void {
    const notifications = this.notifications();
    this.notifications.set([notification, ...notifications]);
    this.updateUnreadCount();
    this.saveNotificationsToStorage();
  }

  /**
   * Mark notification as read
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
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    const notifications = this.notifications();
    const updated = notifications.map(n => ({ ...n, read: true }));
    this.notifications.set(updated);
    this.updateUnreadCount();
    this.saveNotificationsToStorage();
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): void {
    const notifications = this.notifications();
    const filtered = notifications.filter(n => n.id !== notificationId);
    this.notifications.set(filtered);
    this.updateUnreadCount();
    this.saveNotificationsToStorage();
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.notifications.set([]);
    this.unreadCount.set(0);
    this.saveNotificationsToStorage();
  }

  /**
   * Update unread count
   */
  private updateUnreadCount(): void {
    const count = this.notifications().filter(n => !n.read).length;
    this.unreadCount.set(count);
  }

  /**
   * Save notifications to localStorage
   */
  private saveNotificationsToStorage(): void {
    try {
      const notifications = this.notifications();
      // Keep only last 100 notifications
      const toSave = notifications.slice(0, 100);
      localStorage.setItem('app_notifications', JSON.stringify(toSave));
    } catch (error) {
      /* istanbul ignore next - localStorage error handling */
      this.logService.log('NotificationService', 'Error saving notifications to storage', error);
    }
  }

  /**
   * Load notifications from localStorage
   */
  private loadNotificationsFromStorage(): void {
    try {
      const stored = localStorage.getItem('app_notifications');
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
      /* istanbul ignore next - localStorage error handling */
      this.logService.log('NotificationService', 'Error loading notifications from storage', error);
    }
  }

  /**
   * Generate unique notification ID
   */
  private generateId(): string {
    return `notification_${Date.now()}_${crypto.randomUUID()}`;
  }

  /**
   * Test notification (useful for development)
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
