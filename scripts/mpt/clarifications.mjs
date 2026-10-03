import { readFileSync } from 'node:fs'
import { resolveRepairedPaper } from './repair-live-series.mjs'

export const CLARIFICATIONS = JSON.parse(readFileSync('src/data/mpt/release/clarifications.json', 'utf8'))

/** Apply reviewed wording to the exact allocated item; never select a new question. */
export function applyClarifications(papers, bank) {
  const pending = new Map(CLARIFICATIONS.edits.map((e) => [e.id, e]))
  if (pending.size !== CLARIFICATIONS.edits.length) throw new Error('Duplicate editorial clarification id')
  const result = papers.map((paper, i) => paper.map((q) => {
    const edit = pending.get(q.id)
    if (!edit) return q
    const mock = i + 11
    if (mock !== edit.mock || mock < CLARIFICATIONS.first_eligible_mock) throw new Error(`${q.id}: clarification moved to an ineligible paper`)
    if (q.q !== edit.before || q.o[q.a] !== edit.answer) throw new Error(`${q.id}: original item changed; review the clarification again`)
    if (edit.replacement) {
      if (!edit.reason || edit.replacement.src !== 'bank') throw new Error(`${q.id}: incomplete reviewed replacement`)
      pending.delete(q.id)
      return resolveRepairedPaper({ questions: [edit.replacement] }, bank, {})[0]
    }
    if (!edit.reason || !edit.explanation || edit.after.length > 420) throw new Error(`${q.id}: incomplete editorial clarification`)
    pending.delete(q.id)
    return { ...q, q: edit.after, e: edit.explanation, meta: { ...q.meta, editorial_clarification: CLARIFICATIONS.release } }
  }))
  if (pending.size) throw new Error(`Editorial clarifications reference absent questions: ${[...pending.keys()].join(', ')}`)
  return result
}
