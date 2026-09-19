import type { GrammarDay } from './types'
import { stageOf } from './types'

export const day18: GrammarDay = {
  day: 18,
  ...stageOf(18),
  title: 'Participles and Modifiers',
  whatYouWillLearn:
    'You will learn how present and past participles work as adjectives, and how to place modifiers correctly so they describe the word you actually mean.',
  simpleExplanation: [
    'Some adjectives come from verbs. A present participle (verb+ing) and a past participle (verb+ed, or an irregular form) can both describe a noun — but they describe it in different ways.',
    'The “-ing” form usually describes something that causes a feeling: a boring lecture is a lecture that causes boredom. The “-ed” form usually describes someone who experiences that feeling: a bored student is a student who feels bored. Mixing these up changes the meaning of the sentence.',
    'Separately, a modifier is any word or phrase that describes another word, and it needs to sit close to the word it actually describes. When a modifier ends up next to the wrong word, or has nothing to attach to at all, the sentence can end up saying something the writer never intended.',
  ],
  rules: [
    {
      rule: 'A present participle (verb+ing) can act as an adjective describing something that CAUSES a feeling.',
      explanation: 'The thing itself is responsible for producing that feeling in someone else.',
      correct: 'The movie was fascinating.',
    },
    {
      rule: 'A past participle (verb+ed, or an irregular form) can act as an adjective describing someone who EXPERIENCES a feeling.',
      explanation: 'The person is the one feeling the emotion, not causing it.',
      correct: 'The audience was fascinated.',
    },
    {
      rule: 'Mixing up the “-ing” and “-ed” forms changes the meaning and often makes the sentence illogical.',
      explanation: 'Choosing the wrong form can make it sound as if a person causes a feeling rather than experiences it, or the reverse.',
      correct: 'I am bored in this class.',
      wrong: 'I am boring in this class.',
      correction: '“Boring” describes something that causes boredom in others; to say the speaker feels bored, “bored” is needed.',
    },
    {
      rule: 'A modifier must sit next to the word it is actually meant to describe.',
      explanation: 'Moving a modifier away from its target word can quietly change what the sentence means.',
      correct: 'She drove her children to school almost every day.',
      wrong: 'She almost drove her children to school every day.',
      correction: '“Almost” is placed too far from “every day”, the word it actually limits, which makes the sentence sound as if she nearly never drove them at all.',
    },
    {
      rule: 'A misplaced modifier sits too far from its target word, creating confusion or an unintended meaning.',
      explanation: 'The reader may attach the modifier to the wrong noun simply because of where it sits in the sentence.',
      correct: 'The librarian gave the boy a book with a torn cover.',
      wrong: 'The librarian gave a book to the boy with a torn cover.',
      correction: 'Placing “with a torn cover” next to “book” removes the confusion about whether the boy or the book is torn.',
    },
    {
      rule: 'A dangling modifier is an opening descriptive phrase with no matching subject in the main clause, so it appears to describe the wrong thing.',
      explanation: 'The word right after the opening phrase should be the one actually doing what the phrase describes.',
      correct: 'Arriving late for class, Ali saw the teacher already writing on the board.',
      wrong: 'Arriving late for class, the teacher was already writing on the board.',
      correction: '“The teacher” cannot be the one arriving late; the word right after the opening phrase must be the person who actually arrived late.',
    },
    {
      rule: 'Fix a dangling modifier by making sure the subject right after the opening phrase can logically perform that action, or by rewriting the phrase as a full clause with its own subject.',
      explanation: 'Both fixes are equally acceptable; choose whichever reads more naturally.',
      correct: 'When Ali arrived late for class, the teacher was already writing on the board.',
    },
    {
      rule: 'A short list of common participle-adjective pairs is worth learning by heart.',
      explanation: 'boring/bored, interesting/interested, exciting/excited, confusing/confused, tiring/tired, annoying/annoyed.',
      correct: 'The exam was confusing, so the students felt confused.',
    },
  ],
  easyExamples: [
    'The lecture was boring, so the students were bored.',
    'The news was surprising, and everyone was surprised.',
    'The match was exciting, and the fans were excited.',
    'Reading late at night, Sara felt sleepy the next morning.',
  ],
  practicalExamples: [
    'The quarterly results were disappointing for shareholders, who were clearly disappointed.',
    'After reviewing the file, the manager found several errors.',
    'Confused by the instructions, several employees asked for clarification.',
    'The presentation was confusing, leaving the audience confused.',
  ],
  examExamples: [
    'Frustrated by the delay, passengers demanded a refund from the airline.',
    'The report’s findings were alarming, prompting an immediate review by the board.',
    'Having reviewed the evidence carefully, the judge delivered her verdict.',
  ],
  commonMistakes: [
    {
      wrong: 'I am boring during this long meeting.',
      right: 'I am bored during this long meeting.',
      why: 'The speaker experiences the feeling, so the past participle “bored” is needed, not “boring”.',
    },
    {
      wrong: 'The movie was bored.',
      right: 'The movie was boring.',
      why: 'The movie causes the feeling, so it needs the “-ing” form, not “-ed”.',
    },
    {
      wrong: 'She almost drove her children to school every day.',
      right: 'She drove her children to school almost every day.',
      why: '“Almost” should sit next to the word it actually limits (“every day”), not next to the verb.',
    },
    {
      wrong: 'The librarian gave a book to the boy with a torn cover.',
      right: 'The librarian gave the boy a book with a torn cover.',
      why: 'Placing “with a torn cover” next to “book” removes the confusion about what is actually torn.',
    },
    {
      wrong: 'Arriving late for class, the teacher was already writing on the board.',
      right: 'Arriving late for class, Ali saw the teacher already writing on the board.',
      why: 'The opening phrase had no matching subject in the main clause, so it wrongly seemed to describe the teacher.',
    },
    {
      wrong: 'Having finished the report, the printer broke down.',
      right: 'Having finished the report, Sara found that the printer had broken down.',
      why: '“The printer” cannot have finished the report, so the opening phrase needs a subject that actually performed that action.',
    },
  ],
  memoryTip:
    '“-ING” causes the feeling, “-ED” feels the feeling: think “boring book, bored reader”. For modifiers, read the opening phrase, then ask “who or what is doing this?” — whatever comes right after the comma must be able to answer that question.',
  practice: [
    {
      stage: 'Recognise it',
      prompt: 'In “The lecture was boring,” does “boring” describe the cause of the feeling or the person who feels it?',
      answer: 'The cause of the feeling.',
      reason: 'The “-ing” form describes something that produces a feeling in others.',
    },
    {
      stage: 'Recognise it',
      prompt: 'In “Arriving late for class, the teacher was already writing on the board,” what is wrong with the opening phrase?',
      answer: 'It is a dangling modifier — it has no matching subject in the main clause.',
      reason: '“The teacher” did not arrive late; the sentence needs a subject right after the phrase who actually did.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'The match was so ____ (excite) that everyone stayed until the end.',
      answer: 'exciting',
      reason: 'The match causes the feeling of excitement.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'The fans were ____ (excite) throughout the match.',
      answer: 'excited',
      reason: 'The fans experience the feeling of excitement.',
    },
    {
      stage: 'Fill in the blank',
      prompt: '____ (confuse) by the new form, several customers asked for help.',
      answer: 'Confused',
      reason: 'The customers experience confusion, so the past participle is needed.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'I found the lecture very (boring / bored).',
      answer: 'boring',
      reason: 'The lecture causes the feeling.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'She felt (tiring / tired) after the long journey.',
      answer: 'tired',
      reason: 'She experiences the feeling of tiredness.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'The news was (surprising / surprised) to everyone.',
      answer: 'surprising',
      reason: 'The news causes the feeling of surprise.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'I am boring during this long meeting.',
      answer: 'I am bored during this long meeting.',
      reason: 'The speaker experiences the feeling, so the past participle “bored” is needed.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'She almost drove her children to school every day.',
      answer: 'She drove her children to school almost every day.',
      reason: '“Almost” is misplaced; it should sit next to “every day”, the word it actually limits.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'Arriving late for class, the teacher was already writing on the board.',
      answer: 'Arriving late for class, Ali saw the teacher already writing on the board.',
      reason: 'The opening phrase needs a subject who actually arrived late; “the teacher” cannot be that subject.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'The librarian gave a book to the boy with a torn cover.',
      answer: 'The librarian gave the boy a book with a torn cover.',
      reason: 'The modifier “with a torn cover” is placed too far from “book”, the word it should describe.',
    },
    {
      stage: 'Exam-style',
      prompt: 'Having reviewed the evidence carefully, the verdict was delivered by the judge.',
      answer: 'Having reviewed the evidence carefully, the judge delivered the verdict.',
      reason: 'The opening participle phrase needs a subject who actually reviewed the evidence — “the judge”, not “the verdict”.',
    },
    {
      stage: 'Exam-style',
      prompt: 'Frustrating by the delay, passengers demanded a refund from the airline.',
      answer: 'Frustrated by the delay, passengers demanded a refund from the airline.',
      reason: 'The passengers experience the feeling of frustration, so the past participle “frustrated” is needed, not “frustrating”.',
    },
  ],
  quiz: [
    {
      question: 'Which sentence correctly describes something that CAUSES a feeling?',
      options: ['I am boring.', 'The lecture was boring.', 'I felt boring.', 'The students were boring.'],
      correct: 1,
      explanation: '“Boring” describes the lecture, which causes the feeling of boredom.',
    },
    {
      question: 'Which sentence correctly describes someone who EXPERIENCES a feeling?',
      options: ['The movie was bored.', 'The audience was bored.', 'The movie felt bored.', 'The audience was boring.'],
      correct: 1,
      explanation: '“Bored” describes the audience, who experience the feeling.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['I am boring in this class.', 'I am bored in this class.', 'I am bore in this class.', 'I am to bore in this class.'],
      correct: 1,
      explanation: 'The speaker experiences boredom, so the past participle “bored” is correct.',
    },
    {
      question: 'What is a modifier?',
      options: ['A verb that shows action', 'A word or phrase that describes another word', 'A type of pronoun', 'A conjunction joining two clauses'],
      correct: 1,
      explanation: 'A modifier is any word or phrase that adds description to another word.',
    },
    {
      question: 'What is a misplaced modifier?',
      options: ['A modifier with nothing to describe at all', 'A modifier placed too far from the word it should describe, causing confusion', 'A modifier that repeats itself', 'A modifier used at the start of a sentence'],
      correct: 1,
      explanation: 'A misplaced modifier sits in the wrong position, so it appears to describe the wrong word.',
    },
    {
      question: 'What is a dangling modifier?',
      options: ['A modifier placed after the noun it describes', 'An opening phrase with no matching subject in the main clause', 'A modifier that uses too many words', 'A modifier that repeats an earlier word'],
      correct: 1,
      explanation: 'A dangling modifier is an opening descriptive phrase with nothing logical to attach to in the main clause.',
    },
    {
      question: 'Which sentence contains a dangling modifier?',
      options: ['Arriving late for class, Ali apologised to the teacher.', 'Arriving late for class, the teacher was already writing on the board.', 'When Ali arrived late, the teacher was writing on the board.', 'Ali, arriving late for class, apologised to the teacher.'],
      correct: 1,
      explanation: '“The teacher” did not arrive late, so the opening phrase has no matching subject.',
    },
    {
      question: 'Choose the correctly placed modifier.',
      options: ['She almost drove her children to school every day.', 'She drove her children to school almost every day.', 'Almost she drove her children to school every day.', 'She drove almost her children to school every day.'],
      correct: 1,
      explanation: '“Almost” should sit next to “every day”, the word it actually limits.',
    },
    {
      question: 'Choose the sentence without a misplaced modifier.',
      options: ['The librarian gave a book to the boy with a torn cover.', 'The librarian gave the boy a book with a torn cover.', 'The librarian, with a torn cover, gave a book to the boy.', 'With a torn cover, the librarian gave a book to the boy.'],
      correct: 1,
      explanation: 'Placing “with a torn cover” next to “book” removes the confusion about what is actually torn.',
    },
    {
      question: 'Which pair correctly matches cause and experience?',
      options: ['exciting / excite', 'excited / exciting', 'exciting / excited', 'excite / excited'],
      correct: 2,
      explanation: '“Exciting” describes the cause of the feeling, and “excited” describes the person who feels it.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['The news was surprised to everyone.', 'The news was surprising to everyone.', 'Everyone was surprising by the news.', 'The news surprising everyone.'],
      correct: 1,
      explanation: 'The news causes the feeling of surprise, so the “-ing” form is correct.',
    },
    {
      question: 'How can a dangling modifier usually be fixed?',
      options: ['By deleting the main clause entirely', 'By making sure the subject right after the opening phrase can logically perform that action, or by rewriting it as a full clause', 'By moving the modifier to the very end of the sentence only', 'By changing the modifier into a noun'],
      correct: 1,
      explanation: 'The clearest fixes are to match the subject right after the opening phrase to the phrase, or to rewrite the phrase as a complete clause with its own subject.',
    },
  ],
  quickRevision: [
    'The “-ing” participle adjective describes something that CAUSES a feeling (a boring lecture).',
    'The “-ed” participle adjective describes someone who EXPERIENCES a feeling (a bored student).',
    'A modifier must sit next to the word it is actually describing.',
    'A misplaced modifier sits too far from its target word and creates confusion or an unintended meaning.',
    'A dangling modifier is an opening phrase with no matching subject in the main clause.',
    'Fix a dangling modifier by matching the subject right after the opening phrase, or by rewriting it as a full clause.',
  ],
}
