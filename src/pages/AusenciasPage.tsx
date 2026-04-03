import { SkeletonPage } from '../components/Skeleton'
import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { usePermisos } from '../hooks/usePermisos'
import { Loader2, Plus, Calendar, CheckCircle2, XCircle, Clock, Users, ChevronLeft, ChevronRight, Save, X, Trash2, Sun, Stethoscope, AlertTriangle } from 'lucide-react'

function fmtDate(d: any) { if (!d) return ''; try { const date = new Date(d); if (isNaN(date.getTime())) return String(d); return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return String(d) } }

export default function AusenciasPage() {
  const { usuario } = useAuth()
  const { esAdmin, esSupervisor, soloSusDatos, puedeAprobarAusencias, centrosAsignados, rol } = usePermisos()
  const [tab, setTab] = useState('solicitudes')
  const [cargando, setCargando] = useState(true)
  const [ausencias, setAusencias] = useState<any[]>([])
  const [tipos, setTipos] = useState<any[]>([])
  const [empleados, setEmpleados] = useState<any[]>([])
  const [dashboard, setDashboard] = useState<any>(null)
  const [resumenVac, setResumenVac] = useState<any>(null)
  const [calendario, setCalendario] = useState<any>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState<any>({})
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [filtroEstado, setFiltroEstado] = useState('')

  const mesesNombre = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  const cargar = async () => {
    setCargando(true)
    try {
      const [aus, emps, dash] = await Promise.all([
        api.ausencias(filtroEstado ? { estado: filtroEstado } : {}),
        api.empleados(),
        api.dashboardAusencias()
      ])
      let ausFiltered = aus.ausencias || []
      let empsFiltered = (emps.empleados || []).filter((e: any) => e.estado === 'activo')

      // Trabajador: solo ve sus propias ausencias
      if (soloSusDatos) {
        ausFiltered = ausFiltered.filter((a: any) => (a.empleado_id || a.id_empleado) === (empsFiltered.find((e: any) => e.email === usuario?.email)?.id))
      }
      // Supervisor: solo ve su equipo
      else if (esSupervisor && !esAdmin && centrosAsignados.length > 0) {
        empsFiltered = empsFiltered.filter((e: any) => centrosAsignados.includes(e.centro) || centrosAsignados.includes(e.zona))
        const idsEquipo = new Set(empsFiltered.map((e: any) => e.id))
        ausFiltered = ausFiltered.filter((a: any) => idsEquipo.has(a.empleado_id || a.id_empleado))
      }

      setAusencias(ausFiltered)
      setTipos(aus.tipos || [])
      setEmpleados(empsFiltered)
      setDashboard(dash)
    } catch (e: any) { console.error(e) }
    finally { setCargando(false) }
  }

  const cargarCalendario = async (m: number, a: number) => {
    setCargando(true)
    try { const data = await api.calendarioAusencias(String(m), String(a)); setCalendario(data) } catch(e) {}
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [filtroEstado])
  // Cargar vacaciones del propio trabajador al montar
  useEffect(() => {
    if (soloSusDatos) {
      api.empleados().then((d: any) => {
        const miEmp = (d.empleados || []).find((e: any) => e.email === usuario?.email)
        if (miEmp) api.resumenVacaciones(miEmp.id).then((r: any) => setResumenVac(r)).catch(() => {})
      }).catch(() => {})
    }
  }, [soloSusDatos])
  useEffect(() => { if (tab === 'calendario') cargarCalendario(mes, anio) }, [tab, mes, anio])

  const selEmpleado = (id: string) => {
    const emp = empleados.find((e: any) => e.id === id)
    if (emp) {
      setForm({ ...form, id_empleado: id, nombre_empleado: emp.nombre + ' ' + emp.apellidos, dni: emp.dni, centro: emp.centro })
      api.resumenVacaciones(id).then((r: any) => setResumenVac(r)).catch(() => {})
    }
  }

  const selTipo = (tipoId: string) => {
    const tipo = tipos.find((t: any) => t.id === tipoId)
    setForm({ ...form, tipo: tipoId })
    if (tipo && tipo.dias_defecto > 0 && form.fecha_inicio) {
      const fi = new Date(form.fecha_inicio)
      const ff = new Date(fi)
      ff.setDate(ff.getDate() + tipo.dias_defecto - 1)
      setForm((prev: any) => ({ ...prev, tipo: tipoId, fecha_fin: ff.toISOString().split('T')[0], dias: tipo.dias_defecto }))
    }
  }

  const handleSolicitar = async () => {
    setGuardando(true); setMsg('')
    try {
      const result = await api.solicitarAusencia(form)
      if (result?.ok) {
        setMsg('✅ Solicitud registrada (' + result.dias + ' días) — Estado: ' + result.estado)
        setMostrarForm(false); setForm({}); setResumenVac(null); cargar()
      } else setMsg('❌ ' + (result?.error || 'Error'))
    } catch (e: any) { setMsg('❌ Error') }
    finally { setGuardando(false); setTimeout(() => setMsg(''), 4000) }
  }

  const aprobar = async (id: string, estado: string, motivoRechazo?: string) => {
    if (estado === 'rechazada' && !motivoRechazo) {
      const motivo = prompt('Motivo del rechazo (obligatorio):')
      if (!motivo) return
      return aprobar(id, estado, motivo)
    }
    try {
      const r = await api.aprobarAusencia({ id, estado, aprobado_por: usuario?.nombre || '', motivo_rechazo: motivoRechazo || '' })
      if (r.ok) {
        const msg = estado === 'aprobada' ? 'Aprobada' : estado === 'pendiente' ? 'Revertida a pendiente' : 'Rechazada'
        setMsg('✅ ' + msg); cargar()
      }
    } catch(e) {}
    setTimeout(() => setMsg(''), 3000)
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar esta solicitud?')) return
    try { const r = await api.eliminarAusencia(id); if (r.ok) { setMsg('✅ Eliminada'); cargar() } } catch(e) {}
    setTimeout(() => setMsg(''), 3000)
  }

  const s = dashboard?.stats || {}
  if (cargando && ausencias.length === 0 && !dashboard) return <div className="p-6 lg:p-8"><SkeletonPage /></div>

  // Generar días del mes para calendario
  const generarDiasMes = () => {
    const primer = new Date(anio, mes - 1, 1)
    const ultimo = new Date(anio, mes, 0)
    const dias = []
    for (let d = 1; d <= ultimo.getDate(); d++) {
      const fecha = `${anio}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      const dow = new Date(anio, mes - 1, d).getDay()
      dias.push({ dia: d, fecha, dow, esFinSemana: dow === 0 || dow === 6 })
    }
    return dias
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-violet-700 to-purple-600 rounded-xl shadow-lg shadow-violet-200"><Sun size={22} className="text-white" /></div>
        <div><h1 className="text-2xl font-bold text-slate-900">Ausencias y Permisos</h1><p className="text-sm text-slate-500">{s.pendientes || 0} pendientes · {s.hoy_ausentes || 0} ausentes hoy</p></div>
      </div>

      {/* Banner vacaciones para trabajador (vista simplificada) */}
      {soloSusDatos && resumenVac && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5 flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Sun size={24} className="text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-blue-900">Tus vacaciones {new Date().getFullYear()}</p>
              <p className="text-xs text-blue-600">Saldo disponible: <strong>{resumenVac.dias_pendientes} días</strong></p>
            </div>
          </div>
          <div className="flex gap-4 text-xs text-blue-700 ml-auto">
            <div className="text-center"><p className="font-bold">{resumenVac.dias_totales}</p><p>Total</p></div>
            <div className="text-center"><p className="font-bold">{resumenVac.dias_disfrutados}</p><p>Disfrutados</p></div>
            <div className="text-center"><p className="font-bold text-amber-700">{resumenVac.dias_solicitados}</p><p>Pendientes</p></div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6">
        {[{id:'solicitudes',label:'Solicitudes',icon:Calendar},{id:'calendario',label:'Calendario',icon:Users}].map((t: any) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 py-2.5 px-4 rounded-lg text-xs font-medium whitespace-nowrap ${tab === t.id ? 'bg-white shadow text-[#1a3c34]' : 'text-slate-500'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {msg && <div className={`mb-4 p-4 rounded-xl text-sm font-medium ${msg.includes('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}

      {/* ═══ SOLICITUDES ═══ */}
      {tab === 'solicitudes' && (
        <div>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center"><p className="text-[10px] text-slate-500 uppercase font-bold">Pendientes</p><p className="text-2xl font-black text-amber-600">{s.pendientes || 0}</p></div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center"><p className="text-[10px] text-slate-500 uppercase font-bold">Aprobadas</p><p className="text-2xl font-black text-emerald-600">{s.aprobadas || 0}</p></div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center"><p className="text-[10px] text-slate-500 uppercase font-bold">Rechazadas</p><p className="text-2xl font-black text-red-600">{s.rechazadas || 0}</p></div>
            <div className={`border rounded-xl p-4 text-center ${s.hoy_ausentes > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}><p className="text-[10px] text-slate-500 uppercase font-bold">Ausentes hoy</p><p className="text-2xl font-black">{s.hoy_ausentes || 0}</p></div>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              {['','pendiente','aprobada','rechazada'].map((e: string) => (
                <button key={e} onClick={() => setFiltroEstado(e)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filtroEstado === e ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>
                  {e === '' ? 'Todas' : e === 'pendiente' ? 'Pendientes' : e === 'aprobada' ? 'Aprobadas' : 'Rechazadas'}
                </button>
              ))}
            </div>
            <button onClick={() => { setMostrarForm(!mostrarForm); setForm({}); setResumenVac(null) }} className="flex items-center gap-2 px-5 py-3 bg-violet-700 hover:bg-violet-800 text-white text-sm font-bold rounded-xl shadow-lg shadow-violet-200"><Plus size={16} /> Nueva solicitud</button>
          </div>

          {/* Formulario */}
          {mostrarForm && (
            <div className="bg-violet-50 border-2 border-violet-200 rounded-2xl p-6 mb-6">
              <h4 className="text-base font-bold text-violet-800 mb-4">Nueva solicitud de ausencia</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="md:col-span-2"><label className="text-xs text-slate-600 font-semibold">Personal *</label>
                  <select value={form.id_empleado||''} onChange={(e: any) => selEmpleado(e.target.value)} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white">
                    <option value="">— Seleccionar —</option>
                    {empleados.filter((e: any) => e.estado === 'activo').map((e: any) => <option key={e.id} value={e.id}>{e.nombre} {e.apellidos} ({e.dni})</option>)}
                  </select>
                </div>
                {resumenVac && (
                  <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-6">
                    <div className="text-center"><p className="text-[10px] text-blue-500 uppercase font-bold">Vacaciones {anio}</p><p className="text-sm font-bold text-blue-800">{resumenVac.dias_pendientes} días disponibles</p></div>
                    <div className="text-xs text-blue-600">Total: {resumenVac.dias_totales} · Disfrutados: {resumenVac.dias_disfrutados} · Solicitados: {resumenVac.dias_solicitados}</div>
                  </div>
                )}
                <div><label className="text-xs text-slate-600 font-semibold">Tipo de ausencia *</label>
                  <select value={form.tipo||''} onChange={(e: any) => selTipo(e.target.value)} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white">
                    <option value="">— Seleccionar —</option>
                    {tipos.map((t: any) => <option key={t.id} value={t.id}>{t.label} {t.dias_defecto ? '(' + t.dias_defecto + ' días)' : ''} {t.retribuido ? '' : '(no retribuido)'}</option>)}
                  </select>
                </div>
                <div></div>
                <div><label className="text-xs text-slate-600 font-semibold">Fecha inicio *</label><input type="date" value={form.fecha_inicio||''} onChange={(e: any) => setForm({...form, fecha_inicio: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" /></div>
                <div><label className="text-xs text-slate-600 font-semibold">Fecha fin *</label><input type="date" value={form.fecha_fin||''} onChange={(e: any) => setForm({...form, fecha_fin: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" /></div>
                <div className="md:col-span-2"><label className="text-xs text-slate-600 font-semibold">Observaciones</label><input type="text" value={form.notas||''} onChange={(e: any) => setForm({...form, notas: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" /></div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleSolicitar} disabled={guardando || !form.id_empleado || !form.tipo || !form.fecha_inicio} className="flex items-center gap-2 px-6 py-3 bg-violet-700 hover:bg-violet-800 disabled:bg-violet-300 text-white text-sm font-bold rounded-xl">{guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Solicitar</button>
                <button onClick={() => setMostrarForm(false)} className="px-6 py-3 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl">Cancelar</button>
              </div>
            </div>
          )}

          {/* Lista */}
          {cargando ? <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-slate-400 mx-auto" /></div> : ausencias.length === 0 ? (
            <div className="text-center py-16"><Calendar size={48} className="text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Sin solicitudes{filtroEstado ? ' con este estado' : ''}</p></div>
          ) : (
            <div className="space-y-2">{ausencias.map((a: any) => {
              const tipoInfo = tipos.find((t: any) => t.id === a.tipo)
              return (
                <div key={a.id} className={`bg-white border-2 rounded-2xl p-4 ${a.estado === 'pendiente' ? 'border-amber-200' : a.estado === 'rechazada' ? 'border-red-200' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${a.tipo === 'vacaciones' ? 'bg-blue-100' : a.tipo?.includes('it_') ? 'bg-red-100' : 'bg-violet-100'}`}>
                        {a.tipo === 'vacaciones' ? <Sun size={18} className="text-blue-600" /> : a.tipo?.includes('it_') ? <Stethoscope size={18} className="text-red-600" /> : <Calendar size={18} className="text-violet-600" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold">{a.nombre}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' : a.estado === 'aprobada' || a.estado === 'disfrutada' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{a.estado?.toUpperCase()}</span>
                          {a.retribuido === 'No' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">NO RETRIBUIDO</span>}
                        </div>
                        <p className="text-xs text-slate-500">{a.subtipo || a.tipo} · {fmtDate(a.fecha_inicio)} → {fmtDate(a.fecha_fin)} · {a.dias} día{a.dias !== 1 ? 's' : ''}</p>
                        {a.notas && <p className="text-[10px] text-slate-400 mt-0.5">{a.notas}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {puedeAprobarAusencias && a.estado === 'pendiente' && (
                        <>
                          {a.estado === 'pendiente' && <button onClick={() => aprobar(a.id, 'aprobada')} className="flex items-center gap-1 px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-bold rounded-lg"><CheckCircle2 size={14} /> Aprobar</button>}
                          {a.estado === 'pendiente' && <button onClick={() => aprobar(a.id, 'rechazada')} className="flex items-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg"><XCircle size={14} /> Rechazar</button>}
                          {(a.estado === 'aprobada' || a.estado === 'rechazada') && <button onClick={() => aprobar(a.id, 'pendiente')} className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg">↩ Revertir</button>}
                        </>
                      )}
                      {a.estado === 'pendiente' && <button onClick={() => eliminar(a.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>}
                    </div>
                  </div>
                </div>
              )
            })}</div>
          )}
        </div>
      )}

      {/* ═══ CALENDARIO ═══ */}
      {tab === 'calendario' && (
        <div>
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1">
              <button onClick={() => { if (mes === 1) { setMes(12); setAnio(anio-1) } else setMes(mes-1) }} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft size={16} /></button>
              <span className="text-sm font-semibold px-4">{mesesNombre[mes]} {anio}</span>
              <button onClick={() => { if (mes === 12) { setMes(1); setAnio(anio+1) } else setMes(mes+1) }} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight size={16} /></button>
            </div>
          </div>

          {cargando ? <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-slate-400 mx-auto" /></div> : (
            <div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((d: string) => <div key={d} className="text-center text-[10px] font-bold text-slate-500 py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {/* Espacios vacíos antes del primer día */}
                {Array.from({ length: (new Date(anio, mes-1, 1).getDay() + 6) % 7 }, (_, i) => <div key={'empty-'+i} />)}
                {generarDiasMes().map((d: any) => {
                  const ausentes = calendario?.dias?.[d.fecha] || []
                  return (
                    <div key={d.dia} className={`min-h-[70px] rounded-xl p-1.5 text-xs ${d.esFinSemana ? 'bg-slate-50' : ausentes.length > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-white border border-slate-100'}`}>
                      <p className={`text-[10px] font-bold ${d.esFinSemana ? 'text-slate-400' : 'text-slate-700'}`}>{d.dia}</p>
                      {ausentes.slice(0, 3).map((a: any, i: number) => (
                        <div key={i} className={`mt-0.5 px-1 py-0.5 rounded text-[8px] truncate font-medium ${a.tipo === 'vacaciones' ? 'bg-blue-100 text-blue-700' : a.tipo?.includes('it_') ? 'bg-red-100 text-red-700' : 'bg-violet-100 text-violet-700'}`}>
                          {a.nombre?.split(' ')[0]}
                        </div>
                      ))}
                      {ausentes.length > 3 && <p className="text-[8px] text-slate-400 mt-0.5">+{ausentes.length - 3} más</p>}
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-4 mt-4 justify-center">
                <span className="flex items-center gap-1 text-[10px]"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200" /> Vacaciones</span>
                <span className="flex items-center gap-1 text-[10px]"><span className="w-3 h-3 rounded bg-red-100 border border-red-200" /> Baja médica</span>
                <span className="flex items-center gap-1 text-[10px]"><span className="w-3 h-3 rounded bg-violet-100 border border-violet-200" /> Permiso</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
