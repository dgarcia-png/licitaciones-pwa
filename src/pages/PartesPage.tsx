import { useState, useEffect } from 'react'
import { api } from '../services/api'
import ConfirmModal from '../components/ConfirmModal'
import {
  ClipboardList, AlertTriangle, Plus, RefreshCw, Search,
  CheckCircle2, X, Save, Loader2, Building2,
  Users, Wrench, Camera, PenTool, Clock, Euro
} from 'lucide-react'

const PRIORIDAD_CONFIG: Record<string, { label: string; color: string }> = {
  alta:  { label: 'Alta',  color: 'bg-red-100 text-red-700' },
  media: { label: 'Media', color: 'bg-amber-100 text-amber-700' },
  baja:  { label: 'Baja',  color: 'bg-slate-100 text-slate-600' },
}
const ESTADO_INC: Record<string, { label: string; color: string }> = {
  abierta:    { label: 'Abierta',    color: 'bg-red-100 text-red-700' },
  en_proceso: { label: 'En proceso', color: 'bg-amber-100 text-amber-700' },
  resuelta:   { label: 'Resuelta',   color: 'bg-emerald-100 text-emerald-700' },
  cerrada:    { label: 'Cerrada',    color: 'bg-slate-100 text-slate-600' },
}
const TIPO_INC = ['general', 'material', 'maquinaria', 'personal', 'cliente', 'seguridad', 'calidad', 'otro']

function fmtHora(h: string) {
  if (!h) return '—'
  if (h.includes('T') || h.includes('1899')) {
    try { return new Date(h).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) } catch { return h }
  }
  return h
}

