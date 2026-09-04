import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const dir = path.join(root, 'public', 'css-subject-mcqs')
const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'))

const norm = (v) => String(v ?? '')
  .normalize('NFKC')
  .toLocaleLowerCase()
  .replace(/[’‘]/g, "'")
  .replace(/[^\p{L}\p{N}\p{S}]+/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stop = new Set('a an and are as at be by can did do does for from has have how in into is it its of on or that the their there these this to under was were what when where which who whom whose why with would following correct correctly best option options statement statements identify select choose regarding about according'.split(' '))
const tokenise = (v) => norm(v).split(' ').filter(Boolean)
const contentTokens = (v) => tokenise(v).filter(t => t.length > 2 && !stop.has(t))

const genericLeadPatterns = [
  /^which of the following /,
  /^which one of the following /,
  /^which statement about /,
  /^which statement regarding /,
  /^which option correctly /,
  /^which option best /,
  /^which option /,
  /^what is the /,
  /^what was the /,
  /^what does /,
  /^who was the /,
  /^who is the /,
  /^according to /,
  /^in the context of /,
  /^in relation to /,
]
function coreStem(v) {
  let x = norm(v)
  for (const p of genericLeadPatterns) x = x.replace(p, '')
  return x.trim()
}

function getRows(data) {
  if (Array.isArray(data)) return data
  for (const key of ['questions', 'items', 'mcqs', 'data']) if (Array.isArray(data?.[key])) return data[key]
  return []
}
function qText(q) { return q.question ?? q.q ?? q.text ?? '' }
function opts(q) { return q.options ?? q.o ?? [] }
function answer(q) {
  const os = opts(q)
  const a = q.answer ?? q.a ?? q.correctAnswer ?? q.correct
  if (Number.isInteger(a)) return os[a] ?? String(a)
  return typeof a === 'string' ? a : ''
}
function expl(q) { return q.explanation ?? q.e ?? q.rationale ?? '' }
function topic(q) { return q.topic ?? q.subtopic ?? q.s ?? 'General' }
function id(q, i, slug) { return q.id ?? `${slug}#${i + 1}` }
function addMap(map, key, item) {
  if (!key) return
  const arr = map.get(key) ?? []
  arr.push(item)
  map.set(key, arr)
}

const subjects = []
const globalExact = new Map()
const globalCore = new Map()
const globalExplanation = new Map()
const globalOptionSets = new Map()
const prefixCounts = new Map()
const ngramCounts = new Map()
const ngramSubjects = new Map()
let total = 0

for (const meta of index.subjects) {
  const file = path.join(dir, meta.file)
  if (!fs.existsSync(file)) {
    subjects.push({ name: meta.name, slug: meta.slug, count: 0, missing: true })
    continue
  }
  const rows = getRows(JSON.parse(fs.readFileSync(file, 'utf8')))
  total += rows.length
  const exact = new Map(), core = new Map(), explanations = new Map(), optionSets = new Map(), answerTopic = new Map()
  const subjectPrefixes = new Map()
  const subjectPhrases = new Map()
  let repeatedOptionsInside = 0
  let malformedOptions = 0

  rows.forEach((q, i) => {
    const item = { subject: meta.name, slug: meta.slug, id: id(q, i, meta.slug), q: qText(q), answer: answer(q), topic: topic(q), explanation: expl(q) }
    const nq = norm(item.q)
    const cq = coreStem(item.q)
    const ne = norm(item.explanation)
    const os = opts(q).map(norm).filter(Boolean)
    const osKey = os.length ? [...os].sort().join(' || ') : ''
    if (os.length !== 4) malformedOptions += 1
    else if (new Set(os).size !== 4) repeatedOptionsInside += 1

    addMap(exact, nq, item); addMap(globalExact, nq, item)
    if (cq.length >= 18) { addMap(core, cq, item); addMap(globalCore, cq, item) }
    if (ne.length >= 30) { addMap(explanations, ne, item); addMap(globalExplanation, ne, item) }
    if (osKey) { addMap(optionSets, osKey, item); addMap(globalOptionSets, osKey, item) }

    const atKey = `${norm(item.answer)}|${norm(item.topic)}`
    addMap(answerTopic, atKey, item)

    const toks = tokenise(item.q)
    const prefix = toks.slice(0, 6).join(' ')
    if (prefix.split(' ').length >= 4) {
      prefixCounts.set(prefix, (prefixCounts.get(prefix) ?? 0) + 1)
      subjectPrefixes.set(prefix, (subjectPrefixes.get(prefix) ?? 0) + 1)
    }
    const seenNgrams = new Set()
    for (let n = 5; n <= 7; n++) {
      for (let p = 0; p + n <= toks.length; p++) {
        const gramToks = toks.slice(p, p + n)
        if (gramToks.filter(t => !stop.has(t)).length < 2) continue
        const gram = gramToks.join(' ')
        if (seenNgrams.has(gram)) continue
        seenNgrams.add(gram)
        ngramCounts.set(gram, (ngramCounts.get(gram) ?? 0) + 1)
        subjectPhrases.set(gram, (subjectPhrases.get(gram) ?? 0) + 1)
        const set = ngramSubjects.get(gram) ?? new Set(); set.add(meta.name); ngramSubjects.set(gram, set)
      }
    }
  })

  const groups = (m) => [...m.values()].filter(g => g.length > 1)
  const exactGroups = groups(exact)
  const coreGroups = groups(core).filter(g => new Set(g.map(x => norm(x.answer))).size <= 2)
  const explanationGroups = groups(explanations)
  const optionSetGroups = groups(optionSets)

  let nearPairs = []
  for (const bucket of answerTopic.values()) {
    if (bucket.length < 2 || bucket.length > 250) continue
    const tokenBuckets = new Map()
    for (const item of bucket) {
      const toks = [...new Set(contentTokens(item.q))]
      for (const t of toks.slice(0, 5)) addMap(tokenBuckets, t, item)
    }
    const compared = new Set()
    for (const candidates of tokenBuckets.values()) {
      if (candidates.length < 2 || candidates.length > 80) continue
      for (let a = 0; a < candidates.length; a++) for (let b = a + 1; b < candidates.length; b++) {
        const A = candidates[a], B = candidates[b]
        const key = A.id < B.id ? `${A.id}|${B.id}` : `${B.id}|${A.id}`
        if (compared.has(key) || norm(A.q) === norm(B.q) || coreStem(A.q) === coreStem(B.q)) continue
        compared.add(key)
        const ta = new Set(contentTokens(A.q)), tb = new Set(contentTokens(B.q))
        if (ta.size < 3 || tb.size < 3) continue
        let inter = 0; for (const t of ta) if (tb.has(t)) inter++
        const score = inter / (ta.size + tb.size - inter)
        if (inter >= 3 && score >= 0.72) nearPairs.push({ score, a: A, b: B })
      }
    }
  }
  nearPairs = nearPairs.sort((x,y) => y.score - x.score).slice(0, 50)

  subjects.push({
    name: meta.name, slug: meta.slug, count: rows.length,
    exactGroups: exactGroups.length, exactExtra: exactGroups.reduce((s,g)=>s+g.length-1,0),
    coreGroups: coreGroups.length, coreExtra: coreGroups.reduce((s,g)=>s+g.length-1,0),
    explanationGroups: explanationGroups.length, explanationExtra: explanationGroups.reduce((s,g)=>s+g.length-1,0),
    optionSetGroups: optionSetGroups.length, optionSetExtra: optionSetGroups.reduce((s,g)=>s+g.length-1,0),
    repeatedOptionsInside, malformedOptions,
    nearPairs: nearPairs.length,
    topOpeningPrefixes: [...subjectPrefixes.entries()].filter(([,c])=>c>=5).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([phrase,count])=>({phrase,count})),
    topRepeatedPhrases: [...subjectPhrases.entries()].filter(([,c])=>c>=8).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([phrase,count])=>({phrase,count})),
    examples: {
      exact: exactGroups.slice(0,3).map(g => g.slice(0,3).map(x => ({id:x.id,q:x.q,answer:x.answer}))),
      core: coreGroups.slice(0,3).map(g => g.slice(0,3).map(x => ({id:x.id,q:x.q,answer:x.answer}))),
      explanation: explanationGroups.slice(0,2).map(g => ({ explanation:g[0].explanation, items:g.slice(0,3).map(x=>({id:x.id,q:x.q})) })),
      optionSet: optionSetGroups.slice(0,2).map(g => g.slice(0,3).map(x=>({id:x.id,q:x.q}))),
      near: nearPairs.slice(0,5).map(p => ({score:Number(p.score.toFixed(3)),a:{id:p.a.id,q:p.a.q,answer:p.a.answer},b:{id:p.b.id,q:p.b.q,answer:p.b.answer}})),
    }
  })
}

