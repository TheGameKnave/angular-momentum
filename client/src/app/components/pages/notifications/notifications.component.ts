import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { NotificationService } from '@app/services/notification.service';
import { PredefinedNotification } from '@app/models/data.model';
import { NOTIFICATION_IDS, NOTIFICATION_KEY_MAP, NotificationId } from '@app/constants/translations.constants';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@app/services/auth.service';
import { GraphqlService } from '@app/services/graphql.service';

/**
 * Notifications component that demonstrates push notification capabilities.
 *
 * This component provides interfaces for sending both local (client-side) and
 * server-side notifications. It includes predefined notification templates and
 * shows notification permission status, supporting both web/PWA and Tauri platforms.
 */
@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CardModule,
    ButtonModule,
    MessageModule,
    TranslocoDirective,
  ],
})
export class NotificationsComponent {
  private readonly graphqlService = inject(GraphqlService);
  readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);
  protected readonly authService = inject(AuthService);

  localNotificationStatus = signal<string>('');
  serverNotificationStatus = signal<string>('');
  loading = signal(false);

  /**
   * Simple list of predefined notification IDs with optional params.
   * All display content is derived from NOTIFICATION_KEY_MAP.
   * Note: Maintenance time uses a fixed value for visual test stability.
   */
  readonly predefinedNotifications: PredefinedNotification[] = [
    { id: NOTIFICATION_IDS.WELCOME },
    { id: NOTIFICATION_IDS.FEATURE_UPDATE },
    { id: NOTIFICATION_IDS.MAINTENANCE, params: { time: '10:00 PM' } },
    { id: NOTIFICATION_IDS.ACHIEVEMENT },
  ];

  /**
   * Gets the translated title for a notification.
   */
  getTitle(notification: PredefinedNotification): string {
    const keys = NOTIFICATION_KEY_MAP[notification.id as NotificationId];
    return this.translocoService.translate(keys.titleKey);
  }

  /**
   * Gets the translated body for a notification, with params applied.
   */
  getBody(notification: PredefinedNotification): string {
    const keys = NOTIFICATION_KEY_MAP[notification.id as NotificationId];
    if (notification.params) {
      return this.translocoService.translate(keys.bodyKey, notification.params);
    }
    return this.translocoService.translate(keys.bodyKey);
  }

  /**
   * Gets the translated label for a notification.
   */
  getLabel(notification: PredefinedNotification): string {
    const keys = NOTIFICATION_KEY_MAP[notification.id as NotificationId];
    return this.translocoService.translate(keys.labelKey);
  }

  /**
   * Gets the severity for a notification.
   */
  getSeverity(notification: PredefinedNotification): 'success' | 'info' | 'warn' | 'secondary' {
    return NOTIFICATION_KEY_MAP[notification.id as NotificationId].severity;
  }

  /**
   * Sends a local notification (client-side only).
   * Checks for notification permission and requests it if not already granted.
   * If permission is denied, displays an error message instructing the user to
   * enable notifications in their browser/OS settings.
   * @param notification - The predefined notification to send
   */
  async sendLocalNotification(notification: PredefinedNotification) {
    this.localNotificationStatus.set('');

    const hasPermission = await this.notificationService.checkPermission();
    if (!hasPermission) {
      const granted = await this.notificationService.requestPermission();
      if (!granted) {
        this.localNotificationStatus.set('Permission denied. Please enable notifications in your browser/OS settings.');
        return;
      }
    }

    try {
      await this.notificationService.show({
        title: this.getTitle(notification),
        body: this.getBody(notification),
        icon: '/assets/icons/icon-192x192.png'
      });
      this.localNotificationStatus.set('✅ Local notification sent successfully!');
    } catch (error) {
      this.localNotificationStatus.set(`❌ Error: ${error}`);
    }
  }

  /**
   * Sends a notification via the server (broadcasts to all connected clients).
   * Uses the sendLocalizedNotification mutation which sends the notification ID
   * to the server. The server looks up all language variants and broadcasts them
   * to all clients, who then pick the correct language for their locale.
   * @param notification - The predefined notification to send
   */
  async sendServerNotification(notification: PredefinedNotification) {
    this.serverNotificationStatus.set('');
    this.loading.set(true);

    try {
      const result = await firstValueFrom(
        this.graphqlService.sendLocalizedNotification(notification.id, notification.params)
      );

      if (result.success) {
        this.serverNotificationStatus.set(`✅ ${result.message}`);
      } else {
        this.serverNotificationStatus.set(`❌ ${result.message}`);
      }
    } catch (error) {
      this.serverNotificationStatus.set(`❌ Error: ${error}`);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Gets the current notification permission status.
   * @returns A string indicating whether notifications are supported and if permission is granted
   */
  get permissionStatus(): string {
    if (!this.notificationService.isSupported()) {
      return 'Not supported';
    }
    return this.notificationService.permissionGranted() ? 'Granted' : 'Not granted';
  }

  /**
   * Determines the current platform type.
   * @returns A string indicating whether the app is running in Tauri (native) or Web/PWA
   */
  get platformType(): string {
    return '__TAURI__' in globalThis ? 'Tauri (Native)' : 'Web/PWA';
  }
}
