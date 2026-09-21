/**
 * Data model for the 30-day grammar course.
 *
 * Every drill item on this course is written for the lesson it sits under. The
 * course deliberately does not pull questions from the general MCQ bank: a
 * student studying subject–verb agreement must practise subject–verb
 * agreement, not whatever a shared bank happens to return.
 */

/** A short definition shown before the lesson so no term arrives unexplained. */
export interface GrammarTerm {
  term: string
  meaning: string
}

/** A small reference table inside a rule block (forms, endings, signal words). */
export interface GrammarTable {
  caption: string
  columns: string[]
  rows: string[][]
}

/** One teaching block: the rule in plain words, then how to apply it. */
export interface GrammarRule {
  heading: string
  /** Plain-language explanation. Written for a student starting from zero. */
  plain: string
  /** Short, checkable points a student can apply while writing. */
  points: string[]
  /** Model sentences that show the rule working, each with a reason. */
  models: { sentence: string; note: string }[]
  table?: GrammarTable
}

/** A wrong sentence, its correction, and the reason the correction is needed. */
export interface GrammarExample {
  wrong: string
  right: string
  why: string
}

export type GrammarQuestionKind =
  /** Choose the correct sentence or the correct usage. */
  | 'choice'
  /** Choose the word or phrase that fills the gap. */
  | 'gap'
  /** Identify which underlined part of the sentence carries the error. */
  | 'spot'

/** An auto-marked question. `answer` is the index of the correct option. */
export interface GrammarQuestion {
  id: string
  kind: GrammarQuestionKind
  prompt: string
  options: string[]
  answer: number
  why: string
}

/** A written task the student attempts first and then checks against a model. */
export interface GrammarCorrection {
  id: string
  task: string
  model: string
  note: string
}

export interface GrammarLesson {
  day: number
  phase: string
  title: string
  /** One sentence: what the student will be able to do after this lesson. */
  goal: string
  /** Why this matters for the paper, in the student's own terms. */
  why: string
  minutes: number
  terms: GrammarTerm[]
  rules: GrammarRule[]
  examples: GrammarExample[]
  /** The specific mistakes that cost marks on this topic. */
  pitfalls: string[]
  /** Four easy items that check the rule was understood. */
  warmUp: GrammarQuestion[]
  /** Ten mixed items at examination difficulty. */
  drill: GrammarQuestion[]
  /** Five write-then-check sentence corrections. */
  corrections: GrammarCorrection[]
  /** A short piece of writing that forces the rule into the student's own prose. */
  transfer: string
  /** What to tick before moving on. */
  checklist: string[]
  /** One or two sentences worth remembering forever. */
  recap: string
}

export const GRAMMAR_PHASES = [
  {
    name: 'Sentence foundations',
    days: [1, 6],
    summary: 'Build a correct sentence before worrying about style. Subject, verb, clause, boundary, punctuation.',
  },
  {
    name: 'Verb control',
    days: [7, 12],
    summary: 'Time, completion, possibility and voice. Most marks lost in composition papers are verb marks.',
  },
  {
    name: 'Precision within sentences',
    days: [13, 18],
    summary: 'Articles, pronouns, modifiers, prepositions and non-finite forms — the small words examiners test hardest.',
  },
  {
    name: 'Academic writing control',
    days: [19, 24],
    summary: 'Connectors, parallelism, punctuation for meaning, concision, register and flow.',
  },
  {
    name: 'Examination performance',
    days: [25, 30],
    summary: 'Confused words, minimum correction, précis grammar, paragraph editing, timed work and a maintenance plan.',
  },
] as const

export const grammarPhaseColors: Record<string, string> = {
  'Sentence foundations': 'bg-emerald-100 text-emerald-900',
  'Verb control': 'bg-sky-100 text-sky-900',
  'Precision within sentences': 'bg-amber-100 text-amber-900',
  'Academic writing control': 'bg-violet-100 text-violet-900',
  'Examination performance': 'bg-rose-100 text-rose-900',
}
