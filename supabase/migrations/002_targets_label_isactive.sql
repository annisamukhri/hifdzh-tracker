-- Add label and is_active columns to targets table
ALTER TABLE targets ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE targets ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
