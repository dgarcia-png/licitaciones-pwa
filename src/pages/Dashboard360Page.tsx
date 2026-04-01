// src/pages/Dashboard360Page.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { usePermisos } from '../hooks/usePermisos'
import { SkeletonPage } from '../components/Skeleton'
import {
  RefreshCw, Bell, Users, Euro, MapPin, ClipboardList,
  AlertTriangle, CheckCircle2, ChevronRight, TrendingUp,
  FileSearch, Building2, BarChart3, Clock, Zap,
  Map, Shield, Star, Package, Car, CalendarDays, Target,
  ArrowRight, ShieldAlert
} from 'lucide-react'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtEuro(n: number) {
  if (!n) return '—'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M €'
  if (n >= 1000)    return Math.round(n / 1000) + 'K €'
  return n.toLocaleString('es-ES') + ' €'
}

// ─── Componentes reutilizables ────────────────────────────────────────────────

function KpiGlobal({ icon: Icon, label, valor, sub, color, ruta }: any) {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate(ruta)}
      className="bg-white border border-slate-200 rounded-2xl p-5 text-left hover:shadow-md hover:border-slate-300 transition-all group">
      <div className="flex items-center justify-between mb-3">
        <Icon size={20} className={color} />
        <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
      </div>
      <p className="text-2xl font-black text-slate-900">{valor}</p>
      <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
    </button>
  )
}

