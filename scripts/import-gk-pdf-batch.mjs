import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const apply = process.argv.includes('--apply')
const root = process.cwd()
const pub = path.join(root, 'public/mcq')
const bundle = path.join(root, 'src/data/mcq-shards')
const indexPath = path.join(pub, 'index.json')
const srcIndexPath = path.join(root, 'src/data/mcqIndex.ts')
const metaPath = path.join(root, 'src/data/mcqMeta.ts')
const here = path.dirname(fileURLToPath(import.meta.url))
const payloadPath = path.join(here, '../data-archive/gk-pdf-import-20260904.json.gz.b64')

const idx = JSON.parse(fs.readFileSync(indexPath, 'utf8'))
if (idx.total !== 22189) throw new Error(`Expected production GK total 22189 before PDF import; got ${idx.total}`)
const ga = idx.categories.find(c => c.slug === 'general-ability')
if (!ga || ga.count !== 500 || ga.chunks !== 6) throw new Error(`General Ability manifest is not at 500/6: ${JSON.stringify(ga)}`)

const raw = fs.readFileSync(payloadPath, 'utf8').trim()
const incoming = JSON.parse(zlib.gunzipSync(Buffer.from(raw, 'base64')).toString('utf8'))
if (!Array.isArray(incoming) || incoming.length !== 257) throw new Error(`Expected 257 curated incoming MCQs; got ${incoming?.length}`)

const norm = v => String(v ?? '').normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim()
const leadPatterns = [
  /^(which|what|who|where|when) (?:of the following )?(?:is|are|was|were|does|did|has|have|can|could|would|should) /,
  /^which (?:country|city|planet|river|mountain|ocean|sea|strait|desert|person|scientist|organisation|organization) /,
  /^the (?:term|process|phenomenon|law|principle) /,
  /^(identify|name|select) /,
]
const core = v => {
  let x = norm(v)
  for (const p of leadPatterns) x = x.replace(p, '')
  return x.trim()
}

const oldIds = new Set(), oldQ = new Set(), oldCore = new Set()
for (const cat of idx.categories) {
  for (let k = 0; k < cat.chunks; k++) {
    const p = path.join(pub, `cat-${cat.slug}-${k}.json`)
    const qs = JSON.parse(fs.readFileSync(p, 'utf8'))
    for (const q of qs) {
      if (oldIds.has(q.id)) throw new Error(`Existing duplicate id: ${q.id}`)
      oldIds.add(q.id)
      oldQ.add(norm(q.q))
      const c = core(q.q)
      if (c.length >= 18) oldCore.add(c)
    }
  }
}

const newIds = new Set(), newQ = new Set(), newCore = new Set()
const grouped = new Map()
for (const q of incoming) {
  if (!q || typeof q.id !== 'string' || typeof q.q !== 'string' || !Array.isArray(q.o) || q.o.length !== 4 || !Number.isInteger(q.a) || q.a < 0 || q.a > 3) throw new Error(`Malformed incoming MCQ: ${JSON.stringify(q)}`)
  if (newIds.has(q.id) || oldIds.has(q.id)) throw new Error(`ID collision: ${q.id}`)
  newIds.add(q.id)
  const oq = norm(q.q)
  const cq = core(q.q)
  if (newQ.has(oq) || oldQ.has(oq)) throw new Error(`Exact question duplicate: ${q.q}`)
  if (cq.length >= 18 && (newCore.has(cq) || oldCore.has(cq))) throw new Error(`Same-core duplicate: ${q.q}`)
  newQ.add(oq); if (cq.length >= 18) newCore.add(cq)
  const opts = q.o.map(norm)
  if (new Set(opts).size !== 4) throw new Error(`Non-distinct options: ${q.id}`)
  if (!String(q.o[q.a] ?? '').trim()) throw new Error(`Empty correct answer: ${q.id}`)
  const slug = [...idx.categories].sort((a,b)=>b.slug.length-a.slug.length).find(c => q.id.startsWith(`${c.slug}-`))?.slug
  if (!slug) throw new Error(`Cannot map id to category: ${q.id}`)
  if (!grouped.has(slug)) grouped.set(slug, [])
  grouped.get(slug).push(q)
}

const expected = {
  science:111, 'solar-system':31, 'important-personalities':21, 'united-nations':18, 'important-days':18,
  'oceans-seas':14, economics:11, 'international-organisations':10, mountains:9,
  'discoveries-inventions':5, 'straits-canals':4, deserts:3, rivers:2,
}
for (const [slug, n] of Object.entries(expected)) if ((grouped.get(slug)?.length ?? 0) !== n) throw new Error(`Unexpected ${slug} count: ${grouped.get(slug)?.length ?? 0}; expected ${n}`)
if (grouped.size !== Object.keys(expected).length) throw new Error(`Unexpected category set: ${[...grouped.keys()].join(', ')}`)

const writes = []
for (const [slug, qs] of grouped) {
  const cat = idx.categories.find(c => c.slug === slug)
  const filename = `cat-${slug}-${cat.chunks}.json`
  const content = JSON.stringify(qs)
  writes.push([path.join(pub, filename), content])
  cat.count += qs.length
  cat.chunks += 1
}
idx.total += incoming.length
idx.generatedAt = '2026-09-04'
if (idx.total !== 22446) throw new Error(`Unexpected post-import total ${idx.total}`)

const indexText = JSON.stringify(idx, null, 1) + '\n'
writes.push([indexPath, indexText])
const srcIndexText = `// GK question-bank index - bundled at build time so all categories render instantly.\n// Mirrors public/mcq/index.json.\n\nimport type { BankIndex } from './mcq'\n\nexport const bundledBankIndex: BankIndex = ${JSON.stringify(idx, null, 2)}\n`
const metaText = `// Public figures for the shipped GK World bank.\n// Keep these in sync with public/mcq/index.json whenever the bank is regenerated.\nexport const SHIPPED_MCQ_TOTAL = 22_446\nexport const SHIPPED_MCQ_CATEGORY_COUNT = ${idx.categories.length}\n\nexport const shippedMcqSummary =\n  \`${'${SHIPPED_MCQ_TOTAL.toLocaleString(\'en-US\')}'} verified MCQs across ${'${SHIPPED_MCQ_CATEGORY_COUNT}'} categories\`\n`
writes.push([srcIndexPath, srcIndexText], [metaPath, metaText])

console.log(`PDF import candidate count: ${incoming.length}`)
console.log(`Post-import GK total: ${idx.total}`)
console.log(`Touched categories: ${[...grouped.entries()].map(([s,q])=>`${s}:${q.length}`).join(', ')}`)
console.log('Exact/same-core incoming collision check: 0')
if (!apply) { console.log('Dry run only.'); process.exit(0) }

fs.mkdirSync(bundle, { recursive:true })
for (const [p, content] of writes) { fs.mkdirSync(path.dirname(p), { recursive:true }); fs.writeFileSync(p, content) }
// Keep build-time shards synchronized with the public bank. Existing identical files create no diff;
// this also repairs the previously missing General Ability 251-500 bundle shards.
for (const name of fs.readdirSync(pub).filter(n => /^cat-.*\.json$/.test(n))) {
  const src = path.join(pub, name), dst = path.join(bundle, name)
  const content = fs.readFileSync(src)
  if (!fs.existsSync(dst) || !fs.readFileSync(dst).equals(content)) fs.writeFileSync(dst, content)
}
console.log('Applied curated PDF-derived GK import and synchronized bundled MCQ data.')
