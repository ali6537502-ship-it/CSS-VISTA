import type { CourseState } from './state.ts'
export type PendingSave = { request_id: string; attempt_id: string; expected_version: number; state: CourseState; import_browser: boolean }
export type SyncEnvelope = { version: number; state: CourseState; dirty: boolean; importBrowser: boolean; pending?: PendingSave }
export function syncKey(userId: string, attemptId: string) { return `cssvista:grammar-sync:v1:${userId}:${attemptId}` }
export function attemptChoiceKey(userId: string) { return `cssvista:grammar-attempt-choice:v1:${userId}` }
export function readAttemptChoice(storage: Pick<Storage, 'getItem'>, userId?: string): string | undefined {
  if (!userId) return
  try { const choice = storage.getItem(attemptChoiceKey(userId)); return choice && /^[a-f0-9-]{36}$/i.test(choice) ? choice : undefined }
  catch { return }
}
export function prepareSave(envelope: SyncEnvelope, attemptId: string, requestId: string): SyncEnvelope {
  return envelope.pending ? envelope : { ...envelope, pending: { request_id: requestId, attempt_id: attemptId, expected_version: envelope.version, state: envelope.state, import_browser: envelope.importBrowser } }
}
/** A lost response retries the exact snapshot; edits made in flight remain dirty. */
export function acknowledgeSave(envelope: SyncEnvelope, requestId: string, version: number): SyncEnvelope {
  if (envelope.pending?.request_id !== requestId) return envelope
  return { version, state: envelope.state, dirty: JSON.stringify(envelope.state) !== JSON.stringify(envelope.pending.state), importBrowser: false }
}
export function receiveAccount(local: SyncEnvelope | undefined, version: number, state: CourseState): { envelope: SyncEnvelope; conflict: boolean } {
  if (local?.dirty || local?.pending) return { envelope: local, conflict: !local.pending && local.version !== version }
  return { envelope: { version, state, dirty: false, importBrowser: false }, conflict: false }
}
