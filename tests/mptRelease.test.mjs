import test from 'node:test'
import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import { loadReviewedBank, buildRelease, readCheckedInRelease, resolveRelease, auditResolved, seriesHash } from '../scripts/mpt/release-lib.mjs'
import { loadServedArchive, stemHash } from '../scripts/mpt/served-archive.mjs'
import { buildSeries, optionOrder, ReleaseError, surfaceTemplate } from '../src/data/mpt/selector.ts'
import { MPT_BROAD_STRUCTURE, MPT_SUBTOPIC_RANGES, MPT_GROUP_RANGES } from '../src/data/mpt/blueprint.ts'
import { MPT_SUBTOPICS } from '../src/data/mpt/taxonomy.ts'
import { MPT_PATTERN_PROFILE } from '../src/data/mpt/patternProfile.ts'
import { RELEASE } from '../scripts/mpt/release-config.mjs'

const { bank, problems } = loadReviewedBank()
const release = readCheckedInRelease()
const resolved = resolveRelease(release, bank)

test('the reviewed bank has no editorial or structural problems', () => {
  assert.deepEqual(problems.slice(0, 10), [])
})

test('the checked-in series is exactly what the reviewed bank rebuilds', () => {
  const rebuilt = buildRelease(bank)
  assert.equal(rebuilt.bank_fingerprint, release.bank_fingerprint)
  assert.equal(isDeepStrictEqual(rebuilt.papers, release.papers), true)
  assert.equal(seriesHash(resolved), release.series)
})

test('all 40 official papers pass every paper-level and series-level gate', () => {
  assert.equal(resolved.length, RELEASE.papers)
  const result = auditResolved(resolved, bank)
  assert.deepEqual(result.failures.slice(0, 20), [])
  for (const paper of resolved) assert.equal(paper.length, 200)
})

test('no question already served in an earlier MPT series is reused', () => {
  const served = loadServedArchive()
  for (const q of resolved.flat()) {
    const stem = q.meta.passage_id ? q.q.slice(q.q.lastIndexOf('\nQuestion: ') + 11) : q.q
    assert.equal(served.stems.has(stemHash(stem)), false, q.id)
    assert.equal(served.ids.has(q.id), false, q.id)
  }
})

test('every exported answer matches the verified bank answer and every item is explained', () => {
  const byId = new Map(bank.questions.map((q) => [q.id, q]))
  for (const q of resolved.flat()) {
    const source = byId.get(q.id)
    assert.equal(q.o[q.a], source.o[source.a], q.id)
    assert.equal(source.verified, true)
    assert.ok(q.e.length >= 12, q.id)
  }
})

