import { inject } from '@angular/core';
import { PlatformService } from '../services/platform.service';
import { TIME_CONSTANTS } from '@app/constants/ui.constants';
import { STORAGE_PREFIXES } from '@app/constants/storage.constants';
import { ENVIRONMENT } from 'src/environments/environment';

/**
 * Extract user ID from Supabase auth token in localStorage.
 * This is used during app bootstrap before AuthService is initialized,
 * allowing us to read user-scoped language preference without flicker.
 * @returns User ID or null if not authenticated
 */
function getUserIdFromToken(): string | null {
  // istanbul ignore next - SSR guard
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    // Extract project ref from Supabase URL (e.g., 'tyoyznpjxppchdyydbnf' from 'https://tyoyznpjxppchdyydbnf.supabase.co')
    const projectRef = new URL(ENVIRONMENT.supabase.url).hostname.split('.')[0];
    const tokenKey = `sb-${projectRef}-auth-token`;
    const tokenData = localStorage.getItem(tokenKey);

    if (!tokenData) {
      return null;
    }

    const parsed = JSON.parse(tokenData);
    // Supabase stores { access_token, refresh_token, ... } or nested under currentSession
    const accessToken = parsed.access_token || parsed.currentSession?.access_token;

    if (!accessToken) {
      return null;
    }

    // JWT format: header.payload.signature - we need the payload
    const [, payloadBase64] = accessToken.split('.');
    if (!payloadBase64) {
      return null;
    }

    // Decode base64 payload (handle URL-safe base64)
    const payload = JSON.parse(atob(payloadBase64.replaceAll('-', '+').replaceAll('_', '/')));
    // istanbul ignore next - payload.sub is always present in valid Supabase JWTs
    return payload.sub || null; // 'sub' is the user ID in JWT
  } catch {
    return null;
  }
}

/**
 * Get the storage key prefix based on current auth state.
 * Reads directly from Supabase token, no dependency on AuthService.
 * @param key - Base key name
 * @returns Prefixed key (e.g., 'user_abc123_translocoLang' or 'anonymous_translocoLang')
 */
function getStorageKeyPrefix(key: string): string {
  const userId = getUserIdFromToken();
  if (userId) {
    return `${STORAGE_PREFIXES.USER}_${userId}_${key}`;
  }
  return `${STORAGE_PREFIXES.ANONYMOUS}_${key}`;
}

/**
 * Cookie utilities for language persistence.
 */
export class CookieStorage {
  private static readonly COOKIE_NAME = 'lang';
  private static readonly MAX_AGE = Math.floor(TIME_CONSTANTS.YEARS / 1000); // 1 year in seconds

  /**
   * Get language from cookie.
   * @returns Language code or null if not found
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static getItem(_key: string): string | null {
    // istanbul ignore next - SSR guard, document always exists in browser tests
    if (typeof document === 'undefined') {
      return null;
    }

    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === this.COOKIE_NAME) {
        return decodeURIComponent(value);
      }
    }
    return null;
  }

  /**
   * Set language in cookie.
   * @param key - Storage key (ignored, we use fixed cookie name)
   * @param value - Language code
   */
  static setItem(_key: string, value: string): void {
    // istanbul ignore next - SSR guard, document always exists in browser tests
    if (typeof document === 'undefined') {
      return;
    }

    const cookie = `${this.COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=${this.MAX_AGE}; SameSite=Strict`;
    document.cookie = cookie;
  }

