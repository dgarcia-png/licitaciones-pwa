import { useState, useEffect } from 'react'
import { SkeletonAnalisis } from '../components/Skeleton'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../services/api'
import PipelineBar from '../components/PipelineBar'
import { exportarAnalisisPDF } from '../utils/exportPDF'
import {
  Brain, Loader2, AlertCircle, Search, ArrowLeft, ChevronDown, ChevronUp,
  Shield, Users, FileText, AlertTriangle, Lightbulb, Target, Clock,
  Euro, Building2, Scale, Award, CheckCircle2, XCircle, TrendingUp, Download
} from 'lucide-react'

interface Analisis {
  existe: boolean
  oportunidad_id?: string
  titulo?: string
  organismo?: string
  fecha_analisis?: string
  resumen?: string
  tipo_contrato?: string
  duracion?: string
  criterios?: string
  personal?: string
  solvencia?: string
  clasificacion?: string
  riesgos?: string
  oportunidades?: string
  puntuacion_interes?: number
  analisis_completo?: any
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-100 text-emerald-700 ring-emerald-300'
    : score >= 40 ? 'bg-amber-100 text-amber-700 ring-amber-300'
    : score > 0 ? 'bg-red-100 text-red-700 ring-red-300'
    : 'bg-slate-100 text-slate-500 ring-slate-300'
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ring-1 ${color}`}>
      <Target size={14} />
      {score}/100
    </span>
  )
}

function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string, icon: any, children: React.ReactNode, defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white border border-slate-200 rounded-2xl mb-4 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-xl"><Icon size={18} className="text-slate-600" /></div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        </div>
        {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-slate-100 pt-4">{children}</div>}
    </div>
  )
}

function DataRow({ label, value }: { label: string, value: string | number | undefined }) {
  if (!value || value === 'No especificado') return null
  return (
    <div className="flex justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      <span className="text-sm text-slate-800 text-right max-w-[60%]">{String(value)}</span>
    </div>
  )
}

export default function AnalisisPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const idParam = searchParams.get('id')

  const [oportunidades, setOportunidades] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState(idParam || '')
  const [analisis, setAnalisis] = useState<Analisis | null>(null)
  const [cargando, setCargando] = useState(false)
  const [analizando, setAnalizando] = useState(false)
  const [error, setError] = useState('')

  // Cargar lista de oportunidades
  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await api.oportunidades()
        setOportunidades(data.oportunidades || [])
      } catch (e) {
        console.error(e)
      }
    }
    cargar()
  }, [])

  // Cargar análisis cuando se selecciona una oportunidad
  useEffect(() => {
    if (!selectedId) return
    const cargarAnalisis = async () => {
      setCargando(true)
      setError('')
      try {
        const data = await api.obtenerAnalisis(selectedId)
        setAnalisis(data)
      } catch (e) {
        setError('Error cargando análisis')
      } finally {
        setCargando(false)
      }
    }
    cargarAnalisis()
  }, [selectedId])

  const [msgLotes, setMsgLotes] = useState('')

  const handleAnalizar = async () => {
    if (!selectedId) return
    setAnalizando(true)
    setError('')
    setMsgLotes('')
    try {
      const result = await api.analizarPliegos(selectedId)
      if (result.ok) {
        const data = await api.obtenerAnalisis(selectedId)
        setAnalisis(data)
        if (result.lotes_creados > 0) {
          setMsgLotes('✅ ' + result.lotes_creados + ' lotes creados automáticamente desde el análisis')
        }
      } else {
        setError(result.error || 'Error en el análisis')
      }
    } catch (e) {
      setError('Error ejecutando análisis. Puede tardar hasta 2 minutos.')
    } finally {
      setAnalizando(false)
    }
  }

  const ac = analisis?.analisis_completo || {}

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Pipeline de navegación */}
      <PipelineBar currentStep="analisis" />
      <div className="flex items-center gap-4 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-200">
          <Brain size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Análisis IA</h1>
          <p className="text-sm text-slate-500">Análisis automático de pliegos con Gemini 3.1 Pro</p>
        </div>
      </div>

      {/* Selector de oportunidad */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Seleccionar oportunidad</label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50 appearance-none">
            <option value="">-- Selecciona una oportunidad --</option>
            {oportunidades.map((o: any) => (
              <option key={o.id} value={o.id}>
                [{o.scoring}pts] {String(o.titulo || '').substring(0, 80)} — {o.organismo}
              </option>
            ))}
          </select>
        </div>

        {selectedId && (
          <div className="flex gap-2 mt-3">
            <button onClick={handleAnalizar} disabled={analizando}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
              {analizando ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
              {analizando ? 'Analizando pliegos... (1-2 min)' : analisis?.existe ? 'Re-analizar con IA' : 'Analizar con IA'}
            </button>
            {analisis?.existe && (
              <button onClick={() => exportarAnalisisPDF(analisis)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors">
                <Download size={15} /> Exportar PDF
              </button>
            )}
            <button onClick={() => navigate('/oportunidades/' + selectedId)}
              className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Ver ficha
            </button>
          </div>
        )}
      </div>

      {/* Mensajes */}
      {msgLotes && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm mb-4">
          <CheckCircle2 size={16} className="shrink-0" />{msgLotes}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm mb-4">
          <AlertCircle size={16} className="shrink-0" />{error}
        </div>
      )}

      {cargando && <SkeletonAnalisis />}

      {/* Sin análisis */}
      {!cargando && selectedId && analisis && !analisis.existe && (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-2xl">
          <Brain size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Sin análisis todavía</h3>
          <p className="text-sm text-slate-500 mb-4 text-center max-w-md">
            Esta oportunidad no ha sido analizada. Asegúrate de haber descargado los pliegos primero y pulsa "Analizar con IA".
          </p>
        </div>
      )}

      {/* Resultados del análisis */}
      {!cargando && analisis?.existe && (
        <>
          {/* Resumen ejecutivo */}
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-6 mb-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-slate-900 mb-1">{analisis.titulo}</h2>
                <p className="text-sm text-slate-600">{analisis.organismo}</p>
              </div>
              <ScoreBadge score={Number(analisis.puntuacion_interes) || 0} />
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{analisis.resumen}</p>
            <div className="flex flex-wrap gap-3 mt-4">
              {analisis.tipo_contrato && (
                <span className="text-xs bg-white/80 text-slate-600 px-2 py-1 rounded-lg font-medium">
                  📋 {analisis.tipo_contrato}
                </span>
              )}
              {analisis.duracion && (
                <span className="text-xs bg-white/80 text-slate-600 px-2 py-1 rounded-lg font-medium">
                  ⏱️ {analisis.duracion}
                </span>
              )}
              {ac.datos_basicos?.presupuesto_base_iva > 0 && (
                <span className="text-xs bg-white/80 text-slate-600 px-2 py-1 rounded-lg font-medium">
                  💰 {Number(ac.datos_basicos.presupuesto_base_iva).toLocaleString('es-ES')} €
                </span>
              )}
              {ac.clasificacion_empresarial?.requerida && (
                <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                  ac.clasificacion_empresarial.requerida === 'No' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  🏷️ Clasif: {ac.clasificacion_empresarial.requerida}
                </span>
              )}
            </div>
          </div>

          {/* Puntuación justificada */}
          {ac.puntuacion_interes && (
            <div className={`border rounded-2xl p-5 mb-4 ${
              ac.puntuacion_interes.valor >= 70 ? 'bg-emerald-50 border-emerald-200' :
              ac.puntuacion_interes.valor >= 40 ? 'bg-amber-50 border-amber-200' :
              'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-3 mb-2">
                {ac.puntuacion_interes.valor >= 70 ? <CheckCircle2 size={20} className="text-emerald-600" /> :
                 ac.puntuacion_interes.valor >= 40 ? <AlertTriangle size={20} className="text-amber-600" /> :
                 <XCircle size={20} className="text-red-600" />}
                <h3 className="text-sm font-bold">
                  {ac.puntuacion_interes.valor >= 70 ? 'RECOMENDADA' :
                   ac.puntuacion_interes.valor >= 40 ? 'EVALUAR CON DETALLE' :
                   'NO RECOMENDADA'}
                </h3>
              </div>
              <p className="text-sm text-slate-700">{ac.puntuacion_interes.justificacion}</p>
            </div>
          )}

          {/* Criterios de adjudicación */}
          {ac.criterios_adjudicacion && ac.criterios_adjudicacion.length > 0 && (
            <Section title="Criterios de adjudicación" icon={Award}>
              <div className="space-y-3">
                {ac.criterios_adjudicacion.map((c: any, i: number) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-800">{c.criterio}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          c.tipo === 'Automático' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>{c.tipo}</span>
                        <span className="text-sm font-bold text-slate-900">{c.puntuacion_maxima} pts</span>
                      </div>
                    </div>
                    {c.descripcion && <p className="text-xs text-slate-500">{c.descripcion}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Datos básicos */}
          <Section title="Datos del contrato" icon={FileText} defaultOpen={false}>
            <DataRow label="Objeto" value={ac.datos_basicos?.objeto_contrato} />
            <DataRow label="Tipo" value={ac.datos_basicos?.tipo_contrato} />
            <DataRow label="Presupuesto (IVA)" value={ac.datos_basicos?.presupuesto_base_iva ? Number(ac.datos_basicos.presupuesto_base_iva).toLocaleString('es-ES') + ' €' : undefined} />
            <DataRow label="Presupuesto (sin IVA)" value={ac.datos_basicos?.presupuesto_base_sin_iva ? Number(ac.datos_basicos.presupuesto_base_sin_iva).toLocaleString('es-ES') + ' €' : undefined} />
            <DataRow label="Valor estimado" value={ac.datos_basicos?.valor_estimado ? Number(ac.datos_basicos.valor_estimado).toLocaleString('es-ES') + ' €' : undefined} />
            <DataRow label="Duración" value={ac.datos_basicos?.duracion_contrato} />
            <DataRow label="Prórrogas" value={ac.datos_basicos?.prorrogas} />
            <DataRow label="Lotes" value={ac.datos_basicos?.lotes} />
            <DataRow label="Revisión precios" value={ac.datos_basicos?.revision_precios} />
          </Section>

          {/* Plazos */}
          <Section title="Plazos" icon={Clock} defaultOpen={false}>
            <DataRow label="Presentación ofertas" value={ac.plazos?.presentacion_ofertas} />
            <DataRow label="Apertura sobres" value={ac.plazos?.apertura_sobres} />
            <DataRow label="Duración ejecución" value={ac.plazos?.duracion_ejecucion} />
            <DataRow label="Inicio previsto" value={ac.plazos?.inicio_previsto} />
            <DataRow label="Formalización" value={ac.plazos?.plazo_formalizacion} />
          </Section>

          {/* Solvencia y clasificación */}
          <Section title="Solvencia y clasificación" icon={Shield} defaultOpen={false}>
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Solvencia económica</h4>
            <DataRow label="Volumen negocios" value={ac.solvencia_economica?.volumen_anual_negocios} />
            <DataRow label="Seguro RC" value={ac.solvencia_economica?.seguro_responsabilidad} />
            <DataRow label="Otros" value={ac.solvencia_economica?.otros} />
            <div className="my-3 border-t border-slate-100" />
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Solvencia técnica</h4>
            <DataRow label="Trabajos similares" value={ac.solvencia_tecnica?.trabajos_similares} />
            <DataRow label="Importe mínimo" value={ac.solvencia_tecnica?.importe_minimo_trabajos} />
            <DataRow label="Personal cualificado" value={ac.solvencia_tecnica?.personal_cualificado} />
            <DataRow label="Certificaciones" value={ac.solvencia_tecnica?.certificaciones} />
            <div className="my-3 border-t border-slate-100" />
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Clasificación empresarial</h4>
            <DataRow label="Requerida" value={ac.clasificacion_empresarial?.requerida} />
            <DataRow label="Grupo" value={ac.clasificacion_empresarial?.grupo} />
            <DataRow label="Subgrupo" value={ac.clasificacion_empresarial?.subgrupo} />
            <DataRow label="Categoría" value={ac.clasificacion_empresarial?.categoria} />
          </Section>

          {/* Personal */}
          <Section title="Personal requerido" icon={Users} defaultOpen={false}>
            <DataRow label="Subrogación" value={ac.personal_requerido?.subrogacion} />
            <DataRow label="Trabajadores a subrogar" value={ac.personal_requerido?.num_trabajadores_subrogar > 0 ? ac.personal_requerido.num_trabajadores_subrogar : undefined} />
            <DataRow label="Convenio" value={ac.personal_requerido?.convenio_aplicable} />
            <DataRow label="Categorías" value={ac.personal_requerido?.categorias_profesionales} />
            <DataRow label="Dedicación mínima" value={ac.personal_requerido?.dedicacion_minima} />
            {ac.personal_requerido?.detalle && (
              <p className="text-sm text-slate-600 mt-2 p-3 bg-slate-50 rounded-xl">{ac.personal_requerido.detalle}</p>
            )}
          </Section>

          {/* Garantías */}
          <Section title="Garantías" icon={Scale} defaultOpen={false}>
            <DataRow label="Provisional" value={ac.garantias?.provisional} />
            <DataRow label="Definitiva" value={ac.garantias?.definitiva} />
            <DataRow label="Complementaria" value={ac.garantias?.complementaria} />
          </Section>

          {/* Mejoras valorables */}
          {ac.mejoras_valorables && ac.mejoras_valorables.length > 0 && ac.mejoras_valorables[0].mejora !== 'No especificado' && (
            <Section title="Mejoras valorables" icon={TrendingUp} defaultOpen={false}>
              {ac.mejoras_valorables.map((m: any, i: number) => (
                <div key={i} className="flex justify-between py-2 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-slate-700">{m.mejora}</span>
                  {m.puntuacion > 0 && <span className="text-sm font-bold text-violet-600">{m.puntuacion} pts</span>}
                </div>
              ))}
            </Section>
          )}

          {/* Riesgos y oportunidades */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {ac.riesgos_detectados && ac.riesgos_detectados.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={18} className="text-red-600" />
                  <h3 className="text-sm font-bold text-red-800">Riesgos detectados</h3>
                </div>
                <ul className="space-y-2">
                  {ac.riesgos_detectados.map((r: any, i: number) => (
                    <li key={i} className="text-sm text-red-700">
                      {typeof r === 'string' ? (
                        <span className="flex gap-2"><span className="text-red-400 shrink-0">•</span><span>{r}</span></span>
                      ) : (
                        <div className="flex items-start gap-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                            r.gravedad === 'alta' ? 'bg-red-200 text-red-800' :
                            r.gravedad === 'media' ? 'bg-amber-200 text-amber-800' :
                            'bg-slate-200 text-slate-700'
                          }`}>{(r.gravedad || 'media').toUpperCase()}</span>
                          <div>
                            <p className="font-medium">{r.riesgo}</p>
                            {r.mitigacion && <p className="text-xs text-slate-500 mt-0.5">{r.mitigacion}</p>}
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {ac.oportunidades_detectadas && ac.oportunidades_detectadas.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={18} className="text-emerald-600" />
                  <h3 className="text-sm font-bold text-emerald-800">Oportunidades detectadas</h3>
                </div>
                <ul className="space-y-2">
                  {ac.oportunidades_detectadas.map((o: any, i: number) => (
                    <li key={i} className="text-sm text-emerald-700">
                      {typeof o === 'string' ? (
                        <span className="flex gap-2"><span className="text-emerald-400 shrink-0">•</span><span>{o}</span></span>
                      ) : (
                        <div className="flex items-start gap-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                            o.impacto === 'alto' ? 'bg-emerald-200 text-emerald-800' :
                            o.impacto === 'medio' ? 'bg-blue-200 text-blue-800' :
                            'bg-slate-200 text-slate-700'
                          }`}>{(o.impacto || 'medio').toUpperCase()}</span>
                          <p>{o.oportunidad}</p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Documentación requerida */}
          {ac.documentacion_requerida && ac.documentacion_requerida.length > 0 && (
            <Section title="Documentación requerida" icon={FileText} defaultOpen={false}>
              <ul className="space-y-1.5">
                {ac.documentacion_requerida.map((d: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 size={14} className="text-slate-400 mt-0.5 shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Penalizaciones */}
          <Section title="Penalizaciones" icon={AlertCircle} defaultOpen={false}>
            <DataRow label="Por incumplimiento" value={ac.penalizaciones?.por_incumplimiento} />
            <DataRow label="Por retraso" value={ac.penalizaciones?.por_retraso} />
            <DataRow label="Por calidad" value={ac.penalizaciones?.por_calidad} />
            <DataRow label="Resolución" value={ac.penalizaciones?.resolucion} />
          </Section>

          {/* Condiciones especiales */}
          <Section title="Condiciones especiales" icon={Shield} defaultOpen={false}>
            <DataRow label="Medioambientales" value={ac.condiciones_especiales?.medioambientales} />
            <DataRow label="Sociales" value={ac.condiciones_especiales?.sociales} />
            <DataRow label="Innovación" value={ac.condiciones_especiales?.innovacion} />
            <DataRow label="Otras" value={ac.condiciones_especiales?.otras} />
          </Section>
        </>
      )}

      {/* Sin seleccionar */}
      {!selectedId && (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-2xl">
          <Brain size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Selecciona una oportunidad</h3>
          <p className="text-sm text-slate-500 text-center max-w-md">
            Elige una oportunidad del listado para ver su análisis IA o para lanzar un nuevo análisis de los pliegos.
          </p>
        </div>
      )}
    </div>
  )
}