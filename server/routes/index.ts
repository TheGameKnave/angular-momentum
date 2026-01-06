import { Router } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import featureFlagsRoutes from './feature-flags.routes';
import metadataRoutes from './metadata.routes';
import notificationsRoutes from './notifications.routes';
import { createAuthRoutes } from './auth.routes';
import { createUserSettingsRoutes } from './user-settings.routes';
import { UsernameService } from '../services/usernameService';
import { TurnstileService } from '../services/turnstileService';

/**
 * Supabase client pair - separate clients for auth and database operations.
 * This separation is required because auth methods (like getUser) can contaminate
 * the client's Authorization header, causing RLS to not be bypassed.
 */
export interface SupabaseClientPair {
  /** Client for auth operations (token validation) - may be contaminated by user tokens */
  auth: SupabaseClient;
  /** Client for database operations - pure service role, always bypasses RLS */
  db: SupabaseClient;
}

/**
 * Creates API routes with injected dependencies (testable).
 * @param supabase - Supabase client pair (auth + db) or null
 * @param usernameService - Username service instance
 * @param turnstileService - Turnstile CAPTCHA service instance
 * @returns Express router with all API routes
 */
export function createApiRoutes(
  supabase: SupabaseClientPair | null,
  usernameService: UsernameService | null,
  turnstileService: TurnstileService
): Router {
  const router = Router();

  // Create route modules with dependency injection
  // Auth routes use supabase.auth for token validation
  const authRoutes = createAuthRoutes(supabase?.auth ?? null, usernameService, turnstileService);
  // User settings routes use the full client pair
  const userSettingsRoutes = createUserSettingsRoutes(supabase);

  // Mount route modules
  router.use('/auth', authRoutes);
  router.use('/feature-flags', featureFlagsRoutes);
  router.use('/notifications', notificationsRoutes);
  router.use('/user-settings', userSettingsRoutes);

  // Metadata routes (flat structure)
  router.use('/', metadataRoutes);

  return router;
}

export default createApiRoutes;
