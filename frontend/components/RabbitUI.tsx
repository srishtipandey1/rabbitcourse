'use client'

import { ReactNode, useMemo, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Brain,
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  ClipboardList,
  Clock3,
  Download,
  FileText,
  Gauge,
  GraduationCap,
  Home,
  Layers3,
  Library,
  Link as LinkIcon,
  Loader2,
  LogOut,
  NotebookPen,
  PlayCircle,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target,
  UploadCloud,
  User,
  WandSparkles,
} from 'lucide-react'
import { demoCurriculum } from '@/lib/api'

type Course = any
type Module = any
type Lesson = any

export function AppShell({ children, active = 'dashboard' }: { children: ReactNode; active?: string }) {
  const nav = [
    ['dashboard', '/dashboard', Home],
    ['generate', '/generate', WandSparkles],
    ['courses', '/courses', Library],
    ['history', '/history', Clock3],
    ['settings', '/settings', Settings],
  ] as const

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-[#102033]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-20 items-center gap-3 px-6">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#f2673a] text-sm font-black text-white">RC</span>
          <div>
            <p className="text-lg font-black">RabbitCourse</p>
            <p className="text-xs font-semibold text-slate-400">AI learning workspace</p>
          </div>
        </div>
        <nav className="space-y-1 px-3">
          {nav.map(([label, href, Icon]) => (
            <a
              key={label}
              href={href}
              className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold capitalize transition ${active === label ? 'bg-[#eaf4ff] text-[#1464d8]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <Icon size={18} /> {label}
            </a>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <a href="/" className="lg:hidden grid h-9 w-9 place-items-center rounded-lg bg-[#f2673a] text-xs font-black text-white">RC</a>
            <div className="relative hidden w-80 md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-[#2f80ed]" placeholder="Search courses, lessons, concepts" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/generate" className="hidden h-10 items-center gap-2 rounded-lg bg-[#f2673a] px-4 text-sm font-black text-white shadow-sm sm:flex">
              <Plus size={16} /> New course
            </a>
            <a href="/auth" className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600">
              <User size={18} />
            </a>
          </div>
        </header>
        {children}
      </div>
    </div>
  )
}

export function ProgressRing({ value, size = 84, label }: { value: number; size?: number; label?: string }) {
  const radius = 38
  const circumference = 2 * Math.PI * radius
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={radius} fill="none" stroke="#e6edf5" strokeWidth="8" />
        <circle cx="45" cy="45" r={radius} fill="none" stroke="#19a974" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference - (circumference * value) / 100} transform="rotate(-90 45 45)" />
      </svg>
      <div className="absolute text-center">
        <p className="text-lg font-black">{value}%</p>
        {label && <p className="text-[10px] font-bold text-slate-400">{label}</p>}
      </div>
    </div>
  )
}

export function CourseCard({ course }: { course: Course }) {
  const progress = course.progress ?? (course.status === 'done' ? 18 : 0)
  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
      <div className="flex h-36 items-center justify-between bg-gradient-to-br from-[#eaf4ff] to-[#effaf4] p-5">
        <div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#1464d8] shadow-sm">{course.source_type || 'topic'}</span>
          <p className="mt-5 text-sm font-black uppercase text-slate-400">{course.difficulty || 'beginner'}</p>
        </div>
        <ProgressRing value={progress} size={72} />
      </div>
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className={`rounded-full px-3 py-1 text-xs font-black ${course.status === 'done' ? 'bg-emerald-50 text-emerald-700' : course.status === 'processing' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{course.status}</span>
          <span className="text-xs font-bold text-slate-400">{Math.round((course.estimated_minutes || 120) / 60)}h</span>
        </div>
        <h3 className="line-clamp-2 min-h-[56px] text-xl font-black leading-7 text-[#102033]">{course.title || course.topic || 'Untitled course'}</h3>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-500">
          <span className="rounded-lg bg-slate-50 py-2">{course.lesson_count || 8} lessons</span>
          <span className="rounded-lg bg-slate-50 py-2">{course.video_count || 0} videos</span>
          <span className="rounded-lg bg-slate-50 py-2">{course.quality_score?.overall || 86} score</span>
        </div>
        <div className="mt-5 flex gap-2">
          <a href={course.status === 'processing' ? `/processing/${course.course_id}` : `/course/${course.course_id}`} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#102033] text-sm font-black text-white">
            Continue <ArrowRight size={15} />
          </a>
          <a href="/generate" className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-500">
            <Sparkles size={17} />
          </a>
        </div>
      </div>
    </article>
  )
}

export function CourseCardGrid({ courses }: { courses: Course[] }) {
  return <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{courses.map(course => <CourseCard key={course.course_id} course={course} />)}</div>
}

export function EmptyState({ title, body, actionHref = '/generate' }: { title: string; body: string; actionHref?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#eaf4ff] text-[#1464d8]"><Sparkles size={24} /></div>
      <h2 className="mt-5 text-2xl font-black">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{body}</p>
      <a href={actionHref} className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-[#f2673a] px-5 text-sm font-black text-white">Build a course <ArrowRight size={16} /></a>
    </div>
  )
}

export function LoadingSkeleton() {
  return <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="h-80 animate-pulse rounded-lg bg-white" />)}</div>
}

export function ErrorState({ message }: { message: string }) {
  return <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700">{message}</div>
}

export function DisabledState({ children }: { children: ReactNode }) {
  return <div className="pointer-events-none opacity-50">{children}</div>
}

export function ContinueLearningCard({ course }: { course: Course }) {
  return (
    <section className="rounded-lg bg-[#102033] p-6 text-white shadow-[0_20px_60px_rgba(16,32,51,0.18)]">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-black text-[#8ed4ff]">Continue learning</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-black md:text-4xl">{course.title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">Next best lesson: Human-in-the-loop UX. Estimated finish: 9 days at your current pace.</p>
        </div>
        <div className="flex items-center gap-5">
          <ProgressRing value={course.progress || 62} label="done" />
          <a href={`/course/${course.course_id}`} className="flex h-12 items-center gap-2 rounded-lg bg-[#f2673a] px-6 text-sm font-black text-white">Continue <ArrowRight size={16} /></a>
        </div>
      </div>
    </section>
  )
}

export function TopicOrYoutubeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isYoutube = /youtu\.?be/.test(value)
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <label className="text-sm font-black text-[#102033]">Topic or YouTube URL</label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input value={value} onChange={e => onChange(e.target.value)} className="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold outline-none focus:border-[#2f80ed]" placeholder="e.g. advanced JavaScript or https://youtube.com/watch?v=..." />
        </div>
      </div>
      <div className="mt-4 rounded-lg bg-slate-50 p-4">
        <p className="text-sm font-black">{isYoutube ? 'YouTube URL mode' : 'Topic mode'}</p>
        <p className="mt-1 text-sm text-slate-500">{isYoutube ? 'RabbitCourse will extract metadata, transcript structure, concepts, and gaps.' : 'RabbitCourse will generate a curriculum from scratch around your goal.'}</p>
      </div>
    </div>
  )
}

export function LearnerLevelSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-3 min-[900px]:grid-cols-3">
      {['beginner', 'intermediate', 'advanced'].map(level => (
        <button key={level} onClick={() => onChange(level)} className={`rounded-lg border p-5 text-left capitalize ${value === level ? 'border-[#19a974] bg-emerald-50' : 'border-slate-200 bg-white'}`}>
          <GraduationCap className={value === level ? 'text-[#19a974]' : 'text-slate-400'} />
          <p className="mt-3 font-black">{level}</p>
          <p className="mt-1 text-sm text-slate-500">{level === 'beginner' ? 'Build foundations patiently.' : level === 'intermediate' ? 'Fill gaps and practice.' : 'Go deep and move fast.'}</p>
        </button>
      ))}
    </div>
  )
}

export function LearningGoalInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} className="min-h-28 w-full rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold outline-none focus:border-[#2f80ed]" placeholder="What should you be able to do after this course?" />
}

export function TimeCommitmentSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {['2 hours/week', '5 hours/week', '8 hours/week'].map(time => (
        <button key={time} onClick={() => onChange(time)} className={`h-14 rounded-lg border text-sm font-black ${value === time ? 'border-[#2f80ed] bg-[#eaf4ff] text-[#1464d8]' : 'border-slate-200 bg-white text-slate-600'}`}>{time}</button>
      ))}
    </div>
  )
}

export function SyllabusPreview({ curriculum = demoCurriculum }: { curriculum?: any }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black">Generated syllabus preview</h2>
        <span className="rounded-full bg-[#effaf4] px-3 py-1 text-xs font-black text-[#19a974]">Ready to enroll</span>
      </div>
      <p className="text-sm leading-6 text-slate-500">{curriculum.overview || 'A structured course with modules, lessons, quizzes, and review checkpoints.'}</p>
      <div className="mt-5 space-y-3">
        {(curriculum.modules || []).map((module: Module, idx: number) => (
          <div key={module.title} className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm font-black">Module {idx + 1}: {module.title}</p>
            <p className="mt-1 text-xs text-slate-500">{module.lessons?.length || 0} lessons | prerequisites included | outcomes mapped</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function GenerationProgressTimeline({ events, currentStage, isDone }: { events: any[]; currentStage: string; isDone: boolean }) {
  const stages = ['analyzing input', 'fetching transcript', 'extracting concepts', 'detecting gaps', 'building curriculum', 'generating lessons', 'finalizing course']
  const normalized = normalizeStage(currentStage)
  const activeIndex = Math.max(0, stages.indexOf(normalized))
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Building your course</h1>
          <p className="text-sm text-slate-500">{events.at(-1)?.message || 'Analyzing your input and preparing the curriculum.'}</p>
        </div>
        <ProgressRing value={isDone ? 100 : Math.min(94, activeIndex * 15 + 8)} />
      </div>
      <div className="space-y-4">
        {stages.map((stage, idx) => {
          const complete = isDone || idx < activeIndex
          const active = idx === activeIndex && !isDone
          return (
            <div key={stage} className="flex gap-3">
              <span className={`mt-0.5 grid h-7 w-7 place-items-center rounded-full ${complete ? 'bg-[#19a974] text-white' : active ? 'bg-[#eaf4ff] text-[#1464d8]' : 'bg-slate-100 text-slate-400'}`}>{complete ? <Check size={15} /> : active ? <Loader2 className="animate-spin" size={15} /> : <Circle size={12} />}</span>
              <div>
                <p className="text-sm font-black capitalize">{stage}</p>
                <p className="text-xs text-slate-500">{active ? events.at(-1)?.message || 'Working...' : complete ? 'Completed' : 'Queued'}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function normalizeStage(stage: string) {
  const map: Record<string, string> = {
    idle: 'analyzing input',
    fetch: 'analyzing input',
    transcript: 'fetching transcript',
    concepts: 'extracting concepts',
    gaps: 'detecting gaps',
    graph: 'building curriculum',
    curriculum: 'building curriculum',
    writing: 'generating lessons',
    quiz: 'generating lessons',
    done: 'finalizing course',
  }
  return map[stage] || stage || 'analyzing input'
}

export function CourseHeader({ data, progress }: { data: any; progress: number }) {
  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-black text-[#1464d8]">{data.source_type || 'topic'} | {data.difficulty || 'beginner'}</p>
          <h1 className="mt-2 text-3xl font-black md:text-4xl">{data.title || data.curriculum?.course_title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{data.learning_goal || 'Follow the generated path, complete lessons, and review weak concepts.'}</p>
        </div>
        <div className="flex items-center gap-4">
          <ProgressRing value={progress} label="path" />
          <a href={`/export/${data.course_id}`} className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-black"><Download size={16} /> Export</a>
        </div>
      </div>
    </section>
  )
}

export function ModuleSidebar({ modules, activeModuleIdx, activeLessonIdx, completedLessons, setActive }: any) {
  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="px-2 pb-3 text-xs font-black uppercase text-slate-400">Syllabus</p>
      {modules.map((module: Module, mi: number) => {
        const done = module.lessons?.filter((_: Lesson, li: number) => completedLessons.has(`${mi}-${li}`)).length || 0
        const total = module.lessons?.length || 1
        return (
          <div key={module.title} className="mb-3 rounded-lg bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-black">{module.title}</p>
              <span className="text-xs font-bold text-slate-400">{done}/{total}</span>
            </div>
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-[#19a974]" style={{ width: `${(done / total) * 100}%` }} /></div>
            {module.lessons?.map((lesson: Lesson, li: number) => (
              <button key={lesson.title} onClick={() => setActive(mi, li)} className={`mt-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs font-bold ${mi === activeModuleIdx && li === activeLessonIdx ? 'bg-white text-[#1464d8] shadow-sm' : 'text-slate-500 hover:bg-white'}`}>
                {completedLessons.has(`${mi}-${li}`) ? <Check size={14} className="text-[#19a974]" /> : <ChevronRight size={14} />}
                <span className="line-clamp-1">{lesson.title}</span>
              </button>
            ))}
          </div>
        )
      })}
    </aside>
  )
}

export function LessonPlayer({ lesson, onComplete, completed }: { lesson: Lesson; onComplete: () => void; completed: boolean }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <span className="rounded-full bg-[#eaf4ff] px-3 py-1 text-xs font-black text-[#1464d8]">{lesson?.type || 'lesson'}</span>
          <h2 className="mt-3 text-3xl font-black">{lesson?.title || 'Select a lesson'}</h2>
        </div>
        <button onClick={onComplete} className={`flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-black ${completed ? 'bg-[#effaf4] text-[#19a974]' : 'bg-[#f2673a] text-white'}`}>
          <Check size={16} /> {completed ? 'Completed' : 'Mark complete'}
        </button>
      </div>
      {lesson?.type === 'video' ? (
        <div className="grid aspect-video place-items-center rounded-lg bg-slate-900 text-white"><PlayCircle size={46} /></div>
      ) : lesson?.type === 'quiz' ? (
        <div className="rounded-lg bg-slate-50 p-5">
          <p className="font-black">{lesson.questions?.[0]?.question || 'Knowledge check'}</p>
          <div className="mt-4 grid gap-2">{(lesson.questions?.[0]?.options || ['Review the concept', 'Skip practice']).map((option: string) => <button key={option} className="rounded-lg border border-slate-200 bg-white p-3 text-left text-sm font-bold">{option}</button>)}</div>
        </div>
      ) : (
        <div className="prose-lesson max-w-none text-slate-600">
          <p>{lesson?.content || lesson?.summary || 'This lesson is generated around your learning goal with concepts, examples, and practice prompts.'}</p>
        </div>
      )}
    </article>
  )
}

export function LessonNotesPanel() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center gap-2"><NotebookPen size={17} className="text-[#1464d8]" /><h3 className="font-black">Lesson notes</h3></div>
      <textarea className="min-h-32 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-[#2f80ed]" placeholder="Capture takeaways, questions, and examples..." />
    </div>
  )
}

export function MaterialUploadPanel({ onUpload }: { onUpload?: (file: File) => void }) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-5 text-center">
      <UploadCloud className="text-[#19a974]" />
      <p className="mt-2 text-sm font-black">Upload materials</p>
      <p className="text-xs text-slate-500">PDFs, notes, slides, docs up to 25MB</p>
      <input type="file" className="hidden" onChange={e => e.target.files?.[0] && onUpload?.(e.target.files[0])} />
    </label>
  )
}

export function MaterialLibrary({ materials = [] }: { materials?: any[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center gap-2"><FileText size={17} className="text-[#f2673a]" /><h3 className="font-black">Material library</h3></div>
      <div className="space-y-2">
        {materials.length === 0 ? <p className="text-sm text-slate-500">No materials yet. Add notes, slides, or PDFs for this course.</p> : materials.map(item => <div key={item.material_id} className="rounded-lg bg-slate-50 p-3 text-sm font-bold">{item.filename}</div>)}
      </div>
    </div>
  )
}

export function LearningIntelligencePanel({ intelligence, lesson }: { intelligence?: any; lesson?: any }) {
  const concepts = lesson?.concepts || ['foundations', 'practice design', 'review loop']
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2"><Brain size={18} className="text-[#1464d8]" /><h3 className="font-black">Learning intelligence</h3></div>
      <div className="space-y-3 text-sm">
        <Insight label="Next best lesson" value={lesson?.title || 'Start with foundations'} icon={Target} />
        <Insight label="Weak concepts" value={concepts.slice(0, 2).join(', ')} icon={Gauge} />
        <Insight label="Prerequisite gaps" value={intelligence?.weak_clusters?.[0]?.concept || 'No major gaps'} icon={Layers3} />
        <Insight label="Estimated finish" value="9 days" icon={CalendarDays} />
      </div>
    </div>
  )
}

function Insight({ label, value, icon: Icon }: any) {
  return <div className="rounded-lg bg-slate-50 p-3"><p className="flex items-center gap-2 text-xs font-black uppercase text-slate-400"><Icon size={14} /> {label}</p><p className="mt-1 font-bold text-[#102033]">{value}</p></div>
}

export function CourseQualityScore({ score }: { score?: any }) {
  const s = score || { overall: 88, transcript_quality: 90, concept_coverage: 86, lesson_depth: 88, assessment_readiness: 87 }
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between"><h3 className="font-black">Course quality</h3><ProgressRing value={s.overall || 88} size={66} /></div>
      {[
        ['Transcript quality', s.transcript_quality],
        ['Concept coverage', s.concept_coverage],
        ['Lesson depth', s.lesson_depth],
        ['Assessment readiness', s.assessment_readiness],
      ].map(([label, value]: any) => <div key={label} className="mt-3"><div className="mb-1 flex justify-between text-xs font-bold text-slate-500"><span>{label}</span><span>{value}%</span></div><div className="h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#2f80ed]" style={{ width: `${value}%` }} /></div></div>)}
    </div>
  )
}

export function LessonChecklist({ modules, completedLessons }: any) {
  const lessons = modules.flatMap((m: any, mi: number) => (m.lessons || []).map((l: any, li: number) => ({ ...l, key: `${mi}-${li}` }))).slice(0, 6)
  return <div className="rounded-lg border border-slate-200 bg-white p-5"><h3 className="mb-3 font-black">Lesson checklist</h3>{lessons.map((lesson: any) => <p key={lesson.key} className="flex items-center gap-2 py-2 text-sm font-bold text-slate-600">{completedLessons.has(lesson.key) ? <Check size={15} className="text-[#19a974]" /> : <Circle size={15} className="text-slate-300" />} {lesson.title}</p>)}</div>
}

export function CourseBuilderWizard({ onSubmit, loading }: { onSubmit: (payload: any) => void; loading?: boolean }) {
  const [input, setInput] = useState('')
  const [learnerLevel, setLearnerLevel] = useState('beginner')
  const [learningGoal, setLearningGoal] = useState('')
  const [weeklyTimeCommitment, setWeeklyTimeCommitment] = useState('5 hours/week')
  const [preferredFormat, setPreferredFormat] = useState('mixed')
  const canSubmit = input.trim().length > 2
  const payload = useMemo(() => ({ input, learner_level: learnerLevel, learning_goal: learningGoal, weekly_time_commitment: weeklyTimeCommitment, preferred_format: preferredFormat, max_videos: 6 }), [input, learnerLevel, learningGoal, weeklyTimeCommitment, preferredFormat])
  return (
    <div className="grid gap-6 min-[1180px]:grid-cols-[minmax(430px,1fr)_420px]">
      <div className="space-y-5">
        <TopicOrYoutubeInput value={input} onChange={setInput} />
        <section className="rounded-lg border border-slate-200 bg-white p-5"><h2 className="mb-4 text-lg font-black">Learner level</h2><LearnerLevelSelector value={learnerLevel} onChange={setLearnerLevel} /></section>
        <section className="rounded-lg border border-slate-200 bg-white p-5"><h2 className="mb-4 text-lg font-black">Learning goal</h2><LearningGoalInput value={learningGoal} onChange={setLearningGoal} /></section>
        <section className="rounded-lg border border-slate-200 bg-white p-5"><h2 className="mb-4 text-lg font-black">Weekly time commitment</h2><TimeCommitmentSelector value={weeklyTimeCommitment} onChange={setWeeklyTimeCommitment} /></section>
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-black">Preferred format</h2>
          <div className="grid gap-3 sm:grid-cols-3">{['video-first', 'reading-first', 'mixed'].map(format => <button key={format} onClick={() => setPreferredFormat(format)} className={`h-12 rounded-lg border text-sm font-black ${preferredFormat === format ? 'border-[#f2673a] bg-orange-50 text-[#c94f29]' : 'border-slate-200'}`}>{format}</button>)}</div>
        </section>
      </div>
      <div className="space-y-5">
        <SyllabusPreview />
        <button disabled={!canSubmit || loading} onClick={() => onSubmit(payload)} className="flex h-13 w-full items-center justify-center gap-2 rounded-lg bg-[#f2673a] px-5 py-4 text-sm font-black text-white disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" size={18} /> : <WandSparkles size={18} />} Generate course
        </button>
      </div>
    </div>
  )
}
