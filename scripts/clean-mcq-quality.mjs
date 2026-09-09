import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const apply = process.argv.includes('--apply')
const check = process.argv.includes('--check')
const verbose = process.argv.includes('--verbose')
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date())

const publicMcqDir = path.join(root, 'public', 'mcq')
const bundledMcqDir = path.join(root, 'src', 'data', 'mcq-shards')
const subjectDir = path.join(root, 'public', 'css-subject-mcqs')
const bankIndexPath = path.join(publicMcqDir, 'index.json')
const subjectIndexPath = path.join(subjectDir, 'index.json')
const sourceIndexPath = path.join(root, 'src', 'data', 'mcqIndex.ts')
const metaPath = path.join(root, 'src', 'data', 'mcqMeta.ts')
const reportPath = path.join(root, 'docs', 'mcq-quality-audit-2026-09-04.md')

const exactNormalise = (value) => String(value ?? '')
  .normalize('NFKC')
  .toLocaleLowerCase()
  .replace(/[’‘]/g, "'")
  .replace(/[^\p{L}\p{N}\p{S}]+/gu, ' ')
  .trim()

const normalise = (value) => String(value ?? '')
  .normalize('NFKC')
  .toLocaleLowerCase()
  .replace(/[’‘]/g, "'")
  .replace(/\b(?:pbuh|ra|r\.a\.)\b/g, '')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim()

const stopWords = new Set([
  'a', 'an', 'and', 'answer', 'are', 'as', 'at', 'be', 'best', 'by', 'choose',
  'correct', 'correctly', 'does', 'for', 'from', 'has', 'identify', 'in', 'is',
  'it', 'of', 'on', 'option', 'or', 'select', 'that', 'the', 'this', 'to', 'was',
  'were', 'what', 'when', 'where', 'which', 'who', 'with', 'under', 'following',
])

const tokens = (value) => new Set(normalise(value).split(' ').filter((token) => (
  !stopWords.has(token)
  && (token.length > 2 || /\d/.test(token) || /^[a-z]$/.test(token))
)))

function similarity(leftValue, rightValue) {
  const left = tokens(leftValue)
  const right = tokens(rightValue)
  if (!left.size || !right.size) return { score: 0, intersection: 0 }
  let intersection = 0
  for (const token of left) if (right.has(token)) intersection += 1
  return { score: intersection / (left.size + right.size - intersection), intersection }
}

function stripNearDuplicateNoise(value) {
  return String(value ?? '')
    .replace(/\s*\[parallel drill \d+\]\s*$/i, '')
    .replace(/_{2,}/g, '_')
    .replace(/\bmain\s+(?=layers?\b)/i, '')
    .trim()
}

