import { useState, useRef, useEffect } from 'react'
import PageScaffold from '../components/layout/PageScaffold'
import { Button } from '../components/ui/Button'
import { getErrorMessage } from '../lib/errors'
import { chat } from '../lib/services/ai'
import { useAuth } from '../context/AuthContext'
import AiDisclaimer from '../components/ui/AiDisclaimer'
import { Loader2, Send } from 'lucide-react'

type Msg = { role: 'user' | 'assistant'; text: string; sources?: string[] }

export default function ChatPage() {
  const { refreshUser } = useAuth()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      text: 'Hello. Ask a question about criminal justice matters. Responses are logged for administrators.',
    },
  ])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || busy) return
    setErr(null)
    setInput('')
    setMessages((m) => [...m, { role: 'user', text }])
    setBusy(true)
    try {
      const data = await chat(text)
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: data.answer, sources: data.sources || [] },
      ])
      await refreshUser()
    } catch (e) {
      setErr(getErrorMessage(e))
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: 'Sorry—something went wrong. Ensure Supabase Edge Functions are deployed and configured.',
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageScaffold
      title="AI assistant"
      subtitle="Chat interface powered by Supabase Edge Functions and external AI APIs."
    >
      {err ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {err}
        </p>
      ) : null}

      <AiDisclaimer />

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm flex flex-col h-[min(70vh,640px)]">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-50 text-zinc-900 border border-zinc-100'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.sources && m.sources.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {m.sources.map((s, j) => (
                      <span
                        key={j}
                        className="text-[10px] uppercase tracking-wide bg-white/80 text-zinc-600 px-2 py-0.5 rounded border border-zinc-200"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {busy ? (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3 bg-zinc-50 border border-zinc-100 flex items-center gap-2 text-sm text-zinc-600">
                <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>
        <form
          onSubmit={send}
          className="border-t border-zinc-100 p-3 sm:p-4 flex gap-2 bg-zinc-50/80"
        >
          <input
            className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none"
            placeholder="Type your question…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button type="submit" disabled={busy || !input.trim()} className="px-4 shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </PageScaffold>
  )
}
