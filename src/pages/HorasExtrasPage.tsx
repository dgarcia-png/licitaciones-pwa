// src/pages/HorasExtrasPage.tsx
// Gestión completa de horas extras — art. 35 ET
// Límite: 80h/año. Compensación: pago o descanso.
import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { usePermisos } from '../hooks/usePermisos'
import ConfirmModal from '../components/ConfirmModal'
import { SkeletonPage } from '../components/Skeleton'
import {
  Clock, Euro, BedDouble, AlertTriangle, CheckCircle2,
  XCircle, RefreshCw, ChevronLeft, ChevronRight,
  Users, Loader2, Filter, Download
} from 'lucide-react'

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:   { label: 'Pendiente',  color: 'text-amber-700',   bg: 'bg-amber-100' },
  aprobada:    { label: 'Aprobada',   color: 'text-emerald-700', bg: 'bg-emerald-100' },
  rechazada:   { label: 'Rechazada',  color: 'text-red-700',     bg: 'bg-red-100' },
  compensada:  { label: 'Compensada', color: 'text-slate-600',   bg: 'bg-slate-100' },
}

const TIPO_CONFIG: Record<string, { label: string; color: string }> = {
  estructural:   { label: 'Estructural',   color: 'text-purple-700' },
  fuerza_mayor:  { label: 'Festivo/FM',    color: 'text-blue-700' },
  voluntaria:    { label: 'Voluntaria',    color: 'text-slate-600' },
}

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const LIMITE_ANUAL = 80
const UMBRAL_ALERTA = 60  // aviso cuando supera 60h

function BarraLimite({ horas, max = LIMITE_ANUAL }: { horas: number; max?: number }) {
  const pct = Math.min(100, (horas / max) * 100)
  const color = horas >= max ? 'bg-red-500'
    : horas >= UMBRAL_ALERTA ? 'bg-amber-500'
    : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: pct + '%' }} />
      </div>
      <span className={`text-[11px] font-bold shrink-0 ${horas >= max ? 'text-red-600' : horas >= UMBRAL_ALERTA ? 'text-amber-600' : 'text-slate-500'}`}>
        {horas.toFixed(1)}h / {max}h
      </span>
    </div>
  )
}

