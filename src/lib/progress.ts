// Student progress - saved locally for guests and synced for signed-in students.
// Covers: attempted MCQs, saved MCQs, mistake notebook, recent activity,
// checklist progress, timer sessions and notification preferences.

import { notifyProgressChanged } from '@/lib/progressEvents'

const KEY = 'cssvista:progress:v1'

export interface AttemptRecord {
  c: boolean
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

export interface ProgressState {
  attempts: Record<string, AttemptRecord>
  reviews: Record<string, ReviewSchedule>
  savedMcqs: string[]
  mistakes: Mistake[]
  activities: Activity[]
  checklists: Record<string, boolean[]>
  timerSessions: TimerSession[]
  notif: {
    asked: boolean
    enabled: boolean
    tags: Record<string, boolean>
    dismissed: boolean
  }
  seenUpdates: string[]
  fiveMin: { date: string; score: number; total: number }[]
}

const empty: ProgressState = {
  attempts: {},
  reviews: {},
  savedMcqs: [],
  mistakes: [],
  activities: [],
  checklists: {},
  timerSessions: [],
  notif: { asked: false, enabled: false, tags: { Mentors: true, Opinions: true, 'Test Series': true, FPSC: true, General: true }, dismissed: false },
  seenUpdates: [],
  fiveMin: [],
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

function save(s: ProgressState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
    notifyProgressChanged()
  } catch {
    /* storage full */
  }
}

// ---------- Attempts ----------
const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60]

export function recordAttempt(id: string, correct: boolean, cat = '') {
  const s = getProgress()
  const now = Date.now()
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
  const keys = Object.keys(s.attempts)
  if (keys.length > 8000) {
    keys
      .sort((a, b) => s.attempts[a].ts - s.attempts[b].ts)
      .slice(0, keys.length - 8000)
      .forEach((k) => delete s.attempts[k])
  }
  save(s)
}

export function getAttempt(id: string): AttemptRecord | undefined {
  return getProgress().attempts[id]
}

export function attemptedIds(): Set<string> {
  return new Set(Object.keys(getProgress().attempts))
}

export function wrongIds(): string[] {
  const s = getProgress()
  return Object.entries(s.attempts)
    .filter(([, v]) => !v.c)
    .map(([k]) => k)
}

export function getDueReviews(now = Date.now()): ReviewSchedule[] {
  return Object.values(getProgress().reviews ?? {})
    .filter((review) => review.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt || b.lapses - a.lapses)
}

export function dueRevisionIds(limit = 60): string[] {
  return getDueReviews().slice(0, limit).map((review) => review.id)
}

export function getRevisionStats(now = Date.now()) {
  const reviews = Object.values(getProgress().reviews ?? {})
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
  return getProgress().savedMcqs
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
  } else {
    s.mistakes.unshift({ id, sel, ts: Date.now(), count: 1, revised: false, cat })
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
  return getProgress().mistakes
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
  return getProgress().activities.slice(0, n)
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

// ---------- Timer sessions ----------
export function saveTimerSession(sess: Omit<TimerSession, 'id' | 'ts'>) {
  const s = getProgress()
  s.timerSessions.unshift({ ...sess, id: Math.random().toString(36).slice(2), ts: Date.now() })
  if (s.timerSessions.length > 50) s.timerSessions.length = 50
  save(s)
}

export function getTimerSessions(): TimerSession[] {
  return getProgress().timerSessions
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
  const r = getProgress().fiveMin.find((f) => f.date === today)
  return r ? { score: r.score, total: r.total } : null
}
