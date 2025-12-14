import { Component, inject } from '@angular/core';

import { NotificationService } from '../../../services/notification.service';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AnchorMenuComponent } from '../anchor-menu/anchor-menu.component';
import { ScrollIndicatorDirective } from '@app/directives/scroll-indicator.directive';
import { RelativeTimeComponent } from '@app/components/ui/relative-time/relative-time.component';
import { RelativeTimePipe } from '@app/pipes/relative-time.pipe';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { LocalizedStrings, Notification } from '@app/models/data.model';

/**
 * Notification center component that displays a notification center overlay.
 *
 * This component shows a bell icon with a badge indicating unread notifications.
 * When clicked, it opens an overlay panel displaying all notifications with options
 * to mark as read, delete individual notifications, or clear all. It also provides
 * a button to request notification permissions if not already granted.
 *
 * Uses the shared AnchorMenuComponent for overlay behavior.
 */
@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [ButtonModule, CardModule, AnchorMenuComponent, ScrollIndicatorDirective, TranslocoDirective, RelativeTimeComponent, RelativeTimePipe],
  templateUrl: './notification-center.component.html'
})
export class NotificationCenterComponent {
  readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);

  /**
   * Marks a specific notification as read.
   * @param notificationId - The unique identifier of the notification to mark as read
   */
  markAsRead(notificationId: string) {
    this.notificationService.markAsRead(notificationId);
  }

  /**
   * Marks all unread notifications as read.
   * Updates the notification service to reflect that all notifications have been acknowledged.
   */
  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }

  /**
   * Deletes a specific notification.
   * Stops event propagation to prevent triggering the notification's click handler.
   * @param event - The DOM event that triggered the deletion
   * @param notificationId - The unique identifier of the notification to delete
   */
  deleteNotification(event: Event, notificationId: string) {
    event.stopPropagation();
    this.notificationService.deleteNotification(notificationId);
  }

  /**
   * Clears all notifications from the notification center.
   * Removes all notifications from the notification service storage.
   */
  clearAll() {
    this.notificationService.clearAll();
  }

  /**
   * Requests browser notification permission from the user.
   * Prompts the user to grant permission for showing browser notifications.
   * @returns Promise that resolves when the permission request is complete
   */
  async requestPermission() {
    await this.notificationService.requestPermission();
  }

  /**
   * Gets the translated title for a notification.
   * Priority: localizedTitle (server-sent) > titleKey (legacy) > pre-translated title.
   * @param notification - The notification to get the title for
   * @returns The translated title string
   */
  getTitle(notification: Notification): string {
    // Server-sent localized notifications: pick current locale
    if (notification.localizedTitle) {
      const text = this.getLocalizedString(notification.localizedTitle);
      // Apply ICU formatting if there are params
      return notification.params ? this.translocoService.translate(text, notification.params) : text;
    }
    // Legacy key-based translations
    if (notification.titleKey) {
      return this.translocoService.translate(notification.titleKey, notification.params || {});
    }
    return notification.title;
  }

  /**
   * Gets the translated body for a notification.
   * Priority: localizedBody (server-sent) > bodyKey (legacy) > pre-translated body.
   * @param notification - The notification to get the body for
   * @returns The translated body string
   */
  getBody(notification: Notification): string {
    // Server-sent localized notifications: pick current locale
    if (notification.localizedBody) {
      const text = this.getLocalizedString(notification.localizedBody);
      // Apply ICU formatting if there are params
      return notification.params ? this.translocoService.translate(text, notification.params) : text;
    }
    // Legacy key-based translations
    if (notification.bodyKey) {
      return this.translocoService.translate(notification.bodyKey, notification.params || {});
    }
    return notification.body;
  }

  /**
   * Get the string for the current locale from a localized strings object.
   * Falls back to English if the current locale is not available.
   * @param strings - Object with language codes as keys and translations as values
   * @returns The string for the current locale or English fallback
   */
  private getLocalizedString(strings: LocalizedStrings): string {
    const locale = this.translocoService.getActiveLang();
    // istanbul ignore next: LocalizedStrings type requires all languages, fallbacks are defensive
    return strings[locale as keyof LocalizedStrings] ?? strings['en-US'] ?? '';
  }
}
