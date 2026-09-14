import {
  curatedAbilityQuestions, curatedCurrentAffairsQuestions, curatedEnglishQuestions, curatedUrduTranslationQuestions,
} from './mockCurated'
import { auditedMptAbilityAdditions } from './mptAbilityAdditions'
import { getBankIndex, getChunk, type BankIndex, type BankQuestion } from './mcq'
import {
  EXAM_BLUEPRINTS, validateBlueprint,
  type BankSource, type CompetitiveMockKind, type CuratedPool, type ExamBlueprint, type MockSection, type SectionSpec, type TopicSpec,
} from './examBlueprints'
import { attemptSeed, createRng, forgeQuestions, type Rng } from '@/lib/forge'

export type { CompetitiveMockKind, MockSection } from './examBlueprints'
export { MOCK_BLUEPRINTS } from './examBlueprints'

export interface BuiltMockSection extends MockSection {
  topics: { label: string; count: number }[]
}

export interface BuiltMockPaper {
  kind: CompetitiveMockKind
  title: string
  authority: string
  questions: BankQuestion[]
  blueprint: MockSection[]
  sections: BuiltMockSection[]
  timeSec: number
  negativeMarkPerWrong: number
  passPercentage?: number
  note: string
  /** The seed this paper was built from - printable, so an attempt can be reproduced. */
  seed: string
}

/**
 * Where question data comes from.
 *
 * Injectable because the browser fetches shards over HTTP while tests read them
 * off disk. The previous builder solved this by importing a frozen 1,859-question
 * snapshot, which is exactly why every paper looked the same: the live bank
 * holds over 38,000 questions and the mocks were seeing 5% of it.
 */
export interface MockDataAdapter {
  index: () => Promise<BankIndex>
  chunk: (slug: string, chunk: number) => Promise<BankQuestion[]>
}

const browserAdapter: MockDataAdapter = { index: getBankIndex, chunk: getChunk }
let adapter: MockDataAdapter = browserAdapter

export function setMockDataAdapter(next: MockDataAdapter | null): void {
  adapter = next ?? browserAdapter
}

// ---------------------------------------------------------------------------
// Text handling and the quality gate
// ---------------------------------------------------------------------------

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

