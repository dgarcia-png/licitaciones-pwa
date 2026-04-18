import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { Star, Plus, RefreshCw, Loader2, CheckCircle2, AlertTriangle,
  X, Save, BarChart3, ClipboardCheck, ThumbsUp, Wrench } from 'lucide-react'

export default function CalidadPage() {
  const [tab, setTab] = useState<'inspecciones'|'nps'|'acciones'>('inspecciones')
  const [centros, setCentros] = useState<any[]>([])
  const [empleados, setEmpleados] = useState<any[]>([])
  const [centroSel, setCentroSel] = useState('')
  const [inspecciones, setInspecciones] = useState<any[]>([])
  const [npsData, setNpsData] = useState<any>(null)
  const [acciones, setAcciones] = useState<any[]>([])
  const [dashboard, setDashboard] = useState<any>(null)
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [mostrarFormInsp, setMostrarFormInsp] = useState(false)
  const [mostrarFormNPS, setMostrarFormNPS] = useState(false)
  const [formInsp, setFormInsp] = useState<any>({ puntuacion_limpieza:4, puntuacion_orden:4, puntuacion_seguridad:4, puntuacion_personal:4, observaciones:'' })
  const [formNPS, setFormNPS] = useState<any>({ puntuacion:8, comentario:'', respondido_por:'', canal:'directo' })
  const [formAccion, setFormAccion] = useState<any>(null)

  const showMsg = (m: string, err=false) => {
    if(err) setError(m); else setMsg(m)
    setTimeout(()=>{ setMsg(''); setError('') },3000)
  }

  useEffect(() => {
    const cargar = async () => {
      const [c, emp, dash] = await Promise.all([
        api.centros(), api.empleados(), api.dashboardCalidad()
      ])
      setCentros(c.centros||[])
      setEmpleados(emp.empleados||[])
      setDashboard(dash)
    }
    cargar()
  }, [])

  const cargarDatosCentro = async (id: string) => {
    if (!id) return
    setCargando(true)
    try {
      const [ins, nps, acc] = await Promise.all([
        api.inspecciones({ centro_id: id }),
        api.npsCentro(id),
        api.accionesCorrectivas(id)
      ])
      setInspecciones(ins.inspecciones||[])
      setNpsData(nps)
      setAcciones(acc.acciones||[])
    } catch(e) {} finally { setCargando(false) }
  }

  const onCentroChange = (id: string) => { setCentroSel(id); cargarDatosCentro(id) }

  const handleCrearInspeccion = async () => {
    if (!centroSel) { showMsg('Selecciona un centro', true); return }
    setGuardando(true)
    try {
      const centro = centros.find(c=>c.id===centroSel)
      const r = await api.crearInspeccion({
        centro_id: centroSel, centro_nombre: centro?.nombre||'',
        fecha: new Date().toISOString().split('T')[0],
        tipo: 'rutina', ...formInsp
      })
      if (r.ok) {
        showMsg(`✅ Inspección registrada · Puntuación: ${r.puntuacion_total}/5`)
        setMostrarFormInsp(false)
        cargarDatosCentro(centroSel)
      } else showMsg(r.error||'Error', true)
    } catch(e) { showMsg('Error', true) } finally { setGuardando(false) }
  }

  const handleRegistrarNPS = async () => {
    if (!centroSel) { showMsg('Selecciona un centro', true); return }
    setGuardando(true)
    try {
      const centro = centros.find(c=>c.id===centroSel)
      const r = await api.registrarNPS({
        centro_id: centroSel, centro_nombre: centro?.nombre||'', ...formNPS
      })
      if (r.ok) { showMsg('✅ NPS registrado'); setMostrarFormNPS(false); cargarDatosCentro(centroSel) }
    } catch(e) { showMsg('Error', true) } finally { setGuardando(false) }
  }

  const handleCrearAccion = async () => {
    if (!formAccion?.descripcion_problema) { showMsg('Describe el problema', true); return }
    setGuardando(true)
    try {
      const r = await api.crearAccionCorrectiva({ centro_id: centroSel, ...formAccion })
      if (r.ok) { showMsg('✅ Acción creada'); setFormAccion(null); cargarDatosCentro(centroSel) }
    } catch(e) { showMsg('Error', true) } finally { setGuardando(false) }
  }

  const handleCerrarAccion = async (id: string, resultado: string) => {
    try {
      const r = await api.cerrarAccionCorrectiva({ id, resultado })
      if (r.ok) { showMsg('Acción cerrada'); cargarDatosCentro(centroSel) }
    } catch(e) {}
  }

  const StarRating = ({ valor, onChange }: { valor: number, onChange: (v: number) => void }) => (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={() => onChange(n)}
          className={`text-2xl transition-colors ${n <= valor ? 'text-amber-400' : 'text-slate-200'}`}>★</button>
      ))}
      <span className="text-sm font-black text-slate-700 ml-2">{valor}/5</span>
    </div>
  )

  const puntuacionColor = (p: number) => p >= 4 ? 'text-emerald-600' : p >= 3 ? 'text-amber-600' : 'text-red-600'
  const npsColor = (n: number) => n >= 50 ? 'text-emerald-600' : n >= 0 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e] rounded-xl shadow-lg">
            <Star size={22} className="text-white"/>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Control de calidad</h1>
            <p className="text-sm text-slate-500">Inspecciones, NPS y acciones correctivas</p>
          </div>
        </div>
      </div>

      {/* KPIs globales */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label:'Media calidad', valor: (dashboard.nps_media??0).toFixed(1)+'/5', color: puntuacionColor(dashboard.nps_media||0) },
            { label:'Inspecciones mes', valor: dashboard.inspecciones_mes||0, color:'text-slate-700' },
            { label:'Alertas calidad', valor: dashboard.acciones_abiertas||0, color: (dashboard.acciones_abiertas||0)>0?'text-red-600':'text-emerald-600' },
            { label:'Acciones abiertas', valor: dashboard.acciones_abiertas||0, color: (dashboard.acciones_abiertas||0)>0?'text-amber-600':'text-emerald-600' },
          ].map((k,i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
              <p className={`text-2xl font-black ${k.color}`}>{k.valor}</p>
              <p className="text-xs text-slate-500 uppercase mt-1">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {msg && <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-emerald-800 text-sm"><CheckCircle2 size={15}/>{msg}</div>}
      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-red-800 text-sm"><AlertTriangle size={15}/>{error}</div>}

      {/* Selector centro + tabs */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <select value={centroSel} onChange={e=>onCentroChange(e.target.value)}
          className="flex-1 min-w-48 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none">
          <option value="">— Seleccionar centro —</option>
          {centros.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { id:'inspecciones', label:'Inspecciones', icon: ClipboardCheck },
          { id:'nps', label:'NPS Cliente', icon: ThumbsUp },
          { id:'acciones', label:'Acciones correctivas', icon: Wrench }
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab===t.id?'bg-[#1a3c34] text-white':'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            <t.icon size={14}/>{t.label}
          </button>
        ))}
      </div>

      {/* ══ INSPECCIONES ══ */}
      {tab === 'inspecciones' && (
        <div>
          {centroSel && (
            <button onClick={()=>setMostrarFormInsp(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1a3c34] hover:bg-[#2d5a4e] text-white text-sm font-semibold rounded-xl mb-4">
              <Plus size={14}/> Nueva inspección
            </button>
          )}

          {mostrarFormInsp && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-amber-800">Nueva inspección de calidad</p>
                <button onClick={()=>setMostrarFormInsp(false)}><X size={16}/></button>
              </div>
              <div className="space-y-4">
                {[
                  { key:'puntuacion_limpieza', label:'🧹 Limpieza' },
                  { key:'puntuacion_orden', label:'📦 Orden' },
                  { key:'puntuacion_seguridad', label:'🛡️ Seguridad' },
                  { key:'puntuacion_personal', label:'👷 Personal' },
                ].map(f=>(
                  <div key={f.key}>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">{f.label}</label>
                    <StarRating valor={formInsp[f.key]} onChange={v=>setFormInsp({...formInsp,[f.key]:v})}/>
                  </div>
                ))}
                <div className="p-3 bg-white rounded-xl border border-amber-200 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-700">Puntuación media</span>
                  <span className={`text-xl font-black ${puntuacionColor((formInsp.puntuacion_limpieza+formInsp.puntuacion_orden+formInsp.puntuacion_seguridad+formInsp.puntuacion_personal)/4)}`}>
                    {((formInsp.puntuacion_limpieza+formInsp.puntuacion_orden+formInsp.puntuacion_seguridad+formInsp.puntuacion_personal)/4).toFixed(1)}/5
                  </span>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Observaciones</label>
                  <textarea value={formInsp.observaciones} onChange={e=>setFormInsp({...formInsp,observaciones:e.target.value})}
                    rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none"/>
                </div>
                <button onClick={handleCrearInspeccion} disabled={guardando}
                  className="w-full py-2.5 bg-[#1a3c34] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
                  {guardando?<Loader2 size={14} className="animate-spin"/>:<Save size={14}/>} Guardar inspección
                </button>
              </div>
            </div>
          )}

          {!centroSel ? (
            <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl">
              <Star size={32} className="text-slate-300 mx-auto mb-2"/>
              <p className="text-slate-400">Selecciona un centro</p>
            </div>
          ) : cargando ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[#1a3c34]"/></div>
          ) : inspecciones.length === 0 ? (
            <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl">
              <ClipboardCheck size={32} className="text-slate-300 mx-auto mb-2"/>
              <p className="text-slate-400 text-sm">Sin inspecciones registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inspecciones.map((ins:any) => (
                <div key={ins.id} className={`bg-white border-2 rounded-2xl p-4 ${ins.puntuacion_total<3?'border-red-200':ins.puntuacion_total<4?'border-amber-200':'border-emerald-200'}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-2xl font-black ${puntuacionColor(ins.puntuacion_total)}`}>{ins.puntuacion_total?.toFixed(1)}</span>
                        <span className="text-sm text-slate-500">/5</span>
                        <span className="text-xs text-slate-400 ml-1">{ins.fecha} · {ins.nombre_inspector||'Inspector'}</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {[
                          {l:'Limpieza',v:ins.puntuacion_limpieza},
                          {l:'Orden',v:ins.puntuacion_orden},
                          {l:'Seguridad',v:ins.puntuacion_seguridad},
                          {l:'Personal',v:ins.puntuacion_personal}
                        ].map(p=>(
                          <span key={p.l} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.v>=4?'bg-emerald-100 text-emerald-700':p.v>=3?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700'}`}>
                            {p.l}: {p.v}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {ins.observaciones && <p className="text-xs text-slate-600 mt-1">{ins.observaciones}</p>}
                  {ins.puntuacion_total < 3 && (
                    <div className="mt-2 p-2 bg-red-50 rounded-xl">
                      <p className="text-xs text-red-700 font-semibold">⚠️ Puntuación baja — se generó acción correctiva automáticamente</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ NPS ══ */}
      {tab === 'nps' && (
        <div>
          {centroSel && (
            <button onClick={()=>setMostrarFormNPS(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1a3c34] text-white text-sm font-semibold rounded-xl mb-4">
              <Plus size={14}/> Registrar valoración
            </button>
          )}

          {mostrarFormNPS && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-blue-800">Valoración del cliente (NPS)</p>
                <button onClick={()=>setMostrarFormNPS(false)}><X size={16}/></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-2">Puntuación (0-10)</label>
                  <div className="flex gap-1 flex-wrap">
                    {[...Array(11)].map((_,n)=>(
                      <button key={n} onClick={()=>setFormNPS({...formNPS,puntuacion:n})}
                        className={`w-9 h-9 rounded-xl text-sm font-black transition-colors ${
                          formNPS.puntuacion===n ? (n>=9?'bg-emerald-500 text-white':n>=7?'bg-amber-500 text-white':'bg-red-500 text-white')
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}>{n}</button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {formNPS.puntuacion>=9?'😊 Promotor':formNPS.puntuacion>=7?'😐 Neutro':'😞 Detractor'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Comentario</label>
                  <textarea value={formNPS.comentario} onChange={e=>setFormNPS({...formNPS,comentario:e.target.value})}
                    rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Respondido por</label>
                  <input value={formNPS.respondido_por} onChange={e=>setFormNPS({...formNPS,respondido_por:e.target.value})}
                    placeholder="Nombre del encuestador"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
                </div>
                <button onClick={handleRegistrarNPS} disabled={guardando}
                  className="w-full py-2.5 bg-[#1a3c34] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
                  {guardando?<Loader2 size={14} className="animate-spin"/>:<Save size={14}/>} Guardar valoración
                </button>
              </div>
            </div>
          )}

          {npsData && centroSel && (
            <div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label:'NPS Score', valor: (npsData.nps_score||0)+'', color: npsColor(npsData.nps_score||0) },
                  { label:'Promotores', valor: npsData.promotores||0, color:'text-emerald-600' },
                  { label:'Detractores', valor: npsData.detractores||0, color:'text-red-600' },
                ].map((k,i)=>(
                  <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
                    <p className={`text-2xl font-black ${k.color}`}>{k.valor}</p>
                    <p className="text-xs text-slate-500 uppercase mt-1">{k.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {(npsData.respuestas||[]).map((r:any)=>(
                  <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                    <span className={`text-xl font-black w-8 text-center ${r.puntuacion>=9?'text-emerald-600':r.puntuacion>=7?'text-amber-600':'text-red-600'}`}>{r.puntuacion}</span>
                    <div className="flex-1 min-w-0">
                      {r.comentario && <p className="text-xs text-slate-700">{r.comentario}</p>}
                      <p className="text-[10px] text-slate-400">{r.fecha}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ ACCIONES CORRECTIVAS ══ */}
      {tab === 'acciones' && (
        <div>
          <div className="flex justify-between mb-4">
            <p className="text-sm text-slate-500">{acciones.filter(a=>a.estado==='abierta').length} acciones abiertas</p>
            {centroSel && (
              <button onClick={()=>setFormAccion({descripcion_problema:'',accion_propuesta:'',responsable:'',fecha_limite:''})}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a3c34] text-white text-xs font-bold rounded-xl">
                <Plus size={13}/> Nueva acción
              </button>
            )}
          </div>

          {formAccion && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-red-800">Nueva acción correctiva</p>
                <button onClick={()=>setFormAccion(null)}><X size={16}/></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Problema detectado *</label>
                  <textarea value={formAccion.descripcion_problema} onChange={e=>setFormAccion({...formAccion,descripcion_problema:e.target.value})}
                    rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Acción propuesta</label>
                  <textarea value={formAccion.accion_propuesta} onChange={e=>setFormAccion({...formAccion,accion_propuesta:e.target.value})}
                    rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none"/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Responsable</label>
                    <input value={formAccion.responsable} onChange={e=>setFormAccion({...formAccion,responsable:e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Fecha límite</label>
                    <input type="date" value={formAccion.fecha_limite} onChange={e=>setFormAccion({...formAccion,fecha_limite:e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
                  </div>
                </div>
                <button onClick={handleCrearAccion} disabled={guardando}
                  className="w-full py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
                  {guardando?<Loader2 size={14} className="animate-spin"/>:<Save size={14}/>} Crear acción
                </button>
              </div>
            </div>
          )}

          {acciones.length === 0 ? (
            <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl">
              <Wrench size={32} className="text-slate-300 mx-auto mb-2"/>
              <p className="text-slate-400 text-sm">{centroSel ? 'Sin acciones correctivas' : 'Selecciona un centro'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {acciones.map((acc:any)=>(
                <div key={acc.id} className={`bg-white border-2 rounded-2xl p-4 ${acc.estado==='abierta'?'border-red-200':'border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 mb-1">{acc.descripcion_problema}</p>
                      {acc.accion_propuesta && <p className="text-xs text-slate-600">→ {acc.accion_propuesta}</p>}
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        {acc.responsable && <span>👤 {acc.responsable}</span>}
                        {acc.fecha_limite && <span>📅 Límite: {acc.fecha_limite}</span>}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${acc.estado==='abierta'?'bg-red-100 text-red-700':'bg-emerald-100 text-emerald-700'}`}>
                      {acc.estado}
                    </span>
                  </div>
                  {acc.estado === 'abierta' && (
                    <button onClick={() => {
                      const res = prompt('Describe el resultado de la acción correctiva:')
                      if (res) handleCerrarAccion(acc.id, res)
                    }} className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl">
                      <CheckCircle2 size={12}/> Marcar resuelta
                    </button>
                  )}
                  {acc.resultado && <p className="text-xs text-emerald-700 mt-2 flex items-start gap-1"><CheckCircle2 size={11} className="shrink-0 mt-0.5"/>{acc.resultado}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
