import type { GrammarDay } from './types'
import { stageOf } from './types'

export const day14: GrammarDay = {
  day: 14,
  ...stageOf(14),
  title: 'Active and Passive Voice',
  whatYouWillLearn:
    'You will learn how to change a sentence between active and passive voice, and how to decide which one to use in a given situation.',
  simpleExplanation: [
    'In most sentences, someone or something does an action to someone or something else. When we put the doer first, that is the active voice: “The chef cooked the meal.” Here, “the chef” is the doer, and the sentence tells us directly who did what.',
    'Sometimes we want to talk about the meal itself, and the cook is not the main point, or we do not even know who did the cooking. Then we can turn the sentence around: “The meal was cooked.” This is the passive voice — the thing that received the action now comes first, and the doer becomes optional.',
    'Neither voice is “correct” in every situation. They do different jobs. Once you can build the passive accurately, you can choose whichever voice actually fits what you want to say.',
  ],
  rules: [
    {
      rule: 'In an active sentence, the subject performs the action.',
      explanation: 'The doer comes first, followed by the verb, then the person or thing affected by the action.',
      correct: 'Sara wrote the report.',
    },
    {
      rule: 'In a passive sentence, the subject receives the action instead of performing it.',
      explanation: 'The person or thing that received the action in the active sentence moves to the front and becomes the new subject.',
      correct: 'The report was written by Sara.',
    },
    {
      rule: 'The passive is built with a form of “be” plus the past participle of the main verb.',
      explanation: 'The tense of “be” shows the tense of the whole sentence, while the main verb changes to its past participle form.',
      correct: 'The letter was written yesterday.',
    },
    {
      rule: 'Adding “by” plus the doer at the end is optional, not compulsory.',
      explanation: 'Include the doer only when it adds useful information; otherwise, leave it out.',
      correct: 'The bridge was completed last year.',
    },
    {
      rule: 'Use the passive when the doer is unknown, unimportant, or obvious, or when the action matters more than who did it.',
      explanation: 'This is one of the most common genuine reasons to choose the passive voice.',
      correct: 'My wallet was stolen yesterday.',
    },
    {
      rule: 'Use the active voice when you want to be direct and say clearly who is responsible — most everyday and professional writing prefers it.',
      explanation: 'Active sentences are usually shorter and easier to follow, so they are the natural first choice unless there is a good reason to use the passive.',
      correct: 'The manager signed the contract this morning.',
    },
    {
      rule: 'A common error is using the wrong past participle instead of the correct irregular form.',
      explanation: 'Many English verbs have irregular past participles that do not simply add “-ed”.',
      correct: 'The trophy was given to the winner.',
      wrong: 'The trophy was gave to the winner.',
      correction: 'The past participle of “give” is “given”, not “gave”, which is the simple past tense form.',
    },
    {
      rule: 'Another common error is leaving out the verb “be” altogether.',
      explanation: 'Without a form of “be”, the sentence is not actually in the passive voice, even if a past participle is used.',
      correct: 'The letter was written by Sara.',
      wrong: 'The letter wrote by Sara.',
      correction: '“Wrote” is the active past tense form. The passive needs “was” plus the past participle “written”.',
    },
  ],
  easyExamples: [
    'Ali cleans the car every Sunday. / The car is cleaned every Sunday.',
    'Someone stole my bicycle. / My bicycle was stolen.',
    'The teacher marks the tests. / The tests are marked by the teacher.',
    'They will announce the results tomorrow. / The results will be announced tomorrow.',
  ],
  practicalExamples: [
    'The factory produces two thousand units a day.',
    'A new product was launched by the company last month.',
    'The police have arrested the suspect.',
    'The bridge is being repaired this week.',
  ],
  examExamples: [
    'The new policy was widely criticised by economists for its short-term focus.',
    'Several important reforms have been introduced since the new government took office.',
    'The proposal was rejected by the board due to budget constraints.',
  ],
  commonMistakes: [
    {
      wrong: 'The window was broke by the storm.',
      right: 'The window was broken by the storm.',
      why: 'The past participle of “break” is “broken”, not “broke”, which is the simple past tense.',
    },
    {
      wrong: 'The letter wrote by Sara.',
      right: 'The letter was written by Sara.',
      why: 'The passive needs the helper verb “be” (here, “was”) together with the past participle; “wrote” alone cannot form the passive.',
    },
    {
      wrong: 'The prize was given by she.',
      right: 'The prize was given by her.',
      why: 'After “by”, we use the object form of the pronoun (“her”), not the subject form (“she”).',
    },
    {
      wrong: 'The report is writing now.',
      right: 'The report is being written now.',
      why: 'The continuous passive needs “being” plus the past participle, not just the “-ing” form on its own.',
    },
    {
      wrong: 'English is spoke in many countries.',
      right: 'English is spoken in many countries.',
      why: 'The past participle of “speak” is “spoken”, not “spoke”.',
    },
  ],
  memoryTip:
    'To build any passive sentence, ask two quick questions: which form of “be” fits the tense, and what is the past participle of the main verb? Passive always needs both parts together — never one without the other.',
  practice: [
    {
      stage: 'Recognise it',
      prompt: 'In “The window was broken by the storm,” is this sentence active or passive?',
      answer: 'Passive.',
      reason: 'The subject “window” receives the action, and the verb “was broken” is “be” plus the past participle.',
    },
    {
      stage: 'Recognise it',
      prompt: 'In “Sara wrote the letter,” is this sentence active or passive?',
      answer: 'Active.',
      reason: 'The subject “Sara” performs the action of writing.',
    },
    {
      stage: 'Recognise it',
      prompt: 'In “The suspect has been arrested,” which words show that this is passive?',
      answer: '“has been arrested”.',
      reason: 'This is a form of “be” (“been”) plus the past participle “arrested”.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'The letter ____ (write) by Ali yesterday.',
      answer: 'was written',
      reason: 'A past-tense passive sentence needs “was” plus the past participle.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'Two thousand units ____ (produce) every day.',
      answer: 'are produced',
      reason: 'A present-tense passive sentence needs “are” plus the past participle.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'The bridge ____ (repair) at the moment.',
      answer: 'is being repaired',
      reason: 'The continuous passive needs “is being” plus the past participle.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'The cake was (baked / baking) by my mother.',
      answer: 'baked',
      reason: 'A simple passive sentence needs the past participle “baked”, not the “-ing” form.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'My car was (stole / stolen) last night.',
      answer: 'stolen',
      reason: 'The past participle of “steal” is “stolen”, not “stole”.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'The news was (announce / announced) this morning.',
      answer: 'announced',
      reason: 'The passive needs the past participle “announced”.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'The report wrote by the committee last week.',
      answer: 'The report was written by the committee last week.',
      reason: 'The passive needs “was” plus the past participle “written”; “wrote” alone is only the active past tense.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'The suspect was took into custody.',
      answer: 'The suspect was taken into custody.',
      reason: 'The past participle of “take” is “taken”, not “took”.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'English is spoke in many countries.',
      answer: 'English is spoken in many countries.',
      reason: 'The past participle of “speak” is “spoken”, not “spoke”.',
    },
    {
      stage: 'Exam-style',
      prompt: 'The new policy was widely criticise by economists for its short-term focus.',
      answer: 'The new policy was widely criticised by economists for its short-term focus.',
      reason: 'The passive needs the past participle “criticised”, not the base form “criticise”.',
    },
    {
      stage: 'Exam-style',
      prompt: 'Several reforms have introduced since the new government took office.',
      answer: 'Several reforms have been introduced since the new government took office.',
      reason: 'The present perfect passive needs “have been” plus the past participle, not just “have”.',
    },
  ],
  quiz: [
    {
      question: 'Which sentence is in the passive voice?',
      options: ['Ali fixed the car.', 'The car was fixed by Ali.', 'Ali is fixing the car.', 'Ali will fix the car.'],
      correct: 1,
      explanation: 'The subject “car” receives the action, and the verb “was fixed” is “be” plus the past participle.',
    },
    {
      question: 'Choose the correct passive form: “The letter ___ by Sara.”',
      options: ['wrote', 'was write', 'was written', 'is wrote'],
      correct: 2,
      explanation: 'The passive needs a form of “be” plus the past participle; “written” is the past participle of “write”.',
    },
    {
      question: 'Which sentence correctly uses the past participle?',
      options: ['The window was broke by the ball.', 'The window was broken by the ball.', 'The window was breaking by the ball.', 'The window broken by the ball.'],
      correct: 1,
      explanation: '“Broken” is the correct past participle of “break”.',
    },
    {
      question: 'What is the best reason to choose the passive voice?',
      options: ['To make the sentence sound more formal only', 'When the doer is unknown, unimportant, or obvious', 'Because the active voice is grammatically wrong', 'To avoid using a main verb'],
      correct: 1,
      explanation: 'The passive is genuinely useful mainly when the doer does not need to be named, or the action matters more than who did it.',
    },
    {
      question: 'Which sentence correctly forms the continuous passive?',
      options: ['The road is repairing now.', 'The road is being repaired now.', 'The road is repaired now being.', 'The road being repaired now.'],
      correct: 1,
      explanation: 'The continuous passive is formed with “is/are being” plus the past participle.',
    },
    {
      question: 'Choose the correctly formed passive sentence.',
      options: ['Mistakes was made by the team.', 'Mistakes were made by the team.', 'Mistakes were make by the team.', 'Mistakes are making by the team.'],
      correct: 1,
      explanation: 'The plural subject “mistakes” needs “were”, plus the past participle “made”.',
    },
    {
      question: 'Which sentence is correct?',
      options: ['The suspect was took into custody.', 'The suspect was taken into custody.', 'The suspect was take into custody.', 'The suspect has took into custody.'],
      correct: 1,
      explanation: 'The past participle of “take” is “taken”.',
    },
    {
      question: 'Which form correctly completes: “English ___ in many countries.”?',
      options: ['speaks', 'is spoken', 'is speak', 'spoke'],
      correct: 1,
      explanation: 'The present passive needs “is” plus the past participle “spoken”.',
    },
    {
      question: 'Which sentence sensibly keeps the “by” phrase because the doer is genuinely useful information?',
      options: ['The novel was written by Jane Austen.', 'The window was broken by someone.', 'The road was repaired by workers.', 'The cake was baked by a person.'],
      correct: 0,
      explanation: 'Naming a specific, relevant person is useful information worth keeping; the other options add no real detail.',
    },
    {
      question: 'Which type of verb generally has no passive form?',
      options: ['A transitive verb, which takes an object', 'An intransitive verb, such as “arrive”, which takes no object', 'A verb in the past tense', 'A verb with an irregular past participle'],
      correct: 1,
      explanation: 'Without an object to become the new subject, an intransitive verb cannot be turned into the passive.',
    },
    {
      question: 'Which sentence correctly uses a pronoun after “by”?',
      options: ['The prize was given by she.', 'The prize was given by her.', 'The prize was given by hers.', 'The prize was given by herself only.'],
      correct: 1,
      explanation: 'After “by”, the object form of the pronoun (“her”) is needed, not the subject form.',
    },
    {
      question: 'Which sentence is clearer and more direct for everyday writing, since the doer is known and relevant?',
      options: ['The ball was kicked by the boy.', 'The boy kicked the ball.', 'The ball was being kicked.', 'It was kicked, the ball, by the boy.'],
      correct: 1,
      explanation: 'The active voice is direct here, since the doer (the boy) is known and worth naming.',
    },
  ],
  quickRevision: [
    'Active: the subject performs the action. Passive: the subject receives the action.',
    'The passive is always “be” + the past participle — never just the simple past form alone.',
    '“By + doer” is optional; add it only when it gives useful information.',
    'Choose the passive when the doer is unknown, unimportant, obvious, or less important than the action.',
    'Choose the active voice for directness and clarity — it is the natural choice for most everyday and professional writing.',
    'Watch for irregular past participles: took → taken, broke → broken, wrote → written, spoke → spoken, gave → given.',
    'Only verbs that take an object (transitive verbs) can normally be made passive.',
  ],
}
