// sw.js — Service Worker Forgeser PWA
// Modo offline: cache-first para assets, network-first para API
// Cola de sincronización para acciones offline

const CACHE_NAME = 'forgeser-v1'
const API_BASE   = 'https://script.google.com/macros/s/'

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
]

// ── Instalación ──────────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  )
})

// ── Activación ───────────────────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// ── Fetch strategy ───────────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const url = e.request.url

  // API calls: network first con fallback a cola offline
  if (url.includes(API_BASE)) {
    e.respondWith(networkFirstAPI(e.request))
    return
  }

  // Assets estáticos: cache first
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
    // Sin conexión: devolver respuesta offline
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
  // Obtener acciones pendientes de IndexedDB
  try {
    const db     = await abrirDB()
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
          // Notificar al cliente
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