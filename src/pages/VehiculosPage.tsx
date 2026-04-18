import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useConfigListas } from '../hooks/useConfigListas'
import { Car, Plus, RefreshCw, Loader2, CheckCircle2, AlertTriangle,
  X, Save, Fuel, Calendar, User, Settings } from 'lucide-react'

const COMBUSTIBLE_TIPOS = ['diesel','gasolina','electrico','hibrido','gnc']

const FORM_VACIO = {
  matricula:'', marca:'', modelo:'', tipo:'furgoneta',
  anio: new Date().getFullYear(), color:'blanco', combustible:'diesel',
  km_actuales:0, fecha_itv:'', fecha_seguro:'', fecha_revision:'',
  empleado_asignado:'', nombre_empleado:'', notas:''
}

export default function VehiculosPage() {
  const { tiposVehiculo: TIPO_VEH } = useConfigListas()

  const [vehiculos, setVehiculos] = useState<any[]>([])
  const [alertas, setAlertas] = useState<any[]>([])
  const [empleados, setEmpleados] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [vehSel, setVehSel] = useState<any>(null)
  const [combustible, setCombustible] = useState<any>(null)
  const [form, setForm] = useState<any>(FORM_VACIO)
  const [formRepostaje, setFormRepostaje] = useState<any>(null)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const showMsg = (m: string, err=false) => {
    if(err) setError(m); else setMsg(m)
    setTimeout(()=>{ setMsg(''); setError('') },3000)
  }

  const cargar = async () => {
    setCargando(true)
    try {
      const [v, emp] = await Promise.all([api.vehiculos(), api.empleados()])
      setVehiculos(v.vehiculos||[])
      setAlertas(v.alertas||[])
      setEmpleados(emp.empleados||[])
    } catch(e) {} finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  const cargarCombustible = async (id: string) => {
    const r = await api.combustibleVehiculo(id)
    setCombustible(r)
  }

  const [editandoVeh, setEditandoVeh] = useState<any>(null)

  const handleEditar = async () => {
    if (!editandoVeh) return
    setGuardando(true)
    try {
      const r = await api.actualizarVehiculo(editandoVeh)
      if (r.ok) { showMsg('✅ Vehículo actualizado'); setEditandoVeh(null); await cargar() }
      else showMsg(r.error || 'Error', true)
    } catch { showMsg('Error', true) }
    finally { setGuardando(false) }
  }

  const handleEliminar = async (id: string) => {
    if (!window.confirm('¿Eliminar este vehículo?')) return
    setGuardando(true)
    try {
      const r = await api.eliminarVehiculo(id)
      if (r.ok) { showMsg('✅ Vehículo eliminado'); setVehSel(null); await cargar() }
    } catch { showMsg('Error', true) }
    finally { setGuardando(false) }
  }

  const handleCrear = async () => {
    if (!form.matricula) { showMsg('Matrícula obligatoria', true); return }
    setGuardando(true)
    try {
      const r = await api.crearVehiculo(form)
      if (r.ok) { showMsg('✅ Vehículo registrado'); setMostrarForm(false); setForm(FORM_VACIO); await cargar() }
      else showMsg(r.error||'Error', true)
    } catch(e) { showMsg('Error', true) } finally { setGuardando(false) }
  }

  const handleRepostaje = async () => {
    if (!formRepostaje || !vehSel) return
    setGuardando(true)
    try {
      const r = await api.registrarRepostaje({ vehiculo_id: vehSel.id, matricula: vehSel.matricula, ...formRepostaje })
      if (r.ok) { showMsg(`✅ Repostaje registrado · ${r.importe}€`); setFormRepostaje(null); cargarCombustible(vehSel.id) }
    } catch(e) { showMsg('Error', true) } finally { setGuardando(false) }
  }

  const onEmpChange = (id: string) => {
    const e = empleados.find(x=>x.id===id)
    setForm({...form, empleado_asignado:id, nombre_empleado: e ? (e.nombre+' '+e.apellidos):''})
  }

  const alertasAltas = alertas.filter((a:any)=>a.nivel==='alta').length

  const getBadgeColor = (alerta: string|false|undefined) => {
    if (alerta === 'vencido') return 'bg-red-100 text-red-700'
    if (alerta === 'proximo') return 'bg-amber-100 text-amber-700'
    return 'bg-emerald-100 text-emerald-700'
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e] rounded-xl shadow-lg">
            <Car size={22} className="text-white"/>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Flota de vehículos</h1>
            <p className="text-sm text-slate-500">{vehiculos.length} vehículos{alertasAltas>0 && <span className="text-red-600 font-bold"> · {alertasAltas} alertas críticas</span>}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><RefreshCw size={16}/></button>
          <button onClick={()=>setMostrarForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[#1a3c34] hover:bg-[#2d5a4e] text-white text-sm font-semibold rounded-xl">
            <Plus size={15}/> Añadir vehículo
          </button>
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className={`border-2 rounded-2xl p-4 mb-5 ${alertasAltas>0?'bg-red-50 border-red-200':'bg-amber-50 border-amber-200'}`}>
          <p className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
            <AlertTriangle size={15} className={alertasAltas>0?'text-red-600':'text-amber-600'}/> Alertas de flota
          </p>
          <div className="space-y-1">
            {alertas.map((a:any,i:number)=>(
              <p key={i} className={`text-xs font-semibold ${a.nivel==='alta'?'text-red-700':'text-amber-700'}`}>• {a.msg}</p>
            ))}
          </div>
        </div>
      )}

      {msg && <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-emerald-800 text-sm"><CheckCircle2 size={15}/>{msg}</div>}
      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-red-800 text-sm"><AlertTriangle size={15}/>{error}</div>}

      {/* Form nuevo vehículo */}
      {mostrarForm && (
        <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-slate-800">Nuevo vehículo</p>
            <button onClick={()=>{setMostrarForm(false);setForm(FORM_VACIO)}}><X size={16}/></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Matrícula *</label>
              <input value={form.matricula} onChange={e=>setForm({...form,matricula:e.target.value.toUpperCase()})}
                placeholder="1234 ABC" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Tipo</label>
              <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                {TIPO_VEH.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Marca</label>
              <input value={form.marca} onChange={e=>setForm({...form,marca:e.target.value})}
                placeholder="Ford, Renault..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Modelo</label>
              <input value={form.modelo} onChange={e=>setForm({...form,modelo:e.target.value})}
                placeholder="Transit, Trafic..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Km actuales</label>
              <input type="number" value={form.km_actuales} onChange={e=>setForm({...form,km_actuales:parseInt(e.target.value)||0})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Combustible</label>
              <select value={form.combustible} onChange={e=>setForm({...form,combustible:e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                {COMBUSTIBLE_TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Fecha ITV</label>
              <input type="date" value={form.fecha_itv} onChange={e=>setForm({...form,fecha_itv:e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Fecha seguro</label>
              <input type="date" value={form.fecha_seguro} onChange={e=>setForm({...form,fecha_seguro:e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 block mb-1">Conductor habitual</label>
              <select value={form.empleado_asignado} onChange={e=>onEmpChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Sin asignar —</option>
                {empleados.filter(e=>e.estado==='activo').map(e=><option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleCrear} disabled={guardando}
            className="w-full py-2.5 bg-[#1a3c34] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
            {guardando?<Loader2 size={14} className="animate-spin"/>:<Save size={14}/>} Registrar vehículo
          </button>
        </div>
      )}

      {/* Modal repostaje */}
      {formRepostaje && vehSel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setFormRepostaje(null)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 z-10">
            <h3 className="text-base font-bold mb-1">Registrar repostaje</h3>
            <p className="text-xs text-slate-500 mb-4">{vehSel.matricula} — {vehSel.marca} {vehSel.modelo}</p>
            <div className="space-y-3 mb-4">
              {[
                {label:'Litros', key:'litros', type:'number', step:'0.1'},
                {label:'Precio/litro (€)', key:'precio_litro', type:'number', step:'0.001'},
                {label:'Km actuales', key:'km', type:'number', step:'1'},
                {label:'Fecha', key:'fecha', type:'date'},
              ].map(f=>(
                <div key={f.key}>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">{f.label}</label>
                  <input type={f.type} step={f.step} value={formRepostaje[f.key]||''}
                    onChange={e=>setFormRepostaje({...formRepostaje,[f.key]:e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setFormRepostaje(null)} className="flex-1 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl">Cancelar</button>
              <button onClick={handleRepostaje} disabled={guardando}
                className="flex-1 py-2.5 bg-[#1a3c34] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
                {guardando?<Loader2 size={14} className="animate-spin"/>:<Fuel size={14}/>} Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista vehículos */}
      {cargando ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-[#1a3c34]"/></div>
      ) : vehiculos.length === 0 ? (
        <div className="flex flex-col items-center py-16 bg-white border border-slate-200 rounded-2xl">
          <Car size={36} className="text-slate-300 mb-3"/>
          <p className="text-slate-500">Sin vehículos registrados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vehiculos.map((v:any) => (
            <div key={v.id} className={`bg-white border-2 rounded-2xl p-5 ${(v.alerta_itv==='vencido'||v.alerta_seguro==='vencido')?'border-red-300':(v.alerta_itv==='proximo'||v.alerta_seguro==='proximo')?'border-amber-300':'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-slate-900 font-mono text-base tracking-wide">{v.matricula}</span>
                    <span className="text-sm text-slate-600">{v.marca} {v.modelo}</span>
                    <span className="text-xs text-slate-400">{v.anio}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="capitalize">{v.tipo}</span>
                    <span>{v.combustible}</span>
                    <span className="flex items-center gap-1">🛣️ {v.km?.toLocaleString('es-ES')} km</span>
                    {v.nombre_empleado && <span className="flex items-center gap-1"><User size={11}/>{v.nombre_empleado}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getBadgeColor(v.alerta_itv)}`}>
                    ITV: {v.fecha_itv||'—'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getBadgeColor(v.alerta_seguro)}`}>
                    Seguro: {v.fecha_seguro||'—'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => setEditandoVeh({...v})}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl">
                  ✏️ Editar
                </button>
                <button onClick={() => handleEliminar(v.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 rounded-xl">
                  🗑️ Borrar
                </button>
                <button onClick={()=>{ setVehSel(v); setFormRepostaje({litros:'',precio_litro:'1.70',km:v.km,fecha:new Date().toISOString().split('T')[0]}); cargarCombustible(v.id) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold rounded-xl">
                  <Fuel size={12}/> Repostar
                </button>
                {combustible && vehSel?.id === v.id && (
                  <span className="text-xs text-slate-500 flex items-center gap-1 ml-2">
                    Total combustible: {combustible.total_importe?.toFixed(2)}€
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Modal editar vehículo */}
      {editandoVeh && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditandoVeh(null)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full z-10 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-slate-900">✏️ Editar vehículo</p>
              <button onClick={() => setEditandoVeh(null)}><X size={16}/></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                ['Matrícula', 'matricula', 'text'],
                ['Marca', 'marca', 'text'],
                ['Modelo', 'modelo', 'text'],
                ['Año', 'anio', 'number'],
                ['Color', 'color', 'text'],
                ['KM actuales', 'km', 'number'],
              ].map(([label, field, type]) => (
                <div key={field as string}>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">{label as string}</label>
                  <input type={type as string} value={(editandoVeh as any)[field as string] || ''}
                    onChange={e => setEditandoVeh({...editandoVeh, [field as string]: type === 'number' ? parseFloat(e.target.value)||0 : e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
                </div>
              ))}
              {[
                ['Fecha ITV', 'fecha_itv'],
                ['Fecha seguro', 'fecha_seguro'],
              ].map(([label, field]) => (
                <div key={field as string}>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">{label as string}</label>
                  <input type="date" value={(editandoVeh as any)[field as string] || ''}
                    onChange={e => setEditandoVeh({...editandoVeh, [field as string]: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-600 block mb-1">Notas</label>
                <input value={editandoVeh.notas || ''}
                  onChange={e => setEditandoVeh({...editandoVeh, notas: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditandoVeh(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={handleEditar} disabled={guardando}
                className="flex-1 py-2.5 bg-[#1a3c34] text-white rounded-xl text-sm font-bold disabled:opacity-50">
                {guardando ? '...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
