import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationCenterComponent } from './notification-center.component';
import { NotificationService } from '../../../services/notification.service';
import { signal } from '@angular/core';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { LocalizedStrings } from '../../../models/data.model';

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
      imports: [NotificationCenterComponent, getTranslocoModule()],
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

  describe('getTitle', () => {
    it('should return localized title when localizedTitle is present', () => {
      const notification = {
        id: '1',
        title: 'Fallback Title',
        body: 'Body',
        localizedTitle: { 'en-US': 'Welcome!', es: '¡Bienvenido!' } as LocalizedStrings,
        timestamp: new Date(),
        read: false
      };

      const result = component.getTitle(notification);

      // Should pick English (default lang in tests)
      expect(result).toBe('Welcome!');
    });

    it('should return translated title when titleKey is present', () => {
      const notification = {
        id: '1',
        title: 'Fallback Title',
        body: 'Body',
        titleKey: 'notification.Welcome!',
        params: { name: 'Test' },
        timestamp: new Date(),
        read: false
      };

      const result = component.getTitle(notification);

      // TranslocoService returns the translated value
      expect(result).toBe('Welcome!');
    });

    it('should return original title when titleKey is not present', () => {
      const notification = {
        id: '1',
        title: 'Static Title',
        body: 'Body',
        timestamp: new Date(),
        read: false
      };

      const result = component.getTitle(notification);

      expect(result).toBe('Static Title');
    });

    it('should use empty object when params is undefined', () => {
      const notification = {
        id: '1',
        title: 'Fallback Title',
        body: 'Body',
        titleKey: 'notification.Welcome!',
        // params intentionally omitted to cover || {} branch
        timestamp: new Date(),
        read: false
      };

      const result = component.getTitle(notification);

      expect(result).toBe('Welcome!');
    });

    it('should prioritize localizedTitle over titleKey', () => {
      const notification = {
        id: '1',
        title: 'Fallback Title',
        body: 'Body',
        localizedTitle: { 'en-US': 'Localized Welcome!', es: '¡Bienvenido localizado!' } as LocalizedStrings,
        titleKey: 'notification.Welcome!',
        timestamp: new Date(),
        read: false
      };

      const result = component.getTitle(notification);

      // localizedTitle should take priority
      expect(result).toBe('Localized Welcome!');
    });

    it('should apply param interpolation when localizedTitle has params', () => {
      const notification = {
        id: '1',
        title: 'Fallback Title',
        body: 'Body',
        localizedTitle: { 'en-US': 'Hello {name}!', es: '¡Hola {name}!' } as LocalizedStrings,
        params: { name: 'World' },
        timestamp: new Date(),
        read: false
      };

      const result = component.getTitle(notification);

      // Params are interpolated directly (not via Transloco)
      expect(result).toBe('Hello World!');
    });
  });

  describe('getBody', () => {
    it('should return localized body when localizedBody is present', () => {
      const notification = {
        id: '1',
        title: 'Title',
        body: 'Fallback Body',
        localizedBody: { 'en-US': 'Thanks for trying!', es: '¡Gracias por probar!' } as LocalizedStrings,
        timestamp: new Date(),
        read: false
      };

      const result = component.getBody(notification);

      // Should pick English (default lang in tests)
      expect(result).toBe('Thanks for trying!');
    });

    it('should return translated body when bodyKey is present', () => {
      const notification = {
        id: '1',
        title: 'Title',
        body: 'Fallback Body',
        bodyKey: 'notification.Thanks for trying Angular Momentum—your modern Angular starter kit!',
        params: { name: 'Test' },
        timestamp: new Date(),
        read: false
      };

      const result = component.getBody(notification);

      // TranslocoService returns the translated value
      expect(result).toBe('Thanks for trying Angular Momentum—your modern Angular starter kit!');
    });

    it('should return original body when bodyKey is not present', () => {
      const notification = {
        id: '1',
        title: 'Title',
        body: 'Static Body',
        timestamp: new Date(),
        read: false
      };

      const result = component.getBody(notification);

      expect(result).toBe('Static Body');
    });

    it('should use empty object when params is undefined', () => {
      const notification = {
        id: '1',
        title: 'Title',
        body: 'Fallback Body',
        bodyKey: 'notification.Thanks for trying Angular Momentum—your modern Angular starter kit!',
        // params intentionally omitted to cover || {} branch
        timestamp: new Date(),
        read: false
      };

      const result = component.getBody(notification);

      expect(result).toBe('Thanks for trying Angular Momentum—your modern Angular starter kit!');
    });

    it('should prioritize localizedBody over bodyKey', () => {
      const notification = {
        id: '1',
        title: 'Title',
        body: 'Fallback Body',
        localizedBody: { 'en-US': 'Localized body text!', es: '¡Texto localizado!' } as LocalizedStrings,
        bodyKey: 'notification.Thanks for trying Angular Momentum—your modern Angular starter kit!',
        timestamp: new Date(),
        read: false
      };

      const result = component.getBody(notification);

      // localizedBody should take priority
      expect(result).toBe('Localized body text!');
    });

    it('should apply param interpolation when localizedBody has params', () => {
      const notification = {
        id: '1',
        title: 'Title',
        body: 'Fallback Body',
        localizedBody: { 'en-US': 'Maintenance at {time}', es: 'Mantenimiento a las {time}' } as LocalizedStrings,
        params: { time: '10:00 PM' },
        timestamp: new Date(),
        read: false
      };

      const result = component.getBody(notification);

      // Params are interpolated directly (not via Transloco)
      expect(result).toBe('Maintenance at 10:00 PM');
    });

    it('should keep placeholder when param value is undefined', () => {
      const notification = {
        id: '1',
        title: 'Title',
        body: 'Fallback Body',
        localizedBody: { 'en-US': 'Hello {name}!', es: '¡Hola {name}!' } as LocalizedStrings,
        params: { other: 'value' }, // 'name' param is missing
        timestamp: new Date(),
        read: false
      };

      const result = component.getBody(notification);

      // Placeholder should remain since param is undefined
      expect(result).toBe('Hello {name}!');
    });

    it('should stringify object params', () => {
      const notification = {
        id: '1',
        title: 'Title',
        body: 'Fallback Body',
        localizedBody: { 'en-US': 'Data: {data}', es: 'Datos: {data}' } as LocalizedStrings,
        params: { data: { key: 'value' } },
        timestamp: new Date(),
        read: false
      };

      const result = component.getBody(notification);

      // Object should be JSON stringified
      expect(result).toBe('Data: {"key":"value"}');
    });

    it('should convert numeric params to string', () => {
      const notification = {
        id: '1',
        title: 'Title',
        body: 'Fallback Body',
        localizedBody: { 'en-US': 'Count: {count}', es: 'Cantidad: {count}' } as LocalizedStrings,
        params: { count: 42 },
        timestamp: new Date(),
        read: false
      };

      const result = component.getBody(notification);

      expect(result).toBe('Count: 42');
    });
  });
});
