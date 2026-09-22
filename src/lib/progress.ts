// Student progress - saved locally for guests and synced for signed-in students.
// Covers: attempted MCQs, saved MCQs, mistake notebook, recent activity,
// checklist progress, timer sessions, active study time, question response time
// and notification preferences.

import { notifyProgressChanged, notifyStorageFailed } from '@/lib/progressEvents'

const KEY = 'cssvista:progress:v1'

export interface AttemptRecord {
  c: boolean
  ts: number
}

export interface AttemptEvent {
  id: string
  questionId: string
  correct: boolean
  category: string
  topic?: string
  subtopic?: string
  difficulty?: string
  selected?: number
  mode?: QuestionTiming['mode']
  sessionId?: string
  ts: number
}

export interface ReviewSchedule {
  id: string
  cat: string
  level: number
  streak: number
  lapses: number
  intervalDays: number
  lastReviewedAt: number
  dueAt: number
}

export interface Mistake {
  id: string // question id
  sel: number // selected option index
  ts: number
  count: number
  revised: boolean
  cat: string
  successfulRetries?: number
  lastCorrectAt?: number
  resolvedAt?: number
}

export interface Activity {
  type: 'mcq' | 'gk-category' | 'quiz' | 'vocab' | 'past-paper' | 'checklist' | 'timer' | 'study-tool' | 'page'
  label: string
  path: string
  ts: number
}

export interface TimerSession {
  id: string
  mode: 'single' | 'paper'
  questions: string[]
  times: number[] // seconds per question
  total: number
  ts: number
  finished: boolean
}

export interface BookSummaryProgress {
  saved: boolean
  completed: boolean
  progress: number
  updatedAt: number
}

export interface StudySession {
  id: string
  date: string
  path: string
  area: string
  seconds: number
  startedAt: number
  updatedAt: number
}

export interface QuestionTiming {
  id: string
  questionId: string
  category: string
  mode: 'mpt' | 'gk' | 'quiz' | 'game' | 'challenge'
  seconds: number
  correct: boolean
  ts: number
  selected?: number
  topic?: string
  subtopic?: string
  difficulty?: string
}

export interface IntelligencePreferences {
  focusSubjects: string[]
  reducedSubjects: string[]
  pausedTopics: string[]
  ignoredRecommendations: string[]
  customRevisionDue: Record<string, number>
  onboardingDismissed: boolean
}

export interface StudyDayReport {
  date: string
  label: string
  seconds: number
  minutes: number
  questions: number
  correct: number
  accuracy: number
  avgQuestionSeconds: number
}

export interface StudyAnalytics {
  today: StudyDayReport
  daily: StudyDayReport[]
  totalStudySeconds: number
  currentWeekSeconds: number
  previousWeekSeconds: number
  studyChangePercent: number | null
  currentAvgQuestionSeconds: number
  previousAvgQuestionSeconds: number
  speedImprovementPercent: number | null
  currentAccuracy: number
  previousAccuracy: number
  accuracyChange: number | null
  topAreas: Array<{ area: string; seconds: number }>
}

export interface ProgressState {
  attempts: Record<string, AttemptRecord>
  attemptEvents: AttemptEvent[]
  reviews: Record<string, ReviewSchedule>
  savedMcqs: string[]
  mistakes: Mistake[]
  activities: Activity[]
  checklists: Record<string, boolean[]>
  /**
   * Checklist ticks keyed by a stable item key rather than by array index.
   * Index-keyed `checklists` silently shifts every saved tick when the
   * underlying content is edited or reordered; this does not.
   */
  checklistItems: Record<string, Record<string, boolean>>
  /** Short free-text notes keyed by list id then stable item key. */
  textNotes: Record<string, Record<string, string>>
  timerSessions: TimerSession[]
  notif: {
    asked: boolean
    enabled: boolean
    tags: Record<string, boolean>
    dismissed: boolean
  }
  seenUpdates: string[]
  fiveMin: { date: string; score: number; total: number }[]
  bookSummaries: Record<string, BookSummaryProgress>
  studySessions: StudySession[]
  questionTimings: QuestionTiming[]
  intelligence: IntelligencePreferences
}

