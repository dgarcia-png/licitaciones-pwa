import { useState, useEffect } from 'react'
import { api } from '../services/api'
import ConfirmModal from '../components/ConfirmModal'
import { ClipboardList, Plus, RefreshCw, Search, Loader2, CheckCircle2,
  AlertTriangle, X, Save, ChevronRight, Clock, User, Building2, Zap } from 'lucide-react'

const TIPO_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  programada:    { label: 'Programada',    color: 'bg-blue-100 text-blue-700',    emoji: '📅' },
  extraordinaria:{ label: 'Extraordinaria',color: 'bg-purple-100 text-purple-700',emoji: '⚡' },
  correctiva:    { label: 'Correctiva',    color: 'bg-red-100 text-red-700',      emoji: '🔧' },
  inspeccion:    { label: 'Inspección',    color: 'bg-amber-100 text-amber-700',  emoji: '🔍' },
  preventiva:    { label: 'Preventiva',    color: 'bg-emerald-100 text-emerald-700', emoji: '🛡️' },
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
  const [confirmDel, setConfirmDel] = useState<string|null>(null)
  const [cambiandoEstado, setCambiandoEstado] = useState<string|null>(null)

  const showMsg = (m: string, err=false) => {
    if(err) setError(m); else setMsg(m)
    setTimeout(()=>{ setMsg(''); setError('') },3000)
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
    } catch(e) {} finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  const handleCrear = async () => {
    if (!form.titulo || !form.centro_id) { showMsg('Título y centro son obligatorios', true); return }
    setGuardando(true)
    try {
      const r = await (api as any).crearOrden(form)
      if (r.ok) {
        showMsg('✅ Orden creada' + (r.alerta_prl ? ' · ⚠️ ' + r.alerta_prl : ''))
        setMostrarForm(false); setForm(FORM_VACIO); await cargar()
      } else showMsg(r.error||'Error', true)
    } catch(e) { showMsg('Error', true) } finally { setGuardando(false) }
  }

  const handleCambiarEstado = async (ot: any, estado: string) => {
    setCambiandoEstado(ot.id)
    try {
      const r = await (api as any).actualizarEstadoOrden({ id: ot.id, estado })
      if (r.ok) { showMsg('Estado actualizado'); await cargar() }
    } catch(e) {} finally { setCambiandoEstado(null) }
  }

  const handleEliminar = async (id: string) => {
    setGuardando(true)
    try {
      const r = await (api as any).eliminarOrden(id)
      if (r.ok) { showMsg('Orden eliminada'); setOtSel(null); await cargar() }
    } catch(e) {} finally { setGuardando(false); setConfirmDel(null) }
  }

  const onCentroChange = (id: string) => {
    const c = centros.find(x => x.id === id)
    setForm({ ...form, centro_id: id, centro_nombre: c?.nombre||'' })
  }
  const onEmpChange = (id: string) => {
    const e = empleados.find(x => x.id === id)
    setForm({ ...form, empleado_id: id, nombre_empleado: e ? (e.nombre+' '+e.apellidos) : '' })
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

      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e] rounded-xl shadow-lg">
            <ClipboardList size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Órdenes de trabajo</h1>
            <p className="text-sm text-slate-500">{pendientes} pendientes · {enProceso} en proceso{urgentes > 0 && <span className="text-red-600 font-bold"> · {urgentes} URGENTES</span>}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><RefreshCw size={16}/></button>
          <button onClick={() => setMostrarForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[#1a3c34] hover:bg-[#2d5a4e] text-white text-sm font-semibold rounded-xl">
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
                placeholder="Ej: Limpieza general edificio consistorial"
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
              <div key={ot.id} className={`bg-white border-2 rounded-2xl p-4 ${ot.prioridad==='urgente' ? 'border-red-300' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-base">{tc.emoji}</span>
                      <p className="text-sm font-bold text-slate-900">{ot.titulo}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pc.color}`}>{pc.label}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ec.color}`}>{ec.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      {ot.centro_nombre && <span className="flex items-center gap-1"><Building2 size={11}/>{ot.centro_nombre}</span>}
                      {ot.nombre_empleado && <span className="flex items-center gap-1"><User size={11}/>{ot.nombre_empleado}</span>}
                      {ot.fecha_programada && <span className="flex items-center gap-1"><Clock size={11}/>{ot.fecha_programada}</span>}
                      {ot.horas_estimadas > 0 && <span>{ot.horas_estimadas}h estimadas</span>}
                    </div>
                    {ot.descripcion && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{ot.descripcion}</p>}
                  </div>
                  <button onClick={() => setConfirmDel(ot.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0">
                    <X size={14}/>
                  </button>
                </div>
                {/* Botones de flujo */}
                {ot.estado !== 'completada' && ot.estado !== 'cancelada' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 flex-wrap">
                    {ot.estado === 'pendiente' && (
                      <button onClick={() => handleCambiarEstado(ot,'en_proceso')} disabled={cambiandoEstado===ot.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl">
                        {cambiandoEstado===ot.id ? <Loader2 size={12} className="animate-spin"/> : <Zap size={12}/>} Iniciar
                      </button>
                    )}
                    {ot.estado === 'en_proceso' && (
                      <button onClick={() => handleCambiarEstado(ot,'completada')} disabled={cambiandoEstado===ot.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl">
                        {cambiandoEstado===ot.id ? <Loader2 size={12} className="animate-spin"/> : <CheckCircle2 size={12}/>} Completar
                      </button>
                    )}
                    <button onClick={() => handleCambiarEstado(ot,'cancelada')} disabled={cambiandoEstado===ot.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl">
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}