import { useCallback, useEffect, useRef, useState } from 'react'
import { grammarLessons } from '@/data/grammarCourse'
import { learningRequest, type Attempt } from '@/features/learning/api'
import { HostingerApiError } from '@/lib/hostingerApi'
import { courseKey, normalizeCourse, type CourseState } from './state'
import { acknowledgeSave, prepareSave, receiveAccount, syncKey, type SyncEnvelope } from './sync'
import type { GrammarProfile } from './Profile'
type AccountGrammar = { attempt: Attempt; version: number; state: CourseState | null; profile: GrammarProfile; imported_browser: boolean; updated_at: string | null }
type Snapshot = { envelope: SyncEnvelope; profile?: GrammarProfile; imported: boolean; ready: boolean; conflict: boolean; saving: boolean; error?: string; revision: number }
function cached(user: string, attempt: string): SyncEnvelope | undefined {
  try {
    const raw = JSON.parse(localStorage.getItem(syncKey(user, attempt)) || 'null') as SyncEnvelope | null
    if (!raw || !Number.isInteger(raw.version) || raw.version < 0 || typeof raw.dirty !== 'boolean') return
    if (raw.pending && (raw.pending.attempt_id !== attempt || raw.pending.expected_version !== raw.version || !/^[a-f0-9-]{36}$/i.test(raw.pending.request_id))) return
    return { ...raw, state: normalizeCourse(raw.state, grammarLessons) }
  } catch { return }
}
export function useGrammarSync(user: string, attempt: string) {
  const [snapshot, setSnapshot] = useState<Snapshot>(() => ({ envelope: cached(user, attempt) ?? { version: 0, state: normalizeCourse({}, grammarLessons), dirty: false, importBrowser: false }, imported: false, ready: false, conflict: false, saving: false, revision: 0 }))
  const current = useRef(snapshot), active = useRef(false), generation = useRef(0), running = useRef(false), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const persist = useCallback((next: Snapshot) => {
    try { localStorage.setItem(syncKey(user, attempt), JSON.stringify(next.envelope)); localStorage.setItem(courseKey(user, attempt), JSON.stringify(next.envelope.state)) }
    catch { next = { ...next, saving: false, error: 'This browser could not retain your work. Copy or export it before leaving; automatic sync is paused.' } }
    current.current = next
    if (active.current) setSnapshot(next)
    return !next.error
  }, [user, attempt])
  const flush = useCallback(async (): Promise<void> => {
    const s = current.current
    if (!active.current || running.current || !s.ready || s.conflict || !s.envelope.dirty && !s.envelope.pending) return
    const envelope = prepareSave(s.envelope, attempt, crypto.randomUUID()), pending = envelope.pending!
    if (!persist({ ...s, envelope, error: undefined, saving: true })) return
    running.current = true
    const startedGeneration = generation.current
    try {
      const receipt = await learningRequest<{ version: number }>(user, 'grammar.php', { ...pending })
      if (!active.current || startedGeneration !== generation.current) return
      const latest = current.current
      const acknowledged = acknowledgeSave(latest.envelope, pending.request_id, receipt.version)
      persist({ ...latest, envelope: acknowledged, imported: latest.imported || pending.import_browser, saving: false, error: undefined })
      const data = await learningRequest<AccountGrammar>(user, `grammar.php?attempt_id=${attempt}`)
      if (active.current && startedGeneration === generation.current) {
        const now = current.current
        // Another device may have saved between our receipt and this read.
        if (data.version !== now.envelope.version) {
          if (now.envelope.dirty) persist({ ...now, conflict: true, error: 'This attempt changed on another device. Your browser copy is preserved.' })
          else persist({ ...now, envelope: receiveAccount(undefined, data.version, normalizeCourse(data.state, grammarLessons)).envelope, profile: data.profile, imported: data.imported_browser, revision: now.revision + 1 })
        } else persist({ ...now, profile: data.profile })
      }
    } catch (cause) {
      if (active.current && startedGeneration === generation.current) persist({ ...current.current, saving: false, conflict: cause instanceof HostingerApiError && cause.status === 409, error: cause instanceof Error ? cause.message : 'Account sync failed. Your browser copy is preserved.' })
    } finally {
      running.current = false
      if (active.current && current.current.envelope.dirty && !current.current.error && !current.current.conflict) timer.current = setTimeout(() => { void flush() }, 2500)
    }
  }, [attempt, persist, user])
  useEffect(() => {
    active.current = true
    generation.current++
    const controller = new AbortController()
    void learningRequest<AccountGrammar>(user, `grammar.php?attempt_id=${attempt}`, undefined, controller.signal).then(data => {
      if (controller.signal.aborted) return
      const local = cached(user, attempt), received = receiveAccount(local, data.version, normalizeCourse(data.state, grammarLessons))
      persist({ ...current.current, ...received, profile: data.profile, imported: data.imported_browser, ready: true, revision: 1, error: received.conflict ? 'This attempt changed elsewhere. Your browser copy is preserved.' : undefined })
      if (!received.conflict && (received.envelope.dirty || received.envelope.pending)) void flush()
    }).catch(cause => { if (!controller.signal.aborted) persist({ ...current.current, ready: true, error: cause instanceof Error ? cause.message : 'Account work could not be loaded.' }) })
    return () => { active.current = false; controller.abort(); clearTimeout(timer.current) }
  }, [attempt, flush, persist, user])
  function change(state: CourseState, importBrowser = false) {
    const s = current.current
    persist({ ...s, revision: s.revision + (importBrowser ? 1 : 0), envelope: { ...s.envelope, state, dirty: true, importBrowser: s.envelope.importBrowser || importBrowser } })
    clearTimeout(timer.current)
    if (!current.current.error && !s.conflict) timer.current = setTimeout(() => { void flush() }, 2500)
  }
  function download() {
    const blob = new Blob([JSON.stringify({ attempt_id: attempt, ...current.current.envelope }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `css-vista-grammar-${attempt}.json`; link.click(); URL.revokeObjectURL(url)
  }
  async function reloadAccount() {
    if (running.current) return
    running.current = true
    persist({ ...current.current, saving: true })
    try {
      const data = await learningRequest<AccountGrammar>(user, `grammar.php?attempt_id=${attempt}`)
      if (!active.current) return
      // Back up the latest draft, including edits made while this read ran.
      localStorage.setItem(`${syncKey(user, attempt)}:backup:${crypto.randomUUID()}`, JSON.stringify(current.current.envelope))
      persist({ envelope: receiveAccount(undefined, data.version, normalizeCourse(data.state, grammarLessons)).envelope, profile: data.profile, imported: data.imported_browser, ready: true, conflict: false, saving: false, revision: current.current.revision + 1 })
    } catch (cause) { persist({ ...current.current, saving: false, error: cause instanceof Error ? cause.message : 'Could not reload account work.' }) }
    finally { running.current = false }
  }
  return { ...snapshot, change, flush, download, reloadAccount }
}
