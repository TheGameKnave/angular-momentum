import { computed, Injectable, Signal } from '@angular/core';
import { INSTALLERS, PLATFORMS } from '@app/constants/app.constants';
import { Installer } from '@app/models/data.model';
import { ChangeLogService } from './change-log.service';

/**
 * Service for managing platform-specific application installers.
 *
 * Automatically detects the user's platform and provides appropriate
 * installer URLs with version numbers injected from the changelog service.
 *
 * Features:
 * - Automatic platform detection via user agent
 * - Dynamic installer URL generation with version injection
 * - Computed signals for reactive updates when version changes
 * - Separation of current platform and other platform installers
 */
@Injectable({
  providedIn: 'root'
})
export class InstallersService {
  private _cachedInstallers: Installer[] | null = null;
  private _cachedVersion: string | null = null;

  constructor(
    private readonly changeLogService: ChangeLogService,
  ) { }

  /**
   * Determine the user's platform from user agent string.
   * Matches against known platform patterns.
   *
   * @returns Platform name (e.g., 'Windows', 'macOS', 'Linux') or 'Unknown'
   */
  private determinePlatform(): string {
    const userAgent = globalThis.navigator.userAgent;

    return PLATFORMS.find(p => p.regex.test(userAgent))?.platform ?? 'Unknown';
  }

  /**
   * Computed signal that generates installer list with version-injected URLs.
   * Automatically updates when appVersion changes.
   */
  private readonly installers = computed(() => {
    const version = this.changeLogService.appVersion();
    
    // Return cached array if version hasn't changed
    if (this._cachedVersion === version && this._cachedInstallers) {
      return this._cachedInstallers;
    }
    
    this._cachedVersion = version;
    this._cachedInstallers = INSTALLERS.map(installer => ({
      ...installer,
      url: installer.url.replace(/{version}/g, version),
    }));
    
    return this._cachedInstallers;
  });
  
  /**
   * Computed signal providing the installer for the current platform.
   * Automatically updates when version changes.
   */
  public readonly currentPlatformInstaller: Signal<Installer> = computed(() => {
    const platform = this.determinePlatform();
    return this.installers().find(i => i.name === platform)!;
  });

  /**
   * Computed signal providing installers for all platforms except the current one.
   * Automatically updates when version changes.
   */
  public readonly otherInstallers: Signal<Installer[]> = computed(() => {
    const platform = this.determinePlatform();
    return this.installers().filter(i => i.name !== platform);
  });

  /**
   * Get the installer for the current platform.
   *
   * @returns Installer object for the current platform
   */
  public getCurrentPlatformInstaller(): Installer {
    return this.currentPlatformInstaller();
  }

  /**
   * Get installers for all platforms except the current one.
   *
   * @returns Array of installer objects for other platforms
   */
  public getOtherInstallers(): Installer[] {
    return this.otherInstallers();
  }
}
