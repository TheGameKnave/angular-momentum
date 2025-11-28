import { FormControl, FormGroup } from '@angular/forms';
import {
  usernameValidator,
  emailValidator,
  emailTypoValidator,
  passwordComplexityValidator,
  passwordMatchValidator,
  minLengthValidator,
  isCapsLockOn
} from './validation';

describe('Validation Helpers', () => {
  describe('usernameValidator', () => {
    const validator = usernameValidator();

    it('should allow valid username', () => {
      const control = new FormControl('validuser');
      expect(validator(control)).toBeNull();
    });

    it('should allow empty username', () => {
      const control = new FormControl('');
      expect(validator(control)).toBeNull();
    });

    it('should allow whitespace-only username as empty', () => {
      const control = new FormControl('   ');
      expect(validator(control)).toBeNull();
    });

    it('should allow null username', () => {
      const control = new FormControl(null);
      expect(validator(control)).toBeNull();
    });

    it('should reject username shorter than 3 characters', () => {
      const control = new FormControl('ab');
      expect(validator(control)).toEqual({
        usernameInvalid: { message: 'Username not available' }
      });
    });

    it('should reject username longer than 30 characters', () => {
      const control = new FormControl('a'.repeat(31));
      expect(validator(control)).toEqual({
        usernameInvalid: { message: 'Username not available' }
      });
    });

    it('should reject username with control characters', () => {
      const control = new FormControl('user\x00name');
      expect(validator(control)).toEqual({
        usernameInvalid: { message: 'Username not available' }
      });
    });

    it('should allow username exactly 3 characters', () => {
      const control = new FormControl('abc');
      expect(validator(control)).toBeNull();
    });

    it('should allow username exactly 30 characters', () => {
      const control = new FormControl('a'.repeat(30));
      expect(validator(control)).toBeNull();
    });

    it('should count Unicode code points not UTF-16 code units', () => {
      // 𝔂 is a single character but takes 2 UTF-16 code units (surrogate pair)
      // This username has 5 visual characters but would be 6 with .length
      const control = new FormControl('𝔂𝔂𝔂𝔂𝔂');
      expect(validator(control)).toBeNull(); // 5 code points, valid
    });

    it('should reject username with 31 Unicode code points', () => {
      // Mix of regular chars and surrogate pairs
      const control = new FormControl('a'.repeat(30) + '𝔂');
      expect(validator(control)).toEqual({
        usernameInvalid: { message: 'Username not available' }
      }); // 31 code points, invalid
    });
  });

  describe('emailValidator', () => {
    const validator = emailValidator();

    it('should allow valid email', () => {
      const control = new FormControl('user@example.com');
      expect(validator(control)).toBeNull();
    });

    it('should allow empty email', () => {
      const control = new FormControl('');
      expect(validator(control)).toBeNull();
    });

    it('should allow whitespace-only email as empty', () => {
      const control = new FormControl('   ');
      expect(validator(control)).toBeNull();
    });

    it('should allow null email', () => {
      const control = new FormControl(null);
      expect(validator(control)).toBeNull();
    });

    it('should reject invalid email format', () => {
      const control = new FormControl('notanemail');
      expect(validator(control)).toEqual({
        emailInvalid: { message: 'Invalid email address' }
      });
    });

    it('should reject email with spaces', () => {
      const control = new FormControl('user @example.com');
      expect(validator(control)).toEqual({
        emailInvalid: { message: 'Invalid email address' }
      });
    });

    it('should reject email with multiple @ symbols', () => {
      const control = new FormControl('user@@example.com');
      expect(validator(control)).toEqual({
        emailInvalid: { message: 'Invalid email address' }
      });
    });

    it('should reject email without @ symbol', () => {
      const control = new FormControl('userexample.com');
      expect(validator(control)).toEqual({
        emailInvalid: { message: 'Invalid email address' }
      });
    });

    it('should reject email without local part', () => {
      const control = new FormControl('@example.com');
      expect(validator(control)).toEqual({
        emailInvalid: { message: 'Invalid email address' }
      });
    });

    it('should reject email without domain', () => {
      const control = new FormControl('user@');
      expect(validator(control)).toEqual({
        emailInvalid: { message: 'Invalid email address' }
      });
    });

    it('should reject email without domain extension', () => {
      const control = new FormControl('user@example');
      expect(validator(control)).toEqual({
        emailInvalid: { message: 'Invalid email address' }
      });
    });

    it('should allow email with subdomain', () => {
      const control = new FormControl('user@mail.example.com');
      expect(validator(control)).toBeNull();
    });

    it('should allow email with special characters', () => {
      const control = new FormControl('user.name+tag@example.co.uk');
      expect(validator(control)).toBeNull();
    });
  });

  describe('passwordComplexityValidator', () => {
    const validator = passwordComplexityValidator();

    it('should allow empty password', () => {
      const control = new FormControl('');
      expect(validator(control)).toBeNull();
    });

    it('should allow whitespace-only password as empty', () => {
      const control = new FormControl('   ');
      expect(validator(control)).toBeNull();
    });

    it('should allow null password', () => {
      const control = new FormControl(null);
      expect(validator(control)).toBeNull();
    });

    it('should allow password with 20+ characters (no complexity)', () => {
      const control = new FormControl('a'.repeat(20));
      expect(validator(control)).toBeNull();
    });

    it('should allow password with exactly 20 characters', () => {
      const control = new FormControl('abcdefghijklmnopqrst');
      expect(validator(control)).toBeNull();
    });

    it('should reject password with less than 8 characters', () => {
      const control = new FormControl('Pass1!');
      expect(validator(control)).toEqual({
        passwordComplexity: { message: 'Password must be at least 8 characters' }
      });
    });

    it('should reject password without uppercase', () => {
      const control = new FormControl('password1!');
      expect(validator(control)).toEqual({
        passwordComplexity: { message: 'Password must contain at least one uppercase letter' }
      });
    });

    it('should reject password without lowercase', () => {
      const control = new FormControl('PASSWORD1!');
      expect(validator(control)).toEqual({
        passwordComplexity: { message: 'Password must contain at least one lowercase letter' }
      });
    });

    it('should reject password without number', () => {
      const control = new FormControl('Password!');
      expect(validator(control)).toEqual({
        passwordComplexity: { message: 'Password must contain at least one number' }
      });
    });

    it('should reject password without special character', () => {
      const control = new FormControl('Password1');
      expect(validator(control)).toEqual({
        passwordComplexity: { message: 'Password must contain at least one special character' }
      });
    });

    it('should allow valid complex password', () => {
      const control = new FormControl('Password1!');
      expect(validator(control)).toBeNull();
    });

    it('should allow password exactly 8 characters with complexity', () => {
      const control = new FormControl('Pass123!');
      expect(validator(control)).toBeNull();
    });
  });

  describe('passwordMatchValidator', () => {
    const validator = passwordMatchValidator();

    it('should allow matching passwords', () => {
      const group = new FormGroup({
        password: new FormControl('Password123!'),
        confirmPassword: new FormControl('Password123!')
      });
      expect(validator(group)).toBeNull();
    });

    it('should reject non-matching passwords', () => {
      const group = new FormGroup({
        password: new FormControl('Password123!'),
        confirmPassword: new FormControl('DifferentPass123!')
      });
      expect(validator(group)).toEqual({
        passwordMismatch: { message: 'Passwords do not match' }
      });
    });

    it('should allow when confirmPassword is empty', () => {
      const group = new FormGroup({
        password: new FormControl('Password123!'),
        confirmPassword: new FormControl('')
      });
      expect(validator(group)).toBeNull();
    });

    it('should allow when confirmPassword is null', () => {
      const group = new FormGroup({
        password: new FormControl('Password123!'),
        confirmPassword: new FormControl(null)
      });
      expect(validator(group)).toBeNull();
    });

    it('should allow when password field does not exist', () => {
      const group = new FormGroup({
        confirmPassword: new FormControl('Password123!')
      });
      expect(validator(group)).toBeNull();
    });

    it('should allow when confirmPassword field does not exist', () => {
      const group = new FormGroup({
        password: new FormControl('Password123!')
      });
      expect(validator(group)).toBeNull();
    });
  });

  describe('minLengthValidator', () => {
    it('should allow value meeting minimum length', () => {
      const validator = minLengthValidator(5);
      const control = new FormControl('hello');
      expect(validator(control)).toBeNull();
    });

    it('should allow value exceeding minimum length', () => {
      const validator = minLengthValidator(5);
      const control = new FormControl('hello world');
      expect(validator(control)).toBeNull();
    });

    it('should reject value below minimum length', () => {
      const validator = minLengthValidator(5);
      const control = new FormControl('hi');
      expect(validator(control)).toEqual({
        minLength: { requiredLength: 5, actualLength: 2 }
      });
    });

    it('should allow empty value', () => {
      const validator = minLengthValidator(5);
      const control = new FormControl('');
      expect(validator(control)).toBeNull();
    });

    it('should allow whitespace-only value as empty', () => {
      const validator = minLengthValidator(5);
      const control = new FormControl('   ');
      expect(validator(control)).toBeNull();
    });

    it('should allow null value', () => {
      const validator = minLengthValidator(5);
      const control = new FormControl(null);
      expect(validator(control)).toBeNull();
    });

    it('should allow value exactly at minimum length', () => {
      const validator = minLengthValidator(5);
      const control = new FormControl('12345');
      expect(validator(control)).toBeNull();
    });
  });

  describe('emailTypoValidator', () => {
    const validator = emailTypoValidator();

    it('should allow valid email without commas', () => {
      const control = new FormControl('user@example.com');
      expect(validator(control)).toBeNull();
    });

    it('should allow empty email', () => {
      const control = new FormControl('');
      expect(validator(control)).toBeNull();
    });

    it('should detect comma in email and suggest correction', () => {
      const control = new FormControl('user@example,com');
      const result = validator(control);
      expect(result).not.toBeNull();
      expect(result?.['emailTypo'].message).toBe('Email contains comma - did you mean a dot?');
      expect(result?.['emailTypo'].suggestion).toBe('user@example.com');
    });

    it('should detect multiple commas and suggest correction', () => {
      const control = new FormControl('user,name@example,com');
      const result = validator(control);
      expect(result).not.toBeNull();
      expect(result?.['emailTypo'].suggestion).toBe('user.name@example.com');
    });

    it('should allow null email', () => {
      const control = new FormControl(null);
      expect(validator(control)).toBeNull();
    });
  });

  describe('isCapsLockOn', () => {
    it('should detect caps lock via getModifierState', () => {
      const event = {
        key: 'A',
        shiftKey: false,
        getModifierState: (key: string) => key === 'CapsLock'
      } as unknown as KeyboardEvent;

      expect(isCapsLockOn(event)).toBe(true);
    });

    it('should detect caps lock is off via getModifierState', () => {
      const event = {
        key: 'a',
        shiftKey: false,
        getModifierState: (key: string) => false
      } as unknown as KeyboardEvent;

      expect(isCapsLockOn(event)).toBe(false);
    });

    it('should detect caps lock on via uppercase without shift (fallback)', () => {
      const event = {
        key: 'A',
        shiftKey: false,
        getModifierState: undefined
      } as unknown as KeyboardEvent;

      expect(isCapsLockOn(event)).toBe(true);
    });

    it('should detect caps lock on via lowercase with shift (fallback)', () => {
      const event = {
        key: 'a',
        shiftKey: true,
        getModifierState: undefined
      } as unknown as KeyboardEvent;

      expect(isCapsLockOn(event)).toBe(true);
    });

    it('should detect caps lock off with normal typing (fallback)', () => {
      const event = {
        key: 'a',
        shiftKey: false,
        getModifierState: undefined
      } as unknown as KeyboardEvent;

      expect(isCapsLockOn(event)).toBe(false);
    });

    it('should handle non-letter keys', () => {
      const event = {
        key: 'Enter',
        shiftKey: false,
        getModifierState: () => false
      } as unknown as KeyboardEvent;

      expect(isCapsLockOn(event)).toBe(false);
    });
  });
});
