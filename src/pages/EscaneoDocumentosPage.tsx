import { useState, useEffect, useRef } from 'react'
import { api } from '../services/api'
import {
  ScanLine, Upload, FileText, User, CheckCircle2, AlertTriangle,
  Loader2, X, Search, FolderOpen, Eye, RefreshCw,
  Sparkles, Clock, Camera, Inbox, ChevronDown, ChevronUp, Trash2
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════

const SUBCARPETAS = [
  { id: '01_Identificacion', label: '01 — Identificación' },
  { id: '02_Contrato_Laboral', label: '02 — Contrato Laboral' },
  { id: '03_PRL_Seguridad', label: '03 — PRL / Seguridad' },
  { id: '04_Formacion_Titulacion', label: '04 — Formación' },
  { id: '05_RGPD_Consentimientos', label: '05 — RGPD' },
  { id: '06_Ausencias_Bajas', label: '06 — Ausencias / Bajas' },
  { id: '07_Subrogacion', label: '07 — Subrogación' },
  { id: '08_Comunicaciones', label: '08 — Comunicaciones' },
  { id: '09_Certificaciones', label: '09 — Certificaciones' },
  { id: '10_Otros', label: '10 — Otros' },
]

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

type ResultadoDoc = {
  archivo_nombre: string
  estado: 'procesando' | 'archivado' | 'error_clasificacion' | 'empleado_no_encontrado' | 'confianza_baja' | 'error_archivado' | 'error'
  empleado?: string
  tipo?: string
  subcarpeta?: string
  carpeta_destino?: string
  error_detalle?: string
  archivo_url?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function EscaneoDocumentosPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<'subir' | 'bandeja'>('subir')

  // Upload state
  const [procesando, setProcesando] = useState(false)
  const [resultados, setResultados] = useState<ResultadoDoc[]>([])
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 })

  // Dashboard
  const [dashboard, setDashboard] = useState<any>(null)

  // Bandeja
  const [bandeja, setBandeja] = useState<any[]>([])
  const [cargandoBandeja, setCargandoBandeja] = useState(false)
  const [empleados, setEmpleados] = useState<any[]>([])
  const [expandido, setExpandido] = useState<string | null>(null)

  // UI
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const showMsg = (m: string, err = false) => {
    if (err) setError(m); else setMsg(m)
    setTimeout(() => { setMsg(''); setError('') }, 5000)
  }

  // Cargar dashboard y empleados
  useEffect(() => {
    api.dashboardEscaneo().then(setDashboard).catch(() => {})
    api.empleados().then(r => setEmpleados(r.empleados || [])).catch(() => {})
  }, [])

  // ═══ SUBIR Y PROCESAR ARCHIVOS ═══
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    const archivos = Array.from(files).filter(f => validTypes.includes(f.type) && f.size <= 10 * 1024 * 1024)
    if (archivos.length === 0) { showMsg('Solo PDF, JPG, PNG o WebP (máx 10MB)', true); return }

    setProcesando(true)
    setProgreso({ actual: 0, total: archivos.length })
    setResultados([])

    for (let i = 0; i < archivos.length; i++) {
      const file = archivos[i]
      setProgreso({ actual: i + 1, total: archivos.length })

      // Añadir como "procesando"
      setResultados(prev => [...prev, { archivo_nombre: file.name, estado: 'procesando' }])

      try {
        const base64 = await fileToBase64(file)
        const r = await api.procesarDocumentoAutomatico({
          filename: file.name, base64, mime_type: file.type
        })

        setResultados(prev => prev.map(res =>
          res.archivo_nombre === file.name && res.estado === 'procesando'
            ? {
                archivo_nombre: file.name,
                estado: r.estado || 'error',
                empleado: r.empleado ? r.empleado.nombre : undefined,
                tipo: r.clasificacion?.tipo_descripcion || r.clasificacion?.tipo,
                subcarpeta: r.clasificacion?.subcarpeta,
                carpeta_destino: r.carpeta_destino,
                error_detalle: r.error_detalle,
                archivo_url: r.archivo_url
              }
            : res
        ))
      } catch (e: any) {
        setResultados(prev => prev.map(res =>
          res.archivo_nombre === file.name && res.estado === 'procesando'
            ? { archivo_nombre: file.name, estado: 'error', error_detalle: e?.message || 'Error de conexión' }
            : res
        ))
      }

      // Pausa entre archivos para no saturar GAS
      if (i < archivos.length - 1) await new Promise(r => setTimeout(r, 1000))
    }

    setProcesando(false)
    if (fileRef.current) fileRef.current.value = ''
    // Refrescar dashboard
    api.dashboardEscaneo().then(setDashboard).catch(() => {})
  }

  // ═══ CARGAR BANDEJA ═══
  const cargarBandeja = async () => {
    setCargandoBandeja(true)
    try {
      const r = await api.bandejaDocs()
      setBandeja(r.documentos || [])
    } catch { }
    finally { setCargandoBandeja(false) }
  }

  useEffect(() => { if (tab === 'bandeja') cargarBandeja() }, [tab])

  // ═══ RESOLVER INCIDENCIA BANDEJA ═══
  const handleResolver = async (bandejaId: string, empleadoId: string, tipo?: string, subcarpeta?: string) => {
    try {
      const r = await api.resolverDocBandeja({ id: bandejaId, empleado_id: empleadoId, tipo, subcarpeta })
      if (r.ok) {
        showMsg(`✅ Archivado → ${r.carpeta_destino}`)
        setBandeja(prev => prev.map(d => d.id === bandejaId ? { ...d, estado: 'resuelto' } : d))
        api.dashboardEscaneo().then(setDashboard).catch(() => {})
      } else showMsg(r.error || 'Error', true)
    } catch (e: any) { showMsg('Error: ' + (e?.message || ''), true) }
  }

  const handleDescartar = async (id: string) => {
    try {
      await api.descartarDocBandeja(id)
      setBandeja(prev => prev.map(d => d.id === id ? { ...d, estado: 'descartado' } : d))
    } catch { }
  }

  // Stats de resultados
  const archivados = resultados.filter(r => r.estado === 'archivado').length
  const errores = resultados.filter(r => r.estado !== 'archivado' && r.estado !== 'procesando').length
  const procesandoCount = resultados.filter(r => r.estado === 'procesando').length
  const bandejaCount = bandeja.filter(d => d.estado === 'pendiente').length

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* ═══ CABECERA ═══ */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-violet-600 to-violet-700 rounded-xl shadow-lg">
            <ScanLine size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Escaneo de Documentos</h1>
            <p className="text-sm text-slate-500">Clasificación y archivado automático con IA</p>
          </div>
        </div>
      </div>

      {msg && <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-emerald-800 text-sm"><CheckCircle2 size={15} />{msg}</div>}
      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-red-800 text-sm"><AlertTriangle size={15} />{error}</div>}

      {/* ═══ KPIs ═══ */}
      {dashboard && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-emerald-600">{dashboard.archivados_hoy || 0}</p>
            <p className="text-[10px] text-slate-500">Archivados hoy</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-slate-800">{dashboard.archivados_total || 0}</p>
            <p className="text-[10px] text-slate-500">Total archivados</p>
          </div>
          <div className={`rounded-2xl p-4 text-center border ${dashboard.pendientes_revision > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
            <p className={`text-2xl font-black ${dashboard.pendientes_revision > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{dashboard.pendientes_revision || 0}</p>
            <p className="text-[10px] text-slate-500">Pendientes revisión</p>
          </div>
        </div>
      )}

      {/* ═══ TABS ═══ */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1">
        <button onClick={() => setTab('subir')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${tab === 'subir' ? 'bg-white text-[#1a3c34] shadow-sm' : 'text-slate-500'}`}>
          <Upload size={15} /> Subir documentos
        </button>
        <button onClick={() => setTab('bandeja')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${tab === 'bandeja' ? 'bg-white text-[#1a3c34] shadow-sm' : 'text-slate-500'}`}>
          <Inbox size={15} /> Bandeja de incidencias
          {bandejaCount > 0 && <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 rounded-full">{bandejaCount}</span>}
        </button>
      </div>

      {/* ═══ TAB: SUBIR DOCUMENTOS ═══ */}
      {tab === 'subir' && (
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onClick={() => !procesando && fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); handleFiles(e.dataTransfer.files) }}
            className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${procesando ? 'border-slate-200 bg-slate-50 cursor-not-allowed' : 'border-slate-300 cursor-pointer hover:border-violet-400 hover:bg-violet-50'}`}
          >
            <div className="flex justify-center gap-4 mb-3">
              <Upload size={36} className="text-slate-400" />
              <Camera size={36} className="text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-600">
              {procesando ? `Procesando ${progreso.actual} de ${progreso.total}...` : 'Arrastra archivos o pulsa para seleccionar'}
            </p>
            <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG · Múltiples archivos · Máximo 10MB cada uno</p>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,image/*" multiple capture="environment"
            className="hidden" onChange={e => handleFiles(e.target.files)} />

          {/* Progreso */}
          {procesando && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 size={18} className="animate-spin text-violet-600" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-violet-800">
                    Procesando {progreso.actual}/{progreso.total}
                  </p>
                  <p className="text-xs text-violet-600">Gemini está analizando y archivando...</p>
                </div>
                <Sparkles size={16} className="text-amber-500 animate-pulse" />
              </div>
              <div className="h-2 bg-violet-200 rounded-full overflow-hidden">
                <div className="h-full bg-violet-600 rounded-full transition-all duration-500" style={{ width: `${(progreso.actual / progreso.total) * 100}%` }} />
              </div>
            </div>
          )}

          {/* Resultados */}
          {resultados.length > 0 && (
            <div>
              {/* Resumen */}
              {!procesando && (
                <div className="flex gap-3 mb-3">
                  {archivados > 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
                      <CheckCircle2 size={12} /> {archivados} archivados
                    </div>
                  )}
                  {errores > 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full">
                      <AlertTriangle size={12} /> {errores} en bandeja
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {resultados.map((r, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${
                    r.estado === 'procesando' ? 'bg-violet-50 border-violet-200' :
                    r.estado === 'archivado' ? 'bg-emerald-50 border-emerald-200' :
                    'bg-amber-50 border-amber-200'
                  }`}>
                    {r.estado === 'procesando' ? (
                      <Loader2 size={16} className="animate-spin text-violet-500 shrink-0" />
                    ) : r.estado === 'archivado' ? (
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{r.archivo_nombre}</p>
                      {r.estado === 'archivado' && (
                        <p className="text-[10px] text-emerald-600">
                          <User size={10} className="inline mr-0.5" />{r.empleado} → <FolderOpen size={10} className="inline mr-0.5" />{r.carpeta_destino || r.subcarpeta}
                          {r.tipo && <> · {r.tipo}</>}
                        </p>
                      )}
                      {r.estado === 'procesando' && (
                        <p className="text-[10px] text-violet-500">Analizando con Gemini...</p>
                      )}
                      {r.estado !== 'archivado' && r.estado !== 'procesando' && (
                        <p className="text-[10px] text-amber-600 truncate">{r.error_detalle || r.estado}</p>
                      )}
                    </div>
                    {r.archivo_url && (
                      <a href={r.archivo_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-violet-600 shrink-0">
                        <Eye size={14} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: BANDEJA DE INCIDENCIAS ═══ */}
      {tab === 'bandeja' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-400">{bandejaCount} pendientes de revisión</p>
            <button onClick={cargarBandeja} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
              <RefreshCw size={14} />
            </button>
          </div>

          {cargandoBandeja ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-violet-500" /></div>
          ) : bandeja.filter(d => d.estado === 'pendiente').length === 0 ? (
            <div className="flex flex-col items-center py-12 bg-white border border-slate-200 rounded-2xl">
              <CheckCircle2 size={36} className="text-emerald-400 mb-3" />
              <p className="text-slate-500 font-medium">Sin incidencias pendientes</p>
            </div>
          ) : (
            bandeja.filter(d => d.estado === 'pendiente').map(doc => (
              <BandejaItem key={doc.id} doc={doc} empleados={empleados}
                onResolver={handleResolver} onDescartar={handleDescartar}
                expandido={expandido === doc.id} onToggle={() => setExpandido(expandido === doc.id ? null : doc.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE BANDEJA ITEM
// ═══════════════════════════════════════════════════════════════════════════════

function BandejaItem({ doc, empleados, onResolver, onDescartar, expandido, onToggle }: {
  doc: any, empleados: any[], onResolver: (id: string, empId: string, tipo?: string, sub?: string) => void,
  onDescartar: (id: string) => void, expandido: boolean, onToggle: () => void
}) {
  const [empSeleccionado, setEmpSeleccionado] = useState(doc.empleado_id_sugerido || '')
  const [busq, setBusq] = useState('')
  const [tipoSel, setTipoSel] = useState(doc.tipo_detectado || 'otro')
  const [guardando, setGuardando] = useState(false)

  const empFiltrados = busq
    ? empleados.filter((e: any) => {
        const q = busq.toLowerCase()
        return (e.nombre || '').toLowerCase().includes(q) || (e.apellidos || '').toLowerCase().includes(q) || (e.dni || '').includes(q)
      }).slice(0, 8)
    : empleados.filter((e: any) => e.estado === 'activo').slice(0, 12)

  const empNombre = empSeleccionado
    ? empleados.find((e: any) => e.id === empSeleccionado)
    : null

  return (
    <div className="bg-white border-2 border-amber-200 rounded-2xl overflow-hidden">
      <div className="p-4 cursor-pointer hover:bg-slate-50" onClick={onToggle}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">{doc.motivo === 'empleado_no_encontrado' ? 'Empleado no encontrado' : doc.motivo === 'confianza_baja' ? 'Confianza baja' : doc.motivo}</span>
              {doc.tipo_detectado && <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{doc.tipo_detectado}</span>}
            </div>
            <p className="text-sm font-bold text-slate-900 truncate">{doc.archivo_nombre}</p>
            {doc.datos_extraidos && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{doc.datos_extraidos}</p>}
            {doc.nombre_detectado && <p className="text-[10px] text-slate-400 mt-0.5">Nombre detectado: {doc.nombre_detectado} {doc.dni_detectado ? `(${doc.dni_detectado})` : ''}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-slate-400">{doc.fecha}</span>
            {doc.archivo_url && <a href={doc.archivo_url} target="_blank" rel="noreferrer" className="text-violet-500 hover:text-violet-700" onClick={e => e.stopPropagation()}><Eye size={14} /></a>}
            {expandido ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
          </div>
        </div>
      </div>

      {expandido && (
        <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-3">
          {/* Seleccionar empleado */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Asignar a empleado *</label>
            {empSeleccionado && empNombre ? (
              <div className="flex items-center gap-2 bg-emerald-50 rounded-lg p-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-800">{empNombre.nombre} {empNombre.apellidos}</span>
                <button onClick={() => setEmpSeleccionado('')} className="text-xs text-slate-400 ml-auto">Cambiar</button>
              </div>
            ) : (
              <>
                <div className="relative mb-1">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={busq} onChange={e => setBusq(e.target.value)} placeholder="Buscar nombre, apellidos, DNI..."
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs" />
                </div>
                <div className="max-h-36 overflow-y-auto space-y-0.5">
                  {empFiltrados.map((e: any) => (
                    <button key={e.id} onClick={() => { setEmpSeleccionado(e.id); setBusq('') }}
                      className="w-full flex items-center gap-2 p-1.5 hover:bg-white rounded text-left text-xs">
                      <span className="font-semibold text-slate-700">{e.nombre} {e.apellidos}</span>
                      <span className="text-slate-400">{e.dni || ''}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Tipo documento */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Tipo de documento</label>
            <select value={tipoSel} onChange={e => setTipoSel(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white">
              <option value="dni">DNI / NIE</option>
              <option value="contrato_laboral">Contrato laboral</option>
              <option value="nomina">Nómina</option>
              <option value="reconocimiento_medico">Reconocimiento médico</option>
              <option value="certificado_prl">Certificado PRL</option>
              <option value="entrega_epi">Entrega EPI</option>
              <option value="titulo_formacion">Título / Formación</option>
              <option value="consentimiento">Consentimiento RGPD</option>
              <option value="certificacion">Certificación profesional</option>
              <option value="vida_laboral">Vida laboral</option>
              <option value="certificado_delitos">Certificado delitos</option>
              <option value="parte_accidente">Parte accidente</option>
              <option value="curriculum">Curriculum</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          {/* Botones */}
          <div className="flex gap-2">
            <button onClick={async () => {
              if (!empSeleccionado) return
              setGuardando(true)
              await onResolver(doc.id, empSeleccionado, tipoSel)
              setGuardando(false)
            }} disabled={!empSeleccionado || guardando}
              className="flex-1 py-2 bg-[#1a3c34] hover:bg-[#2d5a4e] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50">
              {guardando ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Archivar
            </button>
            <button onClick={() => onDescartar(doc.id)}
              className="px-3 py-2 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 text-xs font-semibold rounded-lg flex items-center gap-1">
              <Trash2 size={12} /> Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
