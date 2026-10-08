import type { CourseState, DayDefinition } from './state.ts'

export type PracticeMode = 'targeted' | 'mixed' | 'revision'
export interface Review { dueAt: number; lastAt: number; streak: number; lapses: number }
export interface LabRound {
  id: string; mode: PracticeMode; day?: number; ids: string[]; position: number
  answers: Record<string, number>; first: Record<string, number>
  drafts: Record<string, string>; revealed: string[]; startedAt: number; finishedAt?: number
}
export interface LabResult { id: string; mode: PracticeMode; day?: number; at: number; ids: string[]; first: Record<string, number> }
export interface PracticeQuestion { id: string; options: string[]; answer: number }
export interface PracticeDay extends DayDefinition { warmUp: PracticeQuestion[]; drill: PracticeQuestion[] }
const DAY = 86400000
const MAX_TIME = 8640000000000000
const INTERVALS = [1, 3, 7, 14, 30]
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
function list(value: unknown): unknown[] { return Array.isArray(value) ? value : [] }
function number(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max }
function time(value: unknown, min = 1): value is number { return number(value, min, MAX_TIME) }
function mode(value: unknown): value is PracticeMode { return value === 'targeted' || value === 'mixed' || value === 'revision' }

/** Additive v4 fields. Unowned legacy course state is still handled by the existing loader. */
export function normalizePractice(value: unknown, days: DayDefinition[]): Pick<CourseState, 'lab' | 'labHistory' | 'reviews'> {
  const raw = record(value), questions = new Map(days.flatMap(d => [...d.warmUp, ...d.drill].map(q => [q.id, q] as const)))
  const corrections = new Set(days.flatMap(d => d.corrections.map(c => c.id)))
  const answerMap = (value: unknown, ids: string[]) => {
    const raw = record(value), clean: Record<string, number> = {}
    for (const id of ids) { const option = raw[id]; if (number(option, 0, questions.get(id)!.options.length - 1)) clean[id] = option }
    return clean
  }
  function round(value: unknown): LabRound | null {
    const r = record(value), ids = list(r.ids).filter((id): id is string => typeof id === 'string' && questions.has(id))
    if (typeof r.id !== 'string' || !UUID.test(r.id) || !mode(r.mode) || !time(r.startedAt) || !ids.length || ids.length > 10 || new Set(ids).size !== ids.length || ids.length !== list(r.ids).length) return null
    const target = days.find(d => d.day === r.day)
    if (r.mode === 'targeted' && (!target || ids.some(id => ![...target.warmUp, ...target.drill].some(q => q.id === id)))) return null
    const drafts: Record<string, string> = {}
    for (const [id, text] of Object.entries(record(r.drafts))) if (corrections.has(id) && typeof text === 'string') drafts[id] = text.slice(0, 20000)
    const first = answerMap(r.first, ids)
    return { id: r.id, mode: r.mode, ...(target && r.mode === 'targeted' ? { day: target.day } : {}), ids,
      position: number(r.position, 0, ids.length - 1) ? r.position : 0,
      answers: answerMap(r.answers, ids), first, drafts,
      revealed: [...new Set(list(r.revealed).filter((id): id is string => typeof id === 'string' && corrections.has(id)))], startedAt: r.startedAt,
      ...(time(r.finishedAt, r.startedAt) && ids.every(id => first[id] !== undefined) ? { finishedAt: r.finishedAt } : {}),
    }
  }
  const reviews: Record<string, Review> = {}
  for (const [id, stored] of Object.entries(record(raw.reviews))) {
    const r = record(stored)
    if (questions.has(id) && time(r.lastAt) && time(r.dueAt, r.lastAt) && number(r.streak, 0, 5) && number(r.lapses, 0, 10000)) reviews[id] = { lastAt: r.lastAt, dueAt: r.dueAt, streak: r.streak, lapses: r.lapses }
  }
  const seen = new Set<string>(), labHistory: LabResult[] = []
  for (const entry of list(raw.labHistory).slice(-100)) {
    const h = record(entry), normalized = round({ ...h, startedAt: h.at })
    if (!normalized || seen.has(normalized.id) || !normalized.ids.every(id => normalized.first[id] !== undefined)) continue
    seen.add(normalized.id); labHistory.push({ id: normalized.id, mode: normalized.mode, ...(normalized.day ? { day: normalized.day } : {}), at: normalized.startedAt, ids: normalized.ids, first: normalized.first })
  }
  return { lab: round(raw.lab), labHistory: labHistory.slice(-50), reviews }
}

