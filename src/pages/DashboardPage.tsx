import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  Users, Clock, Calendar, AlertTriangle, Euro, Shield,
  FileSearch, TrendingUp, CheckCircle2, XCircle, Loader2,
  RefreshCw, ChevronRight, Siren, Building2, UserX,
  Target, BarChart3, Zap
} from 'lucide-react'

function fmtEuro(n: number) {
  if (!n) return '—'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M €'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K €'
  return n.toLocaleString('es-ES') + ' €'
}

export default function DashboardPage() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [licit, setLicit] = useState<any>(null)
  const [rrhh, setRrhh] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [recargando, setRecargando] = useState(false)
  const [ultimaAct, setUltimaAct] = useState<Date | null>(null)

  const cargar = async (silencioso = false) => {
    if (silencioso) setRecargando(true)
    else setCargando(true)
    try {
      const [l, r] = await Promise.all([
        api.dashboard(),
        (api as any).dashboardRRHH()
      ])
      setLicit(l); setRrhh(r)
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

  const pipeline = licit?.pipeline || {}
  const contratos = licit?.contratos || {}
  const p = rrhh?.plantilla || {}
  const f = rrhh?.fichajes || {}
  const a = rrhh?.ausencias || {}
  const prl = rrhh?.prl || {}
  const costes = rrhh?.costes || {}

  // KPIs licitaciones
  const totalPipeline = (pipeline.nueva || 0) + (pipeline.en_analisis || 0) + (pipeline.go || 0) + (pipeline.presentada || 0)
  const tasaExito = contratos.total > 0 ? Math.round((contratos.adjudicadas / contratos.total) * 100) : 0
  const importePipeline = licit?.stats?.importe_total_pipeline || 0

  // Alertas globales
  const alertasLicit = (pipeline.go || 0) // licitaciones GO pendientes de presentar
  const alertasRRHH = (a.pendientes_aprobar || 0) + (p.contratos_vencer_30d || 0)
  const alertasPRL = (prl.epis_caducados || 0) + (prl.recos_vencidos || 0) + (prl.formacion_caducada || 0)
  const alertasTotal = alertasLicit + alertasRRHH + alertasPRL

  const pctPresente = p.activos > 0 ? Math.round(((f.fichados_ahora || 0) / p.activos) * 100) : 0

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Buenos días{usuario?.nombre ? `, ${usuario.nombre}` : ''}
          </h1>
          <p className="text-sm text-slate-500">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {ultimaAct && <span className="ml-2">· Actualizado {ultimaAct.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
        </div>
        <button onClick={() => cargar(true)} disabled={recargando}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl">
          <RefreshCw size={14} className={recargando ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {/* ── Alerta banner si hay urgencias ── */}
      {alertasTotal > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
          <p className="text-sm font-bold text-red-800">{alertasTotal} alerta{alertasTotal > 1 ? 's' : ''} requieren atención —
            {alertasLicit > 0 && <span className="ml-1">{alertasLicit} licitaciones GO pendientes</span>}
            {alertasRRHH > 0 && <span className="ml-1">· {alertasRRHH} alertas RRHH</span>}
            {alertasPRL > 0 && <span className="ml-1">· {alertasPRL} alertas PRL</span>}
          </p>
        </div>
      )}

      {/* ── FILA 1: KPIs globales ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          {
            icon: FileSearch, label: 'Pipeline activo', valor: totalPipeline,
            sub: importePipeline > 0 ? fmtEuro(importePipeline) : 'licitaciones activas',
            color: 'text-blue-600', bg: 'bg-white', border: 'border-slate-200',
            ruta: '/licitaciones-dashboard'
          },
          {
            icon: Target, label: 'Tasa de éxito', valor: tasaExito + '%',
            sub: (contratos.adjudicadas || 0) + ' adjudicadas de ' + (contratos.total || 0),
            color: 'text-violet-600', bg: 'bg-white', border: 'border-slate-200',
            ruta: '/licitaciones-dashboard'
          },
          {
            icon: Users, label: 'Plantilla activa', valor: p.activos || 0,
            sub: pctPresente + '% fichado ahora · ' + (a.hoy_ausentes || 0) + ' ausentes',
            color: 'text-[#1a3c34]', bg: 'bg-white', border: 'border-slate-200',
            ruta: '/dashboard-rrhh'
          },
          {
            icon: Euro, label: 'Coste mensual est.', valor: fmtEuro(costes.coste_mensual_estimado || 0),
            sub: fmtEuro(costes.coste_anual_estimado || 0) + ' anuales',
            color: 'text-slate-700', bg: 'bg-white', border: 'border-slate-200',
            ruta: '/dashboard-rrhh'
          },
        ].map((kpi: any, i: number) => (
          <button key={i} onClick={() => navigate(kpi.ruta)}
            className={`${kpi.bg} border-2 ${kpi.border} rounded-2xl p-5 text-left hover:shadow-md transition-all`}>
            <div className="flex items-center justify-between mb-3">
              <kpi.icon size={20} className={kpi.color} />
              <ChevronRight size={14} className="text-slate-300" />
            </div>
            <p className="text-2xl font-black text-slate-900">{kpi.valor}</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">{kpi.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
          </button>
        ))}
      </div>

      {/* ── FILA 2: Cards de módulos ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          {
            label: 'Dashboard licitaciones',
            icon: FileSearch,
            ruta: '/licitaciones-dashboard',
            color: 'from-blue-700 to-blue-800',
            stats: [
              { label: 'Pipeline activo', valor: totalPipeline },
              { label: 'Adjudicadas', valor: pipeline.adjudicada || 0 },
              { label: 'Tasa éxito', valor: tasaExito + '%' },
            ]
          },
          {
            label: 'Dashboard RRHH',
            icon: Users,
            ruta: '/dashboard-rrhh',
            color: 'from-[#1a3c34] to-[#2d5a4e]',
            stats: [
              { label: 'Plantilla activa', valor: p.activos || 0 },
              { label: 'Fichados ahora', valor: f.fichados_ahora || 0 },
              { label: 'Ausentes hoy', valor: a.hoy_ausentes || 0 },
            ]
          },
          {
            label: 'Dashboard PRL',
            icon: Shield,
            ruta: '/prl',
            color: 'from-orange-600 to-orange-700',
            stats: [
              { label: 'EPIs caducados', valor: prl.epis_caducados || 0, alerta: (prl.epis_caducados || 0) > 0 },
              { label: 'Recos. vencidos', valor: prl.recos_vencidos || 0, alerta: (prl.recos_vencidos || 0) > 0 },
              { label: 'Form. caducada', valor: prl.formacion_caducada || 0, alerta: (prl.formacion_caducada || 0) > 0 },
            ]
          },
          {
            label: 'Dashboard territorio',
            icon: Building2,
            ruta: '/territorio',
            color: 'from-slate-600 to-slate-700',
            proximamente: true,
            stats: [
              { label: 'Próximamente', valor: '—' },
            ]
          },
        ].map((mod: any) => (
          <button key={mod.ruta} onClick={() => navigate(mod.ruta)}
            className={`bg-gradient-to-br ${mod.color} rounded-2xl p-5 text-left hover:opacity-95 active:scale-[0.98] transition-all shadow-sm`}>
            <div className="flex items-center justify-between mb-3">
              <mod.icon size={20} className="text-white/80" />
              <ChevronRight size={14} className="text-white/50" />
            </div>
            <p className="text-sm font-bold text-white mb-3">{mod.label}</p>
            <div className="space-y-1.5">
              {mod.stats.map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[10px] text-white/60">{s.label}</span>
                  <span className={`text-xs font-black ${s.alerta ? 'text-red-300' : 'text-white'}`}>{s.valor}</span>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* ── FILA 3: Detalle módulos ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">

        {/* Licitaciones */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSearch size={15} className="text-blue-600" /> Licitaciones
            </h3>
            <button onClick={() => navigate('/licitaciones-dashboard')} className="text-xs text-blue-600 hover:text-blue-800 font-semibold">Ver todo →</button>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Nuevas', valor: pipeline.nueva || 0, color: 'bg-blue-500' },
              { label: 'En análisis', valor: pipeline.en_analisis || 0, color: 'bg-amber-500' },
              { label: 'GO — pendientes', valor: pipeline.go || 0, color: 'bg-emerald-500' },
              { label: 'Presentadas', valor: pipeline.presentada || 0, color: 'bg-indigo-500' },
              { label: 'Adjudicadas', valor: pipeline.adjudicada || 0, color: 'bg-violet-500' },
            ].map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${item.color} flex-shrink-0`} />
                <span className="text-xs text-slate-600 flex-1">{item.label}</span>
                <span className="text-xs font-black text-slate-900">{item.valor}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Tasa de éxito</span>
            <span className="text-sm font-black text-violet-700">{tasaExito}%</span>
          </div>
        </div>

        {/* RRHH */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users size={15} className="text-[#1a3c34]" /> RRHH
            </h3>
            <button onClick={() => navigate('/dashboard-rrhh')} className="text-xs text-[#1a3c34] hover:text-[#2d5a4e] font-semibold">Ver todo →</button>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-slate-600">Fichados ahora</span>
                <span className="text-xs font-bold text-emerald-700">{f.fichados_ahora || 0} / {p.activos || 0}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: pctPresente + '%' }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-slate-900">{a.hoy_ausentes || 0}</p>
                <p className="text-[10px] text-slate-500">Ausentes hoy</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${(a.pendientes_aprobar || 0) > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                <p className={`text-lg font-black ${(a.pendientes_aprobar || 0) > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{a.pendientes_aprobar || 0}</p>
                <p className="text-[10px] text-slate-500">Pend. aprobar</p>
              </div>
            </div>
            {(p.contratos_vencer_30d || 0) > 0 && (
              <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-xl">
                <UserX size={12} className="text-red-600 flex-shrink-0" />
                <p className="text-xs text-red-700 font-bold">{p.contratos_vencer_30d} contrato{p.contratos_vencer_30d > 1 ? 's' : ''} vence en 30 días</p>
              </div>
            )}
          </div>
        </div>

        {/* PRL + RGPD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield size={15} className="text-orange-600" /> Cumplimiento
            </h3>
            <button onClick={() => navigate('/prl')} className="text-xs text-orange-600 hover:text-orange-800 font-semibold">Ver PRL →</button>
          </div>
          <div className="space-y-2">
            {alertasPRL === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <p className="text-sm font-bold text-emerald-800">PRL al día</p>
              </div>
            ) : (
              <>
                {prl.epis_caducados > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <XCircle size={13} className="text-red-600 flex-shrink-0" />
                      <span className="text-xs text-red-700 font-medium">EPIs caducados</span>
                    </div>
                    <span className="text-sm font-black text-red-700">{prl.epis_caducados}</span>
                  </div>
                )}
                {prl.recos_vencidos > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <XCircle size={13} className="text-red-600 flex-shrink-0" />
                      <span className="text-xs text-red-700 font-medium">Reconocimientos vencidos</span>
                    </div>
                    <span className="text-sm font-black text-red-700">{prl.recos_vencidos}</span>
                  </div>
                )}
                {prl.formacion_caducada > 0 && (
                  <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={13} className="text-amber-600 flex-shrink-0" />
                      <span className="text-xs text-amber-700 font-medium">Formación caducada</span>
                    </div>
                    <span className="text-sm font-black text-amber-700">{prl.formacion_caducada}</span>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <button onClick={() => navigate('/rgpd')} className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all">
              <span className="text-xs font-semibold text-slate-700">Ver RGPD</span>
              <ChevronRight size={13} className="text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* ── FILA 3: Accesos rápidos ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Nueva licitación', icon: Zap, ruta: '/oportunidades/nueva', color: 'bg-blue-600 text-white' },
          { label: 'Fichar entrada', icon: Clock, ruta: '/fichajes', color: 'bg-[#1a3c34] text-white' },
          { label: 'Solicitar ausencia', icon: Calendar, ruta: '/ausencias', color: 'bg-amber-600 text-white' },
          { label: 'Dashboard RRHH', icon: BarChart3, ruta: '/dashboard-rrhh', color: 'bg-slate-700 text-white' },
        ].map((acc: any, i: number) => (
          <button key={i} onClick={() => navigate(acc.ruta)}
            className={`${acc.color} rounded-2xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity`}>
            <acc.icon size={18} />
            <span className="text-sm font-bold">{acc.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}