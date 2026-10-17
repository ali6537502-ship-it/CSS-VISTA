/** Validated, framework-independent recovery helpers for answer-writing timers. */

export const PAPER_QUESTION_SECONDS = 45 * 60
export const PAPER_TOTAL_SECONDS = 3 * 3600
export const SINGLE_RESUME_KEY = 'cssvista:single-answer-timer'
export const PAPER_RESUME_KEY = 'cssvista:paper-attempt'

export interface SingleTimerSnapshot {
  minutes: number
  question: string
  remaining: number
  running: boolean
  savedAt: number
}

export interface PaperSnapshot {
  questions: string[]
  current: number
  paused: boolean
  times: (number | null)[]
  questionElapsedBase: number
  totalLeftBase: number
  runningStartedAt: number | null
}

export function parseSingleSnapshot(value: unknown): SingleTimerSnapshot | null {
  if (!value || typeof value !== 'object') return null
  const saved = value as Record<string, unknown>
  if (!Number.isInteger(saved.minutes) || (saved.minutes as number) < 1 || (saved.minutes as number) > 180
    || typeof saved.question !== 'string' || saved.question.length > 10000
    || typeof saved.remaining !== 'number' || !Number.isFinite(saved.remaining)
    || Math.abs(saved.remaining) > 604800
    || typeof saved.running !== 'boolean'
    || typeof saved.savedAt !== 'number' || !Number.isFinite(saved.savedAt)) return null
  return saved as unknown as SingleTimerSnapshot
}

/** Only time actually spent while running counts, even across a closed tab. */
export function restoredSingleSeconds(snapshot: SingleTimerSnapshot, now = Date.now()) {
  const elapsed = snapshot.running ? Math.max(0, Math.floor((now - snapshot.savedAt) / 1000)) : 0
  return Math.round(snapshot.remaining) - elapsed
}

export function parsePaperSnapshot(value: unknown): PaperSnapshot | null {
  if (!value || typeof value !== 'object') return null
  const saved = value as Record<string, unknown>
  if (!Array.isArray(saved.questions) || saved.questions.length !== 4
    || !saved.questions.every(q => typeof q === 'string' && q.length <= 10000)
    || !Array.isArray(saved.times) || saved.times.length !== 4
    || !saved.times.every(t => t === null || (typeof t === 'number' && Number.isInteger(t) && t >= 0 && t <= 604800))
    || !Number.isInteger(saved.current) || (saved.current as number) < 0 || (saved.current as number) > 3
    || typeof saved.paused !== 'boolean'
    || typeof saved.questionElapsedBase !== 'number'
    || !Number.isFinite(saved.questionElapsedBase) || saved.questionElapsedBase < 0 || saved.questionElapsedBase > 604800
    || typeof saved.totalLeftBase !== 'number'
    || !Number.isFinite(saved.totalLeftBase) || Math.abs(saved.totalLeftBase) > 604800
    || !(saved.runningStartedAt === null || (typeof saved.runningStartedAt === 'number'
      && Number.isFinite(saved.runningStartedAt) && saved.runningStartedAt > 0))
    || (saved.paused && saved.runningStartedAt !== null)
    || (!saved.paused && saved.runningStartedAt === null)) return null
  return saved as unknown as PaperSnapshot
}

/** Rehydrate paused and running paper clocks from the same persisted wall-clock anchor. */
export function restoredPaperClocks(snapshot: PaperSnapshot, now = Date.now()) {
  const elapsed = snapshot.runningStartedAt === null
    ? 0
    : Math.max(0, Math.floor((now - snapshot.runningStartedAt) / 1000))
  return {
    questionLeft: PAPER_QUESTION_SECONDS - snapshot.questionElapsedBase - elapsed,
    paperLeft: snapshot.totalLeftBase - elapsed,
  }
}
