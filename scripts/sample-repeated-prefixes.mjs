import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const dir = path.join(root, 'public', 'mcq')
const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'))

const norm = (v) => String(v ?? '').normalize('NFKC').toLocaleLowerCase().replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim()
const stop = new Set('a an and are as at be by can did do does for from has have how in into is it its of on or that the their there these this to under was were what when where which who whom whose why with would following correct correctly best option options statement statements identify select choose regarding about according'.split(' '))
const tokenise = (v) => norm(v).split(' ').filter(Boolean)
const contentTokens = (v) => tokenise(v).filter((t) => t.length > 2 && !stop.has(t))
const answer = (q) => Array.isArray(q.o) && Number.isInteger(q.a) ? (q.o[q.a] ?? '') : ''
const add = (map, key, item) => { if (!key) return; const rows = map.get(key) ?? []; rows.push(item); map.set(key, rows) }
const groups = (map) => [...map.values()].filter((g) => g.length > 1)
const genericLeadPatterns = [/^which of the following /,/^which one of the following /,/^which statement about /,/^which statement regarding /,/^which option correctly /,/^which option best /,/^which option /,/^what is the /,/^what was the /,/^what does /,/^who was the /,/^who is the /,/^according to /,/^in the context of /,/^in relation to /]
function coreStem(v) { let x = norm(v); for (const p of genericLeadPatterns) x = x.replace(p, ''); return x.trim() }

const globalExact = new Map(), globalCore = new Map(), globalExpl = new Map(), globalOptions = new Map()
const prefixCounts = new Map(), phraseCounts = new Map(), phraseCategories = new Map()
const categories = []
let total = 0

for (const meta of index.categories) {
  const rows = []
  for (let chunk = 0; chunk < meta.chunks; chunk += 1) rows.push(...JSON.parse(fs.readFileSync(path.join(dir, `cat-${meta.slug}-${chunk}.json`), 'utf8')))
  total += rows.length
  const exact = new Map(), core = new Map(), expl = new Map(), optionSets = new Map(), answerTopic = new Map(), localPrefixes = new Map(), localPhrases = new Map()
  rows.forEach((q, i) => {
    const item = { category: meta.name, slug: meta.slug, id: q.id ?? `${meta.slug}#${i + 1}`, q: q.q ?? '', answer: answer(q), topic: q.s ?? 'General', explanation: q.e ?? '' }
    const nq = norm(item.q), cq = coreStem(item.q), ne = norm(item.explanation)
    const os = Array.isArray(q.o) ? q.o.map(norm).filter(Boolean) : []
    const osKey = os.length === 4 ? [...os].sort().join(' || ') : ''
    add(exact, nq, item); add(globalExact, nq, item)
    if (cq.length >= 18) { add(core, cq, item); add(globalCore, cq, item) }
    if (ne.length >= 24) { add(expl, ne, item); add(globalExpl, ne, item) }
    if (osKey) { add(optionSets, osKey, item); add(globalOptions, osKey, item) }
    add(answerTopic, `${norm(item.answer)}|${norm(item.topic)}`, item)
    const toks = tokenise(item.q)
    const prefix = toks.slice(0, 6).join(' ')
    if (toks.length >= 6) { prefixCounts.set(prefix, (prefixCounts.get(prefix) ?? 0) + 1); localPrefixes.set(prefix, (localPrefixes.get(prefix) ?? 0) + 1) }
    const seen = new Set()
    for (let n = 5; n <= 7; n += 1) for (let p = 0; p + n <= toks.length; p += 1) {
      const slice = toks.slice(p, p + n)
      if (slice.filter((t) => !stop.has(t)).length < 2) continue
      const phrase = slice.join(' ')
      if (seen.has(phrase)) continue
      seen.add(phrase)
      phraseCounts.set(phrase, (phraseCounts.get(phrase) ?? 0) + 1); localPhrases.set(phrase, (localPhrases.get(phrase) ?? 0) + 1)
      const cats = phraseCategories.get(phrase) ?? new Set(); cats.add(meta.name); phraseCategories.set(phrase, cats)
    }
  })
  const exactGroups = groups(exact), coreGroups = groups(core).filter((g) => new Set(g.map((x) => norm(x.answer))).size <= 2), explGroups = groups(expl), optionGroups = groups(optionSets)
  let near = []
  for (const bucket of answerTopic.values()) {
    if (bucket.length < 2 || bucket.length > 300) continue
    const inverted = new Map()
    for (const item of bucket) for (const t of [...new Set(contentTokens(item.q))].slice(0, 6)) add(inverted, t, item)
    const compared = new Set()
    for (const candidates of inverted.values()) {
      if (candidates.length < 2 || candidates.length > 100) continue
      for (let a = 0; a < candidates.length; a += 1) for (let b = a + 1; b < candidates.length; b += 1) {
        const A = candidates[a], B = candidates[b], key = A.id < B.id ? `${A.id}|${B.id}` : `${B.id}|${A.id}`
        if (compared.has(key) || norm(A.q) === norm(B.q) || coreStem(A.q) === coreStem(B.q)) continue
        compared.add(key)
        const ta = new Set(contentTokens(A.q)), tb = new Set(contentTokens(B.q))
        if (ta.size < 3 || tb.size < 3) continue
        let inter = 0; for (const t of ta) if (tb.has(t)) inter += 1
        const score = inter / (ta.size + tb.size - inter)
        if (inter >= 3 && score >= 0.72) near.push({ score, a: A, b: B })
      }
    }
  }
  near = near.sort((x, y) => y.score - x.score).slice(0, 100)
  categories.push({
    name: meta.name, slug: meta.slug, count: rows.length,
    exactGroups: exactGroups.length, exactExtra: exactGroups.reduce((s, g) => s + g.length - 1, 0),
    coreGroups: coreGroups.length, coreExtra: coreGroups.reduce((s, g) => s + g.length - 1, 0), nearPairs: near.length,
    explanationGroups: explGroups.length, explanationExtra: explGroups.reduce((s, g) => s + g.length - 1, 0),
    optionSetGroups: optionGroups.length, optionSetExtra: optionGroups.reduce((s, g) => s + g.length - 1, 0),
    topPrefixes: [...localPrefixes.entries()].filter(([, c]) => c >= 5).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([phrase, count]) => ({ phrase, count })),
    topPhrases: [...localPhrases.entries()].filter(([, c]) => c >= 8).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([phrase, count]) => ({ phrase, count })),
    examples: { exact: exactGroups.slice(0, 5).map((g) => g.slice(0, 4).map((x) => ({ id: x.id, q: x.q, answer: x.answer }))), core: coreGroups.slice(0, 5).map((g) => g.slice(0, 4).map((x) => ({ id: x.id, q: x.q, answer: x.answer }))), near: near.slice(0, 10).map((p) => ({ score: Number(p.score.toFixed(3)), a: { id: p.a.id, q: p.a.q, answer: p.a.answer }, b: { id: p.b.id, q: p.b.q, answer: p.b.answer } })) }
  })
}

