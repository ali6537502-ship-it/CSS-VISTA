// Selector for the official CSS Vista MPT series.
//
// A paper is partitioned only as FPSC partitions it: five sections with their official
// sizes, each drawn at random from the whole reviewed bank for that section, with every
// official syllabus heading present. There is no quota for any topic. Pure and
// deterministic: the same bank, seed and exclusions always produce the same series. It
// never lowers a standard to complete a paper — if a section cannot be filled, the build
// fails with the reason.

import {
  MPT_SECTION_ORDER, MPT_SECTION_SIZE, MPT_SUBTOPICS,
  type MptBankQuestion, type MptPassage, type MptSection,
} from './taxonomy.ts'
import {
  MPT_DIFFICULTY_SHAPE, MPT_OFFICIAL_HEADINGS, MPT_ORDER_RULES, MPT_PASSAGE_QUESTIONS, MPT_PILEUP_FACTOR,
  MPT_REPETITION_LIMITS,
} from './blueprint.ts'

export interface MptBank {
  questions: MptBankQuestion[]
  passages: MptPassage[]
}

export interface SelectedQuestion {
  id: string
  section: MptSection
  /** Option permutation: displayed option k is bank option order[k]. */
  order: [number, number, number, number]
  a: number
}

export interface SelectedPaper {
  index: number
  passageId: string | null
  questions: SelectedQuestion[]
}

export interface SeriesOptions {
  papers: number
  seed: string
  /** Canonical-stem hashes (or raw stems) that must never be reused. */
  isExcluded?: (question: MptBankQuestion) => boolean
  /** ca.recent items must fall inside this window (YYYY-MM-DD). */
  currentWindow: { from: string; to: string }
  /** 0–1: how closely an item resembles the recorded FPSC papers; closer items are drawn first. */
  resemblance?: (question: MptBankQuestion) => number
}

// ------------------------------------------------------------------ utilities

