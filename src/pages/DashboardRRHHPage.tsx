// src/pages/DashboardRRHHPage.tsx — ACTUALIZADO 6/04/2026
// [6/04] Bloque 9: Recharts completo
//   - BarChart horizontal distribución por centro
//   - PieChart categorías + presencia hoy
//   - Navegación a páginas relevantes
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import {
  Users, Clock, Calendar, AlertTriangle, TrendingUp,
  Loader2, RefreshCw, Euro, Shield, UserCheck, UserX, UserPlus,
  Building2, ChevronRight, CheckCircle2
} from 'lucide-react'

function fmtEuro(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const PIE_COLORS = ['#1a3c34', '#2d5a4e', '#059669', '#10b981', '#14b8a6', '#0d9488', '#06b6d4', '#0ea5e9']
const PRESENCIA_COLORS = ['#10b981', '#f59e0b', '#cbd5e1']

export default function DashboardRRHHPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [recargando, setRecargando] = useState(false)
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null)

  const cargar = async (silencioso = false) => {
    if (silencioso) setRecargando(true); else setCargando(true)
    try { const d = await api.dashboardRRHH(); setData(d); setUltimaActualizacion(new Date()) }
    catch (e) { console.error(e) }
    finally { setCargando(false); setRecargando(false) }
  }

  useEffect(() => { cargar() }, [])

  if (cargando) return (
    <div className="flex flex-col items-center py-20">
      <Loader2 size={32} className="text-[#1a3c34] animate-spin mb-3" />
      <p className="text-slate-500">Calculando KPIs...</p>
    </div>
  )

  if (!data) return <div className="text-center py-20 text-slate-500">No se pudo cargar el dashboard</div>

  const p = data.plantilla || {}
  const f = data.fichajes || {}
  const a = data.ausencias || {}
  const prl = data.prl || {}
  const c = data.costes || {}

  const pctPresente = p.activos > 0 ? Math.round((f.fichados_ahora / p.activos) * 100) : 0
  const pctAusente = p.activos > 0 ? Math.round((a.hoy_ausentes / p.activos) * 100) : 0
  const alertasPRL = (prl.epis_caducados || 0) + (prl.recos_vencidos || 0) + (prl.formacion_caducada || 0)

  // Recharts: presencia hoy
  const presenciaData = [
    { name: 'Fichados', value: f.fichados_ahora || 0 },
    { name: 'Ausentes', value: a.hoy_ausentes || 0 },
    { name: 'Sin fichar', value: f.sin_fichar_hoy || 0 },
  ].filter(d => d.value > 0)

  // Recharts: por centro (top 10)
  const centroData = (p.por_centro || []).slice(0, 10).map((item: any) => ({
    centro: (item.centro || 'Sin centro').length > 20 ? (item.centro || '').substring(0, 18) + '…' : item.centro || 'Sin centro',
    total: item.total,
    centroFull: item.centro
  }))

  // Recharts: por categoría
  const catData = (p.por_categoria || []).slice(0, 8).map((item: any) => ({
    name: (item.categoria || 'Sin cat.').length > 18 ? (item.categoria || '').substring(0, 16) + '…' : item.categoria,
    value: item.total,
    fullName: item.categoria
  }))

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
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
          {ultimaActualizacion && <p className="text-xs text-slate-400">{ultimaActualizacion.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>}
          <button onClick={() => cargar(true)} disabled={recargando}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl">
            <RefreshCw size={14} className={recargando ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>
      </div>

      {/* ── FILA 1: KPIs principales ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          { icon: Users,    label: 'Plantilla activa',  valor: p.activos,                          sub: p.bajas + ' bajas',                color: 'text-[#1a3c34]',   bg: 'bg-white',    border: 'border-slate-200', ruta: '/personal' },
          { icon: Clock,    label: 'Fichados ahora',    valor: f.fichados_ahora,                   sub: pctPresente + '% plantilla',       color: 'text-emerald-600', bg: f.fichados_ahora > 0 ? 'bg-emerald-50' : 'bg-white', border: f.fichados_ahora > 0 ? 'border-emerald-200' : 'border-slate-200', ruta: '/fichajes' },
          { icon: Calendar, label: 'Ausentes hoy',      valor: a.hoy_ausentes,                     sub: a.pendientes_aprobar + ' pend. aprobar', color: 'text-amber-600', bg: a.hoy_ausentes > 0 ? 'bg-amber-50' : 'bg-white', border: a.hoy_ausentes > 0 ? 'border-amber-200' : 'border-slate-200', ruta: '/ausencias' },
          { icon: Euro,     label: 'Coste mensual',     valor: fmtEuro(c.coste_mensual_estimado),  sub: fmtEuro(c.coste_anual_estimado) + '/año', color: 'text-slate-700', bg: 'bg-white', border: 'border-slate-200', ruta: null },
        ].map((kpi: any, i: number) => (
          <button key={i} onClick={() => kpi.ruta && navigate(kpi.ruta)}
            className={`${kpi.bg} border-2 ${kpi.border} rounded-2xl p-5 text-left ${kpi.ruta ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <kpi.icon size={20} className={kpi.color} />
              {kpi.ruta && <ChevronRight size={14} className="text-slate-300" />}
            </div>
            <p className="text-3xl font-black text-slate-900">{kpi.valor ?? 0}</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">{kpi.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
          </button>
        ))}
      </div>

      {/* ── FILA 2: Presencia hoy (PieChart) + Alertas ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">

        {/* Presencia hoy con PieChart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock size={15} className="text-[#1a3c34]" /> Presencia hoy
            </h3>
            <button onClick={() => navigate('/fichajes')} className="text-xs text-[#1a3c34] font-semibold hover:underline">Ver fichajes →</button>
          </div>
          <div className="flex items-center gap-4">
            {/* PieChart */}
            <div className="w-32 h-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={presenciaData} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={52} paddingAngle={3}>
                    {presenciaData.map((_, i) => <Cell key={i} fill={PRESENCIA_COLORS[i % PRESENCIA_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [v + ' pers.']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Leyenda */}
            <div className="flex-1 space-y-3">
              {[
                { label: 'Fichados', valor: f.fichados_ahora || 0, pct: pctPresente, color: 'bg-emerald-500', textColor: 'text-emerald-700' },
                { label: 'Ausentes', valor: a.hoy_ausentes || 0, pct: pctAusente, color: 'bg-amber-400', textColor: 'text-amber-700' },
                { label: 'Sin fichar', valor: f.sin_fichar_hoy || 0, pct: p.activos > 0 ? Math.round(((f.sin_fichar_hoy || 0) / p.activos) * 100) : 0, color: 'bg-slate-300', textColor: 'text-slate-600' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color} shrink-0`} />
                  <span className="text-xs text-slate-600 flex-1">{item.label}</span>
                  <span className={`text-sm font-black ${item.textColor}`}>{item.valor}</span>
                  <span className="text-[10px] text-slate-400">({item.pct}%)</span>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Horas mes</span>
                <span className="text-sm font-black text-[#1a3c34]">{f.total_horas_mes || '0h'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Alertas consolidadas */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600" /> Alertas activas
          </h3>
          <div className="space-y-2">
            {a.pendientes_aprobar > 0 && (
              <button onClick={() => navigate('/ausencias')} className="w-full flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-left hover:bg-amber-100 transition-colors">
                <Calendar size={14} className="text-amber-600 flex-shrink-0" />
                <p className="text-sm font-bold text-amber-800 flex-1">{a.pendientes_aprobar} ausencia{a.pendientes_aprobar > 1 ? 's' : ''} por aprobar</p>
                <ChevronRight size={14} className="text-amber-400" />
              </button>
            )}
            {(p.contratos_vencer_30d || 0) > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                <UserX size={14} className="text-red-600 flex-shrink-0" />
                <p className="text-sm font-bold text-red-800 flex-1">{p.contratos_vencer_30d} contrato{p.contratos_vencer_30d > 1 ? 's' : ''} vence en 30 días</p>
              </div>
            )}
            {alertasPRL > 0 && (
              <button onClick={() => navigate('/prl')} className="w-full flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl text-left hover:bg-orange-100 transition-colors">
                <Shield size={14} className="text-orange-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-orange-800">{alertasPRL} alerta{alertasPRL > 1 ? 's' : ''} PRL</p>
                  <p className="text-xs text-orange-600">
                    {prl.epis_caducados > 0 ? prl.epis_caducados + ' EPIs · ' : ''}
                    {prl.recos_vencidos > 0 ? prl.recos_vencidos + ' reconoc. · ' : ''}
                    {prl.formacion_caducada > 0 ? prl.formacion_caducada + ' formaciones' : ''}
                  </p>
                </div>
                <ChevronRight size={14} className="text-orange-400" />
              </button>
            )}
            {(p.altas_recientes || 0) > 0 && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <UserPlus size={14} className="text-emerald-600 flex-shrink-0" />
                <p className="text-sm font-bold text-emerald-800">{p.altas_recientes} alta{p.altas_recientes > 1 ? 's' : ''} reciente{p.altas_recientes > 1 ? 's' : ''}</p>
              </div>
            )}
            {a.pendientes_aprobar === 0 && alertasPRL === 0 && (p.contratos_vencer_30d || 0) === 0 && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                <p className="text-sm font-bold text-emerald-800">Sin alertas — todo al día</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── FILA 3: Distribución por centro (BarChart) + por categoría (PieChart) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">

        {/* Por centro — Recharts BarChart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 size={15} className="text-[#1a3c34]" /> Plantilla por centro
            </h3>
            <button onClick={() => navigate('/territorio')} className="text-xs text-[#1a3c34] font-semibold hover:underline">Ver centros →</button>
          </div>
          {centroData.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Sin datos</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={centroData} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis dataKey="centro" type="category" width={110} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                    formatter={(value: number) => [value + ' empleados']}
                    labelFormatter={(label) => centroData.find((d: any) => d.centro === label)?.centroFull || label} />
                  <Bar dataKey="total" fill="#1a3c34" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Por categoría — Recharts PieChart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <UserCheck size={15} className="text-[#1a3c34]" /> Plantilla por categoría
          </h3>
          {catData.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Sin datos</p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-40 h-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={catData} dataKey="value" cx="50%" cy="50%" outerRadius={65} paddingAngle={2} label={false}>
                      {catData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }}
                      formatter={(v: number, name: string) => {
                        const entry = catData.find((d: any) => d.name === name)
                        return [v + ' (' + (p.activos > 0 ? Math.round(v / p.activos * 100) : 0) + '%)', entry?.fullName || name]
                      }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {catData.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs text-slate-600 truncate flex-1" title={item.fullName}>{item.name}</span>
                    <span className="text-xs font-bold text-slate-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── FILA 4: Contratos a vencer + Altas recientes + Top horas ── */}
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
              {(p.contratos_vencer || []).map((cv: any, i: number) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${cv.dias_restantes <= 15 ? 'bg-red-50 border border-red-200' : cv.dias_restantes <= 30 ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-200'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${cv.dias_restantes <= 15 ? 'bg-red-200 text-red-800' : cv.dias_restantes <= 30 ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-700'}`}>
                    {cv.dias_restantes}d
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{cv.nombre}</p>
                    <p className="text-[10px] text-slate-500">{cv.centro} · {cv.categoria}</p>
                  </div>
                  <p className="text-[10px] text-slate-500 flex-shrink-0">{cv.fecha_fin}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Altas recientes + Top horas */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserPlus size={15} className="text-emerald-600" /> Altas recientes (30d)
              </h3>
              <button onClick={() => navigate('/personal')} className="text-xs text-[#1a3c34] font-semibold hover:underline">Ver personal →</button>
            </div>
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

          {(f.top_horas || []).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp size={15} className="text-blue-600" /> Top horas — {MESES[data.mes]}
                </h3>
                <button onClick={() => navigate('/fichajes')} className="text-xs text-[#1a3c34] font-semibold hover:underline">Ver fichajes →</button>
              </div>
              <div className="space-y-2">
                {(f.top_horas || []).map((e: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`text-[10px] font-black w-4 text-center ${i < 3 ? 'text-[#1a3c34]' : 'text-slate-400'}`}>{i + 1}</span>
                    <p className="text-xs text-slate-700 flex-1 truncate">{e.nombre}</p>
                    <span className="text-xs font-bold text-[#1a3c34]">{e.total_horas}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── FILA 5: Subrogaciones activas ── */}
      {data.subrogaciones && data.subrogaciones.procesos_activos > 0 && (
        <div className="mt-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users size={15} className="text-orange-600" /> Subrogaciones activas
              </h3>
              <button onClick={() => navigate('/subrogacion')} className="text-xs text-orange-700 font-semibold hover:underline">Gestionar →</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Procesos', valor: data.subrogaciones.procesos_activos, color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
                { label: 'Pendientes', valor: data.subrogaciones.pendientes, color: data.subrogaciones.pendientes > 0 ? 'text-amber-700' : 'text-slate-500', bg: data.subrogaciones.pendientes > 0 ? 'bg-amber-50' : 'bg-slate-50', border: data.subrogaciones.pendientes > 0 ? 'border-amber-200' : 'border-slate-200' },
                { label: 'Verificados', valor: data.subrogaciones.verificados, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                { label: 'Incorporados', valor: data.subrogaciones.incorporados, color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
              ].map((kpi, i) => (
                <div key={i} className={`${kpi.bg} border ${kpi.border} rounded-xl p-3 text-center`}>
                  <p className={`text-2xl font-black ${kpi.color}`}>{kpi.valor}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">{kpi.label}</p>
                </div>
              ))}
            </div>
            {(data.subrogaciones?.procesos?.length || 0) > 0 && (
              <div className="space-y-2">
                {(data.subrogaciones?.procesos || []).map((s: any) => (
                  <button key={s.id} onClick={() => navigate('/subrogacion')}
                    className="w-full flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl text-left hover:bg-orange-100 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center text-orange-800 font-bold text-xs flex-shrink-0">
                      {s.num_personal}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{s.titulo}</p>
                      <p className="text-[10px] text-slate-500">{s.organismo}</p>
                    </div>
                    <ChevronRight size={14} className="text-orange-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
