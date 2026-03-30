import { useState, useEffect } from 'react'
import { api } from '../services/api'
import {
  BarChart3, TrendingUp, Users, Map, FileText, Download,
  Loader2, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
  RefreshCw, Calendar, Euro, Target, Activity
} from 'lucide-react'

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

export default function InformesPage() {
  const [tab, setTab] = useState<'economico'|'licitaciones'|'rrhh'|'territorio'>('economico')
  const [mes, setMes] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })
  const [contratoSel, setContratoSel] = useState('')
  const [contratos, setContratos] = useState<any[]>([])

  // Datos
  const [informeEco, setInformeEco] = useState<any>(null)
  const [informeLic, setInformeLic] = useState<any>(null)
  const [informeRRHH, setInformeRRHH] = useState<any>(null)
  const [informeTerr, setInformeTerr] = useState<any>(null)
  const [informeContrato, setInformeContrato] = useState<any>(null)

  const [cargando, setCargando] = useState(false)
  const [expandido, setExpandido] = useState<string|null>(null)

  useEffect(() => { cargarTodo() }, [mes])
  useEffect(() => {
    if (contratoSel) cargarInformeContrato(contratoSel)
  }, [contratoSel])

  const cargarTodo = async () => {
    setCargando(true)
    try {
      const [eco, lic, rrhh, terr, conts] = await Promise.all([
        api.informeEconomicoGlobal(),
        api.informeLicitaciones(),
        api.informeRRHH({ mes }),
        api.informeTerritorio({ mes }),
        Promise.resolve({ contratos: [] })
      ])
      setInformeEco(eco)
      setInformeLic(lic)
      setInformeRRHH(rrhh)
      setInformeTerr(terr)
      // Cargar lista contratos activos para el selector
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
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === t.id ? 'bg-[#1a3c34] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {cargando && !informeEco && (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-[#1a3c34]"/></div>
      )}

      {/* ═══ TAB ECONÓMICO / P&L ═══ */}
      {tab === 'economico' && informeEco && (
        <div className="space-y-6">
          {/* KPIs globales */}
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

          {/* Selector contrato para detalle */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Análisis detallado por contrato</h3>
              {informeEco.contratos?.length > 0 && (
                <button onClick={() => exportarCSV(informeEco.contratos, 'contratos_pl')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold">
                  <Download size={12}/> CSV
                </button>
              )}
            </div>
            <select value={contratoSel} onChange={e => setContratoSel(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm mb-4 bg-white">
              <option value="">— Seleccionar contrato —</option>
              {(informeEco.contratos||[]).map((c: any) => (
                <option key={c.id} value={c.id}>{c.titulo} ({fmtPct(c.margen_real_pct)} margen)</option>
              ))}
            </select>

            {/* Tabla resumen todos los contratos */}
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

          {/* Detalle contrato seleccionado */}
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

              {/* KPIs del contrato */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <KpiCard label="Ingresos acum." valor={fmtEuro(informeContrato.acumulado?.total_ingresos)} color="text-blue-700" />
                <KpiCard label="Costes acum."   valor={fmtEuro(informeContrato.acumulado?.total_costes)}   color="text-slate-700" />
                <KpiCard label="Beneficio acum." valor={fmtEuro(informeContrato.acumulado?.total_beneficio)}
                  color={(informeContrato.acumulado?.total_beneficio||0)>=0?'text-emerald-700':'text-red-700'} />
                <KpiCard label="Margen real" valor={fmtPct(informeContrato.acumulado?.margen_pct)}
                  alerta={(informeContrato.acumulado?.margen_pct||0) < 10}
                  color={(informeContrato.acumulado?.margen_pct||0)>=15?'text-emerald-700':'text-amber-700'} />
              </div>

              {/* Desglose costes */}
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

              {/* Evolución mensual */}
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

          {/* Pipeline por estado */}
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

          {/* Últimas oportunidades */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Últimas oportunidades</h3>
              {informeLic.ultimas_oportunidades?.length > 0 && (
                <button onClick={() => exportarCSV(informeLic.ultimas_oportunidades, 'licitaciones')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold">
                  <Download size={12}/> CSV
                </button>
              )}
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

          {/* Listado empleados */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Plantilla</h3>
              {informeRRHH.empleados_detalle?.length > 0 && (
                <button onClick={() => exportarCSV(informeRRHH.empleados_detalle, 'rrhh_plantilla')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold">
                  <Download size={12}/> CSV
                </button>
              )}
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
              <h3 className="text-sm font-bold text-slate-900 mb-3">Costes operativos {mes}</h3>
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
    </div>
  )
}