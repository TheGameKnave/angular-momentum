import { Injectable, inject } from '@angular/core';
import { UserStorageService, STORAGE_PREFIXES } from './user-storage.service';
import { IndexedDbService } from './indexeddb.service';
import { LogService } from './log.service';
import { Notification } from '../models/data.model';
import { PROMOTABLE_LOCALSTORAGE_KEYS } from '../constants/ui.constants';

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

  /**
   * Promote all anonymous storage data to a user's storage.
   * Called BEFORE auth state changes, so components see the correct data.
   *
   * @param userId - The user ID to promote data to
   */
  async promoteAnonymousToUser(userId: string): Promise<void> {
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
    for (const baseKey of PROMOTABLE_LOCALSTORAGE_KEYS) {
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
   * Promote IndexedDB keys from anonymous to user scope.
   */
  private async promoteIndexedDb(userId: string): Promise<void> {
    try {
      const allKeys = await this.indexedDbService.keys();
      const anonymousPrefix = `${STORAGE_PREFIXES.ANONYMOUS}_`;
      const userPrefix = `${STORAGE_PREFIXES.USER}_${userId}_`;

      for (const key of allKeys) {
        // Keys in this app are always strings
        if (typeof key !== 'string' || !key.startsWith(anonymousPrefix)) {
          continue;
        }

        const baseKey = key.substring(anonymousPrefix.length);
        const userKey = `${userPrefix}${baseKey}`;

        try {
          // Get anonymous data first
          const anonymousData = await this.indexedDbService.getRaw(key);

          // Skip if anonymous data is empty/null/undefined
          if (anonymousData === undefined || anonymousData === '' || anonymousData === null) {
            this.logService.log(`Skipped empty IndexedDB key ${baseKey}`);
            continue;
          }

          // Check if user already has meaningful data for this key
          const existingUserData = await this.indexedDbService.getRaw(userKey);
          if (existingUserData !== undefined && existingUserData !== '' && existingUserData !== null) {
            this.logService.log(`Skipped IndexedDB key ${baseKey} - user data exists`);
            continue;
          }

          // Promote anonymous data to user scope
          await this.indexedDbService.setRaw(userKey, anonymousData);
          this.logService.log(`Promoted IndexedDB key ${baseKey} to ${userKey}`);
        } catch (error) {
          this.logService.log(`Failed to promote IndexedDB key: ${key}`, error);
        }
      }
    } catch (error) {
      this.logService.log('Failed to promote IndexedDB', error);
    }
  }

  /**
   * Clear all anonymous localStorage keys.
   */
  private clearAnonymousLocalStorage(): void {
    for (const baseKey of PROMOTABLE_LOCALSTORAGE_KEYS) {
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
    try {
      const allKeys = await this.indexedDbService.keys();
      const anonymousPrefix = `${STORAGE_PREFIXES.ANONYMOUS}_`;

      for (const key of allKeys) {
        // Keys in this app are always strings
        if (typeof key === 'string' && key.startsWith(anonymousPrefix)) {
          await this.indexedDbService.delRaw(key);
          this.logService.log(`Cleared anonymous IndexedDB key: ${key}`);
        }
      }
    } catch (error) {
      this.logService.log('Failed to clear anonymous IndexedDB', error);
    }
  }
}
