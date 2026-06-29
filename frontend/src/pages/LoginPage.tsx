import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Scale, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { InputField } from '../components/ui/InputField'
import { Button } from '../components/ui/Button'
import { getErrorMessage } from '../lib/errors'
import { isSupabaseConfigured } from '../lib/supabase'
import { signInWithOAuth } from '../lib/services/enterprise'

export default function LoginPage() {
  const { login, user, loading } = useAuth()
  const nav = useNavigate()
  const loc = useLocation() as { state?: { from?: string } }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [oauthBusy, setOauthBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && user) {
      nav(loc.state?.from || '/app', { replace: true })
    }
  }, [loading, user, nav, loc.state?.from])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await login(email, password)
      nav(loc.state?.from || '/app', { replace: true })
    } catch (e) {
      setErr(getErrorMessage(e, 'Login failed'))
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
        <h1 className="text-xl font-semibold text-zinc-900">Sign in</h1>
        <p className="text-sm text-zinc-600 mt-1">
          Use your workspace credentials. Need an account?{' '}
          <Link to="/register" className="text-zinc-900 font-medium underline-offset-2 hover:underline">
            Register
          </Link>
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {!isSupabaseConfigured ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Supabase is not configured. Add env vars to <code className="text-xs">frontend/.env</code>{' '}
              and restart the dev server.
            </p>
          ) : null}
          <InputField label="Email" type="email" value={email} onChange={setEmail} />
          <InputField
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
          />
          {err ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {err}
            </p>
          ) : null}
          <Button type="submit" disabled={busy || !isSupabaseConfigured} className="w-full py-3">
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Signing in…
              </>
            ) : (
              'Continue with email'
            )}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-zinc-500">or SSO</span></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['google', 'azure'] as const).map((provider) => (
              <Button
                key={provider}
                type="button"
                variant="secondary"
                disabled={!!oauthBusy || !isSupabaseConfigured}
                className="w-full py-2.5 capitalize text-sm"
                onClick={async () => {
                  setErr(null)
                  setOauthBusy(provider)
                  try {
                    await signInWithOAuth(provider)
                  } catch (e) {
                    setErr(getErrorMessage(e, 'SSO sign-in failed. Enable the provider in Supabase Auth settings.'))
                    setOauthBusy(null)
                  }
                }}
              >
                {oauthBusy === provider ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {provider === 'azure' ? 'Microsoft' : 'Google'}
              </Button>
            ))}
          </div>
        </form>

        <p className="mt-6 text-xs text-zinc-500 text-center">
          SSO users default to the client role. Admins can promote accounts from the admin panel.
          Role access is enforced via Row Level Security on your profile record.
        </p>
      </div>
    </div>
  )
}
