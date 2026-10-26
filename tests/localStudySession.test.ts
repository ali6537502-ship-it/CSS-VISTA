import test from 'node:test'
import assert from 'node:assert/strict'
import { bindLegacyStudySessions, readLocalStudySession, writeLocalStudySession } from '../src/lib/localStudySession.ts'

function storageFixture() {
  const entries = new Map<string, string>()
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value) },
    removeItem: (key: string) => { entries.delete(key) },
  }
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
  return { entries, storage }
}
const timer = 'cssvista:single-answer-timer'

test('legacy recovery belongs only to the known previous account and remains unchanged', () => {
  const { storage } = storageFixture()
  storage.setItem(timer, 'old A timer')
  bindLegacyStudySessions('A')
  assert.equal(readLocalStudySession(timer, 'A'), 'old A timer')
  assert.equal(readLocalStudySession(timer, 'B'), null)
  assert.equal(readLocalStudySession(timer, null), null)
  bindLegacyStudySessions('B')
  assert.equal(writeLocalStudySession(timer, 'new B timer', 'B'), true)
  assert.equal(readLocalStudySession(timer, 'A'), 'old A timer')
  assert.equal(storage.getItem(timer), 'old A timer')
})

test('late callbacks and discarded sessions cannot leak or resurrect previous records', () => {
  const { storage } = storageFixture()
  storage.setItem(timer, 'legacy A')
  bindLegacyStudySessions('A')
  writeLocalStudySession(timer, 'current B', 'B')
  writeLocalStudySession(timer, 'late A callback', 'A')
  assert.equal(readLocalStudySession(timer, 'B'), 'current B')
  writeLocalStudySession(timer, null, 'A')
  assert.equal(readLocalStudySession(timer, 'A'), null)
  assert.equal(storage.getItem(timer), 'legacy A')
})

test('unowned legacy sessions remain guest data and guest updates preserve their existing keys', () => {
  const { storage } = storageFixture()
  storage.setItem(timer, 'guest timer')
  bindLegacyStudySessions(null)
  assert.equal(readLocalStudySession(timer, 'new student'), null)
  assert.equal(readLocalStudySession(timer, null), 'guest timer')
  writeLocalStudySession(timer, 'updated guest', null)
  assert.equal(storage.getItem(timer), 'updated guest')
  assert.equal(readLocalStudySession(timer, 'new student'), null)
})

test('blocked writes return failure without replacing saved recovery', () => {
  const { storage } = storageFixture()
  bindLegacyStudySessions('A')
  writeLocalStudySession(timer, 'saved', 'A')
  storage.setItem = () => { throw new Error('Quota exceeded') }
  assert.equal(writeLocalStudySession(timer, 'unsaved', 'A'), false)
  assert.equal(readLocalStudySession(timer, 'A'), 'saved')
})

test('an expired legacy session without a CSRF cookie never becomes guest recovery', () => {
  const { storage } = storageFixture()
  storage.setItem('cssvista:progress-owner', 'A')
  storage.setItem(timer, 'private legacy A timer')
  assert.equal(readLocalStudySession(timer, null), null)
  writeLocalStudySession(timer, 'guest timer', null)
  assert.equal(readLocalStudySession(timer, null), 'guest timer')
  assert.equal(storage.getItem(timer), 'private legacy A timer')
  bindLegacyStudySessions('A')
  assert.equal(readLocalStudySession(timer, 'A'), 'private legacy A timer')
})

test('a failed legacy binding does not attribute the old record to the next account', () => {
  const { storage } = storageFixture()
  storage.setItem('cssvista:progress-owner', 'A')
  storage.setItem(timer, 'private A')
  const setItem = storage.setItem
  storage.setItem = () => { throw new Error('Quota exceeded') }
  bindLegacyStudySessions('A')
  storage.setItem = setItem
  storage.setItem('cssvista:progress-owner', 'B')
  assert.equal(readLocalStudySession(timer, 'B'), null)
  assert.equal(storage.getItem(timer), 'private A')
})

test('a literal null string is preserved separately from an intentional discard', () => {
  storageFixture()
  bindLegacyStudySessions('A')
  assert.equal(writeLocalStudySession('cssvista:mock-student-name', 'null', 'A'), true)
  assert.equal(readLocalStudySession('cssvista:mock-student-name', 'A'), 'null')
  writeLocalStudySession('cssvista:mock-student-name', null, 'A')
  assert.equal(readLocalStudySession('cssvista:mock-student-name', 'A'), null)
})
