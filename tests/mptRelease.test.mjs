import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'
import { loadReviewedBank, buildRelease, readCheckedInRelease, resolveRelease, auditResolved, seriesHash, heldBankIds, loadLiveReview } from '../scripts/mpt/release-lib.mjs'
import { loadLiveSeries, challengingLimit } from '../scripts/mpt/repair-live-series.mjs'
import { liveDefects } from '../scripts/mpt/live-review-rules.mjs'
import { loadServedArchive, stemHash } from '../scripts/mpt/served-archive.mjs'
import { canonical } from '../scripts/mpt/bank-lib.mjs'
import { buildSeries, optionOrder, ReleaseError, surfaceTemplate } from '../src/data/mpt/selector.ts'
import { MPT_BROAD_STRUCTURE, MPT_OFFICIAL_HEADINGS } from '../src/data/mpt/blueprint.ts'
import { MPT_SUBTOPICS, MPT_SECTION_ORDER } from '../src/data/mpt/taxonomy.ts'
import { MPT_PATTERN_PROFILE } from '../src/data/mpt/patternProfile.ts'
import { RELEASE } from '../scripts/mpt/release-config.mjs'

const { bank, problems } = loadReviewedBank()
const release = readCheckedInRelease()
const resolved = resolveRelease(release, bank)
const live = loadLiveSeries()

test('the reviewed bank has no editorial or structural problems', () => {
  assert.deepEqual(problems.slice(0, 10), [])
})

test('the checked-in series is exactly what repairing the live series rebuilds', () => {
  const rebuilt = buildRelease(bank)
  assert.equal(rebuilt.bank_fingerprint, release.bank_fingerprint)
  assert.equal(rebuilt.live_fingerprint, release.live_fingerprint)
  assert.equal(isDeepStrictEqual(rebuilt.papers, release.papers), true)
  assert.equal(isDeepStrictEqual(rebuilt.kept, release.kept), true)
  assert.equal(seriesHash(resolved), release.series)
})

test('only the remaining mocks get papers, none extra', () => {
  assert.equal(RELEASE.papers, RELEASE.lastLivePaper - RELEASE.firstLivePaper + 1)
  assert.equal(resolved.length, RELEASE.papers)
  const planned = /CSSV_MPT_PLANNED_MOCKS_DEFAULT = (\d+);/.exec(readFileSync('public/api/_mpt_core.php', 'utf8'))
  assert.equal(Number(planned?.[1]), RELEASE.lastLivePaper, 'the scheduler stops at the last planned mock')
  release.papers.forEach((p, i) => assert.equal(p.origin.paper, RELEASE.firstLivePaper + i))
})

test('every repaired paper passes every paper-level and series-level gate', () => {
  const result = auditResolved(resolved, bank)
  assert.deepEqual(result.failures.slice(0, 20), [])
  for (const paper of resolved) assert.equal(paper.length, 200)
})

test('kept questions are the live questions verbatim, in their own paper, and defect-free', () => {
  release.papers.forEach((paper, i) => {
    const livePaper = live.papers[paper.origin.paper - 1]
    const liveIds = new Map(livePaper.questions.map((q) => [q.id, q]))
    for (const s of paper.questions.filter((x) => x.src === 'live')) {
      const original = liveIds.get(s.id)
      assert.ok(original, `${s.id} is not in live paper ${paper.origin.paper}`)
      const out = resolved[i].find((q) => q.id === s.id)
      assert.equal(out.q, original.q)
      assert.deepEqual(out.o, original.o)
      assert.equal(out.a, original.a)
      assert.deepEqual(liveDefects({ ...original }, { servedStems: new Set(), seenStems: new Set(), gaTemplates: new Set() }), [], s.id)
    }
    // Every bank item fills a replaced slot of the same live paper (or is the passage).
    for (const s of paper.questions.filter((x) => x.src === 'bank')) {
      const q = bank.questions.find((b) => b.id === s.id)
      if (q.subtopic === 'eng.comprehension') continue
      assert.ok(liveIds.has(s.replaces), `${s.id} does not replace a question of live paper ${paper.origin.paper}`)
      assert.equal(paper.questions.some((x) => x.src === 'live' && x.id === s.replaces), false)
    }
  })
})

