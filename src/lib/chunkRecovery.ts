import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

const RECOVERY_QUERY = '__cssv_refresh'
const RECOVERY_STORAGE_KEY = 'css-vista:last-chunk-recovery'
const AUTO_RECOVERY_COOLDOWN_MS = 30_000

const dynamicImportFailure = /(?:failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|failed to load module script|unable to preload css|chunkloaderror|loading chunk [\w-]+ failed)/i

let refreshStarted = false
// React's lazy() constraint is defined with `ComponentType<any>` upstream.
// Keep the same boundary here so components with and without route props infer correctly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RecoverableComponent = ComponentType<any>

function errorMessage(value: unknown) {
  if (value instanceof Error) return `${value.name}: ${value.message}`
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'message' in value) return String(value.message)
  return ''
}

export function isDynamicImportFailure(value: unknown) {
  return dynamicImportFailure.test(errorMessage(value))
}

export function buildLatestVersionUrl(href: string, stamp: number) {
  const url = new URL(href)
  url.searchParams.set(RECOVERY_QUERY, stamp.toString(36))
  return url.toString()
}

async function retireLegacyRuntimeCaches() {
  const work: Promise<unknown>[] = []
  if ('serviceWorker' in navigator) {
    work.push(navigator.serviceWorker.getRegistrations().then((registrations) => (
      Promise.all(registrations.map((registration) => registration.unregister()))
    )))
  }
  if ('caches' in window) {
    work.push(window.caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('css-vista-')).map((key) => window.caches.delete(key)),
    )))
  }
  await Promise.allSettled(work)
}

function beginLatestVersionRefresh(force: boolean) {
  if (refreshStarted || typeof window === 'undefined') return refreshStarted
  const now = Date.now()
  if (!force) {
    const previous = Number(window.sessionStorage.getItem(RECOVERY_STORAGE_KEY) ?? 0)
    if (now - previous < AUTO_RECOVERY_COOLDOWN_MS) return false
  }
  refreshStarted = true
  window.sessionStorage.setItem(RECOVERY_STORAGE_KEY, String(now))
  void retireLegacyRuntimeCaches().finally(() => {
    window.location.replace(buildLatestVersionUrl(window.location.href, now))
  })
  return true
}

export function recoverFromDynamicImport(value: unknown) {
  return isDynamicImportFailure(value) && beginLatestVersionRefresh(false)
}

export function refreshLatestApplication() {
  return beginLatestVersionRefresh(true)
}

export function lazyWithRecovery<T extends RecoverableComponent>(
  loader: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await loader()
    } catch (error) {
      if (recoverFromDynamicImport(error)) return await new Promise<never>(() => undefined)
      throw error
    }
  })
}

export function installChunkRecovery() {
  const current = new URL(window.location.href)
  if (current.searchParams.has(RECOVERY_QUERY)) {
    current.searchParams.delete(RECOVERY_QUERY)
    window.history.replaceState(window.history.state, '', `${current.pathname}${current.search}${current.hash}`)
  }

  // CSS Vista no longer needs a service worker. Retire previous registrations
  // and caches in the background so a week-old shell cannot select removed
  // content-hashed modules after a deployment.
  void retireLegacyRuntimeCaches()

  window.addEventListener('vite:preloadError', (event) => {
    const preloadEvent = event as Event & { payload?: unknown }
    if (recoverFromDynamicImport(preloadEvent.payload ?? 'Unable to preload CSS')) event.preventDefault()
  })
  window.addEventListener('unhandledrejection', (event) => {
    if (recoverFromDynamicImport(event.reason)) event.preventDefault()
  })
  window.addEventListener('error', (event) => {
    if (recoverFromDynamicImport(event.error ?? event.message)) event.preventDefault()
  })
}
