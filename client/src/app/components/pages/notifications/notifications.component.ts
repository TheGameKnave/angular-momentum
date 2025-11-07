import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ENVIRONMENT } from 'src/environments/environment';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { NotificationService } from '@app/services/notification.service';
import { FeatureMonitorService } from '@app/services/feature-monitor.service';
import { SendNotificationResponse, PredefinedNotification } from '@app/models/data.model';
import { NotificationMessages } from '@app/helpers/notification-messages';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TranslocoDirective,
  ],
})
export class NotificationsComponent {
  localNotificationStatus = signal<string>('');
  serverNotificationStatus = signal<string>('');
  loading = signal(false);

  get predefinedNotifications(): PredefinedNotification[] {
    return [
      {
        titleKey: NotificationMessages.WELCOME_TITLE,
        bodyKey: NotificationMessages.WELCOME_BODY,
        title: this.translocoService.translate(NotificationMessages.WELCOME_TITLE),
        body: this.translocoService.translate(NotificationMessages.WELCOME_BODY),
        icon: '/assets/icons/icon-192x192.png',
        label: this.translocoService.translate(NotificationMessages.WELCOME_LABEL),
        severity: 'success'
      },
      {
        titleKey: NotificationMessages.FEATURE_UPDATE_TITLE,
        bodyKey: NotificationMessages.FEATURE_UPDATE_BODY,
        title: this.translocoService.translate(NotificationMessages.FEATURE_UPDATE_TITLE),
        body: this.translocoService.translate(NotificationMessages.FEATURE_UPDATE_BODY),
        icon: '/assets/icons/icon-192x192.png',
        label: this.translocoService.translate(NotificationMessages.FEATURE_UPDATE_LABEL),
        severity: 'info'
      },
      {
        titleKey: NotificationMessages.MAINTENANCE_TITLE,
        bodyKey: NotificationMessages.MAINTENANCE_BODY,
        title: this.translocoService.translate(NotificationMessages.MAINTENANCE_TITLE),
        body: this.translocoService.translate(NotificationMessages.MAINTENANCE_BODY, {
          time: new Date(Date.now() + 2 * 60 * 60 * 1000).toLocaleString()
        }),
        icon: '/assets/icons/icon-192x192.png',
        label: this.translocoService.translate(NotificationMessages.MAINTENANCE_LABEL),
        severity: 'warn',
        // Send timestamp in ISO format so receiving clients can format it according to their locale
        params: {
          time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // Example: 2 hours from now
        }
      },
      {
        titleKey: NotificationMessages.ACHIEVEMENT_TITLE,
        bodyKey: NotificationMessages.ACHIEVEMENT_BODY,
        title: this.translocoService.translate(NotificationMessages.ACHIEVEMENT_TITLE),
        body: this.translocoService.translate(NotificationMessages.ACHIEVEMENT_BODY),
        icon: '/assets/icons/icon-192x192.png',
        label: this.translocoService.translate(NotificationMessages.ACHIEVEMENT_LABEL),
        severity: 'secondary'
      }
    ];
  }

  constructor(
    readonly http: HttpClient,
    readonly notificationService: NotificationService,
    private readonly featureMonitorService: FeatureMonitorService,
    private readonly translocoService: TranslocoService,
  ) {}

  /**
   * Send a local notification (client-side only)
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
   * Send a notification via the server (broadcasts to all connected clients)
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
      const response = await this.http.post<SendNotificationResponse>(
        ENVIRONMENT.baseUrl + '/api',
        {
          query: mutation,
          variables: {
            // Send the translation keys, not the translated text
            // This allows each client to translate in their own language
            title: notification.titleKey || notification.title,
            body: notification.bodyKey || notification.body,
            icon: notification.icon,
            // Send params (like timestamps) so clients can format them according to their locale
            data: notification.params ? JSON.stringify({ params: notification.params }) : undefined
          }
        },
        {
          headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
        }
      ).toPromise();

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

  get permissionStatus(): string {
    if (!this.notificationService.isSupported()) {
      return 'Not supported';
    }
    return this.notificationService.permissionGranted() ? 'Granted' : 'Not granted';
  }

  get platformType(): string {
    return '__TAURI__' in window ? 'Tauri (Native)' : 'Web/PWA';
  }
}
