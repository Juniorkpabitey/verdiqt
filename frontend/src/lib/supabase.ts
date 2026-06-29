import { createClient } from '@supabase/supabase-js'

const envUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
// Supabase dashboard may show "Publishable key" (sb_publishable_...) or legacy "anon" (JWT)
const envKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

const PLACEHOLDER_URL = 'http://127.0.0.1'
const PLACEHOLDER_ANON_KEY = 'local-dev-placeholder-anon-key'

const usingPlaceholders = !envUrl || !envKey

if (usingPlaceholders && import.meta.env.DEV) {
  console.warn(
    '[Verdiqt] Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
      '(or VITE_SUPABASE_PUBLISHABLE_KEY) in frontend/.env, then restart the dev server.',
  )
}

export const supabase = createClient(
  envUrl || PLACEHOLDER_URL,
  envKey || PLACEHOLDER_ANON_KEY,
)

export const isSupabaseConfigured = !usingPlaceholders
