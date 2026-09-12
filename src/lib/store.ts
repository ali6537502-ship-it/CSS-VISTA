// Local-first persistence for CSS Vista. Signed-in students can sync this state.
import { notifyProgressChanged } from '@/lib/progressEvents'

const KEY = 'cssvista:v1'

export interface QuizResult {
  id: string
  type: 'quiz' | 'mpt' | 'game' | 'challenge'
  category: string
  score: number
  total: number
  date: string
  wrongTopics?: string[]
  wrongTopicCounts?: Record<string, number>
  studentName?: string
  candidateName?: string
  durationSeconds?: number
  mockKind?: ScheduledMockKind
}

export interface SavedAnswer {
  id: string
  question: string
  subject: string
  text: string
  outline: string
  intro: string
  conclusion: string
  minutes: number
  date: string
}

export type ScheduledMockKind = 'mpt' | 'gk'

export const DAILY_MOCK_TIME_LABELS: Record<ScheduledMockKind, string> = {
  gk: '8:00–10:00 PM registration',
  mpt: '10:30 PM–12:00 midnight registration',
}

const DAILY_MOCK_TIME_ZONE = 'Asia/Karachi'

export interface MockScheduleEntry {
  lastCompletedAt: string
  nextAvailableAt: string
  attempts: number
  lastSessionDateKey?: string
}

export interface StudyPlannerSettings {
  examDate: string
  dailyHours: number
  restDay: number
  selectedOptionals: string[]
  configuredAt: string
}

export type SyllabusItemStatus = 'not-started' | 'in-progress' | 'completed'

export interface StudyScheduleTask {
  id: string
  syllabusItemId: string
  subject: string
  paper: string
  section: string
  topic: string
  date: string
  time?: string
  minutes: number
  status: SyllabusItemStatus
  createdAt: string
}

export interface VistaShortcutSettings {
  enabled: boolean
  shortcutIds: string[]
}

export interface EvaluationRequest {
  id: string
  subject: string
  question: string
  answer: string
  notes: string
  wordCount: number
  status: 'draft' | 'request-sent'
  createdAt: string
  updatedAt: string
}

export interface CustomTestSeriesRequest {
  id: string
  studentName: string
  phone: string
  subjects: string[]
  testCount: number
  schedulingMode: 'automatic' | 'fixed-gap'
  alternatePapers?: boolean
  startDate: string
  durationDays: number
  gapDays: number
  schedule: Array<{ number: number; date: string; subject: string; syllabus?: string }>
  unitPrice: number | null
  totalFee: number | null
  status: 'draft' | 'request-sent'
  createdAt: string
  updatedAt: string
}

export interface VistaState {
  quizResults: QuizResult[]
  savedAnswers: SavedAnswer[]
  bookmarks: string[] // question/content ids
  completedChallenges: string[] // ISO dates
  lastVisit: string
  streakDays: number
  bestStreakDays: number
  visitDates: string[]
  subjectProgress: Record<string, number> // slug -> 0..100 manual tracker
  testSchedules: unknown[]
  gameHighScores: Record<string, number>
  goalText: string
  mockSchedule: Partial<Record<ScheduledMockKind, MockScheduleEntry>>
  studyPlanner: StudyPlannerSettings | null
  planTaskCompletions: Record<string, string[]>
  syllabusItemStatuses: Record<string, SyllabusItemStatus>
  studyScheduleTasks: StudyScheduleTask[]
  quickNotes: string
  goalChecklist: Array<{ id: string; text: string; completed: boolean }>
  vistaShortcut: VistaShortcutSettings
  evaluationRequests: EvaluationRequest[]
  customTestSeriesRequests: CustomTestSeriesRequest[]
  reviews: Record<string, ReviewEntry> // MCQ id -> spaced-repetition state
}

export interface ReviewEntry {
  id: string
  dueAt: number // epoch ms
  level: number
  lapses: number
}

