// Builds, resolves and audits the official MPT series from the reviewed bank.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { loadBank, validateBank } from './bank-lib.mjs'
import { loadServedArchive, stemHash } from './served-archive.mjs'
import { buildSeries, resolvePaper } from '../../src/data/mpt/selector.ts'
import { auditSeries } from './paper-audit.mjs'
import { RELEASE, SERIES_PATH } from './release-config.mjs'

export function loadReviewedBank() {
  const bank = loadBank()
  const { problems } = validateBank(bank)
  const strip = (row) => { const { __file, ...rest } = row; return rest }
  return { bank: { questions: bank.questions.map(strip), passages: bank.passages.map(strip) }, problems }
}

export function buildRelease(bank, served = loadServedArchive()) {
  const papers = buildSeries(bank, {
    papers: RELEASE.papers,
    seed: RELEASE.seed,
    currentWindow: RELEASE.currentWindow,
    isExcluded: (q) => served.stems.has(stemHash(q.q)) || served.ids.has(q.id),
  })
  return {
    editorial_release: RELEASE.editorialRelease,
    seed: RELEASE.seed,
    release_date: RELEASE.releaseDate,
    bank_fingerprint: bankFingerprint(bank),
    papers,
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
  return release.papers.map((paper) => resolvePaper(paper, bank))
}

export function readCheckedInRelease() {
  return JSON.parse(readFileSync(SERIES_PATH, 'utf8'))
}

export function auditResolved(resolvedPapers, bank, served = loadServedArchive()) {
  return auditSeries(resolvedPapers.map((questions, i) => ({ index: i + 1, questions })), {
    bankById: new Map(bank.questions.map((q) => [q.id, q])),
    served,
    currentWindow: RELEASE.currentWindow,
    expectedPapers: RELEASE.papers,
  })
}
