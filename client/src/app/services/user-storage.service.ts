import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { STORAGE_PREFIXES } from '@app/constants/storage.constants';

/**
 * Service for managing user-scoped storage keys.
 *
 * Provides methods to generate storage key prefixes based on authentication state.
 * Used by other services (NotificationService, IndexedDbService, etc.) to scope
 * their data to the current user.
 *
 * Key format:
 * - Anonymous users: `anonymous_{key}`
 * - Authenticated users: `user_{userId}_{key}`
 *
 * @example
 * ```typescript
 * // Get prefixed key for notifications
 * const key = userStorageService.prefixKey('app_notifications');
 * // Returns: 'anonymous_app_notifications' or 'user_abc123_app_notifications'
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class UserStorageService {
  private readonly authService = inject(AuthService);

  /**
   * Computed signal for the current storage prefix.
   * Returns 'anonymous' for unauthenticated users, 'user_{id}' for authenticated users.
   */
  readonly storagePrefix = computed(() => {
    const user = this.authService.currentUser();
    if (user?.id) {
      return `${STORAGE_PREFIXES.USER}_${user.id}`;
    }
    return STORAGE_PREFIXES.ANONYMOUS;
  });

  /**
   * Get the current user ID, or null if not authenticated.
   * @returns User ID or null
   */
  getUserId(): string | null {
    return this.authService.currentUser()?.id ?? null;
  }

  /**
   * Check if the current user is authenticated.
   * @returns True if authenticated
   */
  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  /**
   * Get a storage key prefixed with the current user scope.
   * @param key - The base key name
   * @returns Prefixed key (e.g., 'user_abc123_app_notifications')
   */
  prefixKey(key: string): string {
    return `${this.storagePrefix()}_${key}`;
  }

  /**
   * Get a storage key prefixed for a specific user.
   * @param userId - The user ID to prefix with
   * @param key - The base key name
   * @returns Prefixed key (e.g., 'user_abc123_app_notifications')
   */
  prefixKeyForUser(userId: string, key: string): string {
    return `${STORAGE_PREFIXES.USER}_${userId}_${key}`;
  }

  /**
   * Get a storage key prefixed for anonymous users.
   * @param key - The base key name
   * @returns Prefixed key (e.g., 'anonymous_app_notifications')
   */
  prefixKeyForAnonymous(key: string): string {
    return `${STORAGE_PREFIXES.ANONYMOUS}_${key}`;
  }

  /**
   * Check if a key belongs to anonymous storage.
   * @param key - The full prefixed key
   * @returns True if the key starts with 'anonymous_'
   */
  isAnonymousKey(key: string): boolean {
    return key.startsWith(`${STORAGE_PREFIXES.ANONYMOUS}_`);
  }

  /**
   * Check if a key belongs to a specific user's storage.
   * @param key - The full prefixed key
   * @param userId - The user ID to check
   * @returns True if the key belongs to the specified user
   */
  isUserKey(key: string, userId: string): boolean {
    return key.startsWith(`${STORAGE_PREFIXES.USER}_${userId}_`);
  }

  /**
   * Extract the base key from a prefixed key.
   * @param prefixedKey - The full prefixed key
   * @returns The base key without prefix, or the original key if no prefix found
   */
  extractBaseKey(prefixedKey: string): string {
    // Match 'anonymous_' or 'user_{id}_' prefix
    const anonymousMatch = /^anonymous_(.+)$/.exec(prefixedKey);
    if (anonymousMatch) {
      return anonymousMatch[1];
    }

    const userMatch = /^user_[^_]+_(.+)$/.exec(prefixedKey);
    if (userMatch) {
      return userMatch[1];
    }

    return prefixedKey;
  }
}
