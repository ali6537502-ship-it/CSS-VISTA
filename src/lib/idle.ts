interface IdleWorkOptions {
  timeout?: number
  fallbackDelay?: number
  immediate?: boolean
}

/** Schedule non-critical client work without competing with the first render. */
export function scheduleIdleWork(
  work: () => void,
  { timeout = 1_500, fallbackDelay = 500, immediate = false }: IdleWorkOptions = {},
) {
  if (immediate) {
    const timer = globalThis.setTimeout(work, 0)
    return () => globalThis.clearTimeout(timer)
  }

  if ('requestIdleCallback' in window) {
    const idleId = window.requestIdleCallback(work, { timeout })
    return () => window.cancelIdleCallback(idleId)
  }

  const timer = globalThis.setTimeout(work, fallbackDelay)
  return () => globalThis.clearTimeout(timer)
}
