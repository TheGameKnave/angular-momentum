import { User } from '@supabase/supabase-js';

/**
 * Get user initials for avatar display.
 * Uses first letter of email.
 *
 * @param user - Supabase user object
 * @returns Single character uppercase initial, or '?' if no email
 */
export function getUserInitials(user: User | null | undefined): string {
  if (!user?.email) {
    return '?';
  }

  // Use first letter of email
  return user.email.charAt(0).toUpperCase();
}
