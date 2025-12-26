import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { filter } from 'rxjs/operators';

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
 */
@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private readonly meta = inject(Meta);
  private readonly titleService = inject(Title);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  private defaultConfig: SeoConfig = {
    title: 'Angular Momentum',
    description: 'A modern Angular starter kit with authentication, i18n, GraphQL, IndexedDB, notifications, and more.',
    siteName: 'Angular Momentum',
    type: 'website',
    twitterCard: 'summary_large_image',
  };

  constructor() {
    this.setupRouterListener();
  }

  /**
   * Sets up router event listener to update canonical URL on navigation.
   */
  private setupRouterListener(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe(() => {
          // Update canonical URL on route change
          this.updateCanonicalUrl(this.getCurrentUrl());
        });
    }
  }

  /**
   * Updates SEO meta tags with the provided configuration.
   * Merges with default config and auto-generates screenshot URL if no image provided.
   * @param config - SEO configuration including title, description, image, etc.
   */
  updateTags(config: SeoConfig): void {
    const mergedConfig = { ...this.defaultConfig, ...config };

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

    // Update image - dynamic screenshot
    const imageUrl = mergedConfig.image || this.generateDynamicImageUrl(mergedConfig.url);
    this.meta.updateTag({ property: 'og:image', content: imageUrl });
    this.meta.updateTag({ name: 'twitter:image', content: imageUrl });

    // Add image dimensions for better social media display
    this.meta.updateTag({ property: 'og:image:width', content: '1200' });
    this.meta.updateTag({ property: 'og:image:height', content: '630' });

    // Update URL
    const url = mergedConfig.url || this.getCurrentUrl();
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ name: 'twitter:url', content: url });
    this.updateCanonicalUrl(url);

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

    // Update Twitter site
    if (mergedConfig.twitterSite) {
      this.meta.updateTag({ name: 'twitter:site', content: mergedConfig.twitterSite });
    }

    // Update Twitter creator
    if (mergedConfig.twitterCreator) {
      this.meta.updateTag({ name: 'twitter:creator', content: mergedConfig.twitterCreator });
    }
  }

  /**
   * Generates a dynamic screenshot URL for the given page.
   * @param pageUrl - Optional URL to generate screenshot for (defaults to current URL)
   * @returns Full URL to the screenshot API endpoint
   */
  private generateDynamicImageUrl(pageUrl?: string): string {
    const url = pageUrl || this.getCurrentUrl();
    const encodedUrl = encodeURIComponent(url);

    // Generate screenshot URL pointing to our API endpoint
    // In production, you'd use your actual domain
    if (isPlatformBrowser(this.platformId)) {
      return `${window.location.origin}/api/og-image?url=${encodedUrl}`;
    }

    // For SSR, we need to construct the full URL
    // You may want to use an environment variable for the base URL
    const baseUrl = process.env['SITE_URL'] || 'http://localhost:4000';
    return `${baseUrl}/api/og-image?url=${encodedUrl}`;
  }

  /**
   * Gets the current page URL based on platform (browser or SSR).
   * @returns The current page URL
   */
  private getCurrentUrl(): string {
    if (isPlatformBrowser(this.platformId)) {
      return window.location.href;
    }
    // For SSR, construct URL from router state
    const baseUrl = process.env['SITE_URL'] || 'http://localhost:4000';
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
