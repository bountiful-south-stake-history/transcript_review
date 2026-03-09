-- Migration 004: Create contacts table for speaker name/email reuse
-- Run this in the Supabase SQL editor

CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  role text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_contacts_name ON contacts(name);
