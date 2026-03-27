import { useState, useEffect, useRef } from 'react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  Play, Square, CheckCircle2, Circle, Camera, MapPin,
  Package, Wrench, FileText, Loader2, AlertTriangle,
  ChevronRight, X, Save, PenTool, Clock,
  CheckSquare, List, Euro, RefreshCw,
  LogIn, LogOut, Calendar, User, Shield,
  XCircle, Plus, ChevronLeft, Sun, Home,
  ClipboardList, Timer
} from 'lucide-react'

// ─── Utilidades ──────────────────────────────────────────────────────────────
function fmtHoraStr() {
  return new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}
function fmtDate(d: any) {
  if (!d) return ''
  try {
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return String(d)
    return dt.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return String(d) }
}
function fmtHoraFmt(d: any) {
  if (!d) return ''
  try {
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return String(d)
    return dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  } catch { return String(d) }
}

const TIPO_SERVICIO_EMOJI: Record<string, string> = {
  limpieza: '🧹', jardineria: '🌿', mantenimiento: '🔧',
  conserjeria: '🏢', vigilancia: '🛡️', residuos: '♻️'
}
const TIPOS_AUSENCIA_COLOR: Record<string, string> = {
  vacaciones: 'bg-blue-100 text-blue-700',
  baja_medica: 'bg-red-100 text-red-700',
  asuntos_propios: 'bg-purple-100 text-purple-700',
  permiso: 'bg-amber-100 text-amber-700',
}
const ESTADO_COLOR: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  aprobada: 'bg-emerald-100 text-emerald-700',
  rechazada: 'bg-red-100 text-red-700',
}
const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

type TabPrincipal = 'tareas' | 'fichar' | 'ausencias' | 'prl' | 'perfil'
type PasoTarea = 'inicio' | 'checklist' | 'materiales' | 'fotos' | 'firma' | 'incidencia' | 'resumen'

