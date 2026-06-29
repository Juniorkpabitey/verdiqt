import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageScaffold from '../components/layout/PageScaffold'
import AiDisclaimer from '../components/ui/AiDisclaimer'
import ConfidenceBadge from '../components/ui/ConfidenceBadge'
import { Button } from '../components/ui/Button'
import { getErrorMessage } from '../lib/errors'
import {
  assessRights,
  extractEntities,
  extractTimeline,
  scanContradictions,
} from '../lib/services/ai'
import { listCases } from '../lib/services/cases'
import {
  listContradictions,
  listEntities,
  listJurisdictionPacks,
  listRightsAssessments,
  listTimeline,
  updateCaseStage,
  verifyTimelineEvent,
} from '../lib/services/intelligence'
import { FAIR_TRIAL_CHECKLIST, COUNTRY_CODES, type ProceduralStage } from '../types/platform'
import { Loader2, ArrowLeft, CheckCircle2, Download } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { buildFilingExport, downloadJsonBundle, listFilingExports } from '../lib/services/enterprise'

export default function CaseIntelligencePage() {
  const { caseId } = useParams<{ caseId: string }>()
  const { user } = useAuth()
  const canExport = user?.role === 'lawyer' || user?.role === 'admin' || user?.role === 'legal_aid'
  const [caseTitle, setCaseTitle] = useState('')
  const [timeline, setTimeline] = useState<Awaited<ReturnType<typeof listTimeline>>>([])
  const [entities, setEntities] = useState<Awaited<ReturnType<typeof listEntities>>>([])
  const [contradictions, setContradictions] = useState<Awaited<ReturnType<typeof listContradictions>>>([])
  const [rights, setRights] = useState<Awaited<ReturnType<typeof listRightsAssessments>>>([])
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})
  const [stage, setStage] = useState<ProceduralStage>('investigation')
  const [country, setCountry] = useState('GH')
  const [packs, setPacks] = useState<Awaited<ReturnType<typeof listJurisdictionPacks>>>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [lastMeta, setLastMeta] = useState<{ confidence?: number } | null>(null)
  const [exports, setExports] = useState<Awaited<ReturnType<typeof listFilingExports>>>([])

  const load = async () => {
    if (!caseId) return
    const [cases, tl, ent, con, r, jp, ex] = await Promise.all([
      listCases(),
      listTimeline(caseId),
      listEntities(caseId),
      listContradictions(caseId),
      listRightsAssessments(caseId),
      listJurisdictionPacks(),
      listFilingExports(caseId),
    ])
    const c = cases.find((x) => x.id === caseId)
    setCaseTitle(c?.title ?? 'Case')
    setTimeline(tl)
    setEntities(ent)
    setContradictions(con)
    setRights(r)
    setPacks(jp)
    setExports(ex)
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
    return () => { cancelled = true }
  }, [caseId])

  const run = async (key: string, fn: () => Promise<{ meta?: { confidence?: number } }>) => {
    if (!caseId) return
    setBusy(key)
    setErr(null)
    try {
      const res = await fn()
      setLastMeta(res.meta ?? null)
      await load()
    } catch (e) {
      setErr(getErrorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const saveStage = async () => {
    if (!caseId) return
    setBusy('stage')
    try {
      const pack = packs.find((p) => p.country_code === country)
      await updateCaseStage(caseId, stage, country, pack?.id)
    } catch (e) {
      setErr(getErrorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  if (!caseId) return null

  return (
    <PageScaffold
      title="Case intelligence"
      subtitle={caseTitle}
    >
      <Link to="/app/cases" className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 mb-2">
        <ArrowLeft className="w-4 h-4" /> Back to cases
      </Link>

      <AiDisclaimer />
      {lastMeta ? <div className="mt-2"><ConfidenceBadge value={lastMeta.confidence} /></div> : null}
      {err ? <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</p> : null}

      <section className="mt-6 grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
          <h2 className="font-semibold text-zinc-900">Jurisdiction & stage</h2>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm">
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          <select value={stage} onChange={(e) => setStage(e.target.value as ProceduralStage)} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm">
            {['arrest', 'investigation', 'charge', 'bail', 'trial', 'appeal'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <Button type="button" onClick={saveStage} disabled={busy === 'stage'} variant="secondary" className="w-full">
            Save stage
          </Button>
        </div>

        <div className="md:col-span-2 rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold text-zinc-900 mb-3">AI intelligence actions</h2>
          <div className="flex flex-wrap gap-2">
            {[
              ['timeline', 'Rebuild timeline', () => extractTimeline(caseId)],
              ['entities', 'Extract facts', () => extractEntities(caseId)],
              ['rights', 'Rights review', () => assessRights(caseId, checklist)],
              ['contradictions', 'Scan contradictions', () => scanContradictions(caseId)],
            ].map(([key, label, fn]) => (
              <Button key={key as string} type="button" variant="secondary" disabled={busy === key}
                onClick={() => run(key as string, fn as () => Promise<{ meta?: { confidence?: number } }>)}>
                {busy === key ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {label as string}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold text-zinc-900 mb-3">Timeline</h2>
          <ul className="space-y-2 text-sm">
            {timeline.length === 0 ? <li className="text-zinc-500">No events yet.</li> : timeline.map((ev) => (
              <li key={ev.id} className="border border-zinc-100 rounded-lg p-3 flex justify-between gap-2">
                <div>
                  <p className="font-medium">{ev.title}</p>
                  <p className="text-zinc-600">{ev.description}</p>
                  <p className="text-xs text-zinc-400">{ev.event_date ? new Date(ev.event_date).toLocaleString() : 'Date unknown'}</p>
                </div>
                {!ev.lawyer_verified ? (
                  <Button type="button" variant="ghost" className="text-xs shrink-0" onClick={() => verifyTimelineEvent(ev.id).then(load)}>
                    Verify
                  </Button>
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold text-zinc-900 mb-3">Extracted entities</h2>
          <ul className="space-y-2 text-sm">
            {entities.length === 0 ? <li className="text-zinc-500">No entities yet.</li> : entities.map((e) => (
              <li key={e.id} className="border border-zinc-100 rounded-lg p-3">
                <span className="text-xs uppercase text-zinc-400">{e.entity_type}</span>
                <p className="font-medium">{e.label}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-6 grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold text-zinc-900 mb-3">Fair-trial checklist</h2>
          <ul className="space-y-2 text-sm">
            {FAIR_TRIAL_CHECKLIST.map((item) => (
              <label key={item.key} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={!!checklist[item.key]}
                  onChange={(e) => setChecklist((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                  className="mt-1"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </ul>
          {rights[0]?.ai_summary ? (
            <div className="mt-4 p-3 bg-zinc-50 rounded-lg text-sm whitespace-pre-wrap">{rights[0].ai_summary}</div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold text-zinc-900 mb-3">Contradiction flags</h2>
          <ul className="space-y-2 text-sm">
            {contradictions.length === 0 ? <li className="text-zinc-500">None flagged.</li> : contradictions.map((f) => (
              <li key={f.id} className="border border-zinc-100 rounded-lg p-3">
                <p>{f.description}</p>
                <p className="text-xs text-zinc-400 capitalize">{f.status} · {f.ai_confidence != null ? `${Math.round(f.ai_confidence * 100)}%` : '—'}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {canExport ? (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold text-zinc-900 mb-2">E-filing preparation export</h2>
          <p className="text-sm text-zinc-600 mb-4">
            Generate an assistive filing bundle with lawyer-verified timeline, approved reviews, and rights assessments.
            Not for court use without explicit lawyer sign-off.
          </p>
          <div className="flex flex-wrap gap-2">
            {(['filing_prep', 'contestability', 'case_bundle'] as const).map((type) => (
              <Button
                key={type}
                type="button"
                variant="secondary"
                disabled={busy === `export-${type}`}
                onClick={async () => {
                  if (!caseId) return
                  setBusy(`export-${type}`)
                  try {
                    const exp = await buildFilingExport(caseId, type)
                    downloadJsonBundle(`verdiqt-${type}-${caseId.slice(0, 8)}.json`, exp.bundle)
                    await load()
                  } catch (e) {
                    setErr(getErrorMessage(e))
                  } finally {
                    setBusy(null)
                  }
                }}
              >
                {busy === `export-${type}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {type.replace('_', ' ')}
              </Button>
            ))}
          </div>
          {exports.length > 0 ? (
            <ul className="mt-4 text-xs text-zinc-500 space-y-1">
              {exports.slice(0, 5).map((ex) => (
                <li key={ex.id}>{ex.export_type} · {new Date(ex.created_at).toLocaleString()}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </PageScaffold>
  )
}
