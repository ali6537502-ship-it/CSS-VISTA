import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const dir = path.join(root, 'public', 'css-subject-mcqs')
const indexPath = path.join(dir, 'index.json')
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))

const norm = (v) => String(v ?? '')
  .normalize('NFKC')
  .toLocaleLowerCase()
  .replace(/[’‘]/g, "'")
  .replace(/[‐‑‒–—−]/g, '-')
  .replace(/[^\p{L}\p{N}\p{S}]+/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const wordNorm = (v) => String(v ?? '')
  .normalize('NFKC')
  .toLocaleLowerCase()
  .replace(/[’‘]/g, "'")
  .replace(/[‐‑‒–—−]/g, '-')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stop = new Set('a an and are as at be by can did do does for from has have how in into is it its of on or that the their there these this to under was were what when where which who whom whose why with would following correct correctly best option options statement statements identify select choose regarding about according most directly rule'.split(' '))
const tokens = (v) => wordNorm(v).split(' ').filter(t => t && t.length > 2 && !stop.has(t))

function hashId(value) {
  let h = 2166136261
  for (const ch of String(value)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) }
  return Math.abs(h >>> 0)
}
function pick(id, values) { return values[hashId(id) % values.length] }
function rowsOf(data) {
  if (Array.isArray(data)) return data
  for (const key of ['questions','items','mcqs','data']) if (Array.isArray(data?.[key])) return data[key]
  return []
}
function qText(q) { return q.question ?? q.q ?? q.text ?? '' }
function getOptions(q) { return q.options ?? q.o ?? [] }
function answerText(q) {
  const os = getOptions(q)
  const a = q.answer ?? q.a ?? q.correctAnswer ?? q.correct
  if (Number.isInteger(a)) return os[a] ?? String(a)
  return typeof a === 'string' ? a : ''
}
function explanation(q) { return q.explanation ?? q.e ?? q.rationale ?? '' }
function topic(q) { return q.topic ?? q.subtopic ?? q.s ?? 'General' }
function idOf(q, i, slug) { return q.id ?? `${slug}#${i+1}` }

const quantitativeOrFormulaHeavy = new Set([
  'accounting-and-auditing','applied-mathematics','chemistry','computer-science',
  'physics','pure-mathematics','statistics'
])

function polishQuestion(slug, question, id) {
  let q = String(question ?? '').replace(/\s+/g, ' ').trim()

  // Remove production/topic labels that create artificial variants but carry no examinable fact.
  if (slug === 'persian') {
    q = q.replace(/\s*\[موضوع\s*[۰-۹0-9]+\]\s*$/u, '').trim()
    q = q.replace(/^مرور متن مقرر\s*[۰-۹0-9]+\s*:\s*/u, '').trim()
  }

  // Sindhi source banks contain repeated syllabus-context lead-ins before the same assertion pair.
  // Keep the actual statements and answer task; remove only the repetitive contextual wrapper.
  if (slug === 'sindhi') {
    q = q.replace(/^.*?(?:سان گڏ ساڳئي ادبي حصي جي تقابلي تياري[ءَء] ۾|کي ٻين مقرر شاعرن سان تقابلي طور پڙهندي|جي لساني پسمنظر ۾|جي تقابلي تياري[ءَء] ۾)،\s*(بيان\s*I\s*:)/u, '$1')
  }

  // Strip overt exam-production filler without changing the tested proposition.
  q = q.replace(/^For CSS preparation,\s*/i, '')
  q = q.replace(/\s+in this syllabus area\b/gi, '')
  q = q.replace(/\s+for this syllabus area\b/gi, '')
  q = q.replace(/from a related concept in this syllabus area/gi, 'from a related concept')
  q = q.replace(/^In a comparative anatomy problem,\s*/i, 'In comparative anatomy, ')
  q = q.replace(/^An examiner gives this diagnostic statement\s*:\s*/i, 'Which concept matches this description: ')

  let m
  if ((m = q.match(/^Which consequence follows most directly from (.+)\?$/i))) {
    const x = m[1]
    const template = pick(id, [
      `What is the most direct consequence of ${x}?`,
      `Under ${x}, what follows most directly?`,
      `Which result follows directly from ${x}?`,
      `What follows most directly from ${x}?`,
      `Which outcome is the direct result of ${x}?`,
      `What is the immediate legal or practical consequence of ${x}?`,
    ])
    q = template
  } else if ((m = q.match(/^Which proposition correctly identifies the scope of (.+)\?$/i))) {
    const x = m[1]
    q = pick(id, [
      `What is the scope of ${x}?`,
      `Which statement defines the scope of ${x}?`,
      `How far does ${x} extend?`,
      `Which description correctly states the scope of ${x}?`,
      `What does ${x} cover?`,
    ])
  } else if ((m = q.match(/^Which implication best follows from (.+)\?$/i))) {
    const x = m[1]
    q = pick(id, [
      `What implication follows from ${x}?`,
      `Which implication arises from ${x}?`,
      `What does ${x} imply?`,
      `Which conclusion follows from ${x}?`,
      `What is implied by ${x}?`,
    ])
  } else if ((m = q.match(/^Which limitation should be kept in view(?: when applying)? (.+)\?$/i))) {
    const x = m[1]
    q = pick(id, [
      `What limitation applies to ${x}?`,
      `Which limitation qualifies ${x}?`,
      `What constraint should be considered in ${x}?`,
      `Which restriction is relevant to ${x}?`,
      `What limiting condition applies to ${x}?`,
    ])
  } else if ((m = q.match(/^In practical procedure, which consequence is most likely to follow from (.+)\?$/i))) {
    const x = m[1]
    q = pick(id, [
      `In practice, what consequence follows from ${x}?`,
      `Procedurally, what is the likely result of ${x}?`,
      `What practical consequence follows from ${x}?`,
      `Which procedural result follows from ${x}?`,
    ])
  } else if ((m = q.match(/^Which statement best follows from the (.+?) rule concerning (.+)\?$/i))) {
    q = `What follows from the ${m[1]} rule concerning ${m[2]}?`
  }

  return q.replace(/\s+/g, ' ').trim()
}

