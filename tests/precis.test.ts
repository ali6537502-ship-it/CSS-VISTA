import test from 'node:test'
import assert from 'node:assert/strict'
import { wordCount, lengthInfo, draftKey } from '../src/features/precis/api.ts'
test('Précis counts preserve the native Unicode word convention', () => {
 for (const [text, n] of [['', 0], [' a  real\nprogress ', 3], ['Don’t re-write 2026 reports.', 4], ['پانی اور تعلیم', 3], ['hello—world', 2]] as const) assert.equal(wordCount(text), n)
})
test('Explicit length is measured separately from guidance', () => {
 assert.deepEqual(lengthInfo('one two three four five six', 'one two three', 2), { source: 6, draft: 3, ratio: 50, over: true, remaining: -1 })
 assert.equal(lengthInfo('one two three', 'one two', null).over, false)
 assert.equal(lengthInfo('', '', null).ratio, 0)
})
test('Draft keys separate users, attempts, sources and immutable versions', () => {
 const keys = [draftKey('u1','a1','p1'),draftKey('u2','a1','p1'),draftKey('u1','a2','p1'),draftKey('u1','a1','p2'),draftKey('u1','a1','p1','w1','v1'),draftKey('u1','a1','p1','w1','v2')]
 assert.equal(new Set(keys).size, keys.length)
})
