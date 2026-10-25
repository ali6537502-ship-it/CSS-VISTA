import type { StudyScheduleTask } from '../../lib/store.ts'
import type { ReviewSchedule } from '../../lib/progress.ts'

export const plannerViews = ['today', 'week', 'syllabus', 'revision', 'goals', 'settings'] as const
export type PlannerView = typeof plannerViews[number]
export function plannerHref(path: string, params: URLSearchParams, view: PlannerView, hash = '') {
  const destination = ['/account/tasks', '/account/plan', '/study-planner'].includes(path) ? path : '/study-planner'
  const next = new URLSearchParams(params); next.set('view', view)
  return `${destination}?${next.toString()}${hash}`
}
export function plannerView(path: string, params: URLSearchParams, hash = ''): PlannerView {
  const requested = params.get('view')
  if (plannerViews.includes(requested as PlannerView)) return requested as PlannerView
  if (params.has('subject') || params.has('topic') || params.has('unit')) return 'syllabus'
  return path === '/account/plan' || hash === '#plan-management' ? 'settings' : 'today'
}
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function validDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  return dayKey(new Date(year, month - 1, day, 12)) === value
}
export function shiftDay(key: string, amount: number) {
  const [year, month, day] = key.split('-').map(Number)
  return dayKey(new Date(year, month - 1, day + amount, 12))
}
export function weekDays(key: string) {
  const date = new Date(`${key}T12:00:00`)
  const first = shiftDay(key, -((date.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => shiftDay(first, i))
}
export function readableDay(key: string, short = false) {
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { weekday: short ? 'short' : 'long', month: short ? 'short' : 'long', day: 'numeric' })
}
export function taskOrder(a: StudyScheduleTask, b: StudyScheduleTask) {
  return `${a.date} ${a.time || '24:00'}`.localeCompare(`${b.date} ${b.time || '24:00'}`) || a.id.localeCompare(b.id)
}
/** Estimates include all scheduled statuses; overlapping timed sessions exclude completed work. */
export function dayWorkload(tasks: StudyScheduleTask[], date: string, dailyHours?: number) {
  const rows = tasks.filter(task => task.date === date)
  const minutes = rows.reduce((sum, task) => sum + task.minutes, 0)
  const capacity = dailyHours && Number.isFinite(dailyHours) && dailyHours > 0 ? dailyHours * 60 : null
  const timed = rows.filter(task => task.status !== 'completed' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(task.time || ''))
    .map(task => ({ task, start: Number(task.time!.slice(0, 2)) * 60 + Number(task.time!.slice(3)) }))
    .sort((a, b) => a.start - b.start)
  const overlaps = new Set<string>()
  for (let i = 0; i < timed.length; i++) for (let j = i + 1; j < timed.length; j++) {
    if (timed[j].start < timed[i].start + timed[i].task.minutes) { overlaps.add(timed[i].task.id); overlaps.add(timed[j].task.id) }
  }
  return { rows, minutes, capacity, overBy: capacity === null ? 0 : Math.max(0, minutes - capacity), overlaps }
}
/** A completed review has genuine lastReviewedAt evidence; it is not an absent due record. */
export function revisionGroups(reviews: ReviewSchedule[], now: number) {
  const valid = reviews.filter(review => Number.isFinite(review.dueAt))
  return {
    due: valid.filter(review => review.dueAt <= now).sort((a, b) => a.dueAt - b.dueAt || a.id.localeCompare(b.id)),
    upcoming: valid.filter(review => review.dueAt > now).sort((a, b) => a.dueAt - b.dueAt || a.id.localeCompare(b.id)),
    reviewed: valid.filter(review => review.lastReviewedAt > 0).sort((a, b) => b.lastReviewedAt - a.lastReviewedAt || a.id.localeCompare(b.id)),
  }
}
