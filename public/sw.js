self.addEventListener('install', (event) => {
  event.waitUntil(Promise.resolve())
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('css-vista-')).map((key) => caches.delete(key)),
      )),
      self.registration.unregister(),
      self.clients.claim(),
    ]),
  )
})
