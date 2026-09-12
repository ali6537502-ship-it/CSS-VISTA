import {
  curatedAbilityQuestions, curatedCurrentAffairsQuestions, curatedEnglishQuestions, curatedUrduTranslationQuestions,
} from './mockCurated'
import { auditedMptAbilityAdditions } from './mptAbilityAdditions'
import { questions as seedQuestions } from './quiz'
import type { BankQuestion } from './mcq'

export type CompetitiveMockKind = 'mpt' | 'pms-gk' | 'one-paper'

export interface MockSection {
  label: string
  count: number
}

export interface BuiltMockPaper {
  title: string
  questions: BankQuestion[]
  blueprint: MockSection[]
  timeSec: number
  note: string
}

type SectionSpec = {
  label: string
  count: number
  pool: BankQuestion[]
  salt?: string
  seedCap?: number
}

// The mock bank is ~600 KB and only the three competitive mocks need it.
// Importing it statically put it in the chunk every quiz mode loads, so it is
// fetched on demand and cached for the rest of the session instead.
let mockBank: Record<string, BankQuestion[]> = {}
let mockBankRequest: Promise<Record<string, BankQuestion[]>> | null = null

export function loadMockBank(): Promise<Record<string, BankQuestion[]>> {
  mockBankRequest ??= import('./mock-bank.json')
    .then((module) => {
      mockBank = (module.default ?? module) as unknown as Record<string, BankQuestion[]>
      return mockBank
    })
    .catch(() => {
      mockBankRequest = null
      return {}
    })
  return mockBankRequest
}

const normalise = (value: string) => value
  .toLocaleLowerCase('en')
  .normalize('NFKD')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stopWords = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'choose', 'correct', 'for', 'from', 'has', 'in', 'is',
  'it', 'of', 'on', 'or', 'select', 'that', 'the', 'this', 'to', 'was', 'were', 'what', 'when', 'where',
  'which', 'who', 'with',
])

function tokens(value: string) {
  return new Set(normalise(value).split(' ').filter((token) => token.length > 2 && !stopWords.has(token)))
}

function similarity(left: string, right: string) {
  const a = tokens(left)
  const b = tokens(right)
  if (!a.size || !b.size) return 0
  let intersection = 0
  a.forEach((token) => { if (b.has(token)) intersection += 1 })
  return intersection / (a.size + b.size - intersection)
}

function answerConcept(value: string) {
  return normalise(value).replace(/\b(?:cave|hazrat|surah|the)\b/g, '').replace(/\s+/g, ' ').trim()
}

function stableHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mapSeed(categories: string[]): BankQuestion[] {
  const accepted = new Set(categories)
  const fallbackTopics: Record<string, string> = {
    abilities: 'Quantitative Ability',
    current: 'Current Affairs',
    english: 'English Usage',
    geography: 'Geography',
    gk: 'General Knowledge',
    history: 'History',
    islamiat: 'Islamic Studies',
    organisations: 'International Organisations',
    pakistan: 'Pakistan Affairs',
    reasoning: 'Logical Reasoning',
    science: 'Everyday Science',
    urdu: 'Urdu Grammar',
  }
  return seedQuestions
    .filter((question) => accepted.has(question.category))
    .map((question) => ({
      id: `mock-seed-${question.id}`,
      q: question.question,
      o: [...question.options],
      a: question.answer,
      e: question.explanation,
      s: question.topic || fallbackTopics[question.category] || question.category,
      d: question.difficulty === 'Easy'
        ? 'Basic'
        : question.difficulty === 'Hard'
          ? 'Advanced'
          : 'Intermediate',
    }))
}

function fromBank(...categories: string[]) {
  return categories.flatMap((category) => mockBank[category] ?? [])
}

/**
 * Pools are built after the bank has loaded, not at module load.
 *
 * They used to be module-level constants. Once the bank became a fetch rather
 * than a static import, every fromBank() call ran against an empty object and
 * the pools were permanently frozen without their bank questions - so the mocks
 * silently built short papers. Building them on first use, behind the same
 * memoised load, keeps the payload saving without that trap.
 */
