import { useState, useEffect } from 'react'
import { api } from '../services/api'
import {
  Clock, Brain, Download, CheckCircle2, XCircle, FileText,
  Plus, Target, BarChart3, Loader2, RefreshCw
} from 'lucide-react'

const TIPO_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  CREACION:    { icon: Plus,         color: 'text-blue-600',    bg: 'bg-blue-100',    label: 'Oportunidad creada' },
  PLIEGOS:     { icon: Download,     color: 'text-amber-600',   bg: 'bg-amber-100',   label: 'Pliegos descargados' },
  ANALISIS_IA: { icon: Brain,        color: 'text-violet-600',  bg: 'bg-violet-100',  label: 'Análisis IA' },
  ESTADO:      { icon: Target,       color: 'text-slate-600',   bg: 'bg-slate-100',   label: 'Cambio de estado' },
  APROBACION:  { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Decisión Dirección' },
  RESULTADO:   { icon: BarChart3,    color: 'text-indigo-600',  bg: 'bg-indigo-100',  label: 'Resultado registrado' },
  CALCULO:     { icon: FileText,     color: 'text-cyan-600',    bg: 'bg-cyan-100',    label: 'Cálculo guardado' },
  SISTEMA:     { icon: Clock,        color: 'text-slate-400',   bg: 'bg-slate-50',    label: 'Sistema' },
}

interface Props {
  oportunidadId: string
}

export default function HistorialActividad({ oportunidadId }: Props) {
  const [actividad, setActividad] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [recargando, setRecargando] = useState(false)

  const cargar = async (silencioso = false) => {
    if (silencioso) setRecargando(true)
    else setCargando(true)
    try {
      const data = await api.actividad(oportunidadId)
      setActividad(data.actividad || [])
    } catch (e) { console.error(e) }
    finally { setCargando(false); setRecargando(false) }
  }

  useEffect(() => { if (oportunidadId) cargar() }, [oportunidadId])

  if (cargando) return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-center py-6">
        <Loader2 size={20} className="animate-spin text-slate-400" />
      </div>
    </div>
  )

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Clock size={15} className="text-slate-500" /> Historial de actividad
        </h3>
        <button onClick={() => cargar(true)} disabled={recargando}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          <RefreshCw size={13} className={recargando ? 'animate-spin' : ''} />
        </button>
      </div>

      {actividad.length === 0 ? (
        <div className="text-center py-8">
          <Clock size={28} className="text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Sin actividad registrada aún</p>
          <p className="text-xs text-slate-300 mt-1">Las acciones aparecerán aquí automáticamente</p>
        </div>
      ) : (
        <div className="p-5">
          <div className="relative">
            {/* Línea vertical */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-100" />

            <div className="space-y-4">
              {actividad.map((item: any, i: number) => {
                const cfg = TIPO_CONFIG[item.tipo] || TIPO_CONFIG.SISTEMA
                const Icon = cfg.icon
                return (
                  <div key={item.id || i} className="flex gap-3 relative">
                    {/* Icono */}
                    <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center shrink-0 z-10 border-2 border-white`}>
                      <Icon size={13} className={cfg.color} />
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800">{item.descripcion}</p>
                          {item.usuario && item.usuario !== 'Sistema' && (
                            <p className="text-[10px] text-slate-400 mt-0.5">Por {item.usuario}</p>
                          )}
                          {/* Metadata relevante */}
                          {item.tipo === 'ANALISIS_IA' && item.metadata?.puntuacion && (
                            <span className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              item.metadata.puntuacion >= 70 ? 'bg-emerald-100 text-emerald-700' :
                              item.metadata.puntuacion >= 40 ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              Score: {item.metadata.puntuacion}/100
                              {item.metadata.lotes_creados > 0 && ` · ${item.metadata.lotes_creados} lotes`}
                            </span>
                          )}
                          {item.tipo === 'RESULTADO' && item.metadata?.resultado && (
                            <span className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              item.metadata.resultado === 'ganada' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {item.metadata.resultado.toUpperCase()}
                              {item.metadata.importe > 0 && ` · ${Number(item.metadata.importe).toLocaleString('es-ES')} €`}
                            </span>
                          )}
                          {item.tipo === 'APROBACION' && item.metadata?.estado && (
                            <span className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              item.metadata.estado === 'go' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {item.metadata.estado.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">{item.fecha}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}