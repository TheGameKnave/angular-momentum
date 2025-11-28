import { Request } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Extract and validate user from Authorization header
 * @param req - Express request object
 * @param supabase - Supabase client instance
 * @returns User ID if valid, null otherwise
 */
export async function getUserIdFromRequest(
  req: Request,
  supabase: SupabaseClient
): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return null;
    }
    return data.user.id;
  } catch {
    return null;
  }
}

/**
 * Check if username is available for the given user
 * @param supabase - Supabase client instance
 * @param fingerprint - Username fingerprint to check
 * @param userId - Current user ID
 * @returns Object with availability status and optional error
 */
export async function checkUsernameAvailability(
  supabase: SupabaseClient,
  fingerprint: string,
  userId: string
): Promise<{ available: boolean; isCurrentUser: boolean; error?: string }> {
  const { data: existing, error: checkError } = await supabase
    .from('usernames')
    .select('user_id')
    .eq('fingerprint', fingerprint)
    .maybeSingle();

  if (checkError) {
    return { available: false, isCurrentUser: false, error: checkError.message };
  }

  if (!existing) {
    return { available: true, isCurrentUser: false };
  }

  return {
    available: existing.user_id === userId,
    isCurrentUser: existing.user_id === userId
  };
}

/**
 * Upsert username for a user (update if exists, insert if not)
 * @param supabase - Supabase client instance
 * @param userId - User ID
 * @param username - Username to set
 * @param fingerprint - Username fingerprint
 * @returns Object with result data or error
 */
export async function upsertUsername(
  supabase: SupabaseClient,
  userId: string,
  username: string,
  fingerprint: string
): Promise<{ data?: Record<string, unknown>; error?: string }> {
  // Check if user already has a username
  const { data: currentUsername, error: getCurrentError } = await supabase
    .from('usernames')
    .select('username')
    .eq('user_id', userId)
    .maybeSingle();

  if (getCurrentError) {
    return { error: getCurrentError.message };
  }

  if (currentUsername) {
    // Update existing username
    const { data, error } = await supabase
      .from('usernames')
      .update({ username, fingerprint })
      .eq('user_id', userId)
      .select()
      .single();

    return error ? { error: error.message } : { data };
  }

  // Create new username
  const { data, error } = await supabase
    .from('usernames')
    .insert({ user_id: userId, username, fingerprint })
    .select()
    .single();

  return error ? { error: error.message } : { data };
}
