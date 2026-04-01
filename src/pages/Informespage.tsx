import { SkeletonStats, SkeletonList } from '../components/Skeleton'
// src/pages/InformesPage.tsx — ACTUALIZADO 1 abril 2026
// Cambios:
//   1. Tab nueva "Rendimiento" — desviación por partidas, semáforos, proyección fin de contrato
//   2. Botones Excel (SheetJS) y PDF (print) en todos los tabs
// Requiere: npm install xlsx   (para el módulo exportInformes)

import { useState, useEffect } from 'react'
import { api } from '../services/api'
import {
  BarChart3, TrendingUp, Users, Map, FileText, Download,
  Loader2, AlertTriangle, CheckCircle2,
  RefreshCw, Calendar, Euro, Target, Activity, Gauge
} from 'lucide-react'
import {
  exportarEconomicoExcel,
  exportarLicitacionesExcel,
  exportarRRHHExcel,
  exportarTerritorioExcel,
  exportarRendimientoExcel,
  imprimirInformeRendimiento,
} from '../utils/exportInformes'

const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmtEuro(n: number) {
  if (!n) return '0 €'
  if (n >= 1000000) return (n/1000000).toFixed(2) + ' M€'
  if (n >= 1000) return (n/1000).toFixed(0) + ' K€'
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €'
}

function fmtPct(n: number) { return (n||0).toFixed(1) + '%' }

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

function BarraMargen({ pct, max = 30 }: { pct: number, max?: number }) {
  const w = Math.min(100, Math.abs(pct) / max * 100)
  const color = pct < 5 ? 'bg-red-500' : pct < 10 ? 'bg-amber-500' : pct < 20 ? 'bg-blue-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: w + '%' }} />
      </div>
      <span className={`text-xs font-bold w-12 text-right ${pct < 5 ? 'text-red-600' : pct < 10 ? 'text-amber-600' : 'text-emerald-600'}`}>{fmtPct(pct)}</span>
    </div>
  )
}

function BtnExcel({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold transition-colors">
      <Download size={12}/> Excel
    </button>
  )
}

function BtnPDF({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 rounded-lg font-semibold transition-colors">
      <FileText size={12}/> PDF
    </button>
  )
}

// ─── Semáforo rendimiento ────────────────────────────────────────────────────

function Semaforo({ valor }: { valor: 'rojo'|'amarillo'|'verde' }) {
  const map = { rojo: '🔴', amarillo: '🟡', verde: '🟢' }
  return <span className="text-base" title={valor}>{map[valor] || '⚪'}</span>
}

function DesvCell({ pct }: { pct: number }) {
  const color = pct > 15 ? 'text-red-700 font-bold' : pct > 5 ? 'text-amber-600' : pct < -5 ? 'text-emerald-600' : 'text-slate-600'
  const sign = pct > 0 ? '+' : ''
  return <span className={`text-xs font-mono ${color}`}>{sign}{fmtPct(pct)}</span>
}

// ─── Tab Rendimiento ─────────────────────────────────────────────────────────

