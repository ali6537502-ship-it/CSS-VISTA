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
  if (day <= 8) return { phase: 1, phaseTitle: 'Grammar Foundations' }
  if (day <= 16) return { phase: 2, phaseTitle: 'Building Better Sentences' }
  if (day <= 22) return { phase: 3, phaseTitle: 'Accuracy in Formal Writing' }
  if (day <= 27) return { phase: 4, phaseTitle: 'Style and Clarity' }
  return { phase: 5, phaseTitle: 'CSS Exam Practice' }
}

const friendlyDayMeta: Record<number, { title: string; goal: string }> = {
  1: { title: 'Parts of Speech', goal: 'Learn what the main word classes do and choose the correct form in a sentence.' },
  2: { title: 'Sentences and Clauses', goal: 'Build complete sentences and avoid fragments, run-ons and comma splices.' },
  3: { title: 'Punctuation and Capital Letters', goal: 'Use commas, sentence endings and capital letters clearly and consistently.' },
  4: { title: 'Subject–Verb Agreement', goal: 'Make the verb agree with the true subject, even when other words come between them.' },
  5: { title: 'Verb Tenses', goal: 'Choose the right tense and keep time relationships clear across a sentence or paragraph.' },
  6: { title: 'Conditionals and the Subjunctive', goal: 'Use if-clauses and formal hypothetical forms correctly.' },
  7: { title: 'Reported Speech', goal: 'Report statements, questions and commands without losing the original meaning.' },
  8: { title: 'Review: Days 1–7', goal: 'Revise the first seven lessons and identify the rules that still cause mistakes.' },
  9: { title: 'Active and Passive Voice', goal: 'Choose active or passive voice according to clarity, focus and responsibility.' },
  10: { title: 'Gerunds, Participles and Infinitives', goal: 'Use verb-based forms correctly and avoid dangling participles.' },
  11: { title: 'Modifiers', goal: 'Place descriptive words and phrases next to the words they actually describe.' },
  12: { title: 'Articles and Determiners', goal: 'Use a, an, the, zero article and quantity words accurately.' },
  13: { title: 'Prepositions and Phrasal Verbs', goal: 'Learn common preposition patterns and choose clear formal verbs where useful.' },
  14: { title: 'Colons, Semicolons and Dashes', goal: 'Use advanced punctuation to separate, connect and emphasise ideas correctly.' },
  15: { title: 'Parallel Structure', goal: 'Keep items in lists, comparisons and paired structures in the same grammatical form.' },
  16: { title: 'Review: Days 9–15', goal: 'Check your sentence-building skills before moving to the next stage.' },
  17: { title: 'Connectors and Cohesion', goal: 'Link ideas with the right connector and make sentences flow logically.' },
  18: { title: 'Common Grammar Errors', goal: 'Recognise the mistakes that appear most often in formal CSS writing.' },
  19: { title: 'Modal Verbs and Hypothetical Meaning', goal: 'Use must, should, may, might, could and related forms with the right degree of certainty.' },
  20: { title: 'Comparisons', goal: 'Write complete, logical comparatives and superlatives without double forms.' },
  21: { title: 'Commonly Confused Words', goal: 'Separate similar-looking words by meaning and grammatical use.' },
  22: { title: 'Review: Days 17–21', goal: 'Revise connectors, common errors, modals, comparison and confused words.' },
  23: { title: 'Cleft Sentences and Inversion', goal: 'Use a small number of emphasis structures correctly when they genuinely improve a sentence.' },
  24: { title: 'Formal and Informal Register', goal: 'Write formally without slang, unnecessary contractions or inflated vocabulary.' },
  25: { title: 'Concise Writing', goal: 'Remove repetition and wordiness without losing meaning or necessary qualification.' },
  26: { title: 'Paragraph Flow', goal: 'Make each sentence connect naturally with the one before it.' },
  27: { title: 'Review: Days 23–26', goal: 'Edit a passage for emphasis, register, concision and flow.' },
  28: { title: 'Sentence Variety and Emphasis', goal: 'Vary sentence length and openings without making the writing artificial.' },
  29: { title: 'Error-Spotting Practice', goal: 'Find mixed grammar errors quickly by checking sentences in a fixed order.' },
  30: { title: 'Final Grammar Test', goal: 'Use everything from the course in one timed final practice.' },
}