// ─── Componente principal ─────────────────────────────────────────────────────
export default function OperadorCampoV2Page() {
  const { usuario } = useAuth()

  // ── Estado global ──────────────────────────────────────────────────────────
  const [tab, setTab] = useState<TabPrincipal>('tareas')
  const [cargandoInicial, setCargandoInicial] = useState(true)
  const [empleado, setEmpleado] = useState<any>(null)
  const [msg, setMsg] = useState<{ texto: string; tipo: 'ok' | 'err' } | null>(null)
  const [hora, setHora] = useState(fmtHoraStr())
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsError, setGpsError] = useState('')

  // ── Estado Tareas ──────────────────────────────────────────────────────────
  const [paso, setPaso] = useState<PasoTarea>('inicio')
  const [centros, setCentros] = useState<any[]>([])
  const [centroSel, setCentroSel] = useState<any>(null)
  const [parteActual, setParteActual] = useState<any>(null)
  const [checklist, setChecklist] = useState<any[]>([])
  const [materiales, setMateriales] = useState<any[]>([])
  const [maquinaria, setMaquinaria] = useState<any[]>([])
  const [catalogoMats, setCatalogoMats] = useState<any[]>([])
  const [catalogoMaqui, setCatalogoMaqui] = useState<any[]>([])
  const [fotos, setFotos] = useState<any[]>([])
  const [procesando, setProcesando] = useState(false)
  const [tabMat, setTabMat] = useState<'materiales' | 'maquinaria'>('materiales')
  const [addMat, setAddMat] = useState<any>(null)
  const [addMaq, setAddMaq] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [tipoFoto, setTipoFoto] = useState<'antes' | 'despues'>('antes')
  const [firmaNombre, setFirmaNombre] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dibujando, setDibujando] = useState(false)
  const [incidenciaForm, setIncidenciaForm] = useState({ tipo: '', descripcion: '', urgente: false })

  // ── Estado Fichar ──────────────────────────────────────────────────────────
  const [estadoFichaje, setEstadoFichaje] = useState<any>(null)
  const [fichando, setFichando] = useState(false)
  const [resumenFichajes, setResumenFichajes] = useState<any>(null)
  const [mesFichaje, setMesFichaje] = useState(new Date().getMonth() + 1)
  const [anioFichaje, setAnioFichaje] = useState(new Date().getFullYear())

  // ── Estado Ausencias ───────────────────────────────────────────────────────
  const [ausencias, setAusencias] = useState<any[]>([])
  const [tiposAusencia, setTiposAusencia] = useState<any[]>([])
  const [mostrarFormAus, setMostrarFormAus] = useState(false)
  const [guardandoAus, setGuardandoAus] = useState(false)
  const [formAus, setFormAus] = useState<any>({})

  // ── Estado PRL ─────────────────────────────────────────────────────────────
  const [prlData, setPrlData] = useState<any>(null)

  // ─── Utilidades UI ─────────────────────────────────────────────────────────
  const showMsg = (texto: string, tipo: 'ok' | 'err' = 'ok') => {
    setMsg({ texto, tipo }); setTimeout(() => setMsg(null), 4000)
  }

  // ─── Reloj ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setHora(fmtHoraStr()), 1000)
    return () => clearInterval(t)
  }, [])

  // ─── GPS automático ────────────────────────────────────────────────────────
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => setGpsError('GPS no disponible')
      )
    }
  }, [])

  // ─── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      setCargandoInicial(true)
      try {
        // 1. Empleados — crítico, va solo
        const emps = await api.empleados()
        const lista = emps.empleados || []
        const emp = lista.find((e: any) =>
          e.email === usuario?.email || e.id === (usuario as any)?.id_empleado)

        if (emp) {
          setEmpleado(emp)
          // 2. Datos del empleado en paralelo
          const [tareas, est, aus] = await Promise.all([
            (api as any).tareasDia(emp.id),
            api.estadoFichaje(emp.id),
            api.ausencias({ id_empleado: emp.id })
          ])
          setCentros(tareas.centros || [])
          setEstadoFichaje(est)
          setAusencias(aus.ausencias || [])
          setTiposAusencia(aus.tipos || [])
          // 3. Parte en curso si existe
          try {
            const asis = await (api as any).asistenciaDia(emp.id)
            if (asis?.en_curso) {
              setParteActual(asis.en_curso)
              const centro = (tareas.centros || []).find((c: any) => c.centro_id === asis.en_curso.centro_id)
              if (centro) setCentroSel(centro)
              await cargarDatosParte(asis.en_curso.id)
              setPaso('checklist')
            }
          } catch (e) { console.warn('asistenciaDia no disponible', e) }
        }

        // 4. Catálogos — no críticos, fallan sin romper nada
        try {
          const [cats, catm] = await Promise.all([
            (api as any).catalogoMateriales(),
            (api as any).catalogoMaquinaria()
          ])
          setCatalogoMats(cats?.materiales || [])
          setCatalogoMaqui(catm?.maquinaria || [])
        } catch (e) { console.warn('Catálogos no disponibles', e) }

      } catch (e) { console.error('Error carga inicial:', e) }
      finally { setCargandoInicial(false) }
    }
    cargar()
  }, [])

  // ─── Cargar resumen fichajes al cambiar mes o entrar en tab fichar ─────────
  useEffect(() => {
    if (tab === 'fichar' && empleado) {
      api.resumenDiarioFichajes(empleado.id, String(mesFichaje), String(anioFichaje))
        .then((d: any) => setResumenFichajes(d))
        .catch(() => { })
    }
  }, [tab, empleado, mesFichaje, anioFichaje])

  // ─── Cargar PRL al entrar en tab ──────────────────────────────────────────
  useEffect(() => {
    if (tab === 'prl' && empleado && !prlData) {
      Promise.all([api.prlEpis(empleado.dni), api.prlReconocimientos(empleado.dni)])
        .then(([epis, recos]) => setPrlData({ epis: epis.epis || [], recos: recos.reconocimientos || [] }))
        .catch(() => { })
    }
  }, [tab, empleado])

  // ═══ LÓGICA TAREAS ════════════════════════════════════════════════════════

  const cargarDatosParte = async (parteId: string) => {
    try {
      const [chk, mats, maqs, fts] = await Promise.all([
        (api as any).checklistEjecucion(parteId),
        (api as any).materialesParte(parteId),
        (api as any).maquinariaParte(parteId),
        (api as any).fotosParte(parteId)
      ])
      setChecklist(chk.items || [])
      setMateriales(mats.materiales || [])
      setMaquinaria(maqs.maquinaria || [])
      setFotos((fts.fotos || []).map((f: any) => ({ tipo: f.tipo, url: f.url, nombre: f.nombre })))
    } catch (e) { console.error(e) }
  }

  const handleIniciarParte = async (centro: any) => {
    if (!empleado) return
    setProcesando(true)
    try {
      const r = await (api as any).iniciarParte({
        centro_id: centro.id || centro.centro_id,
        empleado_id: empleado.id,
        nombre_empleado: `${empleado.nombre} ${empleado.apellidos}`,
        dni: empleado.dni, tipo_servicio: centro.tipo_servicio,
        lat: gps?.lat, lng: gps?.lng
      })
      if (r.ok || r.id) {
        setCentroSel(centro)
        setParteActual({ id: r.id, hora_inicio: r.hora_inicio, centro_id: centro.id || centro.centro_id })
        await cargarDatosParte(r.id)
        setPaso('checklist')
        showMsg(`✅ ${r.hora_inicio} · ${r.checklist_generado || 0} tareas`)
      } else showMsg(r.error || 'Error iniciando parte', 'err')
    } catch (e) { showMsg('Error de conexión', 'err') }
    finally { setProcesando(false) }
  }

  const handleToggleTarea = async (item: any) => {
    const nuevo = !item.completado
    setChecklist(prev => prev.map(i => i.id === item.id ? { ...i, completado: nuevo } : i))
    try {
      await (api as any).actualizarChecklistExec({ id: item.id, completada: nuevo, parte_id: parteActual?.id })
    } catch (e) { setChecklist(prev => prev.map(i => i.id === item.id ? { ...i, completado: !nuevo } : i)) }
  }

  const handleFinalizarParte = async () => {
    if (!parteActual) return
    const firmaData = canvasRef.current?.toDataURL('image/png') || ''
    setProcesando(true)
    try {
      const r = await (api as any).finalizarParte({
        id: parteActual.id,
        empleado_id: empleado?.id,
        nombre_empleado: `${empleado?.nombre} ${empleado?.apellidos}`,
        observaciones, firma_nombre: firmaNombre,
        firma_data: firmaData, lat: gps?.lat, lng: gps?.lng
      })
      if (r.ok) { showMsg('✅ Parte finalizado'); setPaso('resumen') }
      else showMsg(r.error || 'Error al finalizar', 'err')
    } catch (e) { showMsg('Error de conexión', 'err') }
    finally { setProcesando(false) }
  }

  const handleAddMaterial = async () => {
    if (!addMat?.id) return
    setProcesando(true)
    try {
      await (api as any).registrarMaterialParte({ parte_id: parteActual?.id, material_id: addMat.id, cantidad: addMat.cantidad || 1 })
      setMateriales(prev => [...prev, { ...addMat, cantidad: addMat.cantidad || 1 }])
      setAddMat(null)
    } catch (e) { showMsg('Error', 'err') }
    finally { setProcesando(false) }
  }

  const handleAddMaquinaria = async () => {
    if (!addMaq?.id) return
    setProcesando(true)
    try {
      await (api as any).registrarMaquinariaParte({ parte_id: parteActual?.id, maquinaria_id: addMaq.id, horas: addMaq.horas || 1 })
      setMaquinaria(prev => [...prev, { ...addMaq, horas: addMaq.horas || 1 }])
      setAddMaq(null)
    } catch (e) { showMsg('Error', 'err') }
    finally { setProcesando(false) }
  }

  const handleFoto = async (e: any) => {
    const file = e.target.files?.[0]
    if (!file || !parteActual) return
    setProcesando(true)
    try {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string)?.split(',')[1]
        const r = await (api as any).registrarFotoParte({
          parte_id: parteActual.id, tipo: tipoFoto,
          nombre: file.name, base64: base64, mime: file.type, centro_id: centroSel?.id || centroSel?.centro_id
        })
        if (r.ok) {
          setFotos(prev => [...prev, { tipo: tipoFoto, url: r.url, nombre: file.name }])
          showMsg('✅ Foto añadida')
        } else showMsg('Error al subir foto', 'err')
        setProcesando(false)
      }
      reader.readAsDataURL(file)
    } catch (e) { showMsg('Error', 'err'); setProcesando(false) }
  }

  const handleIncidencia = async () => {
    if (!incidenciaForm.tipo || !incidenciaForm.descripcion) { showMsg('Rellena tipo y descripción', 'err'); return }
    setProcesando(true)
    try {
      await (api as any).crearIncidencia({
        centro_id: centroSel?.id || centroSel?.centro_id,
        parte_id: parteActual?.id,
        empleado_id: empleado?.id,
        ...incidenciaForm
      })
      showMsg('✅ Incidencia registrada')
      setIncidenciaForm({ tipo: '', descripcion: '', urgente: false })
      setPaso(parteActual ? 'checklist' : 'inicio')
    } catch (e) { showMsg('Error', 'err') }
    finally { setProcesando(false) }
  }

  // Canvas firma
  const startDraw = (e: any) => {
    setDibujando(true)
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    const x = (e.touches?.[0]?.clientX || e.clientX) - rect.left
    const y = (e.touches?.[0]?.clientY || e.clientY) - rect.top
    ctx.beginPath(); ctx.moveTo(x, y)
  }
  const draw = (e: any) => {
    if (!dibujando) return
    e.preventDefault()
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.strokeStyle = '#1a3c34'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'
    const rect = canvas.getBoundingClientRect()
    const x = (e.touches?.[0]?.clientX || e.clientX) - rect.left
    const y = (e.touches?.[0]?.clientY || e.clientY) - rect.top
    ctx.lineTo(x, y); ctx.stroke()
  }
  const endDraw = () => setDibujando(false)
  const limpiarFirma = () => {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
  }

  // ═══ LÓGICA FICHAR ════════════════════════════════════════════════════════

  const obtenerGPS = () => {
    setGpsError('')
    if (!navigator.geolocation) { setGpsError('GPS no disponible'); return }
    navigator.geolocation.getCurrentPosition(
      pos => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGpsError('No se pudo obtener ubicación')
    )
  }

  const handleFichar = async () => {
    if (!empleado) return
    setFichando(true)
    try {
      const accion = estadoFichaje?.fichado ? 'salida' : 'entrada'
      const r = await api.fichar({ id_empleado: empleado.id, tipo: accion, lat: gps?.lat, lng: gps?.lng })
      if (r.ok) {
        showMsg(accion === 'entrada' ? '✅ Entrada registrada' : '✅ Salida registrada')
        Object.keys(localStorage).filter(k => k.startsWith('fc_')).forEach(k => localStorage.removeItem(k))
        await new Promise(res => setTimeout(res, 1500))
        const est = await api.estadoFichaje(empleado.id)
        setEstadoFichaje(est)
        const res = await api.resumenDiarioFichajes(empleado.id, String(mesFichaje), String(anioFichaje))
        setResumenFichajes(res)
      } else showMsg(r.error || 'Error al fichar', 'err')
    } catch { showMsg('Error de conexión', 'err') }
    finally { setFichando(false) }
  }

  // ═══ LÓGICA AUSENCIAS ════════════════════════════════════════════════════

  const handleSolicitarAusencia = async () => {
    if (!formAus.tipo || !formAus.fecha_inicio || !formAus.fecha_fin) { showMsg('Rellena todos los campos', 'err'); return }
    setGuardandoAus(true)
    try {
      const r = await api.solicitarAusencia({
        ...formAus,
        id_empleado: empleado?.id,
        nombre_empleado: `${empleado?.nombre || ''} ${empleado?.apellidos || ''}`,
        dni: empleado?.dni
      })
      if (r.ok) {
        showMsg('✅ Solicitud enviada')
        setMostrarFormAus(false); setFormAus({})
        const aus = await api.ausencias({ id_empleado: empleado?.id })
        setAusencias(aus.ausencias || [])
      } else showMsg(r.error || 'Error', 'err')
    } catch { showMsg('Error de conexión', 'err') }
    finally { setGuardandoAus(false) }
  }

  // ═══ PANTALLAS DE CARGA / ERROR ══════════════════════════════════════════

  if (cargandoInicial) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <Loader2 size={32} className="text-[#1a3c34] animate-spin mb-3" />
      <p className="text-slate-500 text-sm">Cargando tu portal...</p>
    </div>
  )

  if (!empleado) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-8 text-center">
      <AlertTriangle size={40} className="text-amber-500 mb-3" />
      <p className="text-slate-700 font-bold">Tu usuario no está vinculado a ningún empleado</p>
      <p className="text-sm text-slate-500 mt-1">Contacta con RRHH para configurar tu acceso</p>
    </div>
  )

  const fichado = !!estadoFichaje?.fichado
  const horaEntrada = estadoFichaje?.fichajes_hoy?.find((f: any) => f.tipo === 'entrada')?.hora || null
  const tareasTotales = checklist.length
  const tareasHechas = checklist.filter(t => t.completado).length

  // ═══ RENDER ══════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto relative">

      {/* Toast notificación */}
      {msg && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-bold ${msg.tipo === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {msg.texto}
        </div>
      )}

      {/* ── CABECERA ────────────────────────────────────────────────────────── */}
      <div className="bg-[#1a3c34] text-white px-5 pt-10 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/60 font-medium">Operador de campo</p>
            <p className="text-lg font-bold">{empleado.nombre} {empleado.apellidos}</p>
            <p className="text-xs text-white/60">{empleado.centro || 'Sin centro'} · {empleado.categoria || ''}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black tabular-nums">{hora}</p>
            <div className={`mt-1 inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${fichado ? 'bg-emerald-500/30 text-emerald-200' : 'bg-white/10 text-white/50'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${fichado ? 'bg-emerald-400' : 'bg-white/30'}`} />
              {fichado ? `En turno · ${horaEntrada || ''}` : 'Sin fichar'}
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENIDO ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-24">

        {/* ══════════════════════════════════════════════════════════════════
            TAB TAREAS
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'tareas' && (
          <div>
            {/* Barra de pasos (cuando hay parte activo) */}
            {parteActual && !['inicio', 'resumen'].includes(paso) && (
              <div className="bg-white border-b border-slate-200 px-4 py-2">
                <div className="flex gap-1">
                  {[
                    { id: 'checklist', label: 'Tareas', icon: CheckSquare, c: `${tareasHechas}/${tareasTotales}` },
                    { id: 'materiales', label: 'Material', icon: Package },
                    { id: 'fotos', label: 'Fotos', icon: Camera, c: String(fotos.length) },
                    { id: 'firma', label: 'Firma', icon: PenTool },
                  ].map(s => (
                    <button key={s.id} onClick={() => setPaso(s.id as PasoTarea)}
                      className={`flex-1 flex flex-col items-center py-2 rounded-xl text-[10px] font-bold transition-colors ${paso === s.id ? 'bg-[#1a3c34] text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                      <s.icon size={15} />
                      {s.label}
                      {s.c && <span className={`text-[9px] font-black ${paso === s.id ? 'text-white/70' : 'text-slate-400'}`}>{s.c}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 space-y-4">

              {/* ─── PASO INICIO ─── */}
              {paso === 'inicio' && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">Mis centros de trabajo</p>
                    <span className="text-xs text-slate-400">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                  </div>

                  {centros.length === 0 ? (
                    <div className="flex flex-col items-center py-16 bg-white rounded-2xl border border-slate-200">
                      <List size={36} className="text-slate-300 mb-3" />
                      <p className="text-slate-500 font-medium text-sm">Sin centros asignados</p>
                      <p className="text-xs text-slate-400 mt-1">Contacta con tu supervisor</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {centros.map((c: any) => (
                        <div key={c.id || c.centro_id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{TIPO_SERVICIO_EMOJI[c.tipo_servicio] || '🏢'}</span>
                                <p className="text-sm font-bold text-slate-900">{c.nombre}</p>
                              </div>
                              <p className="text-xs text-slate-500">{c.municipio || c.direccion}</p>
                              {c.hora_entrada && (
                                <p className="text-xs text-[#1a3c34] font-semibold mt-1">
                                  ⏰ {c.hora_entrada} – {c.hora_salida}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleIniciarParte(c)} disabled={procesando}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1a3c34] hover:bg-[#2d5a4e] disabled:bg-slate-300 text-white text-sm font-bold rounded-xl transition-colors">
                              {procesando ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                              Iniciar parte
                            </button>
                            <button onClick={() => { setCentroSel(c); setPaso('incidencia') }}
                              className="px-3 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition-colors">
                              <AlertTriangle size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ─── PASO CHECKLIST ─── */}
              {paso === 'checklist' && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{centroSel?.nombre}</p>
                      <p className="text-xs text-slate-500">Inicio: {parteActual?.hora_inicio}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-[#1a3c34]">{tareasHechas}<span className="text-sm text-slate-400 font-normal">/{tareasTotales}</span></p>
                      <p className="text-[10px] text-slate-400">completadas</p>
                    </div>
                  </div>

                  {/* Barra progreso */}
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#1a3c34] to-emerald-500 rounded-full transition-all"
                      style={{ width: `${tareasTotales > 0 ? (tareasHechas / tareasTotales) * 100 : 0}%` }} />
                  </div>

                  <div className="space-y-2">
                    {checklist.map((item: any) => (
                      <button key={item.id} onClick={() => handleToggleTarea(item)}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${item.completado ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                        <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center ${item.completado ? 'bg-emerald-500' : 'border-2 border-slate-300'}`}>
                          {item.completado && <CheckCircle2 size={16} className="text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${item.completado ? 'text-emerald-700 line-through' : 'text-slate-800'}`}>{item.descripcion}</p>
                          {item.zona && <p className="text-xs text-slate-400 mt-0.5">{item.zona}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* ─── PASO MATERIALES ─── */}
              {paso === 'materiales' && (
                <>
                  <div className="flex gap-2">
                    {[{ id: 'materiales', label: 'Materiales', icon: Package }, { id: 'maquinaria', label: 'Maquinaria', icon: Wrench }].map(t => (
                      <button key={t.id} onClick={() => setTabMat(t.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors ${tabMat === t.id ? 'bg-[#1a3c34] text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                        <t.icon size={15} />{t.label}
                      </button>
                    ))}
                  </div>

                  {tabMat === 'materiales' && (
                    <div className="space-y-3">
                      {materiales.map((m: any, i) => (
                        <div key={i} className="flex items-center justify-between bg-white rounded-xl p-3 border border-slate-200">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{m.nombre || m.tipo}</p>
                            <p className="text-xs text-slate-500">{m.unidad}</p>
                          </div>
                          <span className="text-sm font-black text-[#1a3c34]">×{m.cantidad}</span>
                        </div>
                      ))}
                      <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200">
                        <p className="text-xs font-bold text-slate-600 mb-2">Añadir material</p>
                        <select value={addMat?.id || ''} onChange={e => setAddMat(catalogoMats.find(m => m.id === e.target.value) || null)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm mb-2 bg-white">
                          <option value="">— Seleccionar —</option>
                          {catalogoMats.map((m: any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                        {addMat && (
                          <div className="flex gap-2">
                            <input type="number" min="1" defaultValue="1"
                              onChange={e => setAddMat({ ...addMat, cantidad: Number(e.target.value) })}
                              className="w-20 px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                            <button onClick={handleAddMaterial} disabled={procesando}
                              className="flex-1 py-2 bg-[#1a3c34] text-white text-sm font-bold rounded-xl">
                              Añadir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {tabMat === 'maquinaria' && (
                    <div className="space-y-3">
                      {maquinaria.map((m: any, i) => (
                        <div key={i} className="flex items-center justify-between bg-white rounded-xl p-3 border border-slate-200">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{m.nombre || m.tipo}</p>
                          </div>
                          <span className="text-sm font-black text-[#1a3c34]">{m.horas}h</span>
                        </div>
                      ))}
                      <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200">
                        <p className="text-xs font-bold text-slate-600 mb-2">Añadir maquinaria</p>
                        <select value={addMaq?.id || ''} onChange={e => setAddMaq(catalogoMaqui.find(m => m.id === e.target.value) || null)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm mb-2 bg-white">
                          <option value="">— Seleccionar —</option>
                          {catalogoMaqui.map((m: any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                        {addMaq && (
                          <div className="flex gap-2">
                            <input type="number" min="0.5" step="0.5" defaultValue="1"
                              onChange={e => setAddMaq({ ...addMaq, horas: Number(e.target.value) })}
                              className="w-20 px-3 py-2 border border-slate-200 rounded-xl text-sm" placeholder="h" />
                            <button onClick={handleAddMaquinaria} disabled={procesando}
                              className="flex-1 py-2 bg-[#1a3c34] text-white text-sm font-bold rounded-xl">
                              Añadir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ─── PASO FOTOS ─── */}
              {paso === 'fotos' && (
                <>
                  <div className="flex gap-2 mb-2">
                    {[{ id: 'antes', label: '📷 Antes' }, { id: 'despues', label: '📸 Después' }].map(t => (
                      <button key={t.id} onClick={() => setTipoFoto(t.id as any)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${tipoFoto === t.id ? 'bg-[#1a3c34] text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <button onClick={() => fileRef.current?.click()} disabled={procesando}
                    className="w-full flex flex-col items-center justify-center py-10 bg-white border-2 border-dashed border-slate-300 rounded-2xl hover:border-[#1a3c34] transition-colors">
                    {procesando ? <Loader2 size={28} className="animate-spin text-[#1a3c34]" /> : <Camera size={28} className="text-slate-400" />}
                    <p className="text-sm text-slate-500 mt-2">Toca para {procesando ? 'subiendo...' : 'añadir foto'}</p>
                    <p className="text-xs text-slate-400">{tipoFoto === 'antes' ? 'Foto ANTES del servicio' : 'Foto DESPUÉS del servicio'}</p>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />

                  {fotos.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {fotos.map((f, i) => (
                        <div key={i} className="relative bg-slate-100 rounded-xl overflow-hidden aspect-square">
                          {f.url ? <img src={f.url} alt="" className="w-full h-full object-cover" /> :
                            <div className="w-full h-full flex items-center justify-center"><Camera size={24} className="text-slate-400" /></div>}
                          <span className={`absolute top-1 left-1 text-[9px] font-black px-1.5 py-0.5 rounded-full ${f.tipo === 'antes' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'}`}>
                            {f.tipo}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ─── PASO FIRMA ─── */}
              {paso === 'firma' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Observaciones finales</label>
                    <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)}
                      rows={3} placeholder="Incidencias, notas del servicio..." className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Nombre de quien firma</label>
                    <input value={firmaNombre} onChange={e => setFirmaNombre(e.target.value)}
                      placeholder="Nombre del cliente o responsable" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-600">Firma del cliente</label>
                      <button onClick={limpiarFirma} className="text-xs text-slate-400 hover:text-slate-600">Borrar</button>
                    </div>
                    <canvas ref={canvasRef} width={340} height={160}
                      className="w-full border-2 border-slate-300 rounded-2xl bg-white touch-none"
                      onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                      onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
                    <p className="text-xs text-slate-400 text-center mt-1">Firma táctil</p>
                  </div>
                  <button onClick={handleFinalizarParte} disabled={procesando}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-[#1a3c34] to-[#2d5a4e] hover:opacity-90 disabled:bg-slate-300 text-white font-bold rounded-2xl shadow-lg transition-all">
                    {procesando ? <Loader2 size={18} className="animate-spin" /> : <Square size={18} />}
                    Finalizar y cerrar parte
                  </button>
                </>
              )}

              {/* ─── PASO INCIDENCIA RÁPIDA ─── */}
              {paso === 'incidencia' && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => setPaso(parteActual ? 'checklist' : 'inicio')} className="p-2 hover:bg-slate-100 rounded-xl">
                      <ChevronRight size={16} className="rotate-180 text-slate-500" />
                    </button>
                    <p className="text-sm font-bold text-slate-900">Reportar incidencia</p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Tipo *</label>
                      <select value={incidenciaForm.tipo} onChange={e => setIncidenciaForm({ ...incidenciaForm, tipo: e.target.value })}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white">
                        <option value="">— Seleccionar —</option>
                        {['Instalaciones', 'Equipamiento', 'Personal', 'Seguridad', 'Limpieza', 'Otro'].map(t => (
                          <option key={t} value={t.toLowerCase()}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Descripción *</label>
                      <textarea value={incidenciaForm.descripcion} onChange={e => setIncidenciaForm({ ...incidenciaForm, descripcion: e.target.value })}
                        rows={4} placeholder="Describe la incidencia con detalle..." className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none" />
                    </div>
                    <label className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl cursor-pointer">
                      <input type="checkbox" checked={incidenciaForm.urgente} onChange={e => setIncidenciaForm({ ...incidenciaForm, urgente: e.target.checked })} className="rounded" />
                      <span className="text-sm font-semibold text-red-700">🚨 Urgente / requiere atención inmediata</span>
                    </label>
                    <button onClick={handleIncidencia} disabled={procesando}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl">
                      {procesando ? <Loader2 size={15} className="animate-spin" /> : <AlertTriangle size={15} />}
                      Enviar incidencia
                    </button>
                  </div>
                </>
              )}

              {/* ─── PASO RESUMEN ─── */}
              {paso === 'resumen' && parteActual && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 text-center">
                    <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-2" />
                    <p className="text-lg font-black text-emerald-800">¡Parte finalizado!</p>
                    <p className="text-sm text-emerald-600 mt-1">{centroSel?.nombre}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-slate-200">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-2xl font-black text-slate-900">{tareasHechas}</p>
                        <p className="text-[10px] text-slate-500">Tareas</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-2xl font-black text-slate-900">{fotos.length}</p>
                        <p className="text-[10px] text-slate-500">Fotos</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-2xl font-black text-slate-900">{materiales.length}</p>
                        <p className="text-[10px] text-slate-500">Materiales</p>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { setParteActual(null); setPaso('inicio'); setCentroSel(null); setFotos([]); setChecklist([]) }}
                    className="w-full py-3 bg-[#1a3c34] text-white font-bold rounded-2xl">
                    Volver al inicio
                  </button>
                </div>
              )}
            </div>

            {/* Botón incidencia flotante (cuando hay parte activo y no estás en incidencia/firma) */}
            {parteActual && !['resumen', 'inicio', 'incidencia', 'firma'].includes(paso) && (
              <div className="fixed bottom-20 right-4 z-40">
                <button onClick={() => setPaso('incidencia')}
                  className="w-12 h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-xl flex items-center justify-center">
                  <AlertTriangle size={20} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB FICHAR
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'fichar' && (
          <div className="p-4 space-y-4">

            {/* Botón grande fichar */}
            <div className={`rounded-3xl p-6 text-center shadow-lg ${fichado ? 'bg-gradient-to-br from-red-600 to-red-700' : 'bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e]'}`}>
              {fichado && horaEntrada && (
                <p className="text-white/70 text-xs mb-2">Entrada registrada a las {horaEntrada}</p>
              )}
              <button onClick={handleFichar} disabled={fichando}
                className="w-28 h-28 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 flex flex-col items-center justify-center mx-auto mb-3 transition-all disabled:opacity-50 shadow-inner">
                {fichando ? <Loader2 size={36} className="text-white animate-spin" /> :
                  fichado ? <LogOut size={36} className="text-white" /> :
                    <LogIn size={36} className="text-white" />}
              </button>
              <p className="text-white font-black text-xl">{fichado ? 'Registrar salida' : 'Registrar entrada'}</p>
              <p className="text-white/60 text-sm mt-1">{hora}</p>
              {!gps && <button onClick={obtenerGPS} className="mt-3 text-white/60 text-xs flex items-center gap-1 mx-auto hover:text-white/90"><MapPin size={11} /> Activar ubicación</button>}
              {gps && <p className="text-white/60 text-xs mt-2 flex items-center gap-1 justify-center"><MapPin size={11} /> Ubicación activa</p>}
              {gpsError && <p className="text-white/50 text-xs mt-1">{gpsError}</p>}
            </div>

            {/* Estado hoy */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1.5"><Clock size={12} /> Estado de hoy</p>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${fichado ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                  {fichado ? <CheckCircle2 size={20} className="text-emerald-600" /> : <XCircle size={20} className="text-slate-400" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{fichado ? 'En el trabajo' : 'Sin fichar'}</p>
                  {fichado && horaEntrada && <p className="text-xs text-slate-500">Entrada: {horaEntrada}</p>}
                  {estadoFichaje?.horas_hoy && <p className="text-xs text-emerald-600 font-medium">{estadoFichaje.horas_hoy}h trabajadas hoy</p>}
                </div>
              </div>
            </div>

            {/* Resumen mensual */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Timer size={12} /> Mis horas</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => { const d = new Date(anioFichaje, mesFichaje - 2); setMesFichaje(d.getMonth() + 1); setAnioFichaje(d.getFullYear()) }}
                    className="p-1 text-slate-400 hover:text-slate-600"><ChevronLeft size={14} /></button>
                  <span className="text-xs font-bold text-slate-700">{MESES[mesFichaje]} {anioFichaje}</span>
                  <button onClick={() => { const d = new Date(anioFichaje, mesFichaje); setMesFichaje(d.getMonth() + 1); setAnioFichaje(d.getFullYear()) }}
                    className="p-1 text-slate-400 hover:text-slate-600"><ChevronRight size={14} /></button>
                </div>
              </div>
              {resumenFichajes ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-slate-900">{resumenFichajes.dias_trabajados || 0}</p>
                    <p className="text-[10px] text-slate-500">Días trab.</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-emerald-700">{resumenFichajes.horas_totales || '0h'}</p>
                    <p className="text-[10px] text-slate-500">Horas</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-amber-700">{resumenFichajes.dias_ausencia || 0}</p>
                    <p className="text-[10px] text-slate-500">Ausencias</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4"><Loader2 size={18} className="animate-spin text-slate-300 mx-auto" /></div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB AUSENCIAS
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'ausencias' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">Mis ausencias</p>
              <button onClick={() => { setMostrarFormAus(true); setFormAus({}) }}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#1a3c34] text-white text-xs font-bold rounded-xl">
                <Plus size={13} /> Solicitar
              </button>
            </div>

            {mostrarFormAus && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-blue-800">Nueva solicitud</p>
                  <button onClick={() => setMostrarFormAus(false)}><X size={16} className="text-blue-600" /></button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Tipo *</label>
                    <select value={formAus.tipo || ''} onChange={(e: any) => setFormAus({ ...formAus, tipo: e.target.value })}
                      className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white">
                      <option value="">— Seleccionar —</option>
                      {tiposAusencia.map((t: any) => <option key={t.id || t} value={t.id || t}>{t.nombre || t}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Desde *</label>
                      <input type="date" value={formAus.fecha_inicio || ''} onChange={(e: any) => setFormAus({ ...formAus, fecha_inicio: e.target.value })}
                        className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Hasta *</label>
                      <input type="date" value={formAus.fecha_fin || ''} onChange={(e: any) => setFormAus({ ...formAus, fecha_fin: e.target.value })}
                        className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Motivo</label>
                    <textarea value={formAus.motivo || ''} onChange={(e: any) => setFormAus({ ...formAus, motivo: e.target.value })}
                      rows={2} placeholder="Motivo de la solicitud..." className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none" />
                  </div>
                  <button onClick={handleSolicitarAusencia} disabled={guardandoAus}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#1a3c34] disabled:bg-slate-300 text-white text-sm font-bold rounded-xl">
                    {guardandoAus ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Enviar solicitud
                  </button>
                </div>
              </div>
            )}

            {ausencias.length === 0 ? (
              <div className="text-center py-16">
                <Sun size={36} className="text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Sin ausencias registradas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ausencias.slice().reverse().map((a: any) => (
                  <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TIPOS_AUSENCIA_COLOR[a.tipo] || 'bg-slate-100 text-slate-700'}`}>
                        {a.tipo?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ESTADO_COLOR[a.estado] || 'bg-slate-100 text-slate-700'}`}>
                        {a.estado?.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{fmtDate(a.fecha_inicio)} → {fmtDate(a.fecha_fin)}</p>
                    {a.dias_habiles && <p className="text-xs text-slate-500">{a.dias_habiles} días hábiles</p>}
                    {a.motivo && <p className="text-xs text-slate-400 mt-0.5 truncate">{a.motivo}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB PRL
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'prl' && (
          <div className="p-4 space-y-4">
            <p className="text-sm font-bold text-slate-900">Mi estado PRL</p>
            {!prlData ? (
              <div className="text-center py-16"><Loader2 size={24} className="animate-spin text-slate-300 mx-auto" /></div>
            ) : (
              <>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-3">🦺 Mis EPIs ({prlData.epis.length})</p>
                  {prlData.epis.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">Sin EPIs registrados</p>
                  ) : (
                    <div className="space-y-2">
                      {prlData.epis.map((e: any) => (
                        <div key={e.id} className={`flex items-center justify-between p-3 rounded-xl ${e.alerta === 'caducado' ? 'bg-red-50' : e.alerta ? 'bg-amber-50' : 'bg-slate-50'}`}>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{e.tipo}</p>
                            <p className="text-xs text-slate-500">{e.descripcion}</p>
                          </div>
                          <div className="text-right">
                            {e.fecha_caducidad && (
                              <p className={`text-[10px] font-bold ${e.alerta === 'caducado' ? 'text-red-600' : e.alerta ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {e.alerta === 'caducado' ? '⚠️ CADUCADO' : 'Cad: ' + fmtDate(e.fecha_caducidad)}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-400">{fmtDate(e.fecha_entrega)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-3">🏥 Reconocimientos médicos ({prlData.recos.length})</p>
                  {prlData.recos.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">Sin reconocimientos registrados</p>
                  ) : (
                    <div className="space-y-2">
                      {prlData.recos.map((r: any) => (
                        <div key={r.id} className={`p-3 rounded-xl ${r.alerta ? 'bg-amber-50' : 'bg-slate-50'}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{r.tipo}</p>
                              <p className="text-xs text-slate-500">{fmtDate(r.fecha)}</p>
                            </div>
                            <div className="text-right">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.apto === 'Apto' ? 'bg-emerald-100 text-emerald-700' : r.apto === 'No apto' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                {r.apto || '—'}
                              </span>
                              {r.fecha_proximo && <p className="text-[10px] text-slate-400 mt-0.5">Próx: {fmtDate(r.fecha_proximo)}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB MI FICHA
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'perfil' && (
          <div className="p-4 space-y-4">
            <p className="text-sm font-bold text-slate-900">Mi ficha</p>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-full bg-[#1a3c34] flex items-center justify-center text-white text-2xl font-black">
                  {(empleado.nombre || '?')[0]}{(empleado.apellidos || '')[0]}
                </div>
                <div>
                  <p className="text-base font-black text-slate-900">{empleado.nombre} {empleado.apellidos}</p>
                  <p className="text-sm text-slate-500">{empleado.categoria || 'Sin categoría'}</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'DNI/NIE', valor: empleado.dni },
                  { label: 'NSS', valor: empleado.nss },
                  { label: 'Centro', valor: empleado.centro },
                  { label: 'Teléfono', valor: empleado.telefono },
                  { label: 'Email', valor: empleado.email },
                  { label: 'Tipo contrato', valor: empleado.tipo_contrato },
                  { label: 'Fecha alta', valor: fmtDate(empleado.fecha_alta) },
                  { label: 'Convenio', valor: empleado.convenio },
                ].filter(f => f.valor).map((f, i) => (
                  <div key={i} className="flex items-start justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="text-xs text-slate-500 font-medium">{f.label}</span>
                    <span className="text-sm text-slate-900 font-semibold text-right ml-4">{f.valor}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#1a3c34]/5 border border-[#1a3c34]/20 rounded-2xl p-4">
              <p className="text-xs font-bold text-[#1a3c34] mb-1">¿Necesitas ayuda?</p>
              <p className="text-xs text-slate-600">Contacta con RRHH para consultas sobre tu ficha, nómina o contrato.</p>
            </div>
          </div>
        )}
      </div>

      {/* ── BARRA NAVEGACIÓN INFERIOR ──────────────────────────────────────── */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 flex z-30">
        {[
          { id: 'tareas', label: 'Tareas', icon: ClipboardList },
          { id: 'fichar', label: 'Fichar', icon: Timer },
          { id: 'ausencias', label: 'Ausencias', icon: Calendar },
          { id: 'prl', label: 'PRL', icon: Shield },
          { id: 'perfil', label: 'Mi ficha', icon: User },
        ].map((t: any) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-colors ${tab === t.id ? 'text-[#1a3c34]' : 'text-slate-400'}`}>
            <t.icon size={19} strokeWidth={tab === t.id ? 2.5 : 1.5} />
            {t.label}
            {/* Badge: punto rojo si hay parte activo en tareas */}
            {t.id === 'tareas' && parteActual && tab !== 'tareas' && (
              <span className="absolute mt-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}