function InfoRow({ label, valor, color = 'text-slate-900' }: { label: string; valor: any; color?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-bold ${color}`}>{valor}</span>
    </div>
  )
}

function MiniBar({ valor, total, color = 'bg-emerald-500', label, sub }: any) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-xs font-bold text-slate-700">{valor}/{total} <span className="text-slate-400 font-normal">({pct}%)</span></span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: pct + '%' }} />
      </div>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function DashboardCard({ titulo, icon: Icon, color, ruta, rutaLabel, children, alerta }: any) {
  const navigate = useNavigate()
  return (
    <div className={`bg-white rounded-2xl border-2 flex flex-col overflow-hidden transition-all hover:shadow-md ${alerta ? 'border-red-200' : 'border-slate-200 hover:border-slate-300'}`}>
      {/* Cabecera */}
      <div className={`flex items-center justify-between px-5 py-4 ${alerta ? 'bg-red-50' : 'bg-slate-50'} border-b border-slate-100`}>
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 ${color} rounded-lg`}>
            <Icon size={16} className="text-white" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">{titulo}</h3>
          {alerta && (
            <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
              {alerta}
            </span>
          )}
        </div>
        <button onClick={() => navigate(ruta)}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${alerta ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-[#1a3c34] text-white hover:bg-[#2d5a4e]'}`}>
          {rutaLabel || 'Ir al dashboard'} <ArrowRight size={12} />
        </button>
      </div>
      {/* Cuerpo */}
      <div className="flex-1 px-5 py-4">
        {children}
      </div>
    </div>
  )
}

function AccesoBtn({ icon: Icon, label, ruta, color, badge }: any) {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate(ruta)}
      className={`${color} text-white rounded-xl p-3.5 flex items-center gap-3 hover:opacity-90 transition-all hover:scale-[1.02] relative`}>
      <Icon size={17} className="flex-shrink-0" />
      <span className="text-sm font-semibold leading-tight">{label}</span>
      {badge && (
        <span className="ml-auto bg-white/25 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0">
          {badge}
        </span>
      )}
    </button>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Dashboard360Page() {
  const { usuario } = useAuth()
  const { puedeVerMenu } = usePermisos()
  const navigate = useNavigate()
  const [data,       setData]       = useState<any>(null)
  const [cargando,   setCargando]   = useState(true)
  const [recargando, setRecargando] = useState(false)
  const [ultimaAct,  setUltimaAct]  = useState<Date | null>(null)

  const cargar = async (silencioso = false) => {
    if (silencioso) setRecargando(true)
    else setCargando(true)
    try {
      const d = await api.dashboard360()
      setData(d)
      setUltimaAct(new Date())
    } catch (e) { console.error(e) }
    finally { setCargando(false); setRecargando(false) }
  }

  useEffect(() => { cargar() }, [])

  if (cargando) return <SkeletonPage />

  const lit      = data?.licitaciones || {}
  const rrhh     = data?.rrhh         || {}
  const terr     = data?.territorio   || {}
  const alertas: any[] = data?.alertas || []

  const pipeline   = lit.pipeline   || {}
  const plantilla  = rrhh.plantilla || {}
  const fichajes   = rrhh.fichajes  || {}
  const ausencias  = rrhh.ausencias || {}
  const prl        = rrhh.prl       || {}
  const costes     = rrhh.costes    || {}

  const totalPipeline  = (pipeline.nueva || 0) + (pipeline.en_analisis || 0) + (pipeline.go || 0)
  const tasaExito      = lit.contratos?.tasa_exito || 0
  const pctFichados    = (plantilla.activos || 0) > 0 ? Math.round(((fichajes.fichados_ahora || 0) / plantilla.activos) * 100) : 0
  const alertasAltas   = alertas.filter((a: any) => a.nivel === 'alta').length
  const alertasPRL     = (prl.epis_caducados || 0) + (prl.recos_vencidos || 0)
  const tengoTerritorio = puedeVerMenu('dashboard-territorio')
  const tengoRRHH       = puedeVerMenu('dashboard-rrhh')
  const tengoLicit      = puedeVerMenu('licitaciones-dashboard')
  const tengoInformes   = puedeVerMenu('informes')

  const hora    = new Date().getHours()
  const saludo  = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="p-6 lg:p-8 max-w-7xl">

      {/* ── Cabecera ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {saludo}{usuario?.nombre ? `, ${usuario.nombre.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-slate-500">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {ultimaAct && <span className="ml-2 text-slate-400">· Actualizado a las {ultimaAct.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
        </div>
        <button onClick={() => cargar(true)} disabled={recargando}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors">
          <RefreshCw size={14} className={recargando ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {/* ── Alertas ── */}
      {alertas.length > 0 && (
        <div className={`border-2 rounded-2xl p-4 mb-6 ${alertasAltas > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Bell size={15} className={alertasAltas > 0 ? 'text-red-600' : 'text-amber-600'} />
            <p className="text-sm font-bold text-slate-800">
              {alertas.length} alerta{alertas.length > 1 ? 's' : ''} pendientes
            </p>
          </div>
          <div className="space-y-1.5">
            {alertas.map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                  a.nivel === 'alta' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>{a.nivel.toUpperCase()}</span>
                <span className="text-xs text-slate-700 flex-1">{a.msg}</span>
                <span className="text-[10px] text-slate-400">[{a.modulo}]</span>
                {a.id && (
                  <button onClick={() => navigate('/oportunidades/' + a.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold shrink-0">Ver →</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KPIs globales ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiGlobal icon={FileSearch} label="Pipeline activo"   valor={totalPipeline}
          sub={fmtEuro(lit.valor_pipeline_go || 0) + ' en GO'}
          color="text-blue-600"   ruta={tengoLicit ? '/licitaciones-dashboard' : '/oportunidades'} />
        <KpiGlobal icon={Target}     label="Tasa de éxito"    valor={tasaExito + '%'}
          sub={(lit.contratos?.ganadas || 0) + ' contratos ganados'}
          color="text-violet-600" ruta={tengoLicit ? '/licitaciones-dashboard' : '/seguimiento'} />
        <KpiGlobal icon={Users}      label="Plantilla activa" valor={plantilla.activos || 0}
          sub={pctFichados + '% fichado · ' + (ausencias.hoy_ausentes || 0) + ' ausentes'}
          color="text-[#1a3c34]"  ruta={tengoRRHH ? '/dashboard-rrhh' : '/personal'} />
        <KpiGlobal icon={MapPin}     label="Centros activos"  valor={terr.activos || 0}
          sub={fmtEuro(terr.presupuesto_anual || 0) + '/año'}
          color="text-emerald-600" ruta={tengoTerritorio ? '/dashboard-territorio' : '/territorio'} />
      </div>

      {/* ── 3 Cards de área ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">

        {/* Licitaciones */}
        <DashboardCard
          titulo="Licitaciones"
          icon={FileSearch}
          color="bg-blue-600"
          ruta={tengoLicit ? '/licitaciones-dashboard' : '/oportunidades'}
          rutaLabel="Dashboard licitaciones"
          alerta={lit.proximas_vencer?.length > 0 ? lit.proximas_vencer.length + ' vencen pronto' : null}>
          {/* Pipeline */}
          <div className="space-y-2 mb-4">
            {[
              { label: 'Nuevas',       valor: pipeline.nueva        || 0, color: 'bg-blue-500' },
              { label: 'En análisis',  valor: pipeline.en_analisis  || 0, color: 'bg-amber-500' },
              { label: 'GO pendiente', valor: pipeline.go           || 0, color: 'bg-emerald-500' },
              { label: 'Presentadas',  valor: pipeline.presentada   || 0, color: 'bg-indigo-500' },
              { label: 'Adjudicadas',  valor: pipeline.adjudicada   || 0, color: 'bg-violet-500' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${item.color} shrink-0`} />
                <span className="text-xs text-slate-600 flex-1">{item.label}</span>
                <span className="text-xs font-black text-slate-900">{item.valor}</span>
              </div>
            ))}
          </div>
          {/* Próximas a vencer */}
          {lit.proximas_vencer?.length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              <p className="text-[10px] font-bold text-red-600 uppercase mb-2 flex items-center gap-1">
                <Clock size={10} /> Vencen esta semana
              </p>
              {lit.proximas_vencer.slice(0, 3).map((o: any) => (
                <button key={o.id} onClick={() => navigate('/oportunidades/' + o.id)}
                  className="w-full flex items-center gap-2 py-1.5 hover:bg-slate-50 rounded-lg text-left">
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${
                    o.dias <= 2 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>{o.dias === 0 ? 'Hoy' : o.dias + 'd'}</span>
                  <p className="text-xs text-slate-700 truncate flex-1">{o.titulo?.substring(0, 40)}</p>
                </button>
              ))}
            </div>
          )}
          <div className="border-t border-slate-100 pt-3 mt-3 flex justify-between items-center">
            <span className="text-xs text-slate-400">Tasa de éxito</span>
            <span className="text-sm font-black text-violet-700">{tasaExito}%</span>
          </div>
        </DashboardCard>

        {/* RRHH */}
        <DashboardCard
          titulo="Recursos Humanos"
          icon={Users}
          color="bg-[#1a3c34]"
          ruta={tengoRRHH ? '/dashboard-rrhh' : '/personal'}
          rutaLabel="Dashboard RRHH"
          alerta={alertasPRL > 0 ? alertasPRL + ' alertas PRL' : null}>
          <MiniBar
            label="Fichados ahora"
            valor={fichajes.fichados_ahora || 0}
            total={plantilla.activos || 0}
            color="bg-emerald-500"
            sub={(plantilla.activos || 0) - (fichajes.fichados_ahora || 0) + ' sin fichar'}
          />
          <div className="grid grid-cols-2 gap-2 mt-4">
            {[
              { label: 'Activos',       valor: plantilla.activos || 0,            bg: 'bg-slate-50' },
              { label: 'Ausentes hoy',  valor: ausencias.hoy_ausentes || 0,       bg: (ausencias.hoy_ausentes || 0) > 0 ? 'bg-amber-50' : 'bg-slate-50' },
              { label: 'Pend. aprobar', valor: ausencias.pendientes_aprobar || 0, bg: (ausencias.pendientes_aprobar || 0) > 0 ? 'bg-amber-50' : 'bg-slate-50' },
              { label: 'Alertas PRL',   valor: alertasPRL,                         bg: alertasPRL > 0 ? 'bg-red-50' : 'bg-slate-50' },
            ].map((k, i) => (
              <div key={i} className={`${k.bg} rounded-xl p-2.5 text-center`}>
                <p className="text-base font-black text-slate-900">{k.valor}</p>
                <p className="text-[9px] text-slate-500 uppercase">{k.label}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 pt-3 mt-3 flex justify-between items-center">
            <span className="text-xs text-slate-400">Coste mensual est.</span>
            <span className="text-sm font-black text-slate-700">{fmtEuro(costes.coste_mensual_estimado || 0)}</span>
          </div>
        </DashboardCard>

        {/* Territorio */}
        <DashboardCard
          titulo="Territorio"
          icon={Map}
          color="bg-emerald-600"
          ruta={tengoTerritorio ? '/dashboard-territorio' : '/territorio'}
          rutaLabel="Dashboard territorio"
          alerta={(terr.incidencias_abiertas || 0) > 0 ? terr.incidencias_abiertas + ' incidencias' : null}>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: 'Centros activos', valor: terr.activos   || 0,               bg: 'bg-emerald-50',  color: 'text-emerald-700' },
              { label: 'Personal campo',  valor: terr.personal  || 0,               bg: 'bg-slate-50',    color: 'text-slate-900' },
              { label: 'Incidencias',     valor: terr.incidencias_abiertas || 0,    bg: (terr.incidencias_abiertas || 0) > 0 ? 'bg-red-50' : 'bg-slate-50', color: (terr.incidencias_abiertas || 0) > 0 ? 'text-red-700' : 'text-slate-900' },
              { label: 'Presup./año',     valor: fmtEuro(terr.presupuesto_anual || 0), bg: 'bg-slate-50', color: 'text-slate-900' },
            ].map((k, i) => (
              <div key={i} className={`${k.bg} rounded-xl p-2.5 text-center`}>
                <p className={`text-sm font-black ${k.color} truncate`}>{k.valor}</p>
                <p className="text-[9px] text-slate-500 uppercase">{k.label}</p>
              </div>
            ))}
          </div>
          {/* Accesos directos territorio */}
          <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-2">
            {[
              { label: 'Mapa operarios', ruta: '/mapa-supervisor', icon: MapPin },
              { label: 'Partes de hoy',  ruta: '/partes',          icon: ClipboardList },
              { label: 'Incidencias',    ruta: '/incidencias',     icon: ShieldAlert },
              { label: 'Planificación',  ruta: '/planificacion',   icon: CalendarDays },
            ].map((item, i) => (
              <button key={i} onClick={() => navigate(item.ruta)}
                className="flex items-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-left transition-colors">
                <item.icon size={12} className="text-slate-500 shrink-0" />
                <span className="text-[11px] text-slate-600 truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </DashboardCard>
      </div>

      {/* ── Accesos rápidos ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Accesos rápidos</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {/* Fila 1: Dashboards de área */}
          {tengoLicit      && <AccesoBtn icon={BarChart3}     label="Dashboard Licitaciones" ruta="/licitaciones-dashboard" color="bg-blue-700" />}
          {tengoRRHH       && <AccesoBtn icon={Users}         label="Dashboard RRHH"         ruta="/dashboard-rrhh"         color="bg-[#1a3c34]" />}
          {tengoTerritorio && <AccesoBtn icon={Map}           label="Dashboard Territorio"   ruta="/dashboard-territorio"   color="bg-emerald-700" />}
          {tengoInformes   && <AccesoBtn icon={TrendingUp}    label="Informes P&L"           ruta="/informes"               color="bg-violet-700" />}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Fila 2: Acciones */}
          <AccesoBtn icon={Zap}           label="Nueva licitación"    ruta="/oportunidades/nueva" color="bg-slate-700" />
          <AccesoBtn icon={MapPin}        label="Mapa operarios"      ruta="/mapa-supervisor"      color="bg-slate-600" />
          <AccesoBtn icon={ShieldAlert}   label="Incidencias SLA"     ruta="/incidencias"
            color={alertas.some((a: any) => a.modulo === 'territorio') ? 'bg-red-600' : 'bg-slate-600'}
            badge={alertas.filter((a: any) => a.modulo === 'territorio').length || undefined} />
          <AccesoBtn icon={Shield}        label="PRL y certificaciones" ruta="/prl"
            color={alertasPRL > 0 ? 'bg-orange-600' : 'bg-slate-600'}
            badge={alertasPRL > 0 ? alertasPRL : undefined} />
        </div>
      </div>

    </div>
  )
}
