const CACHE = 'shopdz-v1'
const STATIC = ['/offline', '/manifest.json']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))))
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  // Network-first for API and Next.js internal routes
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return
  // Cache-first for static assets
  if (e.request.method !== 'GET') return
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached ?? fetch(e.request).catch(() => caches.match('/offline'))
    )
  )
})
