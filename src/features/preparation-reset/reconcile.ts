import { flushSync } from 'react-dom'
import { captureProgressSnapshot } from '@/lib/accountSync'
import { currentHostingerAccountUser, currentPreparationGeneration, setHostingerPreparationGeneration } from '@/lib/hostingerApi'
import { preparationPhysicalKey, preparationGenerationKey, preparationRevisionKey, preparationLeaseKey, preparationKeys } from '@/lib/preparationStorage'
import { notifyProgressChanged } from '@/lib/progressEvents'
import { applyPreparationReset, fullResetKey, resetsSince, RESET_CHANGED_EVENT, RESET_PHASE_EVENT, RESET_FAILED_EVENT, type ResetControl } from './model'
function keys(storage: Storage) { return Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((key): key is string => !!key) }
function clearPending(owner: string) {
  for (const key of keys(sessionStorage)) if (key.startsWith(`cssvista:attempt-action:${owner}:`) || key.startsWith(`cssvista:learning-request:${owner}:`)) sessionStorage.removeItem(key)
}
function clearFullDeviceRecords(owner: string, epoch: string) {
  for (const key of keys(sessionStorage)) if (key.startsWith(`cssvista:precis:study-note:v1:${owner}:`)) sessionStorage.removeItem(key)
  const grammarPrefixes = [`cssvista:grammar-course:v4:account:${owner}`, `cssvista:grammar-course:v5:account:${owner}`, `cssvista:grammar-sync:v1:${owner}`]
  for (const key of keys(localStorage)) if (grammarPrefixes.some(prefix => key === prefix || key.startsWith(prefix + ':'))) localStorage.removeItem(key)
  const suffix = `:owner:v1:${encodeURIComponent(owner)}`
  for (const key of keys(localStorage)) if (key.endsWith(suffix) || key.includes(`:owner:v2:${encodeURIComponent(owner)}:`) || key.startsWith(`cssvista:factbook:draft:${owner}:`) || key === `css-vista-device-factbook:${owner}` || key.startsWith(`css-vista-device-factbook:${owner}:reset:`)) localStorage.removeItem(key)
  if (localStorage.getItem('cssvista:local-study-legacy-owner:v1') === `account:${owner}`) {
    for (const key of keys(localStorage)) if (!key.includes(':owner:') && /^(cssvista:single-answer-timer$|cssvista:paper-attempt$|cssvista:answer-timer:|cssvista:quiz-session:|cssvista:mock-student-name$|cssvista:research)/.test(key)) localStorage.removeItem(key)
  }
  localStorage.setItem(fullResetKey(owner), epoch)
}
function phase(owner: string, active: boolean) { flushSync(() => window.dispatchEvent(new CustomEvent(RESET_PHASE_EVENT, { detail: { owner, active } }))) }
/** Migrate only after an explicit server-confirmed reset. Logical keys and cloud
 * payloads are unchanged; old clients cannot re-upload old physical partitions. */
function reconcile(owner: string, control?: ResetControl | null) {
  if (currentHostingerAccountUser() !== owner) throw new Error('Your account changed. Please reopen your preparation records.')
  const diskGeneration = localStorage.getItem(preparationGenerationKey(owner))
  const diskRevision = Number(localStorage.getItem(preparationRevisionKey(owner)) || 0)
  const documentGeneration = currentPreparationGeneration()
  if (!control) {
    if (diskGeneration) throw new Error('Account reset history is unavailable. Your device records are retained; refresh before syncing.')
    setHostingerPreparationGeneration(owner, null); return false
  }
  if (!control.generation || !Number.isInteger(control.revision) || control.revision < 1 || !Array.isArray(control.events) || !control.events.length || control.events.some(event => !['timetable','planner','preparation','attempt-plan'].includes(event.scope) || typeof event.id !== 'string')) throw new Error('Account reset history could not be read. Your device records are retained.')
  if (control.revision < diskRevision || (control.revision === diskRevision && diskGeneration !== control.generation)) throw new Error('A newer reset was saved while synchronization was loading. Please sync again.')
  const documentEvents = resetsSince(control, documentGeneration)
  if (!documentEvents.length) { setHostingerPreparationGeneration(owner, control.generation); return false }
  const full = documentEvents.some(event => event.scope === 'preparation')
  const token = crypto.randomUUID(), leaseKey = preparationLeaseKey(owner)
  const oldLease = JSON.parse(localStorage.getItem(leaseKey) || 'null') as { at?: number } | null
  if (oldLease?.at && Math.abs(Date.now() - oldLease.at) < 30000) throw new Error('Another study tab is applying this reset. Retry synchronization shortly.')
  localStorage.setItem(leaseKey, JSON.stringify({ token, at: Date.now() }))
  try {
    if (full) phase(owner, true)
    if (diskGeneration !== control.generation) {
      let next = captureProgressSnapshot(owner, diskGeneration)
      for (const event of resetsSince(control, diskGeneration)) next = applyPreparationReset(next, event)
      // Write a separate partition first. A failure leaves the old partition available.
      for (const [key,value] of Object.entries(next)) {
        const encoded = typeof value === 'string' ? value : JSON.stringify(value)
        const physical = preparationPhysicalKey(key, owner, control.generation)
        localStorage.setItem(physical, encoded)
        if (localStorage.getItem(physical) !== encoded) throw new Error('The account reset was saved. Retry synchronization to finish updating this device.')
      }
      localStorage.setItem(`cssvista:account-progress:${owner}`, JSON.stringify({ generation: control.generation, snapshot: next }))
      localStorage.setItem(preparationRevisionKey(owner), String(control.revision))
      localStorage.setItem(preparationGenerationKey(owner), control.generation)
      // Retired copies are not used as the current record. Remove only this owner's old partition.
      if (diskGeneration) for (const key of preparationKeys(owner, diskGeneration)) localStorage.removeItem(preparationPhysicalKey(key, owner, diskGeneration))
      else if (localStorage.getItem('cssvista:progress-owner') === owner) for (const key of preparationKeys(owner, null)) localStorage.removeItem(key)
    }
    clearPending(owner)
    if (control.full_reset && localStorage.getItem(fullResetKey(owner)) !== control.full_reset) clearFullDeviceRecords(owner, control.full_reset)
    setHostingerPreparationGeneration(owner, control.generation)
    notifyProgressChanged()
    window.dispatchEvent(new CustomEvent(RESET_CHANGED_EVENT, { detail: { owner, full } }))
    return true
  } catch (error) {
    window.dispatchEvent(new CustomEvent(RESET_FAILED_EVENT, { detail: { owner, message: 'An account reset was saved, but this device could not finish updating. Your retained device copy is available for backup. Retry account synchronization before editing preparation records.' } }))
    throw error
  } finally {
    try { if (JSON.parse(localStorage.getItem(leaseKey) || 'null')?.token === token) localStorage.removeItem(leaseKey) } finally { if (full) phase(owner, false) }
  }
}
export async function reconcileProgressReset(owner: string, control?: ResetControl | null) {
  if (navigator.locks) return navigator.locks.request(`cssvista-reset:${owner}`, () => reconcile(owner, control))
  return reconcile(owner, control)
}
