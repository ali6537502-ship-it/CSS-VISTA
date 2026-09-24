// Inventory every central-bank category before claiming it can fill an MPT
// section. This reports raw supply and editorial risks; it does not certify
// correctness or replace the 40-paper release audit.
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'

const index = JSON.parse(readFileSync('public/mcq/index.json', 'utf8'))
const archive = JSON.parse(readFileSync('data-archive/mpt-legacy-fingerprints.json', 'utf8'))
const priorIds = new Set(archive.entries.map(([id]) => id))
const priorStems = new Set(archive.entries.map(([, hash]) => hash))
const files = readdirSync('src/data/mcq-shards')
const canonical = (value) => value.toLowerCase().normalize('NFKD')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
const hash = (stem) => createHash('sha256').update(stem).digest('hex')
const optionIsUnusable = (value) => /^(?:none of (?:these|the above)|all of the above|both a and b|ان میں سے کوئی نہیں)$/i.test(value.trim())

const categories = index.categories.map(({ slug, count }) => {
  const rows = files.filter((name) => name.startsWith(`cat-${slug}-`) && name.endsWith('.json'))
    .flatMap((name) => JSON.parse(readFileSync(`src/data/mcq-shards/${name}`, 'utf8')))
  const stems = rows.map((q) => hash(canonical(q.q ?? '')))
  return {
    slug, declared: count, actual: rows.length,
    distinctStems: new Set(stems).size,
    previouslyServedIds: rows.filter((q) => priorIds.has(q.id)).length,
    previouslyServedStems: stems.filter((stem) => priorStems.has(stem)).length,
    missingExplanation: rows.filter((q) => !q.e?.trim()).length,
    unusableChoice: rows.filter((q) => q.o?.some(optionIsUnusable)).length,
    invalidChoices: rows.filter((q) => !Array.isArray(q.o) || q.o.length !== 4
      || !Number.isInteger(q.a) || q.a < 0 || q.a > 3 || new Set(q.o.map(canonical)).size !== 4).length,
  }
})

console.log(JSON.stringify({ totalDeclared: index.total,
  totalActual: categories.reduce((sum, category) => sum + category.actual, 0),
  categoryCount: categories.length, categories }, null, 2))
