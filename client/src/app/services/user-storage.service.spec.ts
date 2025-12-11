import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { UserStorageService, STORAGE_PREFIXES } from './user-storage.service';
import { AuthService } from './auth.service';

describe('UserStorageService', () => {
  let service: UserStorageService;
  let mockCurrentUser: ReturnType<typeof signal<{ id: string } | null>>;
  let mockIsAuthenticated: ReturnType<typeof signal<boolean>>;

  beforeEach(() => {
    mockCurrentUser = signal<{ id: string } | null>(null);
    mockIsAuthenticated = signal(false);

    const mockAuthService = {
      currentUser: mockCurrentUser,
      isAuthenticated: mockIsAuthenticated,
    };

    TestBed.configureTestingModule({
      providers: [
        UserStorageService,
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    service = TestBed.inject(UserStorageService);
  });

  describe('STORAGE_PREFIXES', () => {
    it('should have ANONYMOUS prefix', () => {
      expect(STORAGE_PREFIXES.ANONYMOUS).toBe('anonymous');
    });

    it('should have USER prefix', () => {
      expect(STORAGE_PREFIXES.USER).toBe('user');
    });
  });

  describe('storagePrefix', () => {
    it('should return anonymous for unauthenticated users', () => {
      mockCurrentUser.set(null);
      expect(service.storagePrefix()).toBe('anonymous');
    });

    it('should return user prefix with ID for authenticated users', () => {
      mockCurrentUser.set({ id: 'user-123' });
      expect(service.storagePrefix()).toBe('user_user-123');
    });

    it('should return anonymous when user has no ID', () => {
      mockCurrentUser.set({ id: '' } as any);
      expect(service.storagePrefix()).toBe('anonymous');
    });
  });

  describe('getUserId', () => {
    it('should return null for unauthenticated users', () => {
      mockCurrentUser.set(null);
      expect(service.getUserId()).toBeNull();
    });

    it('should return user ID for authenticated users', () => {
      mockCurrentUser.set({ id: 'user-456' });
      expect(service.getUserId()).toBe('user-456');
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when not authenticated', () => {
      mockIsAuthenticated.set(false);
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should return true when authenticated', () => {
      mockIsAuthenticated.set(true);
      expect(service.isAuthenticated()).toBe(true);
    });
  });

  describe('prefixKey', () => {
    it('should prefix with anonymous for unauthenticated users', () => {
      mockCurrentUser.set(null);
      expect(service.prefixKey('app_notifications')).toBe('anonymous_app_notifications');
    });

    it('should prefix with user ID for authenticated users', () => {
      mockCurrentUser.set({ id: 'abc123' });
      expect(service.prefixKey('app_notifications')).toBe('user_abc123_app_notifications');
    });
  });

  describe('prefixKeyForUser', () => {
    it('should prefix with specific user ID', () => {
      expect(service.prefixKeyForUser('user-789', 'settings')).toBe('user_user-789_settings');
    });
  });

  describe('prefixKeyForAnonymous', () => {
    it('should prefix with anonymous', () => {
      expect(service.prefixKeyForAnonymous('lang')).toBe('anonymous_lang');
    });
  });

  describe('isAnonymousKey', () => {
    it('should return true for anonymous keys', () => {
      expect(service.isAnonymousKey('anonymous_app_notifications')).toBe(true);
    });

    it('should return false for user keys', () => {
      expect(service.isAnonymousKey('user_123_app_notifications')).toBe(false);
    });

    it('should return false for unprefixed keys', () => {
      expect(service.isAnonymousKey('app_notifications')).toBe(false);
    });
  });

  describe('isUserKey', () => {
    it('should return true for matching user keys', () => {
      expect(service.isUserKey('user_123_settings', '123')).toBe(true);
    });

    it('should return false for different user keys', () => {
      expect(service.isUserKey('user_456_settings', '123')).toBe(false);
    });

    it('should return false for anonymous keys', () => {
      expect(service.isUserKey('anonymous_settings', '123')).toBe(false);
    });
  });

  describe('extractBaseKey', () => {
    it('should extract base key from anonymous prefix', () => {
      expect(service.extractBaseKey('anonymous_app_notifications')).toBe('app_notifications');
    });

    it('should extract base key from user prefix', () => {
      expect(service.extractBaseKey('user_abc123_settings')).toBe('settings');
    });

    it('should return original key if no prefix found', () => {
      expect(service.extractBaseKey('unprefixed_key')).toBe('unprefixed_key');
    });

    it('should handle keys with underscores in base key', () => {
      expect(service.extractBaseKey('anonymous_app_user_data')).toBe('app_user_data');
      expect(service.extractBaseKey('user_123_my_complex_key')).toBe('my_complex_key');
    });
  });
});
