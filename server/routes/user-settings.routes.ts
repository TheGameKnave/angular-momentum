import { Router, Request, Response, NextFunction } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';

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
 * Creates user settings routes with injected dependencies (testable).
 * @param supabase - Supabase client instance
 * @returns Express router with user settings routes
 */
export function createUserSettingsRoutes(supabase: SupabaseClient | null): Router {
  const router = Router();

  /**
   * Auth middleware: validates supabase config and extracts userId from token
   */
  async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    // istanbul ignore next - defensive: early return at line 71 handles null supabase
    if (!supabase) {
      return errorResponse(res, 500, 'Supabase not configured');
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse(res, 401, 'Unauthorized');
    }

    try {
      const token = authHeader.substring(7);
      const { data, error } = await supabase.auth.getUser(token);
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

  // Capture as non-null for use in route handlers (middleware validates this)
  const db = supabase;

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
        return errorResponse(res, 500, error.message);
      }

      res.json({ data });
    } catch (error: unknown) {
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

      if (error) return errorResponse(res, 500, error.message);
      res.status(201).json({ data });
    } catch (error: unknown) {
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

      if (error) return errorResponse(res, 500, error.message);
      res.json({ data });
    } catch (error: unknown) {
      errorResponse(res, 500, getErrorMessage(error));
    }
  });

  /** PATCH /api/user-settings - Update user settings */
  router.patch('/', async (req: AuthenticatedRequest, res: Response) => {
    const userId = getUserId(req, res);
    // istanbul ignore next - defensive: getUserId handles auth failure
    if (!userId) return;

    const timezone = validateTimezone(req.body);
    if (!timezone) return errorResponse(res, 400, 'Timezone is required');

    try {
      const { data, error } = await db
        .from('user_settings')
        .update({ timezone })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) return errorResponse(res, 500, error.message);
      res.json({ data });
    } catch (error: unknown) {
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

      if (error) return errorResponse(res, 500, error.message);
      res.status(204).send();
    } catch (error: unknown) {
      errorResponse(res, 500, getErrorMessage(error));
    }
  });

  return router;
}

export default createUserSettingsRoutes;