// Stems and options that read as machine-generated filler rather than as exam
// questions. Kept from the previous builder, which had accumulated them from
// real complaints about the shipped bank.
const rejectedQuestion = /Reuters|publication date|news agency published|GeoNames|ISO alpha|ISO 4217|UN M49|demonym|boiling point in kelvin|capital designated by Israel|In the Important Personalities section|Choose the option that correctly completes|Which answer correctly identifies|Which statement about the capital|Select the correct association concerning|which value is correctly recorded under|standard Kufan numbering used by Quran\.com|Which name matches both|Which actor-description pair|principal location connected with|Who or which body is chiefly identified|Which description fits|Which institution or personality is correctly connected|Choose the accurate person-and-description match|\[Parallel drill/i
const rejectedOption = /all of the above|none of (?:the above|these)|both a and b/i

function isUsable(question: BankQuestion) {
  if (!question.q || question.q.length < 12 || question.q.length > 320) return false
  if (!Array.isArray(question.o) || question.o.length !== 4) return false
  if (!Number.isInteger(question.a) || question.a < 0 || question.a > 3) return false
  if (new Set(question.o.map(normalise)).size !== 4) return false
  if (question.o.some((option) => !option.trim() || rejectedOption.test(option))) return false
  return !rejectedQuestion.test(question.q)
}

/**
 * Quality is a *tier*, not a sort key.
 *
 * The old builder ordered every candidate by a quality score and took the top
 * N, so the same highest-scoring questions won every single time - the seed
 * only ever broke ties. Tiering keeps explained, well-formed questions ahead of
 * bare ones while leaving the order inside a tier entirely to the seed, which
 * is what makes consecutive papers genuinely different.
 */
function qualityTier(question: BankQuestion) {
  if (question.id.startsWith('forge-') || question.id.startsWith('mock-')) return 0
  const explained = Boolean(question.e?.trim())
  const wellFormed = question.q.length <= 180 && /^(Choose|Complete|Find|How|Identify|In |The |What|When|Where|Which|Who|Fill)/i.test(question.q)
  if (explained && wellFormed) return 1
  if (explained) return 2
  return 3
}

function shuffleOptions(question: BankQuestion, rng: Rng): BankQuestion {
  const pairs = question.o.map((option, index) => ({ option, correct: index === question.a }))
  const shuffled = rng.shuffle(pairs)
  return {
    ...question,
    o: shuffled.map((pair) => pair.option),
    a: shuffled.findIndex((pair) => pair.correct),
  }
}

// ---------------------------------------------------------------------------
// Bank access
// ---------------------------------------------------------------------------

function matchesSource(question: BankQuestion, source: BankSource) {
  const subcategory = question.s ?? ''
  if (source.include && !source.include.test(subcategory)) return false
  if (source.exclude && source.exclude.test(subcategory)) return false
  return true
}

/**
 * Reads as few shards as will comfortably cover the topic, starting from a
 * seed-chosen offset.
 *
 * Loading whole categories would mean megabytes per paper (islamic-gk alone is
 * fourteen shards); loading a fixed shard would bring back the frozen-paper
 * problem. Starting at a random shard and walking until the pool is deep enough
 * gives variety and a small payload at the same time.
 */
async function collectPool(sources: readonly BankSource[], need: number, rng: Rng): Promise<BankQuestion[]> {
  if (!sources.length || need <= 0) return []
  const index = await adapter.index()
  const target = Math.max(60, need * 12)
  const pool: BankQuestion[] = []

  for (const source of sources) {
    const category = index.categories.find((entry) => entry.slug === source.slug)
    if (!category || category.chunks < 1) continue
    const offset = rng.int(0, Math.max(0, category.chunks - 1))
    for (let step = 0; step < category.chunks; step += 1) {
      const chunk = (offset + step) % category.chunks
      const rows = await adapter.chunk(source.slug, chunk)
      for (const row of rows) if (matchesSource(row, source)) pool.push(row)
      if (pool.length >= target) break
    }
    if (pool.length >= target) break
  }
  return pool
}

const CURATED_POOLS: Record<CuratedPool, () => BankQuestion[]> = {
  'english-usage': () => curatedEnglishQuestions.filter((question) => question.s !== 'Comprehension'),
  'english-comprehension': () => curatedEnglishQuestions.filter((question) => question.s === 'Comprehension'),
  'urdu-translation': () => curatedUrduTranslationQuestions,
  ability: () => [...curatedAbilityQuestions, ...auditedMptAbilityAdditions],
  'current-affairs': () => curatedCurrentAffairsQuestions,
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

interface PaperContext {
  usedIds: Set<string>
  usedStems: Set<string>
  avoid: ReadonlySet<string>
  selected: BankQuestion[]
}

interface TopicContext extends PaperContext {
  sectionLabel: string
  topic: TopicSpec
  /** Language and ability items legitimately repeat an answer word; facts do not. */
  factual: boolean
}

const LANGUAGE_OR_ABILITY = /english|urdu|abilit|mathematic|reasoning|algebra|geometry|quantitative|logic/i

/**
 * Fills one topic to its exact count.
 *
 * Three passes, each looser than the last, so the strict rules shape a normal
 * paper while a thin pool still yields a complete one: pass 1 avoids anything
 * served recently and rejects near-duplicates; pass 2 allows recently served
 * questions back; pass 3 drops the similarity checks. A topic that still cannot
 * fill throws, because a short section is worse than a loud failure.
 */
function fillFromPool(pool: BankQuestion[], count: number, rng: Rng, ctx: TopicContext): BankQuestion[] {
  const usable = pool.filter(isUsable)
  const deduped = new Map<string, BankQuestion>()
  for (const question of usable) if (!deduped.has(question.id)) deduped.set(question.id, question)

  // Tier first, then shuffle inside each tier: quality without a frozen order.
  const tiers = new Map<number, BankQuestion[]>()
  for (const question of deduped.values()) {
    const tier = qualityTier(question)
    const bucket = tiers.get(tier)
    if (bucket) bucket.push(question)
    else tiers.set(tier, [question])
  }
  const candidates = [...tiers.keys()].sort((left, right) => left - right)
    .flatMap((tier) => rng.shuffle(tiers.get(tier)!))

  const selected: BankQuestion[] = []
  const subtopicCounts = new Map<string, number>()
  const subtopicCap = Math.max(2, Math.ceil(count / 3))

  const consider = (question: BankQuestion, pass: 1 | 2 | 3) => {
    if (selected.length >= count) return
    if (ctx.usedIds.has(question.id)) return
    if (pass === 1 && ctx.avoid.has(question.id)) return
    const stem = normalise(question.q)
    if (!stem || ctx.usedStems.has(stem)) return

    const subtopic = normalise(question.s || 'general')
    if (pass < 3 && (subtopicCounts.get(subtopic) ?? 0) >= subtopicCap) return

    if (pass < 3) {
      const concept = answerConcept(question.o[question.a])
      if (ctx.factual && concept.length > 3 && ctx.selected.some((picked) => answerConcept(picked.o[picked.a]) === concept)) return
      const tooClose = ctx.selected.some((picked) => {
        const close = similarity(picked.q, question.q)
        if (close >= 0.78) return true
        if (similarity(`${picked.q} ${picked.o[picked.a]}`, `${question.q} ${question.o[question.a]}`) >= 0.7) return true
        return normalise(picked.o[picked.a]) === normalise(question.o[question.a])
          && normalise(picked.s || '') === subtopic
          && close >= 0.42
      })
      if (tooClose) return
    }

    const prepared = shuffleOptions({
      ...question,
      paperSection: ctx.sectionLabel,
      paperTopic: ctx.topic.label,
    }, rng)
    selected.push(prepared)
    ctx.selected.push(prepared)
    ctx.usedIds.add(question.id)
    ctx.usedStems.add(stem)
    subtopicCounts.set(subtopic, (subtopicCounts.get(subtopic) ?? 0) + 1)
  }

  for (const pass of [1, 2, 3] as const) {
    if (selected.length >= count) break
    for (const question of candidates) consider(question, pass)
  }

  if (selected.length !== count) {
    throw new Error(`Topic “${ctx.topic.label}” needs ${count} bank questions but only ${selected.length} passed the quality gate (pool of ${pool.length}).`)
  }
  return selected
}

async function buildTopic(topic: TopicSpec, sectionLabel: string, paperSeed: string, ctx: PaperContext): Promise<BankQuestion[]> {
  const rng = createRng(`${paperSeed}|${sectionLabel}|${topic.id}`)
  const hasBankSources = Boolean(topic.sources?.length || topic.curated?.length)
  const forgeCount = topic.forge
    ? Math.min(topic.count, Math.round(topic.count * (hasBankSources ? topic.forgeShare ?? 1 : 1)))
    : 0
  const bankCount = topic.count - forgeCount

  const topicCtx: TopicContext = {
    ...ctx,
    sectionLabel,
    topic,
    factual: !LANGUAGE_OR_ABILITY.test(`${sectionLabel} ${topic.label}`),
  }

  const forged = forgeCount > 0 && topic.forge
    ? forgeQuestions({
      topic: topic.forge,
      count: forgeCount,
      seed: `${paperSeed}|${topic.id}`,
      exclude: new Set([...ctx.usedIds, ...ctx.avoid]),
    }).map((question) => {
      const prepared = { ...question, paperSection: sectionLabel, paperTopic: topic.label }
      ctx.usedIds.add(prepared.id)
      ctx.usedStems.add(normalise(prepared.q))
      ctx.selected.push(prepared)
      return prepared
    })
    : []

  const pool = [
    ...await collectPool(topic.sources ?? [], bankCount, rng),
    ...(topic.curated ?? []).flatMap((name) => CURATED_POOLS[name]()),
  ]
  const drawn = fillFromPool(pool, bankCount, rng, topicCtx)

  // Forged and drawn questions interleave, so a candidate cannot tell where the
  // generated block begins.
  return rng.shuffle([...forged, ...drawn])
}

async function buildSection(section: SectionSpec, paperSeed: string, ctx: PaperContext): Promise<BankQuestion[]> {
  const questions: BankQuestion[] = []
  for (const topic of section.topics) {
    questions.push(...await buildTopic(topic, section.label, paperSeed, ctx))
  }
  return questions
}

function validatePaper(questions: BankQuestion[], blueprint: ExamBlueprint) {
  if (questions.length !== blueprint.totalQuestions) {
    throw new Error(`Expected ${blueprint.totalQuestions} questions in the ${blueprint.kind} mock; received ${questions.length}.`)
  }
  if (new Set(questions.map((question) => question.id)).size !== questions.length) {
    throw new Error('Duplicate question ID found in mock paper.')
  }
  if (new Set(questions.map((question) => normalise(question.q))).size !== questions.length) {
    throw new Error('Duplicate question text found in mock paper.')
  }
  for (const section of blueprint.sections) {
    const actual = questions.filter((question) => question.paperSection === section.label).length
    if (actual !== section.count) {
      throw new Error(`Section ${section.label} expected ${section.count} questions; received ${actual}.`)
    }
  }
}

export function currentPakistanDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export interface BuildMockOptions {
  /**
   * Omit for a brand-new paper. Pass a fixed string only to reproduce one -
   * tests do, and so does a printed paper that has to be re-rendered.
   */
  seed?: string
  /** Questions to keep out of this paper if the pools allow, e.g. recent attempts. */
  avoidIds?: Iterable<string>
}

/**
 * Builds a complete paper for one of the official formats.
 *
 * The paper is new on every call: the default seed is random, so section draws,
 * bank shards, forged items and option order all move together. Nothing here is
 * keyed to the calendar date - the previous builder was, which is why a
 * candidate sitting the mock twice in one day saw the identical paper.
 */
export async function buildCompetitiveMock(
  kind: CompetitiveMockKind,
  options: BuildMockOptions = {},
): Promise<BuiltMockPaper> {
  const blueprint = EXAM_BLUEPRINTS[kind]
  if (!blueprint) throw new Error(`Unknown mock format: ${kind}`)
  validateBlueprint(blueprint)

  const seed = options.seed ?? attemptSeed(kind)
  const ctx: PaperContext = {
    usedIds: new Set(),
    usedStems: new Set(),
    avoid: new Set(options.avoidIds ?? []),
    selected: [],
  }

  const questions: BankQuestion[] = []
  for (const section of blueprint.sections) {
    questions.push(...await buildSection(section, seed, ctx))
  }
  validatePaper(questions, blueprint)

  return {
    kind,
    title: blueprint.title,
    authority: blueprint.authority,
    questions,
    blueprint: blueprint.sections.map(({ label, count }) => ({ label, count })),
    sections: blueprint.sections.map((section) => ({
      label: section.label,
      count: section.count,
      topics: section.topics.map((topic) => ({ label: topic.label, count: topic.count })),
    })),
    timeSec: blueprint.timeSec,
    negativeMarkPerWrong: blueprint.negativeMarkPerWrong,
    passPercentage: blueprint.passPercentage,
    note: blueprint.patternNote,
    seed,
  }
}
