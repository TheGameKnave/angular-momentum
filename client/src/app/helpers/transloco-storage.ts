import { inject } from '@angular/core';
import { PlatformService } from '../services/platform.service';
import { TIME_CONSTANTS } from '@app/constants/ui.constants';

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
    // istanbul ignore next
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
    // istanbul ignore next
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
    // istanbul ignore next
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
 * localStorage is primary, cookies are for SSR compatibility.
 */
export class DualStorage {
  /**
   * Get item from localStorage with cookie fallback.
   * @param key - Storage key
   * @returns Stored value or null
   */
  getItem(key: string): string | null {
    // Try localStorage first
    try {
      const value = localStorage.getItem(key);
      if (value) {
        return value;
      }
    } catch {
      // Fall back to cookie
    }

    // Fall back to cookie
    return CookieStorage.getItem(key);
  }

  /**
   * Set item in both localStorage and cookie.
   * @param key - Storage key
   * @param value - Value to store
   */
  setItem(key: string, value: string): void {
    // Set in both localStorage and cookie
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore localStorage errors
    }

    CookieStorage.setItem(key, value);
  }

  /**
   * Remove item from both localStorage and cookie.
   * @param key - Storage key
   */
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore localStorage errors
    }

    CookieStorage.removeItem(key);
  }
}

/**
 * Factory function for creating platform-aware storage.
 *
 * Returns appropriate storage implementation based on platform:
 * - Web: DualStorage (localStorage + cookies for SSR compatibility)
 * - Tauri: localStorage only
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
    // Tauri: Use localStorage only
    return localStorage;
  }

  // Web: Use dual storage (localStorage + cookies)
  return new DualStorage();
}
