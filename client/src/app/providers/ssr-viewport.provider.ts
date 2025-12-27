import { inject, PLATFORM_ID, provideAppInitializer, REQUEST } from '@angular/core';
import { DOCUMENT, isPlatformServer } from '@angular/common';

/**
 * Detect if User-Agent indicates a mobile device.
 * @param userAgent - The User-Agent header value
 * @returns True if mobile device detected
 */
// istanbul ignore next - SSR-only utility, only called during server rendering
function isMobileUserAgent(userAgent: string | null): boolean {
  if (!userAgent) return false;
  // Common mobile device patterns
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(userAgent);
}

/**
 * Initialize SSR viewport classes based on User-Agent.
 * Sets mobile or desktop body classes during SSR to prevent layout flash on hydration.
 * Only runs on server - browser sets classes based on actual window.innerWidth.
 */
// istanbul ignore next - SSR-only function, unit tests run in browser context
function initializeSsrViewport(): void {
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformServer(platformId)) return;

  const document = inject(DOCUMENT);
  const request = inject(REQUEST, { optional: true });

  if (!request) return;

  const userAgent = request.headers.get('user-agent');
  const isMobile = isMobileUserAgent(userAgent);

  // Set body classes based on detected device type
  // Mobile: assume phone viewport (< 576px)
  // Desktop: assume large viewport (>= 1200px)
  if (isMobile) {
    document.body.className = 'screen-xs not-sm not-md not-lg not-xl';
  } else {
    document.body.className = 'screen-xs screen-sm screen-md screen-lg screen-xl';
  }
}

/**
 * Provider for SSR viewport initialization.
 * Detects mobile vs desktop from User-Agent to set appropriate body classes,
 * preventing layout flash when Angular hydrates on the client.
 */
export const provideSsrViewport = () => provideAppInitializer(initializeSsrViewport);