const empty: VistaState = {
  quizResults: [],
  savedAnswers: [],
  bookmarks: [],
  completedChallenges: [],
  lastVisit: '',
  streakDays: 0,
  bestStreakDays: 0,
  visitDates: [],
  subjectProgress: {},
  testSchedules: [],
  gameHighScores: {},
  goalText: '',
  mockSchedule: {},
  studyPlanner: null,
  planTaskCompletions: {},
  syllabusItemStatuses: {},
  studyScheduleTasks: [],
  quickNotes: '',
  goalChecklist: [],
  vistaShortcut: {
    enabled: true,
    shortcutIds: ['goals', 'note', 'syllabus', 'planner', 'factbook', 'exam-intelligence', 'timer', 'search'],
  },
  evaluationRequests: [],
  customTestSeriesRequests: [],
  reviews: {},
}

function hydrateState(saved: Partial<VistaState>): VistaState {
  const savedShortcut = saved.vistaShortcut
  return {
    ...empty,
    ...saved,
    vistaShortcut: {
      enabled: typeof savedShortcut?.enabled === 'boolean' ? savedShortcut.enabled : empty.vistaShortcut.enabled,
      shortcutIds: Array.isArray(savedShortcut?.shortcutIds)
        ? [...new Set([
            ...savedShortcut.shortcutIds.filter((id): id is string => typeof id === 'string'),
            'factbook',
            'exam-intelligence',
          ])]
        : [...empty.vistaShortcut.shortcutIds],
    },
  }
}

export function getState(): VistaState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...empty }
    return hydrateState(JSON.parse(raw) as Partial<VistaState>)
  } catch {
    return { ...empty }
  }
}

// Read-only selectors such as live timers can run every second. Re-parsing a
// large student record (thousands of attempts/tasks) on every tick can freeze
// low-memory phones, so reuse the parsed snapshot until storage actually changes.
let cachedReadRaw: string | null | undefined
let cachedReadState: VistaState | null = null

function getCachedReadState(): VistaState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === cachedReadRaw && cachedReadState) return cachedReadState
    const state = raw ? hydrateState(JSON.parse(raw) as Partial<VistaState>) : { ...empty }
    cachedReadRaw = raw
    cachedReadState = state
    return state
  } catch {
    cachedReadRaw = undefined
    cachedReadState = { ...empty }
    return cachedReadState
  }
}

function invalidateReadCache() {
  cachedReadRaw = undefined
  cachedReadState = null
}

function save(s: VistaState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
    invalidateReadCache()
    notifyProgressChanged()
  } catch {
    /* storage full or unavailable */
  }
}

export interface VisitStreak {
  current: number
  best: number
  checkedInToday: boolean
  totalVisitDays: number
  nextMilestone: number
  wasReset: boolean
  recentDays: Array<{
    date: string
    label: string
    visited: boolean
    today: boolean
  }>
}

function localDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function shiftedDateKey(dateKey: string, amount: number): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return ''
  return localDateKey(new Date(year, month - 1, day + amount, 12))
}

function isValidDateKey(dateKey: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false
  const [year, month, day] = dateKey.split('-').map(Number)
  return localDateKey(new Date(year, month - 1, day, 12)) === dateKey
}

function validVisitDates(s: VistaState): string[] {
  const dates = Array.isArray(s.visitDates) ? s.visitDates : []
  const validDates = dates.filter(isValidDateKey)
  const legacyRunLength = Math.min(3650, Math.max(1, Math.floor(Number(s.streakDays) || 1)))
  const migrated = validDates.length === 0 && isValidDateKey(s.lastVisit)
    ? Array.from({ length: legacyRunLength }, (_, index) => shiftedDateKey(s.lastVisit, -index))
    : isValidDateKey(s.lastVisit)
      ? [...validDates, s.lastVisit]
      : validDates
  return [...new Set(migrated)].sort()
}

function consecutiveVisitDays(visitDates: string[], endingOn: string): number {
  const visited = new Set(visitDates)
  let cursor = endingOn
  let count = 0
  while (visited.has(cursor) && count <= visited.size) {
    count += 1
    cursor = shiftedDateKey(cursor, -1)
  }
  return count
}

function nextStreakMilestone(current: number): number {
  return [3, 7, 14, 30, 60, 100, 180, 365].find((milestone) => milestone > current)
    ?? Math.ceil((current + 1) / 100) * 100
}

