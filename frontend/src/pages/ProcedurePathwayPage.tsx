import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageScaffold from '../components/layout/PageScaffold'
import AiDisclaimer from '../components/ui/AiDisclaimer'
import { Button } from '../components/ui/Button'
import { getErrorMessage } from '../lib/errors'
import { getOrCreatePathway, updatePathway } from '../lib/services/pathways'
import { listJurisdictionPacks } from '../lib/services/intelligence'
import { PROCEDURE_STAGES, COUNTRY_CODES, type ProceduralStage } from '../types/platform'
import { t, type Locale } from '../lib/i18n'

const STAGE_STEPS: Record<ProceduralStage, { key: string; prompt: string }[]> = {
  arrest: [
    { key: 'detained', prompt: 'Were you informed why you were detained?' },
    { key: 'lawyer', prompt: 'Have you been able to contact a lawyer?' },
    { key: 'record', prompt: 'Do you have names of officers or station?' },
  ],
  investigation: [
    { key: 'disclosure', prompt: 'Do you know what evidence the state holds?' },
    { key: 'statement', prompt: 'Have you given a statement?' },
  ],
  charge: [
    { key: 'charge_sheet', prompt: 'Have you received formal charges in writing?' },
    { key: 'understand', prompt: 'Do you understand the charges?' },
  ],
  bail: [
    { key: 'application', prompt: 'Has a bail application been considered?' },
    { key: 'factors', prompt: 'Do you have ties to the community / fixed address?' },
  ],
  trial: [
    { key: 'witnesses', prompt: 'Do you know which witnesses may testify?' },
    { key: 'prep', prompt: 'Has your lawyer reviewed evidence with you?' },
  ],
  appeal: [
    { key: 'deadline', prompt: 'Are you aware of appeal time limits?' },
    { key: 'grounds', prompt: 'Has counsel discussed possible grounds?' },
  ],
  closed: [],
}

export default function ProcedurePathwayPage() {
  const [stage, setStage] = useState<ProceduralStage>('arrest')
  const [country, setCountry] = useState('GH')
  const [pathwayId, setPathwayId] = useState<string | null>(null)
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [completed, setCompleted] = useState<string[]>([])
  const [packInfo, setPackInfo] = useState<string>('')
  const [locale] = useState<Locale>('en')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const packs = await listJurisdictionPacks()
        const pack = packs.find((p) => p.country_code === country)
        if (!cancelled && pack) {
          setPackInfo(JSON.stringify(pack.content, null, 2))
        }
      } catch { /* optional */ }
    })()
    return () => { cancelled = true }
  }, [country])

  const start = async () => {
    setBusy(true)
    setErr(null)
    try {
      const p = await getOrCreatePathway(stage)
      setPathwayId(p.id)
      setResponses(p.responses as Record<string, string>)
      setCompleted(p.completed_steps as string[])
    } catch (e) {
      setErr(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const saveStep = async (stepKey: string, value: string) => {
    if (!pathwayId) return
    const nextResponses = { ...responses, [stepKey]: value }
    const nextCompleted = completed.includes(stepKey) ? completed : [...completed, stepKey]
    setResponses(nextResponses)
    setCompleted(nextCompleted)
    await updatePathway(pathwayId, nextResponses, nextCompleted)
  }

  const steps = STAGE_STEPS[stage] ?? []

  return (
    <PageScaffold title="Procedure pathway" subtitle="Guided criminal procedure information — not legal advice.">
      <AiDisclaimer />
      <p className="text-sm text-zinc-600 mt-2">{t(locale, 'disclaimer')}</p>

      <div className="mt-6 grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
          <label className="text-xs font-semibold text-zinc-600">Country pack</label>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm">
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          <label className="text-xs font-semibold text-zinc-600">Stage</label>
          <select value={stage} onChange={(e) => setStage(e.target.value as ProceduralStage)} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm">
            {PROCEDURE_STAGES.filter((s) => s.key !== 'closed').map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <Button type="button" onClick={start} disabled={busy} className="w-full">
            {busy ? 'Loading…' : 'Start pathway'}
          </Button>
          <Link to="/app/cases" className="block text-center text-sm text-zinc-700 underline">Request a lawyer via a case</Link>
        </div>

        <div className="md:col-span-2 space-y-4">
          {err ? <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</p> : null}
          {pathwayId ? (
            <>
              <p className="text-sm text-zinc-600">{PROCEDURE_STAGES.find((s) => s.key === stage)?.info}</p>
              {steps.map((step) => (
                <div key={step.key} className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2">
                  <p className="text-sm font-medium text-zinc-900">{step.prompt}</p>
                  <textarea
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm min-h-[80px]"
                    value={responses[step.key] ?? ''}
                    onChange={(e) => saveStep(step.key, e.target.value)}
                    placeholder="Your notes (private to your account)…"
                  />
                  {completed.includes(step.key) ? (
                    <p className="text-xs text-emerald-600">Step recorded</p>
                  ) : null}
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm text-zinc-500 py-10 text-center">Select a stage and start to begin.</p>
          )}
          {packInfo ? (
            <details className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-xs">
              <summary className="cursor-pointer font-medium text-zinc-700">Jurisdiction resources</summary>
              <pre className="mt-2 whitespace-pre-wrap">{packInfo}</pre>
            </details>
          ) : null}
        </div>
      </div>
    </PageScaffold>
  )
}
