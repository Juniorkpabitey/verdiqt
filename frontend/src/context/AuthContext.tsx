import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { getErrorMessage } from '../lib/errors'
import { loadAuthUser } from '../lib/services/auth'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

import type { UserRole } from '../types/platform'

export type AuthUser = {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  trial_credits: number
}

type AuthState = {
  user: AuthUser | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName?: string, role?: UserRole) => Promise<'session' | 'confirm_email'>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

async function resolveProfile(authUser: User, fullName?: string | null, role?: UserRole): Promise<AuthUser> {
  const profile = await loadAuthUser(fullName, authUser, role)
  if (!profile) throw new Error('Profile could not be loaded.')
  return profile
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const userIdRef = useRef<string | null>(null)

  const applyUser = useCallback((profile: AuthUser | null) => {
    userIdRef.current = profile?.id ?? null
    setUser(profile)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        applyUser(null)
        return
      }
      const profile = await resolveProfile(data.user)
      applyUser(profile)
      setError(null)
    } catch (e) {
      applyUser(null)
      setError(getErrorMessage(e))
    }
  }, [applyUser])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    let cancelled = false

    const syncFromSession = async (authUser?: User | null) => {
      try {
        const resolved = authUser ?? (await supabase.auth.getUser()).data.user
        if (!resolved) {
          if (!cancelled) applyUser(null)
          return
        }
        const profile = await resolveProfile(resolved)
        if (!cancelled) {
          applyUser(profile)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          // Keep existing user if same session — avoids auth listener wiping state mid-navigation
          if (userIdRef.current && authUser?.id === userIdRef.current) return
          applyUser(null)
          setError(getErrorMessage(e))
        }
      }
    }

    syncFromSession().finally(() => {
      if (!cancelled) setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Defer async work — Supabase recommends not blocking this callback
      setTimeout(() => {
        if (cancelled) return
        if (event === 'SIGNED_OUT' || !session?.user) {
          applyUser(null)
          return
        }
        void syncFromSession(session.user)
      }, 0)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [applyUser])

  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) throw signInError
    if (!data.session?.user) throw new Error('Sign-in succeeded but no session was returned.')

    const profile = await resolveProfile(data.session.user)
    applyUser(profile)
    void import('../lib/services/enterprise').then(({ logSecurityEvent }) =>
      logSecurityEvent('auth.login'),
    )
  }, [applyUser])

  const register = useCallback(async (email: string, password: string, fullName?: string, role?: UserRole) => {
    setError(null)
    const selfRole = role && ['client', 'lawyer', 'legal_aid'].includes(role) ? role : 'client'
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || null,
          requested_role: selfRole,
        },
      },
    })
    if (signUpError) throw signUpError

    if (data.user && data.user.identities?.length === 0) {
      throw new Error('An account with this email already exists. Please sign in instead.')
    }

    if (!data.session?.user) {
      return 'confirm_email'
    }

    const profile = await resolveProfile(data.session.user, fullName, selfRole)
    applyUser(profile)
    return 'session'
  }, [applyUser])

  const logout = useCallback(() => {
    void import('../lib/services/enterprise').then(({ logSecurityEvent }) =>
      logSecurityEvent('auth.logout'),
    )
    supabase.auth.signOut()
    applyUser(null)
    setError(null)
  }, [applyUser])

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, loading, error, login, register, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- useAuth is tightly coupled to AuthProvider
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
