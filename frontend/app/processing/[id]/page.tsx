'use client'

import { Suspense, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppShell, GenerationProgressTimeline, SyllabusPreview } from '@/components/RabbitUI'
import { useAgentStream } from '@/lib/useAgentStream'
import { BookOpenCheck, Brain, FileSearch, Route } from 'lucide-react'

function ProcessingInner() {
  const params = useParams()
  const router = useRouter()
  const courseId = params?.id as string
  const { events, isDone, isError, currentStage } = useAgentStream(courseId)

  useEffect(() => {
    if (isDone && courseId) setTimeout(() => router.push(`/course/${courseId}`), 1200)
  }, [isDone, courseId, router])

  return (
    <AppShell active="generate">
      <main className="grid gap-6 p-5 md:p-8 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <GenerationProgressTimeline events={events} currentStage={currentStage} isDone={isDone} />
          {isError && <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 font-bold text-rose-700">Generation failed. Check the backend logs or try a smaller topic.</div>}
          <section className="grid gap-4 md:grid-cols-3">
            {[
              ['Transcript', 'Video metadata and captions are converted into source structure.', FileSearch],
              ['Concept graph', 'RabbitCourse maps concepts, prerequisites, and weak spots.', Brain],
              ['Learning path', 'Modules, lessons, quizzes, and review plan are assembled.', Route],
            ].map(([title, body, Icon]: any) => (
              <div key={title} className="rounded-lg bg-white p-5 shadow-sm">
                <Icon className="text-[#1464d8]" />
                <h3 className="mt-4 font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
              </div>
            ))}
          </section>
        </div>
        <div className="space-y-5">
          <div className="rounded-lg bg-[#102033] p-5 text-white">
            <BookOpenCheck className="text-[#8ed4ff]" />
            <h2 className="mt-4 text-2xl font-black">Syllabus appears as the run completes</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">When finalizing finishes, you’ll land directly in the lesson workspace.</p>
          </div>
          <SyllabusPreview />
        </div>
      </main>
    </AppShell>
  )
}

export default function ProcessingPage() {
  return (
    <Suspense>
      <ProcessingInner />
    </Suspense>
  )
}
