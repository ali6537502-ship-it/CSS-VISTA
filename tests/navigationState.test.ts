import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_ROUTE_SCROLL_ENTRIES,
  getRouteScrollPosition,
  parseRouteScrollState,
  resolveScrollIntent,
  updateRouteScrollState,
} from '../src/lib/navigationState.ts'

test('stored scroll positions tolerate corrupted and invalid session data', () => {
  assert.deepEqual(parseRouteScrollState('{broken'), [])
  assert.deepEqual(parseRouteScrollState(JSON.stringify([{ key: '', position: 5 }, { key: 'valid', position: -4, updatedAt: 2 }])), [
    { key: 'valid', position: 0, updatedAt: 2 },
  ])
})

test('stored scroll positions are deduplicated and bounded', () => {
  let state = parseRouteScrollState(null)
  for (let index = 0; index < MAX_ROUTE_SCROLL_ENTRIES + 10; index += 1) {
    state = updateRouteScrollState(state, `route-${index}`, index * 10, index)
  }
  assert.equal(state.length, MAX_ROUTE_SCROLL_ENTRIES)
  assert.equal(getRouteScrollPosition(state, `route-${MAX_ROUTE_SCROLL_ENTRIES + 9}`), (MAX_ROUTE_SCROLL_ENTRIES + 9) * 10)
  assert.equal(getRouteScrollPosition(state, 'route-0'), undefined)
})

test('navigation decisions restore only known history entries', () => {
  const base = {
    previousPathname: '/past-papers',
    pathname: '/past-papers',
    previousHash: '',
    hash: '',
  }
  assert.equal(resolveScrollIntent({ ...base, navigationType: 'POP', hasSavedPosition: true }), 'restore')
  assert.equal(resolveScrollIntent({ ...base, navigationType: 'POP', hasSavedPosition: false }), 'preserve')
})

test('query-only updates preserve position while hashes and new pages receive explicit targets', () => {
  const base = { previousHash: '', hash: '', hasSavedPosition: false } as const
  assert.equal(resolveScrollIntent({ ...base, navigationType: 'PUSH', previousPathname: '/gk', pathname: '/gk' }), 'preserve')
  assert.equal(resolveScrollIntent({ ...base, navigationType: 'REPLACE', previousPathname: '/gk', pathname: '/gk' }), 'preserve')
  assert.equal(resolveScrollIntent({ ...base, navigationType: 'PUSH', previousPathname: '/gk', pathname: '/past-papers' }), 'top')
  assert.equal(resolveScrollIntent({ ...base, navigationType: 'PUSH', previousPathname: '/guide', pathname: '/guide', hash: '#eligibility' }), 'hash')
})
