// src/hooks/useOffline.ts
// Gestiona el estado offline/online y la cola de sincronización

import { useState, useEffect, useCallback } from 'react'

interface AccionPendiente {
  id?: number
  accion: string
  url: string
  data: any
  timestamp: number
}

// ── IndexedDB ─────────────────────────────────────────────────────────────────
async function abrirDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('forgeser-offline', 1)
    req.onupgradeneeded = (e: any) => {
      const db = e.target.result as IDBDatabase
      if (!db.objectStoreNames.contains('pending')) {
        db.createObjectStore('pending', { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = (e: any) => resolve(e.target.result)
    req.onerror   = () => reject(req.error)
  })
}

async function guardarAccionPendiente(accion: AccionPendiente): Promise<void> {
  const db    = await abrirDB()
  const tx    = db.transaction('pending', 'readwrite')
  const store = tx.objectStore('pending')
  store.add(accion)
}

async function contarPendientes(): Promise<number> {
  try {
    const db    = await abrirDB()
    const tx    = db.transaction('pending', 'readonly')
    const store = tx.objectStore('pending')
    return new Promise((res) => {
      const req = store.count()
      req.onsuccess = () => res(req.result)
      req.onerror   = () => res(0)
    })
  } catch { return 0 }
}

// ── Hook principal ────────────────────────────────────────────────────────────
export function useOffline() {
  const [online, setOnline]           = useState(navigator.onLine)
  const [pendientes, setPendientes]   = useState(0)
  const [sincronizando, setSincronizando] = useState(false)

  useEffect(() => {
    const onOnline  = () => { setOnline(true);  sincronizar() }
    const onOffline = () => setOnline(false)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)

    // Escuchar mensajes del Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data?.type === 'SYNC_OK') {
          contarPendientes().then(setPendientes)
        }
      })
    }

    contarPendientes().then(setPendientes)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [])

  const encolarAccion = useCallback(async (accion: string, url: string, data: any) => {
    await guardarAccionPendiente({ accion, url, data, timestamp: Date.now() })
    const n = await contarPendientes()
    setPendientes(n)
    // Solicitar background sync si está disponible
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready
      try { await (reg as any).sync.register('sync-pending') } catch (e) { }
    }
  }, [])

  const sincronizar = useCallback(async () => {
    if (sincronizando) return
    setSincronizando(true)
    try {
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const reg = await navigator.serviceWorker.ready
        await (reg as any).sync.register('sync-pending')
      }
      setTimeout(async () => {
        const n = await contarPendientes()
        setPendientes(n)
        setSincronizando(false)
      }, 2000)
    } catch { setSincronizando(false) }
  }, [sincronizando])

  return { online, pendientes, sincronizando, encolarAccion, sincronizar }
}