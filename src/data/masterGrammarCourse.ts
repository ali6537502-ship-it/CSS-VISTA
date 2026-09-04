import { masterGrammarP1A } from './master-grammar/p1a'
import { masterGrammarP1B } from './master-grammar/p1b'
import { masterGrammarP2A } from './master-grammar/p2a'
import { masterGrammarP2B } from './master-grammar/p2b'
import { masterGrammarP3A } from './master-grammar/p3a'
import { masterGrammarP3B } from './master-grammar/p3b'
import { masterGrammarP4A } from './master-grammar/p4a'
import { masterGrammarP4B } from './master-grammar/p4b'
import { masterGrammarP5A } from './master-grammar/p5a'
import { masterGrammarP5B } from './master-grammar/p5b'

export interface MasterGrammarConcept { title: string; explanation: string; example: string }
export interface MasterGrammarModel { status: string; sentence: string; note: string }
export interface MasterGrammarPractice { prompt: string; answer: string }
export interface MasterGrammarDay {
  day: number
  phase: number
  phaseTitle: string
  title: string
  goal: string
  why: string
  coreNotes: string[]
  models: MasterGrammarModel[]
  expanded: MasterGrammarConcept[]
  tip: string
  trap: string
  practiceInstruction: string
  practice: MasterGrammarPractice[]
  deliverable: string
  selfCheck: string[]
}
export interface MasterGrammarCourse {
  title: string
  subtitle: string
  author: string
  source: string
  days: MasterGrammarDay[]
  resources: {
    formalReplacements: string[][]
    confusedWords: string[][]
    collocations: string[]
    irregularVerbs: string[][]
    maintenance: string[]
  }
}

function canonicalPhase(day: number) {
  if (day <= 8) return { phase: 1, phaseTitle: 'Foundations of Accuracy' }
  if (day <= 16) return { phase: 2, phaseTitle: 'Structure & Cohesion' }
  if (day <= 22) return { phase: 3, phaseTitle: 'Nuance & Formality' }
  if (day <= 27) return { phase: 4, phaseTitle: 'Precision & Rhetoric' }
  return { phase: 5, phaseTitle: 'Mastery & Application' }
}

const rawDays = [
  ...masterGrammarP1A, ...masterGrammarP1B,
  ...masterGrammarP2A, ...masterGrammarP2B,
  ...masterGrammarP3A, ...masterGrammarP3B,
  ...masterGrammarP4A, ...masterGrammarP4B,
  ...masterGrammarP5A, ...masterGrammarP5B,
] as MasterGrammarDay[]

const days = rawDays
  .map((day) => ({ ...day, ...canonicalPhase(day.day) }))
  .sort((a, b) => a.day - b.day)

export const masterGrammarCourse: MasterGrammarCourse = {
  title: 'The 30-Day Master Grammar Course',
  subtitle: 'Expanded interactive course for Essay, Précis, Comprehension & Correction',
  author: 'Ali Hassan Sargana',
  source: 'The 30-Day Grammar Course',
  days,
  resources: {
    formalReplacements: [
      ['find out', 'ascertain / determine'], ['look into', 'investigate / examine'],
      ['deal with', 'address / manage'], ['get rid of', 'eliminate / remove'],
      ['a lot of', 'numerous / substantial'], ['make a decision', 'decide'],
      ['because of the fact that', 'because'], ['in order to', 'to'],
      ['put off', 'postpone / defer'], ['bring about', 'cause / generate'],
      ['go up / go down', 'rise / decline'], ['cut down on', 'reduce / curtail'],
    ],
    confusedWords: [
      ['affect', 'usually a verb: influence', 'effect', 'usually a noun: result'],
      ['principal', 'main; head of an institution', 'principle', 'a rule or belief'],
      ['advice', 'noun: guidance', 'advise', 'verb: give guidance'],
      ['eminent', 'distinguished', 'imminent', 'about to happen'],
      ['stationary', 'not moving', 'stationery', 'writing materials'],
      ['complement', 'completes or goes with', 'compliment', 'praise'],
      ['economic', 'relating to the economy', 'economical', 'thrifty / efficient'],
      ['cite', 'quote or refer to', 'site', 'a location'],
      ['moral', 'ethical lesson', 'morale', 'spirit / confidence'],
      ['ensure', 'make certain', 'insure', 'cover against loss'],
    ],
    collocations: [
      'comply with', 'consist of', 'depend on / upon', 'differ from', 'object to',
      'responsible for', 'capable of', 'immune to', 'relevant to', 'compatible with',
      'conducive to', 'detrimental to', 'adhere to', 'refrain from', 'derive from',
      'grapple with', 'preside over', 'a solution to', 'prefer X to Y', 'substitute X for Y',
      'deprive of', 'married to', 'cope with',
    ],
    irregularVerbs: [
      ['begin', 'began', 'begun'], ['lie (recline)', 'lay', 'lain'], ['lay (put)', 'laid', 'laid'],
      ['rise', 'rose', 'risen'], ['arise', 'arose', 'arisen'], ['lead', 'led', 'led'],
      ['forbid', 'forbade', 'forbidden'], ['bear', 'bore', 'borne'], ['strive', 'strove', 'striven'],
      ['seek', 'sought', 'sought'], ['flee', 'fled', 'fled'],
    ],
    maintenance: [
      'Every week: attempt a timed mixed correction set.',
      'Twice a week: revise the Daily Error Log and rewrite recurring errors.',
      'Weekly: write one formal paragraph using deliberate cohesion and parallel structure.',
      'Every three days: review collocations and confused-word pairs.',
      'Keep a running list of errors that survive beyond Day 30; that list becomes the final revision checklist.',
    ],
  },
}
