import test from 'node:test'
import assert from 'node:assert/strict'
import { bookChapter, precisHref, precisView } from '../src/features/precis/bookModel.ts'
const chapters = [{ id:'1', title:'First', blocks:[] }, { id:'18', title:'Examples', blocks:[] }]
test('book is the default and legacy reading links still resolve to the same book', () => {
 for (const query of ['', 'view=guide', 'view=course&chapter=18']) assert.equal(precisView(new URLSearchParams(query)), 'book')
 assert.equal(bookChapter(chapters, '18', 1).id, '18')
 assert.equal(bookChapter(chapters, 'missing', 18).id, '18')
 assert.equal(bookChapter(chapters, null, 99).id, '1')
})
test('saved writing and revision deep links remain reachable', () => {
 assert.equal(precisView(new URLSearchParams('writing=owned&version=older')), 'history')
 assert.equal(precisView(new URLSearchParams('view=write&writing=owned')), 'write')
 assert.equal(precisView(new URLSearchParams('view=timed')), 'write')
 const params = new URLSearchParams('attempt=own&writing=old&version=v1&unit_step=7&day=5')
 const book = new URL(precisHref(params, 'book', { chapter:'18' }), 'https://www.css-vista.com')
 assert.equal(book.searchParams.get('attempt'), 'own')
 assert.equal(book.searchParams.get('chapter'), '18')
 for (const key of ['writing','version','unit_step','day']) assert.equal(book.searchParams.has(key), false)
 const revision = new URL(precisHref(params, 'write', { writing:'owned' }), 'https://www.css-vista.com')
 assert.equal(revision.searchParams.get('writing'), 'owned')
 assert.equal(revision.searchParams.has('version'), false, 'Revision starts from the latest version')
 assert.equal(params.get('version'), 'v1', 'Navigation does not mutate an existing URL object')
})