function groupStats(map) { const gs = groups(map); return { groups: gs.length, extra: gs.reduce((s, g) => s + g.length - 1, 0), examples: gs.slice(0, 15).map((g) => g.slice(0, 5).map((x) => ({ category: x.category, id: x.id, q: x.q, answer: x.answer }))) } }
const report = {
  generatedAt: new Date().toISOString(), indexTotal: index.total, loadedTotal: total, categoryCount: categories.length,
  global: { exactQuestion: groupStats(globalExact), sameCoreAfterGenericLeadRemoval: groupStats(globalCore), identicalExplanation: groupStats(globalExpl), identicalOptionSet: groupStats(globalOptions) },
  topOpeningPrefixes: [...prefixCounts.entries()].filter(([, c]) => c >= 10).sort((a, b) => b[1] - a[1]).slice(0, 80).map(([phrase, count]) => ({ phrase, count })),
  topRepeatedPhrases: [...phraseCounts.entries()].filter(([, c]) => c >= 10).sort((a, b) => b[1] - a[1]).slice(0, 120).map(([phrase, count]) => ({ phrase, count, categories: [...(phraseCategories.get(phrase) ?? [])].slice(0, 12) })), categories,
}
fs.mkdirSync(path.join(root, 'audit-output'), { recursive: true })
fs.writeFileSync(path.join(root, 'audit-output', 'gk-world-repetition-report.json'), JSON.stringify(report, null, 2))
let md = `# CSS VISTA GK World repetition audit\n\nGenerated: ${report.generatedAt}\n\nScanned **${total.toLocaleString()}** questions across **${categories.length} categories**. Report only; no data changed.\n\n`
md += `## Global signals\n\n| Signal | Groups | Extra occurrences |\n|---|---:|---:|\n`
for (const [label, key] of [['Exact normalized question','exactQuestion'],['Same core after generic lead-in removal','sameCoreAfterGenericLeadRemoval'],['Identical explanation','identicalExplanation'],['Identical 4-option set','identicalOptionSet']]) { const x = report.global[key]; md += `| ${label} | ${x.groups} | ${x.extra} |\n` }
md += `\n## Category-by-category\n\n| Category | Questions | Exact extras | Core candidates | Near-pair candidates | Repeated explanation extras | Reused option-set extras |\n|---|---:|---:|---:|---:|---:|---:|\n`
for (const c of categories) md += `| ${c.name.replaceAll('|', '/')} | ${c.count} | ${c.exactExtra} | ${c.coreExtra} | ${c.nearPairs} | ${c.explanationExtra} | ${c.optionSetExtra} |\n`
md += `\n## Most repeated opening templates\n\n`; for (const x of report.topOpeningPrefixes.slice(0, 50)) md += `- ${x.count}× — \`${x.phrase}\`\n`
md += `\n## Most repeated 5–7 word phrases\n\n`; for (const x of report.topRepeatedPhrases.slice(0, 80)) md += `- ${x.count}× — \`${x.phrase}\`\n`
md += `\n## Flagged examples by category\n\n`
for (const c of categories.filter((c) => c.exactExtra || c.coreExtra || c.nearPairs || c.explanationExtra || c.optionSetExtra)) {
  md += `### ${c.name}\n\n`
  if (c.examples.exact.length) { md += `**Exact repeats**\n`; for (const g of c.examples.exact) { for (const x of g) md += `- ${x.id}: ${x.q} [${x.answer}]\n`; md += '\n' } }
  if (c.examples.core.length) { md += `**Same-core candidates**\n`; for (const g of c.examples.core) { for (const x of g) md += `- ${x.id}: ${x.q} [${x.answer}]\n`; md += '\n' } }
  if (c.examples.near.length) { md += `**Near-duplicate candidates**\n`; for (const p of c.examples.near) md += `- ${p.score}: ${p.a.id} “${p.a.q}” ↔ ${p.b.id} “${p.b.q}”\n`; md += '\n' }
  if (c.topPrefixes.length) { md += `**Repeated opening templates**\n`; for (const x of c.topPrefixes.slice(0, 5)) md += `- ${x.count}× — \`${x.phrase}\`\n`; md += '\n' }
}
fs.writeFileSync(path.join(root, 'audit-output', 'gk-world-repetition-report.md'), md)
console.log(md)
