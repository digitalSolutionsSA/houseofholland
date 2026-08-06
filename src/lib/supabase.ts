import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tgaxteclhzmzfsvaulzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnYXh0ZWNsaHptemZzdmF1bHpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NTc2MDQsImV4cCI6MjEwMDEzMzYwNH0.S4S1aIf5hwsD9KfGUV5jv3I34g8KMnyHEyKV9EFHyUc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export type UserRole = 'public' | 'artist' | 'manager'

export type MembershipPlan = 'free' | 'black-card' | 'elite'

export type Profile = {
  id: string
  role: UserRole
  is_super_admin: boolean
  full_name: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
  referred_by_code: string | null
  membership_plan: MembershipPlan
  created_at: string
}
