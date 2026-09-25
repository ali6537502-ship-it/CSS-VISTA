// Typed client for /api/mpt/*. The server decides everything; these calls only
// request and display. Server time is captured on every response so countdowns
// run on server-corrected time rather than the device clock.
import { hostingerRequest } from '@/lib/hostingerApi'
import type { MptCandidateState } from './state'

export type MptMock = {
  slug: string
  mock_number: number
  title: string
  status: string
  application_open_at: string
  application_close_at: string
  exam_open_at: string
  entry_close_at: string
  exam_end_at: string
  duration_minutes: number
  roll_issue_delay_minutes: number
  total_questions: number
  total_marks: number
  negative_marking: number
  pass_percentage: number | null
  results_release_policy: string
  results_delay_minutes: number
  answer_review_policy: string
  fee: 'FREE'
}

export type MptApplication = {
  application_code: string
  status: 'ACTIVE' | 'CANCELLED' | 'WITHDRAWN'
  applied_at: string
  roll_number: string | null
  roll_number_visible_at: string | null
  cancel_reason: string | null
}

export type MptAttemptSummary = {
  status: string
  started_at: string
  expires_at: string
  submitted_at: string | null
  submit_reason: string | null
  score: number | null
  total_marks: number | null
  percentage: number | null
}

export type MptCard = {
  mock: MptMock
  state: MptCandidateState
  application: MptApplication | null
  attempt: MptAttemptSummary | null
  registered_count?: number | null
  slots_available?: number | null
}

export type MptCandidate = { name: string; email: string; mobile: string | null; candidate_code: string | null; has_photo?: boolean }

export type MptSubjectScore = { subject: string; questions: number; attempted: number; correct: number; incorrect: number; score: number; accuracy: number | null }

export type MptResult = {
  score: number
  total_marks: number
  percentage: number
  correct: number
  incorrect: number
  unanswered: number
  accuracy: number | null
  time_taken_seconds: number
  started_at: string
  submitted_at: string
  submit_reason: string
  subjects: MptSubjectScore[]
  rank: { position: number; candidates: number; percentile: number } | null
  passed: boolean | null
  previous_average_percentage: number | null
  rescored_at: string | null
  review_available: boolean
  review_available_at: string | null
  mock_started_at: string
}

export type MptResultPayload = {
  mock: MptMock
  state: MptCandidateState
  application: MptApplication
  candidate: { name: string; candidate_code: string | null }
  result: MptResult | null
  submission?: { submitted_at: string; submit_reason: string; result_available_at: string | null }
  server_time: string
}

export type MptPaperQuestion = { p: number; section: string; q: string; o: string[] }

export type MptRuntime = {
  attempt: { status: string; started_at: string; expires_at: string; save_version: number; current_position: number; remaining_seconds: number }
  server_time: string
  mock: MptMock
  paper?: MptPaperQuestion[]
  answers?: Record<string, number>
  resumed?: boolean
}

export type MptVerification = {
  verification_token: string
  sections: Array<{ label: string; count: number }>
  token_expires_at: string
  resume: boolean
  candidate: { name: string; candidate_code: string | null; roll_number: string; application_code: string }
  mock: MptMock
  time_allowance_seconds: number
  minutes_late: number
  server_time: string
}

export type MptStats = {
  attempts_completed: number
  avg_score: number | null
  highest_score: number | null
  lowest_score: number | null
  latest_score: number | null
  avg_percentage: number | null
  highest_percentage: number | null
  latest_percentage: number | null
  avg_accuracy: number | null
  total_correct: number
  total_incorrect: number
}

export type MptTrend = { points: Array<{ mock_number: number; percentage: number; submitted_at: string }>; label: 'IMPROVING' | 'DECLINING' | 'STEADY' | null }

export type MptHistoryRow = {
  application_code: string
  mock_slug: string
  mock_number: number
  title: string
  exam_open_at: string
  roll_number: string | null
  phase: MptCandidateState['phase']
  score: number | null
  total_marks: number | null
  percentage: number | null
}

export type MptHistory = {
  rows: MptHistoryRow[]
  page: number
  per_page: number
  total: number
  legacy: Array<{ title: string; score: number; total: number; completed_at: string }>
}

export type MptDashboard = {
  cards: MptCard[]
  latest: { application_code: string; mock: MptMock; result: MptResult } | null
  stats: MptStats
  trend: MptTrend
  history: MptHistory
  server_time: string
}

export type MptPerformance = {
  stats: MptStats
  trend: MptTrend
  series: Array<{ application_code: string; mock_number: number; title: string; score: number; total_marks: number; percentage: number; accuracy: number | null; submitted_at: string }>
  subjects: Array<{ subject: string; attempted: number; correct: number; accuracy: number | null; reliable: boolean; points: Array<{ mock_number: number; accuracy: number | null }> }>
  strongest: string | null
  weakest: string | null
  subject_threshold: number
  server_time: string
}