export default function PartesPage() {
  const [tab, setTab] = useState<'partes' | 'incidencias'>('partes')
  const [partes, setPartes] = useState<any[]>([])
  const [incidencias, setIncidencias] = useState<any[]>([])
  const [centros, setCentros] = useState<any[]>([])
  const [empleados, setEmpleados] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroCentro, setFiltroCentro] = useState('')
  const [parteDetalle, setParteDetalle] = useState<any>(null)
  const [fotosDetalle, setFotosDetalle] = useState<any[]>([])
  const [checklistDetalle, setChecklistDetalle] = useState<any[]>([])
  const [materialesDetalle, setMaterialesDetalle] = useState<any[]>([])
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [incSel, setIncSel] = useState<any>(null)
  const [formResolucion, setFormResolucion] = useState('')
  const [confirmEliminar, setConfirmEliminar] = useState<string | null>(null)

  const [formInc, setFormInc] = useState<any>({
    centro_id: '', centro_nombre: '', empleado_id: '', nombre_empleado: '',
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'general', descripcion: '', prioridad: 'media'
  })

  const showMsg = (m: string, err = false) => {
    if (err) setError(m); else setMsg(m)
    setTimeout(() => { setMsg(''); setError('') }, 3500)
  }

  const cargar = async () => {
    setCargando(true)
    try {
      const [p, inc, c, emp] = await Promise.all([
        (api as any).partesV2(),
        (api as any).incidencias(),
        (api as any).centros(),
        api.empleados()
      ])
      setPartes(p.partes || [])
      setIncidencias(inc.incidencias || [])
      setCentros(c.centros || [])
      setEmpleados(emp.empleados || [])
    } catch(e) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  const handleCrearIncidencia = async () => {
    if (!formInc.centro_id || !formInc.descripcion) {
      showMsg('Centro y descripción son obligatorios', true); return
    }
    setGuardando(true)
    try {
      const r = await (api as any).crearIncidencia(formInc)
      if (r.ok) {
        showMsg('✅ Incidencia registrada')
        setMostrarForm(false)
        setFormInc({ ...formInc, descripcion: '' })
        await cargar()
      } else showMsg(r.error || 'Error', true)
    } catch(e) { showMsg('Error de conexión', true) }
    finally { setGuardando(false) }
  }

  const handleResolver = async (inc: any) => {
    setGuardando(true)
    try {
      const r = await (api as any).resolverIncidencia({ id: inc.id, estado: 'resuelta', resolucion: formResolucion })
      if (r.ok) {
        showMsg('✅ Incidencia resuelta')
        setIncSel(null); setFormResolucion('')
        await cargar()
      } else showMsg(r.error || 'Error', true)
    } catch(e) { showMsg('Error', true) }
    finally { setGuardando(false) }
  }

  const onEmpleadoChange = (id: string) => {
    const emp = empleados.find(e => e.id === id)
    const nombre = emp ? (emp.nombre || '') + ' ' + (emp.apellidos || '') : ''
    setFormInc({ ...formInc, empleado_id: id, nombre_empleado: nombre })
  }

  const onCentroChange = (id: string) => {
    const centro = centros.find(c => c.id === id)
    setFormInc({ ...formInc, centro_id: id, centro_nombre: centro?.nombre || '' })
  }

  const partesFiltrados = partes.filter(p =>
    (!filtroCentro || p.centro_id === filtroCentro) &&
    (!busqueda ||
      p.nombre_empleado?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.centro_nombre?.toLowerCase().includes(busqueda.toLowerCase()))
  )
  const incFiltradas = incidencias.filter(i =>
    (!filtroCentro || i.centro_id === filtroCentro) &&
    (!busqueda ||
      i.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
      i.centro_nombre?.toLowerCase().includes(busqueda.toLowerCase()))
  )
  const incAbiertas = incidencias.filter(i => i.estado === 'abierta').length

  return (
    <div className="p-6 lg:p-8 max-w-5xl">

      {/* Modal detalle parte */}
      {parteDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setParteDetalle(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Detalle del parte</h3>
                <p className="text-xs text-slate-400">{parteDetalle.fecha}</p>
              </div>
              <button onClick={() => setParteDetalle(null)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Centro', parteDetalle.centro_nombre || '—'],
                  ['Trabajador', parteDetalle.nombre_empleado || '—'],
                  ['Entrada', fmtHora(parteDetalle.hora_inicio)],
                  ['Salida', fmtHora(parteDetalle.hora_fin)],
                  ['Horas', (parteDetalle.horas_reales || 0) + 'h'],
                  ['Checklist', (parteDetalle.pct_completitud || 0) + '%'],
                  ['Estado', parteDetalle.estado || '—'],
                  ['Tipo servicio', parteDetalle.tipo_servicio || '—'],
                ].map(([l, v]) => (
                  <div key={String(l)} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">{l}</p>
                    <p className="text-sm font-bold text-slate-800">{String(v)}</p>
                  </div>
                ))}
              </div>

              {parteDetalle.coste_total > 0 && (
                <div className="bg-emerald-50 rounded-xl p-3">
                  <p className="text-[10px] text-emerald-600 uppercase font-semibold mb-1 flex items-center gap-1">
                    <Euro size={10} /> Costes del servicio
                  </p>
                  <div className="flex gap-4 text-xs text-emerald-700 flex-wrap">
                    {parteDetalle.coste_personal > 0 && <span>Personal: {parteDetalle.coste_personal.toFixed(2)} €</span>}
                    {parteDetalle.coste_materiales > 0 && <span>Materiales: {parteDetalle.coste_materiales.toFixed(2)} €</span>}
                    {parteDetalle.coste_maquinaria > 0 && <span>Maquinaria: {parteDetalle.coste_maquinaria.toFixed(2)} €</span>}
                  </div>
                  <p className="text-sm font-black text-emerald-800 mt-1">Total: {parteDetalle.coste_total.toFixed(2)} €</p>
                </div>
              )}

              {/* Loading */}
              {cargandoDetalle && (
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                  <Loader2 size={14} className="animate-spin text-slate-400" />
                  <p className="text-xs text-slate-500">Cargando detalles...</p>
                </div>
              )}

              {/* Checklist */}
              {checklistDetalle.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">Checklist de tareas</p>
                  <div className="space-y-1">
                    {checklistDetalle.map((item: any, i: number) => (
                      <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${item.completado || item.completada ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}>
                        <span>{item.completado || item.completada ? '✅' : '⬜'}</span>
                        <span className="flex-1">{item.descripcion || item.tarea || '—'}</span>
                        {(item.hora || item.completado) && <span className="text-slate-400">{item.hora}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Materiales usados */}
              {materialesDetalle.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">Materiales utilizados</p>
                  <div className="space-y-1">
                    {materialesDetalle.map((m: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs">
                        <span className="text-slate-700">{m.nombre || m.material_id}</span>
                        <span className="font-bold text-slate-600">{m.cantidad} u · {m.coste_total ? m.coste_total.toFixed(2) + ' €' : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fotos */}
              {fotosDetalle.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                    <Camera size={12} /> Fotografías del servicio
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {fotosDetalle.map((f: any, i: number) => (
                      <div key={i} className="relative">
                        <span className={`absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10 ${f.tipo === 'antes' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'}`}>
                          {f.tipo}
                        </span>
                        <a href={f.url} target="_blank" rel="noopener noreferrer"
                          className="block w-full h-28 bg-slate-100 rounded-xl border border-slate-200 flex flex-col items-center justify-center hover:bg-slate-200 transition-colors">
                          <Camera size={18} className="text-slate-400 mb-1" />
                          <span className="text-xs text-blue-600 font-medium">Ver foto</span>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {fotosDetalle.length === 0 && !cargandoDetalle && (parteDetalle.fotos_antes > 0 || parteDetalle.fotos_despues > 0) && (
                <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 text-center">
                  {(parteDetalle.fotos_antes || 0) + (parteDetalle.fotos_despues || 0)} fotos registradas (URL no disponible)
                </div>
              )}

              {/* Firma */}
              {parteDetalle.firma_cliente === 'si' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                  <PenTool size={16} className="text-emerald-600" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-emerald-700">Firmado por el cliente</p>
                    {parteDetalle.nombre_firmante && <p className="text-xs text-emerald-600">{parteDetalle.nombre_firmante}</p>}
                  </div>
                  {parteDetalle.firma_url && (
                    <a href={parteDetalle.firma_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 font-medium hover:underline">Ver firma →</a>
                  )}
                </div>
              )}

              {/* Observaciones */}
              {parteDetalle.observaciones && (
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-[10px] text-amber-600 uppercase font-semibold mb-1">Observaciones</p>
                  <p className="text-sm text-amber-800">{parteDetalle.observaciones}</p>
                </div>
              )}

              {/* Informe PDF */}
              {parteDetalle.informe_url && (
                <a href={parteDetalle.informe_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors">
                  <ClipboardList size={14} className="text-blue-600" />
                  <span className="text-sm text-blue-700 font-semibold">Descargar informe PDF</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal resolver incidencia */}
      {incSel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIncSel(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10">
            <h3 className="text-base font-bold text-slate-900 mb-2">Resolver incidencia</h3>
            <p className="text-sm text-slate-600 mb-4 p-3 bg-slate-50 rounded-xl">{incSel.descripcion}</p>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Descripción de la resolución</label>
            <textarea value={formResolucion} onChange={e => setFormResolucion(e.target.value)}
              rows={3} placeholder="¿Cómo se resolvió?"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setIncSel(null)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl">
                Cancelar
              </button>
              <button onClick={() => handleResolver(incSel)} disabled={guardando}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
                {guardando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Marcar resuelta
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmEliminar}
        titulo="¿Eliminar parte?"
        mensaje="Se eliminará este parte permanentemente."
        labelOk="Sí, eliminar" peligroso cargando={guardando}
        onConfirm={() => confirmEliminar && (api as any).eliminarParteV2(confirmEliminar).then(() => { showMsg('Eliminado'); cargar() })}
        onCancel={() => setConfirmEliminar(null)}
      />

      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e] rounded-xl shadow-lg">
            <ClipboardList size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Partes de trabajo</h1>
            <p className="text-sm text-slate-500">
              {partes.length} partes · {incAbiertas > 0 && <span className="text-red-600 font-semibold">{incAbiertas} incidencias abiertas</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl">
            <RefreshCw size={16} />
          </button>
          {tab === 'incidencias' && (
            <button onClick={() => setMostrarForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl">
              <Plus size={15} /> Nueva incidencia
            </button>
          )}
        </div>
      </div>

      {incAbiertas > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <AlertTriangle size={16} className="text-red-600 flex-shrink-0" />
          <p className="text-sm font-bold text-red-800">
            {incAbiertas} incidencia{incAbiertas > 1 ? 's' : ''} abierta{incAbiertas > 1 ? 's' : ''} pendiente{incAbiertas > 1 ? 's' : ''} de resolución
          </p>
          <button onClick={() => setTab('incidencias')} className="ml-auto text-xs font-bold text-red-600 hover:text-red-800">Ver →</button>
        </div>
      )}

      {msg && <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-emerald-800 text-sm"><CheckCircle2 size={15}/>{msg}</div>}
      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-red-800 text-sm"><AlertTriangle size={15}/>{error}</div>}

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { id: 'partes', label: 'Partes de trabajo', count: partes.length },
          { id: 'incidencias', label: 'Incidencias', count: incidencias.length, alert: incAbiertas > 0 }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === t.id ? 'bg-[#1a3c34] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              tab === t.id ? 'bg-white/20 text-white' :
              t.alert ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
            }`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-3 text-slate-400" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por centro o trabajador..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c34]" />
        </div>
        <select value={filtroCentro} onChange={e => setFiltroCentro(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none">
          <option value="">Todos los centros</option>
          {centros.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      {/* Formulario nueva incidencia */}
      {mostrarForm && tab === 'incidencias' && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-red-800">Nueva incidencia</h3>
            <button onClick={() => setMostrarForm(false)}><X size={16} className="text-red-600" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Centro *</label>
              <select value={formInc.centro_id} onChange={e => onCentroChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Seleccionar —</option>
                {centros.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Reportado por</label>
              <select value={formInc.empleado_id} onChange={e => onEmpleadoChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Seleccionar —</option>
                {empleados.filter(e => e.estado === 'activo').map(e => (
                  <option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Tipo</label>
              <select value={formInc.tipo} onChange={e => setFormInc({...formInc, tipo: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                {TIPO_INC.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Prioridad</label>
              <select value={formInc.prioridad} onChange={e => setFormInc({...formInc, prioridad: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="alta">🔴 Alta</option>
                <option value="media">🟡 Media</option>
                <option value="baja">⚪ Baja</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-slate-600 block mb-1">Descripción *</label>
            <textarea value={formInc.descripcion} onChange={e => setFormInc({...formInc, descripcion: e.target.value})}
              rows={3} placeholder="Describe la incidencia..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none" />
          </div>
          <button onClick={handleCrearIncidencia} disabled={guardando}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-xl">
            {guardando ? <Loader2 size={15} className="animate-spin" /> : <AlertTriangle size={15} />}
            Registrar incidencia
          </button>
        </div>
      )}

      {/* Lista partes V2 */}
      {tab === 'partes' && (
        cargando ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-[#1a3c34]" /></div>
        ) : partesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center py-16 bg-white border border-slate-200 rounded-2xl">
            <ClipboardList size={36} className="text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Sin partes registrados</p>
            <p className="text-xs text-slate-400 mt-1">Los partes se crean desde el Operador de campo</p>
          </div>
        ) : (
          <div className="space-y-3">
            {partesFiltrados.map((p: any) => (
              <div key={p.id} onClick={async () => {
                setParteDetalle(p)
                setFotosDetalle([])
                setChecklistDetalle([])
                setMaterialesDetalle([])
                setCargandoDetalle(true)
                try {
                  const [fts, chk, mats] = await Promise.all([
                    (api as any).fotosParte(p.id).catch(() => ({ fotos: [] })),
                    (api as any).checklistEjecucion(p.id).catch(() => ({ items: [] })),
                    (api as any).materialesParte(p.id).catch(() => ({ materiales: [] }))
                  ])
                  setFotosDetalle(fts.fotos || [])
                  setChecklistDetalle(chk.items || [])
                  setMaterialesDetalle(mats.materiales || [])
                } catch(e) { console.error(e) }
                finally { setCargandoDetalle(false) }
              }}
                className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-[#1a3c34]/30 hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.estado === 'completado' ? 'bg-emerald-500' : p.estado === 'en_curso' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                      <Building2 size={13} className="text-[#1a3c34] flex-shrink-0" />
                      <p className="text-sm font-bold text-slate-800 truncate">{p.centro_nombre || '—'}</p>
                      {p.firma_cliente === 'si' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full shrink-0">Firmado ✓</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Users size={11} />{p.nombre_empleado || '—'}
                      </span>
                      <span className="text-xs text-slate-400">{p.fecha}</span>
                      <span className="text-xs font-bold text-[#1a3c34] flex items-center gap-1">
                        <Clock size={11} />{fmtHora(p.hora_inicio)} → {fmtHora(p.hora_fin)} ({p.horas_reales || 0}h)
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-slate-500">
                        ✓ {p.checklist_ok || 0}/{p.checklist_total || 0} tareas
                      </span>
                      {(p.fotos_antes > 0 || p.fotos_despues > 0) && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Camera size={11} />{(p.fotos_antes || 0) + (p.fotos_despues || 0)} fotos
                        </span>
                      )}
                      {p.coste_total > 0 && (
                        <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                          <Euro size={11} />{p.coste_total.toFixed(2)} €
                        </span>
                      )}
                    </div>
                    {p.observaciones && (
                      <p className="text-xs text-amber-700 mt-1 flex items-start gap-1">
                        <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />{p.observaciones}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Lista incidencias */}
      {tab === 'incidencias' && (
        cargando ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-[#1a3c34]" /></div>
        ) : incFiltradas.length === 0 ? (
          <div className="flex flex-col items-center py-16 bg-white border border-slate-200 rounded-2xl">
            <AlertTriangle size={36} className="text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Sin incidencias registradas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {incFiltradas.map((inc: any) => {
              const pr = PRIORIDAD_CONFIG[inc.prioridad] || PRIORIDAD_CONFIG.media
              const es = ESTADO_INC[inc.estado] || { label: inc.estado, color: 'bg-slate-100 text-slate-600' }
              return (
                <div key={inc.id} className={`bg-white border-2 rounded-2xl p-4 ${
                  inc.estado === 'abierta' ? 'border-red-200' :
                  inc.estado === 'en_proceso' ? 'border-amber-200' : 'border-slate-200'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pr.color}`}>{pr.label}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${es.color}`}>{es.label}</span>
                        <span className="text-[10px] text-slate-400">{inc.tipo}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 mb-1">{inc.descripcion}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1"><Building2 size={11} />{inc.centro_nombre}</span>
                        <span>{inc.fecha}</span>
                        {inc.nombre_empleado && <span className="flex items-center gap-1"><Users size={11} />{inc.nombre_empleado}</span>}
                      </div>
                      {inc.resolucion && (
                        <p className="text-xs text-emerald-700 mt-1 flex items-start gap-1">
                          <CheckCircle2 size={11} className="flex-shrink-0 mt-0.5" />{inc.resolucion}
                        </p>
                      )}
                    </div>
                    {(inc.estado === 'abierta' || inc.estado === 'en_proceso') && (
                      <button onClick={() => { setIncSel(inc); setFormResolucion('') }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex-shrink-0">
                        <Wrench size={12} /> Resolver
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}