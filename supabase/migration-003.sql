-- Migration 003: Add email_sent_at tracking column
-- Run this in the Supabase SQL editor

ALTER TABLE talk_transcripts ADD COLUMN email_sent_at timestamptz DEFAULT NULL;
