import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { reviewedMptPastEnglishQuestions } from '../src/data/mptReviewedPastEnglish.ts'

const checkedKeys = {
  384: 'Acute', 385: 'Virtue', 386: 'Praise', 387: 'Anxious', 388: 'Amiable',
  389: 'Agitation', 395: 'Vilify', 397: 'Permanent', 399: 'Practical',
  401: 'The', 409: 'To',
  403: 'Neither of the boys has done his homework.',
  404: 'She has been living here for five years.',
  407: 'To', 408: 'On', 410: 'Of, For', 413: 'Complex sentence',
  414: 'Of', 415: 'In', 418: 'To', 419: 'As to',
  424: 'Our friend has an apartment in East London',
  425: 'The doctor told him to give up smoking',
  428: 'Trees help to create peaceful surroundings',
  430: 'French wines are not available here',
  431: 'I have spoken to him already', 434: 'My friends and I went to the movie.',
  432: 'An Adverb of place', 433: 'Gerund',
  435: 'Because I like pizza',
  436: 'The movie was scarier than I expected',
  437: 'To be angry or resentful.',
  440: 'To deliver a stern warning or reprimand.',
  441: "To obstruct or hinder someone's plans.",
  445: 'A short nap or brief period of sleep',
  462: 'Arable', 464: 'Coerced', 465: 'Sedition', 466: 'Coveted',
  493: 'Perplexed', 497: 'Watchful',
}

test('selected English past-paper items have reviewed, distinct answer choices', () => {
  const source = JSON.parse(readFileSync('src/data/mcq-shards/cat-mpt-past-papers-0.json', 'utf8'))
  const legacy = JSON.parse(readFileSync('data-archive/mpt-legacy-fingerprints.json', 'utf8'))
  const oldStems = new Set(legacy.entries.map(([, fingerprint]) => fingerprint))
  const questions = reviewedMptPastEnglishQuestions(source)
  assert.equal(questions.length, Object.keys(checkedKeys).length)
  for (const q of questions) {
    const id = Number(q.id.split('-').at(-1))
    assert.equal(q.o[q.a], checkedKeys[id], `Answer for ${id}`)
    assert.equal(q.o.length, 4)
    assert.equal(new Set(q.o.map((o) => o.trim().toLowerCase())).size, 4)
    assert(q.e?.trim())
    const stem = q.q.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
    assert(!oldStems.has(createHash('sha256').update(stem).digest('hex')), `Previously served question ${id}`)
  }
})
