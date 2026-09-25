// Client mirror of mpt_candidate_state() in public/api/_mpt_core.php. The server
// is canonical and returns its state with every read; this mirror only lets a
// countdown flip at its boundary without a reload (the page then re-fetches).
// Both implementations run tests/fixtures/mpt-state-cases.json.

export type MptPhase =
  | 'LOGIN_REQUIRED' | 'NOT_YET_OPEN' | 'APPLICATIONS_OPEN' | 'SLOTS_FULL' | 'APPLICATIONS_CLOSED'
  | 'ROLL_NUMBER_PENDING' | 'SLOT_RESERVED' | 'ENTRY_OPEN' | 'IN_PROGRESS'
  | 'SUBMITTED_PENDING_RESULT' | 'RESULT_AVAILABLE' | 'ABSENT' | 'CANCELLED'

export type MptPrimaryAction =
  | 'login' | 'apply' | 'view_application' | 'view_roll_number' | 'enter_exam'
  | 'continue_exam' | 'view_submission' | 'view_result' | null

export type MptMockFacts = {
  status: string
  application_open_at: string
  application_close_at: string
  exam_open_at: string
  entry_close_at: string
  exam_end_at: string
  roll_issue_delay_minutes: number
  results_release_policy: string
}
export type MptSessionFacts = { capacity: number | null; reserved_count: number } | null
export type MptApplicationFacts = { status: string; applied_at: string; attempt_allowance?: number; attempts_used?: number } | null
export type MptAttemptFacts = { status: string; expires_at: string; submitted_at?: string | null } | null

export type MptTimestamps = {
  application_open_at: string | null
  application_close_at: string | null
  exam_open_at: string | null
  entry_close_at: string | null
  exam_end_at: string | null
  roll_number_visible_at: string | null
  attempt_expires_at: string | null
  result_available_at: string | null
}

export type MptCandidateState = {
  phase: MptPhase
  primary_action: MptPrimaryAction
  exam_in_progress: boolean
  timestamps: MptTimestamps
  next_transition_at: string | null
}

export const PRIMARY_ACTIONS: Record<MptPhase, MptPrimaryAction> = {
  LOGIN_REQUIRED: 'login',
  NOT_YET_OPEN: null,
  APPLICATIONS_OPEN: 'apply',
  SLOTS_FULL: null,
  APPLICATIONS_CLOSED: null,
  ROLL_NUMBER_PENDING: 'view_application',
  SLOT_RESERVED: 'view_roll_number',
  ENTRY_OPEN: 'enter_exam',
  IN_PROGRESS: 'continue_exam',
  SUBMITTED_PENDING_RESULT: 'view_submission',
  RESULT_AVAILABLE: 'view_result',
  ABSENT: 'view_application',
  CANCELLED: null,
}

const ms = (value: string | null | undefined) => {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}
const iso = (value: number | null) => (value === null ? null : new Date(value).toISOString())

/** Section 1A #4: min(applied + delay, max(applied, exam_open)). */
export function rollVisibleAt(appliedAtMs: number, examOpenAtMs: number, delayMinutes: number) {
  return Math.min(appliedAtMs + delayMinutes * 60_000, Math.max(appliedAtMs, examOpenAtMs))
}

type Times = Record<keyof MptTimestamps, number | null>

