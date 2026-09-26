// Blueprint-driven selector for the official CSS Vista MPT series.
//
// Pure and deterministic: the same bank, seed and exclusions always produce the
// same series. It never lowers a standard to complete a paper — if a section
// cannot be filled within the blueprint, the build fails with the reason.

import {
  MPT_SECTION_ORDER, MPT_SECTION_SIZE, MPT_SUBTOPICS,
  type MptBankQuestion, type MptPassage, type MptSection,
} from './taxonomy.ts'
import {
  MPT_GROUP_RANGES, MPT_ORDER_RULES, MPT_REPETITION_LIMITS, MPT_SUBTOPIC_RANGES, type Range,
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

/** Numbers-masked wording must be unique for computed items and any stem carrying numbers. */
export const usesTemplateRule = (q: { section: MptSection; subtopic: string; q: string }) => q.subtopic !== 'eng.comprehension'
  && (q.section === 'General Abilities' || /\d/.test(q.q))

/**
 * A "format family" names a question format shared by most of its subtopic
 * (e.g. every headword synonym item). Repetition limits apply to skeleton
 * families only; format families are governed by subtopic ranges and concepts.
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

function groupKey(q: { section: MptSection; subtopic: string }) {
  const def = MPT_SUBTOPICS[q.subtopic]
  if (q.section === 'English') return def.group === 'comprehension' ? 'comprehension' : def.group === 'vocabulary' ? 'vocabulary' : 'grammar'
  if (q.section === 'General Abilities') return def.subject === 'Reasoning' ? 'reasoning' : 'quant'
  if (q.section === 'General Knowledge') {
    if (def.subject === 'Everyday Science') return 'science'
    if (def.subject === 'Current Affairs') return 'current'
    return 'pakistan'
  }
  if (q.section === 'Urdu') return def.group === 'translation' ? 'translation' : 'other'
  return 'all'
}

function groupRangesFor(section: MptSection): Record<string, Range> {
  if (section === 'English') return MPT_GROUP_RANGES.english
  if (section === 'General Abilities') return MPT_GROUP_RANGES.abilities
  if (section === 'General Knowledge') {
    const { science, current, pakistan } = MPT_GROUP_RANGES.generalKnowledge
    return { science, current, pakistan }
  }
  if (section === 'Urdu') return MPT_GROUP_RANGES.urdu
  return {}
}

// ------------------------------------------------------------------ series state

interface SeriesState {
  formatFamilies: Set<string>
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

// ------------------------------------------------------------------ planning

function planSection(
  section: MptSection, size: number, supply: Map<string, number>, rng: () => number, papersLeft: number,
  fixed: Record<string, number> = {},
) {
  const ranges = MPT_SUBTOPIC_RANGES[section]
  const groups = groupRangesFor(section)
  const counts = new Map<string, number>()
  const subGroup = (sub: string) => groupKey({ section, subtopic: sub })
  const groupSum = (g: string) => [...counts].filter(([s]) => subGroup(s) === g).reduce((n, [, c]) => n + c, 0)
  const total = () => [...counts.values()].reduce((a, b) => a + b, 0)
  for (const [sub, range] of Object.entries(ranges)) {
    if (sub in fixed) { counts.set(sub, fixed[sub]); continue }
    const available = supply.get(sub) ?? 0
    if (available < range.min) {
      throw new ReleaseError(`${section}: subtopic ${sub} needs at least ${range.min} but only ${available} eligible items remain`)
    }
    counts.set(sub, range.min)
  }
  const canGrow = (sub: string) => {
    if (sub in fixed) return false
    const range = ranges[sub]
    const g = subGroup(sub)
    const c = counts.get(sub) ?? 0
    return c < range.max && c < (supply.get(sub) ?? 0) && (!groups[g] || groupSum(g) < groups[g].max)
  }
  const weight = (sub: string) => {
    const range = ranges[sub]
    const c = counts.get(sub) ?? 0
    const perPaperSupply = (supply.get(sub) ?? 0) / Math.max(1, papersLeft)
    const mid = (range.min + range.max) / 2
    return Math.max(0.05, perPaperSupply) * (c < mid ? 1.6 : 0.6) * (0.75 + rng() * 0.5)
  }
  const grow = (pool: string[]) => {
    const options = pool.filter(canGrow)
    if (!options.length) return false
    const weights = options.map(weight)
    let pick = rng() * weights.reduce((a, b) => a + b, 0)
    for (let i = 0; i < options.length; i += 1) {
      pick -= weights[i]
      if (pick <= 0) { counts.set(options[i], (counts.get(options[i]) ?? 0) + 1); return true }
    }
    counts.set(options[options.length - 1], (counts.get(options[options.length - 1]) ?? 0) + 1)
    return true
  }
  for (const [g, range] of Object.entries(groups)) {
    const members = Object.keys(ranges).filter((s) => subGroup(s) === g)
    while (groupSum(g) < range.min) {
      if (total() >= size || !grow(members)) throw new ReleaseError(`${section}: cannot reach the ${g} minimum of ${range.min}`)
    }
  }
  while (total() < size) {
    if (!grow(Object.keys(ranges))) throw new ReleaseError(`${section}: blueprint cannot be completed (${total()}/${size}) with the remaining eligible items`)
  }
  if (total() > size) throw new ReleaseError(`${section}: subtopic minimums exceed the section size`)
  if (section === 'General Knowledge') {
    // Everyday Science must include computing/IT (syllabus heading) within its sub-range.
    const it = ['sci.it', 'sci.ai-digital']
    const { min, max } = MPT_GROUP_RANGES.generalKnowledge.scienceIt
    const itSum = () => it.reduce((n, k) => n + (counts.get(k) ?? 0), 0)
    const donors = () => [...counts.keys()].filter((k) => k.startsWith('sci.') && !it.includes(k) && (counts.get(k) ?? 0) > ranges[k].min)
    const takers = () => it.filter((k) => (counts.get(k) ?? 0) < ranges[k].max && (counts.get(k) ?? 0) < (supply.get(k) ?? 0))
    while (itSum() < min && donors().length && takers().length) {
      const d = donors()[Math.floor(rng() * donors().length)]
      const t = takers()[Math.floor(rng() * takers().length)]
      counts.set(d, counts.get(d)! - 1); counts.set(t, counts.get(t)! + 1)
    }
    while (itSum() > max) {
      const from = it.filter((k) => (counts.get(k) ?? 0) > ranges[k].min)
      const to = [...counts.keys()].filter((k) => k.startsWith('sci.') && !it.includes(k) && (counts.get(k) ?? 0) < ranges[k].max && (counts.get(k) ?? 0) < (supply.get(k) ?? 0))
      if (!from.length || !to.length) break
      counts.set(from[0], counts.get(from[0])! - 1); counts.set(to[0], counts.get(to[0])! + 1)
    }
    if (itSum() < min || itSum() > max) throw new ReleaseError(`General Knowledge: science-IT items ${itSum()} outside ${min}–${max}`)
  }
  return counts
}

// ------------------------------------------------------------------ selection

function eligibleFor(
  q: MptBankQuestion, series: SeriesState, paper: PaperState, familyCap: number,
) {
  if (series.used.has(q.id) || series.concepts.has(`${q.section}|${canonicalText(q.concept)}`)) return false
  if (!series.formatFamilies.has(q.pattern_family)) {
    const perPaperFamily = q.section === 'General Abilities'
      ? MPT_REPETITION_LIMITS.perPaperFamilyGa.max
      : MPT_REPETITION_LIMITS.perPaperFamily.max
    if ((paper.families.get(q.pattern_family) ?? 0) >= perPaperFamily) return false
    if (!paper.families.has(q.pattern_family) && (series.familyPapers.get(q.pattern_family) ?? 0) >= familyCap) return false
  }
  if (usesTemplateRule(q) && series.templates.has(surfaceTemplate(q.q))) return false
  if (FACTUAL_SECTIONS.has(q.section)) {
    const answer = canonicalText(q.o[q.a])
    if (answer.length > 3 && paper.answers.has(answer)) return false
  }
  const identity = tokenSet(identityText(q))
  const seen = series.identity.get(q.subtopic) ?? []
  const threshold = MPT_REPETITION_LIMITS.nearDuplicateJaccard.max
  for (const other of seen) if (jaccard(identity, other) >= threshold) return false
  return true
}

function record(q: MptBankQuestion, series: SeriesState, paper: PaperState) {
  series.used.add(q.id)
  series.concepts.add(`${q.section}|${canonicalText(q.concept)}`)
  if (usesTemplateRule(q)) series.templates.add(surfaceTemplate(q.q))
  if (!paper.families.has(q.pattern_family)) series.familyPapers.set(q.pattern_family, (series.familyPapers.get(q.pattern_family) ?? 0) + 1)
  paper.families.set(q.pattern_family, (paper.families.get(q.pattern_family) ?? 0) + 1)
  if (FACTUAL_SECTIONS.has(q.section)) paper.answers.add(canonicalText(q.o[q.a]))
  const list = series.identity.get(q.subtopic) ?? []
  list.push(tokenSet(identityText(q)))
  series.identity.set(q.subtopic, list)
  paper.difficulty[q.difficulty] = (paper.difficulty[q.difficulty] ?? 0) + 1
  paper.picked.push(q)
}

const DEFAULT_SHARE: Record<number, number> = { 1: 0.3, 2: 0.5, 3: 0.2 }

/**
 * Difficulty target for a section: follows what the remaining pool can sustain
 * (so paper 40 is shaped like paper 1), clamped to the blueprint's shape.
 */
function difficultyTarget(pool: MptBankQuestion[]): Record<number, number> {
  if (!pool.length) return DEFAULT_SHARE
  const share = [1, 2, 3].map((d) => pool.filter((q) => q.difficulty === d).length / pool.length)
  const d1 = Math.min(0.38, Math.max(0.27, share[0]))
  const d3 = Math.min(0.26, Math.max(0.16, share[2]))
  return { 1: d1, 2: 1 - d1 - d3, 3: d3 }
}

function pickFromSubtopic(
  candidates: MptBankQuestion[], count: number, section: MptSection, sectionPicked: MptBankQuestion[],
  series: SeriesState, paper: PaperState, rng: () => number, familyCap: number,
  target: Record<number, number> = DEFAULT_SHARE,
) {
  const size = MPT_SECTION_SIZE[section]
  const keyed = candidates.map((q) => ({
    q,
    key: rng()
      + (q.quality_grade === 'B' ? 0.25 : 0)
      + (q.mpt_relevance === 'supporting' ? 0.15 : 0)
      + ((series.familyPapers.get(q.pattern_family) ?? 0) / Math.max(1, familyCap)) * 0.5
      - (q.source_type === 'past-paper-reviewed' ? 0.1 : 0),
  })).sort((x, y) => x.key - y.key)
  const chosen: MptBankQuestion[] = []
  while (chosen.length < count) {
    const inSection = [...sectionPicked, ...chosen]
    const deficit = (d: number) => target[d] * size - inSection.filter((q) => q.difficulty === d).length
    const challengingFull = inSection.filter((q) => q.difficulty === 3).length >= Math.floor(size * 0.4)
    let best: MptBankQuestion | null = null
    let bestScore = -Infinity
    let scanned = 0
    for (const { q } of keyed) {
      if (chosen.includes(q) || !eligibleFor(q, series, paper, familyCap)) continue
      if (challengingFull && q.difficulty === 3) continue
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
  const bySubtopic = new Map<string, MptBankQuestion[]>()
  for (const q of eligible) {
    if (q.subtopic === 'eng.comprehension') continue
    const list = bySubtopic.get(q.subtopic) ?? []
    list.push(q)
    bySubtopic.set(q.subtopic, list)
  }
  const passageQuestions = new Map<string, MptBankQuestion[]>()
  for (const q of eligible.filter((x) => x.subtopic === 'eng.comprehension')) {
    const list = passageQuestions.get(q.passage_id!) ?? []
    list.push(q)
    passageQuestions.set(q.passage_id!, list)
  }
  const compRange = MPT_SUBTOPIC_RANGES.English['eng.comprehension']
  const passageIds = shuffle([...passageQuestions.keys()].filter((id) => {
    const n = passageQuestions.get(id)!.length
    return n >= compRange.min && n <= compRange.max
  }).sort(), rngFor(`${options.seed}|passages`))

  const familyCap = MPT_REPETITION_LIMITS.perSeriesFamily.max
  const series: SeriesState = {
    formatFamilies: formatFamilies(eligible),
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
      const fixed: Record<string, number> = {}
      const sectionPicked: MptBankQuestion[] = []
      if (section === 'English') {
        passageId = passageIds.find((id) => !series.passages.has(id)) ?? null
        if (!passageId) throw new ReleaseError(`Paper ${index + 1}: no unused comprehension passage remains`)
        series.passages.add(passageId)
        const items = [...passageQuestions.get(passageId)!].sort((a, b) => a.id.localeCompare(b.id))
        passageOrder = items.map((q) => q.id)
        items.forEach((q) => { record(q, series, paper); sectionPicked.push(q) })
        fixed['eng.comprehension'] = items.length
      }
      const supply = new Map<string, number>()
      for (const sub of Object.keys(MPT_SUBTOPIC_RANGES[section])) {
        if (sub in fixed) continue
        supply.set(sub, (bySubtopic.get(sub) ?? []).filter((q) => !series.used.has(q.id)
          && !series.concepts.has(`${q.section}|${canonicalText(q.concept)}`)).length)
      }
      const papersLeft = options.papers - index
      const remainingPool = Object.keys(MPT_SUBTOPIC_RANGES[section]).flatMap((sub) => (bySubtopic.get(sub) ?? [])
        .filter((q) => !series.used.has(q.id)))
      const target = difficultyTarget(remainingPool)
      let plan: Map<string, number> | null = null
      let lastError: unknown = null
      for (let attempt = 0; attempt < 6 && !plan; attempt += 1) {
        try {
          plan = planSection(section, size, supply, rngFor(`${paperSeed}|${section}|plan|${attempt}`), papersLeft, fixed)
        } catch (error) { lastError = error }
      }
      if (!plan) throw new ReleaseError(`Paper ${index + 1}: ${(lastError as Error).message}`)
      // Scarcest subtopics first, so abundant ones absorb any shortfall.
      const order = [...plan.entries()].filter(([sub, n]) => n > 0 && !(sub in fixed))
        .sort((a, b) => (supply.get(a[0])! - a[1]) - (supply.get(b[0])! - b[1]))
      const shortfall = new Map<string, number>()
      for (const [sub, n] of order) {
        const got = pickFromSubtopic(bySubtopic.get(sub) ?? [], n, section, sectionPicked, series, paper, rng, familyCap, target)
        sectionPicked.push(...got)
        if (got.length < n) shortfall.set(sub, n - got.length)
      }
      // Re-home shortfalls within ranges; never below a subtopic minimum.
      for (const [sub, missing] of shortfall) {
        const min = MPT_SUBTOPIC_RANGES[section][sub].min
        const have = sectionPicked.filter((q) => q.subtopic === sub).length
        if (have < min) throw new ReleaseError(`Paper ${index + 1}: ${section} ${sub} has ${have} fresh items after repetition checks; minimum is ${min}`)
        let remaining = missing
        const groups = groupRangesFor(section)
        const others = Object.keys(MPT_SUBTOPIC_RANGES[section]).filter((s) => s !== sub && !(s in fixed)
          && groupKey({ section, subtopic: s }) === groupKey({ section, subtopic: sub }))
        const alternates = others.length ? others : Object.keys(MPT_SUBTOPIC_RANGES[section]).filter((s) => s !== sub && !(s in fixed))
        for (const alt of shuffle(alternates, rng)) {
          if (!remaining) break
          const altHave = sectionPicked.filter((q) => q.subtopic === alt).length
          const room = MPT_SUBTOPIC_RANGES[section][alt].max - altHave
          const g = groupKey({ section, subtopic: alt })
          const groupRoom = groups[g] ? groups[g].max - sectionPicked.filter((q) => groupKey(q) === g).length : Infinity
          const take = Math.min(room, remaining, groupRoom)
          if (take <= 0) continue
          const got = pickFromSubtopic(bySubtopic.get(alt) ?? [], take, section, sectionPicked, series, paper, rng, familyCap, target)
          sectionPicked.push(...got)
          remaining -= got.length
        }
        if (remaining) throw new ReleaseError(`Paper ${index + 1}: ${section} is ${remaining} short after ${sub} ran out of fresh items`)
      }
      if (sectionPicked.length !== size) throw new ReleaseError(`Paper ${index + 1}: ${section} has ${sectionPicked.length}/${size}`)
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
