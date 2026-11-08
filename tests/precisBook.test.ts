import test from 'node:test'
import { readFileSync } from 'node:fs'
import { handbookUnits } from '../src/features/precis/guideModel.ts'
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

test('earlier positional notes and completions match only identical real source sections', () => {
 const prior = JSON.parse(readFileSync(new URL('../data-archive/precis/stored-edition-before-restoration.json', import.meta.url), 'utf8'))
 const catalogue = JSON.parse(readFileSync(new URL('../public/api/_precis_handbook.php', import.meta.url), 'utf8').split("<<<'HANDBOOK'\n")[1].split('\nHANDBOOK,')[0])
 const compat = JSON.parse(readFileSync(new URL('../public/api/_precis_reading_compat.php', import.meta.url), 'utf8').split("<<<'COMPAT'\n")[1].split('\nCOMPAT,')[0])
 const oldUnits = handbookUnits(prior.chapters), newUnits = handbookUnits(catalogue.chapters)
 assert.equal(oldUnits.length,108)
 assert.equal(newUnits.length,121)
 assert.deepEqual(compat.units.map((unit: {id:string;section:string})=>[unit.id,unit.section]), oldUnits.map(unit=>[unit.id,unit.section]))
 assert.equal(compat.units.filter((unit: {matched_unit_id:string|null})=>unit.matched_unit_id !== null).length,94)
 for (const unit of compat.units) {
  if (unit.matched_unit_id === null) continue
  const oldUnit = oldUnits.find(item=>item.id===unit.id)!
  const newUnit = newUnits.find(item=>item.id===unit.matched_unit_id)!
  assert.equal(oldUnit.chapterId,newUnit.chapterId)
  assert.deepEqual(oldUnit.blocks.map(item=>item.block),newUnit.blocks.map(item=>item.block),'Earlier completion mapped onto changed source text')
 }
 assert.equal(compat.units.find((unit: {id:string})=>unit.id==='18:0').matched_unit_id,null,'Placeholder note attached to restored worked example')
 assert.equal(compat.current_content_sha256,catalogue.content_sha256)
 assert.equal(compat.legacy_source_sha256,catalogue.source_sha256,'The original raw hash did not change; content identity must change')
 assert.notEqual(catalogue.content_sha256,compat.legacy_content_sha256)
})