function TabRendimiento({ datos }: { datos: any }) {
  const [selId, setSelId] = useState<string|null>(null)
  const proyectos: any[] = datos?.proyectos || []
  const r = datos?.resumen || {}
  const sel = proyectos.find((p: any) => p.id === selId) || null

  return (
    <div className="space-y-6">
      {/* KPIs globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Proyectos activos"  valor={r.total_proyectos||0}         icon={Activity} color="text-[#1a3c34]" />
        <KpiCard label="🔴 En rojo"          valor={r.proyectos_rojo||0}           icon={AlertTriangle} alerta={(r.proyectos_rojo||0)>0} />
        <KpiCard label="🟡 En amarillo"      valor={r.proyectos_amarillo||0}       icon={AlertTriangle} color="text-amber-700" />
        <KpiCard label="Margen global"       valor={fmtPct(r.margen_global||0)}   icon={Target}
          color={(r.margen_global||0)>=15?'text-emerald-700':(r.margen_global||0)>=10?'text-amber-700':'text-red-700'} />
        <KpiCard label="Ingresos acum."      valor={fmtEuro(r.total_ingresos||0)} icon={Euro}    color="text-blue-700" />
        <KpiCard label="Costes acum."        valor={fmtEuro(r.total_costes||0)}   icon={Gauge}   color="text-slate-700" />
        <KpiCard label="Beneficio acum."     valor={fmtEuro(r.total_beneficio||0)} icon={TrendingUp}
          color={(r.total_beneficio||0)>=0?'text-emerald-700':'text-red-700'} />
        <KpiCard label="🟢 En verde"          valor={r.proyectos_verde||0}         icon={CheckCircle2} color="text-emerald-700" />
      </div>

      {/* Tabla proyectos */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900">Proyectos activos — Desviación presupuestaria</h3>
          <div className="flex gap-2">
            <BtnExcel onClick={() => exportarRendimientoExcel(datos)} />
            <BtnPDF   onClick={() => imprimirInformeRendimiento(datos)} />
          </div>
        </div>

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
                    <td className="px-3 py-2.5 text-right">
                      <BarraMargen pct={p.margen_real} />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`text-xs font-bold font-mono ${p.margen_proyectado < 5 ? 'text-red-700' : p.margen_proyectado < 10 ? 'text-amber-600' : 'text-emerald-700'}`}>
                        {fmtPct(p.margen_proyectado)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <DesvCell pct={p.desviacion_partidas?.total?.pct || 0} />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <DesvCell pct={p.desviacion_partidas?.personal?.pct || 0} />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <DesvCell pct={p.desviacion_partidas?.materiales?.pct || 0} />
                    </td>
                    <td className="px-3 py-2.5">
                      {(p.alertas||[]).length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {(p.alertas as any[]).slice(0,2).map((a: any, i: number) => (
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
      </div>

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

          {/* Alertas del proyecto */}
          {(sel.alertas||[]).length > 0 && (
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

          {/* Desviación por partidas (acumulada) */}
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
                        <td className="px-3 py-2 text-right font-mono text-slate-500">{fmtEuro(d.estimado||0)}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmtEuro(d.real||0)}</td>
                        <td className={`px-3 py-2 text-right font-mono ${(d.desv||0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {(d.desv||0) > 0 ? '+' : ''}{fmtEuro(d.desv||0)}
                        </td>
                        <td className="px-3 py-2 text-right"><DesvCell pct={d.pct||0} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Proyección a fin de contrato */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Proyección a fin de contrato (tendencia)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <KpiCard label="Ingresos proy."   valor={fmtEuro(sel.proyeccion?.ingresos||0)}       color="text-blue-700" />
              <KpiCard label="Costes proy."     valor={fmtEuro(sel.proyeccion?.total_costes||0)}   color="text-slate-700" />
              <KpiCard label="Beneficio proy."  valor={fmtEuro(sel.proyeccion?.beneficio||0)}
                color={(sel.proyeccion?.beneficio||0)>=0?'text-emerald-700':'text-red-700'}
                alerta={(sel.proyeccion?.beneficio||0)<0} />
              <KpiCard label="Margen proy."     valor={fmtPct(sel.proyeccion?.margen||0)}
                color={(sel.proyeccion?.margen||0)>=10?'text-emerald-700':(sel.proyeccion?.margen||0)>=5?'text-amber-700':'text-red-700'}
                alerta={(sel.proyeccion?.margen||0)<5} />
            </div>

            {/* Desviación proyectada vs estimación total */}
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
                        <td className="px-3 py-2 text-right font-mono text-slate-500">{fmtEuro(d.estimado||0)}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmtEuro(d.proyectado||0)}</td>
                        <td className={`px-3 py-2 text-right font-mono ${(d.desv||0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {(d.desv||0) > 0 ? '+' : ''}{fmtEuro(d.desv||0)}
                        </td>
                        <td className="px-3 py-2 text-right"><DesvCell pct={d.pct||0} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Índices de performance */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-slate-400 mb-1 uppercase">IPC (coste)</p>
              <p className={`text-lg font-black ${sel.indice_coste > 110 ? 'text-red-700' : sel.indice_coste > 100 ? 'text-amber-600' : 'text-emerald-700'}`}>
                {(sel.indice_coste||100).toFixed(0)}
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

          {/* Evolución mensual */}
          {(sel.meses||[]).length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Evolución mensual</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500">
                      <th className="text-left px-2 py-2 font-semibold">Periodo</th>
                      <th className="text-right px-2 py-2 font-semibold">Ingresos</th>
                      <th className="text-right px-2 py-2 font-semibold">Personal</th>
                      <th className="text-right px-2 py-2 font-semibold">Materiales</th>
                      <th className="text-right px-2 py-2 font-semibold">Total costes</th>
                      <th className="text-right px-2 py-2 font-semibold">Beneficio</th>
                      <th className="px-2 py-2 font-semibold w-24">Margen</th>
                      <th className="text-right px-2 py-2 font-semibold">Desv. €</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sel.meses as any[]).map((m: any) => (
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
                        <td className={`px-2 py-1.5 text-right font-mono ${(m.desviacion||0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {(m.desviacion||0) > 0 ? '+' : ''}{fmtEuro(m.desviacion||0)}
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
// InformesPage principal
// ════════════════════════════════════════════════════════════════════════════

export default function InformesPage() {
  const [tab, setTab] = useState<'economico'|'licitaciones'|'rrhh'|'territorio'|'rendimiento'>('economico')
  const [mes, setMes] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })
  const [contratoSel, setContratoSel] = useState('')
  const [contratos, setContratos] = useState<any[]>([])

  const [informeEco, setInformeEco] = useState<any>(null)
  const [informeLic, setInformeLic] = useState<any>(null)
  const [informeRRHH, setInformeRRHH] = useState<any>(null)
  const [informeTerr, setInformeTerr] = useState<any>(null)
  const [informeContrato, setInformeContrato] = useState<any>(null)
  const [informeRend, setInformeRend] = useState<any>(null)

  const [cargando, setCargando] = useState(false)
  const [expandido, setExpandido] = useState<string|null>(null)

  useEffect(() => { cargarTodo() }, [mes])
  useEffect(() => {
    if (contratoSel) cargarInformeContrato(contratoSel)
  }, [contratoSel])

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
    } catch(e) { console.error(e) }
    finally { setCargando(false) }
  }

  const cargarInformeContrato = async (id: string) => {
    try {
      const r = await api.informeCostesContrato({ id })
      setInformeContrato(r)
    } catch(e) {}
  }

  const exportarCSV = (datos: any[], nombre: string) => {
    if (!datos.length) return
    const headers = Object.keys(datos[0]).join(';')
    const rows = datos.map(d => Object.values(d).join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${nombre}_${mes}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const cambiarMes = (dir: number) => {
    const [y, m] = mes.split('-').map(Number)
    let nm = m + dir, ny = y
    if (nm > 12) { nm = 1; ny++ }
    if (nm < 1) { nm = 12; ny-- }
    setMes(`${ny}-${String(nm).padStart(2,'0')}`)
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
          { id: 'economico',    label: 'Económico / P&L',  icon: TrendingUp },
          { id: 'licitaciones', label: 'Licitaciones',      icon: Target },
          { id: 'rrhh',         label: 'RRHH',              icon: Users },
          { id: 'territorio',   label: 'Territorio',         icon: Map },
          { id: 'rendimiento',  label: 'Rendimiento',        icon: Gauge },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === t.id ? 'bg-[#1a3c34] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {cargando && !informeEco && (
        <div className="p-6 space-y-4"><SkeletonStats count={4} /><SkeletonList count={3} /></div>
      )}

      {/* ═══ TAB ECONÓMICO / P&L ═══ */}
      {tab === 'economico' && informeEco && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Contratos activos"    valor={informeEco.global?.contratos_activos||0}  icon={Activity}   color="text-[#1a3c34]" />
            <KpiCard label="Ingresos acumulados"  valor={fmtEuro(informeEco.global?.total_ingresos)} icon={Euro}   color="text-blue-700" />
            <KpiCard label="Beneficio acumulado"  valor={fmtEuro(informeEco.global?.total_beneficio)} icon={TrendingUp} color={(informeEco.global?.total_beneficio||0)>=0?'text-emerald-700':'text-red-700'} />
            <KpiCard label="Margen global"        valor={fmtPct(informeEco.global?.margen_global_pct)} icon={Target}
              alerta={(informeEco.global?.margen_global_pct||0) < 10}
              color={(informeEco.global?.margen_global_pct||0)>=15?'text-emerald-700':(informeEco.global?.margen_global_pct||0)>=10?'text-amber-700':'text-red-700'} />
          </div>

          {informeEco.global?.contratos_alerta > 0 && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <AlertTriangle size={18} className="text-red-600 shrink-0" />
              <p className="text-sm font-bold text-red-700">
                ⚠️ {informeEco.global.contratos_alerta} contrato{informeEco.global.contratos_alerta>1?'s':''} con margen por debajo del 10%
              </p>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Análisis detallado por contrato</h3>
              <div className="flex gap-2">
                <BtnExcel onClick={() => exportarEconomicoExcel(informeEco)} />
                <BtnPDF   onClick={() => window.print()} />
                {informeEco.contratos?.length > 0 && (
                  <button onClick={() => exportarCSV(informeEco.contratos, 'contratos_pl')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold">
                    <Download size={12}/> CSV
                  </button>
                )}
              </div>
            </div>
            <select value={contratoSel} onChange={e => setContratoSel(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm mb-4 bg-white">
              <option value="">— Seleccionar contrato —</option>
              {(informeEco.contratos||[]).map((c: any) => (
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
                  {(informeEco.contratos||[]).map((c: any) => (
                    <tr key={c.id} onClick={() => setContratoSel(c.id)} className={`border-b border-slate-50 cursor-pointer hover:bg-slate-50 ${c.alerta_margen?'bg-red-50/50':''} ${contratoSel===c.id?'bg-blue-50':''}`}>
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-800 truncate max-w-[200px]">{c.titulo}</p>
                        <p className="text-slate-400 text-[10px] truncate">{c.organismo}</p>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{fmtEuro(c.ingresos_acum)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmtEuro(c.costes_acum)}</td>
                      <td className={`px-3 py-2 text-right font-bold font-mono ${c.beneficio_acum>=0?'text-emerald-700':'text-red-700'}`}>{fmtEuro(c.beneficio_acum)}</td>
                      <td className="px-3 py-2"><BarraMargen pct={c.margen_real_pct}/></td>
                      <td className="px-3 py-2 text-right text-slate-500">{c.meses_registrados}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {contratoSel && informeContrato?.ok && (
            <div className="bg-white border-2 border-[#1a3c34]/20 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{informeContrato.contrato?.titulo}</h3>
                  <p className="text-xs text-slate-400">{informeContrato.contrato?.organismo}</p>
                </div>
                <button onClick={() => exportarCSV(informeContrato.meses, `pl_${contratoSel}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#1a3c34] text-white rounded-lg font-semibold">
                  <Download size={12}/> Exportar
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <KpiCard label="Ingresos acum." valor={fmtEuro(informeContrato.acumulado?.total_ingresos)} color="text-blue-700" />
                <KpiCard label="Costes acum."   valor={fmtEuro(informeContrato.acumulado?.total_costes)}   color="text-slate-700" />
                <KpiCard label="Beneficio acum." valor={fmtEuro(informeContrato.acumulado?.total_beneficio)}
                  color={(informeContrato.acumulado?.total_beneficio||0)>=0?'text-emerald-700':'text-red-700'} />
                <KpiCard label="Margen real" valor={fmtPct(informeContrato.acumulado?.margen_pct)}
                  alerta={(informeContrato.acumulado?.margen_pct||0) < 10}
                  color={(informeContrato.acumulado?.margen_pct||0)>=15?'text-emerald-700':'text-amber-700'} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                  { l: '👷 Personal',     v: informeContrato.acumulado?.coste_personal },
                  { l: '🧴 Materiales',   v: informeContrato.acumulado?.coste_materiales },
                  { l: '🔧 Maquinaria',   v: informeContrato.acumulado?.coste_maquinaria },
                  { l: '⚙️ Indirectos',   v: informeContrato.acumulado?.costes_indirectos },
                ].map((k,i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400 mb-1">{k.l}</p>
                    <p className="text-sm font-bold text-slate-700">{fmtEuro(k.v||0)}</p>
                    <p className="text-[9px] text-slate-400">{informeContrato.acumulado?.total_costes>0?fmtPct((k.v||0)/informeContrato.acumulado.total_costes*100):'-'} del total</p>
                  </div>
                ))}
              </div>

              {informeContrato.meses?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase">Evolución mensual</h4>
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
                      </tr></thead>
                      <tbody>
                        {informeContrato.meses.map((m: any) => (
                          <tr key={m.periodo} className={`border-b border-slate-50 ${m.beneficio<0?'bg-red-50/50':''}`}>
                            <td className="px-2 py-1.5 font-semibold">{m.periodo}</td>
                            <td className="px-2 py-1.5 text-right font-mono">{fmtEuro(m.total_ingresos)}</td>
                            <td className="px-2 py-1.5 text-right font-mono text-slate-500">{fmtEuro(m.coste_personal)}</td>
                            <td className="px-2 py-1.5 text-right font-mono text-slate-500">{fmtEuro(m.coste_materiales)}</td>
                            <td className="px-2 py-1.5 text-right font-mono">{fmtEuro(m.total_costes)}</td>
                            <td className={`px-2 py-1.5 text-right font-bold font-mono ${m.beneficio>=0?'text-emerald-700':'text-red-700'}`}>{fmtEuro(m.beneficio)}</td>
                            <td className="px-2 py-1.5"><BarraMargen pct={m.margen}/></td>
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
      )}

      {/* ═══ TAB LICITACIONES ═══ */}
      {tab === 'licitaciones' && informeLic && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KpiCard label="Total oportunidades"  valor={informeLic.kpis?.total_oportunidades||0}    icon={Target}    color="text-blue-700" />
            <KpiCard label="Tasa de éxito"         valor={fmtPct(informeLic.kpis?.tasa_exito_pct)}    icon={CheckCircle2} color="text-emerald-700" />
            <KpiCard label="Importe adjudicado"    valor={fmtEuro(informeLic.kpis?.importe_adjudicado)} icon={Euro}    color="text-[#1a3c34]" />
            <KpiCard label="Pipeline presupuesto"  valor={fmtEuro(informeLic.kpis?.presupuesto_pipeline)} icon={Activity} color="text-purple-700" />
            <KpiCard label="Scoring medio"         valor={informeLic.kpis?.scoring_medio||0}           icon={Target}    color="text-amber-700" />
            <KpiCard label="Contratos activos"     valor={informeLic.kpis?.contratos_activos||0}       icon={CheckCircle2} color="text-emerald-700" />
          </div>

          {informeLic.por_estado && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Pipeline por estado</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(informeLic.por_estado).map(([estado, count]: any) => (
                  <div key={estado} className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-slate-800">{count}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{estado.replace(/_/g,' ')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Últimas oportunidades</h3>
              <div className="flex gap-2">
                <BtnExcel onClick={() => exportarLicitacionesExcel(informeLic)} />
                <BtnPDF   onClick={() => window.print()} />
                {informeLic.ultimas_oportunidades?.length > 0 && (
                  <button onClick={() => exportarCSV(informeLic.ultimas_oportunidades, 'licitaciones')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold">
                    <Download size={12}/> CSV
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {(informeLic.ultimas_oportunidades||[]).map((o: any) => (
                <div key={o.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{o.titulo}</p>
                    <p className="text-[10px] text-slate-400 truncate">{o.organismo}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-xs font-mono text-slate-600">{fmtEuro(o.presupuesto)}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${o.scoring>=70?'bg-emerald-100 text-emerald-700':o.scoring>=50?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-600'}`}>{o.scoring}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full capitalize">{o.estado}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB RRHH ═══ */}
      {tab === 'rrhh' && informeRRHH && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Plantilla total"      valor={informeRRHH.plantilla?.total||0}            icon={Users}     color="text-[#1a3c34]" />
            <KpiCard label="Empleados activos"    valor={informeRRHH.plantilla?.activos||0}           icon={Users}     color="text-emerald-700" />
            <KpiCard label="Horas trabajadas"     valor={(informeRRHH.fichajes?.total_horas||0)+'h'}  icon={Activity}  color="text-blue-700" />
            <KpiCard label="Horas extra"          valor={(informeRRHH.fichajes?.horas_extra||0)+'h'}  icon={Activity}  alerta={(informeRRHH.fichajes?.horas_extra||0)>40} color="text-amber-700" />
            <KpiCard label="Ausencias mes"        valor={informeRRHH.ausencias?.total||0}             icon={Calendar}  color="text-slate-700" />
            <KpiCard label="Pend. aprobar"        valor={informeRRHH.ausencias?.pendientes_aprobar||0} icon={AlertTriangle} alerta={(informeRRHH.ausencias?.pendientes_aprobar||0)>0} color="text-amber-700" />
            <KpiCard label="Coste nómina est."    valor={fmtEuro(informeRRHH.coste_nomina_estimado)}  icon={Euro}      color="text-slate-700" />
            <KpiCard label="Contratos vencer 30d" valor={informeRRHH.plantilla?.contratos_vencer_30d||0} icon={AlertTriangle} alerta={(informeRRHH.plantilla?.contratos_vencer_30d||0)>0} />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Plantilla</h3>
              <div className="flex gap-2">
                <BtnExcel onClick={() => exportarRRHHExcel(informeRRHH)} />
                <BtnPDF   onClick={() => window.print()} />
                {informeRRHH.empleados_detalle?.length > 0 && (
                  <button onClick={() => exportarCSV(informeRRHH.empleados_detalle, 'rrhh_plantilla')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold">
                    <Download size={12}/> CSV
                  </button>
                )}
              </div>
            </div>
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
                  {(informeRRHH.empleados_detalle||[]).map((e: any) => (
                    <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-800">{e.nombre} {e.apellidos}</p>
                        <p className="text-slate-400 text-[10px]">{e.dni}</p>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{e.categoria}</td>
                      <td className="px-3 py-2 text-slate-600">{e.centro||'—'}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmtEuro(e.salario_bruto||0)}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${e.estado==='activo'?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-500'}`}>{e.estado}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB TERRITORIO ═══ */}
      {tab === 'territorio' && informeTerr && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Centros activos"     valor={informeTerr.centros?.activos||0}              icon={Map}       color="text-[#1a3c34]" />
            <KpiCard label="Partes completados"  valor={informeTerr.operativo?.partes_completados||0}  icon={CheckCircle2} color="text-emerald-700" />
            <KpiCard label="Horas trabajadas"    valor={(informeTerr.operativo?.horas_trabajadas||0)+'h'} icon={Activity} color="text-blue-700" />
            <KpiCard label="Coste personal"      valor={fmtEuro(informeTerr.operativo?.coste_personal)} icon={Euro}     color="text-slate-700" />
            <KpiCard label="Incidencias abiertas" valor={informeTerr.incidencias?.abiertas||0}         icon={AlertTriangle} alerta={(informeTerr.incidencias?.abiertas||0)>0} />
            <KpiCard label="SLA vencidos"        valor={informeTerr.incidencias?.sla_vencidas||0}      icon={AlertTriangle} alerta={(informeTerr.incidencias?.sla_vencidas||0)>0} />
            <KpiCard label="Calidad media"       valor={(informeTerr.calidad?.media_mes||0)+'/5'}      icon={Target}
              color={(informeTerr.calidad?.media_mes||0)>=4?'text-emerald-700':(informeTerr.calidad?.media_mes||0)>=3?'text-amber-700':'text-red-700'} />
            <KpiCard label="Inspecciones mes"    valor={informeTerr.calidad?.num_inspecciones||0}      icon={FileText}  color="text-slate-700" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Costes operativos {mes}</h3>
                <BtnExcel onClick={() => exportarTerritorioExcel(informeTerr)} />
              </div>
              {[
                { l: '👷 Personal',    v: informeTerr.operativo?.coste_personal||0 },
                { l: '🧴 Materiales',  v: informeTerr.operativo?.coste_materiales||0 },
              ].map((k,i) => {
                const total = (informeTerr.operativo?.coste_personal||0) + (informeTerr.operativo?.coste_materiales||0)
                const pct = total > 0 ? k.v/total*100 : 0
                return (
                  <div key={i} className="mb-3">
                    <div className="flex justify-between text-xs mb-1"><span className="font-semibold">{k.l}</span><span className="font-mono">{fmtEuro(k.v)}</span></div>
                    <div className="h-2 bg-slate-100 rounded-full"><div className="h-full bg-[#1a3c34] rounded-full" style={{width:pct+'%'}}/></div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{fmtPct(pct)} del total</p>
                  </div>
                )
              })}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Resumen centros</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Total centros</span>
                  <span className="font-bold">{informeTerr.centros?.total||0}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Centros activos</span>
                  <span className="font-bold text-emerald-700">{informeTerr.centros?.activos||0}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Presupuesto anual total</span>
                  <span className="font-bold">{fmtEuro(informeTerr.centros?.total_presupuesto_anual||0)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">Partes totales mes</span>
                  <span className="font-bold">{informeTerr.operativo?.partes_totales||0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB RENDIMIENTO ═══ */}
      {tab === 'rendimiento' && (
        informeRend
          ? <TabRendimiento datos={informeRend} />
          : !cargando && <p className="text-sm text-slate-400 text-center py-16">Sin datos de rendimiento disponibles.</p>
      )}
    </div>
  )
}
