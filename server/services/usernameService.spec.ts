import { UsernameService } from './usernameService';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('@supabase/supabase-js');
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('UsernameService', () => {
  describe('without Supabase configured', () => {
    let service: UsernameService;

    beforeEach(() => {
      service = new UsernameService();
    });

    describe('generateFingerprint', () => {
      it('should generate fingerprint from simple username', () => {
        const fingerprint = service.generateFingerprint('JohnDoe');
        expect(fingerprint).toBe('johndoe');
      });

      it('should convert spaces to hyphens', () => {
        const fingerprint = service.generateFingerprint('John Doe');
        expect(fingerprint).toBe('john-doe');
      });

      it('should convert special characters to hyphens', () => {
        const fingerprint = service.generateFingerprint('John@Doe#999');
        expect(fingerprint).toBe('john-doe-999');
      });

      it('should collapse consecutive hyphens', () => {
        const fingerprint = service.generateFingerprint('John---Doe');
        expect(fingerprint).toBe('john-doe');
      });

      it('should remove leading and trailing hyphens', () => {
        const fingerprint = service.generateFingerprint('-John-Doe-');
        expect(fingerprint).toBe('john-doe');
      });

      it('should trim whitespace', () => {
        const fingerprint = service.generateFingerprint('  JohnDoe  ');
        expect(fingerprint).toBe('johndoe');
      });

      it('should normalize homoglyphs', () => {
        // Using Cyrillic 'а' (U+0430) instead of Latin 'a'
        const fingerprint = service.generateFingerprint('Jоhn'); // 'о' is Cyrillic
        expect(fingerprint).toBe('john'); // Should normalize to Latin
      });

      it('should normalize ASCII lookalikes - uppercase I to l', () => {
        const fingerprint = service.generateFingerprint('PaypaI'); // uppercase I
        expect(fingerprint).toBe('paypal'); // I → l
      });

      it('should normalize ASCII lookalikes - number 1 to l', () => {
        const fingerprint = service.generateFingerprint('Paypa1'); // number 1
        expect(fingerprint).toBe('paypal'); // 1 → l
      });

      it('should normalize ASCII lookalikes - zero to O', () => {
        const fingerprint = service.generateFingerprint('F00bar'); // zeros
        expect(fingerprint).toBe('foobar'); // 0 → O → o (after lowercase)
      });

      it('should normalize multiple ASCII lookalikes together', () => {
        const fingerprint = service.generateFingerprint('G00g1e'); // zeros and one
        expect(fingerprint).toBe('google'); // 0 → O, 1 → l
      });

      it('should normalize leet speak - 5 to s', () => {
        const fingerprint = service.generateFingerprint('u5er');
        expect(fingerprint).toBe('user');
      });

      it('should normalize leet speak - 3 to e', () => {
        const fingerprint = service.generateFingerprint('h3llo');
        expect(fingerprint).toBe('hello');
      });

      it('should normalize leet speak - 4 to a', () => {
        const fingerprint = service.generateFingerprint('h4ck3r');
        expect(fingerprint).toBe('hacker');
      });

      it('should normalize leet speak - 6 to g', () => {
        // Note: 'm' becomes 'rn' due to unhomoglyph/decancer confusable normalization
        const fingerprint = service.generateFingerprint('6amer');
        expect(fingerprint).toBe('garner');
      });

      it('should normalize leet speak - 7 to t', () => {
        const fingerprint = service.generateFingerprint('7es7');
        expect(fingerprint).toBe('test');
      });

      it('should normalize leet speak - 8 to b', () => {
        const fingerprint = service.generateFingerprint('8oss');
        expect(fingerprint).toBe('boss');
      });

      it('should normalize multiple leet speak characters', () => {
        const fingerprint = service.generateFingerprint('20Char5');
        expect(fingerprint).toBe('2ochars'); // 0→o (unhomoglyph), 5→s (leet), 2 stays as 2
      });

      it('should combine homoglyph and leet speak normalization', () => {
        const fingerprint = service.generateFingerprint('G00g13');
        expect(fingerprint).toBe('google'); // 0→O (homoglyph), 1→l (homoglyph), 3→e (leet)
      });

      it('should return null for profane usernames', () => {
        const fingerprint = service.generateFingerprint('fuck');
        expect(fingerprint).toBeNull();
      });

      it('should catch leet-spelled profanity after normalization', () => {
        // f*ck with leet speak 4 for u doesn't directly spell it,
        // but h4t3 normalizes to hate which might be caught
        const fingerprint = service.generateFingerprint('5hit');
        expect(fingerprint).toBeNull(); // 5hit → shit → blocked
      });

      it('should handle usernames with accents', () => {
        const fingerprint = service.generateFingerprint('José');
        expect(fingerprint).toBe('jose');
      });

      it('should handle emojis', () => {
        // Note: decancer converts emoji to 'o', so no hyphen separation
        const fingerprint = service.generateFingerprint('John😀Doe');
        expect(fingerprint).toBe('johnodoe');
      });

      it('should normalize fancy Unicode text via decancer', () => {
        // Mathematical symbols, fullwidth, CJK lookalikes
        const fingerprint = service.generateFingerprint('vＥⓡ𝔂 𝔽𝕌Ňℕｙ ţ乇𝕏𝓣');
        expect(fingerprint).toBe('very-funny-text');
      });

      it('should normalize fullwidth characters', () => {
        const fingerprint = service.generateFingerprint('Ｈｅｌｌｏ');
        expect(fingerprint).toBe('hello');
      });

      it('should normalize mathematical alphanumeric symbols', () => {
        const fingerprint = service.generateFingerprint('𝕳𝖊𝖑𝖑𝖔');
        expect(fingerprint).toBe('hello');
      });

      it('should normalize circled/enclosed characters', () => {
        const fingerprint = service.generateFingerprint('ⓗⓔⓛⓛⓞ');
        expect(fingerprint).toBe('hello');
      });
    });

    describe('validateUsername', () => {
      it('should validate a correct username', () => {
        const result = service.validateUsername('JohnDoe');
        expect(result.valid).toBe(true);
        expect(result.fingerprint).toBe('johndoe');
        expect(result.error).toBeUndefined();
      });

      it('should reject username that is too short', () => {
        const result = service.validateUsername('ab');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Username not available');
        expect(result.fingerprint).toBeUndefined();
      });

      it('should reject username that is too long', () => {
        const result = service.validateUsername('a'.repeat(31));
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Username not available');
        expect(result.fingerprint).toBeUndefined();
      });

      it('should accept username at minimum length', () => {
        const result = service.validateUsername('abc');
        expect(result.valid).toBe(true);
        expect(result.fingerprint).toBe('abc');
      });

      it('should accept username at maximum length', () => {
        const result = service.validateUsername('a'.repeat(30));
        expect(result.valid).toBe(true);
        expect(result.fingerprint).toBe('a'.repeat(30));
      });

      it('should reject username with control characters', () => {
        const result = service.validateUsername('John\x00Doe');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Username not available');
      });

      it('should reject username with zero-width characters', () => {
        const result = service.validateUsername('John\u200BDoe');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Username not available');
      });

      it('should reject username with excessive combining diacritics', () => {
        const result = service.validateUsername('Jo\u0301\u0302\u0303hn'); // 3 combining diacritics
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Username not available');
      });

      it('should accept username with acceptable combining diacritics', () => {
        const result = service.validateUsername('Jo\u0301\u0302hn'); // 2 combining diacritics
        expect(result.valid).toBe(true);
      });

      it('should reject username with profanity', () => {
        const result = service.validateUsername('fuck');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Username not available');
      });

      it('should reject username with fingerprint too short after normalization', () => {
        const result = service.validateUsername('!!!'); // Becomes empty after normalization
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Username not available');
      });

      it('should reject username that normalizes to single character', () => {
        const result = service.validateUsername('a!!'); // Becomes 'a' after normalization
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Username not available');
      });
    });
  });

  describe('with Supabase configured', () => {
    let service: UsernameService;
    let mockSupabase: any;

    beforeEach(() => {
      mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn(),
        insert: jest.fn(),
        rpc: jest.fn(),
      };

      mockCreateClient.mockReturnValue(mockSupabase as any);
      service = new UsernameService('https://test.supabase.co', 'test-key');
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('checkAvailability', () => {
      it('should return available when username does not exist', async () => {
        mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

        const result = await service.checkAvailability('johndoe');

        expect(result.available).toBe(true);
        expect(result.error).toBeUndefined();
        expect(mockSupabase.from).toHaveBeenCalledWith('usernames');
        expect(mockSupabase.select).toHaveBeenCalledWith('id');
        expect(mockSupabase.eq).toHaveBeenCalledWith('fingerprint', 'johndoe');
      });

      it('should return not available when username exists', async () => {
        mockSupabase.maybeSingle.mockResolvedValue({ data: { id: '123' }, error: null });

        const result = await service.checkAvailability('johndoe');

        expect(result.available).toBe(false);
        expect(result.error).toBeUndefined();
      });

      it('should return error when database query fails', async () => {
        mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });

        const result = await service.checkAvailability('johndoe');

        expect(result.available).toBe(false);
        expect(result.error).toBe('DB error');
      });

      it('should handle thrown exceptions', async () => {
        mockSupabase.maybeSingle.mockRejectedValue(new Error('Connection failed'));

        const result = await service.checkAvailability('johndoe');

        expect(result.available).toBe(false);
        expect(result.error).toBe('Connection failed');
      });

      it('should handle non-Error exceptions', async () => {
        mockSupabase.maybeSingle.mockRejectedValue('String error');

        const result = await service.checkAvailability('johndoe');

        expect(result.available).toBe(false);
        expect(result.error).toBe('Unknown error');
      });
    });

    describe('createUsername', () => {
      it('should successfully create username', async () => {
        mockSupabase.insert.mockResolvedValue({ error: null });

        const result = await service.createUsername('user-123', 'JohnDoe', 'johndoe');

        expect(result.success).toBe(true);
        expect(result.fingerprint).toBe('johndoe');
        expect(result.error).toBeUndefined();
        expect(mockSupabase.from).toHaveBeenCalledWith('usernames');
        expect(mockSupabase.insert).toHaveBeenCalledWith({
          user_id: 'user-123',
          username: 'JohnDoe',
          fingerprint: 'johndoe'
        });
      });

      it('should handle unique constraint violation', async () => {
        mockSupabase.insert.mockResolvedValue({
          error: { code: '23505', message: 'Unique violation' }
        });

        const result = await service.createUsername('user-123', 'JohnDoe', 'johndoe');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Username not available');
        expect(result.fingerprint).toBeUndefined();
      });

      it('should handle other database errors', async () => {
        mockSupabase.insert.mockResolvedValue({
          error: { code: '42P01', message: 'Table does not exist' }
        });

        const result = await service.createUsername('user-123', 'JohnDoe', 'johndoe');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Table does not exist');
      });

      it('should handle thrown exceptions', async () => {
        mockSupabase.insert.mockRejectedValue(new Error('Connection failed'));

        const result = await service.createUsername('user-123', 'JohnDoe', 'johndoe');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Connection failed');
      });

      it('should handle non-Error exceptions', async () => {
        mockSupabase.insert.mockRejectedValue('String error');

        const result = await service.createUsername('user-123', 'JohnDoe', 'johndoe');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unknown error');
      });
    });

    describe('getEmailByUsername', () => {
      it('should return email when username exists', async () => {
        mockSupabase.rpc.mockResolvedValue({ data: 'john@example.com', error: null });

        const result = await service.getEmailByUsername('JohnDoe');

        expect(result).toBe('john@example.com');
        expect(mockSupabase.rpc).toHaveBeenCalledWith('get_email_by_username', {
          username_input: 'johndoe'
        });
      });

      it('should return null when username does not exist', async () => {
        mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

        const result = await service.getEmailByUsername('NonExistent');

        expect(result).toBeNull();
      });

      it('should return null when RPC returns error', async () => {
        mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });

        const result = await service.getEmailByUsername('JohnDoe');

        expect(result).toBeNull();
      });

      it('should return null for profane username', async () => {
        const result = await service.getEmailByUsername('fuck');

        expect(result).toBeNull();
        expect(mockSupabase.rpc).not.toHaveBeenCalled();
      });

      it('should handle thrown exceptions', async () => {
        mockSupabase.rpc.mockRejectedValue(new Error('Connection failed'));

        const result = await service.getEmailByUsername('JohnDoe');

        expect(result).toBeNull();
      });
    });
  });

  describe('without Supabase - async methods', () => {
    let service: UsernameService;

    beforeEach(() => {
      service = new UsernameService();
    });

    it('checkAvailability should return error when Supabase not configured', async () => {
      const result = await service.checkAvailability('johndoe');

      expect(result.available).toBe(false);
      expect(result.error).toBe('Database not configured');
    });

    it('createUsername should return error when Supabase not configured', async () => {
      const result = await service.createUsername('user-123', 'JohnDoe', 'johndoe');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database not configured');
    });

    it('getEmailByUsername should return null when Supabase not configured', async () => {
      const result = await service.getEmailByUsername('JohnDoe');

      expect(result).toBeNull();
    });
  });
});
