import { TurnstileService } from './turnstileService';
import config from '../config/environment';

// Mock config
jest.mock('../config/environment', () => ({
  __esModule: true,
  default: {
    turnstile_secret_key: 'mock-secret-key',
  },
}));

// Mock global fetch
global.fetch = jest.fn();

describe('TurnstileService', () => {
  let service: TurnstileService;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

    // Suppress console output
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should use provided secret key', () => {
      service = new TurnstileService('custom-key');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should use config secret key if not provided', () => {
      service = new TurnstileService();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should warn if no secret key is configured', () => {
      // Mock config to return empty string
      (config as any).turnstile_secret_key = '';

      service = new TurnstileService();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Turnstile] Secret key not configured - verification will be skipped in development'
      );

      // Restore
      (config as any).turnstile_secret_key = 'mock-secret-key';
    });
  });

  describe('verifyToken', () => {
    beforeEach(() => {
      service = new TurnstileService('test-secret-key');
    });

    it('should return success when no secret key is configured', async () => {
      // Mock config to return empty string
      (config as any).turnstile_secret_key = '';
      service = new TurnstileService();

      const result = await service.verifyToken('test-token');

      expect(result).toEqual({
        success: true,
        error: 'Verification skipped - no secret key',
      });
      expect(consoleWarnSpy).toHaveBeenCalledWith('[Turnstile] Skipping verification - no secret key configured');
      expect(mockFetch).not.toHaveBeenCalled();

      // Restore
      (config as any).turnstile_secret_key = 'mock-secret-key';
    });

    it('should return error for invalid token format (empty)', async () => {
      const result = await service.verifyToken('');

      expect(result).toEqual({
        success: false,
        error: 'Invalid token format',
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return error for invalid token format (non-string)', async () => {
      const result = await service.verifyToken(null as any);

      expect(result).toEqual({
        success: false,
        error: 'Invalid token format',
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should successfully verify valid token', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const result = await service.verifyToken('valid-token');

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            secret: 'test-secret-key',
            response: 'valid-token',
            remoteip: undefined,
          }),
        }
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('[Turnstile] Token verified successfully');
    });

    it('should successfully verify valid token with remoteIp', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const result = await service.verifyToken('valid-token', '192.168.1.1');

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.objectContaining({
          body: JSON.stringify({
            secret: 'test-secret-key',
            response: 'valid-token',
            remoteip: '192.168.1.1',
          }),
        })
      );
    });

    it('should return error when verification fails', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: false,
          'error-codes': ['invalid-input-response'],
        }),
      } as Response);

      const result = await service.verifyToken('invalid-token');

      expect(result).toEqual({
        success: false,
        error: 'Token verification failed',
        'error-codes': ['invalid-input-response'],
      });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Turnstile] Token verification failed:',
        ['invalid-input-response']
      );
    });

    it('should handle API error response (not ok)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const result = await service.verifyToken('test-token');

      expect(result).toEqual({
        success: false,
        error: 'Verification API error: 500',
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Turnstile] Verification API error:',
        500,
        'Internal Server Error'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.verifyToken('test-token');

      expect(result).toEqual({
        success: false,
        error: 'Network error',
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Turnstile] Verification exception:',
        expect.any(Error)
      );
    });

    it('should handle non-Error exceptions', async () => {
      mockFetch.mockRejectedValue('String error');

      const result = await service.verifyToken('test-token');

      expect(result).toEqual({
        success: false,
        error: 'Verification failed',
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Turnstile] Verification exception:',
        'String error'
      );
    });

    it('should handle API error with different status codes', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      } as Response);

      const result = await service.verifyToken('test-token');

      expect(result).toEqual({
        success: false,
        error: 'Verification API error: 403',
      });
    });

    it('should handle multiple error codes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: false,
          'error-codes': ['timeout-or-duplicate', 'invalid-input-response'],
        }),
      } as Response);

      const result = await service.verifyToken('test-token');

      expect(result).toEqual({
        success: false,
        error: 'Token verification failed',
        'error-codes': ['timeout-or-duplicate', 'invalid-input-response'],
      });
    });
  });

  describe('verifyFromMetadata', () => {
    beforeEach(() => {
      service = new TurnstileService('test-secret-key');
    });

    it('should require token in production (with secret key)', async () => {
      const result = await service.verifyFromMetadata({});

      expect(result).toEqual({
        success: false,
        error: 'Turnstile token required'
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should require token when metadata is null in production', async () => {
      const result = await service.verifyFromMetadata(null as unknown as Record<string, unknown>);

      expect(result).toEqual({
        success: false,
        error: 'Turnstile token required'
      });
    });

    it('should require token when metadata is undefined in production', async () => {
      const result = await service.verifyFromMetadata(undefined as unknown as Record<string, unknown>);

      expect(result).toEqual({
        success: false,
        error: 'Turnstile token required'
      });
    });

    it('should allow missing token in development (no secret key)', async () => {
      (config as any).turnstile_secret_key = '';
      service = new TurnstileService();

      const result = await service.verifyFromMetadata({});

      expect(result).toEqual({ success: true });
      expect(mockFetch).not.toHaveBeenCalled();

      // Restore
      (config as any).turnstile_secret_key = 'mock-secret-key';
    });

    it('should verify token when present in metadata', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const result = await service.verifyFromMetadata({
        turnstile_token: 'valid-token',
      });

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should verify token with remoteIp', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const result = await service.verifyFromMetadata(
        { turnstile_token: 'valid-token' },
        '192.168.1.1'
      );

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.objectContaining({
          body: JSON.stringify({
            secret: 'test-secret-key',
            response: 'valid-token',
            remoteip: '192.168.1.1',
          }),
        })
      );
    });

    it('should return error when token verification fails', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: false,
          'error-codes': ['invalid-input-response'],
        }),
      } as Response);

      const result = await service.verifyFromMetadata({
        turnstile_token: 'invalid-token',
      });

      expect(result).toEqual({
        success: false,
        error: 'Token verification failed',
        'error-codes': ['invalid-input-response'],
      });
    });

    it('should handle metadata with other properties', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const result = await service.verifyFromMetadata({
        turnstile_token: 'valid-token',
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('singleton export', () => {
    it('should export a default singleton instance', () => {
      const turnstileService = require('./turnstileService').default;
      expect(turnstileService).toBeInstanceOf(TurnstileService);
    });
  });
});
