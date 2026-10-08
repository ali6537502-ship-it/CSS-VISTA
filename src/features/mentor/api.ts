export type MentorStatus = 'not_attempted' | 'awaiting_evaluation' | 'evaluated'
export const statusNames: Record<MentorStatus, string> = {
  not_attempted: 'Not Attempted',
  awaiting_evaluation: 'Attempted — Awaiting Mentor Evaluation',
  evaluated: 'Evaluated',
}
export const provenanceNames = {
  practice: 'Practice question',
  student_past_paper: 'Student-provided past-paper reference',
}
export type Evaluation = {
  id: string
  revision: number
  obtained_marks: number
  maximum_marks: number
  evaluation_date: string
  mentor_comment: string
  correction_reason: string
  created_at: string
  percentage: number
}
export type MentorAnswer = {
  id: string
  attempt_id: string
  root_id: string | null
  retry_of: string | null
  sequence: number
  subject_id: string
  topic: string
  question: string
  provenance: keyof typeof provenanceNames
  source_reference: string
  status: MentorStatus
  written_date: string | null
  version: number
  evaluation_revision: number
  obtained_marks: number | null
  maximum_marks: number | null
  percentage: number | null
  evaluation_date: string | null
  mentor_comment: string | null
  created_at: string
}
export type MentorDetail = MentorAnswer & { evaluations: Evaluation[]; series: MentorAnswer[] }
export type MentorSubject = { slug: string; name: string; designation: string }
export type ScoreTotal = {
  count: number
  obtained: number
  maximum: number
  percentage: number | null
}
export type MentorOverview = {
  answers: MentorAnswer[]
  has_more: boolean
  catalog: MentorSubject[]
  summary: {
    first: ScoreTotal
    retries: ScoreTotal
    topics: {
      subject_id: string
      topic: string
      count: number
      obtained: number
      maximum: number
      percentage: number
      priority: 'review' | 'continue'
    }[]
  }
}
export function pakistanToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}
export function scoreText(score: ScoreTotal) {
  return score.percentage === null ? 'No marks yet' : `${score.percentage}%`
}
