const CACHE = 'storedz-v3'

self.addEventListener('install', (event) => {
  self.skipWaiting()

  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.add('/offline.html')
    )
  )
})


self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE)
          .map((key) => caches.delete(key))
      )
    )
  )

  self.clients.claim()
})


self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/')
  ) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => response)
      .catch(async () => {
        const cache = await caches.open(CACHE)
        const offline = await cache.match('/offline.html')

        return offline || new Response(
          'Offline',
          {
            status: 200,
            headers: {
              'Content-Type': 'text/html'
            }
          }
        )
      })
  )
})