function canonicalQuestion(slug, value) {
  let q = norm(value)
  q = q.replace(/^['“”]+|['“”]+$/g, '').trim()
  if (slug === 'persian') {
    q = q.replace(/^متن مقرر\s+/u, '')
    q = q.replace(/نویسنده\s*\/\s*شاعر/gu, 'نویسنده')
  }
  if (slug === 'sindhi') {
    const pos = q.indexOf('بيان i')
    if (pos >= 0) q = q.slice(pos)
  }
  return q
}

function quality(q) {
  const text = qText(q)
  let score = 0
  if (String(explanation(q)).trim()) score += 6
  if (text.length <= 140) score += 3
  if (text.length <= 95) score += 2
  if (/^(who|what|when|where|which|how|in which|during which)\b/i.test(text)) score += 3
  if (/in an exam problem centred on|most directly applicable .* topic would be|for css preparation|syllabus area/i.test(text)) score -= 20
  score += Math.min(String(answerText(q)).length, 80) / 80
  return score
}

function removeGrouped(rows, removed, keyFor, reason) {
  const groups = new Map()
  for (const q of rows) {
    if (removed.has(q.id)) continue
    const key = keyFor(q)
    if (!key) continue
    const g = groups.get(key) ?? []; g.push(q); groups.set(key, g)
  }
  let n = 0
  for (const g of groups.values()) {
    if (g.length < 2) continue
    const keep = [...g].sort((a,b) => quality(b)-quality(a) || qText(a).length-qText(b).length || String(a.id).localeCompare(String(b.id)))[0]
    for (const q of g) if (q.id !== keep.id && !removed.has(q.id)) { removed.set(q.id, reason); n++ }
  }
  return n
}

function jaccard(a,b) {
  const A = new Set(tokens(a)), B = new Set(tokens(b))
  if (!A.size || !B.size) return {score:0, inter:0}
  let inter=0; for (const t of A) if (B.has(t)) inter++
  return {score: inter/(A.size+B.size-inter), inter}
}

