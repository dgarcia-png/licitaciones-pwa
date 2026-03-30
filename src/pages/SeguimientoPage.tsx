import { useState, useEffect } from 'react'
import { api } from '../services/api'
import {
  BarChart3, Loader2, CheckCircle2, XCircle, AlertTriangle, X,
  Trophy, TrendingUp, TrendingDown, Euro, Calendar, Save, Plus,
  ChevronDown, ChevronUp, Building2, Target
} from 'lucide-react'

function fmt(n: number) { return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' }
function fmtPct(n: number) { return n.toFixed(1) + '%' }

export default function SeguimientoPage() {
  const [oportunidades, setOportunidades] = useState<any[]>([])
  const [resumen, setResumen] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState('')

  // Formulario resultado
  const [formResultado, setFormResultado] = useState<any>(null)

  // Seguimiento mensual
  const [selectedContrato, setSelectedContrato] = useState('')
  const [seguimiento, setSeguimiento] = useState<any>(null)
  const [resultadoContrato, setResultadoContrato] = useState<any>(null)
  const [formMes, setFormMes] = useState<any>(null)
  const [plMesActual, setPlMesActual] = useState<any>(null)

  const cargarDatos = async () => {
    setCargando(true)
    try {
      const [opoData, resData] = await Promise.all([api.oportunidades(), api.resumenContratos()])
      setOportunidades(opoData.oportunidades || [])
      setResumen(resData)
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargarDatos() }, [])

  useEffect(() => {
    if (!selectedContrato) { setSeguimiento(null); setResultadoContrato(null); return }
    const cargar = async () => {
      try {
        const [res, seg, pl] = await Promise.all([
          api.resultado(selectedContrato),
          api.seguimiento(selectedContrato),
          api.plMesActual(selectedContrato).catch(() => null)
        ])
        setResultadoContrato(res.existe ? res : null)
        setSeguimiento(seg)
        setPlMesActual(pl?.ok ? pl : null)
      } catch (e) { console.error(e) }
    }
    cargar()
  }, [selectedContrato])

  // Oportunidades GO/GO_APROBADO sin resultado registrado
  const goSinResultado = oportunidades.filter(o => ['go', 'go_aprobado'].includes(o.estado))
  // Contratos adjudicados en ejecución
  const adjudicados = (resumen?.contratos || []).filter((c: any) => c.resultado === 'ganada')

  const handleRegistrarResultado = async () => {
    if (!formResultado) return
    setGuardando('resultado')
    try {
      const r = await api.registrarResultado(formResultado)
      if (r.ok) {
        let msg = r.resultado === 'ganada' ? '🏆 ¡CONTRATO ADJUDICADO! ' : r.resultado === 'perdida' ? '❌ Resultado registrado: perdida' : '⚪ Contrato desierto'
        // Mostrar triggers ejecutados
        if (r.triggers) {
          if (r.triggers.subrogacion?.ok && !r.triggers.subrogacion?.skipped) {
            msg += ' · ✅ Subrogación creada en RRHH'
          }
          if (r.triggers.conocimiento?.ok) {
            msg += ' · ✅ Guardado en base de conocimiento'
          }
          if (r.triggers.territorio?.ok) {
            msg += ` · 🗺️ ${r.triggers.territorio.centros_creados || 0} centros creados en Territorio`
          }
          if (r.triggers.errores?.length > 0) {
            msg += ' · ⚠️ Algunos triggers fallaron'
          }
        }
        setMensaje(msg)
        setFormResultado(null)
        await cargarDatos()
      } else setError(r.error || 'Error')
    } catch (e) { setError('Error registrando') }
    finally { setGuardando('') }
  }

  const handleRegistrarMes = async () => {
    if (!formMes) return
    setGuardando('mes')
    try {
      const r = await api.registrarSeguimiento({ ...formMes, oportunidad_id: selectedContrato })
      if (r.ok) {
        setMensaje(`Mes ${formMes.mes}/${formMes.anio}: Ingresos ${fmt(r.total_ingresos)} · Costes ${fmt(r.total_costes)} · Beneficio ${fmt(r.beneficio)} (${fmtPct(r.margen)})`)
        setFormMes(null)
        const seg = await api.seguimiento(selectedContrato)
        setSeguimiento(seg)
      } else setError(r.error || 'Error')
    } catch (e) { setError('Error') }
    finally { setGuardando('') }
  }

  if (cargando) return (<div className="flex flex-col items-center py-20"><Loader2 size={32} className="text-blue-500 animate-spin mb-3" /><p className="text-slate-500">Cargando...</p></div>)

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg shadow-teal-200"><BarChart3 size={22} className="text-white" /></div>
        <div><h1 className="text-2xl font-bold text-slate-900">Seguimiento de contratos</h1><p className="text-sm text-slate-500">Resultados, rentabilidad y aprendizaje</p></div>
      </div>

      {mensaje && <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4"><CheckCircle2 size={16} className="text-emerald-600" /><span className="text-sm text-emerald-800">{mensaje}</span><button onClick={() => setMensaje('')} className="ml-auto"><X size={14} /></button></div>}
      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4"><AlertTriangle size={16} className="text-red-600" /><span className="text-sm text-red-800">{error}</span><button onClick={() => setError('')} className="ml-auto"><X size={14} /></button></div>}

      {/* Stats globales */}
      {resumen?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
            <Trophy size={20} className="text-emerald-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-emerald-900">{resumen.stats.ganadas}</p>
            <p className="text-xs text-emerald-600">Ganadas</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <XCircle size={20} className="text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-900">{resumen.stats.perdidas}</p>
            <p className="text-xs text-red-600">Perdidas</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <Target size={20} className="text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-900">{resumen.stats.tasa_exito}%</p>
            <p className="text-xs text-blue-600">Tasa éxito</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <BarChart3 size={20} className="text-amber-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-amber-900">{resumen.stats.total_presentadas}</p>
            <p className="text-xs text-amber-600">Presentadas</p>
          </div>
        </div>
      )}

      {/* Pendientes de resultado */}
      {goSinResultado.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Pendientes de resultado ({goSinResultado.length})</h3>
          {goSinResultado.map((o: any) => (
            <div key={o.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{o.titulo}</p>
                <p className="text-xs text-slate-500">{o.organismo} — {o.presupuesto ? fmt(Number(o.presupuesto)) : '?'}</p>
              </div>
              <button onClick={() => setFormResultado({ oportunidad_id: o.id, resultado: 'ganada', adjudicatario: '', importe_adjudicacion: '', motivo_perdida: '', fecha_inicio: '', fecha_fin: '', duracion_meses: '12', notas: '' })}
                className="px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shrink-0 ml-3">
                Registrar resultado
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Formulario registrar resultado */}
      {formResultado && (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-teal-900 mb-4">Registrar resultado</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Resultado</label>
              <select value={formResultado.resultado} onChange={e => setFormResultado({ ...formResultado, resultado: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="ganada">Ganada</option>
                <option value="perdida">Perdida</option>
                <option value="desierta">Desierta</option>
              </select>
            </div>
            {formResultado.resultado === 'perdida' && (
              <div>
                <label className="text-[10px] text-slate-500 uppercase">Adjudicatario</label>
                <input type="text" value={formResultado.adjudicatario} onChange={e => setFormResultado({ ...formResultado, adjudicatario: e.target.value })}
                  placeholder="Empresa ganadora" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
            )}
            {formResultado.resultado !== 'desierta' && (
              <div>
                <label className="text-[10px] text-slate-500 uppercase">Importe adjudicación (sin IVA)</label>
                <input type="number" step="any" value={formResultado.importe_adjudicacion} onChange={e => setFormResultado({ ...formResultado, importe_adjudicacion: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
            )}
            {formResultado.resultado === 'ganada' && (
              <>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Fecha inicio</label>
                  <input type="date" value={formResultado.fecha_inicio} onChange={e => setFormResultado({ ...formResultado, fecha_inicio: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Fecha fin</label>
                  <input type="date" value={formResultado.fecha_fin} onChange={e => setFormResultado({ ...formResultado, fecha_fin: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Duración (meses)</label>
                  <input type="number" value={formResultado.duracion_meses} onChange={e => setFormResultado({ ...formResultado, duracion_meses: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
              </>
            )}
            {formResultado.resultado === 'perdida' && (
              <div className="col-span-2">
                <label className="text-[10px] text-slate-500 uppercase">Motivo de pérdida</label>
                <input type="text" value={formResultado.motivo_perdida} onChange={e => setFormResultado({ ...formResultado, motivo_perdida: e.target.value })}
                  placeholder="Precio, técnica, solvencia..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
            )}
          </div>

          {/* Panel informativo de acciones automáticas */}
          {formResultado.resultado === 'ganada' && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl mb-3">
              <p className="text-xs font-semibold text-teal-800 mb-1">✅ Al confirmar como GANADA el sistema hará automáticamente:</p>
              <ul className="text-xs text-teal-700 space-y-0.5 list-disc list-inside">
                <li>Cambiará el estado a <strong>Adjudicada</strong></li>
                <li>Creará la <strong>subrogación en RRHH</strong> si hay personal a subrogar</li>
                <li>Guardará el contrato en la <strong>base de conocimiento</strong></li>
                <li>Enviará <strong>email de notificación</strong> a dirección</li>
              </ul>
            </div>
          )}
          {formResultado.resultado === 'perdida' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-3">
              <p className="text-xs font-semibold text-amber-800 mb-1">📚 Al registrar como perdida:</p>
              <ul className="text-xs text-amber-700 space-y-0.5 list-disc list-inside">
                <li>Se guardará adjudicatario y precio en la <strong>base de conocimiento</strong></li>
                <li>Alimentará el análisis de competidores para futuras licitaciones</li>
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleRegistrarResultado} disabled={guardando === 'resultado'}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 rounded-lg">
              {guardando === 'resultado' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar
            </button>
            <button onClick={() => setFormResultado(null)} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg">Cancelar</button>
          </div>
        </div>
      )}

      {/* Contratos adjudicados — seguimiento */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Contratos adjudicados — seguimiento mensual</h3>
        {adjudicados.length === 0 ? (
          <p className="text-xs text-slate-400">No hay contratos adjudicados todavía.</p>
        ) : (
          <>
            <select value={selectedContrato} onChange={e => setSelectedContrato(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 mb-4">
              <option value="">— Seleccionar contrato —</option>
              {adjudicados.map((c: any) => (
                <option key={c.oportunidad_id} value={c.oportunidad_id}>{c.titulo?.substring(0, 70)} — {c.importe ? fmt(Number(c.importe)) : '?'}</option>
              ))}
            </select>

            {selectedContrato && resultadoContrato && (
              <div className="space-y-4">
                {/* Resumen contrato */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase">Adjudicación</span>
                    <p className="text-sm font-bold">{fmt(Number(resultadoContrato.importe_adjudicacion) || 0)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase">Nuestra oferta</span>
                    <p className="text-sm font-bold">{fmt(Number(resultadoContrato.nuestra_oferta) || 0)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase">Margen estimado</span>
                    <p className="text-sm font-bold">{fmtPct(Number(resultadoContrato.margen_estimado) || 0)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase">Duración</span>
                    <p className="text-sm font-bold">{resultadoContrato.duracion_meses || '?'} meses</p>
                  </div>
                </div>

                {/* Resumen acumulado */}
                {seguimiento?.resumen && seguimiento.total > 0 && (
                  <div className={`grid grid-cols-4 gap-3 p-4 rounded-xl border ${seguimiento.resumen.total_beneficio >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 uppercase">Ingresos acum.</span>
                      <p className="text-sm font-bold">{fmt(seguimiento.resumen.total_ingresos)}</p>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 uppercase">Costes acum.</span>
                      <p className="text-sm font-bold">{fmt(seguimiento.resumen.total_costes)}</p>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 uppercase">Beneficio acum.</span>
                      <p className={`text-sm font-bold ${seguimiento.resumen.total_beneficio >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(seguimiento.resumen.total_beneficio)}</p>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 uppercase">Margen medio</span>
                      <p className={`text-sm font-bold ${seguimiento.resumen.margen_medio >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtPct(seguimiento.resumen.margen_medio)}</p>
                    </div>
                  </div>
                )}

                {/* Tabla mensual */}
                {seguimiento?.meses?.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-slate-100">
                        <th className="px-2 py-2 text-left font-semibold">Periodo</th>
                        <th className="px-2 py-2 text-right font-semibold">Ingresos</th>
                        <th className="px-2 py-2 text-right font-semibold">Costes</th>
                        <th className="px-2 py-2 text-right font-semibold">Beneficio</th>
                        <th className="px-2 py-2 text-right font-semibold">Margen</th>
                        <th className="px-2 py-2 text-right font-semibold">Desviación</th>
                      </tr></thead>
                      <tbody>
                        {seguimiento.meses.map((m: any, i: number) => (
                          <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="px-2 py-1.5 font-medium">{m.periodo}</td>
                            <td className="px-2 py-1.5 text-right">{fmt(m.ingresos_base||0)}</td>
                            <td className="px-2 py-1.5 text-right text-emerald-600">{m.ingresos_adicionales > 0 ? '+'+fmt(m.ingresos_adicionales) : '—'}</td>
                            <td className="px-2 py-1.5 text-right">{fmt(m.coste_personal||0)}</td>
                            <td className="px-2 py-1.5 text-right">{fmt(m.coste_materiales||0)}</td>
                            <td className="px-2 py-1.5 text-right text-amber-600">{m.materiales_no_recurrentes > 0 ? fmt(m.materiales_no_recurrentes) : '—'}</td>
                            <td className="px-2 py-1.5 text-right text-purple-600">{m.servicios_externos > 0 ? fmt(m.servicios_externos) : '—'}</td>
                            <td className="px-2 py-1.5 text-right text-slate-500">{fmt(m.costes_indirectos||0)} <span className="text-[9px]">({m.pct_indirectos||15}%)</span></td>
                            <td className="px-2 py-1.5 text-right font-semibold">{fmt(m.total_costes||0)}</td>
                            <td className={`px-2 py-1.5 text-right font-bold ${(m.beneficio||0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(m.beneficio||0)}</td>
                            <td className={`px-2 py-1.5 text-right ${(m.margen||0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtPct(m.margen||0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* P&L Mes Actual — Tiempo Real */}
                {plMesActual && (
                  <div className="bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e] rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-white uppercase">📊 P&L Mes actual ({plMesActual.periodo}) — Tiempo real</p>
                      <span className="text-[10px] px-2 py-0.5 bg-white/20 text-white rounded-full">Auto desde partes</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                      {[
                        { l: 'Ingresos base', v: fmt(plMesActual.ingresos_base), c: 'text-emerald-300' },
                        { l: 'Total costes', v: fmt(plMesActual.total_costes), c: 'text-red-300' },
                        { l: 'Beneficio', v: fmt(plMesActual.beneficio), c: plMesActual.beneficio >= 0 ? 'text-emerald-300 font-black' : 'text-red-300 font-black' },
                        { l: 'Margen', v: fmtPct(plMesActual.margen), c: plMesActual.margen >= 0 ? 'text-emerald-300 font-black' : 'text-red-300 font-black' },
                      ].map((k,i) => (
                        <div key={i} className="bg-white/10 rounded-lg p-2 text-center">
                          <p className={`text-sm font-bold ${k.c}`}>{k.v}</p>
                          <p className="text-[9px] text-white/60 uppercase mt-0.5">{k.l}</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px] text-white/70">
                      <span>👷 Personal: {fmt(plMesActual.coste_personal)}</span>
                      <span>🧴 Materiales: {fmt(plMesActual.coste_materiales)}</span>
                      <span>🔧 Maquinaria: {fmt(plMesActual.coste_maquinaria)}</span>
                      <span>⚙️ Indirectos ({15}%): {fmt(plMesActual.costes_indirectos)}</span>
                      <span>📋 Partes: {plMesActual.partes_mes}</span>
                      <span>⏱️ Horas: {plMesActual.horas_mes}h</span>
                    </div>
                  </div>
                )}

                {/* Añadir mes */}
                <button onClick={() => setFormMes({ 
                    mes: new Date().getMonth() + 1, anio: new Date().getFullYear(),
                    ingresos_base: '', ingresos_adicionales: '0',
                    coste_personal: '', ajuste_personal: '0',
                    coste_materiales: '', materiales_no_recurrentes: '0',
                    servicios_externos: '0', coste_maquinaria: '',
                    pct_indirectos: '15',
                    incidencias: '0', penalizaciones: '0', notas: ''
                  })}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl w-full justify-center">
                  <Plus size={14} /> Registrar mes
                </button>

                {formMes && (
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-teal-900 mb-3">Datos del mes</h4>
                    {/* Periodo */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div><label className="text-[10px] text-slate-500 block mb-1">Mes</label><input type="number" min={1} max={12} value={formMes.mes} onChange={e => setFormMes({...formMes, mes: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-center" /></div>
                      <div><label className="text-[10px] text-slate-500 block mb-1">Año</label><input type="number" value={formMes.anio} onChange={e => setFormMes({...formMes, anio: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-center" /></div>
                    </div>
                    {/* Ingresos */}
                    <p className="text-[10px] font-bold text-emerald-700 uppercase mb-1">💶 Ingresos</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Base (adjudicación/meses) <span className="text-emerald-600">auto</span></label>
                        <input type="number" step="any" value={formMes.ingresos_base} onChange={e => setFormMes({...formMes, ingresos_base: e.target.value})} placeholder="Calculado automáticamente" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Ingresos adicionales</label>
                        <input type="number" step="any" value={formMes.ingresos_adicionales} onChange={e => setFormMes({...formMes, ingresos_adicionales: e.target.value})} placeholder="0.00" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                      </div>
                    </div>
                    {/* Costes directos */}
                    <p className="text-[10px] font-bold text-red-700 uppercase mb-1">📊 Costes directos</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Personal <span className="text-emerald-600">auto desde partes</span></label>
                        <input type="number" step="any" value={formMes.coste_personal} onChange={e => setFormMes({...formMes, coste_personal: e.target.value})} placeholder="Calculado desde partes" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Ajuste personal (extras, incentivos...)</label>
                        <input type="number" step="any" value={formMes.ajuste_personal} onChange={e => setFormMes({...formMes, ajuste_personal: e.target.value})} placeholder="0.00" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Materiales recurrentes <span className="text-emerald-600">auto</span></label>
                        <input type="number" step="any" value={formMes.coste_materiales} onChange={e => setFormMes({...formMes, coste_materiales: e.target.value})} placeholder="Calculado desde partes" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Maquinaria <span className="text-emerald-600">auto</span></label>
                        <input type="number" step="any" value={formMes.coste_maquinaria} onChange={e => setFormMes({...formMes, coste_maquinaria: e.target.value})} placeholder="Calculado desde partes" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Materiales no recurrentes</label>
                        <input type="number" step="any" value={formMes.materiales_no_recurrentes} onChange={e => setFormMes({...formMes, materiales_no_recurrentes: e.target.value})} placeholder="0.00" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Servicios externos</label>
                        <input type="number" step="any" value={formMes.servicios_externos} onChange={e => setFormMes({...formMes, servicios_externos: e.target.value})} placeholder="0.00" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                      </div>
                    </div>
                    {/* Costes indirectos */}
                    <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">⚙️ Costes indirectos</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">% sobre costes directos</label>
                        <input type="number" step="any" min="0" max="100" value={formMes.pct_indirectos} onChange={e => setFormMes({...formMes, pct_indirectos: e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Penalizaciones</label>
                        <input type="number" step="any" value={formMes.penalizaciones} onChange={e => setFormMes({...formMes, penalizaciones: e.target.value})} placeholder="0.00" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="text-[10px] text-slate-500 block mb-1">Notas</label>
                      <input type="text" value={formMes.notas} onChange={e => setFormMes({...formMes, notas: e.target.value})} placeholder="Observaciones del mes..." className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleRegistrarMes} disabled={guardando === 'mes'}
                        className="flex items-center gap-1 px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 rounded-lg">
                        {guardando === 'mes' ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Guardar mes
                      </button>
                      <button onClick={() => setFormMes(null)} className="px-4 py-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg">Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Historial de resultados */}
      {resumen?.contratos?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Historial de resultados</h3>
          <div className="space-y-2">
            {resumen.contratos.map((c: any, i: number) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${c.resultado === 'ganada' ? 'bg-emerald-50' : c.resultado === 'perdida' ? 'bg-red-50' : 'bg-slate-50'}`}>
                {c.resultado === 'ganada' ? <Trophy size={16} className="text-emerald-600 shrink-0" /> :
                 c.resultado === 'perdida' ? <XCircle size={16} className="text-red-500 shrink-0" /> :
                 <AlertTriangle size={16} className="text-amber-500 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate">{c.titulo}</p>
                  <p className="text-[10px] text-slate-500">{c.organismo}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold">{c.importe ? fmt(Number(c.importe)) : '—'}</p>
                  {c.adjudicatario && c.resultado === 'perdida' && <p className="text-[10px] text-red-600">→ {c.adjudicatario}</p>}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                  c.resultado === 'ganada' ? 'bg-emerald-200 text-emerald-800' :
                  c.resultado === 'perdida' ? 'bg-red-200 text-red-800' : 'bg-slate-200 text-slate-800'
                }`}>{c.resultado}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}