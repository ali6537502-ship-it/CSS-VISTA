export const PROGRESS_CHANGED_EVENT = 'cssvista:progress-changed'

export function notifyProgressChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PROGRESS_CHANGED_EVENT))
  }
}
