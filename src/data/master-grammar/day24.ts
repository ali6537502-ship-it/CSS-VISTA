import type { GrammarDay } from './types'
import { stageOf } from './types'

export const day24: GrammarDay = {
  day: 24,
  ...stageOf(24),
  title: 'Sentence Correction',
  whatYouWillLearn:
    'You will learn a simple, repeatable checking order for finding the one error in a sentence-correction question, and practise it on sentences that mix different kinds of mistakes.',
  simpleExplanation: [
    'You already know the separate rules — agreement, tense, articles, prepositions, and so on. A sentence-correction question mixes all of these together and usually hides exactly one error in an otherwise normal-looking sentence.',
    'The skill you need now is not new grammar. It is a fast, reliable checking order, so that you stop guessing and start scanning a sentence the same way every time.',
  ],
  rules: [
    {
      rule: 'Step 1: Check the subject and its verb.',
      explanation: 'Find the true subject — not just the nearest noun — and confirm the verb agrees with it.',
      correct: 'The list of items on the shelf is complete.',
      wrong: 'The list of items on the shelf are complete.',
      correction: 'The subject is “list” (singular), not “items”, so the verb must be “is”.',
    },
    {
      rule: 'Step 2: Check the tense against any time word.',
      explanation: 'A specific finished time word (yesterday, last year, in 2019) never pairs with the Present Perfect.',
      correct: 'She finished her homework yesterday.',
      wrong: 'She has finished her homework yesterday.',
      correction: '“Yesterday” needs the Past Simple.',
    },
    {
      rule: 'Step 3: Check articles and countable / uncountable nouns.',
      explanation: 'Confirm a countable singular noun has an article, and an uncountable noun does not take “a” or “an”.',
      correct: 'He gave me some useful advice.',
      wrong: 'He gave me an useful advice.',
      correction: '“Advice” is uncountable, so it takes no article here; “an” is also wrong before the consonant sound of “useful”.',
    },
    {
      rule: 'Step 4: Check fixed prepositions after certain verbs, adjectives, and nouns.',
      explanation: 'Many English words always pair with one particular preposition. Learn the pairing, not just the meaning.',
      correct: 'The team is responsible for the delay.',
      wrong: 'The team is responsible of the delay.',
      correction: 'The fixed pattern is “responsible for”, not “responsible of”.',
    },
    {
      rule: 'Step 5: Check that every pronoun clearly agrees with, and refers to, one noun.',
      explanation: 'A pronoun must match its noun in number, and it must be obvious which noun it replaces.',
      correct: 'Each of the students has submitted her form.',
      wrong: 'Each of the students have submitted their form.',
      correction: '“Each” is singular, so it takes “has”, and the pronoun should agree with it.',
    },
    {
      rule: 'Step 6: Check those items in a list or comparison are in the same grammatical form.',
      explanation: 'Every item joined by and, or, or than should share the same structure.',
      correct: 'The plan is practical, affordable, and easy to implement.',
      wrong: 'The plan is practical, affordable, and it is easy to implement.',
      correction: 'The third item should match the adjective form of the first two: “easy to implement”, not a separate clause.',
    },
  ],
  comparison: {
    title: 'Despite vs In spite of',
    columnA: 'despite + noun (no "of")',
    columnB: 'in spite of + noun',
    rows: [
      ['Despite the rain, they played.', 'In spite of the rain, they played.'],
      ['Despite his wealth, he is unhappy.', 'In spite of his wealth, he is unhappy.'],
    ],
  },
  easyExamples: [
    'He works hard. (correct)',
    'He work hard. (wrong — needs “works”)',
    'She has two books. (correct)',
    'She has two book. (wrong — needs “books”)',
  ],
  practicalExamples: [
    'The company has responsibility for the delay in delivery.',
    'The proposal, though ambitious, is affordable and realistic.',
    'Each department has submitted its budget for review.',
  ],
  examExamples: [
    'The committee comprises five members from each province.',
    'Despite the government’s efforts, poverty remains widespread in several regions.',
  ],
  commonMistakes: [
    {
      wrong: 'The team is responsible of the outcome.',
      right: 'The team is responsible for the outcome.',
      why: 'The fixed pattern is “responsible for”, not “responsible of”.',
    },
    {
      wrong: 'He is married with a doctor.',
      right: 'He is married to a doctor.',
      why: 'The fixed pattern is “married to”.',
    },
    {
      wrong: 'The situation is comprised of many factors.',
      right: 'The situation comprises many factors.',
      why: 'In careful formal writing, “comprise” already means “to consist of” and is not usually followed by “of”.',
    },
    {
      wrong: 'Despite of his effort, he failed.',
      right: 'Despite his effort, he failed.',
      why: '“Despite” is followed directly by a noun; “of” is only used in “in spite of”.',
    },
    {
      wrong: 'Neither of the answers are correct.',
      right: 'Neither of the answers is correct.',
      why: '“Neither” is singular, so it takes a singular verb.',
    },
  ],
  memoryTip:
    'Check every sentence in the same fixed order: (1) subject and verb, (2) tense and time words, (3) articles, (4) fixed prepositions, (5) pronoun agreement and reference, (6) parallel structure. Most correction questions break at just one of these six checkpoints.',
  practice: [
    {
      stage: 'Recognise it',
      prompt: 'What kind of error is in “Each of the workers have received their wages”?',
      answer: 'Subject-verb agreement',
      reason: '“Each” is singular, so the verb should be “has”, not “have”.',
    },
    {
      stage: 'Recognise it',
      prompt: 'What kind of error is in “I have visited that city last year”?',
      answer: 'Tense (Present Perfect used instead of Past Simple)',
      reason: '“Last year” is a stated finished time, so the Past Simple is needed.',
    },
    {
      stage: 'Recognise it',
      prompt: 'What kind of error is in “He is interested about the new proposal”?',
      answer: 'Fixed preposition',
      reason: 'The correct fixed pattern is “interested in”, not “interested about”.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'He is one of the best (player / players) in the league.',
      answer: 'players',
      reason: 'The pattern “one of the + plural noun” always needs a plural noun.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'Neither of the two candidates (was / were) selected for the post.',
      answer: 'was',
      reason: '“Neither” is singular.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'The number of unemployed youth (is / are) rising every year.',
      answer: 'is',
      reason: '“The number of” is treated as singular; contrast this with “a number of”, which takes a plural verb.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'The list of items on the shelf are complete.',
      answer: 'The list of items on the shelf is complete.',
      reason: 'The true subject is “list”, which is singular, not “items”.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'She has finished her homework yesterday.',
      answer: 'She finished her homework yesterday.',
      reason: '“Yesterday” is a stated finished time, so it needs the Past Simple.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'I clean my room everyday.',
      answer: 'I clean my room every day.',
      reason: '“Everyday” (one word) is an adjective meaning ordinary; the two-word phrase “every day” is the adverb needed here.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'The team is responsible of the delay.',
      answer: 'The team is responsible for the delay.',
      reason: 'The fixed pattern is “responsible for”, not “responsible of”.',
    },
    {
      stage: 'Exam-style',
      prompt: 'Despite of the heavy rain, the match continued.',
      answer: 'Despite the heavy rain, the match continued.',
      reason: '“Despite” is a preposition on its own and is never followed by “of”.',
    },
    {
      stage: 'Exam-style',
      prompt: 'The committee is comprised of five members from each province.',
      answer: 'The committee comprises five members from each province.',
      reason: 'In careful formal writing, “comprise” is not usually followed by “of”.',
    },
    {
      stage: 'Exam-style',
      prompt: 'The report suggested that the policy is revised immediately.',
      answer: 'The report suggested that the policy be revised immediately.',
      reason: 'In formal writing, verbs such as suggest, recommend, and insist are usually followed by the subjunctive base form.',
    },
    {
      stage: 'Exam-style',
      prompt: 'Economic growth have slowed considerably over the past year.',
      answer: 'Economic growth has slowed considerably over the past year.',
      reason: '“Growth” is an uncountable singular noun, so it takes “has”.',
    },
  ],
  quiz: [
    {
      question: 'Which sentence is correct?',
      options: ['The list of items on the shelf are complete.', 'The list of items on the shelf is complete.', 'The list of item on the shelf is complete.', 'The list of items on the shelf were complete.'],
      correct: 1,
      explanation: 'The true subject is “list”, which is singular.',
    },
    {
      question: 'Which sentence is correct?',
      options: ['She has finished her homework yesterday.', 'She finished her homework yesterday.', 'She had finished her homework yesterday morning.', 'She finish her homework yesterday.'],
      correct: 1,
      explanation: '“Yesterday” requires the Past Simple, not the Present Perfect.',
    },
    {
      question: 'Which sentence is correct?',
      options: ['He is one of the best player in the league.', 'He is one of the best players in the league.', 'He is one of best players in the league.', 'He is one of the best players at the league.'],
      correct: 1,
      explanation: '“One of the + plural noun” always needs a plural noun.',
    },
    {
      question: 'Which sentence is correct?',
      options: ['Neither of the two candidates were selected.', 'Neither of the two candidates was selected.', 'Neither of the two candidate was selected.', 'Neither of the two candidates has selected.'],
      correct: 1,
      explanation: '“Neither” is singular, so it takes “was”.',
    },
    {
      question: 'Which sentence is correct?',
      options: ['The number of unemployed youth are rising.', 'The number of unemployed youth is rising.', 'A number of unemployed youth is rising.', 'The number of unemployed youth rising.'],
      correct: 1,
      explanation: '“The number of” takes a singular verb.',
    },
    {
      question: 'Which sentence is correct?',
      options: ['I clean my room everyday.', 'I clean my room every day.', 'I clean my room in everyday.', 'I clean my room on every day.'],
      correct: 1,
      explanation: '“Everyday” is an adjective; the adverbial phrase needed here is the two-word “every day”.',
    },
    {
      question: 'Which sentence is correct?',
      options: ['The team is responsible of the delay.', 'The team is responsible for the delay.', 'The team is responsible about the delay.', 'The team is responsible on the delay.'],
      correct: 1,
      explanation: 'The fixed pattern is “responsible for”.',
    },
    {
      question: 'Which sentence is correct?',
      options: ['Despite of the heavy rain, the match continued.', 'Despite the heavy rain, the match continued.', 'Despite for the heavy rain, the match continued.', 'Despite on the heavy rain, the match continued.'],
      correct: 1,
      explanation: '“Despite” is never followed by “of”.',
    },
    {
      question: 'Which sentence is correct in careful formal writing?',
      options: ['The committee is comprised of five members.', 'The committee comprises five members.', 'The committee comprise of five members.', 'The committee is comprises five members.'],
      correct: 1,
      explanation: '“Comprise” is not usually followed by “of” in careful formal usage.',
    },
    {
      question: 'Which sentence best fits formal exam writing?',
      options: ['The report suggested that the policy is revised immediately.', 'The report suggested that the policy be revised immediately.', 'The report suggested that the policy was revised immediately.', 'The report suggested that the policy revising immediately.'],
      correct: 1,
      explanation: 'Formal writing usually follows verbs like “suggest” with the subjunctive base form.',
    },
    {
      question: 'Which sentence is correct?',
      options: ['Economic growth have slowed considerably.', 'Economic growth has slowed considerably.', 'Economic growth are slowing considerably.', 'Economic growth were slowed considerably.'],
      correct: 1,
      explanation: '“Growth” is an uncountable singular noun.',
    },
    {
      question: 'Which checking step catches the error in “He gave me an useful advice”?',
      options: ['Subject-verb agreement', 'Articles and countable/uncountable nouns', 'Fixed prepositions', 'Parallel structure'],
      correct: 1,
      explanation: '“Advice” is uncountable and takes no article; “an” is also wrong before the consonant sound in “useful”.',
    },
    {
      question: 'Which sentence keeps a parallel list correctly?',
      options: ['The plan is practical, affordable, and it is easy to implement.', 'The plan is practical, affordable, and easy to implement.', 'The plan is practical, afford, and easy to implement.', 'The plan is practical, affordable, and implementing easily.'],
      correct: 1,
      explanation: 'All three items in the list should share the same adjective form.',
    },
  ],
  quickRevision: [
    'Check sentences in a fixed order: subject-verb agreement, then tense, then articles, then fixed prepositions, then pronouns, then parallel structure.',
    'A sentence-correction item usually hides exactly one error — find the true subject before deciding if the verb is wrong.',
    'A specific finished time word never pairs with the Present Perfect.',
    'Learn fixed preposition pairings as whole phrases: responsible for, married to, interested in.',
    'In careful formal writing, prefer “comprise” without “of”, and “despite” without “of”.',
  ],
}
