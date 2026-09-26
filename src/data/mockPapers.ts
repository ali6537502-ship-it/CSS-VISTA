import {
  curatedAbilityQuestions, curatedCurrentAffairsQuestions, curatedEnglishQuestions, curatedUrduTranslationQuestions,
} from './mockCurated'
import { auditedMptAbilityAdditions } from './mptAbilityAdditions'
import { calculatedMptAbilityQuestions } from './mptAbilityPractice'
import { mptUrduTranslationQuestions } from './mptUrduTranslation'
import { advancedMptUrduTranslationQuestions } from './mptUrduTranslationAdvanced'
import { repositoryMptUrduGrammarQuestions } from './mptRepoUrduGrammar'
import { repositoryMptEnglishQuestions } from './mptRepoEnglishAdvanced'
import { appliedMptUrduQuestions } from './mptUrduApplied'
import { extendedMptUrduQuestions } from './mptUrduExtended'
import { verifiedMptCurrentQuestions } from './mptCurrentVerified'
import { expandedVerifiedMptCurrentQuestions } from './mptCurrentVerifiedExpanded'
import { mptComprehensionQuestions } from './mptEnglishComprehension'
import { originalMptAbilityQuestions } from './mptOriginalAbility'
import { reviewedMptPastAbilityQuestions } from './mptReviewedPastAbility'
import { reviewedMptPastEnglishQuestions } from './mptReviewedPastEnglish'
import { mptGrammarCourseEnglishQuestions } from './mptGrammarCourseEnglish'
import { advancedMptAbilityQuestions } from './mptAdvancedAbility'
import {
  eligibleMptAbility, eligibleMptCurrent, eligibleMptEnglish, eligibleMptIslamic,
  eligibleMptPakistan, eligibleMptScience, eligibleMptUrdu, eligibleMptUrduPastPaper,
} from './mptQuality'
import { questions as seedQuestions } from './quiz'
import { filterDisabled, getCategoryQuestions, type BankQuestion } from './mcq'
import { toBankQuestion, type CssSubjectQuestion } from './cssSubjectMcqs'
import {
  readMptPaper, saveMptPaper, previouslySeenMptQuestions, previouslyUsedMptQuestionPatterns,
} from '@/lib/mptMockHistory'

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
  mptEditorial?: boolean
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

function numericPattern(value: string) {
  if (!/\d/.test(value) || /^[\d,.?\s\-–+]+$/.test(value)) return ''
  return value.toLocaleLowerCase('en').replace(/\d+(?:[.,]\d+)*/g, '#').replace(/\s+/g, ' ').trim()
}

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
  excludedMptIds?: Set<string>
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
let expandedMptPools: Promise<MockPools> | null = null
const abilityTopics = new Set([
  'Arithmetic and percentages', 'Basic arithmetic', 'Sets and probability', 'Random sampling',
  'Number patterns', 'Deductive reasoning', 'Relations and directions', 'Calendar reasoning',
  'Clock reasoning', 'Analytical constraints', 'Data interpretation', 'Decision analysis',
  'Verbal ability', 'Numerical ability',
])

async function loadOwnerAbilityQuestions(): Promise<BankQuestion[]> {
  const response = await fetch('/css-subject-mcqs/general-science-and-ability.json')
  if (!response.ok) throw new Error('The General Ability question bank could not be loaded.')
  const questions = await response.json() as CssSubjectQuestion[]
  return questions.filter((question) => abilityTopics.has(question.topic)).map(toBankQuestion)
}

