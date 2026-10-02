import type { GrammarDay } from './types'
import { stageOf } from './types'

export const day16: GrammarDay = {
  day: 16,
  ...stageOf(16),
  title: 'Conditionals',
  whatYouWillLearn:
    'You will learn the four main types of conditional sentences — zero, first, second, and third — and how to choose the right one for real, possible, or imagined situations.',
  simpleExplanation: [
    'Many sentences describe a condition and a result: if one thing happens, another thing follows. The part with “if” is the condition; the rest of the sentence is the result.',
    'English has a few set patterns for this, depending on how real or likely the situation is: an always-true fact, a real possibility in the future, something imagined or unlikely, or something in the past that never actually happened.',
    'You do not need to memorise the names first. Instead, ask yourself one question: how real or possible is this situation? The answer points you to the right pattern.',
  ],
  rules: [
    {
      rule: 'The Zero Conditional describes general truths and facts.',
      explanation: 'Both the if-clause and the main clause use the present simple.',
      correct: 'If you heat ice, it melts.',
    },
    {
      rule: 'The First Conditional describes a real possibility in the future.',
      explanation: 'The if-clause uses the present simple, and the main clause uses “will” plus the base verb.',
      correct: 'If Sara wakes up late, she will miss the bus.',
    },
    {
      rule: 'The Second Conditional describes an unreal or hypothetical present situation, or an unlikely future one.',
      explanation: 'The if-clause uses the past simple, and the main clause uses “would” plus the base verb.',
      correct: 'If I had more money, I would travel more.',
    },
    {
      rule: 'The Third Conditional describes an unreal past situation — something that did not actually happen.',
      explanation: 'The if-clause uses the past perfect, and the main clause uses “would have” plus the past participle.',
      correct: 'If she had studied, she would have passed.',
    },
    {
      rule: 'A mixed conditional can combine a past condition with a present result, or the reverse.',
      explanation: 'This is less common and does not need to be memorised in detail — just recognise it when you see it.',
      correct: 'If she had taken that job, she would be living in Karachi now.',
    },
    {
      rule: 'Never use “will” or “would” inside the if-clause itself.',
      explanation: '“Will” and “would” belong in the result (main) clause, not the condition.',
      correct: 'If it rains, we will cancel the trip.',
      wrong: 'If it will rain, we will cancel the trip.',
      correction: 'Remove “will” from the if-clause; the if-clause needs the present simple, not “will”.',
    },
    {
      rule: 'The order of the clauses can be reversed; only the comma changes.',
      explanation: 'Use a comma when the if-clause comes first; no comma is needed when the main clause comes first.',
      correct: 'We will cancel the trip if it rains. / If it rains, we will cancel the trip.',
    },
    {
      rule: '“Unless” means “if not”, and is often used instead of “if…not”.',
      explanation: 'Do not add an extra negative after “unless”, since the negative meaning is already built in.',
      correct: 'Unless you hurry, you will miss the train.',
      wrong: 'Unless you don’t hurry, you will miss the train.',
      correction: '“Unless” already means “if not”, so adding “don’t” creates a double negative.',
    },
  ],
  comparison: {
    title: 'Zero vs First Conditional',
    columnA: 'Zero conditional (general truth / fact)',
    columnB: 'First conditional (real future possibility)',
    rows: [
      ['If you heat ice, it melts.', 'If the sun comes out, the snow will melt.'],
      ['If plants do not get water, they die.', 'If you forget to water this plant, it will die.'],
      ['If you mix red and blue, you get purple.', 'If you mix these two chemicals, you will get a reaction.'],
    ],
  },
  easyExamples: [
    'If you heat water to 100°C, it boils.',
    'If Ali calls me, I will tell him the news.',
    'If I won the lottery, I would buy a house.',
    'If they had left earlier, they would have caught the train.',
  ],
  practicalExamples: [
    'If interest rates rise, borrowing costs increase.',
    'If the company reduces its prices, more customers will buy the product.',
    'If the government increased the budget, more schools would be built.',
    'If the inspection had been carried out properly, the fault would have been found.',
  ],
  examExamples: [
    'If the reforms are implemented gradually, resistance will be minimal.',
    'If more resources were allocated to rural healthcare, outcomes would improve significantly.',
    'Had the negotiations continued a little longer, an agreement would have been reached.',
  ],
  commonMistakes: [
    {
      wrong: 'If it will rain, we will cancel the trip.',
      right: 'If it rains, we will cancel the trip.',
      why: '“Will” never belongs inside the if-clause; the if-clause uses the present simple.',
    },
    {
      wrong: 'If I would have more money, I would travel more.',
      right: 'If I had more money, I would travel more.',
      why: 'The second conditional if-clause uses the simple past, not “would”.',
    },
    {
      wrong: 'If she would have studied, she would have passed.',
      right: 'If she had studied, she would have passed.',
      why: 'The third conditional if-clause uses the past perfect (“had studied”), not “would have”.',
    },
    {
      wrong: 'If you heat ice, it melted.',
      right: 'If you heat ice, it melts.',
      why: 'A zero conditional describing a general truth uses the present simple in both clauses.',
    },
    {
      wrong: 'Unless you don’t hurry, you will miss the train.',
      right: 'Unless you hurry, you will miss the train.',
      why: '“Unless” already means “if not”, so adding “don’t” creates an unnecessary double negative.',
    },
  ],
  memoryTip:
    '“IF” and “WILL/WOULD” never share a clause: “will” and “would” always belong to the result, not the condition. If you hear “will” or “would” right after “if”, that is your signal to fix it.',
  practice: [
    {
      stage: 'Recognise it',
      prompt: 'Which conditional type is this: “If you boil water, it evaporates”?',
      answer: 'Zero Conditional.',
      reason: 'It describes a general scientific truth using the present simple in both clauses.',
    },
    {
      stage: 'Recognise it',
      prompt: 'Which conditional type is this: “If I had more time, I would learn to paint”?',
      answer: 'Second Conditional.',
      reason: 'It describes an unreal or hypothetical present situation using the past simple plus “would”.',
    },
    {
      stage: 'Recognise it',
      prompt: 'Which conditional type is this: “If he had left earlier, he would have caught the train”?',
      answer: 'Third Conditional.',
      reason: 'It describes an unreal past situation using the past perfect plus “would have” and a past participle.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'If you ____ (mix) yellow and blue, you get green.',
      answer: 'mix',
      reason: 'The zero conditional uses the present simple in the if-clause.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'If she ____ (study) harder, she will pass the exam.',
      answer: 'studies',
      reason: 'The first conditional if-clause uses the present simple, not “will”.',
    },
    {
      stage: 'Fill in the blank',
      prompt: 'If they ____ (have) more staff, they would finish the project faster.',
      answer: 'had',
      reason: 'The second conditional if-clause uses the simple past.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'If it (rain / rains / will rain) tonight, the match will be postponed.',
      answer: 'rains',
      reason: 'The first conditional if-clause always uses the present simple.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'If I (am / was / were) you, I would apologise.',
      answer: 'were',
      reason: '“Were” is the traditional form used for all subjects in this kind of sentence, though “was” is also common informally.',
    },
    {
      stage: 'Choose the correct form',
      prompt: 'If she (has studied / had studied / studied) harder, she would have passed.',
      answer: 'had studied',
      reason: 'The third conditional if-clause uses the past perfect.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'If it will rain, we will cancel the picnic.',
      answer: 'If it rains, we will cancel the picnic.',
      reason: 'The if-clause never contains “will”; it uses the present simple.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'If I would win the competition, I would be thrilled.',
      answer: 'If I won the competition, I would be thrilled.',
      reason: 'The second conditional if-clause uses the simple past, not “would”.',
    },
    {
      stage: 'Correct the sentence',
      prompt: 'If he had arrived on time, he will have caught the flight.',
      answer: 'If he had arrived on time, he would have caught the flight.',
      reason: 'The third conditional main clause needs “would have”, not “will have”.',
    },
    {
      stage: 'Exam-style',
      prompt: 'If the funding had been increase earlier, the project would have been completed on schedule.',
      answer: 'If the funding had been increased earlier, the project would have been completed on schedule.',
      reason: 'The passive past participle “increased” is needed after “had been”, not the base form “increase”.',
    },
    {
      stage: 'Exam-style',
      prompt: 'Unless the report is finish by Friday, the launch will be delayed.',
      answer: 'Unless the report is finished by Friday, the launch will be delayed.',
      reason: 'The passive needs the past participle “finished” after “is”, not the base form “finish”.',
    },
  ],
  quiz: [
    {
      question: 'Which sentence is a zero conditional?',
      options: ['If you heat ice, it melts.', 'If you heat ice, it will melt.', 'If you heated ice, it would melt.', 'If you had heated ice, it would have melted.'],
      correct: 0,
      explanation: 'The zero conditional describes a general truth using the present simple in both clauses.',
    },
    {
      question: 'Which sentence is a first conditional?',
      options: ['If Ali misses the bus, he is late for class.', 'If Ali misses the bus, he will be late for class.', 'If Ali missed the bus, he would be late for class.', 'If Ali had missed the bus, he would have been late for class.'],
      correct: 1,
      explanation: 'The first conditional describes a real future possibility with the present simple in the if-clause and “will” in the main clause.',
    },
    {
      question: 'Which sentence is a second conditional?',
      options: ['If I have more money, I will travel more.', 'If I had more money, I would travel more.', 'If I had had more money, I would have travelled more.', 'If I have had more money, I travel more.'],
      correct: 1,
      explanation: 'The second conditional uses the past simple in the if-clause and “would” in the main clause for an unreal present situation.',
    },
    {
      question: 'Which sentence is a third conditional?',
      options: ['If she studies harder, she will pass.', 'If she studied harder, she would pass.', 'If she had studied harder, she would have passed.', 'If she has studied harder, she would pass.'],
      correct: 2,
      explanation: 'The third conditional describes an unreal past situation using the past perfect plus “would have” and a past participle.',
    },
    {
      question: 'Which sentence correctly avoids “will” inside the if-clause?',
      options: ['If it will rain, we will cancel the trip.', 'If it rains, we will cancel the trip.', 'If it is raining, we will cancelled the trip.', 'If it rain, we will cancel the trip.'],
      correct: 1,
      explanation: '“Will” never appears inside the if-clause; it belongs only in the main clause.',
    },
    {
      question: 'Which sentence correctly uses “unless”?',
      options: ['Unless you hurry, you will miss the train.', 'Unless you don’t hurry, you will miss the train.', 'Unless you will hurry, you will miss the train.', 'Unless you hurried, you will miss the train.'],
      correct: 0,
      explanation: '“Unless” already means “if not”, so no extra negative is needed, and it takes the same present simple form as a first conditional if-clause.',
    },
    {
      question: 'What does a mixed conditional typically combine?',
      options: ['Two present conditions', 'A past condition with a present result, or the reverse', 'Two unrelated future events', 'A zero conditional with a question'],
      correct: 1,
      explanation: 'Mixed conditionals often combine an unreal past condition with a present result, or the reverse.',
    },
    {
      question: 'Which sentence best fits a mixed conditional (past condition, present result)?',
      options: ['If she had taken that job, she would be living in Karachi now.', 'If she takes that job, she will live in Karachi.', 'If she took that job, she would live in Karachi.', 'If she has taken that job, she would live in Karachi.'],
      correct: 0,
      explanation: 'The if-clause describes an unreal past action, while the main clause describes its present result.',
    },
    {
      question: 'Which sentence correctly forms the third conditional if-clause?',
      options: ['If she would have studied, she would have passed.', 'If she had studied, she would have passed.', 'If she studied, she would have passed.', 'If she has studied, she would have passed.'],
      correct: 1,
      explanation: 'The third conditional if-clause uses the past perfect (“had studied”), not “would have”.',
    },
    {
      question: 'Which conditional type best describes “If you don’t water a plant, it dies”?',
      options: ['First conditional', 'Second conditional', 'Zero conditional', 'Third conditional'],
      correct: 2,
      explanation: 'This describes a general truth that always follows from the condition, which is the zero conditional.',
    },
    {
      question: 'Choose the correct sentence.',
      options: ['If I would be you, I would apologise.', 'If I am you, I would apologise.', 'If I were you, I would apologise.', 'If I will be you, I would apologise.'],
      correct: 2,
      explanation: '“If I were you” is the standard second-conditional form used for giving advice.',
    },
    {
      question: 'Which sentence needs correcting?',
      options: ['If the machine overheats, it shuts down automatically.', 'If the machine will overheat, it shuts down automatically.', 'If the machine overheats, it will shut down automatically.', 'If the machine had overheated, it would have shut down automatically.'],
      correct: 1,
      explanation: '“Will” should never appear inside the if-clause.',
    },
  ],
  quickRevision: [
    'Zero conditional: present simple + present simple, for facts and general truths.',
    'First conditional: present simple (if) + “will” (result), for real future possibilities.',
    'Second conditional: past simple (if) + “would” (result), for unreal or unlikely present situations.',
    'Third conditional: past perfect (if) + “would have” + past participle (result), for unreal past situations.',
    'Mixed conditionals combine a past condition with a present result, or the reverse.',
    'Never put “will” or “would” inside the if-clause itself.',
    '“Unless” means “if not” and does not need an extra negative.',
  ],
}
