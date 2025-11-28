import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ENVIRONMENT } from 'src/environments/environment';
import { firstValueFrom } from 'rxjs';
import { parseApiError } from '@app/helpers/api-error.helper';

/**
 * Username data returned from the API.
 */
export interface UsernameData {
  username: string | null;
  fingerprint: string | null;
}

/**
 * API response for username operations.
 */
interface UsernameResponse {
  success: boolean;
  username?: string | null;
  fingerprint?: string | null;
  error?: string;
}

/**
 * Service for managing user usernames.
 *
 * Features:
 * - Load current user's username
 * - Update username
 * - Reactive username state with signals
 */
@Injectable({
  providedIn: 'root'
})
export class UsernameService {
  /**
   * Current username data (null if not set or not loaded).
   */
  readonly username = signal<UsernameData | null>(null);

  /**
   * Loading state for async operations.
   */
  readonly loading = signal<boolean>(false);

  /**
   * Indicates if username creation failed during signup (e.g., username was taken).
   * Used to prompt user to choose a different username in their profile.
   */
  readonly creationFailed = signal<boolean>(false);

  constructor(
    private readonly http: HttpClient,
  ) {}

  /**
   * Load the current user's username from the API.
   * @returns Username data or null if not set
   */
  async loadUsername(): Promise<UsernameData | null> {
    this.loading.set(true);

    try {
      const response = await firstValueFrom(
        this.http.get<UsernameResponse>(`${ENVIRONMENT.baseUrl}/api/auth/username`)
      );

      const data: UsernameData = {
        username: response.username ?? null,
        fingerprint: response.fingerprint ?? null
      };

      this.username.set(data);
      return data;
    } catch (error) {
      console.error('[UsernameService] Error loading username', error);
      this.username.set(null);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Update the current user's username.
   * @param newUsername - New username to set
   * @param isSignupFlow - True if this is being called during signup (after OTP verification)
   * @returns Updated username data or null on error
   */
  async updateUsername(newUsername: string, isSignupFlow = false): Promise<UsernameData | null> {
    this.loading.set(true);

    try {
      const response = await firstValueFrom(
        this.http.put<UsernameResponse>(`${ENVIRONMENT.baseUrl}/api/auth/username`, {
          username: newUsername
        })
      );

      if (!response.success) {
        console.error('[UsernameService] Error updating username:', response.error);
        if (isSignupFlow) {
          this.creationFailed.set(true);
        }
        return null;
      }

      const data: UsernameData = {
        username: response.username ?? null,
        fingerprint: response.fingerprint ?? null
      };

      this.username.set(data);
      this.creationFailed.set(false); // Clear failure flag on success
      return data;
    } catch (error: unknown) {
      console.error('[UsernameService] Error updating username', error);

      if (isSignupFlow) {
        this.creationFailed.set(true);
      }

      // Map API error code to translation key
      const httpError = error as { error?: { error?: string } };
      const errorCode = httpError?.error?.error;
      const parsed = parseApiError(errorCode);
      throw new Error(parsed.key);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Delete the current user's username.
   * @returns True on success, throws error on failure
   */
  async deleteUsername(): Promise<boolean> {
    this.loading.set(true);

    try {
      const response = await firstValueFrom(
        this.http.delete<UsernameResponse>(`${ENVIRONMENT.baseUrl}/api/auth/username`)
      );

      if (!response.success) {
        console.error('[UsernameService] Error deleting username:', response.error);
        const parsed = parseApiError(response.error);
        throw new Error(parsed.key);
      }

      this.username.set(null);
      return true;
    } catch (error: unknown) {
      console.error('[UsernameService] Error deleting username', error);

      // Map API error code to translation key
      const httpError = error as { error?: { error?: string } };
      const errorCode = httpError?.error?.error;
      const parsed = parseApiError(errorCode);
      throw new Error(parsed.key);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Clear the username state (e.g., on logout).
   */
  clear(): void {
    this.username.set(null);
    this.creationFailed.set(false);
  }
}
