-- Talk Transcripts Table
-- Run this in your Supabase SQL Editor

create table if not exists talk_transcripts (
  id uuid primary key default gen_random_uuid(),
  speaker_name text,
  reviewer_email text,
  talk_title text,
  talk_date date,
  original_text text,
  revised_text text,
  status text default 'pending_review' check (status in ('pending_review', 'approved')),
  approved_at timestamptz,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table talk_transcripts enable row level security;

-- Policy: Allow anonymous read access (for review links)
create policy "Anyone can view transcripts"
  on talk_transcripts for select
  using (true);

-- Policy: Allow anonymous update (for speakers to edit/approve)
create policy "Anyone can update transcripts"
  on talk_transcripts for update
  using (true);

-- Policy: Allow anonymous insert (for admin to add new transcripts)
-- In production, you may want to restrict this to authenticated users
create policy "Anyone can insert transcripts"
  on talk_transcripts for insert
  with check (true);

-- Index for faster lookups
create index if not exists idx_transcripts_status on talk_transcripts(status);
create index if not exists idx_transcripts_talk_date on talk_transcripts(talk_date desc);
