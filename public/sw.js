// public/sw.js — Forgeser PWA v7 — Network-first + precache index.html
const CACHE_NAME = 'forgeser-v7'
const API_HOSTS = [
  'forgeser-backend-801944899567.europe-west1.run.app',
  'script.google.com',
  'generativelanguage.googleapis.com'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.add(new Request('/index.html', { cache: 'reload' })))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const req = event.request
  const url = new URL(req.url)

  // SIEMPRE red para la API
  if (API_HOSTS.some(h => url.hostname.includes(h))) {
    event.respondWith(
      fetch(req).catch(() =>
        new Response(JSON.stringify({ ok: false, error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    )
    return
  }

  // SIEMPRE red para no-GET
  if (req.method !== 'GET') {
    event.respondWith(fetch(req))
    return
  }

  // Navegaciones (HTML): network-first, fallback a index.html cacheado
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE_NAME).then(c => c.put('/index.html', copy))
          }
          return res
        })
        .catch(async () => {
          const cached = await caches.match('/index.html')
          return cached || new Response(
            '<!doctype html><meta charset="utf-8"><title>Offline</title><body style="font-family:sans-serif;padding:2rem"><h1>Sin conexión</h1><p>Reintenta en unos segundos.</p></body>',
            { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          )
        })
    )
    return
  }

  // Assets estáticos: network-first con cache
  event.respondWith(
    fetch(req)
      .then(response => {
        if (response.ok && url.pathname.match(/\.(js|css|png|ico|svg|woff2?)$/)) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then(c => c.put(req, copy))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(req)
        if (cached) return cached
        return new Response('', { status: 503, statusText: 'Offline' })
      })
  )
})
