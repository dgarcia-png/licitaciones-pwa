import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useConfigListas } from '../hooks/useConfigListas'
import { usePermisos } from '../hooks/usePermisos'
import {
  AlertTriangle, CheckCircle2, Clock, Plus, X, Save,
  Loader2, Filter, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react'

const PRIORIDAD_COLOR: Record<string, string> = {
  critica: 'bg-red-100 text-red-700 border-red-300',
  alta:    'bg-orange-100 text-orange-700 border-orange-300',
  media:   'bg-amber-100 text-amber-700 border-amber-300',
  baja:    'bg-slate-100 text-slate-600 border-slate-200',
}
const SLA_COLOR: Record<string, string> = {
  vencido:        'bg-red-500 text-white',
  proximo_vencer: 'bg-orange-400 text-white',
  en_plazo:       'bg-emerald-500 text-white',
}
const SLA_LABEL: Record<string, string> = {
  vencido:        '⛔ SLA vencido',
  proximo_vencer: '⚠️ Próximo a vencer',
  en_plazo:       '✅ En plazo',
}
const _DEFAULT_TIPOS = ['limpieza','mantenimiento','seguridad','averias','suministros','quejas','accidente','general']

function fmtDate(d: any) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric' }) } catch { return String(d) }
}

export default function IncidenciasPage() {
  const permisos = usePermisos()
  const { tiposIncidencia: TIPOS } = useConfigListas()
  const { esAdmin, esSupervisor } = permisos

  const [incidencias, setIncidencias] = useState<any[]>([])
  const [centros, setCentros] = useState<any[]>([])
  const [empleados, setEmpleados] = useState<any[]>([])
  const [dashboard, setDashboard] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('abierta')
  const [filtroPrioridad, setFiltroPrioridad] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [expandida, setExpandida] = useState<string|null>(null)
  const [form, setForm] = useState<any>({
    centro_id:'', centro_nombre:'', empleado_id:'', nombre_empleado:'',
    tipo:'general', descripcion:'', prioridad:'media'
  })

  const showMsg = (m: string, err=false) => {
    if(err) setError(m); else setMsg(m)
    setTimeout(()=>{ setMsg(''); setError('') }, 4000)
  }

  const cargar = async () => {
    setCargando(true)
    try {
      const [inc, c, emp, dash] = await Promise.all([
        api.incidencias(),
        api.centros(),
        api.empleados(),
        api.dashboardSLA().catch(() => null)
      ])
      setIncidencias(inc.incidencias || [])
      setCentros(c.centros || [])
      setEmpleados(emp.empleados || [])
      setDashboard(dash)
    } catch(e) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  const handleCrear = async () => {
    if (!form.descripcion || !form.centro_id) { showMsg('Centro y descripción son obligatorios', true); return }
    setGuardando(true)
    try {
      const r = await api.crearIncidencia(form)
      if (r.ok) {
        showMsg(`✅ Incidencia creada — SLA: ${r.sla_limite || '—'}`)
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
      if (r.ok) { showMsg('✅ Incidencia resuelta'); cargar() }
    } catch(e) {}
  }

  const handleCambiarEstado = async (id: string, estado: string) => {
    try {
      await api.resolverIncidencia({ id, estado })
      cargar()
    } catch(e) {}
  }

  const incFiltradas = incidencias.filter(i => {
    if (filtroEstado && i.estado !== filtroEstado) return false
    if (filtroPrioridad && i.prioridad !== filtroPrioridad) return false
    return true
  })

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Cabecera */}
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
          <button onClick={cargar} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setMostrarForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl">
            <Plus size={15} /> Nueva incidencia
          </button>
        </div>
      </div>

      {msg && <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-emerald-800 text-sm"><CheckCircle2 size={15}/>{msg}</div>}
      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-red-800 text-sm"><AlertTriangle size={15}/>{error}</div>}

      {/* KPIs SLA */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { l: 'Abiertas', v: dashboard.abiertas || 0, c: 'text-slate-800', bg: 'bg-slate-50' },
            { l: 'SLA vencido', v: dashboard.vencidas || 0, c: 'text-red-700', bg: 'bg-red-50' },
            { l: 'Próx. vencer', v: dashboard.proximo_vencer || 0, c: 'text-orange-700', bg: 'bg-orange-50' },
            { l: 'Críticas', v: dashboard.criticas || 0, c: 'text-red-700', bg: 'bg-red-50' },
          ].map((k, i) => (
            <div key={i} className={`${k.bg} rounded-2xl p-4 text-center border border-slate-200`}>
              <p className={`text-2xl font-black ${k.c}`}>{k.v}</p>
              <p className="text-xs text-slate-500 mt-0.5">{k.l}</p>
            </div>
          ))}
        </div>
      )}

      {/* Formulario nueva incidencia */}
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
                const c = centros.find(x => x.id === e.target.value)
                setForm({...form, centro_id: e.target.value, centro_nombre: c?.nombre || ''})
              }} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Seleccionar —</option>
                {centros.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Prioridad</label>
              <select value={form.prioridad} onChange={e => setForm({...form, prioridad: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="baja">Baja (7 días SLA)</option>
                <option value="media">Media (3 días SLA)</option>
                <option value="alta">Alta (24h SLA)</option>
                <option value="critica">Crítica (4h SLA)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Reportado por</label>
              <select value={form.empleado_id} onChange={e => {
                const emp = empleados.find(x => x.id === e.target.value)
                setForm({...form, empleado_id: e.target.value, nombre_empleado: emp ? `${emp.nombre} ${emp.apellidos}` : ''})
              }} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Opcional —</option>
                {empleados.filter(e => e.estado === 'activo').map(e => (
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
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
            {guardando ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Crear incidencia
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter size={14} className="text-slate-400" />
        {['abierta','en_proceso','resuelta',''].map(e => (
          <button key={e} onClick={() => setFiltroEstado(e)}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${filtroEstado === e ? 'bg-[#1a3c34] text-white' : 'bg-slate-100 text-slate-600'}`}>
            {e || 'Todas'}
          </button>
        ))}
        <div className="ml-auto">
          <select value={filtroPrioridad} onChange={e => setFiltroPrioridad(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white">
            <option value="">Todas las prioridades</option>
            <option value="critica">Crítica</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>
      </div>

      {/* Lista incidencias */}
      {cargando ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-red-500"/></div>
      ) : incFiltradas.length === 0 ? (
        <div className="flex flex-col items-center py-16 bg-white border border-slate-200 rounded-2xl">
          <CheckCircle2 size={36} className="text-emerald-400 mb-3"/>
          <p className="text-slate-500 font-medium">Sin incidencias {filtroEstado}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incFiltradas.map(inc => (
            <div key={inc.id} className={`bg-white border-2 rounded-2xl overflow-hidden ${
              inc.sla_estado === 'vencido' ? 'border-red-300' :
              inc.sla_estado === 'proximo_vencer' ? 'border-orange-300' :
              'border-slate-200'
            }`}>
              <div className="p-4 cursor-pointer" onClick={() => setExpandida(expandida === inc.id ? null : inc.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORIDAD_COLOR[inc.prioridad] || ''}`}>
                        {inc.prioridad?.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                        {inc.tipo}
                      </span>
                      {inc.sla_estado && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SLA_COLOR[inc.sla_estado] || 'bg-slate-200 text-slate-600'}`}>
                          {SLA_LABEL[inc.sla_estado] || inc.sla_estado}
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        inc.estado === 'resuelta' ? 'bg-emerald-100 text-emerald-700' :
                        inc.estado === 'en_proceso' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>{inc.estado}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 truncate">{inc.centro_nombre || '—'}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{inc.descripcion}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">{fmtDate(inc.fecha)}</p>
                      {inc.sla_limite && <p className="text-[9px] text-slate-400">Límite: {inc.sla_limite?.substring(0,10)}</p>}
                    </div>
                    {expandida === inc.id ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
                  </div>
                </div>
              </div>

              {/* Detalle expandido */}
              {expandida === inc.id && (
                <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><p className="text-slate-400">Reportado por</p><p className="font-semibold">{inc.nombre_empleado || '—'}</p></div>
                    <div><p className="text-slate-400">Asignado a</p><p className="font-semibold">{inc.asignado_a || '—'}</p></div>
                    <div><p className="text-slate-400">ID</p><p className="font-mono text-[10px]">{inc.id}</p></div>
                    {inc.fecha_resolucion && <div><p className="text-slate-400">Resuelto</p><p className="font-semibold">{fmtDate(inc.fecha_resolucion)}</p></div>}
                  </div>
                  {inc.resolucion && (
                    <div className="bg-emerald-50 rounded-xl p-3">
                      <p className="text-[10px] text-emerald-600 font-bold uppercase mb-1">Resolución</p>
                      <p className="text-xs text-emerald-800">{inc.resolucion}</p>
                    </div>
                  )}

                  {/* Acciones */}
                  {inc.estado !== 'resuelta' && (esAdmin || esSupervisor) && (
                    <div className="flex gap-2 flex-wrap">
                      {inc.estado === 'abierta' && (
                        <button onClick={() => handleCambiarEstado(inc.id, 'en_proceso')}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg">
                          🔧 Poner en proceso
                        </button>
                      )}
                      <ResolverForm id={inc.id} onResolver={handleResolver} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ResolverForm({ id, onResolver }: { id: string, onResolver: (id: string, res: string) => void }) {
  const [mostrar, setMostrar] = useState(false)
  const [texto, setTexto] = useState('')

  if (!mostrar) return (
    <button onClick={() => setMostrar(true)} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg">
      ✅ Resolver
    </button>
  )
  return (
    <div className="flex-1 flex gap-2">
      <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="Descripción de la resolución..."
        className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
      <button onClick={() => { onResolver(id, texto); setMostrar(false) }}
        className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg">OK</button>
      <button onClick={() => setMostrar(false)} className="px-2 py-1.5 bg-slate-100 rounded-lg text-xs">✕</button>
    </div>
  )
}