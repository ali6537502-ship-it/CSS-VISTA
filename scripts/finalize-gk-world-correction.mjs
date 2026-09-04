import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const apply = process.argv.includes('--apply')
const publicDir = path.join(root, 'public', 'mcq')
const bundledDir = path.join(root, 'src', 'data', 'mcq-shards')
const indexPath = path.join(publicDir, 'index.json')
const sourceIndexPath = path.join(root, 'src', 'data', 'mcqIndex.ts')
const metaPath = path.join(root, 'src', 'data', 'mcqMeta.ts')
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))

const norm = (v) => String(v ?? '')
  .normalize('NFKC').toLocaleLowerCase().replace(/[’‘]/g, "'")
  .replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim()

const shardsByCategory = new Map()
const all = []
for (const category of index.categories) {
  const shards = []
  for (let chunk = 0; chunk < category.chunks; chunk += 1) {
    const filename = `cat-${category.slug}-${chunk}.json`
    const publicPath = path.join(publicDir, filename)
    const bundledPath = path.join(bundledDir, filename)
    const publicBytes = fs.readFileSync(publicPath)
    const bundledBytes = fs.readFileSync(bundledPath)
    if (!publicBytes.equals(bundledBytes)) throw new Error(`${filename}: public and bundled copies differ before final consolidation`)
    const rows = JSON.parse(publicBytes.toString('utf8'))
    shards.push({ filename, publicPath, bundledPath, rows })
    rows.forEach((q) => all.push({ q, category, filename }))
  }
  shardsByCategory.set(category.slug, shards)
}

const removed = new Map()
const reasons = new Map()
const changed = new Map()
const remove = (item, reason) => {
  if (removed.has(item.q.id)) return
  removed.set(item.q.id, { ...item, reason })
  reasons.set(reason, (reasons.get(reason) ?? 0) + 1)
}
const replace = (item, q, reason) => {
  if (removed.has(item.q.id)) return
  if (JSON.stringify(item.q) === JSON.stringify(q)) return
  changed.set(item.q.id, { q, category: item.category.slug, reason, before: item.q })
}

// A definite duplicate missed by answer-string normalization because the two correct
// options use long-form and abbreviated UN wording.
for (const [keepId, dropId] of [['pakistan-affairs-1092', 'pakistan-affairs-2584']]) {
  const keep = all.find((x) => x.q.id === keepId)
  const drop = all.find((x) => x.q.id === dropId)
  if (keep && drop) remove(drop, 'definite duplicate question')
}

// Environment was generated in repeated families around one concept. Consolidate only
// families whose structure is fully recognizable. Keep three independent learning facts:
// (1) term from definition, (2) classification/topic, (3) associated fact.
const environment = all.filter((x) => x.category.slug === 'environment' && !removed.has(x.q.id))
const environmentGroups = new Map()
for (const item of environment) {
  const key = norm(item.q.e)
  if (!key) continue
  const group = environmentGroups.get(key) ?? []
  group.push(item)
  environmentGroups.set(key, group)
}

const roleOf = (text) => {
  const q = String(text).trim()
  if (/^Which term means [“"].+[”"]\?$/i.test(q)) return 'definition-term'
  if (/^.+ is primarily classified under which environmental topic\?$/i.test(q)) return 'classification'
  if (/^Which fact is correctly associated with .+\?$/i.test(q)) return 'associated-fact'
  if (/^What is the best definition of .+\?$/i.test(q)) return 'definition-reverse'
  if (/^Identify the environmental concept described as [“"].+[”"]\.?$/i.test(q)) return 'definition-identify'
  if (/^Which concept, defined as [“"].+[”"], is linked with the statement [“"].+[”"]\?$/i.test(q)) return 'definition-composite'
  if (/^Select the accurate description of .+\.?$/i.test(q)) return 'definition-select'
  if (/^Which term matches the definition [“"].+[”"], category [“"].+[”"], and fact [“"].+[”"]\?$/i.test(q)) return 'definition-full-composite'
  return 'other'
}

