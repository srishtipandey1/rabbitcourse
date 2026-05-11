'use client'
import ReactMarkdown from 'react-markdown'
import { Layers, Network } from 'lucide-react'

interface WrittenLessonData {
  title: string
  topic?: string
  summary?: string
  content?: string
  concepts?: string[]
  layers?: { simple?: string; deeper?: string; technical?: string }
  diagram?: string
  difficulty?: string
  confidence?: number
}

export default function WrittenLesson({ lesson, onComplete }: { lesson: WrittenLessonData; onComplete: () => void }) {
  return (
    <div className="fade-up">
      <div className="mb-1">
        <span className="badge-written text-[10px] mb-2 inline-block">
          written / {lesson.difficulty || 'beginner'} / {Math.round((lesson.confidence || 0.5) * 100)}% confidence
        </span>
        <h2 className="text-3xl font-semibold text-slate-50 leading-tight">{lesson.title}</h2>
        {lesson.summary && <p className="text-sm text-slate-500 mt-1">{lesson.summary}</p>}
      </div>

      {lesson.layers && (
        <div className="mt-5 mb-5 grid gap-3">
          {[
            ['Simple', lesson.layers.simple],
            ['Deeper', lesson.layers.deeper],
            ['Technical', lesson.layers.technical],
          ].map(([label, text]) => text && (
            <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-mono uppercase tracking-wider text-cyan-200 flex items-center gap-2"><Layers size={13} /> {label}</p>
              <p className="mt-1 text-sm text-slate-300 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      )}

      {lesson.concepts && lesson.concepts.length > 0 && (
        <div className="mt-4 mb-5 flex flex-wrap gap-2">
          {lesson.concepts.map((c, i) => (
            <span key={i} className="text-xs bg-amber-300/10 border border-amber-300/20 text-amber-100 px-2.5 py-1 rounded-full">
              {c}
            </span>
          ))}
        </div>
      )}

      {lesson.diagram && (
        <div className="mb-6 rounded-lg border border-white/10 bg-slate-900/70 p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-slate-500 flex items-center gap-2 mb-3"><Network size={13} /> Concept diagram</p>
          <pre className="overflow-x-auto text-xs text-cyan-100">{lesson.diagram}</pre>
        </div>
      )}

      <hr className="border-white/10 my-5" />

      {lesson.content ? (
        <div className="prose-lesson">
          <ReactMarkdown>{lesson.content}</ReactMarkdown>
        </div>
      ) : (
        <div className="text-center py-10 text-slate-500 text-sm">Lesson content not generated yet.</div>
      )}

      <hr className="border-white/10 my-6" />

      <button onClick={onComplete} className="btn-primary w-full py-2.5">Got it, continue</button>
    </div>
  )
}