test('nothing from a held mock and no earlier-served bank question is reused', () => {
  const served = loadServedArchive()
  const held = live.papers.slice(0, RELEASE.firstLivePaper - 1).flatMap((p) => p.questions)
  const heldIds = new Set(held.map((q) => q.id))
  const heldStems = new Set(held.map((q) => canonical(q.q)))
  const heldBank = heldBankIds()
  assert.ok(heldBank.size > 0, 'bank questions sat in Mocks 5–8 are known')
  for (const q of resolved.flat()) {
    assert.equal(heldIds.has(q.id), false, q.id)
    assert.equal(heldBank.has(q.id), false, `${q.id} was already sat in a held mock`)
    if (!q.meta.passage_id) assert.equal(heldStems.has(canonical(q.q)), false, q.id)
    if (q.meta.origin === 'reviewed-bank') {
      const stem = q.meta.passage_id ? q.q.slice(q.q.lastIndexOf('\nQuestion: ') + 11) : q.q
      assert.equal(served.stems.has(stemHash(stem)), false, q.id)
      assert.equal(served.ids.has(q.id), false, q.id)
    }
  }
})

test('every kept live question was read and passed by the editor review and is explained', () => {
  const review = loadLiveReview()
  for (const q of resolved.flat().filter((x) => x.meta.origin === 'live-series')) {
    assert.ok(review.explain[q.id], `${q.id} was not passed by the editor review`)
    assert.equal(review.reject[q.id], undefined, q.id)
    assert.ok(q.e.trim().length >= 12, `${q.id} has no explanation`)
  }
  for (const id of Object.keys(review.reject)) assert.equal(release.kept[id], undefined, `${id} was rejected but is still kept`)
})

test('every bank answer matches the verified bank and every bank item is explained', () => {
  const byId = new Map(bank.questions.map((q) => [q.id, q]))
  for (const q of resolved.flat().filter((x) => x.meta.origin === 'reviewed-bank')) {
    const source = byId.get(q.id)
    assert.equal(q.o[q.a], source.o[source.a], q.id)
    assert.equal(source.verified, true)
    assert.ok(q.e.length >= 12, q.id)
  }
})

