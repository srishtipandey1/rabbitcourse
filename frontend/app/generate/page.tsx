'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell, CourseBuilderWizard } from '@/components/RabbitUI'
import { API, authHeaders } from '@/lib/api'

export default function GeneratePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (payload: any) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/generate`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to start generation')
      router.push(`/processing/${data.course_id}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell active="generate">
      <main className="p-5 md:p-8">
        <div className="mb-6">
          <p className="text-sm font-black text-[#1464d8]">AI course builder wizard</p>
          <h1 className="text-4xl font-black">Design your next learning path</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Choose topic mode or YouTube URL mode, define your level, goal, pace, and preferred format.</p>
        </div>
        {error && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
        <CourseBuilderWizard onSubmit={submit} loading={loading} />
      </main>
    </AppShell>
  )
}