export default function HorasExtrasPage() {
  const { esAdmin, esSupervisor, soloSusDatos, usuario } = usePermisos()
  const esSuperOrAdmin = esAdmin || esSupervisor

  const [horasExtra, setHorasExtra] = useState<any[]>([])
  const [empleados, setEmpleados] = useState<any[]>([])
  const [statsAnuales, setStatsAnuales] = useState<Record<string, any>>({})
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  // Filtros
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [filtroEmpleado, setFiltroEmpleado] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [tab, setTab] = useState<'pendientes' | 'historial' | 'empleados'>('pendientes')

  // Modal aprobación
  const [confirmAprobar, setConfirmAprobar] = useState<{ he: any; compensacion: string } | null>(null)
  const [confirmRechazar, setConfirmRechazar] = useState<any>(null)

  const showMsg = (m: string, err = false) => {
    if (err) setError(m); else setMsg(m)
    setTimeout(() => { setMsg(''); setError('') }, 4000)
  }

  const cargar = async () => {
    setCargando(true)
    try {
      const [heData, empData] = await Promise.all([
        (api as any).horasExtra({}),
        api.empleados()
      ])
      const todas: any[] = heData.horas_extra || []
      setHorasExtra(todas)
      setEmpleados((empData.empleados || []).filter((e: any) => e.estado === 'activo'))

      // Calcular stats anuales por empleado
      const anioStr = anio.toString()
      const stats: Record<string, any> = {}
      todas.forEach((he: any) => {
        if (!he.fecha?.startsWith(anioStr)) return
        const id = he.empleado_id
        if (!stats[id]) stats[id] = { nombre: he.nombre, total: 0, pendiente: 0, pago: 0, descanso: 0, rechazada: 0 }
        const h = he.horas_extra || 0
        stats[id].total += h
        if (he.estado === 'pendiente') stats[id].pendiente += h
        else if (he.estado === 'aprobada' && he.compensacion === 'pago') stats[id].pago += h
        else if (he.estado === 'aprobada' && he.compensacion === 'descanso') stats[id].descanso += h
        else if (he.estado === 'rechazada') stats[id].rechazada += h
      })
      setStatsAnuales(stats)
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [anio])

  const handleAprobar = async (he: any, compensacion: string) => {
    setGuardando(true)
    try {
      const r = await api.aprobarHorasExtra({ id: he.id, estado: 'aprobada', compensacion, aprobado_por: usuario?.nombre || 'Supervisor' })
      if (r.ok) {
        setHorasExtra(prev => prev.map(h => h.id === he.id ? { ...h, estado: 'aprobada', compensacion } : h))
        showMsg(`✅ Aprobadas — compensación por ${compensacion === 'pago' ? 'pago' : 'descanso'}`)
        // Recalcular stats
        await cargar()
      } else showMsg(r.error || 'Error', true)
    } catch { showMsg('Error', true) }
    finally { setGuardando(false); setConfirmAprobar(null) }
  }

  const handleRechazar = async (he: any) => {
    setGuardando(true)
    try {
      const r = await api.aprobarHorasExtra({ id: he.id, estado: 'rechazada', aprobado_por: usuario?.nombre || 'Supervisor' })
      if (r.ok) {
        setHorasExtra(prev => prev.map(h => h.id === he.id ? { ...h, estado: 'rechazada' } : h))
        showMsg('Horas extra rechazadas')
        await cargar()
      }
    } catch { showMsg('Error', true) }
    finally { setGuardando(false); setConfirmRechazar(null) }
  }

  // Filtrar para vista historial
  const mesStr = `${anio}-${mes.toString().padStart(2, '0')}`
  const filtradas = horasExtra.filter(he => {
    if (tab === 'pendientes' && he.estado !== 'pendiente') return false
    if (tab === 'historial') {
      if (he.fecha?.substring(0, 7) !== mesStr) return false
      if (filtroEmpleado && he.empleado_id !== filtroEmpleado) return false
      if (filtroEstado && he.estado !== filtroEstado) return false
    }
    if (soloSusDatos) {
      const miEmp = empleados.find(e => e.email === usuario?.email)
      if (miEmp && he.empleado_id !== miEmp.id) return false
    }
    return true
  })

  // KPIs globales del año
  const anioStr = anio.toString()
  const heAnio = horasExtra.filter(he => he.fecha?.startsWith(anioStr))
  const totalPendientes = horasExtra.filter(he => he.estado === 'pendiente').length
  const totalHorasAnio = heAnio.reduce((s, he) => s + (he.horas_extra || 0), 0)
  const totalPago = heAnio.filter(he => he.estado === 'aprobada' && he.compensacion === 'pago').reduce((s, he) => s + (he.horas_extra || 0), 0)
  const totalDescanso = heAnio.filter(he => he.estado === 'aprobada' && he.compensacion === 'descanso').reduce((s, he) => s + (he.horas_extra || 0), 0)
  const empleadosAlerta = Object.entries(statsAnuales).filter(([, s]: any) => s.total >= UMBRAL_ALERTA)

  const exportarCSV = () => {
    const rows = [
      ['ID', 'Empleado', 'Fecha', 'Horas', 'Tipo', 'Estado', 'Compensación', 'Aprobado por'].join(';'),
      ...filtradas.map(he => [
        he.id, he.nombre, he.fecha, (he.horas_extra || 0).toFixed(2),
        he.tipo, he.estado, he.compensacion || '', he.aprobado_por || ''
      ].join(';'))
    ]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `horas_extra_${mesStr}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (cargando) return <div className="p-6 lg:p-8"><SkeletonPage /></div>

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <ConfirmModal
        open={!!confirmAprobar}
        titulo={`¿Aprobar horas extra por ${confirmAprobar?.compensacion === 'pago' ? '💶 pago' : '😴 descanso'}?`}
        mensaje={`${confirmAprobar?.he?.nombre} — ${(confirmAprobar?.he?.horas_extra || 0).toFixed(2)}h el ${confirmAprobar?.he?.fecha}. Se registrará como compensadas por ${confirmAprobar?.compensacion}.`}
        labelOk="Sí, aprobar" cargando={guardando}
        onConfirm={() => confirmAprobar && handleAprobar(confirmAprobar.he, confirmAprobar.compensacion)}
        onCancel={() => setConfirmAprobar(null)}
      />
      <ConfirmModal
        open={!!confirmRechazar}
        titulo="¿Rechazar estas horas extra?"
        mensaje={`${confirmRechazar?.nombre} — ${(confirmRechazar?.horas_extra || 0).toFixed(2)}h el ${confirmRechazar?.fecha}. Quedarán marcadas como rechazadas.`}
        labelOk="Sí, rechazar" peligroso cargando={guardando}
        onConfirm={() => confirmRechazar && handleRechazar(confirmRechazar)}
        onCancel={() => setConfirmRechazar(null)}
      />

      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl shadow-lg">
            <Clock size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Horas extras</h1>
            <p className="text-sm text-slate-500">
              Límite legal: {LIMITE_ANUAL}h/año · Art. 35 ET
              {totalPendientes > 0 && <span className="ml-2 text-amber-600 font-bold">{totalPendientes} pendientes de aprobar</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl">
            <RefreshCw size={16} />
          </button>
          {/* Selector de año */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2">
            <button onClick={() => setAnio(a => a - 1)} className="p-1.5 hover:bg-slate-100 rounded-lg"><ChevronLeft size={14} /></button>
            <span className="text-sm font-semibold px-1">{anio}</span>
            <button onClick={() => setAnio(a => a + 1)} className="p-1.5 hover:bg-slate-100 rounded-lg"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {msg && <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-emerald-800 text-sm"><CheckCircle2 size={15} />{msg}</div>}
      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-red-800 text-sm"><AlertTriangle size={15} />{error}</div>}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total este año', valor: totalHorasAnio.toFixed(1) + 'h', icon: Clock, color: 'text-slate-800', bg: 'bg-slate-50' },
          { label: 'Pendientes', valor: String(totalPendientes), icon: AlertTriangle, color: totalPendientes > 0 ? 'text-amber-700' : 'text-slate-500', bg: totalPendientes > 0 ? 'bg-amber-50' : 'bg-slate-50' },
          { label: 'Aprobadas · pago', valor: totalPago.toFixed(1) + 'h', icon: Euro, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Aprobadas · descanso', valor: totalDescanso.toFixed(1) + 'h', icon: BedDouble, color: 'text-blue-700', bg: 'bg-blue-50' },
        ].map((k, i) => (
          <div key={i} className={`${k.bg} rounded-2xl p-4 border border-slate-200`}>
            <div className="flex items-center gap-2 mb-1">
              <k.icon size={14} className={k.color} />
              <span className="text-xs text-slate-500">{k.label}</span>
            </div>
            <p className={`text-2xl font-black ${k.color}`}>{k.valor}</p>
          </div>
        ))}
      </div>

      {/* Alerta empleados cerca del límite */}
      {esSuperOrAdmin && empleadosAlerta.length > 0 && (
        <div className={`border-2 rounded-2xl p-4 mb-5 ${empleadosAlerta.some(([, s]: any) => s.total >= LIMITE_ANUAL) ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
            <AlertTriangle size={15} className={empleadosAlerta.some(([, s]: any) => s.total >= LIMITE_ANUAL) ? 'text-red-600' : 'text-amber-600'} />
            {empleadosAlerta.length} empleado{empleadosAlerta.length !== 1 ? 's' : ''} cerca o en el límite legal de {LIMITE_ANUAL}h/año
          </p>
          <div className="space-y-2">
            {empleadosAlerta.map(([id, s]: any) => (
              <div key={id} className="bg-white rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-800">{s.nombre}</span>
                  {s.total >= LIMITE_ANUAL && (
                    <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">LÍMITE ALCANZADO</span>
                  )}
                </div>
                <BarraLimite horas={s.total} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
        {([
          { key: 'pendientes', label: `Pendientes${totalPendientes > 0 ? ` (${totalPendientes})` : ''}` },
          { key: 'historial',  label: 'Historial' },
          { key: 'empleados',  label: 'Por empleado' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB: PENDIENTES ═══ */}
      {tab === 'pendientes' && (
        <div>
          {filtradas.length === 0 ? (
            <div className="flex flex-col items-center py-16 bg-white border border-slate-200 rounded-2xl">
              <CheckCircle2 size={36} className="text-emerald-300 mb-3" />
              <p className="text-slate-500 font-medium">Sin horas extra pendientes</p>
              <p className="text-sm text-slate-400 mt-1">Todas las horas extra están gestionadas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtradas.map(he => (
                <div key={he.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-sm font-bold text-slate-900">{he.nombre}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${TIPO_CONFIG[he.tipo]?.color || 'text-slate-600'} bg-slate-100`}>
                          {TIPO_CONFIG[he.tipo]?.label || he.tipo}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>📅 {he.fecha}</span>
                        <span className="font-bold text-purple-700">+{(he.horas_extra || 0).toFixed(2)}h extra</span>
                        {statsAnuales[he.empleado_id] && (
                          <span className={statsAnuales[he.empleado_id].total >= LIMITE_ANUAL ? 'text-red-600 font-bold' : 'text-slate-400'}>
                            ({statsAnuales[he.empleado_id].total.toFixed(1)}h/{LIMITE_ANUAL}h este año)
                          </span>
                        )}
                      </div>
                    </div>
                    {esSuperOrAdmin && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setConfirmAprobar({ he, compensacion: 'pago' })}
                          disabled={guardando}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl">
                          <Euro size={12} /> Pago
                        </button>
                        <button
                          onClick={() => setConfirmAprobar({ he, compensacion: 'descanso' })}
                          disabled={guardando}
                          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl">
                          <BedDouble size={12} /> Descanso
                        </button>
                        <button
                          onClick={() => setConfirmRechazar(he)}
                          disabled={guardando}
                          className="p-2 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl">
                          <XCircle size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: HISTORIAL ═══ */}
      {tab === 'historial' && (
        <div>
          {/* Filtros */}
          <div className="flex flex-wrap gap-3 mb-4">
            {/* Mes */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2">
              <button onClick={() => { if (mes === 1) { setMes(12); setAnio(a => a - 1) } else setMes(m => m - 1) }} className="p-1.5 hover:bg-slate-100 rounded-lg"><ChevronLeft size={14} /></button>
              <span className="text-sm font-semibold px-1">{MESES[mes]}</span>
              <button onClick={() => { if (mes === 12) { setMes(1); setAnio(a => a + 1) } else setMes(m => m + 1) }} className="p-1.5 hover:bg-slate-100 rounded-lg"><ChevronRight size={14} /></button>
            </div>
            {/* Empleado */}
            {esSuperOrAdmin && (
              <select value={filtroEmpleado} onChange={e => setFiltroEmpleado(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">Todos los empleados</option>
                {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>)}
              </select>
            )}
            {/* Estado */}
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
              <option value="">Todos los estados</option>
              {Object.entries(ESTADO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button onClick={exportarCSV}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-xl">
              <Download size={14} /> Exportar CSV
            </button>
          </div>

          {filtradas.length === 0 ? (
            <div className="flex flex-col items-center py-16 bg-white border border-slate-200 rounded-2xl">
              <Filter size={32} className="text-slate-300 mb-3" />
              <p className="text-slate-500">Sin registros para este filtro</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Empleado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Fecha</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Horas</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Tipo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Compensación</th>
                    {esSuperOrAdmin && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((he, i) => {
                    const est = ESTADO_CONFIG[he.estado] || ESTADO_CONFIG.pendiente
                    return (
                      <tr key={he.id} className={`border-b border-slate-100 hover:bg-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                        <td className="px-4 py-3 font-medium text-slate-800">{he.nombre}</td>
                        <td className="px-4 py-3 text-slate-500">{he.fecha}</td>
                        <td className="px-4 py-3 text-right font-bold text-purple-700">+{(he.horas_extra || 0).toFixed(2)}h</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold ${TIPO_CONFIG[he.tipo]?.color || 'text-slate-500'}`}>
                            {TIPO_CONFIG[he.tipo]?.label || he.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${est.bg} ${est.color}`}>
                            {est.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {he.compensacion === 'pago' ? '💶 Pago' : he.compensacion === 'descanso' ? '😴 Descanso' : '—'}
                        </td>
                        {esSuperOrAdmin && he.estado === 'pendiente' && (
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => setConfirmAprobar({ he, compensacion: 'pago' })} className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg hover:bg-emerald-200">💶</button>
                              <button onClick={() => setConfirmAprobar({ he, compensacion: 'descanso' })} className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-lg hover:bg-blue-200">😴</button>
                              <button onClick={() => setConfirmRechazar(he)} className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg hover:bg-red-100 hover:text-red-600">✕</button>
                            </div>
                          </td>
                        )}
                        {esSuperOrAdmin && he.estado !== 'pendiente' && <td />}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 text-right">
                {filtradas.length} registros · {filtradas.reduce((s, he) => s + (he.horas_extra || 0), 0).toFixed(2)}h total
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: POR EMPLEADO ═══ */}
      {tab === 'empleados' && (
        <div className="space-y-3">
          {Object.keys(statsAnuales).length === 0 ? (
            <div className="flex flex-col items-center py-16 bg-white border border-slate-200 rounded-2xl">
              <Users size={36} className="text-slate-300 mb-3" />
              <p className="text-slate-500">Sin horas extra registradas en {anio}</p>
            </div>
          ) : (
            Object.entries(statsAnuales)
              .sort(([, a]: any, [, b]: any) => b.total - a.total)
              .map(([id, s]: any) => (
                <div key={id} className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm">
                        {s.nombre[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{s.nombre}</p>
                        <p className="text-xs text-slate-400">Año {anio}</p>
                      </div>
                    </div>
                    {s.total >= LIMITE_ANUAL && (
                      <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded-full">⚠️ Límite alcanzado</span>
                    )}
                  </div>
                  <BarraLimite horas={s.total} />
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[
                      { label: 'Pendiente', valor: s.pendiente.toFixed(1) + 'h', color: 'text-amber-700' },
                      { label: 'Pago', valor: s.pago.toFixed(1) + 'h', color: 'text-emerald-700' },
                      { label: 'Descanso', valor: s.descanso.toFixed(1) + 'h', color: 'text-blue-700' },
                      { label: 'Rechazada', valor: s.rechazada.toFixed(1) + 'h', color: 'text-slate-400' },
                    ].map((item, i) => (
                      <div key={i} className="text-center bg-slate-50 rounded-xl p-2">
                        <p className={`text-sm font-black ${item.color}`}>{item.valor}</p>
                        <p className="text-[10px] text-slate-400">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  )
}
