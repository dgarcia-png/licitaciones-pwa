// src/pages/FichajesPage.tsx — ACTUALIZADO 1/04/2026
// FIX: historial usa tipo_dia ('trabajado'|'festivo'|'fin_de_semana'|'falta'|'futuro')
//      para no contar festivos ni fines de semana como faltas

import { useState, useEffect, useRef } from 'react'
import { api } from '../services/api'
import { usePermisos } from '../hooks/usePermisos'
import {
  Clock, LogIn, LogOut, Users, Calendar, ChevronLeft, ChevronRight,
  AlertTriangle, Loader2, MapPin, CheckCircle2, TrendingUp,
  Activity, RefreshCw, X, FileText, ShieldCheck, Edit2, Save, Euro
} from 'lucide-react'

function fmtDate(d: any) {
  if (!d) return ''
  try { const date = new Date(d); if (isNaN(date.getTime())) return String(d); return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return String(d) }
}
function minToHM(min: number) {
  if (!min || min <= 0) return '—'
  return Math.floor(min / 60) + 'h ' + String(Math.floor(min % 60)).padStart(2, '0') + 'm'
}
const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// ─── Helper visual por tipo de día ───────────────────────────────────────────
function tipoDiaClasses(tipoDia: string, completo: boolean, entrada: string) {
  if (tipoDia === 'trabajado') {
    if (completo) return 'border-slate-200 bg-white'
    if (entrada)  return 'border-amber-300 bg-amber-50/30'
    return 'border-slate-200 bg-white'
  }
  if (tipoDia === 'festivo')      return 'border-blue-100 bg-blue-50/40'
  if (tipoDia === 'fin_de_semana') return 'border-slate-100 bg-slate-50/60 opacity-60'
  if (tipoDia === 'falta')        return 'border-red-200 bg-red-50/40'
  if (tipoDia === 'futuro')       return 'border-slate-100 bg-slate-50/30 opacity-40'
  return 'border-slate-200 bg-white'
}

function tipoDiaBadge(d: any) {
  if (d.tipo_dia === 'festivo')       return <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full font-semibold ml-1">🎉 {d.motivo || 'Festivo'}</span>
  if (d.tipo_dia === 'fin_de_semana') return <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-full font-semibold ml-1">{d.motivo}</span>
  if (d.tipo_dia === 'falta')         return <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full font-bold ml-1">Falta</span>
  if (d.tipo_dia === 'futuro')        return null
  return null
}

function circuloDia(d: any) {
  const dia = new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short' }).substring(0, 2).toUpperCase()
  if (d.tipo_dia === 'trabajado' && d.completo)  return <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-emerald-100 text-emerald-700">{dia}</div>
  if (d.tipo_dia === 'trabajado' && d.entrada)   return <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-amber-100 text-amber-700">{dia}</div>
  if (d.tipo_dia === 'festivo')                   return <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-blue-100 text-blue-500">{dia}</div>
  if (d.tipo_dia === 'fin_de_semana')             return <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-slate-100 text-slate-400">{dia}</div>
  if (d.tipo_dia === 'falta')                     return <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-red-100 text-red-500">{dia}</div>
  return <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-slate-100 text-slate-400">{dia}</div>
}