function streakSnapshot(s: VistaState, wasReset = false): VisitStreak {
  const today = localDateKey()
  const yesterday = shiftedDateKey(today, -1)
  const visitDates = validVisitDates(s)
  const visited = new Set(visitDates)
  const activeEnding = visited.has(today) ? today : visited.has(yesterday) ? yesterday : ''
  const current = activeEnding ? consecutiveVisitDays(visitDates, activeEnding) : 0
  const recentDays = Array.from({ length: 7 }, (_, index) => {
    const date = shiftedDateKey(today, index - 6)
    const parsed = new Date(`${date}T12:00:00`)
    return {
      date,
      label: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(parsed).slice(0, 2),
      visited: visited.has(date),
      today: date === today,
    }
  })

  return {
    current,
    best: Math.max(s.bestStreakDays || 0, current),
    checkedInToday: s.lastVisit === today,
    totalVisitDays: visitDates.length,
    nextMilestone: nextStreakMilestone(current),
    wasReset,
    recentDays,
  }
}

export function getVisitStreak(): VisitStreak {
  return streakSnapshot(getState())
}

export function touchVisit(): VisitStreak {
  const s = getState()
  const today = localDateKey()
  const yesterday = shiftedDateKey(today, -1)
  const storedDates = validVisitDates(s)
  const visitDates = storedDates.filter((date) => date <= today)
  const visited = new Set(visitDates)
  const checkedInToday = visited.has(today)
  const wasReset = !checkedInToday && visitDates.length > 0 && !visited.has(yesterday)

  visited.add(today)
  const normalizedDates = [...visited].sort()
  const current = consecutiveVisitDays(normalizedDates, today)
  const best = Math.max(s.bestStreakDays || 0, current)
  const needsSave = s.lastVisit !== today
    || s.streakDays !== current
    || s.bestStreakDays !== best
    || normalizedDates.length !== storedDates.length
    || normalizedDates.some((date, index) => date !== storedDates[index])

  s.lastVisit = today
  s.streakDays = current
  s.bestStreakDays = best
  s.visitDates = normalizedDates
  if (needsSave) save(s)

  return streakSnapshot(s, wasReset)
}

export function recordQuizResult(r: Omit<QuizResult, 'id' | 'date'>) {
  const s = getState()
  s.quizResults.unshift({ ...r, id: Math.random().toString(36).slice(2), date: new Date().toISOString() })
  if (s.quizResults.length > 300) s.quizResults.length = 300
  save(s)
}

export function saveAnswer(a: Omit<SavedAnswer, 'id' | 'date'>) {
  const s = getState()
  s.savedAnswers.unshift({ ...a, id: Math.random().toString(36).slice(2), date: new Date().toISOString() })
  save(s)
}

export function deleteAnswer(id: string) {
  const s = getState()
  s.savedAnswers = s.savedAnswers.filter((a) => a.id !== id)
  save(s)
}

export function toggleBookmark(id: string): boolean {
  const s = getState()
  const i = s.bookmarks.indexOf(id)
  if (i >= 0) s.bookmarks.splice(i, 1)
  else s.bookmarks.push(id)
  save(s)
  return i < 0
}

export function isBookmarked(id: string): boolean {
  return getCachedReadState().bookmarks.includes(id)
}

/**
 * All bookmark ids as a Set, for callers testing many rows at once.
 * `isBookmarked` per row is a linear scan plus a record read each time.
 */
export function getBookmarkSet(): Set<string> {
  return new Set(getCachedReadState().bookmarks)
}

export function completeChallenge(day: string) {
  const s = getState()
  if (!s.completedChallenges.includes(day)) {
    s.completedChallenges.push(day)
    save(s)
  }
}

export function setSubjectProgress(slug: string, pct: number) {
  const s = getState()
  s.subjectProgress[slug] = Math.max(0, Math.min(100, Math.round(pct)))
  save(s)
}

export function saveSchedule(schedule: unknown) {
  const s = getState()
  s.testSchedules = [schedule]
  save(s)
}

export function recordGameScore(game: string, score: number) {
  const s = getState()
  if ((s.gameHighScores[game] ?? 0) < score) s.gameHighScores[game] = score
  save(s)
}

export function setGoal(text: string) {
  const s = getState()
  s.goalText = text
  save(s)
}

function pakistanDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DAILY_MOCK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function shiftDateKey(dateKey: string, amount: number): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + amount))
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`
}

function mockTitle(kind: ScheduledMockKind): string {
  return kind === 'mpt' ? 'CSS MPT Grand Mock' : 'PMS GK Grand Mock'
}

export interface DailyMockStatus {
  dateKey: string
  kind: ScheduledMockKind
  title: string
  route: string
  startAt: string
  registrationClosesAt: string
  state: 'upcoming' | 'live' | 'completed' | 'closed'
  live: boolean
  completedToday: boolean
  available: boolean
  remainingMs: number
  nextAvailableAt: string
}

function mockWindow(kind: ScheduledMockKind, dateKey: string) {
  const startAt = kind === 'gk'
    ? new Date(`${dateKey}T20:00:00+05:00`)
    : new Date(`${dateKey}T22:30:00+05:00`)
  const registrationClosesAt = kind === 'gk'
    ? new Date(`${dateKey}T22:00:00+05:00`)
    : new Date(`${shiftDateKey(dateKey, 1)}T00:00:00+05:00`)
  return { startAt, registrationClosesAt }
}

export function getDailyMockStatus(kind: ScheduledMockKind, now = new Date()): DailyMockStatus {
  const dateKey = pakistanDateKey(now)
  const { startAt, registrationClosesAt } = mockWindow(kind, dateKey)
  const entry = getCachedReadState().mockSchedule?.[kind]
  const completedToday = entry?.lastSessionDateKey === dateKey
  const beforeStart = now.getTime() < startAt.getTime()
  const afterClose = now.getTime() >= registrationClosesAt.getTime()
  const live = !beforeStart && !afterClose && !completedToday
  const nextDateKey = completedToday || afterClose ? shiftDateKey(dateKey, 1) : dateKey
  const nextStart = mockWindow(kind, nextDateKey).startAt
  const state: DailyMockStatus['state'] = completedToday
    ? 'completed'
    : live
      ? 'live'
      : afterClose
        ? 'closed'
        : 'upcoming'

  return {
    dateKey,
    kind,
    title: mockTitle(kind),
    route: kind === 'mpt' ? '/gk/quiz?mode=mpt-mock' : '/gk/quiz?mode=pms-mock',
    startAt: startAt.toISOString(),
    registrationClosesAt: registrationClosesAt.toISOString(),
    state,
    live,
    completedToday,
    available: live,
    remainingMs: Math.max(0, (live ? registrationClosesAt : nextStart).getTime() - now.getTime()),
    nextAvailableAt: nextStart.toISOString(),
  }
}

export interface MockAvailability {
  available: boolean
  cooldownDays: number
  nextAvailableAt: string | null
  closesAt: string | null
  windowLabel: string
  remainingMs: number
  attempts: number
}

export function getMockAvailability(kind: ScheduledMockKind, now = new Date()): MockAvailability {
  const status = getDailyMockStatus(kind, now)
  const entry = getCachedReadState().mockSchedule?.[kind]
  return {
    available: status.available,
    cooldownDays: 1,
    nextAvailableAt: status.available ? null : status.nextAvailableAt,
    closesAt: status.available ? status.registrationClosesAt : null,
    windowLabel: DAILY_MOCK_TIME_LABELS[kind],
    remainingMs: status.remainingMs,
    attempts: entry?.attempts ?? 0,
  }
}

export function recordScheduledMock(kind: ScheduledMockKind, sessionDateKey = pakistanDateKey()) {
  const s = getState()
  const completedAt = new Date()
  const nextSessionDateKey = shiftDateKey(sessionDateKey, 1)
  const nextAvailable = mockWindow(kind, nextSessionDateKey).startAt
  const previous = s.mockSchedule?.[kind]
  s.mockSchedule = {
    ...(s.mockSchedule ?? {}),
    [kind]: {
      lastCompletedAt: completedAt.toISOString(),
      nextAvailableAt: nextAvailable.toISOString(),
      attempts: (previous?.attempts ?? 0) + 1,
      lastSessionDateKey: sessionDateKey,
    },
  }
  save(s)
}

export function saveStudyPlanner(settings: Omit<StudyPlannerSettings, 'configuredAt'>) {
  const s = getState()
  s.studyPlanner = {
    ...settings,
    dailyHours: Math.max(1, Math.min(12, settings.dailyHours)),
    selectedOptionals: [...new Set(settings.selectedOptionals)],
    configuredAt: new Date().toISOString(),
  }
  save(s)
}

export function togglePlanTask(date: string, taskId: string): boolean {
  const s = getState()
  const current = new Set(s.planTaskCompletions?.[date] ?? [])
  const completed = !current.has(taskId)
  if (completed) current.add(taskId)
  else current.delete(taskId)
  s.planTaskCompletions = {
    ...(s.planTaskCompletions ?? {}),
    [date]: [...current],
  }
  save(s)
  return completed
}

export function setSyllabusItemStatus(id: string, status: SyllabusItemStatus) {
  const state = getState()
  state.syllabusItemStatuses = { ...(state.syllabusItemStatuses ?? {}), [id]: status }
  state.studyScheduleTasks = (state.studyScheduleTasks ?? []).map((task) => (
    task.syllabusItemId === id ? { ...task, status } : task
  ))
  save(state)
}

export function addStudyScheduleTasks(tasks: Array<Omit<StudyScheduleTask, 'id' | 'createdAt' | 'status'>>) {
  const state = getState()
  const existing = new Set((state.studyScheduleTasks ?? []).map((task) => `${task.syllabusItemId}|${task.date}`))
  const additions: StudyScheduleTask[] = tasks
    .filter((task) => !existing.has(`${task.syllabusItemId}|${task.date}`))
    .map((task) => ({
      ...task,
      id: `syllabus-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      status: state.syllabusItemStatuses?.[task.syllabusItemId] === 'completed' ? 'completed' : 'in-progress',
    }))
  state.studyScheduleTasks = [...(state.studyScheduleTasks ?? []), ...additions].slice(-3000)
  additions.forEach((task) => {
    if (state.syllabusItemStatuses?.[task.syllabusItemId] !== 'completed') {
      state.syllabusItemStatuses = { ...(state.syllabusItemStatuses ?? {}), [task.syllabusItemId]: 'in-progress' }
    }
  })
  save(state)
  return additions
}

