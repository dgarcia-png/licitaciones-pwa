import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { Calendar, Plus, RefreshCw, ChevronLeft, ChevronRight,
  Loader2, CheckCircle2, AlertTriangle, X, Save, Users, Clock } from 'lucide-react'

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

export default function PlanificacionPage() {
  const [semana, setSemana] = useState(getSemanaActual())
  const [cuadrante, setCuadrante] = useState<any>(null)
  const [centros, setCentros] = useState<any[]>([])
  const [empleados, setEmpleados] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [mostrarSust, setMostrarSust] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState<any>({
    centro_id:'', centro_nombre:'', empleado_id:'', nombre_empleado:'',
    dia_semana:1, hora_inicio:'08:00', hora_fin:'16:00', tipo_servicio:'limpieza', frecuencia:'semanal'
  })
  const [formSust, setFormSust] = useState<any>({
    centro_id:'', centro_nombre:'', empleado_original_id:'', nombre_original:'',
    empleado_sustituto_id:'', nombre_sustituto:'', fecha:'', motivo:''
  })

  const showMsg = (m: string, err=false) => {
    if(err) setError(m); else setMsg(m)
    setTimeout(()=>{ setMsg(''); setError('') },3000)
  }

  const cargar = async () => {
    setCargando(true)
    try {
      const [c, emp] = await Promise.all([
        (api as any).centros(),
        api.empleados()
      ])
      setCentros(c.centros||[])
      setEmpleados(emp.empleados||[])
      const cuad = await (api as any).cuadranteSemanal(semana)
      setCuadrante(cuad)
    } catch(e) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [semana])

  const cambiarSemana = (dir: number) => {
    const [anio, wNum] = semana.split('-W').map(Number)
    let nuevaSem = wNum + dir
    let nuevoAnio = anio
    if (nuevaSem > 52) { nuevaSem = 1; nuevoAnio++ }
    if (nuevaSem < 1)  { nuevaSem = 52; nuevoAnio-- }
    setSemana(`${nuevoAnio}-W${String(nuevaSem).padStart(2,'0')}`)
  }

  const handleCrearServicio = async () => {
    if (!form.centro_id || !form.empleado_id) { showMsg('Centro y empleado son obligatorios', true); return }
    setGuardando(true)
    try {
      const r = await (api as any).crearServicioProgramado(form)
      if (r.ok) { showMsg('✅ Servicio programado'); setMostrarForm(false); cargar() }
      else showMsg(r.error||'Error', true)
    } catch(e) { showMsg('Error', true) }
    finally { setGuardando(false) }
  }

  const handleCrearSustitucion = async () => {
    if (!formSust.centro_id || !formSust.empleado_sustituto_id) { showMsg('Rellena todos los campos', true); return }
    setGuardando(true)
    try {
      const r = await (api as any).crearSustitucion(formSust)
      if (r.ok) { showMsg('✅ Sustitución registrada'); setMostrarSust(false); cargar() }
      else showMsg(r.error||'Error', true)
    } catch(e) { showMsg('Error', true) }
    finally { setGuardando(false) }
  }

  const onEmpChange = (id: string, esOrig=false) => {
    const e = empleados.find(x=>x.id===id)
    const nombre = e ? `${e.nombre} ${e.apellidos}` : ''
    if (esOrig) setFormSust({...formSust, empleado_original_id:id, nombre_original:nombre})
    else if (mostrarSust) setFormSust({...formSust, empleado_sustituto_id:id, nombre_sustituto:nombre})
    else setForm({...form, empleado_id:id, nombre_empleado:nombre})
  }
  const onCentroChange = (id: string, esSust=false) => {
    const c = centros.find(x=>x.id===id)
    const nombre = c?.nombre||''
    if (esSust) setFormSust({...formSust, centro_id:id, centro_nombre:nombre})
    else setForm({...form, centro_id:id, centro_nombre:nombre, tipo_servicio: c?.tipo_servicio||'limpieza'})
  }

  // Calcular horas totales por empleado en la semana
  const horasPorEmpleado = (fila: any) =>
    Object.values(fila.dias as Record<string, any[]>)
      .flat()
      .filter((s: any) => !s.ausencia)
      .reduce((sum: number, s: any) => sum + (s.horas||0), 0)

  return (
    <div className="p-6 lg:p-8 max-w-full overflow-x-auto">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6 min-w-max">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e] rounded-xl shadow-lg">
            <Calendar size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Planificación semanal</h1>
            <p className="text-sm text-slate-500">Cuadrante de servicios y asignaciones</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><RefreshCw size={16}/></button>
          <button onClick={()=>setMostrarSust(true)}
            className="flex items-center gap-2 px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-semibold rounded-xl">
            <Users size={14}/> Sustitución
          </button>
          <button onClick={()=>setMostrarForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1a3c34] hover:bg-[#2d5a4e] text-white text-sm font-semibold rounded-xl">
            <Plus size={15}/> Programar servicio
          </button>
        </div>
      </div>

      {msg && <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-emerald-800 text-sm"><CheckCircle2 size={15}/>{msg}</div>}
      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-red-800 text-sm"><AlertTriangle size={15}/>{error}</div>}

      {/* Navegación de semana */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={()=>cambiarSemana(-1)} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">
          <ChevronLeft size={16}/>
        </button>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 min-w-32 text-center">
          {cuadrante ? `${cuadrante.dias?.[0]?.substring(5)} → ${cuadrante.dias?.[6]?.substring(5)}` : semana}
        </div>
        <button onClick={()=>cambiarSemana(1)} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">
          <ChevronRight size={16}/>
        </button>
        <button onClick={()=>setSemana(getSemanaActual())}
          className="px-3 py-2 text-xs font-bold text-[#1a3c34] bg-[#e8f0ee] hover:bg-[#1a3c34]/20 rounded-xl">
          Hoy
        </button>
        {cuadrante && <p className="text-xs text-slate-400">{cuadrante.total_filas} trabajadores</p>}
      </div>

      {/* Formularios */}
      {mostrarForm && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-blue-800">Programar servicio recurrente</p>
            <button onClick={()=>setMostrarForm(false)}><X size={16} className="text-blue-600"/></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 block mb-1">Centro</label>
              <select value={form.centro_id} onChange={e=>onCentroChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Seleccionar —</option>
                {centros.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 block mb-1">Trabajador</label>
              <select value={form.empleado_id} onChange={e=>onEmpChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Seleccionar —</option>
                {empleados.filter(e=>e.estado==='activo').map(e=><option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Día</label>
              <select value={form.dia_semana} onChange={e=>setForm({...form,dia_semana:parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                {DIAS_FULL.map((d,i)=><option key={i+1} value={i+1}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Entrada</label>
              <input type="time" value={form.hora_inicio} onChange={e=>setForm({...form,hora_inicio:e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Salida</label>
              <input type="time" value={form.hora_fin} onChange={e=>setForm({...form,hora_fin:e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Frecuencia</label>
              <select value={form.frecuencia} onChange={e=>setForm({...form,frecuencia:e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
              </select>
            </div>
          </div>
          <button onClick={handleCrearServicio} disabled={guardando}
            className="w-full py-2.5 bg-[#1a3c34] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
            {guardando?<Loader2 size={14} className="animate-spin"/>:<Save size={14}/>} Programar
          </button>
        </div>
      )}

      {mostrarSust && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-amber-800">Registrar sustitución</p>
            <button onClick={()=>setMostrarSust(false)}><X size={16}/></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Centro</label>
              <select value={formSust.centro_id} onChange={e=>onCentroChange(e.target.value,true)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">—</option>
                {centros.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Fecha</label>
              <input type="date" value={formSust.fecha} onChange={e=>setFormSust({...formSust,fecha:e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Trabajador ausente</label>
              <select value={formSust.empleado_original_id} onChange={e=>onEmpChange(e.target.value,true)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">—</option>
                {empleados.filter(e=>e.estado==='activo').map(e=><option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Sustituto</label>
              <select value={formSust.empleado_sustituto_id} onChange={e=>onEmpChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">—</option>
                {empleados.filter(e=>e.estado==='activo').map(e=><option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 block mb-1">Motivo</label>
              <input value={formSust.motivo} onChange={e=>setFormSust({...formSust,motivo:e.target.value})}
                placeholder="Baja médica, vacaciones..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
          </div>
          <button onClick={handleCrearSustitucion} disabled={guardando}
            className="w-full py-2.5 bg-amber-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
            {guardando?<Loader2 size={14} className="animate-spin"/>:<Save size={14}/>} Registrar sustitución
          </button>
        </div>
      )}

      {/* Cuadrante */}
      {cargando ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-[#1a3c34]"/></div>
      ) : !cuadrante || cuadrante.total_filas === 0 ? (
        <div className="flex flex-col items-center py-16 bg-white border border-slate-200 rounded-2xl">
          <Calendar size={36} className="text-slate-300 mb-3"/>
          <p className="text-slate-500">Sin servicios programados</p>
          <p className="text-sm text-slate-400 mt-1">Programa el primer servicio recurrente</p>
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
              className={`grid border-b border-slate-100 hover:bg-slate-50/50 transition-colors min-h-16`}
              style={{gridTemplateColumns: '200px repeat(7, 1fr) 80px'}}>

              {/* Nombre trabajador */}
              <div className="px-4 py-3 flex items-center gap-2 border-r border-slate-100">
                <div className="w-7 h-7 rounded-full bg-[#1a3c34] flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                  {(fila.nombre||'?')[0].toUpperCase()}
                </div>
                <p className="text-xs font-semibold text-slate-800 leading-tight truncate">{fila.nombre}</p>
              </div>

              {/* Celdas días */}
              {[1,2,3,4,5,6,7].map(dia => {
                const servicios = fila.dias[dia] || []
                const ausencia = servicios.find((s: any) => s.ausencia)
                const svcs = servicios.filter((s: any) => !s.ausencia)
                return (
                  <div key={dia} className="px-1 py-1.5 border-l border-slate-100 min-h-16">
                    {ausencia && (
                      <div className="rounded-lg px-2 py-1 mb-1 bg-red-50 border border-red-200">
                        <p className="text-[9px] font-bold text-red-600 uppercase">Ausencia</p>
                        <p className="text-[9px] text-red-500">{ausencia.motivo}</p>
                      </div>
                    )}
                    {svcs.map((s: any, si: number) => (
                      <div key={si} className={`rounded-lg px-2 py-1 mb-1 border text-[9px] font-semibold truncate ${TIPO_COLOR[s.tipo_servicio] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        <p className="font-bold truncate">{s.centro}</p>
                        <p className="opacity-70">{s.hora_inicio}–{s.hora_fin}</p>
                      </div>
                    ))}
                  </div>
                )
              })}

              {/* Total horas */}
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