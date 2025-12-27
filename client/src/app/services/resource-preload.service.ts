import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SUPPORTED_LANGUAGES } from '@app/constants/app.constants';
import { TranslocoHttpLoader } from './transloco-loader.service';

/**
 * Resource type definitions for preloading.
 */
export type PreloadResourceType = 'image' | 'font' | 'style' | 'script';

/**
 * Configuration for a resource to preload.
 */
export interface PreloadResource {
  /** URL path to the resource (relative to app root) */
  url: string;
  /** Resource type for browser hints */
  type: PreloadResourceType;
  /** Optional MIME type */
  mimeType?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESOURCE CONFIGURATION - Edit this function to add/remove preloaded resources
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns all resources to preload. Edit this function to configure preloading.
 */
function getResourcesToPreload(translocoLoader: TranslocoHttpLoader): PreloadResource[] {
  return [
    // Fonts
    { url: 'assets/fonts/Raleway-VariableFont_wght.ttf', type: 'font', mimeType: 'font/ttf' },
    { url: 'assets/fonts/Raleway-Italic-VariableFont_wght.ttf', type: 'font', mimeType: 'font/ttf' },

    // Flags - dynamically generated from SUPPORTED_LANGUAGES
    ...SUPPORTED_LANGUAGES.map(lang => ({
      url: `assets/icons/vendor/flags/${translocoLoader.getCountry(lang)}.svg`,
      type: 'image' as const,
      mimeType: 'image/svg+xml',
    })),

    // Add other resources here (images, styles, scripts)
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Service for preloading resources to prevent flickering and improve UX.
 *
 * This service programmatically preloads images, fonts, and other resources
 * during application initialization, ensuring they're cached before being
 * displayed to the user.
 *
 * @example
 * ```typescript
 * // In a provider
 * const preloadService = inject(ResourcePreloadService);
 * await preloadService.preloadAll();
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ResourcePreloadService {
  private readonly translocoLoader = inject(TranslocoHttpLoader);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly preloadedUrls = new Set<string>();

  /**
   * Preloads all configured resources.
   * Called during app initialization to cache resources before use.
   */
  async preloadAll(): Promise<void> {
    // istanbul ignore next - SSR guard
    if (!this.isBrowser) return;

    const resources = getResourcesToPreload(this.translocoLoader);
    await Promise.allSettled(resources.map(r => this.preload(r)));
  }

  /**
   * Preloads a single resource.
   * @param resource - The resource configuration to preload
   */
  async preload(resource: PreloadResource): Promise<void> {
    if (this.preloadedUrls.has(resource.url)) {
      return;
    }

    try {
      switch (resource.type) {
        case 'image':
          await this.preloadImage(resource.url);
          break;
        case 'font':
          await this.preloadFont(resource.url, resource.mimeType);
          break;
        case 'style':
        case 'script':
          await this.preloadViaLink(resource);
          break;
      }
      this.preloadedUrls.add(resource.url);
    } catch {
      // Silently fail - preloading is an optimization, not critical
    }
  }

  /**
   * Checks if a resource has been preloaded.
   * @param url - The resource URL to check
   */
  isPreloaded(url: string): boolean {
    return this.preloadedUrls.has(url);
  }

  /**
   * Preloads an image by creating an Image object.
   * Browser will cache the image after loading.
   */
  private preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to preload image: ${url}`));
      img.src = url;
    });
  }

  /**
   * Preloads a font using the FontFace API if available.
   */
  private async preloadFont(url: string, mimeType?: string): Promise<void> {
    if (!('FontFace' in globalThis)) {
      return this.preloadViaLink({ url, type: 'font', mimeType });
    }

    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const font = new FontFace('preloaded-font', buffer);
    await font.load();
  }

  /**
   * Preloads a resource by adding a preload link to the document head.
   */
  private preloadViaLink(resource: PreloadResource): Promise<void> {
    return new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.url;
      link.as = resource.type;
      if (resource.mimeType) {
        link.type = resource.mimeType;
      }
      link.onload = () => resolve();
      link.onerror = () => resolve(); // Don't fail on preload errors
      document.head.appendChild(link);
    });
  }
}
