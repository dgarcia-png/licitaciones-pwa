import { SkeletonPage } from '../components/Skeleton'
import { useState, useEffect } from 'react'
import { usePermisos } from '../hooks/usePermisos'
import { api } from '../services/api'
import ModalPlantilla from '../components/ModalPlantilla'
import { Shield, Loader2, Plus, AlertTriangle, CheckCircle2, XCircle, Clock, FileText, Lock, UserCheck, Database, Siren, X, Save, ChevronDown, ChevronUp, User, ExternalLink } from 'lucide-react'

function fmtDate(d: any) { if (!d) return ''; try { const date = new Date(d); if (isNaN(date.getTime())) return String(d); return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return String(d) } }

export default function RgpdPage() {
  const { esAdmin, esAdminRRHH } = usePermisos()
  const [tab, setTab] = useState('dashboard')
  const [cargando, setCargando] = useState(true)
  const [dashboard, setDashboard] = useState<any>(null)
  const [consentimientos, setConsentimientos] = useState<any[]>([])
  const [tiposCons, setTiposCons] = useState<string[]>([])
  const [basesLeg, setBasesLeg] = useState<string[]>([])
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [tiposArco, setTiposArco] = useState<string[]>([])
  const [tratamientos, setTratamientos] = useState<any[]>([])
  const [brechas, setBrechas] = useState<any[]>([])
  const [empleados, setEmpleados] = useState<any[]>([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [generandoDoc, setGenerandoDoc] = useState<string|null>(null)
  const [modalPlantilla, setModalPlantilla] = useState<{ datos: any; titulo: string } | null>(null)
  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState<any>({})

  const cargar = async () => {
    setCargando(true)
    try {
      const data = await Promise.all([api.rgpdDashboard(), api.empleados()]).then(([d, e]) => ({ rgpd_dashboard: d, empleados: e }))
      setDashboard(data.rgpd_dashboard || null)
      setEmpleados(data.empleados?.empleados || [])
    } catch (e: any) { console.error(e) }
    finally { setCargando(false) }
  }

  const cargarTab = async (t: string) => {
    setCargando(true)
    try {
      if (t === 'consentimientos') { const d = await api.rgpdConsentimientos(); setConsentimientos(d.consentimientos || []); setTiposCons(d.tipos || []); setBasesLeg(d.bases_legales || []) }
      else if (t === 'arco') { const d = await api.rgpdArco(); setSolicitudes(d.solicitudes || []); setTiposArco(d.tipos || []) }
      else if (t === 'tratamientos') { const d = await api.rgpdTratamientos(); setTratamientos(d.tratamientos || []) }
      else if (t === 'brechas') { const d = await api.rgpdBrechas(); setBrechas(d.brechas || []) }
    } catch (e: any) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])
  useEffect(() => { if (tab !== 'dashboard') cargarTab(tab) }, [tab])

  const handleAdd = async () => {
    setGuardando(true); setMsg('')
    try {
      let result: any
      if (tab === 'consentimientos') result = await api.addConsentimiento(form)
      else if (tab === 'arco') result = await api.addArco(form)
      else if (tab === 'tratamientos') result = await api.addTratamiento(form)
      else if (tab === 'brechas') result = await api.addBrecha(form)
      if (result?.ok) { setMsg('✅ Registrado'); setMostrarForm(false); setForm({}); cargarTab(tab); cargar(); setTimeout(() => setMsg(''), 3000) }
      else setMsg('❌ ' + (result?.error || 'Error'))
    } catch (e: any) { setMsg('❌ Error') }
    finally { setGuardando(false) }
  }

  const revocar = async (id: string) => {
    if (!confirm('¿Revocar este consentimiento?')) return
    try { const r = await api.revocarConsentimiento({ id, motivo: 'Revocación voluntaria' }); if (r.ok) { setMsg('✅ Revocado'); cargarTab('consentimientos'); cargar() } } catch(e) {}
  }

  const responderArco = async (id: string) => {
    try { const r = await api.responderArco({ id, estado: 'resuelto', resolucion: 'Solicitud atendida' }); if (r.ok) { setMsg('✅ Resuelta'); cargarTab('arco'); cargar() } } catch(e) {}
  }

  const generarDoc = async (tipo: string, data: any) => {
    setGenerandoDoc(data.id || tipo)
    try {
      let result: any
      if (tipo === 'consentimiento') result = await api.generarDocConsentimiento(data)
      else if (tipo === 'arco') result = await api.generarDocArco(data)
      if (result?.ok && result.url) { window.open(result.url, '_blank'); setMsg('✅ Documento generado') }
      setTimeout(() => setMsg(''), 3000)
    } catch (e: any) { setMsg('❌ Error') }
    finally { setGenerandoDoc(null) }
  }

  const selEmpleado = (id: string) => {
    const emp = empleados.find((e: any) => e.id === id)
    if (emp) setForm({ ...form, id_empleado: id, nombre_empleado: (emp.nombre + ' ' + emp.apellidos), nombre: (emp.nombre + ' ' + emp.apellidos), dni: emp.dni, centro: emp.centro })
  }

  const EmpSelect = () => (
    <div className="md:col-span-2"><label className="text-xs text-slate-600 font-semibold">Personal *</label>
      <select value={form.id_empleado || ''} onChange={(e: any) => selEmpleado(e.target.value)} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white">
        <option value="">— Seleccionar —</option>
        {empleados.filter((e: any) => e.estado === 'activo').map((e: any) => <option key={e.id} value={e.id}>{e.nombre} {e.apellidos} ({e.dni || '?'})</option>)}
      </select>
    </div>
  )

  const s = dashboard?.stats || {}
  if (cargando && !dashboard) return <div className="p-6 lg:p-8"><SkeletonPage /></div>

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {modalPlantilla && (
        <ModalPlantilla
          modulo="RGPD"
          datos={modalPlantilla.datos}
          titulo={modalPlantilla.titulo}
          onCerrar={() => setModalPlantilla(null)}
          onGenerado={() => { showMsg('✅ Documento generado'); setModalPlantilla(null) }}
        />
      )}
      <div className="flex items-center gap-4 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-blue-700 to-indigo-800 rounded-xl shadow-lg shadow-blue-200"><Lock size={22} className="text-white" /></div>
        <div><h1 className="text-2xl font-bold text-slate-900">Protección de Datos (RGPD)</h1><p className="text-sm text-slate-500">{dashboard?.alertas || 0} alertas activas</p></div>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {[{id:'dashboard',label:'Panel',icon:Lock},{id:'consentimientos',label:'Consentimientos',icon:UserCheck},{id:'arco',label:'Derechos ARCO',icon:Shield},{id:'tratamientos',label:'Tratamientos',icon:Database},{id:'brechas',label:'Brechas',icon:Siren}].map((t: any) => (
          <button key={t.id} onClick={() => { setTab(t.id); setMostrarForm(false); setMsg('') }}
            className={`flex items-center gap-1.5 py-2.5 px-4 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${tab === t.id ? 'bg-white shadow text-[#1a3c34]' : 'text-slate-500'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {msg && <div className={`mb-4 p-4 rounded-xl text-sm font-medium ${msg.includes('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}

      {/* ═══ DASHBOARD MEJORADO ═══ */}
      {tab === 'dashboard' && s && (
        <div>
          {/* KPIs con semáforos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            {[
              { icon: UserCheck, label: 'Consentimientos', valor: s.consentimientos?.vigentes||0, sub: (s.consentimientos?.revocados||0) + ' revocados', urgente: false, aviso: (s.consentimientos?.vigentes||0) === 0, color: 'text-blue-600', tab: 'consentimientos' },
              { icon: Shield,    label: 'ARCO pendientes', valor: s.arco?.pendientes||0,            sub: (s.arco?.resueltos||0) + ' resueltos',            urgente: (s.arco?.vencidos||0) > 0, aviso: (s.arco?.pendientes||0) > 0, color: 'text-purple-600', tab: 'arco' },
              { icon: Database,  label: 'Tratamientos',    valor: s.tratamientos?.activos||0,        sub: 'registrados (art. 30)',                          urgente: false, aviso: (s.tratamientos?.activos||0) === 0, color: 'text-emerald-600', tab: 'tratamientos' },
              { icon: Siren,     label: 'Brechas abiertas',valor: s.brechas?.abiertas||0,            sub: (s.brechas?.total||0) + ' total',                urgente: (s.brechas?.abiertas||0) > 0, aviso: false, color: 'text-red-600', tab: 'brechas' },
            ].map((card: any) => (
              <button key={card.tab} onClick={() => { setTab(card.tab); setMostrarForm(false) }}
                className={`text-left p-4 rounded-2xl border-2 transition-all hover:shadow-md ${card.urgente ? 'border-red-300 bg-red-50' : card.aviso ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center justify-between mb-2">
                  <card.icon size={20} className={card.color} />
                  {card.urgente ? <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" /> : card.aviso ? <span className="w-3 h-3 rounded-full bg-amber-400" /> : <span className="w-3 h-3 rounded-full bg-emerald-400" />}
                </div>
                <p className="text-3xl font-black text-slate-900">{card.valor}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">{card.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
                {card.urgente && <p className="text-xs text-red-600 font-bold mt-1">⚠️ Requiere atención</p>}
              </button>
            ))}
          </div>

          {/* Alertas urgentes */}
          {(dashboard?.alertas || 0) > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-5">
              <h3 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
                <AlertTriangle size={16} /> Alertas RGPD — acción requerida
              </h3>
              <div className="space-y-2">
                {s.arco?.vencidos > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-red-200">
                    <XCircle size={14} className="text-red-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-red-700 font-bold">{s.arco.vencidos} solicitud{s.arco.vencidos > 1 ? 'es' : ''} ARCO fuera de plazo</p>
                      <p className="text-xs text-red-600">El plazo máximo de respuesta es 30 días (RGPD art. 12)</p>
                    </div>
                    <button onClick={() => setTab('arco')} className="text-xs text-red-600 hover:text-red-800 font-bold flex-shrink-0">Resolver →</button>
                  </div>
                )}
                {s.brechas?.abiertas > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-red-200">
                    <Siren size={14} className="text-red-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-red-700 font-bold">{s.brechas.abiertas} brecha{s.brechas.abiertas > 1 ? 's' : ''} de seguridad abierta{s.brechas.abiertas > 1 ? 's' : ''}</p>
                      <p className="text-xs text-red-600">Notificar a la AEPD en 72h si hay riesgo para los afectados</p>
                    </div>
                    <button onClick={() => setTab('brechas')} className="text-xs text-red-600 hover:text-red-800 font-bold flex-shrink-0">Gestionar →</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Checklist cumplimiento RGPD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle2 size={15} className="text-blue-600" /> Checklist de cumplimiento RGPD
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { ok: (s.consentimientos?.vigentes||0) > 0, label: 'Consentimientos de empleados registrados', info: 'Art. 6 RGPD — base legal del tratamiento', tab: 'consentimientos' },
                { ok: (s.tratamientos?.activos||0) > 0,    label: 'Registro de actividades de tratamiento', info: 'Art. 30 RGPD — obligatorio para empresas', tab: 'tratamientos' },
                { ok: (s.arco?.vencidos||0) === 0,          label: 'Solicitudes ARCO dentro de plazo',        info: 'Art. 12 — respuesta máx. 30 días', tab: 'arco' },
                { ok: (s.brechas?.abiertas||0) === 0,       label: 'Sin brechas de seguridad abiertas',       info: 'Art. 33 — notif. AEPD en 72h si aplica', tab: 'brechas' },
                { ok: (s.consentimientos?.revocados||0) === 0 || (s.consentimientos?.vigentes||0) > 0, label: 'Revocaciones gestionadas correctamente', info: 'Art. 7.3 — derecho a retirar consentimiento', tab: 'consentimientos' },
              ].map((item: any, i: number) => (
                <button key={i} onClick={() => setTab(item.tab)}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left hover:shadow-sm transition-all ${item.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                  {item.ok
                    ? <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    : <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />}
                  <div>
                    <p className={`text-xs font-bold ${item.ok ? 'text-emerald-800' : 'text-amber-800'}`}>{item.label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{item.info}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CONSENTIMIENTOS */}
      {tab === 'consentimientos' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setMostrarForm(!mostrarForm); setForm({}) }} className="flex items-center gap-2 px-5 py-3 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-200"><Plus size={16} /> Registrar consentimiento</button>
          </div>
          {mostrarForm && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-6">
              <h4 className="text-base font-bold text-blue-800 mb-4">Nuevo consentimiento</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <EmpSelect />
                <div><label className="text-xs text-slate-600 font-semibold">Tipo</label><select value={form.tipo||''} onChange={(e: any) => setForm({...form, tipo: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white"><option value="">—</option>{tiposCons.map((t: string) => <option key={t}>{t}</option>)}</select></div>
                <div><label className="text-xs text-slate-600 font-semibold">Base legal</label><select value={form.base_legal||''} onChange={(e: any) => setForm({...form, base_legal: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white"><option value="">—</option>{basesLeg.map((b: string) => <option key={b}>{b}</option>)}</select></div>
                <div className="md:col-span-2"><label className="text-xs text-slate-600 font-semibold">Finalidad</label><input type="text" value={form.finalidad||''} onChange={(e: any) => setForm({...form, finalidad: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" placeholder="Describir la finalidad del tratamiento..." /></div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleAdd} disabled={guardando || !form.id_empleado || !form.tipo} className="flex items-center gap-2 px-6 py-3 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 text-white text-sm font-bold rounded-xl">{guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Registrar</button>
                <button onClick={() => setMostrarForm(false)} className="px-6 py-3 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl">Cancelar</button>
              </div>
            </div>
          )}
          {cargando ? <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-slate-400 mx-auto" /></div> : consentimientos.length === 0 ? (
            <div className="text-center py-16"><UserCheck size={48} className="text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Sin consentimientos registrados</p></div>
          ) : (
            <div className="space-y-3">{consentimientos.map((c: any) => (
              <div key={c.id} className={`bg-white border-2 rounded-2xl p-5 ${c.estado === 'revocado' ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${c.estado === 'vigente' ? 'bg-blue-100' : 'bg-red-100'}`}><UserCheck size={18} className={c.estado === 'vigente' ? 'text-blue-600' : 'text-red-600'} /></div>
                    <div>
                      <p className="text-sm font-bold">{c.nombre} <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ml-1 ${c.estado === 'vigente' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{c.estado?.toUpperCase()}</span></p>
                      <p className="text-xs text-slate-500">{c.tipo} · {c.base_legal} · {fmtDate(c.fecha)}</p>
                      {c.finalidad && <p className="text-xs text-slate-400 mt-0.5">{c.finalidad}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setModalPlantilla({ titulo: 'Consentimiento RGPD — ' + c.nombre, datos: { nombre_empleado: c.nombre, dni: c.dni || '', centro: c.centro || '', tipo_consentimiento: c.tipo || '', finalidad: c.finalidad || '', base_legal: c.base_legal || '' } })} className="flex items-center gap-1.5 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-bold rounded-lg"><FileText size={12} /> Documento</button>
                    {c.estado === 'vigente' && <button onClick={() => revocar(c.id)} className="flex items-center gap-1.5 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg"><XCircle size={12} /> Revocar</button>}
                  </div>
                </div>
              </div>
            ))}</div>
          )}
        </div>
      )}

      {/* ARCO */}
      {tab === 'arco' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setMostrarForm(!mostrarForm); setForm({}) }} className="flex items-center gap-2 px-5 py-3 bg-purple-700 hover:bg-purple-800 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-200"><Plus size={16} /> Nueva solicitud ARCO</button>
          </div>
          {mostrarForm && (
            <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-6 mb-6">
              <h4 className="text-base font-bold text-purple-800 mb-4">Nueva solicitud de derechos</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <EmpSelect />
                <div><label className="text-xs text-slate-600 font-semibold">Tipo de derecho</label><select value={form.tipo||''} onChange={(e: any) => setForm({...form, tipo: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white"><option value="">—</option>{tiposArco.map((t: string) => <option key={t}>{t}</option>)}</select></div>
                <div><label className="text-xs text-slate-600 font-semibold">Canal</label><select value={form.canal||'Escrito'} onChange={(e: any) => setForm({...form, canal: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white"><option>Escrito</option><option>Email</option><option>Presencial</option><option>Sede electrónica</option></select></div>
                <div className="md:col-span-2"><label className="text-xs text-slate-600 font-semibold">Descripción</label><textarea value={form.descripcion||''} onChange={(e: any) => setForm({...form, descripcion: e.target.value})} rows={2} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none" placeholder="Detalle de la solicitud..." /></div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleAdd} disabled={guardando || !form.id_empleado || !form.tipo} className="flex items-center gap-2 px-6 py-3 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 text-white text-sm font-bold rounded-xl">{guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Registrar (plazo 30 días)</button>
                <button onClick={() => setMostrarForm(false)} className="px-6 py-3 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl">Cancelar</button>
              </div>
            </div>
          )}
          {cargando ? <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-slate-400 mx-auto" /></div> : solicitudes.length === 0 ? (
            <div className="text-center py-16"><Shield size={48} className="text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Sin solicitudes ARCO</p></div>
          ) : (
            <div className="space-y-3">{solicitudes.map((a: any) => (
              <div key={a.id} className={`bg-white border-2 rounded-2xl p-5 ${a.alerta === 'vencido' ? 'border-red-300 bg-red-50/30' : a.alerta ? 'border-amber-200' : a.estado === 'pendiente' ? 'border-purple-200' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${a.estado === 'pendiente' ? 'bg-purple-100' : 'bg-emerald-100'}`}><Shield size={18} className={a.estado === 'pendiente' ? 'text-purple-600' : 'text-emerald-600'} /></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold">{a.nombre}</p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">{a.tipo}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{a.estado}</span>
                      </div>
                      <p className="text-xs text-slate-500">{a.canal} · Solicitud: {fmtDate(a.fecha_solicitud)} · Límite: {fmtDate(a.fecha_limite)}</p>
                      {a.dias_restantes !== undefined && a.estado === 'pendiente' && <p className={`text-xs font-bold ${a.alerta === 'vencido' ? 'text-red-700' : a.alerta ? 'text-amber-700' : 'text-emerald-600'}`}>{a.dias_restantes < 0 ? '⚠️ FUERA DE PLAZO' : a.dias_restantes + ' días restantes'}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setModalPlantilla({ titulo: 'Respuesta ARCO — ' + a.nombre, datos: { nombre_empleado: a.nombre, dni: a.dni || '', tipo_arco: a.tipo || '', fecha_solicitud_arco: a.fecha_solicitud || '', notas: a.descripcion || '' } })} className="flex items-center gap-1.5 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-bold rounded-lg"><FileText size={12} /> Respuesta</button>
                    {a.estado === 'pendiente' && <button onClick={() => responderArco(a.id)} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-bold rounded-lg"><CheckCircle2 size={12} /> Resolver</button>}
                  </div>
                </div>
              </div>
            ))}</div>
          )}
        </div>
      )}

      {/* TRATAMIENTOS */}
      {tab === 'tratamientos' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setMostrarForm(!mostrarForm); setForm({}) }} className="flex items-center gap-2 px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-200"><Plus size={16} /> Registrar tratamiento</button>
          </div>
          {mostrarForm && (
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 mb-6">
              <h4 className="text-base font-bold text-emerald-800 mb-4">Nuevo registro de tratamiento (art. 30 RGPD)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="md:col-span-2"><label className="text-xs text-slate-600 font-semibold">Nombre del tratamiento *</label><input type="text" value={form.nombre||''} onChange={(e: any) => setForm({...form, nombre: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" placeholder="Ej: Gestión de nóminas" /></div>
                <div><label className="text-xs text-slate-600 font-semibold">Responsable</label><input type="text" value={form.responsable||''} onChange={(e: any) => setForm({...form, responsable: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" placeholder="Forgeser Servicios del Sur SL" /></div>
                <div><label className="text-xs text-slate-600 font-semibold">Base legal</label><select value={form.base_legal||''} onChange={(e: any) => setForm({...form, base_legal: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white"><option value="">—</option>{['Consentimiento','Ejecución contrato','Obligación legal','Interés legítimo'].map((b: string) => <option key={b}>{b}</option>)}</select></div>
                <div className="md:col-span-2"><label className="text-xs text-slate-600 font-semibold">Finalidad</label><input type="text" value={form.finalidad||''} onChange={(e: any) => setForm({...form, finalidad: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" /></div>
                <div><label className="text-xs text-slate-600 font-semibold">Categoría de datos</label><input type="text" value={form.categoria_datos||''} onChange={(e: any) => setForm({...form, categoria_datos: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" placeholder="Identificativos, profesionales..." /></div>
                <div><label className="text-xs text-slate-600 font-semibold">Plazo conservación</label><input type="text" value={form.plazo||''} onChange={(e: any) => setForm({...form, plazo: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" placeholder="Ej: 5 años" /></div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleAdd} disabled={guardando || !form.nombre} className="flex items-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300 text-white text-sm font-bold rounded-xl">{guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Registrar</button>
                <button onClick={() => setMostrarForm(false)} className="px-6 py-3 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl">Cancelar</button>
              </div>
            </div>
          )}
          {cargando ? <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-slate-400 mx-auto" /></div> : tratamientos.length === 0 ? (
            <div className="text-center py-16"><Database size={48} className="text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Sin tratamientos registrados</p></div>
          ) : (
            <div className="space-y-3">{tratamientos.map((t: any) => (
              <div key={t.id} className="bg-white border-2 border-slate-200 rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center"><Database size={18} className="text-emerald-600" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{t.nombre} <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ml-1 ${t.estado === 'activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{t.estado}</span></p>
                    <p className="text-xs text-slate-500">{t.base_legal} · {t.finalidad}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Datos: {t.categoria_datos} · Plazo: {t.plazo} · Responsable: {t.responsable}</p>
                  </div>
                </div>
              </div>
            ))}</div>
          )}
        </div>
      )}

      {/* BRECHAS */}
      {tab === 'brechas' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setMostrarForm(!mostrarForm); setForm({}) }} className="flex items-center gap-2 px-5 py-3 bg-red-700 hover:bg-red-800 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-200"><Plus size={16} /> Registrar brecha</button>
          </div>
          {mostrarForm && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
              <h4 className="text-base font-bold text-red-800 mb-4">Nueva brecha de seguridad</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div><label className="text-xs text-slate-600 font-semibold">Fecha detección</label><input type="date" value={form.fecha_deteccion||''} onChange={(e: any) => setForm({...form, fecha_deteccion: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" /></div>
                <div><label className="text-xs text-slate-600 font-semibold">Tipo</label><select value={form.tipo||''} onChange={(e: any) => setForm({...form, tipo: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white"><option value="">—</option><option>Confidencialidad</option><option>Integridad</option><option>Disponibilidad</option></select></div>
                <div><label className="text-xs text-slate-600 font-semibold">Gravedad</label><select value={form.gravedad||'Media'} onChange={(e: any) => setForm({...form, gravedad: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white"><option>Baja</option><option>Media</option><option>Alta</option><option>Crítica</option></select></div>
                <div><label className="text-xs text-slate-600 font-semibold">Nº personas afectadas</label><input type="number" value={form.num_afectados||0} onChange={(e: any) => setForm({...form, num_afectados: parseInt(e.target.value)||0})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" /></div>
                <div className="md:col-span-2"><label className="text-xs text-slate-600 font-semibold">Descripción *</label><textarea value={form.descripcion||''} onChange={(e: any) => setForm({...form, descripcion: e.target.value})} rows={2} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none" /></div>
                <div className="md:col-span-2"><label className="text-xs text-slate-600 font-semibold">Medidas adoptadas</label><textarea value={form.medidas||''} onChange={(e: any) => setForm({...form, medidas: e.target.value})} rows={2} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none" /></div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleAdd} disabled={guardando || !form.descripcion} className="flex items-center gap-2 px-6 py-3 bg-red-700 hover:bg-red-800 disabled:bg-red-300 text-white text-sm font-bold rounded-xl">{guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Registrar brecha</button>
                <button onClick={() => setMostrarForm(false)} className="px-6 py-3 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl">Cancelar</button>
              </div>
            </div>
          )}
          {cargando ? <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-slate-400 mx-auto" /></div> : brechas.length === 0 ? (
            <div className="text-center py-16"><CheckCircle2 size={48} className="text-emerald-300 mx-auto mb-3" /><p className="text-slate-500">Sin brechas de seguridad registradas</p></div>
          ) : (
            <div className="space-y-3">{brechas.map((b: any) => (
              <div key={b.id} className={`bg-white border-2 rounded-2xl p-5 ${b.estado === 'abierta' ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${b.estado === 'abierta' ? 'bg-red-100' : 'bg-slate-100'}`}><Siren size={18} className={b.estado === 'abierta' ? 'text-red-600' : 'text-slate-500'} /></div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${b.gravedad === 'Crítica' || b.gravedad === 'Alta' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{b.gravedad}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${b.estado === 'abierta' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>{b.estado}</span>
                        <span className="text-xs text-slate-500">{b.tipo}</span>
                      </div>
                      <p className="text-sm text-slate-800">{b.descripcion}</p>
                      <p className="text-xs text-slate-500 mt-1">Detectada: {fmtDate(b.fecha_deteccion)} · {b.num_afectados} personas · {b.datos_afectados}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}</div>
          )}
        </div>
      )}
    </div>
  )
}
