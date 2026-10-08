/** Device-local course state. Account keys never adopt unowned browser history. */
export const LEGACY_KEY = 'cssvista:grammar-course:v3'
export const STEPS = ['Overview', 'Learn', 'Examples', 'Warm-up', 'Daily drill', 'Corrections', 'Your writing'] as const
export interface Session {
  step: number
  position: Record<string, number>
  warmUp: Record<string, number>
  drill: Record<string, number>
  first: Record<string, number>
  drafts: Record<string, string>
  writing: string
  checks: number[]
  revealed: string[]
  recorded: boolean
}
export interface QuizAttempt { day: number; at: number; correct: number; total: number }
export interface CourseState {
  completed: number[]
  scores: Record<string, number>
  mistakes: string[]
  notes: Record<string, string>
  currentDay: number
  sessions: Record<string, Session>
  attempts: QuizAttempt[]
}
export interface DayDefinition {
  day: number
  warmUp: { id: string; options: string[] }[]
  drill: { id: string; options: string[] }[]
  corrections: { id: string }[]
  examples: unknown[]
  checklist: unknown[]
}
export function courseKey(userId?: string) { return `cssvista:grammar-course:v4:${userId ? `account:${userId}` : 'guest'}` }
export function emptySession(): Session { return { step: 0, position: {}, warmUp: {}, drill: {}, first: {}, drafts: {}, writing: '', checks: [], revealed: [], recorded: false } }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
function integer(value: unknown, min: number, max: number): value is number { return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max }
function text(value: unknown): string { return typeof value === 'string' ? value.slice(0, 20000) : '' }
function list(value: unknown): unknown[] { return Array.isArray(value) ? value : [] }
export function normalizeCourse(value: unknown, days: DayDefinition[]): CourseState {
  const raw = record(value), ids = new Set(days.map(d => d.day)), allQuestions = new Set(days.flatMap(d => [...d.warmUp, ...d.drill].map(q => q.id)))
  const state: CourseState = { completed: [], scores: {}, mistakes: [], notes: {}, currentDay: 1, sessions: {}, attempts: [] }
  state.completed = [...new Set(list(raw.completed).filter((d): d is number => typeof d === 'number' && ids.has(d)))]
  state.currentDay = typeof raw.currentDay === 'number' && ids.has(raw.currentDay) ? raw.currentDay : 1
  state.mistakes = [...new Set(list(raw.mistakes).filter((q): q is string => typeof q === 'string' && allQuestions.has(q)))]
  for (const day of days) {
    const key = String(day.day), score = record(raw.scores)[key], note = record(raw.notes)[key], stored = record(raw.sessions)[key]
    if (integer(score, 0, 100)) state.scores[key] = score
    // Earlier course notes had no length limit; retain them in full during migration.
    if (typeof note === 'string') state.notes[key] = note
    if (!stored) continue
    const s = record(stored), session = emptySession()
    session.step = integer(s.step, 0, 6) ? s.step : 0
    session.recorded = s.recorded === true
    session.writing = text(s.writing)
    session.checks = [...new Set(list(s.checks).filter((n): n is number => integer(n, 0, day.checklist.length - 1)))]
    const positions = record(s.position)
    for (const [group, length] of [['warmUp', day.warmUp.length], ['drill', day.drill.length], ['corrections', day.corrections.length]] as const) {
      session.position[group] = integer(positions[group], 0, length - 1) ? positions[group] : 0
    }
    for (const [group, questions] of [['warmUp', day.warmUp], ['drill', day.drill], ['first', day.drill]] as const) {
      const answers = record(s[group])
      for (const question of questions) {
        const answer = answers[question.id]
        if (integer(answer, 0, question.options.length - 1)) session[group][question.id] = answer
      }
    }
    for (const c of day.corrections) if (typeof record(s.drafts)[c.id] === 'string') session.drafts[c.id] = text(record(s.drafts)[c.id])
    const revealIds = new Set([...day.corrections.map(c => c.id), ...day.examples.map((_, i) => `example:${i}`)])
    session.revealed = [...new Set(list(s.revealed).filter((id): id is string => typeof id === 'string' && revealIds.has(id)))]
    state.sessions[key] = session
  }
  state.attempts = list(raw.attempts).flatMap(value => {
    const a = record(value), definition = days.find(d => d.day === a.day)
    return definition && a.total === definition.drill.length && integer(a.correct, 0, a.total) && typeof a.at === 'number' && Number.isFinite(a.at) && a.at > 0
      ? [{ day: definition.day, at: a.at, correct: a.correct, total: a.total }] : []
  }).slice(-100)
  return state
}
export function readCourse(storage: Pick<Storage, 'getItem'>, userId: string | undefined, days: DayDefinition[]): CourseState {
  try {
    const raw = storage.getItem(courseKey(userId)) ?? (!userId ? storage.getItem(LEGACY_KEY) : null)
    return normalizeCourse(raw ? JSON.parse(raw) : {}, days)
  } catch { return normalizeCourse({}, days) }
}
