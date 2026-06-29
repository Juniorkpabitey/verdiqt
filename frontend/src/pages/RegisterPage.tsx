import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Scale, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { InputField } from '../components/ui/InputField'
import { Button } from '../components/ui/Button'
import { getErrorMessage } from '../lib/errors'
import { isSupabaseConfigured } from '../lib/supabase'
import { SELF_ASSIGNABLE_ROLES } from '../lib/services/enterprise'
import type { UserRole } from '../types/platform'

export default function RegisterPage() {
  const { register, user, loading } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('client')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [confirmEmail, setConfirmEmail] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      nav('/app', { replace: true })
    }
  }, [loading, user, nav])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setConfirmEmail(false)
    setBusy(true)
    try {
      const result = await register(email, password, fullName || undefined, role)
      if (result === 'confirm_email') {
        setConfirmEmail(true)
        return
      }
      nav('/app', { replace: true })
    } catch (e) {
      setErr(getErrorMessage(e, 'Registration failed'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center px-4 py-12">
      <Link to="/" className="flex items-center gap-2 mb-8 text-zinc-900 font-semibold">
        <div className="p-2 rounded-lg bg-zinc-900 text-white">
          <Scale className="w-5 h-5" />
        </div>
        Verdiqt
      </Link>

      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-sm p-8">
        <h1 className="text-xl font-semibold text-zinc-900">Create your account</h1>
        <p className="text-sm text-zinc-600 mt-1">
          Already registered?{' '}
          <Link to="/login" className="text-zinc-900 font-medium underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>

        {!isSupabaseConfigured ? (
          <p className="mt-6 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Supabase is not configured. Add <code className="text-xs">VITE_SUPABASE_URL</code> and{' '}
            <code className="text-xs">VITE_SUPABASE_PUBLISHABLE_KEY</code> to{' '}
            <code className="text-xs">frontend/.env</code>, then restart the dev server.
          </p>
        ) : null}

        {confirmEmail ? (
          <div className="mt-6 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-3 space-y-2">
            <p className="font-medium">Confirm your email to continue</p>
            <p>
              Your account was created. We sent a link to <strong>{email}</strong> — open it, then
              sign in to reach the dashboard.
            </p>
            <Link to="/login" className="inline-block text-amber-900 font-medium underline-offset-2 hover:underline">
              Go to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <InputField label="Full name (optional)" value={fullName} onChange={setFullName} />
            <InputField label="Email" type="email" value={email} onChange={setEmail} />
            <InputField
              label="Password (min 6 characters)"
              type="password"
              value={password}
              onChange={setPassword}
            />

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-zinc-700">I am a…</legend>
              {SELF_ASSIGNABLE_ROLES.map((opt) => (
                <label
                  key={opt.role}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    role === opt.role ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.role}
                    checked={role === opt.role}
                    onChange={() => setRole(opt.role)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-zinc-900">{opt.label}</span>
                    <span className="block text-xs text-zinc-500">{opt.description}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <p className="text-xs text-zinc-500">
              Admin, HR monitor, and researcher roles are assigned by platform administrators after verification.
            </p>

            {err ? (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {err}
              </p>
            ) : null}
            <Button type="submit" disabled={busy || !isSupabaseConfigured} className="w-full py-3">
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating…
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
