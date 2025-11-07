import { Component, signal, ViewContainerRef, TemplateRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Overlay, OverlayRef, OverlayModule } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, OverlayModule],
  templateUrl: './notification-bell.component.html'
})
export class NotificationBellComponent {
  @ViewChild('notificationCenter') notificationCenterTemplate!: TemplateRef<unknown>;
  @ViewChild('bellButton') bellButton!: ElementRef<HTMLButtonElement>;

  showCenter = signal(false);
  private overlayRef: OverlayRef | null = null;

  constructor(
    public notificationService: NotificationService,
    private overlay: Overlay,
    private viewContainerRef: ViewContainerRef
  ) {}

  ngOnDestroy() {
    this.closeNotificationCenter();
  }

  toggleNotificationCenter() {
    if (this.showCenter()) {
      this.closeNotificationCenter();
    } else {
      this.openNotificationCenter();
    }
  }

  private openNotificationCenter() {
    if (!this.overlayRef) {
      // Create overlay positioned below the bell button
      const positionStrategy = this.overlay
        .position()
        .flexibleConnectedTo(this.bellButton)
        .withPositions([
          {
            originX: 'end',
            originY: 'bottom',
            overlayX: 'end',
            overlayY: 'top',
            offsetY: 8
          }
        ]);

      this.overlayRef = this.overlay.create({
        positionStrategy,
        hasBackdrop: true,
        backdropClass: 'cdk-overlay-transparent-backdrop',
        scrollStrategy: this.overlay.scrollStrategies.reposition()
      });

      // Close on backdrop click
      /* istanbul ignore next - CDK Overlay integration */
      this.overlayRef.backdropClick().subscribe(() => {
        this.closeNotificationCenter();
      });
    }

    // Attach the template portal
    const portal = new TemplatePortal(
      this.notificationCenterTemplate,
      this.viewContainerRef
    );
    this.overlayRef.attach(portal);
    this.showCenter.set(true);
  }

  private closeNotificationCenter() {
    if (this.overlayRef && this.overlayRef.hasAttached()) {
      this.overlayRef.detach();
    }
    this.showCenter.set(false);
  }

  markAsRead(notificationId: string) {
    this.notificationService.markAsRead(notificationId);
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }

  deleteNotification(event: Event, notificationId: string) {
    event.stopPropagation();
    this.notificationService.deleteNotification(notificationId);
  }

  clearAll() {
    this.notificationService.clearAll();
  }

  async requestPermission() {
    await this.notificationService.requestPermission();
  }

  formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }
}
