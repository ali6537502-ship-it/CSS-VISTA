// Builds, resolves and audits the official MPT series.
//
// Editorial release 3 repairs the live series instead of replacing it: the papers already
// frozen for the remaining mocks keep every sound question, and only defective slots are
// refilled from the reviewed bank (scripts/mpt/repair-live-series.mjs).
import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { loadBank, validateBank, canonical } from './bank-lib.mjs'
import { loadServedArchive, stemHash } from './served-archive.mjs'
import { RELEASE, SERIES_PATH, KEPT_PATH, REVIEW_PATH } from './release-config.mjs'
import { loadLiveSeries, repairLiveSeries, resolveRepairedPaper } from './repair-live-series.mjs'
import { auditRepairedSeries } from './repair-audit.mjs'
import { buildSeries, formatFamilies } from '../../src/data/mpt/selector.ts'
import { auditPaper } from './paper-audit.mjs'
import { resemblanceScores } from './resemblance.mjs'
import { MPT_SECTION_ORDER } from '../../src/data/mpt/taxonomy.ts'
import { questionFrame, MAX_FRAME_PER_PAPER } from './live-review-rules.mjs'
import { applyClarifications } from './clarifications.mjs'
import { auditReasoning } from './reasoning-audit.mjs'

export function loadReviewedBank() {
  const bank = loadBank()
  const { problems } = validateBank(bank)
  const strip = (row) => { const { __file, ...rest } = row; return rest }
  return { bank: { questions: bank.questions.map(strip), passages: bank.passages.map(strip) }, problems }
}

export function liveFingerprint(live) {
  return createHash('sha256').update(JSON.stringify(live.papers.map((p) => p.questions.map((q) => [q.id, q.q, q.o, q.a])))).digest('hex').slice(0, 16)
}

export function loadLiveReview() {
  return existsSync(REVIEW_PATH) ? JSON.parse(readFileSync(REVIEW_PATH, 'utf8')) : { reject: {}, explain: {} }
}

/** Bank questions already sat in held mocks of earlier releases. */
export function heldBankIds() {
  const ids = new Set()
  for (const { path, papers } of RELEASE.heldReleases ?? []) {
    const earlier = JSON.parse(readFileSync(path, 'utf8'))
    for (const paper of earlier.papers.slice(0, papers)) for (const q of paper.questions) if (q.src === 'bank') ids.add(q.id)
  }
  return ids
}

/** The repaired series: { release fields, papers, kept (id → live question), log }. */
export function buildRelease(bank, live = loadLiveSeries()) {
  const { papers, kept, log } = repairLiveSeries({
    live, bank, seed: RELEASE.seed, firstPaper: RELEASE.firstLivePaper, lastPaper: RELEASE.lastLivePaper,
    review: loadLiveReview(), heldBankIds: heldBankIds(),
  })
  const resolved = papers.map((p) => resolveRepairedPaper(p, bank, Object.fromEntries(kept)))
  if (answerLayoutHash(resolved) !== RELEASE.baselineSeries) throw new Error('The extension must preserve every release-6 question, option order and answer key.')
  const byId = new Map(bank.questions.map((q) => [q.id, q]))
  // Include every repaired paper, not just those already sat, so neither the
  // September/October sittings nor any upcoming paper can repeat in the extension.
  const previousPapers = resolved.map((p) => p.map((q) => byId.get(q.id) ?? {
    ...q, subject: q.meta.heading, subtopic: `legacy.${q.section}`, pattern_family: `legacy.${q.id}`,
    concept: q.q, difficulty: 2,
  }))
  const held = heldBankIds()
  previousPapers.push([...held].map((id) => byId.get(id)).filter(Boolean))
  const served = loadServedArchive()
  const historicalStems = new Set(live.papers.slice(0, RELEASE.firstLivePaper - 1).flatMap((p) => p.questions.map((q) => canonical(q.q))))
  const { scores } = resemblanceScores(bank.questions)
  const extra = buildSeries(bank, {
    papers: RELEASE.additionalPapers, seed: RELEASE.extensionSeed, previousPapers,
    currentWindow: RELEASE.currentWindow,
    isExcluded: (q) => served.ids.has(q.id) || served.stems.has(stemHash(q.q)) || historicalStems.has(canonical(q.q)),
    resemblance: (q) => scores.get(q.id) ?? 0,
    acceptInPaper: (q, picked) => picked.filter((p) => !p.passage_id && questionFrame(p.q) === questionFrame(q.q)).length < MAX_FRAME_PER_PAPER,
    difficultyTargets: Object.fromEntries(MPT_SECTION_ORDER.map((s) => [s, s === 'General Abilities'
      ? { 1: 0.25, 2: 0.60, 3: 0.15 } : { 1: 0.25, 2: 0.55, 3: 0.20 }])),
  })
  for (const p of extra) papers.push({
    ...p, index: papers.length + 1,
    origin: { series: RELEASE.extensionSeed, paper: RELEASE.lastLivePaper + p.index, key: 'reserve-extension' },
    questions: p.questions.map((q) => ({ src: 'bank', ...q })),
  })
  return {
    editorial_release: RELEASE.editorialRelease,
    seed: RELEASE.seed,
    release_date: RELEASE.releaseDate,
    bank_fingerprint: bankFingerprint(bank),
    live_series: live.series,
    live_fingerprint: liveFingerprint(live),
    papers,
    kept: Object.fromEntries([...kept].sort((a, b) => a[0].localeCompare(b[0]))),
    log,
  }
}

