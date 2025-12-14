import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Re-export validation requirement keys from centralized location
export {
  USERNAME_REQUIREMENT_KEYS,
  PASSWORD_REQUIREMENT_KEYS,
  EMAIL_REQUIREMENT_KEYS
} from '@app/constants/auth.constants';

/**
 * Basic client-side username validator.
 * Server handles comprehensive validation including homoglyph normalization and profanity filtering.
 *
 * Rules:
 * - Length: 3–30 characters
 * - No control characters
 *
 * @returns Validator function
 */
export function usernameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const username = control.value;

    // Allow empty (required validator handles that separately)
    if (!username || username.trim() === '') {
      return null;
    }

    // Basic length check (use spread to count Unicode code points, not UTF-16 code units)
    const codePointLength = [...username].length;
    if (codePointLength < 3 || codePointLength > 30) {
      return { usernameInvalid: { message: 'Username not available' } };
    }

    // Check for control characters (0x00-0x1F, 0x7F-0x9F)
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001F\u007F-\u009F]/.test(username)) {
      return { usernameInvalid: { message: 'Username not available' } };
    }

    return null;
  };
}

/**
 * Enhanced email validator using regex for common email patterns.
 * More comprehensive than Angular's built-in email validator.
 *
 * Rules:
 * - Valid email format (RFC 5322 simplified)
 * - Must have @ symbol
 * - Must have domain
 * - No spaces
 *
 * @returns Validator function
 */
export function emailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const email = control.value;

    // Allow empty (required validator handles that separately)
    if (!email || email.trim() === '') {
      return null;
    }

    // Comprehensive email regex (simplified RFC 5322)
    const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailPattern.test(email)) {
      return { emailInvalid: { message: 'Invalid email address' } };
    }

    // Additional checks (defensive programming - regex already validates these)
    // istanbul ignore next - regex doesn't allow spaces, this is unreachable
    if (email.includes(' ')) {
      return { emailInvalid: { message: 'Invalid email address' } };
    }

    // Check for common mistakes
    const parts = email.split('@');
    // istanbul ignore next - regex requires exactly one @, this is unreachable
    if (parts.length !== 2) {
      return { emailInvalid: { message: 'Invalid email address' } };
    }

    const [localPart, domain] = parts;
    // istanbul ignore next - regex requires non-empty parts, this is unreachable
    if (!localPart || !domain) {
      return { emailInvalid: { message: 'Invalid email address' } };
    }

    if (!domain.includes('.')) {
      return { emailInvalid: { message: 'Invalid email address' } };
    }

    return null;
  };
}

/**
 * Email typo validator - detects common typos like comma instead of dot.
 *
 * @returns Validator function
 */
export function emailTypoValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const email = control.value;

    // Allow empty (required validator handles that separately)
    if (!email || email.trim() === '') {
      return null;
    }

    // Check for comma instead of dot in domain
    if (email.includes(',')) {
      const suggestion = email.replaceAll(',', '.');
      return {
        emailTypo: {
          message: 'Email contains comma - did you mean a dot?',
          suggestion
        }
      };
    }

    return null;
  };
}

/**
 * Detect if Caps Lock is enabled based on keyboard event.
 *
 * @param event - Keyboard event from input field
 * @returns true if Caps Lock is detected as ON
 */
export function isCapsLockOn(event: KeyboardEvent): boolean {
  // Modern browsers support getModifierState
  if (event.getModifierState) {
    return event.getModifierState('CapsLock');
  }

  // Fallback for older browsers: check if shift is pressed and case is opposite
  const char = event.key;
  const shiftPressed = event.shiftKey;

  if (char?.length === 1) {
    const isUpperCase = char === char.toUpperCase() && char !== char.toLowerCase();
    const isLowerCase = char === char.toLowerCase() && char !== char.toUpperCase();

    if (isUpperCase && !shiftPressed) {
      return true; // Uppercase without shift = caps lock on
    }
    if (isLowerCase && shiftPressed) {
      return true; // Lowercase with shift = caps lock on
    }
  }

  return false;
}

/**
 * Password complexity validator.
 *
 * Requirements (either):
 * - Min 8 characters with at least 1 uppercase, 1 lowercase, 1 number, 1 symbol
 * OR
 * - Min 20 characters (no other requirements)
 *
 * @returns Validator function
 */
export function passwordComplexityValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.value;

    // Allow empty (required validator handles that separately)
    if (!password || password.trim() === '') {
      return null;
    }

    // Option 1: 20+ characters (no other requirements)
    if (password.length >= 20) {
      return null;
    }

    // Option 2: 8+ characters with complexity requirements
    if (password.length < 8) {
      return { passwordComplexity: { message: 'Password must be at least 8 characters' } };
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return { passwordComplexity: { message: 'Password must contain at least one uppercase letter' } };
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      return { passwordComplexity: { message: 'Password must contain at least one lowercase letter' } };
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
      return { passwordComplexity: { message: 'Password must contain at least one number' } };
    }

    // Check for at least one special character
    if (!/[^A-Za-z0-9]/.test(password)) {
      return { passwordComplexity: { message: 'Password must contain at least one special character' } };
    }

    return null;
  };
}

/**
 * Password match validator for signup form.
 * Ensures password and confirmPassword fields match.
 *
 * @returns Validator function for FormGroup
 */
export function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    // Skip if either field is empty or confirmPassword doesn't exist
    if (!password || !confirmPassword?.value) {
      return null;
    }

    // Check if passwords match
    if (password.value !== confirmPassword.value) {
      return { passwordMismatch: { message: 'Passwords do not match' } };
    }

    return null;
  };
}

/**
 * Minimum length validator factory.
 *
 * @param minLength - Minimum required length
 * @returns Validator function
 */
export function minLengthValidator(minLength: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    // Allow empty (required validator handles that separately)
    if (!value || value.trim() === '') {
      return null;
    }

    if (value.length < minLength) {
      return { minLength: { requiredLength: minLength, actualLength: value.length } };
    }

    return null;
  };
}