export type MptReviewQuestion = MptPaperQuestion & { correct: number; selected: number | null; explanation: string | null }

export type MptMistake = MptPaperQuestion & { mock_number: number; title: string; exam_open_at: string; selected: number; correct: number; explanation: string | null }
export type MptMistakes = { questions: MptMistake[]; total: number; page: number; per_page: number; subjects: Array<{ subject: string; count: number }>; server_time: string }

// ---------------------------------------------------------------- server clock

let clockOffsetMs = 0
/** Server-corrected "now" in milliseconds. */
export function serverNow() {
  return Date.now() + clockOffsetMs
}
function syncClock<T>(data: T): T {
  const stamp = (data as { server_time?: string } | null)?.server_time
  const parsed = stamp ? Date.parse(stamp) : Number.NaN
  if (Number.isFinite(parsed)) clockOffsetMs = parsed - Date.now()
  return data
}

const get = <T,>(path: string, signal?: AbortSignal) => hostingerRequest<T>(`mpt/${path}`, { signal }).then(syncClock)
const post = <T,>(path: string, body: unknown, headers?: HeadersInit) => hostingerRequest<T>(`mpt/${path}`, { method: 'POST', body: JSON.stringify(body), headers }).then(syncClock)

export const mptApi = {
  config: (signal?: AbortSignal) => get<{ enabled: boolean; server_time: string }>('flow.php', signal),
  mocks: (signal?: AbortSignal) => get<{ enabled: boolean; signed_in?: boolean; mocks: MptCard[]; server_time: string }>('mocks.php', signal),
  applicationForMock: (slug: string, signal?: AbortSignal) => get<MptCard & { candidate: MptCandidate; server_time: string }>(`application.php?mock=${encodeURIComponent(slug)}`, signal),
  application: (code: string, signal?: AbortSignal) => get<MptCard & { candidate: MptCandidate; server_time: string }>(`application.php?code=${encodeURIComponent(code)}`, signal),
  apply: (slug: string, idempotencyKey: string) => post<MptCard & { already_applied: boolean; server_time: string }>('apply.php', { mock: slug, declaration: true }, { 'Idempotency-Key': idempotencyKey }),
  withdraw: (code: string) => post<MptCard & { server_time: string }>('withdraw.php', { code }),
  verify: (slug: string, rollNumber: string) => post<MptVerification>('verify.php', { mock: slug, roll_number: rollNumber }),
  start: (token: string, clientId: string) => post<MptRuntime>('start.php', { verification_token: token, client_id: clientId }),
  resume: (slug: string, clientId: string, signal?: AbortSignal) => get<MptRuntime>(`attempt.php?mock=${encodeURIComponent(slug)}&client_id=${encodeURIComponent(clientId)}`, signal),
  save: (body: { mock: string; client_id: string; save_version: number; changes: Array<{ p: number; o: number | null }>; current_position?: number; visibility_changes?: number }) =>
    post<{ save_version: number; remaining_seconds: number; server_time: string }>('save.php', body),
  submit: (slug: string, clientId: string) => post<MptResultPayload>('submit.php', { mock: slug, client_id: clientId }),
  result: (code: string, signal?: AbortSignal) => get<MptResultPayload>(`result.php?code=${encodeURIComponent(code)}`, signal),
  review: (code: string, signal?: AbortSignal) => get<{ questions: MptReviewQuestion[] }>(`review.php?code=${encodeURIComponent(code)}`, signal),
  dashboard: (signal?: AbortSignal) => get<MptDashboard>('dashboard.php', signal),
  history: (page: number, status: string | null, signal?: AbortSignal) => get<MptHistory & { server_time: string }>(`history.php?page=${page}${status ? `&status=${status}` : ''}`, signal),
  performance: (signal?: AbortSignal) => get<MptPerformance>('performance.php', signal),
  mistakes: (page: number, subject: string | null, signal?: AbortSignal) => get<MptMistakes>(`mistakes.php?page=${page}${subject ? `&subject=${encodeURIComponent(subject)}` : ''}`, signal),
}

/** A per-tab id for the single-active-device lock (D-16). */
let memoryClientId: string | null = null
function randomClientId() {
  const bytes = crypto.getRandomValues(new Uint8Array(18))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
export function examClientId() {
  const key = 'cssvista:mpt-client-id'
  try {
    const existing = sessionStorage.getItem(key)
    if (existing && /^[A-Za-z0-9_-]{16,64}$/.test(existing)) return existing
    const id = memoryClientId ?? randomClientId()
    sessionStorage.setItem(key, id)
    memoryClientId = id
    return id
  } catch {
    // Storage blocked (private mode): keep one id for this page's lifetime.
    memoryClientId ??= randomClientId()
    return memoryClientId
  }
}
