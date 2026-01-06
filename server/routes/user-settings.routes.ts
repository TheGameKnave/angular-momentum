import { Router, Request, Response, NextFunction } from 'express';
import { broadcastUserSettingsUpdate } from '../services/userSettingsSocketService';
import { SupabaseClientPair } from './index';

/** Extended request with userId from auth middleware */
interface AuthenticatedRequest extends Request {
  userId?: string;
}

/**
 * Send a standard error response.
 * @param res - Express response object
 * @param status - HTTP status code
 * @param error - Error message
 * @returns Response object
 */
function errorResponse(res: Response, status: number, error: string) {
  return res.status(status).json({ error });
}

/**
 * Extract userId from authenticated request or return error.
 * @param req - Authenticated request object
 * @param res - Express response object
 * @returns User ID string or null if unauthorized
 */
function getUserId(req: AuthenticatedRequest, res: Response): string | null {
  const userId = req.userId;
  // istanbul ignore next - defensive: middleware guarantees userId is set
  if (!userId) {
    errorResponse(res, 401, 'Unauthorized');
    return null;
  }
  return userId;
}

/**
 * Extract error message from unknown error.
 * @param error - Unknown error object
 * @returns Error message string
 */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * Validate timezone from request body.
 * @param body - Request body object
 * @returns Timezone string or null if invalid
 */
function validateTimezone(body: Record<string, unknown>): string | null {
  const { timezone } = body;
  return (timezone && typeof timezone === 'string') ? timezone : null;
}

/**
 * Validate theme_preference from request body.
 * @param body - Request body object
 * @returns Theme preference string or null if invalid
 */
function validateThemePreference(body: Record<string, unknown>): 'light' | 'dark' | null {
  const { theme_preference } = body;
  if (theme_preference === 'light' || theme_preference === 'dark') {
    return theme_preference;
  }
  return null;
}

/**
 * Validate language from request body.
 * @param body - Request body object
 * @returns Language code string or null if invalid
 */
function validateLanguage(body: Record<string, unknown>): string | null {
  const { language } = body;
  return (language && typeof language === 'string') ? language : null;
}

/**
 * Extract valid settings fields from request body.
 * @param body - Request body object
 * @returns Object with valid settings fields, or null if no valid fields
 */
function extractSettingsFields(body: Record<string, unknown>): { timezone?: string; theme_preference?: 'light' | 'dark'; language?: string } | null {
  const result: { timezone?: string; theme_preference?: 'light' | 'dark'; language?: string } = {};

  const timezone = validateTimezone(body);
  if (timezone) result.timezone = timezone;

  const theme_preference = validateThemePreference(body);
  if (theme_preference) result.theme_preference = theme_preference;

  const language = validateLanguage(body);
  if (language) result.language = language;

  // Return null if no valid fields found
  if (Object.keys(result).length === 0) return null;

  return result;
}

/**
 * Creates user settings routes with injected dependencies (testable).
 *
 * Uses separate Supabase clients for auth and database operations:
 * - supabase.auth: Used for token validation (getUser) - may be contaminated by user sessions
 * - supabase.db: Used for database operations - pure service role, always bypasses RLS
 *
 * This separation ensures the db client always bypasses RLS.
 * See: https://supabase.com/docs/guides/troubleshooting/why-is-my-service-role-key-client-getting-rls-errors-or-not-returning-data-7_1K9z
 *
 * @param supabase - Supabase client pair (auth + db) or null
 * @returns Express router with user settings routes
 */
