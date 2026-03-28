import { useState, useEffect } from 'react'
import { api } from '../services/api'
import ConfirmModal from '../components/ConfirmModal'
import { ClipboardList, Plus, RefreshCw, Search, Loader2, CheckCircle2,
  AlertTriangle, X, Save, Clock, User, Building2, Zap, FileText, ChevronRight } from 'lucide-react'

const TIPO_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  programada:    { label: 'Programada',    color: 'bg-blue-100 text-blue-700',       emoji: '📅' },
  extraordinaria:{ label: 'Extraordinaria',color: 'bg-purple-100 text-purple-700',   emoji: '⚡' },
  correctiva:    { label: 'Correctiva',    color: 'bg-red-100 text-red-700',          emoji: '🔧' },
  inspeccion:    { label: 'Inspección',    color: 'bg-amber-100 text-amber-700',      emoji: '🔍' },
  preventiva:    { label: 'Preventiva',    color: 'bg-emerald-100 text-emerald-700',  emoji: '🛡️' },
}
const ESTADO_CONFIG: Record<string, { label: string; color: string }> = {
  pendiente:  { label: 'Pendiente',  color: 'bg-slate-100 text-slate-600' },
  asignada:   { label: 'Asignada',   color: 'bg-blue-100 text-blue-700' },
  en_proceso: { label: 'En proceso', color: 'bg-amber-100 text-amber-700' },
  pausada:    { label: 'Pausada',    color: 'bg-orange-100 text-orange-700' },
  completada: { label: 'Completada', color: 'bg-emerald-100 text-emerald-700' },
  cancelada:  { label: 'Cancelada',  color: 'bg-slate-100 text-slate-500' },
}
const PRIORIDAD_CONFIG: Record<string, { label: string; color: string }> = {
  baja:    { label: 'Baja',    color: 'bg-slate-100 text-slate-500' },
  media:   { label: 'Media',   color: 'bg-amber-100 text-amber-700' },
  alta:    { label: 'Alta',    color: 'bg-orange-100 text-orange-700' },
  urgente: { label: 'URGENTE', color: 'bg-red-100 text-red-700' },
}

const FORM_VACIO = {
  titulo:'', tipo:'programada', prioridad:'media',
  centro_id:'', centro_nombre:'', empleado_id:'', nombre_empleado:'',
  fecha_programada: new Date().toISOString().split('T')[0],
  hora_inicio:'08:00', hora_fin:'16:00', horas_estimadas:'8',
  descripcion:''
}

function fmtHora(h: string) {
  if (!h) return '—'
  if (h.includes('T') || h.includes('1899')) {
    try { return new Date(h).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) } catch { return h }
  }
  return h
}

