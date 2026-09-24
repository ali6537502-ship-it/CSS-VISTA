import type { BankQuestion } from './mcq'

// Reviewed items from the existing recalled-paper bank. Ambiguous originals
// (several grammatical options, multiple plausible meanings, missing passages)
// are deliberately absent. The source options and keys are checked in tests.
const explanations: Record<number, string> = {
  384: '“Obtuse” means dull or not perceptive; “acute” means sharp or perceptive. The same opposition applies to angles.',
  385: '“Turpitude” means moral wrongdoing; “virtue” means moral goodness.',
  386: 'To “vituperate” is to abuse verbally; to praise is the opposite action.',
  387: '“Insouciant” means free from concern; “anxious” expresses concern.',
  388: '“Vitriolic” describes bitter, harsh speech; “amiable” describes a friendly manner.',
  389: '“Equanimity” is calmness under pressure; “agitation” is a disturbed state.',
  395: 'To “lionize” someone is to celebrate them; to “vilify” them is to denounce them.',
  397: '“Ephemeral” means short-lived; “permanent” means lasting.',
  399: '“Quixotic” describes impractical idealism; “practical” is the opposite quality.',
  401: '“The woman that we saw” identifies one particular woman, requiring the definite article.',
  403: 'Neither is the singular subject of the clause, so the verb is “has”; “boys” is inside a prepositional phrase.',
  404: 'An action beginning in the past and continuing now takes “has been living ... for five years”. “Since” would introduce a starting point.',
  407: '“Conduce to” means to contribute to a particular outcome; here the outcome is ultimate happiness.',
  408: 'Use “on” before a specific calendar date: on June 29.',
  409: 'A letter sent to an address takes the preposition “to”.',
  410: 'The fixed expression is “in lieu of”; a claim is for a specified amount.',
  413: 'The dependent although-clause joins an independent clause; this makes a complex sentence.',
  414: 'The fixed adjective phrase is “short of money”.',
  415: 'The idiomatic expression for the medium is “write in red ink”.',
  418: 'The adjective “insensible” takes “to” when referring to a lack of awareness of something.',
  419: '“As to his whereabouts” means “regarding his whereabouts”; the other phrases do not fit after “information”.',
  424: '“In East London” locates the apartment in a district; the geographical name does not take “the”.',
  425: '“Told him to give up smoking” has the required infinitive after told and the gerund after give up.',
  428: 'The idiomatic plural noun phrase is “peaceful surroundings”; “surroundings” takes a plural form.',
  430: '“French” is a proper adjective derived from the proper noun France.',
  431: '“Already” refers to a point in time; “seldom” in another option expresses frequency.',
  432: '“Forward” modifies “urges” and indicates direction, so it functions as an adverb.',
  433: '“Making mud castles” functions as what the children love doing; “making” heads a gerund phrase.',
  434: 'In a compound subject, “my friends and I” uses the subject pronoun “I” and conventional ordering.',
  435: '“Because I like pizza” has a subject and verb but depends on a main clause for a complete sentence.',
  436: 'The comparative of “scary” is “scarier”; adding “more” would form a double comparative.',
  437: 'A person with a chip on their shoulder carries a grievance or resentment.',
  440: 'To read someone the riot act is to give them a stern warning or reprimand.',
  441: 'Putting a spoke in someone’s wheel obstructs their plans.',
  445: '“Forty winks” is an idiom for a brief sleep or nap.',
  462: '“Arable” describes land suitable for growing crops.',
  464: 'A confession obtained through pressure or force is “coerced”.',
  465: '“Sedition” refers to conduct or speech inciting resistance against lawful authority.',
  466: 'To “covet” another person’s possessions is to desire them intensely.',
  493: 'The coded clues left the children “perplexed”, meaning confused.',
  497: '“Argus-eyed” means watchful or keenly observant.',
}

export function reviewedMptPastEnglishQuestions(bank: BankQuestion[]): BankQuestion[] {
  return bank.filter((question) => question.s === 'English' && Object.hasOwn(explanations, Number(question.id.split('-').at(-1))))
    .map((question) => {
      const id = Number(question.id.split('-').at(-1))
      if (question.o.length !== 4 || question.o.some((option) => /none of these|all of the above/i.test(option))) {
        throw new Error(`Past-paper English review ${id} no longer matches its source.`)
      }
      return { ...question, id: `mpt-reviewed-past-english-${id}`, e: explanations[id], d: 'Intermediate' }
    })
}
