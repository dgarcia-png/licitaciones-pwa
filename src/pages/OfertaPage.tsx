import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import PipelineBar from '../components/PipelineBar'
import {
  FileText, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  Download, RefreshCw, Zap, Copy, X, FileCheck, Clock, Brain, Settings
} from 'lucide-react'

const TIPOS: Record<string, { label: string; desc: string; color: string }> = {
  carta_presentacion: { label: 'Carta de presentación', desc: 'Presentación formal de la empresa',    color: 'bg-slate-100 text-slate-700' },
  memoria_tecnica:    { label: 'Memoria técnica',       desc: 'Propuesta técnica completa',           color: 'bg-blue-100 text-blue-700' },
  memoria_economica:  { label: 'Memoria económica',     desc: 'Desglose y justificación de costes',   color: 'bg-green-100 text-green-700' },
  plan_trabajo:       { label: 'Plan de trabajo',       desc: 'Organización, horarios, protocolos',   color: 'bg-amber-100 text-amber-700' },
  plan_calidad:       { label: 'Plan de calidad',       desc: 'Control, KPIs, mejora continua',       color: 'bg-purple-100 text-purple-700' },
  plan_prl:           { label: 'Plan de PRL',           desc: 'Prevención de riesgos laborales',      color: 'bg-red-100 text-red-700' },
  plan_medioambiente: { label: 'Plan medioambiental',   desc: 'Sostenibilidad y gestión residuos',    color: 'bg-emerald-100 text-emerald-700' },
}

function detectarFamiliaCPV(cpv: string): string {
  const c = (cpv || '').replace(/[^0-9]/g, '')
  if (c.startsWith('773')) return 'jardineria'
  if (c.startsWith('507') || c.startsWith('500') || c.startsWith('508')) return 'mantenimiento'
  if (c.startsWith('983') || c.startsWith('982')) return 'conserjeria'
  if (c.startsWith('905') || c.startsWith('906') || c.startsWith('907')) return 'residuos'
  return 'limpieza'
}

