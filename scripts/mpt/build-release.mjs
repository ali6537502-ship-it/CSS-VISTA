// Rebuilds the official MPT series from the reviewed bank, writes the compact
// series file (ids + option order) and the private editorial reports.
//   node scripts/mpt/build-release.mjs            write series + reports
//   node scripts/mpt/build-release.mjs --dry-run  build and audit only
import { mkdirSync, writeFileSync } from 'node:fs'
import { buildRelease, loadReviewedBank, resolveRelease, auditResolved, seriesHash } from './release-lib.mjs'
import { renderMarkdown } from './paper-audit.mjs'
import { RELEASE, SERIES_PATH, REPORT_DIR } from './release-config.mjs'

const { bank, problems } = loadReviewedBank()
if (problems.length) {
  problems.slice(0, 50).forEach((p) => console.error('BANK PROBLEM', p))
  throw new Error(`The reviewed bank has ${problems.length} problems; fix them before building a release.`)
}
const started = Date.now()
const release = buildRelease(bank)
const resolved = resolveRelease(release, bank)
const result = auditResolved(resolved, bank)
const series = seriesHash(resolved)
console.log(`Built ${release.papers.length} papers in ${((Date.now() - started) / 1000).toFixed(1)} s; series ${series}; ${result.failures.length} gate failures.`)
result.failures.slice(0, 60).forEach((f) => console.log('FAIL', f))
if (!process.argv.includes('--dry-run')) {
  writeFileSync(SERIES_PATH, `${JSON.stringify({ ...release, series }, null, 0)}\n`)
  mkdirSync(REPORT_DIR, { recursive: true })
  const meta = {
    release: RELEASE.editorialRelease, series,
    uniqueIds: new Set(resolved.flat().map((q) => q.id)).size,
    uniqueConcepts: new Set(resolved.flat().map((q) => `${q.section}|${q.meta.concept}`)).size,
  }
  writeFileSync(`${REPORT_DIR}/release-report.md`, renderMarkdown(result, meta))
  writeFileSync(`${REPORT_DIR}/release-report.json`, `${JSON.stringify({ meta, status: result.failures.length ? 'BLOCKED' : 'PASS', failures: result.failures, warnings: result.warnings, papers: result.reports, familyPapers: result.familyPapers }, null, 1)}\n`)
  console.log(`Wrote ${SERIES_PATH} and ${REPORT_DIR}/release-report.{md,json}`)
}
if (result.failures.length) process.exitCode = 1
