import { getUserInitials } from './user.helper';
import { User } from '@supabase/supabase-js';

describe('User Helper', () => {
  describe('getUserInitials', () => {
    it('should return first letter of email in uppercase', () => {
      const user = {
        email: 'test@example.com',
      } as User;

      expect(getUserInitials(user)).toBe('T');
    });

    it('should return uppercase even if email starts with lowercase', () => {
      const user = {
        email: 'alice@example.com',
      } as User;

      expect(getUserInitials(user)).toBe('A');
    });

    it('should return "?" when user is null', () => {
      expect(getUserInitials(null)).toBe('?');
    });

    it('should return "?" when user is undefined', () => {
      expect(getUserInitials(undefined)).toBe('?');
    });

    it('should return "?" when user email is null', () => {
      const user = {
        email: null,
      } as unknown as User;

      expect(getUserInitials(user)).toBe('?');
    });

    it('should return "?" when user email is undefined', () => {
      const user = {} as User;

      expect(getUserInitials(user)).toBe('?');
    });

    it('should return "?" when user email is empty string', () => {
      const user = {
        email: '',
      } as User;

      expect(getUserInitials(user)).toBe('?');
    });

    it('should handle email starting with number', () => {
      const user = {
        email: '123test@example.com',
      } as User;

      expect(getUserInitials(user)).toBe('1');
    });

    it('should handle email starting with special character', () => {
      const user = {
        email: '_test@example.com',
      } as User;

      expect(getUserInitials(user)).toBe('_');
    });

    it('should handle email already uppercase', () => {
      const user = {
        email: 'TEST@EXAMPLE.COM',
      } as User;

      expect(getUserInitials(user)).toBe('T');
    });
  });
});
