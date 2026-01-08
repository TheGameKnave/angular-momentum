import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { isTauri as isTauriCheck } from '@tauri-apps/api/core';

/**
 * Platform types supported by Angular Momentum.
 */
export enum Platform {
  /**
   * Running in a web browser (standard Angular application)
   */
  WEB_BROWSER = 'web',

  /**
   * Running as a Tauri desktop application
   */
  TAURI_APP = 'tauri',

  /**
   * Running on the server during Server-Side Rendering
   */
  SSR_SERVER = 'ssr'
}

/**
 * Service for detecting the current runtime platform.
 *
 * This service provides a centralized way to determine whether the application
 * is running in a web browser, Tauri desktop app, or on the SSR server.
 *
 * Platform detection is critical for:
 * - Auth token storage (cookies vs localStorage)
 * - API request handling (automatic cookies vs manual headers)
 * - Feature availability (some features only work on specific platforms)
 * - SSR compatibility (avoiding window/localStorage crashes)
 *
 * Detection logic:
 * 1. SSR Server: `typeof window === 'undefined'` or Angular's PLATFORM_ID
 * 2. Tauri App: Uses official `isTauri()` from @tauri-apps/api/core (desktop & mobile)
 * 3. Web Browser: Everything else
 *
 * @example
 * ```typescript
 * constructor(private platform: PlatformService) {
 *   if (this.platform.isTauri()) {
 *     // Use localStorage for auth tokens
 *   } else if (this.platform.isWeb()) {
 *     // Let Supabase handle cookies
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class PlatformService {
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Current platform as a reactive signal.
   * Updates if the platform context changes (though this is rare).
   */
  readonly currentPlatform = signal<Platform>(this.detectPlatform());

  constructor() {
    // Platform detection happens in detectPlatform()
  }

  /**
   * Detect the current runtime platform.
   * @returns The detected platform (web, tauri, or ssr)
   */
  private detectPlatform(): Platform {
    // Check if running on server (SSR)
    if (!isPlatformBrowser(this.platformId)) {
      return Platform.SSR_SERVER;
    }

    // At this point we know we're in a browser environment
    // Check if running in Tauri (desktop or mobile)
    // istanbul ignore next - Tauri detection requires real Tauri runtime
    if (isTauriCheck()) {
      return Platform.TAURI_APP;
    }

    // Default to web browser
    return Platform.WEB_BROWSER;
  }

  /**
   * Check if currently running in a web browser.
   * @returns true if platform is web browser
   */
  isWeb(): boolean {
    return this.currentPlatform() === Platform.WEB_BROWSER;
  }

  /**
   * Check if currently running in Tauri desktop app.
   * @returns true if platform is Tauri
   */
  isTauri(): boolean {
    return this.currentPlatform() === Platform.TAURI_APP;
  }

  /**
   * Check if currently running on SSR server.
   * @returns true if platform is SSR server
   */
  isSSR(): boolean {
    return this.currentPlatform() === Platform.SSR_SERVER;
  }

  /**
   * Check if running in a browser environment (web or Tauri).
   * Useful for checking if browser APIs are available.
   * @returns true if platform is web or Tauri (not SSR)
   */
  isBrowser(): boolean {
    return this.isWeb() || this.isTauri();
  }

  /**
   * Get platform name as string for logging/debugging.
   * @returns Platform name
   */
  getPlatformName(): string {
    return this.currentPlatform();
  }
}
