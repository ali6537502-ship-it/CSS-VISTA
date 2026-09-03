import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const shardsDirectory = path.join(root, 'src', 'data', 'mcq-shards')
const outputPath = path.join(root, 'src', 'data', 'mock-bank.json')

const targets = {
  'islamic-gk': 220,
  'urdu-language': 160,
  'english-grammar': 300,
  science: 260,
  'everyday-science': 120,
  'pakistan-affairs': 220,
  'pakistan-history': 100,
  'international-organisations': 120,
  'united-nations': 100,
  capitals: 80,
  currencies: 70,
  'countries-continents': 80,
  environment: 90,
  economics: 60,
  'computer-basics': 70,
  'misc-gk': 80,
  mountains: 35,
  rivers: 35,
  'oceans-seas': 25,
  deserts: 25,
  'straits-canals': 35,
  'discoveries-inventions': 50,
  'awards-honours': 50,
  'important-personalities': 50,
  'largest-longest': 50,
  'first-world': 40,
  'solar-system': 50,
  'important-days': 40,
  'national-symbols': 35,
  'famous-places': 40,
  'international-borders': 30,
}

const rejectedStem = new RegExp([
  'Reuters publish',
  'news agency published',
  'month was this development reported',
  'date did .* publish',
  'publication date',
  'which option correctly matches',
  'correctly describes',
  'best meaning or function',
  'in the .* subtopic',
  'within .* which',
  '^identify the (figure|body|correctly|incorrect)',
  'which category best fits',
  'historical sequence.*placed',
  'date-location combination',
  'topic under review',
  'source material',
  'this development',
  'the report [“"]',
  '\\[Parallel drill',
  'GeoNames code',
  'In a matching exercise',
  'belongs with .* under the heading',
  'Which subject is associated with this textual',
  'Which subject is associated with this contribution',
  'Which subject is associated',
  'Which subject is best identified',
  'Which option correctly identifies',
  'associated person/group',
  'textual or historical basis',
  'contribution or feature is correctly associated',
  'place or region is most closely associated',
  'period or date is correctly associated',
  'Complete the verified relationship',
  'What is the period/date associated with',
  'Where was .* centred',
  'Select the correct association',
  'Choose the correct period-and-place',
  'principal significance of',
  'what should replace the question mark',
  'which answer is associated',
  'correct answer to this',
  'select the accurate .* fact for',
  'which fact is correctly associated',
  'which concept, defined as',
  'ISO alpha-[23] code',
  'UN M49 numeric code',
  'English demonym',
  'boiling point in kelvin',
  'which value is correctly recorded under',
  'standard Kufan numbering used by Quran.com',
  'ISO 4217 code',
  'capital designated by Israel',
].join('|'), 'i')