const empty: ProgressState = {
  attempts: {},
  attemptEvents: [],
  reviews: {},
  savedMcqs: [],
  mistakes: [],
  activities: [],
  checklists: {},
  checklistItems: {},
  textNotes: {},
  timerSessions: [],
  notif: { asked: false, enabled: false, tags: { Mentors: true, Opinions: true, 'VISTA Journal': true, 'Test Series': true, FPSC: true, General: true }, dismissed: false },
  seenUpdates: [],
  fiveMin: [],
  bookSummaries: {},
  studySessions: [],
  questionTimings: [],
  intelligence: {
    focusSubjects: [],
    reducedSubjects: [],
    pausedTopics: [],
    ignoredRecommendations: [],
    customRevisionDue: {},
    onboardingDismissed: false,
  },
}

export function getProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return JSON.parse(JSON.stringify(empty))
    const cleaned = raw.replaceAll('\u2014', '-')
    if (cleaned !== raw) localStorage.setItem(KEY, cleaned)
    return { ...JSON.parse(JSON.stringify(empty)), ...JSON.parse(cleaned) }
  } catch {
    return JSON.parse(JSON.stringify(empty))
  }
}

// Read-only selectors run in render paths and in one-second timers, and each
// call used to re-parse the whole progress record - on a large bank that meant
// thousands of full JSON.parse calls of a multi-megabyte string per keystroke.
// Reuse the parsed snapshot until storage actually changes. Mirrors the same
// cache in store.ts. Never hand this object to a mutation path: callers that
// write must use getProgress(), which always parses fresh.
let cachedReadRaw: string | null | undefined
let cachedReadState: ProgressState | null = null

function getProgressCached(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === cachedReadRaw && cachedReadState) return cachedReadState
    const state = getProgress()
    cachedReadRaw = raw
    cachedReadState = state
    return state
  } catch {
    cachedReadRaw = undefined
    cachedReadState = JSON.parse(JSON.stringify(empty))
    return cachedReadState as ProgressState
  }
}

function invalidateReadCache() {
  cachedReadRaw = undefined
  cachedReadState = null
}

function save(s: ProgressState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
    invalidateReadCache()
    notifyProgressChanged()
  } catch {
    // Quota exceeded, private browsing, or site data blocked. Announce it so
    // the student is told rather than silently losing their work.
    notifyStorageFailed()
  }
}

// ---------- Attempts ----------
const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60]

function applyAttempt(
  state: ProgressState,
  id: string,
  correct: boolean,
  cat: string,
  metadata: Partial<Omit<AttemptEvent, 'id' | 'questionId' | 'correct' | 'category' | 'ts'>> = {},
  ts = Date.now(),
) {
  const s = state
  const now = ts
  s.attempts[id] = { c: correct, ts: now }
  const previous = s.reviews?.[id]
  const level = correct ? Math.min((previous?.level ?? -1) + 1, REVIEW_INTERVALS.length - 1) : 0
  const intervalDays = correct ? REVIEW_INTERVALS[level] : 1
  s.reviews = {
    ...(s.reviews ?? {}),
    [id]: {
      id,
      cat: cat || previous?.cat || id.replace(/-\d+$/, ''),
      level,
      streak: correct ? (previous?.streak ?? 0) + 1 : 0,
      lapses: (previous?.lapses ?? 0) + (correct ? 0 : 1),
      intervalDays,
      lastReviewedAt: now,
      dueAt: now + intervalDays * 24 * 60 * 60 * 1000,
    },
  }
  const mistake = s.mistakes.find((entry) => entry.id === id)
  if (mistake && correct) {
    mistake.successfulRetries = (mistake.successfulRetries ?? 0) + 1
    mistake.lastCorrectAt = now
    mistake.revised = true
    if (mistake.successfulRetries >= 2) mistake.resolvedAt = now
  }
  const eventId = metadata.sessionId
    ? `attempt:${metadata.sessionId}:${id}`
    : `attempt:${now}:${id}:${Math.random().toString(36).slice(2, 7)}`
  if (!(s.attemptEvents ?? []).some((event) => event.id === eventId)) {
    s.attemptEvents = [{
      id: eventId,
      questionId: id,
      correct,
      category: cat || id.replace(/-\d+$/, ''),
      ...metadata,
      ts: now,
    }, ...(s.attemptEvents ?? [])].slice(0, 12_000)
  }
  const keys = Object.keys(s.attempts)
  if (keys.length > 8000) {
    keys
      .sort((a, b) => s.attempts[a].ts - s.attempts[b].ts)
      .slice(0, keys.length - 8000)
      .forEach((k) => delete s.attempts[k])
  }
}

