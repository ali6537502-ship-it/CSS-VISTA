import type { BankQuestion } from './mcq'

export type MptEnglishFamily = 'grammar' | 'vocabulary' | 'usage' | 'comprehension'
export type MptAbilityFamily = 'quantitative' | 'reasoning'

const englishVocabulary = /\b(?:synonym|antonym|vocabulary|one[- ]word|word meaning|closest in meaning|nearest in meaning|most nearly (?:means|similar|opposite)|opposite of|meaning of|analog(?:y|ies))\b/i
const englishGrammarTopic = /(?:article|preposition|tense|conjunction|punctuation|subject.?verb|agreement|pronoun|modifier|sentence|clause|phrase|narration|voice|noun|number and possession|adjective|adverb|gerund|infinitive|participle|parallelism|conditional|determiner|relative|question tag|reported speech|direct and indirect)/i
const shortGrammarOption = /^(?:a|an|the|in|on|at|for|to|of|with|by|from|into|onto|upon|over|under|between|among|through|across|since|during|until|before|after|than|as|if|unless|although|because|while|and|but|or|nor|yet|so|is|are|was|were|has|have|had|do|does|did|can|could|may|might|must|shall|should|will|would|who|whom|whose|which|that|this|these|those)$/i

export function mptEnglishFamily(question: BankQuestion): MptEnglishFamily {
  const topic = question.s ?? ''
  const prompt = question.q ?? ''
  if (/comprehension/i.test(topic)) return 'comprehension'
  if (englishVocabulary.test(`${topic} ${prompt}`)) return 'vocabulary'
  if (question.id.startsWith('mpt-course-english-') || englishGrammarTopic.test(topic)) return 'grammar'
  if (/_{2,}|\b(?:grammatically correct|grammatically incorrect|semantic error|correct sentence|incorrect sentence|fill in the blank|complete the sentence)\b/i.test(prompt)) {
    return 'grammar'
  }
  if (question.o.filter((option) => shortGrammarOption.test(option.trim())).length >= 3) return 'grammar'
  return 'usage'
}

const reasoningTopic = /(?:reasoning|mental ability|analytical|logical|syllog|series|analogy|classification|odd one|direction|relation|ranking|ordering|seating|calendar|clock|coding|decision|critical|verbal ability|mechanical ability|psychometric)/i

export function mptAbilityFamily(question: BankQuestion): MptAbilityFamily {
  const text = `${question.s ?? ''} ${question.q ?? ''}`
  return reasoningTopic.test(text) ? 'reasoning' : 'quantitative'
}

export const mptEditorialMinimums = {
  englishNonComprehension: {
    grammar: 14,
    vocabulary: 8,
    usage: 8,
  } satisfies Partial<Record<MptEnglishFamily, number>>,
  ability: {
    quantitative: 34,
    reasoning: 18,
  } satisfies Partial<Record<MptAbilityFamily, number>>,
}

export const mptEditorialMaximums = {
  englishNonComprehension: {
    vocabulary: 16,
  } satisfies Partial<Record<MptEnglishFamily, number>>,
  ability: {
    quantitative: 42,
    reasoning: 26,
  } satisfies Partial<Record<MptAbilityFamily, number>>,
}

// These are editorial safeguards for CSS Vista practice papers. They are not
// represented as FPSC-prescribed sub-allocations.
export const mptPracticeComposition = {
  englishComprehension: 2,
  gkEverydayScience: 20,
  gkCurrentAffairs: 2,
  gkPakistanAffairs: 28,
} as const
