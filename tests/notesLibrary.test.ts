import test from 'node:test'
import assert from 'node:assert/strict'
import {
  findNoteDocument,
  getNoteDisplayPrice,
  getVisibleBundleIncludes,
  getVisibleNoteProducts,
  isEuropeanHistoryTemporarilyHidden,
  isNotesDiscountActive,
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

test('owner-removed preview cards are absent from the public notes catalogue', () => {
  const removedIds = [
    'internal-security',
    'biological-theory-crime',
    'legal-ethical-investigation',
    'iqbal-political-thought',
    'social-contract-theorists',
  ]
  const publicIds = getVisibleNoteProducts(Date.parse('2026-08-31T12:00:00+05:00'))
    .flatMap((product) => product.samples.map((sample) => sample.id))

  assert.ok(removedIds.every((id) => !publicIds.includes(id)))
})

test('owner-supplied topic coverage and today prices are preserved exactly', () => {
  const products = getVisibleNoteProducts(Date.parse('2026-08-31T12:00:00+05:00'))
  const currentPakistan = products.find((product) => product.id === 'ca-pa')!
  const politicalScience = products.find((product) => product.id === 'political-science')!
  const criminology = products.find((product) => product.id === 'criminology')!
  const duringOffer = Date.parse('2026-08-31T12:00:00+05:00')
  const afterOffer = Date.parse('2026-09-01T00:00:01+05:00')

  assert.equal(currentPakistan.topics.length, 86)
  assert.equal(politicalScience.topics.length, 42)
  assert.equal(criminology.topics.length, 23)
  assert.deepEqual(
    [currentPakistan, politicalScience, criminology].map((product) => getNoteDisplayPrice(product, duringOffer).price),
    [4900, 2800, 2530],
  )
  assert.equal(isNotesDiscountActive(duringOffer), true)
  assert.equal(isNotesDiscountActive(afterOffer), false)
  assert.deepEqual(
    [currentPakistan, politicalScience, criminology].map((product) => getNoteDisplayPrice(product, afterOffer).price),
    [7000, 4000, 3600],
  )
})
