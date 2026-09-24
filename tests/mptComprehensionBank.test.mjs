import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mptComprehensionQuestions } from '../src/data/mptEnglishComprehension.ts'

test('a 34-session series has separate, complete comprehension question pairs', () => {
  const stems = new Set()
  const ids = new Set()
  for (const pair of mptComprehensionQuestions.slice(0, 34)) {
    assert.equal(pair.length, 2)
    assert.equal(pair[0].q.split('\n\n')[0], pair[1].q.split('\n\n')[0])
    for (const question of pair) {
      const stem = question.q.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
      assert(!ids.has(question.id), question.id)
      assert(!stems.has(stem), question.id)
      ids.add(question.id)
      stems.add(stem)
      assert.equal(question.o.length, 4)
      assert.equal(new Set(question.o.map((option) => option.trim().toLowerCase())).size, 4)
      assert(Number.isInteger(question.a) && question.a >= 0 && question.a < 4)
      assert(question.e?.trim(), `Missing explanation for ${question.id}`)
    }
  }
  assert.equal(ids.size, 68)
})