function phaseFor(status: string, releasePolicy: string, session: MptSessionFacts, application: MptApplicationFacts,
  attempt: MptAttemptFacts, t: Times, now: number, signedIn: boolean): MptPhase {
  if (status === 'CANCELLED') return 'CANCELLED'
  if (attempt) {
    if (attempt.status === 'VOIDED') return 'CANCELLED'
    const expires = ms(attempt.expires_at) ?? 0
    if (attempt.status === 'IN_PROGRESS' && now < expires) return 'IN_PROGRESS'
    const submitted = ms(attempt.submitted_at) ?? expires
    const releaseAt = releasePolicy === 'AFTER_WINDOW' ? Math.max(submitted, t.exam_end_at ?? 0) : submitted
    return now >= releaseAt ? 'RESULT_AVAILABLE' : 'SUBMITTED_PENDING_RESULT'
  }
  if (application) {
    if (application.status === 'CANCELLED') return 'CANCELLED'
    if (now >= (t.entry_close_at ?? 0)) return 'ABSENT'
    if (now < (t.roll_number_visible_at ?? 0)) return 'ROLL_NUMBER_PENDING'
    if (now < (t.exam_open_at ?? 0)) return 'SLOT_RESERVED'
    return 'ENTRY_OPEN'
  }
  if (status !== 'PUBLISHED') return status === 'ARCHIVED' ? 'APPLICATIONS_CLOSED' : 'NOT_YET_OPEN'
  if (now < (t.application_open_at ?? 0)) return 'NOT_YET_OPEN'
  if (now >= (t.application_close_at ?? 0)) return 'APPLICATIONS_CLOSED'
  if (!signedIn) return 'LOGIN_REQUIRED'
  if (session && session.capacity !== null && session.reserved_count >= session.capacity) return 'SLOTS_FULL'
  return 'APPLICATIONS_OPEN'
}

export function getCandidateMockState(mock: MptMockFacts, session: MptSessionFacts, applicationIn: MptApplicationFacts,
  attemptIn: MptAttemptFacts, now: number, signedIn: boolean): MptCandidateState {
  const t: Times = {
    application_open_at: ms(mock.application_open_at),
    application_close_at: ms(mock.application_close_at),
    exam_open_at: ms(mock.exam_open_at),
    entry_close_at: ms(mock.entry_close_at),
    exam_end_at: ms(mock.exam_end_at),
    roll_number_visible_at: null,
    attempt_expires_at: null,
    result_available_at: null,
  }
  const application = applicationIn && applicationIn.status !== 'WITHDRAWN' ? applicationIn : null
  if (application) {
    t.roll_number_visible_at = rollVisibleAt(ms(application.applied_at) ?? now, t.exam_open_at ?? 0, mock.roll_issue_delay_minutes ?? 10)
  }
  let attempt = attemptIn
  if (attempt && attempt.status === 'VOIDED' && application
    && (application.attempts_used ?? 1) < (application.attempt_allowance ?? 1)) attempt = null

  const releasePolicy = mock.results_release_policy ?? 'IMMEDIATE_SCORE'
  const phase = phaseFor(mock.status ?? 'DRAFT', releasePolicy, session, application, attempt, t, now, signedIn)
  if (attempt) {
    t.attempt_expires_at = ms(attempt.expires_at)
    const submitted = ms(attempt.submitted_at) ?? t.attempt_expires_at ?? 0
    if (phase === 'SUBMITTED_PENDING_RESULT' || phase === 'RESULT_AVAILABLE') {
      t.result_available_at = releasePolicy === 'AFTER_WINDOW' ? Math.max(submitted, t.exam_end_at ?? 0) : submitted
    }
  }
  let next: number | null = null
  for (const value of Object.values(t)) if (value !== null && value > now && (next === null || value < next)) next = value

  return {
    phase,
    primary_action: PRIMARY_ACTIONS[phase],
    exam_in_progress: t.exam_open_at !== null && now >= t.exam_open_at && now < (t.exam_end_at ?? 0),
    timestamps: Object.fromEntries(Object.entries(t).map(([key, value]) => [key, iso(value)])) as MptTimestamps,
    next_transition_at: iso(next),
  }
}

/** Seconds a candidate starting now would have (every attempt ends at exam_end_at). */
export function timeAllowanceSeconds(now: number, examOpenMs: number, examEndMs: number) {
  return Math.max(0, Math.floor(Math.max(0, examEndMs - Math.max(now, examOpenMs)) / 1000))
}
