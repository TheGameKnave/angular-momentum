import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ENVIRONMENT } from 'src/environments/environment';
import { firstValueFrom } from 'rxjs';
import { LogService } from './log.service';

/**
 * User settings model matching the database schema.
 */
export interface UserSettings {
  id?: string;
  user_id?: string;
  timezone?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Service for managing user-specific settings and preferences.
 *
 * Features:
 * - Automatic timezone detection from browser
 * - CRUD operations for user settings
 * - Signal-based reactive state
 * - Automatic initialization on authentication
 *
 * @example
 * ```typescript
 * // Get current timezone
 * const timezone = userSettingsService.settings()?.timezone;
 *
 * // Update timezone
 * await userSettingsService.updateTimezone('America/New_York');
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class UserSettingsService {
  /**
   * Current user settings (null if not loaded or user not authenticated).
   */
  readonly settings = signal<UserSettings | null>(null);

  /**
   * Loading state for async operations.
   */
  readonly loading = signal<boolean>(false);

  constructor(
    private readonly http: HttpClient,
    private readonly logService: LogService,
  ) {}

  /**
   * Detects the user's timezone from their browser.
   * Uses the Intl API which is more accurate than IP-based detection.
   *
   * @returns IANA timezone identifier (e.g., 'America/New_York', 'Europe/London')
   */
  detectTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      this.logService.log('Error detecting timezone', error);
      return 'UTC'; // Fallback to UTC
    }
  }

  /**
   * Loads user settings from the server.
   * Called after successful authentication.
   *
   * @returns User settings or null if not found
   */
  async loadSettings(): Promise<UserSettings | null> {
    this.loading.set(true);

    try {
      const response = await firstValueFrom(
        this.http.get<{ data: UserSettings | null }>(`${ENVIRONMENT.baseUrl}/api/user-settings`)
      );

      this.settings.set(response.data);
      this.logService.log('Settings loaded', response.data);
      return response.data;
    } catch (error: unknown) {
      // 404 is expected if user hasn't created settings yet
      const httpError = error as { status?: number };
      if (httpError.status === 404) {
        this.settings.set(null);
        return null;
      }

      this.logService.log('Error loading settings', error);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Creates initial user settings with detected timezone.
   * Called after signup or first login if settings don't exist.
   *
   * @param timezone - Optional timezone override (defaults to detected timezone)
   * @returns Created user settings
   */
  async createSettings(timezone?: string): Promise<UserSettings | null> {
    this.loading.set(true);

    const detectedTimezone = timezone ?? this.detectTimezone();

    try {
      const response = await firstValueFrom(
        this.http.post<{ data: UserSettings }>(`${ENVIRONMENT.baseUrl}/api/user-settings`, {
          timezone: detectedTimezone
        })
      );

      this.settings.set(response.data);
      this.logService.log('Settings created', response.data);
      return response.data;
    } catch (error) {
      this.logService.log('Error creating settings', error);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Updates user timezone preference.
   *
   * @param timezone - IANA timezone identifier
   * @returns Updated user settings
   */
  async updateTimezone(timezone: string): Promise<UserSettings | null> {
    this.loading.set(true);

    try {
      const response = await firstValueFrom(
        this.http.patch<{ data: UserSettings }>(`${ENVIRONMENT.baseUrl}/api/user-settings`, {
          timezone
        })
      );

      this.settings.set(response.data);
      this.logService.log('Timezone updated', timezone);
      return response.data;
    } catch (error) {
      this.logService.log('Error updating timezone', error);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Upserts user settings (create or update).
   * Uses PUT endpoint which is idempotent - no 404 errors!
   *
   * @param timezone - Optional timezone override (defaults to detected timezone)
   * @returns User settings
   */
  async upsertSettings(timezone?: string): Promise<UserSettings | null> {
    this.loading.set(true);

    const detectedTimezone = timezone ?? this.detectTimezone();

    try {
      const response = await firstValueFrom(
        this.http.put<{ data: UserSettings }>(`${ENVIRONMENT.baseUrl}/api/user-settings`, {
          timezone: detectedTimezone
        })
      );

      this.settings.set(response.data);
      this.logService.log('Settings upserted', response.data);
      return response.data;
    } catch (error) {
      this.logService.log('Error upserting settings', error);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Initializes user settings after authentication.
   * Uses upsert to avoid 404 errors for new users.
   */
  async initialize(): Promise<void> {
    // Use upsert - works for both new and existing users
    await this.upsertSettings();
  }

  /**
   * Clears user settings from local state.
   * Called on logout.
   */
  clear(): void {
    this.settings.set(null);
  }
}