export function updateStudyScheduleTask(id: string, patch: Partial<Pick<StudyScheduleTask, 'date' | 'time' | 'minutes' | 'status'>>) {
  const state = getState()
  let syllabusItemId = ''
  state.studyScheduleTasks = (state.studyScheduleTasks ?? []).map((task) => {
    if (task.id !== id) return task
    syllabusItemId = task.syllabusItemId
    return { ...task, ...patch }
  })
  if (syllabusItemId && patch.status) {
    state.syllabusItemStatuses = { ...(state.syllabusItemStatuses ?? {}), [syllabusItemId]: patch.status }
  }
  save(state)
}

export function deleteStudyScheduleTask(id: string) {
  const state = getState()
  state.studyScheduleTasks = (state.studyScheduleTasks ?? []).filter((task) => task.id !== id)
  save(state)
}

export function setQuickNotes(value: string) {
  const state = getState()
  state.quickNotes = value.slice(0, 12000)
  save(state)
}

export function setGoalChecklist(items: VistaState['goalChecklist']) {
  const state = getState()
  state.goalChecklist = items.slice(0, 100)
  save(state)
}

export function setVistaShortcut(settings: VistaShortcutSettings) {
  const state = getState()
  state.vistaShortcut = settings
  save(state)
}

export function saveEvaluationRequest(
  request: Omit<EvaluationRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
): EvaluationRequest {
  const s = getState()
  const now = new Date().toISOString()
  const saved: EvaluationRequest = {
    ...request,
    id: `evaluation-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  }
  s.evaluationRequests = [saved, ...(s.evaluationRequests ?? [])].slice(0, 100)
  save(s)
  return saved
}

export function markEvaluationRequestSent(id: string) {
  const s = getState()
  s.evaluationRequests = (s.evaluationRequests ?? []).map((request) => (
    request.id === id
      ? { ...request, status: 'request-sent', updatedAt: new Date().toISOString() }
      : request
  ))
  save(s)
}

export function deleteEvaluationRequest(id: string) {
  const s = getState()
  s.evaluationRequests = (s.evaluationRequests ?? []).filter((request) => request.id !== id)
  save(s)
}

export function saveCustomTestSeriesRequest(
  request: Omit<CustomTestSeriesRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
): CustomTestSeriesRequest {
  const state = getState()
  const now = new Date().toISOString()
  const saved: CustomTestSeriesRequest = {
    ...request,
    id: `series-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  }
  state.customTestSeriesRequests = [saved, ...(state.customTestSeriesRequests ?? [])].slice(0, 30)
  save(state)
  return saved
}

