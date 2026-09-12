import { useEffect } from 'react'

/**
 * Warns before the tab is closed or reloaded while unsaved work is on screen.
 *
 * Browsers show their own generic message and only honour this at all if the
 * user has interacted with the page, so it is a safety net rather than a
 * guarantee - pair it with autosave, never rely on it alone.
 */
export function useUnsavedWorkGuard(hasUnsavedWork: boolean) {
  useEffect(() => {
    if (!hasUnsavedWork) return

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // Legacy browsers need returnValue set to trigger the prompt.
      event.returnValue = ''
      return ''
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsavedWork])
}

export default useUnsavedWorkGuard