// Scheduled MPT papers use a separate syllabus gate. Other quiz modes retain
// their own pools; broad practice categories are not automatically MPT-eligible.
function loadMptPools(): Promise<MockPools> {
  expandedMptPools ??= Promise.all([
    getCategoryQuestions('islamic-gk'), getCategoryQuestions('urdu-language'),
    getCategoryQuestions('english-grammar'), getCategoryQuestions('general-ability'),
    getCategoryQuestions('everyday-science'),
    getCategoryQuestions('current-affairs'), getCategoryQuestions('pakistan-affairs'),
    getCategoryQuestions('pakistan-history'), getCategoryQuestions('science'),
    getCategoryQuestions('mpt-past-papers'), loadOwnerAbilityQuestions(),
    import('./mptLegacyIds.json').then((module) => new Set(module.default)),
  ]).then(([islamic, urdu, english, ability, everyday, current, pakistan, history, science, past, ownerAbility, previouslyPublished]) => {
    const base = cachedPools ??= buildPools()
    return {
      ...base,
      excludedMptIds: previouslyPublished,
      islamicPool: [
        ...past.filter((question) => question.s === 'Islamic General Knowledge'
          && eligibleMptIslamic(question) && !previouslyPublished.has(question.id)),
        ...islamic.filter((question) => eligibleMptIslamic(question) && !previouslyPublished.has(question.id)),
      ],
      urduPool: [
        ...advancedMptUrduTranslationQuestions, ...curatedUrduTranslationQuestions, ...mptUrduTranslationQuestions,
        ...appliedMptUrduQuestions, ...extendedMptUrduQuestions, ...repositoryMptUrduGrammarQuestions,
        ...urdu.filter((question) => eligibleMptUrdu(question) && !previouslyPublished.has(question.id)),
        ...past.filter((question) => question.s === 'Urdu' && eligibleMptUrduPastPaper(question) && !previouslyPublished.has(question.id)),
      ],
      englishPool: [
        ...curatedEnglishQuestions, ...mptGrammarCourseEnglishQuestions, ...repositoryMptEnglishQuestions,
        ...reviewedMptPastEnglishQuestions(past).filter(eligibleMptEnglish),
        ...past.filter((question) => question.s === 'English'
          && eligibleMptEnglish(question) && !previouslyPublished.has(question.id)),
        ...english.filter((question) => eligibleMptEnglish(question) && !previouslyPublished.has(question.id)),
      ],
      abilityPool: [
        ...advancedMptAbilityQuestions,
        ...originalMptAbilityQuestions,
        ...reviewedMptPastAbilityQuestions(past).filter(eligibleMptAbility),
        ...curatedAbilityQuestions.filter(eligibleMptAbility),
        ...auditedMptAbilityAdditions.filter(eligibleMptAbility),
        ...calculatedMptAbilityQuestions.filter(eligibleMptAbility),
        ...ownerAbility.filter((question) => eligibleMptAbility(question) && !previouslyPublished.has(question.id)),
        ...ability.filter((question) => eligibleMptAbility(question) && !previouslyPublished.has(question.id)),
        ...past.filter((question) => /^(Mathematics|Reasoning)$/.test(question.s ?? '') && eligibleMptAbility(question) && !previouslyPublished.has(question.id)),
      ],
      currentPool: [
        ...verifiedMptCurrentQuestions, ...expandedVerifiedMptCurrentQuestions, ...curatedCurrentAffairsQuestions,
        ...current.filter((question) => eligibleMptCurrent(question) && !previouslyPublished.has(question.id)),
      ],
      pakistanPool: [
        ...pakistan.filter((question) => eligibleMptPakistan(question) && !previouslyPublished.has(question.id)),
        ...history.filter((question) => eligibleMptPakistan(question) && !previouslyPublished.has(question.id)),
        ...past.filter((question) => question.s === 'Pakistan Affairs' && eligibleMptPakistan(question) && !previouslyPublished.has(question.id)),
      ],
      sciencePool: [
        ...past.filter((question) => /^(?:Everyday Science|Physics|Chemistry|Biology)$/.test(question.s ?? '')
          && eligibleMptScience(question) && !previouslyPublished.has(question.id)),
        ...science.filter((question) => eligibleMptScience(question) && !previouslyPublished.has(question.id)),
        ...everyday.filter((question) => eligibleMptScience(question) && !previouslyPublished.has(question.id)),
      ],
    }
  }).catch((error) => {
    expandedMptPools = null
    throw error
  })
  return expandedMptPools
}

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

