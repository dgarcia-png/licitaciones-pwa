import { useState, useEffect, useRef } from 'react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  LogIn, LogOut, Clock, MapPin, Calendar, User, Shield,
  Loader2, CheckCircle2, XCircle, AlertTriangle, Plus,
  ChevronLeft, ChevronRight, Sun, Stethoscope, Save, X,
  FileText, Bell, Home
} from 'lucide-react'

function fmtDate(d: any) {
  if (!d) return ''
  try { const dt = new Date(d); if (isNaN(dt.getTime())) return String(d); return dt.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return String(d) }
}
function fmtHora(d: any) {
  if (!d) return ''
  try { const dt = new Date(d); if (isNaN(dt.getTime())) return String(d); return dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) } catch { return String(d) }
}

const TIPOS_AUSENCIA_COLOR: Record<string, string> = {
  vacaciones: 'bg-blue-100 text-blue-700',
  baja_medica: 'bg-red-100 text-red-700',
  asuntos_propios: 'bg-purple-100 text-purple-700',
  permiso: 'bg-amber-100 text-amber-700',
}
const ESTADO_COLOR: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  aprobada:  'bg-emerald-100 text-emerald-700',
  rechazada: 'bg-red-100 text-red-700',
}

export default function PortalEmpleadoPage() {
  const { usuario } = useAuth()
  const [tab, setTab] = useState<'inicio' | 'ausencias' | 'prl' | 'perfil'>('inicio')
  const [cargando, setCargando] = useState(true)
  const [empInfo, setEmpInfo] = useState<any>(null)
  const [estado, setEstado] = useState<any>(null)
  const [fichando, setFichando] = useState(false)
  const [gps, setGps] = useState<{lat: number, lng: number} | null>(null)
  const [gpsError, setGpsError] = useState('')
  const [msg, setMsg] = useState<{texto: string, tipo: 'ok' | 'err'} | null>(null)
  const [horaActual, setHoraActual] = useState(new Date().toLocaleTimeString('es-ES'))
  const [ausencias, setAusencias] = useState<any[]>([])
  const [tipos, setTipos] = useState<any[]>([])
  const [prlData, setPrlData] = useState<any>(null)
  const [mostrarFormAus, setMostrarFormAus] = useState(false)
  const [guardandoAus, setGuardandoAus] = useState(false)
  const [formAus, setFormAus] = useState<any>({})
  const [resumen, setResumen] = useState<any>(null)
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  const showMsg = (texto: string, tipo: 'ok' | 'err' = 'ok') => {
    setMsg({ texto, tipo }); setTimeout(() => setMsg(null), 4000)
  }

  // Reloj en tiempo real
  useEffect(() => {
    const t = setInterval(() => setHoraActual(new Date().toLocaleTimeString('es-ES')), 1000)
    return () => clearInterval(t)
  }, [])

  // Carga inicial: buscar el empleado por email del usuario
  const cargar = async () => {
    setCargando(true)
    try {
      const data = await api.empleados()
      const emps: any[] = data.empleados || []
      const emp = emps.find((e: any) => e.email === usuario?.email || e.id === (usuario as any)?.id_empleado)
      if (emp) {
        setEmpInfo(emp)
        // Cargar estado fichaje y ausencias en paralelo
        const [est, aus] = await Promise.all([
          api.estadoFichaje(emp.id),
          api.ausencias({ id_empleado: emp.id })
        ])
        setEstado(est)
        setAusencias(aus.ausencias || [])
        setTipos(aus.tipos || [])
      }
    } catch (e: any) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  // Cargar PRL cuando se entra en esa tab
  useEffect(() => {
    if (tab === 'prl' && empInfo && !prlData) {
      Promise.all([api.prlEpis(empInfo.dni), api.prlReconocimientos(empInfo.dni)])
        .then(([epis, recos]) => setPrlData({ epis: epis.epis || [], recos: recos.reconocimientos || [] }))
        .catch(() => {})
    }
  }, [tab, empInfo])

  // Cargar resumen mensual fichajes
  useEffect(() => {
    if (tab === 'inicio' && empInfo) {
      api.resumenDiarioFichajes(empInfo.id, String(mes), String(anio))
        .then((d: any) => setResumen(d))
        .catch(() => {})
    }
  }, [tab, empInfo, mes, anio])

  // GPS
  const obtenerGPS = () => {
    setGpsError('')
    if (!navigator.geolocation) { setGpsError('GPS no disponible'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGpsError('No se pudo obtener la ubicación')
    )
  }

  // Fichar entrada/salida
  const handleFichar = async () => {
    if (!empInfo) return
    setFichando(true)
    try {
      const accion = estado?.estado === 'fichado' ? 'salida' : 'entrada'
      const r = await api.fichar({ id_empleado: empInfo.id, tipo: accion, lat: gps?.lat, lng: gps?.lng })
      if (r.ok) {
        showMsg(accion === 'entrada' ? '✅ Entrada registrada' : '✅ Salida registrada')
        const est = await api.estadoFichaje(empInfo.id)
        setEstado(est)
      } else showMsg(r.error || 'Error al fichar', 'err')
    } catch (e: any) { showMsg('Error de conexión', 'err') }
    finally { setFichando(false) }
  }

  // Solicitar ausencia
  const handleSolicitarAusencia = async () => {
    if (!formAus.tipo || !formAus.fecha_inicio || !formAus.fecha_fin) { showMsg('Rellena todos los campos', 'err'); return }
    setGuardandoAus(true)
    try {
      const r = await api.solicitarAusencia({
        ...formAus,
        id_empleado: empInfo?.id,
        nombre_empleado: (empInfo?.nombre || '') + ' ' + (empInfo?.apellidos || ''),
        dni: empInfo?.dni
      })
      if (r.ok) {
        showMsg('✅ Solicitud enviada')
        setMostrarFormAus(false)
        setFormAus({})
        const aus = await api.ausencias({ id_empleado: empInfo?.id })
        setAusencias(aus.ausencias || [])
      } else showMsg(r.error || 'Error', 'err')
    } catch (e: any) { showMsg('Error de conexión', 'err') }
    finally { setGuardandoAus(false) }
  }

  if (cargando) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <Loader2 size={32} className="text-[#1a3c34] animate-spin mb-3" />
      <p className="text-slate-500 text-sm">Cargando tu portal...</p>
    </div>
  )

  if (!empInfo) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-8 text-center">
      <AlertTriangle size={40} className="text-amber-500 mb-3" />
      <p className="text-slate-700 font-bold">Tu usuario no está vinculado a ningún empleado</p>
      <p className="text-sm text-slate-500 mt-1">Contacta con RRHH para que configuren tu acceso</p>
    </div>
  )

  const fichado = estado?.estado === 'fichado'
  const horaEntrada = estado?.ultima_entrada ? fmtHora(estado.ultima_entrada) : null

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto">

      {/* Notificación flotante */}
      {msg && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-bold ${msg.tipo === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {msg.texto}
        </div>
      )}

      {/* ── CABECERA ─────────────────────────────────────── */}
      <div className="bg-[#1a3c34] text-white px-5 pt-10 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-white/60 font-medium">Bienvenido/a</p>
            <p className="text-lg font-bold">{empInfo.nombre} {empInfo.apellidos}</p>
            <p className="text-xs text-white/60">{empInfo.centro || 'Sin centro asignado'} · {empInfo.categoria || ''}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-lg font-black">
            {(empInfo.nombre || '?')[0]}{(empInfo.apellidos || '')[0]}
          </div>
        </div>
        {/* Reloj */}
        <div className="text-3xl font-black tabular-nums">{horaActual}</div>
        <div className="text-xs text-white/60 mt-0.5">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      </div>

      {/* ── CONTENIDO SEGÚN TAB ──────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-24">

        {/* ══ INICIO ══ */}
        {tab === 'inicio' && (
          <div className="p-4 space-y-4">

            {/* Botón fichar */}
            <div className={`rounded-3xl p-6 text-center shadow-lg ${fichado ? 'bg-gradient-to-br from-emerald-600 to-emerald-700' : 'bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e]'}`}>
              {fichado && horaEntrada && (
                <p className="text-white/70 text-xs mb-2">Entrada registrada a las {horaEntrada}</p>
              )}
              <button onClick={handleFichar} disabled={fichando}
                className="w-24 h-24 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 flex flex-col items-center justify-center mx-auto mb-3 transition-all disabled:opacity-50 shadow-inner">
                {fichando ? <Loader2 size={32} className="text-white animate-spin" /> : fichado ? <LogOut size={32} className="text-white" /> : <LogIn size={32} className="text-white" />}
              </button>
              <p className="text-white font-black text-lg">{fichado ? 'Registrar salida' : 'Registrar entrada'}</p>
              {!gps && <button onClick={obtenerGPS} className="mt-2 text-white/60 text-xs flex items-center gap-1 mx-auto hover:text-white/90"><MapPin size={11} /> Activar ubicación</button>}
              {gps && <p className="text-white/60 text-xs mt-1 flex items-center gap-1 justify-center"><MapPin size={11} /> Ubicación activa</p>}
              {gpsError && <p className="text-white/50 text-xs mt-1">{gpsError}</p>}
            </div>

            {/* Estado actual */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1.5"><Clock size={12} />Estado de hoy</p>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${fichado ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                  {fichado ? <CheckCircle2 size={20} className="text-emerald-600" /> : <XCircle size={20} className="text-slate-400" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{fichado ? 'En el trabajo' : 'Sin fichar'}</p>
                  {fichado && horaEntrada && <p className="text-xs text-slate-500">Entrada: {horaEntrada}</p>}
                  {estado?.horas_hoy && <p className="text-xs text-emerald-600 font-medium">{estado.horas_hoy}h trabajadas hoy</p>}
                </div>
              </div>
            </div>

            {/* Resumen mensual fichajes */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Calendar size={12} />Mis horas</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => { const d = new Date(anio, mes - 2); setMes(d.getMonth() + 1); setAnio(d.getFullYear()) }} className="p-1 text-slate-400 hover:text-slate-600"><ChevronLeft size={14} /></button>
                  <span className="text-xs font-bold text-slate-700">{MESES[mes]} {anio}</span>
                  <button onClick={() => { const d = new Date(anio, mes); setMes(d.getMonth() + 1); setAnio(d.getFullYear()) }} className="p-1 text-slate-400 hover:text-slate-600"><ChevronRight size={14} /></button>
                </div>
              </div>
              {resumen ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-slate-900">{resumen.dias_trabajados || 0}</p>
                    <p className="text-[10px] text-slate-500">Días trab.</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-emerald-700">{resumen.horas_totales || '0h'}</p>
                    <p className="text-[10px] text-slate-500">Horas total</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-amber-700">{resumen.dias_ausencia || 0}</p>
                    <p className="text-[10px] text-slate-500">Ausencias</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4"><Loader2 size={18} className="animate-spin text-slate-300 mx-auto" /></div>
              )}
            </div>
          </div>
        )}

        {/* ══ AUSENCIAS ══ */}
        {tab === 'ausencias' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">Mis ausencias</p>
              <button onClick={() => { setMostrarFormAus(true); setFormAus({}) }}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#1a3c34] text-white text-xs font-bold rounded-xl">
                <Plus size={13} /> Solicitar
              </button>
            </div>

            {/* Formulario solicitud */}
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
                      {tipos.map((t: any) => <option key={t.id || t} value={t.id || t}>{t.nombre || t}</option>)}
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
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#1a3c34] hover:bg-[#2d5a4e] disabled:bg-slate-300 text-white text-sm font-bold rounded-xl">
                    {guardandoAus ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Enviar solicitud
                  </button>
                </div>
              </div>
            )}

            {/* Lista ausencias */}
            {ausencias.length === 0 ? (
              <div className="text-center py-12">
                <Sun size={36} className="text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Sin ausencias registradas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ausencias.slice().reverse().map((a: any) => (
                  <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TIPOS_AUSENCIA_COLOR[a.tipo] || 'bg-slate-100 text-slate-700'}`}>{a.tipo?.replace(/_/g, ' ').toUpperCase()}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ESTADO_COLOR[a.estado] || 'bg-slate-100 text-slate-700'}`}>{a.estado?.toUpperCase()}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-900">{fmtDate(a.fecha_inicio)} → {fmtDate(a.fecha_fin)}</p>
                        {a.dias_habiles && <p className="text-xs text-slate-500">{a.dias_habiles} días hábiles</p>}
                        {a.motivo && <p className="text-xs text-slate-400 mt-0.5 truncate">{a.motivo}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ PRL ══ */}
        {tab === 'prl' && (
          <div className="p-4 space-y-4">
            <p className="text-sm font-bold text-slate-900">Mi estado PRL</p>
            {!prlData ? (
              <div className="text-center py-12"><Loader2 size={24} className="animate-spin text-slate-300 mx-auto" /></div>
            ) : (
              <>
                {/* EPIs */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1.5">
                    🦺 Mis EPIs ({prlData.epis.length})
                  </p>
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

                {/* Reconocimientos */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1.5">
                    🏥 Reconocimientos médicos ({prlData.recos.length})
                  </p>
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

        {/* ══ PERFIL ══ */}
        {tab === 'perfil' && (
          <div className="p-4 space-y-4">
            <p className="text-sm font-bold text-slate-900">Mi ficha</p>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-full bg-[#1a3c34] flex items-center justify-center text-white text-2xl font-black">
                  {(empInfo.nombre || '?')[0]}{(empInfo.apellidos || '')[0]}
                </div>
                <div>
                  <p className="text-base font-black text-slate-900">{empInfo.nombre} {empInfo.apellidos}</p>
                  <p className="text-sm text-slate-500">{empInfo.categoria || 'Sin categoría'}</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'DNI/NIE',       valor: empInfo.dni },
                  { label: 'NSS',            valor: empInfo.nss },
                  { label: 'Centro',         valor: empInfo.centro },
                  { label: 'Teléfono',       valor: empInfo.telefono },
                  { label: 'Email',          valor: empInfo.email },
                  { label: 'Tipo contrato',  valor: empInfo.tipo_contrato },
                  { label: 'Fecha alta',     valor: fmtDate(empInfo.fecha_alta) },
                  { label: 'Convenio',       valor: empInfo.convenio },
                ].filter(f => f.valor).map((f, i) => (
                  <div key={i} className="flex items-start justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="text-xs text-slate-500 font-medium">{f.label}</span>
                    <span className="text-sm text-slate-900 font-semibold text-right ml-4">{f.valor}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contacto RRHH */}
            <div className="bg-[#1a3c34]/5 border border-[#1a3c34]/20 rounded-2xl p-4">
              <p className="text-xs font-bold text-[#1a3c34] mb-1">¿Necesitas ayuda?</p>
              <p className="text-xs text-slate-600">Contacta con RRHH para cualquier consulta sobre tu ficha, nómina o contrato.</p>
            </div>
          </div>
        )}
      </div>

      {/* ── BARRA NAVEGACIÓN INFERIOR ────────────────────── */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 flex">
        {[
          { id: 'inicio',    label: 'Inicio',    icon: Home },
          { id: 'ausencias', label: 'Ausencias', icon: Calendar },
          { id: 'prl',       label: 'PRL',       icon: Shield },
          { id: 'perfil',    label: 'Mi ficha',  icon: User },
        ].map((t: any) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-colors ${tab === t.id ? 'text-[#1a3c34]' : 'text-slate-400'}`}>
            <t.icon size={20} strokeWidth={tab === t.id ? 2.5 : 1.5} />
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}