import type { OptionalSubject } from '../data/syllabus.ts'

export const optionalSelectionSource = 'https://www.fpsc.gov.pk/assets/media/2024-10-22-01-45-26-Syllabus_for_CE-2016_and_onwards.pdf'

export interface SubjectCombination {
  subjects: OptionalSubject[]
  total: number
  valid: boolean
  violations: string[]
}

// FPSC syllabus, optional-subject table (pages 1–2): choose 600 marks in
// total, within each group's limit. Selecting from every group is not required.
export function validateSubjectCombination(subjects: OptionalSubject[]): SubjectCombination {
  const violations: string[] = []
  const total = subjects.reduce((sum, subject) => sum + subject.marks, 0)
  if (new Set(subjects.map((subject) => subject.name)).size !== subjects.length) {
    violations.push('A subject cannot be selected more than once')
  }
  for (const subject of subjects) {
    if (!Number.isInteger(subject.group) || subject.group < 1 || subject.group > 7) {
      violations.push(`Unknown group for ${subject.name}`)
    } else if ((subject.group === 1 && subject.marks !== 200)
      || (subject.group === 2 && subject.marks !== 100 && subject.marks !== 200)
      || (subject.group >= 3 && subject.marks !== 100)) {
      violations.push(`Invalid marks for ${subject.name}`)
    }
  }
  for (let group = 1; group <= 7; group += 1) {
    const selected = subjects.filter((subject) => subject.group === group)
    if (group === 2) {
      if (selected.length && !(selected.length === 1 && selected[0].marks === 200)
        && !(selected.length === 2 && selected.every((subject) => subject.marks === 100))) {
        violations.push('Group II permits one 200-mark subject or two 100-mark subjects')
      }
    } else if (selected.length > 1) {
      violations.push(`Select at most one subject from Group ${group}`)
    }
  }
  if (total !== 600) violations.push(`Total is ${total}, must be exactly 600`)
  return { subjects, total, valid: violations.length === 0, violations }
}

/** Choose the highest-ranked feasible subjects, without predicting exam marks. */
export function buildSubjectCombination(ranked: OptionalSubject[]): SubjectCombination {
  const unique = ranked.filter((subject, index) => ranked.findIndex((other) => other.name === subject.name) === index)
  const ranks = new Map(unique.map((subject, index) => [subject, index]))
  const sortByRank = (subjects: OptionalSubject[]) => [...subjects].sort((a, b) => ranks.get(a)! - ranks.get(b)!)
  const preferred = (candidate: OptionalSubject[], current: OptionalSubject[]) => {
    // Lexicographic preference: keep the earliest-ranked subject whenever a
    // complete legal combination containing it is possible.
    for (let index = 0; index < Math.min(candidate.length, current.length); index += 1) {
      const difference = ranks.get(candidate[index])! - ranks.get(current[index])!
      if (difference) return difference < 0
    }
    return candidate.length > current.length
  }
  let totals = new Map<number, OptionalSubject[]>([[0, []]])
  for (let group = 1; group <= 7; group += 1) {
    const subjects = unique.filter((subject) => subject.group === group)
    const options: OptionalSubject[][] = [[], ...subjects
      .filter((subject) => subject.marks === (group <= 2 ? 200 : 100))
      .map((subject) => [subject])]
    if (group === 2) {
      const hundreds = subjects.filter((subject) => subject.marks === 100)
      for (let first = 0; first < hundreds.length; first += 1) {
        for (let second = first + 1; second < hundreds.length; second += 1) {
          options.push([hundreds[first], hundreds[second]])
        }
      }
    }
    const nextTotals = new Map<number, OptionalSubject[]>()
    for (const [total, chosen] of totals) {
      for (const option of options) {
        const nextTotal = total + option.reduce((sum, subject) => sum + subject.marks, 0)
        if (nextTotal > 600) continue
        const candidate = sortByRank([...chosen, ...option])
        const current = nextTotals.get(nextTotal)
        if (!current || preferred(candidate, current)) nextTotals.set(nextTotal, candidate)
      }
    }
    totals = nextTotals
  }
  return validateSubjectCombination(totals.get(600) ?? [])
}
