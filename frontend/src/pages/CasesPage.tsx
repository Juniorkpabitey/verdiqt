import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageScaffold from '../components/layout/PageScaffold'
import AiDisclaimer from '../components/ui/AiDisclaimer'
import { InputField } from '../components/ui/InputField'
import { Button } from '../components/ui/Button'
import { getErrorMessage } from '../lib/errors'
import { analyzeCase, analyzeQuery } from '../lib/services/ai'
import {
  createCase,
  getCaseAnalyses,
  getCaseMessages,
  listCases,
  requestLawyer,
  sendCaseMessage,
  subscribeToCaseUpdates,
  uploadEvidence,
  type CaseRow,
} from '../lib/services/cases'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function CasesPage() {
  const { user, refreshUser } = useAuth()
  const [cases, setCases] = useState<CaseRow[]>([])
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [jurisdiction, setJurisdiction] = useState('')
  const [incidentReport, setIncidentReport] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [messages, setMessages] = useState<Record<string, { id: string; body: string; sender_id: string; created_at: string }[]>>({})
  const [draftMessage, setDraftMessage] = useState('')
  const [query, setQuery] = useState('')
  const [adhocResult, setAdhocResult] = useState<{ answer: string; sources: string[] } | null>(null)
  const [analysisByCase, setAnalysisByCase] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = async () => {
    const data = await listCases()
    setCases(data)
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

  useEffect(() => {
    if (!activeCaseId) return
    return subscribeToCaseUpdates(activeCaseId, () => {
      void load()
      void openThread(activeCaseId)
    })
  }, [activeCaseId])

  const submitCase = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy('create')
    try {
      await createCase({
        title,
        incident_report: incidentReport,
        jurisdiction: jurisdiction || null,
      })
      setTitle('')
      setIncidentReport('')
      setJurisdiction('')
      await load()
    } catch (e) {
      setErr(getErrorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const runAnalyze = async (id: string) => {
    setErr(null)
    setBusy(`analyze-${id}`)
    try {
      const result = await analyzeCase(id)
      if (result.report_markdown) {
        setAnalysisByCase((prev) => ({ ...prev, [id]: result.report_markdown }))
      } else {
        const analyses = await getCaseAnalyses(id)
        if (analyses[0]?.report_markdown) {
          setAnalysisByCase((prev) => ({ ...prev, [id]: analyses[0].report_markdown }))
        }
      }
      await refreshUser()
      await load()
    } catch (e) {
      setErr(getErrorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const requestLawyerAction = async (id: string) => {
    setBusy(`lawyer-${id}`)
    try {
      await requestLawyer(id, 'Client requests legal representation.')
      await load()
    } catch (e) {
      setErr(getErrorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const uploadEvidenceAction = async (id: string) => {
    if (!file) return
    setBusy(`upload-${id}`)
    try {
      await uploadEvidence(id, file)
      setFile(null)
      setErr(null)
    } catch (e) {
      setErr(getErrorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const openThread = async (id: string) => {
    setActiveCaseId(id)
    try {
      const data = await getCaseMessages(id)
      setMessages((prev) => ({ ...prev, [id]: data }))
    } catch (e) {
      setErr(getErrorMessage(e))
    }
  }

  const sendMessage = async () => {
    if (!activeCaseId || !draftMessage.trim()) return
    setBusy('msg')
    try {
      await sendCaseMessage(activeCaseId, draftMessage, 'all')
      setDraftMessage('')
      await openThread(activeCaseId)
    } catch (e) {
      setErr(getErrorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const runAdhoc = async () => {
    if (!query.trim()) return
    setErr(null)
    setBusy('adhoc')
    setAdhocResult(null)
    try {
      const data = await analyzeQuery(query)
      setAdhocResult(data)
      await refreshUser()
    } catch (e) {
      setErr(getErrorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <PageScaffold
      title="Cases & analysis"
      subtitle="Submit structured matters, run AI analysis, or explore a one-off legal question."
    >
      {err ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {err}
        </p>
      ) : null}

      <AiDisclaimer />

      <div className="grid lg:grid-cols-2 gap-6">
        <form
          onSubmit={submitCase}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4"
        >
          <h2 className="font-semibold text-zinc-900">New case</h2>
          <InputField label="Title" value={title} onChange={setTitle} placeholder="Matter title" />
          <InputField
            label="Jurisdiction (optional)"
            value={jurisdiction}
            onChange={setJurisdiction}
            placeholder="e.g. Lagos State"
          />
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600 ml-0.5">Incident report</label>
            <textarea
              className="w-full bg-white px-3 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-sm min-h-[140px] placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none"
              value={incidentReport}
              onChange={(e) => setIncidentReport(e.target.value)}
              placeholder="Describe arrest/incident timeline, charges, witnesses, and current stage…"
            />
          </div>
          <Button type="submit" disabled={busy === 'create'} className="w-full py-3">
            {busy === 'create' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving…
              </>
            ) : (
              'Save case'
            )}
          </Button>
        </form>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-zinc-900">Quick legal analysis</h2>
          <p className="text-sm text-zinc-600">
            Ask a standalone question—useful for research without creating a case file.
          </p>
          <textarea
            className="w-full bg-white px-3 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-sm min-h-[120px]"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. What factors do courts weigh for bail in fraud matters?"
          />
          <Button
            type="button"
            onClick={runAdhoc}
            disabled={busy === 'adhoc'}
            variant="secondary"
            className="w-full py-3"
          >
            {busy === 'adhoc' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Analyzing…
              </>
            ) : (
              'Run analysis'
            )}
          </Button>
          {adhocResult ? (
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-sm text-zinc-800 space-y-3">
              <p className="whitespace-pre-wrap leading-relaxed">{adhocResult.answer}</p>
              {adhocResult.sources?.length ? (
                <div className="flex flex-wrap gap-2">
                  {adhocResult.sources.map((s, i) => (
                    <span
                      key={i}
                      className="text-xs bg-white border border-zinc-200 text-zinc-600 px-2 py-1 rounded-md"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-900">Your cases</h2>
        </div>
        <ul className="divide-y divide-zinc-100">
          {cases.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-zinc-500">No cases yet.</li>
          ) : (
            cases.map((c) => (
              <li key={c.id} className="px-5 py-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-900">{c.title}</p>
                    <p className="text-xs text-zinc-500 capitalize">
                      {c.status} · {c.jurisdiction || 'Jurisdiction not set'} ·{' '}
                      {new Date(c.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy === `analyze-${c.id}`}
                    onClick={() => runAnalyze(c.id)}
                    className="shrink-0"
                  >
                    {busy === `analyze-${c.id}` ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Running…
                      </>
                    ) : (
                      'Run AI analysis'
                    )}
                  </Button>
                  <Link
                    to={`/app/cases/${c.id}/intelligence`}
                    className="inline-flex items-center justify-center shrink-0 px-4 py-2 rounded-xl text-sm font-medium border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                  >
                    Intelligence workspace
                  </Link>
                </div>
                <p className="text-sm text-zinc-600 whitespace-pre-wrap">{c.incident_report}</p>
                {analysisByCase[c.id] ? (
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-sm text-zinc-800 whitespace-pre-wrap">
                    {analysisByCase[c.id]}
                  </div>
                ) : null}
                <div className="grid md:grid-cols-3 gap-3">
                  <Button type="button" variant="secondary" onClick={() => requestLawyerAction(c.id)} disabled={busy === `lawyer-${c.id}`}>
                    {busy === `lawyer-${c.id}` ? 'Requesting…' : 'Request lawyer'}
                  </Button>
                  <label className="flex items-center gap-2 px-3 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-700 bg-zinc-50">
                    <input type="file" className="text-xs" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  </label>
                  <Button type="button" variant="secondary" onClick={() => uploadEvidenceAction(c.id)} disabled={!file || busy === `upload-${c.id}`}>
                    {busy === `upload-${c.id}` ? 'Uploading…' : 'Upload evidence'}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Button type="button" variant="ghost" onClick={() => openThread(c.id)}>
                    Open case messages
                  </Button>
                  {activeCaseId === c.id ? (
                    <div className="rounded-xl border border-zinc-200 p-3 space-y-2">
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {(messages[c.id] || []).map((m) => (
                          <p key={m.id} className="text-sm text-zinc-700">
                            <span className="text-xs text-zinc-400">{m.sender_id === user?.id ? 'You' : 'Other'}:</span>{' '}
                            {m.body}
                          </p>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={draftMessage}
                          onChange={(e) => setDraftMessage(e.target.value)}
                          className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm"
                          placeholder="Send message to lawyer/admin..."
                        />
                        <Button type="button" onClick={sendMessage} disabled={busy === 'msg'}>
                          Send
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </PageScaffold>
  )
}
