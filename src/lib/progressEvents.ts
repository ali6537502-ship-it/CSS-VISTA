export const PROGRESS_CHANGED_EVENT = 'cssvista:progress-changed'

export function notifyProgressChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PROGRESS_CHANGED_EVENT))
  }
}

export const STORAGE_FAILED_EVENT = 'cssvista:storage-failed'

/**
 * Saving progress can fail silently - a full quota, private browsing, or site
 * data blocked. Students previously carried on believing their work was being
 * saved and lost it. Both progress.ts and store.ts announce a failure here so
 * the app can say so once.
 */
export function notifyStorageFailed() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(STORAGE_FAILED_EVENT))
  }
}
