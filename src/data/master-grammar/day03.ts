import type { GrammarDay } from './types'
import { stageOf } from './types'

export const day03: GrammarDay = {
  day: 3,
  ...stageOf(3),
  title: 'Sentence, Phrase and Clause',
  whatYouWillLearn:
    'You will learn the difference between a phrase and a clause, the difference between an independent and a dependent clause, and how to recognise sentence fragments and run-on sentences.',
  simpleExplanation: [
    'Words group together in different ways. Some groups of words work as a single unit but do not contain a subject and a verb together — these are called phrases, such as “in the morning” or “a very old book”. On their own, phrases cannot make a complete sentence.',
    'Other groups of words do contain a subject and a verb — these are called clauses. Some clauses can stand alone as a complete sentence, because they express a full idea. Others cannot stand alone, even though they have a subject and a verb, because the idea feels unfinished.',
    'Understanding this difference helps you avoid two common problems: writing a fragment (a piece of a sentence presented as if it were complete) and writing a run-on sentence (joining two complete ideas without proper punctuation).',
  ],
  rules: [
    {
      rule: 'A phrase is a group of related words that does not have a subject and a verb together.',
      explanation: 'A phrase adds detail, but it cannot stand alone as a sentence because it does not express a complete thought.',
      correct: 'in the morning / a cup of hot tea / running towards the gate',
    },
    {
      rule: 'A clause is a group of words that contains a subject and a verb.',
      explanation: 'Because it has a subject and a verb, a clause can express an idea, though not every clause can stand on its own.',
      correct: 'Sara left early.',
    },
    {
      rule: 'An independent clause expresses a complete thought and can stand alone as a sentence.',
      explanation: 'It does not depend on any other clause to make sense.',
      correct: 'The market closed early.',
    },
    {
      rule: 'A dependent (subordinate) clause has a subject and a verb but cannot stand alone, because the idea feels incomplete.',
      explanation: 'It usually begins with a word such as because, although, when, if, who, or which, which signals that more information is coming.',
      correct: 'Because the market closed early, we could not buy vegetables.',
      wrong: 'Because the market closed early.',
      correction: 'On its own, this leaves the reader waiting for the result. It needs an independent clause attached to complete the thought.',
    },
    {
      rule: 'A sentence fragment is an incomplete idea that is punctuated as if it were a full sentence.',
      explanation: 'A fragment is often just a phrase or a dependent clause standing alone, missing a subject, a verb, or a complete thought.',
      correct: 'Although he was tired, he finished the report.',
      wrong: 'Although he was tired.',
      correction: 'This dependent clause is left hanging with no main idea attached. Add an independent clause to complete it.',
    },
    {
      rule: 'A run-on sentence happens when two independent clauses are joined with no punctuation at all.',
      explanation: 'Two complete ideas placed back-to-back with nothing between them confuse the reader about where one idea ends and the next begins.',
      correct: 'It started to rain, so we went home.',
      wrong: 'It started to rain we went home.',
      correction: 'Two independent clauses need a proper connector — a full stop, a semicolon, or a comma with a conjunction like “so”.',
    },
    {
      rule: 'A comma splice happens when two independent clauses are joined by only a comma, with no conjunction.',
      explanation: 'A comma alone is not strong enough to join two complete ideas; it needs a joining word, or should be replaced with a full stop or a semicolon.',
      correct: 'The shop was closed, so we went to the market instead.',
      wrong: 'The shop was closed, we went to the market instead.',
      correction: 'A comma alone cannot join two independent clauses. Add a conjunction such as “so”, or use a full stop or semicolon instead.',
    },
    {
      rule: 'A sentence must contain at least one independent clause to be complete.',
      explanation: 'A sentence can be just one independent clause, or it can combine an independent clause with one or more phrases or dependent clauses.',
      correct: 'When the bell rang, the students left the classroom quickly.',
    },
  ],
  easyExamples: [
    'After the movie (phrase — no subject/verb pair)',
    'The children played outside. (independent clause — a complete sentence)',
    'Although it was raining, they played outside. (dependent clause + independent clause)',
    'She smiled and waved. (one subject, two verbs, still one independent clause)',
  ],
  practicalExamples: [
    'Because the printer was broken, the report was submitted late.',
    'The manager reviewed the file before the meeting started.',
    'Although the interview went well, she did not get the job.',
  ],
  examExamples: [
    'Although the proposal addressed most concerns, several members remained unconvinced.',
    'Since the results were inconclusive, the researchers repeated the experiment.',
  ],
  commonMistakes: [
    {
      wrong: 'Because she missed the bus.',
      right: 'Because she missed the bus, she arrived late.',
      why: 'A dependent clause beginning with “because” cannot stand alone; it needs an independent clause to complete the idea.',
    },
    {
      wrong: 'The lights went out we lit some candles.',
      right: 'The lights went out, so we lit some candles.',
      why: 'Two independent clauses cannot simply sit next to each other with no punctuation; this is a run-on sentence.',
    },
    {
      wrong: 'It was late, we decided to leave.',
      right: 'It was late, so we decided to leave.',
      why: 'A comma alone cannot join two independent clauses; this is a comma splice. Adding “so” fixes it.',
    },
    {
      wrong: 'Running through the park early in the morning.',
      right: 'Sara was running through the park early in the morning.',
      why: 'This is a phrase built around “running”, with no subject and finite verb pair, so it is a fragment rather than a complete sentence.',
    },
    {
      wrong: 'Which was completely unexpected.',
      right: 'The result, which was completely unexpected, changed everyone’s plans.',
      why: 'A clause beginning with “which” is dependent and cannot stand alone; it must be attached to an independent clause.',
    },
  ],
  memoryTip:
    'A quick test for any group of words: cover up everything before and after it. If it still makes complete sense by itself, it is an independent clause. If it leaves you asking “and then what happened?”, it is a phrase or a dependent clause.',
  practice: [
    {
      stage: 'Recognise it',
      prompt: 'Is “near the old bridge” a phrase or a clause?',
      answer: 'a phrase',
      reason: 'It has no subject and verb pair — it only adds detail about location.',
    },
    {
      stage: 'Recognise it',
      prompt: 'Is “when the guests arrived” an independent or a dependent clause?',
      answer: 'a dependent clause',
      reason: 'It has a subject and a verb, but “when” signals that the idea is incomplete without more information.',
    },
    {
      stage: 'Recognise it',
      prompt: 'Is “The bell rang” an independent or a dependent clause?',
      answer: 'an independent clause',
      reason: 'It has a subject and a verb and expresses a complete thought on its own.',
    },
    {
      stage: 'Fill in the blank',
      prompt: '____ the rain stopped, the children went outside to play. (Although / The)',
      answer: 'Although',
      reason: '“Although” introduces a dependent clause that needs an independent clause to complete the thought.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'The bus was late, ____ we missed the first class. (so / it)',
      answer: 'so',
      reason: 'A conjunction is needed to properly join the two independent clauses; a comma alone is not enough.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'Which is a complete sentence? (Because he forgot his umbrella. / He forgot his umbrella.)',
      answer: 'He forgot his umbrella.',
      reason: 'The first option is a dependent clause left without a main idea, so it is a fragment.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'Which correctly joins two independent clauses? (The bus stopped, everyone got off. / The bus stopped, and everyone got off.)',
      answer: 'The bus stopped, and everyone got off.',
      reason: 'A comma alone cannot join two independent clauses; it needs a conjunction such as “and”.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'Because the shop was closed.',
      answer: 'Because the shop was closed, we went home.',
      reason: 'A dependent clause beginning with “because” cannot stand alone and needs an independent clause attached.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'The exam was difficult many students struggled.',
      answer: 'The exam was difficult, so many students struggled.',
      reason: 'Two independent clauses cannot be joined with no punctuation at all; this is a run-on sentence.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'It began to snow, we decided to stay indoors.',
      answer: 'It began to snow, so we decided to stay indoors.',
      reason: 'A comma alone cannot join two independent clauses; a conjunction such as “so” is needed.',
    },
    {
      stage: 'Exam-style',
      prompt: 'Although the committee reviewed every proposal carefully.',
      answer: 'Although the committee reviewed every proposal carefully, no final decision was reached.',
      reason: 'A dependent clause introduced by “although” cannot stand alone; it needs an independent clause to complete the idea.',
    },
    {
      stage: 'Exam-style',
      prompt: 'The negotiations collapsed both sides blamed each other.',
      answer: 'The negotiations collapsed, and both sides blamed each other.',
      reason: 'Two independent clauses placed next to each other with no punctuation form a run-on sentence and need a conjunction or proper punctuation.',
    },
  ],
  quiz: [
    {
      question: 'Which of these is a phrase, not a clause?',
      options: ['She laughed loudly.', 'in front of the school', 'Ali finished his homework.', 'Although it rained'],
      correct: 1,
      explanation: '“In front of the school” has no subject and verb pair, so it is a phrase.',
    },
    {
      question: 'Which sentence contains a dependent clause?',
      options: ['The rain stopped.', 'The children went home.', 'When the rain stopped, the children went home.', 'The children went home early.'],
      correct: 2,
      explanation: '“When the rain stopped” has a subject and verb but cannot stand alone, so it is dependent.',
    },
    {
      question: 'What is wrong with “Because he was late.” as a standalone sentence?',
      options: [
        'It has no subject',
        'It has no verb',
        'It is a dependent clause with no independent clause attached',
        'Nothing is wrong with it',
      ],
      correct: 2,
      explanation: 'It has a subject and verb but the idea is incomplete without an independent clause.',
    },
    {
      question: 'Which sentence is a run-on sentence?',
      options: [
        'The train arrived we boarded quickly.',
        'The train arrived, and we boarded quickly.',
        'The train arrived; we boarded quickly.',
        'The train arrived. We boarded quickly.',
      ],
      correct: 0,
      explanation: 'Two independent clauses are joined with no punctuation at all, making it a run-on sentence.',
    },
    {
      question: 'Which sentence contains a comma splice?',
      options: [
        'She was tired, she kept working.',
        'She was tired, so she rested.',
        'She was tired; she kept working.',
        'She was tired. She kept working.',
      ],
      correct: 0,
      explanation: 'A comma alone joins two independent clauses here, which is not strong enough without a conjunction.',
    },
    {
      question: 'Which is the best way to fix a comma splice?',
      options: [
        'Remove the comma entirely',
        'Add a conjunction after the comma, or use a full stop or semicolon',
        'Add another comma',
        'Change the subject of the second clause',
      ],
      correct: 1,
      explanation: 'A comma splice is fixed by adding a conjunction, or replacing the comma with a full stop or semicolon.',
    },
    {
      question: 'Which word typically begins a dependent clause?',
      options: ['and', 'because', 'the', 'quickly'],
      correct: 1,
      explanation: '“Because” signals that the clause depends on more information to be complete.',
    },
    {
      question: 'Which of these is a sentence fragment?',
      options: [
        'Running late for the meeting, she called ahead.',
        'Running late for the meeting.',
        'She was running late for the meeting.',
        'She called ahead because she was running late.',
      ],
      correct: 1,
      explanation: 'This phrase has no subject and finite verb pair expressing a complete idea, so it is a fragment.',
    },
    {
      question: 'What must every complete sentence contain at minimum?',
      options: ['A phrase', 'At least one independent clause', 'Two independent clauses', 'A dependent clause'],
      correct: 1,
      explanation: 'A sentence needs at least one independent clause to express a complete thought.',
    },
    {
      question: 'Which sentence correctly joins two independent clauses?',
      options: [
        'He studied hard, he still failed.',
        'He studied hard he still failed.',
        'He studied hard, but he still failed.',
        'He studied hard. but he still failed.',
      ],
      correct: 2,
      explanation: 'A comma followed by a conjunction correctly joins the two independent clauses.',
    },
    {
      question: 'In “The book that she borrowed was overdue,” what is “that she borrowed”?',
      options: ['an independent clause', 'a phrase', 'a dependent clause', 'a sentence fragment'],
      correct: 2,
      explanation: 'It has a subject (she) and a verb (borrowed) but cannot stand alone, so it is a dependent clause.',
    },
  ],
  quickRevision: [
    'A phrase is a group of related words with no subject and verb pair; it cannot stand alone.',
    'A clause has a subject and a verb.',
    'An independent clause expresses a complete thought and can stand alone as a sentence.',
    'A dependent clause has a subject and verb but cannot stand alone; it often starts with words like because, although, when, or which.',
    'A fragment is an incomplete idea punctuated as if it were a full sentence.',
    'A run-on sentence joins two independent clauses with no punctuation; a comma splice joins them with only a comma.',
    'Fix run-ons and comma splices with a full stop, a semicolon, or a comma plus a conjunction.',
  ],
}
