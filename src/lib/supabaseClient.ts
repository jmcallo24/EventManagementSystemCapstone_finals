// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

// 👉 Get these from your Supabase project settings
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file in the project root.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