export function markCustomTestSeriesRequestSent(id: string) {
  const state = getState()
  state.customTestSeriesRequests = (state.customTestSeriesRequests ?? []).map((request) => (
    request.id === id
      ? { ...request, status: 'request-sent', updatedAt: new Date().toISOString() }
      : request
  ))
  save(state)
}

export function deleteCustomTestSeriesRequest(id: string) {
  const state = getState()
  state.customTestSeriesRequests = (state.customTestSeriesRequests ?? []).filter((request) => request.id !== id)
  save(state)
}

export function exportData(): string {
  return JSON.stringify(getState(), null, 2)
}

export function importData(json: string): boolean {
  try {
    const parsed = JSON.parse(json)
    save({ ...empty, ...parsed })
    return true
  } catch {
    return false
  }
}

export function resetData() {
  localStorage.removeItem(KEY)
  invalidateReadCache()
  notifyProgressChanged()
}

export function getStats() {
  const s = getCachedReadState()
  const totalQuizzes = s.quizResults.length
  const avgScore = totalQuizzes
    ? Math.round((s.quizResults.reduce((a, r) => a + r.score / Math.max(1, r.total), 0) / totalQuizzes) * 100)
    : 0
  const attempted = s.quizResults.reduce((a, r) => a + r.total, 0)
  const correct = s.quizResults.reduce((a, r) => a + r.score, 0)
  const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0

  // per-category aggregates
  const byCat: Record<string, { score: number; total: number }> = {}
  for (const r of s.quizResults) {
    byCat[r.category] = byCat[r.category] || { score: 0, total: 0 }
    byCat[r.category].score += r.score
    byCat[r.category].total += r.total
  }
  const categories = Object.entries(byCat).map(([name, v]) => ({
    name,
    pct: v.total ? Math.round((v.score / v.total) * 100) : 0,
    attempts: v.total,
  }))
  const weak = categories.filter((c) => c.attempts >= 5).sort((a, b) => a.pct - b.pct).slice(0, 3)
  const strong = [...categories].sort((a, b) => b.pct - a.pct).slice(0, 3)

  return { totalQuizzes, avgScore, accuracy, attempted, categories, weak, strong, savedAnswers: s.savedAnswers.length, bookmarks: s.bookmarks.length, streak: streakSnapshot(s).current, challenges: s.completedChallenges.length }
}
// ---- Smart revision (spaced repetition for MCQs) ----

// Intervals in days: questions come back after 1, 3, 7, 14, 30 and 60 days.
const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60]

export function recordReview(questionId: string, correct: boolean) {
  const s = getState()
  const entry = s.reviews[questionId] ?? { id: questionId, dueAt: 0, level: 0, lapses: 0 }
  if (correct) {
    entry.level = Math.min(entry.level + 1, REVIEW_INTERVALS.length - 1)
  } else {
    entry.level = 0
    entry.lapses += 1
  }
  entry.dueAt = Date.now() + REVIEW_INTERVALS[entry.level] * 86400000
  s.reviews[questionId] = entry
  // keep the table bounded
  const ids = Object.keys(s.reviews)
  if (ids.length > 5000) {
    ids.sort((a, b) => s.reviews[a].dueAt - s.reviews[b].dueAt)
    for (const id of ids.slice(0, ids.length - 5000)) delete s.reviews[id]
  }
  save(s)
}

export function getDueReviewIds(limit = 60, now = Date.now()): string[] {
  return Object.values(getCachedReadState().reviews)
    .filter((r) => r.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt || b.lapses - a.lapses)
    .slice(0, limit)
    .map((r) => r.id)
}

export function getRevisionStats(now = Date.now()) {
  const reviews = Object.values(getCachedReadState().reviews)
  return {
    total: reviews.length,
    due: reviews.filter((r) => r.dueAt <= now).length,
    learning: reviews.filter((r) => r.level < 2).length,
    strengthening: reviews.filter((r) => r.level >= 2 && r.level < 4).length,
    mature: reviews.filter((r) => r.level >= 4).length,
  }
}
