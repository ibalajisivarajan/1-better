import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string ?? ''

export const isConfigured =
  typeof supabaseUrl === 'string' && supabaseUrl.length > 0 &&
  typeof supabaseAnonKey === 'string' && supabaseAnonKey.length > 0

// Always create the client — it will fail gracefully on requests if not configured
export const supabase = createClient(
  isConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isConfigured ? supabaseAnonKey : 'placeholder-anon-key'
)
