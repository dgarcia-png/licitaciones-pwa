import { SkeletonStats, SkeletonList } from '../components/Skeleton'
// src/pages/InformesPage.tsx — ACTUALIZADO con recharts
// Requiere: npm install recharts xlsx

import { useState, useEffect } from 'react'
import { api } from '../services/api'
import {
  BarChart3, TrendingUp, Users, Map, FileText, Download,
  Loader2, AlertTriangle, CheckCircle2,
  RefreshCw, Calendar, Euro, Target, Activity, Gauge
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine,
} from 'recharts'
import {
  exportarEconomicoExcel,
  exportarLicitacionesExcel,
  exportarRRHHExcel,
  exportarTerritorioExcel,
  exportarRendimientoExcel,
  imprimirInformeRendimiento,
} from '../utils/exportInformes'

// ─── Paleta ──────────────────────────────────────────────────────────────────

const C = {
  verde:     '#1a3c34',
  verdeM:    '#2d5a4e',
  azul:      '#3b82f6',
  emerald:   '#10b981',
  amber:     '#f59e0b',
  rojo:      '#ef4444',
  slate:     '#64748b',
  slateL:    '#e2e8f0',
  violeta:   '#7c3aed',
  pink:      '#ec4899',
}

const PIE_COSTES = [C.verde, C.azul, C.amber, C.slate]

const ESTADO_COLORS: Record<string, string> = {
  nueva:       C.azul,
  en_analisis: C.amber,
  go:          C.emerald,
  no_go:       C.rojo,
  presentada:  '#6366f1',
  adjudicada:  C.violeta,
  perdida:     '#be123c',
  descartada:  C.slate,
}

const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

// ─── Formatters ──────────────────────────────────────────────────────────────

function fmtEuro(n: number) {
  if (!n) return '0 €'
  if (n >= 1000000) return (n / 1000000).toFixed(2) + ' M€'
  if (n >= 1000)    return (n / 1000).toFixed(0) + ' K€'
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €'
}

function fmtPct(n: number) { return (n || 0).toFixed(1) + '%' }

function fmtK(n: number) {
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (Math.abs(n) >= 1000)    return (n / 1000).toFixed(0) + 'K'
  return n.toFixed(0)
}

// ─── Tooltip personalizado ────────────────────────────────────────────────────

