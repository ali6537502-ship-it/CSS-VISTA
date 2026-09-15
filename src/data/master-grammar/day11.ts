import type { GrammarDay } from './types'
import { stageOf } from './types'

export const day11: GrammarDay = {
  day: 11,
  ...stageOf(11),
  title: 'Adjectives and Adverbs',
  whatYouWillLearn:
    'You will go deeper into adjectives and adverbs — how to order several adjectives before a noun, when to use an adjective after a linking verb, and where to place adverbs correctly.',
  simpleExplanation: [
    'On Day 1 you learned the basics: an adjective describes a noun, and an adverb describes a verb, an adjective, or another adverb. Today you will build on that with the details that actually cause mistakes in real writing.',
    'Two situations cause most of the trouble. First, after certain verbs like “seem”, “look”, or “taste”, you need an adjective even though the sentence is about an action. Second, where you place an adverb in a sentence can quietly change what the sentence means.',
  ],
  rules: [
    {
      rule: 'When several adjectives come before a noun, they usually follow a rough order: opinion, size, age, shape, colour, origin, material.',
      explanation: 'This is a general guide, not a strict law — in practice, people rarely use more than two or three adjectives together. But when you do use several, this order sounds natural to a native speaker.',
      correct: 'She inherited a beautiful small old round black Italian table.',
    },
    {
      rule: 'After a linking verb (be, seem, look, feel, taste, smell, sound, become), use an adjective, not an adverb, because the word describes the subject, not the verb.',
      explanation: 'A linking verb connects the subject to a description of the subject; it does not show an action being done in a particular way.',
      correct: 'The soup tastes delicious.',
      wrong: 'The soup tastes deliciously.',
      correction: '“Delicious” describes the soup (the subject), not the way the tasting happens, so it must be an adjective.',
    },
    {
      rule: 'Adverbs of manner usually come after the verb, or after the object if there is one, and many end in -ly.',
      explanation: 'They answer the question “how?” about the action.',
      correct: 'She answered the question politely.',
    },
    {
      rule: 'When both place and time appear at the end of a sentence, place usually comes before time.',
      explanation: 'This is the natural order: where something happened, then when it happened.',
      correct: 'They met at the park yesterday.',
      wrong: 'They met yesterday at the park.',
      correction: 'This order is not strictly wrong, but the more natural order for English is place before time: “at the park yesterday”.',
    },
    {
      rule: 'Adverbs of frequency (always, usually, often, never) usually go before the main verb, but after the verb “to be”.',
      explanation: 'This is one of the few fixed word-order rules for adverb placement.',
      correct: 'He always arrives early. He is always early.',
    },
    {
      rule: '“Good” is an adjective; “well” is normally the adverb form, though “well” can also be an adjective meaning “in good health”.',
      explanation: 'Use “good” to describe a noun, and “well” to describe how an action is done.',
      correct: 'She is a good singer, and she sings well.',
      wrong: 'She sings good.',
      correction: 'An adverb is needed to describe how she sings, so “well” is correct, not the adjective “good”.',
    },
    {
      rule: '“Bad” is an adjective; “badly” is the adverb form.',
      explanation: 'Use “bad” to describe a noun, and “badly” to describe how an action is done.',
      correct: 'He is a bad driver, and he drives badly.',
    },
    {
      rule: 'Comparative and superlative forms of adjectives (taller, most interesting) and adverbs (faster, more carefully) are covered in full later, but for now, remember that longer adjectives usually take “more”, not “-er”.',
      explanation: 'This is only a brief note here; the complete topic is covered on Day 20.',
      correct: 'This report is more detailed than the last one.',
    },
    {
      rule: 'Where you place the word “only” can change the meaning of a sentence — put it directly before the word or phrase it limits.',
      explanation: '“Only” restricts the meaning of whatever comes right after it, so moving it changes what is being restricted.',
      correct: 'Only Sara finished the test. / Sara finished only the test.',
    },
  ],
  easyExamples: [
    'Ali is a fast runner.',
    'Ali runs fast.',
    'She sings beautifully.',
    'The cake tastes sweet.',
  ],
  practicalExamples: [
    'The new manager seems confident about the target.',
    'He carefully reviewed the contract before signing it.',
    'The train arrived late again this morning.',
    'She is always punctual for meetings.',
  ],
  examExamples: [
    'The minister spoke confidently despite the difficult questions from journalists.',
    'Only the top three candidates will be called for an interview.',
    'The proposal seemed reasonable to most of the panel members.',
  ],
  commonMistakes: [
    {
      wrong: 'She sings good.',
      right: 'She sings well.',
      why: 'An adverb is needed to describe the verb “sings”; “good” is an adjective.',
    },
    {
      wrong: 'The food smells deliciously.',
      right: 'The food smells delicious.',
      why: 'After a linking verb like “smells”, an adjective describing the subject is needed, not an adverb.',
    },
    {
      wrong: 'He drives very bad.',
      right: 'He drives very badly.',
      why: 'An adverb is needed to describe how he drives.',
    },
    {
      wrong: 'She bought an Italian beautiful lamp.',
      right: 'She bought a beautiful Italian lamp.',
      why: 'Opinion adjectives (beautiful) normally come before origin adjectives (Italian).',
    },
    {
      wrong: 'They arrived yesterday at the station.',
      right: 'They arrived at the station yesterday.',
      why: 'When both place and time appear at the end of a sentence, place usually comes before time.',
    },
    {
      wrong: 'They always are complaining about the noise.',
      right: 'They are always complaining about the noise.',
      why: 'Adverbs of frequency usually come after the verb “to be”, not before it.',
    },
  ],
  memoryTip:
    '“Good” describes a noun (a good idea); “well” describes how something is done (she sings well), and “well” can also describe health (I feel well). If a linking verb like seem, look, or taste connects to the subject, choose the adjective, not the adverb.',
  practice: [
    {
      stage: 'Recognise it',
      prompt: 'In “The soup tastes good,” is “good” describing the soup or the action of tasting?',
      answer: 'The soup',
      reason: 'After a linking verb like “tastes”, the word describes the subject, not the verb, so it must be an adjective.',
    },
    {
      stage: 'Recognise it',
      prompt: 'In “He answered the question confidently,” what does “confidently” describe?',
      answer: 'The verb “answered”',
      reason: 'It tells us how he answered the question.',
    },
    {
      stage: 'Recognise it',
      prompt: 'In “Only the manager approved the request,” what does “only” limit?',
      answer: '“The manager”',
      reason: 'Placed directly before “the manager”, it means no one else approved it.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'She speaks French very ____ (good / well).',
      answer: 'well',
      reason: 'An adverb is needed to describe how she speaks.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'He felt ____ (bad / badly) about missing the meeting.',
      answer: 'bad',
      reason: 'After the linking verb “felt”, an adjective describing “he” is needed, not an adverb.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'They bought a ____ ____ table. (round / wooden)',
      answer: 'round wooden',
      reason: 'Shape (round) normally comes before material (wooden) in the usual adjective order.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'This cake tastes (wonderful / wonderfully).',
      answer: 'wonderful',
      reason: 'An adjective is needed after the linking verb “tastes”.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'He (always drives / drives always) carefully.',
      answer: 'always drives',
      reason: 'An adverb of frequency usually goes before the main verb.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'She is (good / well) at solving problems.',
      answer: 'good',
      reason: '“Good at” describes a quality or skill, so the adjective is needed here.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'The manager seemed confidently about the results.',
      answer: 'The manager seemed confident about the results.',
      reason: 'After the linking verb “seemed”, an adjective describing “the manager” is needed, not an adverb.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'He completed the task careful.',
      answer: 'He completed the task carefully.',
      reason: 'An adverb is needed to describe how he completed the task.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'She bought a black beautiful bag.',
      answer: 'She bought a beautiful black bag.',
      reason: 'Opinion adjectives (beautiful) normally come before colour adjectives (black).',
    },
    {
      stage: 'Exam-style',
      prompt: 'The officer behaved very professional during the inspection.',
      answer: 'The officer behaved very professionally during the inspection.',
      reason: 'An adverb is needed to describe how the officer behaved.',
    },
    {
      stage: 'Exam-style',
      prompt: 'The report was written careful and submitted on time.',
      answer: 'The report was written carefully and submitted on time.',
      reason: 'An adverb is needed to describe how the report was written.',
    },
  ],
  quiz: [
    {
      question: 'Choose the correct sentence.',
      options: ['The tea tastes wonderfully.', 'The tea tastes wonderful.', 'The tea taste wonderful.', 'The tea is tastes wonderful.'],
      correct: 1,
      explanation: 'After the linking verb “tastes”, an adjective describing “tea” is needed, not an adverb.',
    },
    {
      question: 'Which sentence uses “well” correctly?',
      options: ['She sings good.', 'She sings well.', 'She sings goodly.', 'She is sings well.'],
      correct: 1,
      explanation: 'An adverb is needed to describe how she sings; “well” is the adverb form of “good”.',
    },
    {
      question: 'Choose the sentence with the correct adjective order.',
      options: ['She wore a red beautiful dress.', 'She wore a beautiful red dress.', 'She wore a dress red beautiful.', 'She wore a red dress beautiful.'],
      correct: 1,
      explanation: 'Opinion adjectives (beautiful) usually come before colour adjectives (red).',
    },
    {
      question: 'Which sentence places the adverb of frequency correctly?',
      options: ['Always she arrives on time.', 'She always arrives on time.', 'She arrives always on time.', 'She arrives on time always.'],
      correct: 1,
      explanation: 'Adverbs of frequency like “always” usually go before the main verb.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['He felt badly about the delay.', 'He felt bad about the delay.', 'He felt badness about the delay.', 'He feel bad about the delay.'],
      correct: 1,
      explanation: 'After the linking verb “felt”, an adjective is needed to describe “he”, not an adverb.',
    },
    {
      question: 'Which sentence correctly places place and time at the end of a sentence?',
      options: ['We arrived yesterday at the airport.', 'We arrived at the airport yesterday.', 'We yesterday arrived at the airport.', 'At the airport we arrived yesterday.'],
      correct: 1,
      explanation: 'When place and time both appear at the end, place usually comes before time.',
    },
    {
      question: 'Which sentence means that Sara, and no one else, answered the last question?',
      options: ['Only Sara answered the last question.', 'Sara only answered the last question.', 'Sara answered the last question only.', 'Sara answered only the last question.'],
      correct: 0,
      explanation: 'Placing “only” directly before “Sara” shows that she alone answered it.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['This is a wooden round table.', 'This is a round wooden table.', 'This is a table wooden round.', 'This is a table round wooden.'],
      correct: 1,
      explanation: 'Shape (round) usually comes before material (wooden) in the normal adjective order.',
    },
    {
      question: 'Which sentence is correct?',
      options: ['The manager behaved very professional.', 'The manager behaved very professionally.', 'The manager behaved very professionalism.', 'The manager behave very professionally.'],
      correct: 1,
      explanation: 'An adverb is needed to describe how the manager behaved.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['I am not feeling good today; I think I have a fever.', 'I am not feeling well today; I think I have a fever.', 'I am not feel well today; I think I have a fever.', 'I am not feeling welly today; I think I have a fever.'],
      correct: 1,
      explanation: '“Well” is used here as an adjective meaning “in good health”.',
    },
    {
      question: 'Which sentence correctly uses an adjective after a linking verb?',
      options: ['This plan looks perfectly.', 'This plan looks perfect.', 'This plan look perfect.', 'This plan looking perfect.'],
      correct: 1,
      explanation: 'After the linking verb “looks”, an adjective describing “plan” is needed, not an adverb.',
    },
    {
      question: 'Choose the sentence with the correct adverb of manner.',
      options: ['He explained the rule careful.', 'He explained the rule carefully.', 'He explained careful the rule.', 'He carefully the rule explained.'],
      correct: 1,
      explanation: 'The adverb “carefully” describes how he explained the rule and follows the object naturally.',
    },
  ],
  quickRevision: [
    'Adjectives describe nouns; adverbs describe verbs, adjectives, or other adverbs.',
    'After linking verbs (be, seem, look, feel, taste, smell, sound), use an adjective to describe the subject, not an adverb.',
    'When several adjectives come before a noun, a rough order is: opinion, size, age, shape, colour, origin, material.',
    '“Good” is an adjective; “well” is usually the adverb form, though “well” can also mean “in good health”.',
    '“Bad” is an adjective; “badly” is the adverb form.',
    'Adverbs of frequency (always, usually, never) go before the main verb, but after “to be”.',
    'Where you place “only” can change the meaning of a sentence — put it directly before the word it limits.',
  ],
}
