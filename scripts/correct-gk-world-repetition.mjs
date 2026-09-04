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
  .replace(/[^\p{L}\p{N}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim()
const words = (v) => String(v ?? '')
  .normalize('NFKC').toLocaleLowerCase().replace(/[’‘]/g, "'")
  .replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim()
const hash = (v) => { let h = 2166136261; for (const ch of String(v)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
const choose = (id, values) => values[hash(id) % values.length]
const answer = (q) => q.o?.[q.a] ?? ''
const equivalentAnswer = (a, b) => {
  const x = words(a).replace(/\bunited nations\b/g, 'un').replace(/\bhenri becquerel\b/g, 'becquerel')
  const y = words(b).replace(/\bunited nations\b/g, 'un').replace(/\bhenri becquerel\b/g, 'becquerel')
  if (!x || !y) return false
  return x === y || (x.length >= 5 && y.includes(x)) || (y.length >= 5 && x.includes(y))
}

const shardsByCategory = new Map()
const all = []
for (const category of index.categories) {
  const shards = []
  for (let chunk = 0; chunk < category.chunks; chunk += 1) {
    const filename = `cat-${category.slug}-${chunk}.json`
    const publicPath = path.join(publicDir, filename)
    const bundledPath = path.join(bundledDir, filename)
    const p = fs.readFileSync(publicPath)
    const b = fs.readFileSync(bundledPath)
    if (!p.equals(b)) throw new Error(`${filename}: public and bundled copies differ before correction`)
    const rows = JSON.parse(p.toString('utf8'))
    shards.push({ filename, publicPath, bundledPath, rows })
    rows.forEach((q) => all.push({ q, category, filename }))
  }
  shardsByCategory.set(category.slug, shards)
}

const removed = new Map()
const reasons = new Map()
const remove = (item, reason) => {
  if (removed.has(item.q.id)) return
  removed.set(item.q.id, item)
  reasons.set(reason, (reasons.get(reason) ?? 0) + 1)
}

// 1) Exact normalized stems. Only collapse when answers are demonstrably equivalent.
const exactGroups = new Map()
for (const item of all) {
  const key = norm(item.q.q)
  const group = exactGroups.get(key) ?? []
  group.push(item); exactGroups.set(key, group)
}
for (const group of exactGroups.values()) {
  if (group.length < 2) continue
  const kept = []
  for (const item of group) {
    const duplicate = kept.find((other) => equivalentAnswer(answer(item.q), answer(other.q)))
    if (duplicate) {
      const itemScore = String(answer(item.q)).length + String(item.q.e ?? '').length / 20
      const otherScore = String(answer(duplicate.q)).length + String(duplicate.q.e ?? '').length / 20
      if (itemScore > otherScore) { remove(duplicate, 'exact same question / equivalent answer'); kept.splice(kept.indexOf(duplicate), 1, item) }
      else remove(item, 'exact same question / equivalent answer')
    } else kept.push(item)
  }
}

// 2) Conservative reciprocal fact signatures across GK World.
function signature(item) {
  const q = String(item.q.q).trim()
  const a = String(answer(item.q)).trim()
  let m
  if ((m = q.match(/^what is the capital of (.+?)\??$/i))) return `capital|${words(m[1])}|${words(a)}`
  if ((m = q.match(/^which country or territory has (.+?) as its capital\??$/i))) return `capital|${words(a)}|${words(m[1])}`
  if ((m = q.match(/^what is the iso (?:3166-1 )?alpha-3 code for (.+?)\??$/i))) return `iso3|${words(m[1])}|${words(a)}`
  if ((m = q.match(/^what is the iso (?:3166-1 )?alpha-2 code for (.+?)\??$/i))) return `iso2|${words(m[1])}|${words(a)}`
  if ((m = q.match(/^what is the international calling code(?: listed)? for (.+?)\??$/i))) return `calling|${words(m[1])}|${words(a)}`
  if ((m = q.match(/^what is the country code top-level domain for (.+?)\??$/i))) return `tld|${words(m[1])}|${words(a)}`
  if ((m = q.match(/^which currency is listed for (.+?)\??$/i))) return `currency|${words(m[1])}|${words(a)}`
  if ((m = q.match(/^what is the principal official currency of (.+?)\??$/i))) return `currency|${words(m[1])}|${words(a)}`
  if ((m = q.match(/^which waters are connected by the (.+?)\??$/i))) {
    const pair = words(a).split(/\band\b/).map(x => x.trim()).filter(Boolean).sort().join('|')
    if (pair) return `strait-water|${words(m[1])}|${pair}`
  }
  if ((m = q.match(/^identify the strait connecting (.+?)\.?$/i))) {
    const pair = words(m[1]).split(/\band\b/).map(x => x.trim()).filter(Boolean).sort().join('|')
    if (pair) return `strait-water|${words(a)}|${pair}`
  }
  if ((m = q.match(/^radioactivity was discovered by:?$/i))) return `radioactivity-discoverer|${words(a).replace(/^henri /, '')}`
  return ''
}
const sigGroups = new Map()
for (const item of all) {
  if (removed.has(item.q.id)) continue
  const key = signature(item)
  if (!key) continue
  const group = sigGroups.get(key) ?? []
  group.push(item); sigGroups.set(key, group)
}
const categoryPreference = (item, sig) => {
  if (sig.startsWith('capital|')) return item.category.slug === 'capitals' ? 100 : 0
  if (sig.startsWith('currency|')) return item.category.slug === 'currencies' ? 100 : 0
  if (sig.startsWith('strait-water|')) return item.category.slug === 'straits-canals' ? 100 : 0
  if (sig.startsWith('iso') || sig.startsWith('calling|') || sig.startsWith('tld|')) return item.category.slug === 'countries-continents' ? 80 : item.category.slug === 'misc-gk' ? 40 : 0
  return 0
}
for (const [sig, group] of sigGroups) {
  if (group.length < 2) continue
  const ranked = [...group].sort((x, y) => categoryPreference(y, sig) - categoryPreference(x, sig) || String(y.q.e ?? '').length - String(x.q.e ?? '').length || String(x.q.id).localeCompare(String(y.q.id), 'en', { numeric: true }))
  for (const item of ranked.slice(1)) remove(item, 'reciprocal/same-fact variant')
}

// Known high-confidence semantic duplicates from the deep scan that are not safely generalized.
const explicitDuplicatePairs = [
  ['flags-18', 'flags-67'],
  ['islamic-gk-5341', 'islamic-gk-5450'],
]
for (const [keepId, dropId] of explicitDuplicatePairs) {
  const keep = all.find(x => x.q.id === keepId)
  const drop = all.find(x => x.q.id === dropId)
  if (keep && drop && !removed.has(dropId)) remove(drop, 'high-confidence same fact variant')
}

// 3) De-template only the wording. Options, correct answer, explanation, topic and IDs remain untouched.
const rewrites = new Map()
function rewrite(item) {
  if (removed.has(item.q.id)) return item.q
  const original = String(item.q.q)
  const id = item.q.id
  let m
  let next = original

  if (item.category.slug === 'current-affairs' && (m = original.match(/^On which date did Reuters publish the report\s+(.+?)\??$/i))) {
    const subject = m[1].replace(/[?]+$/, '')
    next = choose(id, [
      `When did Reuters publish the report ${subject}?`,
      `Reuters published the report ${subject} on which date?`,
      `What was the publication date of the Reuters report ${subject}?`,
      `The Reuters report ${subject} was published on:`,
      `Which date corresponds to Reuters' publication of the report ${subject}?`,
      `On what date was the Reuters report ${subject} published?`,
    ])
  } else if ((m = original.match(/^What is the ISO (?:3166-1 )?alpha-3 code for (.+?)\??$/i))) {
    const x = m[1]
    next = choose(id, [`What is the ISO alpha-3 code for ${x}?`, `Which ISO alpha-3 code belongs to ${x}?`, `${x} uses which ISO alpha-3 code?`, `Select the ISO alpha-3 code for ${x}.`])
  } else if ((m = original.match(/^What is the ISO (?:3166-1 )?alpha-2 code for (.+?)\??$/i))) {
    const x = m[1]
    next = choose(id, [`What is the ISO alpha-2 code for ${x}?`, `Which ISO alpha-2 code belongs to ${x}?`, `${x} uses which ISO alpha-2 code?`, `Select the ISO alpha-2 code for ${x}.`])
  } else if ((m = original.match(/^What is the international calling code(?: listed)? for (.+?)\??$/i))) {
    const x = m[1]
    next = choose(id, [`What is the international calling code for ${x}?`, `Which calling code is assigned to ${x}?`, `${x} uses which international calling code?`, `Select the calling code for ${x}.`])
  } else if ((m = original.match(/^What English demonym is used for a person from (.+?)\??$/i))) {
    const x = m[1]
    next = choose(id, [`What English demonym is used for a person from ${x}?`, `A person from ${x} is described by which English demonym?`, `Which demonym refers to someone from ${x}?`, `Select the English demonym for a person from ${x}.`])
  } else if ((m = original.match(/^Which official language is listed for (.+?)\??$/i))) {
    const x = m[1]
    next = choose(id, [`Which official language is listed for ${x}?`, `What official language is associated with ${x}?`, `${x} lists which language as official?`, `Select an official language of ${x}.`])
  } else if ((m = original.match(/^What is the country code top-level domain for (.+?)\??$/i))) {
    const x = m[1]
    next = choose(id, [`What is the country-code top-level domain for ${x}?`, `Which ccTLD belongs to ${x}?`, `${x} uses which country-code internet domain?`, `Select the ccTLD for ${x}.`])
  } else if ((m = original.match(/^What is the chemical symbol for (.+?)\??$/i))) {
    const x = m[1]
    next = choose(id, [`What is the chemical symbol for ${x}?`, `Which chemical symbol represents ${x}?`, `${x} is represented by which chemical symbol?`, `Select the symbol of ${x}.`])
  } else if ((m = original.match(/^What is the atomic number of (.+?)\??$/i))) {
    const x = m[1]
    next = choose(id, [`What is the atomic number of ${x}?`, `Which atomic number belongs to ${x}?`, `${x} has which atomic number?`, `Select the atomic number for ${x}.`])
  } else if ((m = original.match(/^What standard state is listed for (.+?)\??$/i))) {
    const x = m[1]
    next = choose(id, [`What standard state is listed for ${x}?`, `Which standard state applies to ${x}?`, `${x} is found in which standard state?`, `Select the standard state of ${x}.`])
  } else if ((m = original.match(/^Which periodic-table classification applies to (.+?)\??$/i)) || (m = original.match(/^Which periodic table classification applies to (.+?)\??$/i))) {
    const x = m[1]
    next = choose(id, [`Which periodic-table classification applies to ${x}?`, `How is ${x} classified in the periodic table?`, `${x} belongs to which periodic-table class?`, `Select the periodic-table classification of ${x}.`])
  } else if ((m = original.match(/^What is the best definition of (.+?)\??$/i))) {
    const x = m[1]
    next = choose(id, [`What is the best definition of ${x}?`, `How is ${x} best defined?`, `Which option correctly defines ${x}?`, `Select the most accurate definition of ${x}.`])
  } else if ((m = original.match(/^Which fact is correctly associated with (.+?)\??$/i))) {
    const x = m[1]
    next = choose(id, [`Which fact is correctly associated with ${x}?`, `Which statement correctly describes ${x}?`, `What fact is accurate about ${x}?`, `Select the statement that applies to ${x}.`])
  } else if ((m = original.match(/^Identify the environmental concept described as\s+(.+?)\??$/i))) {
    const x = m[1]
    next = choose(id, [`Identify the environmental concept described as ${x}?`, `Which environmental concept matches this description: ${x}?`, `What environmental term is defined by ${x}?`, `Select the environmental concept represented by ${x}.`])
  } else if ((m = original.match(/^Which Quranic or Prophetic anchor is most directly connected with (.+?)\??$/i))) {
    const x = m[1]
    next = choose(id, [`Which Qur'anic or Prophetic anchor is most directly connected with ${x}?`, `Which textual anchor is most directly associated with ${x}?`, `What Qur'anic or Prophetic reference best supports ${x}?`, `Select the textual basis most closely linked to ${x}.`])
  } else if ((m = original.match(/^Which textual or historical basis is most closely associated with (.+?)\??$/i))) {
    const x = m[1]
    next = choose(id, [`Which textual or historical basis is most closely associated with ${x}?`, `What source or historical basis is most closely linked to ${x}?`, `Which basis best supports the historical identification of ${x}?`, `Select the textual or historical basis associated with ${x}.`])
  } else if ((m = original.match(/^Which countries are associated with the course of the (.+?)\??$/i))) {
    const x = m[1]
    next = choose(id, [`Which countries are associated with the course of the ${x}?`, `The ${x} flows through or is associated with which countries?`, `Which countries lie along the course of the ${x}?`, `Select the countries associated with the ${x}.`])
  } else if ((m = original.match(/^What land areas are separated by the (.+?)\??$/i))) {
    const x = m[1]
    next = choose(id, [`What land areas are separated by the ${x}?`, `Which land areas does the ${x} separate?`, `The ${x} lies between which land areas?`, `Select the land areas separated by the ${x}.`])
  } else if ((m = original.match(/^Which waters are connected by the (.+?)\??$/i))) {
    const x = m[1]
    next = choose(id, [`Which waters are connected by the ${x}?`, `What bodies of water does the ${x} connect?`, `The ${x} provides a connection between which waters?`, `Select the waters linked by the ${x}.`])
  } else if (/^درج ذیل تعریف کس اصطلاح کی/i.test(original)) {
    next = choose(id, [original, original.replace(/^درج ذیل تعریف کس اصطلاح کی/i, 'یہ تعریف کس اصطلاح کی'), original.replace(/^درج ذیل تعریف کس اصطلاح کی/i, 'اس تعریف کے مطابق درست اصطلاح کس')])
  } else if (/^یہ تعریف کس ادبی اصطلاح کی/i.test(original)) {
    next = choose(id, [original, original.replace(/^یہ تعریف کس ادبی اصطلاح کی/i, 'درج ذیل تعریف کس ادبی اصطلاح کی'), original.replace(/^یہ تعریف کس ادبی اصطلاح کی/i, 'اس تعریف سے کون سی ادبی اصطلاح مراد')])
  }

  if (next !== original) {
    rewrites.set(id, { from: original, to: next, category: item.category.slug })
    return { ...item.q, q: next }
  }
  return item.q
}

const rewrittenById = new Map(all.filter(x => !removed.has(x.q.id)).map(item => [item.q.id, rewrite(item)]))

// Post-correction exact-stem safety check in memory.
const postExact = new Map()
for (const item of all) {
  if (removed.has(item.q.id)) continue
  const q = rewrittenById.get(item.q.id) ?? item.q
  const key = norm(q.q)
  const g = postExact.get(key) ?? []
  g.push({ ...item, q }); postExact.set(key, g)
}
const unresolvedExact = [...postExact.values()].filter(g => g.length > 1 && g.some((x, i) => g.some((y, j) => i !== j && equivalentAnswer(answer(x.q), answer(y.q)))))
if (unresolvedExact.length) {
  console.error('Unresolved exact-equivalent groups remain:', unresolvedExact.slice(0, 10).map(g => g.map(x => x.q.id)))
  process.exit(2)
}

const summary = {
  mode: apply ? 'apply' : 'dry-run',
  before: all.length,
  removed: removed.size,
  retained: all.length - removed.size,
  rewrites: rewrites.size,
  reasons: Object.fromEntries([...reasons.entries()].sort((a,b)=>b[1]-a[1])),
  rewriteCategories: Object.fromEntries([...rewrites.values()].reduce((m, x) => m.set(x.category, (m.get(x.category) ?? 0) + 1), new Map())),
  removedExamples: [...removed.values()].slice(0, 25).map(x => ({ id: x.q.id, category: x.category.slug, q: x.q.q, answer: answer(x.q) })),
  rewriteExamples: [...rewrites.entries()].slice(0, 25).map(([id, x]) => ({ id, ...x })),
}
console.log(JSON.stringify(summary, null, 2))
if (!apply) process.exit(0)

for (const category of index.categories) {
  let count = 0
  for (const shard of shardsByCategory.get(category.slug) ?? []) {
    const rows = shard.rows.filter(q => !removed.has(q.id)).map(q => rewrittenById.get(q.id) ?? q)
    count += rows.length
    const payload = `${JSON.stringify(rows)}\n`
    fs.writeFileSync(shard.publicPath, payload)
    fs.writeFileSync(shard.bundledPath, payload)
  }
  category.count = count
}
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
index.generatedAt = today
index.total = index.categories.reduce((s, c) => s + c.count, 0)
fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 1)}\n`)
fs.writeFileSync(sourceIndexPath, `// GK question-bank index - bundled at build time so all categories render instantly.\n// Mirrors public/mcq/index.json.\n\nimport type { BankIndex } from './mcq'\n\nexport const bundledBankIndex: BankIndex = ${JSON.stringify(index, null, 2)}\n`)
fs.writeFileSync(metaPath, fs.readFileSync(metaPath, 'utf8').replace(/export const SHIPPED_MCQ_TOTAL = [\d_]+/, `export const SHIPPED_MCQ_TOTAL = ${index.total.toLocaleString('en-US').replaceAll(',', '_')}`))
