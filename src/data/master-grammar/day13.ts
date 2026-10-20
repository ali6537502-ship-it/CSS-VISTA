import type { GrammarDay } from './types'
import { stageOf } from './types'

export const day13: GrammarDay = {
  day: 13,
  ...stageOf(13),
  title: 'Conjunctions and Connectors',
  whatYouWillLearn:
    'You will learn how coordinating, subordinating, and correlative conjunctions join ideas, and how to punctuate formal connectors like “however” and “therefore” correctly.',
  simpleExplanation: [
    'A conjunction is a word that joins two ideas together so you do not end up with a string of short, disconnected sentences. You met this idea briefly on Day 1. Today you will look at the different kinds of conjunctions and the connecting words used in formal writing.',
    'Some conjunctions join two equal ideas (and, but, so). Others join a smaller, incomplete idea to a main one (because, although, if). And some are really transition words — however, therefore, moreover — that link ideas between sentences but follow their own punctuation rules.',
  ],
  rules: [
    {
      rule: 'Coordinating conjunctions join two equal, independent ideas: for, and, nor, but, or, yet, so.',
      explanation: 'Each of these words can join two complete sentences into one. The first letters spell FANBOYS, a well-known memory aid.',
      correct: 'She studied hard, so she passed the exam.',
    },
    {
      rule: 'A comma usually comes before a coordinating conjunction when it joins two complete, independent clauses.',
      explanation: 'If both halves of the sentence could stand alone as full sentences, put a comma before the conjunction that joins them.',
      correct: 'He wanted to travel, but he had no money.',
    },
    {
      rule: 'Subordinating conjunctions join a dependent (incomplete) idea to an independent one, often showing reason, time, condition, or contrast: because, although, since, if, when, while.',
      explanation: 'The clause introduced by a subordinating conjunction cannot stand alone as a full sentence.',
      correct: 'Although it was raining, they continued the match.',
    },
    {
      rule: 'When the subordinate clause comes first, put a comma after it; when it comes second, a comma is usually not needed.',
      explanation: 'This comma marks where the introductory clause ends and the main clause begins.',
      correct: 'Because he was late, he missed the bus. / He missed the bus because he was late.',
      wrong: 'Because he was late he missed the bus.',
      correction: 'A comma is needed after an introductory subordinate clause.',
    },
    {
      rule: 'Correlative conjunctions work in fixed pairs — both...and, either...or, neither...nor, not only...but also — and the two items joined should be grammatically parallel.',
      explanation: 'This means the words or phrases on each side of the pair should be the same type (for example, two adjectives, or two verb phrases). The full topic of parallel structure is covered on Day 26.',
      correct: 'She is both intelligent and hardworking.',
      wrong: 'She is both intelligent and she works hard.',
      correction: 'After “both”, the two joined items should be the same grammatical type — two adjectives — not an adjective and a full clause.',
    },
    {
      rule: 'With “neither...nor” and “either...or”, the verb usually agrees with the noun closest to it.',
      explanation: 'This is a small but common exam point.',
      correct: 'Neither the manager nor the workers were informed.',
    },
    {
      rule: 'Formal connectors (however, therefore, moreover, nevertheless, consequently) link two independent ideas, but they are punctuated differently from coordinating conjunctions: use a semicolon or a full stop before the connector, and a comma after it.',
      explanation: 'A comma alone before one of these words is not enough, because it does not clearly separate the two complete ideas.',
      correct: 'The plan was ambitious; however, it lacked proper funding.',
      wrong: 'The plan was ambitious, however, it lacked proper funding.',
      correction: 'A comma alone before “however” creates a run-on sentence; use a semicolon or start a new sentence instead.',
    },
    {
      rule: 'Do not confuse “so” (a coordinating conjunction showing result) with “so that” (a subordinating conjunction showing purpose).',
      explanation: '“So” simply reports what happened as a result; “so that” explains the reason someone did something.',
      correct: 'She left early so that she could catch the train. / She left early, so she caught the train.',
    },
  ],
  easyExamples: [
    'Ali likes tea, and Sara likes coffee.',
    'She was tired, but she finished her work.',
    'We stayed home because it was raining.',
    'He is both funny and kind.',
  ],
  practicalExamples: [
    'The manager reviewed the report before the meeting, and she approved it the same day.',
    'Although the budget was limited, the project was completed on time.',
    'The shop is either closed for the holiday or simply out of stock.',
    'The results were disappointing; therefore, the coach changed the training schedule.',
  ],
  examExamples: [
    'The policy was well intentioned; however, its implementation proved difficult in rural areas.',
    'Neither the officials nor the residents were satisfied with the compensation offered.',
    'Not only did the report highlight the delays, but it also proposed a revised timeline.',
  ],
  commonMistakes: [
    {
      wrong: 'The plan was ambitious, however, it lacked funding.',
      right: 'The plan was ambitious; however, it lacked funding.',
      why: 'Joining two independent ideas with “however” needs a semicolon or full stop before it, not just a comma.',
    },
    {
      wrong: 'She is both hardworking and she is intelligent.',
      right: 'She is both hardworking and intelligent.',
      why: 'After “both...and”, the two paired items must be the same grammatical form — here, two adjectives.',
    },
    {
      wrong: 'Neither Ali nor Sara were present at the meeting.',
      right: 'Neither Ali nor Sara was present at the meeting.',
      why: 'With “neither...nor”, the verb agrees with the noun closest to it, and here that noun (“Sara”) is singular.',
    },
    {
      wrong: 'He left early so that he caught the train.',
      right: 'He left early so that he could catch the train.',
      why: '“So that” expresses purpose and is usually followed by “could”, “would”, or “can”, not the simple past.',
    },
    {
      wrong: 'Because he was tired he went to bed early.',
      right: 'Because he was tired, he went to bed early.',
      why: 'A comma is needed after an introductory subordinate clause.',
    },
    {
      wrong: 'She not only finished the report but also she checked it twice.',
      right: 'She not only finished the report but also checked it twice.',
      why: 'After “not only...but also”, the two paired verb phrases should be parallel; the second part should not repeat the subject.',
    },
  ],
  memoryTip:
    'FANBOYS spells out the seven coordinating conjunctions: For, And, Nor, But, Or, Yet, So. For formal connectors (however, therefore, moreover), remember: full stop or semicolon BEFORE, comma AFTER — “The plan failed; therefore, changes were needed.”',
  practice: [
    {
      stage: 'Recognise it',
      prompt: 'In “She was late, but she still finished first,” what type of conjunction is “but”?',
      answer: 'Coordinating conjunction',
      reason: 'It joins two equal, independent ideas.',
    },
    {
      stage: 'Recognise it',
      prompt: 'In “Although he apologised, she remained upset,” what type of conjunction is “although”?',
      answer: 'Subordinating conjunction',
      reason: 'It introduces a dependent idea showing contrast.',
    },
    {
      stage: 'Recognise it',
      prompt: 'In “The bridge was old; consequently, it was closed to traffic,” what is “consequently”?',
      answer: 'A formal connector (transition word)',
      reason: 'It links two independent ideas and needs a semicolon before it and a comma after it.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'He was hungry, ____ he stopped for lunch.',
      answer: 'so',
      reason: 'This shows the result of being hungry.',
    },
    {
      stage: 'Fill in the blank',
      prompt: '____ she was exhausted, she finished the marathon.',
      answer: 'Although',
      reason: 'This shows contrast between the two ideas.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'The office was closed; ____, the meeting was postponed.',
      answer: 'therefore',
      reason: 'A formal connector showing result needs a semicolon before it and a comma after it.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'Neither the teacher nor the students (was / were) informed about the change.',
      answer: 'were',
      reason: 'The verb agrees with the noun nearer to it, “students” (plural).',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'She is not only talented but also (hardworking / she works hard).',
      answer: 'hardworking',
      reason: 'Parallel structure is needed after “not only...but also”.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'He studied hard (so / so that) he could pass the exam.',
      answer: 'so that',
      reason: 'This expresses purpose, not just a simple result.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'The team lost the match, however, they remained hopeful.',
      answer: 'The team lost the match; however, they remained hopeful.',
      reason: 'A semicolon (or full stop) is needed before “however” when it joins two independent ideas, not just a comma.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'Neither the workers nor the manager were consulted before the decision.',
      answer: 'Neither the workers nor the manager was consulted before the decision.',
      reason: 'The verb agrees with the noun closest to it, here the singular “manager”.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'Because it was raining they cancelled the outdoor event.',
      answer: 'Because it was raining, they cancelled the outdoor event.',
      reason: 'A comma is needed after an introductory subordinate clause.',
    },
    {
      stage: 'Exam-style',
      prompt: 'The scheme was praised widely, however, its cost remained a concern.',
      answer: 'The scheme was praised widely; however, its cost remained a concern.',
      reason: 'A semicolon is needed before “however” when it links two independent clauses.',
    },
    {
      stage: 'Exam-style',
      prompt: 'The report was not only comprehensive but it also was clearly written.',
      answer: 'The report was not only comprehensive but also clearly written.',
      reason: 'The two items joined by “not only...but also” must be grammatically parallel.',
    },
  ],
  quiz: [
    {
      question: 'Which word is one of the seven coordinating conjunctions (FANBOYS)?',
      options: ['Although', 'Because', 'So', 'Since'],
      correct: 2,
      explanation: '“So” is one of the seven coordinating conjunctions; the others listed are subordinating conjunctions.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['The plan failed, however, the team tried again.', 'The plan failed; however, the team tried again.', 'The plan failed however, the team tried again.', 'The plan failed; however the team tried again.'],
      correct: 1,
      explanation: 'A semicolon is needed before “however” when it joins two independent ideas, and a comma follows it.',
    },
    {
      question: 'Which sentence uses a subordinating conjunction correctly, with the comma in the right place?',
      options: ['Because she was tired she left early.', 'Because she was tired, she left early.', 'She, because was tired, left early.', 'Because, she was tired she left early.'],
      correct: 1,
      explanation: 'When the subordinate clause comes first, a comma is needed after it.',
    },
    {
      question: 'Choose the sentence with correct subject-verb agreement.',
      options: ['Neither the driver nor the passengers was hurt.', 'Neither the driver nor the passengers were hurt.', 'Neither the driver nor the passengers is hurt.', 'Neither the driver nor the passengers being hurt.'],
      correct: 1,
      explanation: 'With “neither...nor”, the verb agrees with the noun closest to it — here, the plural “passengers”.',
    },
    {
      question: 'Which sentence correctly uses “not only...but also” with parallel structure?',
      options: ['She is not only smart but also she is kind.', 'She is not only smart but also kind.', 'Not only she is smart but also kind.', 'She not only is smart but she also is kind.'],
      correct: 1,
      explanation: 'The two items joined by “not only...but also” must be the same grammatical form — here, two adjectives.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['He left early so that he arrived on time.', 'He left early so that he could arrive on time.', 'He left early so he could arrived on time.', 'He left early so that arrive on time.'],
      correct: 1,
      explanation: '“So that” expressing purpose is usually followed by “could”, “would”, or “can”.',
    },
    {
      question: 'Which of these is a subordinating conjunction?',
      options: ['and', 'but', 'although', 'yet'],
      correct: 2,
      explanation: '“Although” introduces a dependent clause and shows contrast; the others are coordinating conjunctions.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['The bridge was damaged; therefore it was closed.', 'The bridge was damaged; therefore, it was closed.', 'The bridge was damaged, therefore it was closed.', 'The bridge was damaged therefore, it was closed.'],
      correct: 1,
      explanation: 'A comma follows “therefore” when it begins the second part of the sentence after a semicolon.',
    },
    {
      question: 'Which sentence correctly joins two ideas with a coordinating conjunction and a comma?',
      options: ['She was nervous but she performed well.', 'She was nervous, but she performed well.', 'She was nervous but, she performed well.', 'She was nervous, but, she performed well.'],
      correct: 1,
      explanation: 'A comma normally comes before a coordinating conjunction that joins two independent clauses.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['Either you apologise or you leave the room.', 'Either you apologise or leaving the room.', 'Either apologising or you leave the room.', 'Either you apologise or leave you the room.'],
      correct: 0,
      explanation: 'The two items after “either...or” should be parallel — here, two simple verb phrases in the same form.',
    },
    {
      question: 'Which sentence correctly uses “so” to show result?',
      options: ['She was exhausted, so she went to bed early.', 'She was exhausted so that she went to bed early.', 'She was exhausted; so, she went to bed early.', 'She was exhausted, so that she went to bed early.'],
      correct: 0,
      explanation: '“So” (a coordinating conjunction) simply shows a result and is preceded by a comma.',
    },
    {
      question: 'Choose the sentence that correctly links two full sentences with a formal connector.',
      options: ['Sales improved, moreover, profits increased.', 'Sales improved; moreover, profits increased.', 'Sales improved moreover profits increased.', 'Sales improved; moreover profits increased.'],
      correct: 1,
      explanation: 'A semicolon comes before “moreover” and a comma comes after it when it links two independent ideas.',
    },
  ],
  quickRevision: [
    'FANBOYS: for, and, nor, but, or, yet, so — the seven coordinating conjunctions joining equal ideas.',
    'Subordinating conjunctions (because, although, since, if, when, while) join a dependent idea to an independent one.',
    'Put a comma after an introductory subordinate clause; usually no comma is needed when it comes second.',
    'Correlative pairs (both...and, either...or, neither...nor, not only...but also) need parallel structure on both sides.',
    'With neither...nor and either...or, the verb agrees with the noun closest to it.',
    'Formal connectors (however, therefore, moreover, nevertheless, consequently) need a semicolon or full stop before them and a comma after.',
    'A comma alone before “however” or “therefore” creates a comma splice — a common error in formal writing.',
  ],
}
