import type { BankQuestion } from './mcq.ts'
import { grammarPhase1 } from './grammar-course/phase1.ts'
import { grammarPhase2 } from './grammar-course/phase2.ts'
import { grammarPhase3 } from './grammar-course/phase3.ts'
import { grammarPhase4 } from'./grammar-course/phase4.ts'
import { grammarPhase5 } from './grammar-course/phase5.ts'
import { masterGrammarP1A } from './master-grammar/p1a.ts'
import { masterGrammarP1B } from './master-grammar/p1b.ts'
import { masterGrammarP2A } from './master-grammar/p2a.ts'
import { masterGrammarP2B } from './master-grammar/p2b.ts'
import { masterGrammarP3A } from './master-grammar/p3a.ts'
import { masterGrammarP3B } from './master-grammar/p3b.ts'
import { masterGrammarP4A } from './master-grammar/p4a.ts'
import { masterGrammarP4B } from './master-grammar/p4b.ts'
import { masterGrammarP5A } from './master-grammar/p5a.ts'
import { masterGrammarP5B } from './master-grammar/p5b.ts'
import reference from './bundled-grammar/english.json' with { type: 'json' }

const courseLessons = [...grammarPhase1, ...grammarPhase2, ...grammarPhase3, ...grammarPhase4, ...grammarPhase5]
const masterDays = [
  ...masterGrammarP1A, ...masterGrammarP1B, ...masterGrammarP2A, ...masterGrammarP2B,
  ...masterGrammarP3A, ...masterGrammarP3B, ...masterGrammarP4A, ...masterGrammarP4B,
  ...masterGrammarP5A, ...masterGrammarP5B,
]

function canonical(value: string) {
  return value.toLocaleLowerCase('en').replace(/[^a-z0-9]+/g, ' ').trim()
}

function rotate<T>(values: T[], amount: number) {
  const offset = amount % values.length
  return values.slice(offset).concat(values.slice(0, offset))
}

function stripNote(value: string) {
  const marker = value.indexOf(' (')
  return (marker >= 0 ? value.slice(0, marker) : value).trim()
}

function oppositeMeaning(sentence: string) {
  const auxiliaries = /\b(is|are|was|were|has|have|had|will|would|should|can|could|must|may|might)\b/i
  if (auxiliaries.test(sentence)) return sentence.replace(auxiliaries, '$1 not')
  if (/\bno\b/i.test(sentence)) return sentence.replace(/\bno\b/i, 'every')
  return sentence.replace(/([.!?])?$/, ' not.$1').replace(/\.\.$/, '.')
}

function formError(sentence: string) {
  const swaps: [RegExp, string][] = [
    [/\bhas\b/i, 'have'], [/\bhave\b/i, 'has'], [/\bis\b/i, 'are'], [/\bare\b/i, 'is'],
    [/\bwas\b/i, 'were'], [/\bwere\b/i, 'was'], [/\bdoes\b/i, 'do'], [/\bdo\b/i, 'does'],
    [/\bfewer\b/i, 'less'], [/\bto\b/i, 'than'], [/\ban\b/i, 'a'], [/\ba\b/i, 'an'],
  ]
  const swap = swaps.find(([pattern]) => pattern.test(sentence))
  if (swap) return sentence.replace(swap[0], swap[1])
  return sentence.replace(/\b(the|this|that)\b/i, '').replace(/\s+/g, ' ').trim()
}

function makeCorrectionOptions(correct: string, original: string, seed: number) {
  const candidates = [correct, original, oppositeMeaning(correct), formError(correct)]
  const unique: string[] = []
  for (const candidate of candidates) {
    const clean = candidate.trim()
    if (clean && !unique.some((value) => canonical(value) === canonical(clean))) unique.push(clean)
  }
  while (unique.length < 4) unique.push(`${correct.replace(/[.!?]+$/, '')} without.`)
  const base = unique.slice(0, 4)
  const options = rotate(base, seed)
  return { options, answer: options.indexOf(correct) }
}

type CorrectionFact = { id: string; original: string; correct: string; why: string; topic: string }
const correctionFacts: CorrectionFact[] = [
  ...courseLessons.flatMap((lesson) => [
    ...lesson.corrections.map((item) => ({
      id: `course-${item.id}`, original: item.task, correct: item.model, why: item.note, topic: lesson.title,
    })),
    ...lesson.examples.map((item, index) => ({
      id: `course-example-d${lesson.day}-${index + 1}`, original: item.wrong, correct: item.right, why: item.why, topic: lesson.title,
    })),
  ]),
  ...masterDays.flatMap((day) => day.practice.map((item, itemIndex) => ({
    id: `master-d${day.day}-${itemIndex + 1}`,
    original: item.prompt,
    correct: stripNote(item.answer),
    why: item.answer,
    topic: day.title,
  }))),
]
  .filter((item) => item.original.length >= 8 && item.original.length <= 190 && item.correct.length >= 5 && item.correct.length <= 190)
  .filter((item) => canonical(item.original) !== canonical(item.correct))
  .filter((item, index, rows) => rows.findIndex((candidate) => canonical(candidate.original) === canonical(item.original)) === index)

