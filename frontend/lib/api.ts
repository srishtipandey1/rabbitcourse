export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function getToken() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('rabbitcourse_token') || ''
}

export function authHeaders(extra: HeadersInit = {}) {
  const token = getToken()
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export const demoCourses = [
  {
    course_id: 'demo-ai-product',
    title: 'AI Product Strategy from Scratch',
    topic: 'AI product strategy',
    status: 'done',
    difficulty: 'intermediate',
    source_type: 'topic',
    lesson_count: 14,
    video_count: 0,
    estimated_minutes: 310,
    progress: 62,
    created_at: new Date().toISOString(),
    quality_score: { overall: 91, transcript_quality: 94, concept_coverage: 90, lesson_depth: 88, assessment_readiness: 92 },
  },
  {
    course_id: 'demo-js-video',
    title: 'Advanced JavaScript Systems',
    topic: 'YouTube URL',
    status: 'processing',
    difficulty: 'advanced',
    source_type: 'youtube',
    lesson_count: 10,
    video_count: 4,
    estimated_minutes: 240,
    progress: 34,
    created_at: new Date().toISOString(),
    quality_score: { overall: 84, transcript_quality: 82, concept_coverage: 86, lesson_depth: 84, assessment_readiness: 83 },
  },
  {
    course_id: 'demo-design',
    title: 'Learning Design for Online Courses',
    topic: 'instructional design',
    status: 'done',
    difficulty: 'beginner',
    source_type: 'topic',
    lesson_count: 9,
    video_count: 0,
    estimated_minutes: 180,
    progress: 100,
    created_at: new Date().toISOString(),
    quality_score: { overall: 88, transcript_quality: 93, concept_coverage: 84, lesson_depth: 86, assessment_readiness: 89 },
  },
]

export const demoCurriculum = {
  course_title: 'AI Product Strategy from Scratch',
  overview: 'A practical path for turning fuzzy AI ideas into scoped, testable products.',
  modules: [
    {
      title: 'Foundations',
      description: 'Understand model capabilities, constraints, and useful product patterns.',
      lessons: [
        { lesson_key: '0-0', type: 'written', title: 'What AI products can reliably do', concepts: ['capability mapping', 'risk'], content: 'Start by mapping what the model can do consistently, what needs verification, and what should stay human-reviewed.' },
        { lesson_key: '0-1', type: 'quiz', title: 'Capability fit quiz', concepts: ['evaluation'], questions: [{ question: 'What should you validate first?', options: ['Logo color', 'Model output quality', 'Launch tweet'], correct_index: 1, explanation: 'Output quality determines whether the workflow is viable.' }] },
      ],
    },
    {
      title: 'Workflow Design',
      description: 'Design user journeys around generation, review, and iteration.',
      lessons: [
        { lesson_key: '1-0', type: 'written', title: 'Human-in-the-loop UX', concepts: ['review loops', 'trust'], content: 'The best AI workflows make review fast, visible, and reversible.' },
        { lesson_key: '1-1', type: 'video', title: 'Prompt-to-product walkthrough', concepts: ['workflow'], video_url: 'https://www.youtube.com', summary: 'A structured walkthrough of turning prompts into product surfaces.' },
      ],
    },
  ],
}
