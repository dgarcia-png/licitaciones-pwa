import { useState, useEffect } from 'react'
import { usePermisos } from '../hooks/usePermisos'
import { useConfigListas } from '../hooks/useConfigListas'
import { api } from '../services/api'
import ConfirmModal from '../components/ConfirmModal'
import {
  Users, Search, Plus, Loader2, User, Phone, Mail, MapPin, Calendar,
  Briefcase, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp,
  Edit3, X, Save, Clock, FileText, ExternalLink, UserMinus, Shield, FolderOpen, FolderArchive, RefreshCw
} from 'lucide-react'

const _DEFAULT_TIPOS_CONTRATO = ['Indefinido', 'Temporal', 'Obra y servicio', 'Interinidad', 'Formación', 'Prácticas']
const _DEFAULT_TURNOS = ['Mañana', 'Tarde', 'Noche', 'Rotativo', 'Partido', 'Completo']
const ESTADOS = ['activo', 'baja', 'excedencia', 'suspendido']

const DOCS_OBLIGATORIOS = [
  { tipo: 'dni', label: 'DNI / NIE', icon: '🪪' },
  { tipo: 'contrato_laboral', label: 'Contrato', icon: '📝' },
  { tipo: 'reconocimiento_medico', label: 'Reconocimiento médico', icon: '🏥' },
  { tipo: 'certificado_prl', label: 'Formación PRL', icon: '⛑️' },
  { tipo: 'certificado_delitos', label: 'Cert. delitos sexuales', icon: '📋' },
  { tipo: 'consentimiento', label: 'Consentimiento RGPD', icon: '✍️' },
]

