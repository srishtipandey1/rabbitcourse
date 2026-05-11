'use client'

import { useEffect, useState } from 'react'
import { AppShell, ContinueLearningCard, CourseCardGrid, EmptyState, LoadingSkeleton, ProgressRing } from '@/components/RabbitUI'
import { API, demoCourses } from '@/lib/api'
import { Activity, BookOpenCheck, CheckCircle2, Sparkles } from 'lucide-react'

export default function DashboardPage() {
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/courses`)
      .then(r => r.json())
      .then(data => setCourses(Array.isArray(data) && data.length ? data : demoCourses))
      .catch(() => setCourses(demoCourses))
      .finally(() => setLoading(false))
  }, [])

  const inProgress = courses.filter(c => c.status !== 'failed')
  const completed = courses.filter(c => (c.progress || 0) >= 100)

  return (
    <AppShell active="dashboard">
      <main className="space-y-6 p-5 md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black text-[#1464d8]">Personal learning dashboard</p>
            <h1 className="mt-1 text-4xl font-black">Your evolving learning plan</h1>
          </div>
          <a href="/generate" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#f2673a] px-5 text-sm font-black text-white"><Sparkles size={16} /> Generate course</a>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Stat icon={BookOpenCheck} label="Enrolled" value={inProgress.length} />
          <Stat icon={Activity} label="In progress" value={inProgress.length} />
          <Stat icon={CheckCircle2} label="Completed" value={completed.length} />
          <div className="rounded-lg bg-white p-5 shadow-sm"><ProgressRing value={68} label="week" /></div>
        </div>

        <ContinueLearningCard course={courses[0] || demoCourses[0]} />

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black">Generated and enrolled courses</h2>
            <a href="/courses" className="text-sm font-black text-[#1464d8]">View all</a>
          </div>
          {loading ? <LoadingSkeleton /> : courses.length ? <CourseCardGrid courses={courses} /> : <EmptyState title="No learning paths yet" body="Generate a course from a topic or YouTube URL to begin." />}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-black">Recent activity</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {['Generated syllabus preview', 'Completed lesson checklist', 'Uploaded notes to material library'].map(item => <div key={item} className="rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-600">{item}</div>)}
          </div>
        </section>
      </main>
    </AppShell>
  )
}

function Stat({ icon: Icon, label, value }: any) {
  return <div className="rounded-lg bg-white p-5 shadow-sm"><Icon className="text-[#19a974]" /><p className="mt-4 text-3xl font-black">{value}</p><p className="text-sm font-bold text-slate-400">{label}</p></div>
}