test('time-sensitive items carry a source, an event date inside the window and a verification date', () => {
  for (const q of resolved.flat().filter((x) => x.meta.time_sensitive)) {
    assert.match(q.meta.source_url, /^https:\/\//, q.id)
    assert.match(q.meta.last_verified, /^\d{4}-\d{2}-\d{2}$/)
    if (q.meta.subtopic === 'ca.recent') {
      assert.ok(q.meta.event_date >= RELEASE.currentWindow.from && q.meta.event_date <= RELEASE.currentWindow.to, q.id)
    }
  }
})

test('blueprint keeps official, observed and internal rules apart and is feasible', () => {
  for (const range of Object.values(MPT_BROAD_STRUCTURE)) assert.equal(range.basis, 'official')
  for (const [section, ranges] of Object.entries(MPT_SUBTOPIC_RANGES)) {
    const size = MPT_BROAD_STRUCTURE[section].min
    const min = Object.values(ranges).reduce((n, r) => n + r.min, 0)
    const max = Object.values(ranges).reduce((n, r) => n + r.max, 0)
    assert.ok(min <= size && max >= size, section)
    for (const [sub, r] of Object.entries(ranges)) {
      assert.equal(MPT_SUBTOPICS[sub]?.section, section, sub)
      assert.ok(['observed', 'internal'].includes(r.basis) && r.note.length > 5, sub)
    }
  }
  const gk = MPT_GROUP_RANGES.generalKnowledge
  assert.ok(gk.current.min >= 10, 'Current Affairs is a substantial share of GK, as in the recorded papers')
})

test('pattern profile covers the four recorded papers question by question', () => {
  const byYear = (y) => MPT_PATTERN_PROFILE.filter((r) => r.year === y).length
  assert.equal(byYear(2022), 200)
  assert.equal(byYear(2023), 125)
  assert.equal(byYear(2024), 188)
  assert.equal(byYear(2025), 179)
})

// --- selector behaviour on a small synthetic bank --------------------------------

function tinyBank() {
  const questions = []
  let n = 0
  const words = 'amber basalt cobalt dune ember fjord granite harbor iris jade kelp lagoon meadow nectar onyx prairie quartz reef saffron tundra'.split(' ')
  for (const [section, ranges] of Object.entries(MPT_SUBTOPIC_RANGES)) {
    for (const [sub, r] of Object.entries(ranges)) {
      if (sub === 'eng.comprehension') continue
      for (let i = 0; i < Math.max(4, r.max * 3); i += 1) {
        n += 1
        const tag = `${words[n % 20]} ${words[(n >> 2) % 20]} ${words[(n >> 4) % 20]} ${words[(n >> 6) % 20]}`
        questions.push({
          id: `mpt-t-${n}`, section, subject: MPT_SUBTOPICS[sub].subject, subtopic: sub, pattern_family: `${sub}.f${i}`, concept: `c${n}`,
          difficulty: [1, 2, 2, 3, 1, 2][i % 6], source_type: 'authored', past_paper_year: null, verified: true,
          q: `${sub} ${tag} question?`, o: [`a ${tag}`, `b ${tag}`, `c ${tag}`, `d ${tag}`], a: i % 4, explanation: 'Explanation text here.',
          source_url: sub === 'ca.recent' ? 'https://example.org/' : null, time_sensitive: sub === 'ca.recent', event_date: sub === 'ca.recent' ? '2026-06-01' : null,
          last_verified: '2026-09-26', quality_grade: 'A', mpt_relevance: 'core',
        })
      }
    }
  }
  const passages = [1, 2].map((p) => ({ id: `mpt-psg-t${p}`, title: `P${p}`, text: 'word '.repeat(200), genre: 'x', words: 200 }))
  for (const p of passages) for (let k = 0; k < 6; k += 1) {
    n += 1
    questions.push({ ...questions[0], id: `mpt-t-${n}`, section: 'English', subject: 'English', subtopic: 'eng.comprehension', pattern_family: `eng.comprehension.k${k}`, concept: `c${n}`, q: `${p.id} q${k}?`, o: ['w', 'x', 'y', 'z'].map((s) => `${s}${n}`), passage_id: p.id, difficulty: [1, 2, 2, 2, 3, 1][k] })
  }
  return { questions, passages }
}

test('selector is deterministic and honours the opening rule', () => {
  const b = tinyBank()
  const opts = { papers: 1, seed: 'tiny', currentWindow: { from: '2025-09-01', to: '2026-09-26' } }
  const one = buildSeries(b, opts)
  assert.equal(isDeepStrictEqual(one, buildSeries(b, opts)), true)
  const byId = new Map(b.questions.map((q) => [q.id, q]))
  const first = one[0].questions.slice(0, 5).map((s) => byId.get(s.id).difficulty)
  assert.equal(first.includes(3), false)
  assert.equal(one[0].questions.length, 200)
})

test('selector fails the release rather than lowering the standard', () => {
  const b = tinyBank()
  b.questions = b.questions.filter((q) => q.subtopic !== 'isl.governance')
  assert.throws(() => buildSeries(b, { papers: 1, seed: 'tiny', currentWindow: { from: '2025-09-01', to: '2026-09-26' } }), ReleaseError)
})

test('stale Current Affairs is never eligible', () => {
  const b = tinyBank()
  for (const q of b.questions) if (q.subtopic === 'ca.recent') q.event_date = '2024-01-01'
  assert.throws(() => buildSeries(b, { papers: 1, seed: 'tiny', currentWindow: { from: '2025-09-01', to: '2026-09-26' } }), /ca\.recent/)
})

test('numeric templates are masked and numeric options are ordered naturally', () => {
  assert.equal(surfaceTemplate('A train 120 m long passes a pole in 6 s.'), surfaceTemplate('A train 150 m long passes a pole in 9 s.'))
  const order = optionOrder({ id: 'x', o: ['30', '10', '40', '20'], a: 0 }, 'seed')
  assert.deepEqual(order.map((k) => ['30', '10', '40', '20'][k]), ['10', '20', '30', '40'])
})