const rawDays = [
  ...masterGrammarP1A, ...masterGrammarP1B,
  ...masterGrammarP2A, ...masterGrammarP2B,
  ...masterGrammarP3A, ...masterGrammarP3B,
  ...masterGrammarP4A, ...masterGrammarP4B,
  ...masterGrammarP5A, ...masterGrammarP5B,
] as MasterGrammarDay[]

function reviewPractice(start: number, end: number) {
  return rawDays
    .filter((item) => item.day >= start && item.day <= end)
    .flatMap((item) => item.practice.slice(0, 2))
}

function polishPractice(day: number, item: MasterGrammarPractice): MasterGrammarPractice {
  if (day === 2 && item.prompt === 'What the economy needs are structural reforms.') {
    return {
      prompt: item.prompt,
      answer: 'What the economy needs is a set of structural reforms. (The clause “What the economy needs” functions as the singular subject.)',
    }
  }
  if (day === 12 && item.prompt === 'Government should invest in ___ education and ___ health.') {
    return {
      prompt: '___ government should invest in ___ education and ___ health.',
      answer: 'The government should invest in education and health. (Use the with the specific institution; general abstract nouns take no article here.)',
    }
  }
  if (day === 14 && item.prompt === 'He had every advantage, wealth, education, and connections, yet he failed.') {
    return {
      prompt: item.prompt,
      answer: 'He had every advantage—wealth, education, and connections—yet he failed. (Dashes set off the emphatic list.)',
    }
  }
  if (day === 18 && item.prompt === 'It was the most perfect example of misgovernance.') {
    return {
      prompt: item.prompt,
      answer: 'It was a perfect example of misgovernance. (In careful formal writing, perfect is usually left ungraded when used in its strict sense.)',
    }
  }
  if (day === 21 && item.prompt === 'The federation (comprises / is comprised of) four provinces.') {
    return {
      prompt: item.prompt,
      answer: 'The federation comprises four provinces. (For formal exam writing, comprises is the clearest choice here.)',
    }
  }
  if (day === 29 && item.prompt.includes('less opportunities')) {
    return {
      prompt: 'There are less opportunities for graduates this year.',
      answer: 'There are fewer opportunities for graduates this year. (Use fewer with countable plural nouns.)',
    }
  }
  if (day === 29 && item.prompt === 'The cabinet comprised of fifteen ministers.') {
    return {
      prompt: item.prompt,
      answer: 'The cabinet comprised fifteen ministers. (In careful formal writing, prefer comprise without of.)',
    }
  }
  if (day === 29 && item.prompt === 'This is the most unique proposal we have received.') {
    return {
      prompt: item.prompt,
      answer: 'This is a unique proposal. (In careful formal writing, avoid grading unique when you mean one of a kind.)',
    }
  }
  return item
}

function polishDay(day: MasterGrammarDay): MasterGrammarDay {
  const friendly = friendlyDayMeta[day.day]
  let practice = day.practice
  let practiceInstruction = day.practiceInstruction
  let models = day.models
  let tip = day.tip
  let trap = day.trap

  if (day.day === 16) {
    practice = reviewPractice(9, 15)
    practiceInstruction = 'Mixed review from Days 9–15. Try each sentence first, then check the answer and name the rule.'
  }
  if (day.day === 22) {
    practice = reviewPractice(17, 21)
    practiceInstruction = 'Mixed review from Days 17–21. Try each item first, then check the answer and name the rule.'
  }
  if (day.day === 18) {
    models = day.models.map((model) => model.sentence.includes('most unique')
      ? { ...model, note: 'In careful formal writing, prefer: It is a unique solution.' }
      : model)
    trap = 'In careful formal writing, words such as unique, perfect and complete are often best left ungraded when they are used in their strict sense. Prefer “a unique proposal” to “the most unique proposal” when you mean one of a kind.'
  }
  if (day.day === 21) {
    tip = 'For commonly confused words, memorise one reliable sentence for each pair. For formal exam writing, a safe pattern is: “The whole comprises the parts.”'
  }

  return {
    ...day,
    ...canonicalPhase(day.day),
    title: friendly?.title ?? day.title,
    goal: friendly?.goal ?? day.goal,
    models,
    tip,
    trap,
    practiceInstruction,
    practice: practice.map((item) => polishPractice(day.day, item)),
  }
}

const days = rawDays
  .map(polishDay)
  .sort((a, b) => a.day - b.day)

export const masterGrammarCourse: MasterGrammarCourse = {
  title: 'The 30-Day Grammar Course',
  subtitle: 'A practical daily course for CSS Essay, Précis, Comprehension & Correction',
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
