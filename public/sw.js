// sw.js — Service Worker Forgeser PWA v2.0
// Fixes: respondWith(undefined), non-GET interception, chrome-extension URLs

const CACHE_VERSION  = 'v10'
const CACHE_NAME     = `forgeser-${CACHE_VERSION}`
const API_BASE       = 'https://script.google.com/macros/s/'

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
]

// ── Instalación ──────────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  )
})

// ── Activación ───────────────────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ── Fetch strategy ───────────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = req.url

  // ① Solo interceptar GET — nunca POST/PUT/etc.
  if (req.method !== 'GET') return

  // ② Solo interceptar http/https — nunca chrome-extension:// etc.
  if (!url.startsWith('http')) return

  // ③ API Cloud Run y GAS: network-first
  if (req.url.includes('forgeser-backend') || req.url.includes('run.app')) {
    e.respondWith(fetch(req))
    return
  }
  // API del GAS: network-first con respuesta offline si falla
  if (url.includes(API_BASE)) {
    e.respondWith(networkFirstAPI(req))
    return
  }

  // ④ Assets estáticos: cache-first con fallback a red y luego a /index.html
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached

      return fetch(req)
        .then(response => {
          // Cachear solo respuestas válidas
          if (response && response.status === 200 && response.type !== 'opaque') {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(c => c.put(req, clone))
          }
          return response
        })
        .catch(() => {
          // Sin red: para navegación devolver index.html; para assets, 503
          if (req.mode === 'navigate') {
            return caches.match('/index.html').then(r =>
              r || new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
            )
          }
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
        })
    })
  )
})

// ── Network first para API ────────────────────────────────────────────────────
async function networkFirstAPI(request) {
  try {
    return await fetch(request)
  } catch {
    return new Response(JSON.stringify({
      ok: false,
      offline: true,
      error: 'Sin conexión. Los datos se sincronizarán cuando se recupere la conexión.'
    }), { headers: { 'Content-Type': 'application/json' } })
  }
}

// ── Background Sync ──────────────────────────────────────────────────────────
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-pending') e.waitUntil(sincronizarPendientes())
})

async function sincronizarPendientes() {
  try {
    const db = await abrirDB()
    const pending = await obtenerPendientes(db)
    for (const accion of pending) {
      try {
        const response = await fetch(accion.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(accion.data)
        })
        if (response.ok) {
          await eliminarPendiente(db, accion.id)
          const clients = await self.clients.matchAll()
          clients.forEach(c => c.postMessage({ type: 'SYNC_OK', action: accion.accion }))
        }
      } catch { /* reintentar en la próxima sincronización */ }
    }
  } catch (e) { console.error('Sync error:', e) }
}

// ── IndexedDB helpers ─────────────────────────────────────────────────────────
function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('forgeser-offline', 1)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('pending'))
        db.createObjectStore('pending', { keyPath: 'id', autoIncrement: true })
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror   = reject
  })
}

function obtenerPendientes(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending', 'readonly')
    const req = tx.objectStore('pending').getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror   = reject
  })
}

function eliminarPendiente(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending', 'readwrite')
    const req = tx.objectStore('pending').delete(id)
    req.onsuccess = resolve
    req.onerror   = reject
  })
}

// ── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return
  const data = e.data.json()
  e.waitUntil(
    self.registration.showNotification(data.title || 'Forgeser', {
      body: data.body || '', icon: '/icon-192.png',
      badge: '/icon-192.png', tag: data.tag || 'forgeser',
      data: data.url || '/', actions: data.actions || []
    })
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = e.notification.data || '/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const client = clients.find(c => c.url === url && 'focus' in c)
      if (client) return client.focus()
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
