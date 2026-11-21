import type { GrammarDay } from './types'
import { stageOf } from './types'

export const day12: GrammarDay = {
  day: 12,
  ...stageOf(12),
  title: 'Prepositions',
  whatYouWillLearn:
    'You will learn how to use prepositions of place, time, and movement correctly, and learn a set of fixed preposition pairings that simply need to be memorised.',
  simpleExplanation: [
    'A preposition is a small word that shows how a noun relates to something else in the sentence — usually a place, a time, a direction, or a manner. Words like in, on, at, into, and through are all prepositions.',
    'Some preposition rules follow a clear pattern, such as the difference between in, on, and at for place and time. But many prepositions simply attach themselves to certain words — like “interested in” or “married to” — and there is no logical reason for the choice. Those pairings just need to be learned as whole phrases.',
  ],
  rules: [
    {
      rule: 'Use “in” for enclosed or larger spaces: countries, cities, rooms.',
      explanation: '“In” suggests something is inside an area, however large or small.',
      correct: 'She lives in Lahore, in a small flat near the market.',
    },
    {
      rule: 'Use “on” for surfaces and lines, including streets.',
      explanation: '“On” suggests contact with a flat surface or a line, such as a road.',
      correct: 'The keys are on the table. His office is on Mall Road.',
    },
    {
      rule: 'Use “at” for a specific point, such as an address, a building, or an event.',
      explanation: '“At” treats the location as one exact point rather than an area.',
      correct: 'We arrived at the airport at nine o’clock. She works at house number 12.',
    },
    {
      rule: 'For time, use “in” for months, years, and seasons; “on” for days and dates; “at” for clock times and a few fixed expressions.',
      explanation: 'These follow the same big-to-small pattern as prepositions of place.',
      correct: 'The exam is in June. The result will be announced on Monday, at ten o’clock at night.',
    },
    {
      rule: 'Use prepositions of movement to show direction: “into” (entering an enclosed space), “onto” (moving to a surface), “through” (moving from one side to the other, often inside something), “across” (moving from one side to the other, often over an open area).',
      explanation: 'These describe motion, not just position.',
      correct: 'The cat jumped onto the roof and then ran across the garden.',
    },
    {
      rule: 'Many verbs, adjectives, and nouns always pair with one particular preposition; these fixed combinations must be learned as whole phrases.',
      explanation: 'Common examples include depend on, interested in, married to, responsible for, capable of, good at, afraid of, similar to, and different from.',
      correct: 'She is interested in painting and good at drawing portraits.',
      wrong: 'She is interested on painting.',
      correction: 'The fixed pairing is “interested in”, not “interested on”.',
    },
    {
      rule: 'A preposition is normally followed by a noun, a pronoun, or the -ing form of a verb, never the base form.',
      explanation: 'If a verb comes right after a preposition, it must take the -ing form.',
      correct: 'She is good at solving problems.',
      wrong: 'She is good at solve problems.',
      correction: 'After the preposition “at”, the verb must take the -ing form: “solving”.',
    },
    {
      rule: 'Do not confuse “in time” (early enough for something) with “on time” (at the exact expected moment).',
      explanation: 'These two phrases look similar but mean different things.',
      correct: 'We reached the station in time to catch the train. The train left on time.',
    },
  ],
  easyExamples: [
    'The keys are in my bag.',
    'We will meet at the bus stop.',
    'The picture is on the wall.',
    'He walked into the classroom.',
  ],
  practicalExamples: [
    'The interview is scheduled for ten o’clock on Monday.',
    'She has been interested in photography since childhood.',
    'The company is responsible for the safety of its workers.',
    'He is capable of handling difficult clients.',
  ],
  examExamples: [
    'The new policy is similar to one already adopted by a neighbouring country.',
    'The outcome largely depends on the decisions taken in the next few weeks.',
    'The scheme aims to provide relief to families in remote areas of the province.',
  ],
  commonMistakes: [
    {
      wrong: 'This result is different than what we expected.',
      right: 'This result is different from what we expected.',
      why: 'The standard formal pattern is “different from”, though “different than” is common in informal speech.',
    },
    {
      wrong: 'He depends of his parents financially.',
      right: 'He depends on his parents financially.',
      why: 'The fixed pattern is “depend on”.',
    },
    {
      wrong: 'She is good in mathematics.',
      right: 'She is good at mathematics.',
      why: 'The fixed pattern is “good at”.',
    },
    {
      wrong: 'He is afraid from dogs.',
      right: 'He is afraid of dogs.',
      why: 'The fixed pattern is “afraid of”.',
    },
    {
      wrong: 'I was born at 1998.',
      right: 'I was born in 1998.',
      why: 'Years take “in”, not “at”.',
    },
    {
      wrong: 'She walked in the room and sat down.',
      right: 'She walked into the room and sat down.',
      why: 'Movement toward the inside of an enclosed space needs “into”, not “in”.',
    },
  ],
  memoryTip:
    'For place, think big to small: IN a country or city (a large area), ON a street (a line), AT a precise address or point. For fixed pairs like “interested in” or “responsible for”, treat the preposition as part of the phrase — it rarely follows logic, so it must simply be learned as one unit.',
  practice: [
    {
      stage: 'Recognise it',
      prompt: 'In “The meeting is at 5 o’clock,” what kind of preposition is “at”?',
      answer: 'A preposition of time (clock time)',
      reason: '“At” is used with exact clock times.',
    },
    {
      stage: 'Recognise it',
      prompt: 'In “The cat jumped onto the table,” what kind of preposition is “onto”?',
      answer: 'A preposition of movement',
      reason: 'It shows direction toward a surface.',
    },
    {
      stage: 'Recognise it',
      prompt: 'In “She is interested in music,” which preposition fixes to “interested”?',
      answer: '“in”',
      reason: '“Interested” always pairs with “in”.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'The conference will be held ____ March.',
      answer: 'in',
      reason: 'Months take “in”.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'We arrived ____ the airport an hour early.',
      answer: 'at',
      reason: 'An airport is treated as a specific point.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'He is very good ____ chess.',
      answer: 'at',
      reason: 'The fixed pairing is “good at”.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'She lives (in / on / at) 42 Garden Road.',
      answer: 'at',
      reason: 'A full street address is treated as a specific point.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'The team’s success (depends on / depends of) careful planning.',
      answer: 'depends on',
      reason: 'The fixed pattern is “depend on”.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'He walked (in / into) the office without knocking.',
      answer: 'into',
      reason: 'This describes movement toward the inside of the room.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'She is afraid from spiders.',
      answer: 'She is afraid of spiders.',
      reason: 'The fixed pattern is “afraid of”.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'I was born at 1999.',
      answer: 'I was born in 1999.',
      reason: 'Years take “in”, not “at”.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'This design is quite similar with the old one.',
      answer: 'This design is quite similar to the old one.',
      reason: 'The fixed pattern is “similar to”.',
    },
    {
      stage: 'Exam-style',
      prompt: 'The success of the negotiations depends of the willingness of both sides to compromise.',
      answer: 'The success of the negotiations depends on the willingness of both sides to compromise.',
      reason: 'The fixed pattern is “depend on”.',
    },
    {
      stage: 'Exam-style',
      prompt: 'The new regulation is different than the one it replaces.',
      answer: 'The new regulation is different from the one it replaces.',
      reason: 'The standard formal pattern is “different from”.',
    },
  ],
  quiz: [
    {
      question: 'Choose the correct sentence.',
      options: ['She lives in Multan.', 'She lives on Multan.', 'She lives at Multan.', 'She lives to Multan.'],
      correct: 0,
      explanation: '“In” is used for cities and countries.',
    },
    {
      question: 'Which preposition correctly completes: “The book is ____ the shelf.”?',
      options: ['in', 'on', 'at', 'into'],
      correct: 1,
      explanation: '“On” is used for a surface, such as a shelf.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['We will meet in 6 o’clock.', 'We will meet on 6 o’clock.', 'We will meet at 6 o’clock.', 'We will meet into 6 o’clock.'],
      correct: 2,
      explanation: '“At” is used with clock times.',
    },
    {
      question: 'Which sentence uses the correct fixed preposition?',
      options: ['He is capable to handle pressure.', 'He is capable of handling pressure.', 'He is capable in handling pressure.', 'He is capable for handling pressure.'],
      correct: 1,
      explanation: 'The fixed pattern is “capable of”.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['She is good in painting.', 'She is good at painting.', 'She is good on painting.', 'She is good for painting.'],
      correct: 1,
      explanation: 'The fixed pattern is “good at”.',
    },
    {
      question: 'Which sentence correctly describes movement into an enclosed space?',
      options: ['He walked in the room and switched on the light.', 'He walked into the room and switched on the light.', 'He walked on the room and switched on the light.', 'He walked at the room and switched on the light.'],
      correct: 1,
      explanation: '“Into” shows movement toward the inside of an enclosed space.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['I was born on 1995.', 'I was born at 1995.', 'I was born in 1995.', 'I was born into 1995.'],
      correct: 2,
      explanation: '“In” is used with years.',
    },
    {
      question: 'Which sentence uses the correct fixed preposition?',
      options: ['This plan is similar with the last one.', 'This plan is similar to the last one.', 'This plan is similar of the last one.', 'This plan is similar for the last one.'],
      correct: 1,
      explanation: 'The fixed pattern is “similar to”.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['The company is responsible of the damage.', 'The company is responsible for the damage.', 'The company is responsible with the damage.', 'The company is responsible about the damage.'],
      correct: 1,
      explanation: 'The fixed pattern is “responsible for”.',
    },
    {
      question: 'Which sentence correctly uses a preposition of time for a date?',
      options: ['The exam is in 5 May.', 'The exam is on 5 May.', 'The exam is at 5 May.', 'The exam is into 5 May.'],
      correct: 1,
      explanation: '“On” is used with specific days and dates.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['Success often depends of hard work.', 'Success often depends on hard work.', 'Success often depends at hard work.', 'Success often depends to hard work.'],
      correct: 1,
      explanation: 'The fixed pattern is “depend on”.',
    },
    {
      question: 'Which sentence uses the correct preposition of place for a precise point?',
      options: ['They waited in the bus stop.', 'They waited on the bus stop.', 'They waited at the bus stop.', 'They waited into the bus stop.'],
      correct: 2,
      explanation: '“At” is used for a specific point, such as a bus stop.',
    },
  ],
  quickRevision: [
    'Prepositions show how words relate in place, time, direction, or manner.',
    'Place: IN for enclosed areas (a country/city), ON for surfaces or streets, AT for a precise point or address.',
    'Time: IN for months/years/seasons, ON for days and dates, AT for clock times.',
    'Movement: INTO (entering), ONTO (onto a surface), THROUGH (from side to side, often inside), ACROSS (from side to side, often over a surface).',
    'Fixed pairings — depend on, interested in, married to, responsible for, capable of, good at, afraid of, similar to, different from — must be memorised as whole phrases.',
    'A preposition is followed by a noun, pronoun, or -ing form, never the base form of a verb.',
    '“In time” means early enough; “on time” means at the exact expected moment.',
  ],
}
