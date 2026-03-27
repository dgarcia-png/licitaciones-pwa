import { useState, useEffect, useRef } from 'react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  Play, Square, CheckCircle2, Circle, Camera, MapPin,
  Package, Wrench, FileText, Loader2, AlertTriangle,
  ChevronRight, ChevronLeft, X, Save, PenTool, Clock,
  CheckSquare, List, Euro, RefreshCw
} from 'lucide-react'

const TIPO_SERVICIO_EMOJI: Record<string, string> = {
  limpieza:'🧹', jardineria:'🌿', mantenimiento:'🔧',
  conserjeria:'🏢', vigilancia:'🛡️', residuos:'♻️'
}

function fmtHora() {
  return new Date().toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' })
}

export default function OperadorCampoPage() {
  const { usuario } = useAuth()
  const [empleado, setEmpleado] = useState<any>(null)
  const [paso, setPaso] = useState<'inicio'|'checklist'|'materiales'|'fotos'|'firma'|'resumen'>('inicio')
  const [centros, setCentros] = useState<any[]>([])
  const [centroSel, setCentroSel] = useState<any>(null)
  const [parteActual, setParteActual] = useState<any>(null)
  const [checklist, setChecklist] = useState<any[]>([])
  const [materiales, setMateriales] = useState<any[]>([])
  const [maquinaria, setMaquinaria] = useState<any[]>([])
  const [catalogoMats, setCatalogoMats] = useState<any[]>([])
  const [catalogoMaqui, setCatalogoMaqui] = useState<any[]>([])
  const [fotos, setFotos] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [gps, setGps] = useState<{lat:number,lng:number}|null>(null)
  const [hora, setHora] = useState(fmtHora())
  const [tabMat, setTabMat] = useState<'materiales'|'maquinaria'>('materiales')
  const [addMat, setAddMat] = useState<any>(null)
  const [addMaq, setAddMaq] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [tipoFoto, setTipoFoto] = useState<'antes'|'despues'>('antes')
  const [firmaNombre, setFirmaNombre] = useState('')
  const [observaciones, setObservaciones] = useState('')

  const showMsg = (m: string, err=false) => {
    if(err) setError(m); else setMsg(m)
    setTimeout(()=>{ setMsg(''); setError('') }, 3000)
  }

  // Reloj
  useEffect(() => {
    const t = setInterval(() => setHora(fmtHora()), 1000)
    return () => clearInterval(t)
  }, [])

  // GPS automático
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {}
      )
    }
  }, [])

  // Carga inicial
  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      try {
        const [emps, cats, catm] = await Promise.all([
          api.empleados(),
          (api as any).catalogoMateriales(),
          (api as any).catalogoMaquinaria()
        ])
        const emps_list = emps.empleados || []
        const emp = emps_list.find((e: any) =>
          e.email === usuario?.email || e.id === (usuario as any)?.id_empleado)
        if (emp) {
          setEmpleado(emp)
          const tareas = await (api as any).tareasDia(emp.id)
          setCentros(tareas.centros || [])
          // Ver si hay parte en curso
          const asis = await (api as any).asistenciaDia(emp.id)
          if (asis.en_curso) {
            setParteActual(asis.en_curso)
            const centro = (tareas.centros||[]).find((c:any) => c.centro_id === asis.en_curso.centro_id)
            if (centro) setCentroSel(centro)
            await cargarDatosParte(asis.en_curso.id)
            setPaso('checklist')
          }
        }
        setCatalogoMats(cats.materiales || [])
        setCatalogoMaqui(catm.maquinaria || [])
      } catch(e) { console.error(e) }
      finally { setCargando(false) }
    }
    cargar()
  }, [])

  const cargarDatosParte = async (parteId: string) => {
    try {
      const [chk, mats, maqui, fot] = await Promise.all([
        (api as any).checklistEjecucion(parteId),
        (api as any).materialesParte(parteId),
        (api as any).maquinariaParte(parteId),
        (api as any).fotosParte(parteId)
      ])
      setChecklist(chk.items || [])
      setMateriales(mats.materiales || [])
      setMaquinaria(maqui.maquinaria || [])
      setFotos(fot.fotos || [])
    } catch(e) {}
  }

  const handleIniciarParte = async (centro: any) => {
    if (!empleado) return
    setProcesando(true)
    try {
      const r = await (api as any).iniciarParte({
        centro_id: centro.centro_id,
        centro_nombre: centro.nombre,
        empleado_id: empleado.id,
        nombre_empleado: (empleado.nombre||'') + ' ' + (empleado.apellidos||''),
        dni: empleado.dni,
        tipo_servicio: centro.tipo_servicio,
        lat: gps?.lat, lng: gps?.lng
      })
      if (r.ok) {
        setParteActual({ id: r.id, hora_inicio: r.hora_inicio, centro_id: centro.centro_id })
        setCentroSel(centro)
        await cargarDatosParte(r.id)
        showMsg('✅ Servicio iniciado: ' + r.hora_inicio + ' · ' + r.checklist_generado + ' tareas')
        setPaso('checklist')
      } else showMsg(r.error || 'Error', true)
    } catch(e) { showMsg('Error de conexión', true) }
    finally { setProcesando(false) }
  }

  const handleToggleTarea = async (item: any) => {
    if (!parteActual) return
    const nuevoVal = !item.completada
    setChecklist(prev => prev.map(i => i.id === item.id ? {...i, completada: nuevoVal} : i))
    try {
      await (api as any).actualizarChecklistExec({ id: item.id, completada: nuevoVal })
    } catch(e) {}
  }

  const handleFinalizarParte = async () => {
    if (!parteActual) return
    setProcesando(true)
    try {
      const r = await (api as any).finalizarParte({
        id: parteActual.id,
        lat_fin: gps?.lat, lng_fin: gps?.lng,
        observaciones
      })
      if (r.ok) {
        setParteActual({...parteActual, ...r})
        showMsg(`✅ Servicio finalizado · ${r.horas}h · Coste: ${r.coste_total?.toFixed(2)}€`)
        setPaso('resumen')
      } else showMsg(r.error||'Error', true)
    } catch(e) { showMsg('Error', true) }
    finally { setProcesando(false) }
  }

  const handleAddMaterial = async () => {
    if (!addMat || !parteActual) return
    setProcesando(true)
    try {
      const r = await (api as any).registrarMaterialParte({
        parte_id: parteActual.id,
        centro_id: centroSel?.centro_id,
        material_id: addMat.id,
        nombre: addMat.nombre,
        unidad: addMat.unidad,
        cantidad: addMat.cantidad || 1,
        coste_unitario: addMat.coste_unitario
      })
      if (r.ok) {
        setMateriales(prev => [...prev, {
          id: r.id, nombre: addMat.nombre, unidad: addMat.unidad,
          cantidad: addMat.cantidad||1, coste_unitario: addMat.coste_unitario,
          coste_total: r.coste_total
        }])
        setAddMat(null)
        showMsg('✅ Material añadido')
      }
    } catch(e) { showMsg('Error', true) }
    finally { setProcesando(false) }
  }

  const handleAddMaquinaria = async () => {
    if (!addMaq || !parteActual) return
    setProcesando(true)
    try {
      const r = await (api as any).registrarMaquinariaParte({
        parte_id: parteActual.id,
        centro_id: centroSel?.centro_id,
        maquinaria_id: addMaq.id,
        nombre: addMaq.nombre,
        horas_uso: addMaq.horas || 1,
        coste_hora: addMaq.coste_hora
      })
      if (r.ok) {
        setMaquinaria(prev => [...prev, {
          id: r.id, nombre: addMaq.nombre,
          horas_uso: addMaq.horas||1, coste_total: r.coste_total
        }])
        setAddMaq(null)
        showMsg('✅ Maquinaria añadida')
      }
    } catch(e) { showMsg('Error', true) }
    finally { setProcesando(false) }
  }

  const handleFoto = async (e: any) => {
    const file = e.target.files?.[0]
    if (!file || !parteActual) return
    setProcesando(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1]
        const r = await (api as any).registrarFotoParte({
          parte_id: parteActual.id,
          centro_id: centroSel?.centro_id,
          tipo: tipoFoto,
          base64, mime: file.type, nombre: file.name,
          lat: gps?.lat, lng: gps?.lng
        })
        if (r.ok) {
          setFotos(prev => [...prev, { id: r.id, tipo: tipoFoto, url: r.url }])
          showMsg('✅ Foto subida')
        }
        setProcesando(false)
      }
      reader.readAsDataURL(file)
    } catch(e) { showMsg('Error', true); setProcesando(false) }
  }

  const completadas = checklist.filter(i => i.completada).length
  const pctChecklist = checklist.length > 0 ? Math.round(completadas/checklist.length*100) : 0
  const totalCosteLocal = materiales.reduce((s,m)=>s+(m.coste_total||0),0) +
                          maquinaria.reduce((s,m)=>s+(m.coste_total||0),0)

  if (cargando) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <Loader2 size={32} className="text-[#1a3c34] animate-spin mb-3" />
      <p className="text-slate-500 text-sm">Cargando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto flex flex-col">

      {/* Mensajes flotantes */}
      {(msg||error) && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-bold ${msg ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {msg||error}
        </div>
      )}

      {/* Cabecera */}
      <div className="bg-[#1a3c34] text-white px-5 pt-8 pb-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs text-white/60">Operador de campo</p>
            <p className="text-base font-bold">{empleado?.nombre} {empleado?.apellidos}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black tabular-nums">{hora}</p>
            {gps && <p className="text-[10px] text-white/50 flex items-center gap-1 justify-end"><MapPin size={10}/>GPS activo</p>}
          </div>
        </div>
        {parteActual && centroSel && (
          <div className="bg-white/10 rounded-xl px-3 py-2 mt-2">
            <p className="text-xs text-white/70">Servicio en curso</p>
            <p className="text-sm font-bold">{centroSel.nombre}</p>
            <p className="text-xs text-white/60">Inicio: {parteActual.hora_inicio}</p>
          </div>
        )}
      </div>

      {/* Barra de pasos cuando hay parte activo */}
      {parteActual && paso !== 'inicio' && paso !== 'resumen' && (
        <div className="bg-white border-b border-slate-200 px-4 py-2">
          <div className="flex gap-1">
            {[
              { id:'checklist', icon: CheckSquare, label:'Tareas' },
              { id:'materiales', icon: Package, label:'Recursos' },
              { id:'fotos', icon: Camera, label:'Fotos' },
              { id:'firma', icon: PenTool, label:'Firma' }
            ].map(s => (
              <button key={s.id} onClick={() => setPaso(s.id as any)}
                className={`flex-1 flex flex-col items-center py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                  paso === s.id ? 'bg-[#1a3c34] text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}>
                <s.icon size={16} />
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-32 p-4">

        {/* ══ INICIO — Lista de centros del día ══ */}
        {paso === 'inicio' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-700">Mis centros hoy</h2>
            {centros.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
                <List size={36} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Sin centros asignados</p>
                <p className="text-xs text-slate-400 mt-1">Contacta con tu supervisor</p>
              </div>
            ) : centros.map((c: any) => (
              <div key={c.centro_id} className="bg-white border border-slate-200 rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{TIPO_SERVICIO_EMOJI[c.tipo_servicio]||'📋'}</span>
                      <p className="text-sm font-bold text-slate-900">{c.nombre}</p>
                    </div>
                    {c.horario && <p className="text-xs text-slate-500 ml-7">⏰ {c.horario}</p>}
                    <p className="text-xs text-slate-400 ml-7">{c.total_tareas} tareas en checklist</p>
                  </div>
                </div>
                <button onClick={() => handleIniciarParte(c)} disabled={procesando || !!parteActual}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-colors ${
                    parteActual ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
                    'bg-[#1a3c34] hover:bg-[#2d5a4e] text-white'
                  }`}>
                  {procesando ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  {parteActual ? 'Hay un servicio en curso' : 'Iniciar servicio'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ══ CHECKLIST ══ */}
        {paso === 'checklist' && (
          <div>
            {/* Progreso */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">Progreso</span>
                <span className="text-xs font-black text-[#1a3c34]">{completadas}/{checklist.length} tareas</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${
                  pctChecklist >= 80 ? 'bg-emerald-500' : pctChecklist >= 50 ? 'bg-amber-500' : 'bg-red-400'
                }`} style={{ width: pctChecklist + '%' }} />
              </div>
              <p className="text-right text-xs font-black text-slate-700 mt-1">{pctChecklist}%</p>
            </div>

            {checklist.length === 0 ? (
              <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl">
                <CheckSquare size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Sin tareas configuradas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {checklist.map((item: any) => (
                  <button key={item.id} onClick={() => handleToggleTarea(item)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                      item.completada
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}>
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      item.completada ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                    }`}>
                      {item.completada && <CheckCircle2 size={16} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${item.completada ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {item.tarea}
                      </p>
                      {item.hora && <p className="text-[10px] text-emerald-600 font-bold mt-0.5">✓ {item.hora}</p>}
                    </div>
                    {item.tipo_evidencia === 'foto' && (
                      <Camera size={14} className="text-slate-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Observaciones */}
            <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-4">
              <label className="text-xs font-bold text-slate-600 block mb-2">Observaciones</label>
              <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)}
                rows={3} placeholder="Anota cualquier observación del servicio..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none" />
            </div>
          </div>
        )}

        {/* ══ MATERIALES Y MAQUINARIA ══ */}
        {paso === 'materiales' && (
          <div>
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              {[
                { id:'materiales', label:'Materiales', count: materiales.length },
                { id:'maquinaria', label:'Maquinaria', count: maquinaria.length }
              ].map(t => (
                <button key={t.id} onClick={() => setTabMat(t.id as any)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold ${
                    tabMat===t.id ? 'bg-[#1a3c34] text-white' : 'bg-white border border-slate-200 text-slate-600'
                  }`}>
                  {t.label} {t.count > 0 && <span className="ml-1 text-xs opacity-70">({t.count})</span>}
                </button>
              ))}
            </div>

            {tabMat === 'materiales' && (
              <div>
                {/* Lista materiales usados */}
                {materiales.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{m.nombre}</p>
                      <p className="text-xs text-slate-500">{m.cantidad} {m.unidad}</p>
                    </div>
                    <span className="text-sm font-black text-[#1a3c34]">{m.coste_total?.toFixed(2)}€</span>
                  </div>
                ))}

                {/* Añadir material */}
                {addMat ? (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mt-3">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-amber-800">{addMat.nombre}</p>
                      <button onClick={() => setAddMat(null)}><X size={16} /></button>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <label className="text-xs font-semibold text-slate-600">Cantidad ({addMat.unidad}):</label>
                      <input type="number" step="0.1" min="0.1"
                        value={addMat.cantidad||1}
                        onChange={e => setAddMat({...addMat, cantidad: parseFloat(e.target.value)||1})}
                        className="w-24 px-3 py-2 border border-slate-200 rounded-xl text-sm text-center font-bold" />
                      <span className="text-sm font-black text-[#1a3c34] ml-auto">
                        {((addMat.cantidad||1) * addMat.coste_unitario).toFixed(2)}€
                      </span>
                    </div>
                    <button onClick={handleAddMaterial} disabled={procesando}
                      className="w-full py-2.5 bg-[#1a3c34] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
                      {procesando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Añadir
                    </button>
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Añadir material</p>
                    <div className="grid grid-cols-2 gap-2">
                      {catalogoMats.map((m: any) => (
                        <button key={m.id} onClick={() => setAddMat({...m, cantidad:1})}
                          className="bg-white border border-slate-200 rounded-xl p-3 text-left hover:border-[#1a3c34] transition-colors">
                          <p className="text-xs font-semibold text-slate-800 truncate">{m.nombre}</p>
                          <p className="text-[10px] text-slate-500">{m.coste_unitario}€/{m.unidad}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tabMat === 'maquinaria' && (
              <div>
                {maquinaria.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{m.nombre}</p>
                      <p className="text-xs text-slate-500">{m.horas_uso}h uso</p>
                    </div>
                    <span className="text-sm font-black text-[#1a3c34]">{m.coste_total?.toFixed(2)}€</span>
                  </div>
                ))}

                {addMaq ? (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mt-3">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-blue-800">{addMaq.nombre}</p>
                      <button onClick={() => setAddMaq(null)}><X size={16} /></button>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <label className="text-xs font-semibold text-slate-600">Horas de uso:</label>
                      <input type="number" step="0.5" min="0.5"
                        value={addMaq.horas||1}
                        onChange={e => setAddMaq({...addMaq, horas: parseFloat(e.target.value)||1})}
                        className="w-24 px-3 py-2 border border-slate-200 rounded-xl text-sm text-center font-bold" />
                      <span className="text-sm font-black text-[#1a3c34] ml-auto">
                        {((addMaq.horas||1) * addMaq.coste_hora).toFixed(2)}€
                      </span>
                    </div>
                    <button onClick={handleAddMaquinaria} disabled={procesando}
                      className="w-full py-2.5 bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
                      {procesando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Añadir
                    </button>
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Añadir maquinaria</p>
                    <div className="grid grid-cols-2 gap-2">
                      {catalogoMaqui.map((m: any) => (
                        <button key={m.id} onClick={() => setAddMaq({...m, horas:1})}
                          className="bg-white border border-slate-200 rounded-xl p-3 text-left hover:border-blue-400 transition-colors">
                          <p className="text-xs font-semibold text-slate-800 truncate">{m.nombre}</p>
                          <p className="text-[10px] text-slate-500">{m.coste_hora}€/h</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Coste parcial */}
            {totalCosteLocal > 0 && (
              <div className="mt-4 bg-[#1a3c34] text-white rounded-2xl p-4 flex items-center justify-between">
                <span className="text-sm font-bold">Coste recursos</span>
                <span className="text-xl font-black">{totalCosteLocal.toFixed(2)}€</span>
              </div>
            )}
          </div>
        )}

        {/* ══ FOTOS ══ */}
        {paso === 'fotos' && (
          <div>
            {/* Tipo foto */}
            <div className="flex gap-2 mb-4">
              {[{id:'antes', label:'📷 Antes'}, {id:'despues', label:'✅ Después'}].map(t => (
                <button key={t.id} onClick={() => setTipoFoto(t.id as any)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${
                    tipoFoto===t.id ? 'bg-[#1a3c34] text-white' : 'bg-white border border-slate-200 text-slate-600'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Grid fotos */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {fotos.map((f: any) => (
                <div key={f.id} className={`relative rounded-2xl overflow-hidden border-2 ${
                  f.tipo==='antes' ? 'border-amber-300' : 'border-emerald-300'
                }`}>
                  <a href={f.url} target="_blank" rel="noopener noreferrer">
                    <div className="aspect-square bg-slate-200 flex items-center justify-center">
                      <Camera size={32} className="text-slate-400" />
                    </div>
                  </a>
                  <div className={`absolute bottom-0 left-0 right-0 text-center text-[10px] font-bold py-1 ${
                    f.tipo==='antes' ? 'bg-amber-400 text-amber-900' : 'bg-emerald-500 text-white'
                  }`}>
                    {f.tipo.toUpperCase()}
                  </div>
                </div>
              ))}

              {/* Botón añadir foto */}
              <button onClick={() => fileRef.current?.click()}
                disabled={procesando}
                className="aspect-square border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center hover:border-[#1a3c34] hover:bg-[#1a3c34]/5 transition-colors">
                {procesando ? <Loader2 size={24} className="animate-spin text-[#1a3c34]" /> : <Camera size={24} className="text-slate-400" />}
                <span className="text-xs text-slate-400 mt-1">{tipoFoto}</span>
              </button>
            </div>

            <input ref={fileRef} type="file" accept="image/*" capture="environment"
              className="hidden" onChange={handleFoto} />

            <p className="text-center text-xs text-slate-400">
              {fotos.filter(f=>f.tipo==='antes').length} antes · {fotos.filter(f=>f.tipo==='despues').length} después
            </p>
          </div>
        )}

        {/* ══ FIRMA ══ */}
        {paso === 'firma' && (
          <div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">
              <p className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <PenTool size={15} className="text-[#1a3c34]" /> Firma del cliente
              </p>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2">Nombre del firmante</label>
                <input value={firmaNombre} onChange={e => setFirmaNombre(e.target.value)}
                  placeholder="Nombre y apellidos del cliente"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none" />
              </div>
              <div className="mt-4 border-2 border-dashed border-slate-300 rounded-xl h-32 flex items-center justify-center bg-slate-50">
                <div className="text-center">
                  <PenTool size={28} className="text-slate-300 mx-auto mb-1" />
                  <p className="text-xs text-slate-400">Área de firma digital</p>
                  <p className="text-[10px] text-slate-300">Próximamente: firma táctil</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800">
              <strong>Sin firma:</strong> El parte quedará como "completado sin firma del cliente". Podrás añadir la firma más tarde.
            </div>
          </div>
        )}

        {/* ══ RESUMEN FINAL ══ */}
        {paso === 'resumen' && parteActual && (
          <div>
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5 mb-4 text-center">
              <CheckCircle2 size={40} className="text-emerald-600 mx-auto mb-2" />
              <h2 className="text-xl font-black text-emerald-800">¡Servicio completado!</h2>
              <p className="text-sm text-emerald-600 mt-1">{centroSel?.nombre}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label:'Horas trabajadas', valor: (parteActual.horas||0) + 'h' },
                { label:'Tareas completadas', valor: pctChecklist + '%' },
                { label:'Materiales', valor: (parteActual.coste_materiales||0).toFixed(2) + '€' },
                { label:'Maquinaria', valor: (parteActual.coste_maquinaria||0).toFixed(2) + '€' },
                { label:'Coste personal', valor: (parteActual.coste_personal||0).toFixed(2) + '€' },
                { label:'COSTE TOTAL', valor: (parteActual.coste_total||0).toFixed(2) + '€' },
              ].map((k, i) => (
                <div key={i} className={`rounded-xl p-3 text-center border ${i===5 ? 'border-[#1a3c34] bg-[#1a3c34] text-white col-span-2' : 'border-slate-200 bg-white'}`}>
                  <p className={`text-lg font-black ${i===5 ? 'text-white' : 'text-slate-900'}`}>{k.valor}</p>
                  <p className={`text-[10px] uppercase ${i===5 ? 'text-white/70' : 'text-slate-500'}`}>{k.label}</p>
                </div>
              ))}
            </div>

            <button onClick={() => { setParteActual(null); setPaso('inicio'); setCentroSel(null); setChecklist([]); setMateriales([]); setMaquinaria([]); setFotos([]) }}
              className="w-full py-3 bg-[#1a3c34] hover:bg-[#2d5a4e] text-white text-sm font-bold rounded-2xl">
              Volver al inicio
            </button>
          </div>
        )}
      </div>

      {/* Botón flotante finalizar */}
      {parteActual && paso !== 'resumen' && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-white border-t border-slate-200">
          <button onClick={handleFinalizarParte} disabled={procesando}
            className="w-full flex items-center justify-center gap-3 py-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white text-base font-black rounded-2xl shadow-lg">
            {procesando ? <Loader2 size={20} className="animate-spin" /> : <Square size={20} />}
            Finalizar servicio
          </button>
        </div>
      )}
    </div>
  )
}