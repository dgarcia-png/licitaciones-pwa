import { useState, useEffect } from 'react'
import { api } from '../services/api'
import {
  BookOpen, Upload, Trash2, Loader2, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp, Search, FileText, Award, Users, Shield,
  Wrench, Briefcase, Lightbulb, X, ExternalLink, Database, Zap
} from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'

const CATEGORIAS: Record<string, { label: string; icon: any; color: string }> = {
  memoria_tecnica:    { label: 'Memoria técnica ganadora',    icon: FileText,  color: 'bg-blue-100 text-blue-700' },
  memoria_economica:  { label: 'Memoria económica ganadora',  icon: FileText,  color: 'bg-green-100 text-green-700' },
  cv:                 { label: 'CV personal clave',           icon: Users,     color: 'bg-purple-100 text-purple-700' },
  certificacion:      { label: 'Certificación/acreditación',  icon: Award,     color: 'bg-amber-100 text-amber-700' },
  metodologia:        { label: 'Metodología de trabajo',      icon: Wrench,    color: 'bg-cyan-100 text-cyan-700' },
  plan_calidad:       { label: 'Plan de calidad',             icon: Shield,    color: 'bg-teal-100 text-teal-700' },
  plan_prl:           { label: 'Plan de PRL',                 icon: Shield,    color: 'bg-red-100 text-red-700' },
  plan_medioambiente: { label: 'Plan medioambiental',         icon: Shield,    color: 'bg-emerald-100 text-emerald-700' },
  experiencia:        { label: 'Experiencia acreditada',      icon: Briefcase, color: 'bg-indigo-100 text-indigo-700' },
  mejora_tipo:        { label: 'Mejora tipo ofertada',        icon: Lightbulb, color: 'bg-yellow-100 text-yellow-700' },
  maquinaria:         { label: 'Catálogo maquinaria/productos', icon: Wrench,  color: 'bg-orange-100 text-orange-700' },
  contrato:           { label: 'Contrato vigente/anterior',   icon: FileText,  color: 'bg-slate-100 text-slate-700' },
  modelo_oferta:      { label: 'Modelo de oferta completa',   icon: FileText,  color: 'bg-violet-100 text-violet-700' },
  otro:               { label: 'Otro documento',              icon: FileText,  color: 'bg-gray-100 text-gray-700' },
}

const SECTORES = ['Limpieza', 'Mantenimiento', 'Jardinería', 'Multiservicios', 'Socorrismo', 'Facilities', 'Otro']

