import type { BankQuestion } from '@/data/mcq'
import { createRng, fingerprint, type Rng } from './rng'
import { weightedPick, type ForgedItem, type ForgeGenerator } from './item'
import { quantitativeGenerators } from './quantitative'
import { algebraGeometryGenerators } from './algebraGeometry'
import { reasoningGenerators } from './reasoning'
import { englishUsageMix } from './englishUsage'

export type ForgeTopic =
  | 'quantitative'
  | 'algebra-geometry'
  | 'analytical-reasoning'
  | 'mental-ability'
  | 'basic-mathematics'
  | 'english-usage'

type Weighted = readonly (readonly [ForgeGenerator, number])[]

const weigh = (generators: Record<string, ForgeGenerator>, weight = 1): Weighted =>
  Object.values(generators).map((generator) => [generator, weight] as const)

// A topic is a weighted mix of generators rather than a single one, so a
// 22-question quantitative block looks like a real paper - a spread of
// percentages, interest, work and motion - instead of 22 variations of one
// template.
const ANALYTICAL = ['numberSeries', 'letterSeries', 'codingDecoding', 'alphabetPosition', 'oddOneOut', 'numericAnalogy', 'letterValueSum']
const MENTAL = ['syllogism', 'bloodRelation', 'directionSense', 'rowPosition', 'seatingArrangement', 'clockAngle', 'calendarDay']

const pickFrom = (source: Record<string, ForgeGenerator>, keys: string[], weight = 1): Weighted =>
  keys.map((key) => [source[key], weight] as const)

const TOPIC_MIX: Record<ForgeTopic, Weighted> = {
  quantitative: [...weigh(quantitativeGenerators, 3), ...weigh(algebraGeometryGenerators, 1)],
  'algebra-geometry': weigh(algebraGeometryGenerators),
  'analytical-reasoning': pickFrom(reasoningGenerators, ANALYTICAL),
  'mental-ability': pickFrom(reasoningGenerators, MENTAL),
  'basic-mathematics': [
    ...weigh(quantitativeGenerators, 3),
    ...weigh(algebraGeometryGenerators, 2),
    ...pickFrom(reasoningGenerators, ANALYTICAL, 1),
  ],
  'english-usage': englishUsageMix,
}

export const FORGE_TOPICS = Object.keys(TOPIC_MIX) as ForgeTopic[]

/** Options are laid out only here, so a generator can never mis-index its key. */
function toBankQuestion(item: ForgedItem, rng: Rng, topic: ForgeTopic): BankQuestion {
  const options = rng.shuffle([item.answer, ...item.distractors])
  const answerIndex = options.indexOf(item.answer)
  if (options.length !== 4 || answerIndex < 0) {
    throw new Error(`Forge produced a malformed item for ${topic}: ${item.q}`)
  }
  return {
    // Content-derived, so the same item forged twice collides in the dedupe
    // pass instead of appearing twice in one paper.
    id: `forge-${topic}-${fingerprint(`${item.q}|${item.answer}`)}`,
    q: item.q,
    o: options,
    a: answerIndex,
    e: item.explanation,
    s: item.topic,
    d: item.difficulty,
  }
}

export interface ForgeRequest {
  topic: ForgeTopic
  count: number
  seed: string
  /** IDs already used elsewhere in the paper or served recently. */
  exclude?: ReadonlySet<string>
}

/**
 * Forge `count` fresh questions.
 *
 * Draws are retried until enough distinct items exist; the attempt ceiling is
 * generous because a collision only means two draws of the same template landed
 * on the same numbers, which is rare and cheap to discard. If a topic somehow
 * cannot fill its quota it throws rather than returning a short list - a silent
 * short section is the failure mode this whole rewrite exists to remove.
 */
export function forgeQuestions({ topic, count, seed, exclude }: ForgeRequest): BankQuestion[] {
  if (count <= 0) return []
  const mix = TOPIC_MIX[topic]
  if (!mix?.length) throw new Error(`Unknown forge topic: ${topic}`)
  const rng = createRng(`forge|${topic}|${seed}`)
  const out: BankQuestion[] = []
  const used = new Set<string>()
  const stems = new Set<string>()

  for (let attempt = 0; out.length < count && attempt < count * 60 + 400; attempt += 1) {
    const generator = weightedPick(rng, mix)
    let question: BankQuestion
    try {
      question = toBankQuestion(generator(rng.fork(`item-${attempt}`)), rng, topic)
    } catch {
      continue // a generator that could not build four distinct options; draw again
    }
    const stem = question.q.trim().toLocaleLowerCase()
    if (used.has(question.id) || stems.has(stem) || exclude?.has(question.id)) continue
    used.add(question.id)
    stems.add(stem)
    out.push({ ...question, paperSection: undefined })
  }

  if (out.length < count) {
    throw new Error(`Forge could only produce ${out.length} of ${count} questions for “${topic}”.`)
  }
  return out
}

export { createRng, attemptSeed, hashSeed, fingerprint } from './rng'
export type { Rng } from './rng'
