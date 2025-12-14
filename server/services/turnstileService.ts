import config from '../config/environment';

/**
 * Cloudflare Turnstile verification service.
 *
 * Verifies CAPTCHA tokens with Cloudflare's Turnstile API.
 */
export class TurnstileService {
  private readonly secretKey: string;
  private readonly verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

  constructor(
    secretKey?: string,
  ) {
    this.secretKey = secretKey || config.turnstile_secret_key || '';

    if (!this.secretKey) {
      console.warn('[Turnstile] Secret key not configured - verification will be skipped in development');
    }
  }

  /**
   * Verify a Turnstile token with Cloudflare.
   *
   * @param token - The turnstile token from the client
   * @param remoteIp - Optional IP address of the user
   * @returns Promise<boolean> - true if token is valid, false otherwise
   */
  async verifyToken(token: string, remoteIp?: string): Promise<{
    success: boolean;
    error?: string;
    'error-codes'?: string[];
  }> {
    // If no secret key configured, allow in development
    if (!this.secretKey) {
      console.warn('[Turnstile] Skipping verification - no secret key configured');
      return {
        success: true,
        error: 'Verification skipped - no secret key'
      };
    }

    // Validate token format
    if (!token || typeof token !== 'string') {
      return {
        success: false,
        error: 'Invalid token format'
      };
    }

    try {
      const response = await fetch(this.verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: this.secretKey,
          response: token,
          remoteip: remoteIp,
        }),
      });

      if (!response.ok) {
        console.error('[Turnstile] Verification API error:', response.status, response.statusText);
        return {
          success: false,
          error: `Verification API error: ${response.status}`
        };
      }

      const data = await response.json();

      if (data.success) {
        /**/console.log('[Turnstile] Token verified successfully');
        return { success: true };
      } else {
        console.warn('[Turnstile] Token verification failed:', data['error-codes']);
        return {
          success: false,
          error: 'Token verification failed',
          'error-codes': data['error-codes']
        };
      }
    } catch (error) {
      console.error('[Turnstile] Verification exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  /**
   * Verify turnstile token from user metadata (Supabase signup flow).
   *
   * @param userMetadata - User metadata from Supabase auth
   * @param remoteIp - Optional IP address
   * @returns Promise with verification result
   */
  async verifyFromMetadata(
    userMetadata: Record<string, unknown>,
    remoteIp?: string
  ): Promise<{ success: boolean; error?: string }> {
    const token = userMetadata?.turnstile_token;

    if (!token || typeof token !== 'string') {
      // If no token provided, allow signup (CAPTCHA might not be required)
      return { success: true };
    }

    return this.verifyToken(token, remoteIp);
  }
}

// Export singleton instance
export default new TurnstileService();
