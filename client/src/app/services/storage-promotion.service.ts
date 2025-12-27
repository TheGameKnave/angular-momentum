import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { UserStorageService } from './user-storage.service';
import { STORAGE_PREFIXES } from '@app/constants/storage.constants';
import { IndexedDbService, IDB_STORES, IdbStoreName } from './indexeddb.service';
import { LogService } from './log.service';
import { Notification } from '../models/data.model';
import { PROMOTABLE_LOCALSTORAGE_NAMES } from '../constants/ui.constants';

/** All stores to check for promotion */
const ALL_STORES: IdbStoreName[] = [IDB_STORES.PERSISTENT, IDB_STORES.SETTINGS, IDB_STORES.BACKUPS];

/**
 * Service for promoting storage data from anonymous to user scope.
 *
 * "Promotion" moves anonymous user data to a logged-in user's storage space.
 * This happens BEFORE the auth state changes, so components see the correct
 * data when they react to the user becoming authenticated.
 *
 * Handles the transition of data when:
 * - Anonymous user logs in (promote anonymous → user)
 * - Anonymous user signs up and verifies (promote anonymous → user)
 *
 * Promotion strategy:
 * - User data takes precedence over anonymous data on conflict
 * - For notifications: merge and dedupe by ID
 * - For other data: user data wins
 *
 * @example
 * ```typescript
 * // Before setting auth state (while still anonymous)
 * await storagePromotionService.promoteAnonymousToUser(userId);
 * // Then set auth state - components will see promoted data
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class StoragePromotionService {
  private readonly userStorageService = inject(UserStorageService);
  private readonly indexedDbService = inject(IndexedDbService);
  private readonly logService = inject(LogService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /**
   * Promote all anonymous storage data to a user's storage.
   * Called BEFORE auth state changes, so components see the correct data.
   *
   * @param userId - The user ID to promote data to
   */
  async promoteAnonymousToUser(userId: string): Promise<void> {
    // istanbul ignore next - SSR guard
    if (!this.isBrowser) return;

    this.logService.log('Starting storage promotion to user', userId);

    try {
      // Promote localStorage
      await this.promoteLocalStorage(userId);

      // Promote IndexedDB
      await this.promoteIndexedDb(userId);

      // Clear anonymous storage after successful promotion
      this.clearAnonymousLocalStorage();
      await this.clearAnonymousIndexedDb();

      this.logService.log('Storage promotion completed successfully');
    } catch (error) {
      this.logService.log('Storage promotion failed', error);
      // Don't throw - promotion failure shouldn't block login
    }
  }

  /**
   * Promote localStorage keys from anonymous to user scope.
   */
  private async promoteLocalStorage(userId: string): Promise<void> {
    for (const baseKey of PROMOTABLE_LOCALSTORAGE_NAMES) {
      const anonymousKey = this.userStorageService.prefixKeyForAnonymous(baseKey);
      const userKey = this.userStorageService.prefixKeyForUser(userId, baseKey);

      try {
        const anonymousData = localStorage.getItem(anonymousKey);
        if (!anonymousData) {
          continue; // No anonymous data to promote
        }

        const existingUserData = localStorage.getItem(userKey);

        if (baseKey === 'app_notifications') {
          // Special handling for notifications: merge and dedupe
          const mergedData = this.mergeNotifications(anonymousData, existingUserData);
          localStorage.setItem(userKey, mergedData);
          this.logService.log(`Merged notifications to ${userKey}`);
        } else if (existingUserData) {
          // User data exists - skip promotion (user data wins)
          this.logService.log(`Skipped ${baseKey} promotion - user data exists`);
        } else {
          // For other keys: only promote if user has no data
          localStorage.setItem(userKey, anonymousData);
          this.logService.log(`Promoted ${baseKey} to ${userKey}`);
        }
      } catch (error) {
        this.logService.log(`Failed to promote localStorage key: ${baseKey}`, error);
      }
    }
  }

  /**
   * Merge notification arrays, deduplicating by ID.
   * Anonymous notifications are added only if their ID doesn't exist in user notifications.
   */
  private mergeNotifications(anonymousJson: string, userJson: string | null): string {
    try {
      const anonymousNotifications: Notification[] = JSON.parse(anonymousJson);

      if (!userJson) {
        return anonymousJson; // No user data, use anonymous data as-is
      }

      const userNotifications: Notification[] = JSON.parse(userJson);
      const userIds = new Set(userNotifications.map(n => n.id));

      // Add anonymous notifications that don't exist in user data
      const newNotifications = anonymousNotifications.filter(n => !userIds.has(n.id));

      // Combine: user notifications first (most recent), then new anonymous ones
      const merged = [...userNotifications, ...newNotifications];

      this.logService.log(`Merged ${newNotifications.length} anonymous notifications with ${userNotifications.length} user notifications`);

      return JSON.stringify(merged);
    } catch (error) {
      this.logService.log('Failed to merge notifications', error);
      // On error, prefer user data if available
      return userJson ?? anonymousJson;
    }
  }

  /**
   * Check if a value is empty (null, undefined, or empty string).
   */
  private isEmpty(value: unknown): boolean {
    return value === undefined || value === null || value === '';
  }

  /**
   * Promote a single IndexedDB key from anonymous to user scope.
   * Returns true if promotion occurred, false if skipped.
   */
  private async promoteIndexedDbKey(
    key: string,
    store: IdbStoreName,
    anonymousPrefix: string,
    userPrefix: string
  ): Promise<void> {
    const baseKey = key.substring(anonymousPrefix.length);
    const userKey = `${userPrefix}${baseKey}`;

    const anonymousData = await this.indexedDbService.getRaw(key, store);
    if (this.isEmpty(anonymousData)) {
      this.logService.log(`Skipped empty IndexedDB key ${baseKey} in ${store}`);
      return;
    }

    const existingUserData = await this.indexedDbService.getRaw(userKey, store);
    if (!this.isEmpty(existingUserData)) {
      this.logService.log(`Skipped IndexedDB key ${baseKey} in ${store} - user data exists`);
      return;
    }

    await this.indexedDbService.setRaw(userKey, anonymousData, store);
    this.logService.log(`Promoted IndexedDB key ${baseKey} to ${userKey} in ${store}`);
  }

  /**
   * Promote IndexedDB keys from anonymous to user scope.
   */
  private async promoteIndexedDb(userId: string): Promise<void> {
    const anonymousPrefix = `${STORAGE_PREFIXES.ANONYMOUS}_`;
    const userPrefix = `${STORAGE_PREFIXES.USER}_${userId}_`;

    for (const store of ALL_STORES) {
      try {
        const allKeys = await this.indexedDbService.keys(store);

        for (const key of allKeys) {
          if (typeof key !== 'string' || !key.startsWith(anonymousPrefix)) continue;

          try {
            await this.promoteIndexedDbKey(key, store, anonymousPrefix, userPrefix);
          } catch (error) {
            this.logService.log(`Failed to promote IndexedDB key: ${key} in ${store}`, error);
          }
        }
      } catch (error) {
        this.logService.log(`Failed to promote IndexedDB store: ${store}`, error);
      }
    }
  }

  /**
   * Clear all anonymous localStorage keys.
   */
  private clearAnonymousLocalStorage(): void {
    for (const baseKey of PROMOTABLE_LOCALSTORAGE_NAMES) {
      const anonymousKey = this.userStorageService.prefixKeyForAnonymous(baseKey);
      try {
        localStorage.removeItem(anonymousKey);
        this.logService.log(`Cleared anonymous localStorage key: ${anonymousKey}`);
      } catch (error) {
        this.logService.log(`Failed to clear localStorage key: ${anonymousKey}`, error);
      }
    }
  }

  /**
   * Clear all anonymous IndexedDB keys.
   */
  private async clearAnonymousIndexedDb(): Promise<void> {
    const anonymousPrefix = `${STORAGE_PREFIXES.ANONYMOUS}_`;

    for (const store of ALL_STORES) {
      try {
        const allKeys = await this.indexedDbService.keys(store);

        for (const key of allKeys) {
          // Keys in this app are always strings
          if (typeof key === 'string' && key.startsWith(anonymousPrefix)) {
            await this.indexedDbService.delRaw(key, store);
            this.logService.log(`Cleared anonymous IndexedDB key: ${key} from ${store}`);
          }
        }
      } catch (error) {
        this.logService.log(`Failed to clear anonymous IndexedDB store: ${store}`, error);
      }
    }
  }

  /**
   * Check if localStorage has any anonymous data.
   */
  private hasAnonymousLocalStorageData(): boolean {
    return PROMOTABLE_LOCALSTORAGE_NAMES.some(baseKey => {
      const anonymousKey = this.userStorageService.prefixKeyForAnonymous(baseKey);
      const value = localStorage.getItem(anonymousKey);
      return !this.isEmpty(value);
    });
  }

  /**
   * Check if a store has any anonymous IndexedDB data.
   */
  private async hasAnonymousIndexedDbDataInStore(store: IdbStoreName, anonymousPrefix: string): Promise<boolean> {
    const allKeys = await this.indexedDbService.keys(store);

    for (const key of allKeys) {
      if (typeof key !== 'string' || !key.startsWith(anonymousPrefix)) continue;

      const value = await this.indexedDbService.getRaw(key, store);
      if (!this.isEmpty(value)) return true;
    }
    return false;
  }

  /**
   * Check if there is any anonymous data that could be promoted.
   * Used to determine whether to show the import confirmation dialog.
   */
  async hasAnonymousData(): Promise<boolean> {
    // istanbul ignore next - SSR guard
    if (!this.isBrowser) return false;

    if (this.hasAnonymousLocalStorageData()) return true;

    const anonymousPrefix = `${STORAGE_PREFIXES.ANONYMOUS}_`;

    for (const store of ALL_STORES) {
      try {
        if (await this.hasAnonymousIndexedDbDataInStore(store, anonymousPrefix)) {
          return true;
        }
      } catch (error) {
        this.logService.log(`Failed to check anonymous IndexedDB data in ${store}`, error);
      }
    }

    return false;
  }

  /**
   * Clear all anonymous data without promoting it.
   * Called when user declines to import anonymous data.
   */
  async clearAnonymousData(): Promise<void> {
    // istanbul ignore next - SSR guard
    if (!this.isBrowser) return;

    this.clearAnonymousLocalStorage();
    await this.clearAnonymousIndexedDb();
    this.logService.log('Anonymous data cleared (user declined import)');
  }
}
