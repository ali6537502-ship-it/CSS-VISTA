// Exports the official MPT paper series for the server (docs/mpt/DECISIONS.md D-04, D-54).
//
// The papers are the audited editorial release checked in at
// src/data/mpt/release/series.json, resolved against the reviewed bank
// (src/data/mpt/bank). Nothing is selected here: the exporter only renders the
// audited papers, then scripts/mpt/audit-release.mjs --exported proves the
// written files equal them. Papers carry answer keys, so they are written as
// PHP files that return an opaque string: .htaccess forbids /api/_mpt*, and
// executing one prints nothing. The server freezes a paper into MySQL when it
// creates a mock; unstarted mocks frozen from an older editorial release are
// re-frozen from this one (manifest.replace_unstarted_below_release).
//
// Usage: node scripts/export-mpt-papers.mjs [--out dir] [--limit n]
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { loadReviewedBank, readCheckedInRelease, resolveRelease, seriesHash } from './mpt/release-lib.mjs'
import { paperFingerprint } from './mpt/paper-audit.mjs'
import { RELEASE } from './mpt/release-config.mjs'

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : fallback
}
const outDir = argValue('--out', 'dist/api/_mpt_papers')
const limit = Number(argValue('--limit', '400'))

const { bank, problems } = loadReviewedBank()
if (problems.length) throw new Error(`Refusing to export: the reviewed MPT bank has ${problems.length} problems.`)
const release = readCheckedInRelease()
const papers = resolveRelease(release, bank)
if (seriesHash(papers) !== release.series) throw new Error('Refusing to export: series.json does not match the reviewed bank. Run npm run build:mpt-release.')
const selected = papers.slice(0, limit)

const opaque = (value) => `<?php\n// Server-side data only. Blocked by .htaccess; prints nothing if executed.\nreturn '${Buffer.from(JSON.stringify(value)).toString('base64')}';\n`
await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })
for (const [index, paper] of selected.entries()) {
  await writeFile(join(outDir, `paper-${String(index + 1).padStart(3, '0')}.php`), opaque(paper))
}
await writeFile(join(outDir, 'manifest.php'), opaque({
  series: release.series,
  editorial_release: RELEASE.editorialRelease,
  replace_unstarted_below_release: RELEASE.replaceUnstartedBelowRelease,
  publishable: true,
  generated_at: new Date().toISOString(),
  papers: selected.map((paper, index) => ({ index: index + 1, count: paper.length, fingerprint: paperFingerprint(paper) })),
}))
await writeFile(join(outDir, '.htaccess'), 'Require all denied\n')
console.log(`MPT official series ${release.series} (editorial release ${RELEASE.editorialRelease}): exported ${selected.length} audited paper(s).`)
if (selected.length < RELEASE.papers) console.warn(`Warning: only ${selected.length} papers exported (--limit).`)
