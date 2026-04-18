// src/pages/HorasExtrasPage.tsx — ACTUALIZADO 6/04/2026
// [6/04] Bloque 7: Mejoras completas
//   - Recharts BarChart mensual + LineChart acumulado anual
//   - Aprobación masiva con checkboxes
//   - Excel export (SheetJS)
//   - Coste estimado de horas extra
import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { usePermisos } from '../hooks/usePermisos'
import { SkeletonPage } from '../components/Skeleton'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'
import {
  Clock, Euro, BedDouble, AlertTriangle, CheckCircle2,
  XCircle, RefreshCw, ChevronLeft, ChevronRight,
  Users, Loader2, Filter, Download, TrendingUp, BarChart3,
  Square, CheckSquare, Check
} from 'lucide-react'

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:  { label: 'Pendiente',  color: 'text-amber-700',   bg: 'bg-amber-100' },
  aprobada:   { label: 'Aprobada',   color: 'text-emerald-700', bg: 'bg-emerald-100' },
  rechazada:  { label: 'Rechazada',  color: 'text-red-700',     bg: 'bg-red-100' },
  compensada: { label: 'Compensada', color: 'text-slate-600',   bg: 'bg-slate-100' },
}

const TIPO_CONFIG: Record<string, { label: string; color: string }> = {
  estructural:  { label: 'Estructural', color: 'text-purple-700' },
  fuerza_mayor: { label: 'Festivo/FM',  color: 'text-blue-700' },
  voluntaria:   { label: 'Voluntaria',  color: 'text-slate-600' },
}

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MESES_FULL = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const LIMITE_ANUAL = 80
const UMBRAL_ALERTA = 60
const MULTIPLICADOR_HE = 1.75 // Coste HE = salario/hora × 1.75