export function hashString(value: string) {
  let h = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function rngFor(seed: string) {
  let state = hashString(seed) || 1
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const canonicalText = (value: string) => value.toLocaleLowerCase('en').normalize('NFKD')
  .replace(/[ً-ٰٟ]/g, '')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()

const STOP = new Set(('a an and are as at be by choose correct for from has in is it of on or select that the this to was were what '
  + 'when where which who with following option options word given most nearly meaning sentence best complete fill blank blanks '
  + 'identify grammatically error correctly punctuated').split(' '))

export function tokenSet(value: string) {
  return new Set(canonicalText(value).split(' ').filter((t) => t.length > 2 && !STOP.has(t)))
}

export function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0
  let inter = 0
  a.forEach((t) => { if (b.has(t)) inter += 1 })
  return inter / (a.size + b.size - inter)
}

/** Wording with numbers masked. Identical templates never repeat in a series. */
export const surfaceTemplate = (value: string) => canonicalText(value).replace(/\d+(?:\s\d+)*/g, '#')

const GENERIC_STEM_SUBTOPICS = new Set([
  'eng.sentence-correction', 'eng.error-identification', 'eng.punctuation', 'eng.sentence-structure',
  'eng.modifier', 'eng.sva', 'urdu.sentence', 'urdu.translation', 'urdu.usage',
])

/** Text that identifies what an item tests, for near-duplicate detection. */
export function identityText(q: MptBankQuestion) {
  if (GENERIC_STEM_SUBTOPICS.has(q.subtopic) || tokenSet(q.q).size < 4) return `${q.q} ${q.o.join(' ')}`
  return `${q.q} ${q.o[q.a]}`
}

const FACTUAL_SECTIONS = new Set<MptSection>(['Islamic Studies', 'General Knowledge'])
/** Two items with the same correct answer and this similarity test one fact, in any sections. */
export const SAME_FACT_JACCARD = 0.5

/** Numbers-masked wording must be unique for computed items and any stem carrying numbers. */
export const usesTemplateRule = (q: { section: MptSection; subtopic: string; q: string }) => q.subtopic !== 'eng.comprehension'
  && (q.section === 'General Abilities' || /\d/.test(q.q))

/**
 * A "format family" names a question format shared by most of its subtopic
 * (e.g. every headword synonym item). Repetition limits apply to skeleton
 * families only; format families are governed by concept uniqueness and the pile-up limit.
 */
export function formatFamilies(questions: Array<{ subtopic: string; pattern_family: string }>) {
  const bySub = new Map<string, number>()
  const byFamily = new Map<string, { sub: string; n: number }>()
  for (const q of questions) {
    bySub.set(q.subtopic, (bySub.get(q.subtopic) ?? 0) + 1)
    const f = byFamily.get(q.pattern_family) ?? { sub: q.subtopic, n: 0 }
    f.n += 1
    byFamily.set(q.pattern_family, f)
  }
  const out = new Set<string>()
  for (const [family, { sub, n }] of byFamily) if (n >= 0.25 * (bySub.get(sub) ?? 1) && !sub.startsWith('ga.')) out.add(family)
  for (const q of questions) if (q.subtopic === 'eng.comprehension') out.add(q.pattern_family)
  return out
}

// ------------------------------------------------------------------ series state

interface SeriesState {
  formatFamilies: Set<string>
  /** correct-answer text → identities, across every section (same fact in two sections). */
  facts: Map<string, Array<Set<string>>>
  used: Set<string>
  concepts: Set<string>
  templates: Set<string>
  passages: Set<string>
  familyPapers: Map<string, number>
  identity: Map<string, Array<Set<string>>>
}

interface PaperState {
  families: Map<string, number>
  answers: Set<string>
  difficulty: Record<number, number>
  picked: MptBankQuestion[]
}

export class ReleaseError extends Error {}

// ------------------------------------------------------------------ official headings

/** The official heading an item belongs to (FPSC MPT syllabus). */
export function officialHeading(q: { section: MptSection; subject: string; subtopic: string }) {
  const rule = MPT_OFFICIAL_HEADINGS[q.section]
  if (rule.by === 'group') return MPT_SUBTOPICS[q.subtopic]?.group === 'comprehension' ? 'comprehension' : 'vocabulary and grammar'
  return q.subject
}

// ------------------------------------------------------------------ selection

/** Correct option much longer than its distractors — a test-wise giveaway. */
export function isLengthGiveaway(q: { o: string[]; a: number }) {
  const correct = q.o[q.a].length
  const others = q.o.filter((_, i) => i !== q.a).map((o) => o.length)
  const mean = others.reduce((x, y) => x + y, 0) / others.length
  return correct > 40 && correct > mean * 1.9
}
const MAX_GIVEAWAYS_PER_PAPER = 5

function eligibleFor(
  q: MptBankQuestion, series: SeriesState, paper: PaperState, familyCap: number,
) {
  if (isLengthGiveaway(q) && paper.picked.filter(isLengthGiveaway).length >= MAX_GIVEAWAYS_PER_PAPER) return false
  if (series.used.has(q.id) || series.concepts.has(`${q.section}|${canonicalText(q.concept)}`)) return false
  if (!series.formatFamilies.has(q.pattern_family)) {
    const perPaperFamily = q.section === 'General Abilities'
      ? MPT_REPETITION_LIMITS.perPaperFamilyGa.max
      : MPT_REPETITION_LIMITS.perPaperFamily.max
    if ((paper.families.get(q.pattern_family) ?? 0) >= perPaperFamily) return false
    if (q.section === 'General Abilities' && !paper.families.has(q.pattern_family) && (series.familyPapers.get(q.pattern_family) ?? 0) >= familyCap) return false
  }
  if (usesTemplateRule(q) && series.templates.has(surfaceTemplate(q.q))) return false
  if (FACTUAL_SECTIONS.has(q.section)) {
    const answer = canonicalText(q.o[q.a])
    if (answer.length > 3 && paper.answers.has(answer)) return false
  }
  const identity = tokenSet(identityText(q))
  const seen = series.identity.get(q.subtopic) ?? []
  if (FACTUAL_SECTIONS.has(q.section) && canonicalText(q.o[q.a]).length > 3) {
    const facts = series.facts.get(canonicalText(q.o[q.a])) ?? []
    const factIdentity = tokenSet(`${q.q} ${q.o[q.a]}`)
    if (facts.some((other) => jaccard(factIdentity, other) >= SAME_FACT_JACCARD)) return false
  }
  // General Ability repetition is governed by skeleton families and unique numbers-masked
  // templates; word-token similarity is meaningless for short symbolic stems.
  if (q.section !== 'General Abilities') {
    const threshold = MPT_REPETITION_LIMITS.nearDuplicateJaccard.max
    for (const other of seen) if (jaccard(identity, other) >= threshold) return false
  }
  return true
}

function record(q: MptBankQuestion, series: SeriesState, paper: PaperState) {
  series.used.add(q.id)
  series.concepts.add(`${q.section}|${canonicalText(q.concept)}`)
  if (usesTemplateRule(q)) series.templates.add(surfaceTemplate(q.q))
  if (!paper.families.has(q.pattern_family)) series.familyPapers.set(q.pattern_family, (series.familyPapers.get(q.pattern_family) ?? 0) + 1)
  paper.families.set(q.pattern_family, (paper.families.get(q.pattern_family) ?? 0) + 1)
  if (FACTUAL_SECTIONS.has(q.section)) paper.answers.add(canonicalText(q.o[q.a]))
  if (FACTUAL_SECTIONS.has(q.section) && canonicalText(q.o[q.a]).length > 3) {
    const key = canonicalText(q.o[q.a])
    const facts = series.facts.get(key) ?? []
    facts.push(tokenSet(`${q.q} ${q.o[q.a]}`))
    series.facts.set(key, facts)
  }
  const list = series.identity.get(q.subtopic) ?? []
  list.push(tokenSet(identityText(q)))
  series.identity.set(q.subtopic, list)
  paper.difficulty[q.difficulty] = (paper.difficulty[q.difficulty] ?? 0) + 1
  paper.picked.push(q)
}

/**
 * Difficulty the paper aims for. The MPT is a screening test: most items are
 * accessible or moderate, and General Abilities in particular is SSC-level, not a
 * puzzle contest (owner's instruction). Shares come from MPT_DIFFICULTY_SHAPE.
 */
export function difficultyTarget(section: MptSection): Record<number, number> {
  const shape = section === 'General Abilities' ? MPT_DIFFICULTY_SHAPE.abilitiesTarget : MPT_DIFFICULTY_SHAPE.target
  return { 1: shape[1], 2: shape[2], 3: shape[3] }
}

/** Most challenging items one section may hold. */
export function challengingCap(section: MptSection, size: number) {
  const share = section === 'General Abilities'
    ? MPT_DIFFICULTY_SHAPE.abilitiesChallengingShare.max
    : MPT_DIFFICULTY_SHAPE.perSectionChallengingShare.max
  return Math.floor((size * share) / 100)
}

/** Pile-up limit: at most twice a topic's expected share of the slots, plus one. */
function pileUpCaps(pool: MptBankQuestion[], slots: number) {
  const bySub = new Map<string, number>()
  for (const q of pool) bySub.set(q.subtopic, (bySub.get(q.subtopic) ?? 0) + 1)
  const caps = new Map<string, number>()
  for (const [sub, n] of bySub) caps.set(sub, Math.floor(MPT_PILEUP_FACTOR * slots * (n / Math.max(1, pool.length))) + 1)
  return caps
}

function pickItems(
  candidates: MptBankQuestion[], count: number, section: MptSection, sectionPicked: MptBankQuestion[],
  series: SeriesState, paper: PaperState, rng: () => number, familyCap: number,
  caps: Map<string, number>, resemblance: (q: MptBankQuestion) => number,
) {
  const size = MPT_SECTION_SIZE[section]
  const target = difficultyTarget(section)
  const hardCap = challengingCap(section, size)
  // Draw evenly across families so late papers still find several distinct ones.
  const unusedPerFamily = new Map<string, number>()
  for (const q of candidates) if (!series.used.has(q.id)) unusedPerFamily.set(q.pattern_family, (unusedPerFamily.get(q.pattern_family) ?? 0) + 1)
  const keyed = candidates.filter((q) => !series.used.has(q.id)).map((q) => ({
    q,
    key: rng()
      - resemblance(q) * 0.6
      - Math.min(0.6, (unusedPerFamily.get(q.pattern_family) ?? 0) * 0.04)
      + (q.quality_grade === 'B' ? 0.25 : 0)
      + (q.mpt_relevance === 'supporting' ? 0.15 : 0)
      + ((series.familyPapers.get(q.pattern_family) ?? 0) / Math.max(1, familyCap)) * 0.5
      - (q.source_type === 'past-paper-reviewed' ? 0.1 : 0),
  })).sort((x, y) => x.key - y.key)
  const chosen: MptBankQuestion[] = []
  while (chosen.length < count) {
    const inSection = [...sectionPicked, ...chosen]
    const deficit = (d: number) => target[d] * size - inSection.filter((q) => q.difficulty === d).length
    const hardFull = inSection.filter((q) => q.difficulty === 3).length >= hardCap
    const bySub = new Map<string, number>()
    for (const q of inSection) bySub.set(q.subtopic, (bySub.get(q.subtopic) ?? 0) + 1)
    let best: MptBankQuestion | null = null
    let bestScore = -Infinity
    let scanned = 0
    for (const { q } of keyed) {
      if (chosen.includes(q) || (hardFull && q.difficulty === 3)) continue
      if ((bySub.get(q.subtopic) ?? 0) >= (caps.get(q.subtopic) ?? Infinity)) continue
      if (!eligibleFor(q, series, paper, familyCap)) continue
      const score = deficit(q.difficulty) - scanned * 0.02
      if (score > bestScore) { best = q; bestScore = score }
      scanned += 1
      if (scanned >= 25) break
    }
    if (!best) return chosen
    chosen.push(best)
    record(best, series, paper)
  }
  return chosen
}

// ------------------------------------------------------------------ ordering

const ENGLISH_BLOCKS = [
  'eng.synonym', 'eng.antonym', 'eng.vocab-context', 'eng.idiom', 'eng.phrasal-verb', 'eng.confused-words',
  'eng.preposition', 'eng.article', 'eng.tense', 'eng.conjunction', 'eng.pronoun', 'eng.parts-of-speech',
  'eng.sva', 'eng.modifier', 'eng.sentence-structure', 'eng.sentence-correction', 'eng.error-identification',
  'eng.punctuation', 'eng.comprehension',
]

function shuffle<T>(items: T[], rng: () => number) {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** No run of more than two challenging items; swaps within the block keep it natural. */
function repairRuns(items: MptBankQuestion[]) {
  const out = [...items]
  const limit = MPT_ORDER_RULES.maxConsecutiveChallenging
  for (let pass = 0; pass < 4; pass += 1) {
    let run = 0
    for (let i = 0; i < out.length; i += 1) {
      run = out[i].difficulty === 3 ? run + 1 : 0
      if (run > limit) {
        const j = out.findIndex((q, k) => k > i && q.difficulty !== 3)
        if (j < 0) break
        ;[out[i], out[j]] = [out[j], out[i]]
        run = 0
      }
    }
  }
  return out
}

function orderSection(section: MptSection, items: MptBankQuestion[], passageOrder: string[], rng: () => number) {
  if (section === 'English') {
    const out: MptBankQuestion[] = []
    for (const block of ENGLISH_BLOCKS) {
      const blockItems = items.filter((q) => q.subtopic === block)
      if (block === 'eng.comprehension') {
        blockItems.sort((a, b) => passageOrder.indexOf(a.id) - passageOrder.indexOf(b.id))
        out.push(...blockItems)
      } else out.push(...repairRuns(shuffle(blockItems, rng)))
    }
    return out
  }
  if (section === 'General Knowledge') {
    const bySubject = (subject: string) => repairRuns(shuffle(items.filter((q) => q.subject === subject), rng))
    return [...bySubject('Everyday Science'), ...bySubject('Current Affairs'), ...bySubject('Pakistan Affairs')]
  }
  let out = repairRuns(shuffle(items, rng))
  if (section === 'Islamic Studies') {
    // The opening: no challenging item in the first five, at most two in the first ten.
    const { openingWindow, openingMaxChallenging, openingFirstFiveMaxChallenging } = MPT_ORDER_RULES
    const tooHard = () => out.slice(0, 5).filter((q) => q.difficulty === 3).length > openingFirstFiveMaxChallenging
      || out.slice(0, openingWindow).filter((q) => q.difficulty === 3).length > openingMaxChallenging
    for (let guard = 0; guard < 40 && tooHard(); guard += 1) {
      const i = out.findIndex((q, k) => q.difficulty === 3 && (k < 5 || k < openingWindow))
      const j = out.findIndex((q, k) => k >= openingWindow && q.difficulty !== 3)
      if (i < 0 || j < 0) break
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    // The very first question is always accessible or moderate and not a long one.
    const first = out.findIndex((q) => q.difficulty === 1)
    if (first > 0) [out[0], out[first]] = [out[first], out[0]]
    out = repairRuns(out)
  }
  return out
}

function blockKey(q: MptBankQuestion) {
  if (q.section === 'English') return `${q.section}|${q.subtopic === 'eng.comprehension' ? 'comp' : q.subtopic}`
  if (q.section === 'General Knowledge') return `${q.section}|${q.subject}`
  return q.section
}

/** Paper-wide pass: break runs of challenging items by swapping inside the same block only. */
function repairPaperRuns(items: MptBankQuestion[]) {
  const out = [...items]
  const limit = MPT_ORDER_RULES.maxConsecutiveChallenging
  const protectedStart = MPT_ORDER_RULES.openingWindow
  for (let pass = 0; pass < 6; pass += 1) {
    let run = 0
    let changed = false
    for (let i = 0; i < out.length; i += 1) {
      run = out[i].difficulty === 3 ? run + 1 : 0
      if (run <= limit) continue
      const key = blockKey(out[i])
      if (key === 'English|comp') continue
      let j = out.findIndex((q, k) => k > i && blockKey(q) === key && q.difficulty !== 3)
      if (j < 0) j = out.findIndex((q, k) => k < i - limit && k >= protectedStart && blockKey(q) === key && q.difficulty !== 3)
      if (j < 0) continue
      ;[out[i], out[j]] = [out[j], out[i]]
      changed = true
      run = 0
    }
    if (!changed) break
  }
  return out
}

const numericOption = (value: string) => /^[-−]?[\d.,/ ]+(?:\s?(?:%|°|cm|m|km|kg|g|l|litres?|days?|hours?|minutes?|years?|rs\.?|km\/h|m\/s|cm²|cm³|m²|m³))?$/i.test(value.trim())
const numericValue = (value: string) => {
  const cleaned = value.replace(/[−]/g, '-').replace(/[^\d./-]/g, '')
  if (/^-?\d+\/\d+$/.test(cleaned)) { const [n, d] = cleaned.split('/').map(Number); return n / d }
  return Number(cleaned)
}
const FIXED_OPTION_SETS = [/^(true|false|uncertain|cannot be determined|definitely true|definitely false)$/i]

export function optionOrder(q: MptBankQuestion, seed: string): [number, number, number, number] {
  const idx: [number, number, number, number] = [0, 1, 2, 3]
  if (q.o.every((o) => FIXED_OPTION_SETS.some((re) => re.test(o.trim())))) return idx
  if (q.o.every(numericOption) && q.o.every((o) => Number.isFinite(numericValue(o)))) {
    return [...idx].sort((x, y) => numericValue(q.o[x]) - numericValue(q.o[y])) as [number, number, number, number]
  }
  const rng = rngFor(`${seed}|${q.id}|options`)
  return shuffle(idx, rng) as [number, number, number, number]
}

// ------------------------------------------------------------------ series

export function buildSeries(bank: MptBank, options: SeriesOptions) {
  const passages = new Map(bank.passages.map((p) => [p.id, p]))
  const eligible = bank.questions.filter((q) => {
    if (options.isExcluded?.(q)) return false
    if (q.subtopic === 'ca.recent') {
      if (!q.event_date || q.event_date < options.currentWindow.from || q.event_date > options.currentWindow.to) return false
    }
    if (q.subtopic === 'eng.comprehension' && !passages.has(q.passage_id ?? '')) return false
    return true
  })
  const bySection = new Map<MptSection, MptBankQuestion[]>()
  for (const q of eligible) {
    if (q.subtopic === 'eng.comprehension') continue
    const list = bySection.get(q.section) ?? []
    list.push(q)
    bySection.set(q.section, list)
  }
  const passageQuestions = new Map<string, MptBankQuestion[]>()
  for (const q of eligible.filter((x) => x.subtopic === 'eng.comprehension')) {
    const list = passageQuestions.get(q.passage_id!) ?? []
    list.push(q)
    passageQuestions.set(q.passage_id!, list)
  }
  const passageIds = shuffle([...passageQuestions.keys()].filter((id) => {
    const n = passageQuestions.get(id)!.length
    return n >= MPT_PASSAGE_QUESTIONS.min && n <= MPT_PASSAGE_QUESTIONS.max
  }).sort(), rngFor(`${options.seed}|passages`))
  const resemblance = options.resemblance ?? (() => 0)

  const familyCap = MPT_REPETITION_LIMITS.perSeriesFamily.max
  const series: SeriesState = {
    formatFamilies: formatFamilies(eligible),
    facts: new Map(),
    used: new Set(), concepts: new Set(), templates: new Set(), passages: new Set(), familyPapers: new Map(), identity: new Map(),
  }
  const papers: SelectedPaper[] = []
  for (let index = 0; index < options.papers; index += 1) {
    const paperSeed = `${options.seed}|paper-${index + 1}`
    const rng = rngFor(paperSeed)
    const paper: PaperState = { families: new Map(), answers: new Set(), difficulty: { 1: 0, 2: 0, 3: 0 }, picked: [] }
    const ordered: MptBankQuestion[] = []
    let passageId: string | null = null
    let passageOrder: string[] = []
    for (const section of MPT_SECTION_ORDER) {
      const size = MPT_SECTION_SIZE[section]
      const sectionPicked: MptBankQuestion[] = []
      if (section === 'English') {
        passageId = passageIds.find((id) => !series.passages.has(id)) ?? null
        if (!passageId) throw new ReleaseError(`Paper ${index + 1}: no unused comprehension passage remains`)
        series.passages.add(passageId)
        const items = [...passageQuestions.get(passageId)!].sort((a, b) => a.id.localeCompare(b.id))
        passageOrder = items.map((q) => q.id)
        items.forEach((q) => { record(q, series, paper); sectionPicked.push(q) })
      }
      const pool = (bySection.get(section) ?? []).filter((q) => !series.used.has(q.id))
      const slots = size - sectionPicked.length
      const caps = pileUpCaps(pool, slots)
      // Every official heading is present: one item from each first, then the rest from the whole section.
      for (const heading of MPT_OFFICIAL_HEADINGS[section].headings) {
        if (sectionPicked.some((q) => officialHeading(q) === heading)) continue
        const got = pickItems(pool.filter((q) => officialHeading(q) === heading), 1, section, sectionPicked, series, paper, rng, familyCap, caps, resemblance)
        if (!got.length) throw new ReleaseError(`Paper ${index + 1}: ${section} has no fresh item under the official heading "${heading}"`)
        sectionPicked.push(...got)
      }
      sectionPicked.push(...pickItems(pool, size - sectionPicked.length, section, sectionPicked, series, paper, rng, familyCap, caps, resemblance))
      if (sectionPicked.length !== size) {
        throw new ReleaseError(`Paper ${index + 1}: ${section} has ${sectionPicked.length}/${size} after repetition checks (${pool.length} unused items left)`)
      }
      ordered.push(...orderSection(section, sectionPicked, passageOrder, rng))
    }
    const finalOrder = repairPaperRuns(ordered)
    papers.push({
      index: index + 1,
      passageId,
      questions: finalOrder.map((q) => {
        const order = optionOrder(q, paperSeed)
        return { id: q.id, section: q.section, order, a: order.indexOf(q.a) }
      }),
    })
  }
  return papers
}

// ------------------------------------------------------------------ resolution

export interface ResolvedQuestion {
  id: string
  section: MptSection
  topic: string
  difficulty: 'Basic' | 'Intermediate' | 'Advanced'
  q: string
  o: string[]
  a: number
  e: string
  meta: {
    subject: string
    subtopic: string
    pattern_family: string
    concept: string
    difficulty: 1 | 2 | 3
    source_type: string
    past_paper_year: number | null
    quality_grade: string
    mpt_relevance: string
    time_sensitive: boolean
    event_date: string | null
    source_url: string | null
    last_verified: string
    passage_id: string | null
  }
}

const DIFFICULTY_LABEL = { 1: 'Basic', 2: 'Intermediate', 3: 'Advanced' } as const

export function resolvePaper(paper: SelectedPaper, bank: MptBank): ResolvedQuestion[] {
  const byId = new Map(bank.questions.map((q) => [q.id, q]))
  const passages = new Map(bank.passages.map((p) => [p.id, p]))
  return paper.questions.map((s) => {
    const q = byId.get(s.id)
    if (!q) throw new ReleaseError(`Series references unknown question ${s.id}`)
    const passage = q.passage_id ? passages.get(q.passage_id) : undefined
    const stem = passage
      ? `Read the passage and answer the question.\n\n${passage.title}\n\n${passage.text}\n\nQuestion: ${q.q}`
      : q.q
    const source = q.time_sensitive && q.source_url
      ? `\nSource: ${q.source_url} (development dated ${q.event_date}; verified ${q.last_verified}).`
      : ''
    return {
      id: q.id,
      section: q.section,
      topic: MPT_SUBTOPICS[q.subtopic].label,
      difficulty: DIFFICULTY_LABEL[q.difficulty],
      q: stem,
      o: s.order.map((k) => q.o[k]),
      a: s.a,
      e: `${q.explanation}${source}`,
      meta: {
        subject: q.subject,
        subtopic: q.subtopic,
        pattern_family: q.pattern_family,
        concept: q.concept,
        difficulty: q.difficulty,
        source_type: q.source_type,
        past_paper_year: q.past_paper_year,
        quality_grade: q.quality_grade,
        mpt_relevance: q.mpt_relevance,
        time_sensitive: q.time_sensitive,
        event_date: q.event_date,
        source_url: q.source_url,
        last_verified: q.last_verified,
        passage_id: q.passage_id ?? null,
      },
    }
  })
}
