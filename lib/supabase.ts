import { createClient } from '@supabase/supabase-js'
import { logError } from './logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  logError('supabase-init', new Error('Missing Supabase environment variables'))
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

// Parse date string without timezone shift
export function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00')
}

// Types for our transcript table
export interface Transcript {
  id: string
  speaker_name: string
  reviewer_email: string | null
  talk_title: string
  talk_date: string
  due_date: string | null
  original_text: string
  revised_text: string | null
  status: 'pending_review' | 'in_progress' | 'approved'
  approved_at: string | null
  email_sent_at: string | null
  created_at: string
}

export interface Contact {
  id: string
  name: string
  email: string | null
  role: string | null
  created_at: string
}

export function getDueDateInfo(dueDate: string): { label: string; colorClass: string; isOverdue: boolean } {
  const due = parseLocalDate(dueDate)
  const daysUntil = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  if (daysUntil < 0) return { label: 'Overdue', colorClass: 'text-red-600', isOverdue: true }
  if (daysUntil <= 3) return { label: 'Due soon', colorClass: 'text-orange-600', isOverdue: false }
  return { label: '', colorClass: 'text-gray-500', isOverdue: false }
}
