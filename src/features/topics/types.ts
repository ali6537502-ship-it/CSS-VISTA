export type TopicState =
  'not_started' | 'learning' | 'understood' | 'practised' | 'revision_due' | 'mastered'
export const stateLabels: Record<TopicState, string> = {
  not_started: 'Not started',
  learning: 'Learning',
  understood: 'Understood',
  practised: 'Practised',
  revision_due: 'Revision due',
  mastered: 'Mastered',
}
export const categories: Record<string, string> = {
  history: 'History & foundations',
  governance: 'Governance & institutions',
  society: 'Society & development',
  economy: 'Economy',
  security: 'Security',
  international: 'International affairs',
  environment: 'Environment',
}
export type TopicCard = {
  id: string
  title: string
  summary: string
  category: string
  version_id: string
  content_hash: string
  state: TopicState
  bookmarked: boolean
  next_revision: string | null
}
export type Catalog = {
  membership: { status: string; expires_at: string | null }
  today: string
  items: TopicCard[]
  total: number
  has_more: boolean
  categories: { category: string; count: number }[]
  stats: {
    started: number
    understood: number
    practised: number
    mastered: number
    due: number
    bookmarked: number
  }
}
export type Reference = {
  id: string
  label: string
  url: string
  accessed_on: string
  document_date: string | null
}
export type Section = {
  id: string
  title: string
  kind: string
  blocks: string[]
  reference_ids: string[]
}
export type Question = {
  id: string
  mode: 'learn' | 'revision'
  prompt: string
  options: string[]
  section_id: string
  reference_ids: string[]
}
export type Definition = {
  id: string
  title: string
  summary: string
  category: string
  author: string
  as_of: string
  subjects: string[]
  sources: { title: string; pages: number[] }[]
  sections: Section[]
  references: Reference[]
  questions: Question[]
  practice: { prompt: string; focus: string; min_words: number; max_words: number }
}
export type Progress = {
  version: number
  draft_version: number
  state: TopicState
  completed: string[]
  bookmarked: boolean
  started_at: string | null
  notes: string
  draft: string
  draft_words: number
  learn_score: number | null
  revision_score: number | null
  next_revision: string | null
  last_review: string | null
  review_count: number
}
export type Detail = {
  membership: Catalog['membership']
  today: string
  available: boolean
  topic: Pick<TopicCard, 'id' | 'title' | 'summary' | 'category' | 'version_id' | 'content_hash'>
  content: Definition | null
  progress: Progress
  older_versions: number
}
export type Check = {
  id: string
  topic_version_id: string
  topic_id: string
  mode: 'learn' | 'revision'
  created_at: string
  result: {
    score: number
    passed: boolean
    correct: number
    total: number
    results: (Question & {
      choice: number
      answer: number
      correct: boolean
      explanation: string
    })[]
  }
}
export type History = {
  records: {
    topic_id: string
    topic_version_id: string
    title: string
    as_of: string
    notes: string
    draft: string
    draft_words: number
    state: TopicState
    completed: string[]
    next_revision: string | null
    review_count: number
    updated_at: string
  }[]
  checks: Check[]
  has_more: boolean
}
