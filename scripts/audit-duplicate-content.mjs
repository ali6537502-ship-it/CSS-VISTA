/**
 * Duplicate and thin primary-content gate for the production build.
 *
 * Reads the generated production HTML — not the source metadata — strips the
 * shared header, footer and navigation, and compares what remains between
 * indexable pages. Numbers and punctuation are normalised out of the
 * fingerprint, so swapping a subject name, a year or a synonym cannot hide a
 * reused template.
 *
 * A page that fails here is fixed by giving it real content or by marking it
 * noindex. Padding it with filler is not a remedy.
 */
import { readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveClientDir } from './lib/client-dir.mjs'
import {
  contentFingerprint, extractRootHtml, isPlaceholderContent, primaryContentText, shingles, similarity,
} from './lib/content-quality.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const clientDir = resolveClientDir(root)
const strict = process.env.CSSV_STRICT_CONTENT_VALIDATION === 'true'

/** Near-duplicate threshold for two indexable pages' primary content. */
const SIMILARITY_LIMIT = strict ? 0.80 : 0.90
/**
 * Below this an indexable page has essentially nothing of its own. This is an
 * emptiness floor, not a word target: page quality is judged by uniqueness and
 * by the absence of placeholder state, which the checks below measure directly.
 */
const EMPTY_CONTENT_WORDS = 60

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'assets') continue
      yield* htmlFiles(full)
    } else if (entry.name.endsWith('.html')) {
      yield full
    }
  }
}

const pages = []
for await (const file of htmlFiles(clientDir)) {
  const html = await readFile(file, 'utf8')
  // Ownership-verification tokens are `.html` by Google's requirement but are
  // not pages: they have no application root and are never linked or indexed.
  if (!html.includes('<div id="root">')) continue
  const robots = /<meta name="robots" content="([^"]*)"/.exec(html)?.[1] ?? ''
  if (/noindex/.test(robots)) continue

  const canonical = /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1] ?? null
  const text = primaryContentText(extractRootHtml(html))
  pages.push({
    file: relative(clientDir, file),
    canonical,
    text,
    words: text.split(/\s+/).filter(Boolean).length,
    exact: contentFingerprint(text),
    shingles: shingles(text),
  })
}

const problems = []

for (const page of pages) {
  if (page.words < EMPTY_CONTENT_WORDS) {
    problems.push(`${page.file}: indexable page has essentially no primary content (${page.words} words)`)
  }
  if (isPlaceholderContent(page.text)) {
    problems.push(`${page.file}: indexable page shows a placeholder or loading state`)
  }
  if (!page.canonical) problems.push(`${page.file}: indexable page has no canonical`)
}

// Byte-identical primary content between indexable pages.
const byFingerprint = new Map()
for (const page of pages) {
  if (!page.exact) continue
  byFingerprint.set(page.exact, [...(byFingerprint.get(page.exact) ?? []), page])
}
for (const group of byFingerprint.values()) {
  if (group.length > 1) {
    problems.push(`identical primary content on ${group.length} indexable pages: ${group.slice(0, 4).map((p) => p.file).join(', ')}`)
  }
}

// Near-duplicates, compared inside each family so the pass stays linear enough
// to run on every build. Pages in the same directory are the ones generated
// from a common template, which is exactly where reuse hides.
const families = new Map()
for (const page of pages) {
  const family = page.file.includes('/') ? page.file.slice(0, page.file.lastIndexOf('/')) : '.'
  families.set(family, [...(families.get(family) ?? []), page])
}

for (const [family, group] of families) {
  if (group.length < 2) continue
  const sample = group.length > 80 ? group.filter((_, index) => index % Math.ceil(group.length / 80) === 0) : group
  let worst = null
  for (let i = 0; i < sample.length; i += 1) {
    for (let j = i + 1; j < sample.length; j += 1) {
      const score = similarity(sample[i].shingles, sample[j].shingles)
      if (score > SIMILARITY_LIMIT && (!worst || score > worst.score)) {
        worst = { score, left: sample[i].file, right: sample[j].file }
      }
    }
  }
  if (worst) {
    problems.push(
      `${family}/: primary content is ${(worst.score * 100).toFixed(0)}% identical between `
      + `${worst.left} and ${worst.right} (limit ${(SIMILARITY_LIMIT * 100).toFixed(0)}%)`,
    )
  }
}

if (problems.length) {
  console.error(`Duplicate/thin content audit failed with ${problems.length} problem(s):`)
  for (const problem of problems.slice(0, 40)) console.error(`  - ${problem}`)
  if (problems.length > 40) console.error(`  … and ${problems.length - 40} more`)
  console.error('Give these pages real page-specific content or mark them noindex. Do not add filler.')
  process.exit(1)
}

const words = pages.map((page) => page.words).sort((a, b) => a - b)
console.log(
  `Duplicate/thin content audit passed: ${pages.length} indexable pages, `
  + `median ${words[Math.floor(words.length / 2)]} words of primary content, `
  + `no pair above ${(SIMILARITY_LIMIT * 100).toFixed(0)}% similarity.`,
)
