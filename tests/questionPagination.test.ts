import test from 'node:test'
import assert from 'node:assert/strict'
import {
  QUESTIONS_PER_PAGE,
  clampQuestionPage,
  questionPageCount,
  questionPageForIndex,
  questionPageRange,
  sliceQuestionPage,
  smartQuestionPages,
} from '../src/lib/questionPagination.ts'

test('the global question page size remains ten', () => {
  assert.equal(QUESTIONS_PER_PAGE, 10)
})

for (const [size, expectedPages] of [[5, 1], [10, 1], [11, 2], [20, 2], [25, 3], [50, 5], [100, 10], [200, 20]] as const) {
  test(`${size} questions use ${expectedPages} page(s) with continuous ranges`, () => {
    const items = Array.from({ length: size }, (_, index) => index + 1)
    assert.equal(questionPageCount(size), expectedPages)
    const seen = Array.from({ length: expectedPages }, (_, index) => sliceQuestionPage(items, index + 1)).flat()
    assert.deepEqual(seen, items)
    const last = questionPageRange(expectedPages, size)
    assert.equal(last.end, size)
    assert.ok(last.end - last.start <= 10)
  })
}

test('question navigator indices resolve to the containing page', () => {
  assert.equal(questionPageForIndex(0), 1)
  assert.equal(questionPageForIndex(9), 1)
  assert.equal(questionPageForIndex(10), 2)
  assert.equal(questionPageForIndex(99), 10)
  assert.equal(questionPageForIndex(199), 20)
})

test('pages clamp safely and smart pagination retains first, last and nearby pages', () => {
  assert.equal(clampQuestionPage(0, 100), 1)
  assert.equal(clampQuestionPage(99, 100), 10)
  assert.deepEqual(smartQuestionPages(1, 20), [1, 2, 3, 4, 'ellipsis-end', 20])
  assert.deepEqual(smartQuestionPages(10, 20), [1, 'ellipsis-start', 9, 10, 11, 'ellipsis-end', 20])
  assert.deepEqual(smartQuestionPages(20, 20), [1, 'ellipsis-start', 17, 18, 19, 20])
})
