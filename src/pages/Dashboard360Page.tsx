import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { SkeletonPage } from '../components/Skeleton'
import {
  RefreshCw, Bell, Users, Euro, MapPin, ClipboardList,
  AlertTriangle, CheckCircle2, ChevronRight, TrendingUp,
  FileSearch, Shield, Building2, Target, BarChart3,
  Clock, Calendar, Zap, Trophy
} from 'lucide-react'

function fmtEuro(n: number) {
  if (!n) return '—'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M €'
  if (n >= 1000) return Math.round(n / 1000) + 'K €'
  return n.toLocaleString('es-ES') + ' €'
}

function diasRestantes(fecha: string) {
  if (!fecha) return null
  try {
    const f = new Date(fecha.split(' ')[0])
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    return Math.ceil((f.getTime() - hoy.getTime()) / 86400000)
  } catch { return null }
}

export default function Dashboard360Page() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [recargando, setRecargando] = useState(false)
  const [ultimaAct, setUltimaAct] = useState<Date | null>(null)

  const cargar = async (silencioso = false) => {
    if (silencioso) setRecargando(true)
    else setCargando(true)
    try {
      const d = await (api as any).dashboard360()
      setData(d)
      setUltimaAct(new Date())
    } catch(e) { console.error(e) }
    finally { setCargando(false); setRecargando(false) }
  }

  useEffect(() => { cargar() }, [])

  if (cargando) return <SkeletonPage />

  const lit  = data?.licitaciones || {}
  const rrhh = data?.rrhh || {}
  const terr = data?.territorio || {}
  const alertas: any[] = data?.alertas || []
  const pipeline = lit.pipeline || {}
  const plantilla = rrhh.plantilla || {}
  const fichajes  = rrhh.fichajes || {}
  const ausencias = rrhh.ausencias || {}
  const prl       = rrhh.prl || {}
  const costes    = rrhh.costes || {}

  const totalPipeline = (pipeline.nueva || 0) + (pipeline.en_analisis || 0) + (pipeline.go || 0)
  const tasaExito = lit.contratos?.tasa_exito || 0
  const pctFichados = plantilla.activos > 0 ? Math.round(((fichajes.fichados_ahora || 0) / plantilla.activos) * 100) : 0
  const alertasAltas = alertas.filter(a => a.nivel === 'alta').length

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="p-6 lg:p-8 max-w-7xl">

      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {saludo}{usuario?.nombre ? `, ${usuario.nombre}` : ''}
          </h1>
          <p className="text-sm text-slate-500">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {ultimaAct && <span className="ml-2 text-slate-400">· Act. {ultimaAct.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
        </div>
        <button onClick={() => cargar(true)} disabled={recargando}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl">
          <RefreshCw size={14} className={recargando ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {/* Alertas críticas */}
      {alertas.length > 0 && (
        <div className={`border-2 rounded-2xl p-4 mb-6 ${alertasAltas > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-2 mb-3">
            <Bell size={16} className={alertasAltas > 0 ? 'text-red-600' : 'text-amber-600'} />
            <p className="text-sm font-bold text-slate-800">
              {alertas.length} alerta{alertas.length > 1 ? 's' : ''} requieren atención
            </p>
          </div>
          <div className="space-y-2">
            {alertas.map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                  a.nivel === 'alta' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>{a.nivel.toUpperCase()}</span>
                <span className="text-xs text-slate-700">{a.msg}</span>
                <span className="text-[10px] text-slate-400 ml-1">[{a.modulo}]</span>
                {a.id && (
                  <button onClick={() => navigate('/oportunidades/' + a.id)}
                    className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-semibold shrink-0">
                    Ver →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { icon: FileSearch, label: 'Pipeline activo', valor: totalPipeline, sub: fmtEuro(lit.valor_pipeline_go || 0), color: 'text-blue-600', ruta: '/oportunidades' },
          { icon: Trophy,     label: 'Tasa de éxito',  valor: tasaExito + '%', sub: (lit.contratos?.ganadas || 0) + ' contratos ganados', color: 'text-violet-600', ruta: '/seguimiento' },
          { icon: Users,      label: 'Plantilla',      valor: plantilla.activos || 0, sub: pctFichados + '% fichado · ' + (ausencias.hoy_ausentes || 0) + ' ausentes', color: 'text-[#1a3c34]', ruta: '/personal' },
          { icon: MapPin,     label: 'Centros activos',valor: terr.activos || 0, sub: fmtEuro(terr.presupuesto_anual || 0) + '/año · ' + (terr.personal || 0) + ' personas', color: 'text-emerald-600', ruta: '/territorio' },
        ].map((k, i) => (
          <button key={i} onClick={() => navigate(k.ruta)}
            className="bg-white border border-slate-200 rounded-2xl p-5 text-left hover:shadow-md hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <k.icon size={20} className={k.color} />
              <ChevronRight size={14} className="text-slate-300" />
            </div>
            <p className="text-2xl font-black text-slate-900">{k.valor}</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">{k.label}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{k.sub}</p>
          </button>
        ))}
      </div>

      {/* Fila principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">

        {/* Módulo Licitaciones */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSearch size={15} className="text-blue-600" /> Licitaciones
            </h3>
            <button onClick={() => navigate('/oportunidades')} className="text-xs text-blue-600 font-semibold">Ver →</button>
          </div>

          {/* Pipeline visual */}
          <div className="space-y-2 mb-4">
            {[
              { label: 'Nuevas', valor: pipeline.nueva || 0, color: 'bg-blue-500', w: pipeline.nueva || 0 },
              { label: 'En análisis', valor: pipeline.en_analisis || 0, color: 'bg-amber-500', w: pipeline.en_analisis || 0 },
              { label: 'GO pendiente', valor: pipeline.go || 0, color: 'bg-emerald-500', w: pipeline.go || 0 },
              { label: 'Adjudicadas', valor: pipeline.adjudicada || 0, color: 'bg-violet-500', w: pipeline.adjudicada || 0 },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${item.color} flex-shrink-0`} />
                <span className="text-xs text-slate-600 flex-1">{item.label}</span>
                <span className="text-xs font-black text-slate-900">{item.valor}</span>
              </div>
            ))}
          </div>

          {/* Próximas a vencer */}
          {lit.proximas_vencer?.length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              <p className="text-[10px] font-bold text-red-600 uppercase mb-2">⏰ Vencen pronto</p>
              {lit.proximas_vencer.slice(0, 3).map((o: any) => (
                <button key={o.id} onClick={() => navigate('/oportunidades/' + o.id)}
                  className="w-full flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg text-left mb-1">
                  <p className="text-xs text-slate-700 truncate flex-1">{o.titulo?.substring(0, 45)}</p>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ml-2 shrink-0 ${
                    o.dias <= 2 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>{o.dias === 0 ? 'Hoy' : o.dias + 'd'}</span>
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-slate-100 pt-3 mt-2 flex justify-between">
            <span className="text-xs text-slate-500">Tasa éxito</span>
            <span className="text-xs font-black text-violet-700">{tasaExito}%</span>
          </div>
        </div>

        {/* Módulo RRHH */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users size={15} className="text-[#1a3c34]" /> RRHH
            </h3>
            <button onClick={() => navigate('/dashboard-rrhh')} className="text-xs text-[#1a3c34] font-semibold">Ver →</button>
          </div>

          {/* Barra fichados */}
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-xs text-slate-500">Fichados ahora</span>
              <span className="text-xs font-bold text-emerald-700">{fichajes.fichados_ahora || 0}/{plantilla.activos || 0}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: pctFichados + '%' }} />
            </div>
          </div>

          {/* KPIs RRHH */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: 'Activos', valor: plantilla.activos || 0, bg: 'bg-slate-50' },
              { label: 'Ausentes hoy', valor: ausencias.hoy_ausentes || 0, bg: (ausencias.hoy_ausentes || 0) > 0 ? 'bg-amber-50' : 'bg-slate-50' },
              { label: 'Pend. aprobar', valor: ausencias.pendientes_aprobar || 0, bg: (ausencias.pendientes_aprobar || 0) > 0 ? 'bg-amber-50' : 'bg-slate-50' },
              { label: 'Alertas PRL', valor: (prl.epis_caducados || 0) + (prl.recos_vencidos || 0), bg: ((prl.epis_caducados || 0) + (prl.recos_vencidos || 0)) > 0 ? 'bg-red-50' : 'bg-slate-50' },
            ].map((k, i) => (
              <div key={i} className={`${k.bg} rounded-xl p-2.5 text-center`}>
                <p className="text-base font-black text-slate-900">{k.valor}</p>
                <p className="text-[9px] text-slate-500 uppercase">{k.label}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-3 flex justify-between">
            <span className="text-xs text-slate-500">Coste mensual est.</span>
            <span className="text-xs font-black text-slate-700">{fmtEuro(costes.coste_mensual_estimado || 0)}</span>
          </div>
        </div>

        {/* Módulo Territorio */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin size={15} className="text-emerald-600" /> Territorio
            </h3>
            <button onClick={() => navigate('/territorio')} className="text-xs text-emerald-600 font-semibold">Ver →</button>
          </div>

          {/* KPIs Territorio */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: 'Centros activos', valor: terr.activos || 0, bg: 'bg-emerald-50' },
              { label: 'Personal campo', valor: terr.personal || 0, bg: 'bg-slate-50' },
              { label: 'Incidencias', valor: terr.incidencias_abiertas || 0, bg: (terr.incidencias_abiertas || 0) > 0 ? 'bg-red-50' : 'bg-slate-50' },
              { label: 'Presup./año', valor: fmtEuro(terr.presupuesto_anual || 0), bg: 'bg-slate-50' },
            ].map((k, i) => (
              <div key={i} className={`${k.bg} rounded-xl p-2.5 text-center`}>
                <p className="text-sm font-black text-slate-900 truncate">{k.valor}</p>
                <p className="text-[9px] text-slate-500 uppercase">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Por tipo de servicio */}
          {Object.keys(terr.por_servicio || {}).length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Por tipo de servicio</p>
              {Object.entries(terr.por_servicio || {}).map(([tipo, count]: any) => (
                <div key={tipo} className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-600 capitalize">{tipo}</span>
                  <span className="text-xs font-bold text-slate-900">{count}</span>
                </div>
              ))}
            </div>
          )}

          {terr.centros === 0 && (
            <div className="text-center py-4">
              <MapPin size={24} className="text-slate-200 mx-auto mb-1" />
              <p className="text-xs text-slate-400">Sin centros aún</p>
              <button onClick={() => navigate('/territorio')} className="mt-2 text-xs text-emerald-600 font-semibold">Crear primer centro →</button>
            </div>
          )}
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Nueva licitación',    icon: Zap,           ruta: '/oportunidades/nueva', color: 'bg-blue-600' },
          { label: 'Nuevo parte trabajo', icon: ClipboardList, ruta: '/partes',              color: 'bg-[#1a3c34]' },
          { label: 'Nueva incidencia',    icon: AlertTriangle, ruta: '/partes',              color: 'bg-red-600' },
          { label: 'Dashboard RRHH',      icon: BarChart3,     ruta: '/dashboard-rrhh',      color: 'bg-slate-700' },
        ].map((acc, i) => (
          <button key={i} onClick={() => navigate(acc.ruta)}
            className={`${acc.color} text-white rounded-2xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity`}>
            <acc.icon size={18} className="flex-shrink-0" />
            <span className="text-sm font-bold">{acc.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}