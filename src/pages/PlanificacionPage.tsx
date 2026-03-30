import { useState, useEffect } from 'react'
import { api } from '../services/api'
import {
  Calendar, Plus, RefreshCw, ChevronLeft, ChevronRight,
  Loader2, CheckCircle2, AlertTriangle, X, Save, Users, Clock,
  CalendarRange, CalendarDays, Trash2
} from 'lucide-react'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DIAS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const TIPO_COLOR: Record<string, string> = {
  limpieza:     'bg-blue-100 text-blue-700 border-blue-200',
  jardineria:   'bg-emerald-100 text-emerald-700 border-emerald-200',
  mantenimiento:'bg-amber-100 text-amber-700 border-amber-200',
  conserjeria:  'bg-purple-100 text-purple-700 border-purple-200',
  vigilancia:   'bg-slate-100 text-slate-700 border-slate-200',
}

function getSemanaActual() {
  const now  = new Date()
  const lunes = new Date(now)
  const dia   = lunes.getDay()
  lunes.setDate(lunes.getDate() - (dia === 0 ? 6 : dia - 1))
  lunes.setHours(0,0,0,0)
  const semana = Math.ceil(((lunes.getTime() - new Date(lunes.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7)
  return `${lunes.getFullYear()}-W${String(semana).padStart(2,'0')}`
}

function hoyStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function PlanificacionPage() {
  const [semana, setSemana] = useState(getSemanaActual())
  const [cuadrante, setCuadrante] = useState<any>(null)
  const [centros, setCentros] = useState<any[]>([])
  const [empleados, setEmpleados] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  // Tabs de formulario
  const [formTab, setFormTab] = useState<'ninguno'|'semanal'|'rango'|'sustitucion'>('ninguno')

  // Form servicio semanal (original)
  const [form, setForm] = useState<any>({
    centro_id:'', centro_nombre:'', empleado_id:'', nombre_empleado:'',
    dia_semana:1, hora_inicio:'08:00', hora_fin:'16:00', tipo_servicio:'limpieza', frecuencia:'semanal'
  })

  // Form rango de fechas (NUEVO)
  const [formRango, setFormRango] = useState<any>({
    centro_id:'', centro_nombre:'', empleado_id:'', nombre_empleado:'',
    fecha_inicio: hoyStr(), fecha_fin: '',
    dias_semana: [1,2,3,4,5], // L-V por defecto
    hora_inicio:'08:00', hora_fin:'16:00', tipo_servicio:'limpieza',
    municipio:'', convenioId:''
  })

  // Form sustitución
  const [formSust, setFormSust] = useState<any>({
    centro_id:'', centro_nombre:'', empleado_original_id:'', nombre_original:'',
    empleado_sustituto_id:'', nombre_sustituto:'', fecha:'', motivo:''
  })

  // Preview de días laborables
  const [previewDias, setPreviewDias] = useState<number|null>(null)
  const [cargandoPreview, setCargandoPreview] = useState(false)

  // Resultado de programación por rango
  const [resultadoRango, setResultadoRango] = useState<any>(null)

  const showMsg = (m: string, err=false) => {
    if(err) setError(m); else setMsg(m)
    setTimeout(()=>{ setMsg(''); setError('') },4000)
  }

  const cargar = async (sem?: string) => {
    const semActual = sem || semana
    setCargando(true)
    try {
      const results = await Promise.allSettled([
        api.cuadranteSemanal(semActual),
        api.centros(),
        api.empleados()
      ])
      setCentros((results[1] as any).value?.centros || [])
      setEmpleados((results[2] as any).value?.empleados || [])
      setCuadrante((results[0] as any).value || null)
    } catch(e) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar(semana) }, [semana])

  // Preview: calcular días laborables cuando cambian las fechas del rango
  useEffect(() => {
    if (formRango.fecha_inicio && formRango.fecha_fin && formRango.fecha_fin >= formRango.fecha_inicio) {
      setCargandoPreview(true)
      api.diasLaborables(formRango.fecha_inicio, formRango.fecha_fin, formRango.municipio)
        .then((r: any) => { setPreviewDias(r.dias_laborables ?? null) })
        .catch(() => setPreviewDias(null))
        .finally(() => setCargandoPreview(false))
    } else {
      setPreviewDias(null)
    }
  }, [formRango.fecha_inicio, formRango.fecha_fin, formRango.municipio])

  const cambiarSemana = (dir: number) => {
    const [anio, wNum] = semana.split('-W').map(Number)
    let nuevaSem = wNum + dir
    let nuevoAnio = anio
    if (nuevaSem > 52) { nuevaSem = 1; nuevoAnio++ }
    if (nuevaSem < 1)  { nuevaSem = 52; nuevoAnio-- }
    setSemana(`${nuevoAnio}-W${String(nuevaSem).padStart(2,'0')}`)
  }

  // ═══ HANDLERS ═══

  const handleCrearServicio = async () => {
    if (!form.centro_id || !form.empleado_id) { showMsg('Centro y empleado son obligatorios', true); return }
    setGuardando(true)
    try {
      const r = await api.crearServicioProgramado(form)
      if (r.ok) { showMsg('✅ Servicio programado'); setFormTab('ninguno'); cargar() }
      else showMsg(r.error||'Error', true)
    } catch(e) { showMsg('Error', true) }
    finally { setGuardando(false) }
  }

  const handleProgramarRango = async () => {
    if (!formRango.centro_id || !formRango.empleado_id) { showMsg('Centro y empleado obligatorios', true); return }
    if (!formRango.fecha_inicio || !formRango.fecha_fin) { showMsg('Fechas obligatorias', true); return }
    if (formRango.fecha_fin < formRango.fecha_inicio) { showMsg('Fecha fin debe ser posterior', true); return }
    if (formRango.dias_semana.length === 0) { showMsg('Selecciona al menos un día', true); return }

    setGuardando(true); setResultadoRango(null)
    try {
      const r = await api.programarServicioRango(formRango)
      if (r.ok) {
        setResultadoRango(r)
        showMsg(`✅ ${r.servicios_creados} servicios programados`)
        cargar()
      } else showMsg(r.error||'Error', true)
    } catch(e) { showMsg('Error programando', true) }
    finally { setGuardando(false) }
  }

  const handleCrearSustitucion = async () => {
    if (!formSust.centro_id || !formSust.empleado_sustituto_id) { showMsg('Rellena todos los campos', true); return }
    setGuardando(true)
    try {
      const r = await api.crearSustitucion(formSust)
      if (r.ok) { showMsg('✅ Sustitución registrada'); setFormTab('ninguno'); cargar() }
      else showMsg(r.error||'Error', true)
    } catch(e) { showMsg('Error', true) }
    finally { setGuardando(false) }
  }

  // ═══ HELPERS UI ═══

  const onEmpChange = (id: string, target: 'form'|'rango'|'sustOrig'|'sustSust') => {
    const e = empleados.find(x=>x.id===id)
    const nombre = e ? `${e.nombre} ${e.apellidos}` : ''
    if (target === 'form') setForm({...form, empleado_id:id, nombre_empleado:nombre})
    else if (target === 'rango') setFormRango({...formRango, empleado_id:id, nombre_empleado:nombre})
    else if (target === 'sustOrig') setFormSust({...formSust, empleado_original_id:id, nombre_original:nombre})
    else if (target === 'sustSust') setFormSust({...formSust, empleado_sustituto_id:id, nombre_sustituto:nombre})
  }

  const onCentroChange = (id: string, target: 'form'|'rango'|'sust') => {
    const c = centros.find(x=>x.id===id)
    const nombre = c?.nombre||''
    const municipio = c?.municipio || c?.provincia || ''
    if (target === 'form') setForm({...form, centro_id:id, centro_nombre:nombre, tipo_servicio: c?.tipo_servicio||'limpieza'})
    else if (target === 'rango') setFormRango({...formRango, centro_id:id, centro_nombre:nombre, tipo_servicio: c?.tipo_servicio||'limpieza', municipio })
    else setFormSust({...formSust, centro_id:id, centro_nombre:nombre})
  }

  const toggleDiaSemana = (dia: number) => {
    const actual = formRango.dias_semana as number[]
    if (actual.includes(dia)) setFormRango({...formRango, dias_semana: actual.filter((d: number) => d !== dia)})
    else setFormRango({...formRango, dias_semana: [...actual, dia].sort()})
  }

  const horasPorEmpleado = (fila: any) =>
    Object.values(fila.dias as Record<string, any[]>)
      .flat()
      .filter((s: any) => !s.ausencia)
      .reduce((sum: number, s: any) => sum + (s.horas||0), 0)

  const empleadosActivos = empleados.filter(e => e.estado === 'activo')

  return (
    <div className="p-6 lg:p-8 max-w-full overflow-x-auto">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6 min-w-max flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e] rounded-xl shadow-lg">
            <Calendar size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Planificación</h1>
            <p className="text-sm text-slate-500">Cuadrante semanal y programación de servicios</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => cargar(semana)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><RefreshCw size={16}/></button>
          <button onClick={() => setFormTab(formTab === 'sustitucion' ? 'ninguno' : 'sustitucion')}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl ${formTab === 'sustitucion' ? 'bg-amber-500 text-white' : 'bg-amber-100 hover:bg-amber-200 text-amber-800'}`}>
            <Users size={14}/> Sustitución
          </button>
          <button onClick={() => setFormTab(formTab === 'semanal' ? 'ninguno' : 'semanal')}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl ${formTab === 'semanal' ? 'bg-[#1a3c34] text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
            <CalendarDays size={14}/> Servicio semanal
          </button>
          <button onClick={() => setFormTab(formTab === 'rango' ? 'ninguno' : 'rango')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl ${formTab === 'rango' ? 'bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
            <CalendarRange size={15}/> Programar por fechas
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {msg && <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2"><CheckCircle2 size={16}/>{msg}</div>}
      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertTriangle size={16}/>{error}</div>}

      {/* ═══ FORM PROGRAMAR POR RANGO ═══ */}
      {formTab === 'rango' && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarRange size={18} className="text-blue-700"/>
              <p className="text-sm font-bold text-blue-900">Programar servicio por rango de fechas</p>
            </div>
            <button onClick={() => { setFormTab('ninguno'); setResultadoRango(null) }}><X size={16}/></button>
          </div>

          <p className="text-xs text-blue-600 mb-4">
            Genera servicios automáticamente entre las fechas seleccionadas, excluyendo festivos nacionales, autonómicos, locales y ausencias del empleado.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Centro *</label>
              <select value={formRango.centro_id} onChange={e => onCentroChange(e.target.value, 'rango')}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Seleccionar centro —</option>
                {centros.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Empleado *</label>
              <select value={formRango.empleado_id} onChange={e => onEmpChange(e.target.value, 'rango')}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Seleccionar empleado —</option>
                {empleadosActivos.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Tipo de servicio</label>
              <select value={formRango.tipo_servicio} onChange={e => setFormRango({...formRango, tipo_servicio: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                {Object.keys(TIPO_COLOR).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Fecha inicio *</label>
              <input type="date" value={formRango.fecha_inicio} onChange={e => setFormRango({...formRango, fecha_inicio: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Fecha fin *</label>
              <input type="date" value={formRango.fecha_fin} onChange={e => setFormRango({...formRango, fecha_fin: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
            <div className="flex items-end">
              {cargandoPreview ? (
                <div className="flex items-center gap-2 text-xs text-blue-600"><Loader2 size={12} className="animate-spin"/> Calculando días...</div>
              ) : previewDias !== null ? (
                <div className="px-4 py-2 bg-blue-100 border border-blue-300 rounded-xl text-center w-full">
                  <p className="text-lg font-black text-blue-800">{previewDias}</p>
                  <p className="text-[10px] text-blue-600 font-semibold">días laborables</p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Días de la semana */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-slate-600 block mb-2">Días de trabajo</label>
            <div className="flex gap-2">
              {DIAS_FULL.map((d, i) => {
                const diaNum = i + 1
                const sel = (formRango.dias_semana as number[]).includes(diaNum)
                return (
                  <button key={diaNum} onClick={() => toggleDiaSemana(diaNum)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      sel ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-300'
                    }`}>
                    {DIAS[i]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Horarios */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Hora entrada</label>
              <input type="time" value={formRango.hora_inicio} onChange={e => setFormRango({...formRango, hora_inicio: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Hora salida</label>
              <input type="time" value={formRango.hora_fin} onChange={e => setFormRango({...formRango, hora_fin: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
          </div>

          <button onClick={handleProgramarRango} disabled={guardando}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 disabled:bg-blue-400">
            {guardando ? <Loader2 size={14} className="animate-spin"/> : <CalendarRange size={14}/>}
            Programar servicios en rango
          </button>

          {/* Resultado */}
          {resultadoRango && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-sm font-bold text-emerald-800 mb-2">✅ Programación completada</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-lg font-black text-emerald-700">{resultadoRango.servicios_creados}</p>
                  <p className="text-slate-500">Servicios creados</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-lg font-black text-amber-600">{resultadoRango.dias_festivos_excluidos || 0}</p>
                  <p className="text-slate-500">Festivos excluidos</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-lg font-black text-red-600">{resultadoRango.dias_ausencia_excluidos || 0}</p>
                  <p className="text-slate-500">Ausencias excluidas</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-xs font-bold text-slate-700">{resultadoRango.fecha_inicio}</p>
                  <p className="text-xs font-bold text-slate-700">→ {resultadoRango.fecha_fin}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ FORM SERVICIO SEMANAL (original) ═══ */}
      {formTab === 'semanal' && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-emerald-900">Programar servicio semanal recurrente</p>
            <button onClick={() => setFormTab('ninguno')}><X size={16}/></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Centro</label>
              <select value={form.centro_id} onChange={e => onCentroChange(e.target.value, 'form')}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">—</option>
                {centros.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Empleado</label>
              <select value={form.empleado_id} onChange={e => onEmpChange(e.target.value, 'form')}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">—</option>
                {empleadosActivos.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Día</label>
              <select value={form.dia_semana} onChange={e => setForm({...form, dia_semana: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                {DIAS_FULL.map((d,i) => <option key={i+1} value={i+1}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Entrada</label>
              <input type="time" value={form.hora_inicio} onChange={e => setForm({...form, hora_inicio: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Salida</label>
              <input type="time" value={form.hora_fin} onChange={e => setForm({...form, hora_fin: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Frecuencia</label>
              <select value={form.frecuencia} onChange={e => setForm({...form, frecuencia: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
              </select>
            </div>
          </div>
          <button onClick={handleCrearServicio} disabled={guardando}
            className="w-full py-2.5 bg-[#1a3c34] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
            {guardando ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Programar
          </button>
        </div>
      )}

      {/* ═══ FORM SUSTITUCIÓN ═══ */}
      {formTab === 'sustitucion' && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-amber-800">Registrar sustitución</p>
            <button onClick={() => setFormTab('ninguno')}><X size={16}/></button>
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
              <label className="text-xs font-semibold text-slate-600 block mb-1">Fecha</label>
              <input type="date" value={formSust.fecha} onChange={e => setFormSust({...formSust, fecha: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Trabajador ausente</label>
              <select value={formSust.empleado_original_id} onChange={e => onEmpChange(e.target.value, 'sustOrig')}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">—</option>
                {empleadosActivos.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Sustituto</label>
              <select value={formSust.empleado_sustituto_id} onChange={e => onEmpChange(e.target.value, 'sustSust')}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">—</option>
                {empleadosActivos.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 block mb-1">Motivo</label>
              <input value={formSust.motivo} onChange={e => setFormSust({...formSust, motivo: e.target.value})}
                placeholder="Baja médica, vacaciones..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
          </div>
          <button onClick={handleCrearSustitucion} disabled={guardando}
            className="w-full py-2.5 bg-amber-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
            {guardando ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Registrar sustitución
          </button>
        </div>
      )}

      {/* Selector semana */}
      <div className="flex items-center justify-center gap-3 mb-5">
        <button onClick={() => cambiarSemana(-1)} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">
          <ChevronLeft size={16}/>
        </button>
        <span className="text-sm font-bold px-4 py-2 bg-white border border-slate-200 rounded-xl min-w-[140px] text-center">
          Semana {semana.split('-W')[1]} — {semana.split('-W')[0]}
        </span>
        <button onClick={() => cambiarSemana(1)} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">
          <ChevronRight size={16}/>
        </button>
      </div>

      {/* Cuadrante */}
      {cargando ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-[#1a3c34]"/></div>
      ) : !cuadrante || cuadrante.total_filas === 0 ? (
        <div className="flex flex-col items-center py-16 bg-white border border-slate-200 rounded-2xl">
          <Calendar size={36} className="text-slate-300 mb-3"/>
          <p className="text-slate-500">Sin servicios programados</p>
          <p className="text-sm text-slate-400 mt-1">Usa "Programar por fechas" para crear servicios en un rango</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Cabecera días */}
          <div className="grid border-b border-slate-200" style={{gridTemplateColumns: '200px repeat(7, 1fr) 80px'}}>
            <div className="px-4 py-3 bg-[#1a3c34]">
              <p className="text-xs font-bold text-white/60 uppercase">Trabajador</p>
            </div>
            {DIAS.map((d, i) => {
              const fecha = cuadrante.dias?.[i] || ''
              const esHoy = fecha === new Date().toISOString().split('T')[0]
              return (
                <div key={d} className={`px-2 py-3 text-center border-l border-slate-200 ${esHoy ? 'bg-[#2d5a4e]' : 'bg-[#1a3c34]'}`}>
                  <p className={`text-xs font-bold ${esHoy ? 'text-white' : 'text-white/60'}`}>{d}</p>
                  <p className="text-[10px] text-white/40">{fecha.substring(8)}</p>
                </div>
              )
            })}
            <div className="px-2 py-3 text-center border-l border-slate-200 bg-[#1a3c34]">
              <p className="text-[10px] font-bold text-white/60 uppercase">Horas</p>
            </div>
          </div>

          {/* Filas trabajadores */}
          {cuadrante.cuadrante.map((fila: any, fi: number) => (
            <div key={fila.empleado_id||fi}
              className="grid border-b border-slate-100 hover:bg-slate-50/50 transition-colors min-h-16"
              style={{gridTemplateColumns: '200px repeat(7, 1fr) 80px'}}>
              <div className="px-4 py-3 flex items-center gap-2 border-r border-slate-100">
                <div className="w-7 h-7 rounded-full bg-[#1a3c34] flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                  {(fila.nombre||'?')[0].toUpperCase()}
                </div>
                <p className="text-xs font-semibold text-slate-800 leading-tight truncate">{fila.nombre}</p>
              </div>
              {[1,2,3,4,5,6,7].map(dia => {
                const servicios = fila.dias[dia] || []
                const ausencia = servicios.find((s: any) => s.ausencia)
                const svcs = servicios.filter((s: any) => !s.ausencia)
                return (
                  <div key={dia} className={`px-1 py-1.5 border-l border-slate-100 min-h-16 overflow-hidden ${ausencia ? 'bg-red-50' : ''}`}>
                    {ausencia && (
                      <div className="rounded-lg px-2 py-1.5 bg-red-100 border border-red-300 text-center">
                        <p className="text-[9px] font-black text-red-700 uppercase">🚫 Ausencia</p>
                        <p className="text-[9px] text-red-600 capitalize">{ausencia.motivo}</p>
                      </div>
                    )}
                    {!ausencia && svcs.map((s: any, si: number) => (
                      <div key={si} className={`rounded-lg px-2 py-1 mb-1 border text-[9px] font-semibold overflow-hidden ${TIPO_COLOR[s.tipo_servicio] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        <p className="font-bold truncate w-full">{s.centro}</p>
                        <p className="opacity-70 truncate">{s.hora_inicio}–{s.hora_fin}</p>
                      </div>
                    ))}
                  </div>
                )
              })}
              <div className="flex items-center justify-center border-l border-slate-100">
                <span className="text-xs font-black text-[#1a3c34]">{horasPorEmpleado(fila)}h</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
