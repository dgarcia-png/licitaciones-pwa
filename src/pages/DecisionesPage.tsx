import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import PipelineBar from '../components/PipelineBar'
import {
  FileCheck, Brain, Calculator, Euro, Users, AlertTriangle, CheckCircle2,
  XCircle, Loader2, ChevronDown, ChevronUp, Target, Shield, Award,
  TrendingUp, ThumbsUp, ThumbsDown, MessageSquare, Calendar, Building2,
  Clock, FileText, ClipboardCheck, Scale, Lightbulb, Ban, ArrowRight, Wrench, Search, UserCheck, Stamp
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function fmt(n: number) { return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' }
function fmtPct(n: number) { return n.toFixed(2) + ' %' }

function Bloque({ title, icon: Icon, children, defaultOpen = true, color = 'bg-slate-100', badge }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean; color?: string; badge?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white border border-slate-200 rounded-2xl mb-4 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`p-2 ${color} rounded-xl`}><Icon size={18} className="text-slate-600" /></div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {badge && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{badge}</span>}
        </div>
        {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-slate-100 pt-4">{children}</div>}
    </div>
  )
}

function DataRow({ label, value, color }: { label: string; value: any; color?: string }) {
  if (!value || value === 'No especificado' || value === 'No') return null
  return (
    <div className="flex justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm font-medium text-right max-w-[60%] ${color || 'text-slate-800'}`}>{String(value)}</span>
    </div>
  )
}

function CheckItem({ label, ok, detalle }: { label: string; ok: boolean | null; detalle?: string }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl ${ok === true ? 'bg-emerald-50' : ok === false ? 'bg-red-50' : 'bg-slate-50'}`}>
      {ok === true ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" /> :
       ok === false ? <XCircle size={16} className="text-red-600 shrink-0 mt-0.5" /> :
       <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />}
      <div>
        <p className={`text-xs font-semibold ${ok === true ? 'text-emerald-800' : ok === false ? 'text-red-800' : 'text-amber-800'}`}>{label}</p>
        {detalle && <p className="text-[11px] text-slate-500 mt-0.5">{detalle}</p>}
      </div>
    </div>
  )
}

export default function DecisionesPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const idParam = searchParams.get('id')
  const [cargando, setCargando] = useState(true)
  const [oportunidades, setOportunidades] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState(idParam || '')
  const [oportunidad, setOportunidad] = useState<any>(null)
  const [analisis, setAnalisis] = useState<any>(null)
  const [calculo, setCalculo] = useState<any>(null)
  const [decidiendo, setDecidiendo] = useState(false)
  const [investigacion, setInvestigacion] = useState<any>(null)
  const [investigando, setInvestigando] = useState(false)
  const [justificacion, setJustificacion] = useState('')
  const [msgDecision, setMsgDecision] = useState('')

  // Validación Dirección
  const { usuario } = useAuth()
  const [aprobacion, setAprobacion] = useState<any>(null)
  const [aprobando, setAprobando] = useState(false)
  const [precioAprobado, setPrecioAprobado] = useState('')
  const [escenarioElegido, setEscenarioElegido] = useState('')
  const [condiciones, setCondiciones] = useState('')
  const [observacionesDir, setObservacionesDir] = useState('')
  const [msgAprobacion, setMsgAprobacion] = useState('')

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      try {
        const data = await api.oportunidades()
        setOportunidades(data.oportunidades || [])
      }
      catch (e) { console.error(e) }
      finally { setCargando(false) }
    }
    cargar()
  }, [])

  useEffect(() => {
    if (!selectedId) { setOportunidad(null); setAnalisis(null); setCalculo(null); setInvestigacion(null); return }
    const cargarOpo = async () => {
      setCargando(true)
      try {
        // Invalidar caché para obtener datos frescos
        const url = `${(api as any).baseURL || ''}?action=batch_decisiones&id=${selectedId}`
        const batch = await (api as any).batchDecisiones(selectedId)
        const opos = batch.oportunidades?.oportunidades || []
        if (opos.length > 0) setOportunidades(opos)
        const det = opos.find((o: any) => o.id === selectedId) || null
        if (det) setOportunidad(det)
        setAnalisis(batch.analisis?.existe ? batch.analisis : null)
        setCalculo(batch.calculo?.existe ? batch.calculo.datos : null)
        setInvestigacion(batch.investigacion?.existe ? batch.investigacion : null)
        setAprobacion(batch.aprobacion?.existe ? batch.aprobacion.aprobacion : null)
      } catch (e) { console.error(e) }
      finally { setCargando(false) }
    }
    cargarOpo()
  }, [selectedId])

  const handleDecision = async (decision: 'go' | 'no_go') => {
    if (!selectedId) return
    setDecidiendo(true); setMsgDecision('')
    try {
      await api.actualizar(selectedId, { estado: decision })
      setMsgDecision(decision === 'go' ? '✅ Marcada como GO — Pendiente aprobación Dirección' : '❌ Marcada como NO-GO')
      setOportunidad((prev: any) => prev ? { ...prev, estado: decision } : prev)
      const data = await api.oportunidades(); setOportunidades(data.oportunidades || [])
    } catch (e) { setMsgDecision('Error al guardar decisión') }
    finally { setDecidiendo(false) }
  }

  const handleAprobacion = async (estado: 'aprobado' | 'rechazado' | 'condicionado') => {
    if (!selectedId) return
    setAprobando(true); setMsgAprobacion('')
    try {
      const result = await api.aprobarDireccion({
        oportunidad_id: selectedId,
        estado,
        aprobado_por: usuario?.nombre || usuario?.email || '',
        precio_aprobado: precioAprobado ? parseFloat(precioAprobado) : (res.precioObjetivo || res.totalSinIVA || 0),
        escenario_elegido: escenarioElegido || 'objetivo',
        condiciones: condiciones,
        observaciones: observacionesDir
      })
      if (result.ok) {
        setAprobacion({ estado, aprobado_por: usuario?.nombre, fecha: new Date().toISOString(), precio_aprobado: precioAprobado, escenario_elegido: escenarioElegido, condiciones, observaciones: observacionesDir })
        setMsgAprobacion(estado === 'aprobado' ? '✅ Aprobado — Proceder a oferta' : estado === 'rechazado' ? '❌ Rechazado por Dirección' : '⚠️ Aprobado con condiciones')
        if (estado === 'aprobado') { setOportunidad((prev: any) => prev ? { ...prev, estado: 'go_aprobado' } : prev) }
      } else { setMsgAprobacion('Error: ' + (result.error || '')) }
    } catch (e) { setMsgAprobacion('Error de conexión') }
    finally { setAprobando(false) }
  }

  const ac = analisis?.analisis_completo || {}
  const puntIA = ac.puntuacion_interes?.valor ?? analisis?.puntuacion_interes ?? null
  const res = calculo?.resumen || {}
  const escenarios: any[] = calculo?.escenarios || []
  const precioConservador = escenarios.find((e: any) => e.nombre === 'Conservador')?.total || res.precioConservador || 0
  const precioBase        = escenarios.find((e: any) => e.nombre === 'Base')?.total || res.precioObjetivo || res.totalSinIVA || 0
  const precioAgresivo    = escenarios.find((e: any) => e.nombre === 'Agresivo')?.total || res.precioCompetitivo || 0
  const tieneAnalisis = !!analisis?.existe
  const tieneCalculo = !!calculo?.resumen
  const candidatas = oportunidades.filter(o => ['nueva', 'en_analisis', 'go', 'no_go', 'go_aprobado'].includes(o.estado))

  // Barra comparativa
  const presupuesto = Number(oportunidad?.presupuesto) || 0
  const presSinIVA = presupuesto / 1.21
  const ofertaSinIVA = res.totalSinIVA || 0
  const pctOferta = presSinIVA > 0 ? (ofertaSinIVA / presSinIVA * 100) : 0

  if (cargando && !oportunidad) return (<div className="flex flex-col items-center py-20"><Loader2 size={32} className="text-blue-500 animate-spin mb-3" /><p className="text-slate-500">Cargando...</p></div>)

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Pipeline de navegación */}
      <PipelineBar currentStep="decisiones" />
      {/* Cabecera */}
      <div className="flex items-center gap-4 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-200"><FileCheck size={22} className="text-white" /></div>
        <div><h1 className="text-2xl font-bold text-slate-900">Decisión GO / NO-GO</h1><p className="text-sm text-slate-500">Toda la información para decidir</p></div>
      </div>

      {/* Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Oportunidad</label>
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-violet-500 focus:outline-none">
          <option value="">— Seleccionar —</option>
          {candidatas.map((o: any) => (
            <option key={o.id} value={o.id}>[{o.estado === 'go' ? 'GO' : o.estado === 'no_go' ? 'NO-GO' : '⏳'}] {o.titulo?.substring(0, 70)} — {o.presupuesto ? Number(o.presupuesto).toLocaleString('es-ES') + ' €' : '?'}</option>
          ))}
        </select>
        {candidatas.length === 0 && <p className="text-xs text-slate-400 mt-2">No hay oportunidades en análisis.</p>}
      </div>

      {!selectedId && (<div className="flex flex-col items-center py-16"><FileCheck size={48} className="text-slate-300 mb-3" /><p className="text-slate-500 font-medium">Selecciona una oportunidad</p></div>)}

      {selectedId && oportunidad && (
        <>
          {/* Tarjeta resumen */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-bold text-slate-900 mb-2">{oportunidad.titulo}</h2>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-slate-500"><Building2 size={12} /> {oportunidad.organismo}</span>
              <span className="flex items-center gap-1 text-xs text-slate-500"><Euro size={12} /> {fmt(presupuesto)}</span>
              {oportunidad.fecha_limite && <span className="flex items-center gap-1 text-xs text-slate-500"><Calendar size={12} /> {oportunidad.fecha_limite}</span>}
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${oportunidad.estado === 'go' ? 'bg-emerald-100 text-emerald-700' : oportunidad.estado === 'no_go' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                {oportunidad.estado === 'go' ? 'GO' : oportunidad.estado === 'no_go' ? 'NO-GO' : 'Pendiente'}
              </span>
            </div>
          </div>

          {/* ═══ INDICADORES ═══ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className={`rounded-xl p-4 border ${puntIA !== null ? (puntIA >= 70 ? 'bg-emerald-50 border-emerald-200' : puntIA >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200') : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-1 mb-1"><Brain size={14} className="text-slate-500" /><span className="text-[10px] text-slate-500 uppercase">IA</span></div>
              <p className="text-2xl font-black">{puntIA !== null ? puntIA : '—'}<span className="text-sm font-normal text-slate-400">/100</span></p>
            </div>
            <div className={`rounded-xl p-4 border ${res.esRentable ? 'bg-emerald-50 border-emerald-200' : res.totalSinIVA ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-1 mb-1"><TrendingUp size={14} className="text-slate-500" /><span className="text-[10px] text-slate-500 uppercase">Rentable</span></div>
              <p className="text-2xl font-black">{res.totalSinIVA ? (res.esRentable ? 'SÍ' : 'NO') : '—'}</p>
            </div>
            <div className="rounded-xl p-4 border bg-slate-50 border-slate-200">
              <div className="flex items-center gap-1 mb-1"><Euro size={14} className="text-slate-500" /><span className="text-[10px] text-slate-500 uppercase">Baja</span></div>
              <p className={`text-2xl font-black ${(res.baja||0) > 5 ? 'text-emerald-700' : (res.baja||0) > 0 ? 'text-amber-700' : 'text-red-700'}`}>{res.baja !== undefined ? fmtPct(res.baja) : '—'}</p>
            </div>
            <div className="rounded-xl p-4 border bg-slate-50 border-slate-200">
              <div className="flex items-center gap-1 mb-1"><Euro size={14} className="text-slate-500" /><span className="text-[10px] text-slate-500 uppercase">Margen</span></div>
              <p className={`text-2xl font-black ${(res.margenReal||0) > 5 ? 'text-emerald-700' : (res.margenReal||0) > 0 ? 'text-amber-700' : 'text-red-700'}`}>{res.margenReal !== undefined ? fmtPct(res.margenReal) : '—'}</p>
            </div>
          </div>

          {/* Alertas */}
          {!tieneAnalisis && (
            <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" /><span className="text-sm text-amber-800">Sin análisis IA.</span>
              <button onClick={() => navigate('/oportunidades/' + selectedId)} className="ml-auto px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg">Ir a analizar</button>
            </div>
          )}
          {!tieneCalculo && (
            <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" /><span className="text-sm text-amber-800">Sin cálculo económico.</span>
              <button onClick={() => navigate('/calculo?id=' + selectedId)} className="ml-auto px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg">Ir a calcular</button>
            </div>
          )}

          {/* ═══ COMPARATIVA VISUAL ═══ */}
          {tieneCalculo && presupuesto > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Comparativa: nuestra oferta vs presupuesto máximo</h3>
              <div className="relative h-10 bg-slate-100 rounded-full overflow-hidden mb-2">
                <div className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(pctOferta, 100)}%` }} />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-xs font-bold text-slate-600">100%</span>
                </div>
                <div className="absolute inset-y-0 left-0 flex items-center pl-3" style={{ width: `${Math.min(pctOferta, 100)}%` }}>
                  <span className="text-xs font-bold text-white">{pctOferta.toFixed(1)}%</span>
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-blue-600 font-medium">Nuestra oferta: {fmt(ofertaSinIVA)}</span>
                <span className="text-slate-500">Presupuesto: {fmt(presSinIVA)}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Margen disponible: {fmt(presSinIVA - ofertaSinIVA)} ({fmtPct(100 - pctOferta)})</p>
            </div>
          )}

          {/* ═══ INVESTIGACIÓN HISTÓRICA ═══ */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 rounded-xl"><Search size={18} className="text-teal-600" /></div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Investigación histórica</h3>
                  <p className="text-xs text-slate-500">¿Se ha licitado antes? ¿Quién ganó? ¿Por cuánto?</p>
                </div>
              </div>
              <button onClick={async () => {
                setInvestigando(true)
                try {
                  const r = await api.investigarHistorico(selectedId)
                  if (r.ok) { setInvestigacion({ existe: true, datos: r }); setMsgDecision('Investigación completada: ' + r.ediciones_encontradas + ' ediciones encontradas') }
                } catch (e) { console.error(e) }
                finally { setInvestigando(false) }
              }} disabled={investigando}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 rounded-xl">
                {investigando ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                {investigando ? 'Investigando (1-2 min)...' : investigacion ? 'Re-investigar' : 'Investigar'}
              </button>
            </div>

            {investigacion?.datos && (() => {
              const inv = investigacion.datos
              const ia = inv.analisis_ia || {}
              return (
                <div className="mt-4 space-y-3">
                  {inv.tiene_historico ? (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-teal-50 rounded-xl text-center">
                          <span className="text-[10px] text-teal-600 uppercase">Ediciones previas</span>
                          <p className="text-xl font-bold text-teal-900">{inv.ediciones_encontradas}</p>
                        </div>
                        <div className="p-3 bg-teal-50 rounded-xl text-center">
                          <span className="text-[10px] text-teal-600 uppercase">Prob. éxito</span>
                          <p className="text-xl font-bold text-teal-900">{ia.probabilidad_exito || '?'}%</p>
                        </div>
                        <div className="p-3 bg-teal-50 rounded-xl text-center">
                          <span className="text-[10px] text-teal-600 uppercase">Recomendación</span>
                          <p className={`text-sm font-bold ${(ia.recomendacion_final || '').includes('GO') && !(ia.recomendacion_final || '').includes('NO') ? 'text-emerald-700' : 'text-amber-700'}`}>{ia.recomendacion_final || '?'}</p>
                        </div>
                      </div>

                      {ia.resumen_historico && <p className="text-xs text-slate-700 p-3 bg-slate-50 rounded-xl">{ia.resumen_historico}</p>}
                      {ia.patron_adjudicacion && <p className="text-xs text-slate-600"><strong>Patrón:</strong> {ia.patron_adjudicacion}</p>}

                      {inv.adjudicatarios?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-600 mb-1">Adjudicatarios anteriores</p>
                          {inv.adjudicatarios.map((a: any, i: number) => (
                            <span key={i} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-lg mr-2 mb-1">
                              {a.nombre} <span className="text-[10px] text-slate-400">({a.veces}x)</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {inv.tendencia_precios && (
                        <p className="text-xs text-slate-600"><strong>Tendencia precios:</strong> {inv.tendencia_precios.descripcion}</p>
                      )}

                      {ia.precio_recomendado && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                          <p className="text-xs font-bold text-amber-800 mb-1">Precio recomendado (basado en histórico)</p>
                          <p className="text-xs text-amber-700">
                            Rango: {Number(ia.precio_recomendado.minimo || 0).toLocaleString('es-ES')}€ — {Number(ia.precio_recomendado.maximo || 0).toLocaleString('es-ES')}€
                            {ia.precio_recomendado.optimo > 0 && <> | Óptimo: <strong>{Number(ia.precio_recomendado.optimo).toLocaleString('es-ES')}€</strong></>}
                          </p>
                          {ia.precio_recomendado.justificacion && <p className="text-[11px] text-amber-600 mt-1">{ia.precio_recomendado.justificacion}</p>}
                        </div>
                      )}

                      {ia.recomendaciones_estrategicas?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-600 mb-1">Recomendaciones estratégicas</p>
                          {ia.recomendaciones_estrategicas.map((r: string, i: number) => <p key={i} className="text-xs text-slate-700 mb-1">→ {r}</p>)}
                        </div>
                      )}

                      {inv.coincidencias?.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">Ver {inv.coincidencias.length} licitaciones encontradas</summary>
                          <div className="mt-2 space-y-1">
                            {inv.coincidencias.map((c: any, i: number) => (
                              <div key={i} className="p-2 bg-slate-50 rounded-lg text-xs">
                                <span className="font-medium text-slate-800">{c.titulo?.substring(0, 80)}</span>
                                <span className="text-slate-400 ml-2">{c.presupuesto > 0 ? Number(c.presupuesto).toLocaleString('es-ES') + '€' : ''}</span>
                                {c.adjudicatario && <span className="text-emerald-600 ml-2">→ {c.adjudicatario}</span>}
                                <span className="text-[10px] text-slate-400 ml-2">[{c.fuente}]</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-slate-500 p-3 bg-slate-50 rounded-xl">No se encontraron ediciones anteriores de esta licitación. Puede ser la primera vez que se licita.</p>
                  )}
                </div>
              )
            })()}
          </div>

          {/* ═══ DATOS DEL CONTRATO ═══ */}
          {tieneAnalisis && (
            <Bloque title="Datos del contrato" icon={FileText} color="bg-blue-100" defaultOpen={true}>
              <DataRow label="Tipo de contrato" value={ac.datos_basicos?.tipo_contrato} />
              <DataRow label="Duración" value={ac.datos_basicos?.duracion_contrato} />
              <DataRow label="Prórrogas" value={ac.datos_basicos?.prorrogas} />
              <DataRow label="Lotes" value={ac.datos_basicos?.lotes} />
              <DataRow label="Presupuesto base (IVA incl.)" value={presupuesto > 0 ? fmt(presupuesto) : undefined} />
              <DataRow label="Presupuesto base (sin IVA)" value={presSinIVA > 0 ? fmt(presSinIVA) : undefined} />
              <DataRow label="Procedimiento" value={oportunidad.procedimiento} />
              <DataRow label="Garantía definitiva" value={ac.garantias?.definitiva} />
            </Bloque>
          )}

          {/* ═══ SOLVENCIA Y CLASIFICACIÓN ═══ */}
          {tieneAnalisis && (ac.solvencia_economica || ac.solvencia_tecnica || ac.clasificacion_empresarial) && (
            <Bloque title="Solvencia y clasificación" icon={Shield} color="bg-purple-100" badge="¿Cumplimos?">
              {ac.solvencia_economica && (
                <div className="mb-3">
                  <p className="text-xs font-bold text-slate-600 mb-2">Solvencia económica</p>
                  <DataRow label="Volumen anual de negocios" value={ac.solvencia_economica.volumen_anual_negocios} />
                  <DataRow label="Seguro RC" value={ac.solvencia_economica.seguro_responsabilidad} />
                </div>
              )}
              {ac.solvencia_tecnica && (
                <div className="mb-3">
                  <p className="text-xs font-bold text-slate-600 mb-2">Solvencia técnica</p>
                  <DataRow label="Trabajos similares" value={ac.solvencia_tecnica.trabajos_similares} />
                  <DataRow label="Certificaciones" value={ac.solvencia_tecnica.certificaciones} />
                  <DataRow label="Medios técnicos" value={ac.solvencia_tecnica.medios_tecnicos} />
                </div>
              )}
              {ac.clasificacion_empresarial && (
                <div className="mb-3">
                  <p className="text-xs font-bold text-slate-600 mb-2">Clasificación empresarial</p>
                  <DataRow label="Requerida" value={ac.clasificacion_empresarial.requerida} color={ac.clasificacion_empresarial.requerida === 'Sí' ? 'text-red-700' : 'text-emerald-700'} />
                  <DataRow label="Grupo/Subgrupo/Categoría" value={ac.clasificacion_empresarial.grupo} />
                </div>
              )}
            </Bloque>
          )}

          {/* ═══ CRITERIOS DE ADJUDICACIÓN ═══ */}
          {ac.criterios_adjudicacion?.length > 0 && (
            <Bloque title="Criterios de adjudicación" icon={Award} color="bg-amber-100" badge={`${ac.criterios_adjudicacion.length} criterios`}>
              <div className="space-y-2">
                {ac.criterios_adjudicacion.map((c: any, i: number) => {
                  const totalPts = ac.criterios_adjudicacion.reduce((s: number, cr: any) => s + (cr.puntuacion_maxima || 0), 0)
                  const pctPts = totalPts > 0 ? (c.puntuacion_maxima / totalPts * 100) : 0
                  return (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-slate-800">{c.criterio}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${c.tipo === 'Automático' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{c.tipo}</span>
                          <span className="text-sm font-bold">{c.puntuacion_maxima} pts</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                        <div className={`h-full rounded-full ${c.tipo === 'Automático' ? 'bg-blue-500' : 'bg-purple-500'}`} style={{ width: `${pctPts}%` }} />
                      </div>
                      {c.descripcion && <p className="text-[11px] text-slate-500 mt-1">{c.descripcion}</p>}
                    </div>
                  )
                })}
              </div>
            </Bloque>
          )}

          {/* ═══ ESTRATEGIA PARA GANAR ═══ */}
          {ac.estrategia_para_ganar && (
            <Bloque title="Estrategia para ganar" icon={Target} color="bg-violet-100" badge={ac.estrategia_para_ganar.recomendacion_final}>
              <div className={`rounded-xl p-4 mb-4 ${ac.estrategia_para_ganar.viabilidad === 'Alta' ? 'bg-emerald-50 border border-emerald-200' : ac.estrategia_para_ganar.viabilidad === 'Media' ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">Viabilidad: {ac.estrategia_para_ganar.viabilidad}</span>
                  <span className="text-sm font-bold">Prob. éxito: {ac.estrategia_para_ganar.probabilidad_exito}%</span>
                </div>
              </div>

              {ac.estrategia_para_ganar.ventajas_competitivas?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-bold text-emerald-700 mb-2">Ventajas competitivas</p>
                  {ac.estrategia_para_ganar.ventajas_competitivas.map((v: string, i: number) => <p key={i} className="text-xs text-emerald-700 mb-1">✓ {v}</p>)}
                </div>
              )}
              {ac.estrategia_para_ganar.debilidades?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-bold text-red-700 mb-2">Debilidades</p>
                  {ac.estrategia_para_ganar.debilidades.map((d: string, i: number) => <p key={i} className="text-xs text-red-700 mb-1">✗ {d}</p>)}
                </div>
              )}

              {ac.estrategia_para_ganar.mejoras_recomendadas?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-bold text-slate-700 mb-2">Mejoras recomendadas (coste/beneficio)</p>
                  {ac.estrategia_para_ganar.mejoras_recomendadas.map((m: any, i: number) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-800">{m.mejora}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-blue-700 font-bold">+{m.puntos_que_aporta} pts</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${m.rentabilidad === 'Alta' ? 'bg-emerald-100 text-emerald-700' : m.rentabilidad === 'Media' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{m.rentabilidad}</span>
                        </div>
                      </div>
                      {m.coste_estimado && <p className="text-[11px] text-slate-500">Coste: {m.coste_estimado}</p>}
                      {m.justificacion && <p className="text-[11px] text-slate-500">{m.justificacion}</p>}
                    </div>
                  ))}
                </div>
              )}

              {ac.estrategia_para_ganar.equipo_recomendado?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-bold text-slate-700 mb-2">Equipo recomendado</p>
                  {ac.estrategia_para_ganar.equipo_recomendado.map((e: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg mb-1">
                      <Users size={12} className="text-blue-600 shrink-0" />
                      <span className="text-xs font-medium text-blue-800">{e.perfil}</span>
                      <span className="text-[10px] text-blue-600">{e.dedicacion}</span>
                      <span className="text-[10px] text-slate-500 ml-auto">{e.justificacion}</span>
                    </div>
                  ))}
                </div>
              )}

              {ac.estrategia_para_ganar.maquinaria_recomendada?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-bold text-slate-700 mb-2">Maquinaria/equipos recomendados</p>
                  {ac.estrategia_para_ganar.maquinaria_recomendada.map((m: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-purple-50 rounded-lg mb-1">
                      <Wrench size={12} className="text-purple-600 shrink-0" />
                      <span className="text-xs font-medium text-purple-800">{m.equipo}</span>
                      <span className="text-[10px] text-slate-500 ml-auto">{m.justificacion}</span>
                    </div>
                  ))}
                </div>
              )}

              {ac.estrategia_para_ganar.estrategia_baja && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs font-bold text-amber-800 mb-1">Estrategia de baja económica</p>
                  <p className="text-xs text-amber-700">
                    Baja recomendada: <strong>{ac.estrategia_para_ganar.estrategia_baja.baja_recomendada_minima}% — {ac.estrategia_para_ganar.estrategia_baja.baja_recomendada_maxima}%</strong>
                  </p>
                  {ac.estrategia_para_ganar.estrategia_baja.justificacion && <p className="text-[11px] text-amber-600 mt-1">{ac.estrategia_para_ganar.estrategia_baja.justificacion}</p>}
                  {ac.estrategia_para_ganar.estrategia_baja.riesgo_temeridad && <p className="text-[11px] text-red-600 mt-1">Temeridad: {ac.estrategia_para_ganar.estrategia_baja.riesgo_temeridad}</p>}
                </div>
              )}
            </Bloque>
          )}

          {/* ═══ MEJORAS VALORABLES ═══ */}
          {ac.mejoras_valorables && (
            <Bloque title="Mejoras valorables" icon={Lightbulb} color="bg-yellow-100" defaultOpen={false}>
              {Array.isArray(ac.mejoras_valorables) ? (
                ac.mejoras_valorables.map((m: any, i: number) => (
                  <div key={i} className="p-3 bg-yellow-50 rounded-xl mb-2">
                    <p className="text-xs text-slate-700">{typeof m === 'string' ? m : m.descripcion || JSON.stringify(m)}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-700">{typeof ac.mejoras_valorables === 'string' ? ac.mejoras_valorables : JSON.stringify(ac.mejoras_valorables)}</p>
              )}
            </Bloque>
          )}

          {/* ═══ PERSONAL REQUERIDO + DESGLOSE ═══ */}
          {(ac.personal_requerido || calculo?.personal?.length > 0) && (
            <Bloque title="Personal" icon={Users} color="bg-blue-100" badge={res.totalTrabajadores ? `${res.totalTrabajadores} trab.` : undefined}>
              {ac.personal_requerido && (
                <div className="p-3 bg-blue-50 rounded-xl mb-3">
                  <DataRow label="Subrogación" value={ac.personal_requerido.subrogacion} color={ac.personal_requerido.subrogacion === 'Sí' ? 'text-red-700 font-bold' : undefined} />
                  <DataRow label="Convenio aplicable" value={ac.personal_requerido.convenio_aplicable} />
                  <DataRow label="Detalle" value={ac.personal_requerido.detalle} />
                  {ac.personal_requerido.num_trabajadores_subrogar > 0 && <DataRow label="Trabajadores a subrogar" value={ac.personal_requerido.num_trabajadores_subrogar} />}
                </div>
              )}
              {calculo?.personal?.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-slate-50">
                      <th className="text-left px-2 py-2 font-semibold text-slate-500">Categoría</th>
                      <th className="text-center px-2 py-2 font-semibold text-slate-500">Cant.</th>
                      <th className="text-center px-2 py-2 font-semibold text-slate-500">h/sem</th>
                      <th className="text-right px-2 py-2 font-semibold text-slate-500">Bruto anual</th>
                      <th className="text-right px-2 py-2 font-semibold text-slate-500 bg-blue-50">Coste total</th>
                    </tr></thead>
                    <tbody>
                      {calculo.personal.map((p: any, i: number) => (
                        <tr key={i} className="border-b border-slate-50">
                          <td className="px-2 py-1.5 font-medium">{p.grupo} {p.nivel ? `- ${p.nivel}` : ''}<br/><span className="text-slate-400">{p.categoria}</span></td>
                          <td className="px-2 py-1.5 text-center">{p.cantidad}</td>
                          <td className="px-2 py-1.5 text-center">{p.horasSemanales}h</td>
                          <td className="px-2 py-1.5 text-right">{fmt(p.totalAnualBruto)}</td>
                          <td className="px-2 py-1.5 text-right font-bold bg-blue-50">{fmt((p.totalAnualBruto * (p.horasSemanales/38) * 1.3312 * 1.12 / 12) * p.meses * p.cantidad)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Bloque>
          )}

          {/* ═══ PENALIZACIONES Y CONDICIONES ═══ */}
          {(ac.penalizaciones || ac.condiciones_especiales) && (
            <Bloque title="Penalizaciones y condiciones especiales" icon={Ban} color="bg-red-100" defaultOpen={false}>
              {ac.penalizaciones && (
                <div className="mb-3">
                  <DataRow label="Por incumplimiento" value={ac.penalizaciones.por_incumplimiento} color="text-red-700" />
                  <DataRow label="Por retraso" value={ac.penalizaciones.por_retraso} color="text-red-700" />
                  <DataRow label="Resolución" value={ac.penalizaciones.resolucion} color="text-red-700" />
                </div>
              )}
              {ac.condiciones_especiales && (
                <div className="p-3 bg-amber-50 rounded-xl">
                  <p className="text-xs text-amber-800">{typeof ac.condiciones_especiales === 'string' ? ac.condiciones_especiales : JSON.stringify(ac.condiciones_especiales)}</p>
                </div>
              )}
            </Bloque>
          )}

          {/* ═══ DOCUMENTACIÓN REQUERIDA ═══ */}
          {ac.documentacion_requerida && (
            <Bloque title="Documentación requerida para la oferta" icon={FileText} color="bg-slate-100" defaultOpen={false}>
              {Array.isArray(ac.documentacion_requerida) ? (
                ac.documentacion_requerida.map((d: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 py-1.5 border-b border-slate-50">
                    <ArrowRight size={12} className="text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-700">{d}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-700">{typeof ac.documentacion_requerida === 'string' ? ac.documentacion_requerida : JSON.stringify(ac.documentacion_requerida)}</p>
              )}
            </Bloque>
          )}

          {/* ═══ RIESGOS Y OPORTUNIDADES ═══ */}
          {(ac.riesgos_detectados?.length > 0 || ac.oportunidades_detectadas?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {ac.riesgos_detectados?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3"><AlertTriangle size={16} className="text-red-600" /><span className="text-sm font-bold text-red-800">Riesgos ({ac.riesgos_detectados.length})</span></div>
                  {ac.riesgos_detectados.map((r: any, i: number) => (
                    <p key={i} className="text-xs text-red-700 mb-2">• {typeof r === 'string' ? r : r.riesgo || r.descripcion || JSON.stringify(r)}</p>
                  ))}
                </div>
              )}
              {ac.oportunidades_detectadas?.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3"><Lightbulb size={16} className="text-emerald-600" /><span className="text-sm font-bold text-emerald-800">Oportunidades ({ac.oportunidades_detectadas.length})</span></div>
                  {ac.oportunidades_detectadas.map((o: any, i: number) => (
                    <p key={i} className="text-xs text-emerald-700 mb-2">• {typeof o === 'string' ? o : o.oportunidad || o.descripcion || JSON.stringify(o)}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ CHECKLIST ═══ */}
          <Bloque title="Checklist: ¿estamos preparados?" icon={ClipboardCheck} color="bg-emerald-100">
            <div className="space-y-2">
              <CheckItem label="Análisis IA del pliego" ok={tieneAnalisis} detalle={tieneAnalisis ? `Puntuación ${puntIA}/100` : 'Pendiente de analizar'} />
              <CheckItem label="Cálculo económico" ok={tieneCalculo} detalle={tieneCalculo ? `Oferta: ${fmt(ofertaSinIVA)} | Baja: ${fmtPct(res.baja||0)}` : 'Pendiente de calcular'} />
              <CheckItem label="Rentabilidad" ok={tieneCalculo ? res.esRentable : null} detalle={tieneCalculo ? (res.esRentable ? `Margen: ${fmtPct(res.margenReal||0)}` : 'No es rentable con esta estructura') : 'Depende del cálculo'} />
              <CheckItem label="Clasificación empresarial" ok={ac.clasificacion_empresarial?.requerida === 'No' || ac.clasificacion_empresarial?.requerida === 'Eximida' ? true : ac.clasificacion_empresarial?.requerida === 'Sí' ? null : null} detalle={ac.clasificacion_empresarial?.requerida === 'Sí' ? `Se requiere: ${ac.clasificacion_empresarial.grupo || '?'}` : ac.clasificacion_empresarial?.requerida || 'No especificado en el análisis'} />
              <CheckItem label="Solvencia económica" ok={null} detalle={ac.solvencia_economica?.volumen_anual_negocios || 'Revisar requisitos'} />
              <CheckItem label="Solvencia técnica" ok={null} detalle={ac.solvencia_tecnica?.trabajos_similares || 'Revisar requisitos'} />
              <CheckItem label="Garantía definitiva" ok={null} detalle={ac.garantias?.definitiva || '5% del presupuesto de adjudicación'} />
              <CheckItem label="Personal disponible" ok={tieneCalculo && res.totalTrabajadores > 0 ? true : null} detalle={res.totalTrabajadores ? `${res.totalTrabajadores} trabajadores presupuestados` : 'Definir plantilla'} />
              <CheckItem label="Plazo de presentación" ok={null} detalle={oportunidad.fecha_limite || 'Sin fecha'} />
            </div>
          </Bloque>

          {/* ═══ RESUMEN CÁLCULO ═══ */}
          {tieneCalculo && (
            <Bloque title="Resumen económico" icon={Calculator} color="bg-blue-100" defaultOpen={false}>
              <div className="space-y-1.5 mb-3">
                <div className="flex justify-between py-2 bg-blue-50 px-3 rounded"><span className="text-sm font-medium text-blue-800">Costes directos</span><span className="text-sm font-bold text-blue-900">{fmt(res.costesDirectos||0)}</span></div>
                <div className="flex justify-between py-2 bg-amber-50 px-3 rounded"><span className="text-sm font-medium text-amber-800">Costes indirectos</span><span className="text-sm font-bold text-amber-900">{fmt(res.costesIndirectos||0)}</span></div>
                <div className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-sm text-slate-600">Gastos generales</span><span className="text-sm font-semibold">{fmt(res.importeGG||0)}</span></div>
                <div className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-sm text-slate-600">Beneficio industrial</span><span className="text-sm font-semibold">{fmt(res.importeBI||0)}</span></div>
              </div>
              <div className="bg-slate-900 text-white rounded-xl p-4">
                <div className="flex justify-between mb-1"><span className="text-sm text-slate-300">Total sin IVA</span><span className="text-lg font-bold">{fmt(res.totalSinIVA||0)}</span></div>
                <div className="flex justify-between"><span className="text-sm text-slate-300">Total con IVA</span><span className="text-xl font-black">{fmt(res.totalConIVA||0)}</span></div>
              </div>
              <button onClick={() => navigate('/calculo?id=' + selectedId)} className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-3">→ Editar cálculo</button>
            </Bloque>
          )}

          {/* ═══ DECISIÓN ═══ */}
          <div className="bg-white border-2 border-violet-300 rounded-2xl p-6 mb-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl"><FileCheck size={18} className="text-white" /></div>
              <h3 className="text-lg font-bold text-slate-900">Tomar decisión</h3>
            </div>

            {/* A favor / En contra */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-emerald-700 uppercase mb-2">A favor</p>
                {puntIA !== null && puntIA >= 50 && <p className="text-xs text-emerald-700">✓ IA: {puntIA}/100</p>}
                {res.esRentable && <p className="text-xs text-emerald-700">✓ Rentable (margen {fmtPct(res.margenReal||0)})</p>}
                {res.baja > 5 && <p className="text-xs text-emerald-700">✓ Baja competitiva ({fmtPct(res.baja)})</p>}
                {ac.oportunidades_detectadas?.length > 0 && <p className="text-xs text-emerald-700">✓ {ac.oportunidades_detectadas.length} oportunidades</p>}
                {ac.clasificacion_empresarial?.requerida === 'No' && <p className="text-xs text-emerald-700">✓ Sin clasificación requerida</p>}
                {ac.personal_requerido?.subrogacion === 'No' && <p className="text-xs text-emerald-700">✓ Sin subrogación</p>}
                {ac.estrategia_para_ganar?.viabilidad === 'Alta' && <p className="text-xs text-emerald-700">✓ Viabilidad alta</p>}
                {ac.estrategia_para_ganar?.probabilidad_exito > 50 && <p className="text-xs text-emerald-700">✓ Prob. éxito {ac.estrategia_para_ganar.probabilidad_exito}%</p>}
                {investigacion?.datos?.analisis_ia?.probabilidad_exito > 50 && <p className="text-xs text-emerald-700">✓ Histórico favorable ({investigacion.datos.analisis_ia.probabilidad_exito}%)</p>}
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-red-700 uppercase mb-2">En contra</p>
                {puntIA !== null && puntIA < 40 && <p className="text-xs text-red-700">✗ IA baja ({puntIA}/100)</p>}
                {res.totalSinIVA > 0 && !res.esRentable && <p className="text-xs text-red-700">✗ No rentable</p>}
                {res.baja < 0 && <p className="text-xs text-red-700">✗ Supera presupuesto</p>}
                {(res.baja||0) > 0 && (res.baja||0) < 5 && <p className="text-xs text-amber-700">⚠ Baja ajustada ({fmtPct(res.baja)})</p>}
                {ac.riesgos_detectados?.length > 0 && <p className="text-xs text-red-700">✗ {ac.riesgos_detectados.length} riesgos</p>}
                {ac.clasificacion_empresarial?.requerida === 'Sí' && <p className="text-xs text-amber-700">⚠ Requiere clasificación</p>}
                {ac.personal_requerido?.subrogacion === 'Sí' && <p className="text-xs text-amber-700">⚠ Subrogación obligatoria</p>}
                {ac.estrategia_para_ganar?.viabilidad === 'Baja' && <p className="text-xs text-red-700">✗ Viabilidad baja</p>}
                {ac.estrategia_para_ganar?.probabilidad_exito > 0 && ac.estrategia_para_ganar?.probabilidad_exito <= 30 && <p className="text-xs text-red-700">✗ Prob. éxito solo {ac.estrategia_para_ganar.probabilidad_exito}%</p>}
                {investigacion?.datos?.analisis_ia?.probabilidad_exito > 0 && investigacion.datos.analisis_ia.probabilidad_exito <= 30 && <p className="text-xs text-red-700">✗ Histórico desfavorable</p>}
                {!tieneAnalisis && <p className="text-xs text-amber-700">⚠ Sin análisis IA</p>}
                {!tieneCalculo && <p className="text-xs text-amber-700">⚠ Sin cálculo económico</p>}
              </div>
            </div>

            <div className="mb-5">
              <label className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2"><MessageSquare size={12} /> Justificación</label>
              <textarea value={justificacion} onChange={e => setJustificacion(e.target.value)} rows={3} placeholder="Motivos, condiciones, observaciones..."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none bg-slate-50 resize-none" />
            </div>

            <div className="flex gap-4">
              <button onClick={() => handleDecision('go')} disabled={decidiendo}
                className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-lg font-bold rounded-xl shadow-lg shadow-emerald-200 transition-colors">
                {decidiendo ? <Loader2 size={22} className="animate-spin" /> : <ThumbsUp size={22} />} GO
              </button>
              <button onClick={() => handleDecision('no_go')} disabled={decidiendo}
                className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-lg font-bold rounded-xl shadow-lg shadow-red-200 transition-colors">
                {decidiendo ? <Loader2 size={22} className="animate-spin" /> : <ThumbsDown size={22} />} NO-GO
              </button>
            </div>

            {msgDecision && (
              <div className={`mt-4 p-3 rounded-xl text-center text-sm font-medium ${
                msgDecision.includes('GO') && !msgDecision.includes('NO') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                msgDecision.includes('NO-GO') ? 'bg-red-50 text-red-800 border border-red-200' :
                'bg-amber-50 text-amber-800 border border-amber-200'
              }`}>{msgDecision}</div>
            )}
          </div>

          {/* ═══ PANEL VALIDACIÓN DIRECCIÓN ═══ */}
          {(oportunidad?.estado === 'go' || oportunidad?.estado === 'go_aprobado') && (
            <div className={`mt-6 border-2 rounded-2xl p-6 ${aprobacion?.estado === 'aprobado' ? 'bg-emerald-50 border-emerald-300' : aprobacion?.estado === 'rechazado' ? 'bg-red-50 border-red-300' : aprobacion?.estado === 'condicionado' ? 'bg-amber-50 border-amber-300' : 'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-300'}`}>
              <div className="flex items-center gap-3 mb-5">
                <div className={`p-2.5 rounded-xl ${aprobacion?.estado === 'aprobado' ? 'bg-emerald-600' : aprobacion?.estado === 'rechazado' ? 'bg-red-600' : 'bg-gradient-to-br from-purple-600 to-indigo-700'}`}>
                  {aprobacion?.estado === 'aprobado' ? <CheckCircle2 size={20} className="text-white" /> : aprobacion?.estado === 'rechazado' ? <XCircle size={20} className="text-white" /> : <Stamp size={20} className="text-white" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Validación Dirección</h3>
                  <p className="text-xs text-slate-500">{aprobacion ? `${aprobacion.estado.toUpperCase()} por ${aprobacion.aprobado_por}` : 'Pendiente de aprobación formal'}</p>
                </div>
              </div>

              {/* Si ya hay aprobación */}
              {aprobacion && (
                <div className={`rounded-xl p-4 mb-4 ${aprobacion.estado === 'aprobado' ? 'bg-white border border-emerald-200' : aprobacion.estado === 'rechazado' ? 'bg-white border border-red-200' : 'bg-white border border-amber-200'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${aprobacion.estado === 'aprobado' ? 'bg-emerald-100' : aprobacion.estado === 'rechazado' ? 'bg-red-100' : 'bg-amber-100'}`}>
                      {aprobacion.estado === 'aprobado' ? <CheckCircle2 size={20} className="text-emerald-600" /> : aprobacion.estado === 'rechazado' ? <XCircle size={20} className="text-red-600" /> : <AlertTriangle size={20} className="text-amber-600" />}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${aprobacion.estado === 'aprobado' ? 'text-emerald-800' : aprobacion.estado === 'rechazado' ? 'text-red-800' : 'text-amber-800'}`}>
                        {aprobacion.estado === 'aprobado' ? 'APROBADO POR DIRECCIÓN' : aprobacion.estado === 'rechazado' ? 'RECHAZADO POR DIRECCIÓN' : 'APROBADO CON CONDICIONES'}
                      </p>
                      <p className="text-xs text-slate-500">{aprobacion.aprobado_por} — {aprobacion.fecha ? new Date(aprobacion.fecha).toLocaleString('es-ES') : ''}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {aprobacion.precio_aprobado > 0 && <div><span className="text-[10px] text-slate-400 uppercase">Precio aprobado</span><p className="text-sm font-bold">{fmt(aprobacion.precio_aprobado)}</p></div>}
                    {aprobacion.escenario_elegido && <div><span className="text-[10px] text-slate-400 uppercase">Escenario</span><p className="text-sm font-semibold capitalize">{aprobacion.escenario_elegido}</p></div>}
                  </div>
                  {aprobacion.condiciones && <div className="mt-2"><span className="text-[10px] text-slate-400 uppercase">Condiciones</span><p className="text-xs text-slate-700 mt-0.5">{aprobacion.condiciones}</p></div>}
                  {aprobacion.observaciones && <div className="mt-2"><span className="text-[10px] text-slate-400 uppercase">Observaciones</span><p className="text-xs text-slate-700 mt-0.5">{aprobacion.observaciones}</p></div>}

                  {aprobacion.estado === 'aprobado' && (
                    <button onClick={() => navigate('/oferta?id=' + selectedId)}
                      className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1a3c34] hover:bg-[#2d5a4e] text-white text-sm font-semibold rounded-xl transition-colors">
                      <FileText size={16} /> Generar documentos de oferta
                    </button>
                  )}
                </div>
              )}

              {/* Formulario de aprobación (si no hay aprobación aún) */}
              {!aprobacion && (
                <div>
                  {/* Resumen ejecutivo para el Director */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 mb-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Resumen ejecutivo</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <div className="text-center p-2 bg-slate-50 rounded-lg"><span className="text-[10px] text-slate-400">Presupuesto</span><p className="text-sm font-bold">{res.totalSinIVA ? fmt(Number(oportunidad?.presupuesto || 0)) : '—'}</p></div>
                      <div className="text-center p-2 bg-slate-50 rounded-lg"><span className="text-[10px] text-slate-400">Coste real</span><p className="text-sm font-bold">{res.costeRealTotal ? fmt(res.costeRealTotal) : res.totalSinIVA ? fmt(res.totalSinIVA) : '—'}</p></div>
                      <div className="text-center p-2 bg-slate-50 rounded-lg"><span className="text-[10px] text-slate-400">Margen</span><p className={`text-sm font-bold ${(res.margenReal||0) > 5 ? 'text-emerald-700' : 'text-amber-700'}`}>{res.margenReal ? fmtPct(res.margenReal) : '—'}</p></div>
                      <div className="text-center p-2 bg-slate-50 rounded-lg"><span className="text-[10px] text-slate-400">Trabajadores</span><p className="text-sm font-bold">{res.totalTrabajadores || '—'}</p></div>
                    </div>
                    {res.precioSuelo > 0 && (
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-blue-50 rounded-lg border border-blue-200"><span className="text-[9px] text-blue-600">Conservador</span><p className="text-xs font-bold text-blue-800">{fmt(res.precioConservador || 0)}</p></div>
                        <div className="p-2 bg-emerald-50 rounded-lg border-2 border-emerald-300"><span className="text-[9px] text-emerald-600">Recomendado</span><p className="text-xs font-bold text-emerald-800">{fmt(res.precioObjetivo || 0)}</p></div>
                        <div className="p-2 bg-amber-50 rounded-lg border border-amber-200"><span className="text-[9px] text-amber-600">Competitivo</span><p className="text-xs font-bold text-amber-800">{fmt(res.precioCompetitivo || 0)}</p></div>
                      </div>
                    )}
                  </div>

                  {/* Escenario y precio */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase font-semibold">Escenario elegido</label>
                      <select value={escenarioElegido} onChange={e => {
                        const v = e.target.value
                        setEscenarioElegido(v)
                        if (v === 'conservador' && precioConservador) setPrecioAprobado(String(Math.round(precioConservador * 100) / 100))
                        else if (v === 'objetivo' && precioBase) setPrecioAprobado(String(Math.round(precioBase * 100) / 100))
                        else if (v === 'competitivo' && precioAgresivo) setPrecioAprobado(String(Math.round(precioAgresivo * 100) / 100))
                      }}
                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none">
                        <option value="">— Seleccionar —</option>
                        <option value="conservador">Conservador {precioConservador ? '(' + fmt(precioConservador) + ')' : ''}</option>
                        <option value="objetivo">Base / Recomendado {precioBase ? '(' + fmt(precioBase) + ')' : ''}</option>
                        <option value="competitivo">Agresivo {precioAgresivo ? '(' + fmt(precioAgresivo) + ')' : ''}</option>
                        <option value="personalizado">Precio personalizado</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase font-semibold">Precio aprobado (sin IVA)</label>
                      <input type="number" step="0.01" value={precioAprobado} onChange={e => setPrecioAprobado(e.target.value)}
                        placeholder={precioBase ? String(Math.round(precioBase * 100) / 100) : '0'}
                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="text-[10px] text-slate-500 uppercase font-semibold">Condiciones (opcional)</label>
                    <input type="text" value={condiciones} onChange={e => setCondiciones(e.target.value)} placeholder="Ej: Solo si se consigue subcontrata para jardinería"
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                  </div>
                  <div className="mb-4">
                    <label className="text-[10px] text-slate-500 uppercase font-semibold">Observaciones Dirección</label>
                    <textarea value={observacionesDir} onChange={e => setObservacionesDir(e.target.value)} rows={2} placeholder="Notas internas..."
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none" />
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => handleAprobacion('aprobado')} disabled={aprobando}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-200 transition-colors">
                      {aprobando ? <Loader2 size={16} className="animate-spin" /> : <Stamp size={16} />} Aprobar
                    </button>
                    <button onClick={() => handleAprobacion('condicionado')} disabled={aprobando}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-bold rounded-xl shadow-lg shadow-amber-200 transition-colors">
                      {aprobando ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={16} />} Condicionar
                    </button>
                    <button onClick={() => handleAprobacion('rechazado')} disabled={aprobando}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-200 transition-colors">
                      {aprobando ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />} Rechazar
                    </button>
                  </div>

                  {msgAprobacion && (
                    <div className={`mt-3 p-3 rounded-xl text-center text-sm font-medium ${
                      msgAprobacion.includes('Aprobado') ? 'bg-emerald-100 text-emerald-800' :
                      msgAprobacion.includes('Rechazado') ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>{msgAprobacion}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}