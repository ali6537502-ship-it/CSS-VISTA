// Exports the official MPT paper series for the server (docs/mpt/DECISIONS.md D-04).
//
// Runs the unchanged engine (buildCompetitiveMock) over exactly the session keys
// the release audit approves, with one shared history. The official papers are
// therefore the audited 40 papers themselves: no question repeats across them
// and nothing about their content or order is changed (owner decision D-04). Papers carry answer keys, so they are written as PHP files that return
// an opaque string: .htaccess forbids /api/_mpt*, and executing one prints nothing.
// The server freezes a paper into MySQL when it creates a mock; later builds can
// never change a paper that candidates are sitting.
//
// Usage: node scripts/export-mpt-papers.mjs [--out dir] [--limit n]
import { createHash } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { build } from 'esbuild'

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : fallback
}
const outDir = argValue('--out', 'dist/api/_mpt_papers')
const limit = Number(argValue('--limit', '400'))

const bundle = await build({
  entryPoints: ['src/data/mockPapers.ts'], bundle: true, platform: 'node',
  format: 'esm', write: false, alias: { '@': './src' }, logLevel: 'silent',
})
const { buildCompetitiveMock } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`)
const storage = new Map()
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }
globalThis.fetch = async (url) => {
  try {
    const path = String(url) === '/mcq/index.json' ? 'public/mcq/index.json'
      : String(url).startsWith('/css-subject-mcqs/') ? `public${url}`
        : String(url).replace('/mcq/', 'src/data/mcq-shards/')
    return { ok: true, json: async () => JSON.parse(readFileSync(path, 'utf8')) }
  } catch {
    return { ok: false, json: async () => [] }
  }
}

const EXPECTED = { 'Islamic Studies': 20, Urdu: 20, English: 50, 'General Abilities': 60, 'General Knowledge': 50 }
const papers = []
const seenIds = new Set()
let stopReason = 'limit reached'
outer: for (let day = 1; ; day += 1) {
  for (const slot of ['-15', '']) {
    if (papers.length >= limit) break outer
    const key = `${new Date(Date.UTC(2026, 8, 19 + day)).toISOString().slice(0, 10)}${slot}`
    let paper
    try {
      paper = await buildCompetitiveMock('mpt', key, 'CSS Vista official MPT series')
    } catch (error) {
      stopReason = error.message
      break outer
    }
    // Structural integrity: a violation here is a genuine defect, never a warning.
    const counts = {}
    for (const question of paper.questions) {
      counts[question.paperSection] = (counts[question.paperSection] ?? 0) + 1
      if (seenIds.has(question.id)) throw new Error(`Official series repeats question ${question.id} (session ${key}).`)
      seenIds.add(question.id)
      if (!Number.isInteger(question.a) || question.a < 0 || question.a > 3 || question.o.length !== 4) {
        throw new Error(`Official paper ${key} has a malformed question ${question.id}.`)
      }
    }
    for (const [section, count] of Object.entries(EXPECTED)) {
      if (counts[section] !== count) throw new Error(`Official paper ${key}: ${section} has ${counts[section] ?? 0}/${count}.`)
    }
    papers.push(paper.questions.map((question) => ({
      id: question.id,
      section: question.paperSection,
      topic: question.s ?? null,
      difficulty: question.d ?? null,
      q: question.q,
      o: question.o,
      a: question.a,
      e: question.e ?? null,
    })))
  }
}

const series = createHash('sha256').update(JSON.stringify(papers.map((paper) => paper.map((q) => [q.id, q.a])))).digest('hex').slice(0, 16)
const opaque = (value) => `<?php\n// Server-side data only. Blocked by .htaccess; prints nothing if executed.\nreturn '${Buffer.from(JSON.stringify(value)).toString('base64')}';\n`
await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })
for (const [index, paper] of papers.entries()) {
  await writeFile(join(outDir, `paper-${String(index + 1).padStart(3, '0')}.php`), opaque(paper))
}
await writeFile(join(outDir, 'manifest.php'), opaque({
  series,
  publishable: true,
  generated_at: new Date().toISOString(),
  papers: papers.map((paper, index) => ({ index: index + 1, count: paper.length })),
}))
await writeFile(join(outDir, '.htaccess'), 'Require all denied\n')

const summary = `MPT official series ${series}: ${papers.length} audited paper(s); stopped: ${stopReason}`
console.log(summary)
if (papers.length < 40) console.warn(`Warning: fewer than 40 official papers were exported (${papers.length}). The server will stop scheduling mocks when they are used up.`)
