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
 * Creates API routes with injected dependencies (testable).
 * @param supabase - Supabase client instance
 * @param usernameService - Username service instance
 * @param turnstileService - Turnstile CAPTCHA service instance
 * @returns Express router with all API routes
 */
export function createApiRoutes(
  supabase: SupabaseClient | null,
  usernameService: UsernameService | null,
  turnstileService: TurnstileService
): Router {
  const router = Router();

  // Create route modules with dependency injection
  const authRoutes = createAuthRoutes(supabase, usernameService, turnstileService);
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
