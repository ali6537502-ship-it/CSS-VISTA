import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

// Exercise the production account snapshot merge without changing the app build.
const source = readFileSync('src/lib/accountSync.ts', 'utf8')
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const exports = {}
new Function('exports', 'require', js)(exports, (path) => {
  if (path === './preparationStorage') return {} // Merge selectors do not read or mutate device storage.
  if (path === '@/lib/progressEvents') return { notifyProgressChanged: () => {} }
  throw new Error('Unexpected dependency ' + path)
})
const merge = exports.mergeProgressSnapshots
const key = 'cssvista:tool:gsa-tutor:v1'
const t0 = '2026-10-30T10:00:00.000Z'
const t1 = '2026-10-30T11:00:00.000Z'
const t2 = '2026-10-30T12:00:00.000Z'

test('newer cloud timetable is not overwritten by an older device', () => {
  const cloud = { [key]: { plan: {days: 60, startDate: '2026-10-30', changedAt: t2}, completed: {A: {at: t1}} } }
  const local = { [key]: { plan: {days: 8, startDate: '2026-10-30', changedAt: t0}, completed: {B: {at: t1}} } }
  const merged = merge(cloud, local)[key]
  assert.equal(merged.plan.days, 60)
  assert.deepEqual(Object.keys(merged.completed).sort(), ['A', 'B'])
  assert.equal(merge(local, cloud)[key].plan.days, 60)
})

test('a later completion resolves earlier revision even on a second device', () => {
  const cloud = { [key]: { revisit: {A: {at: t0, kind: 'question'}} } }
  const local = { [key]: { completed: {A: {at: t2, selfRating: 'gotit'}} } }
  assert.equal(merge(cloud, local)[key].revisit.A, undefined)
  assert.equal(merge(local, cloud)[key].revisit.A, undefined)
  const newerRevision = { [key]: {revisit: {A: {at: t2, kind: 'question'}}} }
  const oldCompletion = { [key]: {completed: {A: {at: t0, selfRating: 'gotit'}}} }
  assert.ok(merge(newerRevision, oldCompletion)[key].revisit.A)
})

test('bookmarks honour a later explicit removal and can be re-added', () => {
  const saved = { [key]: { bookmarks: {A: {at: t0}} } }
  const removed = { [key]: { bookmarkRemoved: {A: {at: t1}} } }
  const merged = merge(saved, removed)[key]
  assert.equal(merged.bookmarks.A, undefined)
  assert.ok(merged.bookmarkRemoved.A)
  const restored = merge({[key]:merged}, { [key]: {bookmarks: {A: {at: t2}}} })[key]
  assert.ok(restored.bookmarks.A)
  assert.equal(restored.bookmarkRemoved.A, undefined)
})

test('unrelated study records remain untouched by GSA merge policy', () => {
  const cloud = {'cssvista:progress:v1': {same: {value: 'old'}}, [key]: { plan: {days: 20, changedAt:t1} } }
  const local = {'cssvista:progress:v1': {same: {value: 'new'}}, [key]: { plan: {days: 30, changedAt:t0} } }
  const result = merge(cloud, local)
  assert.equal(result['cssvista:progress:v1'].same.value, 'new')
  assert.equal(result[key].plan.days, 20)
})