/** A same-day retry never earns another spaced-review success or postpones a due review. */
export function scheduleReview(previous: Review | undefined, correct: boolean, at: number): Review {
  if (previous && at < previous.lastAt) return previous
  if (correct && previous && (at - previous.lastAt < DAY || at < previous.dueAt)) return previous
  if (!correct) return { lastAt: at, dueAt: Math.min(MAX_TIME, at + DAY), streak: 0, lapses: Math.min(10000, (previous?.lapses ?? 0) + (previous && previous.streak === 0 && previous.lapses > 0 && at - previous.lastAt < DAY ? 0 : 1)) }
  const streak = Math.min(5, (previous?.streak ?? 0) + 1)
  return { lastAt: at, dueAt: Math.min(MAX_TIME, at + INTERVALS[streak - 1] * DAY), streak, lapses: previous?.lapses ?? 0 }
}
export function coveredDays(state: CourseState, days: DayDefinition[]): number[] {
  return days.filter(d => state.completed.includes(d.day) || d.drill.every(q => state.sessions[String(d.day)]?.first[q.id] !== undefined)).map(d => d.day)
}
export function revisionIds(state: CourseState, at: number): string[] {
  return [...new Set([...state.mistakes.filter(id => !state.reviews[id]), ...Object.keys(state.reviews).filter(id => state.reviews[id].dueAt <= at)])]
    .sort((a, b) => (state.reviews[a]?.dueAt ?? 0) - (state.reviews[b]?.dueAt ?? 0) || a.localeCompare(b))
}
export function weakAreas(state: CourseState, days: PracticeDay[]) {
  return days.map(day => {
    const missed = [...day.warmUp, ...day.drill].filter(q => (state.mistakes.includes(q.id) || state.reviews[q.id]?.lapses > 0) && (state.reviews[q.id]?.streak ?? 0) < 2).length
    return { day: day.day, missed }
  }).filter(d => d.missed > 0).sort((a, b) => b.missed - a.missed || a.day - b.day)
}
function hash(text: string) { let n = 2166136261; for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0 }
export function createRound(state: CourseState, days: PracticeDay[], selected: PracticeMode, targetDay: number, at: number, id: string): LabRound | null {
  if (!UUID.test(id) || !time(at)) return null
  const covered = new Set(coveredDays(state, days))
  if (selected === 'mixed' && covered.size < 3) return null
  const usage = new Map<string, number>()
  for (const round of state.labHistory) for (const q of round.ids) usage.set(q, (usage.get(q) ?? 0) + 1)
  const due = new Set(revisionIds(state, at)), weak = new Set([...state.mistakes, ...Object.keys(state.reviews).filter(q => state.reviews[q].lapses > 0)].filter(q => (state.reviews[q]?.streak ?? 0) < 2))
  const pool = days.flatMap(day => {
    if (selected === 'targeted' && day.day !== targetDay || selected === 'mixed' && !covered.has(day.day)) return []
    const questions = selected === 'mixed' || covered.has(day.day) && selected === 'targeted' ? day.drill : [...day.warmUp, ...day.drill]
    return questions.filter(q => selected !== 'revision' || due.has(q.id)).map(q => ({ id: q.id, day: day.day, warm: day.warmUp.some(w => w.id === q.id) }))
  })
  pool.sort((a, b) => {
    const priority = (q: typeof a) => selected === 'revision' ? state.reviews[q.id]?.dueAt ?? 0 : weak.has(q.id) ? -2 : selected === 'targeted' && q.warm ? -1 : 0
    return priority(a) - priority(b) || (usage.get(a.id) ?? 0) - (usage.get(b.id) ?? 0) || hash(`${id}:${a.id}`) - hash(`${id}:${b.id}`)
  })
  const ids: string[] = [], perDay = new Map<number, number>()
  while (pool.length && ids.length < 10) {
    let index = 0
    if (selected === 'mixed') { const minimum = Math.min(...pool.map(q => perDay.get(q.day) ?? 0)); index = pool.findIndex(q => (perDay.get(q.day) ?? 0) === minimum) }
    const [q] = pool.splice(index, 1); ids.push(q.id); perDay.set(q.day, (perDay.get(q.day) ?? 0) + 1)
  }
  return ids.length ? { id, mode: selected, ...(selected === 'targeted' ? { day: targetDay } : {}), ids, position: 0, answers: {}, first: {}, drafts: {}, revealed: [], startedAt: at } : null
}
export function answerRound(state: CourseState, questions: Map<string, PracticeQuestion>, option: number, at: number): CourseState {
  const round = state.lab, id = round?.ids[round.position], question = id ? questions.get(id) : undefined
  if (!round || !id || !question || round.answers[id] !== undefined || !number(option, 0, question.options.length - 1) || !time(at, round.startedAt)) return state
  const isFirst = round.first[id] === undefined, first = isFirst ? { ...round.first, [id]: option } : round.first
  const finished = round.ids.every(q => first[q] !== undefined)
  const updated = { ...round, first, answers: { ...round.answers, [id]: option }, ...(finished && !round.finishedAt ? { finishedAt: at } : {}) }
  const result = finished && !state.labHistory.some(h => h.id === round.id) ? [{ id: round.id, mode: round.mode, ...(round.day ? { day: round.day } : {}), at, ids: round.ids, first }] : []
  const correct = question.answer === option
  return { ...state, lab: updated, labHistory: [...state.labHistory, ...result].slice(-50),
    mistakes: !correct && !state.mistakes.includes(id) ? [...state.mistakes, id] : state.mistakes,
    reviews: isFirst ? { ...state.reviews, [id]: scheduleReview(state.reviews[id], correct, at) } : state.reviews,
  }
}
