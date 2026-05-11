'use client'

import { useEffect, useState } from 'react'
import { AppShell, CourseCardGrid, EmptyState, LoadingSkeleton } from '@/components/RabbitUI'
import { API, demoCourses } from '@/lib/api'

export default function HistoryPage() {
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/courses`)
      .then(r => r.json())
      .then(data => setCourses(Array.isArray(data) && data.length ? data : demoCourses))
      .catch(() => setCourses(demoCourses))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppShell active="history">
      <main className="p-5 md:p-8">
        <p className="text-sm font-black text-[#1464d8]">Generation history</p>
        <h1 className="mb-6 text-4xl font-black">Previous generated courses</h1>
        {loading ? <LoadingSkeleton /> : courses.length ? <CourseCardGrid courses={courses} /> : <EmptyState title="No generated courses yet" body="Start with a topic or YouTube URL and RabbitCourse will save the run here." />}
      </main>
    </AppShell>
  )
}
