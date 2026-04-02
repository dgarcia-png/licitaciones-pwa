import { SkeletonPage } from '../components/Skeleton'
import { useState, useEffect } from 'react'
import { usePermisos } from '../hooks/usePermisos'
import { api } from '../services/api'
import ModalPlantilla from '../components/ModalPlantilla'
import {
  Shield, Loader2, Plus, AlertTriangle, CheckCircle2, XCircle, Clock,
  HardHat, Stethoscope, GraduationCap, Siren, X, Save, ChevronDown, ChevronUp,
  Search, FileText, ExternalLink, User
} from 'lucide-react'

function fmtDate(d: any) {
  if (!d) return ''; try { const date = new Date(d); if (isNaN(date.getTime())) return String(d); return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return String(d) }
}

const GRAVEDADES = ['Leve', 'Grave', 'Muy grave', 'Mortal']
const MODALIDADES = ['Presencial', 'Online', 'Mixta']
const TIPOS_RECO = ['Inicial', 'Periódico', 'Reincorporación', 'Cambio puesto']

export default function PrlPage() {
  const { esAdmin, esAdminRRHH, puedeGestionarRRHH } = usePermisos()
  const [tab, setTab] = useState<string>('dashboard')
  const [cargando, setCargando] = useState(true)
  const [dashboard, setDashboard] = useState<any>(null)
  const [epis, setEpis] = useState<any[]>([])
  const [reconocimientos, setReconocimientos] = useState<any[]>([])
  const [formaciones, setFormaciones] = useState<any[]>([])
  const [accidentes, setAccidentes] = useState<any[]>([])
  const [tiposEpi, setTiposEpi] = useState<string[]>([])
  const [cursosPrl, setCursosPrl] = useState<string[]>([])
  const [empleados, setEmpleados] = useState<any[]>([])
  const [alertasCad, setAlertasCad] = useState<any[]>([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [generandoDoc, setGenerandoDoc] = useState<string|null>(null)
  const [modalPlantilla, setModalPlantilla] = useState<{ datos: any; titulo: string } | null>(null)
  const [msg, setMsg] = useState('')
  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }
  const [form, setForm] = useState<any>({})
  const [expandido, setExpandido] = useState<string|null>(null)
  const [filtroEmp, setFiltroEmp] = useState('')
  const [vistaEmp, setVistaEmp] = useState<any>(null)

  const cargar = async () => {
    setCargando(true)
    try {
      const data = await Promise.all([api.prlDashboard(), api.empleados()]).then(([d, e]) => ({ prl_dashboard: d, empleados: e }))
      setDashboard(data.prl_dashboard || null)
      setEmpleados(data.empleados?.empleados || data.empleados || [])
    } catch (e: any) { console.error(e) }
    finally { setCargando(false) }
    // Cargar datos para semáforos en background
    Promise.all([api.prlEpis(), api.prlReconocimientos(), api.prlFormacion()])
      .then(([e, r, f]) => {
        setEpis(e.epis || [])
        setReconocimientos(r.reconocimientos || [])
        setFormaciones(f.formaciones || [])
      }).catch(() => {})
  }

  const cargarTab = async (t: string) => {
    setCargando(true)
    try {
      if (t === 'epis') { const d = await api.prlEpis(); setEpis(d.epis || []); setTiposEpi(d.tipos || []) }
      else if (t === 'reconocimientos') { const d = await api.prlReconocimientos(); setReconocimientos(d.reconocimientos || []) }
      else if (t === 'formacion') { const d = await api.prlFormacion(); setFormaciones(d.formaciones || []); setCursosPrl(d.cursos || []) }
      else if (t === 'accidentes') { const d = await api.prlAccidentes(); setAccidentes(d.accidentes || []) }
      else if (t === 'alertas') { const d = await api.alertasCaducidad(); setAlertasCad(d.alertas || []) }
    } catch (e: any) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])
  useEffect(() => { if (tab !== 'dashboard') cargarTab(tab) }, [tab])

  const handleAdd = async () => {
    setGuardando(true); setMsg('')
    try {
      let result: any
      if (tab === 'epis') result = await api.agregarEpi(form)
      else if (tab === 'reconocimientos') result = await api.agregarReconocimiento(form)
      else if (tab === 'formacion') result = await api.agregarFormacionPrl(form)
      else if (tab === 'accidentes') result = await api.agregarAccidente(form)
      if (result?.ok) { setMsg('✅ Registrado'); setMostrarForm(false); setForm({}); cargarTab(tab); cargar(); setTimeout(() => setMsg(''), 3000) }
      else setMsg('❌ ' + (result?.error || 'Error'))
    } catch (e: any) { setMsg('❌ Error de conexión') }
    finally { setGuardando(false) }
  }

  const generarDoc = async (tipo: string, data: any) => {
    setGenerandoDoc(data.id || tipo)
    try {
      let result: any
      if (tipo === 'recibi_epi') result = await api.generarRecibiEpi(data)
      else if (tipo === 'notif_reconocimiento') result = await api.generarNotifReconocimiento(data)
      else if (tipo === 'acta_formacion') result = await api.generarActaFormacion(data)
      else if (tipo === 'aviso_caducidad') result = await api.generarAvisoCaducidad(data)
      if (result?.ok && result.url) { window.open(result.url, '_blank'); setMsg('✅ Documento generado y archivado en expediente') }
      else setMsg('❌ ' + (result?.error || 'Error generando'))
      setTimeout(() => setMsg(''), 4000)
    } catch (e: any) { setMsg('❌ Error de conexión') }
    finally { setGenerandoDoc(null) }
  }

  const selEmpleado = (id: string) => {
    const emp = empleados.find((e: any) => e.id === id)
    if (emp) setForm({ ...form, id_empleado: id, nombre_empleado: emp.nombre_completo || (emp.nombre + ' ' + emp.apellidos), nombre: emp.nombre_completo || (emp.nombre + ' ' + emp.apellidos), dni: emp.dni, centro: emp.centro })
  }

  // Agrupar por persona
  const agruparPorPersona = (items: any[]) => {
    const map = new Map<string, { nombre: string; dni: string; centro: string; items: any[] }>()
    items.forEach((item: any) => {
      const key = (item.dni || item.nombre || 'sin-identificar').toLowerCase()
      if (!map.has(key)) map.set(key, { nombre: item.nombre, dni: item.dni, centro: item.centro, items: [] })
      map.get(key)!.items.push(item)
    })
    return Array.from(map.values()).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))
  }

  const EmpSelect = () => (
    <div className="md:col-span-2">
      <label className="text-xs text-slate-600 font-semibold">Personal *</label>
      <select value={form.id_empleado || ''} onChange={(e: any) => selEmpleado(e.target.value)} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1a3c34] focus:outline-none">
        <option value="">— Seleccionar persona —</option>
        {empleados.filter((e: any) => e.estado === 'activo').map((e: any) => <option key={e.id} value={e.id}>{e.nombre} {e.apellidos} ({e.dni || '?'}) — {e.centro || ''}</option>)}
      </select>
    </div>
  )

  const s = dashboard?.stats || {}
  if (cargando && !dashboard) return <div className="p-6 lg:p-8"><SkeletonPage /></div>

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* Modal selector de plantillas */}
      {modalPlantilla && (
        <ModalPlantilla
          modulo="PRL"
          datos={modalPlantilla.datos}
          titulo={modalPlantilla.titulo}
          onCerrar={() => setModalPlantilla(null)}
          onGenerado={(url) => { showMsg('✅ Documento generado'); setModalPlantilla(null) }}
        />
      )}
      <div className="flex items-center gap-4 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-orange-600 to-red-700 rounded-xl shadow-lg shadow-orange-200"><Shield size={22} className="text-white" /></div>
        <div><h1 className="text-2xl font-bold text-slate-900">Prevención de Riesgos Laborales</h1><p className="text-sm text-slate-500">{dashboard?.alertas_total || 0} alertas activas</p></div>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {[
          { id: 'dashboard', label: 'Panel', icon: Shield },
          { id: 'epis', label: 'EPIs', icon: HardHat },
          { id: 'reconocimientos', label: 'Reconocimientos', icon: Stethoscope },
          { id: 'formacion', label: 'Formación', icon: GraduationCap },
          { id: 'accidentes', label: 'Accidentes', icon: Siren },
          { id: 'alertas', label: 'Alertas', icon: AlertTriangle },
        ].map((t: any) => (
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
              { icon: HardHat,      label: 'EPIs',            total: s.epis?.total||0,            urgente: s.epis?.caducados||0,            aviso: s.epis?.por_caducar||0,            color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', tab: 'epis' },
              { icon: Stethoscope,  label: 'Reconocimientos', total: s.reconocimientos?.total||0,  urgente: s.reconocimientos?.vencidos||0,  aviso: s.reconocimientos?.por_vencer||0,  color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',    tab: 'reconocimientos' },
              { icon: GraduationCap,label: 'Formación',       total: s.formacion?.total||0,        urgente: s.formacion?.caducadas||0,       aviso: s.formacion?.por_caducar||0,       color: 'text-emerald-600',bg: 'bg-emerald-50',border: 'border-emerald-200',tab: 'formacion' },
              { icon: Siren,        label: 'Accidentes',      total: s.accidentes?.total||0,        urgente: s.accidentes?.abiertos||0,       aviso: s.accidentes?.con_baja||0,         color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', tab: 'accidentes' },
            ].map((card: any) => {
              const hayUrgente = card.urgente > 0
              const hayAviso   = card.aviso > 0
              return (
                <button key={card.tab} onClick={() => { setTab(card.tab); setMostrarForm(false) }}
                  className={`text-left p-4 rounded-2xl border-2 transition-all hover:shadow-md ${hayUrgente ? 'border-red-300 bg-red-50' : hayAviso ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <card.icon size={20} className={card.color} />
                    {hayUrgente ? <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" /> : hayAviso ? <span className="w-3 h-3 rounded-full bg-amber-400" /> : <span className="w-3 h-3 rounded-full bg-emerald-400" />}
                  </div>
                  <p className="text-3xl font-black text-slate-900">{card.total}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">{card.label}</p>
                  {hayUrgente && <p className="text-xs text-red-600 font-bold mt-1">⚠️ {card.urgente} urgente{card.urgente > 1 ? 's' : ''}</p>}
                  {!hayUrgente && hayAviso && <p className="text-xs text-amber-700 font-medium mt-1">⏰ {card.aviso} próximo{card.aviso > 1 ? 's' : ''}</p>}
                  {!hayUrgente && !hayAviso && <p className="text-xs text-emerald-600 font-medium mt-1">✓ Al día</p>}
                </button>
              )
            })}
          </div>

          {/* Panel alertas urgentes */}
          {(dashboard?.alertas_total || 0) > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-5">
              <h3 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
                <AlertTriangle size={16} /> Requieren atención inmediata ({dashboard.alertas_total})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {s.epis?.caducados > 0 && <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-red-200"><XCircle size={14} className="text-red-500 flex-shrink-0" /><span className="text-sm text-red-700 font-medium">{s.epis.caducados} EPI{s.epis.caducados > 1 ? 's' : ''} caducado{s.epis.caducados > 1 ? 's' : ''}</span><button onClick={() => setTab('epis')} className="ml-auto text-xs text-red-600 hover:text-red-800 font-bold">Ver →</button></div>}
                {s.epis?.por_caducar > 0 && <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-amber-200"><Clock size={14} className="text-amber-500 flex-shrink-0" /><span className="text-sm text-amber-700 font-medium">{s.epis.por_caducar} EPI{s.epis.por_caducar > 1 ? 's' : ''} caducan en 90 días</span><button onClick={() => setTab('epis')} className="ml-auto text-xs text-amber-600 hover:text-amber-800 font-bold">Ver →</button></div>}
                {s.reconocimientos?.vencidos > 0 && <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-red-200"><XCircle size={14} className="text-red-500 flex-shrink-0" /><span className="text-sm text-red-700 font-medium">{s.reconocimientos.vencidos} reconocimiento{s.reconocimientos.vencidos > 1 ? 's' : ''} vencido{s.reconocimientos.vencidos > 1 ? 's' : ''}</span><button onClick={() => setTab('reconocimientos')} className="ml-auto text-xs text-red-600 hover:text-red-800 font-bold">Ver →</button></div>}
                {s.reconocimientos?.por_vencer > 0 && <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-amber-200"><Clock size={14} className="text-amber-500 flex-shrink-0" /><span className="text-sm text-amber-700 font-medium">{s.reconocimientos.por_vencer} reconocimiento{s.reconocimientos.por_vencer > 1 ? 's' : ''} próximos a vencer</span><button onClick={() => setTab('reconocimientos')} className="ml-auto text-xs text-amber-600 hover:text-amber-800 font-bold">Ver →</button></div>}
                {s.formacion?.caducadas > 0 && <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-red-200"><XCircle size={14} className="text-red-500 flex-shrink-0" /><span className="text-sm text-red-700 font-medium">{s.formacion.caducadas} formación PRL caducada</span><button onClick={() => setTab('formacion')} className="ml-auto text-xs text-red-600 hover:text-red-800 font-bold">Ver →</button></div>}
                {s.accidentes?.abiertos > 0 && <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-purple-200"><Siren size={14} className="text-purple-500 flex-shrink-0" /><span className="text-sm text-purple-700 font-medium">{s.accidentes.abiertos} accidente{s.accidentes.abiertos > 1 ? 's' : ''} sin cerrar</span><button onClick={() => setTab('accidentes')} className="ml-auto text-xs text-purple-600 hover:text-purple-800 font-bold">Ver →</button></div>}
              </div>
            </div>
          )}

          {/* Estado por empleado */}
          {empleados.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><User size={15} className="text-slate-600" />Estado PRL por empleado</h3>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Buscar..." value={filtroEmp} onChange={(e: any) => setFiltroEmp(e.target.value)}
                    className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs w-40" />
                </div>
              </div>
              <div className="space-y-2">
                {empleados.filter((e: any) => e.estado === 'activo').filter((e: any) => !filtroEmp || (e.nombre + ' ' + e.apellidos).toLowerCase().includes(filtroEmp.toLowerCase())).map((emp: any) => {
                  const misEpis    = epis.length > 0 ? epis.filter((x: any) => x.dni === emp.dni) : []
                  const misRecos   = reconocimientos.length > 0 ? reconocimientos.filter((x: any) => x.dni === emp.dni) : []
                  const misForm    = formaciones.length > 0 ? formaciones.filter((x: any) => x.dni === emp.dni) : []

                  const epiCad    = misEpis.some((x: any) => x.alerta === 'caducado')
                  const recoCad   = misRecos.some((x: any) => x.alerta)
                  const formCad   = misForm.some((x: any) => x.alerta === 'caducado')
                  const sinReco   = misRecos.length === 0
                  const sinForm   = misForm.length === 0
                  const urgente   = epiCad || recoCad || formCad
                  const aviso     = sinReco || sinForm

                  return (
                    <div key={emp.id} className={`flex items-center gap-3 p-3 rounded-xl border ${urgente ? 'bg-red-50 border-red-200' : aviso ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${urgente ? 'bg-red-200 text-red-800' : aviso ? 'bg-amber-200 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {(emp.nombre||'?')[0]}{(emp.apellidos||'')[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{emp.nombre} {emp.apellidos}</p>
                        <p className="text-[10px] text-slate-500">{emp.centro || 'Sin centro'}</p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <span title="EPIs" className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${epiCad ? 'bg-red-200 text-red-800' : 'bg-slate-200 text-slate-600'}`}>EPI</span>
                        <span title="Reconocimiento" className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${recoCad ? 'bg-red-200 text-red-800' : sinReco ? 'bg-amber-200 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>REC</span>
                        <span title="Formación" className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${formCad ? 'bg-red-200 text-red-800' : sinForm ? 'bg-amber-200 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>FORM</span>
                      </div>
                      {(urgente || aviso) && (
                        <span className={`text-[9px] font-bold flex-shrink-0 ${urgente ? 'text-red-600' : 'text-amber-700'}`}>
                          {urgente ? '⚠️ Urgente' : '⏰ Pendiente'}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
              {empleados.filter((e: any) => e.estado === 'activo').length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">Carga empleados desde la pestaña Personal para ver el estado PRL individual</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ EPIs (agrupado por persona) ═══ */}
      {tab === 'epis' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setMostrarForm(!mostrarForm); setForm({}) }} className="flex items-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-200 transition-colors"><Plus size={16} /> Registrar entrega EPI</button>
          </div>
          {mostrarForm && (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6 mb-6">
              <h4 className="text-base font-bold text-orange-800 mb-4">Nueva entrega de EPI</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <EmpSelect />
                <div><label className="text-xs text-slate-600 font-semibold">Tipo EPI</label><select value={form.tipo||''} onChange={(e: any) => setForm({...form, tipo: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white"><option value="">— Seleccionar —</option>{tiposEpi.map((t: string) => <option key={t}>{t}</option>)}</select></div>
                <div><label className="text-xs text-slate-600 font-semibold">Descripción</label><input type="text" value={form.descripcion||''} onChange={(e: any) => setForm({...form, descripcion: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" placeholder="Ej: Guantes nitrilo azul" /></div>
                <div><label className="text-xs text-slate-600 font-semibold">Talla</label><select value={form.talla||''} onChange={(e: any) => setForm({...form, talla: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white"><option value="">—</option>{['XS','S','M','L','XL','XXL','36','37','38','39','40','41','42','43','44','45'].map((t: string) => <option key={t}>{t}</option>)}</select></div>
                <div><label className="text-xs text-slate-600 font-semibold">Cantidad</label><input type="number" value={form.cantidad||1} onChange={(e: any) => setForm({...form, cantidad: parseInt(e.target.value)||1})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" /></div>
                <div><label className="text-xs text-slate-600 font-semibold">Fecha caducidad</label><input type="date" value={form.fecha_caducidad||''} onChange={(e: any) => setForm({...form, fecha_caducidad: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" /></div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleAdd} disabled={guardando || !form.id_empleado} className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white text-sm font-bold rounded-xl">{guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Registrar entrega</button>
                <button onClick={() => setMostrarForm(false)} className="px-6 py-3 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl">Cancelar</button>
              </div>
            </div>
          )}
          {cargando ? <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-slate-400 mx-auto" /></div> : epis.length === 0 ? (
            <div className="text-center py-16"><HardHat size={48} className="text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Sin entregas de EPIs registradas</p></div>
          ) : (
            <div className="space-y-4">
              {agruparPorPersona(epis).map((persona: any) => (
                <div key={persona.dni || persona.nombre} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <button onClick={() => setExpandido(expandido === 'epi_'+persona.nombre ? null : 'epi_'+persona.nombre)} className="w-full flex items-center justify-between p-5 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center"><User size={18} className="text-orange-600" /></div>
                      <div className="text-left">
                        <h3 className="text-sm font-bold text-slate-900">{persona.nombre}</h3>
                        <p className="text-xs text-slate-500">{persona.dni} · {persona.centro} · {persona.items.length} entrega{persona.items.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {persona.items.some((e: any) => e.alerta === 'caducado') && <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">CADUCADOS</span>}
                      <button onClick={(ev) => { ev.stopPropagation(); setModalPlantilla({ titulo: 'Recibí EPI — ' + persona.nombre, datos: { nombre_empleado: persona.nombre, dni: persona.dni, centro: persona.centro, tipo_epi: persona.items[0]?.tipo || '', descripcion_epi: persona.items[0]?.descripcion || '', cantidad_epi: String(persona.items[0]?.cantidad || 1), talla_epi: String(persona.items[0]?.talla || ''), caducidad_epi: persona.items[0]?.fecha_caducidad || '' } }) }}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg">
                        <FileText size={14} /> Generar documento
                      </button>
                      {expandido === 'epi_'+persona.nombre ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                  </button>
                  {expandido === 'epi_'+persona.nombre && (
                    <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-2">
                      {persona.items.map((e: any) => (
                        <div key={e.id} className={`flex items-center justify-between p-4 rounded-xl ${e.alerta === 'caducado' ? 'bg-red-50 border border-red-200' : e.alerta ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50'}`}>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{e.tipo} — {e.descripcion || ''}</p>
                            <p className="text-xs text-slate-500">Talla: {e.talla || '?'} · x{e.cantidad} · Entregado: {fmtDate(e.fecha_entrega)}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {e.fecha_caducidad && <p className={`text-xs font-bold ${e.alerta === 'caducado' ? 'text-red-700' : e.alerta ? 'text-amber-700' : 'text-slate-500'}`}>{e.alerta === 'caducado' ? '❌ CADUCADO' : e.dias_caducidad !== undefined ? '⏰ ' + e.dias_caducidad + 'd' : ''}</p>}
                            <button onClick={() => generarDoc('recibi_epi', { nombre_empleado: persona.nombre, nombre: persona.nombre, dni: persona.dni, centro: persona.centro, items: [{ tipo: e.tipo, descripcion: e.descripcion, talla: String(e.talla || ''), cantidad: e.cantidad, fecha_caducidad: e.fecha_caducidad }] })}
                              disabled={generandoDoc === e.id}
                              className="flex items-center gap-1.5 px-3 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs font-bold rounded-lg">
                              {generandoDoc === e.id ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} Recibí
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ RECONOCIMIENTOS (agrupado por persona) ═══ */}
      {tab === 'reconocimientos' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setMostrarForm(!mostrarForm); setForm({}) }} className="flex items-center gap-2 px-5 py-3 bg-red-700 hover:bg-red-800 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-200"><Plus size={16} /> Registrar reconocimiento</button>
          </div>
          {mostrarForm && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
              <h4 className="text-base font-bold text-red-800 mb-4">Nuevo reconocimiento médico</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <EmpSelect />
                <div><label className="text-xs text-slate-600 font-semibold">Tipo</label><select value={form.tipo||'Periódico'} onChange={(e: any) => setForm({...form, tipo: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white">{TIPOS_RECO.map((t: string) => <option key={t}>{t}</option>)}</select></div>
                <div><label className="text-xs text-slate-600 font-semibold">Resultado</label><select value={form.apto||'Apto'} onChange={(e: any) => setForm({...form, apto: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white"><option>Apto</option><option>Apto con restricciones</option><option>No apto</option><option>Pendiente</option></select></div>
                <div><label className="text-xs text-slate-600 font-semibold">Fecha</label><input type="date" value={form.fecha||''} onChange={(e: any) => setForm({...form, fecha: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" /></div>
                <div><label className="text-xs text-slate-600 font-semibold">Próximo</label><input type="date" value={form.fecha_proximo||''} onChange={(e: any) => setForm({...form, fecha_proximo: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" /></div>
                <div><label className="text-xs text-slate-600 font-semibold">SPA / Mutua</label><input type="text" value={form.spa||''} onChange={(e: any) => setForm({...form, spa: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" placeholder="Ej: Quirónprevención" /></div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleAdd} disabled={guardando || !form.id_empleado} className="flex items-center gap-2 px-6 py-3 bg-red-700 hover:bg-red-800 disabled:bg-red-300 text-white text-sm font-bold rounded-xl">{guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Registrar</button>
                <button onClick={() => setMostrarForm(false)} className="px-6 py-3 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl">Cancelar</button>
              </div>
            </div>
          )}
          {cargando ? <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-slate-400 mx-auto" /></div> : reconocimientos.length === 0 ? (
            <div className="text-center py-16"><Stethoscope size={48} className="text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Sin reconocimientos registrados</p></div>
          ) : (
            <div className="space-y-3">{agruparPorPersona(reconocimientos).map((persona: any) => (
              <div key={persona.nombre} className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"><User size={18} className="text-red-600" /></div>
                    <div><h3 className="text-sm font-bold">{persona.nombre}</h3><p className="text-xs text-slate-500">{persona.dni} · {persona.centro}</p></div>
                  </div>
                  <button onClick={() => setModalPlantilla({ titulo: 'Reconocimiento médico — ' + persona.nombre, datos: { nombre_empleado: persona.nombre, dni: persona.dni, centro: persona.centro, tipo_reconocimiento: persona.items[0]?.tipo || '', resultado_reconocimiento: persona.items[0]?.apto || '', fecha_reconocimiento: persona.items[0]?.fecha || '', proximo_reconocimiento: persona.items[0]?.fecha_proximo || '' } })}
                    className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-lg">
                    <FileText size={14} /> Generar documento
                  </button>
                </div>
                {persona.items.map((r: any) => (
                  <div key={r.id} className={`flex items-center justify-between p-3 rounded-xl mb-1.5 ${r.alerta === 'vencido' ? 'bg-red-50' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${r.apto === 'Apto' ? 'bg-emerald-100 text-emerald-700' : r.apto === 'No apto' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{r.apto}</span>
                      <span className="text-xs text-slate-600">{r.tipo} · {fmtDate(r.fecha)} · {r.spa || ''}</span>
                    </div>
                    {r.fecha_proximo && <span className={`text-xs font-bold ${r.alerta ? 'text-red-700' : 'text-emerald-600'}`}>Próximo: {fmtDate(r.fecha_proximo)}</span>}
                  </div>
                ))}
              </div>
            ))}</div>
          )}
        </div>
      )}

      {/* ═══ FORMACIÓN (agrupado por persona) ═══ */}
      {tab === 'formacion' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setMostrarForm(!mostrarForm); setForm({}) }} className="flex items-center gap-2 px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-200"><Plus size={16} /> Registrar formación</button>
          </div>
          {mostrarForm && (
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 mb-6">
              <h4 className="text-base font-bold text-emerald-800 mb-4">Nueva formación PRL</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <EmpSelect />
                <div><label className="text-xs text-slate-600 font-semibold">Curso</label><select value={form.curso||''} onChange={(e: any) => setForm({...form, curso: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white"><option value="">—</option>{cursosPrl.map((c: string) => <option key={c}>{c}</option>)}</select></div>
                <div><label className="text-xs text-slate-600 font-semibold">Horas</label><input type="number" value={form.horas||''} onChange={(e: any) => setForm({...form, horas: parseInt(e.target.value)||0})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" /></div>
                <div><label className="text-xs text-slate-600 font-semibold">Modalidad</label><select value={form.modalidad||'Presencial'} onChange={(e: any) => setForm({...form, modalidad: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white">{MODALIDADES.map((m: string) => <option key={m}>{m}</option>)}</select></div>
                <div><label className="text-xs text-slate-600 font-semibold">Entidad</label><input type="text" value={form.entidad||''} onChange={(e: any) => setForm({...form, entidad: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" /></div>
                <div><label className="text-xs text-slate-600 font-semibold">Fecha fin</label><input type="date" value={form.fecha_fin||''} onChange={(e: any) => setForm({...form, fecha_fin: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" /></div>
                <div><label className="text-xs text-slate-600 font-semibold">Caducidad</label><input type="date" value={form.fecha_caducidad||''} onChange={(e: any) => setForm({...form, fecha_caducidad: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" /></div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleAdd} disabled={guardando || !form.id_empleado} className="flex items-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300 text-white text-sm font-bold rounded-xl">{guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Registrar</button>
                <button onClick={() => setMostrarForm(false)} className="px-6 py-3 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl">Cancelar</button>
              </div>
            </div>
          )}
          {cargando ? <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-slate-400 mx-auto" /></div> : formaciones.length === 0 ? (
            <div className="text-center py-16"><GraduationCap size={48} className="text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Sin formación PRL registrada</p></div>
          ) : (
            <div className="space-y-3">{agruparPorPersona(formaciones).map((persona: any) => (
              <div key={persona.nombre} className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center"><User size={18} className="text-emerald-600" /></div>
                    <div><h3 className="text-sm font-bold">{persona.nombre}</h3><p className="text-xs text-slate-500">{persona.dni} · {persona.items.length} curso{persona.items.length !== 1 ? 's' : ''}</p></div>
                  </div>
                  <button onClick={() => setModalPlantilla({ titulo: 'Formación PRL — ' + persona.nombre, datos: { nombre_empleado: persona.nombre, dni: persona.dni, centro: persona.centro, curso_prl: persona.items[0]?.curso || '', horas_formacion: String(persona.items[0]?.horas || ''), entidad_formadora: persona.items[0]?.entidad || '', fecha_formacion: persona.items[0]?.fecha_fin || '' } })}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg">
                    <FileText size={14} /> Generar documento
                  </button>
                </div>
                {persona.items.map((f: any) => (
                  <div key={f.id} className={`flex items-center justify-between p-3 rounded-xl mb-1.5 ${f.alerta === 'caducado' ? 'bg-red-50' : 'bg-slate-50'}`}>
                    <div><span className="text-sm font-semibold">{f.curso}</span><span className="text-xs text-slate-500 ml-2">{f.horas}h · {f.modalidad} · {f.entidad || ''}</span></div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400">{fmtDate(f.fecha_fin)}</span>
                      {f.fecha_caducidad && <p className={`text-[10px] font-bold ${f.alerta === 'caducado' ? 'text-red-700' : f.alerta ? 'text-amber-600' : 'text-emerald-600'}`}>{f.alerta === 'caducado' ? 'CADUCADO' : 'Caduca: ' + fmtDate(f.fecha_caducidad)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ))}</div>
          )}
        </div>
      )}

      {/* ═══ ACCIDENTES ═══ */}
      {tab === 'accidentes' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setMostrarForm(!mostrarForm); setForm({}) }} className="flex items-center gap-2 px-5 py-3 bg-purple-700 hover:bg-purple-800 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-200"><Plus size={16} /> Registrar accidente</button>
          </div>
          {mostrarForm && (
            <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-6 mb-6">
              <h4 className="text-base font-bold text-purple-800 mb-4">Nuevo parte de accidente</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <EmpSelect />
                <div><label className="text-xs text-slate-600 font-semibold">Fecha</label><input type="date" value={form.fecha||''} onChange={(e: any) => setForm({...form, fecha: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" /></div>
                <div><label className="text-xs text-slate-600 font-semibold">Hora</label><input type="time" value={form.hora||''} onChange={(e: any) => setForm({...form, hora: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" /></div>
                <div><label className="text-xs text-slate-600 font-semibold">Lugar</label><input type="text" value={form.lugar||''} onChange={(e: any) => setForm({...form, lugar: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" /></div>
                <div><label className="text-xs text-slate-600 font-semibold">Gravedad</label><select value={form.gravedad||'Leve'} onChange={(e: any) => setForm({...form, gravedad: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white">{GRAVEDADES.map((g: string) => <option key={g}>{g}</option>)}</select></div>
                <div><label className="text-xs text-slate-600 font-semibold">Baja médica</label><select value={form.baja_medica||'No'} onChange={(e: any) => setForm({...form, baja_medica: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white"><option>Sí</option><option>No</option></select></div>
                {form.baja_medica === 'Sí' && <div><label className="text-xs text-slate-600 font-semibold">Días baja</label><input type="number" value={form.dias_baja||0} onChange={(e: any) => setForm({...form, dias_baja: parseInt(e.target.value)||0})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" /></div>}
                <div className="md:col-span-2"><label className="text-xs text-slate-600 font-semibold">Descripción *</label><textarea value={form.descripcion||''} onChange={(e: any) => setForm({...form, descripcion: e.target.value})} rows={3} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none" placeholder="Describe qué ocurrió..." /></div>
                <div><label className="text-xs text-slate-600 font-semibold">Tipo lesión</label><input type="text" value={form.tipo_lesion||''} onChange={(e: any) => setForm({...form, tipo_lesion: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" placeholder="Corte, contusión, esguince..." /></div>
                <div><label className="text-xs text-slate-600 font-semibold">Parte del cuerpo</label><input type="text" value={form.parte_cuerpo||''} onChange={(e: any) => setForm({...form, parte_cuerpo: e.target.value})} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm" placeholder="Mano, espalda..." /></div>
                <div className="md:col-span-2"><label className="text-xs text-slate-600 font-semibold">Medidas adoptadas</label><textarea value={form.medidas||''} onChange={(e: any) => setForm({...form, medidas: e.target.value})} rows={2} className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none" /></div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleAdd} disabled={guardando || !form.id_empleado || !form.descripcion} className="flex items-center gap-2 px-6 py-3 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 text-white text-sm font-bold rounded-xl">{guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Registrar accidente</button>
                <button onClick={() => setMostrarForm(false)} className="px-6 py-3 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl">Cancelar</button>
              </div>
            </div>
          )}
          {cargando ? <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-slate-400 mx-auto" /></div> : accidentes.length === 0 ? (
            <div className="text-center py-16"><CheckCircle2 size={48} className="text-emerald-300 mx-auto mb-3" /><p className="text-slate-500">Sin accidentes laborales registrados</p></div>
          ) : (
            <div className="space-y-3">{accidentes.map((a: any) => (
              <div key={a.id} className={`bg-white border rounded-2xl p-5 ${a.gravedad !== 'Leve' ? 'border-red-300 bg-red-50/30' : a.estado === 'abierto' ? 'border-amber-200' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-bold">{a.nombre}</span>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${a.gravedad === 'Leve' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{a.gravedad}</span>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${a.estado === 'abierto' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>{a.estado}</span>
                      {a.baja_medica === 'Sí' && <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">BAJA {a.dias_baja}d</span>}
                    </div>
                    <p className="text-sm text-slate-700 mb-1">{a.descripcion}</p>
                    <p className="text-xs text-slate-500">{a.centro} · {a.lugar} · {a.tipo_lesion} — {a.parte_cuerpo}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-bold">{fmtDate(a.fecha)}</p>
                    <p className="text-xs text-slate-400">{a.hora}</p>
                  </div>
                </div>
              </div>
            ))}</div>
          )}
        </div>
      )}

      {/* ═══ ALERTAS CADUCIDAD ═══ */}
      {tab === 'alertas' && (
        <div>
          {cargando ? <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-slate-400 mx-auto" /></div> : alertasCad.length === 0 ? (
            <div className="text-center py-16"><CheckCircle2 size={48} className="text-emerald-300 mx-auto mb-3" /><p className="text-slate-500">Sin alertas de caducidad en los próximos 90 días</p></div>
          ) : (
            <div className="space-y-3">{alertasCad.map((a: any, i: number) => {
              const colors = a.urgencia === 'vencido' || a.urgencia === 'critico' ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-200'
              const icons: Record<string, string> = { epi: '🦺', reconocimiento: '🏥', formacion: '🎓', documento: '📄' }
              return (
                <div key={i} className={`${colors} border-2 rounded-2xl p-5`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{icons[a.tipo] || '📄'}</span>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{a.subtipo || a.tipo}</p>
                        <p className="text-xs text-slate-600">{a.nombre} {a.dni ? '(' + a.dni + ')' : ''} {a.centro ? '· ' + a.centro : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`text-sm font-bold ${a.dias < 0 ? 'text-red-700' : 'text-amber-700'}`}>{a.dias < 0 ? 'Vencido hace ' + Math.abs(a.dias) + 'd' : 'Caduca en ' + a.dias + 'd'}</p>
                        <p className="text-xs text-slate-500">{fmtDate(a.fecha_caducidad)}</p>
                      </div>
                      <button onClick={() => setModalPlantilla({ titulo: 'Aviso caducidad — ' + a.nombre, datos: { nombre_empleado: a.nombre, dni: a.dni, centro: a.centro || '', tipo_epi: a.subtipo || a.tipo || '', caducidad_epi: a.fecha_caducidad || '', notas: (a.dias < 0 ? 'Vencido hace ' + Math.abs(a.dias) + ' días' : 'Caduca en ' + a.dias + ' días') } })}
                        className="flex items-center gap-2 px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl">
                        <FileText size={14} /> Generar aviso
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}</div>
          )}
        </div>
      )}
    </div>
  )
}
