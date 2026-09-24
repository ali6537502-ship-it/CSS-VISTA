import type { BankQuestion } from './mcq.ts'
import { grammarPhase1 } from './grammar-course/phase1.ts'
import { grammarPhase2 } from './grammar-course/phase2.ts'
import { grammarPhase3 } from './grammar-course/phase3.ts'
import { grammarPhase4 } from './grammar-course/phase4.ts'
import { grammarPhase5 } from './grammar-course/phase5.ts'

// The 30-day grammar course already contains independently authored,
// answer-keyed drills. MPT papers use its examination-level drills only: the
// four-item warm-ups are deliberately excluded, as are the final four lessons
// on précis workflow and long-form revision rather than objective English.
const lessons = [
  ...grammarPhase1,
  ...grammarPhase2,
  ...grammarPhase3,
  ...grammarPhase4,
  ...grammarPhase5,
].filter((lesson) => lesson.day <= 26)

const examinationDrills: BankQuestion[] = lessons.flatMap((lesson) => (
  lesson.drill.map((question) => ({
    id: `mpt-course-english-${question.id}`,
    q: question.prompt,
    o: [...question.options],
    a: question.answer,
    s: lesson.title,
    e: question.why,
    d: 'Advanced',
  }))
))

// Some course drills legitimately reuse a generic instruction such as “Which
// sentence is correct?” with different options. A mock stem should nevertheless
// read as fresh on sight, so retain only the first occurrence of any prompt.
export const mptGrammarCourseEnglishQuestions: BankQuestion[] = examinationDrills.filter((question, index, rows) => (
  rows.findIndex((candidate) => candidate.q === question.q) === index
))
