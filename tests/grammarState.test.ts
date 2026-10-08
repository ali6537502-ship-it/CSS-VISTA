import assert from 'node:assert/strict'
import { test } from 'node:test'
import { courseKey, LEGACY_KEY, normalizeCourse, readCourse, type DayDefinition } from '../src/features/grammar/state.ts'

const days: DayDefinition[] = [1, 2].map(day => ({ day, warmUp: [{ id: `d${day}w1`, options: ['a', 'b'] }], drill: [{ id: `d${day}q1`, options: ['a', 'b'] }], corrections: [{ id: `d${day}c1` }], examples: [{}], checklist: [{}] }))
const legacy = { completed: [1], scores: { '1': 75 }, notes: { '1': 'Existing private note' }, mistakes: ['d1q1'], currentDay: 2 }
const storage = (entries: Record<string, string>) => ({ getItem: (key: string) => entries[key] ?? null })

test('guest fallback preserves legacy history without changing its key', () => {
  const entries = { [LEGACY_KEY]: JSON.stringify(legacy) }, loaded = readCourse(storage(entries), undefined, days)
  assert.deepEqual(loaded.completed, [1]); assert.equal(loaded.currentDay, 2); assert.equal(loaded.notes['1'], legacy.notes['1'])
  assert.equal(entries[LEGACY_KEY], JSON.stringify(legacy)); assert.equal(loaded.attempts.length, 0)
  assert.equal(normalizeCourse({ notes: { '1': 'a'.repeat(25000) } }, days).notes['1'].length, 25000)
})
test('accounts cannot adopt guest, legacy or other-account writing', () => {
  const entries = { [LEGACY_KEY]: JSON.stringify(legacy), [courseKey()]: JSON.stringify(legacy), [courseKey('A')]: JSON.stringify(legacy) }
  assert.equal(readCourse(storage(entries), 'A', days).notes['1'], legacy.notes['1'])
  assert.deepEqual(readCourse(storage(entries), 'B', days).notes, {})
  assert.notEqual(courseKey('A'), courseKey('B'))
})
test('saved step, answers, first responses, model reveals and writing survive refresh', () => {
  const input = { ...legacy, sessions: { '1': { step: 5, position: { corrections: 0 }, warmUp: { d1w1: 1 }, drill: { d1q1: 1 }, first: { d1q1: 0 }, drafts: { d1c1: 'My own correction.' }, writing: 'My own application.', revealed: ['d1c1', 'example:0'], checks: [0], recorded: true } }, attempts: [{ day: 1, at: 100, correct: 0, total: 1 }] }
  const a = normalizeCourse(input, days), b = normalizeCourse(JSON.parse(JSON.stringify(a)), days)
  assert.deepEqual(a, b); assert.equal(b.sessions['1'].first.d1q1, 0); assert.equal(b.sessions['1'].drill.d1q1, 1)
  assert.equal(b.sessions['1'].recorded, true); assert.equal(b.attempts[0].correct, 0)
})
test('corrupt/out-of-range entries cannot create completion, hidden questions or broken navigation', () => {
  const loaded = normalizeCourse({ currentDay: 99, completed: [1, 1, -1, 3, '2'], scores: { '1': 900 }, mistakes: ['unknown', 'd1q1', 'd1q1'], sessions: { '1': { step: 99, position: { drill: 100 }, first: { d1q1: -1 }, warmUp: { d1w1: '1' }, drafts: { unknown: 'leak' }, checks: [99], revealed: ['unknown'] } }, attempts: [{ day: 1, at: 100, correct: 100, total: 1 }] }, days)
  assert.equal(loaded.currentDay, 1); assert.deepEqual(loaded.completed, [1]); assert.deepEqual(loaded.scores, {})
  assert.deepEqual(loaded.mistakes, ['d1q1']); assert.equal(loaded.sessions['1'].step, 0)
  assert.equal(loaded.sessions['1'].position.drill, 0); assert.deepEqual(loaded.sessions['1'].first, {})
  assert.deepEqual(loaded.sessions['1'].warmUp, {}); assert.deepEqual(loaded.sessions['1'].drafts, {})
  assert.deepEqual(loaded.sessions['1'].checks, []); assert.deepEqual(loaded.sessions['1'].revealed, []); assert.deepEqual(loaded.attempts, [])
})
test('unavailable storage and malformed JSON leave the public curriculum usable', () => {
  assert.equal(readCourse({ getItem() { throw new Error('blocked') } }, undefined, days).currentDay, 1)
  assert.equal(readCourse(storage({ [courseKey()]: '{bad' }), undefined, days).currentDay, 1)
  assert.deepEqual(normalizeCourse(null, days).completed, [])
})
