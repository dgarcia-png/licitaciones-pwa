import { useState, useEffect } from 'react'
import { api } from '../services/api'
import {
  Users, Clock, Calendar, AlertTriangle, TrendingUp, TrendingDown,
  Loader2, RefreshCw, Euro, Shield, UserCheck, UserX, UserPlus,
  Building2, ChevronRight, XCircle, CheckCircle2
} from 'lucide-react'

function fmtEuro(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const COLORES_BARRA = [
  'bg-[#1a3c34]', 'bg-[#2d5a4e]', 'bg-emerald-600', 'bg-emerald-500',
  'bg-teal-600', 'bg-teal-500', 'bg-cyan-600', 'bg-cyan-500'
]

export default function DashboardRRHHPage() {
  const [data, setData] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [recargando, setRecargando] = useState(false)
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null)

  const cargar = async (silencioso = false) => {
    if (silencioso) setRecargando(true)
    else setCargando(true)
    try {
      const d = await (api as any).dashboardRRHH()
      setData(d)
      setUltimaActualizacion(new Date())
    } catch (e) { console.error(e) }
    finally { setCargando(false); setRecargando(false) }
  }

  useEffect(() => { cargar() }, [])

  if (cargando) return (
    <div className="flex flex-col items-center py-20">
      <Loader2 size={32} className="text-[#1a3c34] animate-spin mb-3" />
      <p className="text-slate-500">Calculando KPIs...</p>
    </div>
  )

  if (!data) return (
    <div className="text-center py-20 text-slate-500">No se pudo cargar el dashboard</div>
  )

  const p = data.plantilla || {}
  const f = data.fichajes || {}
  const a = data.ausencias || {}
  const prl = data.prl || {}
  const c = data.costes || {}

  // % presente hoy
  const pctPresente = p.activos > 0 ? Math.round((f.fichados_ahora / p.activos) * 100) : 0
  const pctAusente = p.activos > 0 ? Math.round((a.hoy_ausentes / p.activos) * 100) : 0

  // Max para barras
  const maxCentro = Math.max(...(p.por_centro || []).map((x: any) => x.total), 1)
  const maxCat = Math.max(...(p.por_categoria || []).map((x: any) => x.total), 1)

  const alertasPRL = (prl.epis_caducados || 0) + (prl.recos_vencidos || 0) + (prl.formacion_caducada || 0)

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e] rounded-xl shadow-lg">
            <Users size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard RRHH</h1>
            <p className="text-sm text-slate-500">{MESES[data.mes]} {data.anio} · {p.activos} empleados activos</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {ultimaActualizacion && <p className="text-xs text-slate-400">Actualizado {ultimaActualizacion.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>}
          <button onClick={() => cargar(true)} disabled={recargando}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl">
            <RefreshCw size={14} className={recargando ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>
      </div>

      {/* ── FILA 1: KPIs principales ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          { icon: Users,    label: 'Plantilla activa',   valor: p.activos,           sub: p.bajas + ' bajas',                   color: 'text-[#1a3c34]', bg: 'bg-white',          border: 'border-slate-200' },
          { icon: Clock,    label: 'Fichados ahora',      valor: f.fichados_ahora,    sub: pctPresente + '% de la plantilla',    color: 'text-emerald-600', bg: f.fichados_ahora > 0 ? 'bg-emerald-50' : 'bg-white', border: f.fichados_ahora > 0 ? 'border-emerald-200' : 'border-slate-200' },
          { icon: Calendar, label: 'Ausentes hoy',        valor: a.hoy_ausentes,      sub: pctAusente + '% de la plantilla',     color: 'text-amber-600',  bg: a.hoy_ausentes > 0 ? 'bg-amber-50' : 'bg-white', border: a.hoy_ausentes > 0 ? 'border-amber-200' : 'border-slate-200' },
          { icon: Euro,     label: 'Coste mensual est.',  valor: fmtEuro(c.coste_mensual_estimado), sub: fmtEuro(c.coste_anual_estimado) + '/año', color: 'text-slate-700', bg: 'bg-white', border: 'border-slate-200' },
        ].map((kpi: any, i: number) => (
          <div key={i} className={`${kpi.bg} border-2 ${kpi.border} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-3">
              <kpi.icon size={20} className={kpi.color} />
            </div>
            <p className="text-3xl font-black text-slate-900">{kpi.valor ?? 0}</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">{kpi.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── FILA 2: Presencia hoy + Alertas ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">

        {/* Presencia hoy */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Clock size={15} className="text-[#1a3c34]" /> Presencia hoy
          </h3>
          <div className="space-y-3">
            {/* Barra presencia */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600">Fichados</span>
                <span className="text-xs font-bold text-emerald-700">{f.fichados_ahora || 0} ({pctPresente}%)</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: pctPresente + '%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600">Ausentes</span>
                <span className="text-xs font-bold text-amber-700">{a.hoy_ausentes || 0} ({pctAusente}%)</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: pctAusente + '%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600">Sin fichar</span>
                <span className="text-xs font-bold text-slate-600">{f.sin_fichar_hoy || 0} ({p.activos > 0 ? Math.round(((f.sin_fichar_hoy||0) / p.activos) * 100) : 0}%)</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-300 rounded-full transition-all" style={{ width: p.activos > 0 ? ((f.sin_fichar_hoy||0) / p.activos * 100) + '%' : '0%' }} />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Horas acumuladas este mes</span>
            <span className="text-sm font-black text-[#1a3c34]">{f.total_horas_mes || '0h'}</span>
          </div>
        </div>

        {/* Alertas consolidadas */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600" /> Alertas activas
          </h3>
          <div className="space-y-2">
            {a.pendientes_aprobar > 0 && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <Calendar size={14} className="text-amber-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-800">{a.pendientes_aprobar} ausencia{a.pendientes_aprobar > 1 ? 's' : ''} pendiente{a.pendientes_aprobar > 1 ? 's' : ''} de aprobar</p>
                </div>
                <ChevronRight size={14} className="text-amber-500" />
              </div>
            )}
            {(p.contratos_vencer_30d || 0) > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                <UserX size={14} className="text-red-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-800">{p.contratos_vencer_30d} contrato{p.contratos_vencer_30d > 1 ? 's' : ''} vence en 30 días</p>
                </div>
                <ChevronRight size={14} className="text-red-500" />
              </div>
            )}
            {(p.contratos_vencer_60d || 0) > 0 && p.contratos_vencer_30d === 0 && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <UserX size={14} className="text-amber-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-800">{p.contratos_vencer_60d} contrato{p.contratos_vencer_60d > 1 ? 's' : ''} vence en 60 días</p>
                </div>
              </div>
            )}
            {alertasPRL > 0 && (
              <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                <Shield size={14} className="text-orange-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-orange-800">{alertasPRL} alerta{alertasPRL > 1 ? 's' : ''} PRL pendiente{alertasPRL > 1 ? 's' : ''}</p>
                  <p className="text-xs text-orange-600">{prl.epis_caducados > 0 ? prl.epis_caducados + ' EPIs · ' : ''}{prl.recos_vencidos > 0 ? prl.recos_vencidos + ' reconoc. · ' : ''}{prl.formacion_caducada > 0 ? prl.formacion_caducada + ' formaciones' : ''}</p>
                </div>
              </div>
            )}
            {(p.altas_recientes || 0) > 0 && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <UserPlus size={14} className="text-emerald-600 flex-shrink-0" />
                <p className="text-sm font-bold text-emerald-800">{p.altas_recientes} alta{p.altas_recientes > 1 ? 's' : ''} en los últimos 30 días</p>
              </div>
            )}
            {a.pendientes_aprobar === 0 && alertasPRL === 0 && (p.contratos_vencer_30d || 0) === 0 && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                <p className="text-sm font-bold text-emerald-800">Sin alertas activas — todo al día</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── FILA 3: Distribución por centro y categoría ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">

        {/* Por centro */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 size={15} className="text-[#1a3c34]" /> Plantilla por centro
          </h3>
          {(p.por_centro || []).length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Sin datos</p>
          ) : (
            <div className="space-y-2.5">
              {(p.por_centro || []).slice(0, 8).map((item: any, i: number) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-700 font-medium truncate max-w-[60%]">{item.centro}</span>
                    <span className="text-xs font-bold text-slate-900">{item.total} ({Math.round(item.total / p.activos * 100)}%)</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${COLORES_BARRA[i % COLORES_BARRA.length]} rounded-full transition-all`}
                      style={{ width: (item.total / maxCentro * 100) + '%' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Por categoría */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <UserCheck size={15} className="text-[#1a3c34]" /> Plantilla por categoría
          </h3>
          {(p.por_categoria || []).length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Sin datos</p>
          ) : (
            <div className="space-y-2.5">
              {(p.por_categoria || []).slice(0, 8).map((item: any, i: number) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-700 font-medium truncate max-w-[60%]">{item.categoria}</span>
                    <span className="text-xs font-bold text-slate-900">{item.total} ({Math.round(item.total / p.activos * 100)}%)</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${COLORES_BARRA[i % COLORES_BARRA.length]} rounded-full transition-all`}
                      style={{ width: (item.total / maxCat * 100) + '%' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── FILA 4: Contratos a vencer + Altas recientes ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Contratos a vencer */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <UserX size={15} className="text-red-600" /> Contratos próximos a vencer
          </h3>
          {(p.contratos_vencer || []).length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 size={28} className="text-emerald-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Sin contratos por vencer en 90 días</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(p.contratos_vencer || []).map((c: any, i: number) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${c.dias_restantes <= 15 ? 'bg-red-50 border border-red-200' : c.dias_restantes <= 30 ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-200'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${c.dias_restantes <= 15 ? 'bg-red-200 text-red-800' : c.dias_restantes <= 30 ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-700'}`}>
                    {c.dias_restantes}d
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{c.nombre}</p>
                    <p className="text-[10px] text-slate-500">{c.centro} · {c.categoria}</p>
                  </div>
                  <p className="text-[10px] text-slate-500 flex-shrink-0">{c.fecha_fin}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Altas recientes + Top horas */}
        <div className="space-y-4">
          {/* Altas recientes */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <UserPlus size={15} className="text-emerald-600" /> Altas recientes (30 días)
            </h3>
            {(p.altas_recientes_lista || []).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">Sin altas recientes</p>
            ) : (
              <div className="space-y-2">
                {(p.altas_recientes_lista || []).map((e: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="w-7 h-7 rounded-full bg-emerald-200 flex items-center justify-center text-[10px] font-black text-emerald-800 flex-shrink-0">
                      {(e.nombre || '?')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{e.nombre}</p>
                      <p className="text-[10px] text-slate-500">{e.centro}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top horas mes */}
          {(f.top_horas || []).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <TrendingUp size={15} className="text-blue-600" /> Top horas — {MESES[data.mes]}
              </h3>
              <div className="space-y-2">
                {(f.top_horas || []).map((e: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 w-4">{i + 1}</span>
                    <p className="text-xs text-slate-700 flex-1 truncate">{e.nombre}</p>
                    <span className="text-xs font-bold text-[#1a3c34]">{e.total_horas}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}