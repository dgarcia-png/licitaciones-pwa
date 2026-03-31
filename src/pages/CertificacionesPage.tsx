import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  Award, Plus, RefreshCw, Loader2, CheckCircle2, AlertTriangle, X, Save,
  Trash2, Search, User, Calendar, FileText, ExternalLink, ChevronDown, ChevronUp,
  Shield, Clock, AlertCircle
} from 'lucide-react'

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  vencido:         { label: 'VENCIDO',       color: 'text-red-700',     bg: 'bg-red-100' },
  por_vencer:      { label: 'Próx. vencer',  color: 'text-amber-700',   bg: 'bg-amber-100' },
  proximo:         { label: 'En plazo',      color: 'text-blue-700',    bg: 'bg-blue-100' },
  vigente:         { label: 'Vigente',        color: 'text-emerald-700', bg: 'bg-emerald-100' },
  sin_vencimiento: { label: 'Sin caducidad', color: 'text-slate-600',   bg: 'bg-slate-100' },
}

function fmtDate(d: any) {
  if (!d) return '—'
  try { return new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return String(d) }
}

export default function CertificacionesPage() {
  const { usuario } = useAuth()
  const [certs, setCerts] = useState<any[]>([])
  const [empleados, setEmpleados] = useState<any[]>([])
  const [dashboard, setDashboard] = useState<any>(null)
  const [tiposDisponibles, setTiposDisponibles] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [empSel, setEmpSel] = useState<string>('')
  const [certsSel, setCertsSel] = useState<any>(null)
  const [form, setForm] = useState<any>({
    empleado_id: '', tipo: '', descripcion: '', fecha_obtencion: '',
    fecha_vencimiento: '', numero_certificado: '', organismo_emisor: '', notas: ''
  })

  const showMsg = (m: string, err = false) => {
    if (err) setError(m); else setMsg(m)
    setTimeout(() => { setMsg(''); setError('') }, 4000)
  }

  const cargar = async () => {
    setCargando(true)
    try {
      const batch = await api.batchCertificaciones()
      setCerts(batch.certificaciones?.certificaciones || [])
      setEmpleados((batch.empleados?.empleados || []).filter((e: any) => e.estado === 'activo'))
      setDashboard(batch.dashboard || null)
      setTiposDisponibles(batch.dashboard?.tipos_disponibles || [])
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  const cargarCertsEmpleado = async (empId: string) => {
    setEmpSel(empId)
    if (!empId) { setCertsSel(null); return }
    try {
      const r = await api.certificacionesEmpleado(empId)
      setCertsSel(r)
    } catch (e) {}
  }

  const handleGuardar = async () => {
    if (!form.empleado_id || !form.tipo) { showMsg('Empleado y tipo obligatorios', true); return }
    setGuardando(true)
    try {
      if (editandoId) {
        const r = await api.actualizarCertificacion({ id: editandoId, ...form })
        if (r.ok) showMsg('✅ Certificación actualizada')
        else showMsg(r.error || 'Error', true)
      } else {
        const r = await api.agregarCertificacion(form)
        if (r.ok) showMsg('✅ Certificación registrada')
        else showMsg(r.error || 'Error', true)
      }
      setMostrarForm(false); setEditandoId(null)
      setForm({ empleado_id: '', tipo: '', descripcion: '', fecha_obtencion: '', fecha_vencimiento: '', numero_certificado: '', organismo_emisor: '', notas: '' })
      cargar()
      if (empSel) cargarCertsEmpleado(empSel)
    } catch (e) { showMsg('Error', true) }
    finally { setGuardando(false) }
  }

  const handleEditar = (c: any) => {
    setForm({
      empleado_id: c.empleado_id, tipo: c.tipo, descripcion: c.descripcion,
      fecha_obtencion: c.fecha_obtencion, fecha_vencimiento: c.fecha_vencimiento,
      numero_certificado: c.numero_certificado, organismo_emisor: c.organismo_emisor, notas: c.notas
    })
    setEditandoId(c.id)
    setMostrarForm(true)
  }

  const handleEliminar = async (id: string, desc: string) => {
    if (!confirm(`¿Eliminar certificación "${desc}"?`)) return
    try {
      await api.eliminarCertificacion(id)
      showMsg('Eliminado'); cargar()
      if (empSel) cargarCertsEmpleado(empSel)
    } catch (e) { showMsg('Error', true) }
  }

  // Filtrar
  const certsFiltrados = certs.filter(c => {
    if (filtroTipo && c.tipo !== filtroTipo) return false
    if (filtroEstado && c.estado !== filtroEstado) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (c.nombre_empleado || '').toLowerCase().includes(q) || (c.tipo || '').toLowerCase().includes(q) || (c.dni || '').includes(q)
    }
    return true
  })

  const alertasAltas = dashboard?.alertas?.filter((a: any) => a.nivel === 'alta')?.length || 0
  const alertasMedias = dashboard?.alertas?.filter((a: any) => a.nivel === 'media')?.length || 0

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e] rounded-xl shadow-lg">
            <Award size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Certificaciones y Carnets</h1>
            <p className="text-sm text-slate-500">
              {dashboard?.stats?.total || 0} certificaciones · {alertasAltas > 0 && <span className="text-red-600 font-bold">{alertasAltas} vencidos</span>}
              {alertasAltas > 0 && alertasMedias > 0 && ' · '}
              {alertasMedias > 0 && <span className="text-amber-600 font-bold">{alertasMedias} por vencer</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><RefreshCw size={16} /></button>
          <button onClick={() => { setForm({ empleado_id: '', tipo: '', descripcion: '', fecha_obtencion: '', fecha_vencimiento: '', numero_certificado: '', organismo_emisor: '', notas: '' }); setEditandoId(null); setMostrarForm(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1a3c34] hover:bg-[#2d5a4e] text-white text-sm font-semibold rounded-xl">
            <Plus size={15} /> Nueva certificación
          </button>
        </div>
      </div>

      {/* Stats */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
          {Object.entries(ESTADO_CONFIG).map(([key, cfg]) => (
            <div key={key} className={`${cfg.bg} rounded-xl p-3 text-center cursor-pointer hover:opacity-80`}
              onClick={() => setFiltroEstado(filtroEstado === key ? '' : key)}>
              <p className={`text-lg font-black ${cfg.color}`}>
                {key === 'vencido' ? dashboard.stats.vencidos :
                  key === 'por_vencer' ? dashboard.stats.por_vencer :
                  key === 'proximo' ? dashboard.stats.proximos :
                  key === 'vigente' ? dashboard.stats.vigentes :
                  dashboard.stats.sin_vencimiento || 0}
              </p>
              <p className="text-[10px] font-semibold text-slate-600">{cfg.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Alertas */}
      {dashboard?.alertas?.length > 0 && (
        <div className={`border-2 rounded-2xl p-4 mb-5 ${alertasAltas > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
            <AlertTriangle size={15} className={alertasAltas > 0 ? 'text-red-600' : 'text-amber-600'} />
            {dashboard.alertas.length} alertas de certificaciones
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {dashboard.alertas.slice(0, 10).map((a: any, i: number) => (
              <p key={i} className={`text-xs font-semibold ${a.nivel === 'alta' ? 'text-red-700' : 'text-amber-700'}`}>
                • {a.msg}
              </p>
            ))}
          </div>
        </div>
      )}

      {msg && <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-emerald-800 text-sm"><CheckCircle2 size={15} />{msg}</div>}
      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-red-800 text-sm"><AlertTriangle size={15} />{error}</div>}

      {/* Filtros */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre, DNI, tipo..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm" />
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
          <option value="">Todos los tipos</option>
          {tiposDisponibles.map((t: any) => <option key={t.id} value={t.label}>{t.label}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={empSel} onChange={e => cargarCertsEmpleado(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
          <option value="">Ver empleado...</option>
          {empleados.map((e: any) => <option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>)}
        </select>
      </div>

      {/* Vista empleado */}
      {empSel && certsSel && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-blue-900">
              <User size={14} className="inline mr-1" />
              {empleados.find(e => e.id === empSel)?.nombre} {empleados.find(e => e.id === empSel)?.apellidos}
              <span className="font-normal text-blue-600 ml-2">
                — {certsSel.total} certificaciones
                {certsSel.vencidos > 0 && <span className="text-red-600 font-bold"> · {certsSel.vencidos} vencidos</span>}
                {certsSel.por_vencer > 0 && <span className="text-amber-600 font-bold"> · {certsSel.por_vencer} por vencer</span>}
              </span>
            </p>
            <button onClick={() => { setEmpSel(''); setCertsSel(null) }}><X size={14} className="text-blue-400" /></button>
          </div>
          {certsSel.tipos_faltantes?.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-blue-700 mb-1">Certificaciones pendientes de registrar:</p>
              <div className="flex flex-wrap gap-1">
                {certsSel.tipos_faltantes.map((t: any) => (
                  <button key={t.id} onClick={() => {
                    setForm({ ...form, empleado_id: empSel, tipo: t.label, descripcion: t.label })
                    setEditandoId(null); setMostrarForm(true)
                  }}
                    className="text-[10px] px-2 py-1 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100 font-semibold">
                    + {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      {mostrarForm && (
        <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-slate-800">{editandoId ? 'Editar certificación' : 'Nueva certificación'}</p>
            <button onClick={() => { setMostrarForm(false); setEditandoId(null) }}><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Empleado *</label>
              <select value={form.empleado_id} onChange={e => setForm({ ...form, empleado_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Seleccionar —</option>
                {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellidos} — {e.dni}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Tipo de certificación *</label>
              <select value={form.tipo} onChange={e => {
                const sel = tiposDisponibles.find((t: any) => t.label === e.target.value)
                setForm({ ...form, tipo: e.target.value, descripcion: e.target.value })
              }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Seleccionar —</option>
                {tiposDisponibles.map((t: any) => <option key={t.id} value={t.label}>{t.label}</option>)}
                <option value="__otro">Otro (escribir)</option>
              </select>
              {form.tipo === '__otro' && (
                <input placeholder="Especificar tipo..." value={form.descripcion}
                  onChange={e => setForm({ ...form, tipo: e.target.value, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-blue-300 rounded-xl text-sm mt-1" />
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Fecha obtención</label>
              <input type="date" value={form.fecha_obtencion} onChange={e => setForm({ ...form, fecha_obtencion: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Fecha vencimiento</label>
              <input type="date" value={form.fecha_vencimiento} onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Nº certificado</label>
              <input value={form.numero_certificado} onChange={e => setForm({ ...form, numero_certificado: e.target.value })}
                placeholder="Código o número del documento" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Organismo emisor</label>
              <input value={form.organismo_emisor} onChange={e => setForm({ ...form, organismo_emisor: e.target.value })}
                placeholder="Ej: DGT, Junta de Andalucía..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600 block mb-1">Notas</label>
              <input value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })}
                placeholder="Observaciones" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            </div>
          </div>
          <button onClick={handleGuardar} disabled={guardando}
            className="w-full py-2.5 bg-[#1a3c34] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
            {guardando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {editandoId ? 'Actualizar' : 'Registrar certificación'}
          </button>
        </div>
      )}

      {/* Lista */}
      {cargando ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-[#1a3c34]" /></div>
      ) : certsFiltrados.length === 0 ? (
        <div className="flex flex-col items-center py-16 bg-white border border-slate-200 rounded-2xl">
          <Award size={36} className="text-slate-300 mb-3" />
          <p className="text-slate-500">Sin certificaciones{filtroTipo || filtroEstado || busqueda ? ' con estos filtros' : ''}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {certsFiltrados.map((c: any) => {
            const est = ESTADO_CONFIG[c.estado] || ESTADO_CONFIG.vigente
            return (
              <div key={c.id} className={`bg-white border-2 rounded-2xl p-4 ${c.estado === 'vencido' ? 'border-red-200' : c.estado === 'por_vencer' ? 'border-amber-200' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${est.bg} ${est.color}`}>
                        {est.label}
                      </span>
                      <span className="text-sm font-bold text-slate-900">{c.tipo}</span>
                      {c.dias_restantes !== null && c.dias_restantes !== undefined && (
                        <span className={`text-[10px] font-mono ${c.dias_restantes < 0 ? 'text-red-600' : c.dias_restantes <= 30 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {c.dias_restantes < 0 ? `hace ${Math.abs(c.dias_restantes)}d` : `${c.dias_restantes}d restantes`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><User size={11} /> {c.nombre_empleado}</span>
                      {c.dni && <span className="font-mono">{c.dni}</span>}
                      {c.numero_certificado && <span className="flex items-center gap-1"><FileText size={11} /> {c.numero_certificado}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                      {c.fecha_obtencion && <span>Obtenido: {fmtDate(c.fecha_obtencion)}</span>}
                      {c.fecha_vencimiento && <span>Vence: {fmtDate(c.fecha_vencimiento)}</span>}
                      {c.organismo_emisor && <span>{c.organismo_emisor}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => handleEditar(c)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                      <FileText size={13} />
                    </button>
                    <button onClick={() => handleEliminar(c.id, c.tipo + ' — ' + c.nombre_empleado)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
