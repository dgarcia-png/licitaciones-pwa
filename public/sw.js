const CACHE_NAME = 'licitaciones-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
]

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Skip non-GET and API calls
  if (request.method !== 'GET') return
  if (request.url.includes('script.google.com')) return
  if (request.url.includes('generativelanguage.googleapis.com')) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok && request.url.startsWith(self.location.origin)) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
  )
})