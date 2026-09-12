import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { cardSchema, storySchema, safeReturnTo, safeSourceUrl, dateFilters, pakistanDate, shiftDate } from '../src/features/current-affairs/model.ts'

const fixture = JSON.parse(readFileSync(new URL('../examples/current-affairs/test-edition.json', import.meta.url), 'utf8'))
const makeStory = () => ({ ...fixture.stories[0], publication_date: fixture.date, saved: false, reading_status: 'unread', reading_minutes: 3 })
test('optional sections are safe and missing facts do not break cards', () => {
  const item = cardSchema.parse({ ...fixture.stories[1], publication_date: fixture.date })
  assert.deepEqual(item.statistics, [])
  assert.deepEqual(item.quick_gk, [])
  assert.equal(item.reading_status, 'unread')
})
test('full analyses require original sources and reject unsafe URLs', () => {
  assert.equal(storySchema.safeParse({ ...makeStory(), sources: [] }).success, false)
  assert.equal(safeSourceUrl('javascript:alert(1)'), false)
  assert.equal(safeSourceUrl('https://user:pass@example.org/report'), false)
  assert.equal(safeSourceUrl('https://example.org/report?edition=2'), true)
})
test('unsourced or undated statistics are never rendered; source text stays exact', () => {
  const original = makeStory()
  const result = storySchema.parse({ ...original, statistics: [...original.statistics,
    { label: 'Bad', value: '91%', source: 'Invented publisher', year: '2099' },
    { label: 'Undated', value: '9', source: original.sources[0].publisher },
  ] })
  assert.deepEqual(result.statistics, original.statistics)
  assert.deepEqual(result.sources, original.sources)
})
test('login return routes cannot escape the site', () => {
  for (const input of ['https://example.org', '//example.org', '/\\example.org', '/\nexample.org', null]) assert.equal(safeReturnTo(input), '/account/dashboard')
  assert.equal(safeReturnTo('/factbook?category=Economy'), '/factbook?category=Economy')
})
test('edition dates use Pakistan time, including midnight and month boundaries', () => {
  assert.equal(pakistanDate(new Date('2026-09-11T20:30:00Z')), '2026-09-12')
  assert.equal(shiftDate('2026-03-01', -1), '2026-02-28')
  const params = dateFilters(new URLSearchParams('range=custom&from=2026-09-10&to=2026-09-10'))
  assert.equal(params.get('date'), '2026-09-10')
  assert.equal(dateFilters(new URLSearchParams('range=all&from=2026-09-10')).has('from'), false)
})