const groupStats = (m) => {
  const gs = [...m.values()].filter(g => g.length > 1)
  return { groups: gs.length, extra: gs.reduce((s,g)=>s+g.length-1,0), examples: gs.slice(0,10).map(g=>g.slice(0,4).map(x=>({subject:x.subject,id:x.id,q:x.q,answer:x.answer}))) }
}
const topPrefixes = [...prefixCounts.entries()].filter(([,c])=>c>=10).sort((a,b)=>b[1]-a[1]).slice(0,50)
const topPhrases = [...ngramCounts.entries()].filter(([g,c])=>c>=10 && (ngramSubjects.get(g)?.size ?? 0)>=1).sort((a,b)=>b[1]-a[1]).slice(0,100).map(([phrase,count])=>({phrase,count,subjects:[...(ngramSubjects.get(phrase)??[])].slice(0,10)}))

const report = {
  generatedAt: new Date().toISOString(),
  indexTotal: index.total,
  loadedTotal: total,
  subjectCount: subjects.length,
  currentGlobal: {
    exactQuestion: groupStats(globalExact),
    normalizedCoreQuestion: groupStats(globalCore),
    identicalExplanation: groupStats(globalExplanation),
    identicalOptionSet: groupStats(globalOptionSets),
  },
  topOpeningPrefixes: topPrefixes.map(([phrase,count])=>({phrase,count})),
  topRepeatedPhrases: topPhrases,
  subjects,
}

