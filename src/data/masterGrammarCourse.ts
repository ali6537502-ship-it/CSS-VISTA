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
  return { phase: 5, phaseTitle: 'CSS Mastery & Application' }
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
      ['a lot of', 'numerous / substantial'], ['bad effect', 'adverse effect'],
      ['good for society', 'beneficial to society'], ['make a decision', 'decide'],
      ['because of the fact that', 'because'], ['in order to', 'to'],
      ['at this point in time', 'currently / now'], ['in the event that', 'if'],
      ['put off', 'postpone / defer'], ['bring about', 'cause / generate'],
      ['talk about', 'discuss / examine'], ['go up / go down', 'rise / decline'],
      ['a big problem', 'a serious / structural problem'], ['think about', 'consider'],
      ['enough', 'sufficient / adequate'], ['keep up', 'maintain / sustain'],
      ['cut down on', 'reduce / curtail'], ['point out', 'note / indicate'],
      ['set up', 'establish / institute'], ['use up', 'exhaust / deplete'],
    ],
    confusedWords: [
      ['affect', 'verb: to influence', 'effect', 'noun: a result'],
      ['principal', 'main; head of an institution', 'principle', 'a rule or belief'],
      ['advice', 'noun: guidance', 'advise', 'verb: to give guidance'],
      ['eminent', 'distinguished', 'imminent', 'about to happen'],
      ['stationary', 'not moving', 'stationery', 'writing materials'],
      ['complement', 'completes / goes with', 'compliment', 'praise'],
      ['economic', 'relating to the economy', 'economical', 'thrifty / efficient'],
      ['judicial', 'relating to courts', 'judicious', 'wise / prudent'],
      ['historic', 'momentous in history', 'historical', 'relating to the past'],
      ['cite', 'to quote / refer to', 'site', 'a location'],
      ['lose', 'verb: to misplace / not win', 'loose', 'adjective: not tight'],
      ['moral', 'ethical lesson', 'morale', 'spirit / confidence'],
      ['elicit', 'to draw out', 'illicit', 'unlawful'],
      ['censure', 'to criticise formally', 'censor', 'to suppress content'],
      ['ensure', 'to make certain', 'insure', 'to cover against loss'],
      ['adverse', 'unfavourable', 'averse', 'opposed / reluctant'],
    ],
    collocations: [
      'comply with', 'consist of', 'depend on / upon',
      'differ from', 'object to', 'responsible for',
      'capable of', 'immune to', 'relevant to',
      'compatible with', 'conducive to', 'detrimental to',
      'in accordance with', 'pursuant to', 'by virtue of',
      'in relation to', 'with respect to', 'on account of',
      'adhere to', 'refrain from', 'derive from',
      'consistent with', 'susceptible to', 'indicative of',
      'culminate in', 'grapple with', 'preside over',
      'a result of', 'an increase in', 'a solution to',
      'concerned about (worried)', 'concerned with (about)', 'superior to',
      'prefer X to Y', 'substitute X for Y', 'deprive of',
      'discuss (no preposition)', 'cope with', 'emphasise (no preposition)', 'married to',
    ],
    irregularVerbs: [
      ['begin', 'began', 'begun'], ['lie (recline)', 'lay', 'lain'],
      ['lay (put)', 'laid', 'laid'], ['rise', 'rose', 'risen'],
      ['raise', 'raised', 'raised'], ['arise', 'arose', 'arisen'],
      ['lead', 'led', 'led'], ['forbid', 'forbade', 'forbidden'],
      ['bear', 'bore', 'borne'], ['strive', 'strove', 'striven'],
      ['seek', 'sought', 'sought'], ['forsake', 'forsook', 'forsaken'],
      ['bind', 'bound', 'bound'], ['tread', 'trod', 'trodden'],
      ['flee', 'fled', 'fled'], ['prove', 'proved', 'proven / proved'],
    ],
    maintenance: [
      'Every Sunday: attempt twenty correction items under a timer.',
      'Twice a week: revise your Daily Error Log and rewrite any item that still feels uncertain.',
      'Weekly: write one formal paragraph that deliberately uses connectors and parallel structure.',
      'Every three days: review preposition collocations and confused words.',
      'Keep one running page for mistakes that survive past Day 30; that page is your personal exam checklist.',
    ],
  },
}
