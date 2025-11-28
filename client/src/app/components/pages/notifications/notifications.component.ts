import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ENVIRONMENT } from 'src/environments/environment';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { NotificationService } from '@app/services/notification.service';
import { SendNotificationResponse, PredefinedNotification } from '@app/models/data.model';
import { NOTIFICATION_MESSAGES } from '@app/constants/translations.constants';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@app/services/auth.service';

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
    CommonModule,
    CardModule,
    ButtonModule,
    MessageModule,
    TranslocoDirective,
  ],
})
export class NotificationsComponent {
  localNotificationStatus = signal<string>('');
  serverNotificationStatus = signal<string>('');
  loading = signal(false);

  /**
   * Gets the list of predefined notification templates with localized content.
   * Includes various notification types (welcome, feature update, maintenance, achievement)
   * with their corresponding translation keys, icons, and severity levels.
   * @returns Array of predefined notification configurations
   */
  get predefinedNotifications(): PredefinedNotification[] {
    return [
      {
        titleKey: NOTIFICATION_MESSAGES.WELCOME_TITLE,
        bodyKey: NOTIFICATION_MESSAGES.WELCOME_BODY,
        title: this.translocoService.translate(NOTIFICATION_MESSAGES.WELCOME_TITLE),
        body: this.translocoService.translate(NOTIFICATION_MESSAGES.WELCOME_BODY),
        icon: '/assets/icons/icon-192x192.png',
        label: this.translocoService.translate(NOTIFICATION_MESSAGES.WELCOME_LABEL),
        severity: 'success'
      },
      {
        titleKey: NOTIFICATION_MESSAGES.FEATURE_UPDATE_TITLE,
        bodyKey: NOTIFICATION_MESSAGES.FEATURE_UPDATE_BODY,
        title: this.translocoService.translate(NOTIFICATION_MESSAGES.FEATURE_UPDATE_TITLE),
        body: this.translocoService.translate(NOTIFICATION_MESSAGES.FEATURE_UPDATE_BODY),
        icon: '/assets/icons/icon-192x192.png',
        label: this.translocoService.translate(NOTIFICATION_MESSAGES.FEATURE_UPDATE_LABEL),
        severity: 'info'
      },
      {
        titleKey: NOTIFICATION_MESSAGES.MAINTENANCE_TITLE,
        bodyKey: NOTIFICATION_MESSAGES.MAINTENANCE_BODY,
        title: this.translocoService.translate(NOTIFICATION_MESSAGES.MAINTENANCE_TITLE),
        body: this.translocoService.translate(NOTIFICATION_MESSAGES.MAINTENANCE_BODY, {
          time: new Date(Date.now() + 2 * 60 * 60 * 1000).toLocaleString()
        }),
        icon: '/assets/icons/icon-192x192.png',
        label: this.translocoService.translate(NOTIFICATION_MESSAGES.MAINTENANCE_LABEL),
        severity: 'warn',
        // Send timestamp in ISO format so receiving clients can format it according to their locale
        params: {
          time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // Example: 2 hours from now
        }
      },
      {
        titleKey: NOTIFICATION_MESSAGES.ACHIEVEMENT_TITLE,
        bodyKey: NOTIFICATION_MESSAGES.ACHIEVEMENT_BODY,
        title: this.translocoService.translate(NOTIFICATION_MESSAGES.ACHIEVEMENT_TITLE),
        body: this.translocoService.translate(NOTIFICATION_MESSAGES.ACHIEVEMENT_BODY),
        icon: '/assets/icons/icon-192x192.png',
        label: this.translocoService.translate(NOTIFICATION_MESSAGES.ACHIEVEMENT_LABEL),
        severity: 'secondary'
      }
    ];
  }

  constructor(
    readonly http: HttpClient,
    readonly notificationService: NotificationService,
    private readonly translocoService: TranslocoService,
    protected readonly authService: AuthService,
  ) {}

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
        title: notification.title,
        body: notification.body,
        icon: notification.icon
      });
      this.localNotificationStatus.set('✅ Local notification sent successfully!');
    } catch (error) {
      this.localNotificationStatus.set(`❌ Error: ${error}`);
    }
  }

  /**
   * Sends a notification via the server (broadcasts to all connected clients).
   * Sends a GraphQL mutation to the server with translation keys rather than
   * translated text, allowing each client to display the notification in their
   * own language. Includes optional parameters like timestamps for locale-specific
   * formatting on the client side.
   * @param notification - The predefined notification to send
   */
  async sendServerNotification(notification: PredefinedNotification) {
    this.serverNotificationStatus.set('');
    this.loading.set(true);

    const mutation = `
      mutation SendNotification($title: String!, $body: String!, $icon: String, $data: String) {
        sendNotification(title: $title, body: $body, icon: $icon, data: $data) {
          success
          message
        }
      }
    `;

    try {
      const response = await firstValueFrom(this.http.post<SendNotificationResponse>(
        ENVIRONMENT.baseUrl + '/gql',
        {
          query: mutation,
          variables: {
            // Send the translation keys, not the translated text
            // This allows each client to translate in their own language
            title: notification.titleKey,
            body: notification.bodyKey,
            icon: notification.icon,
            // Send params (like timestamps) so clients can format them according to their locale
            data: notification.params ? JSON.stringify({ params: notification.params }) : undefined
          }
        },
        {
          headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
        }
      ));

      if (response?.data?.sendNotification?.success) {
        this.serverNotificationStatus.set(`✅ ${response.data.sendNotification.message}`);
      } else {
        this.serverNotificationStatus.set(`❌ ${response?.data?.sendNotification?.message || 'Unknown error'}`);
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
    return '__TAURI__' in window ? 'Tauri (Native)' : 'Web/PWA';
  }
}
