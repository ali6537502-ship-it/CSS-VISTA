// Builds, resolves and audits the official MPT series.
//
// Editorial release 3 repairs the live series instead of replacing it: the papers already
// frozen for the remaining mocks keep every sound question, and only defective slots are
// refilled from the reviewed bank (scripts/mpt/repair-live-series.mjs).
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { loadBank, validateBank, canonical } from './bank-lib.mjs'
import { loadServedArchive } from './served-archive.mjs'
import { RELEASE, SERIES_PATH, KEPT_PATH } from './release-config.mjs'
import { loadLiveSeries, repairLiveSeries, resolveRepairedPaper } from './repair-live-series.mjs'
import { auditRepairedSeries } from './repair-audit.mjs'

export function loadReviewedBank() {
  const bank = loadBank()
  const { problems } = validateBank(bank)
  const strip = (row) => { const { __file, ...rest } = row; return rest }
  return { bank: { questions: bank.questions.map(strip), passages: bank.passages.map(strip) }, problems }
}

export function liveFingerprint(live) {
  return createHash('sha256').update(JSON.stringify(live.papers.map((p) => p.questions.map((q) => [q.id, q.q, q.o, q.a])))).digest('hex').slice(0, 16)
}

/** The repaired series: { release fields, papers, kept (id → live question), log }. */
export function buildRelease(bank, live = loadLiveSeries()) {
  const { papers, kept, log } = repairLiveSeries({
    live, bank, seed: RELEASE.seed, firstPaper: RELEASE.firstLivePaper, lastPaper: RELEASE.lastLivePaper,
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

export function seriesHash(resolvedPapers) {
  return createHash('sha256').update(JSON.stringify(resolvedPapers.map((p) => p.map((q) => [q.id, q.o, q.a])))).digest('hex').slice(0, 16)
}

export function resolveRelease(release, bank) {
  return release.papers.map((paper) => resolveRepairedPaper(paper, bank, release.kept))
}

/** The checked-in series with its kept live questions attached. */
export function readCheckedInRelease() {
  const release = JSON.parse(readFileSync(SERIES_PATH, 'utf8'))
  return { ...release, kept: JSON.parse(readFileSync(KEPT_PATH, 'utf8')) }
}

export function auditResolved(resolvedPapers, bank, served = loadServedArchive(), live = loadLiveSeries()) {
  const held = live.papers.slice(0, RELEASE.firstLivePaper - 1)
  return auditRepairedSeries(resolvedPapers, {
    bankById: new Map(bank.questions.map((q) => [q.id, q])),
    served,
    heldStems: new Set(held.flatMap((p) => p.questions.map((q) => canonical(q.q)))),
    heldIds: new Set(held.flatMap((p) => p.questions.map((q) => q.id))),
    currentWindow: RELEASE.currentWindow,
    expectedPapers: RELEASE.papers,
  })
}
