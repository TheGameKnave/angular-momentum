-- Migration: Initial authentication schema setup
-- Purpose: Create tables and policies for username-based auth and user settings
-- Date: 2025-11-19
--
-- This migration creates:
-- 1. usernames table - Username-based authentication with homoglyph protection
-- 2. user_settings table - User preferences and settings
--
-- NOTE: This migration is idempotent - it can be run multiple times safely

-- ============================================================================
-- CLEANUP - Drop existing policies, functions, and triggers
-- ============================================================================

-- Drop usernames policies
DROP POLICY IF EXISTS "Usernames are viewable by everyone" ON public.usernames;
DROP POLICY IF EXISTS "Users and service role can insert usernames" ON public.usernames;
DROP POLICY IF EXISTS "Users can update their own username" ON public.usernames;
DROP POLICY IF EXISTS "Users and service role can update usernames" ON public.usernames;
DROP POLICY IF EXISTS "Users can delete their own username" ON public.usernames;

-- Drop user_settings policies
DROP POLICY IF EXISTS "Users can read their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON public.user_settings;

-- Drop triggers (must be dropped before their functions)
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;

-- Drop functions
DROP FUNCTION IF EXISTS public.get_email_by_username(text);
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- ============================================================================
-- USERNAMES TABLE
-- ============================================================================

-- Create usernames table
CREATE TABLE IF NOT EXISTS public.usernames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  fingerprint text NOT NULL, -- URL-safe homoglyph-normalized slug
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_user UNIQUE(user_id),
  CONSTRAINT unique_fingerprint UNIQUE(fingerprint),
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
  CONSTRAINT fingerprint_length CHECK (char_length(fingerprint) >= 3 AND char_length(fingerprint) <= 30)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_usernames_fingerprint ON public.usernames(fingerprint);
CREATE INDEX IF NOT EXISTS idx_usernames_user_id ON public.usernames(user_id);

-- Enable Row Level Security
ALTER TABLE public.usernames ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can read usernames (for profile lookups)
CREATE POLICY "Usernames are viewable by everyone"
  ON public.usernames FOR SELECT
  USING (true);

-- Users and service role can insert usernames
-- Allows users to insert their own username when authenticated
-- Allows service role to insert usernames during signup flow (after OTP verification)
CREATE POLICY "Users and service role can insert usernames"
  ON public.usernames FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Users and service role can update usernames
CREATE POLICY "Users and service role can update usernames"
  ON public.usernames FOR UPDATE
  USING (
    auth.uid() = user_id
    OR
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  )
  WITH CHECK (
    auth.uid() = user_id
    OR
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Users can only delete their own username
CREATE POLICY "Users can delete their own username"
  ON public.usernames FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to get email by username fingerprint (for login)
CREATE OR REPLACE FUNCTION public.get_email_by_username(username_input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email text;
BEGIN
  -- Look up user email by username fingerprint
  SELECT u.email INTO user_email
  FROM public.usernames un
  JOIN auth.users u ON u.id = un.user_id
  WHERE un.fingerprint = username_input;

  RETURN user_email;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon;

COMMENT ON TABLE public.usernames IS 'Stores usernames with homoglyph-normalized fingerprints for secure username-based authentication';
COMMENT ON COLUMN public.usernames.username IS 'Original username as entered by the user';
COMMENT ON COLUMN public.usernames.fingerprint IS 'Homoglyph-normalized, URL-safe version of the username used for uniqueness checking and profile URLs';
COMMENT ON FUNCTION public.get_email_by_username IS 'Converts a username (fingerprint) to email address for authentication';

-- ============================================================================
-- USER SETTINGS TABLE
-- ============================================================================

-- Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone text, -- User's preferred timezone (e.g., 'America/New_York', 'UTC')
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_user_settings UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Enable Row Level Security
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (all private - users can only access their own settings)

-- Users can only read their own settings
CREATE POLICY "Users can read their own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own settings
CREATE POLICY "Users can insert their own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own settings
CREATE POLICY "Users can update their own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own settings
CREATE POLICY "Users can delete their own settings"
  ON public.user_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on row update
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.user_settings IS 'Stores user-specific settings and preferences (private data, only accessible by the user)';
COMMENT ON COLUMN public.user_settings.timezone IS 'User preferred timezone (IANA timezone identifier, e.g., America/New_York, Europe/London, UTC)';
