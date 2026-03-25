import { useState, useEffect } from 'react'
import { api } from '../services/api'
import {
  Loader2, Plus, Users, FileText, CheckCircle2, AlertTriangle, XCircle,
  Save, Upload, UserPlus, Shield, Trash2, Phone, Mail, MapPin,
  CreditCard, Edit3, RefreshCw, FolderOpen, ClipboardList, UserCheck,
  Building2, Euro, Calendar, Hash, X, ChevronRight, ArrowRight
} from 'lucide-react'

function fmtDate(d: any) {
  if (!d) return ''
  try { const date = new Date(d); if (isNaN(date.getTime())) return String(d); return date.toLocaleDateString('es-ES') } catch { return String(d) }
}
function fmt(n: number) { return (n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' }

// Normalizar estados del script viejo al nuevo
function normalizarEstado(e: string): string {
  const mapa: Record<string, string> = {
    'pendiente_verificacion': 'pendiente_datos',
    'pendiente': 'pendiente_datos',
    'verificado': 'docs_verificados',
    'verificado_ok': 'docs_verificados',
    'incorporado_rrhh': 'incorporado',
  }
  return mapa[e] || e || 'pendiente_datos'
}

// Pasos del proceso en orden
const PASOS = [
  { key: 'pendiente_datos',  label: 'Pendiente datos',  color: 'amber',   icon: AlertTriangle,  accion: 'Contactar',          desc: 'Aún no hemos contactado con este trabajador' },
  { key: 'contactado',       label: 'Contactado',       color: 'blue',    icon: Phone,          accion: 'Marcar datos recibidos', desc: 'Contactado — esperando sus datos personales' },
  { key: 'datos_recibidos',  label: 'Datos recibidos',  color: 'indigo',  icon: ClipboardList,  accion: 'Verificar documentos',  desc: 'Datos recibidos — pendiente verificar documentación' },
  { key: 'docs_verificados', label: 'Docs verificados', color: 'emerald', icon: CheckCircle2,   accion: 'Incorporar a RRHH',    desc: 'Documentación verificada — listo para incorporar' },
  { key: 'incorporado',      label: 'En plantilla',     color: 'teal',    icon: UserCheck,      accion: null,                   desc: 'Incorporado a la plantilla de RRHH' },
  { key: 'rechazado',        label: 'Rechazado',        color: 'red',     icon: XCircle,        accion: null,                   desc: 'No incorporado' },
]

const colorMap: Record<string, { bg: string; border: string; text: string; btn: string; badge: string }> = {
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   btn: 'bg-amber-500 hover:bg-amber-600',   badge: 'bg-amber-100 text-amber-800' },
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    btn: 'bg-blue-600 hover:bg-blue-700',     badge: 'bg-blue-100 text-blue-800' },
  indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700',  btn: 'bg-indigo-600 hover:bg-indigo-700', badge: 'bg-indigo-100 text-indigo-800' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700', badge: 'bg-emerald-100 text-emerald-800' },
  teal:    { bg: 'bg-teal-50',    border: 'border-teal-200',    text: 'text-teal-700',    btn: 'bg-teal-600 hover:bg-teal-700',     badge: 'bg-teal-100 text-teal-800' },
  red:     { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     btn: 'bg-red-500 hover:bg-red-600',       badge: 'bg-red-100 text-red-800' },
}

function getPaso(estado: string) {
  return PASOS.find(p => p.key === estado) || PASOS[0]
}

function calcularCompletitud(p: any) {
  const campos = [
    { key: 'nombre', label: 'Nombre' }, { key: 'apellidos', label: 'Apellidos' },
    { key: 'dni', label: 'DNI/NIE' }, { key: 'telefono', label: 'Teléfono' },
    { key: 'nss', label: 'Nº SS' }, { key: 'fecha_nacimiento', label: 'Fecha nac.' },
    { key: 'direccion', label: 'Dirección' }, { key: 'cuenta_bancaria', label: 'IBAN' },
  ]
  const faltantes = campos.filter(c => !p[c.key]).map(c => c.label)
  return { pct: Math.round((campos.length - faltantes.length) / campos.length * 100), faltantes }
}