export function recordAttempt(
  id: string,
  correct: boolean,
  cat = '',
  metadata: Partial<Omit<AttemptEvent, 'id' | 'questionId' | 'correct' | 'category' | 'ts'>> = {},
) {
  const state = getProgress()
  applyAttempt(state, id, correct, cat, metadata)
  save(state)
}

export function recordAttemptBatch(
  attempts: Array<{
    id: string
    correct: boolean
    category: string
    selected?: number
    topic?: string
    subtopic?: string
    difficulty?: string
    mode?: QuestionTiming['mode']
  }>,
  sessionId: string,
) {
  if (!sessionId || !attempts.length) return
  const state = getProgress()
  const now = Date.now()
  attempts.forEach((attempt, index) => {
    if ((state.attemptEvents ?? []).some((event) => event.id === `attempt:${sessionId}:${attempt.id}`)) return
    applyAttempt(state, attempt.id, attempt.correct, attempt.category, {
      selected: attempt.selected,
      topic: attempt.topic,
      subtopic: attempt.subtopic,
      difficulty: attempt.difficulty,
      mode: attempt.mode,
      sessionId,
    }, now + index)
    if (!attempt.correct && attempt.selected !== undefined) {
      const existing = state.mistakes.find((mistake) => mistake.id === attempt.id)
      if (existing) {
        existing.count += 1
        existing.sel = attempt.selected
        existing.ts = now
        existing.revised = false
        existing.successfulRetries = 0
        existing.resolvedAt = undefined
      } else {
        state.mistakes.unshift({
          id: attempt.id,
          sel: attempt.selected,
          ts: now,
          count: 1,
          revised: false,
          cat: attempt.category,
          successfulRetries: 0,
        })
      }
    }
  })
  state.mistakes = state.mistakes.slice(0, 800)
  save(state)
}

export function getAttempt(id: string): AttemptRecord | undefined {
  return getProgressCached().attempts[id]
}

/** The whole attempts map, for callers filtering many questions at once. */
export function getAttempts(): Record<string, AttemptRecord> {
  return getProgressCached().attempts
}

export function attemptedIds(): Set<string> {
  return new Set(Object.keys(getProgressCached().attempts))
}

export function wrongIds(): string[] {
  const s = getProgressCached()
  return Object.entries(s.attempts)
    .filter(([, v]) => !v.c)
    .map(([k]) => k)
}

export function getDueReviews(now = Date.now()): ReviewSchedule[] {
  return Object.values(getProgressCached().reviews ?? {})
    .filter((review) => review.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt || b.lapses - a.lapses)
}

export function dueRevisionIds(limit = 60): string[] {
  return getDueReviews().slice(0, limit).map((review) => review.id)
}

export function getRevisionStats(now = Date.now()) {
  const reviews = Object.values(getProgressCached().reviews ?? {})
  const due = reviews.filter((review) => review.dueAt <= now).length
  const learning = reviews.filter((review) => review.level < 2).length
  const strengthening = reviews.filter((review) => review.level >= 2 && review.level < 4).length
  const mature = reviews.filter((review) => review.level >= 4).length
  return { total: reviews.length, due, learning, strengthening, mature }
}

// ---------- Saved MCQs ----------
export function toggleSavedMcq(id: string): boolean {
  const s = getProgress()
  const i = s.savedMcqs.indexOf(id)
  if (i >= 0) s.savedMcqs.splice(i, 1)
  else s.savedMcqs.push(id)
  save(s)
  return i < 0
}

export function savedMcqIds(): string[] {
  return getProgressCached().savedMcqs
}

// ---------- Mistake notebook ----------
export function addMistake(id: string, sel: number, cat: string) {
  const s = getProgress()
  const ex = s.mistakes.find((m) => m.id === id)
  if (ex) {
    ex.count += 1
    ex.sel = sel
    ex.ts = Date.now()
    ex.revised = false
    ex.successfulRetries = 0
    ex.resolvedAt = undefined
  } else {
    s.mistakes.unshift({ id, sel, ts: Date.now(), count: 1, revised: false, cat, successfulRetries: 0 })
  }
  if (s.mistakes.length > 800) s.mistakes.length = 800
  save(s)
}

export function removeMistake(id: string) {
  const s = getProgress()
  s.mistakes = s.mistakes.filter((m) => m.id !== id)
  save(s)
}

export function toggleMistakeRevised(id: string) {
  const s = getProgress()
  const m = s.mistakes.find((x) => x.id === id)
  if (m) {
    m.revised = !m.revised
    save(s)
  }
}

export function getMistakes(): Mistake[] {
  return getProgressCached().mistakes
}

