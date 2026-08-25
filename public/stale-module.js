async function loadLatestCssVistaVersion() {
  const work = []
  if ('serviceWorker' in navigator) {
    work.push(navigator.serviceWorker.getRegistrations().then((registrations) => (
      Promise.all(registrations.map((registration) => registration.unregister()))
    )))
  }
  if ('caches' in window) {
    work.push(caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('css-vista-')).map((key) => caches.delete(key)),
    )))
  }
  await Promise.allSettled(work)
  const latest = new URL(window.location.href)
  latest.searchParams.set('__cssv_refresh', Date.now().toString(36))
  window.location.replace(latest.toString())
}

void loadLatestCssVistaVersion()

// Most route chunks are React default exports. Returning an inert component
// keeps an old renderer stable for the fraction of a second before navigation.
export default function StaleDeploymentModule() {
  return null
}
