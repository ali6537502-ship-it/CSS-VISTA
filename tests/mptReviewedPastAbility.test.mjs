import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { reviewedMptPastAbilityQuestions } from '../src/data/mptReviewedPastAbility.ts'

// Solutions checked against the statements and working, including the source
// entries whose correct answer used to be hidden under "None of these".
const solved = {
  248: '800 ml', 268: '23', 271: '2 cm', 273: '54', 274: '5',
  277: '20 and 60 degrees', 278: '700', 279: '16 years', 280: '698',
  283: '84', 285: '2/3', 286: '160', 287: '108', 288: '50',
  290: '25', 291: '7, 8', 293: '1 and 10', 294: 'Rs. 34', 295: '3',
  296: '$1.48', 298: '4 cm', 299: '900 litres', 300: '84m',
  301: '48', 302: '175', 303: '20m', 304: '77',
  306: 'iii, i, ii, iv', 307: '80', 309: '9', 310: '21, 24',
  311: '6 and 30', 312: '26', 313: '40,000', 314: '13',
  315: '4', 317: 'Rs. 2000', 319: '3.6 km',
  320: '198 sq cm', 321: '19', 323: '16',
}

test('reviewed past-paper mathematics has checked keys and no archived mock stems', () => {
  const source = JSON.parse(readFileSync('src/data/mcq-shards/cat-mpt-past-papers-0.json', 'utf8'))
  const archived = JSON.parse(readFileSync('data-archive/mpt-legacy-fingerprints.json', 'utf8'))
  const old = new Set(archived.entries.map(([, fingerprint]) => fingerprint))
  const questions = reviewedMptPastAbilityQuestions(source)
  assert.equal(questions.length, Object.keys(solved).length)
  const structures = new Set()
  for (const q of questions) {
    const id = Number(q.id.split('-').at(-1))
    assert.equal(q.o[q.a], solved[id], `Answer for ${id}`)
    assert.equal(q.o.length, 4)
    assert.equal(new Set(q.o.map((option) => option.trim().toLowerCase())).size, 4)
    assert(q.e?.trim())
    const stem = q.q.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
    assert(!old.has(createHash('sha256').update(stem).digest('hex')), `Previously served stem ${id}`)
    const structure = q.q.toLowerCase().replace(/\d+(?:[.,]\d+)*/g, '#').replace(/\s+/g, ' ').trim()
    assert(!structures.has(structure), `Repeated numeric form ${id}`)
    structures.add(structure)
  }
})