export default function FichajesPage() {
  const permisos = usePermisos()
  const { usuario, esAdmin, esSupervisor, soloSusDatos, centrosAsignados } = permisos

  const [tab, setTab] = useState('fichar')
  const [cargando, setCargando] = useState(true)
  const [empleados, setEmpleados] = useState<any[]>([])
  const [empSel, setEmpSel] = useState('')
  const [empInfo, setEmpInfo] = useState<any>(null)
  const [estado, setEstado] = useState<any>(null)
  const [fichando, setFichando] = useState(false)
  const [msg, setMsg] = useState('')
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsError, setGpsError] = useState('')
  const [horaActual, setHoraActual] = useState(new Date().toLocaleTimeString('es-ES'))
  const [resumen, setResumen] = useState<any>(null)
  const [resumenMensual, setResumenMensual] = useState<any>(null)
  const [generandoInforme, setGenerandoInforme] = useState<string|null>(null)
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [recargando, setRecargando] = useState(false)
  const [fichajesProvisionales, setFichajesProvisionales] = useState<any[]>([])
  const [horasExtraList, setHorasExtraList] = useState<any[]>([])
  const [editFichaje, setEditFichaje] = useState<any>(null)
  const [horaCorregida, setHoraCorregida] = useState('')
  const [guardandoVal, setGuardandoVal] = useState(false)

  const cargadoRef = useRef(false)

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 5000) }

  useEffect(() => {
    const t = setInterval(() => setHoraActual(new Date().toLocaleTimeString('es-ES')), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (cargadoRef.current) return
    cargadoRef.current = true
    cargarEmpleados()
  }, [])

  const cargarEmpleados = async () => {
    setCargando(true)
    try {
      const data = await api.empleados()
      let emps: any[] = (data.empleados || []).filter((e: any) => e.estado === 'activo')
      if (esSupervisor && !esAdmin && centrosAsignados.length > 0) {
        emps = emps.filter((e: any) => centrosAsignados.includes(e.centro) || centrosAsignados.includes(e.zona))
      }
      setEmpleados(emps)
      if (soloSusDatos || (!esAdmin && !esSupervisor)) {
        const miEmp = emps.find((e: any) => e.email === usuario?.email)
        if (miEmp) { setEmpSel(miEmp.id); setEmpInfo(miEmp); cargarEstado(miEmp.id) }
      }
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  const cargarEstado = async (id: string) => {
    Object.keys(localStorage).filter(k => k.startsWith('fc_') && k.includes('estado_fichaje')).forEach(k => localStorage.removeItem(k))
    try { const data = await api.estadoFichaje(id); setEstado(data) } catch { }
  }

  const cargarResumen = async (id: string, m: number, a: number) => {
    if (!id) return
    setCargando(true)
    Object.keys(localStorage).filter(k => k.startsWith('fc_') && k.includes('resumen_diario')).forEach(k => localStorage.removeItem(k))
    try { const data = await api.resumenDiarioFichajes(id, String(m), String(a)); setResumen(data) } catch { }
    finally { setCargando(false) }
  }

  const cargarResumenMensual = async (m: number, a: number) => {
    setCargando(true)
    try {
      const batch = await api.batchSupervisionFichajes(m, a)
      setResumenMensual(batch.resumen_mensual || {})
      setFichajesProvisionales(batch.fichajes_provisionales?.fichajes || [])
      setHorasExtraList(batch.horas_extra?.horas_extra || [])
    } catch(e) { console.error(e) }
    finally { setCargando(false) }
  }

  const handleValidarFichaje = async (fichaje: any, horaCorr?: string) => {
    setGuardandoVal(true)
    try {
      const r = await api.validarFichaje({ id: fichaje.id, hora_corregida: horaCorr || '', validado_por: 'Supervisor' })
      if (r.ok) { setFichajesProvisionales(prev => prev.filter((f: any) => f.id !== fichaje.id)); setEditFichaje(null); showMsg('✅ Fichaje validado') }
    } catch(e) {} finally { setGuardandoVal(false) }
  }

  const handleAprobarHorasExtra = async (he: any, compensacion: string) => {
    setGuardandoVal(true)
    try {
      const r = await api.aprobarHorasExtra({ id: he.id, estado: 'aprobada', compensacion, aprobado_por: 'Supervisor' })
      if (r.ok) { setHorasExtraList(prev => prev.filter((h: any) => h.id !== he.id)); showMsg('✅ Horas extra aprobadas') }
    } catch(e) {} finally { setGuardandoVal(false) }
  }

  useEffect(() => { if (empSel && tab === 'historial') cargarResumen(empSel, mes, anio) }, [empSel, tab, mes, anio])
  useEffect(() => { if (tab === 'supervision') cargarResumenMensual(mes, anio) }, [tab, mes, anio])

  const selEmpleado = (id: string) => {
    setEmpSel(id)
    const emp = empleados.find((e: any) => e.id === id)
    setEmpInfo(emp || null)
    if (id) cargarEstado(id)
    else setEstado(null)
  }

  const obtenerGPS = (): Promise<{ lat: number; lng: number }> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject('GPS no disponible'); return }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => reject('GPS: ' + err.message),
        { enableHighAccuracy: true, timeout: 8000 }
      )
    })

  const handleFichar = async (tipo: string) => {
    if (!empSel || !empInfo) { showMsg('❌ Selecciona una persona'); return }
    setFichando(true); setGpsError('')
    let posicion: any = {}
    try { const pos = await obtenerGPS(); posicion = { lat: pos.lat, lng: pos.lng }; setGps(pos) }
    catch (e: any) { setGpsError(String(e)) }
    try {
      const result = await api.fichar({
        id_empleado: empSel, nombre: empInfo.nombre + ' ' + empInfo.apellidos,
        dni: empInfo.dni || '', centro: empInfo.centro || '',
        tipo, ...posicion, dispositivo: 'PWA', metodo: posicion.lat ? 'GPS' : 'Manual'
      })
      if (result?.ok) {
        showMsg('✅ ' + (tipo === 'entrada' ? '🟢 Entrada' : '🔴 Salida') + ' registrada a las ' + result.hora)
        setEstado((prev: any) => ({
          ...prev, fichado: tipo === 'entrada', ultimo_tipo: tipo,
          fichajes_hoy: [...(prev?.fichajes_hoy || []), { tipo, hora: result.hora, lat: posicion.lat, lng: posicion.lng }]
        }))
      } else showMsg('❌ ' + (result?.error || 'Error'))
    } catch { showMsg('❌ Error de conexión') }
    finally { setFichando(false) }
  }

  const minutosHoy = (() => {
    if (!estado?.fichado || !estado?.fichajes_hoy) return null
    const entrada = estado.fichajes_hoy.filter((f: any) => f.tipo === 'entrada').pop()
    if (!entrada?.hora) return null
    const [h, m, s] = entrada.hora.split(':').map(Number)
    const dt = new Date(); dt.setHours(h, m, s, 0)
    return Math.floor((Date.now() - dt.getTime()) / 60000)
  })()

  const tabs = [
    { id: 'fichar',      label: 'Fichar',          icon: Clock },
    { id: 'historial',   label: soloSusDatos ? 'Mi historial' : 'Historial', icon: Calendar },
    ...((esAdmin || esSupervisor) ? [{ id: 'supervision', label: 'Resumen mes', icon: Users }] : []),
    ...(esAdmin ? [{ id: 'panel', label: 'Panel hoy', icon: Activity }] : []),
  ]

  if (cargando && empleados.length === 0) return (
    <div className="flex flex-col items-center py-20">
      <Loader2 size={32} className="text-blue-500 animate-spin mb-3" />
      <p className="text-slate-500">Cargando fichajes...</p>
    </div>
  )

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-blue-700 to-cyan-600 rounded-xl shadow-lg shadow-blue-200">
          <Clock size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Control de Fichajes</h1>
          <p className="text-sm text-slate-500">RD-ley 8/2019 · Registro horario obligatorio</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 py-2.5 px-4 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${tab === t.id ? 'bg-white shadow text-[#1a3c34]' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {msg && (
        <div className={`mb-4 p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${msg.includes('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          <span className="flex-1">{msg}</span>
          <button onClick={() => setMsg('')}><X size={14} /></button>
        </div>
      )}

      {/* ══ FICHAR ══════════════════════════════════════════════════════════ */}
      {tab === 'fichar' && (
        <div>
          {(esAdmin || esSupervisor) && (
            <div className="mb-5">
              <label className="text-xs text-slate-600 font-semibold mb-1 block">Personal</label>
              <select value={empSel} onChange={(e: any) => selEmpleado(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Seleccionar persona —</option>
                {empleados.map((e: any) => (
                  <option key={e.id} value={e.id}>{e.nombre} {e.apellidos} · {e.dni} · {e.centro || 'Sin centro'}</option>
                ))}
              </select>
            </div>
          )}

          {soloSusDatos && empInfo && (
            <div className="mb-5 bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                {(empInfo.nombre || '?')[0]}{(empInfo.apellidos || '?')[0]}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{empInfo.nombre} {empInfo.apellidos}</p>
                <p className="text-xs text-slate-500">{empInfo.centro || 'Sin centro'}</p>
              </div>
            </div>
          )}

          {empSel ? (
            <div>
              {minutosHoy !== null && minutosHoy > 9 * 60 && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
                  <span className="text-sm text-amber-800 font-medium">
                    ⚠️ Llevas más de 9 horas en servicio ({minToHM(minutosHoy)}). Registra la salida.
                  </span>
                </div>
              )}

              {/* Aviso festivo */}
              {estado?.es_laborable_hoy === false && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2">
                  <span className="text-sm text-blue-700 font-medium">🎉 Hoy es {estado.motivo_no_laborable} — día no laborable</span>
                </div>
              )}

              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 mb-5 text-center text-white">
                <p className="text-6xl font-black tracking-wider mb-2 font-mono">{horaActual}</p>
                <p className="text-sm text-slate-400 mb-4">
                  {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                {estado && (
                  <div className="flex items-center justify-center gap-4 flex-wrap">
                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${estado.fichado ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700 text-slate-400'}`}>
                      {estado.fichado ? '🟢 En servicio' : '⚪ Fuera de servicio'}
                    </span>
                    {minutosHoy !== null && minutosHoy > 0 && (
                      <span className="px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-full text-sm border border-blue-500/30">
                        <Clock size={12} className="inline mr-1" />{minToHM(minutosHoy)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <button onClick={() => handleFichar('entrada')}
                  disabled={fichando || estado?.fichado === true}
                  className={`flex flex-col items-center gap-3 p-8 rounded-2xl text-lg font-bold transition-all ${
                    estado?.fichado ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 active:scale-95'
                  }`}>
                  {fichando ? <Loader2 size={32} className="animate-spin" /> : <LogIn size={32} />}
                  ENTRADA
                </button>
                <button onClick={() => handleFichar('salida')}
                  disabled={fichando || !estado?.fichado}
                  className={`flex flex-col items-center gap-3 p-8 rounded-2xl text-lg font-bold transition-all ${
                    !estado?.fichado ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200 active:scale-95'
                  }`}>
                  {fichando ? <Loader2 size={32} className="animate-spin" /> : <LogOut size={32} />}
                  SALIDA
                </button>
              </div>

              {gpsError && <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-center gap-2"><AlertTriangle size={14} />{gpsError} — sin ubicación</div>}
              {gps && <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 flex items-center gap-2"><MapPin size={14} />GPS: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</div>}

              {estado?.fichajes_hoy?.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Registro de hoy</h3>
                  <div className="space-y-2">
                    {estado.fichajes_hoy.map((f: any, i: number) => (
                      <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${f.tipo === 'entrada' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        {f.tipo === 'entrada' ? <LogIn size={16} className="text-emerald-600" /> : <LogOut size={16} className="text-red-600" />}
                        <span className="text-sm font-bold font-mono">{f.hora}</span>
                        <span className={`text-xs font-semibold ${f.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'}`}>{f.tipo.toUpperCase()}</span>
                        {f.lat && <span className="text-[10px] text-slate-400 ml-auto flex items-center gap-1"><MapPin size={10} />GPS</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (esAdmin || esSupervisor) && (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
              <Users size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Selecciona un empleado para fichar</p>
            </div>
          )}
        </div>
      )}

      {/* ══ HISTORIAL ══════════════════════════════════════════════════════ */}
      {tab === 'historial' && (
        <div>
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            {(esAdmin || esSupervisor) ? (
              <select value={empSel} onChange={(e: any) => selEmpleado(e.target.value)}
                className="flex-1 min-w-[200px] px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Seleccionar persona —</option>
                {empleados.map((e: any) => <option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>)}
              </select>
            ) : empInfo && (
              <div className="flex-1 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-3">
                {empInfo.nombre} {empInfo.apellidos}
              </div>
            )}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
              <button onClick={() => { if (mes === 1) { setMes(12); setAnio(anio - 1) } else setMes(mes - 1) }} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft size={16} /></button>
              <span className="text-sm font-semibold px-3 whitespace-nowrap">{MESES[mes]} {anio}</span>
              <button onClick={() => { if (mes === 12) { setMes(1); setAnio(anio + 1) } else setMes(mes + 1) }} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight size={16} /></button>
            </div>
          </div>

          {!empSel ? <div className="text-center py-12 text-slate-400">Selecciona una persona</div>
            : cargando ? <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-slate-400 mx-auto" /></div>
            : !resumen ? <div className="text-center py-12 text-slate-400">Sin datos para {MESES[mes]} {anio}</div>
            : (
              <div>
                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Días trabajados</p>
                    <p className="text-2xl font-black text-emerald-700">{resumen.dias_trabajados}</p>
                    <p className="text-[10px] text-slate-400">de {resumen.dias_laborables_esperados || '?'} laborables</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Horas totales</p>
                    <p className="text-2xl font-black">{resumen.total_horas_texto}</p>
                  </div>
                  <div className={`border rounded-xl p-4 text-center ${(resumen.dias_falta || 0) > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Faltas</p>
                    <p className={`text-2xl font-black ${(resumen.dias_falta || 0) > 0 ? 'text-red-600' : 'text-emerald-700'}`}>{resumen.dias_falta || 0}</p>
                    {(resumen.dias_festivo || 0) > 0 && <p className="text-[10px] text-blue-500">{resumen.dias_festivo} festivos</p>}
                  </div>
                  <div className={`border rounded-xl p-4 text-center ${empInfo?.jornada && (resumen.total_minutos > (empInfo.jornada / 5) * 60 * resumen.dias_trabajados) ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Vs jornada</p>
                    {empInfo?.jornada ? (() => {
                      const cont = Math.round((empInfo.jornada / 5) * 60 * resumen.dias_trabajados)
                      const diff = resumen.total_minutos - cont
                      return <p className={`text-2xl font-black ${diff > 0 ? 'text-amber-700' : diff < -30 ? 'text-red-600' : 'text-emerald-600'}`}>{diff > 0 ? '+' : ''}{minToHM(Math.abs(diff))}</p>
                    })() : <p className="text-2xl font-black text-slate-400">—</p>}
                  </div>
                </div>

                {/* Alertas sin salida */}
                {(resumen.dias || []).filter((d: any) => d.tipo_dia === 'trabajado' && !d.completo && d.entrada).length > 0 && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs font-bold text-amber-800 flex items-center gap-2">
                      <AlertTriangle size={13} />
                      {(resumen.dias || []).filter((d: any) => d.tipo_dia === 'trabajado' && !d.completo && d.entrada).length} fichaje(s) sin salida registrada
                    </p>
                  </div>
                )}

                {/* Leyenda */}
                <div className="flex items-center gap-3 mb-3 flex-wrap text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span> Completo</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> Sin salida</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"></span> Falta</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-300 inline-block"></span> Festivo</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-200 inline-block"></span> Fin de semana</span>
                </div>

                {/* Días */}
                <div className="space-y-1.5">
                  {(resumen.dias || []).map((d: any) => (
                    <div key={d.fecha}
                      className={`border rounded-xl p-3 flex items-center justify-between transition-opacity ${tipoDiaClasses(d.tipo_dia, d.completo, d.entrada)}`}>
                      <div className="flex items-center gap-3">
                        {circuloDia(d)}
                        <div>
                          <div className="flex items-center gap-1 flex-wrap">
                            <p className="text-sm font-bold text-slate-900">{fmtDate(d.fecha)}</p>
                            {tipoDiaBadge(d)}
                            {d.tipo_dia === 'trabajado' && !d.completo && d.entrada &&
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-full font-semibold">⚠️ Sin salida</span>
                            }
                            {d.provisional &&
                              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full">prov.</span>
                            }
                          </div>
                          {d.tipo_dia === 'trabajado' && (
                            <p className="text-xs text-slate-500 font-mono">
                              {d.entrada || '—'} → {d.salida || '—'}
                              {d.minutos_extra > 0 && <span className="text-purple-600 ml-2 font-sans not-italic text-[10px]">+{d.horas_extra_texto}</span>}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className={`text-sm font-bold font-mono shrink-0 ${
                        d.tipo_dia === 'falta' ? 'text-red-500' :
                        d.tipo_dia === 'festivo' ? 'text-blue-400' :
                        d.tipo_dia === 'fin_de_semana' ? 'text-slate-300' :
                        d.minutos >= 456 ? 'text-emerald-700' : d.minutos > 0 ? 'text-amber-700' : 'text-slate-400'
                      }`}>
                        {d.horas_texto || (d.tipo_dia === 'falta' ? 'Falta' : d.tipo_dia === 'futuro' ? '' : '—')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
        </div>
      )}

      {/* ══ SUPERVISIÓN ════════════════════════════════════════════════════ */}
      {tab === 'supervision' && (esAdmin || esSupervisor) && (
        <div className="space-y-5">

          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck size={16} className="text-amber-500" />
                Fichajes provisionales — pendientes de validación
                {fichajesProvisionales.length > 0 && (
                  <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{fichajesProvisionales.length}</span>
                )}
              </p>
            </div>
            {fichajesProvisionales.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">✅ Sin fichajes provisionales pendientes</p>
            ) : (
              <div className="space-y-2">
                {fichajesProvisionales.map((f: any) => (
                  <div key={f.id} className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold text-slate-900">{f.nombre}</p>
                          <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold">
                            {f.tipo === 'entrada' ? '🟢 Entrada' : '🔴 Salida'} provisional
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{f.fecha} · {f.hora} · {f.centro || '—'}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{f.notas}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {editFichaje?.id === f.id ? (
                          <div className="flex items-center gap-2">
                            <input type="time" value={horaCorregida} onChange={e => setHoraCorregida(e.target.value)}
                              className="px-2 py-1 border border-slate-200 rounded-lg text-xs w-24" />
                            <button onClick={() => handleValidarFichaje(f, horaCorregida)} disabled={guardandoVal}
                              className="px-2 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center gap-1">
                              {guardandoVal ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} OK
                            </button>
                            <button onClick={() => setEditFichaje(null)} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-lg">✕</button>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => { setEditFichaje(f); setHoraCorregida(f.hora.substring(0,5)) }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg" title="Editar hora">
                              <Edit2 size={13} className="text-slate-500" />
                            </button>
                            <button onClick={() => handleValidarFichaje(f)} disabled={guardandoVal}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1">
                              {guardandoVal ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Validar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Euro size={16} className="text-purple-500" />
                Horas extra — pendientes de aprobación
                {horasExtraList.length > 0 && (
                  <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">{horasExtraList.length}</span>
                )}
              </p>
            </div>
            {horasExtraList.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">✅ Sin horas extra pendientes</p>
            ) : (
              <div className="space-y-2">
                {horasExtraList.map((he: any) => (
                  <div key={he.id} className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">{he.nombre}</p>
                        <p className="text-xs text-slate-500">
                          {he.fecha} · <span className="font-bold text-purple-700">+{he.horas_extra?.toFixed(2)}h extra</span>
                          {he.tipo === 'fuerza_mayor' && <span className="ml-2 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">En festivo</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleAprobarHorasExtra(he, 'pago')} disabled={guardandoVal}
                          className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg">💶 Pagar</button>
                        <button onClick={() => handleAprobarHorasExtra(he, 'descanso')} disabled={guardandoVal}
                          className="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg">😴 Descanso</button>
                        <button onClick={() => api.aprobarHorasExtra({ id: he.id, estado: 'rechazada', aprobado_por: 'Supervisor' }).then(() => setHorasExtraList(prev => prev.filter((h: any) => h.id !== he.id)))}
                          className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-bold text-slate-900">Resumen mensual — {MESES[mes]} {anio}</p>
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
                <button onClick={() => { if (mes === 1) { setMes(12); setAnio(anio - 1) } else setMes(mes - 1) }} className="p-1.5 hover:bg-slate-100 rounded-lg"><ChevronLeft size={14} /></button>
                <span className="text-xs font-semibold px-2">{MESES[mes]} {anio}</span>
                <button onClick={() => { if (mes === 12) { setMes(1); setAnio(anio + 1) } else setMes(mes + 1) }} className="p-1.5 hover:bg-slate-100 rounded-lg"><ChevronRight size={14} /></button>
              </div>
            </div>
            {cargando ? <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-slate-400 mx-auto" /></div>
              : !resumenMensual?.resumen?.length ? <div className="text-center py-8 text-slate-400 text-sm">Sin fichajes en {MESES[mes]} {anio}</div>
              : (
                <div className="space-y-2">
                  {resumenMensual.resumen.map((r: any) => (
                    <div key={r.id} className={`border rounded-xl p-3 flex items-center justify-between ${r.pendiente_validacion ? 'bg-amber-50 border-amber-200' : r.dias_falta > 0 ? 'bg-red-50/40 border-red-100' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1a3c34]/10 flex items-center justify-center text-[#1a3c34] font-bold text-sm">
                          {(r.nombre || '?')[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{r.nombre}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                            <span>{r.dias_trabajados}/{r.dias_laborables_esperados || '?'} días</span>
                            {r.dias_falta > 0 && <span className="text-red-600 font-semibold">{r.dias_falta} faltas</span>}
                            {r.total_extra_horas > 0 && <span className="text-purple-600 font-semibold">+{r.total_extra_horas}h extra</span>}
                            {r.pendiente_validacion && <span className="text-amber-600 font-semibold">⚠️ {r.dias_provisionales} prov.</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-bold font-mono text-[#1a3c34]">{r.total_horas}</p>
                        <button onClick={async () => {
                          setGenerandoInforme(r.id)
                          try {
                            const res = await api.generarInformeFichajes(r.id, String(mes), String(anio))
                            if (res.ok) window.open(res.url, '_blank')
                          } catch(e) {}
                          finally { setGenerandoInforme(null) }
                        }} disabled={generandoInforme === r.id}
                          className="flex items-center gap-1 px-2 py-1.5 bg-[#1a3c34] hover:bg-[#2d5a4e] disabled:bg-slate-300 text-white text-xs font-bold rounded-lg">
                          {generandoInforme === r.id ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                          Informe
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>
      )}

      {/* ══ PANEL HOY (solo admin) ══════════════════════════════════════════ */}
      {tab === 'panel' && esAdmin && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Estado hoy</h2>
              <p className="text-xs text-slate-500">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
            <button onClick={() => cargarResumenMensual(new Date().getMonth() + 1, new Date().getFullYear())} disabled={cargando}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl">
              {cargando ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Actualizar
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <Users size={20} className="text-blue-600 mx-auto mb-1" />
              <p className="text-2xl font-black text-blue-900">{empleados.length}</p>
              <p className="text-xs text-blue-700">Plantilla activa</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <CheckCircle2 size={20} className="text-emerald-600 mx-auto mb-1" />
              <p className="text-2xl font-black text-emerald-900">{resumenMensual?.resumen?.filter((r: any) => r.dias_trabajados > 0).length || 0}</p>
              <p className="text-xs text-emerald-700">Han fichado este mes</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <AlertTriangle size={20} className="text-amber-600 mx-auto mb-1" />
              <p className="text-2xl font-black text-amber-900">{empleados.length - (resumenMensual?.resumen?.filter((r: any) => r.dias_trabajados > 0).length || 0)}</p>
              <p className="text-xs text-amber-700">Sin fichajes este mes</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Actividad este mes por empleado</h3>
            <div className="space-y-2">
              {empleados.map((emp: any) => {
                const actividad = resumenMensual?.resumen?.find((r: any) => r.id === emp.id)
                return (
                  <div key={emp.id} className={`flex items-center gap-3 p-3 rounded-xl ${actividad?.dias_trabajados > 0 ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${actividad?.dias_trabajados > 0 ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                      {(emp.nombre || '?')[0]}{(emp.apellidos || '')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{emp.nombre} {emp.apellidos}</p>
                      <p className="text-xs text-slate-500">{emp.centro || 'Sin centro'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {actividad?.dias_trabajados > 0
                        ? <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">{actividad.dias_trabajados}d · {actividad.total_horas}</span>
                        : <span className="text-xs text-slate-400 bg-slate-200 px-2 py-1 rounded-full">Sin actividad</span>
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