// ---------- Exam Intelligence controls ----------
export function getIntelligencePreferences(): IntelligencePreferences {
  const saved = getProgress().intelligence
  return {
    ...empty.intelligence,
    ...saved,
    focusSubjects: [...new Set(saved?.focusSubjects ?? [])],
    reducedSubjects: [...new Set(saved?.reducedSubjects ?? [])],
    pausedTopics: [...new Set(saved?.pausedTopics ?? [])],
    ignoredRecommendations: [...new Set(saved?.ignoredRecommendations ?? [])],
    customRevisionDue: { ...(saved?.customRevisionDue ?? {}) },
  }
}

export function updateIntelligencePreferences(patch: Partial<IntelligencePreferences>) {
  const state = getProgress()
  const current = getIntelligencePreferences()
  state.intelligence = {
    ...current,
    ...patch,
    focusSubjects: [...new Set(patch.focusSubjects ?? current.focusSubjects)].slice(0, 30),
    reducedSubjects: [...new Set(patch.reducedSubjects ?? current.reducedSubjects)].slice(0, 30),
    pausedTopics: [...new Set(patch.pausedTopics ?? current.pausedTopics)].slice(0, 200),
    ignoredRecommendations: [...new Set(patch.ignoredRecommendations ?? current.ignoredRecommendations)].slice(-200),
    customRevisionDue: { ...current.customRevisionDue, ...(patch.customRevisionDue ?? {}) },
  }
  save(state)
  return state.intelligence
}

// ---------- Continue where you left off ----------
export function recordActivity(a: Omit<Activity, 'ts'>) {
  const s = getProgress()
  s.activities = s.activities.filter((x) => !(x.type === a.type && x.path === a.path))
  s.activities.unshift({ ...a, ts: Date.now() })
  if (s.activities.length > 20) s.activities.length = 20
  save(s)
}

export function lastActivity(): Activity | null {
  return getProgress().activities[0] ?? null
}

export function recentActivities(n = 4): Activity[] {
  return getProgressCached().activities.slice(0, n)
}

// ---------- Book-summary reading ----------
export function getBookSummaryProgress(slug: string): BookSummaryProgress {
  return getProgress().bookSummaries?.[slug] ?? {
    saved: false,
    completed: false,
    progress: 0,
    updatedAt: 0,
  }
}

export function getAllBookSummaryProgress(): Record<string, BookSummaryProgress> {
  return getProgress().bookSummaries ?? {}
}

export function updateBookSummaryProgress(slug: string, patch: Partial<Omit<BookSummaryProgress, 'updatedAt'>>) {
  const state = getProgress()
  const previous = state.bookSummaries?.[slug] ?? {
    saved: false,
    completed: false,
    progress: 0,
    updatedAt: 0,
  }
  state.bookSummaries = {
    ...(state.bookSummaries ?? {}),
    [slug]: {
      ...previous,
      ...patch,
      progress: Math.max(0, Math.min(100, Math.round(patch.progress ?? previous.progress))),
      updatedAt: Date.now(),
    },
  }
  save(state)
  return state.bookSummaries[slug]
}

// ---------- Checklists ----------
export function getChecklist(id: string, len: number): boolean[] {
  const s = getProgress()
  const v = s.checklists[id]
  if (Array.isArray(v) && v.length === len) return v
  return Array(len).fill(false)
}

export function setChecklist(id: string, value: boolean[]) {
  const s = getProgress()
  s.checklists[id] = value
  save(s)
}

/**
 * Stable-key checklist storage. `id` scopes the list (e.g. a subject slug),
 * `key` identifies the item by its own content rather than its position, so
 * editing or reordering the list never moves a student's saved ticks.
 */
export function getChecklistItems(id: string): Record<string, boolean> {
  const s = getProgressCached()
  const v = s.checklistItems[id]
  return v && typeof v === 'object' ? v : {}
}

export function setChecklistItem(id: string, key: string, value: boolean) {
  const s = getProgress()
  const list = s.checklistItems[id] && typeof s.checklistItems[id] === 'object' ? s.checklistItems[id] : {}
  if (value) list[key] = true
  else delete list[key]
  s.checklistItems[id] = list
  save(s)
  return list
}

// ---------- Short free-text notes ----------
export function getTextNotes(id: string): Record<string, string> {
  const s = getProgressCached()
  const v = s.textNotes[id]
  return v && typeof v === 'object' ? v : {}
}

