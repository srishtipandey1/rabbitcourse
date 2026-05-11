import { create } from 'zustand'

interface LessonNavState {
  activeModuleIdx: number
  activeLessonIdx: number
  completedLessons: Set<string>
  setActive: (moduleIdx: number, lessonIdx: number) => void
  markComplete: (key: string) => void
}

export const useLessonNav = create<LessonNavState>((set) => ({
  activeModuleIdx: 0,
  activeLessonIdx: 0,
  completedLessons: new Set(),
  setActive: (moduleIdx, lessonIdx) => set({ activeModuleIdx: moduleIdx, activeLessonIdx: lessonIdx }),
  markComplete: (key) => set(state => ({
    completedLessons: new Set(Array.from(state.completedLessons).concat(key)),
  })),
}))
