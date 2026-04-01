// sw.js — Service Worker Forgeser PWA
// ⚠️  IMPORTANTE: incrementar CACHE_VERSION en cada deploy para invalidar caché
// Modo offline: cache-first para assets con hash, network-first para HTML y API
// Cola de sincronización para acciones offline

const CACHE_VERSION  = 'v9'   // ← incrementar en cada deploy: v10, v11...
const CACHE_NAME     = `forgeser-${CACHE_VERSION}`
const API_BASE       = 'https://script.google.com/macros/s/'

// Solo cacheamos el manifest; index.html va network-first
const ASSETS_TO_CACHE = [
  '/manifest.json',
]

// ── Instalación ──────────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())   // activa inmediatamente sin esperar a que
                                        // todos los tabs cierren
  )
})

// ── Activación ───────────────────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Eliminando caché obsoleto:', k)
          return caches.delete(k)
        })
      ))
      .then(() => self.clients.claim())  // toma control de todos los tabs abiertos
  )
})

// ── Mensaje desde el cliente (main.tsx puede pedir skipWaiting explícito) ────
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// ── Fetch strategy ───────────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const url = e.request.url

  // Ignorar requests que no son GET
  if (e.request.method !== 'GET') return

  // API calls: network first con respuesta offline si falla
  if (url.includes(API_BASE)) {
    e.respondWith(networkFirstAPI(e.request))
    return
  }

  // index.html y rutas de la SPA: siempre network-first
  // Así siempre se obtiene el HTML más reciente con los chunks correctos
  if (
    url.endsWith('/') ||
    url.includes('/index.html') ||
    (!url.includes('.') && !url.includes('?'))
  ) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          // Guardar en caché solo si la respuesta es válida
          if (response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone))
          }
          return response
        })
        .catch(() => caches.match('/index.html'))
    )
    return
  }

  // Assets estáticos con hash (JS, CSS, imágenes): cache-first
  // Vite genera nombres con hash (app-Abc123.js) así que son inmutables
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached
      return fetch(e.request).then(response => {
        if (response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone))
        }
        return response
      }).catch(() => caches.match('/index.html'))
    })
  )
})

async function networkFirstAPI(request) {
  try {
    const response = await fetch(request)
    return response
  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      offline: true,
      error: 'Sin conexión. Los datos se sincronizarán cuando se recupere la conexión.'
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// ── Background Sync ──────────────────────────────────────────────────────────
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-pending') {
    e.waitUntil(sincronizarPendientes())
  }
})

async function sincronizarPendientes() {
  try {
    const db      = await abrirDB()
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
      } catch (e) { /* reintentar en la próxima sincronización */ }
    }
  } catch (e) { console.error('Sync error:', e) }
}

// ── IndexedDB helpers ─────────────────────────────────────────────────────────
function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('forgeser-offline', 1)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('pending')) {
        db.createObjectStore('pending', { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror   = reject
  })
}

function obtenerPendientes(db) {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction('pending', 'readonly')
    const store = tx.objectStore('pending')
    const req   = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror   = reject
  })
}

function eliminarPendiente(db, id) {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction('pending', 'readwrite')
    const store = tx.objectStore('pending')
    const req   = store.delete(id)
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
      body:    data.body || '',
      icon:    '/logo192.png',
      badge:   '/badge.png',
      tag:     data.tag || 'forgeser',
      data:    data.url || '/',
      actions: data.actions || []
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
