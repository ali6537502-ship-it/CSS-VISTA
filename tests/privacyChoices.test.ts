import test from 'node:test'
import assert from 'node:assert/strict'
import { requestPrivacyChoices, type PrivacyWindow } from '../src/lib/privacyChoices.ts'

test('waits for documented readiness and uses the current API object only once', () => {
  const target: PrivacyWindow = {}
  const results: string[] = []
  let calls = 0
  const cancel = requestPrivacyChoices(target, result => results.push(result))
  const queue = target.googlefc!.callbackQueue as { CONSENT_API_READY: () => void }[]
  assert.equal(calls, 0)
  assert.deepEqual(results, [])
  target.googlefc = { showRevocationMessage: () => { calls++ } }
  queue[0].CONSENT_API_READY()
  queue[0].CONSENT_API_READY()
  assert.equal(calls, 1)
  assert.deepEqual(results, ['requested'])
  cancel()
})
test('already-ready Google queue executes synchronously', () => {
  let calls = 0
  const target: PrivacyWindow = { googlefc: { showRevocationMessage: () => { calls++ }, callbackQueue: { push: entry => entry.CONSENT_API_READY() } } }
  const results: string[] = []
  requestPrivacyChoices(target, result => results.push(result))()
  assert.equal(calls, 1)
  assert.deepEqual(results, ['requested'])
})
test('unavailable service times out and cannot revoke consent later', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const target: PrivacyWindow = {}
  const results: string[] = []
  let calls = 0
  requestPrivacyChoices(target, result => results.push(result))
  const queue = target.googlefc!.callbackQueue as { CONSENT_API_READY: () => void }[]
  t.mock.timers.tick(10000)
  assert.deepEqual(results, ['unavailable'])
  target.googlefc!.showRevocationMessage = () => { calls++ }
  queue[0].CONSENT_API_READY()
  assert.equal(calls, 0)
})
test('unmounted control cancels a queued user request', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const target: PrivacyWindow = {}
  const results: string[] = []
  let calls = 0
  const cancel = requestPrivacyChoices(target, result => results.push(result))
  const queue = target.googlefc!.callbackQueue as { CONSENT_API_READY: () => void }[]
  cancel()
  target.googlefc!.showRevocationMessage = () => { calls++ }
  queue[0].CONSENT_API_READY()
  t.mock.timers.tick(10000)
  assert.equal(calls, 0)
  assert.deepEqual(results, [])
})
test('API errors produce an unavailable result without pretending consent changed', () => {
  const target: PrivacyWindow = { googlefc: { showRevocationMessage: () => { throw Error('blocked') }, callbackQueue: { push: entry => entry.CONSENT_API_READY() } } }
  const results: string[] = []
  requestPrivacyChoices(target, result => results.push(result))()
  assert.deepEqual(results, ['unavailable'])
})
