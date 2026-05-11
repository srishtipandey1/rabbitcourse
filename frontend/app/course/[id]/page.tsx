'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  AppShell,
  CourseHeader,
  CourseQualityScore,
  LearningIntelligencePanel,
  LessonChecklist,
  LessonNotesPanel,
  LessonPlayer,
  MaterialLibrary,
  MaterialUploadPanel,
  ModuleSidebar,
  SyllabusPreview,
} from '@/components/RabbitUI'
import { API, authHeaders, demoCurriculum } from '@/lib/api'
import { useLessonNav } from '@/lib/useLessonNav'

function CourseInner() {
  const params = useParams()
  const courseId = params?.id as string
  const [data, setData] = useState<any>(null)
  const [materials, setMaterials] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mobileTab, setMobileTab] = useState<'lesson' | 'plan' | 'intel'>('lesson')
  const { activeModuleIdx, activeLessonIdx, completedLessons, markComplete, setActive } = useLessonNav()

  useEffect(() => {
    if (!courseId) return
    fetch(`${API}/course/${courseId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setData({ course_id: courseId, title: demoCurriculum.course_title, curriculum: demoCurriculum, quality_score: { overall: 91 } }))
      .finally(() => setLoading(false))
  }, [courseId])

  useEffect(() => {
    if (!courseId) return
    fetch(`${API}/courses/${courseId}/materials`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(setMaterials)
      .catch(() => setMaterials([]))
  }, [courseId])

  if (loading) return <AppShell active="courses"><main className="p-8"><div className="h-96 animate-pulse rounded-lg bg-white" /></main></AppShell>

  const curriculum = data?.curriculum || demoCurriculum
  const modules = curriculum.modules || []
  const lesson = modules[activeModuleIdx]?.lessons?.[activeLessonIdx] || modules[0]?.lessons?.[0]
  const lessonKey = lesson?.lesson_key || `${activeModuleIdx}-${activeLessonIdx}`
  const totalLessons = modules.reduce((sum: number, mod: any) => sum + (mod.lessons?.length || 0), 0) || 1
  const progress = Math.round((completedLessons.size / totalLessons) * 100)

  const complete = async () => {
    markComplete(lessonKey)
    await fetch(`${API}/course/${courseId}/lessons/${lessonKey}/complete`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ completed: true, time_spent_sec: 300 }),
    }).catch(() => null)
  }

  const upload = async (file: File) => {
    const body = new FormData()
    body.append('file', file)
    const res = await fetch(`${API}/courses/${courseId}/materials`, { method: 'POST', headers: authHeaders(), body })
    if (res.ok) {
      const material = await res.json()
      setMaterials(prev => [...prev, material])
    }
  }

  return (
    <AppShell active="courses">
      <main className="space-y-5 p-5 md:p-8">
        <CourseHeader data={{ ...data, curriculum, course_id: courseId }} progress={progress} />

        <div className="flex gap-2 lg:hidden">
          {['lesson', 'plan', 'intel'].map(tab => <button key={tab} onClick={() => setMobileTab(tab as any)} className={`h-10 rounded-lg px-4 text-sm font-black capitalize ${mobileTab === tab ? 'bg-[#102033] text-white' : 'bg-white text-slate-500'}`}>{tab}</button>)}
        </div>

        <div className="grid gap-5 xl:grid-cols-[300px_1fr_340px]">
          <div className={`${mobileTab === 'plan' ? 'block' : 'hidden'} xl:block`}>
            <ModuleSidebar modules={modules} activeModuleIdx={activeModuleIdx} activeLessonIdx={activeLessonIdx} completedLessons={completedLessons} setActive={setActive} />
            <div className="mt-5"><LessonChecklist modules={modules} completedLessons={completedLessons} /></div>
          </div>

          <div className={`${mobileTab === 'lesson' ? 'block' : 'hidden'} space-y-5 xl:block`}>
            <LessonPlayer lesson={lesson} onComplete={complete} completed={completedLessons.has(lessonKey)} />
            <LessonNotesPanel />
            <SyllabusPreview curriculum={curriculum} />
          </div>

          <div className={`${mobileTab === 'intel' ? 'block' : 'hidden'} space-y-5 xl:block`}>
            <LearningIntelligencePanel intelligence={data?.learning_intelligence} lesson={lesson} />
            <CourseQualityScore score={data?.quality_score} />
            <MaterialUploadPanel onUpload={upload} />
            <MaterialLibrary materials={materials} />
          </div>
        </div>
      </main>
    </AppShell>
  )
}

export default function CoursePage() {
  return (
    <Suspense>
      <CourseInner />
    </Suspense>
  )
}