const FAMILIA_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  limpieza:      { label: 'Limpieza',      emoji: '🧹', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  jardineria:    { label: 'Jardinería',    emoji: '🌿', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  mantenimiento: { label: 'Mantenimiento', emoji: '🔧', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  conserjeria:   { label: 'Conserjería',   emoji: '🏢', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  residuos:      { label: 'Residuos',      emoji: '♻️', color: 'bg-slate-50 text-slate-700 border-slate-200' },
}

export default function OfertaPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const idParam = searchParams.get('id')

  const [oportunidades, setOportunidades] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState(idParam || '')
  const [oportunidad, setOportunidad] = useState<any>(null)
  const [documentos, setDocumentos] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [generando, setGenerando] = useState('')
  const [generandoTodos, setGenerandoTodos] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [docAbierto, setDocAbierto] = useState('')
  const [copiado, setCopiado] = useState('')
  const [templateCpv, setTemplateCpv] = useState<{ familia: string; total: number } | null>(null)

  const handleSelectId = (id: string) => {
    setSelectedId(id)
    setTemplateCpv(null)
    if (id) setSearchParams({ id }, { replace: true })
    else setSearchParams({}, { replace: true })
  }

  useEffect(() => {
    if (idParam && idParam !== selectedId) setSelectedId(idParam)
  }, [idParam]) // eslint-disable-line

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      try { const data = await api.oportunidades(); setOportunidades(data.oportunidades || []) }
      catch (e) { console.error(e) }
      finally { setCargando(false) }
    }
    cargar()
  }, [])

  useEffect(() => {
    if (!selectedId) { setOportunidad(null); setDocumentos([]); setTemplateCpv(null); return }
    const cargar = async () => {
      setCargando(true)
      try {
        const [det, docs] = await Promise.all([api.detalle(selectedId), api.documentosOferta(selectedId)])
        if (!det.error) {
          setOportunidad(det)
          // Cargar template CPV disponible
          try {
            const familia = detectarFamiliaCPV(det.cpv || '')
            const tmpl = await api.plantillasCPV(familia)
            setTemplateCpv(tmpl.plantillas?.length > 0 ? { familia, total: tmpl.plantillas.length } : null)
          } catch { setTemplateCpv(null) }
        }
        setDocumentos(docs.documentos || [])
      } catch (e) { console.error(e) }
      finally { setCargando(false) }
    }
    cargar()
  }, [selectedId])

  const handleGenerar = async (tipo: string) => {
    setGenerando(tipo); setError(''); setMensaje('')
    try {
      const result = await api.generarDocumento(selectedId, tipo)
      if (result.ok) {
        setMensaje(`${TIPOS[tipo]?.label || tipo} generado (${result.chars} caracteres)`)
        const docs = await api.documentosOferta(selectedId)
        setDocumentos(docs.documentos || [])
        setDocAbierto(tipo)
      } else { setError(result.error || 'Error generando') }
    } catch (e) { setError('Error. La generación puede tardar 1-2 min.') }
    finally { setGenerando('') }
  }

  const handleGenerarTodos = async () => {
    setGenerandoTodos(true); setError(''); setMensaje('')
    try {
      const result = await api.generarTodosDocumentos(selectedId)
      if (result.ok) {
        setMensaje(`${result.generados} documentos generados` + (result.errores?.length > 0 ? ` (${result.errores.length} errores)` : ''))
        const docs = await api.documentosOferta(selectedId)
        setDocumentos(docs.documentos || [])
      } else { setError(result.error || 'Error') }
    } catch (e) { setError('Error. Generar todos puede tardar 5-10 min.') }
    finally { setGenerandoTodos(false) }
  }

  const copiarTexto = (texto: string, tipo: string) => {
    navigator.clipboard.writeText(texto)
    setCopiado(tipo)
    setTimeout(() => setCopiado(''), 2000)
  }

  const goOportunidades = oportunidades.filter(o => o.estado === 'go')
  const docsPorTipo = new Map(documentos.map(d => [d.tipo, d]))
  const familiaInfo = templateCpv ? FAMILIA_LABELS[templateCpv.familia] : null

  if (cargando && !oportunidad) return (
    <div className="flex flex-col items-center py-20">
      <Loader2 size={32} className="text-blue-500 animate-spin mb-3" />
      <p className="text-slate-500">Cargando...</p>
    </div>
  )

  return (
    <div className="max-w-5xl">
      {/* Pipeline */}
      <PipelineBar
        currentStep="oferta"
        showNext={!!(selectedId && documentos.length > 0)}
        nextLabel="Ir a Seguimiento →"
        nextDisabled={documentos.length === 0}
        nextDisabledMsg="Genera al menos un documento antes de continuar"
      />

      <div className="flex items-center gap-4 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-rose-500 to-red-600 rounded-xl shadow-lg shadow-rose-200">
          <FileText size={22} className="text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Generación de oferta</h1>
          <p className="text-sm text-slate-500">Documentos generados por IA basados en el pliego + empresa</p>
        </div>
      </div>

      {/* Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Oportunidad GO</label>
        <select
          value={selectedId}
          onChange={e => handleSelectId(e.target.value)}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-rose-500 focus:outline-none"
        >
          <option value="">— Seleccionar oportunidad con decisión GO —</option>
          {goOportunidades.map((o: any) => (
            <option key={o.id} value={o.id}>
              {o.titulo?.substring(0, 70)} — {o.presupuesto ? Number(o.presupuesto).toLocaleString('es-ES') + ' €' : '?'}
            </option>
          ))}
        </select>
        {goOportunidades.length === 0 && (
          <p className="text-xs text-slate-400 mt-2">Marca una oportunidad como GO para generar la oferta.</p>
        )}
      </div>

      {mensaje && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span className="text-sm text-emerald-800">{mensaje}</span>
          <button onClick={() => setMensaje('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
          <AlertCircle size={16} className="text-red-600" />
          <span className="text-sm text-red-800">{error}</span>
          <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Info oportunidad seleccionada */}
      {oportunidad && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{oportunidad.titulo}</p>
            <p className="text-xs text-slate-500">
              {oportunidad.organismo} · {oportunidad.presupuesto ? Number(oportunidad.presupuesto).toLocaleString('es-ES') + ' €' : '?'}
            </p>
          </div>

          {/* Badge CPV */}
          {oportunidad.cpv && (
            <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-lg shrink-0">
              CPV {oportunidad.cpv}
            </span>
          )}

          {/* Badge sector */}
          {oportunidad.cpv && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 ${
              String(oportunidad.cpv).startsWith('773') ? 'bg-emerald-100 text-emerald-700' :
              String(oportunidad.cpv).startsWith('507') ? 'bg-amber-100 text-amber-700' :
              String(oportunidad.cpv).startsWith('983') ? 'bg-purple-100 text-purple-700' :
              String(oportunidad.cpv).startsWith('797') ? 'bg-slate-100 text-slate-600' :
              'bg-slate-100 text-slate-600'
            }`}>
              {String(oportunidad.cpv).startsWith('773') ? '🌿 Jardinería' :
               String(oportunidad.cpv).startsWith('507') ? '🔧 Mantenimiento' :
               String(oportunidad.cpv).startsWith('983') ? '🏢 Conserjería' :
               String(oportunidad.cpv).startsWith('797') ? '🛡️ Vigilancia' :
               '🧹 Limpieza'}
            </span>
          )}

          {/* Badge template CPV */}
          {templateCpv && familiaInfo ? (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border shrink-0 flex items-center gap-1 ${familiaInfo.color}`}>
              <CheckCircle2 size={11} />
              Template {familiaInfo.label} activo
            </span>
          ) : oportunidad.cpv ? (
            <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg shrink-0">
              Sin template CPV
            </span>
          ) : null}
        </div>
      )}

      {selectedId && oportunidad && (
        <>
          {/* Acciones principales */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-bold text-slate-900 mb-1">{oportunidad.titulo}</h2>
            <p className="text-xs text-slate-500 mb-3">{oportunidad.organismo}</p>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleGenerarTodos}
                disabled={generandoTodos || !!generando}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 rounded-xl"
              >
                {generandoTodos ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                {generandoTodos ? 'Generando todos (5-10 min)...' : 'Generar todos los documentos'}
              </button>
              {documentos.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <FileCheck size={14} /> {documentos.length} docs generados
                </span>
              )}
              <a
                href="/configuracion"
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 ml-auto"
              >
                <Settings size={13} />
                Templates CPV
              </a>
            </div>
            {templateCpv && familiaInfo && (
              <p className="text-xs text-slate-400 mt-2">
                <Brain size={11} className="inline mr-1" />
                La IA usará el texto base de <strong>{familiaInfo.label}</strong> como referencia corporativa para todos los documentos.
              </p>
            )}
          </div>

          {/* Lista de documentos */}
          <div className="space-y-3">
            {Object.entries(TIPOS).map(([tipo, info]) => {
              const doc = docsPorTipo.get(tipo)
              const isGenerando = generando === tipo
              const isAbierto = docAbierto === tipo

              return (
                <div key={tipo} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${info.color}`}>{info.label}</span>
                      <span className="text-xs text-slate-400">{info.desc}</span>
                      {doc && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                          <CheckCircle2 size={10} /> Generado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {doc && (
                        <>
                          {doc.google_doc_url && (
                            <a
                              href={doc.google_doc_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                            >
                              <Download size={12} /> Editar en Google Docs
                            </a>
                          )}
                          <button
                            onClick={() => setDocAbierto(isAbierto ? '' : tipo)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                          >
                            {isAbierto ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {isAbierto ? 'Cerrar' : 'Ver'}
                          </button>
                          <button
                            onClick={() => copiarTexto(doc.contenido, tipo)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
                          >
                            {copiado === tipo ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                            {copiado === tipo ? 'Copiado' : 'Copiar'}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleGenerar(tipo)}
                        disabled={isGenerando || generandoTodos}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 rounded-lg"
                      >
                        {isGenerando ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        {isGenerando ? 'Generando...' : doc ? 'Regenerar' : 'Generar'}
                      </button>
                    </div>
                  </div>

                  {isAbierto && doc && (
                    <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] text-slate-400">
                          <Clock size={10} className="inline" /> {doc.fecha ? new Date(doc.fecha).toLocaleString('es-ES') : ''}
                        </span>
                        <span className="text-[10px] text-slate-400">{doc.contenido?.length || 0} caracteres</span>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-5 max-h-[600px] overflow-y-auto">
                        <div className="prose prose-sm max-w-none text-slate-700">
                          {doc.contenido?.split('\n').map((line: string, i: number) => {
                            if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-slate-900 mt-6 mb-2">{line.replace('## ', '')}</h2>
                            if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold text-slate-800 mt-4 mb-1">{line.replace('### ', '')}</h3>
                            if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-black text-slate-900 mt-6 mb-3">{line.replace('# ', '')}</h1>
                            if (line.startsWith('- ')) return <p key={i} className="text-sm pl-4 mb-0.5">• {line.replace('- ', '')}</p>
                            if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="text-sm font-bold mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>
                            if (line.trim() === '') return <div key={i} className="h-2" />
                            return <p key={i} className="text-sm mb-1">{line}</p>
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Los documentos se generan con IA basándose en el análisis del pliego, el cálculo económico y la base de conocimiento de la empresa. Revisa y ajusta antes de presentar.
          </p>
        </>
      )}
    </div>
  )
}
