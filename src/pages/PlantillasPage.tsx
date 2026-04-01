import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { usePermisos } from '../hooks/usePermisos'
import {
  FileText, Plus, Loader2, ExternalLink, Tag, CheckCircle2,
  AlertTriangle, X, Save, RefreshCw, Trash2, Eye, Copy,
  ChevronDown, ChevronUp, Shield, Search
} from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'

const COLORES_MODULO: Record<string, string> = {
  PRL:          'bg-orange-100 text-orange-800 border-orange-200',
  RGPD:         'bg-blue-100 text-blue-800 border-blue-200',
  RRHH:         'bg-teal-100 text-teal-800 border-teal-200',
  LICITACIONES: 'bg-purple-100 text-purple-800 border-purple-200',
  TERRITORIO:   'bg-green-100 text-green-800 border-green-200',
  GENERAL:      'bg-slate-100 text-slate-700 border-slate-200',
}

export default function PlantillasPage() {
  const { esAdmin, esAdminRRHH } = usePermisos()
  const [plantillas, setPlantillas] = useState<any[]>([])
  const [etiquetas, setEtiquetas] = useState<Record<string, string>>({})
  const [modulos, setModulos] = useState<string[]>([])
  const [cargando, setCargando] = useState(true)
  const [msg, setMsg] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [filtroModulo, setFiltroModulo] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [expandidaId, setExpandidaId] = useState<string | null>(null)
  const [modo, setModo] = useState<'lista' | 'nueva_desde_url' | 'nueva_vacia' | 'previsualizar'>('lista')
  const [plantillaSel, setPlantillaSel] = useState<any>(null)
  const [generando, setGenerando] = useState(false)
  const [confirmDesactivar, setConfirmDesactivar] = useState<any>(null)

  const [formUrl, setFormUrl] = useState({ id_doc: '', nombre: '', modulo: '', descripcion: '' })
  const [formVacia, setFormVacia] = useState({ nombre: '', modulo: '', descripcion: '' })
  const [datosGeneracion, setDatosGeneracion] = useState<Record<string, string>>({})

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const cargar = async () => {
    setCargando(true)
    try {
      const data = await api.plantillas(filtroModulo || undefined)
      setPlantillas(data.plantillas || [])
      setEtiquetas(data.etiquetas || {})
      setModulos(data.modulos || [])
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [filtroModulo])

  const extraerIdDoc = (urlOId: string): string => {
    const match = urlOId.match(/\/d\/([a-zA-Z0-9_-]+)/)
    return match ? match[1] : urlOId.trim()
  }

  const handleRegistrarDesdeUrl = async () => {
    if (!formUrl.nombre || !formUrl.modulo || !formUrl.id_doc) { showMsg('❌ Nombre, módulo y URL/ID del documento son obligatorios'); return }
    setGuardando(true)
    try {
      const idLimpio = extraerIdDoc(formUrl.id_doc)
      const r = await api.registrarPlantilla({ ...formUrl, id_doc: idLimpio })
      if (r.ok) {
        showMsg('✅ Plantilla registrada — ' + (r.etiquetas_detectadas?.length || 0) + ' etiquetas detectadas')
        setModo('lista'); setFormUrl({ id_doc: '', nombre: '', modulo: '', descripcion: '' }); cargar()
      } else showMsg('❌ ' + (r.error || 'Error'))
    } catch (e: any) { showMsg('❌ Error de conexión') }
    finally { setGuardando(false) }
  }

  const handleCrearVacia = async () => {
    if (!formVacia.nombre || !formVacia.modulo) { showMsg('❌ Nombre y módulo obligatorios'); return }
    setGuardando(true)
    try {
      const r = await api.crearPlantillaVacia(formVacia)
      if (r.ok) {
        showMsg('✅ Plantilla creada en Drive — ya puedes editarla')
        if (r.url) window.open(r.url, '_blank')
        setModo('lista'); setFormVacia({ nombre: '', modulo: '', descripcion: '' }); cargar()
      } else showMsg('❌ ' + (r.error || 'Error'))
    } catch (e: any) { showMsg('❌ Error de conexión') }
    finally { setGuardando(false) }
  }

  const handleDesactivarConfirmado = async () => {
    if (!confirmDesactivar) return
    try {
      const r = await api.actualizarPlantilla({ id: confirmDesactivar.id, activa: !confirmDesactivar.activa })
      if (r.ok) { showMsg('✅ Actualizado'); cargar() }
    } catch (e: any) { showMsg('❌ Error') }
    finally { setConfirmDesactivar(null) }
  }

  const abrirPrevisualizar = (p: any) => {
    setPlantillaSel(p)
    const init: Record<string, string> = {}
    ;(p.etiquetas || []).forEach((et: string) => { init[et] = '' })
    setDatosGeneracion(init)
    setModo('previsualizar')
  }

  const handleGenerarPrueba = async () => {
    if (!plantillaSel) return
    setGenerando(true)
    try {
      const datosLimpios: Record<string, string> = {}
      Object.entries(datosGeneracion).forEach(([k, v]) => {
        const clave = k.replace(/[{}]/g, '')
        datosLimpios[clave] = v || 'VALOR_DE_PRUEBA'
      })
      const r = await api.generarDesdePlantilla({ id_plantilla: plantillaSel.id, datos: datosLimpios, nombre_archivo: 'PRUEBA — ' + plantillaSel.nombre })
      if (r.ok) { showMsg('✅ Documento generado'); window.open(r.url, '_blank') }
      else showMsg('❌ ' + (r.error || 'Error'))
    } catch (e: any) { showMsg('❌ Error') }
    finally { setGenerando(false) }
  }

  const plantillasFiltradas = plantillas.filter(p =>
    (!busqueda || p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || p.descripcion?.toLowerCase().includes(busqueda.toLowerCase()))
  )

  if (modo === 'lista') return (
    <div className="max-w-5xl">

      <ConfirmModal
        open={!!confirmDesactivar}
        titulo={confirmDesactivar?.activa ? '¿Desactivar plantilla?' : '¿Activar plantilla?'}
        mensaje={`Se ${confirmDesactivar?.activa ? 'desactivará' : 'activará'} la plantilla "${confirmDesactivar?.nombre}".`}
        labelOk={confirmDesactivar?.activa ? 'Sí, desactivar' : 'Sí, activar'}
        peligroso={confirmDesactivar?.activa}
        onConfirm={handleDesactivarConfirmado}
        onCancel={() => setConfirmDesactivar(null)}
      />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-violet-700 to-indigo-700 rounded-xl shadow-lg shadow-violet-200">
            <FileText size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestor de plantillas</h1>
            <p className="text-sm text-slate-500">{plantillas.length} plantillas · documentos con etiquetas automáticas</p>
          </div>
        </div>
        {esAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setModo('nueva_desde_url')} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl">
              <ExternalLink size={15} /> Registrar desde Drive
            </button>
            <button onClick={() => setModo('nueva_vacia')} className="flex items-center gap-2 px-4 py-2.5 bg-violet-700 hover:bg-violet-800 text-white text-sm font-bold rounded-xl shadow-lg shadow-violet-200">
              <Plus size={15} /> Nueva plantilla
            </button>
          </div>
        )}
      </div>

      {msg && <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${msg.includes('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={busqueda} onChange={(e: any) => setBusqueda(e.target.value)} placeholder="Buscar plantilla..."
            className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setFiltroModulo('')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!filtroModulo ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Todos</button>
          {modulos.map(m => (
            <button key={m} onClick={() => setFiltroModulo(m === filtroModulo ? '' : m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filtroModulo === m ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>{m}</button>
          ))}
        </div>
      </div>

      {cargando ? (
        <div className="text-center py-16"><Loader2 size={28} className="text-violet-500 animate-spin mx-auto mb-3" /><p className="text-slate-400">Cargando plantillas...</p></div>
      ) : plantillasFiltradas.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <FileText size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No hay plantillas registradas</p>
          <p className="text-sm text-slate-400 mt-1">Crea una nueva o registra un Google Doc existente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plantillasFiltradas.map((p: any) => (
            <div key={p.id} className={`bg-white border-2 rounded-2xl overflow-hidden ${!p.activa ? 'opacity-60 border-slate-200' : p.error ? 'border-red-200' : 'border-slate-200'}`}>
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-bold text-slate-900">{p.nombre}</p>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${COLORES_MODULO[p.modulo] || COLORES_MODULO.GENERAL}`}>{p.modulo}</span>
                      {!p.activa && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">INACTIVA</span>}
                      {p.error && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">⚠️ Doc no encontrado</span>}
                    </div>
                    {p.descripcion && <p className="text-xs text-slate-500 mb-2">{p.descripcion}</p>}
                    {p.etiquetas?.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {p.etiquetas.slice(0, 5).map((et: string) => (
                          <span key={et} className="text-[9px] font-mono bg-violet-50 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded">{et}</span>
                        ))}
                        {p.etiquetas.length > 5 && <span className="text-[9px] text-slate-400">+{p.etiquetas.length - 5} más</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-slate-400">{p.usos || 0} uso{p.usos !== 1 ? 's' : ''}</span>
                    {p.url && !p.error && (
                      <a href={p.url} target="_blank" rel="noopener noreferrer"
                        className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg" title="Abrir en Drive">
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <button onClick={() => abrirPrevisualizar(p)} title="Probar plantilla"
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                      <Eye size={14} />
                    </button>
                    <button onClick={() => setExpandidaId(expandidaId === p.id ? null : p.id)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                      {expandidaId === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {esAdmin && (
                      <button onClick={() => setConfirmDesactivar(p)}
                        className={`p-2 rounded-lg ${p.activa ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                        title={p.activa ? 'Desactivar' : 'Activar'}>
                        {p.activa ? <Trash2 size={14} /> : <CheckCircle2 size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {expandidaId === p.id && (
                <div className="border-t border-slate-100 p-4 bg-slate-50">
                  <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5"><Tag size={12} />Etiquetas detectadas en esta plantilla</p>
                  {p.etiquetas?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                      {p.etiquetas.map((et: string) => (
                        <div key={et} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] font-mono font-bold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded flex-shrink-0">{et}</span>
                          <span className="text-[10px] text-slate-500 truncate">{etiquetas[et] || ''}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No se detectaron etiquetas. Añade etiquetas tipo {'{{campo}}'} al documento.</p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <p className="text-[10px] text-slate-400">ID Doc: <span className="font-mono">{p.id_doc}</span></p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {Object.keys(etiquetas).length > 0 && (
        <details className="mt-6">
          <summary className="text-sm font-bold text-slate-700 cursor-pointer hover:text-violet-700 flex items-center gap-2 py-3 border-t border-slate-200">
            <Tag size={14} /> Ver todas las etiquetas disponibles ({Object.keys(etiquetas).length})
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            {Object.entries(etiquetas).map(([et, desc]) => (
              <div key={et} className="flex items-center gap-2 p-2 bg-white rounded-lg">
                <span className="text-[10px] font-mono font-bold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded flex-shrink-0 whitespace-nowrap">{et}</span>
                <span className="text-[10px] text-slate-500 truncate">{desc as string}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )

  if (modo === 'nueva_desde_url') return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setModo('lista')} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        <h2 className="text-xl font-bold text-slate-900">Registrar plantilla desde Google Drive</h2>
      </div>

      {msg && <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${msg.includes('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5">
        <p className="text-sm font-bold text-blue-800 mb-1">¿Cómo funciona?</p>
        <ol className="text-xs text-blue-700 space-y-1">
          <li>1. Crea o abre el Google Doc que usarás como plantilla</li>
          <li>2. Añade etiquetas tipo <span className="font-mono bg-white px-1 rounded">{'{{nombre_empleado}}'}</span> donde quieras datos dinámicos</li>
          <li>3. Copia la URL del documento y pégala aquí</li>
          <li>4. El sistema detectará automáticamente las etiquetas</li>
        </ol>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-600">URL o ID del Google Doc *</label>
          <input type="text" value={formUrl.id_doc} onChange={(e: any) => setFormUrl({ ...formUrl, id_doc: e.target.value })}
            placeholder="https://docs.google.com/document/d/... o solo el ID"
            className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono" />
          <p className="text-[10px] text-slate-400 mt-1">Asegúrate de que el documento es accesible por la cuenta de Apps Script</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Nombre de la plantilla *</label>
          <input type="text" value={formUrl.nombre} onChange={(e: any) => setFormUrl({ ...formUrl, nombre: e.target.value })}
            placeholder="Ej: Recibí EPIs, Consentimiento RGPD empleados..."
            className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Módulo *</label>
          <select value={formUrl.modulo} onChange={(e: any) => setFormUrl({ ...formUrl, modulo: e.target.value })}
            className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white">
            <option value="">— Seleccionar —</option>
            {modulos.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Descripción</label>
          <textarea value={formUrl.descripcion} onChange={(e: any) => setFormUrl({ ...formUrl, descripcion: e.target.value })}
            rows={2} placeholder="Para qué se usa esta plantilla..."
            className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={handleRegistrarDesdeUrl} disabled={guardando || !formUrl.id_doc || !formUrl.nombre || !formUrl.modulo}
            className="flex items-center gap-2 px-6 py-3 bg-violet-700 hover:bg-violet-800 disabled:bg-violet-300 text-white text-sm font-bold rounded-xl">
            {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Registrar plantilla
          </button>
          <button onClick={() => setModo('lista')} className="px-6 py-3 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl">Cancelar</button>
        </div>
      </div>
    </div>
  )

  if (modo === 'nueva_vacia') return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setModo('lista')} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        <h2 className="text-xl font-bold text-slate-900">Crear nueva plantilla</h2>
      </div>

      {msg && <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${msg.includes('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}

      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5">
        <p className="text-sm font-bold text-emerald-800 mb-1">Plantilla vacía con estructura base</p>
        <p className="text-xs text-emerald-700">Se creará un Google Doc en tu Drive con la estructura básica ya lista. Luego lo editas, añades etiquetas y listo.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-600">Nombre de la plantilla *</label>
          <input type="text" value={formVacia.nombre} onChange={(e: any) => setFormVacia({ ...formVacia, nombre: e.target.value })}
            placeholder="Ej: Carta de bienvenida, Acta reunión..."
            className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Módulo *</label>
          <select value={formVacia.modulo} onChange={(e: any) => setFormVacia({ ...formVacia, modulo: e.target.value })}
            className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white">
            <option value="">— Seleccionar —</option>
            {modulos.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Descripción</label>
          <textarea value={formVacia.descripcion} onChange={(e: any) => setFormVacia({ ...formVacia, descripcion: e.target.value })}
            rows={2} placeholder="Para qué se usa esta plantilla..."
            className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={handleCrearVacia} disabled={guardando || !formVacia.nombre || !formVacia.modulo}
            className="flex items-center gap-2 px-6 py-3 bg-violet-700 hover:bg-violet-800 disabled:bg-violet-300 text-white text-sm font-bold rounded-xl">
            {guardando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Crear y abrir en Drive
          </button>
          <button onClick={() => setModo('lista')} className="px-6 py-3 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl">Cancelar</button>
        </div>
      </div>
    </div>
  )

  if (modo === 'previsualizar' && plantillaSel) return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setModo('lista')} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Probar plantilla</h2>
          <p className="text-xs text-slate-500">{plantillaSel.nombre}</p>
        </div>
      </div>

      {msg && <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${msg.includes('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}

      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <p className="text-sm font-bold text-slate-800 mb-4">Rellena los valores de prueba para cada etiqueta:</p>
        {plantillaSel.etiquetas?.length > 0 ? (
          <div className="space-y-3 mb-5">
            {plantillaSel.etiquetas.map((et: string) => (
              <div key={et}>
                <label className="text-xs font-semibold text-slate-600">
                  <span className="font-mono text-violet-700">{et}</span>
                  <span className="text-slate-400 font-normal ml-2">{etiquetas[et] || ''}</span>
                </label>
                <input type="text" value={datosGeneracion[et] || ''} onChange={(e: any) => setDatosGeneracion({ ...datosGeneracion, [et]: e.target.value })}
                  placeholder="Valor de prueba..."
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <Tag size={28} className="mx-auto mb-2" />
            <p className="text-sm">Esta plantilla no tiene etiquetas detectadas.</p>
            <p className="text-xs mt-1">Edita el documento y añade etiquetas tipo {'{{campo}}'}</p>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={handleGenerarPrueba} disabled={generando}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300 text-white text-sm font-bold rounded-xl">
            {generando ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />} Generar documento de prueba
          </button>
          {plantillaSel.url && (
            <a href={plantillaSel.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl">
              <ExternalLink size={14} /> Ver plantilla
            </a>
          )}
        </div>
      </div>
    </div>
  )

  return null
}
