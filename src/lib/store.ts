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
  testSchedules: any[]
  gameHighScores: Record<string, number>
  goalText: string
  studyPlanner: StudyPlannerSettings | null
  planTaskCompletions: Record<string, string[]> // ISO date -> completed task ids
  evaluationRequests: EvaluationRequest[]
  reviews: Record<string, ReviewEntry> // MCQ id -> spaced-repetition state
}

export interface StudyPlannerSettings {
  examDate: string // ISO date
  dailyHours: number
  restDay: number // 0 = Sunday
  selectedOptionals: string[]
  configuredAt?: string
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
  studyPlanner: null,
  planTaskCompletions: {},
  evaluationRequests: [],
  reviews: {},
}

export function getState(): VistaState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...empty }
    return { ...empty, ...JSON.parse(raw) }
  } catch {
    return { ...empty }
  }
}

function save(s: VistaState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
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

function validVisitDates(s: VistaState): string[] {
  const dates = Array.isArray(s.visitDates) ? s.visitDates : []
  const migrated = s.lastVisit ? [...dates, s.lastVisit] : dates
  return [...new Set(migrated.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)))].sort()
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
  const active = s.lastVisit === today || s.lastVisit === yesterday
  const current = active ? Math.max(0, s.streakDays) : 0
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
  const wasReset = Boolean(s.lastVisit && s.lastVisit !== today && s.lastVisit !== yesterday)

  if (s.lastVisit !== today) {
    s.streakDays = s.lastVisit === yesterday ? s.streakDays + 1 : 1
    s.lastVisit = today
    s.bestStreakDays = Math.max(s.bestStreakDays || 0, s.streakDays)
    s.visitDates = [...new Set([...validVisitDates(s), today])].sort()
    save(s)
  } else if (!s.bestStreakDays || !Array.isArray(s.visitDates) || !s.visitDates.includes(today)) {
    // Migrate older saved progress without counting the same day twice.
    s.bestStreakDays = Math.max(s.bestStreakDays || 0, s.streakDays)
    s.visitDates = [...new Set([...validVisitDates(s), today])].sort()
    save(s)
  }

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
  return getState().bookmarks.includes(id)
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

export function saveSchedule(schedule: any) {
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
  notifyProgressChanged()
}

export function getStats() {
  const s = getState()
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

  return { totalQuizzes, avgScore, accuracy, attempted, categories, weak, strong, savedAnswers: s.savedAnswers.length, bookmarks: s.bookmarks.length, streak: s.streakDays, challenges: s.completedChallenges.length }
}


// ---- Study planner ----

export function saveStudyPlanner(settings: Omit<StudyPlannerSettings, 'configuredAt'>) {
  const s = getState()
  s.studyPlanner = { ...settings, configuredAt: new Date().toISOString() }
  save(s)
}

export function togglePlanTask(date: string, taskId: string): boolean {
  const s = getState()
  const list = s.planTaskCompletions[date] ?? []
  const done = !list.includes(taskId)
  s.planTaskCompletions[date] = done ? [...list, taskId] : list.filter((id) => id !== taskId)
  save(s)
  return done
}

// ---- Answer evaluation drafts ----

export function saveEvaluationDraft(input: { subject: string; question: string; answer: string; notes: string; wordCount: number }): EvaluationRequest {
  const s = getState()
  const now = new Date().toISOString()
  const existing = s.evaluationRequests.find((r) => r.question === input.question && r.subject === input.subject)
  if (existing) {
    Object.assign(existing, input, { updatedAt: now })
    save(s)
    return existing
  }
  const request: EvaluationRequest = {
    id: Math.random().toString(36).slice(2),
    ...input,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  }
  s.evaluationRequests.unshift(request)
  if (s.evaluationRequests.length > 100) s.evaluationRequests.length = 100
  save(s)
  return request
}

export function markEvaluationRequestSent(id: string) {
  const s = getState()
  const request = s.evaluationRequests.find((r) => r.id === id)
  if (request) {
    request.status = 'request-sent'
    request.updatedAt = new Date().toISOString()
    save(s)
  }
}

export function deleteEvaluationDraft(id: string) {
  const s = getState()
  s.evaluationRequests = s.evaluationRequests.filter((r) => r.id !== id)
  save(s)
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
  return Object.values(getState().reviews)
    .filter((r) => r.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt || b.lapses - a.lapses)
    .slice(0, limit)
    .map((r) => r.id)
}

export function getRevisionStats(now = Date.now()) {
  const reviews = Object.values(getState().reviews)
  return {
    total: reviews.length,
    due: reviews.filter((r) => r.dueAt <= now).length,
    learning: reviews.filter((r) => r.level < 2).length,
    strengthening: reviews.filter((r) => r.level >= 2 && r.level < 4).length,
    mature: reviews.filter((r) => r.level >= 4).length,
  }
}
