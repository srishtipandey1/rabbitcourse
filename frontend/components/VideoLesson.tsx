'use client'
import { useState } from 'react'
import { Clock, StickyNote } from 'lucide-react'

interface VideoLessonData {
  title: string
  video_url: string
  video_title: string
  channel: string
  focus_start_sec?: number
  focus_end_sec?: number
  summary?: string
  concepts?: string[]
  concept_markers?: { concept: string; time_sec: number }[]
  notes?: string[]
  difficulty?: string
  confidence?: number
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function extractVideoId(url: string): string {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
  return m?.[1] || ''
}

export default function VideoLesson({ lesson, onComplete }: { lesson: VideoLessonData; onComplete: () => void }) {
  const [showEmbed, setShowEmbed] = useState(false)
  const videoId = extractVideoId(lesson.video_url)
  const startSec = lesson.focus_start_sec || 0
  const endSec = lesson.focus_end_sec || 0
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}?start=${startSec}&rel=0&modestbranding=1` : ''

  return (
    <div className="fade-up">
      <div className="mb-1">
        <span className="badge-video text-[10px] mb-2 inline-block">
          video / {lesson.difficulty || 'beginner'} / {Math.round((lesson.confidence || 0.5) * 100)}% confidence
        </span>
        <h2 className="text-3xl font-semibold text-slate-50 leading-tight">{lesson.title}</h2>
        <p className="text-sm text-slate-500 mt-1">
          {lesson.channel}
          {startSec > 0 && endSec > 0 && <span className="font-mono ml-2">watch {formatTime(startSec)} - {formatTime(endSec)}</span>}
        </p>
      </div>

      <div className="mt-5 mb-6">
        {showEmbed && embedUrl ? (
          <div className="aspect-video w-full rounded-lg overflow-hidden border border-white/10">
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div
            onClick={() => videoId ? setShowEmbed(true) : window.open(lesson.video_url, '_blank')}
            className="aspect-video w-full rounded-lg bg-slate-900 border border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800 transition-colors group"
          >
            <div className="w-14 h-14 rounded-full bg-cyan-300 group-hover:bg-cyan-200 flex items-center justify-center transition-colors mb-3 shadow-[0_0_28px_rgba(103,232,249,0.22)]">
              <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[18px] border-l-slate-950 ml-1" />
            </div>
            <p className="text-sm text-slate-200 font-medium">{lesson.video_title}</p>
            <p className="text-xs text-slate-500 mt-1">{videoId ? 'Click to play' : 'Open on YouTube'}</p>
          </div>
        )}
      </div>

      {lesson.summary && (
        <div className="mb-5 p-4 bg-white/[0.04] rounded-lg border border-white/10">
          <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1.5">What you will learn</p>
          <p className="text-sm text-slate-300 leading-relaxed">{lesson.summary}</p>
        </div>
      )}

      {lesson.concept_markers && lesson.concept_markers.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><Clock size={13} /> Timestamped concept markers</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {lesson.concept_markers.map((m, i) => (
              <a key={i} href={`${lesson.video_url}&t=${m.time_sec}`} target="_blank" className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300 hover:border-cyan-300/40">
                <span className="font-mono text-cyan-200">{formatTime(m.time_sec)}</span> {m.concept}
              </a>
            ))}
          </div>
        </div>
      )}

      {lesson.concepts && lesson.concepts.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">Concepts covered</p>
          <div className="flex flex-wrap gap-2">
            {lesson.concepts.map((c, i) => (
              <span key={i} className="text-xs bg-cyan-400/10 border border-cyan-300/20 text-cyan-100 px-2.5 py-1 rounded-full">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {lesson.notes && lesson.notes.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-300/20 bg-amber-300/10 p-4">
          <p className="text-xs font-mono text-amber-100 uppercase tracking-wider mb-2 flex items-center gap-2"><StickyNote size={13} /> Inline notes</p>
          {lesson.notes.map((note, i) => <p key={`${note}-${i}`} className="text-xs text-amber-100/80">{note}</p>)}
        </div>
      )}

      <div className="mb-6 flex items-center gap-3">
        <a href={lesson.video_url} target="_blank" rel="noopener noreferrer" className="btn-outline text-xs py-1.5">Open on YouTube</a>
        {startSec > 0 && (
          <a href={`${lesson.video_url}&t=${startSec}`} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-cyan-200 font-mono transition-colors">
            Jump to {formatTime(startSec)}
          </a>
        )}
      </div>

      <button onClick={onComplete} className="btn-primary w-full py-2.5">Mark complete and continue</button>
    </div>
  )
}