function discriminatingSignature(value) {
  const raw = String(value ?? '').normalize('NFKC')
  const quoted = [...raw.matchAll(/[“"]([^”"]+)[”"]/g)].map((match) => normalise(match[1]))
  const numeric = raw.match(/\b\d+(?:[.,]\d+)?%?\b/g) ?? []
  const algebraic = raw.match(/\b[A-Za-z]\s*(?:\([^)]{1,24}\)|[=+\-*/^]\s*[A-Za-z0-9().+\-*/^]{1,24})/g) ?? []
  const chemical = raw.match(/[A-Za-z]{1,3}[A-Za-z0-9₀-₉⁰-⁹⁺⁻]*[0-9₀-₉⁰-⁹⁺⁻]/gu) ?? []
  return [...quoted, ...numeric.map(normalise), ...algebraic.map(normalise), ...chemical.map(normalise)].sort().join('|')
}

function isStatementCombination(value) {
  return /\bstatement\s+(?:i|ii)\b|بيان\s*(?:i|ii)/iu.test(String(value ?? ''))
}

const gkQuestion = (question) => question.q
const gkAnswer = (question) => question.o[question.a]
const cssQuestion = (question) => question.question
const cssAnswer = (question) => question.options[question.answer]

function splitMatch(value) {
  const parts = String(value).split(/\s+[–—-]\s+/, 2)
  return parts.length === 2 ? parts : null
}

function relationSignature(rawQuestion, rawAnswer) {
  const question = String(rawQuestion).trim()
  const answer = String(rawAnswer).trim()
  const matchAnswer = splitMatch(answer)
  if (matchAnswer) {
    const [term, definition] = matchAnswer
    if (term.length >= 2 && definition.length >= 4) return `${normalise(term)}=>${normalise(definition)}`
  }

  const symbolForward = question.match(/^which (?:chemical )?element (?:has|does .* have) (?:the )?(?:chemical )?symbol [“"]?(.+?)[”"]?\??$/i)
  if (symbolForward) return `${normalise(answer)}=>symbol ${normalise(symbolForward[1])}`
  const symbolReverse = question.match(/^what is (?:the )?(?:chemical )?symbol for [“"]?(.+?)[”"]?\??$/i)
  if (symbolReverse) return `${normalise(symbolReverse[1])}=>symbol ${normalise(answer)}`

  const descriptionPatterns = [
    /which (?:scientific )?term matches this description\s*:\s*(.+?)[?]?$/i,
    /which (?:subject|concept|person|place|event|organisation|organization|institution|work|book|theory|term) is (?:best )?(?:identified|associated) (?:by|with) (?:this )?(?:description|definition|theme|basis|period|date|place|region|contribution|feature)?\s*[:“"]+\s*(.+?)[”"]?[?]?$/i,
    /in .+?, which (?:scientific )?term matches this description\s*:\s*(.+?)[?]?$/i,
  ]
  for (const pattern of descriptionPatterns) {
    const match = question.match(pattern)
    if (match?.[1] && answer.length >= 2) return `${normalise(answer)}=>${normalise(match[1])}`
  }

  const definitionPatterns = [
    /which option best defines [“"](.+?)[”"]\??$/i,
    /which option correctly identifies (?:the )?.*? of [“"]?(.+?)[”"]?\??$/i,
    /which option correctly describes [“"]?(.+?)[”"]?\??$/i,
    /what is the best meaning or function of [“"]?(.+?)[”"]?\??$/i,
    /which statement about [“"]?(.+?)[”"]? is correct\??$/i,
  ]
  for (const pattern of definitionPatterns) {
    const match = question.match(pattern)
    if (!match?.[1] || answer.length < 4) continue
    const cleanedAnswer = answer.replace(new RegExp(`^${match[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+is associated with\\s+`, 'i'), '')
    return `${normalise(match[1])}=>${normalise(cleanedAnswer)}`
  }

  return ''
}

function qualityScore(questionText, answerText, explanationText = '') {
  let score = 0
  if (/^(who|what|when|where|which|how|in which|during which)\b/i.test(questionText)) score += 16
  if (questionText.length <= 140) score += 5
  if (questionText.length <= 95) score += 3
  if (String(explanationText).trim()) score += 2
  if (/^(who|what|when|where)\b/i.test(questionText)) score += 3
  if (/which option correctly matches|which statement about|best meaning or function|matching exercise|identify the entity|select the entity|correctly associated/i.test(questionText)) score -= 18
  if (/in the .+ subtopic|within .+ which option/i.test(questionText)) score -= 8
  if (/on which date|what date|when did/i.test(questionText)) score += 12
  if (/which month|news agency published/i.test(questionText)) score -= 24
  if (splitMatch(answerText)) score -= 3
  return score
}

function polishGkQuestion(question) {
  const next = { ...question }
  next.q = next.q.replace(/^In the Important Personalities section,\s*/i, '')
  const directMeaning = next.q.match(/^Within (.+?), which option correctly describes (.+?)\?$/i)
  if (directMeaning) {
    const [, subject, term] = directMeaning
    next.q = /^[A-Z0-9-]{2,12}$/.test(term)
      ? `What does ${term} stand for?`
      : `What does ${term} mean in ${subject}?`
  }

  const datedEvent = next.q.match(/^(?:When did this development take place|In which year did the following occur)\s*:\s*(.+?)\?$/i)
  if (datedEvent) next.q = `In which year did ${datedEvent[1]}?`
  return next
}

function keepBest(group, getQuestion, getAnswer, getExplanation) {
  return [...group].sort((left, right) => (
    qualityScore(getQuestion(right), getAnswer(right), getExplanation(right)) -
      qualityScore(getQuestion(left), getAnswer(left), getExplanation(left)) ||
    getQuestion(left).length - getQuestion(right).length ||
    String(left.id).localeCompare(String(right.id), 'en', { numeric: true })
  ))[0]
}

function markGroupedDuplicates({ questions, removed, reason, keyFor, getQuestion, getAnswer, getExplanation, requireSameAnswer = false }) {
  const groups = new Map()
  for (const question of questions) {
    if (removed.has(question.id)) continue
    const key = keyFor(question)
    if (!key) continue
    const group = groups.get(key) ?? []
    group.push(question)
    groups.set(key, group)
  }
  let count = 0
  for (const group of groups.values()) {
    if (group.length < 2) continue
    const candidates = requireSameAnswer
      ? Object.values(Object.groupBy(group, (question) => normalise(getAnswer(question))))
      : [group]
    for (const candidateGroup of candidates) {
      if (!candidateGroup || candidateGroup.length < 2) continue
      const keep = keepBest(candidateGroup, getQuestion, getAnswer, getExplanation)
      for (const question of candidateGroup) {
        if (question.id === keep.id || removed.has(question.id)) continue
        removed.set(question.id, reason)
        count += 1
      }
    }
  }
  return count
}

function markNearDuplicates({ questions, removed, getQuestion, getAnswer, getTopic, getExplanation }) {
  const buckets = new Map()
  for (const question of questions) {
    if (removed.has(question.id)) continue
    const key = `${normalise(getTopic(question))}|${normalise(getAnswer(question))}`
    const group = buckets.get(key) ?? []
    group.push(question)
    buckets.set(key, group)
  }

  let count = 0
  for (const group of buckets.values()) {
    if (group.length < 2) continue
    const ranked = [...group].sort((left, right) => (
      qualityScore(getQuestion(right), getAnswer(right), getExplanation(right)) -
        qualityScore(getQuestion(left), getAnswer(left), getExplanation(left)) ||
      String(left.id).localeCompare(String(right.id), 'en', { numeric: true })
    ))
    const kept = []
    for (const question of ranked) {
      const duplicate = kept.some((candidate) => {
        const questionStem = stripNearDuplicateNoise(getQuestion(question))
        const candidateStem = stripNearDuplicateNoise(getQuestion(candidate))
        const canonicalQuestion = exactNormalise(questionStem)
        const canonicalCandidate = exactNormalise(candidateStem)
        if (canonicalQuestion && canonicalQuestion === canonicalCandidate) return true
        if (isStatementCombination(questionStem) || isStatementCombination(candidateStem)) return false
        const comparison = similarity(questionStem, candidateStem)
        if (comparison.intersection < 3) return false
        const sameExplanation = normalise(getExplanation(question)).length >= 12 &&
          normalise(getExplanation(question)) === normalise(getExplanation(candidate))
        return sameExplanation
          && comparison.score >= 0.64
          && discriminatingSignature(questionStem) === discriminatingSignature(candidateStem)
      })
      if (duplicate) {
        removed.set(question.id, 'near-identical wording of the same fact')
        count += 1
      } else {
        kept.push(question)
      }
    }
  }
  return count
}

const safeExplanationCategories = new Set([
  'awards-honours', 'capitals', 'computer-basics', 'currencies', 'deserts',
  'discoveries-inventions', 'economics', 'first-world', 'important-days',
  'important-personalities', 'international-organisations', 'largest-longest',
  'misc-gk', 'mountains', 'oceans-seas', 'pakistan-geography', 'pakistan-history',
  'rivers', 'solar-system', 'united-nations',
])

function cleanGkCategory(category, questions) {
  const removed = new Map()
  const getExplanation = (question) => question.e ?? ''
  const reasons = {}
  const record = (name, count) => { reasons[name] = count }

  record('exact repeated stem', markGroupedDuplicates({
    questions, removed, reason: 'exact repeated stem',
    keyFor: (question) => exactNormalise(question.q),
    getQuestion: gkQuestion, getAnswer: gkAnswer, getExplanation,
    requireSameAnswer: true,
  }))

  if (safeExplanationCategories.has(category.slug) || category.slug === 'english-grammar') {
    record('identical fact or learning rule', markGroupedDuplicates({
      questions, removed, reason: 'identical fact or learning rule',
      keyFor: (question) => normalise(question.e).length >= 12 ? normalise(question.e) : '',
      getQuestion: gkQuestion, getAnswer: gkAnswer, getExplanation,
    }))
  } else if (category.slug === 'countries-continents') {
    record('identical geographic fact', markGroupedDuplicates({
      questions, removed, reason: 'identical geographic fact',
      keyFor: (question) => {
        const value = normalise(question.e)
        return value.length >= 12 && !/established answer to this static general knowledge question/.test(value) ? value : ''
      },
      getQuestion: gkQuestion, getAnswer: gkAnswer, getExplanation,
    }))
  }

  record('reciprocal fact variant', markGroupedDuplicates({
    questions, removed, reason: 'reciprocal fact variant',
    keyFor: (question) => relationSignature(question.q, gkAnswer(question)),
    getQuestion: gkQuestion, getAnswer: gkAnswer, getExplanation,
  }))

  if (category.slug === 'current-affairs') {
    record('same news report metadata', markGroupedDuplicates({
      questions, removed, reason: 'same news report metadata',
      keyFor: (question) => normalise(question.q.match(/[“"](.+?)[”"]/)?.[1]),
      getQuestion: gkQuestion, getAnswer: gkAnswer, getExplanation,
    }))
  }

  record('near-identical wording of the same fact', markNearDuplicates({
    questions, removed,
    getQuestion: gkQuestion,
    getAnswer: gkAnswer,
    getTopic: (question) => question.s ?? 'General',
    getExplanation,
  }))

  return { retained: questions.filter((question) => !removed.has(question.id)), removed, reasons }
}

function cleanCssSubject(subject, questions) {
  const removed = new Map()
  const getExplanation = (question) => question.explanation ?? ''
  const reasons = {}
  const record = (name, count) => { reasons[name] = count }

  record('exact repeated stem', markGroupedDuplicates({
    questions, removed, reason: 'exact repeated stem',
    keyFor: (question) => exactNormalise(question.question),
    getQuestion: cssQuestion, getAnswer: cssAnswer, getExplanation,
    requireSameAnswer: true,
  }))
  record('reciprocal fact variant', markGroupedDuplicates({
    questions, removed, reason: 'reciprocal fact variant',
    keyFor: (question) => relationSignature(question.question, cssAnswer(question)),
    getQuestion: cssQuestion, getAnswer: cssAnswer, getExplanation,
  }))
  record('near-identical wording of the same fact', markNearDuplicates({
    questions, removed,
    getQuestion: cssQuestion,
    getAnswer: cssAnswer,
    getTopic: (question) => question.topic ?? 'General',
    getExplanation,
  }))
  return { retained: questions.filter((question) => !removed.has(question.id)), removed, reasons }
}

const bankIndex = JSON.parse(fs.readFileSync(bankIndexPath, 'utf8'))
const gkResults = []
for (const category of bankIndex.categories) {
  const shards = []
  const questions = []
  for (let chunk = 0; chunk < category.chunks; chunk += 1) {
    const filename = `cat-${category.slug}-${chunk}.json`
    const publicPath = path.join(publicMcqDir, filename)
    const bundledPath = path.join(bundledMcqDir, filename)
    if (!fs.existsSync(bundledPath)) throw new Error(`${filename}: bundled copy is missing.`)
    if (!fs.readFileSync(publicPath).equals(fs.readFileSync(bundledPath))) throw new Error(`${filename}: public and bundled copies differ.`)
    const rows = JSON.parse(fs.readFileSync(publicPath, 'utf8'))
    shards.push({ publicPath, bundledPath, rows })
    questions.push(...rows)
  }
  const result = cleanGkCategory(category, questions)
  gkResults.push({ category, shards, before: questions.length, ...result })
}

const subjectIndex = JSON.parse(fs.readFileSync(subjectIndexPath, 'utf8'))
const cssResults = subjectIndex.subjects.map((subject) => {
  const filePath = path.join(subjectDir, subject.file)
  const questions = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  return { subject, filePath, before: questions.length, ...cleanCssSubject(subject, questions) }
})

const gkRemoved = gkResults.reduce((sum, result) => sum + result.removed.size, 0)
const cssRemoved = cssResults.reduce((sum, result) => sum + result.removed.size, 0)
const summary = {
  mode: apply ? 'apply' : (check ? 'check' : 'dry-run'),
  gk: { before: gkResults.reduce((sum, result) => sum + result.before, 0), removed: gkRemoved },
  css: { before: cssResults.reduce((sum, result) => sum + result.before, 0), removed: cssRemoved },
  categories: gkResults.filter((result) => result.removed.size).map((result) => ({
    slug: result.category.slug, before: result.before, removed: result.removed.size, retained: result.retained.length, reasons: result.reasons,
  })),
  subjects: cssResults.filter((result) => result.removed.size).map((result) => ({
    slug: result.subject.slug, before: result.before, removed: result.removed.size, retained: result.retained.length, reasons: result.reasons,
  })),
  ...(verbose ? {
    candidates: {
      gk: gkResults.flatMap((result) => [...result.removed.entries()].map(([id, reason]) => ({ id, reason }))),
      css: cssResults.flatMap((result) => [...result.removed.entries()].map(([id, reason]) => ({ id, reason }))),
    },
  } : {}),
}

if (!apply) {
  console.log(JSON.stringify(summary, null, 2))
  if (check && (gkRemoved || cssRemoved)) process.exit(1)
  process.exit(0)
}

for (const result of gkResults) {
  const polishedById = new Map(result.retained.map((question) => {
    const polished = polishGkQuestion(question)
    return [polished.id, polished]
  }))
  for (const shard of result.shards) {
    const retained = shard.rows
      .filter((question) => !result.removed.has(question.id))
      .map((question) => polishedById.get(question.id) ?? question)
    const payload = `${JSON.stringify(retained)}\n`
    fs.writeFileSync(shard.publicPath, payload)
    fs.writeFileSync(shard.bundledPath, payload)
  }
  result.category.count = result.retained.length
}
bankIndex.generatedAt = today
bankIndex.total = bankIndex.categories.reduce((sum, category) => sum + category.count, 0)
fs.writeFileSync(bankIndexPath, `${JSON.stringify(bankIndex, null, 1)}\n`)
fs.writeFileSync(sourceIndexPath, `// GK question-bank index - bundled at build time so all categories render instantly.\n// Mirrors public/mcq/index.json; regenerate with scripts/clean-mcq-quality.mjs.\n\nimport type { BankIndex } from './mcq'\n\nexport const bundledBankIndex: BankIndex = ${JSON.stringify(bankIndex, null, 2)}\n`)
fs.writeFileSync(metaPath, fs.readFileSync(metaPath, 'utf8').replace(
  /export const SHIPPED_MCQ_TOTAL = [\d_]+/,
  `export const SHIPPED_MCQ_TOTAL = ${bankIndex.total.toLocaleString('en-US').replaceAll(',', '_')}`,
))

for (const result of cssResults) {
  fs.writeFileSync(result.filePath, `${JSON.stringify(result.retained)}\n`)
  result.subject.count = result.retained.length
  result.subject.topics = [...new Set(result.retained.map((question) => question.topic).filter(Boolean))]
  result.subject.audit = 'four distinct options, recoverable answer, stable ID, source attribution and high-confidence duplicate facts checked'
}
subjectIndex.generatedAt = `${today}T00:00:00.000Z`
subjectIndex.policy = 'All structurally complete owner-supplied questions are connected after conservative removal of exact, reciprocal and high-confidence fact duplicates. Unresolved source items are counted, never guessed.'
subjectIndex.total = subjectIndex.subjects.reduce((sum, subject) => sum + subject.count, 0)
fs.writeFileSync(subjectIndexPath, `${JSON.stringify(subjectIndex, null, 2)}\n`)

const lines = [
  '# CSS VISTA MCQ quality audit', '', `Date: ${today}`, '',
  '## Result', '',
  `- Central GK/MPT bank audited: ${summary.gk.before.toLocaleString('en-US')}`,
  `- Demonstrably repetitive GK/MPT variants removed: ${summary.gk.removed.toLocaleString('en-US')}`,
  `- Curated GK/MPT questions retained: ${(summary.gk.before - summary.gk.removed).toLocaleString('en-US')}`,
  `- CSS subject-bank questions audited: ${summary.css.before.toLocaleString('en-US')}`,
  `- Exact, reciprocal or high-confidence near-duplicate CSS variants removed: ${summary.css.removed.toLocaleString('en-US')}`,
  `- CSS subject-bank questions retained: ${(summary.css.before - summary.css.removed).toLocaleString('en-US')}`,
  '', '## Safety boundary', '',
  'The cleanup does not invent questions or answers. It removes only exact repeated stems with the same answer, repeated fact/rule groups in known generated categories, reciprocal term-definition variants, repeated metadata prompts for the same news report, and high-confidence near-identical wording within the same topic and correct answer. Distinct facts are retained even when they share an answer.',
  '', '## GK/MPT categories changed', '',
  ...summary.categories.map((row) => `- ${row.slug}: ${row.before.toLocaleString('en-US')} → ${row.retained.toLocaleString('en-US')} (${row.removed.toLocaleString('en-US')} removed)`),
  '', '## CSS subjects changed', '',
  ...summary.subjects.map((row) => `- ${row.slug}: ${row.before.toLocaleString('en-US')} → ${row.retained.toLocaleString('en-US')} (${row.removed.toLocaleString('en-US')} removed)`),
  '',
]
if (gkRemoved || cssRemoved || !fs.existsSync(reportPath)) fs.writeFileSync(reportPath, lines.join('\n'))

console.log(JSON.stringify({ ...summary, gkRetained: bankIndex.total, cssRetained: subjectIndex.total }, null, 2))
