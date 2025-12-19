-- Migration: Add theme preference to user settings
-- Purpose: Store user's light/dark theme preference
-- Date: 2025-12-17
--
-- This migration adds:
-- 1. theme_preference column to user_settings table (default: 'dark')
--
-- NOTE: This migration is idempotent - it can be run multiple times safely

-- ============================================================================
-- ADD THEME PREFERENCE COLUMN
-- ============================================================================

-- Add theme_preference column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_settings'
    AND column_name = 'theme_preference'
  ) THEN
    ALTER TABLE public.user_settings
    ADD COLUMN theme_preference text DEFAULT 'dark'
    CONSTRAINT valid_theme CHECK (theme_preference IN ('light', 'dark'));
  END IF;
END $$;

COMMENT ON COLUMN public.user_settings.theme_preference IS 'User preferred theme: light or dark (default: dark)';
