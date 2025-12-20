import { Injectable, signal, inject, DestroyRef, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { TranslocoService } from '@jsverse/transloco';
import { ENVIRONMENT } from 'src/environments/environment';
import { firstValueFrom } from 'rxjs';
import { LogService } from './log.service';
import { IndexedDbService, IDB_STORES } from './indexeddb.service';
import { UserStorageService } from './user-storage.service';
import { SocketIoService } from './socket.io.service';
import { AuthService } from './auth.service';

/** Storage keys for local preferences */
const STORAGE_KEYS = {
  THEME: 'preferences_theme',
  TIMEZONE: 'preferences_timezone',
  LANGUAGE: 'preferences_language',
} as const;

/** Local preference with timestamp for conflict resolution */
interface LocalPreference<T> {
  value: T;
  updatedAt: number; // Unix timestamp (ms)
}

/**
 * Theme preference options.
 */
export type ThemePreference = 'light' | 'dark';

/** Union type for stored preference format (old raw value or new timestamped) */
type StoredPreference<T> = LocalPreference<T> | T | undefined;

/**
 * User settings model matching the database schema.
 */
export interface UserSettings {
  id?: string;
  user_id?: string;
  timezone?: string;
  theme_preference?: ThemePreference;
  language?: string;
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
/** WebSocket payload for settings updates */
interface SettingsUpdatePayload {
  timezone?: string;
  theme_preference?: ThemePreference;
  language?: string;
  updated_at: string;
}

/**
 * Service for managing user settings (theme, timezone, language).
 * Handles local storage via IndexedDB, server synchronization, and
 * real-time updates via WebSocket for multi-device sync.
 */
@Injectable({
  providedIn: 'root'
})
export class UserSettingsService {
  private readonly http = inject(HttpClient);
  private readonly logService = inject(LogService);
  private readonly indexedDbService = inject(IndexedDbService);
  private readonly userStorageService = inject(UserStorageService);
  private readonly socketService = inject(SocketIoService);
  private readonly translocoService = inject(TranslocoService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  /** Track previous auth state to detect logout */
  private wasAuthenticated = false;

  constructor() {
    this.setupWebSocketListeners();
    this.setupLogoutHandler();
  }

  /**
   * Sets up an effect to detect logout and reset settings to anonymous defaults.
   */
  private setupLogoutHandler(): void {
    effect(() => {
      const user = this.authService.currentUser();
      const isAuthenticated = !!user;

      // Detect transition from authenticated to unauthenticated (logout)
      if (this.wasAuthenticated && !isAuthenticated) {
        this.logService.log('User logged out, resetting to anonymous settings');
        this.clear();
      }

      this.wasAuthenticated = isAuthenticated;
    });
  }

  /**
   * Sets up WebSocket listeners for real-time settings sync.
   * Listens for settings updates from other devices.
   */
  private setupWebSocketListeners(): void {
    this.socketService.listen<SettingsUpdatePayload>('user-settings-updated')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        this.handleRemoteSettingsUpdate(payload);
      });
  }

  /**
   * Handles settings updates received from the server via WebSocket.
   * Applies changes from other devices to this device.
   */
  private async handleRemoteSettingsUpdate(payload: SettingsUpdatePayload): Promise<void> {
    const serverTimestamp = new Date(payload.updated_at).getTime();
    this.logService.log('Received remote settings update', payload);

    // Update theme if changed
    if (payload.theme_preference && payload.theme_preference !== this.themePreference()) {
      this.themePreference.set(payload.theme_preference);
      this.applyTheme(payload.theme_preference);
      await this.saveThemeLocally(payload.theme_preference, serverTimestamp);
      this.logService.log('Theme updated from remote device', payload.theme_preference);
    }

    // Update timezone if changed
    if (payload.timezone && payload.timezone !== this.timezonePreference()) {
      this.timezonePreference.set(payload.timezone);
      await this.saveTimezoneLocally(payload.timezone, serverTimestamp);
      this.logService.log('Timezone updated from remote device', payload.timezone);
    }

    // Update language if changed
    if (payload.language && payload.language !== this.languagePreference()) {
      this.languagePreference.set(payload.language);
      this.translocoService.setActiveLang(payload.language);
      await this.saveLanguageLocally(payload.language, serverTimestamp);
      this.logService.log('Language updated from remote device', payload.language);
    }
  }

  /**
   * Authenticates the WebSocket connection for settings sync.
   * Call this after user login to enable real-time sync.
   */
  authenticateWebSocket(token: string): void {
    this.socketService.emit('authenticate', token);
  }

  /**
   * Current user settings from server (null if not loaded or user not authenticated).
   */
  readonly settings = signal<UserSettings | null>(null);

  /**
   * Loading state for async operations.
   */
  readonly loading = signal<boolean>(false);

  /**
   * Current theme preference (reactive signal, always has a value).
   * Loaded from local storage on init, synced to server when authenticated.
   */
  readonly themePreference = signal<ThemePreference>('dark');

  /**
   * Current timezone preference (reactive signal).
   * Loaded from local storage on init, synced to server when authenticated.
   */
  readonly timezonePreference = signal<string>('UTC');

  /**
   * Current language preference (reactive signal).
   * Loaded from local storage on init, synced to server when authenticated.
   * Null means use browser default / auto-detect.
   */
  readonly languagePreference = signal<string | null>(null);

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

  // ===========================================================================
  // LOCAL STORAGE (IndexedDB) - Works offline, user-scoped
  // ===========================================================================

  /**
   * Extract value from preference that may be in old format (raw value) or new format (with timestamp).
   * @param pref - The preference value from storage
   * @returns The extracted value or undefined if not present
   */
  private extractPrefValue<T>(pref: StoredPreference<T>): T | undefined {
    if (!pref) return undefined;
    if (typeof pref === 'object' && 'value' in pref) return pref.value;
    return pref;
  }

  /**
   * Load preferences from local IndexedDB storage.
   * Called on app initialization to apply theme immediately.
   */
  async loadLocalPreferences(): Promise<void> {
    try {
      const themePref = await this.indexedDbService.get(STORAGE_KEYS.THEME, IDB_STORES.SETTINGS) as StoredPreference<ThemePreference>;
      const timezonePref = await this.indexedDbService.get(STORAGE_KEYS.TIMEZONE, IDB_STORES.SETTINGS) as StoredPreference<string>;
      const languagePref = await this.indexedDbService.get(STORAGE_KEYS.LANGUAGE, IDB_STORES.SETTINGS) as StoredPreference<string>;

      // Handle both old format (raw value) and new format (with timestamp)
      const theme = this.extractPrefValue(themePref);
      const timezone = this.extractPrefValue(timezonePref);
      const language = this.extractPrefValue(languagePref);

      if (theme) {
        this.themePreference.set(theme);
        this.applyTheme(theme);
      }

      if (timezone) {
        this.timezonePreference.set(timezone);
      } else {
        // Use browser-detected timezone as default
        this.timezonePreference.set(this.detectTimezone());
      }

      if (language) {
        this.languagePreference.set(language);
      }

      this.logService.log('Local preferences loaded', { theme, timezone, language });
    } catch (error) {
      this.logService.log('Error loading local preferences', error);
    }
  }

  /**
   * Get local theme preference with timestamp.
   */
  private async getLocalTheme(): Promise<LocalPreference<ThemePreference> | null> {
    try {
      const pref = await this.indexedDbService.get(STORAGE_KEYS.THEME, IDB_STORES.SETTINGS) as StoredPreference<ThemePreference>;
      if (!pref) return null;
      // Handle old format (raw value) - treat as very old timestamp
      if (typeof pref !== 'object') {
        return { value: pref, updatedAt: 0 };
      }
      return pref;
    } catch {
      return null;
    }
  }

  /**
   * Get local timezone preference with timestamp.
   */
  private async getLocalTimezone(): Promise<LocalPreference<string> | null> {
    try {
      const pref = await this.indexedDbService.get(STORAGE_KEYS.TIMEZONE, IDB_STORES.SETTINGS) as StoredPreference<string>;
      if (!pref) return null;
      // Handle old format (raw value) - treat as very old timestamp
      if (typeof pref !== 'object') {
        return { value: pref, updatedAt: 0 };
      }
      return pref;
    } catch {
      return null;
    }
  }

  /**
   * Save theme preference to local IndexedDB storage with timestamp.
   * @param theme - Theme preference value
   * @param timestamp - Optional timestamp (defaults to now, use server timestamp when syncing from server)
   */
  private async saveThemeLocally(theme: ThemePreference, timestamp?: number): Promise<void> {
    try {
      const pref: LocalPreference<ThemePreference> = {
        value: theme,
        updatedAt: timestamp ?? Date.now(),
      };
      await this.indexedDbService.set(STORAGE_KEYS.THEME, pref, IDB_STORES.SETTINGS);
      this.logService.log('Theme saved locally', pref);
    } catch (error) {
      this.logService.log('Error saving theme locally', error);
    }
  }

  /**
   * Save timezone preference to local IndexedDB storage with timestamp.
   * @param timezone - Timezone string
   * @param timestamp - Optional timestamp (defaults to now, use server timestamp when syncing from server)
   */
  private async saveTimezoneLocally(timezone: string, timestamp?: number): Promise<void> {
    try {
      const pref: LocalPreference<string> = {
        value: timezone,
        updatedAt: timestamp ?? Date.now(),
      };
      await this.indexedDbService.set(STORAGE_KEYS.TIMEZONE, pref, IDB_STORES.SETTINGS);
      this.logService.log('Timezone saved locally', pref);
    } catch (error) {
      this.logService.log('Error saving timezone locally', error);
    }
  }

  /**
   * Get local language preference with timestamp.
   */
  private async getLocalLanguage(): Promise<LocalPreference<string> | null> {
    try {
      const pref = await this.indexedDbService.get(STORAGE_KEYS.LANGUAGE, IDB_STORES.SETTINGS) as StoredPreference<string>;
      if (!pref) return null;
      // Handle old format (raw value) - treat as very old timestamp
      if (typeof pref !== 'object') {
        return { value: pref, updatedAt: 0 };
      }
      return pref;
    } catch {
      return null;
    }
  }

  /**
   * Save language preference to local IndexedDB storage with timestamp.
   * @param language - Language code
   * @param timestamp - Optional timestamp (defaults to now, use server timestamp when syncing from server)
   */
  private async saveLanguageLocally(language: string, timestamp?: number): Promise<void> {
    try {
      const pref: LocalPreference<string> = {
        value: language,
        updatedAt: timestamp ?? Date.now(),
      };
      await this.indexedDbService.set(STORAGE_KEYS.LANGUAGE, pref, IDB_STORES.SETTINGS);
      this.logService.log('Language saved locally', pref);
    } catch (error) {
      this.logService.log('Error saving language locally', error);
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
   * Saves locally first (works offline), then syncs to server if authenticated.
   *
   * @param timezone - IANA timezone identifier
   * @returns Updated user settings (or null if not authenticated/offline)
   */
  async updateTimezone(timezone: string): Promise<UserSettings | null> {
    // Update local state immediately
    this.timezonePreference.set(timezone);

    // Save to local storage (works offline)
    await this.saveTimezoneLocally(timezone);

    // Sync to server if authenticated
    if (!this.userStorageService.isAuthenticated()) {
      return null;
    }

    this.loading.set(true);

    try {
      const response = await firstValueFrom(
        this.http.patch<{ data: UserSettings }>(`${ENVIRONMENT.baseUrl}/api/user-settings`, {
          timezone
        })
      );

      this.settings.set(response.data);
      this.logService.log('Timezone synced to server', timezone);
      return response.data;
    } catch (error) {
      this.logService.log('Error syncing timezone to server (saved locally)', error);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Updates user theme preference.
   * Saves locally first (works offline), then syncs to server if authenticated.
   *
   * @param theme_preference - 'light' or 'dark'
   * @returns Updated user settings (or null if not authenticated/offline)
   */
  async updateThemePreference(theme_preference: ThemePreference): Promise<UserSettings | null> {
    // Update local state and apply immediately
    this.themePreference.set(theme_preference);
    this.applyTheme(theme_preference);

    // Save to local storage (works offline)
    await this.saveThemeLocally(theme_preference);

    // Sync to server if authenticated
    if (!this.userStorageService.isAuthenticated()) {
      return null;
    }

    this.loading.set(true);

    try {
      const response = await firstValueFrom(
        this.http.patch<{ data: UserSettings }>(`${ENVIRONMENT.baseUrl}/api/user-settings`, {
          theme_preference
        })
      );

      this.settings.set(response.data);
      this.logService.log('Theme preference synced to server', theme_preference);
      return response.data;
    } catch (error) {
      this.logService.log('Error syncing theme to server (saved locally)', error);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Applies the theme to the document by toggling the app-dark class.
   *
   * @param theme - 'light' or 'dark'
   */
  applyTheme(theme: ThemePreference): void {
    // istanbul ignore next - SSR guard: document is always defined in browser tests
    if (typeof document === 'undefined') return;

    const htmlElement = document.documentElement;
    if (theme === 'dark') {
      htmlElement.classList.add('app-dark');
    } else {
      htmlElement.classList.remove('app-dark');
    }

    // Update meta theme-color for browser chrome
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#222' : '#f4f4f4');
    }

    // Update color-scheme meta tag
    const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
    if (metaColorScheme) {
      metaColorScheme.setAttribute('content', theme);
    }
  }

  /**
   * Updates the user's language preference.
   * Saves locally first, then syncs to server when authenticated.
   *
   * @param language - Language code (e.g., 'en-US', 'es', 'fr')
   * @returns Updated user settings (or null if not authenticated/offline)
   */
  async updateLanguagePreference(language: string): Promise<UserSettings | null> {
    // Update local state
    this.languagePreference.set(language);

    // Save to local storage (works offline)
    await this.saveLanguageLocally(language);

    // Sync to server if authenticated
    if (!this.userStorageService.isAuthenticated()) {
      return null;
    }

    this.loading.set(true);

    try {
      const response = await firstValueFrom(
        this.http.patch<{ data: UserSettings }>(`${ENVIRONMENT.baseUrl}/api/user-settings`, {
          language
        })
      );

      this.settings.set(response.data);
      this.logService.log('Language preference synced to server', language);
      return response.data;
    } catch (error) {
      this.logService.log('Error syncing language to server (saved locally)', error);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Sync language preference to server (fire-and-forget).
   * Used during initialization when local is newer than server.
   */
  private syncLanguageToServer(language: string): void {
    if (!this.userStorageService.isAuthenticated()) return;

    this.http.patch<{ data: UserSettings }>(`${ENVIRONMENT.baseUrl}/api/user-settings`, {
      language
    }).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => this.logService.log('Language synced to server', language),
      error: (err: unknown) => this.logService.log('Error syncing language to server', err),
    });
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
   * Resolve theme preference using timestamp-based conflict resolution.
   */
  private async resolveThemeConflict(
    localTheme: LocalPreference<ThemePreference> | null,
    settings: UserSettings | null,
    serverUpdatedAt: number
  ): Promise<ThemePreference> {
    if (localTheme && localTheme.updatedAt > serverUpdatedAt) {
      if (settings && settings.theme_preference !== localTheme.value) {
        this.syncThemeToServer(localTheme.value);
      }
      this.logService.log('Theme: using local (newer)', { local: localTheme.updatedAt, server: serverUpdatedAt });
      return localTheme.value;
    }
    if (settings?.theme_preference) {
      // Save with server timestamp to preserve correct ordering for future syncs
      await this.saveThemeLocally(settings.theme_preference, serverUpdatedAt);
      this.logService.log('Theme: using server (newer)', { local: localTheme?.updatedAt, server: serverUpdatedAt });
      return settings.theme_preference;
    }
    return localTheme?.value ?? 'dark';
  }

  /**
   * Resolve timezone preference using timestamp-based conflict resolution.
   */
  private async resolveTimezoneConflict(
    localTimezone: LocalPreference<string> | null,
    settings: UserSettings | null,
    serverUpdatedAt: number
  ): Promise<string> {
    if (localTimezone && localTimezone.updatedAt > serverUpdatedAt) {
      if (settings && settings.timezone !== localTimezone.value) {
        this.syncTimezoneToServer(localTimezone.value);
      }
      this.logService.log('Timezone: using local (newer)', { local: localTimezone.updatedAt, server: serverUpdatedAt });
      return localTimezone.value;
    }
    if (settings?.timezone) {
      // Save with server timestamp to preserve correct ordering for future syncs
      await this.saveTimezoneLocally(settings.timezone, serverUpdatedAt);
      this.logService.log('Timezone: using server (newer)', { local: localTimezone?.updatedAt, server: serverUpdatedAt });
      return settings.timezone;
    }
    const finalTimezone = localTimezone?.value ?? this.detectTimezone();
    this.syncTimezoneToServer(finalTimezone);
    return finalTimezone;
  }

  /**
   * Resolve language preference using timestamp-based conflict resolution.
   */
  private async resolveLanguageConflict(
    localLanguage: LocalPreference<string> | null,
    settings: UserSettings | null,
    serverUpdatedAt: number
  ): Promise<string | null> {
    if (localLanguage && localLanguage.updatedAt > serverUpdatedAt) {
      if (settings && settings.language !== localLanguage.value) {
        this.syncLanguageToServer(localLanguage.value);
      }
      this.logService.log('Language: using local (newer)', { local: localLanguage.updatedAt, server: serverUpdatedAt });
      return localLanguage.value;
    }
    if (settings?.language) {
      // Save with server timestamp to preserve correct ordering for future syncs
      await this.saveLanguageLocally(settings.language, serverUpdatedAt);
      this.logService.log('Language: using server (newer)', { local: localLanguage?.updatedAt, server: serverUpdatedAt });
      return settings.language;
    }
    return localLanguage?.value ?? null;
  }

  /**
   * Initializes user settings after authentication.
   * Uses timestamp-based conflict resolution:
   * - If local is newer, push to server
   * - If server is newer, apply locally
   * - If no timestamp, server wins (backward compat)
   */
  async initialize(): Promise<void> {
    // Load local preferences with timestamps
    const localTheme = await this.getLocalTheme();
    const localTimezone = await this.getLocalTimezone();
    const localLanguage = await this.getLocalLanguage();

    // Load server settings
    const settings = await this.loadSettings();
    const serverUpdatedAt = settings?.updated_at ? new Date(settings.updated_at).getTime() : 0;

    // Resolve conflicts for each preference
    const finalTheme = await this.resolveThemeConflict(localTheme, settings, serverUpdatedAt);
    const finalTimezone = await this.resolveTimezoneConflict(localTimezone, settings, serverUpdatedAt);
    const finalLanguage = await this.resolveLanguageConflict(localLanguage, settings, serverUpdatedAt);

    // Apply final preferences
    this.themePreference.set(finalTheme);
    this.applyTheme(finalTheme);
    this.timezonePreference.set(finalTimezone);
    this.languagePreference.set(finalLanguage);

    // Apply language to Transloco if it changed from what was loaded locally
    if (finalLanguage && finalLanguage !== this.translocoService.getActiveLang()) {
      this.translocoService.setActiveLang(finalLanguage);
    }

    // Authenticate WebSocket for real-time settings sync
    const token = await this.authService.getToken();
    if (token) {
      this.authenticateWebSocket(token);
    }

    this.logService.log('User settings initialized', { theme: finalTheme, timezone: finalTimezone, language: finalLanguage });
  }

  /**
   * Sync theme to server without updating local storage.
   * Used during initialize when local is newer than server.
   */
  private async syncThemeToServer(theme: ThemePreference): Promise<void> {
    try {
      await firstValueFrom(
        this.http.patch<{ data: UserSettings }>(`${ENVIRONMENT.baseUrl}/api/user-settings`, {
          theme_preference: theme
        })
      );
      this.logService.log('Theme synced to server', theme);
    } catch (error) {
      this.logService.log('Error syncing theme to server', error);
    }
  }

  /**
   * Sync timezone to server without updating local storage.
   * Used during initialize when local is newer than server.
   */
  private async syncTimezoneToServer(timezone: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.patch<{ data: UserSettings }>(`${ENVIRONMENT.baseUrl}/api/user-settings`, {
          timezone
        })
      );
      this.logService.log('Timezone synced to server', timezone);
    } catch (error) {
      this.logService.log('Error syncing timezone to server', error);
    }
  }

  /**
   * Clears server settings and loads anonymous user preferences.
   * Called on logout. Reads from anonymous storage directly (bypassing user-scoped prefixing).
   */
  async clear(): Promise<void> {
    this.settings.set(null);

    // Read anonymous preferences directly using raw keys (bypasses user-scoped prefixing)
    const anonThemeKey = this.userStorageService.prefixKeyForAnonymous(STORAGE_KEYS.THEME);
    const anonTimezoneKey = this.userStorageService.prefixKeyForAnonymous(STORAGE_KEYS.TIMEZONE);
    const anonLanguageKey = this.userStorageService.prefixKeyForAnonymous(STORAGE_KEYS.LANGUAGE);

    const anonTheme = await this.indexedDbService.getRaw(anonThemeKey, IDB_STORES.SETTINGS) as LocalPreference<ThemePreference> | undefined;
    const anonTimezone = await this.indexedDbService.getRaw(anonTimezoneKey, IDB_STORES.SETTINGS) as LocalPreference<string> | undefined;
    const anonLanguage = await this.indexedDbService.getRaw(anonLanguageKey, IDB_STORES.SETTINGS) as LocalPreference<string> | undefined;

    // Use anonymous prefs or fall back to defaults
    const theme = anonTheme?.value ?? 'dark';
    const timezone = anonTimezone?.value ?? this.detectTimezone();
    const language = anonLanguage?.value ?? null;

    this.themePreference.set(theme);
    this.applyTheme(theme);
    this.timezonePreference.set(timezone);
    this.languagePreference.set(language);

    // Apply language to Transloco
    if (language) {
      this.translocoService.setActiveLang(language);
    } else {
      // No stored anonymous language - use default
      this.translocoService.setActiveLang('en-US');
    }

    this.logService.log('Settings cleared, loaded anonymous preferences', { theme, timezone, language });
  }

  /**
   * Deletes user settings from the server and clears local state.
   * Used when user wants to clear all their data.
   */
  async deleteSettings(): Promise<void> {
    this.loading.set(true);

    try {
      await firstValueFrom(
        this.http.delete(`${ENVIRONMENT.baseUrl}/api/user-settings`)
      );

      this.settings.set(null);
      this.logService.log('Settings deleted');
    } catch (error: unknown) {
      // 404 is fine - settings might not exist
      const httpError = error as { status?: number };
      if (httpError.status !== 404) {
        this.logService.log('Error deleting settings', error);
        throw error;
      }
      this.settings.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}
