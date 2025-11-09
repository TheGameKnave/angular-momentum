import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationBellComponent } from './notification-bell.component';
import { NotificationService } from '../../services/notification.service';
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';

describe('NotificationBellComponent', () => {
  let component: NotificationBellComponent;
  let fixture: ComponentFixture<NotificationBellComponent>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let overlayRefSpy: jasmine.SpyObj<OverlayRef>;
  let backdropClickSubject: Subject<MouseEvent>;

  beforeEach(async () => {
    backdropClickSubject = new Subject<MouseEvent>();

    overlayRefSpy = jasmine.createSpyObj('OverlayRef', [
      'attach',
      'detach',
      'hasAttached',
      'backdropClick'
    ]);
    overlayRefSpy.backdropClick.and.returnValue(backdropClickSubject.asObservable());
    overlayRefSpy.hasAttached.and.returnValue(true);

    notificationServiceSpy = jasmine.createSpyObj('NotificationService', [
      'markAsRead',
      'markAllAsRead',
      'deleteNotification',
      'clearAll',
      'requestPermission'
    ]);

    // Create signal spies
    (notificationServiceSpy as any).notifications = signal([]);
    (notificationServiceSpy as any).unreadCount = signal(0);
    (notificationServiceSpy as any).permissionGranted = signal(false);

    await TestBed.configureTestingModule({
      imports: [NotificationBellComponent, OverlayModule],
      providers: [
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationBellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with showCenter as false', () => {
    expect(component.showCenter()).toBe(false);
  });

  describe('markAsRead', () => {
    it('should call notification service markAsRead', () => {
      const notificationId = 'test-123';
      component.markAsRead(notificationId);
      expect(notificationServiceSpy.markAsRead).toHaveBeenCalledWith(notificationId);
    });
  });

  describe('markAllAsRead', () => {
    it('should call notification service markAllAsRead', () => {
      component.markAllAsRead();
      expect(notificationServiceSpy.markAllAsRead).toHaveBeenCalled();
    });
  });

  describe('deleteNotification', () => {
    it('should stop event propagation and call notification service', () => {
      const event = new Event('click');
      spyOn(event, 'stopPropagation');
      const notificationId = 'test-123';

      component.deleteNotification(event, notificationId);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(notificationServiceSpy.deleteNotification).toHaveBeenCalledWith(notificationId);
    });
  });

  describe('clearAll', () => {
    it('should call notification service clearAll', () => {
      component.clearAll();
      expect(notificationServiceSpy.clearAll).toHaveBeenCalled();
    });
  });

  describe('requestPermission', () => {
    it('should call notification service requestPermission', async () => {
      notificationServiceSpy.requestPermission.and.returnValue(Promise.resolve(true));
      await component.requestPermission();
      expect(notificationServiceSpy.requestPermission).toHaveBeenCalled();
    });
  });

  describe('formatTime', () => {
    it('should return "Just now" for timestamps less than a minute old', () => {
      const now = new Date();
      const result = component.formatTime(now);
      expect(result).toBe('Just now');
    });

    it('should return minutes for timestamps less than an hour old', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const result = component.formatTime(fiveMinutesAgo);
      expect(result).toBe('5m ago');
    });

    it('should return hours for timestamps less than a day old', () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const result = component.formatTime(twoHoursAgo);
      expect(result).toBe('2h ago');
    });

    it('should return days for timestamps more than a day old', () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const result = component.formatTime(threeDaysAgo);
      expect(result).toBe('3d ago');
    });
  });

  describe('toggleNotificationCenter', () => {
    it('should open notification center when closed', () => {
      expect(component.showCenter()).toBe(false);
      component.toggleNotificationCenter();
      expect(component.showCenter()).toBe(true);
    });

    it('should close notification center when open', () => {
      // First open it
      component.toggleNotificationCenter();
      expect(component.showCenter()).toBe(true);

      // Manually set overlayRef to simulate opened state
      (component as any).overlayRef = overlayRefSpy;

      // Then close it
      component.toggleNotificationCenter();
      expect(component.showCenter()).toBe(false);
      expect(overlayRefSpy.detach).toHaveBeenCalled();
    });

    it('should create overlay on first open', () => {
      expect((component as any).overlayRef).toBeNull();
      component.toggleNotificationCenter();
      expect((component as any).overlayRef).not.toBeNull();
    });
  });

  describe('ngOnDestroy', () => {
    it('should close notification center', () => {
      component.showCenter.set(true);
      (component as any).overlayRef = overlayRefSpy;

      component.ngOnDestroy();

      expect(component.showCenter()).toBe(false);
      expect(overlayRefSpy.detach).toHaveBeenCalled();
    });

    it('should handle destroy when overlay is not attached', () => {
      overlayRefSpy.hasAttached.and.returnValue(false);
      (component as any).overlayRef = overlayRefSpy;

      expect(() => component.ngOnDestroy()).not.toThrow();
      expect(overlayRefSpy.detach).not.toHaveBeenCalled();
    });

    it('should handle destroy when overlayRef is null', () => {
      (component as any).overlayRef = null;

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });
});
