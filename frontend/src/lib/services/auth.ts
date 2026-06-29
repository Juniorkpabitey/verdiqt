import type { User } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import type { AuthUser } from '../../context/AuthContext'
import type { UserRole } from '../../types/platform'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function ensureProfile(fullName?: string | null, requestedRole?: UserRole | null): Promise<void> {
  const { error } = await supabase.rpc('ensure_my_profile', {
    p_full_name: fullName ?? null,
    p_requested_role: requestedRole ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function fetchProfile(userId: string, email: string): Promise<AuthUser> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, trial_credits, email')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) {
    throw new Error(
      'Profile not found. Run supabase/schema_complete_reset.sql in the Supabase SQL Editor.',
    )
  }

  return {
    id: data.id,
    email: data.email || email,
    full_name: data.full_name,
    role: data.role as UserRole,
    trial_credits: data.trial_credits,
  }
}

/** Load profile for the current (or provided) auth user, with retries for new sign-ups. */
export async function loadAuthUser(
  fullName?: string | null,
  authUser?: User | null,
  requestedRole?: UserRole | null,
): Promise<AuthUser | null> {
  const user = authUser ?? (await supabase.auth.getUser()).data.user
  if (!user) return null

  const resolvedName = fullName ?? user.user_metadata?.full_name ?? null
  const resolvedRole = requestedRole ?? (user.user_metadata?.requested_role as UserRole | undefined) ?? null
  let lastError: unknown

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await ensureProfile(resolvedName, resolvedRole)
      return await fetchProfile(user.id, user.email ?? '')
    } catch (e) {
      lastError = e
      if (attempt < 4) await sleep(250 * (attempt + 1))
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Could not load profile')
}

