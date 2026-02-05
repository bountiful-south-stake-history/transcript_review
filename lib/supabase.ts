import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our transcript table
export interface Transcript {
  id: string
  speaker_name: string
  speaker_email: string | null
  talk_title: string
  talk_date: string
  original_text: string
  revised_text: string | null
  status: 'pending_review' | 'approved'
  approved_at: string | null
  created_at: string
  updated_at: string
}
