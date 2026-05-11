'use client'
import { useLessonNav } from '@/lib/useLessonNav'

interface Lesson {
  type: 'video' | 'written' | 'quiz'
  title: string
}
interface Module {
  title: string
  description?: string
  lessons: Lesson[]
}

const TYPE_BADGE: Record<string, string> = {
  video:   'badge-video',
  written: 'badge-written',
  quiz:    'badge-quiz',
}
const TYPE_LABEL: Record<string, string> = {
  video: 'video', written: 'read', quiz: 'quiz',
}

export default function LessonSidebar({ modules }: { modules: Module[] }) {
  const { activeModuleIdx, activeLessonIdx, completedLessons, setActive } = useLessonNav()

  return (
    <aside className="w-full overflow-y-auto shrink-0 flex flex-col">
      <div className="px-4 py-3 border-b border-white/10">
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Course contents</p>
      </div>

      <div className="flex-1 py-2">
        {modules.map((mod, mi) => (
          <div key={mi} className="mb-1">
            {/* Module header */}
            <div className="px-4 pt-3 pb-1.5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider leading-snug">
                {mod.title}
              </p>
            </div>

            {/* Lessons */}
            {mod.lessons.map((lesson, li) => {
              const key = `${mi}-${li}`
              const isActive = mi === activeModuleIdx && li === activeLessonIdx
              const isDone = completedLessons.has(key)

              return (
                <button
                  key={li}
                  onClick={() => setActive(mi, li)}
                  className={`w-full text-left flex items-start gap-2.5 px-4 py-2.5 transition-colors border-l-2 ${
                    isActive
                      ? 'bg-cyan-400/10 border-l-cyan-300'
                      : 'border-l-transparent hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Done indicator */}
                  <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border shrink-0 flex items-center justify-center transition-colors ${
                    isDone
                      ? 'bg-emerald-400 border-emerald-400'
                      : isActive
                        ? 'border-cyan-300'
                        : 'border-white/20'
                  }`}>
                    {isDone && (
                      <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                        <path d="M1.5 3.5l1.5 1.5L5.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`text-xs leading-snug ${
                      isActive ? 'text-slate-50 font-medium' : 'text-slate-300'
                    }`}>
                      {lesson.title}
                    </p>
                    <span className={`inline-block mt-1 text-[10px] px-1.5 py-px rounded-full font-medium ${
                      lesson.type === 'video'   ? 'bg-rose-400/10 text-rose-200 border border-rose-300/20' :
                      lesson.type === 'written' ? 'bg-amber-300/10 text-amber-100 border border-amber-300/20' :
                                                  'bg-emerald-400/10 text-emerald-100 border border-emerald-300/20'
                    }`}>
                      {TYPE_LABEL[lesson.type]}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </aside>
  )
}
