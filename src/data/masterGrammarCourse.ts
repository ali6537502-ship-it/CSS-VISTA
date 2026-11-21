import { day01 } from './master-grammar/day01'
import { day02 } from './master-grammar/day02'
import { day03 } from './master-grammar/day03'
import { day04 } from './master-grammar/day04'
import { day05 } from './master-grammar/day05'
import { day06 } from './master-grammar/day06'
import { day07 } from './master-grammar/day07'
import { day08 } from './master-grammar/day08'
import { day09 } from './master-grammar/day09'
import { day10 } from './master-grammar/day10'
import { day11 } from './master-grammar/day11'
import { day12 } from './master-grammar/day12'
import { day13 } from './master-grammar/day13'
import { day14 } from './master-grammar/day14'
import { day15 } from './master-grammar/day15'
import { day16 } from './master-grammar/day16'
import { day17 } from './master-grammar/day17'
import { day18 } from './master-grammar/day18'
import { day19 } from './master-grammar/day19'
import { day20 } from './master-grammar/day20'
import { day21 } from './master-grammar/day21'
import { day22 } from './master-grammar/day22'
import { day23 } from './master-grammar/day23'
import { day24 } from './master-grammar/day24'
import { day25 } from './master-grammar/day25'
import { day26 } from './master-grammar/day26'
import { day27 } from './master-grammar/day27'
import { day28 } from './master-grammar/day28'
import { day29 } from './master-grammar/day29'
import { day30 } from './master-grammar/day30'
import type { GrammarDay } from './master-grammar/types'

export type {
  GrammarDay,
  CoreRule,
  CommonMistake,
  PracticeItem,
  QuizQuestion,
  ComparisonTable,
  TenseBreakdown,
  PracticeStage,
} from './master-grammar/types'

export interface MasterGrammarCourse {
  title: string
  subtitle: string
  author: string
  days: GrammarDay[]
  resources: {
    formalReplacements: string[][]
    confusedWords: string[][]
    collocations: string[]
    irregularVerbs: string[][]
    maintenance: string[]
  }
}

const days: GrammarDay[] = [
  day01, day02, day03, day04, day05, day06, day07, day08, day09, day10,
  day11, day12, day13, day14, day15, day16, day17, day18, day19, day20,
  day21, day22, day23, day24, day25, day26, day27, day28, day29, day30,
].sort((a, b) => a.day - b.day)

export const masterGrammarCourse: MasterGrammarCourse = {
  title: 'The 30-Day English Grammar Course',
  subtitle: 'A clear, step-by-step course for learners who want to build real grammar accuracy for formal and competitive-exam English.',
  author: 'CSS Vista',
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
      'Every Sunday: attempt fifteen to twenty correction items under a timer.',
      'Twice a week: revise your personal error log and rewrite any item that still feels uncertain.',
      'Weekly: write one formal paragraph that deliberately uses connectors and parallel structure.',
      'Every three days: review preposition collocations and commonly confused words.',
      'Keep one running page for mistakes that survive past Day 30; that page is your personal revision checklist.',
    ],
  },
}
