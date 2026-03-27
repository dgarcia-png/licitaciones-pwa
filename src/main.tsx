import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// ── Registro del Service Worker (modo offline + push notifications) ──────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => {
        console.log('[SW] Registrado:', reg.scope)
        // Comprobar actualizaciones cada hora
        setInterval(() => reg.update(), 3600000)
      })
      .catch(err => console.warn('[SW] Error registro:', err))
  })
}