export default function ConocimientoPage() {
  const [docs, setDocs] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [queryBusqueda, setQueryBusqueda] = useState('')
  const [resultadosBusqueda, setResultadosBusqueda] = useState<any[]>([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [confirmEliminar, setConfirmEliminar] = useState<{ id: string; nombre: string } | null>(null)

  const [form, setForm] = useState({
    categoria: 'memoria_tecnica',
    descripcion: '',
    sector: 'Limpieza',
    ambito: 'público',
    fecha_documento: '',
    resultado: '',
    importe: '',
    organismo: '',
    tags: ''
  })

  const cargarDatos = async () => {
    setCargando(true)
    try {
      const [docData, statsData] = await Promise.all([api.conocimiento(), api.conocimientoStats()])
      setDocs(docData.documentos || [])
      setStats(statsData)
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargarDatos() }, [])

  const handleSubir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setSubiendo(true); setError(''); setMensaje('')
    try {
      const result = await api.subirConocimiento(file, form)
      if (result.ok) {
        setMensaje(`Documento procesado: ${result.nombre} — ${result.chunks} fragmentos indexados`)
        setMostrarFormulario(false)
        setForm({ ...form, descripcion: '', fecha_documento: '', importe: '', organismo: '', tags: '' })
        await cargarDatos()
      } else { setError(result.error || 'Error procesando') }
    } catch (err) { setError('Error subiendo. El procesamiento puede tardar 1-3 min.') }
    finally { setSubiendo(false); e.target.value = '' }
  }

  const handleEliminarConfirmado = async () => {
    if (!confirmEliminar) return
    try {
      await api.eliminarConocimiento(confirmEliminar.id)
      setMensaje('Documento eliminado'); await cargarDatos()
    } catch (e) { setError('Error eliminando') }
    finally { setConfirmEliminar(null) }
  }

  const handleBuscar = async () => {
    if (!queryBusqueda.trim()) return
    setBuscando(true)
    try {
      const result = await api.buscarConocimiento(queryBusqueda)
      setResultadosBusqueda(result.resultados || [])
    } catch (e) { setError('Error buscando') }
    finally { setBuscando(false) }
  }

  const docsFiltrados = filtroCategoria ? docs.filter(d => d.categoria === filtroCategoria) : docs

  if (cargando) return (<div className="flex flex-col items-center py-20"><Loader2 size={32} className="text-blue-500 animate-spin mb-3" /><p className="text-slate-500">Cargando base de conocimiento...</p></div>)

  return (
    <div className="p-6 lg:p-8 max-w-5xl">

      <ConfirmModal
        open={!!confirmEliminar}
        titulo="¿Eliminar documento?"
        mensaje={`Se eliminarán el archivo "${confirmEliminar?.nombre}" y todos sus embeddings. Esta acción no se puede deshacer.`}
        labelOk="Sí, eliminar" peligroso
        onConfirm={handleEliminarConfirmado}
        onCancel={() => setConfirmEliminar(null)}
      />

      {/* Cabecera */}
      <div className="flex items-center gap-4 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200"><Database size={22} className="text-white" /></div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Base de conocimiento</h1>
          <p className="text-sm text-slate-500">Documentos de la empresa para alimentar la IA</p>
        </div>
        <button onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl">
          <Upload size={16} /> Subir documento
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <span className="text-[10px] text-slate-400 uppercase">Documentos</span>
            <p className="text-2xl font-bold text-slate-900">{stats.total_documentos}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <span className="text-[10px] text-slate-400 uppercase">Fragmentos indexados</span>
            <p className="text-2xl font-bold text-slate-900">{stats.total_chunks_indexados}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <span className="text-[10px] text-slate-400 uppercase">Categorías</span>
            <p className="text-2xl font-bold text-slate-900">{stats.categorias_disponibles}</p>
          </div>
          <div className={`rounded-xl p-4 border ${stats.listo_para_rag ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <span className="text-[10px] text-slate-400 uppercase">RAG</span>
            <div className="flex items-center gap-2">
              {stats.listo_para_rag ? <Zap size={18} className="text-emerald-600" /> : <AlertCircle size={18} className="text-amber-600" />}
              <p className="text-sm font-bold">{stats.listo_para_rag ? 'Activo' : 'Sin datos'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Mensajes */}
      {mensaje && <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4"><CheckCircle2 size={16} className="text-emerald-600" /><span className="text-sm text-emerald-800">{mensaje}</span><button onClick={() => setMensaje('')} className="ml-auto"><X size={14} className="text-emerald-400" /></button></div>}
      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4"><AlertCircle size={16} className="text-red-600" /><span className="text-sm text-red-800">{error}</span><button onClick={() => setError('')} className="ml-auto"><X size={14} className="text-red-400" /></button></div>}

      {/* Formulario subida */}
      {mostrarFormulario && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-indigo-900 mb-4">Subir documento de la empresa</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Categoría</label>
              <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white">
                {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Sector</label>
              <select value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white">
                {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Ámbito</label>
              <select value={form.ambito} onChange={e => setForm({ ...form, ambito: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white">
                <option value="público">Público</option>
                <option value="privado">Privado</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Resultado (si aplica)</label>
              <select value={form.resultado} onChange={e => setForm({ ...form, resultado: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white">
                <option value="">— No aplica —</option>
                <option value="ganada">Ganada</option>
                <option value="perdida">Perdida</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Organismo/cliente</label>
              <input type="text" value={form.organismo} onChange={e => setForm({ ...form, organismo: e.target.value })}
                placeholder="Ej: Ayto. Sevilla" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Importe (€)</label>
              <input type="number" step="any" value={form.importe} onChange={e => setForm({ ...form, importe: e.target.value })}
                placeholder="500000" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Descripción breve</label>
              <input type="text" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Ej: Memoria técnica limpieza colegios Sevilla 2024" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Tags (separados por coma)</label>
              <input type="text" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
                placeholder="limpieza, colegios, sevilla, subrogación" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" />
            </div>
          </div>
          <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${subiendo ? 'border-indigo-300 bg-indigo-100' : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50'}`}>
            {subiendo ? (
              <><Loader2 size={24} className="text-indigo-500 animate-spin mb-2" /><span className="text-sm text-indigo-700 font-medium">Procesando con Gemini...</span><span className="text-xs text-indigo-500 mt-1">Extrayendo texto + generando embeddings (1-3 min)</span></>
            ) : (
              <><Upload size={24} className="text-slate-400 mb-2" /><span className="text-sm text-slate-600 font-medium">Seleccionar PDF / Word</span><span className="text-xs text-slate-400 mt-1">Se extraerá el texto y se indexará automáticamente</span></>
            )}
            <input type="file" accept=".pdf,.doc,.docx" onChange={handleSubir} disabled={subiendo} className="hidden" />
          </label>
          <button onClick={() => setMostrarFormulario(false)} className="mt-3 text-xs text-slate-500 hover:text-slate-700">Cancelar</button>
        </div>
      )}

      {/* Buscador semántico */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2"><Search size={16} /> Buscar en la base de conocimiento</h3>
        <div className="flex gap-2">
          <input type="text" value={queryBusqueda} onChange={e => setQueryBusqueda(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleBuscar() }}
            placeholder="Ej: experiencia limpieza colegios, metodología mantenimiento jardines, CV técnico PRL..."
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          <button onClick={handleBuscar} disabled={buscando || !queryBusqueda.trim()}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-xl">
            {buscando ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Buscar
          </button>
        </div>
        {resultadosBusqueda.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-slate-500">{resultadosBusqueda.length} resultados</p>
            {resultadosBusqueda.map((r: any, i: number) => (
              <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CATEGORIAS[r.categoria]?.color || 'bg-gray-100 text-gray-700'}`}>
                    {CATEGORIAS[r.categoria]?.label || r.categoria}
                  </span>
                  <span className="text-[10px] text-slate-400">{r.nombre}</span>
                  <span className="text-[10px] text-indigo-600 font-bold ml-auto">{Math.round(r.similitud * 100)}% relevante</span>
                </div>
                <p className="text-xs text-slate-700">{r.texto}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filtro por categoría */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setFiltroCategoria('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!filtroCategoria ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
          Todos ({docs.length})
        </button>
        {Object.entries(CATEGORIAS).map(([k, v]) => {
          const count = docs.filter(d => d.categoria === k).length
          if (count === 0) return null
          return (
            <button key={k} onClick={() => setFiltroCategoria(k === filtroCategoria ? '' : k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtroCategoria === k ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {v.label.split(' ')[0]} ({count})
            </button>
          )
        })}
      </div>

      {/* Lista de documentos */}
      {docsFiltrados.length === 0 ? (
        <div className="flex flex-col items-center py-16 bg-white border border-slate-200 rounded-2xl">
          <BookOpen size={48} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No hay documentos en la base de conocimiento</p>
          <p className="text-sm text-slate-400 mt-1">Sube memorias ganadoras, CVs, certificaciones, metodologías...</p>
          <p className="text-xs text-slate-400 mt-3">La IA los usará para analizar pliegos, valorar viabilidad y generar ofertas.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docsFiltrados.map((doc: any) => {
            const catInfo = CATEGORIAS[doc.categoria] || CATEGORIAS['otro']
            const CatIcon = catInfo.icon
            return (
              <div key={doc.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${catInfo.color.split(' ')[0]}`}>
                    <CatIcon size={16} className={catInfo.color.split(' ')[1]} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-slate-900 truncate">{doc.nombre}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${catInfo.color}`}>
                        {catInfo.label}
                      </span>
                      {doc.resultado === 'ganada' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium shrink-0">Ganada</span>}
                      {doc.resultado === 'perdida' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium shrink-0">Perdida</span>}
                    </div>
                    {doc.descripcion && <p className="text-xs text-slate-500 mb-1 line-clamp-2">{doc.descripcion}</p>}
                    <div className="flex items-center gap-3 flex-wrap">
                      {doc.sector && <span className="text-[10px] text-slate-400">{doc.sector}</span>}
                      {doc.organismo && <span className="text-[10px] text-slate-400">{doc.organismo}</span>}
                      {doc.importe > 0 && <span className="text-[10px] text-slate-400">{Number(doc.importe).toLocaleString('es-ES')} €</span>}
                      <span className={`text-[10px] ${doc.tiene_embedding ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {doc.tiene_embedding ? `${doc.chunks} chunks` : 'Sin indexar'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {doc.drive_url && <a href={doc.drive_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600 p-1"><ExternalLink size={14} /></a>}
                    <button onClick={() => setConfirmEliminar({ id: doc.id, nombre: doc.nombre })} className="text-slate-300 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