interface MockPools {
  islamicPool: BankQuestion[]
  urduGeneralPool: BankQuestion[]
  urduPool: BankQuestion[]
  englishComprehensionPool: BankQuestion[]
  englishGeneralPool: BankQuestion[]
  englishPool: BankQuestion[]
  abilityPool: BankQuestion[]
  currentPool: BankQuestion[]
  pakistanPool: BankQuestion[]
  sciencePool: BankQuestion[]
  organisationsPool: BankQuestion[]
  geographyPool: BankQuestion[]
  worldPool: BankQuestion[]
  computerPool: BankQuestion[]
  economyPool: BankQuestion[]
  generalPool: BankQuestion[]
}

let cachedPools: MockPools | null = null

function buildPools(): MockPools {
  const islamicPool = [...mapSeed(['islamiat']), ...fromBank('islamic-gk')]
  const urduGeneralPool = [...mapSeed(['urdu']), ...fromBank('urdu-language')]
  const urduPool = [...curatedUrduTranslationQuestions, ...urduGeneralPool]
  const englishComprehensionPool = curatedEnglishQuestions.filter((question) => question.s === 'Comprehension')
  const englishGeneralPool = [...curatedEnglishQuestions.filter((question) => question.s !== 'Comprehension'), ...mapSeed(['english'])]
  const englishPool = [...englishGeneralPool, ...englishComprehensionPool]
  const abilityPool = [...curatedAbilityQuestions, ...auditedMptAbilityAdditions, ...mapSeed(['abilities', 'reasoning'])]
  const currentPool = [...curatedCurrentAffairsQuestions, ...mapSeed(['current'])]

  const pakistanBank = fromBank('pakistan-affairs').filter((question) => (
    !question.s
    || /Pakistan Movement|British Rule|Ideological|Reform|Constitution of Pakistan|Population|Economy|Foreign Policy|State Formation/i.test(question.s)
  ))
  const pakistanHistorySeed = mapSeed(['history']).filter((question) => /Pakistan/i.test(question.s || ''))
  const pakistanPool = [...mapSeed(['pakistan']), ...pakistanHistorySeed, ...pakistanBank]
  const sciencePool = [
    ...mapSeed(['science']),
    ...fromBank('science', 'everyday-science', 'environment', 'solar-system'),
  ]
  const organisationsPool = [...mapSeed(['organisations']), ...fromBank('international-organisations', 'united-nations')]
  const geographyPool = [
    ...mapSeed(['geography']),
    ...fromBank('capitals', 'currencies', 'mountains', 'rivers', 'oceans-seas', 'deserts', 'straits-canals', 'famous-places', 'international-borders'),
  ]
  const worldPool = [...mapSeed(['gk']), ...geographyPool]
  const computerPool = fromBank('computer-basics')
  const economyPool = fromBank('economics')
  const generalPool = [
    ...mapSeed(['gk', 'geography', 'organisations']),
    ...organisationsPool,
    ...worldPool,
    ...fromBank('discoveries-inventions', 'awards-honours', 'important-days', 'national-symbols'),
  ]

  return {
    islamicPool, urduGeneralPool, urduPool, englishComprehensionPool, englishGeneralPool,
    englishPool, abilityPool, currentPool, pakistanPool, sciencePool, organisationsPool,
    geographyPool, worldPool, computerPool, economyPool, generalPool,
  }
}

