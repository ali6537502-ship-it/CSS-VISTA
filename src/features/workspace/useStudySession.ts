import { useCallback, useSyncExternalStore } from 'react'
import { readStudySession, studySessionKey, type StudySession } from './studySession'
const event = 'cssvista:daily-study-changed'
function subscribe(notify: () => void) {
  window.addEventListener(event, notify); window.addEventListener('storage', notify)
  return () => { window.removeEventListener(event, notify); window.removeEventListener('storage', notify) }
}
export function useStudySession(owner: string | undefined) {
  const snapshot = useCallback(() => { try { return owner ? sessionStorage.getItem(studySessionKey(owner)) || '' : '' } catch { return '' } }, [owner])
  const raw = useSyncExternalStore(subscribe, snapshot, () => '')
  return owner ? readStudySession(raw, owner) : undefined
}
export function saveStudySession(value: StudySession) {
  if (!readStudySession(JSON.stringify(value), value.owner)) return
  try { const key = studySessionKey(value.owner), raw = JSON.stringify(value); if (sessionStorage.getItem(key) === raw) return; sessionStorage.setItem(key, raw); window.dispatchEvent(new Event(event)) } catch { /* URL navigation remains usable when browser storage is unavailable. */ }
}
export function endStudySession(owner: string) {
  try { sessionStorage.removeItem(studySessionKey(owner)); window.dispatchEvent(new Event(event)) } catch { /* No learning record is changed. */ }
}
