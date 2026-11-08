import type { GrammarDay } from './types'
import { stageOf } from './types'

export const day08: GrammarDay = {
  day: 8,
  ...stageOf(8),
  title: 'Tenses — Revision and Practice',
  isReview: true,
  whatYouWillLearn:
    'You will revise the present, past, and future tenses from the last three days, learn to tell them apart in mixed sentences, and practise choosing the right one quickly.',
  simpleExplanation: [
    'This is a revision day. No brand-new tense is introduced. Instead, you will practise the skill that matters most in real writing and in exams: choosing the correct tense when several are possible.',
    'Most tense mistakes happen when a sentence mixes two time frames — for example, a past action that happened before another past action, or a habit described with the wrong signal word. Today you will train your eye to catch this.',
  ],
  rules: [
    {
      rule: 'Use the Past Simple for a finished action at a stated past time.',
      explanation: 'If the sentence names a specific finished time (yesterday, last week, in 2019), use the Past Simple.',
      correct: 'She called me at noon yesterday.',
    },
    {
      rule: 'Use the Past Continuous for a longer background action interrupted by a shorter one.',
      explanation: 'The longer action is in progress; the shorter action cuts across it.',
      correct: 'I was reading when the lights went out.',
    },
    {
      rule: 'Use the Past Perfect for the earlier of two past actions.',
      explanation: 'When you compare two things that both happened in the past, the one that happened first takes the Past Perfect.',
      correct: 'The train had left before we arrived.',
    },
    {
      rule: 'Use the Future Simple (will) for predictions, promises, and decisions made at the moment of speaking.',
      explanation: '“Will” is the natural choice when you decide something as you speak, or when you are simply predicting.',
      correct: 'I will call you back in five minutes.',
    },
    {
      rule: 'Use “going to” for plans already decided, or predictions based on present evidence.',
      explanation: 'If a decision was made before the moment of speaking, or the present situation clearly points to a result, use “going to”.',
      correct: 'Look at those clouds — it is going to rain.',
    },
    {
      rule: 'Do not mix the Past Simple’s time words with the Present Perfect.',
      explanation: 'Words such as yesterday, last week, and in 2019 need the Past Simple, never the Present Perfect.',
      correct: 'I finished the report yesterday.',
      wrong: 'I have finished the report yesterday.',
      correction: '“Yesterday” is a finished, specific time, so the Past Simple is required.',
    },
  ],
  comparison: {
    title: 'Past Simple vs Present Perfect',
    columnA: 'Past Simple (finished time stated)',
    columnB: 'Present Perfect (time not stated / connects to now)',
    rows: [
      ['I saw that film last week.', 'I have seen that film.'],
      ['She visited Paris in 2019.', 'She has visited Paris.'],
      ['They finished the project yesterday.', 'They have just finished the project.'],
    ],
  },
  easyExamples: [
    'I watched a film last night.',
    'I was watching a film when he called.',
    'I had watched the film before he arrived.',
    'I will watch a film tonight.',
  ],
  practicalExamples: [
    'The board approved the plan last month.',
    'The board was reviewing the plan when the news broke.',
    'The board had approved the plan before the announcement was made.',
    'The board will approve the revised plan next week.',
  ],
  examExamples: [
    'By the time the inquiry concluded, the officials had already resigned.',
    'The economy will likely stabilise once inflation eases.',
  ],
  commonMistakes: [
    {
      wrong: 'I have finished the report yesterday.',
      right: 'I finished the report yesterday.',
      why: 'A definite, finished past time word needs the Past Simple, not the Present Perfect.',
    },
    {
      wrong: 'When I arrived, the meeting finished.',
      right: 'When I arrived, the meeting had already finished.',
      why: 'The earlier of two past actions (the meeting ending) needs the Past Perfect to show it happened before the other one (arriving).',
    },
    {
      wrong: 'I will going to call you later.',
      right: 'I am going to call you later.',
      why: '“Will” and “going to” are two separate future forms and cannot be combined in one verb phrase.',
    },
    {
      wrong: 'She was cooking dinner when I have arrived.',
      right: 'She was cooking dinner when I arrived.',
      why: 'The action that interrupts a past background action needs the Past Simple, not the Present Perfect.',
    },
    {
      wrong: 'By next year, I will finish my degree.',
      right: 'By next year, I will have finished my degree.',
      why: 'An action completed before a stated future time needs the Future Perfect.',
    },
  ],
  memoryTip:
    'Ask three questions in order. One: is the time finished and named? Use the Past Simple. Two: did one past action happen before another? Use the Past Perfect for the earlier one. Three: is the action still open or connected to now? Use the Present Perfect.',
  practice: [
    {
      stage: 'Recognise it',
      prompt: 'Which tense fits: “She ____ (leave) before I ____ (arrive).”?',
      answer: 'had left / arrived',
      reason: 'Leaving happened first, so it takes the Past Perfect; arriving is the later past action, so it takes the Past Simple.',
    },
    {
      stage: 'Recognise it',
      prompt: 'Which tense fits: “I ____ (call) you as soon as I land.”?',
      answer: 'will call',
      reason: 'A decision or promise made at the moment of speaking takes the Future Simple.',
    },
    {
      stage: 'Recognise it',
      prompt: 'Which tense fits: “We ____ (watch) TV when the power went out.”?',
      answer: 'were watching',
      reason: 'The longer background action in progress takes the Past Continuous.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'By the time the doctor arrived, the patient ____ (already / recover).',
      answer: 'had already recovered',
      reason: 'The recovery happened before the doctor’s arrival, so it needs the Past Perfect.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'I ____ (finish) this project by Friday.',
      answer: 'will have finished',
      reason: 'An action completed before a stated future time needs the Future Perfect.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'Look at the sky — it ____ (rain) soon.',
      answer: 'is going to rain',
      reason: 'Present evidence pointing to a result uses “going to”.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'I (saw / have seen) him yesterday at the market.',
      answer: 'saw',
      reason: '“Yesterday” is a stated finished time, so the Past Simple is correct.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'She (has visited / visited) Turkey twice so far.',
      answer: 'has visited',
      reason: '“So far” shows an experience with no fixed time, so the Present Perfect is correct.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'When she called, I (cooked / was cooking) dinner.',
      answer: 'was cooking',
      reason: 'The background action in progress at the moment of the call takes the Past Continuous.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'I have completed the assignment last night.',
      answer: 'I completed the assignment last night.',
      reason: '“Last night” is a finished, stated time, so the Past Simple is needed, not the Present Perfect.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'By the time we reached the station, the train left.',
      answer: 'By the time we reached the station, the train had left.',
      reason: 'The train leaving happened before we reached the station, so the earlier action needs the Past Perfect.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'I am going to finished the report by tomorrow.',
      answer: 'I am going to finish the report by tomorrow.',
      reason: 'After “going to”, the verb stays in its base form.',
    },
    {
      stage: 'Exam-style',
      prompt: 'Officials announced that the inquiry completes its work by next month.',
      answer: 'Officials announced that the inquiry will have completed its work by next month.',
      reason: 'A task expected to finish before a future deadline needs the Future Perfect.',
    },
    {
      stage: 'Exam-style',
      prompt: 'The minister was resigning before the report was even published.',
      answer: 'The minister had resigned before the report was even published.',
      reason: 'The resignation happened before the publication of the report, so the earlier past action needs the Past Perfect, not the Past Continuous.',
    },
  ],
  quiz: [
    {
      question: 'Choose the correct sentence.',
      options: ['I have finished the report yesterday.', 'I finished the report yesterday.', 'I had finish the report yesterday.', 'I finish the report yesterday.'],
      correct: 1,
      explanation: '“Yesterday” is a stated finished time, so the Past Simple is correct.',
    },
    {
      question: 'Which sentence correctly shows one past action happening before another?',
      options: ['The train left before we arrived.', 'The train had left before we arrived.', 'The train has left before we arrived.', 'The train was leaving before we arrived.'],
      correct: 1,
      explanation: 'The earlier of two past actions takes the Past Perfect.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['I will going to call you later.', 'I am going to call you later.', 'I will call going to you later.', 'I am will call you later.'],
      correct: 1,
      explanation: '“Will” and “going to” cannot be combined; “going to” alone is correct here.',
    },
    {
      question: 'Which tense fits: “She ____ dinner when I arrived.”?',
      options: ['cooks', 'cooked', 'was cooking', 'has cooked'],
      correct: 2,
      explanation: 'The Past Continuous describes the background action in progress when the shorter action (arriving) happened.',
    },
    {
      question: 'Choose the correct sentence about a future deadline.',
      options: ['By next year, I will finish my degree.', 'By next year, I will have finished my degree.', 'By next year, I finish my degree.', 'By next year, I am finishing my degree.'],
      correct: 1,
      explanation: 'An action completed before a stated future time needs the Future Perfect.',
    },
    {
      question: 'Which sentence uses the Present Perfect correctly?',
      options: ['I have seen that film last week.', 'I have seen that film.', 'I have see that film.', 'I have saw that film.'],
      correct: 1,
      explanation: 'With no specific past time stated, the Present Perfect is correct.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['When I arrived, the meeting finished.', 'When I arrived, the meeting had already finished.', 'When I arrived, the meeting has finished.', 'When I arrived, the meeting was finished already.'],
      correct: 1,
      explanation: 'The meeting ending happened before the arrival, so the earlier action takes the Past Perfect.',
    },
    {
      question: 'Which word signals the Past Simple rather than the Present Perfect?',
      options: ['already', 'since', 'yesterday', 'just'],
      correct: 2,
      explanation: '“Yesterday” names a finished, specific time, so it pairs with the Past Simple.',
    },
    {
      question: 'Choose the sentence that correctly uses “going to”.',
      options: ['It is going to rains.', 'It is going to rain.', 'It going to rain.', 'It will going to rain.'],
      correct: 1,
      explanation: 'After “going to”, the base form of the verb is used.',
    },
    {
      question: 'Which sentence is correct?',
      options: ['She was cooking dinner when I have arrived.', 'She was cooking dinner when I arrived.', 'She cooked dinner when I have arrived.', 'She has cooked dinner when I arrived.'],
      correct: 1,
      explanation: 'The interrupting action inside a past background scene takes the Past Simple.',
    },
    {
      question: 'Which sentence correctly uses the Future Simple for a spontaneous decision?',
      options: ['I am going to answer the phone.', 'I will answer the phone.', 'I answer the phone.', 'I have answered the phone.'],
      correct: 1,
      explanation: 'A decision made at the moment of speaking is usually expressed with “will”.',
    },
    {
      question: 'Which sentence correctly reports two past events in the right order?',
      options: ['He left after the film had ended.', 'He had left after the film ended.', 'He left after the film ended.', 'He has left after the film ended.'],
      correct: 2,
      explanation: 'Because “after” already shows the order of events, both verbs can simply be in the Past Simple.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['By the time she called, we already left.', 'By the time she called, we had already left.', 'By the time she called, we have already left.', 'By the time she called, we were already leaving.'],
      correct: 1,
      explanation: '“By the time” with a past action often signals that the other action happened earlier, needing the Past Perfect.',
    },
    {
      question: 'Which sentence describes a habit rather than a single past event?',
      options: ['She visited her grandmother every Sunday.', 'She visited her grandmother last Sunday.', 'She was visiting her grandmother last Sunday.', 'She has visited her grandmother once.'],
      correct: 0,
      explanation: '“Every Sunday” shows a repeated past habit, correctly expressed with the Past Simple.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['I will have finished my degree by next year.', 'I have finished my degree by next year.', 'I finish my degree by next year.', 'I am finished my degree by next year.'],
      correct: 0,
      explanation: 'The Future Perfect is used for an action expected to be complete before a stated future time.',
    },
  ],
  quickRevision: [
    'Past Simple: a finished action at a stated time (yesterday, last week, in 2019).',
    'Past Continuous: a background action in progress, often interrupted by a shorter one.',
    'Past Perfect: the earlier of two past actions.',
    'Present Perfect: an unspecified past time connected to now — never use it with words like yesterday.',
    'Future Simple (will): predictions and spot decisions; “going to”: plans already made or evidence-based predictions.',
    'Future Perfect: an action expected to be finished before a stated future time.',
  ],
}