const rejectedQuestion = /Reuters|publication date|news agency published|GeoNames|ISO alpha|ISO 4217|UN M49|demonym|boiling point in kelvin|capital designated by Israel|In the Important Personalities section|Choose the option that correctly completes|Which answer correctly identifies|Which statement about the capital|Select the correct association concerning|which value is correctly recorded under|standard Kufan numbering used by Quran\.com|Which name matches both|Which actor-description pair|principal location connected with|Who or which body is chiefly identified|Which description fits|Which institution or personality is correctly connected|Choose the accurate person-and-description match|\[Parallel drill/i
const rejectedOption = /all of the above|none of (?:the above|these)|both a and b/i

function isUsable(question: BankQuestion) {
  if (!question.q || question.q.length < 12 || question.q.length > 260) return false
  if (!Array.isArray(question.o) || question.o.length !== 4) return false
  if (!Number.isInteger(question.a) || question.a < 0 || question.a > 3) return false
  if (new Set(question.o.map(normalise)).size !== 4) return false
  if (question.o.some((option) => !option.trim() || rejectedOption.test(option))) return false
  return !rejectedQuestion.test(question.q)
}

function qualityScore(question: BankQuestion) {
  let score = 0
  if (question.id.startsWith('mock-')) score += 8
  if (question.e?.trim()) score += 3
  if (question.q.length <= 150) score += 2
  if (/^(Choose|Complete|How|The |What|When|Where|Which|Who)/i.test(question.q)) score += 1
  if (/best definition|correctly described|most closely associated/i.test(question.q)) score -= 1
  return score
}

function shuffleOptions(question: BankQuestion, seed: string): BankQuestion {
  const order = [0, 1, 2, 3].sort((left, right) => (
    stableHash(`${seed}|${question.id}|option|${left}`) - stableHash(`${seed}|${question.id}|option|${right}`)
  ))
  return {
    ...question,
    o: order.map((index) => question.o[index]),
    a: order.indexOf(question.a),
  }
}

function selectSection(
  spec: SectionSpec,
  paperSeed: string,
  usedIds: Set<string>,
  usedStems: Set<string>,
  selectedAcrossPaper: BankQuestion[],
) {
  const sectionSeed = `${paperSeed}|${spec.salt || spec.label}`
  const candidates = spec.pool
    .filter(isUsable)
    .filter((question, index, rows) => rows.findIndex((candidate) => candidate.id === question.id) === index)
    .sort((left, right) => (
      qualityScore(right) - qualityScore(left)
      || stableHash(`${sectionSeed}|${left.id}`) - stableHash(`${sectionSeed}|${right.id}`)
    ))

  const selected: BankQuestion[] = []
  let selectedSeeds = 0
  const topicCounts = new Map<string, number>()
  const topicCap = Math.max(2, Math.ceil(spec.count / 10))

  const consider = (question: BankQuestion, strict: boolean) => {
    if (selected.length >= spec.count || usedIds.has(question.id)) return
    if (spec.seedCap !== undefined && question.id.startsWith('mock-seed-') && selectedSeeds >= spec.seedCap) return
    const stem = normalise(question.q)
    if (!stem || usedStems.has(stem)) return
    const topic = normalise(question.s || 'general')
    if (strict && !question.id.startsWith('mock-seed-') && (topicCounts.get(topic) ?? 0) >= topicCap) return
    const answer = answerConcept(question.o[question.a])
    const languageOrAbility = /abilities|reasoning|english|urdu|mathematics/i.test(spec.label)
    if (!languageOrAbility && answer.length > 3 && selectedAcrossPaper.some((picked) => answerConcept(picked.o[picked.a]) === answer)) return
    if (strict && selectedAcrossPaper.some((picked) => {
      const close = similarity(picked.q, question.q)
      if (close >= 0.78) return true
      if (similarity(`${picked.q} ${picked.o[picked.a]}`, `${question.q} ${question.o[question.a]}`) >= 0.7) return true
      return normalise(picked.o[picked.a]) === normalise(question.o[question.a])
        && normalise(picked.s || '') === topic
        && close >= 0.42
    })) return

    const prepared = shuffleOptions({ ...question, paperSection: spec.label }, sectionSeed)
    selected.push(prepared)
    if (question.id.startsWith('mock-seed-')) selectedSeeds += 1
    selectedAcrossPaper.push(prepared)
    usedIds.add(question.id)
    usedStems.add(stem)
    topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1)
  }

  candidates.forEach((question) => consider(question, true))
  if (selected.length < spec.count) candidates.forEach((question) => consider(question, false))
  if (selected.length !== spec.count) {
    throw new Error(`Mock paper section “${spec.label}” needs ${spec.count} questions but only ${selected.length} passed quality checks.`)
  }
  return selected
}

