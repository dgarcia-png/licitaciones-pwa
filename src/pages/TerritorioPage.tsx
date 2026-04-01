import { SkeletonList } from '../components/Skeleton'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import ConfirmModal from '../components/ConfirmModal'
import {
  MapPin, Building2, Users, Euro, Plus, RefreshCw, Search,
  ChevronRight, Loader2, CheckCircle2, AlertTriangle, X,
  Save, Edit2, Trash2, UserPlus, UserMinus, Map, BarChart3
} from 'lucide-react'

const TIPO_SERVICIO_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  limpieza:     { label: 'Limpieza',     color: 'bg-blue-100 text-blue-700',    emoji: '🧹' },
  jardineria:   { label: 'Jardinería',   color: 'bg-emerald-100 text-emerald-700', emoji: '🌿' },
  mantenimiento:{ label: 'Mantenimiento',color: 'bg-amber-100 text-amber-700',  emoji: '🔧' },
  conserjeria:  { label: 'Conserjería',  color: 'bg-purple-100 text-purple-700',emoji: '🏢' },
  vigilancia:   { label: 'Vigilancia',   color: 'bg-slate-100 text-slate-700',  emoji: '🛡️' },
  residuos:     { label: 'Residuos',     color: 'bg-orange-100 text-orange-700',emoji: '♻️' },
}

const ESTADO_CONFIG: Record<string, { label: string; color: string }> = {
  activo:           { label: 'Activo',          color: 'bg-emerald-100 text-emerald-700' },
  suspendido:       { label: 'Suspendido',       color: 'bg-amber-100 text-amber-700' },
  finalizado:       { label: 'Finalizado',       color: 'bg-slate-100 text-slate-600' },
  pendiente_inicio: { label: 'Pendiente inicio', color: 'bg-blue-100 text-blue-700' },
}

function fmtEuro(n: number) {
  if (!n) return '—'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M €'
  if (n >= 1000) return Math.round(n / 1000) + 'K €'
  return n.toLocaleString('es-ES') + ' €'
}

const FORM_VACIO = {
  nombre: '', organismo: '', tipo: 'dependencia_municipal', direccion: '',
  municipio: '', provincia: 'Huelva', superficie_m2: '', tipo_servicio: 'limpieza',
  frecuencia: '', horario: '', responsable: '', presupuesto_anual: '',
  fecha_inicio: '', fecha_fin: '', estado: 'activo', notas: ''
}

