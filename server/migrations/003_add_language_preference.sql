-- Migration: Add language preference to user settings
-- Purpose: Store user's preferred language for cross-device sync
-- Date: 2025-12-17
--
-- This migration adds:
-- 1. language column to user_settings table (nullable, no default)
--
-- NOTE: This migration is idempotent - it can be run multiple times safely

-- ============================================================================
-- ADD LANGUAGE COLUMN
-- ============================================================================

-- Add language column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_settings'
    AND column_name = 'language'
  ) THEN
    ALTER TABLE public.user_settings
    ADD COLUMN language text;
  END IF;
END $$;

COMMENT ON COLUMN public.user_settings.language IS 'User preferred language code (e.g., en-US, es, fr, de). Null means use browser default.';