export function setTextNote(id: string, key: string, value: string) {
  const s = getProgress()
  const list = s.textNotes[id] && typeof s.textNotes[id] === 'object' ? s.textNotes[id] : {}
  const trimmed = value.slice(0, 500)
  if (trimmed.trim()) list[key] = trimmed
  else delete list[key]
  s.textNotes[id] = list
  save(s)
  return list
}

export function countChecklistItems(id: string, keys: string[]) {
  const list = getChecklistItems(id)
  return keys.reduce((total, key) => total + (list[key] ? 1 : 0), 0)
}

/**
 * One-time lift of a legacy index-keyed checklist onto stable keys, so ticks
 * saved before this change are preserved. `keys` must be in the same order the
 * legacy array used. Runs only when nothing is stored under the new shape yet.
 */
export function migrateIndexedChecklist(id: string, keys: string[]): Record<string, boolean> {
  const s = getProgress()
  const already = s.checklistItems[id]
  if (already && typeof already === 'object') return already

  const legacy = s.checklists[id]
  const migrated: Record<string, boolean> = {}
  if (Array.isArray(legacy) && legacy.length === keys.length) {
    keys.forEach((key, index) => { if (legacy[index]) migrated[key] = true })
  }
  s.checklistItems[id] = migrated
  save(s)
  return migrated
}

export function resetChecklistItems(id: string) {
  const s = getProgress()
  s.checklistItems[id] = {}
  save(s)
}

// ---------- Timer sessions ----------
export function saveTimerSession(sess: Omit<TimerSession, 'id' | 'ts'>) {
  const s = getProgress()
  s.timerSessions.unshift({ ...sess, id: Math.random().toString(36).slice(2), ts: Date.now() })
  if (s.timerSessions.length > 50) s.timerSessions.length = 50
  save(s)
}

export function getTimerSessions(): TimerSession[] {
  return getProgressCached().timerSessions
}

// ---------- Study-time and question-speed analytics ----------
function localDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function shiftedDateKey(dateKey: string, amount: number): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  return localDateKey(new Date(year, month - 1, day + amount, 12))
}

export function saveStudySession(session: StudySession) {
  if (!session.id || session.seconds <= 0) return
  const state = getProgress()
  const normalized: StudySession = {
    ...session,
    seconds: Math.max(0, Math.round(session.seconds)),
    updatedAt: Date.now(),
  }
  if (normalized.seconds <= 0) return
  const existingIndex = state.studySessions.findIndex((entry) => entry.id === session.id)
  if (existingIndex >= 0) state.studySessions[existingIndex] = normalized
  else state.studySessions.unshift(normalized)
  state.studySessions = state.studySessions
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 1200)
  save(state)
}