const mptBlueprint: MockSection[] = [
  { label: 'Islamic Studies', count: 20 },
  { label: 'Urdu', count: 20 },
  { label: 'English', count: 50 },
  { label: 'General Abilities', count: 60 },
  { label: 'General Knowledge', count: 50 },
]

const pmsBlueprint: MockSection[] = [
  { label: 'Pakistan Affairs', count: 15 },
  { label: 'Current Affairs', count: 15 },
  { label: 'Everyday Science & Environment', count: 15 },
  { label: 'World Geography & General Knowledge', count: 15 },
  { label: 'International Organisations & Economy', count: 10 },
  { label: 'Islamiat', count: 10 },
  { label: 'Computer & IT', count: 5 },
  { label: 'English & Urdu', count: 5 },
  { label: 'Quantitative & Reasoning', count: 10 },
]

const onePaperBlueprint: MockSection[] = [
  { label: 'General Knowledge', count: 20 },
  { label: 'Pakistan Studies', count: 10 },
  { label: 'Current Affairs', count: 10 },
  { label: 'Islamiat', count: 10 },
  { label: 'Everyday Science', count: 10 },
  { label: 'Computer & IT', count: 10 },
  { label: 'English', count: 10 },
  { label: 'Urdu', count: 5 },
  { label: 'Basic Mathematics & Reasoning', count: 10 },
  { label: 'Geography', count: 5 },
]

export const MOCK_BLUEPRINTS: Record<CompetitiveMockKind, MockSection[]> = {
  mpt: mptBlueprint,
  'pms-gk': pmsBlueprint,
  'one-paper': onePaperBlueprint,
}

function sectionsFor(kind: CompetitiveMockKind, pools: MockPools): SectionSpec[] {
  const {
    islamicPool, urduGeneralPool, urduPool, englishComprehensionPool, englishGeneralPool,
    englishPool, abilityPool, currentPool, pakistanPool, sciencePool, organisationsPool,
    geographyPool, worldPool, computerPool, economyPool, generalPool,
  } = pools
  if (kind === 'mpt') {
    return [
      { label: 'Islamic Studies', count: 20, pool: islamicPool, seedCap: 8 },
      { label: 'Urdu', count: 16, pool: urduGeneralPool, salt: 'urdu-grammar' },
      { label: 'Urdu', count: 4, pool: curatedUrduTranslationQuestions, salt: 'urdu-translation' },
      { label: 'English', count: 42, pool: englishGeneralPool, salt: 'english-usage' },
      { label: 'English', count: 8, pool: englishComprehensionPool, salt: 'english-comprehension' },
      { label: 'General Abilities', count: 60, pool: abilityPool },
      { label: 'General Knowledge', count: 18, pool: sciencePool, salt: 'gk-everyday-science', seedCap: 8 },
      { label: 'General Knowledge', count: 12, pool: currentPool, salt: 'gk-current-affairs' },
      { label: 'General Knowledge', count: 15, pool: pakistanPool, salt: 'gk-pakistan-affairs', seedCap: 12 },
      { label: 'General Knowledge', count: 5, pool: generalPool, salt: 'gk-world-affairs', seedCap: 4 },
    ]
  }
  if (kind === 'pms-gk') {
    return [
      { label: 'Pakistan Affairs', count: 15, pool: pakistanPool, seedCap: 12 },
      { label: 'Current Affairs', count: 15, pool: currentPool },
      { label: 'Everyday Science & Environment', count: 15, pool: sciencePool, seedCap: 8 },
      { label: 'World Geography & General Knowledge', count: 15, pool: worldPool, seedCap: 10 },
      { label: 'International Organisations & Economy', count: 10, pool: [...organisationsPool, ...economyPool], seedCap: 6 },
      { label: 'Islamiat', count: 10, pool: islamicPool, seedCap: 6 },
      { label: 'Computer & IT', count: 5, pool: computerPool },
      { label: 'English & Urdu', count: 3, pool: englishPool, salt: 'english' },
      { label: 'English & Urdu', count: 2, pool: urduPool, salt: 'urdu' },
      { label: 'Quantitative & Reasoning', count: 10, pool: abilityPool },
    ]
  }
  return [
    { label: 'General Knowledge', count: 20, pool: generalPool, seedCap: 12 },
    { label: 'Pakistan Studies', count: 10, pool: pakistanPool, seedCap: 10 },
    { label: 'Current Affairs', count: 10, pool: currentPool },
    { label: 'Islamiat', count: 10, pool: islamicPool, seedCap: 6 },
    { label: 'Everyday Science', count: 10, pool: sciencePool, seedCap: 6 },
    { label: 'Computer & IT', count: 10, pool: computerPool },
    { label: 'English', count: 10, pool: englishPool },
    { label: 'Urdu', count: 5, pool: urduPool },
    { label: 'Basic Mathematics & Reasoning', count: 10, pool: abilityPool },
    { label: 'Geography', count: 5, pool: geographyPool, seedCap: 4 },
  ]
}

