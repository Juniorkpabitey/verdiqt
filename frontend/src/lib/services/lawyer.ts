import { supabase } from '../supabase'
import { assertNoError } from '../errors'

export type AssignedCase = {
  id: string
  title: string
  jurisdiction: string | null
  status: string
  created_at: string
}

export type AppointmentRow = {
  id: string
  case_id: string
  client_id: string
  lawyer_id: string
  start_at: string
  end_at: string
  status: string
  notes: string | null
}

export async function listAssignedCases(): Promise<AssignedCase[]> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return []

  const { data, error } = await supabase
    .from('assignments')
    .select('cases(id, title, jurisdiction, status, created_at)')
    .eq('lawyer_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? [])
    .map((row) => {
      const c = row.cases
      if (!c || Array.isArray(c)) return null
      return c as AssignedCase
    })
    .filter((c): c is AssignedCase => c !== null)
}

export async function listLawyerAppointments(): Promise<AppointmentRow[]> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return []

  const { data, error } = await supabase
    .from('appointments')
    .select('id, case_id, client_id, lawyer_id, start_at, end_at, status, notes')
    .eq('lawyer_id', userId)
    .order('start_at', { ascending: false })

  return assertNoError(data, error) as AppointmentRow[]
}