export function recordQuestionTiming(
  timing: Omit<QuestionTiming, 'id' | 'ts' | 'seconds'> & { seconds: number },
) {
  const state = getProgress()
  state.questionTimings.unshift({
    ...timing,
    id: `question-time-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    seconds: Math.max(1, Math.min(1800, Math.round(timing.seconds))),
    ts: Date.now(),
  })
  if (state.questionTimings.length > 4000) state.questionTimings.length = 4000
  save(state)
}

export function getStudyAnalytics(days = 7): StudyAnalytics {
  const state = getProgressCached()
  const todayKey = localDateKey()
  const dayCount = Math.max(1, days)
  const currentKeys = Array.from({ length: dayCount }, (_, index) => shiftedDateKey(todayKey, index - dayCount + 1))
  const previousKeys = Array.from({ length: dayCount }, (_, index) => shiftedDateKey(todayKey, index - dayCount * 2 + 1))
  const allKeys = [...previousKeys, ...currentKeys]
  const reports = new Map<string, StudyDayReport>()

  allKeys.forEach((date) => {
    const parsed = new Date(`${date}T12:00:00`)
    reports.set(date, {
      date,
      label: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(parsed),
      seconds: 0,
      minutes: 0,
      questions: 0,
      correct: 0,
      accuracy: 0,
      avgQuestionSeconds: 0,
    })
  })

  const areaSeconds = new Map<string, number>()
  const currentKeySet = new Set(currentKeys)
  for (const session of state.studySessions ?? []) {
    const report = reports.get(session.date)
    if (report) report.seconds += Math.max(0, session.seconds || 0)
    if (currentKeySet.has(session.date)) {
      areaSeconds.set(session.area, (areaSeconds.get(session.area) ?? 0) + Math.max(0, session.seconds || 0))
    }
  }

  const timingSeconds = new Map<string, number>()
  for (const timing of state.questionTimings ?? []) {
    const date = localDateKey(new Date(timing.ts))
    const report = reports.get(date)
    if (!report) continue
    report.questions += 1
    if (timing.correct) report.correct += 1
    timingSeconds.set(date, (timingSeconds.get(date) ?? 0) + Math.max(1, timing.seconds || 0))
  }

  reports.forEach((report) => {
    report.minutes = Math.round(report.seconds / 60)
    report.accuracy = report.questions ? Math.round((report.correct / report.questions) * 100) : 0
    report.avgQuestionSeconds = report.questions
      ? Math.round((timingSeconds.get(report.date) ?? 0) / report.questions)
      : 0
  })

  const sum = (keys: string[], field: 'seconds' | 'questions' | 'correct') => (
    keys.reduce((total, key) => total + (reports.get(key)?.[field] ?? 0), 0)
  )
  const currentWeekSeconds = sum(currentKeys, 'seconds')
  const previousWeekSeconds = sum(previousKeys, 'seconds')
  const currentQuestions = sum(currentKeys, 'questions')
  const previousQuestions = sum(previousKeys, 'questions')
  const currentCorrect = sum(currentKeys, 'correct')
  const previousCorrect = sum(previousKeys, 'correct')
  const currentTimingSeconds = currentKeys.reduce((total, key) => total + (timingSeconds.get(key) ?? 0), 0)
  const previousTimingSeconds = previousKeys.reduce((total, key) => total + (timingSeconds.get(key) ?? 0), 0)
  const currentAvgQuestionSeconds = currentQuestions ? Math.round(currentTimingSeconds / currentQuestions) : 0
  const previousAvgQuestionSeconds = previousQuestions ? Math.round(previousTimingSeconds / previousQuestions) : 0
  const currentAccuracy = currentQuestions ? Math.round((currentCorrect / currentQuestions) * 100) : 0
  const previousAccuracy = previousQuestions ? Math.round((previousCorrect / previousQuestions) * 100) : 0

  return {
    today: reports.get(todayKey)!,
    daily: currentKeys.map((key) => reports.get(key)!),
    totalStudySeconds: (state.studySessions ?? []).reduce((total, session) => total + Math.max(0, session.seconds || 0), 0),
    currentWeekSeconds,
    previousWeekSeconds,
    studyChangePercent: previousWeekSeconds
      ? Math.round(((currentWeekSeconds - previousWeekSeconds) / previousWeekSeconds) * 100)
      : null,
    currentAvgQuestionSeconds,
    previousAvgQuestionSeconds,
    speedImprovementPercent: previousAvgQuestionSeconds && currentAvgQuestionSeconds
      ? Math.round(((previousAvgQuestionSeconds - currentAvgQuestionSeconds) / previousAvgQuestionSeconds) * 100)
      : null,
    currentAccuracy,
    previousAccuracy,
    accuracyChange: previousQuestions ? currentAccuracy - previousAccuracy : null,
    topAreas: [...areaSeconds.entries()]
      .map(([area, seconds]) => ({ area, seconds }))
      .filter((area) => area.seconds > 0)
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 5),
  }
}

// ---------- Notifications ----------
export function getNotifPrefs() {
  return getProgress().notif
}

export function setNotifPrefs(p: Partial<ProgressState['notif']>) {
  const s = getProgress()
  s.notif = { ...s.notif, ...p, tags: { ...s.notif.tags, ...(p.tags ?? {}) } }
  save(s)
}

export function markUpdatesSeen(ids: string[]) {
  const s = getProgress()
  const set = new Set([...s.seenUpdates, ...ids])
  s.seenUpdates = [...set].slice(-200)
  save(s)
}

export function unseenUpdateIds(allIds: string[]): string[] {
  const seen = new Set(getProgress().seenUpdates)
  return allIds.filter((id) => !seen.has(id))
}

// ---------- Five-minute challenge ----------
export function recordFiveMin(score: number, total: number) {
  const s = getProgress()
  s.fiveMin.unshift({ date: new Date().toISOString().slice(0, 10), score, total })
  if (s.fiveMin.length > 60) s.fiveMin.length = 60
  save(s)
}

export function fiveMinToday(): { score: number; total: number } | null {
  const today = new Date().toISOString().slice(0, 10)
  const r = getProgressCached().fiveMin.find((f) => f.date === today)
  return r ? { score: r.score, total: r.total } : null
}
