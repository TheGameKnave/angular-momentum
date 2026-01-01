import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LogService } from './log.service';
import { isTauri } from '@tauri-apps/api/core';

/**
 * Service for handling deep links on mobile Tauri apps.
 *
 * When the app is opened via a Universal Link (iOS) or App Link (Android),
 * this service captures the URL and navigates to the appropriate route.
 *
 * This service only activates on mobile Tauri platforms (iOS/Android).
 * On desktop Tauri and web browsers, it does nothing (the plugin will fail gracefully).
 */
@Injectable({
  providedIn: 'root'
})
export class DeepLinkService {
  private readonly router = inject(Router);
  private readonly log = inject(LogService);

  private initialized = false;

  /**
   * Initialize deep link handling.
   * Should be called once during app startup (e.g., in AppComponent).
   * Only runs on Tauri mobile platforms (iOS/Android).
   */
  // istanbul ignore next - Tauri plugin requires native mobile environment, cannot be unit tested
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // Only run on Tauri (deep links are handled natively on web)
    if (!isTauri()) return;

    try {
      const { onOpenUrl, getCurrent } = await import('@tauri-apps/plugin-deep-link');

      // Check if app was opened via a deep link
      const urls = await getCurrent();
      if (urls?.length) {
        this.handleDeepLink(urls[0]);
      }

      // Listen for deep links while app is running
      await onOpenUrl((urls: string[]) => {
        if (urls?.length) {
          this.handleDeepLink(urls[0]);
        }
      });

      this.log.log('[DeepLink] Deep link handling initialized');
    } catch {
      // Plugin not available on this platform (e.g., desktop) - this is expected
    }
  }

  /**
   * Handle an incoming deep link URL.
   * Extracts the path and navigates to it.
   */
  // istanbul ignore next - only called from initialize() which requires Tauri mobile environment
  private handleDeepLink(url: string): void {
    this.log.log('[DeepLink] Received deep link:', url);

    try {
      const parsed = new URL(url);
      const path = parsed.pathname + parsed.search + parsed.hash;

      this.log.log('[DeepLink] Navigating to:', path);
      this.router.navigateByUrl(path);
    } catch (error) {
      this.log.log('[DeepLink] Failed to parse deep link URL:', error);
    }
  }
}
