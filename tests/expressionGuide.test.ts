import test from 'node:test'
import assert from 'node:assert/strict'
import { canReview, emptyWork, findLesson, lessons, readGuideWork } from '../src/features/expression-guide/lessons.ts'

test('eight original lessons provide a connected path from complete clauses to paragraph revision', () => {
 assert.equal(lessons.length, 8)
 assert.equal(new Set(lessons.map(lesson => lesson.id)).size, 8)
 assert.equal(lessons[0].id, 'complete-thought')
 assert.equal(lessons.at(-1)?.id, 'revision')
 assert.equal(findLesson('not-a-lesson').id, lessons[0].id)
 for (const lesson of lessons) {
  assert.equal(lesson.teaching.length, 4)
  assert.ok(lesson.teaching.every(paragraph => paragraph.length > 100))
  assert.ok(lesson.answer >= 0 && lesson.answer < lesson.options.length)
  assert.equal(lesson.checklist.length, 2)
  assert.ok(lesson.before !== lesson.after && lesson.feedback && lesson.explanation && lesson.task && lesson.sample)
 }
})
test('saved work is bounded and only recognised lesson IDs are loaded', () => {
 const restored = readGuideWork(JSON.stringify({
  'complete-thought': { draft: 'a'.repeat(13000), revision: 'A revision.', checks: [true, 'true'], reviewed: 'yes' },
  unknown: { draft: 'not part of the guide' },
  revision: { draft: 42, checks: null },
 }))
 assert.equal(restored['complete-thought'].draft.length, 12000)
 assert.deepEqual(restored['complete-thought'].checks, [true, false])
 assert.equal(restored['complete-thought'].reviewed, false)
 assert.equal(restored.unknown, undefined)
 assert.equal(restored.revision.draft, '')
 assert.deepEqual(readGuideWork(null), {})
 for (const raw of ['{', 'null', '[]', '42']) assert.throws(() => readGuideWork(raw))
})
test('self-review needs both writing stages and both explicit checks', () => {
 assert.equal(canReview(emptyWork()), false)
 assert.equal(canReview({ ...emptyWork(), draft: 'A draft', revision: 'A revision', checks: [true, false] }), false)
 assert.equal(canReview({ ...emptyWork(), draft: '  ', revision: 'A revision', checks: [true, true] }), false)
 assert.equal(canReview({ ...emptyWork(), draft: 'A draft', revision: 'A revision', checks: [true, true] }), true)
})
