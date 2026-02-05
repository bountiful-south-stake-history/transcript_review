# Stake Talk Transcripts

Simple app for speakers to review and approve transcripts of their talks.

## Tech Stack

- **Next.js 14** — React framework
- **TypeScript** — Type safety
- **Supabase** — Database and backend
- **Tailwind CSS** — Styling

## Features

- **Admin Dashboard** (`/`) — View all transcripts, add new ones, copy review links
- **Review Page** (`/review/[id]`) — Speakers edit and approve their transcript
- Auto-save every 30 seconds
- Reset to original option
- Approval confirmation

## Prerequisites

- Node.js 18+ 
- npm (or pnpm/yarn)
- Supabase project with credentials

## Setup

### 1. Database (Supabase)

Run the SQL in `supabase/migration.sql` in your Supabase project's SQL Editor.

### 2. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### 4. Deploy to Vercel

#### Option A: Vercel Dashboard

1. Push to a GitHub repo
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Add environment variables
4. Deploy

#### Option B: Vercel CLI

```bash
npm i -g vercel
vercel
```

## Usage

1. Go to the admin dashboard at `/`
2. Click "Add Transcript" and paste the transcript text
3. Click "Copy Link" to get the review URL
4. Send the link to the speaker
5. Speaker edits, then clicks "Approve Transcript"
6. Dashboard shows status change to "Approved"

> **Note:** The admin dashboard has no authentication. For production use, consider adding auth or restricting access via Vercel's password protection.

## Workflow Integration

Potential extensions:
- Send automatic email with review link when transcript is added
- Notify via webhook/email when a transcript is approved
- Export approved transcripts to a shared drive

## License

MIT
