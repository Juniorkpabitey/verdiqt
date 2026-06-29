import { useState } from 'react'
import PageScaffold from '../components/layout/PageScaffold'
import { InputField } from '../components/ui/InputField'
import { Button } from '../components/ui/Button'
import { generateLegalDocument } from '../lib/documents'
import { getErrorMessage } from '../lib/errors'
import { logDocumentGeneration } from '../lib/services/ai'
import AiDisclaimer from '../components/ui/AiDisclaimer'
import { Loader2 } from 'lucide-react'

export default function DocumentsPage() {
  const [template, setTemplate] = useState<'bail_application' | 'notice_of_motion'>(
    'bail_application',
  )
  const [inputs, setInputs] = useState({
    client_name: '',
    jurisdiction: '',
    case_number: '',
    charge: '',
    address: '',
    location: '',
    hearing_date: '',
    relief_sought: '',
  })
  const [doc, setDoc] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const generate = async () => {
    setErr(null)
    setBusy(true)
    setDoc('')
    try {
      const context =
        template === 'bail_application'
          ? {
              client_name: inputs.client_name,
              jurisdiction: inputs.jurisdiction,
              case_number: inputs.case_number,
              charge: inputs.charge,
              address: inputs.address,
              location: inputs.location,
            }
          : {
              hearing_date: inputs.hearing_date,
              relief_sought: inputs.relief_sought,
            }
      const document = generateLegalDocument(template, context)
      setDoc(document)
      await logDocumentGeneration(template, context, document)
    } catch (e) {
      setErr(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const download = () => {
    const blob = new Blob([doc], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${template}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <PageScaffold
      title="Legal documents"
      subtitle="Generate first drafts from templates. Runs entirely client-side with audit logging via Supabase."
    >
      {err ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {err}
        </p>
      ) : null}

      <AiDisclaimer />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-zinc-900">Template</h2>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['bail_application', 'Bail application'],
                ['notice_of_motion', 'Notice of motion'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTemplate(value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  template === value
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {template === 'bail_application' ? (
            <div className="space-y-3 pt-2">
              <InputField
                label="Client name"
                value={inputs.client_name}
                onChange={(v) => setInputs({ ...inputs, client_name: v })}
              />
              <InputField
                label="Jurisdiction"
                value={inputs.jurisdiction}
                onChange={(v) => setInputs({ ...inputs, jurisdiction: v })}
              />
              <InputField
                label="Case number"
                value={inputs.case_number}
                onChange={(v) => setInputs({ ...inputs, case_number: v })}
              />
              <InputField label="Charge" value={inputs.charge} onChange={(v) => setInputs({ ...inputs, charge: v })} />
              <InputField
                label="Address"
                value={inputs.address}
                onChange={(v) => setInputs({ ...inputs, address: v })}
              />
              <InputField
                label="Location (signature block)"
                value={inputs.location}
                onChange={(v) => setInputs({ ...inputs, location: v })}
              />
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <InputField
                label="Hearing date"
                value={inputs.hearing_date}
                onChange={(v) => setInputs({ ...inputs, hearing_date: v })}
              />
              <InputField
                label="Relief sought"
                value={inputs.relief_sought}
                onChange={(v) => setInputs({ ...inputs, relief_sought: v })}
              />
            </div>
          )}

          <Button type="button" onClick={generate} disabled={busy} className="w-full py-3">
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating…
              </>
            ) : (
              'Generate draft'
            )}
          </Button>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm min-h-[320px] flex flex-col">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-semibold text-zinc-900">Preview</h2>
            {doc ? (
              <Button type="button" variant="secondary" onClick={download}>
                Download .txt
              </Button>
            ) : null}
          </div>
          {doc ? (
            <pre className="flex-1 text-xs sm:text-sm text-zinc-800 whitespace-pre-wrap font-mono leading-relaxed overflow-auto bg-zinc-50 rounded-xl border border-zinc-100 p-4">
              {doc}
            </pre>
          ) : (
            <p className="text-sm text-zinc-500 flex-1 flex items-center justify-center border border-dashed border-zinc-200 rounded-xl">
              Generated text will appear here.
            </p>
          )}
        </div>
      </div>
    </PageScaffold>
  )
}