  /**
   * Remove language cookie.
   * @param key - Storage key (ignored)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static removeItem(_key: string): void {
    // istanbul ignore next - SSR guard, document always exists in browser tests
    if (typeof document === 'undefined') {
      return;
    }

    document.cookie = `${this.COOKIE_NAME}=; path=/; max-age=0`;
  }
}

/**
 * No-op storage for SSR.
 * Prevents crashes when localStorage is accessed on server.
 */
export class NoOpStorage {
  /**
   * No-op get item (SSR).
   * @param _key - Storage key (ignored)
   * @returns Always null
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getItem(_key: string): string | null {
    return null;
  }

  /**
   * No-op set item (SSR).
   * @param _key - Storage key (ignored)
   * @param _value - Value to store (ignored)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setItem(_key: string, _value: string): void {
    // No-op
  }

  /**
   * No-op remove item (SSR).
   * @param _key - Storage key (ignored)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  removeItem(_key: string): void {
    // No-op
  }
}

/**
 * Dual storage that uses both localStorage and cookies (web only).
 * localStorage is primary (with user-scoped keys), cookies are for SSR compatibility.
 *
 * User-scoped storage:
 * - localStorage uses prefixed keys (e.g., 'user_abc123_lang' or 'anonymous_lang')
 * - Cookies remain unprefixed for SSR compatibility (server can't know user scope)
 *
 * Note: This class reads the user ID directly from Supabase JWT token in localStorage,
 * allowing it to work during app bootstrap before AuthService is initialized.
 */
export class DualStorage {
  /**
   * Get item from localStorage (user-scoped) with cookie fallback.
   * @param key - Base storage key (will be prefixed for localStorage)
   * @returns Stored value or null
   */
  getItem(key: string): string | null {
    // Try user-scoped localStorage first
    try {
      const prefixedKey = getStorageKeyPrefix(key);
      const value = localStorage.getItem(prefixedKey);
      if (value) {
        return value;
      }
    } catch {
      // Fall back to cookie
    }

    // Fall back to cookie (unprefixed, for SSR compatibility)
    return CookieStorage.getItem(key);
  }

  /**
   * Set item in both localStorage (user-scoped) and cookie.
   * @param key - Base storage key (will be prefixed for localStorage)
   * @param value - Value to store
   */
  setItem(key: string, value: string): void {
    // Set in user-scoped localStorage
    try {
      const prefixedKey = getStorageKeyPrefix(key);
      localStorage.setItem(prefixedKey, value);
    } catch {
      // Ignore localStorage errors
    }

    // Also set in cookie (unprefixed, for SSR)
    CookieStorage.setItem(key, value);
  }

  /**
   * Remove item from both localStorage (user-scoped) and cookie.
   * @param key - Base storage key (will be prefixed for localStorage)
   */
  removeItem(key: string): void {
    try {
      const prefixedKey = getStorageKeyPrefix(key);
      localStorage.removeItem(prefixedKey);
    } catch {
      // Ignore localStorage errors
    }

    CookieStorage.removeItem(key);
  }
}

/**
 * User-scoped localStorage wrapper for Tauri platform.
 * Prefixes all keys with user scope.
 *
 * Note: This class reads the user ID directly from Supabase JWT token in localStorage,
 * allowing it to work during app bootstrap before AuthService is initialized.
 */
export class UserScopedLocalStorage {
  /**
   * Get item from user-scoped localStorage.
   * @param key - The storage key (will be prefixed with user scope)
   * @returns The stored value or null if not found
   */
  getItem(key: string): string | null {
    try {
      const prefixedKey = getStorageKeyPrefix(key);
      return localStorage.getItem(prefixedKey);
    } catch {
      return null;
    }
  }

  /**
   * Set item in user-scoped localStorage.
   * @param key - The storage key (will be prefixed with user scope)
   * @param value - The value to store
   */
  setItem(key: string, value: string): void {
    try {
      const prefixedKey = getStorageKeyPrefix(key);
      localStorage.setItem(prefixedKey, value);
    } catch {
      // Ignore errors
    }
  }

  /**
   * Remove item from user-scoped localStorage.
   * @param key - The storage key (will be prefixed with user scope)
   */
  removeItem(key: string): void {
    try {
      const prefixedKey = getStorageKeyPrefix(key);
      localStorage.removeItem(prefixedKey);
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Factory function for creating platform-aware storage.
 *
 * Returns appropriate storage implementation based on platform:
 * - Web: DualStorage (user-scoped localStorage + cookies for SSR compatibility)
 * - Tauri: UserScopedLocalStorage (user-scoped localStorage only)
 * - SSR: NoOpStorage (prevents crashes)
 *
 * @returns Storage implementation
 */
export function platformAwareStorageFactory() {
  const platformService = inject(PlatformService);

  if (platformService.isSSR()) {
    return new NoOpStorage();
  }

  if (platformService.isTauri()) {
    // Tauri: Use user-scoped localStorage only
    return new UserScopedLocalStorage();
  }

  // Web: Use dual storage (user-scoped localStorage + cookies)
  return new DualStorage();
}
