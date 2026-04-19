import { SkeletonPage } from '../components/Skeleton'
// src/pages/FichajesPage.tsx — ACTUALIZADO 6/04/2026
// [6/04] Bloque 6: Supervisión mejorada completa
//   - Panel "Estado hoy" integrado en Supervisión
//   - Resumen mensual con filas expandibles (detalle diario por empleado)
//   - Exportar Excel (SheetJS)
//   - Campos normalizados Cloud Run
//   - Eliminado tab "Panel hoy" (fusionado en Supervisión)

import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../services/api'
import { usePermisos } from '../hooks/usePermisos'
import {
  Clock, LogIn, LogOut, Users, Calendar, ChevronLeft, ChevronRight,
  AlertTriangle, Loader2, MapPin, CheckCircle2, TrendingUp,
  Activity, RefreshCw, X, FileText, ShieldCheck, Edit2, Save, Euro,
  Check, Square, CheckSquare, Filter, Download, ChevronDown, ChevronUp,
  UserCheck, XCircle, Wifi
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

// ─── Helpers visuales ────────────────────────────────────────────────────────
function tipoDiaClasses(tipoDia: string, completo: boolean, entrada: string) {
  if (tipoDia === 'trabajado') {
    if (completo) return 'border-slate-200 bg-white'
    if (entrada)  return 'border-amber-300 bg-amber-50/30'
    return 'border-slate-200 bg-white'
  }
  if (tipoDia === 'festivo')       return 'border-blue-100 bg-blue-50/40'
  if (tipoDia === 'fin_de_semana') return 'border-slate-100 bg-slate-50/60 opacity-60'
  if (tipoDia === 'falta')         return 'border-red-200 bg-red-50/40'
  if (tipoDia === 'futuro')        return 'border-slate-100 bg-slate-50/30 opacity-40'
  return 'border-slate-200 bg-white'
}

function tipoDiaBadge(d: any) {
  if (d.tipo_dia === 'festivo')       return <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full font-semibold ml-1">🎉 {d.motivo || 'Festivo'}</span>
  if (d.tipo_dia === 'fin_de_semana') return <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-full font-semibold ml-1">{d.motivo}</span>
  if (d.tipo_dia === 'falta')         return <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full font-bold ml-1">Falta</span>
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

// Helper: guardar workbook exceljs en browser
async function xlsxSave(wb: ExcelJS.Workbook, filename: string) {
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename
  a.click(); URL.revokeObjectURL(url)
}

// ─── Excel export helper ─────────────────────────────────────────────────────
async function exportarExcel(resumenMensual: any, mesLabel: string) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()

  // Hoja 1: Resumen por empleado
  const datosResumen = (resumenMensual.resumen || []).map((r: any) => ({
    'Empleado': r.nombre,
    'Centro': r.centro || '',
    'Categoría': r.categoria || '',
    'Días laborables': r.dias_laborables || r.dias_laborables_esperados || '',
    'Días trabajados': r.dias_trabajados,
    'Días ausencia': r.dias_ausencia || 0,
    'Días falta': r.dias_falta || 0,
    'Horas totales': r.horas_totales,
    'Horas extra': r.horas_extra || r.total_extra_horas || 0,
    'Pend. validar': r.pendientes_validar || 0,
  }))
  const ws1 = wb.addWorksheet('Resumen')
  ws1.addRows(datosResumen)

  // Hoja 2: Detalle fichajes
  const allFichajes: any[] = []
  for (const emp of (resumenMensual.resumen || [])) {
    for (const f of (emp.fichajes || [])) {
      allFichajes.push({
        'Empleado': emp.nombre,
        'Fecha': f.fecha,
        'Entrada': f.hora_entrada || '',
        'Salida': f.hora_salida || '',
        'Horas': f.horas_trabajadas || 0,
        'H. Extra': f.horas_extra || 0,
        'Centro': f.centro_nombre || f.centro || emp.centro || '',
        'Validado': f.validado ? 'Sí' : 'No',
      })
    }
  }
  allFichajes.sort((a, b) => (a.Fecha || '').localeCompare(b.Fecha || ''))
  const ws2 = wb.addWorksheet('Fichajes')
  ws2.addRows(allFichajes)

  await xlsxSave(wb, `Fichajes_${mesLabel.replace(' ', '_')}.xlsx`)
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
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [fichajesProvisionales, setFichajesProvisionales] = useState<any[]>([])
  const [horasExtraList, setHorasExtraList] = useState<any[]>([])
  const [editFichaje, setEditFichaje] = useState<any>(null)
  const [horaCorregida, setHoraCorregida] = useState('')
  const [guardandoVal, setGuardandoVal] = useState(false)

  // [6/04] Estado hoy
  const [estadoHoy, setEstadoHoy] = useState<any>(null)

  // [4/04] Validación masiva
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [filtroCentro, setFiltroCentro] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'validado'>('todos')
  const [filtroEmpleado, setFiltroEmpleado] = useState('')
  const [vistaDetalle, setVistaDetalle] = useState(false)
  const [validandoMasivo, setValidandoMasivo] = useState(false)

  // [6/04] Expandir empleado en resumen
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [subTab, setSubTab] = useState<'resumen' | 'pendientes' | 'detalle'>('resumen')

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

  const cargarResumenMensual = useCallback(async (m: number, a: number) => {
    setCargando(true)
    try {
      const [batchRes, heRes, estadoRes] = await Promise.allSettled([
        api.resumenMensualFichajes(String(m), String(a)),
        api.horasExtra({ estado: 'pendiente' }),
        (api as any).estadoHoy ? (api as any).estadoHoy() : Promise.resolve(null)
      ])
      if (batchRes.status === 'fulfilled') {
        const batch = batchRes.value
        setResumenMensual(batch)
        const provisionales = (batch.resumen || []).flatMap((e: any) =>
          (e.fichajes || []).filter((f: any) => !f.validado).map((f: any) => ({
            ...f,
            nombre: f.nombre || f.nombre_empleado || e.nombre,
            centro: f.centro || f.centro_nombre || e.centro,
          }))
        )
        setFichajesProvisionales(provisionales)
      }
      if (heRes.status === 'fulfilled') {
        setHorasExtraList(heRes.value.horas_extra || [])
      }
      if (estadoRes.status === 'fulfilled' && estadoRes.value) {
        setEstadoHoy(estadoRes.value)
      }
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }, [])

  const handleValidarFichaje = async (fichaje: any, horaCorr?: string) => {
    setGuardandoVal(true)
    try {
      const r = await api.validarFichaje({ id: fichaje.id, hora_corregida: horaCorr || '', validado_por: 'Supervisor' })
      if (r.ok) { setFichajesProvisionales(prev => prev.filter((f: any) => f.id !== fichaje.id)); setEditFichaje(null); showMsg('✅ Fichaje validado') }
    } catch (e) { } finally { setGuardandoVal(false) }
  }

  const handleAprobarHorasExtra = async (he: any, compensacion: string) => {
    setGuardandoVal(true)
    try {
      const r = await api.aprobarHorasExtra({ id: he.id, estado: 'aprobada', compensacion, aprobado_por: 'Supervisor' })
      if (r.ok) { setHorasExtraList(prev => prev.filter((h: any) => h.id !== he.id)); showMsg('✅ Horas extra aprobadas') }
    } catch (e) { } finally { setGuardandoVal(false) }
  }

  const handleRechazarHorasExtra = async (he: any) => {
    setGuardandoVal(true)
    try {
      const r = await api.aprobarHorasExtra({ id: he.id, estado: 'rechazada', aprobado_por: 'Supervisor' })
      if (r.ok) { setHorasExtraList(prev => prev.filter((h: any) => h.id !== he.id)); showMsg('✅ Horas extra rechazadas') }
    } catch (e) { } finally { setGuardandoVal(false) }
  }

  // Validación masiva
  const handleValidarMasivo = async () => {
    if (seleccionados.size === 0) return
    setValidandoMasivo(true)
    try {
      const r = await api.validarMasivoFichajes({ ids: Array.from(seleccionados) })
      if (r.ok) {
        showMsg(`✅ ${r.validados || seleccionados.size} fichajes validados`)
        setSeleccionados(new Set())
        cargarResumenMensual(mes, anio)
      } else { showMsg('❌ ' + (r.error || 'Error al validar')) }
    } catch { showMsg('❌ Error de conexión') }
    finally { setValidandoMasivo(false) }
  }

  const toggleSeleccion = (id: string) => {
    setSeleccionados(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }

  const toggleExpandido = (id: string) => {
    setExpandidos(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }

  // Fichajes del mes para detalle
  const fichajesDelMes: any[] = []
  const centrosUnicos = new Set<string>()
  if (resumenMensual?.resumen) {
    for (const emp of resumenMensual.resumen) {
      if (emp.fichajes) {
        for (const f of emp.fichajes) {
          fichajesDelMes.push({ ...f, nombre_display: f.nombre || emp.nombre, centro_display: f.centro || f.centro_nombre || emp.centro || '' })
          if (emp.centro) centrosUnicos.add(emp.centro)
          if (f.centro_nombre) centrosUnicos.add(f.centro_nombre)
        }
      }
    }
  }

  const fichajesFiltrados = fichajesDelMes.filter(f => {
    if (filtroCentro && (f.centro_display || '') !== filtroCentro) return false
    if (filtroEstado === 'pendiente' && f.validado) return false
    if (filtroEstado === 'validado' && !f.validado) return false
    if (filtroEmpleado && f.empleado_id !== filtroEmpleado) return false
    return true
  }).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))

  const fichPendientes = fichajesFiltrados.filter(f => !f.validado)
  const seleccionarTodosPendientes = () => setSeleccionados(new Set(fichPendientes.map(f => f.id)))
  const deseleccionarTodos = () => setSeleccionados(new Set())

  useEffect(() => { if (empSel && tab === 'historial') cargarResumen(empSel, mes, anio) }, [empSel, tab, mes, anio])
  useEffect(() => { if (tab === 'supervision') cargarResumenMensual(mes, anio) }, [tab, mes, anio, cargarResumenMensual])

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
    const dt = new Date(); dt.setHours(h, m, s || 0, 0)
    return Math.floor((Date.now() - dt.getTime()) / 60000)
  })()

  // ─── Tabs ──────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'fichar', label: 'Fichar', icon: Clock },
    { id: 'historial', label: soloSusDatos ? 'Mi historial' : 'Historial', icon: Calendar },
    ...((esAdmin || esSupervisor) ? [{ id: 'supervision', label: 'Supervisión', icon: Users }] : []),
  ]

  if (cargando && empleados.length === 0) return <div className="p-6 lg:p-8"><SkeletonPage /></div>

  return (
    <div className="max-w-5xl">
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

          {empSel && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
              <p className="text-5xl font-black text-slate-900 tracking-wide font-mono mb-1">{horaActual}</p>
              <p className="text-sm text-slate-400 mb-6">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>

              {estado?.fichado ? (
                <div>
                  {minutosHoy !== null && (
                    <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3 inline-flex items-center gap-2">
                      <TrendingUp size={16} className="text-blue-600" />
                      <span className="text-sm font-bold text-blue-800">{minToHM(minutosHoy)} trabajando</span>
                    </div>
                  )}
                  <div className="mb-3">
                    <div className="flex items-center justify-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3">
                      <LogIn size={16} />
                      <span className="text-sm font-bold">Entrada: {estado.fichajes_hoy?.filter((f: any) => f.tipo === 'entrada').pop()?.hora || '—'}</span>
                    </div>
                  </div>
                  <button onClick={() => handleFichar('salida')} disabled={fichando}
                    className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-50 text-white text-lg font-black rounded-2xl shadow-lg shadow-red-200 flex items-center justify-center gap-3">
                    {fichando ? <Loader2 size={22} className="animate-spin" /> : <LogOut size={22} />}
                    Registrar salida
                  </button>
                </div>
              ) : (
                <button onClick={() => handleFichar('entrada')} disabled={fichando}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 text-white text-lg font-black rounded-2xl shadow-lg shadow-emerald-200 flex items-center justify-center gap-3">
                  {fichando ? <Loader2 size={22} className="animate-spin" /> : <LogIn size={22} />}
                  Registrar entrada
                </button>
              )}

              {gps && (
                <div className="mt-3 flex items-center justify-center gap-1 text-[11px] text-slate-400">
                  <MapPin size={11} /> GPS: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
                </div>
              )}
              {gpsError && (
                <p className="mt-2 text-[11px] text-amber-500 flex items-center justify-center gap-1">
                  <AlertTriangle size={11} /> {gpsError}
                </p>
              )}

              {estado?.fichajes_hoy && estado.fichajes_hoy.length > 0 && (
                <div className="mt-5 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Fichajes de hoy</p>
                  <div className="space-y-1">
                    {estado.fichajes_hoy.map((f: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {f.tipo === 'entrada' ? <LogIn size={13} className="text-emerald-600" /> : <LogOut size={13} className="text-red-500" />}
                        <span className="font-mono font-bold text-slate-800">{f.hora}</span>
                        <span className="text-xs text-slate-400">{f.tipo === 'entrada' ? 'Entrada' : 'Salida'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ HISTORIAL ════════════════════════════════════════════════════════ */}
      {tab === 'historial' && (
        <div>
          {(esAdmin || esSupervisor) && (
            <div className="mb-4">
              <label className="text-xs text-slate-600 font-semibold mb-1 block">Empleado</label>
              <select value={empSel} onChange={(e: any) => selEmpleado(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Seleccionar persona —</option>
                {empleados.map((e: any) => (
                  <option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>
                ))}
              </select>
            </div>
          )}

          {empSel && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
                <button onClick={() => { if (mes === 1) { setMes(12); setAnio(anio - 1) } else setMes(mes - 1) }} className="p-1.5 hover:bg-slate-100 rounded-lg"><ChevronLeft size={14} /></button>
                <span className="text-xs font-semibold px-2">{MESES[mes]} {anio}</span>
                <button onClick={() => { if (mes === 12) { setMes(1); setAnio(anio + 1) } else setMes(mes + 1) }} className="p-1.5 hover:bg-slate-100 rounded-lg"><ChevronRight size={14} /></button>
              </div>
              <button onClick={() => cargarResumen(empSel, mes, anio)} disabled={cargando}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-xl">
                {cargando ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Actualizar
              </button>
            </div>
          )}

          {empSel && resumen && (
            <div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-emerald-900">{resumen.dias_trabajados}</p>
                  <p className="text-[11px] text-emerald-700">Días trabajados</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-blue-900">{resumen.horas_totales || resumen.total_horas + 'h'}</p>
                  <p className="text-[11px] text-blue-700">Horas totales</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-purple-900">{resumen.horas_extra || 0}h</p>
                  <p className="text-[11px] text-purple-700">Horas extra</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-sm font-bold text-slate-900 mb-3">Detalle diario</p>
                <div className="space-y-1.5">
                  {(resumen.fichajes || []).map((d: any, i: number) => (
                    <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl border ${tipoDiaClasses(d.tipo_dia, d.completo, d.entrada)}`}>
                      {circuloDia(d)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-medium text-slate-800">
                            {new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </p>
                          {tipoDiaBadge(d)}
                          {d.tipo_dia === 'trabajado' && !d.completo && d.entrada && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full">prov.</span>
                          )}
                        </div>
                        {d.tipo_dia === 'trabajado' && (
                          <p className="text-xs text-slate-500 font-mono">
                            {d.entrada || '—'} → {d.salida || '—'}
                            {d.minutos_extra > 0 && <span className="text-purple-600 ml-2 font-sans text-[10px]">+{d.horas_extra_texto}</span>}
                          </p>
                        )}
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
            </div>
          )}
        </div>
      )}

      {/* ══ SUPERVISIÓN (fusionado con Panel hoy) ═══════════════════════════ */}
      {tab === 'supervision' && (esAdmin || esSupervisor) && (
        <div className="space-y-5">

          {/* Cabecera: mes/año + botones */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
              <button onClick={() => { if (mes === 1) { setMes(12); setAnio(anio - 1) } else setMes(mes - 1) }} className="p-1.5 hover:bg-slate-100 rounded-lg"><ChevronLeft size={14} /></button>
              <span className="text-xs font-semibold px-2">{MESES[mes]} {anio}</span>
              <button onClick={() => { if (mes === 12) { setMes(1); setAnio(anio + 1) } else setMes(mes + 1) }} className="p-1.5 hover:bg-slate-100 rounded-lg"><ChevronRight size={14} /></button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => exportarExcel(resumenMensual, `${MESES[mes]} ${anio}`)}
                disabled={!resumenMensual?.resumen?.length}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40">
                <Download size={13} /> Excel
              </button>
              <button onClick={() => cargarResumenMensual(mes, anio)} disabled={cargando}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-xl border border-slate-200">
                {cargando ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Actualizar
              </button>
            </div>
          </div>

          {/* KPIs rápidos */}
          {resumenMensual?.totales && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-blue-900">{resumenMensual.totales.empleados || empleados.length}</p>
                <p className="text-[10px] text-blue-700 font-semibold">Plantilla</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-emerald-900">{resumenMensual.totales.con_fichajes || resumenMensual.resumen?.filter((r: any) => r.dias_trabajados > 0).length || 0}</p>
                <p className="text-[10px] text-emerald-700 font-semibold">Con fichajes</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-slate-800">{resumenMensual.totales.horas}h</p>
                <p className="text-[10px] text-slate-600 font-semibold">Horas totales</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-purple-900">{resumenMensual.totales.horas_extra}h</p>
                <p className="text-[10px] text-purple-700 font-semibold">Horas extra</p>
              </div>
              <div className={`border rounded-xl p-3 text-center ${resumenMensual.totales.pendientes > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <p className={`text-xl font-black ${resumenMensual.totales.pendientes > 0 ? 'text-amber-900' : 'text-emerald-900'}`}>{resumenMensual.totales.pendientes}</p>
                <p className={`text-[10px] font-semibold ${resumenMensual.totales.pendientes > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>Pend. validar</p>
              </div>
            </div>
          )}

          {/* [6/04] Panel Estado HOY */}
          {estadoHoy && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Wifi size={16} className="text-emerald-500" />
                <p className="text-sm font-bold text-slate-900">Estado hoy — {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
                  <p className="text-lg font-black text-emerald-800">{estadoHoy.total_trabajando}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">🟢 Trabajando</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-center">
                  <p className="text-lg font-black text-blue-800">{estadoHoy.total_completado}</p>
                  <p className="text-[10px] text-blue-600 font-semibold">✅ Completado</p>
                </div>
                <div className={`border rounded-xl p-2.5 text-center ${estadoHoy.total_sin_fichar > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-lg font-black ${estadoHoy.total_sin_fichar > 0 ? 'text-red-800' : 'text-slate-600'}`}>{estadoHoy.total_sin_fichar}</p>
                  <p className={`text-[10px] font-semibold ${estadoHoy.total_sin_fichar > 0 ? 'text-red-600' : 'text-slate-500'}`}>⚪ Sin fichar</p>
                </div>
              </div>
              {estadoHoy.trabajando?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {estadoHoy.trabajando.map((t: any) => (
                    <span key={t.empleado_id} className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                      🟢 {t.nombre.split(' ').slice(0, 2).join(' ')} · {t.hora_entrada}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-tabs de supervisión */}
          <div className="flex gap-1 bg-slate-50 p-1 rounded-lg">
            {([
              { id: 'resumen', label: 'Resumen empleados', icon: Users },
              { id: 'pendientes', label: `Pendientes${(fichajesProvisionales.length + horasExtraList.length) > 0 ? ` (${fichajesProvisionales.length + horasExtraList.length})` : ''}`, icon: ShieldCheck },
              { id: 'detalle', label: 'Detalle fichajes', icon: Filter },
            ] as const).map(s => (
              <button key={s.id} onClick={() => setSubTab(s.id)}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${subTab === s.id ? 'bg-white shadow text-[#1a3c34]' : 'text-slate-500 hover:text-slate-700'}`}>
                <s.icon size={13} /> {s.label}
              </button>
            ))}
          </div>

          {/* ── SUB-TAB: RESUMEN POR EMPLEADO ──────────────────────────────── */}
          {subTab === 'resumen' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              {cargando ? <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-slate-400 mx-auto" /></div>
                : !resumenMensual?.resumen?.length ? <div className="text-center py-8 text-slate-400 text-sm">Sin datos en {MESES[mes]} {anio}</div>
                : (
                  <div>
                    {/* Tabla header */}
                    <div className="hidden md:grid grid-cols-[1fr_100px_60px_60px_60px_80px_80px_50px] gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                      <span>Empleado</span><span>Centro</span><span className="text-center">Días</span><span className="text-center">Faltas</span>
                      <span className="text-center">Ausenc.</span><span className="text-right">Horas</span><span className="text-right">Extra</span><span></span>
                    </div>
                    {resumenMensual.resumen.map((r: any) => {
                      const isExpanded = expandidos.has(r.id || r.empleado_id)
                      const empId = r.id || r.empleado_id
                      const diasLab = r.dias_laborables || r.dias_laborables_esperados || '?'
                      const diasFalta = r.dias_falta || 0
                      const totalH = r.total_horas || (r.horas_totales ? r.horas_totales + 'h' : '0h')
                      const extraH = r.total_extra_horas || r.horas_extra || 0
                      const pendVal = r.pendiente_validacion || (r.pendientes_validar > 0)
                      return (
                        <div key={empId}>
                          <button onClick={() => toggleExpandido(empId)}
                            className={`w-full grid grid-cols-1 md:grid-cols-[1fr_100px_60px_60px_60px_80px_80px_50px] gap-2 px-4 py-3 border-b border-slate-100 hover:bg-slate-50/50 text-left items-center ${pendVal ? 'bg-amber-50/30' : ''}`}>
                            {/* Mobile layout */}
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${r.dias_trabajados > 0 ? 'bg-[#1a3c34]/10 text-[#1a3c34]' : 'bg-slate-100 text-slate-400'}`}>
                                {(r.nombre || '?')[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{r.nombre}</p>
                                <p className="text-[10px] text-slate-400 md:hidden">{r.centro || '—'} · {r.dias_trabajados}/{diasLab}d · {typeof totalH === 'string' ? totalH : totalH + 'h'}</p>
                              </div>
                            </div>
                            <span className="hidden md:block text-xs text-slate-500 truncate">{r.centro || '—'}</span>
                            <span className="hidden md:block text-xs text-center font-mono font-bold text-slate-800">{r.dias_trabajados}/{diasLab}</span>
                            <span className={`hidden md:block text-xs text-center font-mono font-bold ${diasFalta > 0 ? 'text-red-600' : 'text-slate-300'}`}>{diasFalta || '—'}</span>
                            <span className={`hidden md:block text-xs text-center font-mono ${(r.dias_ausencia || 0) > 0 ? 'text-blue-600' : 'text-slate-300'}`}>{r.dias_ausencia || '—'}</span>
                            <span className="hidden md:block text-sm text-right font-bold font-mono text-[#1a3c34]">{typeof totalH === 'string' ? totalH : totalH + 'h'}</span>
                            <span className={`hidden md:block text-xs text-right font-mono font-bold ${extraH > 0 ? 'text-purple-700' : 'text-slate-300'}`}>{extraH > 0 ? `+${extraH}h` : '—'}</span>
                            <span className="hidden md:flex justify-end">{isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}</span>
                          </button>

                          {/* Detalle expandido: fichajes del empleado */}
                          {isExpanded && (
                            <div className="bg-slate-50/50 border-b border-slate-200 px-4 py-3">
                              {(r.fichajes || []).length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-2">Sin fichajes este mes</p>
                              ) : (
                                <div className="space-y-1">
                                  {[...r.fichajes].sort((a: any, b: any) => (a.fecha || '').localeCompare(b.fecha || '')).map((f: any) => (
                                    <div key={f.id} className="flex items-center gap-3 text-xs py-1.5 px-2 rounded-lg hover:bg-white">
                                      <span className="font-mono text-slate-600 w-20">{f.fecha}</span>
                                      <span className="font-mono text-emerald-700 font-bold w-14">{f.hora_entrada || '—'}</span>
                                      <span className="text-slate-300">→</span>
                                      <span className="font-mono text-red-600 font-bold w-14">{f.hora_salida || '—'}</span>
                                      <span className="font-mono font-bold text-slate-800 w-12 text-right">{f.horas_trabajadas ? f.horas_trabajadas.toFixed(1) + 'h' : '—'}</span>
                                      {(f.horas_extra || 0) > 0 && <span className="font-mono text-purple-600 text-[10px]">+{f.horas_extra.toFixed(1)}h</span>}
                                      {!f.validado && <span className="text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">pend.</span>}
                                    </div>
                                  ))}
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

          {/* ── SUB-TAB: PENDIENTES (provisionales + horas extra) ──────── */}
          {subTab === 'pendientes' && (
            <div className="space-y-4">
              {/* Fichajes provisionales */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-amber-500" />
                    Fichajes pendientes de validación
                    {fichajesProvisionales.length > 0 && (
                      <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{fichajesProvisionales.length}</span>
                    )}
                  </p>
                </div>
                {fichajesProvisionales.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">✅ Sin fichajes pendientes</p>
                ) : (
                  <div className="space-y-2">
                    {fichajesProvisionales.slice(0, 20).map((f: any) => (
                      <div key={f.id} className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{f.nombre || f.nombre_empleado || '—'}</p>
                            <p className="text-xs text-slate-500">{f.fecha} · {f.hora_entrada || f.hora || '—'} → {f.hora_salida || '—'} · {f.centro || '—'}</p>
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
                                <button onClick={() => { setEditFichaje(f); setHoraCorregida((f.hora_salida || f.hora_entrada || '').substring(0, 5)) }}
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
                    {fichajesProvisionales.length > 20 && (
                      <p className="text-xs text-slate-400 text-center">...y {fichajesProvisionales.length - 20} más. Usa el tab "Detalle fichajes" para ver todos.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Horas extra pendientes */}
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
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900">{he.nombre_empleado || he.nombre}</p>
                            <p className="text-xs text-slate-500">
                              {he.fecha} · <span className="font-bold text-purple-700">+{(he.horas_extra || 0).toFixed(1)}h extra</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => handleAprobarHorasExtra(he, 'pago')} disabled={guardandoVal}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg">💶 Pagar</button>
                            <button onClick={() => handleAprobarHorasExtra(he, 'descanso')} disabled={guardandoVal}
                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg">😴 Descanso</button>
                            <button onClick={() => handleRechazarHorasExtra(he)} disabled={guardandoVal}
                              className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg flex items-center gap-1">
                              <XCircle size={12} /> Rechazar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SUB-TAB: DETALLE FICHAJES + VALIDACIÓN MASIVA ──────────── */}
          {subTab === 'detalle' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#1a3c34]" />
                  Todos los fichajes — {MESES[mes]} {anio}
                  <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{fichajesFiltrados.length}</span>
                </p>
              </div>

              {/* Filtros */}
              <div className="flex flex-wrap gap-2 mb-4">
                <select value={filtroCentro} onChange={e => setFiltroCentro(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white">
                  <option value="">Todos los centros</option>
                  {Array.from(centrosUnicos).sort().map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value as any)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white">
                  <option value="todos">Todos los estados</option>
                  <option value="pendiente">⏳ Pendiente validar</option>
                  <option value="validado">✅ Validado</option>
                </select>
                <select value={filtroEmpleado} onChange={e => setFiltroEmpleado(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white">
                  <option value="">Todos los empleados</option>
                  {empleados.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre} {emp.apellidos}</option>)}
                </select>
              </div>

              {/* Barra validación masiva */}
              {fichPendientes.length > 0 && (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <button onClick={seleccionados.size === fichPendientes.length ? deseleccionarTodos : seleccionarTodosPendientes}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900">
                      {seleccionados.size === fichPendientes.length && fichPendientes.length > 0
                        ? <CheckSquare size={15} className="text-[#1a3c34]" />
                        : <Square size={15} className="text-slate-400" />
                      }
                      {seleccionados.size === fichPendientes.length && fichPendientes.length > 0 ? 'Deseleccionar' : 'Seleccionar'} todos ({fichPendientes.length})
                    </button>
                    {seleccionados.size > 0 && (
                      <span className="text-xs text-amber-700 font-bold">{seleccionados.size} seleccionado{seleccionados.size !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                  <button onClick={handleValidarMasivo}
                    disabled={seleccionados.size === 0 || validandoMasivo}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-sm">
                    {validandoMasivo ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    Validar seleccionados
                  </button>
                </div>
              )}

              {/* Tabla */}
              {fichajesFiltrados.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Sin fichajes con estos filtros</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="w-8 px-3 py-2.5"></th>
                        <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-slate-500">Empleado</th>
                        <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-slate-500">Fecha</th>
                        <th className="text-center px-3 py-2.5 text-[11px] font-semibold text-slate-500">Entrada</th>
                        <th className="text-center px-3 py-2.5 text-[11px] font-semibold text-slate-500">Salida</th>
                        <th className="text-right px-3 py-2.5 text-[11px] font-semibold text-slate-500">Horas</th>
                        <th className="text-right px-3 py-2.5 text-[11px] font-semibold text-slate-500">Extra</th>
                        <th className="text-center px-3 py-2.5 text-[11px] font-semibold text-slate-500">Centro</th>
                        <th className="text-center px-3 py-2.5 text-[11px] font-semibold text-slate-500">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fichajesFiltrados.map((f: any, i: number) => {
                        const pendiente = !f.validado
                        return (
                          <tr key={f.id} className={`border-b border-slate-50 hover:bg-slate-50/50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                            <td className="px-3 py-2">
                              {pendiente && (
                                <button onClick={() => toggleSeleccion(f.id)} className="p-0.5">
                                  {seleccionados.has(f.id)
                                    ? <CheckSquare size={16} className="text-[#1a3c34]" />
                                    : <Square size={16} className="text-slate-300 hover:text-slate-500" />
                                  }
                                </button>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs font-medium text-slate-800 whitespace-nowrap">{f.nombre_display || f.nombre_empleado || f.nombre}</td>
                            <td className="px-3 py-2 text-xs text-slate-600 font-mono">{f.fecha}</td>
                            <td className="px-3 py-2 text-xs text-center font-mono text-emerald-700 font-bold">{f.hora_entrada || '—'}</td>
                            <td className="px-3 py-2 text-xs text-center font-mono text-red-600 font-bold">{f.hora_salida || '—'}</td>
                            <td className="px-3 py-2 text-xs text-right font-mono font-bold text-slate-800">{f.horas_trabajadas ? f.horas_trabajadas.toFixed(1) + 'h' : '—'}</td>
                            <td className="px-3 py-2 text-xs text-right font-mono">
                              {(f.horas_extra || 0) > 0
                                ? <span className="font-bold text-purple-700">+{f.horas_extra.toFixed(1)}h</span>
                                : <span className="text-slate-300">—</span>
                              }
                            </td>
                            <td className="px-3 py-2 text-xs text-center text-slate-500 max-w-[100px] truncate">{f.centro_display || f.centro_nombre || f.centro || '—'}</td>
                            <td className="px-3 py-2 text-center">
                              {f.validado
                                ? <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">✓ Validado</span>
                                : <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">Pendiente</span>
                              }
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-400 text-right">
                    {fichajesFiltrados.length} fichajes · {fichajesFiltrados.reduce((s: number, f: any) => s + (f.horas_trabajadas || 0), 0).toFixed(1)}h total
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

