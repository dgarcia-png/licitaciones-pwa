// src/pages/AlertasPage.tsx — v1.0
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import {
  Bell, RefreshCw, Loader2, AlertTriangle, AlertCircle,
  Info, CheckCircle2, Car, Award, Users, Package,
  FileText, ClipboardList, TrendingUp, Calendar, X
} from 'lucide-react'

const NIVEL_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  critica: { label: 'Crítica',  color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-300',   icon: AlertCircle },
  alta:    { label: 'Alta',     color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300', icon: AlertTriangle },
  media:   { label: 'Media',    color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-300',  icon: Info },
  baja:    { label: 'Baja',     color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-300',   icon: Info },
}

const TIPO_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  vehiculo:      { label: 'Vehículos',      icon: Car,          color: 'bg-slate-100 text-slate-600' },
  certificacion: { label: 'Certificaciones', icon: Award,        color: 'bg-purple-100 text-purple-700' },
  prl:           { label: 'PRL',            icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700' },
  empleado:      { label: 'RRHH',           icon: Users,        color: 'bg-blue-100 text-blue-700' },
  ausencia:      { label: 'Ausencias',      icon: Calendar,     color: 'bg-amber-100 text-amber-700' },
  incidencia:    { label: 'Incidencias',    icon: AlertTriangle, color: 'bg-red-100 text-red-700' },
  inventario:    { label: 'Inventario',     icon: Package,      color: 'bg-cyan-100 text-cyan-700' },
  licitacion:    { label: 'Licitaciones',   icon: FileText,     color: 'bg-indigo-100 text-indigo-700' },
  contrato:      { label: 'Contratos',      icon: TrendingUp,   color: 'bg-[#1a3c34]/10 text-[#1a3c34]' },
}

export default function AlertasPage() {
  const navigate = useNavigate()
  const [alertas, setAlertas] = useState<any[]>([])
  const [resumen, setResumen] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [filtroNivel, setFiltroNivel] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [descartadas, setDescartadas] = useState<Set<number>>(new Set())

  const cargar = async () => {
    setCargando(true)
    try {
      const r = await api.alertasSistema()
      setAlertas(r.alertas || [])
      setResumen(r.resumen || {})
      setDescartadas(new Set())
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  const alertasFiltradas = alertas.filter(a =>
    !descartadas.has(a.id) &&
    (!filtroNivel || a.nivel === filtroNivel) &&
    (!filtroTipo  || a.tipo === filtroTipo)
  )

  const tiposUnicos = [...new Set(alertas.map(a => a.tipo))]

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">

      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-red-600 to-orange-500 rounded-xl shadow-lg relative">
            <Bell size={22} className="text-white" />
            {resumen?.criticas > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-red-600 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-red-600">
                {resumen.criticas}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Alertas del sistema</h1>
            <p className="text-sm text-slate-500">
              {cargando ? 'Calculando...' : `${resumen?.total || 0} alertas activas`}
            </p>
          </div>
        </div>
        <button onClick={cargar} disabled={cargando}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl">
          <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {/* KPIs resumen */}
      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { nivel: 'critica', label: 'Críticas', count: resumen.criticas },
            { nivel: 'alta',    label: 'Altas',    count: resumen.altas },
            { nivel: 'media',   label: 'Medias',   count: resumen.medias },
            { nivel: 'baja',    label: 'Bajas',    count: resumen.bajas },
          ].map(({ nivel, label, count }) => {
            const cfg = NIVEL_CONFIG[nivel]
            const Icon = cfg.icon
            const activo = filtroNivel === nivel
            return (
              <button key={nivel} onClick={() => setFiltroNivel(activo ? '' : nivel)}
                className={`${activo ? cfg.bg + ' ' + cfg.border : 'bg-white border-slate-200'} border-2 rounded-2xl p-4 text-left transition-all hover:shadow-sm`}>
                <div className="flex items-center justify-between mb-2">
                  <Icon size={16} className={cfg.color} />
                  {activo && <span className="text-[10px] font-bold text-slate-400">FILTRADO</span>}
                </div>
                <p className={`text-3xl font-black ${count > 0 ? cfg.color : 'text-slate-300'}`}>{count}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">{label}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* Filtros por tipo */}
      {tiposUnicos.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-5">
          <button onClick={() => setFiltroTipo('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${!filtroTipo ? 'bg-[#1a3c34] text-white border-[#1a3c34]' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
            Todos
          </button>
          {tiposUnicos.map(tipo => {
            const cfg = TIPO_CONFIG[tipo] || { label: tipo, icon: Bell, color: 'bg-slate-100 text-slate-600' }
            const Icon = cfg.icon
            const count = alertas.filter(a => a.tipo === tipo && !descartadas.has(a.id)).length
            return (
              <button key={tipo} onClick={() => setFiltroTipo(filtroTipo === tipo ? '' : tipo)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filtroTipo === tipo ? 'bg-[#1a3c34] text-white border-[#1a3c34]' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                <Icon size={11} /> {cfg.label} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Lista de alertas */}
      {cargando ? (
        <div className="flex flex-col items-center py-20">
          <Loader2 size={32} className="text-[#1a3c34] animate-spin mb-3" />
          <p className="text-slate-500">Analizando el sistema...</p>
        </div>
      ) : alertasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center py-20 bg-white border border-slate-200 rounded-2xl">
          <CheckCircle2 size={40} className="text-emerald-400 mb-3" />
          <p className="text-lg font-bold text-slate-700">
            {alertas.length === 0 ? '¡Sin alertas! Todo en orden' : 'Sin alertas con estos filtros'}
          </p>
          <p className="text-sm text-slate-400 mt-1">El sistema está funcionando correctamente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertasFiltradas.map(alerta => {
            const nCfg = NIVEL_CONFIG[alerta.nivel] || NIVEL_CONFIG.media
            const tCfg = TIPO_CONFIG[alerta.tipo] || { label: alerta.tipo, icon: Bell, color: 'bg-slate-100 text-slate-600' }
            const NIcon = nCfg.icon
            const TIcon = tCfg.icon
            return (
              <div key={alerta.id}
                className={`${nCfg.bg} ${nCfg.border} border-2 rounded-2xl p-4 flex items-start gap-4 group`}>

                {/* Icono nivel */}
                <div className={`p-2 rounded-xl ${nCfg.bg} flex-shrink-0 mt-0.5`}>
                  <NIcon size={18} className={nCfg.color} />
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tCfg.color} flex items-center gap-1`}>
                      <TIcon size={9} /> {tCfg.label}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${nCfg.bg} ${nCfg.color} border ${nCfg.border}`}>
                      {nCfg.label}
                    </span>
                    {alerta.dias_restantes !== null && alerta.dias_restantes !== undefined && (
                      <span className={`text-[10px] font-bold ${alerta.dias_restantes < 0 ? 'text-red-600' : alerta.dias_restantes <= 7 ? 'text-orange-600' : 'text-slate-500'}`}>
                        {alerta.dias_restantes < 0
                          ? `Hace ${Math.abs(alerta.dias_restantes)} días`
                          : alerta.dias_restantes === 0
                            ? 'Hoy'
                            : `En ${alerta.dias_restantes} días`}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm font-bold ${nCfg.color} leading-tight`}>{alerta.titulo}</p>
                  {alerta.descripcion && (
                    <p className="text-xs text-slate-600 mt-0.5 leading-snug">{alerta.descripcion}</p>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {alerta.enlace && (
                    <button onClick={() => navigate(alerta.enlace)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl ${nCfg.color} bg-white border ${nCfg.border} hover:shadow-sm transition-all`}>
                      Ver →
                    </button>
                  )}
                  <button onClick={() => setDescartadas(prev => new Set([...prev, alerta.id]))}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100">
                    <X size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {descartadas.size > 0 && (
        <button onClick={() => setDescartadas(new Set())}
          className="mt-4 text-xs text-slate-400 hover:text-slate-600 underline">
          Mostrar {descartadas.size} alerta{descartadas.size > 1 ? 's' : ''} descartada{descartadas.size > 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}
