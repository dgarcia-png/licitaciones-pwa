import { useState, useEffect } from 'react'
import { api } from '../services/api'
import {
  CheckSquare, Plus, Save, Trash2, Edit2, X, Loader2,
  Package, Wrench, BarChart3, RefreshCw, ChevronRight,
  CheckCircle2, AlertTriangle, Euro, ArrowUpDown, FileText
} from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'

export default function ChecklistConfigPage() {
  const [tab, setTab] = useState<'checklist'|'materiales'|'maquinaria'|'pl'>('checklist')
  const [centros, setCentros] = useState<any[]>([])
  const [centroSel, setCentroSel] = useState('')
  const [checklist, setChecklist] = useState<any[]>([])
  const [materiales, setMateriales] = useState<any[]>([])
  const [maquinaria, setMaquinaria] = useState<any[]>([])
  const [plData, setPlData] = useState<any>(null)
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [editItem, setEditItem] = useState<any>(null)
  const [newItem, setNewItem] = useState<any>(null)
  const [confirmDel, setConfirmDel] = useState<string|null>(null)
  const [newMat, setNewMat] = useState<any>(null)
  const [newMaq, setNewMaq] = useState<any>(null)
  const [generandoInforme, setGenerandoInforme] = useState(false)
  const [mesInforme, setMesInforme] = useState(new Date().toISOString().substring(0,7))

  const showMsg = (m: string, err=false) => {
    if(err) setError(m); else setMsg(m)
    setTimeout(()=>{ setMsg(''); setError('') },3000)
  }

  useEffect(() => {
    const cargar = async () => {
      const [c, mats, maqs] = await Promise.all([
        (api as any).centros(),
        (api as any).catalogoMateriales(),
        (api as any).catalogoMaquinaria()
      ])
      setCentros(c.centros || [])
      setMateriales(mats.materiales || [])
      setMaquinaria(maqs.maquinaria || [])
    }
    cargar()
  }, [])

  const cargarChecklist = async (id: string) => {
    if (!id) return
    setCargando(true)
    try {
      const d = await (api as any).checklistCentro(id)
      setChecklist(d.items || [])
    } catch(e) {} finally { setCargando(false) }
  }

  const cargarPL = async (id: string) => {
    if (!id) return
    setCargando(true)
    try {
      const d = await (api as any).plContrato(id, 6)
      setPlData(d)
    } catch(e) {} finally { setCargando(false) }
  }

  const onCentroChange = (id: string) => {
    setCentroSel(id)
    if (tab === 'checklist') cargarChecklist(id)
    if (tab === 'pl') cargarPL(id)
  }

  useEffect(() => {
    if (centroSel) {
      if (tab === 'checklist') cargarChecklist(centroSel)
      if (tab === 'pl') cargarPL(centroSel)
    }
  }, [tab])

  const handleGuardarItem = async () => {
    if (!newItem?.tarea) { showMsg('La tarea es obligatoria', true); return }
    setGuardando(true)
    try {
      const r = await (api as any).crearChecklistItem({ centro_id: centroSel, ...newItem })
      if (r.ok) {
        showMsg('✅ Tarea añadida')
        setNewItem(null)
        cargarChecklist(centroSel)
      } else showMsg(r.error||'Error', true)
    } catch(e) { showMsg('Error', true) }
    finally { setGuardando(false) }
  }

  const handleActualizarItem = async () => {
    if (!editItem) return
    setGuardando(true)
    try {
      const r = await (api as any).actualizarChecklistItem(editItem)
      if (r.ok) { showMsg('✅ Guardado'); setEditItem(null); cargarChecklist(centroSel) }
      else showMsg(r.error||'Error', true)
    } catch(e) { showMsg('Error', true) }
    finally { setGuardando(false) }
  }

  const handleEliminarItem = async (id: string) => {
    setGuardando(true)
    try {
      const r = await (api as any).eliminarChecklistItem(id)
      if (r.ok) { showMsg('Tarea eliminada'); cargarChecklist(centroSel) }
    } catch(e) {} finally { setGuardando(false); setConfirmDel(null) }
  }

  const handleCrearMaterial = async () => {
    if (!newMat?.nombre) { showMsg('Nombre obligatorio', true); return }
    setGuardando(true)
    try {
      const r = await (api as any).crearMaterialCatalogo(newMat)
      if (r.ok) {
        showMsg('✅ Material creado')
        setNewMat(null)
        const d = await (api as any).catalogoMateriales()
        setMateriales(d.materiales||[])
      }
    } catch(e) { showMsg('Error', true) }
    finally { setGuardando(false) }
  }

  const handleCrearMaquinaria = async () => {
    if (!newMaq?.nombre) { showMsg('Nombre obligatorio', true); return }
    setGuardando(true)
    try {
      const r = await (api as any).crearMaquinariaCatalogo(newMaq)
      if (r.ok) {
        showMsg('✅ Maquinaria creada')
        setNewMaq(null)
        const d = await (api as any).catalogoMaquinaria()
        setMaquinaria(d.maquinaria||[])
      }
    } catch(e) { showMsg('Error', true) }
    finally { setGuardando(false) }
  }

  const handleGenerarInforme = async () => {
    if (!centroSel || !mesInforme) { showMsg('Selecciona centro y mes', true); return }
    setGenerandoInforme(true)
    try {
      const r = await (api as any).generarInformeMensual({ centro_id: centroSel, mes: mesInforme })
      if (r.ok) {
        showMsg(`✅ Informe generado · ${r.partes} partes · ${r.horas}h`)
        if (r.url) window.open(r.url, '_blank')
      } else showMsg(r.error||'Error', true)
    } catch(e) { showMsg('Error', true) }
    finally { setGenerandoInforme(false) }
  }

  const TIPO_EVIDENCIA_OPTS = [
    { value:'ninguna', label:'Sin evidencia' },
    { value:'foto', label:'Requiere foto' },
    { value:'observacion', label:'Requiere observación' },
    { value:'foto_y_obs', label:'Foto + observación' }
  ]

  return (
    <div className="p-6 lg:p-8 max-w-4xl">

      {/* Cabecera */}
      <div className="flex items-center gap-4 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e] rounded-xl shadow-lg">
          <CheckSquare size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configuración operaciones</h1>
          <p className="text-sm text-slate-500">Checklist, materiales, maquinaria y análisis P&L</p>
        </div>
      </div>

      {msg && <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-emerald-800 text-sm"><CheckCircle2 size={15}/>{msg}</div>}
      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-red-800 text-sm"><AlertTriangle size={15}/>{error}</div>}

      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { id:'checklist', label:'Checklist', icon: CheckSquare },
          { id:'materiales', label:'Materiales', icon: Package },
          { id:'maquinaria', label:'Maquinaria', icon: Wrench },
          { id:'pl', label:'P&L Contratos', icon: BarChart3 }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab===t.id ? 'bg-[#1a3c34] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* ══ CHECKLIST ══ */}
      {tab === 'checklist' && (
        <div>
          <div className="flex gap-3 mb-5">
            <select value={centroSel} onChange={e => onCentroChange(e.target.value)}
              className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none">
              <option value="">— Seleccionar centro —</option>
              {centros.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            {centroSel && (
              <button onClick={() => setNewItem({ tarea:'', descripcion:'', obligatoria:true, tipo_evidencia:'ninguna' })}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#1a3c34] text-white text-sm font-semibold rounded-xl">
                <Plus size={14} /> Añadir tarea
              </button>
            )}
          </div>

          {/* Formulario nueva tarea */}
          {newItem && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-blue-800">Nueva tarea</p>
                <button onClick={() => setNewItem(null)}><X size={16} className="text-blue-600" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Tarea *</label>
                  <input value={newItem.tarea} onChange={e => setNewItem({...newItem, tarea:e.target.value})}
                    placeholder="Ej: Limpiar baños"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Descripción</label>
                  <input value={newItem.descripcion} onChange={e => setNewItem({...newItem, descripcion:e.target.value})}
                    placeholder="Instrucciones adicionales..."
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Evidencia</label>
                    <select value={newItem.tipo_evidencia} onChange={e => setNewItem({...newItem, tipo_evidencia:e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                      {TIPO_EVIDENCIA_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input type="checkbox" checked={newItem.obligatoria}
                      onChange={e => setNewItem({...newItem, obligatoria:e.target.checked})} />
                    <label className="text-sm text-slate-700">Obligatoria</label>
                  </div>
                </div>
                <button onClick={handleGuardarItem} disabled={guardando}
                  className="w-full py-2.5 bg-[#1a3c34] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
                  {guardando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar tarea
                </button>
              </div>
            </div>
          )}

          {/* Lista checklist */}
          {!centroSel ? (
            <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl">
              <CheckSquare size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400">Selecciona un centro para ver su checklist</p>
            </div>
          ) : cargando ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[#1a3c34]" /></div>
          ) : checklist.length === 0 ? (
            <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl">
              <CheckSquare size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 mb-3">Sin tareas configuradas</p>
              <button onClick={() => setNewItem({ tarea:'', descripcion:'', obligatoria:true, tipo_evidencia:'ninguna' })}
                className="px-4 py-2 bg-[#1a3c34] text-white text-sm font-bold rounded-xl">
                Añadir primera tarea
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {checklist.map((item: any) => (
                <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                  {editItem?.id === item.id ? (
                    <div className="space-y-3">
                      <input value={editItem.tarea} onChange={e => setEditItem({...editItem, tarea:e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                      <input value={editItem.descripcion||''} onChange={e => setEditItem({...editItem, descripcion:e.target.value})}
                        placeholder="Descripción..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                      <div className="grid grid-cols-2 gap-2">
                        <select value={editItem.tipo_evidencia} onChange={e => setEditItem({...editItem, tipo_evidencia:e.target.value})}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                          {TIPO_EVIDENCIA_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <label className="flex items-center gap-2 px-3 py-2">
                          <input type="checkbox" checked={editItem.obligatoria}
                            onChange={e => setEditItem({...editItem, obligatoria:e.target.checked})} />
                          <span className="text-sm">Obligatoria</span>
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleActualizarItem} disabled={guardando}
                          className="flex-1 py-2 bg-[#1a3c34] text-white text-sm font-bold rounded-xl">
                          {guardando ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button onClick={() => setEditItem(null)}
                          className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">#{item.orden}</span>
                          <p className="text-sm font-semibold text-slate-800">{item.tarea}</p>
                          {item.obligatoria && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-700 rounded">Oblig.</span>}
                          {item.tipo_evidencia !== 'ninguna' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                              {item.tipo_evidencia === 'foto' ? '📷' : item.tipo_evidencia === 'observacion' ? '📝' : '📷+📝'}
                            </span>
                          )}
                        </div>
                        {item.descripcion && <p className="text-xs text-slate-500 mt-0.5">{item.descripcion}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => setEditItem({...item})}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => setConfirmDel(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ MATERIALES ══ */}
      {tab === 'materiales' && (
        <div>
          <div className="flex justify-between mb-4">
            <p className="text-sm text-slate-500">{materiales.length} materiales en catálogo</p>
            <button onClick={() => setNewMat({ nombre:'', categoria:'limpieza', unidad:'unidad', coste_unitario:0, stock:0, stock_minimo:5 })}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a3c34] text-white text-sm font-semibold rounded-xl">
              <Plus size={14} /> Nuevo material
            </button>
          </div>

          {newMat && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-amber-800">Nuevo material</p>
                <button onClick={() => setNewMat(null)}><X size={16} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Nombre *</label>
                  <input value={newMat.nombre} onChange={e => setNewMat({...newMat,nombre:e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Categoría</label>
                  <select value={newMat.categoria} onChange={e => setNewMat({...newMat,categoria:e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                    {['limpieza','jardineria','mantenimiento','residuos','consumibles','otros'].map(c =>
                      <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Unidad</label>
                  <select value={newMat.unidad} onChange={e => setNewMat({...newMat,unidad:e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                    {['unidad','litro','kg','metro','m2','caja'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Coste unitario (€)</label>
                  <input type="number" step="0.01" value={newMat.coste_unitario}
                    onChange={e => setNewMat({...newMat,coste_unitario:parseFloat(e.target.value)||0})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Stock mínimo</label>
                  <input type="number" value={newMat.stock_minimo}
                    onChange={e => setNewMat({...newMat,stock_minimo:parseFloat(e.target.value)||0})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                </div>
              </div>
              <button onClick={handleCrearMaterial} disabled={guardando}
                className="w-full py-2.5 bg-[#1a3c34] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
                {guardando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Crear material
              </button>
            </div>
          )}

          <div className="space-y-2">
            {materiales.map((m: any) => (
              <div key={m.id} className={`bg-white border rounded-2xl p-4 flex items-center gap-3 ${m.alerta_stock ? 'border-amber-300' : 'border-slate-200'}`}>
                <Package size={16} className={m.alerta_stock ? 'text-amber-600' : 'text-slate-400'} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{m.nombre}</p>
                  <p className="text-xs text-slate-500">{m.categoria} · {m.coste_unitario}€/{m.unidad}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${m.alerta_stock ? 'text-amber-600' : 'text-slate-700'}`}>
                    Stock: {m.stock}
                  </p>
                  {m.alerta_stock && <p className="text-[10px] text-amber-600">⚠️ Stock bajo</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ MAQUINARIA ══ */}
      {tab === 'maquinaria' && (
        <div>
          <div className="flex justify-between mb-4">
            <p className="text-sm text-slate-500">{maquinaria.length} equipos en catálogo</p>
            <button onClick={() => setNewMaq({ nombre:'', tipo:'', marca:'', modelo:'', coste_hora:0 })}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a3c34] text-white text-sm font-semibold rounded-xl">
              <Plus size={14} /> Nueva maquinaria
            </button>
          </div>

          {newMaq && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-blue-800">Nueva maquinaria</p>
                <button onClick={() => setNewMaq(null)}><X size={16} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Nombre *</label>
                  <input value={newMaq.nombre} onChange={e => setNewMaq({...newMaq,nombre:e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Tipo</label>
                  <input value={newMaq.tipo} onChange={e => setNewMaq({...newMaq,tipo:e.target.value})}
                    placeholder="fregadora, cortacesped..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Marca/Modelo</label>
                  <input value={newMaq.marca} onChange={e => setNewMaq({...newMaq,marca:e.target.value})}
                    placeholder="Kärcher, Stihl..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Coste/hora (€)</label>
                  <input type="number" step="0.5" value={newMaq.coste_hora}
                    onChange={e => setNewMaq({...newMaq,coste_hora:parseFloat(e.target.value)||0})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                </div>
              </div>
              <button onClick={handleCrearMaquinaria} disabled={guardando}
                className="w-full py-2.5 bg-[#1a3c34] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
                {guardando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Crear equipo
              </button>
            </div>
          )}

          <div className="space-y-2">
            {maquinaria.map((m: any) => (
              <div key={m.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
                <Wrench size={16} className="text-slate-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{m.nombre}</p>
                  <p className="text-xs text-slate-500">{m.tipo} · {m.marca}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-[#1a3c34]">{m.coste_hora}€/h</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.estado === 'operativa' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {m.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ P&L ══ */}
      {tab === 'pl' && (
        <div>
          <div className="flex gap-3 mb-5 flex-wrap">
            <select value={centroSel} onChange={e => onCentroChange(e.target.value)}
              className="flex-1 min-w-48 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none">
              <option value="">— Seleccionar centro —</option>
              {centros.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            {centroSel && (
              <div className="flex gap-2">
                <input type="month" value={mesInforme}
                  onChange={e => setMesInforme(e.target.value)}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
                <button onClick={handleGenerarInforme} disabled={generandoInforme}
                  className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl">
                  {generandoInforme ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                  Informe cliente
                </button>
              </div>
            )}
          </div>

          {!centroSel ? (
            <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl">
              <BarChart3 size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400">Selecciona un centro para ver el P&L</p>
            </div>
          ) : cargando ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[#1a3c34]" /></div>
          ) : plData ? (
            <div>
              {/* Resumen global */}
              {plData.resumen && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  {[
                    { label:'Ingresos', valor: plData.resumen.total_ingresos?.toFixed(0) + '€', color:'text-emerald-700', bg:'bg-emerald-50' },
                    { label:'Costes', valor: plData.resumen.total_costes?.toFixed(0) + '€', color:'text-red-700', bg:'bg-red-50' },
                    { label:'Margen', valor: plData.resumen.margen_total?.toFixed(0) + '€', color:'text-[#1a3c34]', bg:'bg-[#e8f0ee]' },
                    { label:'% Margen', valor: plData.resumen.pct_margen + '%', color: plData.resumen.pct_margen >= 15 ? 'text-emerald-700' : 'text-amber-700', bg:'bg-slate-50' },
                  ].map((k,i) => (
                    <div key={i} className={`${k.bg} rounded-2xl p-4 text-center border border-slate-200`}>
                      <p className={`text-xl font-black ${k.color}`}>{k.valor}</p>
                      <p className="text-xs text-slate-500 uppercase mt-1">{k.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Por período */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#1a3c34] text-white">
                      <th className="p-3 text-left">Período</th>
                      <th className="p-3 text-right">Partes</th>
                      <th className="p-3 text-right">Personal</th>
                      <th className="p-3 text-right">Materiales</th>
                      <th className="p-3 text-right">Maquin.</th>
                      <th className="p-3 text-right">Total</th>
                      <th className="p-3 text-right">Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(plData.periodos||[]).map((p: any, i: number) => (
                      <tr key={p.periodo} className={`border-b border-slate-100 ${i%2===0 ? '' : 'bg-slate-50'}`}>
                        <td className="p-3 font-semibold">{p.periodo}</td>
                        <td className="p-3 text-right text-slate-600">{p.partes}</td>
                        <td className="p-3 text-right">{p.coste_personal?.toFixed(0)}€</td>
                        <td className="p-3 text-right">{p.coste_materiales?.toFixed(0)}€</td>
                        <td className="p-3 text-right">{p.coste_maquinaria?.toFixed(0)}€</td>
                        <td className="p-3 text-right font-black">{p.coste_total?.toFixed(0)}€</td>
                        <td className={`p-3 text-right font-black ${p.pct_margen >= 15 ? 'text-emerald-600' : p.pct_margen >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                          {p.pct_margen}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!plData.periodos || plData.periodos.length === 0) && (
                  <div className="text-center py-8">
                    <p className="text-slate-400 text-sm">Sin datos de costes imputados aún</p>
                    <p className="text-xs text-slate-300 mt-1">Los costes se imputan automáticamente al finalizar cada parte</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <ConfirmModal
        open={!!confirmDel}
        titulo="¿Eliminar tarea del checklist?"
        mensaje="Se eliminará esta tarea del checklist del centro."
        labelOk="Sí, eliminar" peligroso cargando={guardando}
        onConfirm={() => confirmDel && handleEliminarItem(confirmDel)}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  )
}