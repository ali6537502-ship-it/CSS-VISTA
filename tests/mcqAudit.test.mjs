import test from 'node:test'
import assert from 'node:assert/strict'
import { mcqQuestionIdentity } from '../scripts/lib/mcq-question-identity.mjs'

test('generic instruction stems with different choices remain distinct educational questions', () => {
  const first = { q: 'Choose the sentence that is grammatically correct:', o: ['Neither boy has finished.', 'Neither boys has finished.', 'Neither boy have finished.', 'Neither boys have finish.'], a: 0 }
  const second = { q: first.q, o: ['She has lived here for five years.', 'She has lived here since five years.', 'She lives here since five years.', 'She living here five years.'], a: 0 }
  assert.notEqual(mcqQuestionIdentity(first), mcqQuestionIdentity(second))
})

test('duplicates are detected despite whitespace, capitalization and answer-choice reordering', () => {
  const first = { q: 'Which is a prime number?', o: ['Four', 'Five', 'Six', 'Eight'], a: 1 }
  const duplicate = { q: '  WHICH is a prime  number? ', o: ['eight', 'six', 'five', 'four'], a: 2 }
  assert.equal(mcqQuestionIdentity(first), mcqQuestionIdentity(duplicate))
  assert.notEqual(mcqQuestionIdentity(first), mcqQuestionIdentity({ ...first, a: 0 }), 'conflicting answer keys must not be silently treated as interchangeable')
})

test('historical Islamiyat quarantine rejects original source rows while preserving reused IDs', async () => {
  const { isRejectedIslamiyatSourceRecord, rejectedIslamiyatImport } = await import('../scripts/lib/islamiyat-import-quarantine.mjs')
  const { readFileSync } = await import('node:fs')
  const original = {
    id: 'islamic-gk-8449',
    q: 'First Muslim interpreter of Quran in English is _____?',
    o: ['Abdul Kalam Azad', 'Anwar Saddat', 'Shah Waliullah', 'Abdul Hakeem'],
    a: 3,
    s: 'Islamic General Knowledge',
  }
  assert.equal(rejectedIslamiyatImport.count, 2257)
  assert.equal(Object.keys(rejectedIslamiyatImport.records).length, 2257)
  assert.equal(isRejectedIslamiyatSourceRecord(original), true, 'original source row must still fail the guard')
  assert.equal(isRejectedIslamiyatSourceRecord({ ...original, o: [...original.o].reverse(), a: 0 }), true, 'reordering choices must not bypass quarantine')
  const laterImport = JSON.parse(readFileSync(new URL('../src/data/mcq-shards/cat-islamic-gk-10.json', import.meta.url), 'utf8'))
    .find(question => question.id === original.id)
  assert.ok(laterImport)
  assert.notEqual(laterImport.q, original.q, '28 September import reused the ID for different source content')
  assert.equal(isRejectedIslamiyatSourceRecord(laterImport), false, 'numeric ID reuse alone must not delete later content')
})

test('cross-ID historical content matches remain explicit editorial review candidates', async () => {
  const { isRejectedIslamiyatSourceRecord, islamiyatCrossIdReviewCandidates } = await import('../scripts/lib/islamiyat-import-quarantine.mjs')
  const { readFileSync } = await import('node:fs')
  const rows = JSON.parse(readFileSync(new URL('../src/data/mcq-shards/cat-islamic-gk-10.json', import.meta.url), 'utf8'))
  const shared = rows.find(question => question.id === 'islamic-gk-8462')
  assert.ok(shared)
  assert.equal(isRejectedIslamiyatSourceRecord(shared), false, 'separate import provenance is not an answer-quality verdict')
  assert.deepEqual(islamiyatCrossIdReviewCandidates([shared]), [{ currentId: 'islamic-gk-8462', originalIds: ['islamic-gk-8450'] }])
})
