import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { getAdRoutePolicy } from '../src/lib/ads.ts'
test('retired summary routes cannot advertise',()=>{
 for(const p of ['/book-summaries','/book-summaries/why-nations-fail'])assert.equal(getAdRoutePolicy(p).autoAdsEnabled,false)
})
test('source and saved-record implementation retained while publication is retired',()=>{
 assert.ok(existsSync(new URL('../public/book-summaries/index.json',import.meta.url)))
 assert.match(readFileSync(new URL('../src/lib/progress.ts',import.meta.url),'utf8'),/getAllBookSummaryProgress/)
})
test('production retirement artifact blocks all old entry points',async()=>{await import('../scripts/audit-book-removal.mjs')})
