import { useEffect, useState } from 'react'
import PageScaffold from '../../components/layout/PageScaffold'
import { Button } from '../../components/ui/Button'
import { InputField } from '../../components/ui/InputField'
import { getErrorMessage } from '../../lib/errors'
import {
  createApiKey,
  createOrganization,
  getPlatformSettings,
  listApiKeys,
  listIntegrationEndpoints,
  listOrganizations,
  listSecurityEvents,
  revokeApiKey,
  updatePlatformSetting,
  upsertIntegrationEndpoint,
  type ApiKeyRow,
  type IntegrationEndpoint,
  type Organization,
  type PlatformSetting,
  type SecurityEvent,
} from '../../lib/services/enterprise'

const ORG_TYPES = ['legal_aid', 'public_defender', 'law_firm', 'ngo', 'court_pilot'] as const

export default function AdminIntegrationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [endpoints, setEndpoints] = useState<IntegrationEndpoint[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([])
  const [settings, setSettings] = useState<PlatformSetting[]>([])
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgType, setNewOrgType] = useState<string>('legal_aid')
  const [newKeyName, setNewKeyName] = useState('')
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    const [o, e, k, s, se] = await Promise.all([
      listOrganizations(),
      listIntegrationEndpoints(),
      listApiKeys(),
      getPlatformSettings(),
      listSecurityEvents(50),
    ])
    setOrgs(o)
    setEndpoints(e)
    setApiKeys(k)
    setSettings(s)
    setSecurityEvents(se)
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
  }, [])

  const residency = settings.find((s) => s.key === 'data_residency')?.value as Record<string, unknown> | undefined

  return (
    <PageScaffold
      title="Enterprise integrations"
      subtitle="Phase 4 — API keys, organizations, data residency, SOC2 security events"
    >
      {err ? <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</p> : null}
      {revealedKey ? (
        <div className="mt-4 p-4 rounded-xl border border-amber-200 bg-amber-50 text-sm space-y-2">
          <p className="font-medium text-amber-900">Copy your API key now — it will not be shown again.</p>
          <code className="block p-2 bg-white rounded border text-xs break-all">{revealedKey}</code>
          <Button type="button" variant="secondary" onClick={() => setRevealedKey(null)}>Dismiss</Button>
        </div>
      ) : null}

      <section className="mt-6 grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="font-semibold text-zinc-900">Data residency</h2>
          <p className="text-sm text-zinc-600">
            Platform data is configured for <strong>{String(residency?.label ?? 'EU West (Ireland)')}</strong>.
            PII residency flag: {residency?.pii_stored_in_region ? 'enabled' : 'review required'}.
          </p>
          <select
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm"
            defaultValue={String(residency?.region ?? 'eu-west-1')}
            onChange={async (e) => {
              const regions: Record<string, string> = {
                'eu-west-1': 'EU West (Ireland)',
                'eu-central-1': 'EU Central (Frankfurt)',
                'af-south-1': 'Africa (Cape Town)',
              }
              setBusy('residency')
              try {
                await updatePlatformSetting('data_residency', {
                  region: e.target.value,
                  provider: 'supabase',
                  label: regions[e.target.value] ?? e.target.value,
                  pii_stored_in_region: true,
                })
                await load()
              } catch (ex) {
                setErr(getErrorMessage(ex))
              } finally {
                setBusy(null)
              }
            }}
          >
            <option value="eu-west-1">EU West (Ireland)</option>
            <option value="eu-central-1">EU Central (Frankfurt)</option>
            <option value="af-south-1">Africa (Cape Town)</option>
          </select>
          <p className="text-xs text-zinc-500">
            Changing this records policy intent. Actual Supabase project region must match in production deployment.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="font-semibold text-zinc-900">Organizations</h2>
          <div className="flex gap-2">
            <InputField label="" value={newOrgName} onChange={setNewOrgName} placeholder="Organization name" />
            <select value={newOrgType} onChange={(e) => setNewOrgType(e.target.value)} className="border border-zinc-200 rounded-lg px-2 text-sm">
              {ORG_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
            <Button type="button" disabled={!newOrgName || busy === 'org'} onClick={async () => {
              setBusy('org')
              try {
                await createOrganization({ name: newOrgName, type: newOrgType })
                setNewOrgName('')
                await load()
              } catch (ex) { setErr(getErrorMessage(ex)) } finally { setBusy(null) }
            }}>Add</Button>
          </div>
          <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
            {orgs.map((o) => (
              <li key={o.id} className="flex justify-between border-b border-zinc-50 py-1">
                <span>{o.name}</span>
                <span className="text-xs text-zinc-400 capitalize">{o.type.replace('_', ' ')}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-6 grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="font-semibold text-zinc-900">Case management API keys</h2>
          <p className="text-xs text-zinc-500">
            External systems call <code>case-integration</code> edge function with header <code>x-api-key</code>.
            Actions: <code>case-export</code>, <code>health</code>.
          </p>
          <div className="flex gap-2">
            <InputField label="" value={newKeyName} onChange={setNewKeyName} placeholder="Key name (e.g. Court CMS)" />
            <Button type="button" disabled={!newKeyName || busy === 'key'} onClick={async () => {
              setBusy('key')
              try {
                const res = await createApiKey(newKeyName)
                setRevealedKey(res.key)
                setNewKeyName('')
                await load()
              } catch (ex) { setErr(getErrorMessage(ex)) } finally { setBusy(null) }
            }}>Generate</Button>
          </div>
          <ul className="text-sm space-y-2">
            {apiKeys.map((k) => (
              <li key={k.id} className="flex justify-between items-center border border-zinc-100 rounded-lg p-2">
                <div>
                  <p className="font-medium">{k.name}</p>
                  <p className="text-xs text-zinc-400">{k.key_prefix}… · {k.scopes.join(', ')}</p>
                </div>
                {k.active ? (
                  <Button type="button" variant="ghost" className="text-xs text-red-600" onClick={async () => {
                    await revokeApiKey(k.id)
                    await load()
                  }}>Revoke</Button>
                ) : (
                  <span className="text-xs text-zinc-400">Revoked</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="font-semibold text-zinc-900">Integration endpoints</h2>
          <Button type="button" variant="secondary" disabled={busy === 'endpoint'} onClick={async () => {
            setBusy('endpoint')
            try {
              await upsertIntegrationEndpoint({
                name: `Webhook ${endpoints.length + 1}`,
                endpoint_type: 'webhook',
                config: { url: '', events: ['case.updated'] },
                active: false,
              })
              await load()
            } catch (ex) { setErr(getErrorMessage(ex)) } finally { setBusy(null) }
          }}>Add webhook stub</Button>
          <ul className="text-sm space-y-2">
            {endpoints.map((ep) => (
              <li key={ep.id} className="border border-zinc-100 rounded-lg p-3">
                <p className="font-medium">{ep.name}</p>
                <p className="text-xs text-zinc-400 capitalize">{ep.endpoint_type.replace('_', ' ')} · {ep.active ? 'active' : 'inactive'}</p>
              </li>
            ))}
            {endpoints.length === 0 ? <li className="text-zinc-500">No endpoints configured.</li> : null}
          </ul>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold text-zinc-900 mb-3">Security event log (SOC2-aligned)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500 border-b">
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Event</th>
                <th className="py-2 pr-4">Severity</th>
                <th className="py-2">Resource</th>
              </tr>
            </thead>
            <tbody>
              {securityEvents.map((ev) => (
                <tr key={ev.id} className="border-b border-zinc-50">
                  <td className="py-2 pr-4 text-xs text-zinc-500">{new Date(ev.created_at).toLocaleString()}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{ev.event_type}</td>
                  <td className="py-2 pr-4 capitalize">{ev.severity}</td>
                  <td className="py-2 text-xs text-zinc-500">{ev.resource_type ?? '—'} {ev.resource_id ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {securityEvents.length === 0 ? <p className="text-zinc-500 text-sm mt-2">No events yet.</p> : null}
        </div>
      </section>
    </PageScaffold>
  )
}
