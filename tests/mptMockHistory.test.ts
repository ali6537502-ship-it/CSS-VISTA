import test from 'node:test'
import assert from 'node:assert/strict'
import { mptQuestionStem, previouslySeenMptQuestions, readMptPaper, saveMptPaper } from '../src/lib/mptMockHistory.ts'

test('a student keeps the same paper and its stems are excluded from future sessions', () => {
  const data = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) },
  })
  const paper = [{ id: 'ability-1', q: 'What is 20% of 80?', o: ['12', '16', '20', '24'], a: 1 }]
  saveMptPaper('Student One', '2026-09-22', paper)
  assert.deepEqual(readMptPaper('Student One', '2026-09-22'), paper)
  assert.equal(previouslySeenMptQuestions('Student One').has('ability-1'), true)
  assert.equal(previouslySeenMptQuestions('student   one').has(`stem:${mptQuestionStem('What is 20% of 80?')}`), true)
  assert.equal(previouslySeenMptQuestions('Student Two').size, 0)
  saveMptPaper('Student One', '2026-09-22', [{ ...paper[0], id: 'replacement' }])
  assert.deepEqual(readMptPaper('Student One', '2026-09-22'), paper)
})
