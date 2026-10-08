import type { Writing, WritingVersion } from '@/features/learning/api'
export type Block =
  | { type: 'heading' | 'paragraph' | 'bullet'; text: string }
  | { type: 'table'; rows: string[][] }
export type Chapter = { id: string; title: string; blocks: Block[] }
export type Passage = {
  id: string | null
  label: string
  text: string
  source: string
  limit: number | null
  hint?: string
}
export type Question = {
  id: string
  skill: string
  prompt: string
  options: string[]
  hint: string
  grammar_day?: number
}
export type CourseDay = {
  day: number
  title: string
  chapters: string[]
  skill: string
  task: string
}
export type Overview = {
  membership: { status: string }
  course: CourseDay[]
  rubric: Record<string, string>
  skills: Record<string, string>
  attempts: { id: string; target_year: number }[]
  has_more_attempts: boolean
  writing: { id: string; attempt_id: string; title: string; version: number; updated_at: string }[]
  has_more: boolean
  evaluation_enabled: false
  catalog: {
    chapters: Chapter[]
    passages: Passage[]
    questions: Question[]
    source_sha256: string
  } | null
}
export type Scratch = {
  topic: string
  central_idea: string
  skeleton: string
  essential: string
  removable: string
  compression: string
  paraphrase: string
  reflection: string
  rewrite_task: string
}
export type Timer = { minutes: number; started_at: number | null; finished_at: number | null }
export type Context = {
  title: string
  scratch: Scratch
  self_check: Record<string, number | null>
  timer: Timer | null
}
export type Detail = {
  writing: Writing
  version: WritingVersion
  source: Passage
  context: Context | null
  model: { text: string; title: string; note: string } | null
}
export type Progress = {
  version: number
  current_day: number
  current_chapter: number
  completed: number[]
  profile: {
    basis: string
    items: {
      skill: string
      label: string
      state: string
      questions: number
      first_correct: number
      review_ids: string[]
    }[]
  }
}
export const blankScratch = (): Scratch => ({
  topic: '',
  central_idea: '',
  skeleton: '',
  essential: '',
  removable: '',
  compression: '',
  paraphrase: '',
  reflection: '',
  rewrite_task: '',
})
/** Same Unicode convention as the established PHP learning word counter; titles excluded. */
export function wordCount(text: string) {
  return text.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)?.length || 0
}
export function lengthInfo(original: string, precis: string, limit: number | null) {
  const source = wordCount(original),
    draft = wordCount(precis)
  return {
    source,
    draft,
    ratio: source ? Math.round((draft / source) * 100) : 0,
    over: limit !== null && draft > limit,
    remaining: limit === null ? null : limit - draft,
  }
}
export function draftKey(
  user: string,
  attempt: string,
  passage: string,
  writing?: string,
  version?: string,
) {
  return `precis:v1:${user}:${attempt}:${writing || 'new'}:${version || 'new'}:${passage}`
}
