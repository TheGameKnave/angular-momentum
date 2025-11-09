import { Component, signal, ViewContainerRef, TemplateRef, ViewChild, ElementRef, OnDestroy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Overlay, OverlayRef, OverlayModule } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { NotificationService } from '../../services/notification.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, OverlayModule, ButtonModule, CardModule],
  templateUrl: './notification-bell.component.html'
})
export class NotificationBellComponent implements OnDestroy {
  @ViewChild('notificationCenter') notificationCenterTemplate!: TemplateRef<unknown>;
  @ViewChild('bellButton') bellButton!: ElementRef<HTMLButtonElement>;

  showCenter = signal(false);
  private overlayRef: OverlayRef | null = null;

  constructor(
    public readonly notificationService: NotificationService,
    private readonly overlay: Overlay,
    private readonly viewContainerRef: ViewContainerRef,
    private readonly destroyRef: DestroyRef,
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
      const positionStrategy = this.overlay.position().global();

      this.overlayRef = this.overlay.create({
        positionStrategy,
        hasBackdrop: true,
        backdropClass: 'app-overlay-backdrop',
        scrollStrategy: this.overlay.scrollStrategies.noop(),
        panelClass: 'notification-overlay-panel'
      });

      // Close on backdrop click
      /* istanbul ignore next - CDK Overlay integration */
      this.overlayRef.backdropClick().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
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

  closeNotificationCenter() {
    if (this.overlayRef?.hasAttached()) {
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
