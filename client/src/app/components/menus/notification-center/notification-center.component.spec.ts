import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationCenterComponent } from './notification-center.component';
import { NotificationService } from '../../../services/notification.service';
import { signal } from '@angular/core';

describe('NotificationCenterComponent', () => {
  let component: NotificationCenterComponent;
  let fixture: ComponentFixture<NotificationCenterComponent>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
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
      imports: [NotificationCenterComponent],
      providers: [
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationCenterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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
});
