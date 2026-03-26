import { useState, useEffect } from 'react'
import { api } from '../services/api'
import ConfirmModal from '../components/ConfirmModal'
import {
  ClipboardList, AlertTriangle, Plus, RefreshCw, Search,
  CheckCircle2, Clock, X, Save, Loader2, Building2,
  Users, ChevronDown, ChevronUp, Filter, Wrench
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
  const [incSel, setIncSel] = useState<any>(null)
  const [formResolucion, setFormResolucion] = useState('')
  const [confirmEliminar, setConfirmEliminar] = useState<string | null>(null)

  const [formParte, setFormParte] = useState<any>({
    centro_id: '', centro_nombre: '', empleado_id: '', nombre_empleado: '',
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '07:00', hora_fin: '15:00',
    tipo_servicio: 'limpieza', tareas_realizadas: '',
    observaciones: '', firma_cliente: 'no'
  })
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
        (api as any).partes(),
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

  const handleCrearParte = async () => {
    if (!formParte.centro_id || !formParte.tareas_realizadas) {
      showMsg('Centro y tareas son obligatorios', true); return
    }
    setGuardando(true)
    try {
      const r = await (api as any).crearParte(formParte)
      if (r.ok) {
        showMsg(`✅ Parte registrado (${r.horas}h)`)
        setMostrarForm(false)
        setFormParte({ ...formParte, tareas_realizadas: '', observaciones: '' })
        await cargar()
      } else showMsg(r.error || 'Error', true)
    } catch(e) { showMsg('Error de conexión', true) }
    finally { setGuardando(false) }
  }

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
      const r = await (api as any).resolverIncidencia({
        id: inc.id, estado: 'resuelta', resolucion: formResolucion
      })
      if (r.ok) {
        showMsg('✅ Incidencia resuelta')
        setIncSel(null); setFormResolucion('')
        await cargar()
      } else showMsg(r.error || 'Error', true)
    } catch(e) { showMsg('Error', true) }
    finally { setGuardando(false) }
  }

  const handleEliminarParte = async (id: string) => {
    setGuardando(true)
    try {
      const r = await (api as any).eliminarParte(id)
      if (r.ok) { showMsg('Parte eliminado'); await cargar() }
    } catch(e) { showMsg('Error', true) }
    finally { setGuardando(false); setConfirmEliminar(null) }
  }

  const onCentroChange = (id: string, esInc = false) => {
    const centro = centros.find(c => c.id === id)
    if (esInc) setFormInc({ ...formInc, centro_id: id, centro_nombre: centro?.nombre || '' })
    else setFormParte({ ...formParte, centro_id: id, centro_nombre: centro?.nombre || '' })
  }

  const onEmpleadoChange = (id: string, esInc = false) => {
    const emp = empleados.find(e => e.id === id)
    const nombre = emp ? (emp.nombre || '') + ' ' + (emp.apellidos || '') : ''
    if (esInc) setFormInc({ ...formInc, empleado_id: id, nombre_empleado: nombre })
    else setFormParte({ ...formParte, empleado_id: id, nombre_empleado: nombre })
  }

  const partesFiltrados = partes.filter(p =>
    (!filtroCentro || p.centro_id === filtroCentro) &&
    (!busqueda || p.nombre_empleado?.toLowerCase().includes(busqueda.toLowerCase()) ||
     p.centro_nombre?.toLowerCase().includes(busqueda.toLowerCase()))
  )
  const incFiltradas = incidencias.filter(i =>
    (!filtroCentro || i.centro_id === filtroCentro) &&
    (!busqueda || i.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
     i.centro_nombre?.toLowerCase().includes(busqueda.toLowerCase()))
  )
  const incAbiertas = incidencias.filter(i => i.estado === 'abierta').length

  return (
    <div className="p-6 lg:p-8 max-w-5xl">

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
          <button onClick={() => setMostrarForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1a3c34] hover:bg-[#2d5a4e] text-white text-sm font-semibold rounded-xl">
            <Plus size={15} /> {tab === 'partes' ? 'Nuevo parte' : 'Nueva incidencia'}
          </button>
        </div>
      </div>

      {/* Alertas incidencias abiertas */}
      {incAbiertas > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <AlertTriangle size={16} className="text-red-600 flex-shrink-0" />
          <p className="text-sm font-bold text-red-800">
            {incAbiertas} incidencia{incAbiertas > 1 ? 's' : ''} abierta{incAbiertas > 1 ? 's' : ''} pendiente{incAbiertas > 1 ? 's' : ''} de resolución
          </p>
          <button onClick={() => setTab('incidencias')}
            className="ml-auto text-xs font-bold text-red-600 hover:text-red-800">Ver →</button>
        </div>
      )}

      {/* Mensajes */}
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
            placeholder="Buscar..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c34]" />
        </div>
        <select value={filtroCentro} onChange={e => setFiltroCentro(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none">
          <option value="">Todos los centros</option>
          {centros.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      {/* Formulario nuevo parte */}
      {mostrarForm && tab === 'partes' && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-blue-800">Nuevo parte de trabajo</h3>
            <button onClick={() => setMostrarForm(false)}><X size={16} className="text-blue-600" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Centro *</label>
              <select value={formParte.centro_id} onChange={e => onCentroChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Seleccionar —</option>
                {centros.filter(c => c.estado === 'activo').map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Trabajador</label>
              <select value={formParte.empleado_id} onChange={e => onEmpleadoChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Seleccionar —</option>
                {empleados.filter(e => e.estado === 'activo').map(e => (
                  <option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Fecha</label>
              <input type="date" value={formParte.fecha} onChange={e => setFormParte({...formParte, fecha: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Entrada</label>
                <input type="time" value={formParte.hora_inicio} onChange={e => setFormParte({...formParte, hora_inicio: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Salida</label>
                <input type="time" value={formParte.hora_fin} onChange={e => setFormParte({...formParte, hora_fin: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
              </div>
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs font-semibold text-slate-600 block mb-1">Tareas realizadas *</label>
            <textarea value={formParte.tareas_realizadas} onChange={e => setFormParte({...formParte, tareas_realizadas: e.target.value})}
              rows={3} placeholder="Describe las tareas realizadas..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none" />
          </div>
          <div className="mb-3">
            <label className="text-xs font-semibold text-slate-600 block mb-1">Observaciones</label>
            <textarea value={formParte.observaciones} onChange={e => setFormParte({...formParte, observaciones: e.target.value})}
              rows={2} placeholder="Incidencias, observaciones..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={formParte.firma_cliente === 'si'}
                onChange={e => setFormParte({...formParte, firma_cliente: e.target.checked ? 'si' : 'no'})}
                className="rounded" />
              Firmado por el cliente
            </label>
          </div>
          <button onClick={handleCrearParte} disabled={guardando}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1a3c34] hover:bg-[#2d5a4e] disabled:bg-slate-300 text-white text-sm font-bold rounded-xl">
            {guardando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Registrar parte
          </button>
        </div>
      )}

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
              <select value={formInc.centro_id} onChange={e => onCentroChange(e.target.value, true)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Seleccionar —</option>
                {centros.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Reportado por</label>
              <select value={formInc.empleado_id} onChange={e => onEmpleadoChange(e.target.value, true)}
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
              rows={3} placeholder="Describe la incidencia con detalle..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none" />
          </div>
          <button onClick={handleCrearIncidencia} disabled={guardando}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-xl">
            {guardando ? <Loader2 size={15} className="animate-spin" /> : <AlertTriangle size={15} />}
            Registrar incidencia
          </button>
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
        mensaje="Se eliminará este parte de trabajo permanentemente."
        labelOk="Sí, eliminar" peligroso cargando={guardando}
        onConfirm={() => confirmEliminar && handleEliminarParte(confirmEliminar)}
        onCancel={() => setConfirmEliminar(null)}
      />

      {/* Lista partes */}
      {tab === 'partes' && (
        cargando ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-[#1a3c34]" /></div>
        ) : partesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center py-16 bg-white border border-slate-200 rounded-2xl">
            <ClipboardList size={36} className="text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Sin partes registrados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {partesFiltrados.map((p: any) => (
              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 size={13} className="text-[#1a3c34] flex-shrink-0" />
                      <p className="text-sm font-bold text-slate-800 truncate">{p.centro_nombre}</p>
                      {p.firma_cliente === 'si' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full shrink-0">Firmado ✓</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Users size={11} />{p.nombre_empleado || '—'}
                      </span>
                      <span className="text-xs text-slate-400">{p.fecha}</span>
                      <span className="text-xs font-bold text-[#1a3c34]">
                        {p.hora_inicio} → {p.hora_fin} ({p.horas_trabajadas}h)
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">{p.tareas_realizadas}</p>
                    {p.observaciones && (
                      <p className="text-xs text-amber-700 mt-1 flex items-start gap-1">
                        <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />{p.observaciones}
                      </p>
                    )}
                  </div>
                  <button onClick={() => setConfirmEliminar(p.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                    <X size={14} />
                  </button>
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
                      <div className="flex items-center gap-3 text-xs text-slate-500">
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