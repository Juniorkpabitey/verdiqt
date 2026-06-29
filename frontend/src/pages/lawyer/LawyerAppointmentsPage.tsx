import { useEffect, useState } from 'react'
import PageScaffold from '../../components/layout/PageScaffold'
import { getErrorMessage } from '../../lib/errors'
import { listLawyerAppointments } from '../../lib/services/lawyer'
import { Button } from '../../components/ui/Button'

type AppointmentRow = {
  id: string
  case_id: string
  client_id: string
  lawyer_id: string
  start_at: string
  end_at: string
  status: string
  notes: string | null
}

export default function LawyerAppointmentsPage() {
  const [rows, setRows] = useState<AppointmentRow[]>([])
  const [err, setErr] = useState<string | null>(null)

  const load = async () => {
    const data = await listLawyerAppointments()
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

  return (
    <PageScaffold title="Appointments" subtitle="Review consultation scheduling requests.">
      {err ? <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</p> : null}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 text-sm text-zinc-600">
        <div className="mb-3">
          <Button variant="secondary" onClick={() => load()}>
            Refresh
          </Button>
        </div>
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="border border-zinc-100 rounded-xl p-3">
              <p className="text-zinc-800 font-medium">Case: {r.case_id}</p>
              <p className="text-xs text-zinc-500">
                {new Date(r.start_at).toLocaleString()} - {new Date(r.end_at).toLocaleString()}
              </p>
              <p className="text-xs capitalize mt-1">{r.status}</p>
            </li>
          ))}
          {rows.length === 0 ? <li className="text-zinc-500">No appointments yet.</li> : null}
        </ul>
      </div>
    </PageScaffold>
  )
}
