import fs from 'node:fs'
import path from 'node:path'

const sourceDir = path.resolve(process.argv[2] || 'public/css-subject-mcqs-source')
const outputDir = path.resolve(process.argv[3] || 'public/css-subject-mcqs-curated')

const subjectCaps = new Map(Object.entries({
  'agriculture-forestry': 140,
  criminology: 28,
  'english-literature': 45,
  'environmental-sciences': 45,
  'international-law': 22,
  'islamic-studies': 180,
  law: 55,
  'mercantile-law': 140,
  'muslim-law-jurisprudence': 160,
  physics: 140,
  'political-science': 140,
  'public-administration': 160,
  sociology: 85,
  statistics: 140,
  'town-planning-urban-management': 160,
  zoology: 140,
}))

const clean = (value) => String(value ?? '')
  .normalize('NFKC')
  .replace(/^\s*(?:Q(?:uestion)?\s*)?\d{1,4}[.):\-]\s*/i, '')
  .replace(/\s+/g, ' ')
  .trim()

const key = (value) => clean(value).toLocaleLowerCase('en')

function stableHash(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function usable(question) {
  const text = clean(question.question)
  const options = Array.isArray(question.options) ? question.options.map(clean) : []
  const explanation = clean(question.explanation)
  const source = clean(question.source)
  if (text.length < 16 || text.length > 280) return false
  if (options.length !== 4 || options.some((option) => option.length < 2 || option.length > 180)) return false
  if (new Set(options.map(key)).size !== 4) return false
  if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) return false
  if (explanation.length < 20 && source.length < 8) return false
  if (/\b(?:placeholder|lorem ipsum|answer not available|correct answer is not provided)\b/i.test(`${text} ${options.join(' ')}`)) return false
  if (/^(?:none|all)\s+of\s+(?:these|the above)$/i.test(options[question.answer])) return false
  return true
}

function normalizedTopic(question) {
  const topic = clean(question.topic)
  if (!topic || /mcq bank|multiple-choice questions|examination-oriented/i.test(topic)) {
    return `General ${clean(question.subject)}`
  }
  return topic
}

function prepare(question) {
  return {
    id: question.id,
    subject: clean(question.subject),
    topic: normalizedTopic(question),
    question: clean(question.question),
    options: question.options.map(clean),
    answer: question.answer,
    explanation: clean(question.explanation) || null,
    sourceDocument: clean(question.sourceDocument),
    source: clean(question.source) || null,
    verification: 'source-supplied; structurally quality-gated by CSS Vista',
  }
}

function selectBalanced(rows, cap, salt) {
  const unique = new Map()
  rows.filter(usable).map(prepare).forEach((question) => {
    const identity = `${key(question.question)}|${question.options.map(key).join('|')}`
    if (!unique.has(identity)) unique.set(identity, question)
  })

  const buckets = new Map()
  for (const question of unique.values()) {
    const topic = question.topic
    if (!buckets.has(topic)) buckets.set(topic, [])
    buckets.get(topic).push(question)
  }
  const topics = [...buckets.keys()].sort((left, right) => stableHash(`${salt}|${left}`) - stableHash(`${salt}|${right}`))
  topics.forEach((topic) => buckets.get(topic).sort((left, right) => stableHash(`${salt}|${left.id}`) - stableHash(`${salt}|${right.id}`)))

  const selected = []
  const answerCounts = [0, 0, 0, 0]
  const answerCap = Math.ceil(cap / 4) + 4
  while (selected.length < cap) {
    let progressed = false
    for (const topic of topics) {
      const bucket = buckets.get(topic)
      const index = bucket.findIndex((question) => answerCounts[question.answer] < answerCap)
      if (index < 0) continue
      const [question] = bucket.splice(index, 1)
      selected.push(question)
      answerCounts[question.answer] += 1
      progressed = true
      if (selected.length >= cap) break
    }
    if (!progressed) break
  }

  if (selected.length < cap) {
    const chosen = new Set(selected.map((question) => question.id))
    const remaining = [...unique.values()]
      .filter((question) => !chosen.has(question.id))
      .sort((left, right) => stableHash(`${salt}|fallback|${left.id}`) - stableHash(`${salt}|fallback|${right.id}`))
    selected.push(...remaining.slice(0, cap - selected.length))
  }
  return selected
}

const sourceIndex = JSON.parse(fs.readFileSync(path.join(sourceDir, 'index.json'), 'utf8'))
fs.mkdirSync(outputDir, { recursive: true })

const subjects = []
for (const subject of sourceIndex.subjects) {
  const cap = subjectCaps.get(subject.slug)
  if (!cap) continue
  const rows = JSON.parse(fs.readFileSync(path.join(sourceDir, subject.file), 'utf8'))
  const selected = selectBalanced(rows, cap, subject.slug)
  if (!selected.length) continue
  const file = `${subject.slug}.json`
  fs.writeFileSync(path.join(outputDir, file), `${JSON.stringify(selected)}\n`)
  subjects.push({
    slug: subject.slug,
    name: subject.name,
    designation: subject.designation,
    group: subject.group,
    count: selected.length,
    topics: [...new Set(selected.map((question) => question.topic))].sort(),
    file,
    sourceCount: rows.length,
    audit: 'answer/options/source structure checked; source-supplied facts require normal academic verification',
  })
}

const total = subjects.reduce((sum, subject) => sum + subject.count, 0)
const index = {
  batch: '2026-08-22-curated-pilot',
  generatedAt: new Date().toISOString(),
  policy: 'A deliberately limited, structurally quality-gated selection. The full 50,482-question donor bank is not connected.',
  total,
  subjects,
}
fs.writeFileSync(path.join(outputDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`)
console.log(JSON.stringify({ outputDir, total, subjects: subjects.length, counts: subjects.map(({ name, count }) => ({ name, count })) }, null, 2))
