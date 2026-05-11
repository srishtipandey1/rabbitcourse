'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, BookOpenCheck, Brain, Clock3, Link as LinkIcon, Sparkles } from 'lucide-react'
import { API, authHeaders } from '@/lib/api'

export default function HomePage() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [level, setLevel] = useState('beginner')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (input.trim().length < 3) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/generate`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          input: input.trim(),
          learner_level: level,
          learning_goal: 'Build a complete practical understanding with lessons, quizzes, and review checkpoints.',
          weekly_time_commitment: '5 hours/week',
          preferred_format: 'mixed',
          max_videos: 6,
        }),
      })
      const data = await res.json()
      if (data.course_id) router.push(`/processing/${data.course_id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-[#102033]">
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <a href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#f2673a] text-sm font-black text-white">RC</span>
          <span className="text-xl font-black">RabbitCourse</span>
        </a>
        <nav className="hidden items-center gap-6 text-sm font-black text-slate-500 md:flex">
          <a href="/dashboard">Dashboard</a>
          <a href="/courses">Courses</a>
          <a href="/auth" className="rounded-lg bg-[#102033] px-4 py-2 text-white">Sign in</a>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-8 lg:grid-cols-[0.95fr_1.05fr] lg:pt-16">
        <div>
          <p className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-[#1464d8] shadow-sm">
            AI curriculum builder for serious learning
          </p>
          <h1 className="mt-6 max-w-2xl text-5xl font-black leading-[1.05] md:text-7xl">
            Build a course around anything you want to learn.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Paste a topic or YouTube URL. RabbitCourse generates a syllabus, tracks progress, and gives you a clean lesson workspace.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/dashboard" className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#102033] px-6 text-sm font-black text-white">
              Open dashboard <ArrowRight size={16} />
            </a>
            <a href="/generate" className="inline-flex h-12 items-center gap-2 rounded-lg border border-slate-200 bg-white px-6 text-sm font-black text-[#102033]">
              Advanced builder
            </a>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-[#1464d8]">Start a learning path</p>
              <h2 className="mt-1 text-2xl font-black">What should RabbitCourse build?</h2>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#effaf4] text-[#19a974]">
              <Sparkles size={20} />
            </span>
          </div>

          <div className="relative">
            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') submit()
              }}
              className="h-14 w-full rounded-lg border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-bold outline-none focus:border-[#2f80ed]"
              placeholder="Type a topic or paste a YouTube URL"
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {['beginner', 'intermediate', 'advanced'].map(item => (
              <button
                key={item}
                onClick={() => setLevel(item)}
                className={`h-11 rounded-lg border text-sm font-black capitalize ${level === item ? 'border-[#19a974] bg-emerald-50 text-[#137a55]' : 'border-slate-200 bg-white text-slate-500'}`}
              >
                {item}
              </button>
            ))}
          </div>

          <button
            onClick={submit}
            disabled={input.trim().length < 3 || loading}
            className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-lg bg-[#f2673a] px-5 py-4 text-sm font-black text-white disabled:opacity-50"
          >
            {loading ? 'Starting generation...' : 'Generate course'} <ArrowRight size={16} />
          </button>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              ['Syllabus', BookOpenCheck, 'Modules and lessons'],
              ['AI path', Brain, 'Gaps and next steps'],
              ['Pace', Clock3, 'Study plan and progress'],
            ].map(([label, Icon, body]: any) => (
              <div key={label} className="rounded-lg bg-slate-50 p-4">
                <Icon size={18} className="text-[#1464d8]" />
                <p className="mt-3 text-sm font-black">{label}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
