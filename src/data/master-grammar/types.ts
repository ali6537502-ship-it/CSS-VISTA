// Shared data shapes for the 30-Day English Grammar Course.
// Every lesson file (day01to05.ts ... day26to30.ts) exports an array of
// GrammarDay objects that follow this shape directly — there is no
// after-the-fact "polish" or patch step. If a sentence needs to be fixed,
// it is fixed here, at the source.

export type PracticeStage =
  | 'Recognise it'
  | 'Fill in the blank'
  | 'Choose the correct form'
  | 'Correct the sentence'
  | 'Exam-style'

export interface CoreRule {
  rule: string
  explanation: string
  correct: string
  wrong?: string
  correction?: string
}

export interface CommonMistake {
  wrong: string
  right: string
  why: string
}

export interface PracticeItem {
  stage: PracticeStage
  prompt: string
  answer: string
  reason: string
}

export interface QuizQuestion {
  question: string
  options: [string, string, string, string]
  correct: number
  explanation: string
}

export interface ComparisonTable {
  title: string
  columnA: string
  columnB: string
  rows: [string, string][]
}

export interface TenseBreakdown {
  name: string
  use: string[]
  structure: string
  positive: string
  negative: string
  question: string
  examples: string[]
  signalWords?: string[]
  commonMistake?: { wrong: string; right: string; why: string }
  note?: string
}

export interface GrammarDay {
  day: number
  stage: number
  stageTitle: string
  title: string
  whatYouWillLearn: string
  simpleExplanation: string[]
  rules: CoreRule[]
  tenses?: TenseBreakdown[]
  comparison?: ComparisonTable
  easyExamples: string[]
  practicalExamples: string[]
  examExamples: string[]
  commonMistakes: CommonMistake[]
  memoryTip: string
  practice: PracticeItem[]
  quiz: QuizQuestion[]
  quickRevision: string[]
  isReview?: boolean
  isFinal?: boolean
  scoringGuidance?: string[]
}

export function stageOf(day: number): { stage: number; stageTitle: string } {
  if (day <= 8) return { stage: 1, stageTitle: 'Foundations' }
  if (day <= 16) return { stage: 2, stageTitle: 'Tenses and Sentence Building' }
  if (day <= 22) return { stage: 3, stageTitle: 'Accuracy and Common Errors' }
  if (day <= 27) return { stage: 4, stageTitle: 'Correction and Improvement' }
  return { stage: 5, stageTitle: 'Final Practice' }
}
