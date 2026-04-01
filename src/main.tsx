import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

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
