import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
import {
  Calendar, RefreshCw, ChevronLeft, ChevronRight,
  Loader2, CheckCircle2, AlertTriangle, X, Save, Users,
  CalendarRange, CalendarDays, Briefcase, Pencil, Trash2, Info
} from 'lucide-react'

const DIAS     = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DIAS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const TIPO_COLOR: Record<string, string> = {
  limpieza:      'bg-blue-100 text-blue-700 border-blue-200',
  jardineria:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  mantenimiento: 'bg-amber-100 text-amber-700 border-amber-200',
  conserjeria:   'bg-purple-100 text-purple-700 border-purple-200',
  vigilancia:    'bg-slate-100 text-slate-700 border-slate-200',
  sustitucion:   'bg-orange-100 text-orange-700 border-orange-300',
  ausencia:      'bg-red-100 text-red-700 border-red-300',
}

function getSemanaActual() {
  const now   = new Date()
  const lunes = new Date(now)
  const dia   = lunes.getDay()
  lunes.setDate(lunes.getDate() - (dia === 0 ? 6 : dia - 1))
  lunes.setHours(0, 0, 0, 0)
  const semana = Math.ceil(((lunes.getTime() - new Date(lunes.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7)
  return `${lunes.getFullYear()}-W${String(semana).padStart(2, '0')}`
}

function hoyStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function calcHoras(hi: string, hf: string) {
  if (!hi || !hf) return 0
  const [h1, m1] = hi.split(':').map(Number)
  const [h2, m2] = hf.split(':').map(Number)
  return Math.round(((h2 * 60 + m2 - h1 * 60 - m1) / 60) * 10) / 10
}

const FORM_VACIO = {
  tipo: 'recurrente' as 'puntual' | 'recurrente' | 'contractual',
  centro_id: '', centro_nombre: '',
  empleado_id: '', nombre_empleado: '',
  fecha: hoyStr(),
  fecha_inicio: hoyStr(), fecha_fin: '',
  dias_semana: [1, 2, 3, 4, 5] as number[],
  hora_inicio: '08:00', hora_fin: '16:00',
  tipo_servicio: 'limpieza',
  municipio: '', notas: ''
}

const FORM_SUST_VACIO = {
  centro_id: '', centro_nombre: '',
  empleado_original_id: '', nombre_original: '',
  empleado_sustituto_id: '', nombre_sustituto: '',
  fecha: '', hora_inicio: '08:00', hora_fin: '16:00', motivo: ''
}

export default function PlanificacionPage() {
  const [semana, setSemana]         = useState(getSemanaActual())
  const [cuadrante, setCuadrante]   = useState<any>(null)
  const [centros, setCentros]        = useState<any[]>([])
  const [empleados, setEmpleados]    = useState<any[]>([])
  const [cargando, setCargando]      = useState(true)
  const [guardando, setGuardando]    = useState(false)
  const [msg, setMsg]                = useState('')
  const [error, setError]            = useState('')

  // Panel activo: 'ninguno' | 'servicio' | 'sustitucion'
  const [panel, setPanel] = useState<'ninguno' | 'servicio' | 'sustitucion'>('ninguno')

  // Form unificado para servicios
  const [form, setForm] = useState({ ...FORM_VACIO })

  // Form sustitución
  const [formSust, setFormSust] = useState({ ...FORM_SUST_VACIO })

  // Conflictos de ausencias detectados
  const [conflictos, setConflictos] = useState<any[]>([])
  const [mostrarConflictos, setMostrarConflictos] = useState(false)
  const [pendienteGuardar, setPendienteGuardar] = useState(false)

  // Modal edición
  const [servicioEditando, setServicioEditando] = useState<any>(null)
  const [scopeEdicion, setScopeEdicion]          = useState<'all' | 'from_now' | 'single'>('all')
  const [modalAccion, setModalAccion]            = useState<'editar' | 'borrar' | null>(null)

  const showMsg = (m: string, err = false) => {
    if (err) setError(m); else setMsg(m)
    setTimeout(() => { setMsg(''); setError('') }, 5000)
  }

  // ═══ CARGAR ═══

  const cargar = useCallback(async (sem?: string) => {
    const semActual = sem || semana
    setCargando(true)
    try {
      const [cuadRes, centRes, empRes] = await Promise.allSettled([
        api.cuadranteSemanal(semActual),
        api.centros(),
        api.empleados()
      ])

      if (centRes.status === 'fulfilled') setCentros((centRes.value as any).centros || [])
      if (empRes.status === 'fulfilled')  setEmpleados((empRes.value as any).empleados || [])

      const raw = cuadRes.status === 'fulfilled' ? (cuadRes.value as any) : {}
      const diasArr = (raw.dias || []).map((d: any) => typeof d === 'string' ? d : d?.fecha || '')
      const empMap: Record<string, any> = {}

      const ensureEmp = (eid: string, nombre: string) => {
        if (!empMap[eid]) empMap[eid] = {
          empleado_id: eid, nombre,
          dias: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] }
        }
      }

      ;(raw.dias || []).forEach((dia: any, idx: number) => {
        const diaKey = idx + 1

        // Servicios
        ;(Array.isArray(dia) ? [] : dia?.servicios || []).forEach((s: any) => {
          const eid = s.empleado_id || 'sin-asignar'
          ensureEmp(eid, s.nombre_empleado || s.nombre || eid)
          empMap[eid].dias[diaKey] = [...(empMap[eid].dias[diaKey] || []), { ...s, _diaFecha: diasArr[idx] }]
        })

        // Ausencias
        ;(Array.isArray(dia) ? [] : dia?.ausencias || []).forEach((au: any) => {
          const eid = au.empleado_id || 'sin-asignar'
          ensureEmp(eid, au.nombre_empleado || eid)
          empMap[eid].dias[diaKey] = [...(empMap[eid].dias[diaKey] || []), {
            ...au, tipo_servicio: 'ausencia', ausencia: true,
            motivo: au.tipo || au.motivo || 'Ausencia', _diaFecha: diasArr[idx]
          }]
        })

        // Sustituciones
        ;(Array.isArray(dia) ? [] : dia?.sustituciones || []).forEach((st: any) => {
          const eid = st.empleado_sustituto_id || 'sin-asignar'
          ensureEmp(eid, st.nombre_sustituto || eid)
          empMap[eid].dias[diaKey] = [...(empMap[eid].dias[diaKey] || []), {
            ...st, tipo_servicio: 'sustitucion', es_sustitucion: true,
            centro_nombre: st.centro_nombre, _diaFecha: diasArr[idx]
          }]
        })
      })

      const cuad = Object.values(empMap)
      setCuadrante(cuad.length > 0 || diasArr.length > 0
        ? { dias: diasArr, cuadrante: cuad }
        : null)
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }, [semana])

  useEffect(() => { cargar(semana) }, [semana])

  // ═══ NAVEGACIÓN SEMANA ═══

  const cambiarSemana = (dir: number) => {
    const [anio, wNum] = semana.split('-W').map(Number)
    let nw = wNum + dir, ny = anio
    if (nw > 52) { nw = 1; ny++ }
    if (nw < 1)  { nw = 52; ny-- }
    setSemana(`${ny}-W${String(nw).padStart(2, '0')}`)
  }

  // ═══ VALIDAR CONFLICTOS ═══

  const validarConflictos = async (datos: any): Promise<any[]> => {
    try {
      const r = await api.validarConflictosPlaning(datos)
      return r.conflictos || []
    } catch { return [] }
  }

  // ═══ HANDLERS SERVICIO ═══

  const handleGuardar = async (forzar = false) => {
    if (!form.centro_id || !form.empleado_id) { showMsg('Centro y empleado son obligatorios', true); return }
    if (form.tipo === 'puntual' && !form.fecha) { showMsg('La fecha es obligatoria', true); return }
    if ((form.tipo === 'recurrente' || form.tipo === 'contractual') && !form.fecha_inicio) { showMsg('Fecha inicio obligatoria', true); return }
    if (form.tipo === 'recurrente' && !form.fecha_fin) { showMsg('Fecha fin obligatoria para servicio recurrente', true); return }
    if ((form.tipo === 'recurrente' || form.tipo === 'contractual') && form.dias_semana.length === 0) { showMsg('Selecciona al menos un día', true); return }

    if (!forzar) {
      setGuardando(true)
      const conf = await validarConflictos({
        empleado_id: form.empleado_id,
        tipo: form.tipo,
        fecha: form.fecha,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        dias_semana: form.dias_semana,
      })
      setGuardando(false)
      if (conf.length > 0) {
        setConflictos(conf)
        setMostrarConflictos(true)
        setPendienteGuardar(true)
        return
      }
    }

    setGuardando(true)
    try {
      const payload: any = {
        tipo: form.tipo,
        centro_id: form.centro_id, centro_nombre: form.centro_nombre,
        empleado_id: form.empleado_id, nombre_empleado: form.nombre_empleado,
        hora_inicio: form.hora_inicio, hora_fin: form.hora_fin,
        tipo_servicio: form.tipo_servicio, notas: form.notas,
      }
      if (form.tipo === 'puntual') {
        payload.fecha = form.fecha
      } else {
        payload.fecha_inicio = form.fecha_inicio
        payload.fecha_fin = form.tipo === 'contractual' ? (form.fecha_fin || null) : form.fecha_fin
        payload.dias_semana = form.dias_semana
        payload.municipio = form.municipio
      }

      const r = await api.crearServicioProgramado(payload)
      if (r.ok) {
        showMsg('✅ Servicio programado correctamente')
        setForm({ ...FORM_VACIO })
        setPanel('ninguno')
        setConflictos([])
        setMostrarConflictos(false)
        setPendienteGuardar(false)
        cargar(semana)
      } else showMsg(r.error || 'Error al guardar', true)
    } catch { showMsg('Error de conexión', true) }
    finally { setGuardando(false) }
  }

  // ═══ HANDLER SUSTITUCIÓN ═══

  const handleGuardarSust = async () => {
    if (!formSust.centro_id || !formSust.empleado_sustituto_id) { showMsg('Centro y sustituto son obligatorios', true); return }
    if (!formSust.fecha) { showMsg('La fecha es obligatoria', true); return }
    setGuardando(true)
    try {
      const r = await api.crearSustitucion(formSust)
      if (r.ok) {
        showMsg('✅ Sustitución registrada')
        setFormSust({ ...FORM_SUST_VACIO })
        setPanel('ninguno')
        cargar(semana)
      } else showMsg(r.error || 'Error', true)
    } catch { showMsg('Error', true) }
    finally { setGuardando(false) }
  }

  // ═══ HANDLER EDICIÓN/BORRADO ═══

  const handleEditarServicio = async () => {
    if (!servicioEditando) return
    setGuardando(true)
    try {
      const payload: any = {
        hora_inicio: servicioEditando.hora_inicio,
        hora_fin: servicioEditando.hora_fin,
        tipo_servicio: servicioEditando.tipo_servicio,
        notas: servicioEditando.notas || '',
      }
      if (scopeEdicion === 'single') payload.fecha_excepcion = servicioEditando._diaFecha
      const r = await api.editarServicioPlanificacion(servicioEditando.id, payload, scopeEdicion)
      if (r.ok) {
        showMsg('✅ Servicio actualizado')
        setServicioEditando(null); setModalAccion(null)
        cargar(semana)
      } else showMsg(r.error || 'Error', true)
    } catch { showMsg('Error', true) }
    finally { setGuardando(false) }
  }

  const handleBorrarServicio = async () => {
    if (!servicioEditando) return
    setGuardando(true)
    try {
      const fecha = scopeEdicion === 'single' ? servicioEditando._diaFecha : undefined
      const r = await api.borrarServicioPlanificacion(servicioEditando.id, scopeEdicion, fecha)
      if (r.ok) {
        showMsg('✅ Servicio eliminado')
        setServicioEditando(null); setModalAccion(null)
        cargar(semana)
      } else showMsg(r.error || 'Error', true)
    } catch { showMsg('Error', true) }
    finally { setGuardando(false) }
  }

  // ═══ HELPERS UI ═══

  const onEmpChange = (id: string, target: 'form' | 'sustOrig' | 'sustSust') => {
    const e = empleados.find(x => x.id === id)
    const nombre = e ? `${e.nombre} ${e.apellidos}` : ''
    if (target === 'form')     setForm(f => ({ ...f, empleado_id: id, nombre_empleado: nombre }))
    if (target === 'sustOrig') setFormSust(f => ({ ...f, empleado_original_id: id, nombre_original: nombre }))
    if (target === 'sustSust') setFormSust(f => ({ ...f, empleado_sustituto_id: id, nombre_sustituto: nombre }))
  }

  const onCentroChange = (id: string, target: 'form' | 'sust') => {
    const c = centros.find(x => x.id === id)
    const nombre = c?.nombre || ''
    const municipio = c?.municipio || c?.provincia || ''
    if (target === 'form') setForm(f => ({ ...f, centro_id: id, centro_nombre: nombre, tipo_servicio: c?.tipo_servicio || 'limpieza', municipio }))
    if (target === 'sust') setFormSust(f => ({ ...f, centro_id: id, centro_nombre: nombre }))
  }

  const toggleDia = (dia: number) => {
    const actual = form.dias_semana
    setForm(f => ({ ...f, dias_semana: actual.includes(dia) ? actual.filter(d => d !== dia) : [...actual, dia].sort() }))
  }

  const horasPorEmpleado = (fila: any) => {
    const total = Object.values(fila.dias as Record<string, any[]>)
      .flat()
      .filter((s: any) => !s.ausencia && !s.es_sustitucion)
      .reduce((sum: number, s: any) => sum + calcHoras(s.hora_inicio, s.hora_fin), 0)
    return Math.round(total * 10) / 10
  }

  const empleadosActivos = empleados.filter(e => e.estado === 'activo')

  const tipoLabel = (tipo: string) => {
    if (tipo === 'puntual') return '📅 Día concreto'
    if (tipo === 'recurrente') return '🔁 Rango de fechas'
    if (tipo === 'contractual') return '📋 Contractual (indefinido)'
    return tipo
  }

  const scopeLabel = (s: string, tipo: string) => {
    if (tipo === 'puntual' || s === 'all') return 'Toda la serie / este servicio'
    if (s === 'from_now') return 'Desde hoy en adelante'
    if (s === 'single') return 'Solo este día'
    return s
  }

  return (
    <div className="p-4 lg:p-6 max-w-full overflow-x-auto">

      {/* ── CABECERA ── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e] rounded-xl shadow-lg">
            <Calendar size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Planificación</h1>
            <p className="text-xs text-slate-500">Cuadrante semanal · servicios · sustituciones</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => cargar(semana)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><RefreshCw size={15}/></button>
          <button onClick={() => setPanel(panel === 'sustitucion' ? 'ninguno' : 'sustitucion')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${panel === 'sustitucion' ? 'bg-amber-500 text-white' : 'bg-amber-100 hover:bg-amber-200 text-amber-800'}`}>
            <Users size={13}/> Sustitución
          </button>
          <button onClick={() => setPanel(panel === 'servicio' ? 'ninguno' : 'servicio')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${panel === 'servicio' ? 'bg-[#1a3c34] text-white' : 'bg-[#1a3c34]/10 hover:bg-[#1a3c34]/20 text-[#1a3c34]'}`}>
            <CalendarRange size={13}/> + Programar servicio
          </button>
        </div>
      </div>

      {/* ── MENSAJES ── */}
      {msg && <div className="mb-4 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2"><CheckCircle2 size={14}/>{msg}</div>}
      {error && <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertTriangle size={14}/>{error}</div>}

      {/* ── PANEL: PROGRAMAR SERVICIO ── */}
      {panel === 'servicio' && (
        <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-slate-800">Programar servicio</p>
            <button onClick={() => { setPanel('ninguno'); setConflictos([]); setMostrarConflictos(false) }}><X size={15}/></button>
          </div>

          {/* Selector tipo */}
          <div className="flex gap-2 mb-4">
            {(['puntual', 'recurrente', 'contractual'] as const).map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))}
                className={`flex-1 py-2 text-xs font-bold rounded-xl border-2 transition-all ${form.tipo === t ? 'bg-[#1a3c34] text-white border-[#1a3c34]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                {t === 'puntual' ? '📅 Puntual' : t === 'recurrente' ? '🔁 Por fechas' : '📋 Contractual'}
              </button>
            ))}
          </div>

          {/* Descripción tipo */}
          <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
            {form.tipo === 'puntual'      && 'Un servicio en un día concreto. Solo aparece en esa fecha.'}
            {form.tipo === 'recurrente'   && 'Se repite en los días elegidos entre fecha inicio y fin. Fuera de ese rango no aparece.'}
            {form.tipo === 'contractual'  && 'Se repite indefinidamente desde la fecha inicio. Sin fecha de fin hasta que se cancele.'}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Centro *</label>
              <select value={form.centro_id} onChange={e => onCentroChange(e.target.value, 'form')}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Seleccionar —</option>
                {centros.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Empleado *</label>
              <select value={form.empleado_id} onChange={e => onEmpChange(e.target.value, 'form')}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Seleccionar —</option>
                {empleadosActivos.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Tipo de servicio</label>
              <select value={form.tipo_servicio} onChange={e => setForm(f => ({ ...f, tipo_servicio: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                {['limpieza','jardineria','mantenimiento','conserjeria','vigilancia'].map(t =>
                  <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
                )}
              </select>
            </div>
          </div>

          {/* Fechas según tipo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {form.tipo === 'puntual' ? (
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-600 block mb-1">Fecha *</label>
                <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Fecha inicio *</label>
                  <input type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Fecha fin {form.tipo === 'recurrente' ? '*' : '(opcional)'}
                  </label>
                  <input type="date" value={form.fecha_fin} onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    placeholder={form.tipo === 'contractual' ? 'Indefinido' : ''}/>
                </div>
              </>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Entrada</label>
              <input type="time" value={form.hora_inicio} onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Salida</label>
              <input type="time" value={form.hora_fin} onChange={e => setForm(f => ({ ...f, hora_fin: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
          </div>

          {/* Días de la semana (solo recurrente/contractual) */}
          {form.tipo !== 'puntual' && (
            <div className="mb-3">
              <label className="text-xs font-semibold text-slate-600 block mb-2">Días de trabajo *</label>
              <div className="flex gap-2 flex-wrap">
                {DIAS_FULL.map((d, i) => {
                  const n = i + 1
                  const sel = form.dias_semana.includes(n)
                  return (
                    <button key={n} onClick={() => toggleDia(n)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${sel ? 'bg-[#1a3c34] text-white border-[#1a3c34]' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'}`}>
                      {DIAS[i]}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Notas */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-slate-600 block mb-1">Notas</label>
            <input value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              placeholder="Instrucciones especiales..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
          </div>

          {/* Conflictos detectados */}
          {mostrarConflictos && conflictos.length > 0 && (
            <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-amber-600"/>
                <p className="text-sm font-bold text-amber-800">
                  {conflictos.length} conflicto{conflictos.length > 1 ? 's' : ''} con ausencias aprobadas
                </p>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto mb-3">
                {conflictos.slice(0, 10).map((c, i) => (
                  <p key={i} className="text-xs text-amber-700">• {c.fecha} — {c.motivo}</p>
                ))}
                {conflictos.length > 10 && <p className="text-xs text-amber-500 italic">...y {conflictos.length - 10} más</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setMostrarConflictos(false); setConflictos([]) }}
                  className="flex-1 py-2 text-xs font-semibold border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
                <button onClick={() => { setMostrarConflictos(false); handleGuardar(true) }}
                  className="flex-1 py-2 text-xs font-semibold bg-amber-500 text-white rounded-xl hover:bg-amber-600">
                  Guardar igualmente (se planificará sustitución)
                </button>
              </div>
            </div>
          )}

          {!mostrarConflictos && (
            <button onClick={() => handleGuardar(false)} disabled={guardando}
              className="w-full py-2.5 bg-[#1a3c34] hover:bg-[#2d5a4e] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
              {guardando ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
              Programar servicio
            </button>
          )}
        </div>
      )}

      {/* ── PANEL: SUSTITUCIÓN ── */}
      {panel === 'sustitucion' && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-amber-800">Registrar sustitución</p>
            <button onClick={() => setPanel('ninguno')}><X size={15}/></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Centro</label>
              <select value={formSust.centro_id} onChange={e => onCentroChange(e.target.value, 'sust')}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">—</option>
                {centros.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Fecha *</label>
              <input type="date" value={formSust.fecha} onChange={e => setFormSust(f => ({ ...f, fecha: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Trabajador ausente</label>
              <select value={formSust.empleado_original_id} onChange={e => onEmpChange(e.target.value, 'sustOrig')}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Opcional —</option>
                {empleadosActivos.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Sustituto *</label>
              <select value={formSust.empleado_sustituto_id} onChange={e => onEmpChange(e.target.value, 'sustSust')}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">—</option>
                {empleadosActivos.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Entrada</label>
              <input type="time" value={formSust.hora_inicio} onChange={e => setFormSust(f => ({ ...f, hora_inicio: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Salida</label>
              <input type="time" value={formSust.hora_fin} onChange={e => setFormSust(f => ({ ...f, hora_fin: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 block mb-1">Motivo</label>
              <input value={formSust.motivo} onChange={e => setFormSust(f => ({ ...f, motivo: e.target.value }))}
                placeholder="Baja médica, vacaciones..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
          </div>
          <button onClick={handleGuardarSust} disabled={guardando}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
            {guardando ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Registrar sustitución
          </button>
        </div>
      )}

      {/* ── SELECTOR SEMANA ── */}
      <div className="flex items-center justify-center gap-3 mb-5">
        <button onClick={() => cambiarSemana(-1)} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">
          <ChevronLeft size={16}/>
        </button>
        <span className="text-sm font-bold px-4 py-2 bg-white border border-slate-200 rounded-xl min-w-[150px] text-center">
          Semana {semana.split('-W')[1]} — {semana.split('-W')[0]}
        </span>
        <button onClick={() => cambiarSemana(1)} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">
          <ChevronRight size={16}/>
        </button>
      </div>

      {/* ── CUADRANTE ── */}
      {cargando ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-[#1a3c34]"/></div>
      ) : !cuadrante ? (
        <div className="flex flex-col items-center py-16 bg-white border border-slate-200 rounded-2xl">
          <Calendar size={36} className="text-slate-300 mb-3"/>
          <p className="text-slate-500 font-medium">Sin servicios programados esta semana</p>
          <p className="text-sm text-slate-400 mt-1">Usa "+ Programar servicio" para añadir servicios</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Cabecera días */}
          <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: '180px repeat(7, 1fr) 70px' }}>
            <div className="px-3 py-3 bg-[#1a3c34]">
              <p className="text-[10px] font-bold text-white/60 uppercase">Trabajador</p>
            </div>
            {DIAS.map((d, i) => {
              const fecha = cuadrante.dias?.[i] || ''
              const esHoy = fecha === hoyStr()
              return (
                <div key={d} className={`px-2 py-3 text-center border-l border-slate-200 ${esHoy ? 'bg-[#2d5a4e]' : 'bg-[#1a3c34]'}`}>
                  <p className={`text-xs font-bold ${esHoy ? 'text-white' : 'text-white/70'}`}>{d}</p>
                  <p className="text-[10px] text-white/40">{String(fecha || '').substring(8)}</p>
                </div>
              )
            })}
            <div className="px-2 py-3 text-center border-l border-slate-200 bg-[#1a3c34]">
              <p className="text-[9px] font-bold text-white/60 uppercase">Horas</p>
            </div>
          </div>

          {/* Filas */}
          {(cuadrante?.cuadrante || []).map((fila: any, fi: number) => (
            <div key={fila.empleado_id || fi}
              className="grid border-b border-slate-100 hover:bg-slate-50/30 transition-colors"
              style={{ gridTemplateColumns: '180px repeat(7, 1fr) 70px' }}>

              {/* Nombre */}
              <div className="px-3 py-2 flex items-center gap-2 border-r border-slate-100">
                <div className="w-6 h-6 rounded-full bg-[#1a3c34] flex items-center justify-center text-white text-[10px] font-black flex-shrink-0">
                  {(fila.nombre || '?')[0].toUpperCase()}
                </div>
                <p className="text-xs font-semibold text-slate-800 leading-tight truncate">{fila.nombre}</p>
              </div>

              {/* Celdas por día */}
              {[1, 2, 3, 4, 5, 6, 7].map(dia => {
                const items = fila.dias[dia] || []
                const ausencia = items.find((s: any) => s.ausencia)
                const svcs = items.filter((s: any) => !s.ausencia)
                return (
                  <div key={dia} className={`px-1 py-1 border-l border-slate-100 min-h-14 ${ausencia ? 'bg-red-50' : ''}`}>
                    {ausencia && (
                      <div className="rounded-md px-1.5 py-1 bg-red-100 border border-red-300 mb-1">
                        <p className="text-[8px] font-black text-red-700 uppercase">🚫 Ausencia</p>
                        <p className="text-[8px] text-red-600 capitalize leading-tight">{ausencia.motivo}</p>
                        {svcs.length > 0 && (
                          <p className="text-[8px] text-red-500">⚠️ {svcs.length} svc afectado{svcs.length > 1 ? 's' : ''}</p>
                        )}
                      </div>
                    )}
                    {!ausencia && svcs.map((s: any, si: number) => (
                      s.es_sustitucion ? (
                        <div key={si} className="rounded-md px-1.5 py-1 mb-1 border text-[8px] font-semibold bg-orange-100 text-orange-700 border-orange-300">
                          <p className="font-black">🔄 Sustitución</p>
                          <p className="truncate leading-tight">{s.centro_nombre}</p>
                          {s.nombre_original && <p className="opacity-80 leading-tight">↔ {s.nombre_original}</p>}
                          {s.hora_inicio && <p className="opacity-70">{s.hora_inicio}–{s.hora_fin}</p>}
                          {s.motivo && <p className="opacity-60 italic truncate">{s.motivo}</p>}
                        </div>
                      ) : (
                        <div key={si}
                          className={`rounded-md px-1.5 py-1 mb-1 border text-[8px] font-semibold cursor-pointer hover:opacity-80 group relative ${TIPO_COLOR[s.tipo_servicio] || 'bg-slate-100 text-slate-600 border-slate-200'}`}
                          onClick={() => { setServicioEditando(s); setModalAccion('editar'); setScopeEdicion(s.tipo === 'puntual' ? 'all' : 'single') }}>
                          <p className="font-bold truncate leading-tight">{s.centro_nombre || s.centro}</p>
                          <p className="leading-tight">{s.hora_inicio}–{s.hora_fin}</p>
                          <p className="opacity-60 capitalize leading-tight">{s.tipo_servicio}</p>
                          {s.tipo && s.tipo !== 'puntual' && (
                            <p className="opacity-50 text-[7px] leading-tight">{s.tipo === 'recurrente' ? '🔁' : '📋'} {s.tipo}</p>
                          )}
                          {s.notas && <p className="opacity-60 italic truncate leading-tight">{s.notas}</p>}
                          {/* Botones edición en hover */}
                          <div className="absolute top-0.5 right-0.5 hidden group-hover:flex gap-0.5">
                            <button className="p-0.5 bg-white/80 rounded" onClick={e => { e.stopPropagation(); setServicioEditando(s); setModalAccion('editar'); setScopeEdicion(s.tipo === 'puntual' ? 'all' : 'single') }}>
                              <Pencil size={8}/>
                            </button>
                            <button className="p-0.5 bg-white/80 rounded text-red-500" onClick={e => { e.stopPropagation(); setServicioEditando(s); setModalAccion('borrar'); setScopeEdicion(s.tipo === 'puntual' ? 'all' : 'single') }}>
                              <Trash2 size={8}/>
                            </button>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )
              })}

              {/* Horas semana */}
              <div className="flex items-center justify-center border-l border-slate-100">
                <span className="text-xs font-black text-[#1a3c34]">{horasPorEmpleado(fila)}h</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL EDICIÓN / BORRADO ── */}
      {servicioEditando && modalAccion && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-slate-900">
                {modalAccion === 'editar' ? '✏️ Editar servicio' : '🗑️ Eliminar servicio'}
              </p>
              <button onClick={() => { setServicioEditando(null); setModalAccion(null) }}><X size={16}/></button>
            </div>

            {/* Info servicio */}
            <div className="p-3 bg-slate-50 rounded-xl mb-4 text-xs text-slate-600 space-y-1">
              <p><span className="font-semibold">Centro:</span> {servicioEditando.centro_nombre || servicioEditando.centro}</p>
              <p><span className="font-semibold">Horario:</span> {servicioEditando.hora_inicio}–{servicioEditando.hora_fin}</p>
              <p><span className="font-semibold">Tipo:</span> {tipoLabel(servicioEditando.tipo || 'puntual')}</p>
              {servicioEditando.tipo !== 'puntual' && (
                <p><span className="font-semibold">Rango:</span> {servicioEditando.fecha_inicio} → {servicioEditando.fecha_fin || 'indefinido'}</p>
              )}
              <p><span className="font-semibold">Día seleccionado:</span> {servicioEditando._diaFecha}</p>
            </div>

            {/* Scope (solo si no es puntual) */}
            {servicioEditando.tipo && servicioEditando.tipo !== 'puntual' && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-700 mb-2">¿A qué afecta el cambio?</p>
                <div className="space-y-2">
                  {(['single', 'from_now', 'all'] as const).map(s => (
                    <label key={s} className={`flex items-start gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${scopeEdicion === s ? 'border-[#1a3c34] bg-[#1a3c34]/5' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" name="scope" value={s} checked={scopeEdicion === s} onChange={() => setScopeEdicion(s)} className="mt-0.5"/>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{scopeLabel(s, servicioEditando.tipo)}</p>
                        <p className="text-[10px] text-slate-500">
                          {s === 'single' && `Solo el día ${servicioEditando._diaFecha}`}
                          {s === 'from_now' && 'Modifica desde hoy, mantiene el pasado'}
                          {s === 'all' && 'Modifica toda la planificación de este servicio'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Campos editables (solo si acción = editar) */}
            {modalAccion === 'editar' && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Entrada</label>
                  <input type="time" value={servicioEditando.hora_inicio}
                    onChange={e => setServicioEditando({ ...servicioEditando, hora_inicio: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Salida</label>
                  <input type="time" value={servicioEditando.hora_fin}
                    onChange={e => setServicioEditando({ ...servicioEditando, hora_fin: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Tipo de servicio</label>
                  <select value={servicioEditando.tipo_servicio}
                    onChange={e => setServicioEditando({ ...servicioEditando, tipo_servicio: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                    {['limpieza','jardineria','mantenimiento','conserjeria','vigilancia'].map(t =>
                      <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
                    )}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Notas</label>
                  <input value={servicioEditando.notas || ''}
                    onChange={e => setServicioEditando({ ...servicioEditando, notas: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
                </div>
              </div>
            )}

            {/* Botones acción */}
            <div className="flex gap-2">
              <button onClick={() => { setServicioEditando(null); setModalAccion(null) }}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              {modalAccion === 'editar' ? (
                <button onClick={handleEditarServicio} disabled={guardando}
                  className="flex-1 py-2.5 bg-[#1a3c34] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                  {guardando ? <Loader2 size={13} className="animate-spin"/> : <Save size={13}/>} Guardar
                </button>
              ) : (
                <button onClick={handleBorrarServicio} disabled={guardando}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                  {guardando ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={13}/>} Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
