import { Router, Request, Response } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { UsernameService } from '../services/usernameService';
import { TurnstileService } from '../services/turnstileService';
import { getUserIdFromRequest, checkUsernameAvailability, upsertUsername } from '../helpers/auth.helpers';
import {
  AUTH_ERROR_CODES,
  USERNAME_ERROR_CODES,
  CAPTCHA_ERROR_CODES,
  WEBHOOK_ERROR_CODES,
  DATA_ERROR_CODES,
  GENERIC_ERROR_CODES,
} from '../constants/error.constants';

/**
 * Creates auth routes with injected dependencies (testable).
 * @param supabase - Supabase client instance
 * @param usernameService - Username service instance
 * @param turnstileService - Turnstile CAPTCHA service instance
 * @returns Express router with auth routes
 */
export function createAuthRoutes(
  supabase: SupabaseClient | null,
  usernameService: UsernameService | null,
  turnstileService: TurnstileService
): Router {
  const router = Router();

  // ============================================================================
  // TEST-ONLY ENDPOINTS (only available in test/development environments)
  // ============================================================================

  /**
   * POST /api/auth/test/create-user
   * Creates a test user with auto-verified status (bypasses email verification).
   * ONLY available when NODE_ENV === 'test' or 'development'.
   *
   * Request body:
   * {
   *   "email": "test@example.com",
   *   "password": "TestPassword123!",
   *   "username": "optional_username"
   * }
   *
   * Response:
   * {
   *   "success": true,
   *   "userId": "uuid-here",
   *   "email": "test@example.com"
   * }
   */
  router.post('/test/create-user', async (req: Request, res: Response) => {
    // Only allow in test/development environments
    if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        error: 'Test endpoints are only available in test/development environments'
      });
    }

    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: AUTH_ERROR_CODES.SERVICE_NOT_CONFIGURED
      });
    }

    const { email, password, username } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    try {
      // Create user with admin API (auto-confirms email)
      const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-verify email
        user_metadata: username ? { username } : {}
      });

      if (createError) {
        return res.status(400).json({
          success: false,
          error: createError.message
        });
      }

      // If username provided, create username record
      if (username && usernameService && userData.user) {
        const validationResult = usernameService.validateUsername(username);
        /* istanbul ignore else -- fingerprint always exists when valid */
        if (validationResult.valid && validationResult.fingerprint) {
          await usernameService.createUsername(
            userData.user.id,
            username,
            validationResult.fingerprint
          );
        }
      }

      /* istanbul ignore next -- userData.user always exists after createUser succeeds */
      res.json({
        success: true,
        userId: userData.user?.id,
        email: userData.user?.email
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        error: message
      });
    }
  });

  /**
   * DELETE /api/auth/test/delete-user
   * Deletes a test user and all associated data.
   * ONLY available when NODE_ENV === 'test' or 'development'.
   *
   * Request body:
   * {
   *   "email": "test@example.com"
   * }
   * OR
   * {
   *   "userId": "uuid-here"
   * }
   *
   * Response:
   * {
   *   "success": true
   * }
   */
  router.delete('/test/delete-user', async (req: Request, res: Response) => {
    // Only allow in test/development environments
    if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        error: 'Test endpoints are only available in test/development environments'
      });
    }

    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: AUTH_ERROR_CODES.SERVICE_NOT_CONFIGURED
      });
    }

    const { email, userId } = req.body;

    if (!email && !userId) {
      return res.status(400).json({
        success: false,
        error: 'Email or userId is required'
      });
    }

    try {
      let targetUserId = userId;

      // If email provided, look up userId
      if (email && !userId) {
        const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
        /* istanbul ignore next -- listData null without error is unlikely */
        if (listError || !listData) {
          return res.status(500).json({
            success: false,
            error: listError?.message || 'Failed to list users'
          });
        }
        const user = listData.users.find((u: { email?: string }) => u.email === email);
        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }
        targetUserId = user.id;
      }

      // Delete username record first (foreign key constraint)
      await supabase
        .from('usernames')
        .delete()
        .eq('user_id', targetUserId);

      // Delete user settings
      await supabase
        .from('user_settings')
        .delete()
        .eq('user_id', targetUserId);

      // Delete the auth user
      const { error: deleteError } = await supabase.auth.admin.deleteUser(targetUserId);

      if (deleteError) {
        return res.status(500).json({
          success: false,
          error: deleteError.message
        });
      }

      res.json({
        success: true
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        error: message
      });
    }
  });

  // ============================================================================
  // PRODUCTION ENDPOINTS
  // ============================================================================

  /**
   * POST /api/auth/webhook/signup-verification
   * Webhook endpoint called by Supabase after user signup.
   * Verifies Turnstile CAPTCHA token and deletes user if verification fails.
   *
   * This should be configured in Supabase Dashboard:
   * Authentication → Hooks → Add a new hook
   * - Hook Type: "User Signup"
   * - URL: https://yourdomain.com/api/auth/webhook/signup-verification
   * - Secret: (optional, for webhook signature verification)
   *
   * Request body (from Supabase):
   * {
   *   "type": "INSERT",
   *   "table": "users",
   *   "record": {
   *     "id": "uuid",
   *     "email": "user@example.com",
   *     "raw_user_meta_data": {
   *       "username": "optional",
   *       "turnstile_token": "captcha-token-here"
   *     }
   *   }
   * }
   *
   * Response:
   * {
   *   "success": true,
   *   "message": "User verified" | "CAPTCHA verification failed - user deleted"
   * }
   */
  router.post('/webhook/signup-verification', async (req: Request, res: Response) => {
    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: AUTH_ERROR_CODES.SERVICE_NOT_CONFIGURED
      });
    }

    try {
      // Extract user data from Supabase webhook payload
      const { record } = req.body;

      if (!record?.id) {
        return res.status(400).json({
          success: false,
          error: WEBHOOK_ERROR_CODES.INVALID_PAYLOAD
        });
      }

      const userId = record.id;
      /* istanbul ignore next */
      const userMetadata = record.raw_user_meta_data || {};
      /* istanbul ignore next */
      const remoteIp = req.ip || req.socket?.remoteAddress;

      // Skip verification in development environment
      if (process.env.NODE_ENV === 'development') {
        return res.json({
          success: true,
          message: 'User verified (dev mode - no CAPTCHA check)'
        });
      }

      // Verify Turnstile token
      const verificationResult = await turnstileService.verifyFromMetadata(userMetadata, remoteIp);

      if (!verificationResult.success) {
        // Delete the user account (requires service role key)
        const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

        if (deleteError) {
          return res.status(500).json({
            success: false,
            error: CAPTCHA_ERROR_CODES.CLEANUP_FAILED
          });
        }

        return res.json({
          success: true,
          message: 'CAPTCHA verification failed - user deleted',
          verification_failed: true
        });
      }

      res.json({
        success: true,
        message: 'User verified'
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        error: message
      });
    }
  });

  /**
   * POST /api/auth/username/validate
   * Validates username format and generates fingerprint.
   *
   * Request body:
   * {
   *   "username": "José™ 🎨"
   * }
   *
   * Response:
   * {
   *   "valid": true,
   *   "fingerprint": "jose",
   *   "error": null
   * }
   */
  router.post('/username/validate', (req: Request, res: Response) => {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        valid: false,
        error: USERNAME_ERROR_CODES.REQUIRED
      });
    }

    if (!usernameService) {
      return res.status(503).json({
        valid: false,
        error: AUTH_ERROR_CODES.SERVICE_NOT_CONFIGURED
      });
    }

    const result = usernameService.validateUsername(username);
    // Return error code if validation failed
    if (!result.valid && result.error) {
      return res.json({
        ...result,
        error: USERNAME_ERROR_CODES.NOT_AVAILABLE
      });
    }
    res.json(result);
  });

  /**
   * POST /api/auth/username/check
   * Checks if a username is available (not taken).
   *
   * Request body:
   * {
   *   "username": "José™ 🎨"
   * }
   *
   * Response:
   * {
   *   "available": true,
   *   "fingerprint": "jose",
   *   "error": null
   * }
   */
  router.post('/username/check', async (req: Request, res: Response) => {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        available: false,
        error: USERNAME_ERROR_CODES.REQUIRED
      });
    }

    if (!usernameService) {
      return res.status(503).json({
        available: false,
        error: AUTH_ERROR_CODES.SERVICE_NOT_CONFIGURED
      });
    }

    const validationResult = usernameService.validateUsername(username);
    if (!validationResult.valid || !validationResult.fingerprint) {
      return res.json({
        available: false,
        error: USERNAME_ERROR_CODES.NOT_AVAILABLE
      });
    }

    const availabilityResult = await usernameService.checkAvailability(
      validationResult.fingerprint
    );

    res.json({
      ...availabilityResult,
      fingerprint: validationResult.fingerprint
    });
  });

  /**
   * POST /api/auth/username/create
   * Creates a new username for a user.
   *
   * Request body:
   * {
   *   "userId": "uuid-here",
   *   "username": "José™ 🎨"
   * }
   *
   * Response:
   * {
   *   "success": true,
   *   "fingerprint": "jose",
   *   "error": null
   * }
   */
  router.post('/username/create', async (req: Request, res: Response) => {
    const { userId, username } = req.body;

    if (!userId || !username) {
      return res.status(400).json({
        success: false,
        error: USERNAME_ERROR_CODES.REQUIRED
      });
    }

    if (!usernameService) {
      return res.status(503).json({
        success: false,
        error: AUTH_ERROR_CODES.SERVICE_NOT_CONFIGURED
      });
    }

    const validationResult = usernameService.validateUsername(username);
    if (!validationResult.valid || !validationResult.fingerprint) {
      return res.json({
        success: false,
        error: USERNAME_ERROR_CODES.NOT_AVAILABLE
      });
    }

    const result = await usernameService.createUsername(
      userId,
      username,
      validationResult.fingerprint
    );

    res.json(result);
  });

  /**
   * POST /api/auth/login
   * Handles login with email OR username + password.
   * Username → email lookup happens server-side (not exposed to client).
   *
   * Request body:
   * {
   *   "identifier": "user@example.com" | "JugglerVR",
   *   "password": "secretpassword"
   * }
   *
   * Response:
   * {
   *   "success": true,
   *   "user": { ... },
   *   "session": { ... },
   *   "error": null
   * }
   */
  router.post('/login', async (req: Request, res: Response) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: AUTH_ERROR_CODES.INVALID_CREDENTIALS
      });
    }

    if (!supabase || !usernameService) {
      return res.status(503).json({
        success: false,
        error: AUTH_ERROR_CODES.SERVICE_NOT_CONFIGURED
      });
    }

    try {
      let email: string | null = null;

      // Check if identifier is email or username
      if (identifier.includes('@')) {
        // It's an email
        email = identifier;
      } else {
        // It's a username - look up email server-side
        email = await usernameService.getEmailByUsername(identifier);

        if (!email) {
          // Username not found - return generic error
          return res.status(401).json({
            success: false,
            error: AUTH_ERROR_CODES.INVALID_CREDENTIALS
          });
        }
      }

      // Authenticate with Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        // Return generic error to prevent user enumeration
        return res.status(401).json({
          success: false,
          error: AUTH_ERROR_CODES.INVALID_CREDENTIALS
        });
      }

      // Success - return session and user data
      return res.json({
        success: true,
        user: data.user,
        session: data.session
      });
    } catch {
      return res.status(500).json({
        success: false,
        error: AUTH_ERROR_CODES.LOGIN_FAILED
      });
    }
  });

  /**
   * GET /api/auth/username
   * Get the current user's username.
   *
   * Requires authentication via Bearer token.
   *
   * Response:
   * {
   *   "success": true,
   *   "username": "JugglerVR",
   *   "fingerprint": "jugglervr",
   *   "error": null
   * }
   */
  router.get('/username', async (req: Request, res: Response) => {
    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: AUTH_ERROR_CODES.SERVICE_NOT_CONFIGURED
      });
    }

    try {
      const userId = await getUserIdFromRequest(req, supabase);
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: AUTH_ERROR_CODES.UNAUTHORIZED
        });
      }

      // Query username from database
      const { data: usernameData, error: dbError } = await supabase
        .from('usernames')
        .select('username, fingerprint')
        .eq('user_id', userId)
        .single();

      if (dbError) {
        // 406 is returned by Supabase when no rows found
        if (dbError.code === 'PGRST116') {
          return res.json({
            success: true,
            username: null,
            fingerprint: null
          });
        }
        return res.status(500).json({
          success: false,
          error: GENERIC_ERROR_CODES.DATABASE_ERROR
        });
      }

      res.json({
        success: true,
        username: usernameData.username,
        fingerprint: usernameData.fingerprint
      });
    } catch {
      res.status(500).json({
        success: false,
        error: GENERIC_ERROR_CODES.UNKNOWN
      });
    }
  });

  /**
   * PUT /api/auth/username
   * Update the current user's username.
   *
   * Requires authentication via Bearer token.
   *
   * Request body:
   * {
   *   "username": "NewUsername"
   * }
   *
   * Response:
   * {
   *   "success": true,
   *   "username": "NewUsername",
   *   "fingerprint": "newusername",
   *   "error": null
   * }
   */
  router.put('/username', async (req: Request, res: Response) => {
    const { username } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({
        success: false,
        error: USERNAME_ERROR_CODES.REQUIRED
      });
    }

    if (!supabase || !usernameService) {
      return res.status(503).json({
        success: false,
        error: AUTH_ERROR_CODES.SERVICE_NOT_CONFIGURED
      });
    }

    try {
      const userId = await getUserIdFromRequest(req, supabase);
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: AUTH_ERROR_CODES.UNAUTHORIZED
        });
      }

      // Validate username
      const validationResult = usernameService.validateUsername(username);
      if (!validationResult.valid || !validationResult.fingerprint) {
        return res.status(400).json({
          success: false,
          error: USERNAME_ERROR_CODES.NOT_AVAILABLE
        });
      }

      // Check if username is available
      const availability = await checkUsernameAvailability(
        supabase,
        validationResult.fingerprint,
        userId
      );

      if (availability.error) {
        return res.status(500).json({
          success: false,
          error: GENERIC_ERROR_CODES.DATABASE_ERROR
        });
      }

      // If username is not available AND doesn't belong to current user, return error
      if (!availability.available && !availability.isCurrentUser) {
        return res.status(409).json({
          success: false,
          error: USERNAME_ERROR_CODES.NOT_AVAILABLE
        });
      }

      // Create or update username (even if fingerprint is same, display name may differ)
      const result = await upsertUsername(
        supabase,
        userId,
        username,
        validationResult.fingerprint
      );

      if (result.error) {
        return res.status(500).json({
          success: false,
          error: USERNAME_ERROR_CODES.UPDATE_FAILED
        });
      }

      res.json({
        success: true,
        username: result.data.username,
        fingerprint: result.data.fingerprint
      });
    } catch {
      res.status(500).json({
        success: false,
        error: USERNAME_ERROR_CODES.UPDATE_FAILED
      });
    }
  });

  /**
   * DELETE /api/auth/username
   * Delete the current user's username.
   *
   * Requires authentication via Bearer token.
   *
   * Response:
   * {
   *   "success": true,
   *   "error": null
   * }
   */
  router.delete('/username', async (req: Request, res: Response) => {
    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: AUTH_ERROR_CODES.SERVICE_NOT_CONFIGURED
      });
    }

    try {
      const userId = await getUserIdFromRequest(req, supabase);
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: AUTH_ERROR_CODES.UNAUTHORIZED
        });
      }

      // Delete username record
      const { error: deleteError } = await supabase
        .from('usernames')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        return res.status(500).json({
          success: false,
          error: USERNAME_ERROR_CODES.DELETE_FAILED
        });
      }

      res.json({
        success: true
      });
    } catch {
      res.status(500).json({
        success: false,
        error: USERNAME_ERROR_CODES.DELETE_FAILED
      });
    }
  });

  /**
   * GET /api/auth/export-data
   * Export all user data in JSON format (GDPR data portability).
   *
   * Requires authentication via Bearer token.
   *
   * Response:
   * JSON file download containing all user data
   */
  router.get('/export-data', async (req: Request, res: Response) => {
    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: AUTH_ERROR_CODES.SERVICE_NOT_CONFIGURED
      });
    }

    try {
      const userId = await getUserIdFromRequest(req, supabase);
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: AUTH_ERROR_CODES.UNAUTHORIZED
        });
      }

      // Get full user data
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (userError || !userData.user) {
        return res.status(500).json({
          success: false,
          error: DATA_ERROR_CODES.EXPORT_FAILED
        });
      }

      const user = userData.user;

      // Collect all user data
      const exportData: Record<string, unknown> = {
        export_date: new Date().toISOString(),
        user_profile: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          updated_at: user.updated_at,
          last_sign_in_at: user.last_sign_in_at,
          user_metadata: user.user_metadata,
        },
        username: null,
        user_settings: null,
      };

      // Get username
      const { data: usernameData } = await supabase
        .from('usernames')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (usernameData) {
        exportData.username = usernameData;
      }

      // Get user settings
      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (settingsData) {
        exportData.user_settings = settingsData;
      }

      // Add any other tables that store user data here
      // Example:
      // const { data: otherData } = await supabase
      //   .from('other_table')
      //   .select('*')
      //   .eq('user_id', userId);
      // userData.other_data = otherData;

      // Set headers for file download
      const filename = `user-data-${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(exportData);
    } catch {
      res.status(500).json({
        success: false,
        error: DATA_ERROR_CODES.EXPORT_FAILED
      });
    }
  });

  /**
   * DELETE /api/auth/delete-account
   * Permanently delete user account and all associated data.
   * WARNING: This action is irreversible!
   *
   * Requires authentication via Bearer token.
   *
   * Response:
   * {
   *   "success": true,
   *   "error": null
   * }
   */
  router.delete('/delete-account', async (req: Request, res: Response) => {
    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: AUTH_ERROR_CODES.SERVICE_NOT_CONFIGURED
      });
    }

    try {
      const userId = await getUserIdFromRequest(req, supabase);
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: AUTH_ERROR_CODES.UNAUTHORIZED
        });
      }

      // Delete all user-related data in order (respecting foreign key constraints)

      // 1. Delete username
      await supabase
        .from('usernames')
        .delete()
        .eq('user_id', userId);

      // 2. Delete user settings
      await supabase
        .from('user_settings')
        .delete()
        .eq('user_id', userId);

      // 3. Add deletion of any other tables that store user data here
      // Example:
      // await supabase
      //   .from('other_table')
      //   .delete()
      //   .eq('user_id', userId);

      // 4. Finally, delete the auth user (this must be done with service role key)
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);

      if (deleteUserError) {
        return res.status(500).json({
          success: false,
          error: DATA_ERROR_CODES.DELETE_FAILED
        });
      }

      res.json({
        success: true
      });
    } catch {
      res.status(500).json({
        success: false,
        error: DATA_ERROR_CODES.DELETE_FAILED
      });
    }
  });

  return router;
}

export default createAuthRoutes;
