// Rebuilds the official MPT series by repairing the live papers against the reviewed bank,
// writes the compact series file (ids + option order), the kept live questions and the
// private editorial reports (with every replacement and its reason).
//   node scripts/mpt/build-release.mjs            write series + reports
//   node scripts/mpt/build-release.mjs --dry-run  build and audit only
import { mkdirSync, writeFileSync } from 'node:fs'
import { buildRelease, loadReviewedBank, resolveRelease, auditResolved, seriesHash } from './release-lib.mjs'
import { renderRepairMarkdown } from './repair-audit.mjs'
import { RELEASE, SERIES_PATH, KEPT_PATH, REPORT_DIR } from './release-config.mjs'

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
console.log(`Repaired ${release.papers.length} papers in ${((Date.now() - started) / 1000).toFixed(1)} s; series ${series}; kept ${Object.keys(release.kept).length}, replaced ${release.log.length}; ${result.failures.length} gate failures.`)
result.failures.slice(0, 60).forEach((f) => console.log('FAIL', f))
if (!process.argv.includes('--dry-run') && result.failures.length === 0) {
  const { kept, log, ...compact } = release
  writeFileSync(SERIES_PATH, `${JSON.stringify({ ...compact, series }, null, 0)}\n`)
  writeFileSync(KEPT_PATH, `${JSON.stringify(kept, null, 0)}\n`)
  mkdirSync(REPORT_DIR, { recursive: true })
  const meta = { release: RELEASE.editorialRelease, series, liveSeries: release.live_series, firstLivePaper: RELEASE.firstLivePaper, lastLivePaper: RELEASE.lastLivePaper }
  writeFileSync(`${REPORT_DIR}/release-report.md`, renderRepairMarkdown(result, meta, log))
  writeFileSync(`${REPORT_DIR}/release-report.json`, `${JSON.stringify({ meta, status: result.failures.length ? 'BLOCKED' : 'PASS', failures: result.failures, warnings: result.warnings, papers: result.reports }, null, 1)}\n`)
  writeFileSync(`${REPORT_DIR}/replacements.json`, `${JSON.stringify(log, null, 0).replace(/\},\{/g, '},\n{')}\n`)
  console.log(`Wrote ${SERIES_PATH}, ${KEPT_PATH} and ${REPORT_DIR}/release-report.{md,json}, replacements.json`)
}
if (result.failures.length) process.exitCode = 1
