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

test('a replacement series reserves legacy questions without reopening legacy papers', () => {
  const data = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) },
  })
  const oldPaper = [{ id: 'prior-series-1', q: 'An earlier MPT question?', o: ['A', 'B', 'C', 'D'], a: 0 }]
  data.set('cssvista:mpt-mock-papers:v1:student one', JSON.stringify({ version: 1, papers: { '2026-09-22-15': oldPaper } }))
  assert.equal(readMptPaper('Student One', '2026-09-22-15'), null)
  assert.equal(previouslySeenMptQuestions('Student One').has('prior-series-1'), true)
  assert.equal(previouslySeenMptQuestions('Student One').has(`stem:${mptQuestionStem(oldPaper[0].q)}`), true)
  const replacement = [{ ...oldPaper[0], id: 'new-series-1', q: 'A different MPT question?' }]
  saveMptPaper('Student One', '2026-09-22-15', replacement)
  assert.deepEqual(readMptPaper('Student One', '2026-09-22-15'), replacement)
  assert.deepEqual(JSON.parse(data.get('cssvista:mpt-mock-papers:v1:student one')!).papers['2026-09-22-15'], oldPaper)
})