export function createUserSettingsRoutes(supabase: SupabaseClientPair | null): Router {
  const router = Router();

  /**
   * Auth middleware: validates supabase config and extracts userId from token.
   * Uses supabase.auth client for token validation (may be contaminated by user sessions).
   */
  async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    // istanbul ignore next - defensive: early return below handles null supabase
    if (!supabase) {
      return errorResponse(res, 500, 'Supabase not configured');
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse(res, 401, 'Unauthorized');
    }

    try {
      const token = authHeader.substring(7);
      // Use auth client for token validation - this may contaminate the client
      const { data, error } = await supabase.auth.auth.getUser(token);
      if (error || !data.user) {
        return errorResponse(res, 401, 'Unauthorized');
      }
      req.userId = data.user.id;
      next();
    } catch {
      return errorResponse(res, 401, 'Unauthorized');
    }
  }

  // Early return if supabase not configured - routes won't be functional
  if (!supabase) {
    router.use((_req, res) => errorResponse(res, 500, 'Supabase not configured'));
    return router;
  }

  // Use the db client for all database operations - never exposed to user tokens
  const db = supabase.db;

  // Apply auth middleware to all routes
  router.use(authMiddleware);

  /** GET /api/user-settings - Get current user's settings */
  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    const userId = getUserId(req, res);
    // istanbul ignore next - defensive: getUserId handles auth failure
    if (!userId) return;

    try {
      const { data, error } = await db
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // PGRST116 = no rows found
        if (error.code === 'PGRST116') {
          return res.status(404).json({ data: null });
        }
        console.error('GET /user-settings DB error:', error);
        return errorResponse(res, 500, error.message);
      }

      res.json({ data });
    } catch (error: unknown) {
      console.error('GET /user-settings failed:', error);
      errorResponse(res, 500, getErrorMessage(error));
    }
  });

  /** POST /api/user-settings - Create user settings */
  router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    const userId = getUserId(req, res);
    // istanbul ignore next - defensive: getUserId handles auth failure
    if (!userId) return;

    const timezone = validateTimezone(req.body);
    if (!timezone) return errorResponse(res, 400, 'Timezone is required');

    try {
      const { data, error } = await db
        .from('user_settings')
        .insert({ user_id: userId, timezone })
        .select()
        .single();

      if (error) {
        console.error('POST /user-settings DB error:', error);
        return errorResponse(res, 500, error.message);
      }
      res.status(201).json({ data });
    } catch (error: unknown) {
      console.error('POST /user-settings failed:', error);
      errorResponse(res, 500, getErrorMessage(error));
    }
  });

  /** PUT /api/user-settings - Upsert user settings */
  router.put('/', async (req: AuthenticatedRequest, res: Response) => {
    const userId = getUserId(req, res);
    // istanbul ignore next - defensive: getUserId handles auth failure
    if (!userId) return;

    const timezone = validateTimezone(req.body);
    if (!timezone) return errorResponse(res, 400, 'Timezone is required');

    try {
      const { data, error } = await db
        .from('user_settings')
        .upsert(
          { user_id: userId, timezone },
          { onConflict: 'user_id', ignoreDuplicates: false }
        )
        .select()
        .single();

      if (error) {
        console.error('PUT /user-settings DB error:', error);
        return errorResponse(res, 500, error.message);
      }
      res.json({ data });
    } catch (error: unknown) {
      console.error('PUT /user-settings failed:', error);
      errorResponse(res, 500, getErrorMessage(error));
    }
  });

  /** PATCH /api/user-settings - Update user settings (upserts if not exists) */
  router.patch('/', async (req: AuthenticatedRequest, res: Response) => {
    const userId = getUserId(req, res);
    // istanbul ignore next - defensive: getUserId handles auth failure
    if (!userId) return;

    const fields = extractSettingsFields(req.body);
    if (!fields) return errorResponse(res, 400, 'At least one valid field is required (timezone, theme_preference, or language)');

    try {
      // Use upsert to handle case where user_settings row doesn't exist yet
      const { data, error } = await db
        .from('user_settings')
        .upsert(
          { user_id: userId, ...fields },
          { onConflict: 'user_id', ignoreDuplicates: false }
        )
        .select()
        .single();

      if (error) {
        // 23503 = foreign key violation - user was deleted, token still valid momentarily
        // This is expected during account deletion, not a real error
        if (error.code === '23503') {
          return errorResponse(res, 404, 'User not found');
        }
        console.error('PATCH /user-settings DB error:', error);
        return errorResponse(res, 500, error.message);
      }

      // Broadcast settings update to all user's connected devices
      const io = req.app.get('io');
      if (io && data) {
        broadcastUserSettingsUpdate(io, userId, {
          timezone: data.timezone,
          theme_preference: data.theme_preference,
          language: data.language,
          updated_at: data.updated_at,
        });
      }

      res.json({ data });
    } catch (error: unknown) {
      console.error('PATCH /user-settings failed:', error);
      errorResponse(res, 500, getErrorMessage(error));
    }
  });

  /** DELETE /api/user-settings - Delete user settings */
  router.delete('/', async (req: AuthenticatedRequest, res: Response) => {
    const userId = getUserId(req, res);
    // istanbul ignore next - defensive: getUserId handles auth failure
    if (!userId) return;

    try {
      const { error } = await db
        .from('user_settings')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('DELETE /user-settings DB error:', error);
        return errorResponse(res, 500, error.message);
      }
      res.status(204).send();
    } catch (error: unknown) {
      console.error('DELETE /user-settings failed:', error);
      errorResponse(res, 500, getErrorMessage(error));
    }
  });

  return router;
}

export default createUserSettingsRoutes;
