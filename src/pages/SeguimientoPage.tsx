import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../services/api'
import PipelineBar from '../components/PipelineBar'
import {
  BarChart3, Loader2, CheckCircle2, XCircle, AlertTriangle, X,
  Trophy, TrendingUp, Euro, Calendar, Save, Plus,
  Building2, Target
} from 'lucide-react'

function fmt(n: number) { return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' }
function fmtPct(n: number) { return n.toFixed(1) + '%' }

export default function SeguimientoPage() {
  const [searchParams] = useSearchParams()
  const idParam = searchParams.get('id')

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

  const cargarDatos = async () => {
    setCargando(true)
    try {
      const batch = await (api as any).batchSeguimiento()
      setOportunidades(batch.oportunidades?.oportunidades || [])
      setResumen(batch.resumen_contratos)
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargarDatos() }, [])

  // Si llega ?id= desde el pipeline, abrir formulario de resultado automáticamente
  useEffect(() => {
    if (!idParam || !oportunidades.length) return
    const opo = oportunidades.find((o: any) => o.id === idParam)
    if (opo && opo.estado === 'go' && !formResultado) {
      setFormResultado({
        oportunidad_id: opo.id,
        resultado: 'ganada',
        adjudicatario: '',
        importe_adjudicacion: opo.presupuesto ? String(opo.presupuesto) : '',
        motivo_perdida: '',
        fecha_inicio: '',
        fecha_fin: '',
        duracion_meses: '12',
        notas: ''
      })
    }
    // Si ya está adjudicada, abrir seguimiento mensual
    if (opo && opo.estado === 'adjudicada') {
      setSelectedContrato(opo.id)
    }
  }, [idParam, oportunidades])

  useEffect(() => {
    if (!selectedContrato) { setSeguimiento(null); setResultadoContrato(null); return }
    const cargar = async () => {
      try {
        const [res, seg] = await Promise.all([api.resultado(selectedContrato), api.seguimiento(selectedContrato)])
        setResultadoContrato(res.existe ? res : null)
        setSeguimiento(seg)
      } catch (e) { console.error(e) }
    }
    cargar()
  }, [selectedContrato])

  // Oportunidades GO o presentadas sin resultado registrado
  const goSinResultado = oportunidades.filter(o => o.estado === 'go' || o.estado === 'presentada')
  // Contratos adjudicados
  const adjudicados = (resumen?.contratos || []).filter((c: any) => c.resultado === 'ganada')

  const handleRegistrarResultado = async () => {
    if (!formResultado) return
    setGuardando('resultado')
    try {
      const r = await api.registrarResultado(formResultado)
      if (r.ok) {
        setMensaje('Resultado registrado: ' + r.resultado)
        setFormResultado(null)
        await cargarDatos()
        // Si ganada → abrir seguimiento mensual automáticamente
        if (formResultado.resultado === 'ganada') setSelectedContrato(formResultado.oportunidad_id)
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
        setMensaje(`Mes ${formMes.mes}/${formMes.anio}: Beneficio ${fmt(r.beneficio)} (${fmtPct(r.margen)})`)
        setFormMes(null)
        const seg = await api.seguimiento(selectedContrato)
        setSeguimiento(seg)
      } else setError(r.error || 'Error')
    } catch (e) { setError('Error') }
    finally { setGuardando('') }
  }

  if (cargando) return (
    <div className="flex flex-col items-center py-20">
      <Loader2 size={32} className="text-teal-500 animate-spin mb-3" />
      <p className="text-slate-500">Cargando...</p>
    </div>
  )

  return (
    <div className="max-w-5xl">

      {/* Pipeline */}
      <PipelineBar currentStep="seguimiento" showNext={false} />

      {/* Cabecera */}
      <div className="flex items-center gap-4 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg shadow-teal-200">
          <BarChart3 size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Seguimiento de contratos</h1>
          <p className="text-sm text-slate-500">Resultados, rentabilidad y aprendizaje</p>
        </div>
      </div>

      {mensaje && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span className="text-sm text-emerald-800">{mensaje}</span>
          <button onClick={() => setMensaje('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
          <AlertTriangle size={16} className="text-red-600" />
          <span className="text-sm text-red-800">{error}</span>
          <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

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
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Pendientes de resultado ({goSinResultado.length})
          </h3>
          {goSinResultado.map((o: any) => (
            <div key={o.id} className={`flex items-center justify-between p-3 rounded-xl mb-2 ${idParam === o.id ? 'bg-teal-50 border border-teal-200' : o.estado === 'presentada' ? 'bg-blue-50 border border-blue-200' : 'bg-amber-50 border border-amber-200'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${o.estado === 'presentada' ? 'bg-blue-200 text-blue-800' : 'bg-emerald-200 text-emerald-800'}`}>
                    {o.estado === 'presentada' ? '📨 Presentada' : '✅ GO'}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-800 truncate">{o.titulo}</p>
                <p className="text-xs text-slate-500">{o.organismo} — {o.presupuesto ? fmt(Number(o.presupuesto)) : '?'}</p>
              </div>
              <button
                onClick={() => setFormResultado({
                  oportunidad_id: o.id,
                  resultado: 'ganada',
                  adjudicatario: '',
                  importe_adjudicacion: o.presupuesto ? String(o.presupuesto) : '',
                  motivo_perdida: '',
                  fecha_inicio: '',
                  fecha_fin: '',
                  duracion_meses: '12',
                  notas: ''
                })}
                className="px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shrink-0 ml-3"
              >
                Registrar resultado
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Formulario registrar resultado */}
      {formResultado && (
        <div className="bg-teal-50 border-2 border-teal-300 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={18} className="text-teal-700" />
            <h3 className="text-sm font-bold text-teal-900">Registrar resultado de licitación</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {/* Resultado */}
            <div>
              <label className="block text-[10px] text-slate-500 uppercase mb-1">Resultado</label>
              <select
                value={formResultado.resultado}
                onChange={e => setFormResultado({ ...formResultado, resultado: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="ganada">✅ Ganada</option>
                <option value="perdida">❌ Perdida</option>
                <option value="desierta">⚠️ Desierta</option>
              </select>
            </div>

            {/* Adjudicatario si perdida */}
            {formResultado.resultado === 'perdida' && (
              <div>
                <label className="block text-[10px] text-slate-500 uppercase mb-1">Empresa ganadora</label>
                <input
                  type="text"
                  value={formResultado.adjudicatario}
                  onChange={e => setFormResultado({ ...formResultado, adjudicatario: e.target.value })}
                  placeholder="Nombre empresa adjudicataria"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            )}

            {/* Importe */}
            {formResultado.resultado !== 'desierta' && (
              <div>
                <label className="block text-[10px] text-slate-500 uppercase mb-1">Importe adjudicación (sin IVA)</label>
                <input
                  type="number"
                  step="any"
                  value={formResultado.importe_adjudicacion}
                  onChange={e => setFormResultado({ ...formResultado, importe_adjudicacion: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            )}

            {/* Fechas si ganada */}
            {formResultado.resultado === 'ganada' && (
              <>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase mb-1">Fecha inicio contrato</label>
                  <input
                    type="date"
                    value={formResultado.fecha_inicio}
                    onChange={e => setFormResultado({ ...formResultado, fecha_inicio: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase mb-1">Fecha fin contrato</label>
                  <input
                    type="date"
                    value={formResultado.fecha_fin}
                    onChange={e => setFormResultado({ ...formResultado, fecha_fin: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase mb-1">Duración (meses)</label>
                  <input
                    type="number"
                    value={formResultado.duracion_meses}
                    onChange={e => setFormResultado({ ...formResultado, duracion_meses: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </>
            )}

            {/* Motivo pérdida */}
            {formResultado.resultado === 'perdida' && (
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 uppercase mb-1">Motivo de pérdida</label>
                <input
                  type="text"
                  value={formResultado.motivo_perdida}
                  onChange={e => setFormResultado({ ...formResultado, motivo_perdida: e.target.value })}
                  placeholder="Precio, técnica, solvencia, criterios..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            )}

            {/* Notas */}
            <div className="col-span-2 md:col-span-3">
              <label className="block text-[10px] text-slate-500 uppercase mb-1">Notas / Aprendizajes</label>
              <input
                type="text"
                value={formResultado.notas}
                onChange={e => setFormResultado({ ...formResultado, notas: e.target.value })}
                placeholder="Qué podemos mejorar, lecciones aprendidas..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleRegistrarResultado}
              disabled={guardando === 'resultado'}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 rounded-xl"
            >
              {guardando === 'resultado' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {guardando === 'resultado' ? 'Guardando...' : 'Confirmar resultado'}
            </button>
            <button
              onClick={() => setFormResultado(null)}
              className="px-4 py-2.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Contratos adjudicados — seguimiento mensual */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Contratos adjudicados — seguimiento mensual</h3>
        {adjudicados.length === 0 ? (
          <p className="text-xs text-slate-400">No hay contratos adjudicados todavía.</p>
        ) : (
          <>
            <select
              value={selectedContrato}
              onChange={e => setSelectedContrato(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 mb-4"
            >
              <option value="">— Seleccionar contrato —</option>
              {adjudicados.map((c: any) => (
                <option key={c.oportunidad_id} value={c.oportunidad_id}>
                  {c.titulo?.substring(0, 70)} — {c.importe ? fmt(Number(c.importe)) : '?'}
                </option>
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
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="px-2 py-2 text-left font-semibold">Periodo</th>
                          <th className="px-2 py-2 text-right font-semibold">Ingresos</th>
                          <th className="px-2 py-2 text-right font-semibold">Costes</th>
                          <th className="px-2 py-2 text-right font-semibold">Beneficio</th>
                          <th className="px-2 py-2 text-right font-semibold">Margen</th>
                          <th className="px-2 py-2 text-right font-semibold">Desviación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {seguimiento.meses.map((m: any, i: number) => (
                          <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="px-2 py-1.5 font-medium">{m.periodo}</td>
                            <td className="px-2 py-1.5 text-right">{fmt(m.ingresos)}</td>
                            <td className="px-2 py-1.5 text-right">{fmt(m.total_costes)}</td>
                            <td className={`px-2 py-1.5 text-right font-bold ${m.beneficio >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(m.beneficio)}</td>
                            <td className={`px-2 py-1.5 text-right ${m.margen >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtPct(m.margen)}</td>
                            <td className={`px-2 py-1.5 text-right ${m.desviacion <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {m.desviacion > 0 ? '+' : ''}{fmtPct(m.desviacion_pct)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Añadir mes */}
                <button
                  onClick={() => setFormMes({
                    mes: new Date().getMonth() + 1,
                    anio: new Date().getFullYear(),
                    ingresos: '', coste_personal: '', coste_materiales: '',
                    coste_maquinaria: '', otros_costes: '',
                    incidencias: '0', penalizaciones: '0', notas: ''
                  })}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl w-full justify-center"
                >
                  <Plus size={14} /> Registrar mes
                </button>

                {formMes && (
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-teal-900 mb-3">Datos del mes</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <div><label className="text-[10px] text-slate-500">Mes</label><input type="number" min={1} max={12} value={formMes.mes} onChange={e => setFormMes({ ...formMes, mes: e.target.value })} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-center" /></div>
                      <div><label className="text-[10px] text-slate-500">Año</label><input type="number" value={formMes.anio} onChange={e => setFormMes({ ...formMes, anio: e.target.value })} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-center" /></div>
                      <div><label className="text-[10px] text-slate-500">Ingresos facturados</label><input type="number" step="any" value={formMes.ingresos} onChange={e => setFormMes({ ...formMes, ingresos: e.target.value })} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" /></div>
                      <div><label className="text-[10px] text-slate-500">Coste personal</label><input type="number" step="any" value={formMes.coste_personal} onChange={e => setFormMes({ ...formMes, coste_personal: e.target.value })} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" /></div>
                      <div><label className="text-[10px] text-slate-500">Coste materiales</label><input type="number" step="any" value={formMes.coste_materiales} onChange={e => setFormMes({ ...formMes, coste_materiales: e.target.value })} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" /></div>
                      <div><label className="text-[10px] text-slate-500">Coste maquinaria</label><input type="number" step="any" value={formMes.coste_maquinaria} onChange={e => setFormMes({ ...formMes, coste_maquinaria: e.target.value })} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" /></div>
                      <div><label className="text-[10px] text-slate-500">Otros costes</label><input type="number" step="any" value={formMes.otros_costes} onChange={e => setFormMes({ ...formMes, otros_costes: e.target.value })} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" /></div>
                      <div><label className="text-[10px] text-slate-500">Penalizaciones</label><input type="number" step="any" value={formMes.penalizaciones} onChange={e => setFormMes({ ...formMes, penalizaciones: e.target.value })} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" /></div>
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
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${
                c.resultado === 'ganada' ? 'bg-emerald-50' :
                c.resultado === 'perdida' ? 'bg-red-50' : 'bg-slate-50'
              }`}>
                {c.resultado === 'ganada' ? <Trophy size={16} className="text-emerald-600 shrink-0" /> :
                 c.resultado === 'perdida' ? <XCircle size={16} className="text-red-500 shrink-0" /> :
                 <AlertTriangle size={16} className="text-amber-500 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate">{c.titulo}</p>
                  <p className="text-[10px] text-slate-500">{c.organismo}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold">{c.importe ? fmt(Number(c.importe)) : '—'}</p>
                  {c.adjudicatario && c.resultado === 'perdida' && (
                    <p className="text-[10px] text-red-600">→ {c.adjudicatario}</p>
                  )}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                  c.resultado === 'ganada' ? 'bg-emerald-200 text-emerald-800' :
                  c.resultado === 'perdida' ? 'bg-red-200 text-red-800' :
                  'bg-slate-200 text-slate-800'
                }`}>{c.resultado}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}