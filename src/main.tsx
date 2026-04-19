import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App'

// ── Sentry: inicialización temprana (antes del primer render) ─────────────────
// Solo activo en producción (no en localhost ni dev local)
const isProd = window.location.hostname !== 'localhost' &&
               window.location.hostname !== '127.0.0.1' &&
               !window.location.hostname.includes('local')

if (isProd) {
  Sentry.init({
    dsn: 'https://1251dc1c702e57374ba15032a5f21f68@o4511242871242752.ingest.de.sentry.io/4511242878910544',
    environment: import.meta.env.MODE || 'production',
    release: 'forgeser-frontend@' + (import.meta.env.VITE_APP_VERSION || new Date().toISOString().slice(0,10)),

    // No enviamos PII por defecto — proteger emails, IPs, datos de empleados
    sendDefaultPii: false,

    // Sample rates
    sampleRate: 1.0,            // 100% de los errores
    tracesSampleRate: 0.0,      // 0% de tracing (desactivado, evita gasto cuota)

    // Ignorar errores ruidosos típicos
    ignoreErrors: [
      // Extensiones de navegador
      'top.GLOBALS',
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      // Errores de red recuperables
      'Failed to fetch',
      'NetworkError',
      'Network request failed',
      'Load failed',
      // Service Worker — manejados aparte
      'ServiceWorker',
    ],

    // Ignorar URLs externas (extensiones, ads, scripts third-party)
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
      /^safari-extension:\/\//i,
    ],

    // Antes de enviar el evento, podemos filtrar/limpiar más
    beforeSend(event, hint) {
      // Quitar URLs con tokens de la breadcrumb (podrían filtrarse en URLs de fetch)
      if (event.request?.url) {
        event.request.url = event.request.url.replace(/token=[^&]+/, 'token=REDACTED')
      }
      return event
    },
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// ── Registro del Service Worker ───────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => {
        console.log('[SW] Registrado:', reg.scope)

        // Comprobar actualizaciones cada hora
        setInterval(() => reg.update(), 3600000)

        // Detectar nuevo SW esperando activación
        const onUpdateFound = () => {
          const newWorker = reg.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            // Nuevo SW instalado y esperando → ya tiene skipWaiting,
            // así que clients.claim() lo activará; recargamos para
            // que el usuario vea la versión nueva sin intervención manual
            if (newWorker.state === 'activated') {
              console.log('[SW] Nueva versión activa — recargando')
              window.location.reload()
            }
          })
        }

        // Si hay un SW esperando en este momento (página recargada justo tras deploy)
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' })
        }

        reg.addEventListener('updatefound', onUpdateFound)
      })
      .catch(err => console.warn('[SW] Error registro:', err))

    // Recargar cuando el SW toma el control (controllerchange)
    // Evitar reload en la primera carga (cuando controller era null)
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      console.log('[SW] Controller cambiado — recargando página')
      window.location.reload()
    })
  })
}

