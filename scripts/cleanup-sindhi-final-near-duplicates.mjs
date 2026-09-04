import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const filePath = path.join(root, 'public', 'css-subject-mcqs', 'sindhi.json')
const indexPath = path.join(root, 'public', 'css-subject-mcqs', 'index.json')
const rows = JSON.parse(fs.readFileSync(filePath, 'utf8'))
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))

const normalise = (value) => String(value ?? '')
  .normalize('NFKC')
  .toLocaleLowerCase()
  .replace(/[’‘]/g, "'")
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim()

const stopWords = new Set([
  'a','an','and','answer','are','as','at','be','best','by','choose','correct','correctly',
  'does','for','from','has','identify','in','is','it','of','on','option','or','select',
  'that','the','this','to','was','were','what','when','where','which','who','with','under','following',
])
const tokens = (value) => new Set(normalise(value).split(' ').filter(token => token.length > 2 && !stopWords.has(token)))

function similarity(leftValue, rightValue) {
  const left = tokens(leftValue)
  const right = tokens(rightValue)
  if (!left.size || !right.size) return { score: 0, intersection: 0 }
  let intersection = 0
  for (const token of left) if (right.has(token)) intersection += 1
  return { score: intersection / (left.size + right.size - intersection), intersection }
}

const answerText = (q) => Array.isArray(q.options) && Number.isInteger(q.answer) ? (q.options[q.answer] ?? '') : ''
const explanation = (q) => q.explanation ?? ''
const topic = (q) => q.topic ?? 'General'

function qualityScore(q) {
  let score = 0
  const text = String(q.question ?? '')
  if (text.length <= 140) score += 5
  if (text.length <= 95) score += 3
  if (String(explanation(q)).trim()) score += 2
  return score
}

const buckets = new Map()
for (const q of rows) {
  const key = `${normalise(topic(q))}|${normalise(answerText(q))}`
  const group = buckets.get(key) ?? []
  group.push(q)
  buckets.set(key, group)
}

const removed = new Set()
for (const group of buckets.values()) {
  if (group.length < 2) continue
  const ranked = [...group].sort((a,b) => qualityScore(b) - qualityScore(a) || String(a.id).localeCompare(String(b.id), 'en', {numeric:true}))
  const kept = []
  for (const q of ranked) {
    const duplicate = kept.some(candidate => {
      const comparison = similarity(q.question, candidate.question)
      if (comparison.intersection < 3) return false
      const sameExplanation = normalise(explanation(q)).length >= 12 && normalise(explanation(q)) === normalise(explanation(candidate))
      return comparison.score >= 0.84 || (sameExplanation && comparison.score >= 0.64)
    })
    if (duplicate) removed.add(q.id)
    else kept.push(q)
  }
}

const retained = rows.filter(q => !removed.has(q.id))
fs.writeFileSync(filePath, JSON.stringify(retained) + '\n')
const meta = index.subjects.find(subject => subject.slug === 'sindhi')
if (meta) {
  meta.count = retained.length
  meta.topics = [...new Set(retained.map(q => q.topic).filter(Boolean))]
}
index.total = index.subjects.reduce((sum, subject) => sum + subject.count, 0)
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n')
console.log(JSON.stringify({before: rows.length, removed: removed.size, after: retained.length}, null, 2))