const artificialEnglishPreamble = /^(According to|Regarding|Referring to|After the session|For [A-Z][a-z]+(?:'s)? (?:session|event|schedule|project|exercise)|During [A-Z][a-z]+(?:'s)?|At the (?:clinic|courthouse|conference|auditorium|workshop))/
const artificialEnglishContext = /\b(project|questionnaire|schedule|sentence-classification task)\b|^At the (museum|station|library|laboratory|classroom|hospital)/i
const overSpecialisedScience = /\b(Kc|Kp|radionuclide|half-lives?|Hardy[–-]Weinberg|spectrograph|exposure dose|lattice attraction|resolving power)\b|\bmol\b|M=|Δ|\^\(|\bMyr\b/i
const rejectedOption = /all of the above|none of (?:the above|these)|both a and b|correct option/i
const artificialEnglishNames = /\b(?:Amina|Danish|Fahad|Hina|Hira|Imran|Iqra|Kashif|Mahnoor|Mehak|Nadia|Noor|Omar|Raza|Sana|Talha|Zara)(?:'s)?\b/i
const artificialEnglishMaterial = /\b(?:application|article|assignment|auditorium|clinic|conference|courthouse|garden|hospital|laboratory|letter|library|museum|notice|office|presentation|project|proposal|report|schedule|session|station|summary|workshop)\b/i
const stopWords = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was', 'were', 'what', 'when', 'where', 'which', 'who', 'with'])

function normalize(value) {
  return value
    .toLocaleLowerCase('en')
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(value) {
  return new Set(normalize(value).split(' ').filter((token) => token.length > 2 && !stopWords.has(token)))
}

function similarity(a, b) {
  const left = tokens(a)
  const right = tokens(b)
  if (!left.size || !right.size) return 0
  let intersection = 0
  for (const token of left) if (right.has(token)) intersection += 1
  return intersection / (left.size + right.size - intersection)
}

function stableHash(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function categoryFromId(id) {
  return id.replace(/-\d+$/, '')
}

function isStructurallySound(question) {
  if (typeof question.q !== 'string' || question.q.length < 18 || question.q.length > 240) return false
  if (!Array.isArray(question.o) || question.o.length !== 4) return false
  if (!Number.isInteger(question.a) || question.a < 0 || question.a > 3) return false
  if (new Set(question.o.map(normalize)).size !== 4) return false
  if (question.o.some((option) => !option.trim() || option.length > 170 || rejectedOption.test(option))) return false
  if (rejectedStem.test(question.q)) return false
  const category = categoryFromId(question.id)
  if (category === 'english-grammar' && (
    artificialEnglishPreamble.test(question.q)
    || artificialEnglishContext.test(question.q)
    || artificialEnglishNames.test(question.q)
    || artificialEnglishMaterial.test(question.q)
  )) return false
  if (category === 'science' && overSpecialisedScience.test(question.q)) return false
  return true
}

function qualityScore(question) {
  let score = 0
  if (question.e?.trim()) score += 3
  if (question.q.length <= 145) score += 2
  if (/^(Choose|Complete|Fill|Find|How|In which|Select|The |What|When|Where|Which|Who)/i.test(question.q)) score += 2
  if (question.d === 'Intermediate') score += 2
  if (question.d === 'Advanced') score += 1
  if (/correct definition|primarily classified|fact is associated|year.*associated/i.test(question.q)) score -= 2
  if (/\[[^\]]+\]/.test(question.q)) score -= 2
  if (/\b(approximately|about)\b/i.test(question.o[question.a]) && !/approximately|about/i.test(question.q)) score -= 1
  return score
}

function selectDiverse(questions, limit) {
  const candidates = questions
    .filter(isStructurallySound)
    .sort((left, right) => qualityScore(right) - qualityScore(left) || stableHash(left.id) - stableHash(right.id))

  const selected = []
  const topicCounts = new Map()
  const difficultyCounts = new Map()

  for (const question of candidates) {
    if (selected.length >= limit) break
    const topic = normalize(question.s || 'general')
    if ((topicCounts.get(topic) ?? 0) >= Math.max(5, Math.ceil(limit / 8))) continue
    const difficulty = question.d || 'Intermediate'
    if (difficulty === 'Basic' && (difficultyCounts.get('Basic') ?? 0) >= Math.ceil(limit * 0.35)) continue
    if (selected.some((picked) => normalize(picked.s || 'general') === topic && similarity(picked.q, question.q) >= 0.68)) continue

    selected.push(question)
    topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1)
    difficultyCounts.set(difficulty, (difficultyCounts.get(difficulty) ?? 0) + 1)
  }

  return selected
}

const shardFiles = fs.readdirSync(shardsDirectory).filter((file) => file.endsWith('.json')).sort()
const questions = shardFiles.flatMap((file) => JSON.parse(fs.readFileSync(path.join(shardsDirectory, file), 'utf8')))
const byCategory = new Map()
for (const question of questions) {
  const category = categoryFromId(question.id)
  if (!byCategory.has(category)) byCategory.set(category, [])
  byCategory.get(category).push(question)
}

const output = {}
const summary = {}
for (const [category, limit] of Object.entries(targets)) {
  const selected = selectDiverse(byCategory.get(category) ?? [], limit)
  output[category] = selected
  summary[category] = { requested: limit, selected: selected.length }
}

fs.writeFileSync(outputPath, `${JSON.stringify(output)}\n`)
console.log(JSON.stringify({ total: Object.values(output).reduce((sum, rows) => sum + rows.length, 0), categories: summary }, null, 2))
