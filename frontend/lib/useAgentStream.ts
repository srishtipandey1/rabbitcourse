import { useEffect, useRef, useState } from 'react'

export interface AgentEvent {
  stage: string
  message: string
  event?: string
  video_title?: string
  concept_count?: number
  missing?: string[]
  title?: string
  video_count?: number
  lesson_count?: number
  course_id?: string
  traceback?: string
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function useAgentStream(courseId: string | null) {
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [isDone, setIsDone] = useState(false)
  const [isError, setIsError] = useState(false)
  const [doneData, setDoneData] = useState<AgentEvent | null>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!courseId) return
    const es = new EventSource(`${API}/stream/${courseId}`)
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const ev: AgentEvent = JSON.parse(e.data)
        setEvents(prev => [...prev, ev])
        if (ev.stage === 'done') { setIsDone(true); setDoneData(ev); es.close() }
        if (ev.stage === 'error') { setIsError(true); es.close() }
      } catch {}
    }
    es.onerror = () => { setIsError(true); es.close() }
    return () => es.close()
  }, [courseId])

  const currentStage = events.length > 0 ? events[events.length - 1].stage : 'idle'
  const currentMessage = events.length > 0 ? events[events.length - 1].message : ''
  const videoCount = events.filter(e => e.stage === 'transcript' && e.video_title).length

  return { events, isDone, isError, doneData, currentStage, currentMessage, videoCount }
}