function nearDedupe(slug, rows, removed) {
  if (quantitativeOrFormulaHeavy.has(slug) || slug === 'sindhi') return 0
  const buckets = new Map()
  for (const q of rows) {
    if (removed.has(q.id)) continue
    const ans = wordNorm(answerText(q))
    if (!ans) continue
    const key = (slug === 'persian' || slug === 'mercantile-law') ? ans : `${wordNorm(topic(q))}|${ans}`
    const g = buckets.get(key) ?? []; g.push(q); buckets.set(key,g)
  }
  let count=0
  for (const group of buckets.values()) {
    if (group.length < 2 || group.length > 350) continue
    const ranked=[...group].sort((a,b)=>quality(b)-quality(a) || String(a.id).localeCompare(String(b.id)))
    const kept=[]
    for (const q of ranked) {
      let dup=false
      for (const k of kept) {
        const cmp=jaccard(qText(q), qText(k))
        const threshold = slug === 'persian' ? 0.70 : 0.72
        const minInter = slug === 'persian' ? 2 : 3
        if (cmp.inter >= minInter && cmp.score >= threshold) { dup=true; break }
      }
      if (dup) { removed.set(q.id,'high-confidence near-duplicate of same answer/fact'); count++ }
      else kept.push(q)
    }
  }
  return count
}

function isTautologicalMeta(q) {
  const text=qText(q), ans=wordNorm(answerText(q))
  if (!ans) return false
  const m=text.match(/^In an exam problem centred on ['“](.+?)['”], the most directly applicable .+? topic would be:/i)
  return Boolean(m && wordNorm(m[1]) === ans)
}

const report={before:0,after:0,removed:0,polished:0,subjects:[]}

for (const meta of index.subjects) {
  const filePath=path.join(dir,meta.file)
  if (!fs.existsSync(filePath)) continue
  const source=JSON.parse(fs.readFileSync(filePath,'utf8'))
  const originalRows=rowsOf(source)
  report.before += originalRows.length

  const rows=originalRows.map((raw,i)=>{
    const q={...raw}
    q.id=idOf(q,i,meta.slug)
    const old=qText(q)
    const polished=polishQuestion(meta.slug,old,q.id)
    if ('question' in q || !('q' in q)) q.question=polished; else q.q=polished
    if (polished !== old) report.polished++
    return q
  })

  const removed=new Map()
  const reasons={}
  const add=(name,n)=>{ if(n) reasons[name]=(reasons[name]??0)+n }

  for (const q of rows) if (isTautologicalMeta(q)) removed.set(q.id,'tautological repeated exam-template question')
  add('tautological repeated exam-template question',[...removed.values()].filter(x=>x==='tautological repeated exam-template question').length)

  add('same canonical question', removeGrouped(rows,removed,q=>canonicalQuestion(meta.slug,qText(q)),'same canonical question'))

  // Identical explanation + same correct answer represents the same learning fact/rule; keep the best direct formulation.
  if (!quantitativeOrFormulaHeavy.has(meta.slug)) {
    add('same explanation and answer', removeGrouped(rows,removed,q=>{
      const e=wordNorm(explanation(q)); const a=wordNorm(answerText(q))
      return e.length>=20 && a ? `${e}|${a}` : ''
    },'same explanation and answer'))
  }

  add('high-confidence near-duplicate of same answer/fact',nearDedupe(meta.slug,rows,removed))

  // Re-run canonical grouping after removals/polishing to ensure metadata cleanup cannot leave a second copy.
  add('same canonical question after cleanup',removeGrouped(rows,removed,q=>canonicalQuestion(meta.slug,qText(q)),'same canonical question after cleanup'))

  const retained=rows.filter(q=>!removed.has(q.id))
  const changed = removed.size > 0 || retained.some((q,i)=>qText(q)!==qText(originalRows[i]??{}))
  if (changed) fs.writeFileSync(filePath, JSON.stringify(retained)+'\n')

  meta.count=retained.length
  meta.topics=[...new Set(retained.map(q=>q.topic).filter(Boolean))]
  report.after += retained.length
  report.removed += removed.size
  report.subjects.push({slug:meta.slug,name:meta.name,before:originalRows.length,after:retained.length,removed:removed.size,reasons})
}

index.total=index.subjects.reduce((s,x)=>s+x.count,0)
index.generatedAt=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())+'T00:00:00.000Z'
index.policy='All structurally complete owner-supplied questions are connected after removal of exact, reciprocal, high-confidence duplicate facts and repetitive production-template variants. Distinct facts and legitimate quantitative/formula variants are retained.'
fs.writeFileSync(indexPath, JSON.stringify(index,null,2)+'\n')

fs.mkdirSync(path.join(root,'cleanup-output'),{recursive:true})
fs.writeFileSync(path.join(root,'cleanup-output','css-mcq-repetition-cleanup.json'),JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report,null,2))