function BarraProgreso({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'
  return (
    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: pct + '%' }} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export default function SubrogacionPage() {
  const [vista, setVista] = useState<'lista' | 'detalle' | 'nueva'>('lista')
  const [cargando, setCargando] = useState(true)
  const [recargando, setRecargando] = useState(false)
  const [subrogaciones, setSubrogaciones] = useState<any[]>([])
  const [oportunidades, setOportunidades] = useState<any[]>([])
  const [convenios, setConvenios] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [subSel, setSubSel] = useState<any>(null)
  const [personal, setPersonal] = useState<any[]>([])
  const [guardando, setGuardando] = useState<string>('')
  const [generandoDoc, setGenerandoDoc] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState<any>({})
  const [mostrarAddPersona, setMostrarAddPersona] = useState(false)
  const [mostrarImport, setMostrarImport] = useState(false)
  const [importTexto, setImportTexto] = useState('')
  const [personaEditando, setPersonaEditando] = useState<string | null>(null)
  const [formPersona, setFormPersona] = useState<any>({})
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  const [incorporandoTodos, setIncorporandoTodos] = useState(false)

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 6000) }

  const cargar = async () => {
    setCargando(true)
    try {
      // 1 llamada batch en lugar de 3
      const batch = await (api as any).batchSubrogacion()
      setSubrogaciones(batch.subrogaciones?.subrogaciones || [])
      setOportunidades((batch.oportunidades?.oportunidades || []).filter((o: any) =>
        ['go', 'go_aprobado', 'presentada', 'adjudicada'].includes(o.estado)))
      setConvenios(batch.mapa_convenios?.provincias || [])
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  const cargarPersonal = async (subId: string) => {
    Object.keys(localStorage).filter(k => k.startsWith('fc_')).forEach(k => localStorage.removeItem(k))
    const data = await api.personalSubrogado(subId)
    // Normalizar estados del script antiguo al nuevo
    const normalizado = (data.personal || []).map((p: any) => ({
      ...p, estado: normalizarEstado(p.estado)
    }))
    setPersonal(normalizado)
  }

  const cargarDetalle = async (sub: any) => {
    setSubSel(sub); setVista('detalle'); setCargando(true)
    try { await cargarPersonal(sub.id) }
    catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  const actualizar = async () => {
    if (!subSel || recargando) return
    setRecargando(true)
    try { await cargarPersonal(subSel.id); showMsg('✅ Lista actualizada') }
    catch { showMsg('❌ Error') }
    finally { setRecargando(false) }
  }

  const cargarCategorias = async (id: string) => {
    try { const d = await api.categoriasConvenio(id); setCategorias(d.categorias || []) }
    catch { setCategorias([]) }
  }

  useEffect(() => { cargar() }, [])

  // ── Avanzar estado ────────────────────────────────────────────────────────
  const avanzarEstado = async (p: any) => {
    const estado = p.estado
    if (estado === 'pendiente_datos') {
      // Contactar → marcar como contactado
      try {
        const r = await (api as any).marcarContactadoSubrogado({ id: p.id })
        if (r.ok) {
          setPersonal(prev => prev.map(x => x.id === p.id ? { ...x, estado: 'contactado' } : x))
          showMsg('📞 Marcado como contactado — Ahora rellena sus datos personales con el lápiz ✏️')
        }
      } catch { showMsg('❌ Error') }
    } else if (estado === 'contactado') {
      // Datos recibidos → abrir el formulario de datos
      setPersonaEditando(personaEditando === p.id ? null : p.id)
      setFormPersona({ ...p })
      if (personaEditando !== p.id) showMsg('📝 Rellena los datos personales y pulsa "Guardar datos"')
    } else if (estado === 'datos_recibidos') {
      // Verificar docs
      try {
        const r = await api.verificarPersonalSubrogado({ id: p.id, estado: 'docs_verificados', aceptado: 'Sí' })
        if (r.ok) {
          setPersonal(prev => prev.map(x => x.id === p.id ? { ...x, estado: 'docs_verificados' } : x))
          showMsg('✅ Documentación verificada — Puedes incorporar a RRHH')
        }
      } catch { showMsg('❌ Error') }
    } else if (estado === 'docs_verificados') {
      // Incorporar a RRHH
      await incorporar(p)
    }
  }

  const guardarDatosPersonales = async (id: string) => {
    setGuardando(id)
    try {
      // Excluir campos que no son datos personales para que el backend pueda auto-avanzar el estado
      const { estado: _e, id: _i, id_subrogacion: _s, id_empleado_rrhh: _r, ...datosPersonales } = formPersona as any
      const r = await (api as any).actualizarDatosPersonalesSubrogado({ id, ...datosPersonales })
      if (r.ok) {
        const nuevoEstado = normalizarEstado(r.estado_nuevo || 'datos_recibidos')
        setPersonal(prev => prev.map(p => p.id === id
          ? { ...p, ...formPersona, estado: nuevoEstado } : p))
        const msgs: Record<string, string> = {
          datos_recibidos: '✅ Datos guardados — Estado: Datos recibidos. Siguiente paso: Verificar documentación ✓',
          contactado: '✅ Datos parciales guardados — Completa los datos para avanzar',
        }
        showMsg(msgs[nuevoEstado] || '✅ Datos guardados')
        setPersonaEditando(null); setFormPersona({})
      } else showMsg('❌ ' + (r.error || 'Error'))
    } catch { showMsg('❌ Error de conexión') }
    finally { setGuardando('') }
  }

  const incorporar = async (p: any, forzar = false) => {
    const { pct, faltantes } = calcularCompletitud(p)
    if (pct < 37 && !confirm(`Faltan: ${faltantes.join(', ')}.\n¿Incorporar de todas formas?`)) return
    setGuardando(p.id)
    try {
      const r = await api.incorporarSubrogadoRRHH({ id: p.id, forzar })
      if (r.ok) {
        setPersonal(prev => prev.map(x => x.id === p.id
          ? { ...x, estado: 'incorporado', id_empleado_rrhh: r.id_empleado } : x))
        showMsg('✅ Incorporado a plantilla RRHH — Expediente creado en Drive')
      } else if (r.error === 'DNI duplicado') {
        // DNI ya existe en plantilla — mostrar aviso claro con opciones
        const opcion = window.confirm(
          `⚠️ DNI DUPLICADO\n\n` +
          `El DNI ${r.dni} ya existe en la plantilla.\n` +
          `Empleado existente: ${r.empleado_existente}\n\n` +
          `Puede que:\n` +
          `• Sea un error en el DNI del subrogado (edítalo con el lápiz ✏️ y corrígelo)\n` +
          `• Sea la misma persona con nombre diferente\n\n` +
          `¿Crear ficha nueva igualmente? (ACEPTAR)\n` +
          `¿Cancelar y corregir el DNI? (CANCELAR)`
        )
        if (opcion) {
          // Crear ficha sin check DNI
          const rf = await (api as any).incorporarSubrogadoSinDniCheck({ id: p.id })
          if (rf?.ok) {
            setPersonal(prev => prev.map(x => x.id === p.id
              ? { ...x, estado: 'incorporado', id_empleado_rrhh: rf.id_empleado } : x))
            showMsg('✅ Ficha creada en RRHH — Nota: el DNI ' + r.dni + ' ya existía en plantilla, verifica que no hay duplicado')
          } else showMsg('❌ Error: ' + (rf?.error || 'Error desconocido'))
        } else {
          showMsg('⚠️ Operación cancelada — Edita el DNI con el lápiz ✏️ y vuelve a intentarlo')
        }
      } else {
        showMsg('❌ Error: ' + (r.error || 'Error desconocido'))
      }
    } catch (e: any) { showMsg('❌ Error de conexión: ' + (e?.message || '')) }
    finally { setGuardando('') }
  }

  const incorporarTodos = async () => {
    const pendientes = personal.filter(p => p.estado === 'docs_verificados' && !p.id_empleado_rrhh)
    if (!pendientes.length) { showMsg('⚠️ No hay trabajadores verificados pendientes'); return }
    if (!confirm(`¿Incorporar ${pendientes.length} trabajadores a RRHH?\nSe creará expediente Drive para cada uno.`)) return
    setIncorporandoTodos(true)
    let ok = 0, errores: string[] = []
    for (const p of pendientes) {
      try {
        const r = await api.incorporarSubrogadoRRHH({ id: p.id })
        if (r.ok) {
          setPersonal(prev => prev.map(x => x.id === p.id ? { ...x, estado: 'incorporado', id_empleado_rrhh: r.id_empleado } : x))
          ok++
        } else if (r.error === 'DNI duplicado') {
          errores.push(`${p.nombre} ${p.apellidos}: DNI ${r.dni} ya existe en plantilla (${r.empleado_existente}) — corrige el DNI manualmente`)
        } else {
          errores.push((p.nombre || '?') + ': ' + r.error)
        }
      } catch (e: any) { errores.push((p.nombre || '?') + ': error conexión') }
      await new Promise(res => setTimeout(res, 600))
    }
    setIncorporandoTodos(false)
    if (errores.length > 0) showMsg(`⚠️ ${ok} incorporados. Errores: ${errores.join(' | ')}`)
    else showMsg(`✅ ${ok} trabajadores incorporados a RRHH`)
  }

  const rechazar = async (id: string) => {
    if (!confirm('¿Marcar como rechazado? El trabajador no se incorporará a la plantilla.')) return
    try {
      const r = await (api as any).actualizarDatosPersonalesSubrogado({ id, estado: 'rechazado' })
      if (r.ok) setPersonal(prev => prev.map(p => p.id === id ? { ...p, estado: 'rechazado' } : p))
    } catch { showMsg('❌ Error') }
  }

  const generarCarta = async (p: any) => {
    if (!p.nombre) { showMsg('⚠️ Necesita nombre y apellidos'); return }
    setGenerandoDoc(p.id)
    try {
      const r = await api.generarCartaSubrogacion({ ...p, id_subrogacion: subSel.id, titulo: subSel.titulo, organismo: subSel.organismo, convenio: subSel.convenio, fecha_subrogacion: subSel.fecha_subrogacion })
      if (r?.ok && r.url) { window.open(r.url, '_blank'); showMsg('✅ Carta Art.44 ET generada en Drive') }
      else showMsg('❌ ' + (r?.error || 'Error'))
    } catch { showMsg('❌ Error') }
    finally { setGenerandoDoc(null) }
  }

  const abrirExpediente = async (idEmpleado: string) => {
    try {
      const exp = await (api as any).expediente(idEmpleado)
      if (exp?.carpeta_raiz_url) window.open(exp.carpeta_raiz_url, '_blank')
      else showMsg('⚠️ Expediente Drive no disponible aún')
    } catch { showMsg('❌ Error') }
  }

  const handleCrear = async () => {
    setGuardando('crear')
    try {
      const opo = oportunidades.find((o: any) => o.id === form.id_oportunidad)
      const r = await api.crearSubrogacion({ ...form, titulo: opo?.titulo || '', organismo: opo?.organismo || '' })
      if (r?.ok) { showMsg('✅ Subrogación creada'); setVista('lista'); setForm({}); cargar() }
      else showMsg('❌ ' + (r?.error || 'Error'))
    } catch { showMsg('❌ Error') }
    finally { setGuardando('') }
  }

  const handleAddPersona = async () => {
    setGuardando('add')
    try {
      const r = await api.addPersonalSubrogado({ ...form, id_subrogacion: subSel.id })
      if (r?.ok) { showMsg('✅ Persona añadida'); setMostrarAddPersona(false); setForm({}); await cargarPersonal(subSel.id) }
      else showMsg('❌ ' + (r?.error || 'Error'))
    } catch { showMsg('❌ Error') }
    finally { setGuardando('') }
  }

  const handleImportar = async () => {
    setGuardando('import')
    try {
      const conv = convenios.find((c: any) => c.id === subSel.convenio)
      const r = await api.importarListadoSubrogacion({ id_subrogacion: subSel.id, listado: importTexto, convenio: conv ? conv.sector + ' — ' + conv.provincia : subSel.convenio })
      if (r?.ok) { showMsg('✅ ' + r.importados + ' personas importadas'); setMostrarImport(false); setImportTexto(''); await cargarPersonal(subSel.id) }
      else showMsg('❌ ' + (r?.error || 'Error'))
    } catch { showMsg('❌ Error') }
    finally { setGuardando('') }
  }

  const eliminarPersona = async (id: string) => {
    if (!confirm('¿Eliminar?')) return
    try { await api.eliminarPersonalSubrogado(id, subSel.id); setPersonal(prev => prev.filter(p => p.id !== id)) } catch { }
  }

  const eliminarSub = async (id: string) => {
    if (!confirm('¿Eliminar subrogación completa?')) return
    try { const r = await api.eliminarSubrogacion(id); if (r.ok) { cargar(); setVista('lista') } } catch { }
  }

  const personalFiltrado = filtroEstado ? personal.filter(p => p.estado === filtroEstado) : personal
  const statsEstados = personal.reduce((acc: any, p) => { acc[p.estado] = (acc[p.estado] || 0) + 1; return acc }, {})
  const pctGlobal = personal.length > 0 ? Math.round(personal.reduce((s, p) => s + calcularCompletitud(p).pct, 0) / personal.length) : 0
  const verificadosPendientes = personal.filter(p => p.estado === 'docs_verificados' && !p.id_empleado_rrhh).length

  if (cargando && subrogaciones.length === 0 && vista === 'lista')
    return <div className="flex flex-col items-center py-20"><Loader2 size={32} className="text-orange-600 animate-spin mb-3" /></div>

  return (
    <div className="max-w-5xl">
      {/* Cabecera */}
      <div className="flex items-center gap-4 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-orange-700 to-amber-600 rounded-xl shadow-lg shadow-orange-200"><Users size={22} className="text-white" /></div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Subrogación de Personal</h1>
          <p className="text-sm text-slate-500">Art. 44 ET — {subrogaciones.length} procesos</p>
        </div>
        {vista !== 'lista' && (
          <button onClick={() => { setVista('lista'); setSubSel(null); setPersonaEditando(null) }}
            className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">← Volver</button>
        )}
      </div>

      {msg && (
        <div className={`mb-4 p-4 rounded-xl text-sm font-medium border flex gap-2 items-start ${msg.includes('✅') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : msg.startsWith('❌') ? 'bg-red-50 text-red-800 border-red-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
          <span className="flex-1">{msg}</span><button onClick={() => setMsg('')}><X size={14} /></button>
        </div>
      )}

      {/* ══ LISTA ══════════════════════════════════════════════════════════ */}
      {vista === 'lista' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setVista('nueva'); setForm({}) }} className="flex items-center gap-2 px-5 py-2.5 bg-orange-700 hover:bg-orange-800 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-200">
              <Plus size={16} /> Nueva subrogación
            </button>
          </div>
          {subrogaciones.length === 0
            ? <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl"><Users size={48} className="text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Sin subrogaciones</p></div>
            : <div className="space-y-3">{subrogaciones.map((s: any) => (
              <div key={s.id} className="bg-white border-2 border-slate-200 hover:border-orange-300 rounded-2xl p-5 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <button onClick={() => cargarDetalle(s)} className="text-left flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 mb-1">{s.titulo}</h3>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Building2 size={11} />{s.organismo}</span>
                      <span className="flex items-center gap-1"><Users size={11} />{s.num_personal || 0} personas</span>
                      {s.coste_anual > 0 && <span className="flex items-center gap-1"><Euro size={11} />{fmt(s.coste_anual)}/año</span>}
                      {s.empresa_saliente && <span>← {s.empresa_saliente}</span>}
                    </div>
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => cargarDetalle(s)} className="px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200">Gestionar →</button>
                    <button onClick={() => eliminarSub(s.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}</div>
          }
        </div>
      )}

      {/* ══ NUEVA ══════════════════════════════════════════════════════════ */}
      {vista === 'nueva' && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6">
          <h2 className="text-base font-bold text-orange-800 mb-5">Nueva subrogación</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Licitación adjudicada *</label>
              <select value={form.id_oportunidad || ''} onChange={(e: any) => { const o = oportunidades.find((op: any) => op.id === e.target.value); setForm({ ...form, id_oportunidad: e.target.value, titulo: o?.titulo, organismo: o?.organismo }) }} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Seleccionar —</option>
                {oportunidades.map((o: any) => <option key={o.id} value={o.id}>[{o.estado.toUpperCase()}] {o.titulo?.substring(0, 80)}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Empresa saliente *</label><input type="text" value={form.empresa_saliente || ''} onChange={(e: any) => setForm({ ...form, empresa_saliente: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm" /></div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Convenio</label>
              <select value={form.convenio || ''} onChange={(e: any) => { setForm({ ...form, convenio: e.target.value }); if (e.target.value) cargarCategorias(e.target.value) }} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Seleccionar —</option>
                {convenios.map((c: any) => <option key={c.id} value={c.id}>{c.sector} — {c.provincia}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Fecha subrogación</label><input type="date" value={form.fecha_subrogacion || ''} onChange={(e: any) => setForm({ ...form, fecha_subrogacion: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Fecha inicio contrato</label><input type="date" value={form.fecha_inicio_contrato || ''} onChange={(e: any) => setForm({ ...form, fecha_inicio_contrato: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm" /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCrear} disabled={guardando === 'crear' || !form.empresa_saliente} className="flex items-center gap-2 px-6 py-2.5 bg-orange-700 hover:bg-orange-800 disabled:bg-orange-300 text-white text-sm font-bold rounded-xl">
              {guardando === 'crear' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Crear
            </button>
            <button onClick={() => setVista('lista')} className="px-6 py-2.5 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl">Cancelar</button>
          </div>
        </div>
      )}

      {/* ══ DETALLE ════════════════════════════════════════════════════════ */}
      {vista === 'detalle' && subSel && (
        <div>
          {/* Guía de proceso — banner visible */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-4 mb-4">
            <p className="text-xs font-bold text-orange-800 mb-2">📋 Flujo del proceso — pulsa el botón de acción en cada tarjeta para avanzar al siguiente paso:</p>
            <div className="flex items-center gap-1 flex-wrap">
              {PASOS.filter(p => p.key !== 'rechazado').map((paso, i) => {
                const c = colorMap[paso.color]
                const count = statsEstados[paso.key] || 0
                return (
                  <div key={paso.key} className="flex items-center gap-1">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${c.badge}`}>
                      <span>{count}</span> {paso.label}
                    </div>
                    {i < PASOS.length - 2 && <ChevronRight size={12} className="text-slate-300" />}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Info subrogación */}
          <div className="bg-white border-2 border-orange-200 rounded-2xl p-5 mb-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-slate-900">{subSel.titulo}</h2>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                  <span><strong>{subSel.empresa_saliente}</strong> → Forgeser</span>
                  {subSel.fecha_subrogacion && <span><Calendar size={11} className="inline" /> {fmtDate(subSel.fecha_subrogacion)}</span>}
                  <span>{personal.length} trabajadores</span>
                </div>
              </div>
              <button onClick={() => eliminarSub(subSel.id)} className="p-2 text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
            </div>

            {/* Progreso completitud + botón incorporar todos */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-slate-500">Datos personales recogidos:</span>
              <div className="flex-1 min-w-[80px]"><BarraProgreso pct={pctGlobal} /></div>
              <span className="text-xs font-bold text-slate-700">{pctGlobal}%</span>
              {verificadosPendientes > 0 && (
                <button onClick={incorporarTodos} disabled={incorporandoTodos}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl">
                  {incorporandoTodos ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />}
                  Incorporar todos a RRHH ({verificadosPendientes})
                </button>
              )}
            </div>
          </div>

          {/* Barra acciones */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={() => { setMostrarAddPersona(!mostrarAddPersona); setForm({}) }} className="flex items-center gap-2 px-4 py-2 bg-orange-700 hover:bg-orange-800 text-white text-xs font-bold rounded-xl"><UserPlus size={14} /> Añadir persona</button>
            <button onClick={() => setMostrarImport(!mostrarImport)} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-xl"><Upload size={14} /> Importar CSV</button>
            <button onClick={actualizar} disabled={recargando} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl">
              {recargando ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Actualizar
            </button>
            {filtroEstado && <button onClick={() => setFiltroEstado('')} className="flex items-center gap-1 px-3 py-2 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-xl"><X size={12} /> Filtro activo: {getPaso(filtroEstado).label}</button>}
          </div>

          {/* Importar */}
          {mostrarImport && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-4">
              <h3 className="text-sm font-bold text-slate-700 mb-2">Importar CSV</h3>
              <p className="text-xs text-slate-500 mb-3">Formato: <code className="bg-slate-200 px-1 rounded">Nombre;Apellidos;Categoría;Grupo;Antigüedad;Salario;Jornada;Centro</code></p>
              <textarea value={importTexto} onChange={(e: any) => setImportTexto(e.target.value)} rows={4} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono resize-none mb-3" />
              <div className="flex gap-2">
                <button onClick={handleImportar} disabled={guardando === 'import' || !importTexto.trim()} className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white text-sm rounded-xl disabled:opacity-50">
                  {guardando === 'import' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Importar
                </button>
                <button onClick={() => setMostrarImport(false)} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl">Cancelar</button>
              </div>
            </div>
          )}

          {/* Añadir persona */}
          {mostrarAddPersona && (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 mb-4">
              <h3 className="text-sm font-bold text-orange-800 mb-4">Añadir trabajador</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <div><label className="text-xs font-semibold text-slate-600">Nombre *</label><input type="text" value={form.nombre || ''} onChange={(e: any) => setForm({ ...form, nombre: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                <div><label className="text-xs font-semibold text-slate-600">Apellidos *</label><input type="text" value={form.apellidos || ''} onChange={(e: any) => setForm({ ...form, apellidos: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Categoría</label>
                  <select value={form.categoria || ''} onChange={(e: any) => { const cat = categorias.find((c: any) => c.categoria === e.target.value); setForm({ ...form, categoria: e.target.value, grupo: cat?.grupo || '', salario: cat?.total_anual_bruto || form.salario }) }} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                    <option value="">— Seleccionar —</option>
                    {categorias.map((c: any, i: number) => <option key={i} value={c.categoria}>{c.grupo} — {c.categoria}</option>)}
                  </select>
                </div>
                <div><label className="text-xs font-semibold text-slate-600">Antigüedad</label><input type="text" value={form.antiguedad || ''} placeholder="ej: 3 años" onChange={(e: any) => setForm({ ...form, antiguedad: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                <div><label className="text-xs font-semibold text-slate-600">Salario bruto/año (€)</label><input type="number" value={form.salario || ''} onChange={(e: any) => setForm({ ...form, salario: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                <div><label className="text-xs font-semibold text-slate-600">Centro</label><input type="text" value={form.centro || ''} onChange={(e: any) => setForm({ ...form, centro: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddPersona} disabled={guardando === 'add' || !form.nombre} className="flex items-center gap-2 px-4 py-2 bg-orange-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
                  {guardando === 'add' ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Añadir
                </button>
                <button onClick={() => { setMostrarAddPersona(false); setForm({}) }} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl">Cancelar</button>
              </div>
            </div>
          )}

          {/* ── Lista trabajadores ──────────────────────────────────────── */}
          {cargando && personal.length === 0
            ? <div className="text-center py-12"><Loader2 size={28} className="text-orange-400 animate-spin mx-auto" /></div>
            : personal.length === 0
              ? <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl"><Users size={36} className="text-slate-300 mx-auto mb-3" /><p className="text-slate-400">Sin personal — Añade o importa</p></div>
              : (
                <div className="space-y-3">
                  {personalFiltrado.map((p: any) => {
                    const paso = getPaso(p.estado)
                    const c = colorMap[paso.color]
                    const { pct, faltantes } = calcularCompletitud(p)
                    const esEditando = personaEditando === p.id
                    const estaGuardando = guardando === p.id
                    const incorporado = p.estado === 'incorporado'
                    const rechazado = p.estado === 'rechazado'

                    return (
                      <div key={p.id} className={`rounded-2xl border-2 overflow-hidden bg-white ${c.border}`}>

                        {/* ── Fila principal ── */}
                        <div className="flex items-center gap-3 p-4">
                          {/* Avatar */}
                          <div className={`w-10 h-10 rounded-full ${c.bg} flex items-center justify-center ${c.text} font-bold text-sm flex-shrink-0`}>
                            {(p.nombre?.[0] || '?')}{(p.apellidos?.[0] || '')}
                          </div>

                          {/* Datos */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="text-sm font-bold text-slate-900">
                                {p.nombre && p.apellidos ? `${p.nombre} ${p.apellidos}` : <em className="text-amber-600">Sin nombre</em>}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.badge}`}>{paso.label}</span>
                              {p.id_empleado_rrhh && <span className="text-[10px] bg-teal-100 text-teal-700 font-medium px-2 py-0.5 rounded-full">{p.id_empleado_rrhh}</span>}
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                              {p.categoria && <span>{p.categoria}</span>}
                              {p.salario > 0 && <span>{fmt(p.salario)}/año</span>}
                              {p.telefono && <span className="flex items-center gap-0.5"><Phone size={9} />{p.telefono}</span>}
                              {p.dni && <span className="flex items-center gap-0.5"><Hash size={9} />{p.dni}</span>}
                            </div>
                            {/* Barra completitud */}
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="w-20"><BarraProgreso pct={pct} /></div>
                              <span className="text-[10px] text-slate-400">{pct}% datos</span>
                              {faltantes.length > 0 && pct < 100 && (
                                <span className="text-[10px] text-amber-600">Falta: {faltantes.slice(0, 2).join(', ')}{faltantes.length > 2 ? ` +${faltantes.length - 2}` : ''}</span>
                              )}
                            </div>
                          </div>

                          {/* BOTÓN ACCIÓN PRINCIPAL — el paso siguiente */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!incorporado && !rechazado && paso.accion && (
                              <button
                                onClick={() => avanzarEstado(p)}
                                disabled={estaGuardando}
                                className={`flex items-center gap-1.5 px-3 py-2 ${c.btn} text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50 min-w-[110px] justify-center`}
                              >
                                {estaGuardando
                                  ? <Loader2 size={12} className="animate-spin" />
                                  : <ArrowRight size={12} />}
                                {paso.accion}
                              </button>
                            )}
                            {/* Editar datos */}
                            <button onClick={() => {
                              if (esEditando) { setPersonaEditando(null); setFormPersona({}) }
                              else { setPersonaEditando(p.id); setFormPersona({ ...p }) }
                            }} className={`p-2 rounded-xl transition-colors ${esEditando ? 'bg-orange-100 text-orange-700' : 'text-slate-400 hover:bg-slate-100'}`} title="Editar datos personales">
                              <Edit3 size={14} />
                            </button>
                            {/* Carta */}
                            <button onClick={() => generarCarta(p)} disabled={generandoDoc === p.id || !p.nombre}
                              className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl disabled:opacity-30" title="Carta Art.44 ET">
                              {generandoDoc === p.id ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                            </button>
                            {/* Drive */}
                            {p.id_empleado_rrhh && (
                              <button onClick={() => abrirExpediente(p.id_empleado_rrhh)} className="p-2 text-teal-600 hover:bg-teal-50 rounded-xl" title="Expediente Drive">
                                <FolderOpen size={14} />
                              </button>
                            )}
                            {/* Rechazar */}
                            {!incorporado && !rechazado && (
                              <button onClick={() => rechazar(p.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl" title="Rechazar">
                                <XCircle size={14} />
                              </button>
                            )}
                            {/* Eliminar */}
                            {!incorporado && (
                              <button onClick={() => eliminarPersona(p.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl" title="Eliminar">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* ── Panel datos personales (expandible) ── */}
                        {esEditando && (
                          <div className={`border-t ${c.border} ${c.bg} p-4`}>
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <ClipboardList size={13} /> Datos personales
                              </p>
                              <span className={`text-[10px] px-2 py-1 rounded-lg font-medium ${c.badge}`}>
                                {paso.desc}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div><label className="block text-[10px] text-slate-500 uppercase mb-1">Nombre</label><input type="text" value={formPersona.nombre || ''} onChange={(e: any) => setFormPersona({ ...formPersona, nombre: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" /></div>
                              <div><label className="block text-[10px] text-slate-500 uppercase mb-1">Apellidos</label><input type="text" value={formPersona.apellidos || ''} onChange={(e: any) => setFormPersona({ ...formPersona, apellidos: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" /></div>
                              <div><label className="block text-[10px] text-slate-500 uppercase mb-1">DNI/NIE</label><input type="text" value={formPersona.dni || ''} onChange={(e: any) => setFormPersona({ ...formPersona, dni: e.target.value })} placeholder="12345678A" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" /></div>
                              <div><label className="block text-[10px] text-slate-500 uppercase mb-1">Fecha nacimiento</label><input type="date" value={formPersona.fecha_nacimiento || ''} onChange={(e: any) => setFormPersona({ ...formPersona, fecha_nacimiento: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" /></div>
                              <div><label className="block text-[10px] text-slate-500 uppercase mb-1">Teléfono</label><input type="tel" value={formPersona.telefono || ''} onChange={(e: any) => setFormPersona({ ...formPersona, telefono: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" /></div>
                              <div><label className="block text-[10px] text-slate-500 uppercase mb-1">Email</label><input type="email" value={formPersona.email || ''} onChange={(e: any) => setFormPersona({ ...formPersona, email: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" /></div>
                              <div className="md:col-span-2"><label className="block text-[10px] text-slate-500 uppercase mb-1">Dirección</label><input type="text" value={formPersona.direccion || ''} onChange={(e: any) => setFormPersona({ ...formPersona, direccion: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" /></div>
                              <div><label className="block text-[10px] text-slate-500 uppercase mb-1">Nº Seg. Social</label><input type="text" value={formPersona.nss || ''} onChange={(e: any) => setFormPersona({ ...formPersona, nss: e.target.value })} placeholder="28/12345678/00" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" /></div>
                              <div><label className="block text-[10px] text-slate-500 uppercase mb-1">IBAN</label><input type="text" value={formPersona.cuenta_bancaria || ''} onChange={(e: any) => setFormPersona({ ...formPersona, cuenta_bancaria: e.target.value })} placeholder="ES00 0000..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" /></div>
                              <div><label className="block text-[10px] text-slate-500 uppercase mb-1">Empresa anterior</label><input type="text" value={formPersona.empresa_anterior_real || ''} onChange={(e: any) => setFormPersona({ ...formPersona, empresa_anterior_real: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" /></div>
                              <div><label className="block text-[10px] text-slate-500 uppercase mb-1">Tel. emergencia</label><input type="tel" value={formPersona.tel_emergencia || ''} onChange={(e: any) => setFormPersona({ ...formPersona, tel_emergencia: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" /></div>
                            </div>

                            <div className="flex items-center gap-2 mt-4 flex-wrap">
                              <button onClick={() => guardarDatosPersonales(p.id)} disabled={estaGuardando}
                                className="flex items-center gap-2 px-5 py-2.5 bg-orange-700 hover:bg-orange-800 disabled:opacity-50 text-white text-sm font-bold rounded-xl">
                                {estaGuardando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                {estaGuardando ? 'Guardando...' : 'Guardar datos'}
                              </button>
                              <button onClick={() => { setPersonaEditando(null); setFormPersona({}) }}
                                className="px-4 py-2.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl">Cancelar</button>
                              <div className="flex-1" />
                              <button onClick={() => generarCarta(p)} disabled={!!generandoDoc || !p.nombre}
                                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl">
                                <FileText size={14} /> Carta Art.44 ET
                              </button>
                            </div>

                            {/* Checklist documentos */}
                            {!incorporado && (
                              <div className="mt-3 p-3 bg-white/70 border border-slate-200 rounded-xl">
                                <p className="text-xs font-bold text-slate-600 mb-2">📋 Documentos a recopilar:</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                                  {[
                                    { doc: 'DNI/NIE (fotocopia)', ok: !!p.dni },
                                    { doc: 'Nº Seguridad Social', ok: !!p.nss },
                                    { doc: 'IBAN cuenta bancaria', ok: !!p.cuenta_bancaria },
                                    { doc: 'Reconocimiento médico', ok: false },
                                    { doc: 'Formación PRL básica', ok: false },
                                    { doc: 'Consentimiento RGPD', ok: false },
                                  ].map(({ doc, ok }) => (
                                    <div key={doc} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-emerald-700' : 'text-slate-500'}`}>
                                      {ok ? <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0" /> : <div className="w-2.5 h-2.5 rounded border border-slate-300 flex-shrink-0" />}
                                      {doc}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
          }
        </div>
      )}
    </div>
  )
}