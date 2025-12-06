import { Component, inject } from '@angular/core';

import { NotificationService } from '../../../services/notification.service';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AnchorMenuComponent } from '../anchor-menu/anchor-menu.component';
import { ScrollIndicatorDirective } from '@app/directives/scroll-indicator.directive';
import { TIME_CONSTANTS } from '@app/constants/ui.constants';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { Notification } from '@app/models/data.model';

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
  imports: [ButtonModule, CardModule, AnchorMenuComponent, ScrollIndicatorDirective, TranslocoDirective],
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
   * Formats a timestamp into a human-readable relative time string.
   * @param timestamp - The timestamp to format
   * @returns A human-readable relative time string
   */
  formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const seconds = Math.floor(diff / TIME_CONSTANTS.SECONDS);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return this.translocoService.translate('time.{count}d ago', { count: days });
    if (hours > 0) return this.translocoService.translate('time.{count}h ago', { count: hours });
    if (minutes > 0) return this.translocoService.translate('time.{count}m ago', { count: minutes });
    return this.translocoService.translate('time.Just now');
  }

  /**
   * Gets the translated title for a notification.
   * Uses the titleKey if available for dynamic translation on language change,
   * otherwise falls back to the pre-translated title.
   * @param notification - The notification to get the title for
   * @returns The translated title string
   */
  getTitle(notification: Notification): string {
    if (notification.titleKey) {
      return this.translocoService.translate(notification.titleKey, notification.params || {});
    }
    return notification.title;
  }

  /**
   * Gets the translated body for a notification.
   * Uses the bodyKey if available for dynamic translation on language change,
   * otherwise falls back to the pre-translated body.
   * @param notification - The notification to get the body for
   * @returns The translated body string
   */
  getBody(notification: Notification): string {
    if (notification.bodyKey) {
      return this.translocoService.translate(notification.bodyKey, notification.params || {});
    }
    return notification.body;
  }
}