function BarraLimite({ horas, max = LIMITE_ANUAL }: { horas: number; max?: number }) {
  const pct = Math.min(100, (horas / max) * 100)
  const color = horas >= max ? 'bg-red-500' : horas >= UMBRAL_ALERTA ? 'bg-amber-500' : 'bg-emerald-500'
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

// ─── Excel export ────────────────────────────────────────────────────────────
async function exportarExcel(filtradas: any[], mesStr: string) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const datos = filtradas.map(he => ({
    'Empleado': he.nombre || he.nombre_empleado || '',
    'Fecha': he.fecha,
    'Horas extra': (he.horas_extra || 0),
    'Estado': he.horas_extra_estado || he.estado || 'pendiente',
    'Compensación': he.compensacion_he || he.compensacion || '',
    'Motivo': he.motivo_he || '',
    'Aprobado por': he.aprobado_por_he || he.aprobado_por || '',
  }))
  const ws = XLSX.utils.json_to_sheet(datos)
  ws['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 30 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Horas Extra')
  XLSX.writeFile(wb, `Horas_Extra_${mesStr}.xlsx`)
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

  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [filtroEmpleado, setFiltroEmpleado] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [tab, setTab] = useState<'pendientes' | 'historial' | 'empleados' | 'dashboard'>('pendientes')

  // Modal
  const [confirmAprobar, setConfirmAprobar] = useState<{ he: any; compensacion: string } | null>(null)
  const [confirmRechazar, setConfirmRechazar] = useState<any>(null)
  const [motivoTexto, setMotivoTexto] = useState('')

  // [6/04] Aprobación masiva
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [aprobandoMasivo, setAprobandoMasivo] = useState(false)

  const showMsg = (m: string, err = false) => {
    if (err) setError(m); else setMsg(m)
    setTimeout(() => { setMsg(''); setError('') }, 4000)
  }

  const cargar = async () => {
    setCargando(true)
    try {
      const [heData, empData] = await Promise.all([
        api.horasExtra({}),
        api.empleados()
      ])
      const todas: any[] = heData.horas_extra || []
      setHorasExtra(todas)
      setEmpleados((empData.empleados || []).filter((e: any) => e.estado === 'activo'))

      const anioStr = anio.toString()
      const stats: Record<string, any> = {}
      todas.forEach((he: any) => {
        if (!he.fecha?.startsWith(anioStr)) return
        const id = he.empleado_id
        if (!stats[id]) stats[id] = { nombre: he.nombre || he.nombre_empleado || '', total: 0, pendiente: 0, pago: 0, descanso: 0, rechazada: 0 }
        const h = he.horas_extra || 0
        stats[id].total += h
        const estado = he.horas_extra_estado || he.estado || 'pendiente'
        if (estado === 'pendiente' || (!he.horas_extra_estado && !he.estado)) stats[id].pendiente += h
        else if (estado === 'aprobada' && (he.compensacion_he === 'pago' || he.compensacion === 'pago')) stats[id].pago += h
        else if (estado === 'aprobada' && (he.compensacion_he === 'descanso' || he.compensacion === 'descanso')) stats[id].descanso += h
        else if (estado === 'rechazada') stats[id].rechazada += h
      })
      setStatsAnuales(stats)
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [anio])

  const handleAprobar = async (he: any, compensacion: string) => {
    setGuardando(true)
    try {
      const r = await api.aprobarHorasExtra({
        id: he.id, estado: 'aprobada', compensacion,
        aprobado_por: usuario?.nombre || 'Supervisor',
        motivo: motivoTexto || undefined
      })
      if (r.ok) {
        showMsg(`✅ Aprobadas — compensación por ${compensacion === 'pago' ? 'pago' : 'descanso'}`)
        await cargar()
      } else showMsg(r.error || 'Error', true)
    } catch { showMsg('Error', true) }
    finally { setGuardando(false); setConfirmAprobar(null); setMotivoTexto('') }
  }

  const handleRechazar = async (he: any) => {
    setGuardando(true)
    try {
      const r = await api.aprobarHorasExtra({
        id: he.id, estado: 'rechazada',
        aprobado_por: usuario?.nombre || 'Supervisor',
        motivo: motivoTexto || undefined
      })
      if (r.ok) { showMsg('Horas extra rechazadas'); await cargar() }
    } catch { showMsg('Error', true) }
    finally { setGuardando(false); setConfirmRechazar(null); setMotivoTexto('') }
  }

  // [6/04] Aprobar masivo
  const handleAprobarMasivo = async (compensacion: string) => {
    if (seleccionados.size === 0) return
    setAprobandoMasivo(true)
    let ok = 0, fail = 0
    for (const id of seleccionados) {
      try {
        const r = await api.aprobarHorasExtra({
          id, estado: 'aprobada', compensacion,
          aprobado_por: usuario?.nombre || 'Supervisor'
        })
        if (r.ok) ok++; else fail++
      } catch { fail++ }
    }
    showMsg(`✅ ${ok} aprobadas${fail ? `, ${fail} errores` : ''} — compensación: ${compensacion}`)
    setSeleccionados(new Set())
    setAprobandoMasivo(false)
    await cargar()
  }

  const toggleSel = (id: string) => {
    setSeleccionados(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  // ─── Datos calculados ──────────────────────────────────────────────────────
  const anioStr = anio.toString()
  const mesStr = `${anio}-${mes.toString().padStart(2, '0')}`

  const pendientes = horasExtra.filter(he => {
    const estado = he.horas_extra_estado || he.estado || 'pendiente'
    return estado === 'pendiente'
  })

  const filtradas = horasExtra.filter(he => {
    if (tab === 'pendientes') {
      const estado = he.horas_extra_estado || he.estado || 'pendiente'
      if (estado !== 'pendiente') return false
    }
    if (tab === 'historial') {
      if (he.fecha?.substring(0, 7) !== mesStr) return false
      if (filtroEmpleado && he.empleado_id !== filtroEmpleado) return false
      if (filtroEstado) {
        const estado = he.horas_extra_estado || he.estado || 'pendiente'
        if (estado !== filtroEstado) return false
      }
    }
    if (soloSusDatos) {
      const miEmp = empleados.find(e => e.email === usuario?.email)
      if (miEmp && he.empleado_id !== miEmp.id) return false
    }
    return true
  })

  const heAnio = horasExtra.filter(he => he.fecha?.startsWith(anioStr))
  const totalPendientes = pendientes.length
  const totalHorasAnio = heAnio.reduce((s, he) => s + (he.horas_extra || 0), 0)
  const totalPago = heAnio.filter(he => (he.horas_extra_estado || he.estado) === 'aprobada' && (he.compensacion_he || he.compensacion) === 'pago').reduce((s, he) => s + (he.horas_extra || 0), 0)
  const totalDescanso = heAnio.filter(he => (he.horas_extra_estado || he.estado) === 'aprobada' && (he.compensacion_he || he.compensacion) === 'descanso').reduce((s, he) => s + (he.horas_extra || 0), 0)
  const totalRechazadas = heAnio.filter(he => (he.horas_extra_estado || he.estado) === 'rechazada').reduce((s, he) => s + (he.horas_extra || 0), 0)
  const empleadosAlerta = Object.entries(statsAnuales).filter(([, s]: any) => s.total >= UMBRAL_ALERTA)

  // [6/04] Coste estimado (basado en salario medio convenio limpieza ~9.5€/h)
  const COSTE_HORA_BASE = 9.5
  const costeEstimadoPago = totalPago * COSTE_HORA_BASE * MULTIPLICADOR_HE
  const costePendiente = pendientes.reduce((s, he) => s + (he.horas_extra || 0), 0) * COSTE_HORA_BASE * MULTIPLICADOR_HE

  // [6/04] Recharts: datos por mes
  const chartMensual = Array.from({ length: 12 }, (_, i) => {
    const mStr = `${anio}-${(i + 1).toString().padStart(2, '0')}`
    const hMes = heAnio.filter(he => he.fecha?.startsWith(mStr))
    return {
      mes: MESES[i + 1],
      total: Math.round(hMes.reduce((s, he) => s + (he.horas_extra || 0), 0) * 10) / 10,
      aprobadas: Math.round(hMes.filter(he => (he.horas_extra_estado || he.estado) === 'aprobada').reduce((s, he) => s + (he.horas_extra || 0), 0) * 10) / 10,
      pendientes: Math.round(hMes.filter(he => !he.horas_extra_estado || (he.horas_extra_estado || he.estado) === 'pendiente').reduce((s, he) => s + (he.horas_extra || 0), 0) * 10) / 10,
    }
  })

  // [6/04] Recharts: acumulado anual por empleado (top 5)
  const topEmps = Object.entries(statsAnuales).sort(([, a]: any, [, b]: any) => b.total - a.total).slice(0, 5)
  const chartAcumulado = Array.from({ length: 12 }, (_, i) => {
    const mStr = `${anio}-${(i + 1).toString().padStart(2, '0')}`
    const punto: any = { mes: MESES[i + 1] }
    topEmps.forEach(([id, s]: any) => {
      // Acumular desde enero hasta este mes
      const acum = heAnio.filter(he => he.empleado_id === id && he.fecha?.substring(0, 7) <= mStr).reduce((sum, he) => sum + (he.horas_extra || 0), 0)
      punto[s.nombre.split(' ').slice(0, 2).join(' ')] = Math.round(acum * 10) / 10
    })
    return punto
  })
  const COLORES = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626']

  if (cargando) return <div className="p-6 lg:p-8"><SkeletonPage /></div>

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Modal aprobar */}
      {confirmAprobar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { setConfirmAprobar(null); setMotivoTexto('') }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {confirmAprobar.compensacion === 'pago' ? '💶 Aprobar por pago' : '😴 Aprobar por descanso'}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              <strong>{confirmAprobar.he?.nombre || confirmAprobar.he?.nombre_empleado}</strong> — {(confirmAprobar.he?.horas_extra || 0).toFixed(2)}h el {confirmAprobar.he?.fecha}
            </p>
            <div className="mb-4">
              <label className="text-xs text-slate-600 font-semibold mb-1 block">Motivo (opcional)</label>
              <textarea value={motivoTexto} onChange={e => setMotivoTexto(e.target.value)}
                placeholder="Ej: Refuerzo por evento especial..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none h-20" />
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => { setConfirmAprobar(null); setMotivoTexto('') }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
              <button onClick={() => handleAprobar(confirmAprobar.he, confirmAprobar.compensacion)} disabled={guardando}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-xl flex items-center gap-2">
                {guardando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Aprobar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal rechazar */}
      {confirmRechazar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { setConfirmRechazar(null); setMotivoTexto('') }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-2">❌ Rechazar horas extra</h3>
            <p className="text-sm text-slate-600 mb-4">
              <strong>{confirmRechazar?.nombre || confirmRechazar?.nombre_empleado}</strong> — {(confirmRechazar?.horas_extra || 0).toFixed(2)}h el {confirmRechazar?.fecha}
            </p>
            <div className="mb-4">
              <label className="text-xs text-slate-600 font-semibold mb-1 block">Motivo del rechazo</label>
              <textarea value={motivoTexto} onChange={e => setMotivoTexto(e.target.value)}
                placeholder="Ej: No autorizado previamente..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none h-20" />
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => { setConfirmRechazar(null); setMotivoTexto('') }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
              <button onClick={() => handleRechazar(confirmRechazar)} disabled={guardando}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-xl flex items-center gap-2">
                {guardando ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Rechazar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl shadow-lg">
            <Clock size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Horas extras</h1>
            <p className="text-sm text-slate-500">
              Límite legal: {LIMITE_ANUAL}h/año · Art. 35 ET
              {totalPendientes > 0 && <span className="ml-2 text-amber-600 font-bold">{totalPendientes} pendientes</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><RefreshCw size={16} /></button>
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Total año', valor: totalHorasAnio.toFixed(1) + 'h', icon: Clock, color: 'text-slate-800', bg: 'bg-slate-50' },
          { label: 'Pendientes', valor: String(totalPendientes), icon: AlertTriangle, color: totalPendientes > 0 ? 'text-amber-700' : 'text-slate-500', bg: totalPendientes > 0 ? 'bg-amber-50' : 'bg-slate-50' },
          { label: 'Pago', valor: totalPago.toFixed(1) + 'h', icon: Euro, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Descanso', valor: totalDescanso.toFixed(1) + 'h', icon: BedDouble, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Coste est.', valor: '€' + Math.round(costeEstimadoPago).toLocaleString(), icon: TrendingUp, color: 'text-purple-700', bg: 'bg-purple-50' },
        ].map((k, i) => (
          <div key={i} className={`${k.bg} rounded-2xl p-3 border border-slate-200`}>
            <div className="flex items-center gap-2 mb-0.5">
              <k.icon size={13} className={k.color} />
              <span className="text-[10px] text-slate-500 font-semibold">{k.label}</span>
            </div>
            <p className={`text-xl font-black ${k.color}`}>{k.valor}</p>
          </div>
        ))}
      </div>

      {/* Alerta límite */}
      {esSuperOrAdmin && empleadosAlerta.length > 0 && (
        <div className={`border-2 rounded-2xl p-4 mb-5 ${empleadosAlerta.some(([, s]: any) => s.total >= LIMITE_ANUAL) ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
            <AlertTriangle size={15} className={empleadosAlerta.some(([, s]: any) => s.total >= LIMITE_ANUAL) ? 'text-red-600' : 'text-amber-600'} />
            {empleadosAlerta.length} empleado{empleadosAlerta.length !== 1 ? 's' : ''} cerca o en el límite de {LIMITE_ANUAL}h
          </p>
          <div className="space-y-2">
            {empleadosAlerta.map(([id, s]: any) => (
              <div key={id} className="bg-white rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-800">{s.nombre}</span>
                  {s.total >= LIMITE_ANUAL && <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">LÍMITE</span>}
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
          { key: 'dashboard',  label: 'Dashboard' },
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
          {/* [6/04] Barra aprobación masiva */}
          {esSuperOrAdmin && filtradas.length > 0 && (
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <button onClick={() => {
                  if (seleccionados.size === filtradas.length) setSeleccionados(new Set())
                  else setSeleccionados(new Set(filtradas.map(h => h.id)))
                }} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  {seleccionados.size === filtradas.length && filtradas.length > 0
                    ? <CheckSquare size={15} className="text-[#1a3c34]" />
                    : <Square size={15} className="text-slate-400" />}
                  {seleccionados.size > 0 ? `${seleccionados.size} seleccionado${seleccionados.size !== 1 ? 's' : ''}` : `Seleccionar todos (${filtradas.length})`}
                </button>
              </div>
              {seleccionados.size > 0 && (
                <div className="flex items-center gap-2">
                  <button onClick={() => handleAprobarMasivo('pago')} disabled={aprobandoMasivo}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl">
                    {aprobandoMasivo ? <Loader2 size={12} className="animate-spin" /> : <Euro size={12} />} Pago ({seleccionados.size})
                  </button>
                  <button onClick={() => handleAprobarMasivo('descanso')} disabled={aprobandoMasivo}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl">
                    {aprobandoMasivo ? <Loader2 size={12} className="animate-spin" /> : <BedDouble size={12} />} Descanso ({seleccionados.size})
                  </button>
                </div>
              )}
            </div>
          )}

          {filtradas.length === 0 ? (
            <div className="flex flex-col items-center py-16 bg-white border border-slate-200 rounded-2xl">
              <CheckCircle2 size={36} className="text-emerald-300 mb-3" />
              <p className="text-slate-500 font-medium">Sin horas extra pendientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtradas.map(he => (
                <div key={he.id} className={`bg-white border rounded-2xl p-4 ${seleccionados.has(he.id) ? 'border-purple-300 bg-purple-50/30' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {esSuperOrAdmin && (
                        <button onClick={() => toggleSel(he.id)} className="shrink-0">
                          {seleccionados.has(he.id)
                            ? <CheckSquare size={18} className="text-purple-600" />
                            : <Square size={18} className="text-slate-300 hover:text-slate-500" />}
                        </button>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <p className="text-sm font-bold text-slate-900">{he.nombre || he.nombre_empleado}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${TIPO_CONFIG[he.tipo]?.color || 'text-slate-600'} bg-slate-100`}>
                            {TIPO_CONFIG[he.tipo]?.label || 'General'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>📅 {he.fecha}</span>
                          <span className="font-bold text-purple-700">+{(he.horas_extra || 0).toFixed(2)}h</span>
                          {statsAnuales[he.empleado_id] && (
                            <span className={statsAnuales[he.empleado_id].total >= LIMITE_ANUAL ? 'text-red-600 font-bold' : 'text-slate-400'}>
                              ({statsAnuales[he.empleado_id].total.toFixed(1)}h/{LIMITE_ANUAL}h año)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {esSuperOrAdmin && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => { setConfirmAprobar({ he, compensacion: 'pago' }); setMotivoTexto('') }} disabled={guardando}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl">
                          <Euro size={12} /> Pago
                        </button>
                        <button onClick={() => { setConfirmAprobar({ he, compensacion: 'descanso' }); setMotivoTexto('') }} disabled={guardando}
                          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl">
                          <BedDouble size={12} /> Descanso
                        </button>
                        <button onClick={() => { setConfirmRechazar(he); setMotivoTexto('') }} disabled={guardando}
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
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
              <button onClick={() => { if (mes === 1) { setMes(12); setAnio(anio - 1) } else setMes(mes - 1) }} className="p-1.5 hover:bg-slate-100 rounded-lg"><ChevronLeft size={14} /></button>
              <span className="text-xs font-semibold px-2">{MESES_FULL[mes]} {anio}</span>
              <button onClick={() => { if (mes === 12) { setMes(1); setAnio(anio + 1) } else setMes(mes + 1) }} className="p-1.5 hover:bg-slate-100 rounded-lg"><ChevronRight size={14} /></button>
            </div>
            <select value={filtroEmpleado} onChange={e => setFiltroEmpleado(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
              <option value="">Todos</option>
              {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>)}
            </select>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
              <option value="">Todos</option>
              {Object.entries(ESTADO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button onClick={() => exportarExcel(filtradas, mesStr)}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-700 text-sm font-medium rounded-xl">
              <Download size={14} /> Excel
            </button>
          </div>

          {filtradas.length === 0 ? (
            <div className="flex flex-col items-center py-16 bg-white border border-slate-200 rounded-2xl">
              <Filter size={32} className="text-slate-300 mb-3" />
              <p className="text-slate-500">Sin registros para este filtro</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Empleado</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Fecha</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Horas</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Estado</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Comp.</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Motivo</th>
                      {esSuperOrAdmin && <th className="px-4 py-3" />}
                    </tr>
                  </thead>
                  <tbody>
                    {filtradas.map((he, i) => {
                      const estadoKey = he.horas_extra_estado || he.estado || 'pendiente'
                      const est = ESTADO_CONFIG[estadoKey] || ESTADO_CONFIG.pendiente
                      const comp = he.compensacion_he || he.compensacion
                      return (
                        <tr key={he.id} className={`border-b border-slate-100 hover:bg-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                          <td className="px-4 py-3 font-medium text-slate-800">{he.nombre || he.nombre_empleado}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs">{he.fecha}</td>
                          <td className="px-4 py-3 text-right font-bold text-purple-700">+{(he.horas_extra || 0).toFixed(2)}h</td>
                          <td className="px-4 py-3"><span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${est.bg} ${est.color}`}>{est.label}</span></td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{comp === 'pago' ? '💶 Pago' : comp === 'descanso' ? '😴 Descanso' : '—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-400 max-w-[150px] truncate" title={he.motivo_he || ''}>{he.motivo_he || '—'}</td>
                          {esSuperOrAdmin && estadoKey === 'pendiente' && (
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                <button onClick={() => { setConfirmAprobar({ he, compensacion: 'pago' }); setMotivoTexto('') }} className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg hover:bg-emerald-200">💶</button>
                                <button onClick={() => { setConfirmAprobar({ he, compensacion: 'descanso' }); setMotivoTexto('') }} className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-lg hover:bg-blue-200">😴</button>
                                <button onClick={() => { setConfirmRechazar(he); setMotivoTexto('') }} className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg hover:bg-red-100 hover:text-red-600">✕</button>
                              </div>
                            </td>
                          )}
                          {esSuperOrAdmin && estadoKey !== 'pendiente' && <td />}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
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
                      <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm">{s.nombre[0]}</div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{s.nombre}</p>
                        <p className="text-xs text-slate-400">Coste est.: €{Math.round(s.pago * COSTE_HORA_BASE * MULTIPLICADOR_HE)}</p>
                      </div>
                    </div>
                    {s.total >= LIMITE_ANUAL && <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded-full">⚠️ Límite</span>}
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

      {/* ═══ TAB: DASHBOARD ═══ */}
      {tab === 'dashboard' && (
        <div className="space-y-5">
          {/* [6/04] Recharts: Distribución mensual */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={18} className="text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">Horas extra por mes — {anio}</h3>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartMensual} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} width={35} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}
                    formatter={(value: number, name: string) => [value + 'h', name === 'aprobadas' ? 'Aprobadas' : name === 'pendientes' ? 'Pendientes' : 'Total']} />
                  <Bar dataKey="aprobadas" fill="#10b981" radius={[4, 4, 0, 0]} name="Aprobadas" />
                  <Bar dataKey="pendientes" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Pendientes" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* [6/04] Recharts: Acumulado anual por empleado (top 5) */}
          {topEmps.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">Progresión acumulada — Top {topEmps.length} empleados</h3>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartAcumulado}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} width={35} domain={[0, (max: number) => Math.max(max, LIMITE_ANUAL + 5)]} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid #e2e8f0' }}
                      formatter={(value: number) => [value + 'h']} />
                    <ReferenceLine y={LIMITE_ANUAL} stroke="#ef4444" strokeDasharray="5 5" label={{ value: `${LIMITE_ANUAL}h límite`, fill: '#ef4444', fontSize: 10, position: 'right' }} />
                    <ReferenceLine y={UMBRAL_ALERTA} stroke="#f59e0b" strokeDasharray="3 3" />
                    {topEmps.map(([, s]: any, i) => (
                      <Line key={s.nombre} type="monotone" dataKey={s.nombre.split(' ').slice(0, 2).join(' ')}
                        stroke={COLORES[i]} strokeWidth={2} dot={{ r: 3 }} name={s.nombre.split(' ').slice(0, 2).join(' ')} />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* KPIs distribución */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Total', valor: totalHorasAnio.toFixed(1) + 'h', color: 'text-slate-800', bg: 'bg-slate-50', border: 'border-slate-200' },
              { label: 'Pendientes', valor: (totalHorasAnio - totalPago - totalDescanso - totalRechazadas).toFixed(1) + 'h', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
              { label: 'Pago', valor: totalPago.toFixed(1) + 'h', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
              { label: 'Descanso', valor: totalDescanso.toFixed(1) + 'h', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
              { label: 'Coste pago', valor: '€' + Math.round(costeEstimadoPago).toLocaleString(), color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
            ].map((item, i) => (
              <div key={i} className={`${item.bg} border ${item.border} rounded-xl p-3 text-center`}>
                <p className={`text-lg font-black ${item.color}`}>{item.valor}</p>
                <p className="text-[10px] text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Ranking */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">Ranking horas extra {anio}</h3>
            </div>
            {Object.keys(statsAnuales).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(statsAnuales)
                  .sort(([, a]: any, [, b]: any) => b.total - a.total)
                  .map(([id, s]: any, i) => (
                    <div key={id} className="flex items-center gap-3">
                      <span className={`w-6 text-center text-xs font-bold ${i < 3 ? 'text-purple-700' : 'text-slate-400'}`}>{i + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs shrink-0">{s.nombre[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{s.nombre}</p>
                        <BarraLimite horas={s.total} />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
