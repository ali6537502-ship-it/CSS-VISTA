import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { originalMptAbilityQuestions } from '../src/data/mptOriginalAbility.ts'

test('original ability questions have distinct stems, reasoning structures and answer options', () => {
  const archived = JSON.parse(readFileSync('data-archive/mpt-legacy-fingerprints.json', 'utf8'))
  const archivedIds = new Set(archived.entries.map(([id]) => id))
  const archivedStems = new Set(archived.entries.map(([, fingerprint]) => fingerprint))
  const ids = new Set()
  const stems = new Set()
  const numericStructures = new Set()
  for (const question of originalMptAbilityQuestions) {
    const stem = question.q.toLowerCase().normalize('NFKD')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
    const fingerprint = createHash('sha256').update(stem).digest('hex')
    const structure = question.q.toLowerCase().replace(/\d+(?:[.,]\d+)*/g, '#').replace(/\s+/g, ' ').trim()
    assert(!ids.has(question.id) && !archivedIds.has(question.id), question.id)
    assert(!stems.has(stem) && !archivedStems.has(fingerprint), question.id)
    assert(!numericStructures.has(structure), question.id)
    assert.equal(question.o.length, 4, question.id)
    assert.equal(new Set(question.o.map((option) => option.toLowerCase().trim())).size, 4, question.id)
    assert(question.o[question.a] && question.e?.trim(), question.id)
    ids.add(question.id)
    stems.add(stem)
    numericStructures.add(structure)
  }
  assert.equal(ids.size, 90)
})
