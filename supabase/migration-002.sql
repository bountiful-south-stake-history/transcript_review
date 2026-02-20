-- Migration 002: NOT NULL constraints, in_progress status, due_date field
-- Run this in your Supabase SQL Editor after migration.sql

-- 1. Backfill any NULLs before adding constraints
UPDATE talk_transcripts SET speaker_name = 'Unknown' WHERE speaker_name IS NULL;
UPDATE talk_transcripts SET talk_title = 'Untitled' WHERE talk_title IS NULL;
UPDATE talk_transcripts SET original_text = '' WHERE original_text IS NULL;
UPDATE talk_transcripts SET talk_date = CURRENT_DATE WHERE talk_date IS NULL;

-- 2. Add NOT NULL constraints
ALTER TABLE talk_transcripts ALTER COLUMN speaker_name SET NOT NULL;
ALTER TABLE talk_transcripts ALTER COLUMN talk_title SET NOT NULL;
ALTER TABLE talk_transcripts ALTER COLUMN original_text SET NOT NULL;
ALTER TABLE talk_transcripts ALTER COLUMN talk_date SET NOT NULL;

-- 3. Add due_date column (nullable - not all transcripts need a deadline)
ALTER TABLE talk_transcripts ADD COLUMN IF NOT EXISTS due_date date;

-- 4. Update status check constraint to include 'in_progress'
ALTER TABLE talk_transcripts DROP CONSTRAINT IF EXISTS talk_transcripts_status_check;
ALTER TABLE talk_transcripts ADD CONSTRAINT talk_transcripts_status_check
  CHECK (status IN ('pending_review', 'in_progress', 'approved'));

-- 5. Add indexes for search and deadline queries
CREATE INDEX IF NOT EXISTS idx_transcripts_due_date ON talk_transcripts(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transcripts_reviewer_email ON talk_transcripts(reviewer_email);
