import { useState, useEffect } from 'react'
import { api } from '../services/api'
import {
  FileText, Upload, Loader2, Search, AlertTriangle, CheckCircle2,
  Clock, XCircle, FolderOpen, ExternalLink, X, RefreshCw,
  User, ChevronDown, ChevronUp, Briefcase, Building2
} from 'lucide-react'

const TIPO_ICONS: Record<string, string> = {
  'dni': '🪪', 'contrato_laboral': '📝', 'nomina': '💰', 'titulo_formacion': '🎓',
  'certificado_delitos': '📋', 'vida_laboral': '📄', 'curriculum': '📎',
  'reconocimiento_medico': '🏥', 'certificado_prl': '⛑️', 'entrega_epi': '🦺',
  'parte_accidente': '🚨', 'evaluacion_riesgos': '⚠️', 'consentimiento': '✍️',
  'solicitud_arco': '🔒', 'pliego': '📑', 'oferta': '📊', 'contrato_publico': '🏛️',
  'solvencia': '💼', 'parte_trabajo': '📋', 'foto_incidencia': '📸',
  'informe_cliente': '📈', 'factura': '🧾', 'seguro': '🛡️', 'certificacion': '✅', 'otro': '📄'
}

const MODULO_COLORS: Record<string, { bg: string; text: string }> = {
  'RRHH': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'PRL': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  'RGPD': { bg: 'bg-purple-100', text: 'text-purple-700' },
  'LICITACIONES': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'TERRITORIO': { bg: 'bg-orange-100', text: 'text-orange-700' },
  'ADMINISTRACIÓN': { bg: 'bg-slate-100', text: 'text-slate-700' },
  'GENERAL': { bg: 'bg-gray-100', text: 'text-gray-700' },
}

const DOCS_PERSONA = [
  { tipo: 'dni', label: 'DNI / NIE', obligatorio: true },
  { tipo: 'contrato_laboral', label: 'Contrato laboral', obligatorio: true },
  { tipo: 'reconocimiento_medico', label: 'Reconocimiento médico', obligatorio: true },
  { tipo: 'certificado_prl', label: 'Formación PRL', obligatorio: true },
  { tipo: 'certificado_delitos', label: 'Cert. delitos sexuales', obligatorio: true },
  { tipo: 'consentimiento', label: 'Consentimiento RGPD', obligatorio: true },
  { tipo: 'titulo_formacion', label: 'Título/formación', obligatorio: false },
  { tipo: 'curriculum', label: 'Curriculum', obligatorio: false },
  { tipo: 'vida_laboral', label: 'Vida laboral', obligatorio: false },
  { tipo: 'nomina', label: 'Nóminas', obligatorio: false },
  { tipo: 'entrega_epi', label: 'Entrega EPIs', obligatorio: false },
]

const DOCS_PROYECTO = [
  { tipo: 'pliego', label: 'Pliegos', obligatorio: true },
  { tipo: 'oferta', label: 'Documentos oferta', obligatorio: true },
  { tipo: 'contrato_publico', label: 'Contrato adjudicado', obligatorio: false },
  { tipo: 'solvencia', label: 'Certificados solvencia', obligatorio: true },
  { tipo: 'certificacion', label: 'Certificaciones (ISO)', obligatorio: false },
  { tipo: 'seguro', label: 'Pólizas de seguro', obligatorio: true },
  { tipo: 'evaluacion_riesgos', label: 'Evaluación riesgos', obligatorio: false },
  { tipo: 'factura', label: 'Facturas', obligatorio: false },
  { tipo: 'informe_cliente', label: 'Informes cliente', obligatorio: false },
]

