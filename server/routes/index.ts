import { Router } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import featureFlagsRoutes from './feature-flags.routes';
import metadataRoutes from './metadata.routes';
import notificationsRoutes from './notifications.routes';
import { createAuthRoutes } from './auth.routes';
import { createUserSettingsRoutes } from './user-settings.routes';
import { UsernameService } from '../services/usernameService';
import { requireAuthForMutations } from '../middleware/requireAuth';

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
 * @returns Express router with all API routes
 */
export function createApiRoutes(
  supabase: SupabaseClientPair | null,
  usernameService: UsernameService | null,
): Router {
  const router = Router();

  // Create route modules with dependency injection
  // Auth routes use supabase.auth for token validation
  const authRoutes = createAuthRoutes(supabase?.auth ?? null, usernameService);
  // User settings routes use the full client pair
  const userSettingsRoutes = createUserSettingsRoutes(supabase);

  // Mount route modules
  // Feature-flag and notification mutations are admin-grade (flag writes broadcast to
  // every connected client) — reads stay public, writes require a Supabase session.
  const mutationAuth = requireAuthForMutations(supabase?.auth ?? null);
  router.use('/auth', authRoutes);
  router.use('/feature-flags', mutationAuth, featureFlagsRoutes);
  router.use('/notifications', mutationAuth, notificationsRoutes);
  router.use('/user-settings', userSettingsRoutes);

  // Metadata routes (flat structure)
  router.use('/', metadataRoutes);

  return router;
}

export default createApiRoutes;
