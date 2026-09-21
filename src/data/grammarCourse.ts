/**
 * The 30-day grammar course.
 *
 * Every lesson, example and drill item on this course is written for the day it
 * belongs to. Practice is NOT drawn from the shared English MCQ bank: that bank
 * holds mostly analogies, synonyms and one-word substitutions, so a student
 * studying subject–verb agreement was previously served questions from an
 * entirely different topic. Authored practice is the fix, and it must stay that
 * way.
 */
import { grammarPhase1 } from './grammar-course/phase1'
import { grammarPhase2 } from './grammar-course/phase2'
import { grammarPhase3 } from './grammar-course/phase3'
import { grammarPhase4 } from './grammar-course/phase4'
import { grammarPhase5 } from './grammar-course/phase5'
import type { GrammarLesson } from './grammar-course/types'

export type {
  GrammarLesson,
  GrammarExample,
  GrammarQuestion,
  GrammarQuestionKind,
  GrammarCorrection,
  GrammarRule,
  GrammarTable,
  GrammarTerm,
} from './grammar-course/types'
export { GRAMMAR_PHASES, grammarPhaseColors } from './grammar-course/types'
export { grammarToolkit, type ToolkitTable } from './grammar-course/toolkit'

export const grammarLessons: GrammarLesson[] = [
  ...grammarPhase1,
  ...grammarPhase2,
  ...grammarPhase3,
  ...grammarPhase4,
  ...grammarPhase5,
]

/** Total number of auto-marked questions across the whole course. */
export const grammarQuestionCount = grammarLessons.reduce(
  (total, lesson) => total + lesson.warmUp.length + lesson.drill.length,
  0,
)

/** Total number of write-then-check sentence corrections. */
export const grammarCorrectionCount = grammarLessons.reduce(
  (total, lesson) => total + lesson.corrections.length,
  0,
)

/** Total number of worked wrong → right → why examples. */
export const grammarExampleCount = grammarLessons.reduce(
  (total, lesson) => total + lesson.examples.length,
  0,
)

export function grammarLessonForDay(day: number): GrammarLesson {
  return grammarLessons.find((lesson) => lesson.day === day) ?? grammarLessons[0]
}
