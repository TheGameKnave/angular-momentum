/**
 * Security headers middleware for Express applications.
 * Implements OWASP security header recommendations.
 */
import { RequestHandler } from 'express';

/**
 * Security headers configuration options.
 */
export interface SecurityHeadersOptions {
  /** Content Security Policy - use 'none' to omit (handled by meta tag) */
  contentSecurityPolicy?: string;
  /** Enable HSTS (only use in production with HTTPS) */
  enableHSTS?: boolean;
  /** HSTS max-age in seconds (default: 1 year) */
  hstsMaxAge?: number;
}

/**
 * Creates middleware that sets security headers on all responses.
 * Headers set:
 * - X-Content-Type-Options: nosniff (prevent MIME sniffing)
 * - X-Frame-Options: DENY (prevent clickjacking)
 * - X-XSS-Protection: 0 (disabled - CSP is preferred)
 * - Referrer-Policy: strict-origin-when-cross-origin
 * - Permissions-Policy: restrict dangerous features
 * - Content-Security-Policy: if provided
 * - Strict-Transport-Security: if enabled (production only)
 *
 * @param options - Configuration options
 * @returns Express middleware function
 */
export function securityHeaders(options: SecurityHeadersOptions = {}): RequestHandler {
  const { contentSecurityPolicy, enableHSTS = false, hstsMaxAge = 31536000 } = options;

  return (_req, res, next) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking - DENY is strictest
    res.setHeader('X-Frame-Options', 'DENY');

    // X-XSS-Protection: set to 0 (modern browsers don't need it, CSP is better)
    // Setting to 1; mode=block can introduce vulnerabilities in old IE
    res.setHeader('X-XSS-Protection', '0');

    // Control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Restrict browser features
    res.setHeader(
      'Permissions-Policy',
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
    );

    // Remove x-powered-by if not already done
    res.removeHeader('X-Powered-By');

    // Content Security Policy (if provided and not 'none')
    if (contentSecurityPolicy && contentSecurityPolicy !== 'none') {
      res.setHeader('Content-Security-Policy', contentSecurityPolicy);
    }

    // HSTS - only enable in production with HTTPS
    if (enableHSTS) {
      res.setHeader('Strict-Transport-Security', `max-age=${hstsMaxAge}; includeSubDomains`);
    }

    next();
  };
}
