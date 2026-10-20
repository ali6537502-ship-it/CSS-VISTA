import type { GrammarDay } from './types'
import { stageOf } from './types'

export const day17: GrammarDay = {
  day: 17,
  ...stageOf(17),
  title: 'Gerunds and Infinitives',
  whatYouWillLearn:
    'You will learn the difference between a gerund (verb+ing acting as a noun) and an infinitive (“to” + base verb), and which one to use after common verbs and prepositions.',
  simpleExplanation: [
    'Sometimes a verb needs to act like a noun in a sentence — as the subject or the object. English gives us two ways to do this: adding “-ing” to the verb, which makes a gerund, or putting “to” in front of the base verb, which makes an infinitive.',
    'For example, “Swimming is good exercise” uses a gerund as the subject, and “I want to swim” uses an infinitive as the object of “want”. Both forms exist, but which one to use after a particular verb often depends on that verb — and sometimes the choice even changes the meaning.',
    'There is no single logical rule that predicts every case; much of this has to be learned verb by verb, the way vocabulary is learned. But there are strong, reliable patterns, and once you notice them, most sentences become predictable.',
  ],
  rules: [
    {
      rule: 'A gerund is verb+ing used as a noun — it can be a subject, an object, or follow a preposition.',
      explanation: 'It looks like the continuous form of a verb, but here it is doing a noun’s job.',
      correct: 'Reading calms me down. I enjoy reading.',
    },
    {
      rule: 'An infinitive is “to” plus the base form of the verb.',
      explanation: 'It often follows another verb, showing a purpose or the thing that is wanted, decided, or planned.',
      correct: 'I want to read. She decided to leave early.',
    },
    {
      rule: 'Some verbs are usually followed by a gerund: enjoy, avoid, finish, suggest, mind, consider.',
      explanation: 'These verbs simply do not normally take an infinitive after them.',
      correct: 'He suggested going to the market.',
      wrong: 'He suggested to go to the market.',
      correction: '“Suggest” is followed by a gerund, not an infinitive.',
    },
    {
      rule: 'Some verbs are usually followed by an infinitive: want, decide, hope, plan, agree, promise.',
      explanation: 'These verbs simply do not normally take a gerund after them.',
      correct: 'She agreed to help with the project.',
      wrong: 'She agreed helping with the project.',
      correction: '“Agree” is followed by an infinitive, not a gerund.',
    },
    {
      rule: 'A few verbs — start, begin, like, love — can take either form with little or no real change in meaning.',
      explanation: 'With these verbs, you can usually choose whichever form sounds more natural to you.',
      correct: 'It started to rain. / It started raining.',
    },
    {
      rule: 'Some verbs change meaning depending on whether a gerund or an infinitive follows.',
      explanation: '“Stop” plus a gerund means ending a habit or activity; “stop” plus an infinitive means pausing in order to do something else.',
      correct: 'He stopped smoking. (he no longer smokes) / He stopped to smoke. (he paused another activity in order to smoke)',
    },
    {
      rule: '“Remember” and “forget” also change meaning depending on the form that follows.',
      explanation: 'Plus a gerund, they refer to recalling a past action; plus an infinitive, they refer to a duty not yet done.',
      correct: 'I remember locking the door. (a memory of something already done) / I must remember to lock the door. (a future duty)',
    },
    {
      rule: 'A preposition is always followed by a gerund, never a bare infinitive.',
      explanation: 'This applies to fixed patterns like “interested in”, “good at”, and many others.',
      correct: 'She is interested in learning French. He is good at cooking traditional food.',
      wrong: 'She is interested in learn French.',
      correction: 'After a preposition (“in”), a gerund is needed (“learning”), not the base verb.',
    },
  ],
  easyExamples: [
    'Swimming is good exercise.',
    'I enjoy reading before bed.',
    'She wants to travel next year.',
    'He finished cleaning his room.',
  ],
  practicalExamples: [
    'The manager suggested rescheduling the meeting.',
    'The company plans to expand into new markets.',
    'Ali is good at solving problems quickly.',
    'The team avoided making the same mistake twice.',
  ],
  examExamples: [
    'The government proposed introducing stricter regulations on imports.',
    'The committee agreed to review the policy within six months.',
    'Analysts remembered warning about the risks well before the crisis began.',
  ],
  commonMistakes: [
    {
      wrong: 'He suggested to go early.',
      right: 'He suggested going early.',
      why: '“Suggest” is normally followed by a gerund, not an infinitive.',
    },
    {
      wrong: 'She agreed helping with the project.',
      right: 'She agreed to help with the project.',
      why: '“Agree” is normally followed by an infinitive, not a gerund.',
    },
    {
      wrong: 'He stopped to smoke years ago.',
      right: 'He stopped smoking years ago.',
      why: '“Stop” plus a gerund means ending a habit; “stop” plus an infinitive means pausing to do something else, which changes the meaning.',
    },
    {
      wrong: 'She is interested in learn new languages.',
      right: 'She is interested in learning new languages.',
      why: 'A preposition (“in”) is always followed by a gerund, never a bare infinitive.',
    },
    {
      wrong: 'I remember to lock the door last night.',
      right: 'I remember locking the door last night.',
      why: 'Recalling a completed past action needs a gerund; the infinitive would describe a duty not yet done.',
    },
  ],
  memoryTip:
    'If a small word right before the verb is a preposition (in, at, about, for), the next verb must wear its “-ing coat” — a gerund. A preposition is never followed directly by a bare infinitive.',
  practice: [
    {
      stage: 'Recognise it',
      prompt: 'In “Swimming is good exercise,” what job is “swimming” doing?',
      answer: 'It is a gerund acting as the subject of the sentence.',
      reason: 'Verb+ing is used here as a noun.',
    },
    {
      stage: 'Recognise it',
      prompt: 'In “She decided to leave early,” what form is “to leave”?',
      answer: 'Infinitive.',
      reason: '“To” plus the base verb, used as the object of “decided”.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'He avoided ____ (answer) the question directly.',
      answer: 'answering',
      reason: '“Avoid” is followed by a gerund.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'They hope ____ (finish) the project by Friday.',
      answer: 'to finish',
      reason: '“Hope” is followed by an infinitive.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'She is good at ____ (solve) difficult problems.',
      answer: 'solving',
      reason: 'A preposition (“at”) is always followed by a gerund.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'He finished (to write / writing) the report.',
      answer: 'writing',
      reason: '“Finish” is followed by a gerund.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'They plan (visiting / to visit) their grandparents next month.',
      answer: 'to visit',
      reason: '“Plan” is followed by an infinitive.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'He stopped (to check / checking) his phone every five minutes.',
      answer: 'checking',
      reason: '“Stop” plus a gerund means ending a habit or activity.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'She suggested to meet at the café.',
      answer: 'She suggested meeting at the café.',
      reason: '“Suggest” is followed by a gerund, not an infinitive.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'He is interested in learn about history.',
      answer: 'He is interested in learning about history.',
      reason: 'A preposition is always followed by a gerund.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'They agreed helping us move the furniture.',
      answer: 'They agreed to help us move the furniture.',
      reason: '“Agree” is followed by an infinitive, not a gerund.',
    },
    {
      stage: 'Exam-style',
      prompt: 'The board considered to postpone the annual meeting.',
      answer: 'The board considered postponing the annual meeting.',
      reason: '“Consider” is followed by a gerund, not an infinitive.',
    },
    {
      stage: 'Exam-style',
      prompt: 'The minister promised addressing the concerns raised by the committee.',
      answer: 'The minister promised to address the concerns raised by the committee.',
      reason: '“Promise” is followed by an infinitive, not a gerund.',
    },
  ],
  quiz: [
    {
      question: 'What is a gerund?',
      options: ['“To” plus the base verb', 'Verb+ing used as a noun', 'The past tense of a verb', 'A helping verb'],
      correct: 1,
      explanation: 'A gerund is the “-ing” form of a verb functioning as a noun.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['He enjoys to play football.', 'He enjoys playing football.', 'He enjoy playing football.', 'He enjoys play football.'],
      correct: 1,
      explanation: '“Enjoy” is followed by a gerund.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['She decided going home early.', 'She decided to go home early.', 'She decided go home early.', 'She decided goes home early.'],
      correct: 1,
      explanation: '“Decide” is followed by an infinitive.',
    },
    {
      question: 'Which verb is usually followed by a gerund?',
      options: ['want', 'decide', 'avoid', 'hope'],
      correct: 2,
      explanation: '“Avoid” is typically followed by a gerund (avoid doing something).',
    },
    {
      question: 'Which verb is usually followed by an infinitive?',
      options: ['suggest', 'mind', 'consider', 'promise'],
      correct: 3,
      explanation: '“Promise” is typically followed by an infinitive (promise to do something).',
    },
    {
      question: 'Which pair shows verbs that can take either a gerund or an infinitive with little change in meaning?',
      options: ['suggest / agree', 'start / begin', 'avoid / decide', 'mind / hope'],
      correct: 1,
      explanation: '“Start” and “begin” can be followed by either form with little difference in meaning.',
    },
    {
      question: 'Which sentence means he quit the habit of smoking?',
      options: ['He stopped to smoke.', 'He stopped smoking.', 'He stops to smoke.', 'He will stop to smoke.'],
      correct: 1,
      explanation: '“Stop” plus a gerund means ending a habit or activity.',
    },
    {
      question: 'Which sentence means he paused another activity in order to smoke?',
      options: ['He stopped smoking.', 'He stopped to smoke.', 'He stopped smoke.', 'He stops smoking.'],
      correct: 1,
      explanation: '“Stop” plus an infinitive means pausing to do something else.',
    },
    {
      question: 'Which sentence correctly recalls a past action?',
      options: ['I remember to lock the door.', 'I remember locking the door.', 'I remembered to locking the door.', 'I will remember locking the door tomorrow.'],
      correct: 1,
      explanation: '“Remember” plus a gerund refers to recalling something that already happened.',
    },
    {
      question: 'Which sentence correctly describes a duty not yet done?',
      options: ['I remember to lock the door.', 'I remember locking the door.', 'I remembered locking the door already.', 'I am remembering to lock the door yesterday.'],
      correct: 0,
      explanation: '“Remember” plus an infinitive refers to a duty that still needs to be done.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['She is interested in learn Spanish.', 'She is interested to learning Spanish.', 'She is interested in learning Spanish.', 'She is interested learning Spanish.'],
      correct: 2,
      explanation: 'A preposition (“in”) is always followed by a gerund, never a bare infinitive.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['He is good in cooking.', 'He is good at cook.', 'He is good at cooking.', 'He is good to cook.'],
      correct: 2,
      explanation: 'The preposition “at” is followed by the gerund “cooking”.',
    },
  ],
  quickRevision: [
    'A gerund (verb+ing) acts as a noun; an infinitive is “to” + the base verb.',
    'Some verbs take a gerund: enjoy, avoid, finish, suggest, mind, consider.',
    'Some verbs take an infinitive: want, decide, hope, plan, agree, promise.',
    'A few verbs — start, begin, like, love — can take either with little change in meaning.',
    '“Stop” + gerund = end a habit; “stop” + infinitive = pause to do something else.',
    '“Remember/forget” + gerund = recall a past action; “remember/forget” + infinitive = a duty not yet done.',
    'A preposition is always followed by a gerund, never a bare infinitive.',
  ],
}
