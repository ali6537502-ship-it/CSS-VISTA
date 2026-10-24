import test from 'node:test'
import assert from 'node:assert/strict'
import { orderedTopicOptions } from '../src/features/topics/optionOrder.ts'

test('display reordering preserves canonical choices and leaves source/history arrays unchanged', () => {
  const question = Object.freeze({
    id: 'maritime-learn-01',
    options: Object.freeze(['First', 'Second', 'Third', 'Fourth']) as unknown as string[],
  })
  const displayed = orderedTopicOptions(question)
  assert.deepEqual(displayed.map((option) => option.index).sort(), [0, 1, 2, 3])
  for (const { option, index } of displayed) assert.equal(option, question.options[index])
  assert.deepEqual(question.options, ['First', 'Second', 'Third', 'Fourth'])
  // Choosing a displayed label sends its original index; saved feedback uses that same index.
  for (let correct = 0; correct < 4; correct++) {
    const selected = displayed.find(({ option }) => option === question.options[correct])!
    assert.equal(selected.index, correct)
    assert.equal(question.options[selected.index], question.options[correct])
  }
})

test('public question content gives stable ordering after rerender, retry or device change', () => {
  const question = { id: 'topic-check-01', options: ['A', 'B', 'C', 'D'] }
  const initial = orderedTopicOptions(question)
  assert.deepEqual(orderedTopicOptions(question), initial)
  assert.deepEqual(orderedTopicOptions(JSON.parse(JSON.stringify(question))), initial)
  assert.deepEqual(orderedTopicOptions({ ...question, options: [...question.options] }), initial)
})

test('a repeated authoring answer sequence does not remain a repeated display sequence', () => {
  const canonical = [1, 3, 0, 2]
  const positions: number[] = []
  const permutations = new Set<string>()
  for (let i = 0; i < 100; i++) {
    const question = { id: `course-learn-${i}`, options: ['A', 'B', 'C', 'D'] }
    const displayed = orderedTopicOptions(question)
    positions.push(displayed.findIndex(({ index }) => index === canonical[i % 4]))
    permutations.add(displayed.map(({ index }) => index).join(','))
  }
  assert.ok(permutations.size >= 16, 'Question orders should vary across the bank')
  assert.ok(positions.filter((value, i) => value === canonical[i % 4]).length < 50)
  for (let choice = 0; choice < 4; choice++) assert.ok(positions.includes(choice))
})

test('position-dependent legacy options retain their original meaning', () => {
  for (const last of ['All of the above', 'None of the above', 'Both A and C', 'Option B only']) {
    const options = ['First', 'Second', 'Third', last]
    assert.deepEqual(orderedTopicOptions({ id: 'legacy-question', options }).map(({ option }) => option), options)
  }
})