const correctionQuestions: BankQuestion[] = correctionFacts.map((item, index): BankQuestion => {
  const { options, answer } = makeCorrectionOptions(item.correct, item.original, index % 4)
  return {
    id: `mpt-repo-english-correction-${item.id}`,
    q: `Which revision is grammatical and preserves the intended meaning of “${item.original}”?`,
    o: options,
    a: answer,
    s: item.topic,
    e: item.why,
    d: 'Advanced',
  }
}).filter((question) => question.a >= 0 && new Set(question.o.map(canonical)).size === 4)

type ReferenceField = { label: string; value: string }
type ReferenceFact = {
  id: string
  topic: string
  sourcePage: number
  anchor: ReferenceField
  target: ReferenceField
}

const topicItems = reference.topics.flatMap((topic) => (
  topic.items.map((item) => ({ ...item, topic: topic.title }))
))

function bestPairs(fields: ReferenceField[], siblings: typeof topicItems) {
  const pairs: [ReferenceField, ReferenceField][] = []
  fields.forEach((anchor) => fields.forEach((target) => {
    if (anchor !== target && anchor.value.length <= 150 && target.value.length <= 220) pairs.push([anchor, target])
  }))
  return pairs.filter(([anchor, target]) => (
    siblings.filter((item) => item.fields.some((field) => field.label === anchor.label)
      && item.fields.some((field) => field.label === target.label)).length >= 4
  )).filter((pair, index, rows) => rows.findIndex(([anchor, target]) => (
    anchor.label === pair[0].label && target.label === pair[1].label
  )) === index).slice(0, 3)
}

const referenceFacts: ReferenceFact[] = topicItems.flatMap((item) => {
  const siblings = topicItems.filter((candidate) => candidate.topic === item.topic)
  return bestPairs(item.fields, siblings).map((pair, pairIndex) => ({
    id: `${item.id}-${pairIndex + 1}`,
    topic: item.topic,
    sourcePage: item.sourcePage,
    anchor: pair[0],
    target: pair[1],
  }))
})

function referenceCompanions(fact: ReferenceFact) {
  const candidates = referenceFacts.filter((candidate) => candidate.topic === fact.topic
    && candidate.anchor.label === fact.anchor.label && candidate.target.label === fact.target.label && candidate.id !== fact.id)
  const start = Math.max(0, candidates.findIndex((candidate) => candidate.id > fact.id))
  const ordered = candidates.slice(start).concat(candidates.slice(0, start))
  const picked: ReferenceFact[] = []
  for (const candidate of ordered) {
    if (canonical(candidate.anchor.value) === canonical(fact.anchor.value)
      || canonical(candidate.target.value) === canonical(fact.target.value)) continue
    if (picked.some((row) => canonical(row.anchor.value) === canonical(candidate.anchor.value)
      || canonical(row.target.value) === canonical(candidate.target.value))) continue
    picked.push(candidate)
    if (picked.length === 3) break
  }
  return picked.length === 3 ? picked : []
}

const referenceQuestions: BankQuestion[] = []
referenceFacts.forEach((fact, index) => {
  const other = referenceCompanions(fact)
  if (!other.length) return
  const explanation = `Repository English reference, page ${fact.sourcePage}: ${fact.anchor.label} “${fact.anchor.value}” corresponds to ${fact.target.label} “${fact.target.value}”.`

  const forward = [fact.target.value, ...other.map((row) => row.target.value)]
  const forwardOptions = rotate(forward, index % 4)
  referenceQuestions.push({
    id: `mpt-repo-english-reference-${fact.id}-forward`,
    q: `In ${fact.topic}, which ${fact.target.label} corresponds to ${fact.anchor.label} “${fact.anchor.value}”?`,
    o: forwardOptions,
    a: forwardOptions.indexOf(fact.target.value),
    s: fact.topic,
    e: explanation,
    d: 'Advanced',
  })

  const reverse = [fact.anchor.value, ...other.map((row) => row.anchor.value)]
  const reverseOptions = rotate(reverse, (index + 1) % 4)
  referenceQuestions.push({
    id: `mpt-repo-english-reference-${fact.id}-reverse`,
    q: `Which ${fact.anchor.label} is associated with ${fact.target.label} “${fact.target.value}” in the English reference?`,
    o: reverseOptions,
    a: reverseOptions.indexOf(fact.anchor.value),
    s: fact.topic,
    e: explanation,
    d: 'Advanced',
  })

  const correctPair = `${fact.anchor.value} — ${fact.target.value}`
  const wrongPairs = other.map((row, pairIndex) => `${row.anchor.value} — ${other[(pairIndex + 1) % other.length].target.value}`)
  const pairOptions = rotate([correctPair, ...wrongPairs], (index + 2) % 4)
  referenceQuestions.push({
    id: `mpt-repo-english-reference-${fact.id}-pair`,
    q: `For ${fact.topic}, which ${fact.anchor.label}–${fact.target.label} association is accurate?`,
    o: pairOptions,
    a: pairOptions.indexOf(correctPair),
    s: fact.topic,
    e: explanation,
    d: 'Advanced',
  })
})

export const repositoryMptEnglishQuestions = [...correctionQuestions, ...referenceQuestions]
  .filter((question) => question.q.length <= 250 && question.o.every((option) => option.length <= 260))
  .filter((question, index, rows) => rows.findIndex((candidate) => canonical(candidate.q) === canonical(question.q)) === index)
