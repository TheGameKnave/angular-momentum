import { Request, Response, NextFunction } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { getUserIdFromRequest } from '../helpers/auth.helpers';
import { AUTH_ERROR_CODES } from '../constants/error.constants';

/** Read-only methods that never require authentication. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Whether mutation auth is enforced in the current environment.
 * Mirrors the convention used for the test-only auth endpoints: development
 * and test environments stay open (local demos, unit tests, e2e runs);
 * everything else (production, staging) requires a valid Supabase session.
 * @returns True when authentication should be enforced
 */
export function isAuthEnforced(): boolean {
  return process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test';
}

/**
 * Middleware factory requiring a valid Supabase Bearer token for mutating requests.
 * Read methods (GET/HEAD/OPTIONS) pass through untouched, so it can wrap a whole
 * router while keeping its reads public.
 * @param supabase - Supabase client for token validation, or null if not configured
 * @returns Express middleware enforcing auth on non-safe methods
 */
export function requireAuthForMutations(supabase: SupabaseClient | null) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method) || !isAuthEnforced()) {
      return next();
    }

    if (!supabase) {
      return res.status(503).json({ error: AUTH_ERROR_CODES.SERVICE_NOT_CONFIGURED });
    }

    const userId = await getUserIdFromRequest(req, supabase);
    if (!userId) {
      return res.status(401).json({ error: AUTH_ERROR_CODES.UNAUTHORIZED });
    }

    next();
  };
}