export default function OrdenesPage() {
  const [ordenes, setOrdenes] = useState<any[]>([])
  const [centros, setCentros] = useState<any[]>([])
  const [empleados, setEmpleados] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroPrioridad, setFiltroPrioridad] = useState('todos')
  const [form, setForm] = useState<any>(FORM_VACIO)
  const [otSel, setOtSel] = useState<any>(null)
  const [parteOT, setParteOT] = useState<any>(null)
  const [cargandoParte, setCargandoParte] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string|null>(null)
  const [cambiandoEstado, setCambiandoEstado] = useState<string|null>(null)
  const [editando, setEditando] = useState(false)

  const showMsg = (m: string, err=false) => {
    if(err) setError(m); else setMsg(m)
    setTimeout(()=>{ setMsg(''); setError('') }, 3000)
  }

  const cargar = async () => {
    setCargando(true)
    try {
      const [ots, c, emp] = await Promise.all([
        (api as any).ordenes(),
        (api as any).centros(),
        api.empleados()
      ])
      setOrdenes(ots.ordenes || [])
      setCentros(c.centros || [])
      setEmpleados(emp.empleados || [])
    } catch(e) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  const abrirDetalle = async (ot: any) => {
    setOtSel(ot)
    setParteOT(null)
    if (ot.parte_id) {
      setCargandoParte(true)
      try {
        const partes = await (api as any).partesV2({ estado: 'completado' })
        const p = (partes.partes || []).find((x: any) => x.id === ot.parte_id)
        setParteOT(p || null)
      } catch(e) {}
      finally { setCargandoParte(false) }
    }
  }

  const handleCrear = async () => {
    if (!form.titulo || !form.centro_id) { showMsg('Título y centro son obligatorios', true); return }
    setGuardando(true)
    try {
      const r = await (api as any).crearOrden(form)
      if (r.ok) {
        showMsg('✅ Orden creada' + (r.alerta_prl ? ' · ⚠️ ' + r.alerta_prl : ''))
        setMostrarForm(false); setForm(FORM_VACIO); await cargar()
      } else showMsg(r.error||'Error', true)
    } catch(e) { showMsg('Error', true) }
    finally { setGuardando(false) }
  }

  const handleActualizar = async () => {
    if (!otSel) return
    setGuardando(true)
    try {
      const r = await (api as any).actualizarEstadoOrden({
        id: otSel.id, estado: otSel.estado,
        empleado_id: otSel.empleado_id,
        nombre_empleado: otSel.nombre_empleado,
        observaciones: otSel.observaciones
      })
      if (r.ok) {
        showMsg('✅ Orden actualizada')
        setEditando(false)
        await cargar()
        const updated = ordenes.find((o: any) => o.id === otSel.id)
        if (updated) setOtSel({ ...updated, ...otSel })
      } else showMsg(r.error||'Error', true)
    } catch(e) { showMsg('Error', true) }
    finally { setGuardando(false) }
  }

  const handleCambiarEstado = async (ot: any, estado: string) => {
    setCambiandoEstado(ot.id)
    try {
      const r = await (api as any).actualizarEstadoOrden({ id: ot.id, estado })
      if (r.ok) { showMsg('Estado actualizado'); await cargar() }
    } catch(e) {}
    finally { setCambiandoEstado(null) }
  }

  const handleEliminar = async (id: string) => {
    setGuardando(true)
    try {
      const r = await (api as any).eliminarOrden(id)
      if (r.ok) { showMsg('Orden eliminada'); setOtSel(null); await cargar() }
    } catch(e) {}
    finally { setGuardando(false); setConfirmDel(null) }
  }

  const onCentroChange = (id: string) => {
    const c = centros.find(x => x.id === id)
    setForm({ ...form, centro_id: id, centro_nombre: c?.nombre||'' })
  }
  const onEmpChange = (id: string) => {
    const e = empleados.find(x => x.id === id)
    setForm({ ...form, empleado_id: id, nombre_empleado: e ? (e.nombre+' '+(e.apellidos||'')) : '' })
  }

  const filtradas = ordenes.filter(o => {
    const matchBusq = !busqueda || o.titulo?.toLowerCase().includes(busqueda.toLowerCase()) || o.centro_nombre?.toLowerCase().includes(busqueda.toLowerCase())
    const matchEst  = filtroEstado === 'todos' || o.estado === filtroEstado
    const matchPri  = filtroPrioridad === 'todos' || o.prioridad === filtroPrioridad
    return matchBusq && matchEst && matchPri
  })

  const urgentes   = ordenes.filter(o => o.prioridad === 'urgente' && o.estado !== 'completada').length
  const enProceso  = ordenes.filter(o => o.estado === 'en_proceso').length
  const pendientes = ordenes.filter(o => o.estado === 'pendiente').length

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <ConfirmModal open={!!confirmDel} titulo="¿Eliminar orden?" mensaje="Se eliminará esta orden de trabajo."
        labelOk="Sí, eliminar" peligroso cargando={guardando}
        onConfirm={() => confirmDel && handleEliminar(confirmDel)}
        onCancel={() => setConfirmDel(null)} />

      {/* Modal detalle / editar OT */}
      {otSel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setOtSel(null); setEditando(false) }} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">{(TIPO_CONFIG[otSel.tipo]?.emoji) || '📋'}</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{otSel.titulo}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORIDAD_CONFIG[otSel.prioridad]?.color || ''}`}>
                      {PRIORIDAD_CONFIG[otSel.prioridad]?.label}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ESTADO_CONFIG[otSel.estado]?.color || ''}`}>
                      {ESTADO_CONFIG[otSel.estado]?.label}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditando(!editando)}
                  className="text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl">
                  {editando ? 'Cancelar' : 'Editar'}
                </button>
                <button onClick={() => { setOtSel(null); setEditando(false) }}
                  className="p-1.5 hover:bg-slate-100 rounded-lg">
                  <X size={18} className="text-slate-400" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {editando ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Estado</label>
                    <select value={otSel.estado} onChange={e => setOtSel({...otSel, estado: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                      {Object.entries(ESTADO_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Asignar a</label>
                    <select value={otSel.empleado_id || ''} onChange={e => {
                      const emp = empleados.find(x => x.id === e.target.value)
                      setOtSel({...otSel, empleado_id: e.target.value, nombre_empleado: emp ? (emp.nombre+' '+(emp.apellidos||'')) : ''})
                    }} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                      <option value="">— Sin asignar —</option>
                      {empleados.filter(e => e.estado === 'activo').map(e => (
                        <option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Observaciones</label>
                    <textarea value={otSel.observaciones || ''} onChange={e => setOtSel({...otSel, observaciones: e.target.value})}
                      rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none" />
                  </div>
                  <button onClick={handleActualizar} disabled={guardando}
                    className="w-full py-2.5 bg-[#1a3c34] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
                    {guardando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Guardar cambios
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Centro', otSel.centro_nombre || '—'],
                    ['Asignado a', otSel.nombre_empleado || 'Sin asignar'],
                    ['Fecha', otSel.fecha_programada || '—'],
                    ['Horas estimadas', (otSel.horas_estimadas || 0) + 'h'],
                    ['Tipo', TIPO_CONFIG[otSel.tipo]?.label || otSel.tipo],
                    ['Horas reales', otSel.horas_reales > 0 ? otSel.horas_reales + 'h' : '—'],
                  ].map(([l, v]) => (
                    <div key={String(l)} className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">{l}</p>
                      <p className="text-sm font-bold text-slate-800">{String(v)}</p>
                    </div>
                  ))}
                </div>
              )}

              {otSel.descripcion && !editando && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Descripción</p>
                  <p className="text-sm text-slate-700">{otSel.descripcion}</p>
                </div>
              )}

              {/* Parte asociado */}
              {!editando && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                    <FileText size={12} /> Parte de trabajo vinculado
                  </p>
                  {cargandoParte ? (
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                      <Loader2 size={14} className="animate-spin text-slate-400" />
                      <p className="text-xs text-slate-500">Cargando parte...</p>
                    </div>
                  ) : parteOT ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Completado</span>
                        <span className="text-xs text-slate-400">{parteOT.fecha}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-slate-400">Entrada</p>
                          <p className="font-bold text-slate-700">{fmtHora(parteOT.hora_inicio)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Salida</p>
                          <p className="font-bold text-slate-700">{fmtHora(parteOT.hora_fin)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Horas</p>
                          <p className="font-bold text-slate-700">{parteOT.horas_reales || 0}h</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span>✓ {parteOT.checklist_ok}/{parteOT.checklist_total} tareas</span>
                        {parteOT.firma_cliente === 'si' && <span className="text-emerald-600 font-semibold">Firmado ✓</span>}
                        {parteOT.coste_total > 0 && <span className="text-emerald-600 font-semibold">{parteOT.coste_total.toFixed(2)} €</span>}
                      </div>
                    </div>
                  ) : otSel.parte_id ? (
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-xs text-slate-500">Parte ID: {otSel.parte_id}</p>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-xl text-center">
                      <p className="text-xs text-slate-400">Sin parte asociado aún</p>
                      <p className="text-[10px] text-slate-300 mt-0.5">Se vinculará cuando el operario inicie el parte</p>
                    </div>
                  )}
                </div>
              )}

              {/* Acciones de flujo */}
              {!editando && otSel.estado !== 'completada' && otSel.estado !== 'cancelada' && (
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  {otSel.estado === 'pendiente' && (
                    <button onClick={() => handleCambiarEstado(otSel, 'en_proceso')} disabled={cambiandoEstado === otSel.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl">
                      {cambiandoEstado === otSel.id ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                      Iniciar
                    </button>
                  )}
                  {otSel.estado === 'en_proceso' && (
                    <button onClick={() => handleCambiarEstado(otSel, 'completada')} disabled={cambiandoEstado === otSel.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl">
                      {cambiandoEstado === otSel.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Completar
                    </button>
                  )}
                  <button onClick={() => handleCambiarEstado(otSel, 'cancelada')} disabled={cambiandoEstado === otSel.id}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-xl">
                    Cancelar
                  </button>
                  <button onClick={() => setConfirmDel(otSel.id)}
                    className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-xl">
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e] rounded-xl shadow-lg">
            <ClipboardList size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Órdenes de trabajo</h1>
            <p className="text-sm text-slate-500">
              {pendientes} pendientes · {enProceso} en proceso
              {urgentes > 0 && <span className="text-red-600 font-bold"> · {urgentes} URGENTES</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><RefreshCw size={16}/></button>
          <button onClick={() => setMostrarForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1a3c34] hover:bg-[#2d5a4e] text-white text-sm font-semibold rounded-xl">
            <Plus size={15}/> Nueva OT
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label:'Pendientes', valor: pendientes, color:'text-slate-700', bg:'bg-white' },
          { label:'En proceso', valor: enProceso, color:'text-amber-700', bg:'bg-amber-50' },
          { label:'Urgentes', valor: urgentes, color:'text-red-700', bg: urgentes>0 ? 'bg-red-50':'bg-white' },
          { label:'Total', valor: ordenes.length, color:'text-[#1a3c34]', bg:'bg-white' },
        ].map((k,i) => (
          <div key={i} className={`${k.bg} border border-slate-200 rounded-2xl p-4 text-center`}>
            <p className={`text-2xl font-black ${k.color}`}>{k.valor}</p>
            <p className="text-xs text-slate-500 uppercase mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {msg && <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-emerald-800 text-sm"><CheckCircle2 size={15}/>{msg}</div>}
      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-red-800 text-sm"><AlertTriangle size={15}/>{error}</div>}

      {/* Form nueva OT */}
      {mostrarForm && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-blue-800">Nueva orden de trabajo</h3>
            <button onClick={() => setMostrarForm(false)}><X size={16} className="text-blue-600"/></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 block mb-1">Título *</label>
              <input value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})}
                placeholder="Ej: Limpieza general edificio principal"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Tipo</label>
              <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                {Object.entries(TIPO_CONFIG).map(([k,v])=><option key={k} value={k}>{v.emoji} {v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Prioridad</label>
              <select value={form.prioridad} onChange={e=>setForm({...form,prioridad:e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                {Object.entries(PRIORIDAD_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Centro *</label>
              <select value={form.centro_id} onChange={e=>onCentroChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Seleccionar —</option>
                {centros.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Asignar a</label>
              <select value={form.empleado_id} onChange={e=>onEmpChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Sin asignar —</option>
                {empleados.filter(e=>e.estado==='activo').map(e=><option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Fecha programada</label>
              <input type="date" value={form.fecha_programada} onChange={e=>setForm({...form,fecha_programada:e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Horas estimadas</label>
              <input type="number" value={form.horas_estimadas} onChange={e=>setForm({...form,horas_estimadas:e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 block mb-1">Descripción</label>
              <textarea value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})}
                rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none"/>
            </div>
          </div>
          <button onClick={handleCrear} disabled={guardando}
            className="w-full py-2.5 bg-[#1a3c34] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
            {guardando ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Crear orden
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <Search size={14} className="absolute left-3 top-3 text-slate-400"/>
          <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none"/>
        </div>
        <select value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm">
          <option value="todos">Todos los estados</option>
          {Object.entries(ESTADO_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filtroPrioridad} onChange={e=>setFiltroPrioridad(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm">
          <option value="todos">Todas las prioridades</option>
          {Object.entries(PRIORIDAD_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Lista */}
      {cargando ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-[#1a3c34]"/></div>
      ) : filtradas.length === 0 ? (
        <div className="flex flex-col items-center py-16 bg-white border border-slate-200 rounded-2xl">
          <ClipboardList size={36} className="text-slate-300 mb-3"/>
          <p className="text-slate-500">Sin órdenes de trabajo</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map((ot: any) => {
            const tc = TIPO_CONFIG[ot.tipo] || { label:ot.tipo, color:'bg-slate-100 text-slate-600', emoji:'📋' }
            const ec = ESTADO_CONFIG[ot.estado] || { label:ot.estado, color:'bg-slate-100 text-slate-600' }
            const pc = PRIORIDAD_CONFIG[ot.prioridad] || { label:ot.prioridad, color:'bg-slate-100 text-slate-600' }
            return (
              <div key={ot.id} onClick={() => abrirDetalle(ot)}
                className={`bg-white border-2 rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all ${
                  ot.prioridad==='urgente' ? 'border-red-300' : 'border-slate-200 hover:border-[#1a3c34]/30'
                }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-base">{tc.emoji}</span>
                      <p className="text-sm font-bold text-slate-900">{ot.titulo}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pc.color}`}>{pc.label}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ec.color}`}>{ec.label}</span>
                      {ot.parte_id && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                          <FileText size={9} /> Parte vinculado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      {ot.centro_nombre && <span className="flex items-center gap-1"><Building2 size={11}/>{ot.centro_nombre}</span>}
                      {ot.nombre_empleado && <span className="flex items-center gap-1"><User size={11}/>{ot.nombre_empleado}</span>}
                      {ot.fecha_programada && <span className="flex items-center gap-1"><Clock size={11}/>{ot.fecha_programada}</span>}
                      {ot.horas_estimadas > 0 && <span>{ot.horas_estimadas}h estimadas</span>}
                    </div>
                    {ot.descripcion && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{ot.descripcion}</p>}
                  </div>
                  <ChevronRight size={16} className="text-slate-300 flex-shrink-0 mt-1" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}