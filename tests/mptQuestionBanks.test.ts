import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { diversifyQuestions } from '../src/lib/questionDiversity.ts'
import { matchesMptBankTopic, mptQuestionBanks, mptQuestionBankPath } from '../src/data/mptQuestionBanks.ts'

test('every MPT directory subject opens a full question-bank route', () => {
  const ids = [
    'english', 'vocabulary', 'grammar', 'correction', 'abilities', 'reasoning',
    'science', 'gk', 'current', 'pakistan', 'islamiat', 'urdu', 'geography',
    'history', 'organisations',
  ]
  ids.forEach((id) => {
    assert.ok(mptQuestionBanks[id])
    const expectedPath = id === 'science' ? '/gk/cat/everyday-science' : `/mpt/bank/${id}`
    assert.equal(mptQuestionBankPath(id), expectedPath)
  })
})

test('Everyday Science opens its dedicated source bank', () => {
  assert.deepEqual(mptQuestionBanks.science?.centralSlugs, ['everyday-science'])
  assert.equal(mptQuestionBankPath('science'), '/gk/cat/everyday-science')
})

test('question diversity keeps every source item while separating topics', () => {
  const source = [
    { q: 'Choose the correct form: Example A', s: 'Grammar' },
    { q: 'Choose the correct form: Example B', s: 'Grammar' },
    { q: 'Capital of country A?', s: 'Geography' },
    { q: 'Capital of country B?', s: 'Geography' },
    { q: 'An event occurred in 1947?', s: 'History' },
    { q: 'An event occurred in 1956?', s: 'History' },
  ]
  const diversified = diversifyQuestions(source)
  assert.equal(diversified.length, source.length)
  assert.deepEqual(new Set(diversified), new Set(source))
  assert.deepEqual(diversified.slice(0, 3).map((question) => question.s), ['Grammar', 'Geography', 'History'])
})

test('reasoning bank accepts only its mapped General Science and Ability topics', () => {
  const definition = mptQuestionBanks.reasoning!
  assert.equal(matchesMptBankTopic('Deductive reasoning', definition), true)
  assert.equal(matchesMptBankTopic('Universe and astronomy', definition), false)

  const source = JSON.parse(readFileSync(new URL('../public/css-subject-mcqs/general-science-and-ability.json', import.meta.url), 'utf8')) as Array<{ topic?: string }>
  assert.equal(source.filter((question) => matchesMptBankTopic(question.topic, definition)).length, definition.expectedCount)
})

test('general abilities count is checked against its dedicated central bank', () => {
  assert.deepEqual(mptQuestionBanks.abilities.centralSlugs, ['general-ability'])
  const index = JSON.parse(readFileSync(new URL('../public/mcq/index.json', import.meta.url), 'utf8'))
  const category = index.categories.find((item: { slug: string }) => item.slug === 'general-ability')
  assert.ok(category)
  assert.equal(category.count, mptQuestionBanks.abilities.expectedCount)
})
