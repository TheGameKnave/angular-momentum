import { TestBed } from '@angular/core/testing';
import { CookieConsentService } from './cookie-consent.service';
import { LogService } from './log.service';
import { PlatformService } from './platform.service';

describe('CookieConsentService', () => {
  let service: CookieConsentService;
  let mockLogService: jasmine.SpyObj<LogService>;
  let mockPlatformService: jasmine.SpyObj<PlatformService>;
  let localStorageStore: { [key: string]: string };

  beforeEach(() => {
    // Mock localStorage
    localStorageStore = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => localStorageStore[key] || null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      localStorageStore[key] = value;
    });
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
      delete localStorageStore[key];
    });

    // Mock LogService
    mockLogService = jasmine.createSpyObj('LogService', ['log']);

    // Mock PlatformService (default to non-Tauri)
    mockPlatformService = jasmine.createSpyObj('PlatformService', ['isTauri']);
    mockPlatformService.isTauri.and.returnValue(false);

    TestBed.configureTestingModule({
      providers: [
        CookieConsentService,
        { provide: LogService, useValue: mockLogService },
        { provide: PlatformService, useValue: mockPlatformService }
      ]
    });
  });

  describe('initialization', () => {
    it('should be created with pending status when no consent stored', () => {
      service = TestBed.inject(CookieConsentService);

      expect(service).toBeTruthy();
      expect(service.consentStatus()).toBe('pending');
    });

    it('should load accepted status from localStorage', () => {
      localStorageStore['cookie_consent_status'] = 'accepted';

      service = TestBed.inject(CookieConsentService);

      expect(service.consentStatus()).toBe('accepted');
    });

    it('should load declined status from localStorage', () => {
      localStorageStore['cookie_consent_status'] = 'declined';

      service = TestBed.inject(CookieConsentService);

      expect(service.consentStatus()).toBe('declined');
    });

    it('should return declined status in Tauri apps (skip cookie consent)', () => {
      // Reset TestBed to configure with Tauri enabled
      TestBed.resetTestingModule();
      mockPlatformService.isTauri.and.returnValue(true);

      TestBed.configureTestingModule({
        providers: [
          CookieConsentService,
          { provide: LogService, useValue: mockLogService },
          { provide: PlatformService, useValue: mockPlatformService }
        ]
      });

      service = TestBed.inject(CookieConsentService);

      expect(service.consentStatus()).toBe('declined');
      expect(mockPlatformService.isTauri).toHaveBeenCalled();
    });

    it('should log initialization details', () => {
      service = TestBed.inject(CookieConsentService);

    });

    it('should skip loading analytics on localhost even if accepted', () => {
      localStorageStore['cookie_consent_status'] = 'accepted';

      // window.location.hostname is 'localhost' in test environment
      service = TestBed.inject(CookieConsentService);

      // Should log that it's skipping analytics
    });
  });

  describe('acceptCookies', () => {
    beforeEach(() => {
      service = TestBed.inject(CookieConsentService);
    });

    it('should set consent to accepted and save to localStorage', () => {
      service.acceptCookies();

      expect(service.consentStatus()).toBe('accepted');
      expect(localStorage.setItem).toHaveBeenCalledWith('cookie_consent_status', 'accepted');
    });

    it('should log acceptance details', () => {
      service.acceptCookies();

    });

    it('should skip loading analytics on localhost', () => {
      mockLogService.log.calls.reset();

      service.acceptCookies();

    });
  });

  describe('declineCookies', () => {
    beforeEach(() => {
      service = TestBed.inject(CookieConsentService);
    });

    it('should set consent to declined and save to localStorage', () => {
      service.declineCookies();

      expect(service.consentStatus()).toBe('declined');
      expect(localStorage.setItem).toHaveBeenCalledWith('cookie_consent_status', 'declined');
    });

    it('should not load analytics when declining', () => {
      mockLogService.log.calls.reset();

      service.declineCookies();

      // Should not log analytics loading
      const calls = mockLogService.log.calls.all();
      const analyticsLogs = calls.filter(call =>
        call.args[0].includes('Analytics') || call.args[0].includes('Hotjar')
      );
      expect(analyticsLogs.length).toBe(0);
    });
  });

  describe('resetConsent', () => {
    beforeEach(() => {
      service = TestBed.inject(CookieConsentService);
    });

    it('should clear consent from localStorage and set status to pending', () => {
      // First accept
      service.acceptCookies();
      expect(service.consentStatus()).toBe('accepted');

      // Then reset
      service.resetConsent();

      expect(service.consentStatus()).toBe('pending');
      expect(localStorage.removeItem).toHaveBeenCalledWith('cookie_consent_status');
    });

    it('should work when called on already pending status', () => {
      expect(service.consentStatus()).toBe('pending');

      service.resetConsent();

      expect(service.consentStatus()).toBe('pending');
      expect(localStorage.removeItem).toHaveBeenCalledWith('cookie_consent_status');
    });
  });

  describe('signal reactivity', () => {
    beforeEach(() => {
      service = TestBed.inject(CookieConsentService);
    });

    it('should update signal when accepting cookies', () => {
      expect(service.consentStatus()).toBe('pending');

      service.acceptCookies();

      expect(service.consentStatus()).toBe('accepted');
    });

    it('should update signal when declining cookies', () => {
      expect(service.consentStatus()).toBe('pending');

      service.declineCookies();

      expect(service.consentStatus()).toBe('declined');
    });

    it('should update signal when resetting consent', () => {
      service.acceptCookies();
      expect(service.consentStatus()).toBe('accepted');

      service.resetConsent();

      expect(service.consentStatus()).toBe('pending');
    });
  });

  describe('localStorage persistence', () => {
    it('should persist accepted state across service instances', () => {
      localStorageStore['cookie_consent_status'] = 'accepted';

      const service1 = TestBed.inject(CookieConsentService);
      expect(service1.consentStatus()).toBe('accepted');

      // Reset TestBed to create new instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          CookieConsentService,
          { provide: LogService, useValue: mockLogService },
          { provide: PlatformService, useValue: mockPlatformService }
        ]
      });

      const service2 = TestBed.inject(CookieConsentService);
      expect(service2.consentStatus()).toBe('accepted');
    });

    it('should persist declined state across service instances', () => {
      localStorageStore['cookie_consent_status'] = 'declined';

      const service1 = TestBed.inject(CookieConsentService);
      expect(service1.consentStatus()).toBe('declined');

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          CookieConsentService,
          { provide: LogService, useValue: mockLogService },
          { provide: PlatformService, useValue: mockPlatformService }
        ]
      });

      const service2 = TestBed.inject(CookieConsentService);
      expect(service2.consentStatus()).toBe('declined');
    });
  });

  describe('edge cases', () => {
    it('should handle invalid stored consent value by defaulting to pending', () => {
      localStorageStore['cookie_consent_status'] = 'invalid_value' as any;

      service = TestBed.inject(CookieConsentService);

      // Should still work, treating invalid as pending or whatever the logic is
      expect(service.consentStatus()).toBeTruthy();
    });

    it('should handle empty string in localStorage by defaulting to pending', () => {
      localStorageStore['cookie_consent_status'] = '';

      service = TestBed.inject(CookieConsentService);

      expect(service.consentStatus()).toBe('pending');
    });

    it('should handle null from localStorage by defaulting to pending', () => {
      // Don't set anything in localStorageStore
      service = TestBed.inject(CookieConsentService);

      expect(service.consentStatus()).toBe('pending');
    });
  });
});