let environmentFamilies = 0
for (const group of environmentGroups.values()) {
  if (group.length < 6) continue
  const byRole = new Map()
  for (const item of group) {
    const role = roleOf(item.q.q)
    const list = byRole.get(role) ?? []
    list.push(item)
    byRole.set(role, list)
  }
  if (!(byRole.get('definition-term')?.length === 1 && byRole.get('classification')?.length === 1 && byRole.get('associated-fact')?.length === 1)) continue
  const removableRoles = ['definition-reverse', 'definition-identify', 'definition-composite', 'definition-select', 'definition-full-composite']
  const removable = removableRoles.flatMap((role) => byRole.get(role) ?? [])
  if (removable.length < 2) continue
  environmentFamilies += 1
  for (const item of removable) remove(item, 'redundant Environment concept-family variant')
}

// Make Reuters explanations report-specific. The answer/date remains untouched; this
// removes boilerplate explanation repetition without adding any new factual claim.
for (const item of all.filter((x) => x.category.slug === 'current-affairs' && !removed.has(x.q.id))) {
  const current = changed.get(item.q.id)?.q ?? item.q
  const text = String(current.q)
  let title = ''
  const quoted = text.match(/[“"](.+?)[”"]/)
  if (quoted?.[1]) title = quoted[1]
  if (!title) {
    const original = String(item.q.q)
    const originalQuoted = original.match(/[“"](.+?)[”"]/)
    if (originalQuoted?.[1]) title = originalQuoted[1]
  }
  const date = current.o?.[current.a]
  if (!title || !date) continue
  const nextExplanation = `Reuters published “${title}” on ${date}.`
  if (current.e !== nextExplanation) replace(item, { ...current, e: nextExplanation }, 'report-specific Current Affairs explanation')
}

// Post-consolidation exact normalized stem check. Any same-category exact repeat is a hard failure.
const seen = new Map()
const unresolved = []
for (const item of all) {
  if (removed.has(item.q.id)) continue
  const q = changed.get(item.q.id)?.q ?? item.q
  const key = `${item.category.slug}|${norm(q.q)}`
  const prior = seen.get(key)
  if (prior) unresolved.push([prior.q.id, q.id, q.q])
  else seen.set(key, { ...item, q })
}
if (unresolved.length) {
  console.error('Exact repeated stems remain after final consolidation:', unresolved.slice(0, 20))
  process.exit(2)
}

const summary = {
  mode: apply ? 'apply' : 'dry-run',
  before: all.length,
  removed: removed.size,
  retained: all.length - removed.size,
  changed: changed.size,
  environmentFamilies,
  reasons: Object.fromEntries([...reasons.entries()].sort((a,b) => b[1] - a[1])),
  removalExamples: [...removed.values()].slice(0, 30).map((x) => ({ id: x.q.id, category: x.category.slug, q: x.q.q, reason: x.reason })),
}
console.log(JSON.stringify(summary, null, 2))
if (!apply) process.exit(0)

for (const category of index.categories) {
  let count = 0
  for (const shard of shardsByCategory.get(category.slug) ?? []) {
    const rows = shard.rows
      .filter((q) => !removed.has(q.id))
      .map((q) => changed.get(q.id)?.q ?? q)
    count += rows.length
    const payload = `${JSON.stringify(rows)}\n`
    fs.writeFileSync(shard.publicPath, payload)
    fs.writeFileSync(shard.bundledPath, payload)
  }
  category.count = count
}

const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date())
index.generatedAt = today
index.total = index.categories.reduce((sum, category) => sum + category.count, 0)
fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 1)}\n`)
fs.writeFileSync(sourceIndexPath, `// GK question-bank index - bundled at build time so all categories render instantly.\n// Mirrors public/mcq/index.json.\n\nimport type { BankIndex } from './mcq'\n\nexport const bundledBankIndex: BankIndex = ${JSON.stringify(index, null, 2)}\n`)
fs.writeFileSync(metaPath, fs.readFileSync(metaPath, 'utf8').replace(
  /export const SHIPPED_MCQ_TOTAL = [\d_]+/,
  `export const SHIPPED_MCQ_TOTAL = ${index.total.toLocaleString('en-US').replaceAll(',', '_')}`,
))