export function bankFingerprint(bank) {
  const rows = [...bank.questions].sort((a, b) => a.id.localeCompare(b.id)).map((q) => [q.id, q.q, q.o, q.a, q.explanation, q.subtopic, q.difficulty, q.pattern_family, q.concept])
  const passages = [...bank.passages].sort((a, b) => a.id.localeCompare(b.id)).map((p) => [p.id, p.title, p.text])
  return createHash('sha256').update(JSON.stringify([rows, passages])).digest('hex').slice(0, 16)
}

export function answerLayoutHash(resolvedPapers) {
  return createHash('sha256').update(JSON.stringify(resolvedPapers.map((p) => p.map((q) => [q.id, q.o, q.a])))).digest('hex').slice(0, 16)
}

/** Wording and explanations are part of release identity, not only ids and keys. */
export function seriesHash(resolvedPapers) {
  return createHash('sha256').update(JSON.stringify(resolvedPapers.map((p) => p.map((q) => [q.id, q.q, q.o, q.a, q.e])))).digest('hex').slice(0, 16)
}

export function resolveRelease(release, bank) {
  return applyClarifications(release.papers.map((paper) => resolveRepairedPaper(paper, bank, release.kept)), bank)
}

/** The checked-in series with its kept live questions attached. */
export function readCheckedInRelease() {
  const release = JSON.parse(readFileSync(SERIES_PATH, 'utf8'))
  return { ...release, kept: JSON.parse(readFileSync(KEPT_PATH, 'utf8')) }
}

export function auditResolved(resolvedPapers, bank, served = loadServedArchive(), live = loadLiveSeries()) {
  const held = live.papers.slice(0, RELEASE.firstLivePaper - 1)
  const result = auditRepairedSeries(resolvedPapers, {
    bankById: new Map(bank.questions.map((q) => [q.id, q])),
    served,
    heldStems: new Set(held.flatMap((p) => p.questions.map((q) => canonical(q.q)))),
    heldIds: new Set([...held.flatMap((p) => p.questions.map((q) => q.id)), ...heldBankIds()]),
    currentWindow: RELEASE.currentWindow,
    expectedPapers: RELEASE.papers,
    reviewedKeep: new Set(Object.keys(loadLiveReview().explain ?? {})),
  })
  for (const [i, paper] of resolvedPapers.slice(-RELEASE.additionalPapers).entries()) {
    const report = auditPaper({ index: RELEASE.lastLivePaper + i + 1, questions: paper }, {
      bankById: new Map(bank.questions.map((q) => [q.id, q])), currentWindow: RELEASE.currentWindow,
      formatFamilies: formatFamilies(bank.questions),
    })
    result.failures.push(...report.failures)
  }
  const reasoning = auditReasoning(resolvedPapers)
  result.failures.push(...reasoning.failures)
  result.warnings.push(...reasoning.historicalWarnings)
  return result
}
