'use client'
import { useState } from 'react'

interface Question {
  question: string
  options: string[]
  correct_index: number
  explanation: string
}
interface QuizLessonData {
  title: string
  questions?: Question[]
  concepts?: string[]
  adaptive?: boolean
  retry_rule?: string
}

export default function QuizLesson({ lesson, onComplete }: { lesson: QuizLessonData; onComplete: (score?: number, weakConcepts?: string[]) => void }) {
  const questions = lesson.questions || []
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)

  const answered = Object.keys(answers).length
  const correct = submitted ? questions.filter((q, i) => answers[i] === q.correct_index).length : 0
  const pct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0

  const handleAnswer = (qIdx: number, optIdx: number) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }))
  }

  const weakConcepts = () => Array.from(new Set(
    questions.filter((q, i) => answers[i] !== q.correct_index).flatMap(() => lesson.concepts || [])
  ))

  if (questions.length === 0) {
    return (
      <div className="fade-up text-center py-10">
        <p className="text-slate-500 text-sm mb-4">No quiz questions generated.</p>
        <button onClick={() => onComplete()} className="btn-primary px-6">Continue</button>
      </div>
    )
  }

  return (
    <div className="fade-up">
      <div className="mb-1">
        <span className="badge-quiz text-[10px] mb-2 inline-block">adaptive quiz</span>
        <h2 className="text-3xl font-semibold text-slate-50 leading-tight">{lesson.title}</h2>
        <p className="text-sm text-slate-500 mt-1">{questions.length} questions</p>
      </div>

      {lesson.retry_rule && (
        <div className="mt-4 rounded-lg border border-cyan-300/20 bg-cyan-400/10 p-3 text-xs text-cyan-100">
          {lesson.retry_rule}
        </div>
      )}

      {submitted && (
        <div className={`mt-4 mb-5 p-4 rounded-lg border text-center fade-up ${
          pct >= 75 ? 'bg-emerald-400/10 border-emerald-300/20' : pct >= 50 ? 'bg-amber-300/10 border-amber-300/20' : 'bg-rose-400/10 border-rose-300/20'
        }`}>
          <p className={`text-3xl font-semibold mb-1 ${pct >= 75 ? 'text-emerald-100' : pct >= 50 ? 'text-amber-100' : 'text-rose-100'}`}>
            {correct}/{questions.length}
          </p>
          <p className={`text-sm ${pct >= 75 ? 'text-emerald-200' : pct >= 50 ? 'text-amber-200' : 'text-rose-200'}`}>
            {pct >= 75 ? 'Mastery is moving up.' : pct >= 50 ? 'Close. Review the missed concepts.' : 'Revision loop recommended before continuing.'}
          </p>
        </div>
      )}

      <div className="mt-5 space-y-6">
        {questions.map((q, qi) => {
          const userAnswer = answers[qi]
          const isAnswered = userAnswer !== undefined

          return (
            <div key={qi} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-medium text-slate-100 mb-3 leading-snug">
                <span className="text-slate-500 font-mono text-xs mr-1.5">{qi + 1}.</span>
                {q.question}
              </p>

              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  let style = 'border-white/10 hover:border-cyan-300/40 hover:bg-white/[0.06] text-slate-300 cursor-pointer'
                  if (submitted) {
                    if (oi === q.correct_index) style = 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100 cursor-default'
                    else if (oi === userAnswer && oi !== q.correct_index) style = 'border-rose-300/30 bg-rose-400/10 text-rose-100 cursor-default'
                    else style = 'border-white/10 text-slate-500 cursor-default opacity-60'
                  } else if (isAnswered && oi === userAnswer) {
                    style = 'border-cyan-300/50 bg-cyan-400/10 text-slate-100 cursor-pointer'
                  }

                  return (
                    <button key={oi} onClick={() => handleAnswer(qi, oi)} className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg border text-sm transition-all ${style}`}>
                      <span className={`shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-mono mt-px transition-colors ${
                        submitted && oi === q.correct_index ? 'border-emerald-300 bg-emerald-400 text-slate-950' :
                        submitted && oi === userAnswer && oi !== q.correct_index ? 'border-rose-300 bg-rose-400 text-slate-950' :
                        !submitted && oi === userAnswer ? 'border-cyan-300 bg-cyan-300 text-slate-950' :
                        'border-white/20 text-slate-500'
                      }`}>
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span className="leading-snug">{opt}</span>
                    </button>
                  )
                })}
              </div>

              {submitted && q.explanation && (
                <div className="mt-3 p-3 bg-slate-900/80 rounded-lg border border-white/10 fade-up">
                  <p className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-1">Explanation</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{q.explanation}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 flex gap-3">
        {!submitted ? (
          <button onClick={() => setSubmitted(true)} disabled={answered < questions.length} className="btn-primary flex-1 py-2.5">
            {answered < questions.length ? `Answer all questions (${answered}/${questions.length})` : 'Submit answers'}
          </button>
        ) : (
          <>
            {pct < 75 && <button onClick={() => { setAnswers({}); setSubmitted(false) }} className="btn-outline flex-1 py-2.5">Try again</button>}
            <button onClick={() => onComplete(pct, weakConcepts())} className="btn-primary flex-1 py-2.5">Continue</button>
          </>
        )}
      </div>
    </div>
  )
}
