// src/components/OfflineBanner.tsx
import { useOffline } from '../hooks/useOffline'
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react'

export default function OfflineBanner() {
  const { online, pendientes, sincronizando, sincronizar } = useOffline()

  if (online && pendientes === 0) return null

  if (!online) return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-2.5 bg-amber-500 text-white text-sm font-semibold shadow-lg">
      <WifiOff size={16} className="flex-shrink-0" />
      <span className="flex-1">Sin conexión · Modo offline activo</span>
      {pendientes > 0 && (
        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{pendientes} pendiente{pendientes > 1 ? 's' : ''}</span>
      )}
    </div>
  )

  if (online && pendientes > 0) return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold shadow-lg">
      <RefreshCw size={16} className={`flex-shrink-0 ${sincronizando ? 'animate-spin' : ''}`} />
      <span className="flex-1">{sincronizando ? 'Sincronizando datos...' : `${pendientes} acción${pendientes > 1 ? 'es' : ''} pendiente${pendientes > 1 ? 's' : ''} de sincronizar`}</span>
      {!sincronizando && (
        <button onClick={sincronizar} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors">
          Sincronizar ahora
        </button>
      )}
    </div>
  )

  return null
}