function validatePaper(questions: BankQuestion[], blueprint: MockSection[]) {
  const expected = blueprint.reduce((total, section) => total + section.count, 0)
  if (questions.length !== expected) throw new Error(`Expected ${expected} mock questions; received ${questions.length}.`)
  if (new Set(questions.map((question) => question.id)).size !== questions.length) throw new Error('Duplicate question ID found in mock paper.')
  if (new Set(questions.map((question) => normalise(question.q))).size !== questions.length) throw new Error('Duplicate question text found in mock paper.')
  blueprint.forEach((section) => {
    const actual = questions.filter((question) => question.paperSection === section.label).length
    if (actual !== section.count) throw new Error(`Section ${section.label} expected ${section.count}; received ${actual}.`)
  })
}

export function currentPakistanDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/**
 * Async because the mock bank is fetched rather than bundled. It awaits the
 * load itself: a synchronous version silently returned a short paper whenever a
 * caller forgot to load the bank first, which is exactly the trap the CI mock
 * test fell into.
 */
export async function buildCompetitiveMock(
  kind: CompetitiveMockKind,
  sessionDateKey = currentPakistanDateKey(),
): Promise<BuiltMockPaper> {
  await loadMockBank()
  cachedPools ??= buildPools()
  const blueprint = MOCK_BLUEPRINTS[kind]
  const usedIds = new Set<string>()
  const usedStems = new Set<string>()
  const selectedAcrossPaper: BankQuestion[] = []
  const questions = sectionsFor(kind, cachedPools).flatMap((spec) => (
    selectSection(spec, `${kind}|${sessionDateKey}`, usedIds, usedStems, selectedAcrossPaper)
  ))
  validatePaper(questions, blueprint)

  if (kind === 'mpt') {
    return {
      title: 'Full CSS MPT Practice Mock',
      questions,
      blueprint,
      timeSec: 200 * 60,
      note: '200 MCQs · 200 minutes · official FPSC section sequence. Questions are quality-gated, non-repeating within the paper and fixed for today’s session.',
    }
  }
  if (kind === 'pms-gk') {
    return {
      title: 'PMS GK Grand Mock',
      questions,
      blueprint,
      timeSec: 90 * 60,
      note: '100 carefully selected MCQs in a competitive one-paper sequence. The same quality-controlled paper is served throughout today’s entry window; provincial PMS schemes can vary.',
    }
  }
  return {
    title: 'One-Paper Competitive Mock',
    questions,
    blueprint,
    timeSec: 90 * 60,
    note: '100 quality-gated MCQs · 90 minutes · structured by subject instead of randomly mixing the central bank.',
  }
}
