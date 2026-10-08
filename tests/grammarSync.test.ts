import test from 'node:test'
import assert from 'node:assert/strict'
import { courseKey, normalizeCourse } from '../src/features/grammar/state.ts'
import { acknowledgeSave, attemptChoiceKey, readAttemptChoice, prepareSave, receiveAccount, syncKey, type SyncEnvelope } from '../src/features/grammar/sync.ts'
const state = normalizeCourse({}, [])
const envelope: SyncEnvelope = { state, version: 3, dirty: true, importBrowser: false }
test('account and attempt namespaces never alias old account or guest work', () => {
  assert.notEqual(courseKey('a', 'x'), courseKey('a', 'y'))
  assert.notEqual(courseKey('a', 'x'), courseKey('b', 'x'))
  assert.notEqual(courseKey('a', 'x'), courseKey('a'))
  assert.notEqual(syncKey('a', 'x'), syncKey('b', 'x'))
  const id = '11111111-1111-4111-8111-111111111111', values = new Map([[attemptChoiceKey('a'), id]])
  assert.equal(readAttemptChoice({ getItem: key => values.get(key) ?? null }, 'a'), id)
  assert.equal(readAttemptChoice({ getItem: key => values.get(key) ?? null }, 'b'), undefined)
  values.set(attemptChoiceKey('a'), 'browser')
  assert.equal(readAttemptChoice({ getItem: key => values.get(key) ?? null }, 'a'), undefined)
})
test('interrupted saves retain the exact identity, base version and payload despite later edits', () => {
  const pending = prepareSave(envelope, 'attempt', 'request')
  const edited = { ...pending, state: { ...state, notes: { '1': 'Newer draft' } } }
  const retried = prepareSave(JSON.parse(JSON.stringify(edited)), 'attempt', 'different-request')
  assert.deepEqual(retried.pending, pending.pending)
  const acknowledged = acknowledgeSave(retried, 'request', 4)
  assert.equal(acknowledged.version, 4)
  assert.equal(acknowledged.pending, undefined)
  assert.equal(acknowledged.dirty, true)
  assert.equal(acknowledged.state.notes['1'], 'Newer draft')
  assert.equal(prepareSave(acknowledged, 'attempt', 'next').pending?.expected_version, 4)
})
test('replayed acknowledgement cannot clear a different in-flight snapshot', () => {
  const pending = prepareSave(envelope, 'attempt', 'request')
  assert.equal(acknowledgeSave(pending, 'other', 99), pending)
  assert.equal(acknowledgeSave(pending, 'request', 4).dirty, false)
})
test('fresh account history replaces clean cache; unsaved cache conflicts rather than overwrites', () => {
  const server = { ...state, notes: { '2': 'Other device' } }
  assert.deepEqual(receiveAccount({ ...envelope, dirty: false }, 4, server).envelope.state, server)
  const result = receiveAccount(envelope, 4, server)
  assert.equal(result.conflict, true)
  assert.equal(result.envelope, envelope)
})
test('pending lost-response recovery replays before deciding that an advanced server version conflicts', () => {
  const pending = prepareSave({ ...envelope, importBrowser: true }, 'attempt', 'request')
  assert.equal(receiveAccount(pending, 4, state).conflict, false)
  const done = acknowledgeSave(pending, 'request', 4)
  assert.equal(done.importBrowser, false)
  assert.equal(done.dirty, false)
})
