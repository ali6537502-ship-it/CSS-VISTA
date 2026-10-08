import { useState } from 'react'
export const helpModes = {
  explain: 'Explain the concept',
  misconception: 'Help me understand my mistake',
  hint: 'Give me a hint',
  check_understanding: 'Check my understanding',
} as const
export const areas = {
  grammar: 'English & Grammar',
  precis: 'Précis methods',
  maths: 'Maths concepts',
  syllabus: 'Syllabus topic maps',
  'current-affairs': 'Published Current Affairs',
} as const
export type HelpMode = keyof typeof helpModes
export type Area = keyof typeof areas
export type TutorResult = {
  status: 'answered' | 'needs_context' | 'redirect'
  explanation: string
  steps: string[]
  check_question: string
  citations: { quote: string }[]
  limitation: string
}
export type TutorContext = {
  id: string
  category: Area
  title: string
  text: string
  attribution: string
  date: string | null
  return_path: string
  sources: { publisher: string; url: string }[]
  feature: 'tutor' | 'maths' | 'current_affairs'
}
export type TutorOperation = {
  id: string
  state: 'reserved' | 'in_flight' | 'unknown' | 'succeeded' | 'failed'
  result: TutorResult | null
  created_at: string
  error_code: string | null
  accounting: string
}
export type Exchange = {
  operation: TutorOperation
  question: string
  intent: HelpMode
  attempt_id: string
  context: TutorContext
  parent_id: string | null
  resume_body: AskBody | null
}
export type AskBody = {
  action: 'ask'
  request_id: string
  attempt_id: string
  context_id: string
  context_hash: string
  parent_id?: string
  intent: HelpMode
  question: string
  policy_version: string
  policy_hash: string
  accepted: true
}
export type TutorMeta = {
  active: boolean
  configuration: {
    enabled: boolean
    policy_version: string | null
    policy_hash: string | null
    processing_notice: string | null
    max_question_characters: number
    max_question_words: number
  }
  date: string
  reset_at: string
  usage: Record<
    'tutor' | 'maths' | 'current_affairs',
    { limit: number; used: number; reserved: number; accepted: number }
  >
}
export type TutorOverview = TutorMeta & {
  history: {
    operation_id: string
    attempt_id: string
    question: string
    context_id: string
    created_at: string
    state: string
    feature: string
  }[]
  has_more: boolean
}
export type ContextRead = TutorMeta & { context: TutorContext; context_hash: string }
export type TutorCatalog = {
  contexts: Pick<TutorContext, 'id' | 'title' | 'category' | 'date'>[]
  has_more: boolean
}
export function learningReturn(context: TutorContext, attempt: string) {
  const url = new URL(context.return_path, 'https://www.css-vista.com')
  if (['/grammar-course', '/account/precis'].includes(url.pathname))
    url.searchParams.set('attempt', attempt)
  return url.pathname + url.search
}
const pendingKey = (user: string) => `cssvista:tutor-pending:v1:${user}`
function restorePending(user: string): AskBody | null {
  try {
    const b = JSON.parse(sessionStorage.getItem(pendingKey(user)) || 'null') as AskBody | null
    return b?.action === 'ask' &&
      b.accepted === true &&
      typeof b.question === 'string' &&
      b.question.length <= 1000 &&
      typeof b.context_id === 'string' &&
      typeof b.intent === 'string' &&
      b.intent in helpModes &&
      typeof b.policy_version === 'string' &&
      typeof b.policy_hash === 'string' &&
      /^[a-f0-9]{64}$/.test(b.policy_hash) &&
      typeof b.context_hash === 'string' &&
      /^[a-f0-9]{64}$/.test(b.context_hash) &&
      /^[a-f0-9-]{36}$/i.test(b.request_id) &&
      /^[a-f0-9-]{36}$/i.test(b.attempt_id)
      ? b
      : null
  } catch {
    return null
  }
}
export function usePendingQuestion(user: string) {
  const [pending, setPending] = useState(() => restorePending(user))
  function keep(body: AskBody) {
    try {
      sessionStorage.setItem(pendingKey(user), JSON.stringify(body))
    } catch {
      throw new Error(
        'Browser recovery storage is unavailable. No tutor request was sent; your question remains in this form.',
      )
    }
    setPending(body)
  }
  function clear() {
    try {
      sessionStorage.removeItem(pendingKey(user))
    } catch {
      /* A retained receipt only reopens its existing owned result. */
    }
    setPending(null)
  }
  return { pending, keep, clear }
}
