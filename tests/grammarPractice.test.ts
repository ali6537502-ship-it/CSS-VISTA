import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeCourse, readCourse, courseKey, emptySession } from '../src/features/grammar/state.ts'
import { answerRound, coveredDays, createRound, revisionIds, scheduleReview, weakAreas, type PracticeDay } from '../src/features/grammar/practice.ts'

// Mechanical fixtures only; production sessions select existing authored course content.
const days: PracticeDay[] = [1, 2, 3, 4].map(day => ({ day,
  warmUp: Array.from({ length: 4 }, (_, i) => ({ id: `d${day}w${i}`, options: ['a', 'b'], answer: 0 })),
  drill: Array.from({ length: 12 }, (_, i) => ({ id: `d${day}q${i}`, options: ['a', 'b'], answer: 0 })),
  corrections: [{ id: `d${day}c0` }], examples: [], checklist: [],
}))
const bank = new Map(days.flatMap(d => [...d.warmUp, ...d.drill].map(q => [q.id, q] as const)))
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const at = 1000000000, DAY = 86400000
const empty = () => normalizeCourse({}, days)

test('targeted beginners use authored warm-up and drill, while covered lessons use drill only', () => {
  const state = empty(), round = createRound(state, days, 'targeted', 2, at, uuid(1))!
  assert.equal(round.ids.length, 10); assert.equal(new Set(round.ids).size, 10)
  assert.ok(round.ids.every(id => /^d2/.test(id))); assert.ok(round.ids.slice(0, 4).every(id => /^d2w/.test(id)))
  state.completed = [2]
  assert.ok(createRound(state, days, 'targeted', 2, at, uuid(2))!.ids.every(id => /^d2q/.test(id)))
  assert.equal(createRound(state, days, 'targeted', 99, at, uuid(3)), null)
})
test('mixed practice requires three genuinely covered lessons and balances source days', () => {
  const state = empty(); state.completed = [1, 2]
  assert.equal(createRound(state, days, 'mixed', 1, at, uuid(4)), null)
  state.sessions['3'] = emptySession()
  state.sessions['3'].first = Object.fromEntries(days[2].drill.map(q => [q.id, 0]))
  assert.deepEqual(coveredDays(state, days), [1, 2, 3])
  const round = createRound(state, days, 'mixed', 1, at, uuid(5))!, counts = [1, 2, 3].map(d => round.ids.filter(id => id.startsWith(`d${d}q`)).length)
  assert.equal(round.ids.length, 10); assert.ok(round.ids.every(id => /^d[123]q/.test(id)))
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 1)
})
test('revision selects due and legacy-missed questions only, oldest first; future reviews remain unavailable', () => {
  const state = empty(); state.mistakes = ['d2q1']; state.reviews = { d1q1: { lastAt: at - DAY, dueAt: at, streak: 1, lapses: 0 }, d3q1: { lastAt: at, dueAt: at + DAY, streak: 1, lapses: 0 } }
  assert.deepEqual(revisionIds(state, at), ['d2q1', 'd1q1'])
  assert.deepEqual(createRound(state, days, 'revision', 1, at, uuid(6))!.ids, ['d2q1', 'd1q1'])
  assert.equal(createRound(empty(), days, 'revision', 1, at, uuid(7)), null)
})
test('spaced successes advance 1/3/7/14/30 days, early retries do not, and failure resets', () => {
  let review = scheduleReview(undefined, false, at)
  assert.equal(review.lapses, 1); assert.equal(review.streak, 0); assert.equal(review.dueAt, at + DAY)
  assert.deepEqual(scheduleReview(review, true, at + 1), review)
  for (const interval of [1, 3, 7, 14, 30]) { review = scheduleReview(review, true, review.dueAt); assert.equal(review.dueAt - review.lastAt, interval * DAY) }
  const failed = scheduleReview(review, false, review.dueAt)
  assert.equal(failed.streak, 0); assert.equal(failed.lapses, 2); assert.equal(failed.dueAt - failed.lastAt, DAY)
  assert.equal(scheduleReview(failed, false, failed.lastAt + 1).lapses, 2)
  assert.deepEqual(scheduleReview(failed, true, failed.lastAt - 1), failed)
  const firstCorrect = scheduleReview(undefined, true, at)
  assert.equal(scheduleReview(firstCorrect, false, at + 1).lapses, 1)
})
test('retry never changes first-response score or review, and completed history is written once', () => {
  let state = empty(); state.currentDay = 4; state.notes['4'] = 'Private note'; state.completed = [4]
  state.lab = createRound(state, days, 'targeted', 1, at, uuid(8))!
  const missed = state.lab.ids[0]
  state = answerRound(state, bank, 1, at + 1)
  const review = state.reviews[missed]
  state.lab!.answers = {}; state = answerRound(state, bank, 0, at + 2)
  assert.equal(state.lab!.first[missed], 1); assert.equal(state.lab!.answers[missed], 0); assert.deepEqual(state.reviews[missed], review)
  for (let position = 1; position < state.lab!.ids.length; position++) { state.lab!.position = position; state = answerRound(state, bank, 0, at + 10 + position) }
  assert.ok(state.lab!.finishedAt); assert.equal(state.labHistory.length, 1)
  assert.equal(state.labHistory[0].ids.filter(id => state.labHistory[0].first[id] === bank.get(id)!.answer).length, 9)
  const restored = normalizeCourse(JSON.parse(JSON.stringify(state)), days)
  assert.deepEqual(restored.labHistory, state.labHistory); assert.equal(restored.labHistory[0].day, 1)
  restored.lab!.position = 0; delete restored.lab!.answers[missed]
  state = answerRound(restored, bank, 0, at + DAY * 2)
  assert.equal(state.labHistory.length, 1); assert.deepEqual(state.reviews[missed], review)
  assert.equal(state.currentDay, 4); assert.equal(state.notes['4'], 'Private note'); assert.deepEqual(state.completed, [4]); assert.deepEqual(state.attempts, [])
})
test('saved cursor, answers, drafts, reveals and reviews survive refresh only in their owner namespace', () => {
  const state = empty(); state.lab = createRound(state, days, 'targeted', 2, at, uuid(9))!
  state.lab.position = 3; state.lab.drafts.d2c0 = 'My correction'; state.lab.revealed = ['d2c0']
  const next = answerRound(state, bank, 0, at + 1), entries = { [courseKey('A')]: JSON.stringify(next) }
  const storage = { getItem: (key: string) => entries[key as keyof typeof entries] ?? null }
  const restored = readCourse(storage, 'A', days)
  assert.deepEqual(restored.lab, next.lab); assert.deepEqual(restored.reviews, next.reviews)
  assert.equal(readCourse(storage, 'B', days).lab, null); assert.equal(readCourse(storage, undefined, days).lab, null)
})
test('malformed rounds, unknown questions, options and schedules are rejected without losing legacy work', () => {
  const round = createRound(empty(), days, 'targeted', 1, at, uuid(10))!
  for (const bad of [{ ...round, ids: ['unknown'] }, { ...round, ids: [round.ids[0], round.ids[0]] }, { ...round, day: 2 }, { ...round, id: 'bad' }, { ...round, startedAt: -1 }, { ...round, startedAt: 8640000000000001 }]) {
    const state = normalizeCourse({ lab: bad, notes: { '1': 'Preserve' }, completed: [1] }, days)
    assert.equal(state.lab, null); assert.equal(state.notes['1'], 'Preserve'); assert.deepEqual(state.completed, [1])
  }
  const normalized = normalizeCourse({ lab: { ...round, first: { [round.ids[0]]: 9 }, answers: { [round.ids[0]]: -1 }, position: 100, drafts: { unknown: 'private', d1c0: 'a'.repeat(21000) }, revealed: ['unknown', 'd1c0'], finishedAt: at + 1 }, reviews: { unknown: { lastAt: at, dueAt: at + DAY, streak: 1, lapses: 0 }, d1q1: { lastAt: at, dueAt: at - 1, streak: 1, lapses: 0 } } }, days)
  assert.deepEqual(normalized.reviews, {}); assert.deepEqual(normalized.lab!.first, {}); assert.deepEqual(normalized.lab!.answers, {})
  assert.equal(normalized.lab!.position, 0); assert.equal(normalized.lab!.finishedAt, undefined); assert.equal(normalized.lab!.drafts.d1c0.length, 20000); assert.deepEqual(normalized.lab!.revealed, ['d1c0'])
  assert.equal(answerRound(normalized, bank, 9, at), normalized)
})
test('weak-question counts require two spaced successes, retaining mistake history', () => {
  const state = empty(); state.mistakes = ['d1q1', 'd2q1']
  state.reviews.d1q1 = { lastAt: at, dueAt: at + DAY, streak: 1, lapses: 1 }
  assert.deepEqual(weakAreas(state, days), [{ day: 1, missed: 1 }, { day: 2, missed: 1 }])
  state.reviews.d1q1 = scheduleReview(state.reviews.d1q1, true, at + DAY)
  assert.deepEqual(weakAreas(state, days), [{ day: 2, missed: 1 }]); assert.ok(state.mistakes.includes('d1q1'))
})
test('new rounds prefer lesser-used authored questions without promising a repetition-free bank', () => {
  const state = empty(); state.completed = [1]
  state.labHistory = [{ id: uuid(11), mode: 'targeted', day: 1, at, ids: days[0].drill.slice(0, 10).map(q => q.id), first: {} }]
  const round = createRound(state, days, 'targeted', 1, at + 1, uuid(12))!
  assert.deepEqual(new Set(round.ids.slice(0, 2)), new Set(['d1q10', 'd1q11']))
})
