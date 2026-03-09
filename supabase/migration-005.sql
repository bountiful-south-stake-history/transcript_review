-- Migration 005: Seed contacts table from existing transcripts
-- Run this in the Supabase SQL editor (one-time, after migration-004)

INSERT INTO contacts (name, email)
SELECT DISTINCT ON (speaker_name)
  speaker_name,
  reviewer_email
FROM talk_transcripts
ORDER BY speaker_name, reviewer_email NULLS LAST;
