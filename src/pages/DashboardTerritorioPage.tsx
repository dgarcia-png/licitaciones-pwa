// src/pages/DashboardTerritorioPage.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import {
  Map, RefreshCw, Loader2, MapPin, AlertTriangle, CheckCircle2,
  ClipboardList, Package, Car, Star, Clock, Euro, Activity,
  ShieldAlert, Wrench, ChevronRight, CalendarDays, Target
} from 'lucide-react'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtEuro(n: number) {
  if (!n) return '—'
  if (n >= 1000000) return (n / 1000000).toFixed(2) + ' M€'
  if (n >= 1000)    return Math.round(n / 1000) + ' K€'
  return n.toLocaleString('es-ES') + ' €'
}

const COLORES = [
  'bg-[#1a3c34]', 'bg-[#2d5a4e]', 'bg-emerald-600', 'bg-emerald-500',
  'bg-teal-600',  'bg-teal-500',   'bg-cyan-600',    'bg-cyan-500',
]

const TIPO_LABEL: Record<string, string> = {
  limpieza:       'Limpieza',
  jardineria:     'Jardinería',
  mantenimiento:  'Mantenimiento',
  conserjeria:    'Conserjería',
  vigilancia:     'Vigilancia',
  otro:           'Otro',
}

// ─── Componentes menores ──────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, valor, sub, color = 'text-[#1a3c34]', bg = 'bg-white', border = 'border-slate-200', alerta = false }: any) {
  return (
    <div className={`${alerta ? 'bg-red-50 border-red-200' : bg} border-2 ${alerta ? '' : border} rounded-2xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <Icon size={20} className={alerta ? 'text-red-500' : color} />
        {alerta && (
          <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Atención</span>
        )}
      </div>
      <p className={`text-3xl font-black ${alerta ? 'text-red-700' : 'text-slate-900'}`}>{valor ?? 0}</p>
      <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function BarraProgreso({ label, valor, total, color = 'bg-[#1a3c34]' }: { label: string; valor: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-600">{label}</span>
        <span className="text-xs font-bold text-slate-700">{valor} ({pct}%)</span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: pct + '%' }} />
      </div>
    </div>
  )
}

function AccesoRapido({ icon: Icon, label, to, color }: any) {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate(to)}
      className="flex items-center gap-3 w-full p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-left group">
      <div className={`p-2 ${color} rounded-lg`}>
        <Icon size={15} className="text-white" />
      </div>
      <span className="text-sm font-medium text-slate-700 flex-1">{label}</span>
      <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
    </button>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DashboardTerritorioPage() {
  const [data,    setData]    = useState<any>(null)
  const [sla,     setSla]     = useState<any>(null)
  const [cargando,    setCargando]    = useState(true)
  const [recargando,  setRecargando]  = useState(false)
  const [ultimaAct,   setUltimaAct]   = useState<Date | null>(null)

  const cargar = async (silencioso = false) => {
    if (silencioso) setRecargando(true)
    else setCargando(true)
    try {
      const [d, s] = await Promise.all([
        api.dashboardTerritorio(),
        api.dashboardSLA(),
      ])
      setData(d)
      setSla(s)
      setUltimaAct(new Date())
    } catch (e) { console.error(e) }
    finally { setCargando(false); setRecargando(false) }
  }

  useEffect(() => { cargar() }, [])

  if (cargando) return (
    <div className="flex flex-col items-center py-20">
      <Loader2 size={32} className="text-[#1a3c34] animate-spin mb-3" />
      <p className="text-slate-500">Cargando dashboard...</p>
    </div>
  )

  if (!data) return (
    <div className="text-center py-20 text-slate-500">No se pudo cargar el dashboard de territorio</div>
  )

  // Derivados
  const totalAlertas = (sla?.vencidas || 0) + (data.ordenes_pendientes || 0) + (data.acciones_correctivas || 0)
  const partesCompletados = (data.partes_hoy || 0) - (data.partes_en_curso || 0)
  const totalSLAActivas = (sla?.vencidas || 0) + (sla?.proximo_vencer || 0) + (sla?.en_plazo || 0)
  const calidadColor = (data.calidad_media_mes || 0) >= 4
    ? 'text-emerald-600' : (data.calidad_media_mes || 0) >= 3
    ? 'text-amber-600' : 'text-red-600'

  // Tipo de servicio para barras
  const tipoServicio = Object.entries(data.por_tipo_servicio || {})
    .sort(([, a], [, b]) => (b as number) - (a as number))
  const maxTipo = Math.max(...tipoServicio.map(([, v]) => v as number), 1)

  return (
    <div className="p-6 lg:p-8 max-w-7xl">

      {/* ── Cabecera ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e] rounded-xl shadow-lg">
            <Map size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard Territorio</h1>
            <p className="text-sm text-slate-500">
              {data.activos || 0} centros activos · {data.total_personal || 0} personas asignadas
              {ultimaAct && <span className="ml-2 text-slate-400">· Act. {ultimaAct.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>}
            </p>
          </div>
        </div>
        <button onClick={() => cargar(true)} disabled={recargando}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors">
          <RefreshCw size={14} className={recargando ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {/* ── Banner alerta global ── */}
      {totalAlertas > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-2xl mb-6">
          <AlertTriangle size={18} className="text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-800">
              {totalAlertas} alerta{totalAlertas !== 1 ? 's' : ''} requieren atención
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {(sla?.vencidas || 0) > 0 && `${sla.vencidas} SLA vencido${sla.vencidas !== 1 ? 's' : ''} · `}
              {(data.ordenes_pendientes || 0) > 0 && `${data.ordenes_pendientes} orden${data.ordenes_pendientes !== 1 ? 'es' : ''} pendiente${data.ordenes_pendientes !== 1 ? 's' : ''} · `}
              {(data.acciones_correctivas || 0) > 0 && `${data.acciones_correctivas} acción${data.acciones_correctivas !== 1 ? 'es' : ''} correctiva${data.acciones_correctivas !== 1 ? 's' : ''} abierta${data.acciones_correctivas !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      )}

      {/* ── Fila 1: KPIs principales ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <KpiCard icon={Map}          label="Centros activos"       valor={data.activos || 0}
          sub={`${data.total_centros || 0} en total`}             color="text-[#1a3c34]" />
        <KpiCard icon={ClipboardList} label="Partes hoy"           valor={data.partes_hoy || 0}
          sub={`${data.partes_en_curso || 0} en curso`}            color="text-blue-600"
          bg={data.partes_en_curso > 0 ? 'bg-blue-50' : 'bg-white'}
          border={data.partes_en_curso > 0 ? 'border-blue-200' : 'border-slate-200'} />
        <KpiCard icon={ShieldAlert}   label="Incidencias abiertas" valor={data.incidencias_abiertas || 0}
          sub={`${sla?.criticas || 0} críticas · ${sla?.altas || 0} altas`}
          alerta={(data.incidencias_abiertas || 0) > 0} />
        <KpiCard icon={Star}          label="Calidad media mes"    valor={`${data.calidad_media_mes || 0}/5`}
          sub="Inspecciones este mes"
          color={calidadColor}
          bg={(data.calidad_media_mes || 0) >= 4 ? 'bg-emerald-50' : (data.calidad_media_mes || 0) >= 3 ? 'bg-amber-50' : 'bg-red-50'}
          border={(data.calidad_media_mes || 0) >= 4 ? 'border-emerald-200' : (data.calidad_media_mes || 0) >= 3 ? 'border-amber-200' : 'border-red-200'} />
      </div>

      {/* ── Fila 2: Operativo hoy + SLA ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">

        {/* Operativo hoy */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Activity size={15} className="text-[#1a3c34]" /> Operativo hoy
          </h3>
          <div className="space-y-3">
            <BarraProgreso label="Partes en curso"   valor={data.partes_en_curso || 0}  total={data.partes_hoy || 1} color="bg-blue-500" />
            <BarraProgreso label="Partes completados" valor={partesCompletados}           total={data.partes_hoy || 1} color="bg-emerald-500" />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-black text-[#1a3c34]">{data.partes_hoy || 0}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Partes</p>
            </div>
            <div>
              <p className="text-xl font-black text-blue-600">{data.horas_hoy || 0}h</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Horas</p>
            </div>
            <div>
              <p className="text-xl font-black text-slate-700">{data.total_personal || 0}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Personas</p>
            </div>
          </div>
        </div>

        {/* SLA Incidencias */}
        <div className={`border-2 rounded-2xl p-5 ${(sla?.vencidas || 0) > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <ShieldAlert size={15} className={(sla?.vencidas || 0) > 0 ? 'text-red-600' : 'text-[#1a3c34]'} />
            SLA Incidencias
            {(sla?.vencidas || 0) > 0 && (
              <span className="ml-auto text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                {sla.vencidas} vencido{sla.vencidas !== 1 ? 's' : ''}
              </span>
            )}
          </h3>
          {totalSLAActivas === 0 ? (
            <div className="flex flex-col items-center py-6">
              <CheckCircle2 size={28} className="text-emerald-300 mb-2" />
              <p className="text-xs text-slate-400">Sin incidencias activas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(sla?.vencidas || 0) > 0 && (
                <BarraProgreso label="SLA vencido"         valor={sla.vencidas}       total={totalSLAActivas} color="bg-red-500" />
              )}
              {(sla?.proximo_vencer || 0) > 0 && (
                <BarraProgreso label="Próximas a vencer"   valor={sla.proximo_vencer} total={totalSLAActivas} color="bg-amber-400" />
              )}
              <BarraProgreso   label="En plazo"            valor={sla?.en_plazo || 0} total={totalSLAActivas} color="bg-emerald-500" />
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
            <div>
              <p className={`text-xl font-black ${(sla?.criticas || 0) > 0 ? 'text-red-700' : 'text-slate-400'}`}>
                {sla?.criticas || 0}
              </p>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Críticas</p>
            </div>
            <div>
              <p className={`text-xl font-black ${(sla?.altas || 0) > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                {sla?.altas || 0}
              </p>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Altas</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Fila 3: Alertas operativas + Tipo servicio ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">

        {/* Alertas operativas */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600" /> Estado operativo
          </h3>
          <div className="space-y-2">
            {[
              { icon: Wrench,        label: 'Órdenes pendientes',        valor: data.ordenes_pendientes  || 0, alerta: (data.ordenes_pendientes || 0) > 0,  color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
              { icon: Activity,      label: 'Órdenes en proceso',        valor: data.ordenes_en_proceso  || 0, alerta: false,                                color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200' },
              { icon: ShieldAlert,   label: 'Acciones correctivas',      valor: data.acciones_correctivas|| 0, alerta: (data.acciones_correctivas || 0) > 0, color: 'text-red-700',     bg: 'bg-red-50 border-red-200' },
              { icon: ClipboardList, label: 'Incidencias abiertas',      valor: data.incidencias_abiertas|| 0, alerta: (data.incidencias_abiertas || 0) > 5,  color: 'text-slate-700',   bg: 'bg-slate-50 border-slate-200' },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${item.alerta ? item.bg : 'bg-slate-50 border-slate-200'}`}>
                <item.icon size={15} className={item.alerta ? item.color : 'text-slate-400'} />
                <span className="text-sm text-slate-700 flex-1">{item.label}</span>
                <span className={`text-lg font-black ${item.alerta ? item.color : 'text-slate-500'}`}>
                  {item.valor}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tipo de servicio */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Target size={15} className="text-[#1a3c34]" /> Centros por tipo de servicio
          </h3>
          {tipoServicio.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Sin datos de tipo de servicio</p>
          ) : (
            <div className="space-y-2.5">
              {tipoServicio.map(([tipo, count], i) => (
                <div key={tipo}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700">
                      {TIPO_LABEL[tipo] || tipo}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {count as number} centros ({Math.round((count as number) / (data.activos || 1) * 100)}%)
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${COLORES[i % COLORES.length]} rounded-full transition-all`}
                      style={{ width: ((count as number) / maxTipo * 100) + '%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Presupuesto anual total</span>
            <span className="text-sm font-black text-[#1a3c34]">{fmtEuro(data.total_presupuesto || 0)}</span>
          </div>
        </div>
      </div>

      {/* ── Fila 4: Accesos rápidos ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Map size={15} className="text-[#1a3c34]" /> Accesos rápidos
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <AccesoRapido icon={MapPin}        label="Mapa operarios"     to="/mapa-supervisor"  color="bg-[#1a3c34]" />
          <AccesoRapido icon={CalendarDays}  label="Planificación"      to="/planificacion"     color="bg-blue-600" />
          <AccesoRapido icon={ClipboardList} label="Partes"             to="/partes"            color="bg-emerald-600" />
          <AccesoRapido icon={AlertTriangle} label="Incidencias SLA"    to="/incidencias"       color={sla?.vencidas > 0 ? 'bg-red-600' : 'bg-amber-500'} />
          <AccesoRapido icon={Wrench}        label="Órdenes de trabajo" to="/ordenes"           color="bg-slate-600" />
          <AccesoRapido icon={Package}       label="Inventario"         to="/inventario"        color="bg-teal-600" />
          <AccesoRapido icon={Car}           label="Vehículos"          to="/vehiculos"         color="bg-cyan-600" />
          <AccesoRapido icon={Star}          label="Calidad"            to="/calidad"           color="bg-purple-600" />
        </div>
      </div>

    </div>
  )
}
