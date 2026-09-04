import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const dir = path.join(root, 'public', 'css-subject-mcqs')
const indexPath = path.join(dir, 'index.json')
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))

function hash(value) {
  let h = 2166136261
  for (const ch of String(value)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function choose(id, values) { return values[hash(id) % values.length] }
function qText(q) { return q.question ?? q.q ?? q.text ?? '' }
function setText(q, value) { if ('question' in q || !('q' in q)) q.question = value; else q.q = value }
function idOf(q, i, slug) { return q.id ?? `${slug}#${i+1}` }
function options(q) { return q.options ?? q.o ?? [] }
function answerText(q) {
  const a = q.answer ?? q.a ?? q.correctAnswer ?? q.correct
  const os = options(q)
  if (Number.isInteger(a)) return String(os[a] ?? '')
  return typeof a === 'string' ? a : ''
}
const norm = v => String(v ?? '').normalize('NFKC').toLocaleLowerCase().replace(/[’‘]/g,"'").replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim()

function polishLaw(text, id) {
  let m
  if ((m = text.match(/^When (.+), which limitation should be kept in view\?$/i))) {
    const x = m[1]
    return choose(id,[
      `What limitation applies when ${x}?`,
      `Which qualification matters when ${x}?`,
      `What constraint should be considered when ${x}?`,
      `Which limitation is relevant when ${x}?`,
      `What limiting condition applies when ${x}?`,
      `Which legal qualification applies when ${x}?`,
      `What restriction should be kept in mind when ${x}?`,
      `Which constraint is material when ${x}?`,
      `What qualification should be considered when ${x}?`,
      `Which limiting rule applies when ${x}?`,
      `What legal limitation bears on ${x}?`,
      `Which restriction is relevant to ${x}?`,
    ])
  }
  if ((m = text.match(/^With reference to (.+), which proposition most accurately states the rule concerning (.+)\?$/i))) {
    const [,context,subject] = m
    return choose(id,[
      `Under ${context}, what is the rule concerning ${subject}?`,
      `Which rule applies to ${subject} under ${context}?`,
      `How is the rule on ${subject} stated under ${context}?`,
      `What proposition governs ${subject} in ${context}?`,
      `Which statement correctly gives the rule on ${subject} under ${context}?`,
      `What is the governing proposition on ${subject} under ${context}?`,
      `Which legal rule concerns ${subject} in ${context}?`,
      `How should the rule concerning ${subject} be stated under ${context}?`,
      `Which proposition applies to ${subject} under ${context}?`,
      `What rule governs ${subject} when ${context} applies?`,
      `Which statement accurately states the law on ${subject} under ${context}?`,
      `What is the applicable rule for ${subject} under ${context}?`,
    ])
  }
  if ((m = text.match(/^In applying (.+), which qualification is legally significant\?$/i))) {
    const x = m[1]
    return choose(id,[
      `What legal qualification matters when applying ${x}?`,
      `Which qualification is important when ${x} is applied?`,
      `What qualifying condition applies to ${x}?`,
      `Which legal qualification must be considered in applying ${x}?`,
      `What qualification is material to ${x}?`,
      `Which limiting qualification applies to ${x}?`,
      `What legal qualification should be considered for ${x}?`,
      `Which qualification affects the application of ${x}?`,
      `What condition qualifies the application of ${x}?`,
      `Which legal qualification bears on ${x}?`,
      `What qualification is relevant when applying ${x}?`,
      `Which qualifying rule is significant for ${x}?`,
    ])
  }
  return text
}

function polishZoology(text, id) {
  let m
  if ((m = text.match(/^One of the following concept[–—-]feature associations is valid\. Which one\? The focal concept is (.+)\.$/i))) {
    const x=m[1]
    return choose(id,[
      `Which concept–feature association is correct for ${x}?`,
      `Which feature is correctly associated with ${x}?`,
      `What association correctly describes ${x}?`,
      `Which statement gives the correct feature of ${x}?`,
      `Which feature–concept pairing is valid for ${x}?`,
      `What feature correctly matches ${x}?`,
      `Which association with ${x} is scientifically correct?`,
      `Which option correctly pairs a feature with ${x}?`,
    ])
  }
  if ((m = text.match(/^In a comparative[–—-]anatomy problem, the defining clue is: (.+)\. The most appropriate identification is:$/i))) {
    const d=m[1]
    return choose(id,[
      `Which concept is identified by this comparative-anatomy clue: ${d}?`,
      `What structure or process matches this comparative-anatomy clue: ${d}?`,
      `Identify the concept described by this comparative-anatomy clue: ${d}.`,
      `Which zoological term fits this comparative-anatomy description: ${d}?`,
      `What is the best identification for this comparative-anatomy clue: ${d}?`,
      `Which concept best matches the following comparative-anatomy description: ${d}?`,
      `In comparative anatomy, what does this clue identify: ${d}?`,
      `Which term is indicated by this comparative-anatomy clue: ${d}?`,
    ])
  }
  if ((m = text.match(/^A specimen or process is characterized by the following: (.+)\. Select the scientifically correct term\.$/i))) {
    const d=m[1]
    return choose(id,[
      `Which scientific term matches this description: ${d}?`,
      `What zoological term is described here: ${d}?`,
      `Identify the scientifically correct term for: ${d}.`,
      `Which term best describes the following: ${d}?`,
      `What is the correct scientific term for this feature or process: ${d}?`,
      `Which zoological concept fits this description: ${d}?`,
      `What term corresponds to the following description: ${d}?`,
      `Which scientific identification is correct for: ${d}?`,
    ])
  }
  if ((m = text.match(/^Which concept would a zoologist invoke to explain this observation: (.+)\.$/i))) {
    const d=m[1]
    return choose(id,[
      `Which zoological concept explains this observation: ${d}?`,
      `What concept best explains this zoological observation: ${d}?`,
      `Which term accounts for the following observation: ${d}?`,
      `What zoological concept is illustrated by this observation: ${d}?`,
      `Which concept best fits this observation: ${d}?`,
      `What zoological principle or structure explains: ${d}?`,
      `Which scientific concept corresponds to this observation: ${d}?`,
      `What concept should be used to explain this observation: ${d}?`,
    ])
  }
  return text
}

function polishGeography(text,id) {
  let m
  if ((m=text.match(/^Which factor or process is most directly indicated by this evidence: (.+)\.$/i))) {
    const d=m[1]
    return choose(id,[
      `What factor or process best explains this evidence: ${d}?`,
      `Which process is indicated by the following evidence: ${d}?`,
      `What geographic factor is most strongly suggested by: ${d}?`,
      `Which factor best accounts for this evidence: ${d}?`,
      `What process is directly supported by this observation: ${d}?`,
      `Which geographic process best fits this evidence: ${d}?`,
      `What factor or process is implied by: ${d}?`,
      `Which process most directly explains the following: ${d}?`,
    ])
  }
  if ((m=text.match(/^For exam purposes, which characterization of (.+) is scientifically correct\?$/i))) {
    const x=m[1]
    return choose(id,[
      `Which characterization of ${x} is scientifically correct?`,
      `What is the scientifically correct description of ${x}?`,
      `Which statement correctly characterizes ${x}?`,
      `How is ${x} scientifically characterized?`,
      `Which description of ${x} is correct?`,
      `What statement accurately describes ${x}?`,
      `Which scientific characterization best fits ${x}?`,
      `Which option gives the correct description of ${x}?`,
    ])
  }
  if ((m=text.match(/^For an FPSC-style objective paper, the most defensible label for the following is: (.+)\.$/i))) {
    const d=m[1]
    return choose(id,[
      `Which geographic term best matches this description: ${d}?`,
      `What is the correct geographic label for: ${d}?`,
      `Which term describes the following: ${d}?`,
      `Identify the geographic concept described here: ${d}.`,
      `What geographic term corresponds to this description: ${d}?`,
      `Which label is correct for the following: ${d}?`,
      `What concept is described by: ${d}?`,
      `Which geographic concept best fits this description: ${d}?`,
    ])
  }
  return text
}

function polishSindhi(text) {
  let q=text
  q=q.replace(/^.*?سان گڏ ساڳئي ادبي حصي جي تقابلي تياري[^،]*،\s*/u,'')
  q=q.replace(/^.*?کي ويجهن ادبي صنفن سان ڀيٽيندي،\s*/u,'')
  q=q.replace(/\s*\(\s*[0-9۰-۹]+\s*\)\s*$/u,'')
  return q.replace(/\s+/g,' ').trim()
}

let changedQuestions=0
let removedMercantile=0
for (const meta of index.subjects) {
  const filePath=path.join(dir,meta.file)
  if (!fs.existsSync(filePath)) continue
  let rows=JSON.parse(fs.readFileSync(filePath,'utf8'))
  if (!Array.isArray(rows)) continue
  let touched=false
  rows=rows.map((q,i)=>{
    const next={...q}
    const before=qText(next)
    const id=idOf(next,i,meta.slug)
    let after=before
    if (meta.slug==='law') after=polishLaw(after,id)
    if (meta.slug==='zoology') after=polishZoology(after,id)
    if (meta.slug==='geography') after=polishGeography(after,id)
    if (meta.slug==='sindhi') after=polishSindhi(after)
    if (after!==before) { setText(next,after); touched=true; changedQuestions++ }
    return next
  })

  if (meta.slug==='mercantile-law') {
    const groups=new Map()
    for (const q of rows) {
      const text=norm(qText(q))
      const isCompetitionVariant = /^which competition act provision is most directly associated with the rule described as (?:a prohibited anti competitive agreement|anti competitive agreements|the prohibited agreements provision)$/.test(text)
      if (!isCompetitionVariant) continue
      const key=`competition-prohibited-agreements|${norm(answerText(q))}`
      const g=groups.get(key)??[]; g.push(q); groups.set(key,g)
    }
    const remove=new Set()
    for (const g of groups.values()) if (g.length>1) for (const q of g.slice(1)) remove.add(q.id)
    if (remove.size) {
      rows=rows.filter(q=>!remove.has(q.id))
      removedMercantile+=remove.size
      touched=true
    }
  }

  if (touched) fs.writeFileSync(filePath,JSON.stringify(rows)+'\n')
  meta.count=rows.length
  meta.topics=[...new Set(rows.map(q=>q.topic).filter(Boolean))]
}
index.total=index.subjects.reduce((sum,s)=>sum+s.count,0)
fs.writeFileSync(indexPath,JSON.stringify(index,null,2)+'\n')
console.log(JSON.stringify({changedQuestions,removedMercantile,total:index.total},null,2))
