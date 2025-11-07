import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NotificationsComponent } from './notifications.component';
import { NotificationService } from '@app/services/notification.service';
import { FeatureMonitorService } from '@app/services/feature-monitor.service';
import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';

describe('NotificationsComponent', () => {
  let component: NotificationsComponent;
  let fixture: ComponentFixture<NotificationsComponent>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;
  let featureMonitorServiceSpy: jasmine.SpyObj<FeatureMonitorService>;

  beforeEach(waitForAsync(() => {
    notificationServiceSpy = jasmine.createSpyObj('NotificationService', [
      'checkPermission',
      'requestPermission',
      'show',
      'isSupported'
    ]);
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['post']);
    featureMonitorServiceSpy = jasmine.createSpyObj('FeatureMonitorService', ['trackEvent']);

    // Create signal spies
    (notificationServiceSpy as any).permissionGranted = signal(false);
    (notificationServiceSpy as any).unreadCount = signal(0);
    (notificationServiceSpy as any).notifications = signal([]);

    TestBed.configureTestingModule({
      imports: [
        NotificationsComponent,
        getTranslocoModule(),
      ],
      providers: [
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: HttpClient, useValue: httpClientSpy },
        { provide: FeatureMonitorService, useValue: featureMonitorServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize signals with empty strings', () => {
    expect(component.localNotificationStatus()).toBe('');
    expect(component.serverNotificationStatus()).toBe('');
    expect(component.loading()).toBe(false);
  });

  describe('predefinedNotifications', () => {
    it('should return array of 4 predefined notifications', () => {
      const notifications = component.predefinedNotifications;
      expect(notifications.length).toBe(4);
    });

    it('should have all required properties for each notification', () => {
      const notifications = component.predefinedNotifications;
      notifications.forEach(notification => {
        expect(notification.titleKey).toBeDefined();
        expect(notification.bodyKey).toBeDefined();
        expect(notification.title).toBeDefined();
        expect(notification.body).toBeDefined();
        expect(notification.icon).toBeDefined();
        expect(notification.label).toBeDefined();
        expect(notification.severity).toBeDefined();
      });
    });
  });

  describe('sendLocalNotification', () => {
    it('should send notification when permission is granted', async () => {
      notificationServiceSpy.checkPermission.and.returnValue(Promise.resolve(true));
      notificationServiceSpy.show.and.returnValue(Promise.resolve('test-id'));

      const notification = component.predefinedNotifications[0];
      await component.sendLocalNotification(notification);

      expect(notificationServiceSpy.show).toHaveBeenCalledWith({
        title: notification.title,
        body: notification.body,
        icon: notification.icon
      });
      expect(component.localNotificationStatus()).toContain('✅');
    });

    it('should request permission when not granted', async () => {
      notificationServiceSpy.checkPermission.and.returnValue(Promise.resolve(false));
      notificationServiceSpy.requestPermission.and.returnValue(Promise.resolve(true));
      notificationServiceSpy.show.and.returnValue(Promise.resolve('test-id'));

      const notification = component.predefinedNotifications[0];
      await component.sendLocalNotification(notification);

      expect(notificationServiceSpy.requestPermission).toHaveBeenCalled();
      expect(notificationServiceSpy.show).toHaveBeenCalled();
    });

    it('should set error status when permission is denied', async () => {
      notificationServiceSpy.checkPermission.and.returnValue(Promise.resolve(false));
      notificationServiceSpy.requestPermission.and.returnValue(Promise.resolve(false));

      const notification = component.predefinedNotifications[0];
      await component.sendLocalNotification(notification);

      expect(notificationServiceSpy.show).not.toHaveBeenCalled();
      expect(component.localNotificationStatus()).toContain('Permission denied');
    });

    it('should handle errors during notification show', async () => {
      notificationServiceSpy.checkPermission.and.returnValue(Promise.resolve(true));
      notificationServiceSpy.show.and.returnValue(Promise.reject('Test error'));

      const notification = component.predefinedNotifications[0];
      await component.sendLocalNotification(notification);

      expect(component.localNotificationStatus()).toContain('❌');
    });
  });

  describe('sendServerNotification', () => {
    it('should send notification via GraphQL mutation', async () => {
      const mockResponse = {
        data: {
          sendNotification: {
            success: true,
            message: 'Notification sent successfully'
          }
        }
      };
      httpClientSpy.post.and.returnValue(of(mockResponse) as any);

      const notification = component.predefinedNotifications[0];
      await component.sendServerNotification(notification);

      expect(httpClientSpy.post).toHaveBeenCalled();
      expect(component.serverNotificationStatus()).toContain('✅');
      expect(component.loading()).toBe(false);
    });

    it('should send titleKey instead of translated title', async () => {
      const mockResponse = {
        data: {
          sendNotification: {
            success: true,
            message: 'Success'
          }
        }
      };
      httpClientSpy.post.and.returnValue(of(mockResponse) as any);

      const notification = component.predefinedNotifications[0];
      await component.sendServerNotification(notification);

      const callArgs = httpClientSpy.post.calls.mostRecent().args;
      const variables = (callArgs[1] as any).variables;
      expect(variables.title).toBe(notification.titleKey);
      expect(variables.body).toBe(notification.bodyKey);
    });

    it('should handle unsuccessful response', async () => {
      const mockResponse = {
        data: {
          sendNotification: {
            success: false,
            message: 'Failed to send'
          }
        }
      };
      httpClientSpy.post.and.returnValue(of(mockResponse) as any);

      const notification = component.predefinedNotifications[0];
      await component.sendServerNotification(notification);

      expect(component.serverNotificationStatus()).toContain('❌');
    });

    it('should handle HTTP errors', async () => {
      httpClientSpy.post.and.returnValue(throwError(() => new Error('Network error')));

      const notification = component.predefinedNotifications[0];
      await component.sendServerNotification(notification);

      expect(component.serverNotificationStatus()).toContain('❌');
      expect(component.loading()).toBe(false);
    });

    it('should include params in data for maintenance notification', async () => {
      const mockResponse = {
        data: {
          sendNotification: {
            success: true,
            message: 'Success'
          }
        }
      };
      httpClientSpy.post.and.returnValue(of(mockResponse) as any);

      const maintenanceNotification = component.predefinedNotifications[2]; // Maintenance notification has params
      await component.sendServerNotification(maintenanceNotification);

      const callArgs = httpClientSpy.post.calls.mostRecent().args;
      const variables = (callArgs[1] as any).variables;
      expect(variables.data).toBeDefined();
      const parsedData = JSON.parse(variables.data);
      expect(parsedData.params).toBeDefined();
      expect(parsedData.params['time']).toBeDefined();
    });

    it('should not include data when no params present', async () => {
      const mockResponse = {
        data: {
          sendNotification: {
            success: true,
            message: 'Success'
          }
        }
      };
      httpClientSpy.post.and.returnValue(of(mockResponse) as any);

      const welcomeNotification = component.predefinedNotifications[0]; // Welcome notification has no params
      await component.sendServerNotification(welcomeNotification);

      const callArgs = httpClientSpy.post.calls.mostRecent().args;
      const variables = (callArgs[1] as any).variables;
      expect(variables.data).toBeUndefined();
    });
  });

  describe('permissionStatus', () => {
    it('should return "Not supported" when notifications are not supported', () => {
      notificationServiceSpy.isSupported.and.returnValue(false);

      expect(component.permissionStatus).toBe('Not supported');
    });

    it('should return "Granted" when permission is granted', () => {
      notificationServiceSpy.isSupported.and.returnValue(true);
      (notificationServiceSpy as any).permissionGranted = signal(true);

      expect(component.permissionStatus).toBe('Granted');
    });

    it('should return "Not granted" when permission is not granted', () => {
      notificationServiceSpy.isSupported.and.returnValue(true);
      (notificationServiceSpy as any).permissionGranted = signal(false);

      expect(component.permissionStatus).toBe('Not granted');
    });
  });

  describe('platformType', () => {
    it('should return "Tauri (Native)" when running in Tauri', () => {
      (window as any).__TAURI__ = {};

      expect(component.platformType).toBe('Tauri (Native)');

      delete (window as any).__TAURI__;
    });

    it('should return "Web/PWA" when not running in Tauri', () => {
      delete (window as any).__TAURI__;

      expect(component.platformType).toBe('Web/PWA');
    });
  });
});
