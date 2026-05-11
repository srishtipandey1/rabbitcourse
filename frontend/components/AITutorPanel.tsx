'use client'
import { useState } from 'react'
import { Bot, Lightbulb, ListChecks, MessageSquare, RotateCcw, Send, Sparkles } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const ACTIONS = [
  { label: 'Explain differently', icon: Lightbulb, prompt: 'Explain this concept differently.' },
  { label: 'Give analogy', icon: Sparkles, prompt: 'Give me an analogy.' },
  { label: 'Test me', icon: ListChecks, prompt: 'Test me on this.' },
  { label: 'Summarize', icon: RotateCcw, prompt: 'Summarize what I just learned.' },
]

export default function AITutorPanel({
  courseId,
  lesson,
  intelligence,
}: {
  courseId: string
  lesson: any
  intelligence: any
}) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: intelligence?.adaptive_message || 'I am tracking your path, weak concepts, and next best move.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const ask = async (text: string) => {
    if (!text.trim() || loading) return
    setMessages(prev => [...prev, { role: 'user', text }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/course/${courseId}/tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, lesson_key: lesson?.lesson_key }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply || 'Try revisiting the prerequisite concept in the graph.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'I could not reach the tutor endpoint, but the local course context is still available.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <aside className="w-80 shrink-0 border-l border-white/10 bg-slate-950/80 backdrop-blur-xl flex flex-col">
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-100 flex items-center gap-2">
            <Bot size={16} className="text-cyan-300" /> AI tutor
          </p>
          <span className="text-[11px] rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-emerald-200">
            {intelligence?.mastery_score || 35}% mastery
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500 truncate">{lesson?.title || 'Context-aware help'}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 border-b border-white/10">
        {ACTIONS.map(action => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              onClick={() => ask(action.prompt)}
              className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-2 text-left text-[11px] text-slate-300 hover:border-cyan-300/40 hover:text-white transition"
            >
              <Icon size={13} className="mb-1 text-cyan-300" />
              {action.label}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
              m.role === 'assistant'
                ? 'bg-cyan-400/10 border border-cyan-300/15 text-slate-200'
                : 'bg-white/[0.06] border border-white/10 text-slate-100 ml-6'
            }`}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div className="rounded-lg px-3 py-2 text-xs text-slate-400 bg-white/[0.04] border border-white/10">
            Thinking with the current lesson...
          </div>
        )}
      </div>

      <form
        className="p-3 border-t border-white/10"
        onSubmit={e => {
          e.preventDefault()
          ask(input)
        }}
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-300/50"
            placeholder="Ask about this lesson..."
          />
          <button className="rounded-md bg-cyan-400 px-3 text-slate-950 hover:bg-cyan-300 transition" title="Send">
            <Send size={14} />
          </button>
        </div>
      </form>
    </aside>
  )
}
