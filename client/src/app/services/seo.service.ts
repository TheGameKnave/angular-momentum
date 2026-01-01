import { Injectable, inject, PLATFORM_ID, REQUEST } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';

import packageJson from 'src/../package.json';

export interface SeoConfig {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  siteName?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string;
  twitterCreator?: string;
}

/**
 * Service for managing SEO meta tags including Open Graph and Twitter Cards.
 * Automatically generates dynamic screenshot URLs for social media previews.
 *
 * During SSR, meta tags are rendered into the HTML for crawlers.
 * The service uses the request URL to construct proper absolute URLs.
 */
@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private readonly meta = inject(Meta);
  private readonly titleService = inject(Title);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly request = inject(REQUEST, { optional: true });

  /** Base URL from package.json siteUrl field */
  private readonly siteUrl: string = packageJson.siteUrl;

  private defaultConfig: SeoConfig = {
    title: 'Angular Momentum',
    description: 'A modern Angular starter kit with authentication, i18n, GraphQL, IndexedDB, notifications, and more.',
    siteName: 'Angular Momentum',
    type: 'website',
    twitterCard: 'summary_large_image',
  };

  /**
   * Updates SEO meta tags with the provided configuration.
   * Merges with default config and auto-generates screenshot URL if no image provided.
   * @param config - SEO configuration including title, description, image, etc.
   */
  updateTags(config: SeoConfig): void {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const baseUrl = this.getBaseUrl();
    const currentUrl = mergedConfig.url || this.getCurrentUrl();

    // Update title
    if (mergedConfig.title) {
      this.titleService.setTitle(mergedConfig.title);
      this.meta.updateTag({ property: 'og:title', content: mergedConfig.title });
      this.meta.updateTag({ name: 'twitter:title', content: mergedConfig.title });
    }

    // Update description
    if (mergedConfig.description) {
      this.meta.updateTag({ name: 'description', content: mergedConfig.description });
      this.meta.updateTag({ property: 'og:description', content: mergedConfig.description });
      this.meta.updateTag({ name: 'twitter:description', content: mergedConfig.description });
    }

    // Update image - use provided image or generate dynamic screenshot URL
    const imageUrl = mergedConfig.image || this.generateDynamicImageUrl(currentUrl, baseUrl);
    this.meta.updateTag({ property: 'og:image', content: imageUrl });
    this.meta.updateTag({ name: 'twitter:image', content: imageUrl });
    this.meta.updateTag({ property: 'og:image:width', content: '1200' });
    this.meta.updateTag({ property: 'og:image:height', content: '630' });

    // Update URL
    this.meta.updateTag({ property: 'og:url', content: currentUrl });
    this.meta.updateTag({ name: 'twitter:url', content: currentUrl });
    this.updateCanonicalUrl(currentUrl);

    // Update type
    if (mergedConfig.type) {
      this.meta.updateTag({ property: 'og:type', content: mergedConfig.type });
    }

    // Update site name
    if (mergedConfig.siteName) {
      this.meta.updateTag({ property: 'og:site_name', content: mergedConfig.siteName });
    }

    // Update Twitter card type
    if (mergedConfig.twitterCard) {
      this.meta.updateTag({ name: 'twitter:card', content: mergedConfig.twitterCard });
    }

    // Update Twitter site handle
    if (mergedConfig.twitterSite) {
      this.meta.updateTag({ name: 'twitter:site', content: mergedConfig.twitterSite });
    }

    // Update Twitter creator handle
    if (mergedConfig.twitterCreator) {
      this.meta.updateTag({ name: 'twitter:creator', content: mergedConfig.twitterCreator });
    }
  }

  /**
   * Gets the base URL for the application.
   * During SSR, extracts from the request. In browser, uses window.location.
   * Falls back to siteUrl from package.json.
   */
  private getBaseUrl(): string {
    if (isPlatformServer(this.platformId) && this.request) {
      // SSR: construct from request headers
      const host = this.request.headers.get('host');
      const protocol = this.request.headers.get('x-forwarded-proto') || 'https';
      if (host) {
        return `${protocol}://${host}`;
      }
    }

    if (isPlatformBrowser(this.platformId)) {
      return globalThis.location.origin;
    }

    // Fallback to configured site URL
    return this.siteUrl;
  }

  /**
   * Generates a dynamic screenshot URL for the given page.
   * @param pageUrl - The full URL of the page to screenshot
   * @param baseUrl - The base URL to use for the screenshot API endpoint
   * @returns Full URL to the screenshot API endpoint
   */
  private generateDynamicImageUrl(pageUrl: string, baseUrl: string): string {
    const encodedUrl = encodeURIComponent(pageUrl);
    return `${baseUrl}/api/og-image?url=${encodedUrl}`;
  }

  /**
   * Gets the current page URL based on platform (browser or SSR).
   * @returns The current page URL
   */
  private getCurrentUrl(): string {
    const baseUrl = this.getBaseUrl();

    if (isPlatformBrowser(this.platformId)) {
      return globalThis.location.href;
    }

    // SSR: construct from router state
    return `${baseUrl}${this.router.url}`;
  }

  /**
   * Updates or creates the canonical link tag.
   * @param url - The canonical URL to set
   */
  private updateCanonicalUrl(url: string): void {
    if (isPlatformBrowser(this.platformId)) {
      let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');

      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }

      link.setAttribute('href', url);
    }
  }

  /**
   * Sets the default SEO configuration.
   * @param config - Partial SEO config to merge with existing defaults
   */
  setDefaultConfig(config: Partial<SeoConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * Gets a copy of the default SEO configuration.
   * @returns The default SEO config
   */
  getDefaultConfig(): SeoConfig {
    return { ...this.defaultConfig };
  }
}
