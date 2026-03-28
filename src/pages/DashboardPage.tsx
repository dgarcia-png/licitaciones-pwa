import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  Users, Calendar, AlertTriangle, Euro,
  FileSearch, RefreshCw, ChevronRight, UserX,
  Target, BarChart3, Zap, Bell, Trophy
} from 'lucide-react'
import { SkeletonPage } from '../components/Skeleton'

function fmtEuro(n: number) {
  if (!n) return '—'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M €'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K €'
  return n.toLocaleString('es-ES') + ' €'
}

function diasRestantes(fecha: string) {
  if (!fecha) return null
  try {
    const f = new Date(fecha.split(' ')[0])
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    return Math.ceil((f.getTime() - hoy.getTime()) / 86400000)
  } catch { return null }
}

export default function DashboardPage() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [licit, setLicit] = useState<any>(null)
  const [rrhh, setRrhh] = useState<any>(null)
  const [oportunidades, setOportunidades] = useState<any[]>([])
  const [territorio, setTerritorio] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [recargando, setRecargando] = useState(false)
  const [ultimaAct, setUltimaAct] = useState<Date | null>(null)

  const cargar = async (silencioso = false) => {
    if (silencioso) setRecargando(true)
    else setCargando(true)
    try {
      const [l, r, opos, terr] = await Promise.all([
        api.dashboard(),
        (api as any).dashboardRRHH(),
        api.oportunidades(),
        (api as any).dashboardTerritorio().catch(() => null)
      ])
      setLicit(l); setRrhh(r)
      setOportunidades(opos.oportunidades || [])
      setTerritorio(terr)
      setUltimaAct(new Date())
    } catch (e) { console.error(e) }
    finally { setCargando(false); setRecargando(false) }
  }

  useEffect(() => { cargar() }, [])

  // Auto-refresh cada 5 minutos
  useEffect(() => {
    const interval = setInterval(() => cargar(true), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (cargando) return <SkeletonPage />

  const pipeline = licit?.pipeline || {}
  const contratos = licit?.contratos || {}
  const p = rrhh?.plantilla || {}
  const f = rrhh?.fichajes || {}
  const a = rrhh?.ausencias || {}
  const prl = rrhh?.prl || {}
  const costes = rrhh?.costes || {}

  const totalPipeline = (pipeline.nueva || 0) + (pipeline.en_analisis || 0) + (pipeline.go || 0)
  const tasaExito = contratos.total > 0 ? Math.round((contratos.adjudicadas / contratos.total) * 100) : 0
  const pctPresente = p.activos > 0 ? Math.round(((f.fichados_ahora || 0) / p.activos) * 100) : 0

  // Alertas vencimiento próximos 7 días
  const vencenProximo = oportunidades.filter(o => {
    if (!['nueva', 'en_analisis', 'go', 'go_aprobado'].includes(o.estado)) return false
    const d = diasRestantes(o.fecha_limite)
    return d !== null && d >= 0 && d <= 7
  }).sort((a, b) => (diasRestantes(a.fecha_limite) || 99) - (diasRestantes(b.fecha_limite) || 99))

  const alertasRRHH = (a.pendientes_aprobar || 0) + (p.contratos_vencer_30d || 0)
  const alertasPRL = (prl.epis_caducados || 0) + (prl.recos_vencidos || 0) + (prl.formacion_caducada || 0)

  const ultimasOpos = oportunidades
    .filter(o => ['nueva', 'en_analisis', 'go', 'go_aprobado'].includes(o.estado))
    .slice(0, 5)

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

      {/* Alertas vencimiento */}
      {vencenProximo.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={16} className="text-red-600" />
            <p className="text-sm font-bold text-red-800">
              {vencenProximo.length} licitación{vencenProximo.length > 1 ? 'es' : ''} vence{vencenProximo.length > 1 ? 'n' : ''} en los próximos 7 días
            </p>
          </div>
          <div className="space-y-2">
            {vencenProximo.map((o: any) => {
              const d = diasRestantes(o.fecha_limite)
              return (
                <button key={o.id} onClick={() => navigate('/oportunidades/' + o.id)}
                  className="w-full flex items-center justify-between p-3 bg-white border border-red-200 rounded-xl hover:border-red-400 transition-colors text-left">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{o.titulo}</p>
                    <p className="text-[10px] text-slate-500">{o.organismo}</p>
                  </div>
                  <div className={`ml-3 px-2.5 py-1 rounded-lg text-xs font-black shrink-0 ${
                    d === 0 ? 'bg-red-600 text-white' :
                    (d ?? 99) <= 2 ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {d === 0 ? '¡Hoy!' : d === 1 ? 'Mañana' : (d ?? 0) + 'd'}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Otras alertas */}
      {(alertasRRHH > 0 || alertasPRL > 0) && vencenProximo.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm font-bold text-amber-800">
            {alertasRRHH > 0 && <span>{alertasRRHH} alertas RRHH</span>}
            {alertasPRL > 0 && <span className="ml-1">· {alertasPRL} alertas PRL</span>}
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          { icon: FileSearch, label: 'Pipeline activo', valor: totalPipeline, sub: fmtEuro(licit?.valor_pipeline_go || 0), color: 'text-blue-600', ruta: '/oportunidades' },
          { icon: Trophy, label: 'Tasa de éxito', valor: tasaExito + '%', sub: (contratos.adjudicadas || 0) + ' adjudicadas', color: 'text-violet-600', ruta: '/seguimiento' },
          { icon: Users, label: 'Plantilla activa', valor: p.activos || 0, sub: pctPresente + '% fichado · ' + (a.hoy_ausentes || 0) + ' ausentes', color: 'text-[#1a3c34]', ruta: '/dashboard-rrhh' },
          { icon: Euro, label: 'Coste mensual', valor: fmtEuro(costes.coste_mensual_estimado || 0), sub: fmtEuro(costes.coste_anual_estimado || 0) + ' anuales', color: 'text-slate-700', ruta: '/dashboard-rrhh' },
        ].map((kpi: any, i: number) => (
          <button key={i} onClick={() => navigate(kpi.ruta)}
            className="bg-white border border-slate-200 rounded-2xl p-5 text-left hover:shadow-md hover:border-slate-300 transition-all">
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

      {/* Fila principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">

        {/* Últimas oportunidades */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSearch size={15} className="text-blue-600" /> Oportunidades activas
            </h3>
            <button onClick={() => navigate('/oportunidades')} className="text-xs text-blue-600 hover:text-blue-800 font-semibold">Ver todas →</button>
          </div>
          {ultimasOpos.length === 0 ? (
            <div className="text-center py-8">
              <FileSearch size={32} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Sin oportunidades activas</p>
              <button onClick={() => navigate('/oportunidades')}
                className="mt-3 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl">
                Buscar en PLACSP
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {ultimasOpos.map((o: any) => {
                const d = diasRestantes(o.fecha_limite)
                const estadoColor: Record<string, string> = {
                  nueva: 'bg-slate-100 text-slate-600',
                  en_analisis: 'bg-amber-100 text-amber-700',
                  go: 'bg-emerald-100 text-emerald-700',
                  go_aprobado: 'bg-violet-100 text-violet-700'
                }
                return (
                  <button key={o.id} onClick={() => navigate('/oportunidades/' + o.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-left border border-transparent hover:border-slate-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{o.titulo}</p>
                      <p className="text-xs text-slate-500 truncate">{o.organismo} · {fmtEuro(Number(o.presupuesto))}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {d !== null && d <= 7 && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${d <= 2 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {d === 0 ? 'Hoy' : d + 'd'}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${estadoColor[o.estado] || 'bg-slate-100 text-slate-600'}`}>
                        {o.estado?.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-xs font-black text-slate-400">{o.scoring}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Lateral */}
        <div className="space-y-4">
          {/* Pipeline */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Target size={14} className="text-violet-600" /> Pipeline
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Nuevas', valor: pipeline.nueva || 0, color: 'bg-blue-500' },
                { label: 'En análisis', valor: pipeline.en_analisis || 0, color: 'bg-amber-500' },
                { label: 'GO pendiente', valor: pipeline.go || 0, color: 'bg-emerald-500' },
                { label: 'Adjudicadas', valor: pipeline.adjudicada || 0, color: 'bg-violet-500' },
              ].map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${item.color} flex-shrink-0`} />
                  <span className="text-xs text-slate-600 flex-1">{item.label}</span>
                  <span className="text-xs font-black text-slate-900">{item.valor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RRHH */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Users size={14} className="text-[#1a3c34]" /> RRHH
            </h3>
            <div className="mb-3">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-slate-500">Fichados ahora</span>
                <span className="text-xs font-bold text-emerald-700">{f.fichados_ahora || 0}/{p.activos || 0}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: pctPresente + '%' }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className={`rounded-xl p-2.5 text-center ${(a.pendientes_aprobar || 0) > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                <p className={`text-base font-black ${(a.pendientes_aprobar || 0) > 0 ? 'text-amber-700' : 'text-slate-700'}`}>{a.pendientes_aprobar || 0}</p>
                <p className="text-[9px] text-slate-500">Pend. aprobar</p>
              </div>
              <div className={`rounded-xl p-2.5 text-center ${alertasPRL > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                <p className={`text-base font-black ${alertasPRL > 0 ? 'text-red-700' : 'text-slate-700'}`}>{alertasPRL}</p>
                <p className="text-[9px] text-slate-500">Alertas PRL</p>
              </div>
            </div>
            {(p.contratos_vencer_30d || 0) > 0 && (
              <div className="mt-2 flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-xl">
                <UserX size={11} className="text-red-600 flex-shrink-0" />
                <p className="text-[10px] text-red-700 font-bold">{p.contratos_vencer_30d} contrato{p.contratos_vencer_30d > 1 ? 's' : ''} vence en 30d</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TERRITORIO — datos operativos del día */}
      {territorio && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              🗺️ Territorio — operativo hoy
            </h3>
            <span className="text-[10px] text-slate-400">Act. {territorio.ultima_actualizacion}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { l: 'Centros activos', v: territorio.activos || 0, c: 'text-[#1a3c34]', bg: 'bg-[#1a3c34]/5' },
              { l: 'Partes hoy', v: territorio.partes_hoy || 0, c: 'text-blue-700', bg: 'bg-blue-50',
                sub: territorio.partes_en_curso > 0 ? `${territorio.partes_en_curso} en curso` : '' },
              { l: 'Horas trabajadas', v: (territorio.horas_hoy || 0) + 'h', c: 'text-emerald-700', bg: 'bg-emerald-50' },
              { l: 'Calidad mes', v: (territorio.calidad_media_mes || 0) + '/5', 
                c: (territorio.calidad_media_mes || 0) >= 4 ? 'text-emerald-700' : (territorio.calidad_media_mes || 0) >= 3 ? 'text-amber-700' : 'text-red-700',
                bg: (territorio.calidad_media_mes || 0) >= 4 ? 'bg-emerald-50' : (territorio.calidad_media_mes || 0) >= 3 ? 'bg-amber-50' : 'bg-red-50' },
            ].map((k: any, i: number) => (
              <div key={i} className={`${k.bg} rounded-xl p-3 text-center`}>
                <p className={`text-xl font-black ${k.c}`}>{k.v}</p>
                <p className="text-[9px] text-slate-500 uppercase mt-0.5">{k.l}</p>
                {k.sub && <p className="text-[9px] text-slate-400">{k.sub}</p>}
              </div>
            ))}
          </div>
          {((territorio.incidencias_abiertas || 0) > 0 || (territorio.ordenes_pendientes || 0) > 0 || (territorio.acciones_correctivas || 0) > 0) && (
            <div className="flex flex-wrap gap-2">
              {(territorio.incidencias_abiertas || 0) > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl">
                  <span className="text-[10px] font-bold text-red-700">⚠️ {territorio.incidencias_abiertas} incidencia{territorio.incidencias_abiertas > 1 ? 's' : ''} abierta{territorio.incidencias_abiertas > 1 ? 's' : ''}</span>
                </div>
              )}
              {(territorio.ordenes_pendientes || 0) > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-[10px] font-bold text-amber-700">📋 {territorio.ordenes_pendientes} orden{territorio.ordenes_pendientes > 1 ? 'es' : ''} pendiente{territorio.ordenes_pendientes > 1 ? 's' : ''}</span>
                </div>
              )}
              {(territorio.acciones_correctivas || 0) > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-xl">
                  <span className="text-[10px] font-bold text-orange-700">🔧 {territorio.acciones_correctivas} acción{territorio.acciones_correctivas > 1 ? 'es' : ''} correctiva{territorio.acciones_correctivas > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Nueva licitación', icon: Zap, ruta: '/oportunidades/nueva', color: 'bg-blue-600' },
          { label: 'Buscar PLACSP', icon: FileSearch, ruta: '/oportunidades', color: 'bg-[#1a3c34]' },
          { label: 'Ausencias pendientes', icon: Calendar, ruta: '/ausencias', color: 'bg-amber-600' },
          { label: 'Dashboard RRHH', icon: BarChart3, ruta: '/dashboard-rrhh', color: 'bg-slate-700' },
        ].map((acc: any, i: number) => (
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