const rejectedQuestion = /Reuters|publication date|news agency published|GeoNames|ISO alpha|ISO 4217|UN M49|demonym|boiling point in kelvin|capital designated by Israel|In the Important Personalities section|Choose the option that correctly completes|Which answer correctly identifies|Which option correctly identifies|Which period or date is correctly associated|Which statement about the capital|Select the correct association concerning|which value is correctly recorded under|standard Kufan numbering used by Quran\.com|Which name matches both|Which actor-description pair|actor-description combination|principal location connected with|Who or which body is chiefly identified|Which description fits|Which institution or personality is correctly connected|Choose the accurate person-and-description match|\[Parallel drill/i
const rejectedOption = /all of the above|none of (?:the above|these)|both a and b/i

function isUsable(question: BankQuestion) {
  const maxLength = question.s === 'Comprehension' ? 900 : 260
  if (!question.q || question.q.length < 12 || question.q.length > maxLength) return false
  if (!Array.isArray(question.o) || question.o.length !== 4) return false
  if (!Number.isInteger(question.a) || question.a < 0 || question.a > 3) return false
  if (new Set(question.o.map(normalise)).size !== 4) return false
  if (question.o.some((option) => !option.trim() || rejectedOption.test(option))) return false
  return !rejectedQuestion.test(question.q)
}

function qualityScore(question: BankQuestion, mptEditorial = false) {
  let score = 0
  if (mptEditorial && question.id.startsWith('mpt-original-ability-')) score += 8
  if (mptEditorial && question.id.startsWith('mpt-reviewed-past-ability-')) score += 9
  if (mptEditorial && question.id.startsWith('mpt-reviewed-past-english-')) score += 9
  if (mptEditorial && question.id.startsWith('mpt-past-papers-')) score += 8
  if (question.id.startsWith('mock-')) score += mptEditorial ? 4 : 8
  if (question.e?.trim()) score += 3
  if (mptEditorial && question.d === 'Advanced') score += 2
  if (mptEditorial && question.d === 'Basic') score -= 4
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
  previouslySeen: Set<string> = new Set(),
  usedPatterns = new Map<string, number>(),
  paperPatterns = new Set<string>(),
) {
  const sectionSeed = `${paperSeed}|${spec.salt || spec.label}`
  const candidates = filterDisabled(spec.pool)
    .filter(isUsable)
    .filter((question, index, rows) => rows.findIndex((candidate) => candidate.id === question.id) === index)
    .sort((left, right) => (
      qualityScore(right, spec.mptEditorial) - qualityScore(left, spec.mptEditorial)
      || stableHash(`${sectionSeed}|${left.id}`) - stableHash(`${sectionSeed}|${right.id}`)
    ))

  const selected: BankQuestion[] = []
  let selectedSeeds = 0
  const topicCounts = new Map<string, number>()
  const abilityFamilyCounts = new Map<string, number>()
  const topicCap = Math.max(2, Math.ceil(spec.count / 10))

  const consider = (question: BankQuestion, strict: boolean) => {
    if (selected.length >= spec.count || usedIds.has(question.id) || previouslySeen.has(question.id)) return
    if (spec.seedCap !== undefined && question.id.startsWith('mock-seed-') && selectedSeeds >= spec.seedCap) return
    if (spec.mptEditorial && spec.label === 'English' && /\bsynonym\b/i.test(question.q)
      && selectedAcrossPaper.filter((picked) => picked.paperSection === 'English' && /\bsynonym\b/i.test(picked.q)).length >= 15) return
    const stem = normalise(question.q)
    if (!stem || usedStems.has(stem) || previouslySeen.has(`stem:${stem}`)) return
    const pattern = spec.mptEditorial ? numericPattern(question.q) : ''
    if (pattern && (paperPatterns.has(pattern) || (usedPatterns.get(pattern) ?? 0) >= 8)) return
    const abilityFamily = spec.label === 'General Abilities'
      ? /^mpt-advanced-ability-(.+)-\d+$/.exec(question.id)?.[1] ?? ''
      : ''
    if (abilityFamily && (abilityFamilyCounts.get(abilityFamily) ?? 0) >= 2) return
    const topic = normalise(question.s || 'general')
    if (strict && !question.id.startsWith('mock-seed-') && (topicCounts.get(topic) ?? 0) >= topicCap) return
    const answer = answerConcept(question.o[question.a])
    const languageOrAbility = /abilities|reasoning|english|urdu|mathematics/i.test(spec.label)
    if (!languageOrAbility && answer.length > 3 && selectedAcrossPaper.some((picked) => answerConcept(picked.o[picked.a]) === answer)) return
    if (strict && selectedAcrossPaper.some((picked) => {
      const pickedFamily = abilityFamily
        ? /^mpt-advanced-ability-(.+)-\d+$/.exec(picked.id)?.[1] ?? ''
        : ''
      if (abilityFamily && pickedFamily === abilityFamily) return false
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
    if (pattern) {
      paperPatterns.add(pattern)
      usedPatterns.set(pattern, (usedPatterns.get(pattern) ?? 0) + 1)
    }
    if (abilityFamily) abilityFamilyCounts.set(abilityFamily, (abilityFamilyCounts.get(abilityFamily) ?? 0) + 1)
    topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1)
  }

  candidates.forEach((question) => consider(question, true))
  if (selected.length < spec.count) candidates.forEach((question) => consider(question, false))
  if (selected.length !== spec.count) {
    throw new Error(`Fresh ${spec.label} questions are exhausted (${selected.length}/${spec.count} available). This paper was not started; revisit the subject bank while new questions are reviewed.`)
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

function comprehensionIndex(sessionDateKey: string) {
  const match = /^(\d{4}-\d{2}-\d{2})(-15)?$/.exec(sessionDateKey)
  if (!match) throw new Error('The MPT paper session key is invalid.')
  const day = Date.parse(`${match[1]}T00:00:00Z`)
  if (!Number.isFinite(day)) throw new Error('The MPT paper date is invalid.')
  const start = Date.parse('2026-09-20T00:00:00Z')
  const dayWithinSeries = (((Math.round((day - start) / 86_400_000) % 20) + 20) % 20)
  return dayWithinSeries * 2 + (match[2] ? 0 : 1)
}

function sectionsFor(kind: CompetitiveMockKind, pools: MockPools, mptEditorial = false, sessionDateKey = ''): SectionSpec[] {
  const {
    islamicPool, urduPool, englishPool, abilityPool, currentPool, pakistanPool, sciencePool, organisationsPool,
    geographyPool, worldPool, computerPool, economyPool, generalPool,
  } = pools
  if (kind === 'mpt') {
    const freshComprehension = mptEditorial ? mptComprehensionQuestions[comprehensionIndex(sessionDateKey)] : null
    return [
      { label: 'Islamic Studies', count: 20, pool: islamicPool, mptEditorial, seedCap: mptEditorial ? undefined : 8 },
      ...(mptEditorial
        ? [
          { label: 'Urdu', count: 3, pool: urduPool.filter((q) => q.s === 'ترجمہ'), salt: 'urdu-translation', mptEditorial },
          { label: 'Urdu', count: 17, pool: urduPool.filter((q) => q.s !== 'ترجمہ'), salt: 'urdu-other', mptEditorial },
        ]
        : [{ label: 'Urdu', count: 20, pool: urduPool, mptEditorial }]),
      ...(freshComprehension
        ? [
          { label: 'English', count: 2, pool: freshComprehension, salt: 'new-comprehension', mptEditorial },
          { label: 'English', count: 48, pool: englishPool.filter((q) => q.s !== 'Comprehension'), salt: 'other-english', mptEditorial },
        ]
        : [{ label: 'English', count: 50, pool: englishPool, mptEditorial }]),
      { label: 'General Abilities', count: 60, pool: abilityPool, mptEditorial },
      { label: 'General Knowledge', count: 20, pool: sciencePool, salt: 'gk-everyday-science', mptEditorial, seedCap: mptEditorial ? undefined : 8 },
      { label: 'General Knowledge', count: 2, pool: currentPool, salt: 'gk-current-affairs', mptEditorial },
      { label: 'General Knowledge', count: 28, pool: pakistanPool, salt: 'gk-pakistan-affairs', mptEditorial, seedCap: mptEditorial ? undefined : 12 },
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
  studentName = '',
): Promise<BuiltMockPaper> {
  // Named browser sessions reserve questions; anonymous programmatic callers
  // retain the small offline bank used by the existing build integrity test.
  const namedMptSession = kind === 'mpt' && studentName.trim().length >= 2
  const previousPaper = namedMptSession ? readMptPaper(studentName, sessionDateKey) : null
  if (previousPaper) {
    validatePaper(previousPaper, mptBlueprint)
    return {
      title: 'Full CSS MPT Practice Mock', questions: previousPaper, blueprint: mptBlueprint,
      timeSec: 200 * 60, note: '200 MCQs · 200 minutes · your saved paper for this session.',
    }
  }
  await loadMockBank()
  cachedPools ??= buildPools()
  const pools = namedMptSession ? await loadMptPools() : cachedPools
  const blueprint = MOCK_BLUEPRINTS[kind]
  const previouslySeen = namedMptSession ? previouslySeenMptQuestions(studentName) : new Set<string>()
  if (namedMptSession) pools.excludedMptIds?.forEach((id) => previouslySeen.add(id))
  const usedIds = new Set<string>()
  const usedStems = new Set<string>()
  const selectedAcrossPaper: BankQuestion[] = []
  const usedPatterns = namedMptSession ? previouslyUsedMptQuestionPatterns(studentName) : new Map<string, number>()
  const paperPatterns = new Set<string>()
  const questions = sectionsFor(kind, pools, namedMptSession, sessionDateKey).flatMap((spec) => (
    selectSection(spec, `${kind}|${sessionDateKey}`, usedIds, usedStems, selectedAcrossPaper, previouslySeen, usedPatterns, paperPatterns)
  ))
  validatePaper(questions, blueprint)
  if (namedMptSession) saveMptPaper(studentName, sessionDateKey, questions)

  if (kind === 'mpt') {
    return {
      title: 'Full CSS MPT Practice Mock',
      questions,
      blueprint,
      timeSec: 200 * 60,
      note: '200 MCQs · 200 minutes · FPSC section sequence. Fresh question stems are reserved across your saved mock sessions in this browser.',
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
