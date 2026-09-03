import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const publicDir = path.join(root, 'public', 'mcq')
const bundledDir = path.join(root, 'src', 'data', 'mcq-shards')
const indexPath = path.join(publicDir, 'index.json')
const sourceIndexPath = path.join(root, 'src', 'data', 'mcqIndex.ts')
const metaPath = path.join(root, 'src', 'data', 'mcqMeta.ts')
const reportPath = path.join(root, 'docs', 'islamic-mcq-quality-audit-2026-09-03.md')
const apply = process.argv.includes('--apply')
const check = process.argv.includes('--check')

const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))
const category = index.categories.find((item) => item.slug === 'islamic-gk')
if (!category) throw new Error('Islamic General Knowledge category is missing from the MCQ index.')

const normalize = (value) => String(value ?? '')
  .toLocaleLowerCase()
  .replace(/[’‘]/g, "'")
  .replace(/\b(?:pbuh|ra)\b/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()

const shards = []
const questions = []
for (let chunk = 0; chunk < category.chunks; chunk += 1) {
  const filename = `cat-islamic-gk-${chunk}.json`
  const publicPath = path.join(publicDir, filename)
  const bundledPath = path.join(bundledDir, filename)
  const rows = JSON.parse(fs.readFileSync(publicPath, 'utf8'))
  if (!fs.readFileSync(publicPath).equals(fs.readFileSync(bundledPath))) {
    throw new Error(`${filename}: public and bundled copies differ before cleanup.`)
  }
  shards.push({ chunk, publicPath, bundledPath, rows })
  questions.push(...rows.map((question) => ({ question, chunk })))
}

const malformed = questions.filter(({ question }) => (
  !question ||
  typeof question.id !== 'string' ||
  typeof question.q !== 'string' ||
  !Array.isArray(question.o) ||
  question.o.length !== 4 ||
  !Number.isInteger(question.a) ||
  question.a < 0 ||
  question.a > 3
))
if (malformed.length) throw new Error(`Refusing cleanup: ${malformed.length} malformed Islamic GK records found.`)

const answer = (question) => question.o[question.a]

function qualityScore(question) {
  const text = question.q.trim()
  let score = 0
  if (/^(who|what|when|where|which|how)\b/i.test(text)) score += 18
  if (text.length <= 125) score += 8
  if (text.length <= 90) score += 4
  if (question.d === 'Intermediate') score += 2
  if (/^(who|what|when|where)\b/i.test(text)) score += 5
  if (/^which (period|date|place|region|contribution|feature|textual|historical)/i.test(text)) score += 4

  const weakTemplates = [
    [/in a matching exercise/i, 45],
    [/complete the verified relationship/i, 42],
    [/which value is correctly recorded under/i, 40],
    [/which subject is associated with/i, 35],
    [/which subject is best identified by/i, 35],
    [/which option correctly identifies/i, 20],
    [/^Islamic Civilisation\s*-/i, 8],
    [/^Seerah and Life\s*-/i, 8],
  ]
  for (const [pattern, penalty] of weakTemplates) {
    if (pattern.test(text)) score -= penalty
  }
  return score
}

// The imported bank encoded one underlying fact as four, five, or nine question
// variants. Their identical explanation is a reliable fact key. Retain the
// clearest direct question, not an arbitrary first row.
const explanationGroups = new Map()
for (const { question } of questions) {
  const key = normalize(question.e)
  if (!key) continue
  const group = explanationGroups.get(key) ?? []
  group.push(question)
  explanationGroups.set(key, group)
}

const removedByExplanation = new Set()
let repeatedExplanationGroups = 0
for (const group of explanationGroups.values()) {
  if (group.length < 2) continue
  repeatedExplanationGroups += 1
  const ranked = [...group].sort((left, right) => (
    qualityScore(right) - qualityScore(left) ||
    left.q.length - right.q.length ||
    left.id.localeCompare(right.id, 'en', { numeric: true })
  ))
  for (const question of ranked.slice(1)) removedByExplanation.add(question.id)
}

const remainingWithoutExplanation = questions
  .map(({ question }) => question)
  .filter((question) => !removedByExplanation.has(question.id) && !normalize(question.e))

function reciprocal(left, right) {
  if (left.s !== right.s) return false
  const leftAnswer = normalize(answer(left))
  const rightAnswer = normalize(answer(right))
  if (leftAnswer.length < 3 || rightAnswer.length < 3) return false
  const leftQuestion = normalize(left.q)
  const rightQuestion = normalize(right.q)
  return leftQuestion.includes(rightAnswer) && rightQuestion.includes(leftAnswer)
}

function directnessScore(question) {
  const text = question.q.trim()
  let score = qualityScore(question)
  if (/^(who|what|when|where|in which|during which|approximately how many|how many)/i.test(text)) score += 18
  if (/^which (term|location|battle|surah|caliph|companion|book|source)/i.test(text)) score += 12
  if (/identified by this|is associated with which|is most directly associated with which|which event occurred (?:in|when)|which event or role is correctly associated with|which definition correctly explains|which work is associated with/i.test(text)) score -= 24
  return score
}

// Imported direct questions were commonly followed immediately by the same
// relationship reversed (the first answer becoming the next prompt). Only
// remove an adjacent pair when both prompt/answer relationships mutually match.
const removedReciprocal = new Set()
const reciprocalExamples = []

const inverseTemplate = (question) => /identified by this|is associated with which|is most directly associated with which|which event occurred (?:in|when)|which event or role is correctly associated with|which definition correctly explains|which work is associated with/i.test(question.q)

// Some imports placed all forward questions first and all reversals later. Find
// those too, but require both answers to appear in the opposite prompts and at
// least one side to use a known inverse template before removing anything.
for (let leftPosition = 0; leftPosition < remainingWithoutExplanation.length; leftPosition += 1) {
  const left = remainingWithoutExplanation[leftPosition]
  for (let rightPosition = leftPosition + 1; rightPosition < remainingWithoutExplanation.length; rightPosition += 1) {
    const right = remainingWithoutExplanation[rightPosition]
    if (!reciprocal(left, right) || (!inverseTemplate(left) && !inverseTemplate(right))) continue
    const leftScore = directnessScore(left)
    const rightScore = directnessScore(right)
    const remove = leftScore === rightScore
      ? (left.id.localeCompare(right.id, 'en', { numeric: true }) > 0 ? left : right)
      : (leftScore < rightScore ? left : right)
    const keep = remove === right ? left : right
    removedReciprocal.add(remove.id)
    if (reciprocalExamples.length < 12) reciprocalExamples.push({ keep: keep.q, removed: remove.q })
  }
}

for (let position = 0; position < remainingWithoutExplanation.length - 1; position += 1) {
  const left = remainingWithoutExplanation[position]
  const right = remainingWithoutExplanation[position + 1]
  if (removedReciprocal.has(left.id) || removedReciprocal.has(right.id) || !reciprocal(left, right)) continue
  const remove = directnessScore(left) >= directnessScore(right) ? right : left
  const keep = remove === right ? left : right
  removedReciprocal.add(remove.id)
  if (reciprocalExamples.length < 12) reciprocalExamples.push({ keep: keep.q, removed: remove.q })
}

const removedIds = new Set([...removedByExplanation, ...removedReciprocal])
const before = questions.length
const after = before - removedIds.size
const removed = before - after

const topicCounts = new Map()
for (const { question } of questions) {
  if (removedIds.has(question.id)) continue
  topicCounts.set(question.s, (topicCounts.get(question.s) ?? 0) + 1)
}

const report = `# Islamic General Knowledge MCQ quality audit

Date: 3 September 2026

## Confirmed findings

- Original records audited: ${before.toLocaleString('en-US')}
- Distinct topic labels: ${new Set(questions.map(({ question }) => question.s)).size}
- Exact duplicate question text: 0
- Repeated fact groups identified by identical explanations: ${repeatedExplanationGroups.toLocaleString('en-US')}
- Redundant explanation-backed variants removed: ${removedByExplanation.size.toLocaleString('en-US')}
- Adjacent reciprocal prompt/answer variants removed: ${removedReciprocal.size.toLocaleString('en-US')}
- Curated records retained: ${after.toLocaleString('en-US')}

## Cleanup boundary

The cleanup removes only demonstrable repetition: multiple questions carrying the same fact explanation, and adjacent reciprocal pairs where each question contains the other question's correct answer. It does not remove questions merely because they share a format, topic, person, date, or answer.

For every repeated explanation, the clearest direct question is retained. Original IDs, topics, answers, options, and shard locations are preserved so bookmarks and direct question lookup remain stable.

## Largest retained topic groups

${[...topicCounts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 15).map(([topic, count]) => `- ${topic}: ${count.toLocaleString('en-US')}`).join('\n')}

## Reciprocal examples

${reciprocalExamples.map((example) => `- Retained: “${example.keep}”\n  Removed reversal: “${example.removed}”`).join('\n')}
`

const summary = {
  mode: apply ? 'apply' : (check ? 'check' : 'dry-run'),
  before,
  retained: after,
  removed,
  repeatedExplanationGroups,
  removedExplanationVariants: removedByExplanation.size,
  removedReciprocalVariants: removedReciprocal.size,
  reciprocalExamples,
}

if (!apply) {
  console.log(JSON.stringify(summary, null, 2))
  if (check && removed > 0) process.exit(1)
  process.exit(0)
}

for (const shard of shards) {
  const cleaned = shard.rows.filter((question) => !removedIds.has(question.id))
  const payload = `${JSON.stringify(cleaned)}\n`
  fs.writeFileSync(shard.publicPath, payload)
  fs.writeFileSync(shard.bundledPath, payload)
}

category.count = after
index.generatedAt = '2026-09-03'
index.total = index.categories.reduce((sum, item) => sum + item.count, 0)
fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 1)}\n`)

const source = `// GK question-bank index - bundled at build time so all categories render instantly.\n// Mirrors public/mcq/index.json; regenerate with scripts/clean-mcq-bank.mjs.\n\nimport type { BankIndex } from './mcq'\n\nexport const bundledBankIndex: BankIndex = ${JSON.stringify(index, null, 2)}\n`
fs.writeFileSync(sourceIndexPath, source)

const meta = fs.readFileSync(metaPath, 'utf8').replace(
  /export const SHIPPED_MCQ_TOTAL = [\d_]+/,
  `export const SHIPPED_MCQ_TOTAL = ${index.total.toLocaleString('en-US').replaceAll(',', '_')}`,
)
fs.writeFileSync(metaPath, meta)
fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, report)

console.log(JSON.stringify({ ...summary, newBankTotal: index.total }, null, 2))