fs.mkdirSync(path.join(root, 'audit-output'), {recursive:true})
fs.writeFileSync(path.join(root, 'audit-output', 'css-mcq-repetition-report.json'), JSON.stringify(report,null,2))

let md = `# CSS VISTA CSS-subject MCQ repetition audit\n\nGenerated: ${report.generatedAt}\n\nCurrent connected questions scanned: **${total.toLocaleString()}** across **${subjects.length} subjects**.\n\n`
md += `## Global repetition signals\n\n| Signal | Groups | Extra occurrences |\n|---|---:|---:|\n`
for (const [label,key] of [['Exact question text','exactQuestion'],['Same question after generic lead-in removal','normalizedCoreQuestion'],['Identical explanation','identicalExplanation'],['Identical 4-option set','identicalOptionSet']]) {
  const x=report.currentGlobal[key]; md += `| ${label} | ${x.groups} | ${x.extra} |\n`
}
md += `\n## Subject-by-subject\n\n| Subject | Questions | Exact extras | Core-text extras | Near pairs | Repeated explanation extras | Reused option-set extras | Repeated options inside MCQ |\n|---|---:|---:|---:|---:|---:|---:|---:|\n`
for (const s of subjects) md += `| ${s.name.replaceAll('|','/')} | ${s.count} | ${s.exactExtra??0} | ${s.coreExtra??0} | ${s.nearPairs??0} | ${s.explanationExtra??0} | ${s.optionSetExtra??0} | ${s.repeatedOptionsInside??0} |\n`
md += `\n## Most repeated opening phrases\n\n`
for (const p of report.topOpeningPrefixes.slice(0,30)) md += `- ${p.count}× — \`${p.phrase}\`\n`
md += `\n## Most repeated 5–7 word phrases\n\n`
for (const p of report.topRepeatedPhrases.slice(0,50)) md += `- ${p.count}× — \`${p.phrase}\`\n`
md += `\n## Examples by subject\n\n`
for (const s of subjects.filter(s => (s.exactExtra||s.coreExtra||s.nearPairs||s.explanationExtra||s.optionSetExtra||s.repeatedOptionsInside))) {
  md += `### ${s.name}\n\n`
  if (s.examples?.exact?.length) { md += `**Exact repeats**\n`; for (const g of s.examples.exact) { for (const x of g) md += `- ${x.id}: ${x.q} [${x.answer}]\n`; md += `\n` } }
  if (s.examples?.core?.length) { md += `**Same core wording / generic lead-in variant**\n`; for (const g of s.examples.core) { for (const x of g) md += `- ${x.id}: ${x.q} [${x.answer}]\n`; md += `\n` } }
  if (s.examples?.near?.length) { md += `**Near-duplicate candidates**\n`; for (const p of s.examples.near) md += `- ${p.score}: ${p.a.id} “${p.a.q}” ↔ ${p.b.id} “${p.b.q}”\n`; md += `\n` }
  if (s.topOpeningPrefixes?.length) { md += `**Repeated opening templates**\n`; for (const p of s.topOpeningPrefixes.slice(0,5)) md += `- ${p.count}× — \`${p.phrase}\`\n`; md += `\n` }
}
fs.writeFileSync(path.join(root, 'audit-output', 'css-mcq-repetition-report.md'), md)
console.log(md)
