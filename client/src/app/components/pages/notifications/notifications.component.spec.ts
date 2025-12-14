import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NotificationsComponent } from './notifications.component';
import { NotificationService } from '@app/services/notification.service';
import { GraphqlService, NotificationResult } from '@app/services/graphql.service';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NOTIFICATION_IDS } from '@app/constants/translations.constants';

describe('NotificationsComponent', () => {
  let component: NotificationsComponent;
  let fixture: ComponentFixture<NotificationsComponent>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let graphqlServiceSpy: jasmine.SpyObj<GraphqlService>;

  beforeEach(waitForAsync(() => {
    notificationServiceSpy = jasmine.createSpyObj('NotificationService', [
      'checkPermission',
      'requestPermission',
      'show',
      'isSupported'
    ]);
    graphqlServiceSpy = jasmine.createSpyObj('GraphqlService', ['sendLocalizedNotification']);

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
        provideNoopAnimations(),
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: GraphqlService, useValue: graphqlServiceSpy }
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

    it('should have id property for each notification', () => {
      const notifications = component.predefinedNotifications;
      notifications.forEach(notification => {
        expect(notification.id).toBeDefined();
      });
    });

    it('should have correct notification IDs', () => {
      const notifications = component.predefinedNotifications;
      expect(notifications[0].id).toBe(NOTIFICATION_IDS.WELCOME);
      expect(notifications[1].id).toBe(NOTIFICATION_IDS.FEATURE_UPDATE);
      expect(notifications[2].id).toBe(NOTIFICATION_IDS.MAINTENANCE);
      expect(notifications[3].id).toBe(NOTIFICATION_IDS.ACHIEVEMENT);
    });

    it('should have params for maintenance notification', () => {
      const maintenanceNotification = component.predefinedNotifications[2];
      expect(maintenanceNotification.params).toBeDefined();
      expect(maintenanceNotification.params!['time']).toBeDefined();
    });
  });

  describe('helper methods', () => {
    it('should return translated title via getTitle', () => {
      const notification = component.predefinedNotifications[0];
      const title = component.getTitle(notification);
      expect(title).toBeDefined();
      expect(typeof title).toBe('string');
    });

    it('should return translated body via getBody', () => {
      const notification = component.predefinedNotifications[0];
      const body = component.getBody(notification);
      expect(body).toBeDefined();
      expect(typeof body).toBe('string');
    });

    it('should return translated body with params for maintenance', () => {
      const notification = component.predefinedNotifications[2]; // maintenance
      const body = component.getBody(notification);
      expect(body).toBeDefined();
      expect(typeof body).toBe('string');
    });

    it('should return translated label via getLabel', () => {
      const notification = component.predefinedNotifications[0];
      const label = component.getLabel(notification);
      expect(label).toBeDefined();
      expect(typeof label).toBe('string');
    });

    it('should return correct severity via getSeverity', () => {
      expect(component.getSeverity(component.predefinedNotifications[0])).toBe('success');
      expect(component.getSeverity(component.predefinedNotifications[1])).toBe('info');
      expect(component.getSeverity(component.predefinedNotifications[2])).toBe('warn');
      expect(component.getSeverity(component.predefinedNotifications[3])).toBe('secondary');
    });
  });

  describe('sendLocalNotification', () => {
    it('should send notification when permission is granted', async () => {
      notificationServiceSpy.checkPermission.and.returnValue(Promise.resolve(true));
      notificationServiceSpy.show.and.returnValue(Promise.resolve('test-id'));

      const notification = component.predefinedNotifications[0];
      await component.sendLocalNotification(notification);

      expect(notificationServiceSpy.show).toHaveBeenCalledWith({
        title: component.getTitle(notification),
        body: component.getBody(notification),
        icon: '/assets/icons/icon-192x192.png'
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
    it('should send notification via GraphQL service', async () => {
      const mockResult: NotificationResult = {
        success: true,
        message: 'Localized notification sent to all clients'
      };
      graphqlServiceSpy.sendLocalizedNotification.and.returnValue(of(mockResult));

      const notification = component.predefinedNotifications[0];
      await component.sendServerNotification(notification);

      expect(graphqlServiceSpy.sendLocalizedNotification).toHaveBeenCalledWith(notification.id, undefined);
      expect(component.serverNotificationStatus()).toContain('✅');
      expect(component.loading()).toBe(false);
    });

    it('should send notification id to GraphQL service', async () => {
      const mockResult: NotificationResult = { success: true, message: 'Success' };
      graphqlServiceSpy.sendLocalizedNotification.and.returnValue(of(mockResult));

      const notification = component.predefinedNotifications[0];
      await component.sendServerNotification(notification);

      expect(graphqlServiceSpy.sendLocalizedNotification).toHaveBeenCalledWith(notification.id, undefined);
    });

    it('should handle unsuccessful response', async () => {
      const mockResult: NotificationResult = {
        success: false,
        message: 'Failed to send'
      };
      graphqlServiceSpy.sendLocalizedNotification.and.returnValue(of(mockResult));

      const notification = component.predefinedNotifications[0];
      await component.sendServerNotification(notification);

      expect(component.serverNotificationStatus()).toContain('❌');
      expect(component.serverNotificationStatus()).toContain('Failed to send');
    });

    it('should handle errors', async () => {
      graphqlServiceSpy.sendLocalizedNotification.and.returnValue(throwError(() => new Error('Network error')));

      const notification = component.predefinedNotifications[0];
      await component.sendServerNotification(notification);

      expect(component.serverNotificationStatus()).toContain('❌');
      expect(component.loading()).toBe(false);
    });

    it('should include params for maintenance notification', async () => {
      const mockResult: NotificationResult = { success: true, message: 'Success' };
      graphqlServiceSpy.sendLocalizedNotification.and.returnValue(of(mockResult));

      const maintenanceNotification = component.predefinedNotifications[2]; // Maintenance notification has params
      await component.sendServerNotification(maintenanceNotification);

      expect(graphqlServiceSpy.sendLocalizedNotification).toHaveBeenCalledWith(
        maintenanceNotification.id,
        maintenanceNotification.params
      );
    });

    it('should not include params when no params present', async () => {
      const mockResult: NotificationResult = { success: true, message: 'Success' };
      graphqlServiceSpy.sendLocalizedNotification.and.returnValue(of(mockResult));

      const welcomeNotification = component.predefinedNotifications[0]; // Welcome notification has no params
      await component.sendServerNotification(welcomeNotification);

      expect(graphqlServiceSpy.sendLocalizedNotification).toHaveBeenCalledWith(welcomeNotification.id, undefined);
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
