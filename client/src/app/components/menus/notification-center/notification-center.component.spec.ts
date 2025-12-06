import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationCenterComponent } from './notification-center.component';
import { NotificationService } from '../../../services/notification.service';
import { signal } from '@angular/core';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';

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

  describe('getTitle', () => {
    it('should return localized title when localizedTitle is present', () => {
      const notification = {
        id: '1',
        title: 'Fallback Title',
        body: 'Body',
        localizedTitle: {
          en: 'Welcome!',
          de: 'Willkommen!',
          fr: 'Bienvenue !',
          es: '¡Bienvenido!',
          'zh-CN': '欢迎！',
          'zh-TW': '歡迎！'
        },
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
        localizedTitle: {
          en: 'Localized Welcome!',
          de: 'Lokalisiertes Willkommen!',
          fr: 'Bienvenue localisée !',
          es: '¡Bienvenido localizado!',
          'zh-CN': '本地化欢迎！',
          'zh-TW': '本地化歡迎！'
        },
        titleKey: 'notification.Welcome!',
        timestamp: new Date(),
        read: false
      };

      const result = component.getTitle(notification);

      // localizedTitle should take priority
      expect(result).toBe('Localized Welcome!');
    });

    it('should apply ICU formatting when localizedTitle has params', () => {
      const notification = {
        id: '1',
        title: 'Fallback Title',
        body: 'Body',
        localizedTitle: {
          en: 'Hello {name}!',
          de: 'Hallo {name}!',
          fr: 'Bonjour {name} !',
          es: '¡Hola {name}!',
          'zh-CN': '你好 {name}！',
          'zh-TW': '你好 {name}！'
        },
        params: { name: 'World' },
        timestamp: new Date(),
        read: false
      };

      const result = component.getTitle(notification);

      // TranslocoService.translate is called with the localized text and params
      expect(result).toBe('Hello {name}!');
    });
  });

  describe('getBody', () => {
    it('should return localized body when localizedBody is present', () => {
      const notification = {
        id: '1',
        title: 'Title',
        body: 'Fallback Body',
        localizedBody: {
          en: 'Thanks for trying!',
          de: 'Danke fürs Ausprobieren!',
          fr: 'Merci d\'essayer !',
          es: '¡Gracias por probar!',
          'zh-CN': '感谢您的试用！',
          'zh-TW': '感謝您的試用！'
        },
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
        localizedBody: {
          en: 'Localized body text!',
          de: 'Lokalisierter Text!',
          fr: 'Texte localisé !',
          es: '¡Texto localizado!',
          'zh-CN': '本地化文本！',
          'zh-TW': '本地化文本！'
        },
        bodyKey: 'notification.Thanks for trying Angular Momentum—your modern Angular starter kit!',
        timestamp: new Date(),
        read: false
      };

      const result = component.getBody(notification);

      // localizedBody should take priority
      expect(result).toBe('Localized body text!');
    });

    it('should apply ICU formatting when localizedBody has params', () => {
      const notification = {
        id: '1',
        title: 'Title',
        body: 'Fallback Body',
        localizedBody: {
          en: 'Maintenance at {time}',
          de: 'Wartung um {time}',
          fr: 'Maintenance à {time}',
          es: 'Mantenimiento a las {time}',
          'zh-CN': '维护时间 {time}',
          'zh-TW': '維護時間 {time}'
        },
        params: { time: '10:00 PM' },
        timestamp: new Date(),
        read: false
      };

      const result = component.getBody(notification);

      // TranslocoService.translate is called with the localized text and params
      expect(result).toBe('Maintenance at {time}');
    });
  });
});
