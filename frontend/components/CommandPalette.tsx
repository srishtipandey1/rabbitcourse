'use client'
import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'

export default function CommandPalette({
  modules,
  onJump,
}: {
  modules: any[]
  onJump: (moduleIndex: number, lessonIndex: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const results = useMemo(() => {
    const q = query.toLowerCase()
    return modules.flatMap((module, mi) =>
      (module.lessons || []).map((lesson: any, li: number) => ({ module, lesson, mi, li }))
    ).filter(item => {
      const text = `${item.module.title} ${item.lesson.title} ${(item.lesson.concepts || []).join(' ')}`.toLowerCase()
      return !q || text.includes(q)
    }).slice(0, 8)
  }, [modules, query])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm px-4 pt-24" onClick={() => setOpen(false)}>
      <div className="mx-auto max-w-xl rounded-lg border border-white/10 bg-slate-950 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <Search size={16} className="text-slate-500" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
            placeholder="Jump to lesson, concept, or quiz"
          />
        </div>
        <div className="p-2">
          {results.map(item => (
            <button
              key={`${item.mi}-${item.li}`}
              onClick={() => {
                onJump(item.mi, item.li)
                setOpen(false)
              }}
              className="block w-full rounded-md px-3 py-2.5 text-left hover:bg-white/[0.06]"
            >
              <span className="block text-sm text-slate-100">{item.lesson.title}</span>
              <span className="text-xs text-slate-500">{item.module.title} / {item.lesson.type}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
