import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../lib/errors'
import { listAdminUsers, updateUserRole } from '../../lib/services/admin'
import { Button } from '../../components/ui/Button'

type Row = {
  id: string
  email: string
  full_name: string | null
  role: 'client' | 'lawyer' | 'admin' | 'hr_monitor' | 'researcher' | 'legal_aid'
  trial_credits: number
  created_at: string
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    const data = await listAdminUsers()
    setRows(data)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await load()
      } catch (e) {
        if (!cancelled) setErr(getErrorMessage(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const changeRole = async (id: string, role: Row['role']) => {
    setBusy(id)
    setErr(null)
    try {
      await updateUserRole(id, role)
      await load()
    } catch (e) {
      setErr(getErrorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-4 sm:px-8 py-6">
        <h1 className="text-xl font-semibold text-zinc-900">Users</h1>
        <p className="text-sm text-zinc-600 mt-1">
          Manage user roles and legal team access levels. Privileged roles (admin, HR monitor, researcher) require backend assignment.
        </p>
      </header>

      <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-4">
        {err ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {err}
          </p>
        ) : null}

        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-zinc-500">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Credits</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r) => (
                <tr key={r.id} className="text-zinc-800">
                  <td className="px-4 py-3">{r.email || '—'}</td>
                  <td className="px-4 py-3">{r.full_name || '—'}</td>
                  <td className="px-4 py-3 capitalize">{r.role}</td>
                  <td className="px-4 py-3">{r.trial_credits}</td>
                  <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {(['client', 'lawyer', 'admin', 'legal_aid', 'hr_monitor', 'researcher'] as const).map((role) => (
                        <Button
                          key={role}
                          type="button"
                          variant={r.role === role ? 'primary' : 'secondary'}
                          disabled={busy === r.id}
                          onClick={() => changeRole(r.id, role)}
                          className="text-xs py-1.5 px-2 capitalize"
                        >
                          {role}
                        </Button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