test('papers mix accessible, moderate and challenging items like the real MPT', () => {
  for (const paper of resolved) {
    const fresh = paper.filter((q) => q.meta.origin === 'reviewed-bank')
    const hard = (section) => fresh.filter((q) => q.section === section && q.meta.difficulty === 3).length
    assert.ok(hard('General Abilities') <= challengingLimit('General Abilities'), 'General Abilities stays SSC level')
    const share = (d) => fresh.filter((q) => q.meta.difficulty === d).length / fresh.length
    assert.ok(share(3) >= 0.1, `paper has only ${(share(3) * 100).toFixed(0)}% challenging items`)
    assert.ok(share(1) >= 0.2 && share(1) <= 0.45, `accessible share ${(share(1) * 100).toFixed(0)}%`)
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

test('the paper structure is the official FPSC one only', () => {
  for (const range of Object.values(MPT_BROAD_STRUCTURE)) assert.equal(range.basis, 'official')
  for (const section of MPT_SECTION_ORDER) assert.ok(MPT_OFFICIAL_HEADINGS[section].headings.length >= 1, section)
  for (const paper of resolved) {
    const gk = new Set(paper.filter((q) => q.section === 'General Knowledge').map((q) => q.meta.heading))
    for (const h of ['Everyday Science', 'Current Affairs', 'Pakistan Affairs']) assert.ok(gk.has(h), h)
    const ga = new Set(paper.filter((q) => q.section === 'General Abilities').map((q) => q.meta.heading))
    for (const h of ['Quantitative Ability', 'Reasoning']) assert.ok(ga.has(h), h)
  }
})

test('pattern profile covers the four recorded papers question by question', () => {
  const byYear = (y) => MPT_PATTERN_PROFILE.filter((r) => r.year === y).length
  assert.equal(byYear(2022), 200)
  assert.equal(byYear(2023), 125)
  assert.equal(byYear(2024), 188)
  assert.equal(byYear(2025), 179)
})

// --- reserve selector (for mocks the owner may add later) on a small synthetic bank ---

function tinyBank() {
  const questions = []
  let n = 0
  const words = 'amber basalt cobalt dune ember fjord granite harbor iris jade kelp lagoon meadow nectar onyx prairie quartz reef saffron tundra'.split(' ')
  for (const [sub, def] of Object.entries(MPT_SUBTOPICS)) {
    if (sub === 'eng.comprehension') continue
    for (let i = 0; i < 12; i += 1) {
      n += 1
      const tag = `${words[n % 20]} ${words[(n >> 2) % 20]} ${words[(n >> 4) % 20]} ${words[(n >> 6) % 20]}`
      questions.push({
        id: `mpt-t-${n}`, section: def.section, subject: def.subject, subtopic: sub, pattern_family: `${sub}.f${i}`, concept: `c${n}`,
        difficulty: [1, 2, 2, 1, 1, 2][i % 6], source_type: 'authored', past_paper_year: null, verified: true,
        q: `${sub} ${tag} question?`, o: [`a ${tag}`, `b ${tag}`, `c ${tag}`, `d ${tag}`], a: i % 4, explanation: 'Explanation text here.',
        source_url: sub === 'ca.recent' ? 'https://example.org/' : null, time_sensitive: sub === 'ca.recent', event_date: sub === 'ca.recent' ? '2026-06-01' : null,
        last_verified: '2026-09-26', quality_grade: 'A', mpt_relevance: 'core',
      })
    }
  }
  const passages = [1, 2].map((p) => ({ id: `mpt-psg-t${p}`, title: `P${p}`, text: 'word '.repeat(200), genre: 'x', words: 200 }))
  for (const p of passages) for (let k = 0; k < 6; k += 1) {
    n += 1
    questions.push({ ...questions[0], id: `mpt-t-${n}`, section: 'English', subject: 'English', subtopic: 'eng.comprehension', pattern_family: `eng.comprehension.k${k}`, concept: `c${n}`, q: `${p.id} q${k}?`, o: ['w', 'x', 'y', 'z'].map((s) => `${s}${n}`), passage_id: p.id, difficulty: [1, 2, 2, 2, 1, 1][k] })
  }
  return { questions, passages }
}
const opts = { papers: 1, seed: 'tiny', currentWindow: { from: '2025-09-01', to: '2026-09-26' } }

test('reserve selector is deterministic and fills the official sections', () => {
  const b = tinyBank()
  const one = buildSeries(b, opts)
  assert.equal(isDeepStrictEqual(one, buildSeries(b, opts)), true)
  assert.equal(one[0].questions.length, 200)
})

test('reserve selector fails rather than drop an official heading', () => {
  const b = tinyBank()
  b.questions = b.questions.filter((q) => q.subject !== 'Everyday Science')
  assert.throws(() => buildSeries(b, opts), ReleaseError)
})

test('stale Current Affairs is never eligible', () => {
  const b = tinyBank()
  for (const q of b.questions) if (q.subtopic === 'ca.recent') q.event_date = '2024-01-01'
  const byId = new Map(b.questions.map((q) => [q.id, q]))
  const paper = buildSeries(b, opts)[0]
  assert.equal(paper.questions.some((s) => byId.get(s.id).subtopic === 'ca.recent'), false)
})

test('numeric templates are masked and numeric options are ordered naturally', () => {
  assert.equal(surfaceTemplate('A train 120 m long passes a pole in 6 s.'), surfaceTemplate('A train 150 m long passes a pole in 9 s.'))
  const order = optionOrder({ id: 'x', o: ['30', '10', '40', '20'], a: 0 }, 'seed')
  assert.deepEqual(order.map((k) => ['30', '10', '40', '20'][k]), ['10', '20', '30', '40'])
})
