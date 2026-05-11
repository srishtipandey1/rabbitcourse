'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppShell, CourseCardGrid, EmptyState, LoadingSkeleton } from '@/components/RabbitUI'
import { API, demoCourses } from '@/lib/api'

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetch(`${API}/courses`)
      .then(r => r.json())
      .then(data => setCourses(Array.isArray(data) && data.length ? data : demoCourses))
      .catch(() => setCourses(demoCourses))
      .finally(() => setLoading(false))
  }, [])

  const visible = useMemo(() => filter === 'all' ? courses : courses.filter(c => c.status === filter || c.source_type === filter), [courses, filter])

  return (
    <AppShell active="courses">
      <main className="p-5 md:p-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black text-[#1464d8]">Course discovery</p>
            <h1 className="text-4xl font-black">Generated course library</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {['all', 'done', 'processing', 'topic', 'youtube'].map(item => <button key={item} onClick={() => setFilter(item)} className={`h-10 rounded-lg px-4 text-sm font-black capitalize ${filter === item ? 'bg-[#102033] text-white' : 'bg-white text-slate-500'}`}>{item}</button>)}
          </div>
        </div>
        {loading ? <LoadingSkeleton /> : visible.length ? <CourseCardGrid courses={visible} /> : <EmptyState title="No matching courses" body="Try another filter or generate a new learning path." />}
      </main>
    </AppShell>
  )
}