function DocRow({ doc }: { doc: any }) {
  const mc = MODULO_COLORS[doc.modulo] || MODULO_COLORS['GENERAL']
  return (
    <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
      <span className="text-base shrink-0">{TIPO_ICONS[doc.tipo] || '📄'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800 truncate">{doc.nombre}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${mc.bg} ${mc.text}`}>{doc.modulo}</span>
          <span className="text-[10px] text-slate-400">{doc.tipo}</span>
          {doc.datos_extraidos && <span className="text-[10px] text-slate-400 truncate max-w-[200px]">{doc.datos_extraidos}</span>}
        </div>
      </div>
      {doc.vencimiento && (
        <span className="flex items-center gap-1 text-[10px] text-amber-600 shrink-0"><Clock size={10} />{doc.vencimiento}</span>
      )}
      <span className="text-[10px] text-slate-300 shrink-0">{doc.fecha_subida ? new Date(doc.fecha_subida).toLocaleDateString('es-ES') : ''}</span>
      {doc.url && <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1 bg-white border border-slate-200 rounded hover:bg-slate-100 shrink-0"><ExternalLink size={10} className="text-slate-400" /></a>}
    </div>
  )
}

export default function DocumentosPage() {
  const [documentos, setDocumentos] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [alertas, setAlertas] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [resultadoSubida, setResultadoSubida] = useState<any>(null)
  const [busqueda, setBusqueda] = useState('')
  const [tab, setTab] = useState<'personas'|'proyectos'|'alertas'>('personas')
  const [expandido, setExpandido] = useState<string|null>(null)

  const cargar = async () => {
    setCargando(true)
    try {
      const data = await api.batch(['documentos', 'alertas_documentos'])
      setDocumentos(data.documentos?.documentos || [])
      setStats(data.documentos?.stats || {})
      setAlertas(data.alertas_documentos?.alertas || [])
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  const handleSubir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendo(true); setResultadoSubida(null)
    try {
      const result = await api.subirDocumentoGeneral(file)
      setResultadoSubida(result)
      if (result.ok) await cargar()
    } catch (err) { setResultadoSubida({ ok: false, error: 'Error de conexión' }) }
    finally { setSubiendo(false); e.target.value = '' }
  }

  // ═══ Agrupar por persona ═══
  const personasMap = new Map<string, { nombre: string; dni: string; docs: any[] }>()
  documentos.forEach(doc => {
    if (doc.propietario?.trim()) {
      const key = doc.propietario.trim().toLowerCase()
      if (!personasMap.has(key)) personasMap.set(key, { nombre: doc.propietario.trim(), dni: doc.dni || '', docs: [] })
      const p = personasMap.get(key)!
      p.docs.push(doc)
      if (!p.dni && doc.dni) p.dni = doc.dni
    }
  })
  const personas = Array.from(personasMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))

  // ═══ Agrupar por proyecto/licitación ═══
  const proyectosMap = new Map<string, { nombre: string; docs: any[] }>()
  const sinAsignar: any[] = []
  documentos.forEach(doc => {
    if (doc.centro?.trim()) {
      const key = doc.centro.trim().toLowerCase()
      if (!proyectosMap.has(key)) proyectosMap.set(key, { nombre: doc.centro.trim(), docs: [] })
      proyectosMap.get(key)!.docs.push(doc)
    } else if (['LICITACIONES', 'TERRITORIO', 'ADMINISTRACIÓN'].includes(doc.modulo)) {
      sinAsignar.push(doc)
    }
  })
  const proyectos = Array.from(proyectosMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))

  // Filtrar
  const filtrar = (items: any[], campo: string) => {
    if (!busqueda) return items
    const t = busqueda.toLowerCase()
    return items.filter((i: any) => (i[campo] || '').toLowerCase().includes(t) || (i.dni || '').toLowerCase().includes(t))
  }

  if (cargando) return (<div className="flex flex-col items-center py-20"><Loader2 size={32} className="text-[#1a3c34] animate-spin mb-3" /><p className="text-slate-500">Cargando documentos...</p></div>)

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e] rounded-xl shadow-lg shadow-emerald-200"><FolderOpen size={22} className="text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestor Documental</h1>
            <p className="text-sm text-slate-500">{personas.length} personas · {proyectos.length} proyectos · {stats.total || 0} docs · {alertas.length} alertas</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl"><RefreshCw size={16} className="text-slate-500" /></button>
          <label className={`flex items-center gap-2 px-4 py-2.5 ${subiendo ? 'bg-slate-300' : 'bg-[#1a3c34] hover:bg-[#2d5a4e]'} text-white text-sm font-semibold rounded-xl cursor-pointer transition-colors`}>
            {subiendo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {subiendo ? 'Clasificando con IA...' : 'Subir documento'}
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleSubir} className="hidden" disabled={subiendo} />
          </label>
        </div>
      </div>

      {/* Resultado subida */}
      {resultadoSubida && (
        <div className={`mb-4 p-4 rounded-xl border-2 ${resultadoSubida.ok && resultadoSubida.documento?.tipo !== 'otro' ? 'bg-emerald-50 border-emerald-300' : resultadoSubida.ok ? 'bg-amber-50 border-amber-300' : 'bg-red-50 border-red-300'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {resultadoSubida.ok && resultadoSubida.documento?.tipo !== 'otro' ? <CheckCircle2 size={20} className="text-emerald-600" /> : <AlertTriangle size={20} className="text-amber-600" />}
              <div>
                <p className="text-sm font-bold">{resultadoSubida.ok ? `Clasificado: ${resultadoSubida.documento?.tipo_descripcion || resultadoSubida.documento?.tipo}` : 'Error: ' + (resultadoSubida.error || '')}</p>
                {resultadoSubida.documento && <p className="text-xs text-slate-500">👤 {resultadoSubida.documento.propietario || 'Sin propietario'} · 📁 {resultadoSubida.documento.carpeta}</p>}
                {resultadoSubida.documento?.datos_extraidos && <p className="text-xs text-slate-600 mt-1">{resultadoSubida.documento.datos_extraidos}</p>}
              </div>
            </div>
            <button onClick={() => setResultadoSubida(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-4">
        <button onClick={() => setTab('personas')} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${tab === 'personas' ? 'bg-white shadow text-[#1a3c34]' : 'text-slate-500'}`}>
          <User size={14} className="inline mr-2" />Por Personas ({personas.length})
        </button>
        <button onClick={() => setTab('proyectos')} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${tab === 'proyectos' ? 'bg-white shadow text-[#1a3c34]' : 'text-slate-500'}`}>
          <Briefcase size={14} className="inline mr-2" />Por Proyecto ({proyectos.length})
        </button>
        <button onClick={() => setTab('alertas')} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${tab === 'alertas' ? 'bg-white shadow text-[#1a3c34]' : 'text-slate-500'}`}>
          <AlertTriangle size={14} className="inline mr-2" />Vencimientos
          {alertas.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] rounded-full font-bold">{alertas.length}</span>}
        </button>
      </div>

      {/* Búsqueda */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 mb-4">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-slate-400" />
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar persona, proyecto, tipo..."
            className="flex-1 px-2 py-1.5 text-sm focus:outline-none" />
          {busqueda && <button onClick={() => setBusqueda('')} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>}
        </div>
      </div>

      {/* ═══ TAB: POR PERSONAS ═══ */}
      {tab === 'personas' && (
        <div>
          {personas.length === 0 ? (
            <div className="text-center py-16">
              <User size={48} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No hay documentos de personas</p>
              <p className="text-sm text-slate-400 mt-1">Sube un documento con nombre de persona y Gemini lo clasificará</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtrar(personas, 'nombre').map(persona => {
                const open = expandido === persona.nombre
                const tiposDocs = new Set(persona.docs.map((d: any) => d.tipo))
                const obligatorios = DOCS_PERSONA.filter(d => d.obligatorio)
                const completados = obligatorios.filter(d => tiposDocs.has(d.tipo)).length
                const pctCompleto = Math.round((completados / obligatorios.length) * 100)
                const tieneAlerta = persona.docs.some((d: any) => d.vencimiento)

                return (
                  <div key={persona.nombre} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <button onClick={() => setExpandido(open ? null : persona.nombre)}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1a3c34] flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {persona.nombre.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <h3 className="text-sm font-bold text-slate-900">{persona.nombre}</h3>
                          <p className="text-xs text-slate-500">{persona.dni ? persona.dni + ' · ' : ''}{persona.docs.length} documento{persona.docs.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {tieneAlerta && <Clock size={14} className="text-amber-500" />}
                        {/* Progress bar */}
                        <div className="hidden md:flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${pctCompleto === 100 ? 'bg-emerald-500' : pctCompleto >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{width: `${pctCompleto}%`}} />
                          </div>
                          <span className={`text-xs font-bold ${pctCompleto === 100 ? 'text-emerald-600' : pctCompleto >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{pctCompleto}%</span>
                        </div>
                        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </div>
                    </button>

                    {open && (
                      <div className="px-4 pb-4 border-t border-slate-100 pt-4">
                        {/* Checklist documentos obligatorios */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                          {DOCS_PERSONA.map(req => {
                            const tiene = persona.docs.find((d: any) => d.tipo === req.tipo)
                            return (
                              <div key={req.tipo} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${tiene ? 'bg-emerald-50' : req.obligatorio ? 'bg-red-50' : 'bg-slate-50'}`}>
                                {tiene ? <CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> : req.obligatorio ? <XCircle size={14} className="text-red-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 shrink-0" />}
                                <span className={tiene ? 'text-emerald-800 font-medium' : req.obligatorio ? 'text-red-700' : 'text-slate-500'}>{req.label}</span>
                                {req.obligatorio && !tiene && <span className="text-[8px] text-red-500 font-bold ml-auto">FALTA</span>}
                              </div>
                            )
                          })}
                        </div>

                        {/* Documentos de la persona */}
                        <div className="space-y-1.5">
                          {persona.docs.map((doc: any) => <DocRow key={doc.id} doc={doc} />)}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: POR PROYECTO ═══ */}
      {tab === 'proyectos' && (
        <div>
          {proyectos.length === 0 && sinAsignar.length === 0 ? (
            <div className="text-center py-16">
              <Briefcase size={48} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No hay documentos de proyectos</p>
              <p className="text-sm text-slate-400 mt-1">Los pliegos, ofertas y contratos aparecerán aquí agrupados por licitación</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtrar(proyectos, 'nombre').map(proy => {
                const open = expandido === 'proy_' + proy.nombre
                const tiposDocs = new Set(proy.docs.map((d: any) => d.tipo))
                const obligatorios = DOCS_PROYECTO.filter(d => d.obligatorio)
                const completados = obligatorios.filter(d => tiposDocs.has(d.tipo)).length
                const pctCompleto = Math.round((completados / obligatorios.length) * 100)

                return (
                  <div key={proy.nombre} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <button onClick={() => setExpandido(open ? null : 'proy_' + proy.nombre)}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-xl shrink-0"><Building2 size={18} className="text-emerald-700" /></div>
                        <div className="text-left">
                          <h3 className="text-sm font-bold text-slate-900">{proy.nombre}</h3>
                          <p className="text-xs text-slate-500">{proy.docs.length} documento{proy.docs.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${pctCompleto === 100 ? 'bg-emerald-500' : pctCompleto >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{width: `${pctCompleto}%`}} />
                          </div>
                          <span className={`text-xs font-bold ${pctCompleto === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>{pctCompleto}%</span>
                        </div>
                        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </div>
                    </button>

                    {open && (
                      <div className="px-4 pb-4 border-t border-slate-100 pt-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                          {DOCS_PROYECTO.map(req => {
                            const tiene = proy.docs.find((d: any) => d.tipo === req.tipo)
                            return (
                              <div key={req.tipo} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${tiene ? 'bg-emerald-50' : req.obligatorio ? 'bg-red-50' : 'bg-slate-50'}`}>
                                {tiene ? <CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> : req.obligatorio ? <XCircle size={14} className="text-red-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 shrink-0" />}
                                <span className={tiene ? 'text-emerald-800 font-medium' : req.obligatorio ? 'text-red-700' : 'text-slate-500'}>{req.label}</span>
                                {req.obligatorio && !tiene && <span className="text-[8px] text-red-500 font-bold ml-auto">FALTA</span>}
                              </div>
                            )
                          })}
                        </div>
                        <div className="space-y-1.5">
                          {proy.docs.map((doc: any) => <DocRow key={doc.id} doc={doc} />)}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Docs sin proyecto */}
              {sinAsignar.length > 0 && (
                <div className="bg-white border border-dashed border-slate-300 rounded-2xl overflow-hidden">
                  <button onClick={() => setExpandido(expandido === 'sin_asignar' ? null : 'sin_asignar')}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-xl"><FolderOpen size={18} className="text-slate-500" /></div>
                      <div className="text-left">
                        <h3 className="text-sm font-semibold text-slate-600">Sin proyecto asignado</h3>
                        <p className="text-xs text-slate-400">{sinAsignar.length} documento{sinAsignar.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    {expandido === 'sin_asignar' ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </button>
                  {expandido === 'sin_asignar' && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-4 space-y-1.5">
                      {sinAsignar.map((doc: any) => <DocRow key={doc.id} doc={doc} />)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: ALERTAS VENCIMIENTO ═══ */}
      {tab === 'alertas' && (
        <div>
          {alertas.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle2 size={48} className="text-emerald-300 mx-auto mb-3" />
              <p className="text-slate-500">Sin vencimientos próximos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alertas.map((a: any) => (
                <div key={a.id} className={`${a.urgencia === 'vencido' || a.urgencia === 'critico' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'} border rounded-xl p-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{TIPO_ICONS[a.tipo] || '📄'}</span>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{a.nombre}</p>
                        <p className="text-xs text-slate-600">{a.modulo} · {a.tipo} {a.propietario && `· ${a.propietario}`}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${a.dias_restantes < 0 ? 'text-red-700' : a.dias_restantes < 15 ? 'text-red-600' : 'text-amber-700'}`}>
                        {a.dias_restantes < 0 ? `Vencido hace ${Math.abs(a.dias_restantes)}d` : `Vence en ${a.dias_restantes}d`}
                      </p>
                      <p className="text-[10px] text-slate-500">{a.vencimiento}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}