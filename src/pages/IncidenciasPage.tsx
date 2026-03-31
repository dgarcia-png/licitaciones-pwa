import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
import { usePermisos } from '../hooks/usePermisos'
import {
  AlertTriangle, CheckCircle2, Clock, Plus, X, Save,
  Loader2, Filter, RefreshCw, ChevronDown, ChevronUp,
  User, MessageSquare, Send, ArrowUpCircle, Timer,
  Shield, Zap, AlertCircle, Search
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const PRIORIDAD_COLOR: Record<string, string> = {
  critica: 'bg-red-100 text-red-700 border-red-300',
  alta:    'bg-orange-100 text-orange-700 border-orange-300',
  media:   'bg-amber-100 text-amber-700 border-amber-300',
  baja:    'bg-slate-100 text-slate-600 border-slate-200',
}
const PRIORIDAD_ICON: Record<string, any> = {
  critica: Zap, alta: AlertCircle, media: Clock, baja: Shield,
}
const SLA_COLOR: Record<string, string> = {
  vencido:        'bg-red-600 text-white',
  proximo_vencer: 'bg-orange-500 text-white',
  en_plazo:       'bg-emerald-600 text-white',
  completado:     'bg-slate-400 text-white',
  sin_sla:        'bg-slate-200 text-slate-500',
}
const SLA_LABEL: Record<string, string> = {
  vencido:        '⛔ SLA vencido',
  proximo_vencer: '⚠️ Próximo a vencer',
  en_plazo:       '✅ En plazo',
  completado:     '✔ Completado',
  sin_sla:        '— Sin SLA',
}
const ESTADO_COLOR: Record<string, string> = {
  abierta:    'bg-amber-100 text-amber-700',
  en_proceso: 'bg-blue-100 text-blue-700',
  resuelta:   'bg-emerald-100 text-emerald-700',
  cerrada:    'bg-slate-100 text-slate-500',
}
const TIPOS = ['limpieza','mantenimiento','seguridad','averias','suministros','quejas','accidente','general']

function fmtDate(d: any) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric' }) } catch { return String(d) }
}

