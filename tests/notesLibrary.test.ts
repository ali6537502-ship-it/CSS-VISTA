import test from 'node:test'
import assert from 'node:assert/strict'
import {
  findNoteDocument,
  getVisibleBundleIncludes,
  getVisibleNoteProducts,
  isEuropeanHistoryTemporarilyHidden,
} from '../src/data/notes.ts'

test('European History notes are hidden only for the requested Pakistan date', () => {
  const duringRequestedDay = Date.parse('2026-08-31T12:00:00+05:00')
  const afterRequestedDay = Date.parse('2026-09-01T00:00:01+05:00')

  assert.equal(isEuropeanHistoryTemporarilyHidden(duringRequestedDay), true)
  assert.equal(getVisibleNoteProducts(duringRequestedDay).some((item) => item.id === 'european-history'), false)
  assert.equal(getVisibleBundleIncludes(duringRequestedDay).includes('European History'), false)

  assert.equal(isEuropeanHistoryTemporarilyHidden(afterRequestedDay), false)
  assert.equal(getVisibleNoteProducts(afterRequestedDay).some((item) => item.id === 'european-history'), true)
  assert.equal(getVisibleBundleIncludes(afterRequestedDay).includes('European History'), true)
})

test('genuine complete sources replace the annotated preview entries', () => {
  const cpec = findNoteDocument('ca-pa', 'cpec')?.document
  const pakistanIndia = findNoteDocument('ca-pa', 'pakistan-india-relations-pages')?.document
  const stateSystem = findNoteDocument('political-science', 'state-system-pages')?.document

  assert.deepEqual({ kind: cpec?.kind, pages: cpec?.pages }, { kind: 'docx', pages: 19 })
  assert.deepEqual({ kind: pakistanIndia?.kind, pages: pakistanIndia?.pages }, { kind: 'pdf', pages: 36 })
  assert.deepEqual({ kind: stateSystem?.kind, pages: stateSystem?.pages }, { kind: 'pdf', pages: 33 })
  assert.equal(findNoteDocument('political-science', 'state-system-pdf')?.document.id, 'state-system-pages')
})
