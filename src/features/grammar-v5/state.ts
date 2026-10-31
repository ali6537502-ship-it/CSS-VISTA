import { preparationDeviceKey } from '../../lib/preparationStorage.ts'
import { CURRICULUM_VERSION, type Catalog, type QuestionIndex } from './types.ts'
import { scheduleReview, type Review } from '../grammar/practice.ts'

export interface Answer { first: number; firstAt: number; latest: number; latestAt: number; exposures: number }
export interface StudyState {
  curriculumVersion: string; completed: string[]; studied: string[]; answers: Record<string, Answer>
  drafts: Record<string, string>; selfReviews: Record<string, 'needs-work' | 'developing' | 'meets-rubric'>
  revealed: string[]; notes: Record<string, string>; bookmarks: string[]; reviews: Record<string, Review>
  cursor: { day: number; section: string; item: string }; checks: Record<string, number[]>
}
export function stateKey(user?: string, attempt?: string) { const key = `cssvista:grammar-course:v5:${user ? `account:${user}${attempt ? `:attempt:${attempt}` : ''}` : 'guest'}`; return user ? preparationDeviceKey(key, user) : key }
export const blankState = (): StudyState => ({ curriculumVersion: CURRICULUM_VERSION, completed: [], studied: [], answers: {}, drafts: {}, selfReviews: {}, revealed: [], notes: {}, bookmarks: [], reviews: {}, cursor: { day: 1, section: 'orientation', item: '' }, checks: {} })
const record = (x: unknown): Record<string, unknown> => x && typeof x === 'object' && !Array.isArray(x) ? x as Record<string, unknown> : {}
const list = (x: unknown): unknown[] => Array.isArray(x) ? x : []
const integer = (x: unknown, min: number, max: number): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x >= min && x <= max
/** Reject another edition; never reinterpret historic lesson numbers or answer indices. */
export function normalizeStudy(value: unknown, catalog: Catalog): StudyState {
  const s = blankState(), r = record(value)
  if (r.curriculumVersion !== CURRICULUM_VERSION) return s
  const days = new Set(catalog.days.map(d => d.id)), concepts = new Set(catalog.concepts.map(c => c.id)), items = new Map(catalog.items.map(q => [q.id, q]))
  const strings = (v: unknown, valid: (id: string) => boolean) => [...new Set(list(v).filter((id): id is string => typeof id === 'string' && valid(id)))]
  s.completed = strings(r.completed, id => days.has(id)); s.studied = strings(r.studied, id => concepts.has(id))
  s.bookmarks = strings(r.bookmarks, id => concepts.has(id)); s.revealed = strings(r.revealed, id => items.has(id))
  for (const [id, stored] of Object.entries(record(r.answers))) {
    const q = items.get(id), a = record(stored)
    if (q?.type === 'objective' && integer(a.first, 0, q.options! - 1) && integer(a.latest, 0, q.options! - 1) && integer(a.firstAt, 1, 8640000000000000) && integer(a.latestAt, a.firstAt, 8640000000000000) && integer(a.exposures, 1, 100000)) s.answers[id] = a as unknown as Answer
  }
  for (const [id, text] of Object.entries(record(r.drafts))) if (items.get(id)?.type === 'response' && typeof text === 'string') s.drafts[id] = text
  for (const [id, text] of Object.entries(record(r.notes))) if ((concepts.has(id) || days.has(id)) && typeof text === 'string') s.notes[id] = text
  for (const [id, rating] of Object.entries(record(r.selfReviews))) if (items.get(id)?.type === 'response' && ['needs-work', 'developing', 'meets-rubric'].includes(String(rating))) s.selfReviews[id] = rating as StudyState['selfReviews'][string]
  for (const [id, stored] of Object.entries(record(r.reviews))) {
    const v = record(stored)
    if (items.get(id)?.type === 'objective' && integer(v.lastAt, 1, 8640000000000000) && integer(v.dueAt, v.lastAt, 8640000000000000) && integer(v.streak, 0, 5) && integer(v.lapses, 0, 10000)) s.reviews[id] = v as unknown as Review
  }
  const c = record(r.cursor)
  if (integer(c.day, 1, 30)) s.cursor.day = c.day
  if (typeof c.section === 'string' && (concepts.has(c.section) || ['orientation', 'questions', 'corrections', 'transformations', 'writing', 'recall', 'finish'].includes(c.section))) s.cursor.section = c.section
  if (typeof c.item === 'string' && items.has(c.item)) s.cursor.item = c.item
  for (const [id, checks] of Object.entries(record(r.checks))) if (days.has(id)) s.checks[id] = [...new Set(list(checks).filter((n): n is number => integer(n, 0, 20)))]
  return s
}
export function answerStudy(state: StudyState, q: QuestionIndex, selected: number, now: number): StudyState {
  if (q.type !== 'objective' || !integer(selected, 0, q.options! - 1) || !integer(now, 1, 8640000000000000)) return state
  const old = state.answers[q.id]
  if (old && now < old.latestAt) return state
  return { ...state, answers: { ...state.answers, [q.id]: { first: old?.first ?? selected, firstAt: old?.firstAt ?? now, latest: selected, latestAt: now, exposures: Math.min(100000, (old?.exposures ?? 0) + 1) } }, reviews: { ...state.reviews, [q.id]: scheduleReview(state.reviews[q.id], selected === q.answer, now) } }
}
export function conceptProfile(state: StudyState, catalog: Catalog, now: number) {
  const byConcept = new Map<string, QuestionIndex[]>()
  for (const item of catalog.items) { const pool = byConcept.get(item.conceptId) ?? []; pool.push(item); byConcept.set(item.conceptId, pool) }
  return catalog.concepts.map(c => {
    const related = byConcept.get(c.id) ?? [], qs = related.filter(q => q.type === 'objective'), seen = qs.filter(q => state.answers[q.id]), correct = seen.filter(q => state.answers[q.id].first === q.answer).length
    const unresolved = seen.filter(q => (state.answers[q.id].first !== q.answer || state.reviews[q.id]?.lapses > 0) && (state.reviews[q.id]?.streak ?? 0) < 2).length
    const retained = seen.filter(q => { const r = state.reviews[q.id]; return r && r.streak - (state.answers[q.id].first === q.answer && !r.lapses ? 1 : 0) >= 2 }).length, due = seen.filter(q => state.reviews[q.id]?.dueAt <= now).length
    const written = related.filter(q => q.type === 'response'), drafts = written.filter(q => state.drafts[q.id]?.trim()).length
    return { ...c, seen: seen.length, available: qs.length, correct, unresolved, retained, due, drafts, selfReviewed: written.filter(q => state.selfReviews[q.id]).length, status: unresolved ? 'Needs review' : retained >= 3 ? 'Retention evidence' : seen.length || drafts ? 'Practising' : state.studied.includes(c.id) ? 'Studied; practice pending' : 'Not studied' }
  })
}
/** Copy only the exact current owner's legacy keys. Old values are never changed. */
export function backupLegacy(storage: Pick<Storage, 'getItem' | 'setItem'>, user?: string, attempt?: string) {
  const key = `cssvista:grammar-course:v4:${user ? `account:${user}${attempt ? `:attempt:${attempt}` : ''}` : 'guest'}`
  const backup = `${stateKey(user, attempt)}:legacy-backup`
  if (storage.getItem(backup) !== null) return
  const current = storage.getItem(key), sourceKey = current !== null ? key : !user ? 'cssvista:grammar-course:v3' : key
  const value = current ?? (!user ? storage.getItem(sourceKey) : null)
  if (value !== null) storage.setItem(backup, JSON.stringify({ sourceKey, value, savedAt: Date.now(), reason: 'Preserved before opening the reconstructed curriculum; not new mastery evidence.' }))
}
