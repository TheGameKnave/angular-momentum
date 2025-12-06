import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NotificationService } from './notification.service';
import { LogService } from './log.service';
import { SocketIoService } from './socket.io.service';
import { TranslocoService } from '@jsverse/transloco';
import { UserSettingsService } from './user-settings.service';
import { of, throwError } from 'rxjs';
import { Notification, NotificationOptions, LocalizedStrings } from '../models/data.model';
import { signal } from '@angular/core';

describe('NotificationService', () => {
  let service: NotificationService;
  let logServiceSpy: jasmine.SpyObj<LogService>;
  let socketServiceSpy: jasmine.SpyObj<SocketIoService>;
  let translocoServiceSpy: jasmine.SpyObj<TranslocoService>;
  let userSettingsServiceSpy: jasmine.SpyObj<UserSettingsService>;

  beforeEach(() => {
    // Create spies
    logServiceSpy = jasmine.createSpyObj('LogService', ['log']);
    socketServiceSpy = jasmine.createSpyObj('SocketIoService', ['listen']);
    translocoServiceSpy = jasmine.createSpyObj('TranslocoService', ['translate', 'getActiveLang']);
    userSettingsServiceSpy = jasmine.createSpyObj('UserSettingsService', ['loadSettings'], {
      timezone: signal('UTC'),
      settings: signal({ timezone: 'UTC' })
    });

    // Mock socket service to return observable
    socketServiceSpy.listen.and.returnValue(of());

    // Mock transloco to return the key as translation
    translocoServiceSpy.translate.and.callFake((key: any, params?: any) => {
      if (params && params['time']) {
        return `${key} ${params['time']}`;
      }
      return key;
    });
    translocoServiceSpy.getActiveLang.and.returnValue('en-US');

    // Mock localStorage
    const store: { [key: string]: string } = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => store[key] ?? null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      store[key] = value;
    });
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
      delete store[key];
    });

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: LogService, useValue: logServiceSpy },
        { provide: SocketIoService, useValue: socketServiceSpy },
        { provide: TranslocoService, useValue: translocoServiceSpy },
        { provide: UserSettingsService, useValue: userSettingsServiceSpy }
      ]
    });

    // Clean up before each test
    delete (window as any)['__TAURI__'];
    delete (window as any)['Notification'];
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    service = TestBed.inject(NotificationService);
    expect(service).toBeTruthy();
  });

  describe('constructor', () => {
    it('should initialize signals with default values', () => {
      service = TestBed.inject(NotificationService);
      expect(service.permissionGranted()).toBe(false);
      expect(service.notifications()).toEqual([]);
      expect(service.unreadCount()).toBe(0);
    });

    it('should initialize permission state for web notifications synchronously', () => {
      // Mock web notification API
      (window as any)['Notification'] = {
        permission: 'granted'
      };

      service = TestBed.inject(NotificationService);

      expect(service.permissionGranted()).toBe(true);
    });

    it('should not initialize permission state for Tauri (lazy initialization)', () => {
      (window as any)['__TAURI__'] = {};

      service = TestBed.inject(NotificationService);

      // For Tauri, permission should remain false until checkPermission is called
      expect(service.permissionGranted()).toBe(false);
    });

    it('should handle errors during permission initialization gracefully', () => {
      (window as any)['Notification'] = {
        get permission() {
          throw new Error('Permission check failed');
        }
      };

      service = TestBed.inject(NotificationService);

      // Should not throw and permission should remain false
      expect(service.permissionGranted()).toBe(false);

    });

    it('should load notifications from localStorage on init', () => {
      const mockNotifications: Notification[] = [
        {
          id: '1',
          title: 'Test',
          body: 'Test body',
          timestamp: new Date('2024-01-01'),
          read: false
        }
      ];
      localStorage.setItem('app_notifications', JSON.stringify(mockNotifications));

      service = TestBed.inject(NotificationService);

      expect(service.notifications().length).toBe(1);
      expect(service.notifications()[0].title).toBe('Test');
      expect(service.unreadCount()).toBe(1);
    });

    it('should listen for WebSocket notifications', () => {
      service = TestBed.inject(NotificationService);
      expect(socketServiceSpy.listen).toHaveBeenCalledWith('notification');
    });
  });

  describe('isSupported', () => {
    it('should return true for Tauri environment', () => {
      (window as any)['__TAURI__'] = {};
      service = TestBed.inject(NotificationService);
      expect(service.isSupported()).toBe(true);
    });

    it('should return false when notifications are not supported', () => {
      service = TestBed.inject(NotificationService);
      expect(service.isSupported()).toBe(false);
    });
  });

  describe('checkPermission', () => {
    it('should check browser Notification permission when granted', async () => {
      (window as any)['Notification'] = { permission: 'granted' };
      service = TestBed.inject(NotificationService);

      const result = await service.checkPermission();

      expect(result).toBe(true);
      expect(service.permissionGranted()).toBe(true);
    });

    it('should return false when browser permission is denied', async () => {
      (window as any)['Notification'] = { permission: 'denied' };
      service = TestBed.inject(NotificationService);

      const result = await service.checkPermission();

      expect(result).toBe(false);
      expect(service.permissionGranted()).toBe(false);
    });

    it('should return false when Notification API is not available', async () => {
      service = TestBed.inject(NotificationService);

      const result = await service.checkPermission();

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      (window as any)['Notification'] = {
        get permission() {
          throw new Error('Permission check failed');
        }
      };
      service = TestBed.inject(NotificationService);

      const result = await service.checkPermission();

      expect(result).toBe(false);

    });
  });

  describe('requestPermission', () => {
    it('should request browser Notification permission', async () => {
      const mockRequestPermission = jasmine.createSpy('requestPermission').and.returnValue(Promise.resolve('granted'));
      (window as any)['Notification'] = {
        requestPermission: mockRequestPermission
      };
      service = TestBed.inject(NotificationService);

      const result = await service.requestPermission();

      expect(result).toBe(true);
      expect(service.permissionGranted()).toBe(true);
      expect(mockRequestPermission).toHaveBeenCalled();
      expect(logServiceSpy.log).toHaveBeenCalledWith(
        'Web notification permission: granted'
      );
    });

    it('should handle denied browser permission', async () => {
      const mockRequestPermission = jasmine.createSpy('requestPermission').and.returnValue(Promise.resolve('denied'));
      (window as any)['Notification'] = {
        requestPermission: mockRequestPermission
      };
      service = TestBed.inject(NotificationService);

      const result = await service.requestPermission();

      expect(result).toBe(false);
      expect(service.permissionGranted()).toBe(false);
    });

    it('should return false when Notification API is not available', async () => {
      service = TestBed.inject(NotificationService);

      const result = await service.requestPermission();

      expect(result).toBe(false);
    });

    it('should handle permission request errors', async () => {
      const mockRequestPermission = jasmine.createSpy('requestPermission').and.returnValue(Promise.reject(new Error('Request failed')));
      (window as any)['Notification'] = {
        requestPermission: mockRequestPermission
      };
      service = TestBed.inject(NotificationService);

      const result = await service.requestPermission();

      expect(result).toBe(false);

    });
  });

  describe('show', () => {
    it('should add notification to history', async () => {
      service = TestBed.inject(NotificationService);
      spyOn<any>(service, 'checkPermission').and.returnValue(Promise.resolve(false));

      const options: NotificationOptions = {
        title: 'Test Title',
        body: 'Test Body'
      };

      await service.show(options);

      expect(service.notifications().length).toBe(1);
      expect(service.notifications()[0].title).toBe('Test Title');
      expect(service.notifications()[0].body).toBe('Test Body');
      expect(service.notifications()[0].read).toBe(false);
      expect(service.unreadCount()).toBe(1);
    });

    it('should store translation keys and params when provided', async () => {
      service = TestBed.inject(NotificationService);
      spyOn<any>(service, 'checkPermission').and.returnValue(Promise.resolve(false));

      const options: NotificationOptions = {
        title: 'Translated Title',
        body: 'Translated Body',
        titleKey: 'notification.Welcome!',
        bodyKey: 'notification.Thanks for trying Angular Momentum—your modern Angular starter kit!',
        params: { name: 'Test User' }
      };

      await service.show(options);

      const notification = service.notifications()[0];
      expect(notification.titleKey).toBe('notification.Welcome!');
      expect(notification.bodyKey).toBe('notification.Thanks for trying Angular Momentum—your modern Angular starter kit!');
      expect(notification.params).toEqual({ name: 'Test User' });
    });

    it('should store localized strings for re-translation on language change', async () => {
      service = TestBed.inject(NotificationService);
      spyOn<any>(service, 'checkPermission').and.returnValue(Promise.resolve(false));

      const localizedTitle = { 'en-US': 'Welcome!', es: '¡Bienvenido!' } as LocalizedStrings;
      const localizedBody = { 'en-US': 'Hello world', es: 'Hola mundo' } as LocalizedStrings;

      const options: NotificationOptions = {
        title: 'Welcome!',
        body: 'Hello world',
        localizedTitle,
        localizedBody,
        params: { time: '10:00 PM' }
      };

      await service.show(options);

      const notification = service.notifications()[0];
      expect(notification.localizedTitle).toEqual(localizedTitle);
      expect(notification.localizedBody).toEqual(localizedBody);
      expect(notification.params).toEqual({ time: '10:00 PM' });
    });

    it('should return notification ID', async () => {
      service = TestBed.inject(NotificationService);
      spyOn<any>(service, 'checkPermission').and.returnValue(Promise.resolve(false));

      const options: NotificationOptions = {
        title: 'Test Title',
        body: 'Test Body'
      };

      const id = await service.show(options);

      expect(id).toBeTruthy();
      expect(id).toContain('notification_');
    });

    it('should not show notification when permission is not granted', async () => {
      service = TestBed.inject(NotificationService);
      spyOn<any>(service, 'checkPermission').and.returnValue(Promise.resolve(false));

      const options: NotificationOptions = {
        title: 'Test Title',
        body: 'Test Body'
      };

      await service.show(options);

      expect(logServiceSpy.log).toHaveBeenCalledWith(
        'Notification permission not granted'
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', () => {
      service = TestBed.inject(NotificationService);
      const notification: Notification = {
        id: 'test-1',
        title: 'Test',
        body: 'Test body',
        timestamp: new Date(),
        read: false
      };
      service.notifications.set([notification]);
      service.unreadCount.set(1);

      service.markAsRead('test-1');

      expect(service.notifications()[0].read).toBe(true);
      expect(service.unreadCount()).toBe(0);
    });

    it('should not affect other notifications', () => {
      service = TestBed.inject(NotificationService);
      const notifications: Notification[] = [
        { id: '1', title: 'Test 1', body: 'Body 1', timestamp: new Date(), read: false },
        { id: '2', title: 'Test 2', body: 'Body 2', timestamp: new Date(), read: false }
      ];
      service.notifications.set(notifications);

      service.markAsRead('1');

      expect(service.notifications()[0].read).toBe(true);
      expect(service.notifications()[1].read).toBe(false);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', () => {
      service = TestBed.inject(NotificationService);
      const notifications: Notification[] = [
        { id: '1', title: 'Test 1', body: 'Body 1', timestamp: new Date(), read: false },
        { id: '2', title: 'Test 2', body: 'Body 2', timestamp: new Date(), read: false }
      ];
      service.notifications.set(notifications);
      service.unreadCount.set(2);

      service.markAllAsRead();

      expect(service.notifications().every(n => n.read)).toBe(true);
      expect(service.unreadCount()).toBe(0);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification by id', () => {
      service = TestBed.inject(NotificationService);
      const notifications: Notification[] = [
        { id: '1', title: 'Test 1', body: 'Body 1', timestamp: new Date(), read: false },
        { id: '2', title: 'Test 2', body: 'Body 2', timestamp: new Date(), read: false }
      ];
      service.notifications.set(notifications);

      service.deleteNotification('1');

      expect(service.notifications().length).toBe(1);
      expect(service.notifications()[0].id).toBe('2');
    });
  });

  describe('clearAll', () => {
    it('should clear all notifications', () => {
      service = TestBed.inject(NotificationService);
      const notifications: Notification[] = [
        { id: '1', title: 'Test 1', body: 'Body 1', timestamp: new Date(), read: false },
        { id: '2', title: 'Test 2', body: 'Body 2', timestamp: new Date(), read: false }
      ];
      service.notifications.set(notifications);
      service.unreadCount.set(2);

      service.clearAll();

      expect(service.notifications().length).toBe(0);
      expect(service.unreadCount()).toBe(0);
    });
  });

  describe('localStorage operations', () => {
    it('should save notifications to localStorage', () => {
      service = TestBed.inject(NotificationService);
      const notification: Notification = {
        id: 'test-1',
        title: 'Test',
        body: 'Test body',
        timestamp: new Date(),
        read: false
      };

      service.notifications.set([notification]);
      service['saveNotificationsToStorage']();

      const stored = localStorage.getItem('app_notifications');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.length).toBe(1);
      expect(parsed[0].title).toBe('Test');
    });

    it('should limit saved notifications to 100', () => {
      service = TestBed.inject(NotificationService);
      const notifications: Notification[] = [];
      for (let i = 0; i < 150; i++) {
        notifications.push({
          id: `test-${i}`,
          title: `Test ${i}`,
          body: 'Body',
          timestamp: new Date(),
          read: false
        });
      }

      service.notifications.set(notifications);
      service['saveNotificationsToStorage']();

      const stored = localStorage.getItem('app_notifications');
      const parsed = JSON.parse(stored!);
      expect(parsed.length).toBe(100);
    });


    it('should convert timestamp strings to Date objects when loading', () => {
      const mockNotifications = [
        {
          id: '1',
          title: 'Test',
          body: 'Body',
          timestamp: '2024-01-01T00:00:00.000Z',
          read: false
        }
      ];
      localStorage.setItem('app_notifications', JSON.stringify(mockNotifications));

      service = TestBed.inject(NotificationService);

      expect(service.notifications()[0].timestamp instanceof Date).toBe(true);
    });
  });

  describe('WebSocket notification handling', () => {
    it('should handle incoming WebSocket notifications and store translation keys', fakeAsync(() => {
      const mockNotification: NotificationOptions = {
        title: 'notification.title.key',
        body: 'notification.body.key',
        icon: '/icon.png'
      };

      // Return different observables based on event type
      socketServiceSpy.listen.and.callFake((event) => {
        if (event === 'notification') {
          return of(mockNotification) as any;
        }
        return of() as any; // Empty observable for other events
      });
      const showSpy = spyOn(NotificationService.prototype, 'show').and.returnValue(Promise.resolve('test-id'));

      service = TestBed.inject(NotificationService);
      tick();

      expect(translocoServiceSpy.translate).toHaveBeenCalledWith('notification.title.key', {});
      expect(translocoServiceSpy.translate).toHaveBeenCalledWith('notification.body.key', {});

      // Verify that the show method receives both keys and translated values
      const showCallArg = showSpy.calls.mostRecent().args[0] as NotificationOptions;
      expect(showCallArg.titleKey).toBe('notification.title.key');
      expect(showCallArg.bodyKey).toBe('notification.body.key');
    }));

    it('should handle notifications with params and format time', fakeAsync(() => {
      const mockNotification: NotificationOptions = {
        title: 'notification.title.key',
        body: 'notification.body.key',
        data: {
          params: {
            time: '2024-01-01T00:00:00.000Z'
          }
        }
      };

      socketServiceSpy.listen.and.callFake((event) => {
        if (event === 'notification') {
          return of(mockNotification) as any;
        }
        return of() as any;
      });
      spyOn(NotificationService.prototype, 'show').and.returnValue(Promise.resolve('test-id'));

      service = TestBed.inject(NotificationService);
      tick();

      expect(translocoServiceSpy.translate).toHaveBeenCalledWith(
        'notification.title.key',
        jasmine.objectContaining({ time: jasmine.any(String) })
      );
    }));

    it('should handle notifications with non-object data', fakeAsync(() => {
      const mockNotification: NotificationOptions = {
        title: 'notification.title.key',
        body: 'notification.body.key',
        data: 'string-data'
      };

      socketServiceSpy.listen.and.callFake((event) => {
        if (event === 'notification') {
          return of(mockNotification) as any;
        }
        return of() as any;
      });
      spyOn(NotificationService.prototype, 'show').and.returnValue(Promise.resolve('test-id'));

      service = TestBed.inject(NotificationService);
      tick();

      expect(translocoServiceSpy.translate).toHaveBeenCalledWith('notification.title.key', {});
      expect(translocoServiceSpy.translate).toHaveBeenCalledWith('notification.body.key', {});
    }));

    it('should handle notifications with params but no time field', fakeAsync(() => {
      const mockNotification: NotificationOptions = {
        title: 'notification.title.key',
        body: 'notification.body.key',
        data: {
          params: {
            otherField: 'value'
          }
        }
      };

      socketServiceSpy.listen.and.callFake((event) => {
        if (event === 'notification') {
          return of(mockNotification) as any;
        }
        return of() as any;
      });
      spyOn(NotificationService.prototype, 'show').and.returnValue(Promise.resolve('test-id'));

      service = TestBed.inject(NotificationService);
      tick();

      expect(translocoServiceSpy.translate).toHaveBeenCalledWith(
        'notification.title.key',
        jasmine.objectContaining({ otherField: 'value' })
      );
    }));

    it('should use detected timezone when settings has no timezone', fakeAsync(() => {
      // Create a new mock with settings that has no timezone
      const settingsSignalWithoutTimezone = signal({ id: '123' } as any);
      const mockUserSettingsWithoutTimezone = jasmine.createSpyObj('UserSettingsService', ['loadSettings', 'detectTimezone'], {
        timezone: signal(undefined),
        settings: settingsSignalWithoutTimezone
      });
      mockUserSettingsWithoutTimezone.detectTimezone.and.returnValue('America/New_York');

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          NotificationService,
          { provide: LogService, useValue: logServiceSpy },
          { provide: SocketIoService, useValue: socketServiceSpy },
          { provide: TranslocoService, useValue: translocoServiceSpy },
          { provide: UserSettingsService, useValue: mockUserSettingsWithoutTimezone }
        ]
      });

      const mockNotification: NotificationOptions = {
        title: 'notification.title.key',
        body: 'notification.body.key',
        data: {
          params: {
            time: '2024-01-01T00:00:00.000Z'
          }
        }
      };

      socketServiceSpy.listen.and.callFake((event) => {
        if (event === 'notification') {
          return of(mockNotification) as any;
        }
        return of() as any;
      });
      spyOn(NotificationService.prototype, 'show').and.returnValue(Promise.resolve('test-id'));

      service = TestBed.inject(NotificationService);
      tick();

      expect(mockUserSettingsWithoutTimezone.detectTimezone).toHaveBeenCalled();
    }));

    it('should handle invalid timezone gracefully', fakeAsync(() => {
      // Create mock with invalid timezone
      const settingsSignalInvalidTimezone = signal({ timezone: 'Invalid/Timezone' } as any);
      const mockUserSettingsInvalidTimezone = jasmine.createSpyObj('UserSettingsService', ['loadSettings', 'detectTimezone'], {
        timezone: signal('Invalid/Timezone'),
        settings: settingsSignalInvalidTimezone
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          NotificationService,
          { provide: LogService, useValue: logServiceSpy },
          { provide: SocketIoService, useValue: socketServiceSpy },
          { provide: TranslocoService, useValue: translocoServiceSpy },
          { provide: UserSettingsService, useValue: mockUserSettingsInvalidTimezone }
        ]
      });

      const mockNotification: NotificationOptions = {
        title: 'notification.title.key',
        body: 'notification.body.key',
        data: {
          params: {
            time: '2024-01-01T00:00:00.000Z'
          }
        }
      };

      socketServiceSpy.listen.and.callFake((event) => {
        if (event === 'notification') {
          return of(mockNotification) as any;
        }
        return of() as any;
      });
      spyOn(NotificationService.prototype, 'show').and.returnValue(Promise.resolve('test-id'));

      service = TestBed.inject(NotificationService);
      tick();

    }));

    it('should handle WebSocket errors', fakeAsync(() => {
      const error = new Error('WebSocket error');
      socketServiceSpy.listen.and.returnValue(throwError(() => error));

      service = TestBed.inject(NotificationService);
      tick();

    }));
  });

  describe('showTestNotification', () => {
    it('should show a test notification', async () => {
      service = TestBed.inject(NotificationService);
      spyOn(service, 'show').and.returnValue(Promise.resolve('test-id'));

      await service.showTestNotification();

      expect(service.show).toHaveBeenCalledWith({
        title: 'Test Notification',
        body: 'This is a test notification from Angular Momentum!',
        icon: '/assets/icons/icon-192x192.png',
        data: { type: 'test' }
      });
    });
  });

  describe('Localized notification handling', () => {
    it('should handle incoming localized notifications and store all language variants', fakeAsync(() => {
      const mockLocalizedTitle = { 'en-US': 'Welcome!', es: '¡Bienvenido!' } as LocalizedStrings;
      const mockLocalizedBody = { 'en-US': 'Hello world', es: 'Hola mundo' } as LocalizedStrings;
      const mockLocalizedPayload = {
        title: mockLocalizedTitle,
        body: mockLocalizedBody,
        label: { 'en-US': 'Welcome', es: 'Bienvenida' } as LocalizedStrings,
      };

      socketServiceSpy.listen.and.callFake((event) => {
        if (event === 'localized-notification') {
          return of(mockLocalizedPayload) as any;
        }
        return of() as any;
      });
      const showSpy = spyOn(NotificationService.prototype, 'show').and.returnValue(Promise.resolve('test-id'));
      translocoServiceSpy.getActiveLang.and.returnValue('en-US');

      service = TestBed.inject(NotificationService);
      tick();

      expect(logServiceSpy.log).toHaveBeenCalledWith('Received localized notification from WebSocket', mockLocalizedPayload);
      const showCallArg = showSpy.calls.mostRecent().args[0];
      expect(showCallArg.title).toBe('Welcome!');
      expect(showCallArg.body).toBe('Hello world');
      expect(showCallArg.icon).toBeUndefined();
      // Verify all language variants are stored for re-translation on language change
      expect(showCallArg.localizedTitle).toEqual(mockLocalizedTitle);
      expect(showCallArg.localizedBody).toEqual(mockLocalizedBody);
    }));

    it('should use German translation when locale is de', fakeAsync(() => {
      const mockLocalizedPayload = {
        title: { 'en-US': 'Welcome!', 'en-GB': 'Welcome!', de: 'Willkommen!' },
        body: { 'en-US': 'Hello world', 'en-GB': 'Hello world', de: 'Hallo Welt' },
        label: { 'en-US': 'Welcome', 'en-GB': 'Welcome', de: 'Willkommen' }
      };

      socketServiceSpy.listen.and.callFake((event) => {
        if (event === 'localized-notification') {
          return of(mockLocalizedPayload) as any;
        }
        return of() as any;
      });
      const showSpy = spyOn(NotificationService.prototype, 'show').and.returnValue(Promise.resolve('test-id'));
      translocoServiceSpy.getActiveLang.and.returnValue('de');

      service = TestBed.inject(NotificationService);
      tick();

      const showCallArg = showSpy.calls.mostRecent().args[0];
      expect(showCallArg.title).toBe('Willkommen!');
      expect(showCallArg.body).toBe('Hallo Welt');
    }));

    it('should fall back to English when locale is not available', fakeAsync(() => {
      const mockLocalizedPayload = {
        title: { 'en-US': 'Welcome!', 'en-GB': 'Welcome!' },
        body: { 'en-US': 'Hello world', 'en-GB': 'Hello world' },
        label: { 'en-US': 'Welcome', 'en-GB': 'Welcome' }
      };

      socketServiceSpy.listen.and.callFake((event) => {
        if (event === 'localized-notification') {
          return of(mockLocalizedPayload) as any;
        }
        return of() as any;
      });
      const showSpy = spyOn(NotificationService.prototype, 'show').and.returnValue(Promise.resolve('test-id'));
      translocoServiceSpy.getActiveLang.and.returnValue('fr'); // French not available

      service = TestBed.inject(NotificationService);
      tick();

      const showCallArg = showSpy.calls.mostRecent().args[0];
      expect(showCallArg.title).toBe('Welcome!'); // Falls back to English
      expect(showCallArg.body).toBe('Hello world');
    }));

    it('should fall back to empty string when neither locale nor English is available', fakeAsync(() => {
      const mockLocalizedPayload = {
        title: { de: 'Willkommen!' }, // Only German, no English
        body: { de: 'Hallo Welt' },
        label: { de: 'Willkommen' }
      };

      socketServiceSpy.listen.and.callFake((event) => {
        if (event === 'localized-notification') {
          return of(mockLocalizedPayload) as any;
        }
        return of() as any;
      });
      const showSpy = spyOn(NotificationService.prototype, 'show').and.returnValue(Promise.resolve('test-id'));
      translocoServiceSpy.getActiveLang.and.returnValue('fr'); // French not available, English not available either

      service = TestBed.inject(NotificationService);
      tick();

      const showCallArg = showSpy.calls.mostRecent().args[0];
      expect(showCallArg.title).toBe(''); // Falls back to empty string
      expect(showCallArg.body).toBe('');
    }));

    it('should handle localized notifications with params', fakeAsync(() => {
      const mockLocalizedPayload = {
        title: { 'en-US': 'Maintenance', 'en-GB': 'Maintenance' },
        body: { 'en-US': 'Server maintenance at {time}', 'en-GB': 'Server maintenance at {time}' },
        label: { 'en-US': 'Maintenance', 'en-GB': 'Maintenance' },
        params: { time: '2024-01-01T00:00:00.000Z' }
      };

      socketServiceSpy.listen.and.callFake((event) => {
        if (event === 'localized-notification') {
          return of(mockLocalizedPayload) as any;
        }
        return of() as any;
      });
      const showSpy = spyOn(NotificationService.prototype, 'show').and.returnValue(Promise.resolve('test-id'));
      translocoServiceSpy.getActiveLang.and.returnValue('en-US');

      service = TestBed.inject(NotificationService);
      tick();

      // Verify translate was called with params
      expect(translocoServiceSpy.translate).toHaveBeenCalledWith(
        'Maintenance',
        jasmine.objectContaining({ time: jasmine.any(String) })
      );
    }));

    it('should handle localized notifications without params', fakeAsync(() => {
      const mockLocalizedPayload = {
        title: { 'en-US': 'Simple notification', 'en-GB': 'Simple notification' },
        body: { 'en-US': 'No params here', 'en-GB': 'No params here' },
        label: { 'en-US': 'Info', 'en-GB': 'Info' }
        // No params
      };

      socketServiceSpy.listen.and.callFake((event) => {
        if (event === 'localized-notification') {
          return of(mockLocalizedPayload) as any;
        }
        return of() as any;
      });
      const showSpy = spyOn(NotificationService.prototype, 'show').and.returnValue(Promise.resolve('test-id'));
      translocoServiceSpy.getActiveLang.and.returnValue('en-US');

      service = TestBed.inject(NotificationService);
      tick();

      const showCallArg = showSpy.calls.mostRecent().args[0];
      expect(showCallArg.title).toBe('Simple notification');
      expect(showCallArg.body).toBe('No params here');
    }));

    it('should log errors when localized notification subscription fails', fakeAsync(() => {
      const testError = new Error('Connection failed');

      socketServiceSpy.listen.and.callFake((event) => {
        if (event === 'localized-notification') {
          return throwError(() => testError) as any;
        }
        return of() as any;
      });

      service = TestBed.inject(NotificationService);
      tick();

      expect(logServiceSpy.log).toHaveBeenCalledWith('Error receiving localized notification', testError);
    }));
  });
});
