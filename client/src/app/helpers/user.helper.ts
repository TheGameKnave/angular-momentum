import { User } from '@supabase/supabase-js';

/**
 * Get user initials for avatar display. Prefers the chosen username (so the
 * avatar reflects identity as soon as one is set) and falls back to the
 * email's first character, then to '?' when neither is available.
 *
 * @param user - Supabase user object
 * @param username - Optional chosen username; takes precedence over email
 * @returns Single character uppercase initial, or '?' if nothing to show
 */
export function getUserInitials(
  user: User | null | undefined,
  username?: string | null,
): string {
  if (username) {
    return username.charAt(0).toUpperCase();
  }
  if (!user?.email) {
    return '?';
  }
  return user.email.charAt(0).toUpperCase();
}