function fmtSLACountdown(horasRestantes: number | null): string {
  if (horasRestantes === null || horasRestantes === undefined) return '—'
  if (horasRestantes <= 0) {
    const h = Math.abs(Math.floor(horasRestantes))
    if (h >= 24) return `Vencido hace ${Math.floor(h/24)}d ${h%24}h`
    return `Vencido hace ${h}h`
  }
  if (horasRestantes >= 24) {
    const d = Math.floor(horasRestantes / 24)
    const h = Math.floor(horasRestantes % 24)
    return `${d}d ${h}h restantes`
  }
  if (horasRestantes >= 1) return `${Math.floor(horasRestantes)}h ${Math.round((horasRestantes % 1) * 60)}min`
  return `${Math.round(horasRestantes * 60)}min`
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function IncidenciasPage() {
  const permisos = usePermisos()
  const { esAdmin, esSupervisor } = permisos

  const [incidencias, setIncidencias] = useState<any[]>([])
  const [centros, setCentros] = useState<any[]>([])
  const [empleados, setEmpleados] = useState<any[]>([])
  const [dashboard, setDashboard] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('abierta')
  const [filtroPrioridad, setFiltroPrioridad] = useState('')
  const [filtroCentro, setFiltroCentro] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [expandida, setExpandida] = useState<string|null>(null)
  const [comentarios, setComentarios] = useState<any[]>([])
  const [cargandoComentarios, setCargandoComentarios] = useState(false)
  const [form, setForm] = useState<any>({
    centro_id:'', centro_nombre:'', empleado_id:'', nombre_empleado:'',
    tipo:'general', descripcion:'', prioridad:'media'
  })

  const showMsg = (m: string, err=false) => {
    if(err) setError(m); else setMsg(m)
    setTimeout(()=>{ setMsg(''); setError('') }, 4000)
  }

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [inc, c, emp, dash] = await Promise.allSettled([
        api.incidencias(),
        api.centros(),
        api.empleados(),
        api.dashboardSLA()
      ])
      if (inc.status === 'fulfilled') setIncidencias(inc.value.incidencias || [])
      if (c.status === 'fulfilled') setCentros(c.value.centros || [])
      if (emp.status === 'fulfilled') setEmpleados(emp.value.empleados || [])
      if (dash.status === 'fulfilled') setDashboard(dash.value)
    } catch(e) { console.error(e) }
    finally { setCargando(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // Cargar comentarios cuando se expande una incidencia
  useEffect(() => {
    if (!expandida) { setComentarios([]); return }
    const cargarComentarios = async () => {
      setCargandoComentarios(true)
      try {
        const r = await api.comentariosIncidencia(expandida)
        setComentarios(r.comentarios || [])
      } catch { setComentarios([]) }
      finally { setCargandoComentarios(false) }
    }
    cargarComentarios()
  }, [expandida])

  const handleCrear = async () => {
    if (!form.descripcion || !form.centro_id) { showMsg('Centro y descripción son obligatorios', true); return }
    setGuardando(true)
    try {
      const r = await api.crearIncidencia(form)
      if (r.ok) {
        showMsg(`✅ Incidencia creada — SLA: ${r.horas_sla || '?'}h → límite ${r.sla_limite || '—'}`)
        setMostrarForm(false)
        setForm({ centro_id:'', centro_nombre:'', empleado_id:'', nombre_empleado:'', tipo:'general', descripcion:'', prioridad:'media' })
        cargar()
      } else showMsg(r.error || 'Error', true)
    } catch(e) { showMsg('Error de conexión', true) }
    finally { setGuardando(false) }
  }

  const handleResolver = async (id: string, resolucion: string) => {
    try {
      const r = await api.resolverIncidencia({ id, estado: 'resuelta', resolucion })
      if (r.ok) {
        showMsg('✅ Incidencia resuelta')
        // Agregar comentario automático
        await api.agregarComentarioIncidencia({ incidencia_id: id, autor: 'Sistema', texto: 'Incidencia resuelta: ' + resolucion, tipo: 'estado' }).catch(() => {})
        cargar()
      }
    } catch(e) {}
  }

  const handleCambiarEstado = async (id: string, estado: string) => {
    try {
      await api.resolverIncidencia({ id, estado })
      await api.agregarComentarioIncidencia({ incidencia_id: id, autor: 'Sistema', texto: 'Estado cambiado a: ' + estado, tipo: 'estado' }).catch(() => {})
      cargar()
    } catch(e) {}
  }

  const handleAsignar = async (id: string, asignado_a: string) => {
    try {
      const r = await api.asignarIncidencia({ id, asignado_a, estado: 'en_proceso' })
      if (r.ok) {
        showMsg('✅ Incidencia asignada a ' + asignado_a)
        await api.agregarComentarioIncidencia({ incidencia_id: id, autor: 'Sistema', texto: 'Asignada a: ' + asignado_a, tipo: 'estado' }).catch(() => {})
        cargar()
      }
    } catch(e) {}
  }

  const handleComentario = async (incidenciaId: string, texto: string) => {
    if (!texto.trim()) return
    try {
      const r = await api.agregarComentarioIncidencia({ incidencia_id: incidenciaId, autor: 'Usuario', texto })
      if (r.ok) {
        setComentarios(prev => [...prev, { id: r.id, autor: 'Usuario', fecha: 'Ahora', texto, tipo: 'comentario' }])
      }
    } catch(e) {}
  }

  // ═══ FILTRADO ═══
  const incFiltradas = incidencias.filter(i => {
    if (filtroEstado && i.estado !== filtroEstado) return false
    if (filtroPrioridad && i.prioridad !== filtroPrioridad) return false
    if (filtroCentro && i.centro_id !== filtroCentro) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      if (!(i.descripcion||'').toLowerCase().includes(q) &&
          !(i.centro_nombre||'').toLowerCase().includes(q) &&
          !(i.nombre_empleado||'').toLowerCase().includes(q) &&
          !(i.id||'').toLowerCase().includes(q)) return false
    }
    return true
  })

  // Ordenar: vencidas primero, luego por prioridad
  const prioridadOrder: Record<string,number> = { critica: 0, alta: 1, media: 2, baja: 3 }
  const incOrdenadas = [...incFiltradas].sort((a, b) => {
    const slaA = a.sla_estado === 'vencido' ? 0 : a.sla_estado === 'proximo_vencer' ? 1 : 2
    const slaB = b.sla_estado === 'vencido' ? 0 : b.sla_estado === 'proximo_vencer' ? 1 : 2
    if (slaA !== slaB) return slaA - slaB
    return (prioridadOrder[a.prioridad] || 3) - (prioridadOrder[b.prioridad] || 3)
  })

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* ═══ CABECERA ═══ */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-red-600 to-red-700 rounded-xl shadow-lg">
            <AlertTriangle size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Incidencias</h1>
            <p className="text-sm text-slate-500">Gestión con SLA y escalado automático</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl" title="Refrescar">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setMostrarForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-red-200">
            <Plus size={15} /> Nueva
          </button>
        </div>
      </div>

      {msg && <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-emerald-800 text-sm"><CheckCircle2 size={15}/>{msg}</div>}
      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-red-800 text-sm"><AlertTriangle size={15}/>{error}</div>}

      {/* ═══ KPIs SLA ═══ */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { l: 'Abiertas', v: dashboard.abiertas || 0, c: 'text-slate-800', bg: 'bg-white', icon: AlertCircle },
            { l: 'SLA vencido', v: dashboard.vencidas || 0, c: 'text-red-700', bg: dashboard.vencidas > 0 ? 'bg-red-50' : 'bg-white', icon: Zap },
            { l: 'Próx. vencer', v: dashboard.proximo_vencer || 0, c: 'text-orange-700', bg: dashboard.proximo_vencer > 0 ? 'bg-orange-50' : 'bg-white', icon: Timer },
            { l: 'En plazo', v: dashboard.en_plazo || 0, c: 'text-emerald-700', bg: 'bg-white', icon: CheckCircle2 },
            { l: 'Críticas', v: dashboard.criticas || 0, c: 'text-red-700', bg: dashboard.criticas > 0 ? 'bg-red-50' : 'bg-white', icon: Shield },
          ].map((k, i) => {
            const Icon = k.icon
            return (
              <div key={i} className={`${k.bg} rounded-2xl p-4 border border-slate-200 ${k.v > 0 && i <= 2 ? 'ring-1 ring-red-200' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <Icon size={14} className="text-slate-400" />
                  {k.v > 0 && i <= 1 && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                </div>
                <p className={`text-2xl font-black ${k.c}`}>{k.v}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{k.l}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══ FORMULARIO NUEVA INCIDENCIA ═══ */}
      {mostrarForm && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-red-800">Nueva incidencia</p>
            <button onClick={() => setMostrarForm(false)}><X size={16} className="text-red-600"/></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 block mb-1">Centro *</label>
              <select value={form.centro_id} onChange={e => {
                const c = centros.find((x: any) => x.id === e.target.value)
                setForm({...form, centro_id: e.target.value, centro_nombre: c?.nombre || ''})
              }} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Seleccionar —</option>
                {centros.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Prioridad</label>
              <select value={form.prioridad} onChange={e => setForm({...form, prioridad: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="baja">🟢 Baja (7 días SLA)</option>
                <option value="media">🟡 Media (3 días SLA)</option>
                <option value="alta">🟠 Alta (24h SLA)</option>
                <option value="critica">🔴 Crítica (4h SLA)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Reportado por</label>
              <select value={form.empleado_id} onChange={e => {
                const emp = empleados.find((x: any) => x.id === e.target.value)
                setForm({...form, empleado_id: e.target.value, nombre_empleado: emp ? `${emp.nombre} ${emp.apellidos}` : ''})
              }} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Opcional —</option>
                {empleados.filter((e: any) => e.estado === 'activo').map((e: any) => (
                  <option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="text-xs font-semibold text-slate-600 block mb-1">Descripción *</label>
              <textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})}
                rows={3} placeholder="Describe la incidencia con detalle..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none" />
            </div>
          </div>
          <button onClick={handleCrear} disabled={guardando}
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
            {guardando ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Crear incidencia
          </button>
        </div>
      )}

      {/* ═══ FILTROS ═══ */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 mb-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Filter size={14} className="text-slate-400" />
          {[
            { v: 'abierta', l: 'Abiertas' },
            { v: 'en_proceso', l: 'En proceso' },
            { v: 'resuelta', l: 'Resueltas' },
            { v: '', l: 'Todas' },
          ].map(e => (
            <button key={e.v} onClick={() => setFiltroEstado(e.v)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${filtroEstado === e.v ? 'bg-[#1a3c34] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {e.l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por centro, descripción, ID..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white" />
          </div>
          <select value={filtroPrioridad} onChange={e => setFiltroPrioridad(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white">
            <option value="">Todas prioridades</option>
            <option value="critica">🔴 Crítica</option>
            <option value="alta">🟠 Alta</option>
            <option value="media">🟡 Media</option>
            <option value="baja">🟢 Baja</option>
          </select>
          <select value={filtroCentro} onChange={e => setFiltroCentro(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white max-w-[200px]">
            <option value="">Todos los centros</option>
            {centros.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
      </div>

      {/* ═══ CONTADOR ═══ */}
      <p className="text-xs text-slate-400 mb-3">{incOrdenadas.length} incidencias</p>

      {/* ═══ LISTA ═══ */}
      {cargando ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-red-500"/></div>
      ) : incOrdenadas.length === 0 ? (
        <div className="flex flex-col items-center py-16 bg-white border border-slate-200 rounded-2xl">
          <CheckCircle2 size={36} className="text-emerald-400 mb-3"/>
          <p className="text-slate-500 font-medium">Sin incidencias {filtroEstado || ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incOrdenadas.map(inc => {
            const PrioIcon = PRIORIDAD_ICON[inc.prioridad] || Clock
            return (
              <div key={inc.id} className={`bg-white border-2 rounded-2xl overflow-hidden transition-all ${
                inc.sla_estado === 'vencido' ? 'border-red-400 shadow-red-100 shadow-md' :
                inc.sla_estado === 'proximo_vencer' ? 'border-orange-300 shadow-orange-50 shadow-sm' :
                'border-slate-200'
              }`}>
                {/* Cabecera */}
                <div className="p-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExpandida(expandida === inc.id ? null : inc.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORIDAD_COLOR[inc.prioridad] || ''}`}>
                          <PrioIcon size={10} /> {(inc.prioridad||'').toUpperCase()}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                          {inc.tipo}
                        </span>
                        {inc.sla_estado && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SLA_COLOR[inc.sla_estado] || 'bg-slate-200 text-slate-600'}`}>
                            {SLA_LABEL[inc.sla_estado] || inc.sla_estado}
                          </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_COLOR[inc.estado] || 'bg-slate-100 text-slate-500'}`}>
                          {inc.estado}
                        </span>
                        {inc.escalaciones > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-red-600 text-white rounded-full">
                            <ArrowUpCircle size={10} className="inline mr-0.5" />ESC.{inc.escalaciones}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-900 truncate">{inc.centro_nombre || '—'}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{inc.descripcion}</p>
                      {inc.asignado_a && (
                        <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1">
                          <User size={10} /> {inc.asignado_a}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">{fmtDate(inc.fecha)}</p>
                        {inc.horas_restantes !== null && inc.estado !== 'resuelta' && inc.estado !== 'cerrada' && (
                          <p className={`text-[10px] font-bold mt-0.5 ${
                            inc.horas_restantes <= 0 ? 'text-red-600' :
                            inc.horas_restantes <= 2 ? 'text-orange-600' :
                            'text-emerald-600'
                          }`}>
                            <Timer size={10} className="inline mr-0.5" />
                            {fmtSLACountdown(inc.horas_restantes)}
                          </p>
                        )}
                      </div>
                      {expandida === inc.id ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
                    </div>
                  </div>
                </div>

                {/* ═══ DETALLE EXPANDIDO ═══ */}
                {expandida === inc.id && (
                  <div className="border-t border-slate-100 bg-slate-50">
                    {/* Info grid */}
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div><p className="text-slate-400">Reportado por</p><p className="font-semibold">{inc.nombre_empleado || '—'}</p></div>
                        <div><p className="text-slate-400">Asignado a</p><p className="font-semibold">{inc.asignado_a || 'Sin asignar'}</p></div>
                        <div><p className="text-slate-400">SLA</p><p className="font-semibold">{inc.sla_horas || '—'}h → {inc.sla_limite || '—'}</p></div>
                        <div><p className="text-slate-400">ID</p><p className="font-mono text-[10px]">{inc.id}</p></div>
                        {inc.fecha_resolucion && <div><p className="text-slate-400">Resuelto</p><p className="font-semibold">{inc.fecha_resolucion}</p></div>}
                        {inc.escalaciones > 0 && <div><p className="text-slate-400">Escalaciones</p><p className="font-semibold text-red-600">{inc.escalaciones} nivel(es)</p></div>}
                      </div>

                      {/* Resolución */}
                      {inc.resolucion && (
                        <div className="bg-emerald-50 rounded-xl p-3">
                          <p className="text-[10px] text-emerald-600 font-bold uppercase mb-1">Resolución</p>
                          <p className="text-xs text-emerald-800">{inc.resolucion}</p>
                        </div>
                      )}

                      {/* Barra SLA visual */}
                      {inc.sla_horas > 0 && inc.estado !== 'resuelta' && inc.estado !== 'cerrada' && (
                        <SLAProgressBar horasRestantes={inc.horas_restantes} horasTotal={inc.sla_horas} />
                      )}

                      {/* Acciones */}
                      {inc.estado !== 'resuelta' && inc.estado !== 'cerrada' && (esAdmin || esSupervisor) && (
                        <div className="flex gap-2 flex-wrap">
                          {inc.estado === 'abierta' && (
                            <button onClick={() => handleCambiarEstado(inc.id, 'en_proceso')}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors">
                              🔧 Poner en proceso
                            </button>
                          )}
                          <AsignarDropdown
                            empleados={empleados.filter((e: any) => e.estado === 'activo')}
                            onAsignar={(nombre) => handleAsignar(inc.id, nombre)}
                          />
                          <ResolverForm id={inc.id} onResolver={handleResolver} />
                        </div>
                      )}

                      {/* Comentarios */}
                      <ComentariosSection
                        incidenciaId={inc.id}
                        comentarios={comentarios}
                        cargando={cargandoComentarios}
                        onAgregar={handleComentario}
                      />
                    </div>
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

// ═══════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ═══════════════════════════════════════════════════════════════════════════════

function SLAProgressBar({ horasRestantes, horasTotal }: { horasRestantes: number | null, horasTotal: number }) {
  if (horasRestantes === null) return null
  const pct = Math.max(0, Math.min(100, (horasRestantes / horasTotal) * 100))
  const color = pct <= 0 ? 'bg-red-600' : pct <= 20 ? 'bg-orange-500' : pct <= 50 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div>
      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
        <span>SLA {horasTotal}h</span>
        <span className={horasRestantes <= 0 ? 'text-red-600 font-bold' : ''}>{fmtSLACountdown(horasRestantes)}</span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  )
}

function AsignarDropdown({ empleados, onAsignar }: { empleados: any[], onAsignar: (nombre: string) => void }) {
  const [mostrar, setMostrar] = useState(false)
  if (!mostrar) return (
    <button onClick={() => setMostrar(true)}
      className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1">
      <User size={12} /> Asignar
    </button>
  )
  return (
    <div className="flex gap-1 items-center">
      <select onChange={e => { if(e.target.value) { onAsignar(e.target.value); setMostrar(false) } }}
        className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg bg-white" defaultValue="">
        <option value="">— Seleccionar —</option>
        {empleados.map((e: any) => <option key={e.id} value={`${e.nombre} ${e.apellidos}`}>{e.nombre} {e.apellidos}</option>)}
      </select>
      <button onClick={() => setMostrar(false)} className="px-1.5 py-1 bg-slate-100 rounded text-xs">✕</button>
    </div>
  )
}

function ResolverForm({ id, onResolver }: { id: string, onResolver: (id: string, res: string) => void }) {
  const [mostrar, setMostrar] = useState(false)
  const [texto, setTexto] = useState('')

  if (!mostrar) return (
    <button onClick={() => setMostrar(true)}
      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors">
      ✅ Resolver
    </button>
  )
  return (
    <div className="flex-1 flex gap-2 min-w-0">
      <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="Descripción de la resolución..."
        className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs min-w-0"
        onKeyDown={e => { if(e.key === 'Enter' && texto.trim()) { onResolver(id, texto); setMostrar(false) } }} />
      <button onClick={() => { if(texto.trim()) { onResolver(id, texto); setMostrar(false) } }}
        className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg shrink-0">OK</button>
      <button onClick={() => setMostrar(false)} className="px-2 py-1.5 bg-slate-100 rounded-lg text-xs shrink-0">✕</button>
    </div>
  )
}

function ComentariosSection({ incidenciaId, comentarios, cargando, onAgregar }: {
  incidenciaId: string, comentarios: any[], cargando: boolean, onAgregar: (id: string, texto: string) => void
}) {
  const [texto, setTexto] = useState('')
  const [mostrar, setMostrar] = useState(false)

  return (
    <div className="border-t border-slate-200 pt-3">
      <button onClick={() => setMostrar(!mostrar)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700">
        <MessageSquare size={12} />
        Comentarios ({comentarios.length})
        {mostrar ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
      </button>

      {mostrar && (
        <div className="mt-2 space-y-2">
          {cargando ? (
            <div className="flex justify-center py-3"><Loader2 size={14} className="animate-spin text-slate-400"/></div>
          ) : (
            <>
              {comentarios.length === 0 && <p className="text-[10px] text-slate-400 italic">Sin comentarios</p>}
              {comentarios.map((c, i) => (
                <div key={i} className={`rounded-lg p-2 text-xs ${c.tipo === 'estado' ? 'bg-blue-50 border border-blue-100' : 'bg-white border border-slate-100'}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-slate-700">{c.autor}</span>
                    <span className="text-[10px] text-slate-400">{c.fecha}</span>
                    {c.tipo === 'estado' && <span className="text-[9px] bg-blue-200 text-blue-700 px-1.5 rounded-full font-bold">SISTEMA</span>}
                  </div>
                  <p className="text-slate-600">{c.texto}</p>
                </div>
              ))}
            </>
          )}

          {/* Input comentario */}
          <div className="flex gap-2">
            <input value={texto} onChange={e => setTexto(e.target.value)}
              placeholder="Añadir comentario..."
              className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
              onKeyDown={e => {
                if (e.key === 'Enter' && texto.trim()) {
                  onAgregar(incidenciaId, texto)
                  setTexto('')
                }
              }} />
            <button onClick={() => { if(texto.trim()) { onAgregar(incidenciaId, texto); setTexto('') } }}
              className="p-1.5 bg-[#1a3c34] text-white rounded-lg hover:bg-[#2d5a4e] transition-colors">
              <Send size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
