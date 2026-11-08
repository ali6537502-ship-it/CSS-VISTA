import type { GrammarDay } from './types'
import { stageOf } from './types'

export const day02: GrammarDay = {
  day: 2,
  ...stageOf(2),
  title: 'Subject, Verb and Object',
  whatYouWillLearn:
    'You will learn the three basic building blocks of a sentence — subject, verb, and object — and how to spot each one, including the difference between a direct object and an indirect object.',
  simpleExplanation: [
    'Every complete sentence needs two things: someone or something the sentence is about (the subject), and a word that tells us what that subject does or is (the verb). “Sara laughed” is already a full sentence — Sara is the subject, laughed is the verb.',
    'Many verbs do not stop there. They also need an object — the person or thing that receives the action. In “Sara closed the door”, Sara did not just close; she closed something, and that something is the door.',
    'Some verbs simply do not take an object at all — you cannot “laugh something”. Once you can find the subject and the verb in any sentence, the rest becomes much easier to understand.',
  ],
  rules: [
    {
      rule: 'The subject is the person or thing the sentence is about, and it usually comes before the verb.',
      explanation: 'Ask “who or what is doing this?” — the answer is the subject.',
      correct: 'Ali plays cricket every Sunday.',
    },
    {
      rule: 'The verb tells us what the subject does or is.',
      explanation: 'Every sentence needs a verb. It can show an action (runs, writes) or a state (is, seems).',
      correct: 'The soup smells wonderful.',
    },
    {
      rule: 'Some verbs need an object to complete their meaning — these are called transitive verbs.',
      explanation: 'A transitive verb passes its action onto something. Without an object, the sentence feels unfinished.',
      correct: 'Sara enjoys her job.',
      wrong: 'Sara enjoys.',
      correction: '“Enjoys” needs an object to say what she enjoys — the sentence is incomplete without one.',
    },
    {
      rule: 'Some verbs do not take an object at all — these are called intransitive verbs.',
      explanation: 'Verbs like arrive, sleep, and laugh describe a complete action on their own, with nothing directly receiving it.',
      correct: 'The children laughed.',
      wrong: 'The children laughed the joke.',
      correction: '“Laugh” does not take a direct object. You can add extra information with a preposition instead: “The children laughed at the joke.”',
    },
    {
      rule: 'The direct object is the thing that directly receives the action of the verb.',
      explanation: 'Ask “what?” or “whom?” right after the verb to find the direct object.',
      correct: 'The shopkeeper weighed the rice.',
    },
    {
      rule: 'The indirect object is the person or thing that benefits from the action, usually appearing before the direct object.',
      explanation: 'Some verbs, like give, tell, send, and show, can take two objects — one that receives the action directly, and one that receives the benefit of it.',
      correct: 'She gave him a book.',
      wrong: 'She gave a book him.',
      correction: 'When both objects appear without a preposition, the indirect object (him) comes first, then the direct object (a book).',
    },
    {
      rule: 'Some verbs are followed by a complement rather than an object — a word that describes or renames the subject.',
      explanation: 'Linking verbs such as is, seems, and became do not pass an action onto anything; they simply link the subject to a description.',
      correct: 'She is a teacher.',
      wrong: 'She is a teacher happily.',
      correction: 'A complement describes the subject itself (a teacher), so it should sit directly after the linking verb, not be separated by another word.',
    },
    {
      rule: 'A sentence follows a basic pattern: Subject + Verb, Subject + Verb + Object, or Subject + Verb + Complement.',
      explanation: 'Recognising which pattern a sentence follows helps you check whether it is complete and correctly built.',
      correct: 'The baby cried. (S + V) / The baby dropped the spoon. (S + V + O) / The baby seems happy. (S + V + C)',
    },
  ],
  easyExamples: [
    'Ali runs. (subject + verb only)',
    'Ali reads a book. (subject + verb + direct object)',
    'The shopkeeper gave Ali some change. (indirect object + direct object)',
    'The soup tastes good. (subject + verb + complement)',
  ],
  practicalExamples: [
    'The manager sent the client an updated invoice.',
    'The teacher explained the topic clearly to the class.',
    'The new employee seems confident during interviews.',
  ],
  examExamples: [
    'The spokesperson offered the journalists a brief but detailed explanation.',
    'The proposal appears reasonable to most of the committee members.',
  ],
  commonMistakes: [
    {
      wrong: 'She discussed about the plan.',
      right: 'She discussed the plan.',
      why: '“Discuss” is a transitive verb that already includes the sense of “about”; adding “about” after it is unnecessary and non-standard.',
    },
    {
      wrong: 'He explained me the problem.',
      right: 'He explained the problem to me.',
      why: '“Explain” does not take a direct indirect-object pattern in English; the person must follow “to”.',
    },
    {
      wrong: 'The children arrived the station.',
      right: 'The children arrived at the station.',
      why: '“Arrive” is intransitive and needs a preposition (at/in) before a place, not a direct object.',
    },
    {
      wrong: 'She gave the letter to him a stamp.',
      right: 'She gave him the letter and a stamp.',
      why: 'Mixing the two object patterns confuses the sentence; keep either “gave him the letter” or “gave the letter to him”, not both patterns combined.',
    },
    {
      wrong: 'The manager seems a good leader efficiently.',
      right: 'The manager seems an efficient leader.',
      why: 'After a linking verb like “seems”, a complement describes the subject directly; an adverb should not be inserted after the complement.',
    },
  ],
  memoryTip:
    'To find the subject, ask “who or what?” before the verb. To find the direct object, ask “what?” or “whom?” right after the verb. If the sentence still feels unfinished after that, you are probably missing an object the verb needs.',
  practice: [
    {
      stage: 'Recognise it',
      prompt: 'In “Ali washed the car,” what is the direct object?',
      answer: 'the car',
      reason: 'It answers “washed what?” and directly receives the action of the verb.',
    },
    {
      stage: 'Recognise it',
      prompt: 'In “The teacher gave the students a test,” what is the indirect object?',
      answer: 'the students',
      reason: 'They receive the benefit of the action, while “a test” is the direct object.',
    },
    {
      stage: 'Recognise it',
      prompt: 'In “The bread smells fresh,” is “fresh” an object or a complement?',
      answer: 'a complement',
      reason: '“Smells” is a linking verb here, so “fresh” describes the subject rather than receiving an action.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'The waiter brought ____ the menu. (we / us)',
      answer: 'us',
      reason: 'An object pronoun is needed after the verb “brought”, since “us” receives the action.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'Sara ____ (arrive) at the airport at six.',
      answer: 'arrived',
      reason: '“Arrive” is intransitive and is followed by a preposition (at), not a direct object.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'She (discussed / discussed about) her plans with her family.',
      answer: 'discussed',
      reason: '“Discuss” is transitive on its own and does not need “about” after it.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'He (explained me / explained to me) the situation.',
      answer: 'explained to me',
      reason: '“Explain” needs “to” before the person receiving the explanation.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'The manager explained us the new policy.',
      answer: 'The manager explained the new policy to us.',
      reason: '“Explain” does not take a direct indirect object; the receiver must follow “to”.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'The train arrived the platform on time.',
      answer: 'The train arrived at the platform on time.',
      reason: '“Arrive” is intransitive and needs the preposition “at” before a place.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'She seems a talented singer beautifully.',
      answer: 'She seems a talented singer.',
      reason: 'After the linking verb “seems”, the complement describes the subject directly; adding an adverb after it is unnecessary and incorrect here.',
    },
    {
      stage: 'Exam-style',
      prompt: 'The chairman discussed about the budget with the finance team.',
      answer: 'The chairman discussed the budget with the finance team.',
      reason: '“Discuss” already carries the meaning of “about” and should not be followed by it.',
    },
    {
      stage: 'Exam-style',
      prompt: 'The officer explained the applicants the new procedure.',
      answer: 'The officer explained the new procedure to the applicants.',
      reason: '“Explain” requires “to” before the person receiving the information; it cannot take a direct indirect object without it.',
    },
  ],
  quiz: [
    {
      question: 'In “The baby dropped the spoon,” what is the subject?',
      options: ['dropped', 'the spoon', 'the baby', 'there is no subject'],
      correct: 2,
      explanation: '“The baby” is who the sentence is about, and it performs the action of the verb.',
    },
    {
      question: 'Which sentence pattern does “She is a teacher” follow?',
      options: ['Subject + Verb', 'Subject + Verb + Object', 'Subject + Verb + Complement', 'Object + Verb + Subject'],
      correct: 2,
      explanation: '“A teacher” describes the subject after the linking verb “is”, so it is a complement, not an object.',
    },
    {
      question: 'Which verb below is intransitive (does not take a direct object)?',
      options: ['buy', 'arrive', 'read', 'give'],
      correct: 1,
      explanation: '“Arrive” does not directly receive an action; it is normally followed by a preposition like “at” or “in”.',
    },
    {
      question: 'In “She gave him a book,” which word is the direct object?',
      options: ['She', 'gave', 'him', 'a book'],
      correct: 3,
      explanation: '“A book” is the thing directly receiving the action of giving; “him” is the indirect object.',
    },
    {
      question: 'Choose the correctly built sentence.',
      options: ['He explained me the rule.', 'He explained the rule me.', 'He explained the rule to me.', 'He explained to the rule me.'],
      correct: 2,
      explanation: '“Explain” needs “to” before the person receiving the explanation.',
    },
    {
      question: 'Which sentence uses “discuss” correctly?',
      options: ['They discussed about the merger.', 'They discussed the merger.', 'They discussed on the merger.', 'They discussed for the merger.'],
      correct: 1,
      explanation: '“Discuss” is transitive on its own and does not need a preposition afterwards.',
    },
    {
      question: 'In “The soup tastes delicious,” what job does “delicious” do?',
      options: ['direct object', 'indirect object', 'complement', 'subject'],
      correct: 2,
      explanation: '“Tastes” is a linking verb, so “delicious” describes the subject rather than receiving an action.',
    },
    {
      question: 'Which sentence is complete on its own, without needing an object?',
      options: ['She bought', 'She laughed', 'She gave', 'She wanted'],
      correct: 1,
      explanation: '“Laugh” is intransitive and forms a complete sentence without an object.',
    },
    {
      question: 'In “The shopkeeper sold Ali a kite,” who is the indirect object?',
      options: ['The shopkeeper', 'sold', 'Ali', 'a kite'],
      correct: 2,
      explanation: '“Ali” receives the benefit of the action, while “a kite” is the direct object.',
    },
    {
      question: 'Which sentence correctly follows the Subject + Verb + Object pattern?',
      options: ['Birds fly.', 'Ali reads a newspaper every morning.', 'She seems tired.', 'They arrived late.'],
      correct: 1,
      explanation: '“Ali” is the subject, “reads” is the verb, and “a newspaper” is the direct object receiving the action.',
    },
    {
      question: 'Why is “She discussed about her plans” considered non-standard?',
      options: [
        '“Discussed” cannot take an object',
        '“Discuss” already means “talk about”, so “about” is unnecessary',
        '“Plans” should be singular',
        '“She” should be “her”',
      ],
      correct: 1,
      explanation: '“Discuss” is transitive and already carries the sense of “about”, so adding it again is incorrect.',
    },
    {
      question: 'In “The waiter brought us the bill,” what part of speech is “us”?',
      options: ['direct object', 'indirect object', 'subject', 'complement'],
      correct: 1,
      explanation: '“Us” receives the benefit of the action, while “the bill” is the direct object.',
    },
  ],
  quickRevision: [
    'Every sentence needs a subject (who or what) and a verb (action or state).',
    'A transitive verb needs an object to complete its meaning; an intransitive verb does not take one.',
    'The direct object answers “what?” or “whom?” right after the verb.',
    'The indirect object is the person or thing that benefits from the action, and it usually comes before the direct object.',
    'A linking verb is followed by a complement, which describes or renames the subject, not an object.',
    'Basic sentence patterns: Subject + Verb; Subject + Verb + Object; Subject + Verb + Complement.',
  ],
}