function fmt(n: number) { return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' }
function fmtDate(d: any) {
  if (!d) return ''
  try {
    const str = String(d)
    // Ignorar fechas inválidas del backend (1899, epoch, etc.)
    if (str.includes('1899') || str.includes('1900') || str === '0' || str === 'undefined') return ''
    const date = new Date(d)
    if (isNaN(date.getTime())) return ''
    if (date.getFullYear() < 1950 || date.getFullYear() > 2100) return ''
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return '' }
}

export default function PersonalPage() {
  const { puedeVerTodaPlantilla, puedeGestionarRRHH, centrosAsignados } = usePermisos()
  const { tiposContrato: TIPOS_CONTRATO, turnos: TURNOS } = useConfigListas()

  const [empleados, setEmpleados] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('activo')
  const [vista, setVista] = useState<'lista'|'nuevo'|'detalle'>('lista')
  const [empleadoSel, setEmpleadoSel] = useState<any>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [editando, setEditando] = useState(false)

  // Tabs del detalle
  const [tabDetalle, setTabDetalle] = useState<'datos'|'expediente'|'prl'>('datos')

  // Expediente digital
  const [expediente, setExpediente] = useState<any>(null)
  const [cargandoExpediente, setCargandoExpediente] = useState(false)

  // Asignaciones
  const [asignaciones, setAsignaciones] = useState<any[]>([])
  const [historialCentros, setHistorialCentros] = useState<any>(null)
  const [cargandoCentros, setCargandoCentros] = useState(false)
  const [mostrarAddAsig, setMostrarAddAsig] = useState(false)
  const [capacidad, setCapacidad] = useState<any>(null)
  const [oportunidades, setOportunidades] = useState<any[]>([])
  const [asigForm, setAsigForm] = useState<any>({ nombre_proyecto: '', id_proyecto: '', cliente: '', porcentaje: 100, rol: '', subrogable: 'No', notas: '' })

  // PRL del empleado
  const [prlEpis, setPrlEpis] = useState<any[]>([])
  const [prlRecos, setPrlRecos] = useState<any[]>([])
  const [prlFormacion, setPrlFormacion] = useState<any[]>([])
  const [prlAccidentes, setPrlAccidentes] = useState<any[]>([])

  // Form nuevo empleado
  const [form, setForm] = useState<any>({
    nombre: '', apellidos: '', dni: '', fecha_nacimiento: '', direccion: '',
    telefono: '', email: '', nss: '', cuenta_banco: '', categoria: '', grupo: '',
    convenio: '', tipo_contrato: 'Indefinido', fecha_alta: '', centro: '', zona: '',
    jornada: 38, turno: 'Mañana', salario: 0, notas: '',
    horario_entrada: '', horario_salida: '', dias_trabajo: 'L-V', carnet: '',
    vehiculo: '', talla: '', competencias: '', contacto_emergencia: '', tel_emergencia: '',
    disponible_sustituciones: 'Sí'
  })

  // Convenios y categorías
  const [convenios, setConvenios] = useState<any[]>([])
  const [categoriasConv, setCategoriasConv] = useState<any[]>([])
  const [cargandoCats, setCargandoCats] = useState(false)

  // Complementos salariales
  const [complementos, setComplementos] = useState<{concepto: string; importe: number}[]>([])
  const [complementosDet, setComplementosDet] = useState<{concepto: string; importe: number}[]>([])

  const addComplemento = (target: 'form' | 'detalle') => {
    if (target === 'form') setComplementos([...complementos, { concepto: '', importe: 0 }])
    else setComplementosDet([...complementosDet, { concepto: '', importe: 0 }])
  }
  const removeComplemento = (idx: number, target: 'form' | 'detalle') => {
    if (target === 'form') setComplementos(complementos.filter((_: any, i: number) => i !== idx))
    else setComplementosDet(complementosDet.filter((_: any, i: number) => i !== idx))
  }
  const updateComplemento = (idx: number, field: string, value: any, target: 'form' | 'detalle') => {
    if (target === 'form') { const c = [...complementos]; (c[idx] as any)[field] = value; setComplementos(c) }
    else { const c = [...complementosDet]; (c[idx] as any)[field] = value; setComplementosDet(c) }
  }
  const totalComplementos = (comps: {concepto: string; importe: number}[]) => comps.reduce((s: number, c: any) => s + (c.importe || 0), 0)

  const cargar = async () => {
    setCargando(true)
    try {
      if (busqueda) {
        const data = await api.empleados(busqueda)
        let emps = data.empleados || []
        if (!puedeVerTodaPlantilla && centrosAsignados.length > 0)
          emps = emps.filter((e: any) => centrosAsignados.includes(e.centro) || centrosAsignados.includes(e.zona))
        setEmpleados(emps); setStats(data.stats || {})
      } else {
        const data = await api.batch(['empleados', 'mapa_convenios'])
        let emps = data.empleados?.empleados || []
        if (!puedeVerTodaPlantilla && centrosAsignados.length > 0)
          emps = emps.filter((e: any) => centrosAsignados.includes(e.centro) || centrosAsignados.includes(e.zona))
        setEmpleados(emps); setStats(data.empleados?.stats || {}); setConvenios(data.mapa_convenios?.provincias || [])
      }
    } catch (e: any) { console.error(e) }
    finally { setCargando(false) }
  }

  const cargarExpediente = async (id: string) => {
    setCargandoExpediente(true)
    try { const data = await api.expediente(id); setExpediente(data) }
    catch (e) { console.error(e) }
    finally { setCargandoExpediente(false) }
  }

  const cargarCategorias = async (convenioId: string) => {
    if (!convenioId) { setCategoriasConv([]); return }
    setCargandoCats(true)
    try {
      const data = await api.categoriasConvenio(convenioId)
      setCategoriasConv(data.categorias || [])
    } catch (e: any) { console.error(e) }
    finally { setCargandoCats(false) }
  }

  const seleccionarConvenio = (convenioId: string, target: 'form' | 'detalle') => {
    const conv = convenios.find((c: any) => c.id === convenioId)
    if (target === 'form') {
      setForm({ ...form, convenio: conv ? conv.id : '', jornada: conv?.horas_anuales ? Math.round(conv.horas_anuales / 46.5) : form.jornada })
    } else if (empleadoSel) {
      setEmpleadoSel({ ...empleadoSel, convenio: conv ? conv.id : '', jornada: conv?.horas_anuales ? Math.round(conv.horas_anuales / 46.5) : empleadoSel.jornada })
    }
    cargarCategorias(convenioId)
  }

  const seleccionarCategoria = (cat: any, target: 'form' | 'detalle') => {
    if (target === 'form') {
      setForm({ ...form, categoria: cat.categoria, grupo: cat.grupo + (cat.nivel ? ' ' + cat.nivel : ''), salario: cat.total_anual_bruto || 0 })
    } else if (empleadoSel) {
      setEmpleadoSel({ ...empleadoSel, categoria: cat.categoria, grupo: cat.grupo + (cat.nivel ? ' ' + cat.nivel : ''), salario: cat.total_anual_bruto || 0 })
    }
  }

  useEffect(() => { cargar() }, [busqueda])

  const abrirDetalle = (emp: any) => {
    // Apertura instantánea — solo estado local, cero API
    setEmpleadoSel(emp)
    setVista('detalle')
    setTabDetalle('datos')
    setEditando(false)
    setExpediente(null)
    setAsignaciones([])
    setCapacidad(null)
    setPrlEpis([]); setPrlRecos([]); setPrlFormacion([]); setPrlAccidentes([])
    // Cargar datos extra en segundo plano sin bloquear
    cargarDetalleFondo(emp.id)
  }

  const cargarDetalleFondo = async (id: string) => {
    // Cargar empleado y asignaciones
    try {
      const data = await api.batch(['empleado', 'asignaciones_emp'], id)
      if (data.empleado?.ok) setEmpleadoSel(data.empleado.empleado)
      setAsignaciones(data.asignaciones?.asignaciones || [])
    } catch(e) {}

    // Cargar historial centros territorio
    setCargandoCentros(true)
    try {
      const hist = await api.historialCentrosEmpleado(id)
      setHistorialCentros(hist)
    } catch(e) { console.warn('historial centros no disponible', e) }
    finally { setCargandoCentros(false) }
    api.batch(['capacidad', 'prl_epis_emp', 'prl_reco_emp', 'prl_form_emp', 'prl_acc_emp'], id)
      .then((extra: any) => {
        setCapacidad(extra.capacidad || null)
        setPrlEpis(extra.prl_epis?.epis || [])
        setPrlRecos(extra.prl_reconocimientos?.reconocimientos || [])
        setPrlFormacion(extra.prl_formacion?.formaciones || [])
        setPrlAccidentes(extra.prl_accidentes?.accidentes || [])
      }).catch(() => {})
  }

  const cargarDetalle = (id: string) => {
    const emp = empleados.find((e: any) => e.id === id)
    if (emp) abrirDetalle(emp)
  }

  const handleNuevo = async () => {
    if (!form.nombre || !form.apellidos) { setMsg('Nombre y apellidos obligatorios'); return }
    setGuardando(true); setMsg('')
    const totalSalario = (form.salario || 0) + totalComplementos(complementos)
    const notasComps = complementos.length > 0 ? '\nComplementos: ' + complementos.map((c: any) => c.concepto + ' (' + c.importe + ' €)').join(', ') : ''
    try {
      const result = await api.addEmpleado({ ...form, salario: totalSalario, notas: (form.notas || '') + notasComps })
      if (result.ok) {
        setMsg('✅ Alta registrada: ' + result.nombre)
        setForm({ nombre: '', apellidos: '', dni: '', fecha_nacimiento: '', direccion: '', telefono: '', email: '', nss: '', cuenta_banco: '', categoria: '', grupo: '', convenio: '', tipo_contrato: 'Indefinido', fecha_alta: '', centro: '', zona: '', jornada: 38, turno: 'Mañana', salario: 0, notas: '' })
        setTimeout(() => { setVista('lista'); cargar(); setMsg('') }, 1500)
      } else { setMsg('❌ ' + (result.error || 'Error')) }
    } catch (e: any) { setMsg('❌ Error de conexión') }
    finally { setGuardando(false) }
  }

  const handleGuardar = async () => {
    if (!empleadoSel) return
    setGuardando(true); setMsg('')
    const totalSalario = (empleadoSel.salario || 0) + totalComplementos(complementosDet)
    const notasComps = complementosDet.length > 0 ? '\nComplementos: ' + complementosDet.map((c: any) => c.concepto + ' (' + c.importe + ' €)').join(', ') : ''
    try {
      const dataToSave = { ...empleadoSel, salario: totalSalario }
      if (notasComps) dataToSave.notas = (empleadoSel.notas || '').replace(/\nComplementos:.*$/m, '') + notasComps
      const result = await api.updateEmpleado(dataToSave)
      if (result.ok) { setMsg('✅ Guardado (' + result.cambios + ' cambios)'); setEditando(false); setTimeout(() => setMsg(''), 3000) }
      else { setMsg('❌ ' + (result.error || '')) }
    } catch (e: any) { setMsg('❌ Error') }
    finally { setGuardando(false) }
  }

  const [confirmBaja, setConfirmBaja] = useState(false)

  const handleBaja = async () => {
    setGuardando(true)
    try {
      const result = await api.bajaEmpleado({ id: empleadoSel.id, motivo: 'Baja voluntaria' })
      if (result.ok) { setMsg('Baja registrada correctamente'); setEmpleadoSel({ ...empleadoSel, estado: 'baja' }); cargar() }
    } catch (e: any) { console.error(e) }
    finally { setGuardando(false) }
  }

  const handleAddAsignacion = async () => {
    if (!empleadoSel || !asigForm.nombre_proyecto) { setMsg('Nombre del proyecto requerido'); return }
    setGuardando(true); setMsg('')
    try {
      const result = await api.addAsignacion({
        ...asigForm, id_empleado: empleadoSel.id,
        nombre_empleado: empleadoSel.nombre + ' ' + empleadoSel.apellidos,
        dni: empleadoSel.dni, categoria: empleadoSel.categoria,
        salario_anual: empleadoSel.salario, jornada: empleadoSel.jornada
      })
      if (result.ok) {
        setMsg('✅ Asignado (' + result.porcentaje_total + '% ocupado)')
        setMostrarAddAsig(false)
        setAsigForm({ nombre_proyecto: '', id_proyecto: '', cliente: '', porcentaje: 100, rol: '', subrogable: 'No', notas: '' })
        cargarDetalle(empleadoSel.id)
        setTimeout(() => setMsg(''), 3000)
      } else { setMsg('❌ ' + (result.error || '')) }
    } catch (e: any) { setMsg('❌ Error') }
    finally { setGuardando(false) }
  }

  const handleFinalizarAsig = async (asigId: string) => {
    if (!confirm('¿Finalizar esta asignación?')) return
    try {
      await api.finalizarAsignacion({ id: asigId })
      cargarDetalle(empleadoSel.id)
    } catch (e: any) { console.error(e) }
  }

  const cargarOportunidadesParaAsig = async () => {
    try { const data = await api.oportunidades(); setOportunidades((data.oportunidades || []).filter((o: any) => ['go', 'go_aprobado'].includes(o.estado))) } catch(e: any) {}
  }

  const empFiltrados = empleados.filter((e: any) => filtroEstado === 'todos' || e.estado === filtroEstado)

  if (cargando && vista === 'lista') return (<div className="p-6 lg:p-8 max-w-5xl"><div className="flex items-center gap-4 mb-6"><div className="p-2.5 bg-[#e8f0ee] rounded-xl w-10 h-10 animate-pulse"/><div className="space-y-2"><div className="h-6 w-40 bg-slate-200 rounded animate-pulse"/><div className="h-3 w-24 bg-slate-200 rounded animate-pulse"/></div></div><div className="space-y-3">{[1,2,3,4,5].map(i=><div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse shrink-0"/><div className="flex-1 space-y-2"><div className="h-4 w-1/3 bg-slate-200 rounded animate-pulse"/><div className="h-3 w-1/4 bg-slate-200 rounded animate-pulse"/></div><div className="h-6 w-16 bg-slate-200 rounded animate-pulse"/></div>)}</div></div>)

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <ConfirmModal
        open={confirmBaja}
        titulo={`¿Registrar baja de ${empleadoSel?.nombre || ''} ${empleadoSel?.apellidos || ''}?`}
        mensaje="Se registrará la baja del empleado. Esta acción cambiará su estado a inactivo y no podrá fichar."
        labelOk="Sí, registrar baja"
        labelCancel="Cancelar"
        peligroso
        cargando={guardando}
        onConfirm={() => { setConfirmBaja(false); handleBaja() }}
        onCancel={() => setConfirmBaja(false)}
      />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e] rounded-xl shadow-lg shadow-emerald-200"><Users size={22} className="text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestión de Personal</h1>
            <p className="text-sm text-slate-500">{stats.activos || 0} en activo · {stats.baja || 0} baja · {stats.total || 0} total</p>
          </div>
        </div>
        {vista === 'lista' ? (
          <button onClick={() => setVista('nuevo')} className="flex items-center gap-2 px-4 py-2.5 bg-[#1a3c34] hover:bg-[#2d5a4e] text-white text-sm font-semibold rounded-xl"><Plus size={16} /> Alta de personal</button>
        ) : (
          <button onClick={() => { setVista('lista'); setEditando(false); setMsg('') }} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl"><X size={16} /> Volver</button>
        )}
      </div>

      {/* ═══ LISTA ═══ */}
      {vista === 'lista' && (
        <div>
          <div className="flex gap-3 mb-4">
            <div className="flex-1 bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-2">
              <Search size={16} className="text-slate-400" />
              <input type="text" value={busqueda} onChange={(e: any) => setBusqueda(e.target.value)} placeholder="Buscar por nombre o DNI..."
                className="flex-1 text-sm focus:outline-none" />
              {busqueda && <button onClick={() => setBusqueda('')}><X size={14} className="text-slate-400" /></button>}
            </div>
            <select value={filtroEstado} onChange={(e: any) => setFiltroEstado(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
              <option value="todos">Todos</option>
              <option value="activo">En activo</option>
              <option value="baja">Baja</option>
            </select>
          </div>

          {empFiltrados.length === 0 ? (
            <div className="text-center py-16"><Users size={48} className="text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Sin personal registrado{busqueda ? ' con esa búsqueda' : ''}</p></div>
          ) : (
            <div className="space-y-2">
              {empFiltrados.map((emp: any) => (
                <div key={emp.id} className="w-full bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${emp.estado === 'activo' ? 'bg-[#1a3c34]' : 'bg-slate-400'}`}>
                      {(emp.nombre || '?')[0]}{(emp.apellidos || '?')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{emp.nombre} {emp.apellidos}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${emp.estado === 'activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{emp.estado?.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                        {emp.dni && <span>{emp.dni}</span>}
                        {emp.categoria && <span>· {emp.categoria}</span>}
                        {emp.centro && <span>· 📍 {emp.centro}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => abrirDetalle(emp)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#1a3c34] hover:bg-[#2d5a4e] text-white text-xs font-bold rounded-xl shrink-0">
                      <User size={13} /> Ver ficha
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ NUEVO EMPLEADO ═══ */}
      {vista === 'nuevo' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Alta de personal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Nombre *</label><input type="text" value={form.nombre} onChange={(e: any) => setForm({...form, nombre: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Apellidos *</label><input type="text" value={form.apellidos} onChange={(e: any) => setForm({...form, apellidos: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">DNI / NIE</label><input type="text" value={form.dni} onChange={(e: any) => setForm({...form, dni: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Fecha nacimiento</label><input type="date" value={form.fecha_nacimiento} onChange={(e: any) => setForm({...form, fecha_nacimiento: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Teléfono</label><input type="tel" value={form.telefono} onChange={(e: any) => setForm({...form, telefono: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Email</label><input type="email" value={form.email} onChange={(e: any) => setForm({...form, email: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
            <div className="md:col-span-2"><label className="text-[10px] text-slate-500 uppercase font-semibold">Dirección</label><input type="text" value={form.direccion} onChange={(e: any) => setForm({...form, direccion: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Nº Seguridad Social</label><input type="text" value={form.nss} onChange={(e: any) => setForm({...form, nss: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Cuenta bancaria</label><input type="text" value={form.cuenta_banco} onChange={(e: any) => setForm({...form, cuenta_banco: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>

            <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2"><h3 className="text-sm font-bold text-slate-700 mb-3">Datos laborales</h3></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Convenio aplicable</label>
              <select value={form.convenio} onChange={(e: any) => seleccionarConvenio(e.target.value, 'form')} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="">— Seleccionar convenio —</option>
                {convenios.map((c: any) => <option key={c.id} value={c.id}>{c.sector} — {c.provincia} ({c.horas_anuales}h/año, {c.num_pagas} pagas)</option>)}
              </select>
            </div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Categoría profesional</label>
              {categoriasConv.length > 0 ? (
                <select value={form.categoria} onChange={(e: any) => { const cat = categoriasConv.find((c: any) => c.categoria === e.target.value); if (cat) seleccionarCategoria(cat, 'form'); else setForm({...form, categoria: e.target.value}) }} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                  <option value="">— Seleccionar categoría —</option>
                  {categoriasConv.map((c: any, i: number) => <option key={i} value={c.categoria}>{c.grupo}{c.nivel ? ' ' + c.nivel : ''} — {c.categoria} ({c.total_anual_bruto ? c.total_anual_bruto.toLocaleString('es-ES') + ' €/año' : ''})</option>)}
                </select>
              ) : (
                <input type="text" value={form.categoria} onChange={(e: any) => setForm({...form, categoria: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder={cargandoCats ? 'Cargando...' : form.convenio ? 'Sin categorías en este convenio' : 'Selecciona convenio primero'} />
              )}
            </div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Grupo</label><input type="text" value={form.grupo} onChange={(e: any) => setForm({...form, grupo: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50" readOnly={categoriasConv.length > 0} placeholder="Se rellena con la categoría" /></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Tipo contrato</label><select value={form.tipo_contrato} onChange={(e: any) => setForm({...form, tipo_contrato: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">{TIPOS_CONTRATO.map((t: string) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Fecha alta</label><input type="date" value={form.fecha_alta} onChange={(e: any) => setForm({...form, fecha_alta: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Centro asignado</label><input type="text" value={form.centro} onChange={(e: any) => setForm({...form, centro: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Zona</label><input type="text" value={form.zona} onChange={(e: any) => setForm({...form, zona: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Jornada (h/sem)</label><input type="number" value={form.jornada} onChange={(e: any) => setForm({...form, jornada: parseInt(e.target.value)||38})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Turno</label><select value={form.turno} onChange={(e: any) => setForm({...form, turno: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">{TURNOS.map((t: string) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Salario base convenio {form.salario > 0 && categoriasConv.length > 0 ? '(según tablas)' : ''}</label><input type="number" value={form.salario} onChange={(e: any) => setForm({...form, salario: parseFloat(e.target.value)||0})} className={`w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm ${form.salario > 0 && categoriasConv.length > 0 ? 'bg-emerald-50 border-emerald-300 font-semibold' : ''}`} /></div>
            <div></div>

            {/* Complementos salariales */}
            <div className="md:col-span-2 bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-600">Complementos salariales</h4>
                <button type="button" onClick={() => addComplemento('form')} className="text-[10px] text-[#1a3c34] font-semibold hover:underline">+ Añadir complemento</button>
              </div>
              {complementos.length === 0 && <p className="text-[10px] text-slate-400">Sin complementos. Añade plus transporte, antigüedad, nocturnidad, etc.</p>}
              {complementos.map((_: any, i: number) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input type="text" value={complementos[i].concepto} onChange={(e: any) => updateComplemento(i, 'concepto', e.target.value, 'form')} placeholder="Ej: Plus transporte" className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs" />
                  <input type="number" value={complementos[i].importe} onChange={(e: any) => updateComplemento(i, 'importe', parseFloat(e.target.value)||0, 'form')} placeholder="€/año" className="w-28 px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-right" />
                  <button type="button" onClick={() => removeComplemento(i, 'form')} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                </div>
              ))}
              {(form.salario > 0 || complementos.length > 0) && (
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-2">
                  <span className="text-xs font-bold text-slate-700">Total bruto anual</span>
                  <span className="text-sm font-black text-[#1a3c34]">{((form.salario || 0) + totalComplementos(complementos)).toLocaleString('es-ES', {minimumFractionDigits: 2})} €</span>
                </div>
              )}
            </div>

            <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2"><h3 className="text-sm font-bold text-slate-700 mb-3">Datos operativos (Territorio)</h3></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Horario entrada</label><input type="time" value={form.horario_entrada} onChange={(e: any) => setForm({...form, horario_entrada: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Horario salida</label><input type="time" value={form.horario_salida} onChange={(e: any) => setForm({...form, horario_salida: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Días de trabajo</label><select value={form.dias_trabajo} onChange={(e: any) => setForm({...form, dias_trabajo: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"><option value="L-V">Lunes a Viernes</option><option value="L-S">Lunes a Sábado</option><option value="L-D">Lunes a Domingo (rotativo)</option><option value="Fines de semana">Fines de semana</option><option value="Personalizado">Personalizado</option></select></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Carnet conducir</label><select value={form.carnet} onChange={(e: any) => setForm({...form, carnet: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"><option value="">No</option><option value="B">B (coche)</option><option value="B+E">B+E (remolque)</option><option value="C">C (camión)</option></select></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Vehículo / matrícula</label><input type="text" value={form.vehiculo} onChange={(e: any) => setForm({...form, vehiculo: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Ej: Berlingo 1234ABC" /></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Talla uniforme</label><select value={form.talla} onChange={(e: any) => setForm({...form, talla: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"><option value="">—</option><option value="XS">XS</option><option value="S">S</option><option value="M">M</option><option value="L">L</option><option value="XL">XL</option><option value="XXL">XXL</option><option value="3XL">3XL</option></select></div>
            <div className="md:col-span-2"><label className="text-[10px] text-slate-500 uppercase font-semibold">Competencias / habilidades</label><input type="text" value={form.competencias} onChange={(e: any) => setForm({...form, competencias: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Ej: Fregadora industrial, productos químicos, cristales altura, poda..." /></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Contacto emergencia</label><input type="text" value={form.contacto_emergencia} onChange={(e: any) => setForm({...form, contacto_emergencia: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Nombre familiar" /></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Teléfono emergencia</label><input type="tel" value={form.tel_emergencia} onChange={(e: any) => setForm({...form, tel_emergencia: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-semibold">Disponible sustituciones</label><select value={form.disponible_sustituciones} onChange={(e: any) => setForm({...form, disponible_sustituciones: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"><option value="Sí">Sí</option><option value="No">No</option><option value="Según disponibilidad">Según disponibilidad</option></select></div>

            <div className="md:col-span-2"><label className="text-[10px] text-slate-500 uppercase font-semibold">Notas</label><textarea value={form.notas} onChange={(e: any) => setForm({...form, notas: e.target.value})} rows={2} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none" /></div>
          </div>
          <div className="flex items-center gap-3 mt-6">
            <button onClick={handleNuevo} disabled={guardando} className="flex items-center gap-2 px-6 py-3 bg-[#1a3c34] hover:bg-[#2d5a4e] disabled:bg-slate-400 text-white text-sm font-semibold rounded-xl">
              {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Registrar alta
            </button>
            {msg && <span className={`text-sm font-medium ${msg.includes('✅') ? 'text-emerald-600' : 'text-red-600'}`}>{msg}</span>}
          </div>
        </div>
      )}

      {/* ═══ DETALLE EMPLEADO ═══ */}
      {vista === 'detalle' && empleadoSel && (
        <div>
          {/* Banner carga en fondo */}
          {asignaciones.length === 0 && (
            <div className="flex items-center gap-2 mb-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
              <Loader2 size={12} className="animate-spin" /> Actualizando datos completos...
            </div>
          )}
          {/* Cabecera */}
          <div className="bg-gradient-to-r from-[#1a3c34] to-[#2d5a4e] rounded-2xl p-6 mb-4 text-white">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-xl font-black shrink-0">
                {(empleadoSel.nombre || '?')[0]}{(empleadoSel.apellidos || '?')[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">{empleadoSel.nombre} {empleadoSel.apellidos}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${empleadoSel.estado === 'activo' ? 'bg-emerald-400/30 text-emerald-100' : 'bg-red-400/30 text-red-100'}`}>{empleadoSel.estado?.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-emerald-100/80">
                  {empleadoSel.dni && <span>🪪 {empleadoSel.dni}</span>}
                  {empleadoSel.categoria && <span>· {empleadoSel.grupo ? empleadoSel.grupo + ' — ' : ''}{empleadoSel.categoria}</span>}
                  {empleadoSel.centro && <span>· 📍 {empleadoSel.centro}</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {!editando ? (
                  <button onClick={() => { setEditando(true); if (empleadoSel.convenio) cargarCategorias(empleadoSel.convenio) }} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-white text-[#1a3c34] hover:bg-emerald-50 shadow-lg transition-all">
                    <Edit3 size={16} /> Editar ficha
                  </button>
                ) : (
                  <button onClick={() => { setEditando(false); cargarDetalle(empleadoSel.id) }} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-violet-500 text-white hover:bg-violet-600 shadow-lg transition-all">
                    <X size={16} /> Cancelar edición
                  </button>
                )}
                {empleadoSel.estado === 'activo' && (
                  <button onClick={() => setConfirmBaja(true)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-red-200 bg-red-500/30 hover:bg-red-500/50 rounded-xl"><UserMinus size={16} /> Baja</button>
                )}
              </div>
            </div>
            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
              <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                <p className="text-[10px] text-emerald-200/60 uppercase font-bold">Alta</p>
                <p className="text-sm font-bold">{fmtDate(empleadoSel.fecha_alta) || '—'}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                <p className="text-[10px] text-emerald-200/60 uppercase font-bold">Contrato</p>
                <p className="text-sm font-bold">{empleadoSel.tipo_contrato || '—'}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                <p className="text-[10px] text-emerald-200/60 uppercase font-bold">Jornada</p>
                <p className="text-sm font-bold">{empleadoSel.jornada ? empleadoSel.jornada + 'h/sem' : '—'}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                <p className="text-[10px] text-emerald-200/60 uppercase font-bold">Salario</p>
                <p className="text-sm font-bold">{empleadoSel.salario ? fmt(empleadoSel.salario) : '—'}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                <p className="text-[10px] text-emerald-200/60 uppercase font-bold">Expediente</p>
                <p className="text-sm font-bold">{empleadoSel.documentos?.length || 0} docs</p>
              </div>
            </div>
          </div>

          {/* Tabs selector */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-4">
            {[
              { id: 'datos',      label: '👤 Datos & Asignaciones' },
              { id: 'expediente', label: '📁 Expediente Digital' },
              { id: 'prl',        label: '⛑️ PRL' },
            ].map(t => (
              <button key={t.id} onClick={() => {
                setTabDetalle(t.id as any)
                if (t.id === 'expediente' && !expediente && empleadoSel) cargarExpediente(empleadoSel.id)
              }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${tabDetalle === t.id ? 'bg-white shadow text-[#1a3c34]' : 'text-slate-500 hover:text-slate-700'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {tabDetalle === 'datos' && (<div>
          {/* Datos personales + laborales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className={`bg-white border-2 rounded-2xl p-5 ${editando ? "border-violet-300 bg-violet-50/30" : "border-slate-200"}`}>
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><User size={16} className="text-blue-600" /> Datos personales</h3>
              {editando ? (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-slate-400">Fecha nacimiento</label><input type="date" value={(() => { try { const d = new Date(empleadoSel.fecha_nacimiento); return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0] } catch { return '' } })()} onChange={(e: any) => setEmpleadoSel({...empleadoSel, fecha_nacimiento: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" /></div>
                  {[{k:'telefono',l:'Teléfono'},{k:'email',l:'Email'},{k:'direccion',l:'Dirección'},{k:'nss',l:'Nº SS'},{k:'cuenta_banco',l:'Cuenta banco'}].map((f: any) => (
                    <div key={f.k}><label className="text-[10px] text-slate-400">{f.l}</label><input type="text" value={empleadoSel[f.k]||''} onChange={(e: any) => setEmpleadoSel({...empleadoSel, [f.k]: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" /></div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {empleadoSel.fecha_nacimiento && <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><Calendar size={16} className="text-blue-500 shrink-0" /><div><p className="text-[10px] text-slate-400">Nacimiento</p><p className="text-sm font-semibold">{fmtDate(empleadoSel.fecha_nacimiento)}</p></div></div>}
                  {empleadoSel.telefono && <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><Phone size={16} className="text-blue-500 shrink-0" /><div><p className="text-[10px] text-slate-400">Teléfono</p><p className="text-sm font-semibold">{empleadoSel.telefono}</p></div></div>}
                  {empleadoSel.email && <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><Mail size={16} className="text-blue-500 shrink-0" /><div><p className="text-[10px] text-slate-400">Email</p><p className="text-sm font-semibold">{empleadoSel.email}</p></div></div>}
                  {empleadoSel.direccion && <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl md:col-span-2"><MapPin size={16} className="text-blue-500 shrink-0" /><div><p className="text-[10px] text-slate-400">Dirección</p><p className="text-sm font-semibold">{empleadoSel.direccion}</p></div></div>}
                  {empleadoSel.nss && <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><Shield size={16} className="text-blue-500 shrink-0" /><div><p className="text-[10px] text-slate-400">Nº Seguridad Social</p><p className="text-sm font-semibold">{empleadoSel.nss}</p></div></div>}
                  {empleadoSel.cuenta_banco && <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><span className="text-base">🏦</span><div><p className="text-[10px] text-slate-400">Cuenta bancaria</p><p className="text-sm font-semibold">{empleadoSel.cuenta_banco}</p></div></div>}
                </div>
              )}
            </div>

            <div className={`bg-white border-2 rounded-2xl p-5 ${editando ? "border-violet-300 bg-violet-50/30" : "border-slate-200"}`}>
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><Briefcase size={16} className="text-emerald-600" /> Datos laborales</h3>
              {editando ? (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-slate-400">Fecha alta</label><input type="date" value={(() => { try { const d = new Date(empleadoSel.fecha_alta); return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0] } catch { return '' } })()} onChange={(e: any) => setEmpleadoSel({...empleadoSel, fecha_alta: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" /></div>
                  <div><label className="text-[10px] text-slate-400">Tipo contrato</label><select value={empleadoSel.tipo_contrato||'Indefinido'} onChange={(e: any) => setEmpleadoSel({...empleadoSel, tipo_contrato: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white">{['Indefinido','Temporal','Obra y servicio','Interinidad','Formación','Prácticas'].map((t: string) => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div><label className="text-[10px] text-slate-400">Convenio</label>
                    <select value={empleadoSel.convenio||''} onChange={(e: any) => seleccionarConvenio(e.target.value, 'detalle')} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white">
                      <option value="">— Seleccionar —</option>
                      {convenios.map((c: any) => <option key={c.id} value={c.id}>{c.sector} — {c.provincia}</option>)}
                    </select>
                  </div>
                  <div><label className="text-[10px] text-slate-400">Categoría</label>
                    {categoriasConv.length > 0 ? (
                      <select value={empleadoSel.categoria||''} onChange={(e: any) => { const cat = categoriasConv.find((c: any) => c.categoria === e.target.value); if (cat) seleccionarCategoria(cat, 'detalle'); else setEmpleadoSel({...empleadoSel, categoria: e.target.value}) }} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white">
                        <option value="">— Seleccionar —</option>
                        {categoriasConv.map((c: any, i: number) => <option key={i} value={c.categoria}>{c.grupo} — {c.categoria} ({c.total_anual_bruto ? c.total_anual_bruto.toLocaleString('es-ES') + ' €' : ''})</option>)}
                      </select>
                    ) : (
                      <input type="text" value={empleadoSel.categoria||''} onChange={(e: any) => setEmpleadoSel({...empleadoSel, categoria: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" />
                    )}
                  </div>
                  {[{k:'centro',l:'Centro'},{k:'zona',l:'Zona'}].map((f: any) => (
                    <div key={f.k}><label className="text-[10px] text-slate-400">{f.l}</label><input type="text" value={empleadoSel[f.k]||''} onChange={(e: any) => setEmpleadoSel({...empleadoSel, [f.k]: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" /></div>
                  ))}
                  <div><label className="text-[10px] text-slate-400">Jornada (h/sem)</label><input type="number" value={empleadoSel.jornada||38} onChange={(e: any) => setEmpleadoSel({...empleadoSel, jornada: parseInt(e.target.value)||38})} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" /></div>
                  <div><label className="text-[10px] text-slate-400">Turno</label><select value={empleadoSel.turno||'Mañana'} onChange={(e: any) => setEmpleadoSel({...empleadoSel, turno: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white">{['Mañana','Tarde','Noche','Rotativo','Partido','Completo'].map((t: string) => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div><label className="text-[10px] text-slate-400">Salario base convenio</label><input type="number" value={empleadoSel.salario||0} onChange={(e: any) => setEmpleadoSel({...empleadoSel, salario: parseFloat(e.target.value)||0})} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" /></div>
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-500">Complementos</span>
                      <button type="button" onClick={() => addComplemento('detalle')} className="text-[9px] text-[#1a3c34] font-semibold hover:underline">+ Añadir</button>
                    </div>
                    {complementosDet.map((_: any, i: number) => (
                      <div key={i} className="flex gap-1.5 mb-1.5">
                        <input type="text" value={complementosDet[i].concepto} onChange={(e: any) => updateComplemento(i, 'concepto', e.target.value, 'detalle')} placeholder="Concepto" className="flex-1 px-2 py-1 border border-slate-200 rounded text-[10px]" />
                        <input type="number" value={complementosDet[i].importe} onChange={(e: any) => updateComplemento(i, 'importe', parseFloat(e.target.value)||0, 'detalle')} className="w-20 px-2 py-1 border border-slate-200 rounded text-[10px] text-right" />
                        <button type="button" onClick={() => removeComplemento(i, 'detalle')} className="text-red-400 hover:text-red-600"><X size={12} /></button>
                      </div>
                    ))}
                    {((empleadoSel.salario || 0) > 0 || complementosDet.length > 0) && (
                      <div className="flex justify-between pt-1.5 border-t border-slate-200 mt-1.5">
                        <span className="text-[10px] font-bold">Total</span>
                        <span className="text-xs font-black text-[#1a3c34]">{((empleadoSel.salario || 0) + totalComplementos(complementosDet)).toLocaleString('es-ES', {minimumFractionDigits: 2})} €</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {empleadoSel.convenio && <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl md:col-span-2"><span className="text-base">📋</span><div><p className="text-[10px] text-slate-400">Convenio</p><p className="text-sm font-semibold">{(() => { const c = convenios.find((cv: any) => cv.id === empleadoSel.convenio); return c ? c.sector + ' — ' + c.provincia : empleadoSel.convenio })()}</p></div></div>}
                  {empleadoSel.fecha_alta && <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><Calendar size={16} className="text-emerald-500 shrink-0" /><div><p className="text-[10px] text-slate-400">Fecha alta</p><p className="text-sm font-semibold">{fmtDate(empleadoSel.fecha_alta)}</p></div></div>}
                  {empleadoSel.fecha_baja && <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl"><Calendar size={16} className="text-red-500 shrink-0" /><div><p className="text-[10px] text-slate-400">Fecha baja</p><p className="text-sm font-semibold text-red-700">{fmtDate(empleadoSel.fecha_baja)}</p></div></div>}
                  {empleadoSel.tipo_contrato && <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><FileText size={16} className="text-emerald-500 shrink-0" /><div><p className="text-[10px] text-slate-400">Contrato</p><p className="text-sm font-semibold">{empleadoSel.tipo_contrato}</p></div></div>}
                  {empleadoSel.centro && <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><MapPin size={16} className="text-emerald-500 shrink-0" /><div><p className="text-[10px] text-slate-400">Centro / Zona</p><p className="text-sm font-semibold">{empleadoSel.centro} {empleadoSel.zona ? '(' + empleadoSel.zona + ')' : ''}</p></div></div>}
                  {empleadoSel.jornada && <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><Clock size={16} className="text-emerald-500 shrink-0" /><div><p className="text-[10px] text-slate-400">Jornada</p><p className="text-sm font-semibold">{empleadoSel.jornada}h/sem — {empleadoSel.turno}</p></div></div>}
                  {empleadoSel.salario > 0 && <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl"><span className="text-base">💰</span><div><p className="text-[10px] text-slate-400">Salario bruto anual</p><p className="text-sm font-bold text-emerald-700">{fmt(empleadoSel.salario)}</p></div></div>}
                </div>
              )}
            </div>
          </div>

          {editando && (
            <div className="bg-violet-600 text-white rounded-xl p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Edit3 size={18} />
                <span className="text-sm font-bold">Modo edición activo — modifica los campos y pulsa Guardar</span>
              </div>
              <div className="flex gap-3">
                <button onClick={handleGuardar} disabled={guardando} className="flex items-center gap-2 px-6 py-2.5 bg-white text-violet-700 text-sm font-bold rounded-xl hover:bg-violet-50 shadow-lg transition-all">
                  {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar cambios
                </button>
                <button onClick={() => { setEditando(false); cargarDetalle(empleadoSel.id) }} className="flex items-center gap-2 px-4 py-2.5 bg-violet-500 text-white text-sm font-semibold rounded-xl hover:bg-violet-400">
                  <X size={16} /> Cancelar
                </button>
              </div>
            </div>
          )}
          {msg && !editando && <div className={`mb-4 p-3 rounded-xl text-center text-sm font-medium ${msg.includes('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}

          {/* Datos operativos (Territorio) */}
          <div className={`bg-white border-2 rounded-2xl p-5 mb-4 ${editando ? "border-violet-300 bg-violet-50/30" : "border-slate-200"}`}>
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><MapPin size={16} className="text-orange-600" /> Datos operativos (Territorio)</h3>
            {editando ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div><label className="text-[10px] text-slate-400">Horario entrada</label><input type="time" value={empleadoSel.horario_entrada||''} onChange={(e: any) => setEmpleadoSel({...empleadoSel, horario_entrada: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" /></div>
                <div><label className="text-[10px] text-slate-400">Horario salida</label><input type="time" value={empleadoSel.horario_salida||''} onChange={(e: any) => setEmpleadoSel({...empleadoSel, horario_salida: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" /></div>
                <div><label className="text-[10px] text-slate-400">Días trabajo</label><select value={empleadoSel.dias_trabajo||'L-V'} onChange={(e: any) => setEmpleadoSel({...empleadoSel, dias_trabajo: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white"><option value="L-V">L-V</option><option value="L-S">L-S</option><option value="L-D">L-D (rotativo)</option><option value="Fines de semana">Fines de semana</option></select></div>
                <div><label className="text-[10px] text-slate-400">Carnet</label><select value={empleadoSel.carnet||''} onChange={(e: any) => setEmpleadoSel({...empleadoSel, carnet: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white"><option value="">No</option><option value="B">B</option><option value="B+E">B+E</option><option value="C">C</option></select></div>
                <div><label className="text-[10px] text-slate-400">Vehículo</label><input type="text" value={empleadoSel.vehiculo||''} onChange={(e: any) => setEmpleadoSel({...empleadoSel, vehiculo: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" /></div>
                <div><label className="text-[10px] text-slate-400">Talla</label><select value={empleadoSel.talla||''} onChange={(e: any) => setEmpleadoSel({...empleadoSel, talla: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white"><option value="">—</option>{['XS','S','M','L','XL','XXL','3XL'].map((t: string) => <option key={t} value={t}>{t}</option>)}</select></div>
                <div className="col-span-2 md:col-span-3"><label className="text-[10px] text-slate-400">Competencias</label><input type="text" value={empleadoSel.competencias||''} onChange={(e: any) => setEmpleadoSel({...empleadoSel, competencias: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" placeholder="Fregadora, cristales, poda..." /></div>
                <div><label className="text-[10px] text-slate-400">Contacto emergencia</label><input type="text" value={empleadoSel.contacto_emergencia||''} onChange={(e: any) => setEmpleadoSel({...empleadoSel, contacto_emergencia: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" /></div>
                <div><label className="text-[10px] text-slate-400">Tel. emergencia</label><input type="tel" value={empleadoSel.tel_emergencia||''} onChange={(e: any) => setEmpleadoSel({...empleadoSel, tel_emergencia: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" /></div>
                <div><label className="text-[10px] text-slate-400">Sustituciones</label><select value={empleadoSel.disponible_sustituciones||'Sí'} onChange={(e: any) => setEmpleadoSel({...empleadoSel, disponible_sustituciones: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white"><option value="Sí">Sí</option><option value="No">No</option><option value="Según disponibilidad">Según disponibilidad</option></select></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5">
                {empleadoSel.horario_entrada && <div className="text-xs"><span className="text-slate-400">Horario:</span> <span className="font-medium">{empleadoSel.horario_entrada} — {empleadoSel.horario_salida || '?'}</span></div>}
                {empleadoSel.dias_trabajo && <div className="text-xs"><span className="text-slate-400">Días:</span> <span className="font-medium">{empleadoSel.dias_trabajo}</span></div>}
                {empleadoSel.carnet && <div className="text-xs"><span className="text-slate-400">Carnet:</span> <span className="font-medium">{empleadoSel.carnet}</span></div>}
                {empleadoSel.vehiculo && <div className="text-xs"><span className="text-slate-400">Vehículo:</span> <span className="font-medium">{empleadoSel.vehiculo}</span></div>}
                {empleadoSel.talla && <div className="text-xs"><span className="text-slate-400">Talla:</span> <span className="font-medium">{empleadoSel.talla}</span></div>}
                {empleadoSel.disponible_sustituciones && <div className="text-xs"><span className="text-slate-400">Sustituciones:</span> <span className={`font-medium ${empleadoSel.disponible_sustituciones === 'Sí' ? 'text-emerald-600' : 'text-red-600'}`}>{empleadoSel.disponible_sustituciones}</span></div>}
                {empleadoSel.competencias && <div className="text-xs col-span-2 md:col-span-3"><span className="text-slate-400">Competencias:</span> <span className="font-medium">{empleadoSel.competencias}</span></div>}
                {empleadoSel.contacto_emergencia && <div className="text-xs col-span-2"><span className="text-slate-400">Emergencia:</span> <span className="font-medium">{empleadoSel.contacto_emergencia} {empleadoSel.tel_emergencia ? '(' + empleadoSel.tel_emergencia + ')' : ''}</span></div>}
                {!empleadoSel.horario_entrada && !empleadoSel.competencias && !empleadoSel.contacto_emergencia && <p className="text-xs text-slate-400 col-span-3">Sin datos operativos. Pulsa Editar para completar.</p>}
              </div>
            )}
          </div>

          {/* ═══ ASIGNACIONES A PROYECTOS ═══ */}
          <div className={`bg-white border-2 rounded-2xl p-5 mb-4 ${editando ? "border-violet-300 bg-violet-50/30" : "border-slate-200"}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Briefcase size={16} className="text-blue-600" /> Asignación a proyectos</h3>
              {empleadoSel.estado === 'activo' && (
                <button onClick={() => { setMostrarAddAsig(!mostrarAddAsig); if (!mostrarAddAsig) cargarOportunidadesParaAsig() }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg">
                  <Plus size={12} /> Asignar a proyecto
                </button>
              )}
            </div>

            {/* Barra capacidad */}
            {capacidad && (
              <div className="mb-4 p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-600">Capacidad</span>
                  <span className={`text-xs font-bold ${capacidad.disponible > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{capacidad.disponible}% disponible</span>
                </div>
                <div className="h-3 bg-slate-200 rounded-full overflow-hidden flex">
                  {capacidad.proyectos?.map((p: any, i: number) => {
                    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500']
                    return <div key={i} title={p.nombre + ' (' + p.porcentaje + '%)'} className={`h-full ${colors[i % colors.length]}`} style={{width: `${p.porcentaje}%`}} />
                  })}
                  {capacidad.disponible > 0 && <div className="h-full bg-slate-200" style={{width: `${capacidad.disponible}%`}} />}
                </div>
                {capacidad.proyectos?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {capacidad.proyectos.map((p: any, i: number) => {
                      const colors = ['text-blue-700 bg-blue-50', 'text-emerald-700 bg-emerald-50', 'text-amber-700 bg-amber-50', 'text-purple-700 bg-purple-50']
                      return <span key={i} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${colors[i % colors.length]}`}>{p.nombre} ({p.porcentaje}%)</span>
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Form nueva asignación */}
            {mostrarAddAsig && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <h4 className="text-xs font-bold text-blue-800 mb-3">Nueva asignación</h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-semibold">Proyecto / Contrato</label>
                    {oportunidades.length > 0 ? (
                      <select value={asigForm.id_proyecto} onChange={(e: any) => { const opo = oportunidades.find((o: any) => o.id === e.target.value); setAsigForm({...asigForm, id_proyecto: e.target.value, nombre_proyecto: opo?.titulo || '', cliente: opo?.organismo || ''}) }}
                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white">
                        <option value="">— Seleccionar licitación —</option>
                        {oportunidades.map((o: any) => <option key={o.id} value={o.id}>{o.titulo?.substring(0, 60)} — {o.organismo}</option>)}
                        <option value="__manual">Otro (escribir manualmente)</option>
                      </select>
                    ) : (
                      <input type="text" value={asigForm.nombre_proyecto} onChange={(e: any) => setAsigForm({...asigForm, nombre_proyecto: e.target.value})} placeholder="Nombre del proyecto/contrato" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs" />
                    )}
                    {asigForm.id_proyecto === '__manual' && (
                      <input type="text" value={asigForm.nombre_proyecto} onChange={(e: any) => setAsigForm({...asigForm, nombre_proyecto: e.target.value})} placeholder="Nombre del proyecto" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs" />
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-semibold">Cliente / Organismo</label>
                    <input type="text" value={asigForm.cliente} onChange={(e: any) => setAsigForm({...asigForm, cliente: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-semibold">% Dedicación</label>
                    <input type="number" min={1} max={capacidad?.disponible || 100} value={asigForm.porcentaje} onChange={(e: any) => setAsigForm({...asigForm, porcentaje: parseInt(e.target.value)||0})}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs" />
                    <span className="text-[9px] text-slate-400">Máximo disponible: {capacidad?.disponible || 100}%</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-semibold">Rol</label>
                    <input type="text" value={asigForm.rol} onChange={(e: any) => setAsigForm({...asigForm, rol: e.target.value})} placeholder={empleadoSel.categoria || 'Ej: Limpiador/a'} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-semibold">Subrogable</label>
                    <select value={asigForm.subrogable} onChange={(e: any) => setAsigForm({...asigForm, subrogable: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white">
                      <option value="Sí">Sí</option><option value="No">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-semibold">Coste mensual estimado</label>
                    <p className="text-sm font-bold text-blue-700 mt-1">{empleadoSel.salario ? (Math.round(empleadoSel.salario / 12 * (asigForm.porcentaje / 100) * 1.33)).toLocaleString('es-ES') + ' €' : '—'}</p>
                    <span className="text-[9px] text-slate-400">Salario/12 × {asigForm.porcentaje}% × 1.33 (SS)</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddAsignacion} disabled={guardando} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-semibold rounded-lg">
                    {guardando ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Asignar
                  </button>
                  <button onClick={() => setMostrarAddAsig(false)} className="px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg">Cancelar</button>
                </div>
              </div>
            )}

            {/* Lista asignaciones */}
            {asignaciones.filter((a: any) => a.estado === 'activa').length === 0 && !mostrarAddAsig ? (
              <p className="text-xs text-slate-400 text-center py-4">Sin asignaciones activas. Asignar a un proyecto desde aquí.</p>
            ) : (
              <div className="space-y-2">
                {asignaciones.filter((a: any) => a.estado === 'activa').map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900">{a.nombre_proyecto}</p>
                      <p className="text-[10px] text-slate-500">{a.cliente} · {a.rol || a.categoria}</p>
                    </div>
                    <div className="text-center shrink-0">
                      <p className="text-lg font-black text-blue-700">{a.porcentaje}%</p>
                      <p className="text-[9px] text-slate-400">{a.horas_semana}h/sem</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-emerald-700">{a.coste_mensual ? a.coste_mensual.toLocaleString('es-ES') + ' €/mes' : ''}</p>
                      {a.subrogable === 'Sí' && <span className="text-[8px] text-amber-600 font-bold">SUBROGABLE</span>}
                    </div>
                    <button onClick={() => handleFinalizarAsig(a.id)} className="text-red-400 hover:text-red-600 shrink-0" title="Finalizar asignación"><XCircle size={14} /></button>
                  </div>
                ))}
                {asignaciones.filter((a: any) => a.estado === 'finalizada').length > 0 && (
                  <details className="mt-2">
                    <summary className="text-[10px] text-slate-400 cursor-pointer hover:text-slate-600">Ver {asignaciones.filter((a: any) => a.estado === 'finalizada').length} asignaciones finalizadas</summary>
                    <div className="mt-1.5 space-y-1">
                      {asignaciones.filter((a: any) => a.estado === 'finalizada').map((a: any) => (
                        <div key={a.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg opacity-60">
                          <span className="text-xs text-slate-600 flex-1">{a.nombre_proyecto}</span>
                          <span className="text-[10px] text-slate-400">{a.porcentaje}%</span>
                          <span className="text-[10px] text-slate-400">{a.fecha_fin ? fmtDate(a.fecha_fin) : ''}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>


          {/* Expediente — checklist básico en tab datos */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><FileText size={16} className="text-violet-600" /> Docs. obligatorios</h3>
              <button onClick={() => setTabDetalle('expediente')} className="text-xs text-violet-600 hover:text-violet-800 font-semibold">Ver expediente completo →</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {DOCS_OBLIGATORIOS.map((req: any) => {
                const tiene = empleadoSel.documentos?.find((d: any) => d.tipo === req.tipo)
                return (
                  <div key={req.tipo} className={`flex items-center gap-2 p-2.5 rounded-lg ${tiene ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                    <span className="text-sm">{req.icon}</span>
                    {tiene ? <CheckCircle2 size={13} className="text-emerald-600" /> : <XCircle size={13} className="text-red-400" />}
                    <span className={`text-xs font-medium truncate ${tiene ? 'text-emerald-800' : 'text-red-700'}`}>{req.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Historial de centros de territorio */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                🏢 Centros de trabajo asignados
              </h3>
              {historialCentros && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">{historialCentros.activos} activo(s)</span>
                  {historialCentros.finalizados > 0 && <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{historialCentros.finalizados} anterior(es)</span>}
                </div>
              )}
            </div>
            {cargandoCentros ? (
              <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-slate-400" /></div>
            ) : !historialCentros?.centros?.length ? (
              <p className="text-xs text-slate-400 text-center py-4">Sin centros asignados en Territorio</p>
            ) : (
              <div className="space-y-2">
                {historialCentros.centros.map((c: any) => (
                  <div key={c.id} className={`flex items-center gap-3 p-3 rounded-xl border ${c.estado === 'activo' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 opacity-70'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-bold text-slate-900 truncate">{c.nombre_centro}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${c.estado === 'activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {c.estado}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">{c.organismo} · {c.tipo_servicio} · {c.turno}</p>
                      <p className="text-[10px] text-slate-400">
                        {c.horas_semanales}h/sem · {c.categoria}
                        {c.fecha_inicio && ` · desde ${c.fecha_inicio}`}
                        {c.fecha_fin && ` → ${c.fecha_fin}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historial */}
          {empleadoSel.historial?.length > 0 && (
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">📜 Historial de cambios</h3>
              <div className="space-y-2">
                {empleadoSel.historial.map((h: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg text-xs">
                    <Clock size={12} className="text-slate-400 shrink-0" />
                    <span className="text-slate-400 shrink-0">{h.fecha ? fmtDate(h.fecha) : ''}</span>
                    <span className="font-semibold text-slate-700">{h.tipo}:</span>
                    <span className="text-red-500 line-through">{h.anterior}</span>
                    <span>→</span>
                    <span className="text-emerald-700 font-semibold">{h.nuevo}</span>
                    {h.por && <span className="text-slate-400 ml-auto">por {h.por}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>)} {/* fin tab datos */}

          {/* ═══ TAB EXPEDIENTE DIGITAL ═══ */}
          {tabDetalle === 'expediente' && (
            <div>
              {cargandoExpediente ? (
                <div className="text-center py-16"><Loader2 size={28} className="text-violet-500 animate-spin mx-auto mb-3" /><p className="text-slate-400 text-sm">Cargando expediente...</p></div>
              ) : !expediente ? (
                <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl">
                  <FolderArchive size={40} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium mb-3">Expediente no cargado</p>
                  <button onClick={() => cargarExpediente(empleadoSel.id)} className="px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl">Cargar expediente</button>
                </div>
              ) : (
                <div>
                  {/* Cabecera */}
                  <div className="bg-white border-2 border-violet-200 rounded-2xl p-5 mb-4">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><FolderOpen size={16} className="text-violet-600" /> Expediente Digital</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{empleadoSel.nombre} {empleadoSel.apellidos} · {empleadoSel.dni}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Completitud</p>
                          <p className={`text-2xl font-black ${(expediente.completitud_pct||0) >= 80 ? 'text-emerald-600' : (expediente.completitud_pct||0) >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{expediente.completitud_pct||0}%</p>
                        </div>
                        {expediente.carpeta_raiz_url && (
                          <a href={expediente.carpeta_raiz_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-[#1a3c34] hover:bg-[#2d5a4e] text-white text-xs font-bold rounded-xl">
                            <FolderOpen size={14} /> Abrir en Drive
                          </a>
                        )}
                        <button onClick={() => cargarExpediente(empleadoSel.id)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><RefreshCw size={14} /></button>
                      </div>
                    </div>
                    {/* Barra progreso */}
                    <div className="w-full h-2 bg-slate-100 rounded-full mb-4">
                      <div className={`h-full rounded-full ${(expediente.completitud_pct||0) >= 80 ? 'bg-emerald-500' : (expediente.completitud_pct||0) >= 50 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: (expediente.completitud_pct||0) + '%' }} />
                    </div>
                    {/* Alertas */}
                    {expediente.alertas?.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {expediente.alertas.map((a: any, i: number) => (
                          <div key={i} className={`flex items-center gap-2 p-2.5 rounded-xl text-xs ${a.nivel === 'alta' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                            <AlertTriangle size={13} className="flex-shrink-0" />
                            <span className="font-medium flex-1">{a.msg}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${a.nivel === 'alta' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'}`}>{a.nivel === 'alta' ? 'URGENTE' : 'AVISO'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Checklist */}
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Documentos obligatorios</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {DOCS_OBLIGATORIOS.map((req: any) => {
                        const doc = expediente.documentos?.find((d: any) => d.tipo === req.tipo)
                        const vence = doc?.vencimiento ? new Date(doc.vencimiento) < new Date(Date.now() + 30 * 86400000) : false
                        return (
                          <div key={req.tipo} className={`flex items-center gap-2 p-2.5 rounded-xl border ${doc ? (vence ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200') : 'bg-red-50 border-red-200'}`}>
                            <span className="text-base">{req.icon}</span>
                            {doc ? (vence ? <AlertTriangle size={13} className="text-amber-600 flex-shrink-0" /> : <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />) : <XCircle size={13} className="text-red-400 flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium truncate ${doc ? (vence ? 'text-amber-800' : 'text-emerald-800') : 'text-red-700'}`}>{req.label}</p>
                              {doc?.vencimiento && <p className={`text-[9px] ${vence ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>⏰ {fmtDate(doc.vencimiento)}</p>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  {/* Subcarpetas Drive */}
                  {expediente.subcarpetas?.length > 0 && (
                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 mb-4">
                      <p className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2"><FolderArchive size={15} className="text-violet-600" /> Subcarpetas en Drive</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {expediente.subcarpetas.map((sub: any) => (
                          <div key={sub.nombre} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0"><FolderOpen size={14} className="text-violet-600" /></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{sub.nombre}</p>
                              <p className="text-[10px] text-slate-500 truncate">{sub.descripcion}</p>
                            </div>
                            {expediente.carpeta_raiz_url && (
                              <a href={expediente.carpeta_raiz_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-violet-600 rounded-lg"><ExternalLink size={13} /></a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Docs registrados */}
                  {expediente.documentos?.length > 0 && (
                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-5">
                      <p className="text-sm font-bold text-slate-900 mb-3"><FileText size={15} className="inline mr-1.5 text-violet-600" />Documentos registrados ({expediente.total_docs})</p>
                      <div className="space-y-2">
                        {expediente.documentos.map((doc: any, i: number) => {
                          const vence = doc.vencimiento ? new Date(doc.vencimiento) < new Date(Date.now() + 30 * 86400000) : false
                          return (
                            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${vence ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                              <FileText size={14} className={`flex-shrink-0 ${vence ? 'text-amber-600' : 'text-slate-400'}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-800 truncate">{doc.nombre || doc.tipo}</p>
                                <span className="text-[10px] text-slate-400">{doc.tipo} · {doc.categoria}</span>
                              </div>
                              {doc.vencimiento && <span className={`text-[10px] flex-shrink-0 font-medium ${vence ? 'text-amber-700' : 'text-slate-400'}`}>{vence ? '⚠️ ' : '📅 '}{fmtDate(doc.vencimiento)}</span>}
                              {doc.url && <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 flex-shrink-0"><ExternalLink size={11} className="text-slate-400" /></a>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══ TAB PRL ═══ */}
          {tabDetalle === 'prl' && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className={`p-4 rounded-2xl text-center border-2 ${prlRecos.some((r: any) => r.alerta) ? 'bg-red-50 border-red-200' : prlRecos.length > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Reconoc. médico</p>
                  {prlRecos.length > 0 ? (<><p className={`text-sm font-black ${prlRecos[0].apto === 'Apto' ? 'text-emerald-700' : 'text-amber-700'}`}>{prlRecos[0].apto}</p><p className="text-[9px] text-slate-400">{fmtDate(prlRecos[0].fecha)}</p>{prlRecos[0].fecha_proximo && <p className={`text-[9px] font-bold ${prlRecos[0].alerta ? 'text-red-600' : 'text-emerald-600'}`}>Próx: {fmtDate(prlRecos[0].fecha_proximo)}</p>}</>) : <p className="text-xs text-red-600 font-bold mt-1">⚠️ SIN REALIZAR</p>}
                </div>
                <div className={`p-4 rounded-2xl text-center border-2 ${prlFormacion.length > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Formación PRL</p>
                  <p className="text-2xl font-black">{prlFormacion.length}</p>
                  <p className="text-[9px] text-slate-500">{prlFormacion.length > 0 ? 'cursos' : '⚠️ SIN FORMACIÓN'}</p>
                </div>
                <div className="p-4 rounded-2xl text-center border-2 bg-slate-50 border-slate-200">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">EPIs</p>
                  <p className="text-2xl font-black">{prlEpis.length}</p>
                  <p className="text-[9px] text-slate-500">{prlEpis.filter((e: any) => e.alerta === 'caducado').length > 0 ? '⚠️ ' + prlEpis.filter((e: any) => e.alerta === 'caducado').length + ' caducados' : 'registrados'}</p>
                </div>
                <div className={`p-4 rounded-2xl text-center border-2 ${prlAccidentes.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Accidentes</p>
                  <p className="text-2xl font-black">{prlAccidentes.length}</p>
                  <p className="text-[9px] text-slate-500">{prlAccidentes.length === 0 ? '✓ Sin accidentes' : prlAccidentes.filter((a: any) => a.baja_medica === 'Sí').length + ' con baja'}</p>
                </div>
              </div>
              {prlEpis.length > 0 && (<div className="bg-white border border-slate-200 rounded-2xl p-4 mb-3"><p className="text-xs font-bold text-slate-700 mb-2">EPIs entregados</p><div className="space-y-1.5">{prlEpis.map((e: any) => (<div key={e.id} className={`flex items-center justify-between p-2.5 rounded-xl text-xs ${e.alerta === 'caducado' ? 'bg-red-50 border border-red-200' : 'bg-slate-50'}`}><span className="font-medium">{e.tipo} — {e.descripcion||''} (×{e.cantidad})</span><span className={e.alerta === 'caducado' ? 'text-red-600 font-bold' : 'text-slate-400'}>{fmtDate(e.fecha_entrega)}{e.alerta === 'caducado' ? ' · CADUCADO ⚠️' : ''}</span></div>))}</div></div>)}
              {prlFormacion.length > 0 && (<div className="bg-white border border-slate-200 rounded-2xl p-4 mb-3"><p className="text-xs font-bold text-slate-700 mb-2">Formación PRL</p><div className="space-y-1.5">{prlFormacion.map((f: any) => (<div key={f.id} className={`flex items-center justify-between p-2.5 rounded-xl text-xs ${f.alerta === 'caducado' ? 'bg-red-50 border border-red-200' : 'bg-slate-50'}`}><span className="font-medium">{f.curso} ({f.horas}h)</span><span className={f.alerta === 'caducado' ? 'text-red-600 font-bold' : 'text-slate-400'}>{fmtDate(f.fecha_fin)}{f.alerta === 'caducado' ? ' · RENOVAR ⚠️' : ''}</span></div>))}</div></div>)}
              {prlAccidentes.length > 0 && (<div className="bg-white border border-slate-200 rounded-2xl p-4 mb-3"><p className="text-xs font-bold text-slate-700 mb-2">Accidentes</p><div className="space-y-2">{prlAccidentes.map((a: any) => (<div key={a.id} className={`p-3 rounded-xl text-xs border ${a.gravedad !== 'Leve' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}><div className="flex justify-between mb-1"><span className="font-semibold">{a.descripcion?.substring(0,80)}</span><span className="text-slate-400">{fmtDate(a.fecha)}</span></div><span className={`text-[10px] font-bold ${a.gravedad !== 'Leve' ? 'text-red-600' : 'text-amber-700'}`}>{a.gravedad}{a.baja_medica === 'Sí' ? ' · Baja '+a.dias_baja+'d' : ''}</span></div>))}</div></div>)}
              {prlEpis.length === 0 && prlRecos.length === 0 && prlFormacion.length === 0 && (
                <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl">
                  <Shield size={36} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Sin datos PRL</p>
                  <p className="text-xs text-slate-400 mt-1">Registra EPIs, reconocimientos y formación desde el módulo PRL</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}