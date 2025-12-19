import { Injectable, inject } from '@angular/core';
import { IndexedDbService, IdbStoreName } from './indexeddb.service';
import { UserStorageService } from './user-storage.service';
import { LogService } from './log.service';
import { ENVIRONMENT } from 'src/environments/environment';
import packageJson from 'src/../package.json';
import { USER_LOCALSTORAGE_NAMES, USER_INDEXEDDB_ENTRIES } from '@app/constants/storage.constants';

/**
 * Structure of exported user data.
 */
export interface ExportedData {
  exportedAt: string;
  appVersion: string;
  userScope: 'anonymous' | 'authenticated';
  userId?: string;
  data: {
    localStorage: Record<string, string>;
    indexedDb: Record<string, unknown>;
    server?: Record<string, unknown>;
  };
}

/**
 * Options for data export.
 */
export interface ExportOptions {
  /** Include server data (requires authentication) */
  includeServerData?: boolean;
  /** Access token for server data export */
  accessToken?: string;
}

/**
 * Service for exporting user data from local storage.
 *
 * Exports all user-scoped data from localStorage and IndexedDB.
 * Works for both anonymous and authenticated users.
 *
 * Used by:
 * - Profile page "Export Data" button
 * - Update dialog "export your data" link (before migration)
 */
@Injectable({
  providedIn: 'root'
})
export class DataExportService {
  private readonly indexedDbService = inject(IndexedDbService);
  private readonly userStorageService = inject(UserStorageService);
  private readonly logService = inject(LogService);

  /**
   * Export all user data from local storage and optionally server.
   *
   * Collects data from localStorage and IndexedDB for the current user scope.
   * Optionally includes server data if authenticated and token provided.
   * Downloads as a JSON file.
   *
   * @param options - Export options
   */
  async exportUserData(options: ExportOptions = {}): Promise<void> {
    const data = await this.collectUserData(options);

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `angular-momentum-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    this.logService.log('User data exported', {
      localStorage: Object.keys(data.data.localStorage).length,
      indexedDb: Object.keys(data.data.indexedDb).length,
      server: data.data.server ? Object.keys(data.data.server).length : 0,
    });
  }

  /**
   * Collect all user data without downloading.
   *
   * @param options - Export options
   * @returns Collected user data
   */
  async collectUserData(options: ExportOptions = {}): Promise<ExportedData> {
    const userId = this.userStorageService.getUserId();
    const isAuthenticated = this.userStorageService.isAuthenticated();

    const data: ExportedData = {
      exportedAt: new Date().toISOString(),
      appVersion: packageJson.version,
      userScope: isAuthenticated ? 'authenticated' : 'anonymous',
      ...(userId && { userId }),
      data: {
        localStorage: this.collectLocalStorageData(),
        indexedDb: await this.collectIndexedDbData(),
      },
    };

    // Collect server data if requested and authenticated
    if (options.includeServerData && options.accessToken) {
      const serverData = await this.fetchServerData(options.accessToken);
      if (serverData) {
        data.data.server = serverData;
      }
    }

    return data;
  }

  /**
   * Collect localStorage data for export.
   */
  private collectLocalStorageData(): Record<string, string> {
    const result: Record<string, string> = {};

    for (const baseKey of USER_LOCALSTORAGE_NAMES) {
      const prefixedKey = this.userStorageService.prefixKey(baseKey);
      try {
        const value = localStorage.getItem(prefixedKey);
        if (value !== null) {
          result[baseKey] = value;
        }
      } catch (error) {
        this.logService.log(`Failed to read localStorage key: ${prefixedKey}`, error);
      }
    }

    return result;
  }

  /**
   * Collect IndexedDB data for export.
   */
  private async collectIndexedDbData(): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};

    for (const { key: baseKey, store } of USER_INDEXEDDB_ENTRIES) {
      const prefixedKey = this.userStorageService.prefixKey(baseKey);
      try {
        const value = await this.indexedDbService.getRaw(prefixedKey, store as IdbStoreName);
        if (value !== undefined) {
          result[baseKey] = value;
        }
      } catch (error) {
        this.logService.log(`Failed to read IndexedDB key: ${prefixedKey}`, error);
      }
    }

    return result;
  }

  /**
   * Fetch user data from server.
   *
   * @param accessToken - Authentication token
   * @returns Server data or null if failed
   */
  private async fetchServerData(accessToken: string): Promise<Record<string, unknown> | null> {
    try {
      const response = await fetch(`${ENVIRONMENT.baseUrl}/api/auth/export-data`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Check if there is any user data to export.
   *
   * @returns True if there is data in either localStorage or IndexedDB
   */
  async hasUserData(): Promise<boolean> {
    // Check localStorage
    for (const baseKey of USER_LOCALSTORAGE_NAMES) {
      const prefixedKey = this.userStorageService.prefixKey(baseKey);
      if (localStorage.getItem(prefixedKey) !== null) {
        return true;
      }
    }

    // Check IndexedDB
    for (const { key: baseKey, store } of USER_INDEXEDDB_ENTRIES) {
      const prefixedKey = this.userStorageService.prefixKey(baseKey);
      try {
        const value = await this.indexedDbService.getRaw(prefixedKey, store as IdbStoreName);
        if (value !== undefined) {
          return true;
        }
      } catch {
        // Ignore errors
      }
    }

    return false;
  }
}
