import { inject, PLATFORM_ID, provideAppInitializer, REQUEST } from '@angular/core';
import { DOCUMENT, isPlatformServer } from '@angular/common';

/**
 * Parse cookies from Cookie header and return value for given name.
 * @param cookieHeader - The Cookie header value
 * @param name - Cookie name to find
 * @returns Cookie value or null
 */
// istanbul ignore next - SSR-only utility, only called during server rendering
function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const pattern = new RegExp(String.raw`(?:^|;\s*)${name}=([^;]+)`);
  const match = pattern.exec(cookieHeader);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Initialize SSR theme based on theme cookie.
 * Only runs on server - browser applies theme from stored preference.
 */
// istanbul ignore next - SSR-only function, unit tests run in browser context
function initializeSsrTheme(): void {
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformServer(platformId)) return;

  const document = inject(DOCUMENT);
  const request = inject(REQUEST, { optional: true });

  if (!request) return;

  const cookieHeader = request.headers.get('cookie');
  const themeCookie = parseCookie(cookieHeader, 'theme');

  // Default is dark (index.html has app-dark class)
  // Only need to remove it if user prefers light
  if (themeCookie === 'light') {
    document.documentElement.classList.remove('app-dark');

    // Update meta tags for light theme
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#f4f4f4');
    }

    const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
    if (metaColorScheme) {
      metaColorScheme.setAttribute('content', 'light');
    }
  }
}

/**
 * Provider for SSR theme initialization.
 * Reads theme preference from cookie during SSR to prevent flash of wrong theme.
 */
export const provideSsrTheme = () => provideAppInitializer(initializeSsrTheme);
