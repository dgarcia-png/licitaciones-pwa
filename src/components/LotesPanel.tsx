import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import {
  Layers, CheckCircle2, XCircle, Clock, Euro, Users,
  Calculator, ChevronRight, Loader2, Plus, RefreshCw,
  AlertTriangle, Target, Edit2, Save, X
} from 'lucide-react'

const DECISION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pendiente: { label: 'Pendiente',  color: 'text-slate-600',  bg: 'bg-slate-100',  icon: Clock },
  go:        { label: 'GO',         color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2 },
  no_go:     { label: 'NO-GO',      color: 'text-red-700',     bg: 'bg-red-100',     icon: XCircle },
  revisar:   { label: 'Revisar',    color: 'text-amber-700',   bg: 'bg-amber-100',   icon: AlertTriangle },
}

function fmtEuro(n: number) {
  if (!n) return '—'
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

interface Props {
  oportunidadId: string
  lotes: any[]
  cargando: boolean
  onRecargar: () => void
  modo?: 'detalle' | 'calculo' | 'decision'
  onSeleccionarLote?: (lote: any) => void
  loteSeleccionado?: string
}

export default function LotesPanel({
  oportunidadId, lotes, cargando, onRecargar, modo = 'detalle',
  onSeleccionarLote, loteSeleccionado
}: Props) {
  const navigate = useNavigate()
  const [creandoLotes, setCreandoLotes] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [formEdit, setFormEdit] = useState<any>({})
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const handleCrearLotes = async () => {
    setCreandoLotes(true)
    try {
      const r = await (api as any).crearLotesDesdeAnalisis(oportunidadId)
      if (r.ok) {
        showMsg(`✅ ${r.lotes_creados} lote${r.lotes_creados !== 1 ? 's' : ''} creado${r.lotes_creados !== 1 ? 's' : ''}`)
        onRecargar()
      } else showMsg('❌ ' + (r.error || 'Error'))
    } catch { showMsg('❌ Error de conexión') }
    finally { setCreandoLotes(false) }
  }

  const handleDecision = async (lote: any, decision: string) => {
    try {
      await (api as any).actualizarLote({ id: lote.id, decision })
      onRecargar()
    } catch { showMsg('❌ Error') }
  }

  const handleGuardarEdit = async () => {
    setGuardando(true)
    try {
      const r = await (api as any).actualizarLote({ id: editandoId, ...formEdit })
      if (r.ok) { showMsg('✅ Actualizado'); setEditandoId(null); onRecargar() }
      else showMsg('❌ ' + (r.error || 'Error'))
    } catch { showMsg('❌ Error') }
    finally { setGuardando(false) }
  }

  // Resumen global
  const totalPresupuesto = lotes.reduce((s, l) => s + (l.presupuesto_sin_iva || 0), 0)
  const totalHoras = lotes.reduce((s, l) => s + (l.horas_totales || 0), 0)
  const totalOferta = lotes.reduce((s, l) => s + (l.precio_oferta || 0), 0)
  const lotesGO = lotes.filter(l => l.decision === 'go').length
  const lotesNoGO = lotes.filter(l => l.decision === 'no_go').length

  if (cargando) return (
    <div className="text-center py-8"><Loader2 size={22} className="animate-spin text-violet-500 mx-auto" /></div>
  )

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`p-3 rounded-xl text-sm font-medium ${msg.includes('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg}
        </div>
      )}

      {/* Cabecera panel */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Layers size={15} className="text-violet-600" />
          Lotes ({lotes.length})
          {lotesGO > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{lotesGO} GO</span>}
          {lotesNoGO > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{lotesNoGO} NO-GO</span>}
        </h3>
        <div className="flex gap-2">
          <button onClick={onRecargar} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <RefreshCw size={14} />
          </button>
          {lotes.length === 0 && (
            <button onClick={handleCrearLotes} disabled={creandoLotes}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-700 hover:bg-violet-800 disabled:bg-violet-300 text-white text-xs font-bold rounded-lg">
              {creandoLotes ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Crear desde análisis
            </button>
          )}
        </div>
      </div>

      {/* Sin lotes */}
      {lotes.length === 0 && (
        <div className="text-center py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <Layers size={28} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-medium">Sin lotes creados</p>
          <p className="text-xs text-slate-400 mt-1">Analiza primero los pliegos, luego pulsa "Crear desde análisis"</p>
        </div>
      )}

      {/* Resumen global si hay varios lotes */}
      {lotes.length > 1 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-sm font-black text-slate-900">{fmtEuro(totalPresupuesto)}</p>
            <p className="text-[10px] text-slate-500">Presupuesto total</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-sm font-black text-slate-900">{totalHoras > 0 ? totalHoras.toLocaleString('es-ES') + 'h' : '—'}</p>
            <p className="text-[10px] text-slate-500">Horas totales</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${totalOferta > 0 ? 'bg-emerald-50' : 'bg-slate-50'}`}>
            <p className={`text-sm font-black ${totalOferta > 0 ? 'text-emerald-700' : 'text-slate-900'}`}>{totalOferta > 0 ? fmtEuro(totalOferta) : '—'}</p>
            <p className="text-[10px] text-slate-500">Total oferta</p>
          </div>
        </div>
      )}

      {/* Lista de lotes */}
      <div className="space-y-3">
        {lotes.map((lote: any) => {
          const decCfg = DECISION_CONFIG[lote.decision] || DECISION_CONFIG.pendiente
          const isSelected = loteSeleccionado === lote.id
          const isEditing = editandoId === lote.id

          return (
            <div key={lote.id}
              className={`rounded-2xl border-2 overflow-hidden transition-all ${isSelected ? 'border-violet-400 shadow-md shadow-violet-100' : lote.decision === 'go' ? 'border-emerald-200' : lote.decision === 'no_go' ? 'border-red-200' : 'border-slate-200'} bg-white`}>

              {/* Cabecera lote */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center text-sm font-black text-violet-700 flex-shrink-0">
                    {lote.num_lote}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <input type="text" value={formEdit.descripcion ?? lote.descripcion}
                        onChange={(e: any) => setFormEdit({ ...formEdit, descripcion: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-bold mb-2" />
                    ) : (
                      <p className="text-sm font-bold text-slate-900 mb-1">{lote.descripcion}</p>
                    )}

                    {/* Stats del lote */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {lote.presupuesto_sin_iva > 0 && (
                        <span className="flex items-center gap-1 text-xs text-slate-600">
                          <Euro size={11} className="text-slate-400" />
                          {fmtEuro(lote.presupuesto_sin_iva)}
                        </span>
                      )}
                      {lote.horas_totales > 0 && (
                        <span className="text-xs text-slate-500">{lote.horas_totales.toLocaleString('es-ES')}h</span>
                      )}
                      {lote.num_trabajadores > 0 && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Users size={11} className="text-slate-400" />
                          {lote.num_trabajadores} trabajadores
                        </span>
                      )}
                      {lote.precio_oferta > 0 && (
                        <span className="flex items-center gap-1 text-xs text-emerald-700 font-bold">
                          <Target size={11} />
                          Oferta: {fmtEuro(lote.precio_oferta)}
                          {lote.baja_pct > 0 && <span className="text-slate-400 font-normal">(-{lote.baja_pct.toFixed(1)}%)</span>}
                        </span>
                      )}
                    </div>

                    {lote.centros && !isEditing && (
                      <p className="text-xs text-slate-400 mt-1 truncate">{lote.centros}</p>
                    )}
                  </div>

                  {/* Badge decisión */}
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${decCfg.bg} flex-shrink-0`}>
                    <decCfg.icon size={12} className={decCfg.color} />
                    <span className={`text-[10px] font-bold ${decCfg.color}`}>{decCfg.label}</span>
                  </div>
                </div>

                {/* Campos edición */}
                {isEditing && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Presupuesto sin IVA (€)</label>
                      <input type="number" value={formEdit.presupuesto_sin_iva ?? lote.presupuesto_sin_iva}
                        onChange={(e: any) => setFormEdit({ ...formEdit, presupuesto_sin_iva: parseFloat(e.target.value) || 0 })}
                        className="w-full mt-0.5 px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Horas totales</label>
                      <input type="number" value={formEdit.horas_totales ?? lote.horas_totales}
                        onChange={(e: any) => setFormEdit({ ...formEdit, horas_totales: parseFloat(e.target.value) || 0 })}
                        className="w-full mt-0.5 px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-semibold text-slate-500">Centros / Zonas</label>
                      <input type="text" value={formEdit.centros ?? lote.centros}
                        onChange={(e: any) => setFormEdit({ ...formEdit, centros: e.target.value })}
                        className="w-full mt-0.5 px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Nº trabajadores subrogación</label>
                      <input type="number" value={formEdit.num_trabajadores ?? lote.num_trabajadores}
                        onChange={(e: any) => setFormEdit({ ...formEdit, num_trabajadores: parseInt(e.target.value) || 0 })}
                        className="w-full mt-0.5 px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Subrogación</label>
                      <select value={formEdit.subrogacion ?? lote.subrogacion}
                        onChange={(e: any) => setFormEdit({ ...formEdit, subrogacion: e.target.value })}
                        className="w-full mt-0.5 px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white">
                        <option>Sí</option><option>No</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-semibold text-slate-500">Notas de decisión</label>
                      <textarea value={formEdit.notas_decision ?? lote.notas_decision}
                        onChange={(e: any) => setFormEdit({ ...formEdit, notas_decision: e.target.value })}
                        rows={2} className="w-full mt-0.5 px-2 py-1.5 border border-slate-200 rounded-lg text-xs resize-none" />
                    </div>
                  </div>
                )}
              </div>

              {/* Acciones del lote */}
              <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50 flex items-center justify-between gap-2">

                {/* Decisión GO/NO-GO */}
                {modo !== 'calculo' && (
                  <div className="flex gap-1.5">
                    <button onClick={() => handleDecision(lote, 'go')}
                      className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all ${lote.decision === 'go' ? 'bg-emerald-600 text-white' : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}>
                      ✓ GO
                    </button>
                    <button onClick={() => handleDecision(lote, 'revisar')}
                      className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all ${lote.decision === 'revisar' ? 'bg-amber-500 text-white' : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-50'}`}>
                      ? Revisar
                    </button>
                    <button onClick={() => handleDecision(lote, 'no_go')}
                      className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all ${lote.decision === 'no_go' ? 'bg-red-600 text-white' : 'bg-white border border-red-200 text-red-700 hover:bg-red-50'}`}>
                      ✗ NO-GO
                    </button>
                  </div>
                )}

                <div className="flex gap-1.5 ml-auto">
                  {/* Editar lote */}
                  {isEditing ? (
                    <>
                      <button onClick={handleGuardarEdit} disabled={guardando}
                        className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
                        {guardando ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Guardar
                      </button>
                      <button onClick={() => setEditandoId(null)}
                        className="text-[10px] font-bold px-2.5 py-1.5 bg-slate-200 text-slate-600 rounded-lg">
                        <X size={11} />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => { setEditandoId(lote.id); setFormEdit({}) }}
                      className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg">
                      <Edit2 size={11} /> Editar
                    </button>
                  )}

                  {/* Ir a cálculo de este lote */}
                  {modo !== 'calculo' && lote.decision !== 'no_go' && (
                    <button onClick={() => navigate(`/calculo?opo=${oportunidadId}&lote=${lote.id}`)}
                      className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 bg-[#1a3c34] hover:bg-[#2d5a4e] text-white rounded-lg">
                      <Calculator size={11} /> Calcular
                    </button>
                  )}

                  {/* Seleccionar lote para cálculo */}
                  {modo === 'calculo' && onSeleccionarLote && (
                    <button onClick={() => onSeleccionarLote(lote)}
                      className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all ${isSelected ? 'bg-violet-700 text-white' : 'bg-violet-100 text-violet-700 hover:bg-violet-200'}`}>
                      <ChevronRight size={11} /> {isSelected ? 'Seleccionado' : 'Seleccionar'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}