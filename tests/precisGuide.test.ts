import test from 'node:test'
import assert from 'node:assert/strict'
import {
  availableGuideChapters,
  guideCards,
  guidePath,
  guidePaths,
  guideQuestion,
  guideStep,
} from '../src/features/precis/guideModel.ts'
import type { Chapter, Overview } from '../src/features/precis/api.ts'

test('VISTA Guide routes are unique, source-bound and exclude the handbook answer-key chapters', () => {
  assert.equal(new Set(guidePaths.map((p) => p.id)).size, guidePaths.length)
  const forbidden = new Set(['2', '18', '20', '23', '24'])
  for (const path of guidePaths) {
    assert.ok(path.chapters.length)
    assert.equal(new Set(path.chapters).size, path.chapters.length)
    assert.ok(path.chapters.every((chapter) => !forbidden.has(chapter)))
  }
  assert.equal(guidePath('missing').id, 'start')
})

test('A guide path can display only chapters present in the approved server catalogue', () => {
  const source: Chapter[] = [
    { id: '4', title: 'Central idea', blocks: [{ type: 'paragraph', text: 'Original paragraph.' }] },
    { id: '7', title: 'Compression', blocks: [] },
    { id: '18', title: 'Worked examples', blocks: [] },
  ]
  assert.deepEqual(
    availableGuideChapters(guidePath('idea'), source).map((chapter) => chapter.id),
    ['4'],
  )
  assert.deepEqual(
    availableGuideChapters(guidePath('compression'), source).map((chapter) => chapter.id),
    ['7'],
  )
  assert.equal(availableGuideChapters(guidePath('writing'), source).length, 0)
})

test('Micro-lessons preserve every source body, table and associated heading unchanged', () => {
  const source: Chapter = {
    id: '4',
    title: 'Source chapter',
    blocks: [
      { type: 'heading', text: 'Central idea' },
      { type: 'paragraph', text: 'The exact chapter wording is retained.' },
      { type: 'bullet', text: 'Do not change the claim.' },
      { type: 'table', rows: [['Heading', 'Meaning'], ['Value', 'Exact phrase']] },
      { type: 'heading', text: 'Empty heading' },
      { type: 'paragraph', text: 'Second chapter passage.' },
    ],
  }
  const cards = guideCards(source)
  assert.equal(cards.length, 4)
  assert.deepEqual(cards.map((c) => c.label), [
    'Central idea', 'Central idea', 'Central idea', 'Empty heading',
  ])
  assert.equal(cards[0].block.type, 'paragraph')
  assert.equal(cards[1].block.type, 'bullet')
  assert.deepEqual(cards[2].block, source.blocks[3])
  assert.deepEqual(cards[3].block, source.blocks[5])
})

test('Guide checks use original authored questions without transmitting an answer index', () => {
  const data = {
    catalog: {
      chapters: [],
      passages: [],
      source_sha256: 'handbook',
      questions: [{
        id: 'reviewed-q',
        skill: 'selection',
        prompt: 'An approved question',
        options: ['Option one', 'Option two'],
        hint: 'A reviewed hint',
      }],
    },
  } as unknown as Overview
  const result = guideQuestion(data, guidePath('selection'), '6')
  assert.equal(result?.id, 'reviewed-q')
  assert.equal(result && Object.hasOwn(result, 'answer'), false)
  assert.equal(guideQuestion(data, guidePath('logic'), '9'), undefined)
})

test('Invalid URL steps cannot produce negative, fractional or out-of-range screens', () => {
  assert.equal(guideStep(null, 8), 0)
  assert.equal(guideStep('3', 8), 3)
  for (const input of ['-1', '9', '1.1', 'junk', 'Infinity'])
    assert.equal(guideStep(input, 8), 0)
})
