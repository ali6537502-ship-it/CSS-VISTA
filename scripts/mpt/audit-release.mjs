// Release gate for the official MPT series. Fails closed.
//   node scripts/mpt/audit-release.mjs               source gate: bank valid, checked-in series is
//                                                    exactly what the bank rebuilds, every paper passes
//   node scripts/mpt/audit-release.mjs --exported <dir>
//                                                    exported gate: decodes the PHP paper files the server
//                                                    freezes, proves they equal the audited papers and
//                                                    re-runs every editorial check on them
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'
import { join } from 'node:path'
import {
  buildRelease, loadReviewedBank, resolveRelease, auditResolved, readCheckedInRelease, seriesHash,
} from './release-lib.mjs'
import { RELEASE } from './release-config.mjs'

const exportedIndex = process.argv.indexOf('--exported')
const failures = []
const { bank, problems } = loadReviewedBank()
problems.forEach((p) => failures.push(`bank: ${p}`))
if (!existsSync('src/data/mpt/release/series.json')) failures.push('src/data/mpt/release/series.json is missing; run npm run build:mpt-release')
let checked = null
if (!failures.length) {
  checked = readCheckedInRelease()
  const resolvedChecked = resolveRelease(checked, bank)
  if (seriesHash(resolvedChecked) !== checked.series) failures.push('series.json hash does not match its resolved papers (bank changed after the release was built)')
  if (exportedIndex < 0) {
    const rebuilt = buildRelease(bank)
    if (!isDeepStrictEqual(rebuilt.papers, checked.papers) || rebuilt.bank_fingerprint !== checked.bank_fingerprint) {
      failures.push('the checked-in series is not what the reviewed bank rebuilds; run npm run build:mpt-release and review the report')
    }
    const result = auditResolved(resolvedChecked, bank)
    failures.push(...result.failures)
    console.log(JSON.stringify({ gate: 'source', series: checked.series, papers: resolvedChecked.length, questions: resolvedChecked.flat().length, warnings: result.warnings.length, nearDuplicateWarnings: result.similar.length }, null, 2))
  } else {
    const dir = process.argv[exportedIndex + 1]
    const decode = (file) => JSON.parse(Buffer.from(/return '([A-Za-z0-9+/=]+)';/.exec(readFileSync(join(dir, file), 'utf8'))[1], 'base64').toString('utf8'))
    const manifest = decode('manifest.php')
    const files = readdirSync(dir).filter((f) => /^paper-\d{3}\.php$/.test(f)).sort()
    const exported = files.map(decode)
    if (manifest.series !== checked.series) failures.push(`manifest series ${manifest.series} is not the audited series ${checked.series}`)
    if (manifest.editorial_release !== RELEASE.editorialRelease) failures.push('manifest editorial_release mismatch')
    if (exported.length !== resolvedChecked.length) failures.push(`exported ${exported.length} papers; audited ${resolvedChecked.length}`)
    exported.forEach((paper, i) => {
      if (!isDeepStrictEqual(paper, resolvedChecked[i])) failures.push(`exported paper ${i + 1} differs from the audited paper`)
      if (manifest.papers[i]?.count !== paper.length) failures.push(`manifest count wrong for paper ${i + 1}`)
    })
    const result = auditResolved(exported, bank)
    failures.push(...result.failures)
    console.log(JSON.stringify({ gate: 'exported', dir, series: manifest.series, papers: exported.length, identicalToAudited: failures.length === 0 }, null, 2))
  }
}
if (failures.length) {
  failures.slice(0, 80).forEach((f) => console.error('FAIL', f))
  console.error(`MPT release gate BLOCKED: ${failures.length} failure(s).`)
  process.exitCode = 1
} else console.log('MPT release gate PASS')