function TooltipEuro({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-slate-800 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="flex items-center gap-1.5 mb-0.5">
          <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-semibold">{fmtEuro(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

function TooltipPct({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-slate-800 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="mb-0.5">
          {p.name}: <span className="font-semibold">{fmtPct(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

function TooltipPie({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-slate-800 mb-0.5">{d.name}</p>
      <p style={{ color: d.payload.fill }}>{fmtEuro(d.value)}</p>
      <p className="text-slate-400">{fmtPct(d.payload.pct)}</p>
    </div>
  )
}

// ─── Componentes UI ───────────────────────────────────────────────────────────

function KpiCard({ label, valor, sub, color, icon: Icon, alerta }: any) {
  return (
    <div className={`rounded-2xl p-4 border ${alerta ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-slate-500 uppercase font-semibold">{label}</p>
        {Icon && <Icon size={16} className={alerta ? 'text-red-500' : 'text-slate-400'} />}
      </div>
      <p className={`text-xl font-black ${alerta ? 'text-red-700' : color || 'text-slate-900'}`}>{valor}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function BarraMargen({ pct, max = 30 }: { pct: number; max?: number }) {
  const w = Math.min(100, Math.abs(pct) / max * 100)
  const color = pct < 5 ? 'bg-red-500' : pct < 10 ? 'bg-amber-500' : pct < 20 ? 'bg-blue-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: w + '%' }} />
      </div>
      <span className={`text-xs font-bold w-12 text-right ${pct < 5 ? 'text-red-600' : pct < 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
        {fmtPct(pct)}
      </span>
    </div>
  )
}

function Semaforo({ valor }: { valor: 'rojo' | 'amarillo' | 'verde' }) {
  const map = { rojo: '🔴', amarillo: '🟡', verde: '🟢' }
  return <span className="text-base" title={valor}>{map[valor] || '⚪'}</span>
}

function DesvCell({ pct }: { pct: number }) {
  const color = pct > 15 ? 'text-red-700 font-bold' : pct > 5 ? 'text-amber-600' : pct < -5 ? 'text-emerald-600' : 'text-slate-600'
  const sign = pct > 0 ? '+' : ''
  return <span className={`text-xs font-mono ${color}`}>{sign}{fmtPct(pct)}</span>
}

function BtnExcel({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold transition-colors">
      <Download size={12} /> Excel
    </button>
  )
}

function BtnPDF({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 rounded-lg font-semibold transition-colors">
      <FileText size={12} /> PDF
    </button>
  )
}

function ChartCard({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

// ─── Etiqueta interior en dona ────────────────────────────────────────────────

function LabelDonut({ cx, cy, midAngle, innerRadius, outerRadius, pct }: any) {
  if (pct < 8) return null
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
      className="fill-white text-[10px] font-bold" style={{ fontSize: 10, fontWeight: 700, fill: 'white' }}>
      {pct.toFixed(0)}%
    </text>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB ECONÓMICO
// ════════════════════════════════════════════════════════════════════════════

function TabEconomico({ informeEco, informeContrato, contratoSel, setContratoSel, exportarCSV, mes }: any) {
  // Prepara datos para gráfico de barras de contratos (top 8 por ingresos)
  const contratosChart = [...(informeEco.contratos || [])]
    .sort((a: any, b: any) => b.ingresos_acum - a.ingresos_acum)
    .slice(0, 8)
    .map((c: any) => ({
      name: c.titulo?.length > 20 ? c.titulo.slice(0, 18) + '…' : c.titulo,
      Ingresos: Math.round(c.ingresos_acum),
      Costes:   Math.round(c.costes_acum),
      Margen:   parseFloat((c.margen_real_pct || 0).toFixed(1)),
    }))

  // Datos dona costes cuando hay contrato seleccionado
  const acum = informeContrato?.acumulado || {}
  const totalCostesAcum = acum.total_costes || 0
  const donutData = totalCostesAcum > 0 ? [
    { name: 'Personal',    value: Math.round(acum.coste_personal   || 0), pct: (acum.coste_personal   || 0) / totalCostesAcum * 100 },
    { name: 'Materiales',  value: Math.round(acum.coste_materiales || 0), pct: (acum.coste_materiales || 0) / totalCostesAcum * 100 },
    { name: 'Maquinaria',  value: Math.round(acum.coste_maquinaria || 0), pct: (acum.coste_maquinaria || 0) / totalCostesAcum * 100 },
    { name: 'Indirectos',  value: Math.round(acum.costes_indirectos|| 0), pct: (acum.costes_indirectos|| 0) / totalCostesAcum * 100 },
  ].filter(d => d.value > 0) : []

  // Evolución mensual del contrato seleccionado
  const mesesChart = (informeContrato?.meses || []).map((m: any) => ({
    periodo:  m.periodo,
    Ingresos: Math.round(m.ingresos     || 0),
    Costes:   Math.round(m.total_costes || 0),
    Beneficio:Math.round(m.beneficio    || 0),
    Margen:   parseFloat((m.margen      || 0).toFixed(1)),
  }))

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Contratos activos"   valor={informeEco.global?.contratos_activos  || 0}  icon={Activity}   color="text-[#1a3c34]" />
        <KpiCard label="Ingresos acumulados" valor={fmtEuro(informeEco.global?.total_ingresos)}   icon={Euro}       color="text-blue-700" />
        <KpiCard label="Beneficio acumulado" valor={fmtEuro(informeEco.global?.total_beneficio)}  icon={TrendingUp}
          color={(informeEco.global?.total_beneficio || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'} />
        <KpiCard label="Margen global"       valor={fmtPct(informeEco.global?.margen_global_pct)} icon={Target}
          alerta={(informeEco.global?.margen_global_pct || 0) < 10}
          color={(informeEco.global?.margen_global_pct || 0) >= 15 ? 'text-emerald-700' : (informeEco.global?.margen_global_pct || 0) >= 10 ? 'text-amber-700' : 'text-red-700'} />
      </div>

      {informeEco.global?.contratos_alerta > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <AlertTriangle size={18} className="text-red-600 shrink-0" />
          <p className="text-sm font-bold text-red-700">
            ⚠️ {informeEco.global.contratos_alerta} contrato{informeEco.global.contratos_alerta > 1 ? 's' : ''} con margen por debajo del 10%
          </p>
        </div>
      )}

      {/* Gráfico: ingresos vs costes por contrato */}
      {contratosChart.length > 0 && (
        <ChartCard title="Ingresos vs costes por contrato"
          actions={
            <>
              <BtnExcel onClick={() => exportarEconomicoExcel(informeEco)} />
              <BtnPDF onClick={() => window.print()} />
            </>
          }>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={contratosChart} margin={{ top: 4, right: 8, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.slateL} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#64748b' }} width={48} />
              <Tooltip content={<TooltipEuro />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              <Bar dataKey="Ingresos" fill={C.azul}    radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="Costes"   fill={C.slate}   radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Tabla contratos + selector */}
      <ChartCard title="Análisis detallado por contrato">
        <select value={contratoSel} onChange={e => setContratoSel(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm mb-4 bg-white">
          <option value="">— Seleccionar contrato —</option>
          {(informeEco.contratos || []).map((c: any) => (
            <option key={c.id} value={c.id}>{c.titulo} ({fmtPct(c.margen_real_pct)} margen)</option>
          ))}
        </select>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="bg-slate-50">
              <th className="text-left px-3 py-2 font-semibold text-slate-600">Contrato</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-600">Ingresos</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-600">Costes</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-600">Beneficio</th>
              <th className="px-3 py-2 font-semibold text-slate-600 w-32">Margen real</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-600">Meses</th>
            </tr></thead>
            <tbody>
              {(informeEco.contratos || []).map((c: any) => (
                <tr key={c.id} onClick={() => setContratoSel(c.id)}
                  className={`border-b border-slate-50 cursor-pointer hover:bg-slate-50 ${c.alerta_margen ? 'bg-red-50/50' : ''} ${contratoSel === c.id ? 'bg-blue-50' : ''}`}>
                  <td className="px-3 py-2">
                    <p className="font-semibold text-slate-800 truncate max-w-[200px]">{c.titulo}</p>
                    <p className="text-slate-400 text-[10px] truncate">{c.organismo}</p>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmtEuro(c.ingresos_acum)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtEuro(c.costes_acum)}</td>
                  <td className={`px-3 py-2 text-right font-bold font-mono ${c.beneficio_acum >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtEuro(c.beneficio_acum)}</td>
                  <td className="px-3 py-2"><BarraMargen pct={c.margen_real_pct} /></td>
                  <td className="px-3 py-2 text-right text-slate-500">{c.meses_registrados}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Detalle contrato seleccionado */}
      {contratoSel && informeContrato?.ok && (
        <div className="bg-white border-2 border-[#1a3c34]/20 rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{informeContrato.contrato?.titulo}</h3>
              <p className="text-xs text-slate-400">{informeContrato.contrato?.organismo}</p>
            </div>
            <button onClick={() => exportarCSV(informeContrato.meses, `pl_${contratoSel}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#1a3c34] text-white rounded-lg font-semibold">
              <Download size={12} /> Exportar
            </button>
          </div>

          {/* KPIs contrato */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Ingresos acum."  valor={fmtEuro(acum.total_ingresos)}  color="text-blue-700" />
            <KpiCard label="Costes acum."    valor={fmtEuro(acum.total_costes)}    color="text-slate-700" />
            <KpiCard label="Beneficio acum." valor={fmtEuro(acum.total_beneficio)}
              color={(acum.total_beneficio || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'} />
            <KpiCard label="Margen real"     valor={fmtPct(acum.margen_pct)}
              alerta={(acum.margen_pct || 0) < 10}
              color={(acum.margen_pct || 0) >= 15 ? 'text-emerald-700' : 'text-amber-700'} />
          </div>

          {/* Gráficos lado a lado: dona + línea */}
          {(donutData.length > 0 || mesesChart.length > 0) && (
            <div className="grid md:grid-cols-2 gap-5">

              {/* Dona: distribución de costes */}
              {donutData.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Distribución de costes</h4>
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={donutData} dataKey="value" cx="50%" cy="50%"
                          innerRadius={50} outerRadius={80}
                          labelLine={false} label={LabelDonut}>
                          {donutData.map((_: any, i: number) => (
                            <Cell key={i} fill={PIE_COSTES[i % PIE_COSTES.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<TooltipPie />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 shrink-0">
                      {donutData.map((d: any, i: number) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COSTES[i % PIE_COSTES.length] }} />
                          <div>
                            <p className="text-[11px] font-semibold text-slate-700">{d.name}</p>
                            <p className="text-[10px] text-slate-400">{fmtEuro(d.value)} · {fmtPct(d.pct)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Línea: evolución mensual margen */}
              {mesesChart.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Evolución margen mensual</h4>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={mesesChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.slateL} vertical={false} />
                      <XAxis dataKey="periodo" tick={{ fontSize: 9, fill: '#64748b' }} />
                      <YAxis tickFormatter={v => v + '%'} tick={{ fontSize: 9, fill: '#64748b' }} width={36} />
                      <Tooltip content={<TooltipPct />} />
                      <ReferenceLine y={10} stroke={C.amber} strokeDasharray="4 4" label={{ value: '10%', fontSize: 9, fill: C.amber, position: 'right' }} />
                      <Line dataKey="Margen" name="Margen %" stroke={C.verde} strokeWidth={2}
                        dot={{ r: 3, fill: C.verde }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Línea: ingresos / costes / beneficio mensual */}
          {mesesChart.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Evolución mensual P&L</h4>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={mesesChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.slateL} vertical={false} />
                  <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#64748b' }} width={48} />
                  <Tooltip content={<TooltipEuro />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={0} stroke={C.rojo} strokeDasharray="3 3" />
                  <Line dataKey="Ingresos"  stroke={C.azul}    strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line dataKey="Costes"    stroke={C.slate}   strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line dataKey="Beneficio" stroke={C.emerald} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tabla evolución mensual */}
          {mesesChart.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Tabla mensual</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-50">
                    <th className="text-left px-2 py-2 font-semibold text-slate-500">Periodo</th>
                    <th className="text-right px-2 py-2 font-semibold text-slate-500">Ingresos</th>
                    <th className="text-right px-2 py-2 font-semibold text-slate-500">Personal</th>
                    <th className="text-right px-2 py-2 font-semibold text-slate-500">Materiales</th>
                    <th className="text-right px-2 py-2 font-semibold text-slate-500">Total costes</th>
                    <th className="text-right px-2 py-2 font-semibold text-slate-500">Beneficio</th>
                    <th className="px-2 py-2 font-semibold text-slate-500 w-24">Margen</th>
                    <th className="text-right px-2 py-2 font-semibold text-slate-500">Desv. €</th>
                  </tr></thead>
                  <tbody>
                    {(informeContrato.meses as any[]).map((m: any) => (
                      <tr key={m.periodo} className={`border-b border-slate-50 ${m.beneficio < 0 ? 'bg-red-50/40' : ''}`}>
                        <td className="px-2 py-1.5 font-semibold">{m.periodo}</td>
                        <td className="px-2 py-1.5 text-right font-mono">{fmtEuro(m.ingresos)}</td>
                        <td className="px-2 py-1.5 text-right font-mono text-slate-500">{fmtEuro(m.personal)}</td>
                        <td className="px-2 py-1.5 text-right font-mono text-slate-500">{fmtEuro(m.materiales)}</td>
                        <td className="px-2 py-1.5 text-right font-mono">{fmtEuro(m.total_costes)}</td>
                        <td className={`px-2 py-1.5 text-right font-bold font-mono ${m.beneficio >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {fmtEuro(m.beneficio)}
                        </td>
                        <td className="px-2 py-1.5"><BarraMargen pct={m.margen} /></td>
                        <td className={`px-2 py-1.5 text-right font-mono ${(m.desviacion || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {(m.desviacion || 0) > 0 ? '+' : ''}{fmtEuro(m.desviacion || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB LICITACIONES
// ════════════════════════════════════════════════════════════════════════════

function TabLicitaciones({ informeLic, exportarCSV }: any) {
  // Pipeline como barras horizontales (funnel)
  const estadoOrden = ['nueva', 'en_analisis', 'go', 'presentada', 'adjudicada', 'no_go', 'perdida', 'descartada']
  const estadoLabel: Record<string, string> = {
    nueva: 'Nuevas', en_analisis: 'En análisis', go: 'GO', presentada: 'Presentadas',
    adjudicada: 'Adjudicadas', no_go: 'NO-GO', perdida: 'Perdidas', descartada: 'Descartadas',
  }
  const pipelineData = estadoOrden
    .filter(e => (informeLic.por_estado?.[e] || 0) > 0)
    .map(e => ({
      estado: estadoLabel[e] || e,
      count:  informeLic.por_estado?.[e] || 0,
      fill:   ESTADO_COLORS[e] || C.slate,
    }))

  // Top oportunidades por scoring para barras
  const topOps = [...(informeLic.ultimas_oportunidades || [])]
    .sort((a: any, b: any) => b.scoring - a.scoring)
    .slice(0, 8)
    .map((o: any) => ({
      name:    o.titulo?.length > 22 ? o.titulo.slice(0, 20) + '…' : o.titulo,
      Scoring: o.scoring || 0,
      fill:    o.scoring >= 70 ? C.emerald : o.scoring >= 50 ? C.amber : C.slate,
    }))

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard label="Total oportunidades"  valor={informeLic.kpis?.total_oportunidades  || 0} icon={Target}       color="text-blue-700" />
        <KpiCard label="Tasa de éxito"         valor={fmtPct(informeLic.kpis?.tasa_exito_pct)}   icon={CheckCircle2} color="text-emerald-700" />
        <KpiCard label="Importe adjudicado"    valor={fmtEuro(informeLic.kpis?.importe_adjudicado)} icon={Euro}      color="text-[#1a3c34]" />
        <KpiCard label="Pipeline presupuesto"  valor={fmtEuro(informeLic.kpis?.presupuesto_pipeline)} icon={Activity} color="text-purple-700" />
        <KpiCard label="Scoring medio"         valor={informeLic.kpis?.scoring_medio        || 0} icon={Target}       color="text-amber-700" />
        <KpiCard label="Contratos activos"     valor={informeLic.kpis?.contratos_activos    || 0} icon={CheckCircle2} color="text-emerald-700" />
      </div>

      {/* Gráficos lado a lado */}
      {(pipelineData.length > 0 || topOps.length > 0) && (
        <div className="grid md:grid-cols-2 gap-5">

          {/* Barras pipeline */}
          {pipelineData.length > 0 && (
            <ChartCard title="Pipeline por estado">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pipelineData} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.slateL} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="estado" width={90} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip formatter={(v: any) => [v + ' licitaciones', 'Cantidad']} />
                  <Bar dataKey="count" name="Licitaciones" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    {pipelineData.map((d: any, i: number) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Barras scoring */}
          {topOps.length > 0 && (
            <ChartCard title="Scoring — top oportunidades">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topOps} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.slateL} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip formatter={(v: any) => [v + ' / 100', 'Score']} />
                  <ReferenceLine x={70} stroke={C.emerald} strokeDasharray="4 4" />
                  <ReferenceLine x={50} stroke={C.amber}   strokeDasharray="4 4" />
                  <Bar dataKey="Scoring" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {topOps.map((d: any, i: number) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      )}

      {/* Tabla oportunidades */}
      <ChartCard title="Últimas oportunidades"
        actions={
          <>
            <BtnExcel onClick={() => exportarLicitacionesExcel(informeLic)} />
            <BtnPDF   onClick={() => window.print()} />
            {informeLic.ultimas_oportunidades?.length > 0 && (
              <button onClick={() => exportarCSV(informeLic.ultimas_oportunidades, 'licitaciones')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold">
                <Download size={12} /> CSV
              </button>
            )}
          </>
        }>
        <div className="space-y-2">
          {(informeLic.ultimas_oportunidades || []).map((o: any) => (
            <div key={o.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{o.titulo}</p>
                <p className="text-[10px] text-slate-400 truncate">{o.organismo}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span className="text-xs font-mono text-slate-600">{fmtEuro(o.presupuesto)}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${o.scoring >= 70 ? 'bg-emerald-100 text-emerald-700' : o.scoring >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                  {o.scoring}
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full capitalize">{o.estado}</span>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB RRHH
// ════════════════════════════════════════════════════════════════════════════

function TabRRHH({ informeRRHH, exportarCSV }: any) {
  const p = informeRRHH.plantilla  || {}
  const f = informeRRHH.fichajes   || {}
  const a = informeRRHH.ausencias  || {}

  // Barras: distribución de la plantilla
  const plantillaData = [
    { name: 'Activos',   value: p.activos         || 0, fill: C.emerald },
    { name: 'Inactivos', value: (p.total || 0) - (p.activos || 0), fill: C.slateL.replace('e2', 'a0') },
  ].filter(d => d.value > 0)

  // Barras: horas trabajadas vs extra
  const horasData = [
    { name: 'Horas normales', value: Math.max(0, (f.total_horas || 0) - (f.horas_extra || 0)), fill: C.verde },
    { name: 'Horas extra',    value: f.horas_extra || 0, fill: C.amber },
  ]

  // Dona ausencias por tipo si existe
  const ausenciasData = a.por_tipo
    ? Object.entries(a.por_tipo).map(([k, v]: any, i) => ({
        name: k, value: v,
        pct: a.total > 0 ? v / a.total * 100 : 0,
      }))
    : []

  const ausColores = [C.rojo, C.amber, C.azul, C.slate, C.violeta, C.pink]

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Plantilla total"      valor={p.total              || 0}                    icon={Users}         color="text-[#1a3c34]" />
        <KpiCard label="Empleados activos"    valor={p.activos            || 0}                    icon={Users}         color="text-emerald-700" />
        <KpiCard label="Horas trabajadas"     valor={(f.total_horas       || 0) + 'h'}             icon={Activity}      color="text-blue-700" />
        <KpiCard label="Horas extra"          valor={(f.horas_extra       || 0) + 'h'}             icon={Activity}
          alerta={(f.horas_extra || 0) > 40} color="text-amber-700" />
        <KpiCard label="Ausencias mes"        valor={a.total              || 0}                    icon={Calendar}      color="text-slate-700" />
        <KpiCard label="Pend. aprobar"        valor={a.pendientes_aprobar || 0}                    icon={AlertTriangle}
          alerta={(a.pendientes_aprobar || 0) > 0} color="text-amber-700" />
        <KpiCard label="Coste nómina est."    valor={fmtEuro(informeRRHH.coste_nomina_estimado)}   icon={Euro}          color="text-slate-700" />
        <KpiCard label="Contratos vencer 30d" valor={p.contratos_vencer_30d || 0}                  icon={AlertTriangle}
          alerta={(p.contratos_vencer_30d || 0) > 0} />
      </div>

      {/* Gráficos */}
      <div className="grid md:grid-cols-3 gap-5">

        {/* Barras horas */}
        <div className="md:col-span-2">
          <ChartCard title="Distribución de horas">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={horasData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.slateL} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} width={40} />
                <Tooltip formatter={(v: any) => [v + ' h', '']} />
                {(f.horas_extra || 0) > 40 && (
                  <ReferenceLine y={40} stroke={C.rojo} strokeDasharray="4 4"
                    label={{ value: 'Límite 80h/año', fontSize: 9, fill: C.rojo, position: 'right' }} />
                )}
                <Bar dataKey="value" name="Horas" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {horasData.map((d: any, i: number) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Dona plantilla activa/inactiva */}
        <ChartCard title="Estado plantilla">
          <div className="flex flex-col items-center justify-center h-[180px]">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={plantillaData} dataKey="value" cx="50%" cy="50%"
                  innerRadius={45} outerRadius={70} labelLine={false} label={LabelDonut}>
                  {plantillaData.map((d: any, i: number) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any, n: any) => [v + ' empleados', n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-1">
              {plantillaData.map((d: any) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: d.fill }} />
                  <span className="text-[11px] text-slate-500">{d.name}: <span className="font-bold text-slate-700">{d.value}</span></span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Dona ausencias por tipo (si hay datos) */}
      {ausenciasData.length > 0 && (
        <ChartCard title="Ausencias por tipo">
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={200} height={160}>
              <PieChart>
                <Pie data={ausenciasData} dataKey="value" cx="50%" cy="50%"
                  innerRadius={40} outerRadius={70} labelLine={false} label={LabelDonut}>
                  {ausenciasData.map((_: any, i: number) => (
                    <Cell key={i} fill={ausColores[i % ausColores.length]} />
                  ))}
                </Pie>
                <Tooltip content={<TooltipPie />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {ausenciasData.map((d: any, i: number) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ausColores[i % ausColores.length] }} />
                  <span className="text-xs text-slate-700 capitalize">{d.name}:</span>
                  <span className="text-xs font-bold text-slate-900">{d.value}</span>
                  <span className="text-[10px] text-slate-400">({fmtPct(d.pct)})</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      )}

      {/* Tabla empleados */}
      <ChartCard title="Plantilla"
        actions={
          <>
            <BtnExcel onClick={() => exportarRRHHExcel(informeRRHH)} />
            <BtnPDF   onClick={() => window.print()} />
            {informeRRHH.empleados_detalle?.length > 0 && (
              <button onClick={() => exportarCSV(informeRRHH.empleados_detalle, 'rrhh_plantilla')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold">
                <Download size={12} /> CSV
              </button>
            )}
          </>
        }>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="bg-slate-50">
              <th className="text-left px-3 py-2 font-semibold text-slate-500">Empleado</th>
              <th className="text-left px-3 py-2 font-semibold text-slate-500">Categoría</th>
              <th className="text-left px-3 py-2 font-semibold text-slate-500">Centro</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-500">Salario bruto</th>
              <th className="text-left px-3 py-2 font-semibold text-slate-500">Estado</th>
            </tr></thead>
            <tbody>
              {(informeRRHH.empleados_detalle || []).map((e: any) => (
                <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <p className="font-semibold text-slate-800">{e.nombre} {e.apellidos}</p>
                    <p className="text-slate-400 text-[10px]">{e.dni}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{e.categoria}</td>
                  <td className="px-3 py-2 text-slate-600">{e.centro || '—'}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtEuro(e.salario_bruto || 0)}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${e.estado === 'activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {e.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB TERRITORIO
// ════════════════════════════════════════════════════════════════════════════

function TabTerritorio({ informeTerr, mes }: any) {
  const op = informeTerr.operativo  || {}
  const ic = informeTerr.incidencias || {}
  const ca = informeTerr.calidad    || {}

  const totalCostes = (op.coste_personal || 0) + (op.coste_materiales || 0)
  const costesData = [
    { name: 'Personal',   value: Math.round(op.coste_personal   || 0), pct: totalCostes > 0 ? (op.coste_personal   || 0) / totalCostes * 100 : 0, fill: C.verde },
    { name: 'Materiales', value: Math.round(op.coste_materiales || 0), pct: totalCostes > 0 ? (op.coste_materiales || 0) / totalCostes * 100 : 0, fill: C.azul  },
  ].filter(d => d.value > 0)

  const partesData = [
    { name: 'Completados', value: op.partes_completados || 0, fill: C.emerald },
    { name: 'Pendientes',  value: Math.max(0, (op.partes_totales || 0) - (op.partes_completados || 0)), fill: C.slateL },
  ].filter(d => d.value > 0)

  const incidenciasData = [
    { name: 'Abiertas',     value: ic.abiertas     || 0, fill: C.rojo   },
    { name: 'SLA vencidos', value: ic.sla_vencidas || 0, fill: C.amber  },
  ]

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Centros activos"      valor={informeTerr.centros?.activos         || 0}        icon={Map}          color="text-[#1a3c34]" />
        <KpiCard label="Partes completados"   valor={op.partes_completados                || 0}        icon={CheckCircle2} color="text-emerald-700" />
        <KpiCard label="Horas trabajadas"     valor={(op.horas_trabajadas                 || 0) + 'h'} icon={Activity}     color="text-blue-700" />
        <KpiCard label="Coste personal"       valor={fmtEuro(op.coste_personal)}                       icon={Euro}         color="text-slate-700" />
        <KpiCard label="Incidencias abiertas" valor={ic.abiertas                          || 0}        icon={AlertTriangle} alerta={(ic.abiertas || 0) > 0} />
        <KpiCard label="SLA vencidos"         valor={ic.sla_vencidas                      || 0}        icon={AlertTriangle} alerta={(ic.sla_vencidas || 0) > 0} />
        <KpiCard label="Calidad media"        valor={(ca.media_mes || 0) + '/5'}                       icon={Target}
          color={(ca.media_mes || 0) >= 4 ? 'text-emerald-700' : (ca.media_mes || 0) >= 3 ? 'text-amber-700' : 'text-red-700'} />
        <KpiCard label="Inspecciones mes"     valor={ca.num_inspecciones                  || 0}        icon={FileText}     color="text-slate-700" />
      </div>

      {/* Gráficos */}
      <div className="grid md:grid-cols-3 gap-5">

        {/* Dona costes */}
        {costesData.length > 0 && (
          <ChartCard title={`Costes operativos — ${mes}`}
            actions={<BtnExcel onClick={() => exportarTerritorioExcel(informeTerr)} />}>
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={costesData} dataKey="value" cx="50%" cy="50%"
                    innerRadius={45} outerRadius={70} labelLine={false} label={LabelDonut}>
                    {costesData.map((d: any, i: number) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<TooltipPie />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                {costesData.map((d: any) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: d.fill }} />
                    <span className="text-[11px] text-slate-500">{d.name}: <span className="font-semibold text-slate-700">{fmtEuro(d.value)}</span></span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        )}

        {/* Dona partes */}
        {partesData.length > 0 && (
          <ChartCard title="Partes de trabajo">
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={partesData} dataKey="value" cx="50%" cy="50%"
                    innerRadius={45} outerRadius={70} labelLine={false} label={LabelDonut}>
                    {partesData.map((d: any, i: number) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any, n: any) => [v + ' partes', n]} />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-500 mt-2 text-center">
                {op.partes_completados || 0} de {op.partes_totales || 0} completados
              </p>
            </div>
          </ChartCard>
        )}

        {/* Barras incidencias */}
        <ChartCard title="Incidencias">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={incidenciasData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.slateL} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} width={28} allowDecimals={false} />
              <Tooltip formatter={(v: any) => [v, 'Incidencias']} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {incidenciasData.map((d: any, i: number) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Resumen centros */}
      <ChartCard title="Resumen centros">
        <div className="space-y-2 text-sm">
          {[
            { l: 'Total centros',            v: informeTerr.centros?.total                          || 0,   fmt: (x: any) => x },
            { l: 'Centros activos',          v: informeTerr.centros?.activos                        || 0,   fmt: (x: any) => x },
            { l: 'Presupuesto anual total',  v: fmtEuro(informeTerr.centros?.total_presupuesto_anual|| 0),  fmt: (x: any) => x },
            { l: 'Partes totales mes',       v: op.partes_totales                                   || 0,   fmt: (x: any) => x },
          ].map(({ l, v }) => (
            <div key={l} className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">{l}</span>
              <span className="font-bold">{v}</span>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB RENDIMIENTO
// ════════════════════════════════════════════════════════════════════════════

function TabRendimiento({ datos }: { datos: any }) {
  const [selId, setSelId] = useState<string | null>(null)
  const proyectos: any[] = datos?.proyectos || []
  const r = datos?.resumen || {}
  const sel = proyectos.find((p: any) => p.id === selId) || null

  // Barras: margen real por proyecto
  const margenChart = proyectos.map((p: any) => ({
    name:    p.titulo?.length > 18 ? p.titulo.slice(0, 16) + '…' : p.titulo,
    Margen:  parseFloat((p.margen_real || 0).toFixed(1)),
    fill:    p.semaforo === 'rojo' ? C.rojo : p.semaforo === 'amarillo' ? C.amber : C.emerald,
  }))

  // Línea evolución mensual del proyecto seleccionado
  const mesesChart = (sel?.meses || []).map((m: any) => ({
    periodo:   m.periodo,
    Ingresos:  Math.round(m.ingresos     || 0),
    Costes:    Math.round(m.total_costes || 0),
    Beneficio: Math.round(m.beneficio    || 0),
    Margen:    parseFloat((m.margen      || 0).toFixed(1)),
  }))

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Proyectos activos"  valor={r.total_proyectos    || 0}           icon={Activity}      color="text-[#1a3c34]" />
        <KpiCard label="🔴 En rojo"          valor={r.proyectos_rojo    || 0}           icon={AlertTriangle} alerta={(r.proyectos_rojo || 0) > 0} />
        <KpiCard label="🟡 En amarillo"      valor={r.proyectos_amarillo|| 0}           icon={AlertTriangle} color="text-amber-700" />
        <KpiCard label="Margen global"       valor={fmtPct(r.margen_global || 0)}       icon={Target}
          color={(r.margen_global || 0) >= 15 ? 'text-emerald-700' : (r.margen_global || 0) >= 10 ? 'text-amber-700' : 'text-red-700'} />
        <KpiCard label="Ingresos acum."      valor={fmtEuro(r.total_ingresos  || 0)}    icon={Euro}          color="text-blue-700" />
        <KpiCard label="Costes acum."        valor={fmtEuro(r.total_costes    || 0)}    icon={Gauge}         color="text-slate-700" />
        <KpiCard label="Beneficio acum."     valor={fmtEuro(r.total_beneficio || 0)}    icon={TrendingUp}
          color={(r.total_beneficio || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'} />
        <KpiCard label="🟢 En verde"          valor={r.proyectos_verde  || 0}           icon={CheckCircle2}  color="text-emerald-700" />
      </div>

      {/* Gráfico margen por proyecto */}
      {margenChart.length > 0 && (
        <ChartCard title="Margen real por proyecto">
          <ResponsiveContainer width="100%" height={Math.max(180, margenChart.length * 36)}>
            <BarChart data={margenChart} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.slateL} horizontal={false} />
              <XAxis type="number" tickFormatter={v => v + '%'} tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, 'auto']} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip formatter={(v: any) => [fmtPct(v), 'Margen real']} />
              <ReferenceLine x={10} stroke={C.amber}   strokeDasharray="4 4" label={{ value: '10%', fontSize: 9, fill: C.amber,   position: 'right' }} />
              <ReferenceLine x={15} stroke={C.emerald} strokeDasharray="4 4" label={{ value: '15%', fontSize: 9, fill: C.emerald, position: 'right' }} />
              <Bar dataKey="Margen" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {margenChart.map((d: any, i: number) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Tabla proyectos */}
      <ChartCard title="Proyectos activos — desviación presupuestaria"
        actions={
          <>
            <BtnExcel onClick={() => exportarRendimientoExcel(datos)} />
            <BtnPDF   onClick={() => imprimirInformeRendimiento(datos)} />
          </>
        }>
        {proyectos.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">No hay proyectos activos con seguimiento mensual registrado.</p>
        )}
        {proyectos.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="text-left px-3 py-2 font-semibold w-8">▲</th>
                  <th className="text-left px-3 py-2 font-semibold">Proyecto</th>
                  <th className="text-center px-3 py-2 font-semibold">Avance</th>
                  <th className="text-right px-3 py-2 font-semibold">Margen real</th>
                  <th className="text-right px-3 py-2 font-semibold">Proyectado</th>
                  <th className="text-right px-3 py-2 font-semibold">Desv. total</th>
                  <th className="text-right px-3 py-2 font-semibold">Desv. personal</th>
                  <th className="text-right px-3 py-2 font-semibold">Desv. materiales</th>
                  <th className="text-left px-3 py-2 font-semibold">Alertas</th>
                </tr>
              </thead>
              <tbody>
                {proyectos.map((p: any) => (
                  <tr key={p.id}
                    onClick={() => setSelId(selId === p.id ? null : p.id)}
                    className={`border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors
                      ${p.semaforo === 'rojo' ? 'bg-red-50/40' : p.semaforo === 'amarillo' ? 'bg-amber-50/30' : ''}
                      ${selId === p.id ? 'ring-2 ring-inset ring-[#1a3c34]/20' : ''}`}>
                    <td className="px-3 py-2.5"><Semaforo valor={p.semaforo} /></td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-slate-800 truncate max-w-[200px]">{p.titulo}</p>
                      <p className="text-slate-400 text-[10px] truncate">{p.organismo}</p>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-slate-700 font-mono">{p.meses_ejecutados}/{p.meses_ejecutados + p.meses_restantes}</span>
                      <div className="w-16 mx-auto h-1 bg-slate-200 rounded-full mt-1">
                        <div className="h-full bg-[#1a3c34] rounded-full" style={{ width: p.pct_ejecucion + '%' }} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right"><BarraMargen pct={p.margen_real} /></td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`text-xs font-bold font-mono ${p.margen_proyectado < 5 ? 'text-red-700' : p.margen_proyectado < 10 ? 'text-amber-600' : 'text-emerald-700'}`}>
                        {fmtPct(p.margen_proyectado)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right"><DesvCell pct={p.desviacion_partidas?.total?.pct || 0} /></td>
                    <td className="px-3 py-2.5 text-right"><DesvCell pct={p.desviacion_partidas?.personal?.pct || 0} /></td>
                    <td className="px-3 py-2.5 text-right"><DesvCell pct={p.desviacion_partidas?.materiales?.pct || 0} /></td>
                    <td className="px-3 py-2.5">
                      {(p.alertas || []).length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {(p.alertas as any[]).slice(0, 2).map((a: any, i: number) => (
                            <span key={i} className={`text-[10px] ${a.nivel === 'critica' ? 'text-red-600 font-bold' : 'text-amber-600'}`}>
                              {a.nivel === 'critica' ? '⚠️' : '!'} {a.msg}
                            </span>
                          ))}
                          {(p.alertas as any[]).length > 2 && (
                            <span className="text-[10px] text-slate-400">+{p.alertas.length - 2} más</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-emerald-600">✓ Sin alertas</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      {/* Detalle proyecto seleccionado */}
      {sel && (
        <div className="bg-white border-2 border-[#1a3c34]/20 rounded-2xl p-5 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Semaforo valor={sel.semaforo} />
                <h3 className="text-sm font-bold text-slate-900">{sel.titulo}</h3>
              </div>
              <p className="text-xs text-slate-400 ml-6">{sel.organismo}</p>
            </div>
            <button onClick={() => setSelId(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
          </div>

          {/* Alertas */}
          {(sel.alertas || []).length > 0 && (
            <div className="space-y-1">
              {(sel.alertas as any[]).map((a: any, i: number) => (
                <div key={i} className={`flex items-start gap-2 px-4 py-2.5 rounded-xl text-xs ${a.nivel === 'critica' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  <span className="font-semibold">[{a.nivel.toUpperCase()}]</span>
                  <span>{a.msg}</span>
                </div>
              ))}
            </div>
          )}

          {/* Gráfico evolución mensual contrato */}
          {mesesChart.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Evolución mensual P&L</h4>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={mesesChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.slateL} vertical={false} />
                  <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#64748b' }} width={48} />
                  <Tooltip content={<TooltipEuro />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={0} stroke={C.rojo} strokeDasharray="3 3" />
                  <Line dataKey="Ingresos"  stroke={C.azul}    strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line dataKey="Costes"    stroke={C.slate}   strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line dataKey="Beneficio" stroke={C.emerald} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Gráfico margen mensual */}
          {mesesChart.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Evolución margen mensual</h4>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={mesesChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.slateL} vertical={false} />
                  <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tickFormatter={v => v + '%'} tick={{ fontSize: 10, fill: '#64748b' }} width={36} />
                  <Tooltip content={<TooltipPct />} />
                  <ReferenceLine y={10} stroke={C.amber}   strokeDasharray="4 4" />
                  <ReferenceLine y={15} stroke={C.emerald} strokeDasharray="4 4" />
                  <Line dataKey="Margen" name="Margen %" stroke={C.verde} strokeWidth={2.5}
                    dot={{ r: 3, fill: C.verde }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Índices */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-slate-400 mb-1 uppercase">IPC (coste)</p>
              <p className={`text-lg font-black ${sel.indice_coste > 110 ? 'text-red-700' : sel.indice_coste > 100 ? 'text-amber-600' : 'text-emerald-700'}`}>
                {(sel.indice_coste || 100).toFixed(0)}
              </p>
              <p className="text-[10px] text-slate-400">&gt;100 = sobrecoste</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-slate-400 mb-1 uppercase">Avance temporal</p>
              <p className="text-lg font-black text-[#1a3c34]">{fmtPct(sel.pct_ejecucion)}</p>
              <p className="text-[10px] text-slate-400">{sel.meses_ejecutados}/{sel.meses_ejecutados + sel.meses_restantes} meses</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-slate-400 mb-1 uppercase">Margen estimado</p>
              <p className="text-lg font-black text-slate-700">{fmtPct(sel.margen_estimado)}</p>
              <p className="text-[10px] text-slate-400">en oferta</p>
            </div>
          </div>

          {/* Tablas desviación */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Desviación por partida — acumulada</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="text-left px-3 py-2 font-semibold">Partida</th>
                    <th className="text-right px-3 py-2 font-semibold">Estimado acum.</th>
                    <th className="text-right px-3 py-2 font-semibold">Real acum.</th>
                    <th className="text-right px-3 py-2 font-semibold">Desviación (€)</th>
                    <th className="text-right px-3 py-2 font-semibold">Desviación (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { l: '👷 Personal',   k: 'personal' },
                    { l: '🧴 Materiales', k: 'materiales' },
                    { l: '🔧 Maquinaria', k: 'maquinaria' },
                    { l: '⚙️ Indirectos', k: 'indirectos' },
                    { l: '📊 TOTAL',      k: 'total' },
                  ].map(({ l, k }) => {
                    const d = sel.desviacion_partidas?.[k] || {}
                    const esTotal = k === 'total'
                    return (
                      <tr key={k} className={`border-b border-slate-50 ${esTotal ? 'bg-slate-50 font-bold' : ''}`}>
                        <td className="px-3 py-2">{l}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-500">{fmtEuro(d.estimado || 0)}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmtEuro(d.real || 0)}</td>
                        <td className={`px-3 py-2 text-right font-mono ${(d.desv || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {(d.desv || 0) > 0 ? '+' : ''}{fmtEuro(d.desv || 0)}
                        </td>
                        <td className="px-3 py-2 text-right"><DesvCell pct={d.pct || 0} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Proyección a fin de contrato</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <KpiCard label="Ingresos proy."  valor={fmtEuro(sel.proyeccion?.ingresos      || 0)} color="text-blue-700" />
              <KpiCard label="Costes proy."    valor={fmtEuro(sel.proyeccion?.total_costes  || 0)} color="text-slate-700" />
              <KpiCard label="Beneficio proy." valor={fmtEuro(sel.proyeccion?.beneficio     || 0)}
                color={(sel.proyeccion?.beneficio || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}
                alerta={(sel.proyeccion?.beneficio || 0) < 0} />
              <KpiCard label="Margen proy."    valor={fmtPct(sel.proyeccion?.margen         || 0)}
                color={(sel.proyeccion?.margen || 0) >= 10 ? 'text-emerald-700' : (sel.proyeccion?.margen || 0) >= 5 ? 'text-amber-700' : 'text-red-700'}
                alerta={(sel.proyeccion?.margen || 0) < 5} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="text-left px-3 py-2 font-semibold">Partida</th>
                    <th className="text-right px-3 py-2 font-semibold">Estimación total</th>
                    <th className="text-right px-3 py-2 font-semibold">Proyectado fin</th>
                    <th className="text-right px-3 py-2 font-semibold">Desv. €</th>
                    <th className="text-right px-3 py-2 font-semibold">Desv. %</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { l: '👷 Personal',   k: 'personal' },
                    { l: '🧴 Materiales', k: 'materiales' },
                    { l: '🔧 Maquinaria', k: 'maquinaria' },
                    { l: '⚙️ Indirectos', k: 'indirectos' },
                    { l: '📊 TOTAL',      k: 'total' },
                  ].map(({ l, k }) => {
                    const d = sel.desviacion_proyectada?.[k] || {}
                    const esTotal = k === 'total'
                    return (
                      <tr key={k} className={`border-b border-slate-50 ${esTotal ? 'bg-slate-50 font-bold' : ''}`}>
                        <td className="px-3 py-2">{l}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-500">{fmtEuro(d.estimado || 0)}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmtEuro(d.proyectado || 0)}</td>
                        <td className={`px-3 py-2 text-right font-mono ${(d.desv || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {(d.desv || 0) > 0 ? '+' : ''}{fmtEuro(d.desv || 0)}
                        </td>
                        <td className="px-3 py-2 text-right"><DesvCell pct={d.pct || 0} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// InformesPage principal
// ════════════════════════════════════════════════════════════════════════════

export default function InformesPage() {
  const [tab, setTab] = useState<'economico' | 'licitaciones' | 'rrhh' | 'territorio' | 'rendimiento'>('economico')
  const [mes, setMes] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [contratoSel, setContratoSel] = useState('')
  const [contratos, setContratos] = useState<any[]>([])

  const [informeEco,      setInformeEco]      = useState<any>(null)
  const [informeLic,      setInformeLic]      = useState<any>(null)
  const [informeRRHH,     setInformeRRHH]     = useState<any>(null)
  const [informeTerr,     setInformeTerr]     = useState<any>(null)
  const [informeContrato, setInformeContrato] = useState<any>(null)
  const [informeRend,     setInformeRend]     = useState<any>(null)

  const [cargando, setCargando] = useState(false)

  useEffect(() => { cargarTodo() }, [mes])
  useEffect(() => { if (contratoSel) cargarInformeContrato(contratoSel) }, [contratoSel])

  const cargarTodo = async () => {
    setCargando(true)
    try {
      const [eco, lic, rrhh, terr, rend] = await Promise.all([
        api.informeEconomicoGlobal(),
        api.informeLicitaciones(),
        api.informeRRHH({ mes }),
        api.informeTerritorio({ mes }),
        api.informeRendimiento(),
      ])
      setInformeEco(eco)
      setInformeLic(lic)
      setInformeRRHH(rrhh)
      setInformeTerr(terr)
      setInformeRend(rend)
      if (eco?.contratos) setContratos(eco.contratos)
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  const cargarInformeContrato = async (id: string) => {
    try {
      const r = await api.informeCostesContrato({ id })
      setInformeContrato(r)
    } catch (e) { /* silencioso */ }
  }

  const exportarCSV = (datos: any[], nombre: string) => {
    if (!datos.length) return
    const headers = Object.keys(datos[0]).join(';')
    const rows    = datos.map(d => Object.values(d).join(';')).join('\n')
    const blob    = new Blob(['\uFEFF' + headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' })
    const url     = URL.createObjectURL(blob)
    const a       = document.createElement('a')
    a.href = url; a.download = `${nombre}_${mes}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const cambiarMes = (dir: number) => {
    const [y, m] = mes.split('-').map(Number)
    let nm = m + dir, ny = y
    if (nm > 12) { nm = 1; ny++ }
    if (nm < 1)  { nm = 12; ny-- }
    setMes(`${ny}-${String(nm).padStart(2, '0')}`)
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e] rounded-xl shadow-lg">
            <BarChart3 size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Informes</h1>
            <p className="text-sm text-slate-500">Análisis integral de la empresa</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => cambiarMes(-1)} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">◀</button>
          <span className="text-sm font-bold px-4 py-2 bg-white border border-slate-200 rounded-xl">
            {MESES[parseInt(mes.split('-')[1])]} {mes.split('-')[0]}
          </span>
          <button onClick={() => cambiarMes(1)} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">▶</button>
          <button onClick={cargarTodo} disabled={cargando} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">
            {cargando ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: 'economico',    label: 'Económico / P&L', icon: TrendingUp },
          { id: 'licitaciones', label: 'Licitaciones',    icon: Target },
          { id: 'rrhh',         label: 'RRHH',            icon: Users },
          { id: 'territorio',   label: 'Territorio',      icon: Map },
          { id: 'rendimiento',  label: 'Rendimiento',     icon: Gauge },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors
              ${tab === t.id ? 'bg-[#1a3c34] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {cargando && !informeEco && (
        <div className="p-6 space-y-4"><SkeletonStats count={4} /><SkeletonList count={3} /></div>
      )}

      {tab === 'economico'    && informeEco    && (
        <TabEconomico
          informeEco={informeEco}
          informeContrato={informeContrato}
          contratoSel={contratoSel}
          setContratoSel={setContratoSel}
          exportarCSV={exportarCSV}
          mes={mes}
        />
      )}

      {tab === 'licitaciones' && informeLic    && (
        <TabLicitaciones informeLic={informeLic} exportarCSV={exportarCSV} />
      )}

      {tab === 'rrhh'         && informeRRHH   && (
        <TabRRHH informeRRHH={informeRRHH} exportarCSV={exportarCSV} />
      )}

      {tab === 'territorio'   && informeTerr   && (
        <TabTerritorio informeTerr={informeTerr} mes={mes} />
      )}

      {tab === 'rendimiento'  && (
        informeRend
          ? <TabRendimiento datos={informeRend} />
          : !cargando && <p className="text-sm text-slate-400 text-center py-16">Sin datos de rendimiento disponibles.</p>
      )}
    </div>
  )
}
