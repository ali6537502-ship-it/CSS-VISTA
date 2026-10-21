/** Validated, framework-independent recovery helpers for answer-writing timers. */

export const PAPER_TOTAL_SECONDS = 3 * 3600
export const PAPER_MCQ_SECONDS = 30 * 60
/** Baseline recommendation with the full 30 minutes spent on MCQs. */
export const PAPER_QUESTION_SECONDS = (PAPER_TOTAL_SECONDS - PAPER_MCQ_SECONDS) / 4

/** Divide the actual remaining exam clock between answers yet to be attempted. */
export function allocatedAnswerSeconds(paperLeftSeconds: number, unanswered: number): number {
  if (!Number.isFinite(paperLeftSeconds) || !Number.isInteger(unanswered) || unanswered < 1) return 0
  return Math.max(0, Math.floor(paperLeftSeconds / unanswered))
}
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
  /** -1 = MCQ section; 0–3 = one of four descriptive questions. */
  current: number
  paused: boolean
  times: (number | null)[]
  /** Optional to preserve old in-progress paper attempts made before redistribution. */
  questionTargetSeconds?: number
  mcqElapsedSeconds?: number | null
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
    || !Number.isInteger(saved.current) || (saved.current as number) < -1 || (saved.current as number) > 3
    || !(saved.questionTargetSeconds === undefined || (Number.isInteger(saved.questionTargetSeconds)
      && (saved.questionTargetSeconds as number) >= 0 && (saved.questionTargetSeconds as number) <= 604800))
    || !(saved.mcqElapsedSeconds === undefined || saved.mcqElapsedSeconds === null
      || (Number.isInteger(saved.mcqElapsedSeconds) && (saved.mcqElapsedSeconds as number) >= 0
        && (saved.mcqElapsedSeconds as number) <= 604800))
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
    questionLeft: paperQuestionTargetSeconds(snapshot) - snapshot.questionElapsedBase - elapsed,
    paperLeft: snapshot.totalLeftBase - elapsed,
  }
}

/** Old saved descriptive attempts continue with their original 45-minute target. */
export function paperQuestionTargetSeconds(snapshot: PaperSnapshot): number {
  return snapshot.questionTargetSeconds
    ?? (snapshot.current === -1 ? PAPER_MCQ_SECONDS : PAPER_TOTAL_SECONDS / 4)
}
