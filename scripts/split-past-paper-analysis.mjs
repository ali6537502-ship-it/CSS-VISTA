// Splits the generated past-paper analysis into one file per subject.
//
// public/css-past-paper-analysis.json is ~1.8 MB and was fetched in full on
// every visit to /css-past-paper-analysis, even though a visitor reads one
// subject at a time. The compact index (~294 KB) already carries everything
// needed to paint the page; only question text and per-topic analysis lines
// live in the full payload, and those are what these per-subject files hold.
//
// The full file is left in place: FpscSyllabusPlanner still lazy-loads it for
// cross-subject evidence, and the audit scripts read it.
//
// Re-run this whenever import-css-past-paper-analysis.py regenerates the
// analysis. `npm run split:analysis`, and it also runs in the build.

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const sourcePath = path.join(root, 'public/css-past-paper-analysis.json')
const outputDir = path.join(root, 'public/css-past-paper-analysis')

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

async function main() {
  const raw = await readFile(sourcePath, 'utf8')
  const data = JSON.parse(raw)

  if (!Array.isArray(data.subjects) || data.subjects.length === 0) {
    throw new Error('css-past-paper-analysis.json has no subjects array')
  }

  await mkdir(outputDir, { recursive: true })

  // Clear stale subject files so a removed subject cannot linger and be served.
  const existing = await readdir(outputDir).catch(() => [])
  const expected = new Set(data.subjects.map((subject) => `${subject.slug}.json`))
  for (const name of existing) {
    if (name.endsWith('.json') && !expected.has(name)) {
      await rm(path.join(outputDir, name))
    }
  }

  let total = 0
  let largest = { slug: '', bytes: 0 }

  for (const subject of data.subjects) {
    if (!subject.slug) throw new Error(`Subject "${subject.name}" has no slug`)
    const body = JSON.stringify(subject)
    await writeFile(path.join(outputDir, `${subject.slug}.json`), body, 'utf8')
    const bytes = Buffer.byteLength(body)
    total += bytes
    if (bytes > largest.bytes) largest = { slug: subject.slug, bytes }
  }

  const sourceBytes = Buffer.byteLength(raw)
  console.log(
    `Split past-paper analysis: ${data.subjects.length} subjects, `
    + `${formatKb(sourceBytes)} source -> ${formatKb(total)} across per-subject files. `
    + `Largest: ${largest.slug} at ${formatKb(largest.bytes)}. `
    + `A visitor now loads the index plus one subject instead of ${formatKb(sourceBytes)}.`,
  )
}

main().catch((error) => {
  console.error(`split-past-paper-analysis failed: ${error.message}`)
  process.exitCode = 1
})
