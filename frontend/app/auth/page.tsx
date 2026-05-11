'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, LockKeyhole, UserPlus } from 'lucide-react'
import { API } from '@/lib/api'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const [form, setForm] = useState({ display_name: '', email: '', password: '' })
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    const res = await fetch(`${API}/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.detail || 'Authentication failed')
      return
    }
    localStorage.setItem('rabbitcourse_token', data.token)
    router.push('/dashboard')
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f7fb] px-6 text-[#102033]">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <a href="/" className="mb-8 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#f2673a] text-sm font-black text-white">RC</span>
          <span className="text-xl font-black">RabbitCourse</span>
        </a>
        <div className="mb-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setMode('signup')} className={`flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-black ${mode === 'signup' ? 'bg-[#102033] text-white' : 'bg-slate-50 text-slate-500'}`}><UserPlus size={16} /> Sign up</button>
          <button type="button" onClick={() => setMode('login')} className={`flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-black ${mode === 'login' ? 'bg-[#102033] text-white' : 'bg-slate-50 text-slate-500'}`}><LockKeyhole size={16} /> Log in</button>
        </div>
        {mode === 'signup' && <input className="mb-3 h-12 w-full rounded-lg border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-[#2f80ed]" placeholder="Display name" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} />}
        <input className="mb-3 h-12 w-full rounded-lg border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-[#2f80ed]" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <input type="password" className="mb-4 h-12 w-full rounded-lg border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-[#2f80ed]" placeholder="Password, 8+ characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        {error && <p className="mb-3 rounded-lg bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
        <button className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#f2673a] text-sm font-black text-white">Continue <ArrowRight size={16} /></button>
      </form>
    </main>
  )
}