export default function TerritorioPage() {
  const navigate = useNavigate()
  const [centros, setCentros] = useState<any[]>([])
  const [dashboard, setDashboard] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [vista, setVista] = useState<'lista' | 'nuevo' | 'detalle'>('lista')
  const [centroSel, setCentroSel] = useState<any>(null)
  const [form, setForm] = useState<any>(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [confirmEliminar, setConfirmEliminar] = useState(false)
  const [editando, setEditando] = useState(false)
  // Modal asignación personal
  const [modalAsignar, setModalAsignar] = useState(false)
  const [empleadosDisp, setEmpleadosDisp] = useState<any[]>([])
  const [formAsig, setFormAsig] = useState<any>({ empleado_id: '', horas_semanales: 40, turno: 'mañana' })
  const [confirmDesasignar, setConfirmDesasignar] = useState<string | null>(null)

  const showMsg = (m: string, err = false) => {
    if (err) setError(m); else setMsg(m)
    setTimeout(() => { setMsg(''); setError('') }, 3500)
  }

  const cargar = async () => {
    setCargando(true)
    try {
      const [c, d] = await Promise.all([
        api.centros(),
        api.dashboardTerritorio()
      ])
      setCentros(c.centros || [])
      setDashboard(d)
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  const handleGuardar = async () => {
    if (!form.nombre || !form.organismo) { showMsg('Nombre y organismo son obligatorios', true); return }
    setGuardando(true)
    try {
      const r = editando
        ? await api.actualizarCentro({ id: centroSel.id, ...form })
        : await api.crearCentro(form)
      if (r.ok) {
        showMsg(editando ? '✅ Centro actualizado' : '✅ Centro creado')
        setForm(FORM_VACIO); setEditando(false); setVista('lista')
        await cargar()
      } else showMsg(r.error || 'Error', true)
    } catch (e) { showMsg('Error de conexión', true) }
    finally { setGuardando(false) }
  }

  const handleEliminar = async () => {
    if (!centroSel) return
    setGuardando(true)
    try {
      const r = await api.eliminarCentro(centroSel.id)
      if (r.ok) { showMsg('Centro eliminado'); setVista('lista'); setCentroSel(null); await cargar() }
      else showMsg(r.error || 'Error', true)
    } catch (e) { showMsg('Error', true) }
    finally { setGuardando(false) }
  }

  const abrirDetalle = async (centro: any) => {
    setCentroSel(centro); setVista('detalle')
    try {
      const d = await api.centro(centro.id)
      if (!d.error) setCentroSel(d)
    } catch {}
  }

  const abrirModalAsignar = async () => {
    setFormAsig({ empleado_id: '', horas_semanales: 40, turno: 'mañana' })
    setModalAsignar(true)
    try {
      const r = await api.empleados()
      const asignadosIds = (centroSel.personal || []).map((p: any) => p.empleado_id)
      setEmpleadosDisp((r.empleados || []).filter((e: any) =>
        e.estado !== 'baja' && !asignadosIds.includes(e.id)
      ))
    } catch { setEmpleadosDisp([]) }
  }

  const handleAsignar = async () => {
    if (!formAsig.empleado_id) { showMsg('Selecciona un empleado', true); return }
    setGuardando(true)
    try {
      const emp = empleadosDisp.find((e: any) => e.id === formAsig.empleado_id)
      const r = await api.asignarPersonalCentro({
        centro_id: centroSel.id,
        empleado_id: formAsig.empleado_id,
        nombre_empleado: emp ? `${emp.nombre} ${emp.apellidos}` : '',
        dni: emp?.dni || '',
        categoria: emp?.categoria || '',
        horas_semanales: formAsig.horas_semanales,
        turno: formAsig.turno,
      })
      if (r.ok) {
        showMsg('✅ Empleado asignado')
        setModalAsignar(false)
        const d = await api.centro(centroSel.id)
        if (!d.error) setCentroSel(d)
        await cargar()
      } else showMsg(r.error || 'Error', true)
    } catch { showMsg('Error de conexión', true) }
    finally { setGuardando(false) }
  }

  const handleDesasignar = async (asigId: string) => {
    setGuardando(true)
    try {
      const r = await api.desasignarPersonalCentro(asigId)
      if (r.ok) {
        showMsg('✅ Empleado desasignado')
        setConfirmDesasignar(null)
        const d = await api.centro(centroSel.id)
        if (!d.error) setCentroSel(d)
        await cargar()
      } else showMsg(r.error || 'Error', true)
    } catch { showMsg('Error', true) }
    finally { setGuardando(false) }
  }

  const filtrados = centros.filter(c => {
    const matchBusq = !busqueda ||
      c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.organismo?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.municipio?.toLowerCase().includes(busqueda.toLowerCase())
    const matchTipo = filtroTipo === 'todos' || c.tipo_servicio === filtroTipo
    return matchBusq && matchTipo
  })

  // ── VISTA LISTA ──────────────────────────────────────────────────────────────
  if (vista === 'lista') return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e] rounded-xl shadow-lg">
            <MapPin size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Territorio</h1>
            <p className="text-sm text-slate-500">{dashboard?.total_centros || 0} centros · {dashboard?.total_personal || 0} personas · {fmtEuro(dashboard?.total_presupuesto || 0)}/año</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => { setForm(FORM_VACIO); setEditando(false); setVista('nuevo') }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1a3c34] hover:bg-[#2d5a4e] text-white text-sm font-semibold rounded-xl">
            <Plus size={15} /> Nuevo centro
          </button>
        </div>
      </div>

      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Centros activos', valor: dashboard.activos || 0, icon: Building2, color: 'text-[#1a3c34]' },
            { label: 'Personal asignado', valor: dashboard.total_personal || 0, icon: Users, color: 'text-blue-600' },
            { label: 'Presupuesto anual', valor: fmtEuro(dashboard.total_presupuesto || 0), icon: Euro, color: 'text-violet-600' },
            { label: 'Total centros', valor: dashboard.total_centros || 0, icon: MapPin, color: 'text-amber-600' },
          ].map((k, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4">
              <k.icon size={18} className={k.color + ' mb-2'} />
              <p className="text-2xl font-black text-slate-900">{k.valor}</p>
              <p className="text-xs text-slate-500 mt-1">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {msg && <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-emerald-800 text-sm"><CheckCircle2 size={15} />{msg}</div>}
      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-red-800 text-sm"><AlertTriangle size={15} />{error}</div>}

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-3 text-slate-400" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar centro, organismo, municipio..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c34]" />
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none">
          <option value="todos">Todos los servicios</option>
          {Object.entries(TIPO_SERVICIO_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.emoji} {v.label}</option>
          ))}
        </select>
      </div>

      {cargando ? (
        <SkeletonList count={4} />
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center py-20 bg-white border border-slate-200 rounded-2xl">
          <MapPin size={40} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">{centros.length === 0 ? 'No hay centros registrados' : 'Sin resultados'}</p>
          {centros.length === 0 && (
            <button onClick={() => { setForm(FORM_VACIO); setVista('nuevo') }}
              className="mt-4 px-5 py-2 bg-[#1a3c34] text-white text-sm font-semibold rounded-xl">
              Crear primer centro
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((c: any) => {
            const ts = TIPO_SERVICIO_CONFIG[c.tipo_servicio] || { label: c.tipo_servicio, color: 'bg-slate-100 text-slate-600', emoji: '📋' }
            const es = ESTADO_CONFIG[c.estado] || { label: c.estado, color: 'bg-slate-100 text-slate-600' }
            return (
              <div key={c.id} onClick={() => abrirDetalle(c)}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#1a3c34]/30 hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#e8f0ee] flex items-center justify-center text-lg flex-shrink-0">
                    {ts.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900 truncate">{c.nombre}</p>
                        <p className="text-xs text-slate-500">{c.organismo}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${es.color}`}>{es.label}</span>
                        <ChevronRight size={15} className="text-slate-300" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      {c.municipio && <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={11} className="text-slate-400" />{c.municipio}</span>}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ts.color}`}>{ts.emoji} {ts.label}</span>
                      {c.personal_asignado > 0 && <span className="text-xs text-slate-500 flex items-center gap-1"><Users size={11} />{c.personal_asignado} personas</span>}
                      {c.presupuesto_anual > 0 && <span className="text-xs text-slate-500 flex items-center gap-1"><Euro size={11} />{fmtEuro(c.presupuesto_anual)}/año</span>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // ── VISTA NUEVO / EDITAR ─────────────────────────────────────────────────────
  if (vista === 'nuevo' || editando) return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => { setVista('lista'); setEditando(false) }} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500"><X size={18} /></button>
        <h2 className="text-xl font-bold text-slate-900">{editando ? 'Editar centro' : 'Nuevo centro de servicio'}</h2>
      </div>
      {msg && <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-emerald-800 text-sm"><CheckCircle2 size={15} />{msg}</div>}
      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-red-800 text-sm"><AlertTriangle size={15} />{error}</div>}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Nombre del centro *</label>
          <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Ayuntamiento de Almonte — Limpieza" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c34]" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Organismo contratante *</label>
          <input value={form.organismo} onChange={e => setForm({ ...form, organismo: e.target.value })} placeholder="Ej: Ayuntamiento de Almonte" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c34]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Tipo de servicio</label>
            <select value={form.tipo_servicio} onChange={e => setForm({ ...form, tipo_servicio: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none">
              {Object.entries(TIPO_SERVICIO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Estado</label>
            <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none">
              {Object.entries(ESTADO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Dirección</label>
          <input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} placeholder="Calle, número..." className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c34]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Municipio</label>
            <input value={form.municipio} onChange={e => setForm({ ...form, municipio: e.target.value })} placeholder="Almonte..." className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c34]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Superficie (m²)</label>
            <input type="number" value={form.superficie_m2} onChange={e => setForm({ ...form, superficie_m2: e.target.value })} placeholder="0" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c34]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Frecuencia servicio</label>
            <input value={form.frecuencia} onChange={e => setForm({ ...form, frecuencia: e.target.value })} placeholder="Diaria, 3 veces/semana..." className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c34]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Horario</label>
            <input value={form.horario} onChange={e => setForm({ ...form, horario: e.target.value })} placeholder="07:00 - 15:00" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c34]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Presupuesto anual (€)</label>
            <input type="number" value={form.presupuesto_anual} onChange={e => setForm({ ...form, presupuesto_anual: e.target.value })} placeholder="0" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c34]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Responsable Forgeser</label>
            <input value={form.responsable} onChange={e => setForm({ ...form, responsable: e.target.value })} placeholder="Nombre del responsable" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c34]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Fecha inicio contrato</label>
            <input type="date" value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c34]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Fecha fin contrato</label>
            <input type="date" value={form.fecha_fin} onChange={e => setForm({ ...form, fecha_fin: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c34]" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Notas</label>
          <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={3} placeholder="Observaciones..." className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c34] resize-none" />
        </div>
        <button onClick={handleGuardar} disabled={guardando} className="w-full flex items-center justify-center gap-2 py-3 bg-[#1a3c34] hover:bg-[#2d5a4e] disabled:bg-slate-300 text-white text-sm font-bold rounded-xl">
          {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear centro'}
        </button>
      </div>
    </div>
  )

  // ── VISTA DETALLE ────────────────────────────────────────────────────────────
  if (vista === 'detalle' && centroSel) {
    const ts = TIPO_SERVICIO_CONFIG[centroSel.tipo_servicio] || { label: centroSel.tipo_servicio, color: 'bg-slate-100 text-slate-600', emoji: '📋' }
    const es = ESTADO_CONFIG[centroSel.estado] || { label: centroSel.estado, color: 'bg-slate-100 text-slate-600' }

    return (
      <div className="p-6 lg:p-8 max-w-4xl">

        <ConfirmModal open={confirmEliminar} titulo={`¿Eliminar "${centroSel.nombre}"?`}
          mensaje="Se eliminará el centro y todas sus asignaciones. Esta acción no se puede deshacer."
          labelOk="Sí, eliminar" peligroso cargando={guardando}
          onConfirm={() => { setConfirmEliminar(false); handleEliminar() }}
          onCancel={() => setConfirmEliminar(false)} />

        <ConfirmModal open={!!confirmDesasignar} titulo="¿Desasignar empleado?"
          mensaje="El empleado dejará de estar asignado a este centro. Su ficha se actualizará automáticamente."
          labelOk="Sí, desasignar" peligroso cargando={guardando}
          onConfirm={() => confirmDesasignar && handleDesasignar(confirmDesasignar)}
          onCancel={() => setConfirmDesasignar(null)} />

        {/* Modal asignar empleado */}
        {modalAsignar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setModalAsignar(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900">Asignar empleado al centro</h3>
                <button onClick={() => setModalAsignar(false)}><X size={18} className="text-slate-400" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Empleado *</label>
                  <select value={formAsig.empleado_id}
                    onChange={(e: any) => setFormAsig({ ...formAsig, empleado_id: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white">
                    <option value="">— Seleccionar empleado —</option>
                    {empleadosDisp.map((e: any) => (
                      <option key={e.id} value={e.id}>{e.nombre} {e.apellidos} — {e.categoria || 'Sin categoría'}</option>
                    ))}
                  </select>
                  {empleadosDisp.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">No hay empleados disponibles sin asignar a este centro</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Horas semanales</label>
                    <input type="number" min={1} max={40} value={formAsig.horas_semanales}
                      onChange={(e: any) => setFormAsig({ ...formAsig, horas_semanales: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Turno</label>
                    <select value={formAsig.turno}
                      onChange={(e: any) => setFormAsig({ ...formAsig, turno: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white">
                      <option value="mañana">Mañana</option>
                      <option value="tarde">Tarde</option>
                      <option value="noche">Noche</option>
                      <option value="partido">Partido</option>
                    </select>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-blue-700">Al asignar, el campo <strong>Centro</strong> y <strong>Zona</strong> de la ficha del empleado se actualizarán automáticamente.</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={handleAsignar} disabled={guardando || !formAsig.empleado_id}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1a3c34] hover:bg-[#2d5a4e] disabled:bg-slate-300 text-white text-sm font-bold rounded-xl">
                    {guardando ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Asignar
                  </button>
                  <button onClick={() => setModalAsignar(false)} className="px-4 py-2.5 bg-slate-100 text-slate-600 text-sm rounded-xl">Cancelar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cabecera */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <button onClick={() => setVista('lista')} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 mt-1"><X size={18} /></button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{ts.emoji}</span>
                <h1 className="text-xl font-bold text-slate-900">{centroSel.nombre}</h1>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-slate-500">{centroSel.organismo}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${es.color}`}>{es.label}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ts.color}`}>{ts.label}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setForm({ ...centroSel }); setEditando(true); setVista('nuevo') }}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl">
              <Edit2 size={13} /> Editar
            </button>
            <button onClick={() => setConfirmEliminar(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl">
              <Trash2 size={13} /> Eliminar
            </button>
          </div>
        </div>

        {msg && <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-emerald-800 text-sm"><CheckCircle2 size={15} />{msg}</div>}
        {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-red-800 text-sm"><AlertTriangle size={15} />{error}</div>}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Personal', valor: centroSel.personal_asignado || 0, icon: Users },
            { label: 'Superficie', valor: centroSel.superficie_m2 ? centroSel.superficie_m2 + ' m²' : '—', icon: Building2 },
            { label: 'Presupuesto/año', valor: fmtEuro(centroSel.presupuesto_anual), icon: Euro },
            { label: 'Frecuencia', valor: centroSel.frecuencia || '—', icon: BarChart3 },
          ].map((k, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
              <k.icon size={16} className="text-slate-400 mx-auto mb-1" />
              <p className="text-lg font-black text-slate-900">{k.valor}</p>
              <p className="text-[10px] text-slate-500 uppercase">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Datos contrato */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Datos del contrato</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {[
              ['Dirección', centroSel.direccion], ['Municipio', centroSel.municipio],
              ['Horario', centroSel.horario], ['Responsable', centroSel.responsable],
              ['Inicio contrato', centroSel.fecha_inicio], ['Fin contrato', centroSel.fecha_fin],
            ].filter(([, v]) => v).map(([l, v]) => (
              <div key={String(l)} className="flex gap-2">
                <span className="text-xs text-slate-400 min-w-24">{l}</span>
                <span className="text-xs text-slate-700 font-medium">{String(v)}</span>
              </div>
            ))}
          </div>
          {centroSel.notas && <div className="mt-3 p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-600">{centroSel.notas}</p></div>}
          {centroSel.oportunidad_id && (
            <button onClick={() => navigate('/oportunidades/' + centroSel.oportunidad_id)}
              className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold">
              <ChevronRight size={13} /> Ver licitación de origen
            </button>
          )}
        </div>

        {/* Personal asignado */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users size={14} className="text-[#1a3c34]" /> Personal asignado
            </h3>
            <button onClick={abrirModalAsignar}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a3c34] hover:bg-[#2d5a4e] text-white text-xs font-bold rounded-xl transition-colors">
              <UserPlus size={13} /> Asignar
            </button>
          </div>
          {!centroSel.personal || centroSel.personal.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-xl">
              <Users size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Sin personal asignado</p>
              <p className="text-xs text-slate-300 mt-1">Pulsa "Asignar" para añadir trabajadores a este centro</p>
            </div>
          ) : (
            <div className="space-y-2">
              {centroSel.personal.map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-[#1a3c34] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {(p.nombre || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{p.nombre}</p>
                    <p className="text-xs text-slate-500">{p.categoria} · {p.horas_semanales}h/sem · Turno {p.turno}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">{p.estado}</span>
                  <button onClick={() => setConfirmDesasignar(p.id)}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Desasignar">
                    <UserMinus size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cuadrante semanal */}
        {centroSel.personal && centroSel.personal.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BarChart3 size={14} className="text-violet-600" /> Cuadrante semanal
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left font-semibold text-slate-500 pb-2 pr-4 min-w-32">Trabajador</th>
                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                      <th key={d} className="text-center font-semibold text-slate-500 pb-2 w-10">{d}</th>
                    ))}
                    <th className="text-right font-semibold text-slate-500 pb-2 pl-4">H/sem</th>
                  </tr>
                </thead>
                <tbody>
                  {centroSel.personal.map((p: any) => {
                    const turno = p.turno || 'mañana'
                    const horas = Number(p.horas_semanales) || 40
                    const colorTurno = turno === 'mañana' ? 'bg-amber-100 text-amber-700' : turno === 'tarde' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                    return (
                      <tr key={p.id} className="border-t border-slate-50">
                        <td className="py-2 pr-4">
                          <p className="font-semibold text-slate-800 truncate max-w-32">{p.nombre}</p>
                          <p className="text-[10px] text-slate-400">{p.categoria}</p>
                        </td>
                        {[0,1,2,3,4,5,6].map(dia => (
                          <td key={dia} className="text-center py-2">
                            {dia < 5 ? (
                              <span className={`inline-block w-6 h-6 rounded-md text-[9px] font-bold flex items-center justify-center ${colorTurno}`}>
                                {turno[0].toUpperCase()}
                              </span>
                            ) : (
                              <span className="inline-block w-6 h-6 rounded-md bg-slate-50 text-slate-300 text-[9px] flex items-center justify-center">—</span>
                            )}
                          </td>
                        ))}
                        <td className="text-right py-2 pl-4 font-bold text-slate-700">{horas}h</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="border-t-2 border-slate-200">
                  <tr>
                    <td className="pt-2 text-xs font-bold text-slate-700">Total</td>
                    <td colSpan={7}></td>
                    <td className="pt-2 text-right text-xs font-black text-[#1a3c34]">
                      {centroSel.personal.reduce((s: number, p: any) => s + (Number(p.horas_semanales) || 0), 0)}h
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="flex gap-3 mt-3 pt-3 border-t border-slate-100">
              <span className="text-[10px] text-slate-500 flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-amber-100 text-amber-700 text-[9px] font-bold flex items-center justify-center">M</span> Mañana</span>
              <span className="text-[10px] text-slate-500 flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-blue-100 text-blue-700 text-[9px] font-bold flex items-center justify-center">T</span> Tarde</span>
              <span className="text-[10px] text-slate-500 flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-slate-100 text-slate-600 text-[9px] font-bold flex items-center justify-center">N</span> Noche</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}
