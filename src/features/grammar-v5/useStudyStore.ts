import { useCallback, useEffect, useRef, useState } from 'react'
import { learningRequest } from '@/features/learning/api'
import { HostingerApiError } from '@/lib/hostingerApi'
import { backupLegacy, blankState, normalizeStudy, stateKey, type StudyState } from './state'
import type { Catalog } from './types'

type Pending = { request_id: string; attempt_id: string; expected_version: number; state: StudyState }
type Envelope = { version: number; state: StudyState; dirty: boolean; pending?: Pending }
type Snapshot = { envelope: Envelope; ready: boolean; saving: boolean; conflict: boolean; error?: string; storageError: boolean }
type AccountCopy = { version: number; state: StudyState | null }
const syncKey = (user?: string, attempt?: string) => `${stateKey(user, attempt)}:sync`
function readState(value: unknown, catalog: Catalog) {
  if (value && (typeof value !== 'object' || !('curriculumVersion' in value) || value.curriculumVersion !== catalog.version)) throw new Error('Unrecognised saved edition')
  return normalizeStudy(value, catalog)
}
function initial(catalog: Catalog, user?: string, attempt?: string): Snapshot {
  let error: string | undefined
  try {
    backupLegacy(localStorage, user, attempt)
    const raw = localStorage.getItem(syncKey(user, attempt))
    if (raw) {
      const e = JSON.parse(raw) as Envelope
      if (Number.isSafeInteger(e.version) && e.version >= 0 && typeof e.dirty === 'boolean' && (!e.pending || e.pending.attempt_id === attempt && e.pending.expected_version === e.version && /^[a-f0-9-]{36}$/i.test(e.pending.request_id))) {
        return { envelope: { ...e, state: readState(e.state, catalog) }, ready: !attempt, saving: false, conflict: false, storageError: false }
      }
      error = 'A saved record could not be read. It has been retained. Export it before saving new work.'
    } else {
      const rawState = localStorage.getItem(stateKey(user, attempt))
      return { envelope: { version: 0, state: rawState ? readState(JSON.parse(rawState), catalog) : blankState(), dirty: false }, ready: !attempt, saving: false, conflict: false, storageError: false }
    }
  } catch { error = 'This browser could not open saved work. Existing records have not been replaced. Use an export before leaving.' }
  return { envelope: { version: 0, state: blankState(), dirty: false }, ready: !attempt, saving: false, conflict: false, error, storageError: true }
}
export function useStudyStore(catalog: Catalog, user?: string, attempt?: string) {
  const [snapshot, setSnapshot] = useState(() => initial(catalog, user, attempt))
  const current = useRef(snapshot), active = useRef(false), running = useRef(false), generation = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const publish = useCallback((next: Snapshot) => {
    // A failed initial read is not permission to replace the unreadable record.
    if (!next.storageError) {
      try { localStorage.setItem(syncKey(user, attempt), JSON.stringify(next.envelope)); localStorage.setItem(stateKey(user, attempt), JSON.stringify(next.envelope.state)) }
      catch { next = { ...next, storageError: true, error: 'This browser could not save your latest work. Export the current copy before leaving. Account saving is paused.', saving: false } }
    }
    current.current = next
    if (active.current) setSnapshot(next)
    return next
  }, [attempt, user])
  const flush = useCallback(async (): Promise<void> => {
    const s = current.current
    if (!user || !attempt || !active.current || running.current || !s.ready || s.conflict || s.storageError || !s.envelope.dirty && !s.envelope.pending) return
    const pending = s.envelope.pending ?? { request_id: crypto.randomUUID(), attempt_id: attempt, expected_version: s.envelope.version, state: s.envelope.state }
    if (publish({ ...s, envelope: { ...s.envelope, pending }, saving: true, error: undefined }).storageError) return
    running.current = true
    const g = generation.current
    try {
      const receipt = await learningRequest<AccountCopy>(user, 'grammar-v5.php', pending)
      if (!active.current || g !== generation.current) return
      const latest = current.current
      const dirty = JSON.stringify(latest.envelope.state) !== JSON.stringify(pending.state)
      publish({ ...latest, envelope: { version: receipt.version, state: dirty ? latest.envelope.state : readState(receipt.state, catalog), dirty }, saving: false, error: undefined })
    } catch (cause) {
      if (active.current && g === generation.current) publish({ ...current.current, saving: false, conflict: cause instanceof HostingerApiError && cause.status === 409, error: cause instanceof Error ? cause.message : 'Account saving failed. Your browser copy is preserved.' })
    } finally {
      running.current = false
      if (active.current && current.current.envelope.dirty && !current.current.error) timer.current = setTimeout(() => { void flush() }, 2500)
    }
  }, [attempt, catalog, publish, user])
  useEffect(() => {
    active.current = true; generation.current++
    const controller = new AbortController()
    if (user && attempt) void learningRequest<AccountCopy>(user, `grammar-v5.php?attempt_id=${attempt}`, undefined, controller.signal).then(copy => {
      if (controller.signal.aborted) return
      const s = current.current
      // An interrupted request must be replayed with its original identity before comparing versions.
      const conflict = !s.envelope.pending && s.envelope.dirty && s.envelope.version !== copy.version
      publish({ ...s, ready: true, conflict, error: conflict ? 'This attempt changed on another device. Your browser draft is preserved.' : s.storageError ? s.error : undefined, envelope: s.envelope.dirty || s.envelope.pending ? s.envelope : { version: copy.version, state: normalizeStudy(copy.state, catalog), dirty: false } })
      if (!conflict && !s.storageError) void flush()
    }).catch(cause => {
      if (!controller.signal.aborted) publish({ ...current.current, ready: true, error: cause instanceof Error ? cause.message : 'Account work could not be loaded. Your browser copy is preserved.' })
    })
    return () => { active.current = false; controller.abort(); clearTimeout(timer.current) }
  }, [attempt, catalog, flush, publish, user])
  const change = useCallback((next: StudyState) => {
    const s = current.current
    if (s.envelope.state === next) return
    publish({ ...s, envelope: { ...s.envelope, state: next, dirty: Boolean(attempt) } })
    clearTimeout(timer.current)
    if (user && attempt && !s.error && !s.conflict && !s.storageError) timer.current = setTimeout(() => { void flush() }, 2500)
  }, [attempt, flush, publish, user])
  const update = useCallback((updater: (state: StudyState) => StudyState) => { change(updater(current.current.envelope.state)) }, [change])
  function download() {
    let retainedOriginal: Record<string, string | null> | undefined
    try { retainedOriginal = { state: localStorage.getItem(stateKey(user, attempt)), sync: localStorage.getItem(syncKey(user, attempt)), legacy: localStorage.getItem(`${stateKey(user, attempt)}:legacy-backup`) } } catch { /* The in-memory copy remains exportable. */ }
    const data = { format: 'cssvista-grammar-v5-backup', scope: { user: user ?? null, attempt: attempt ?? null }, exportedAt: new Date().toISOString(), ...current.current.envelope, retainedOriginal }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = 'css-vista-grammar-work.json'; a.click(); URL.revokeObjectURL(url)
  }
  async function reloadAccount() {
    if (!user || !attempt || running.current || current.current.storageError) return
    running.current = true
    try {
      const copy = await learningRequest<AccountCopy>(user, `grammar-v5.php?attempt_id=${attempt}`)
      if (!active.current) return
      // Back up the newest state, including edits made while the read was in flight.
      localStorage.setItem(`${stateKey(user, attempt)}:backup:${crypto.randomUUID()}`, JSON.stringify(current.current.envelope))
      publish({ ...current.current, envelope: { version: copy.version, state: normalizeStudy(copy.state, catalog), dirty: false }, ready: true, saving: false, conflict: false, error: undefined })
    } catch (cause) { publish({ ...current.current, error: cause instanceof Error ? cause.message : 'The backup or account copy could not be loaded. Your work has been retained.' }) }
    finally { running.current = false }
  }
  function restore(text: string) {
    const data = JSON.parse(text) as { format: string; scope?: { user: string | null; attempt: string | null }; state?: StudyState }
    if (data.format !== 'cssvista-grammar-v5-backup' || data.scope?.user !== (user ?? null) || data.scope?.attempt !== (attempt ?? null) || data.state?.curriculumVersion !== catalog.version) throw new Error('This backup belongs to another account, attempt or course edition. Open that original scope to restore it.')
    const original = { envelope: current.current.envelope, rawState: localStorage.getItem(stateKey(user, attempt)), rawSync: localStorage.getItem(syncKey(user, attempt)) }
    localStorage.setItem(`${stateKey(user, attempt)}:backup:${crypto.randomUUID()}`, JSON.stringify(original))
    if (current.current.storageError) publish({ ...current.current, storageError: false, error: undefined })
    // The current server version and pending request remain intact; restore is a new edit.
    change(normalizeStudy(data.state, catalog))
  }
  return { ...snapshot, state: snapshot.envelope.state, update, flush, download, reloadAccount, restore }
}
