import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { Package, AlertTriangle, Plus, RefreshCw, Loader2, CheckCircle2,
  X, Save, ChevronDown, TrendingDown, TrendingUp, ShoppingCart, BarChart3 } from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'

export default function InventarioPage() {
  const [centros, setCentros] = useState<any[]>([])
  const [centroSel, setCentroSel] = useState('')
  const [stock, setStock] = useState<any[]>([])
  const [alertas, setAlertas] = useState<any[]>([])
  const [pedidos, setPedidos] = useState<any[]>([])
  const [catalogoMats, setCatalogoMats] = useState<any[]>([])
  const [cargando, setCargando] = useState(false)
  const [tab, setTab] = useState<'stock'|'pedidos'>('stock')
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [formAjuste, setFormAjuste] = useState<any>(null)
  const [formPedido, setFormPedido] = useState<any>(null)

  const showMsg = (m: string, err=false) => {
    if(err) setError(m); else setMsg(m)
    setTimeout(()=>{ setMsg(''); setError('') },3000)
  }

  useEffect(() => {
    const cargar = async () => {
      const [c, mats] = await Promise.all([api.centros(), api.catalogoMateriales()])
      setCentros(c.centros||[])
      setCatalogoMats(mats.materiales||[])
    }
    cargar()
  }, [])

  const cargarStock = async (id: string) => {
    if (!id) return
    setCargando(true)
    try {
      const [s, p, al] = await Promise.all([
        api.stockCentro(id),
        api.pedidos(id),
        api.alertasStock(id).catch(() => ({ alertas: [] }))
      ])
      setStock(s.stock||[])
      setAlertas(al.alertas || s.alertas || [])
      setPedidos(p.pedidos||[])
    } catch(e) {} finally { setCargando(false) }
  }

  const onCentroChange = (id: string) => { setCentroSel(id); cargarStock(id) }

  const handleAjustar = async () => {
    if (!formAjuste) return
    setGuardando(true)
    try {
      const r = await api.ajustarStock({ centro_id: centroSel, ...formAjuste })
      if (r.ok) { showMsg(`✅ Stock actualizado: ${r.stock_nuevo}`); setFormAjuste(null); cargarStock(centroSel) }
      else showMsg(r.error||'Error', true)
    } catch(e) { showMsg('Error', true) } finally { setGuardando(false) }
  }

  const handlePedido = async () => {
    if (!formPedido?.nombre_material) { showMsg('Selecciona un material', true); return }
    setGuardando(true)
    try {
      const r = await api.crearPedido({ centro_id: centroSel, ...formPedido })
      if (r.ok) { showMsg('✅ Pedido creado'); setFormPedido(null); cargarStock(centroSel) }
      else showMsg(r.error||'Error', true)
    } catch(e) { showMsg('Error', true) } finally { setGuardando(false) }
  }

  const handleEstadoPedido = async (id: string, estado: string) => {
    try {
      await api.actualizarEstadoPedido({ id, estado })
      cargarStock(centroSel)
    } catch(e) {}
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e] rounded-xl shadow-lg">
          <Package size={22} className="text-white"/>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventario por centro</h1>
          <p className="text-sm text-slate-500">Stock de materiales, movimientos y pedidos a proveedores</p>
        </div>
      </div>

      {msg && <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-emerald-800 text-sm"><CheckCircle2 size={15}/>{msg}</div>}
      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-red-800 text-sm"><AlertTriangle size={15}/>{error}</div>}

      {/* Selector centro */}
      <div className="flex gap-3 mb-5">
        <select value={centroSel} onChange={e=>onCentroChange(e.target.value)}
          className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none">
          <option value="">— Seleccionar centro —</option>
          {centros.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        {centroSel && (
          <div className="flex gap-2">
            <button onClick={() => setFormAjuste({ material_id:'', nombre:'', tipo:'entrada', cantidad:1 })}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl">
              <TrendingUp size={13}/> Entrada
            </button>
            <button onClick={() => setFormPedido({ material_id:'', nombre_material:'', cantidad:1, proveedor:'', coste_estimado:0 })}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl">
              <ShoppingCart size={13}/> Pedido
            </button>
          </div>
        )}
      </div>

      {/* Alertas stock */}
      {alertas.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
              <AlertTriangle size={15}/> {alertas.filter((a:any) => a.urgente).length > 0
                ? `⛔ ${alertas.filter((a:any) => a.urgente).length} sin stock · ⚠️ ${alertas.filter((a:any) => !a.urgente).length} bajo mínimo`
                : `⚠️ ${alertas.length} materiales bajo mínimo`}
            </p>
          </div>
          <div className="space-y-2">
            {alertas.map((a:any, i:number) => (
              <div key={i} className={`flex items-center justify-between p-2.5 rounded-xl border ${a.urgente ? 'bg-red-50 border-red-200' : 'bg-amber-100 border-amber-200'}`}>
                <div>
                  <p className={`text-xs font-bold ${a.urgente ? 'text-red-800' : 'text-amber-800'}`}>
                    {a.urgente ? '⛔' : '⚠️'} {a.nombre || a.material}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Stock: <span className={`font-bold ${a.urgente ? 'text-red-600' : 'text-amber-600'}`}>{a.stock_actual ?? a.stock} {a.unidad}</span>
                    {' '}· Mínimo: {a.stock_minimo ?? a.minimo} {a.unidad}
                  </p>
                </div>
                <button
                  onClick={() => setFormPedido({ material_id: a.material_id, nombre_material: a.nombre || a.material, cantidad: (a.stock_minimo ?? a.minimo) * 2 })}
                  className="text-[10px] px-2 py-1 bg-[#1a3c34] text-white font-bold rounded-lg">
                  + Pedir
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulario entrada/salida */}
      {formAjuste && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-emerald-800">Ajuste de stock</p>
            <button onClick={() => setFormAjuste(null)}><X size={16}/></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Material</label>
              <select value={formAjuste.material_id} onChange={e => {
                const mat = catalogoMats.find(m=>m.id===e.target.value)
                setFormAjuste({...formAjuste, material_id:e.target.value, nombre: mat?.nombre||''})
              }} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Seleccionar —</option>
                {catalogoMats.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Tipo</label>
              <select value={formAjuste.tipo} onChange={e=>setFormAjuste({...formAjuste,tipo:e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="entrada">📥 Entrada</option>
                <option value="salida">📤 Salida</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Cantidad</label>
              <input type="number" step="0.1" min="0.1" value={formAjuste.cantidad}
                onChange={e=>setFormAjuste({...formAjuste,cantidad:parseFloat(e.target.value)||1})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
          </div>
          <button onClick={handleAjustar} disabled={guardando}
            className="w-full py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
            {guardando ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Confirmar ajuste
          </button>
        </div>
      )}

      {/* Formulario pedido */}
      {formPedido && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-blue-800">Nuevo pedido a proveedor</p>
            <button onClick={() => setFormPedido(null)}><X size={16}/></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Material</label>
              <select value={formPedido.material_id} onChange={e => {
                const mat = catalogoMats.find(m=>m.id===e.target.value)
                setFormPedido({...formPedido, material_id:e.target.value, nombre_material:mat?.nombre||'', proveedor:mat?.proveedor||''})
              }} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Seleccionar —</option>
                {catalogoMats.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Cantidad</label>
              <input type="number" value={formPedido.cantidad}
                onChange={e=>setFormPedido({...formPedido,cantidad:parseFloat(e.target.value)||1})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Proveedor</label>
              <input value={formPedido.proveedor} onChange={e=>setFormPedido({...formPedido,proveedor:e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Coste estimado (€)</label>
              <input type="number" value={formPedido.coste_estimado}
                onChange={e=>setFormPedido({...formPedido,coste_estimado:parseFloat(e.target.value)||0})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/>
            </div>
          </div>
          <button onClick={handlePedido} disabled={guardando}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
            {guardando ? <Loader2 size={14} className="animate-spin"/> : <ShoppingCart size={14}/>} Crear pedido
          </button>
        </div>
      )}

      {/* Tabs */}
      {centroSel && (
        <div className="flex gap-2 mb-4">
          {[{id:'stock',label:'Stock actual'},{id:'pedidos',label:`Pedidos (${pedidos.length})`}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id as any)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold ${tab===t.id?'bg-[#1a3c34] text-white':'bg-white border border-slate-200 text-slate-600'}`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {!centroSel ? (
        <div className="flex flex-col items-center py-16 bg-white border border-slate-200 rounded-2xl">
          <Package size={36} className="text-slate-300 mb-3"/>
          <p className="text-slate-400">Selecciona un centro para ver su inventario</p>
        </div>
      ) : cargando ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[#1a3c34]"/></div>
      ) : tab === 'stock' ? (
        stock.length === 0 ? (
          <div className="flex flex-col items-center py-12 bg-white border border-slate-200 rounded-2xl">
            <Package size={32} className="text-slate-300 mb-2"/>
            <p className="text-slate-400 text-sm">Sin stock registrado</p>
            <p className="text-xs text-slate-300 mt-1">Se registra automáticamente al usar materiales en los partes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stock.map((item:any) => (
              <div key={item.id} className={`bg-white border-2 rounded-2xl p-4 flex items-center gap-4 ${item.alerta?'border-amber-300':'border-slate-200'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.alerta?'bg-amber-100':'bg-slate-100'}`}>
                  <Package size={18} className={item.alerta?'text-amber-600':'text-slate-500'}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{item.nombre}</p>
                  <p className="text-xs text-slate-500">Mín: {item.stock_minimo} · Máx: {item.stock_maximo} {item.unidad}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-black ${item.alerta?'text-amber-600':'text-slate-900'}`}>{item.stock_actual}</p>
                  <p className="text-xs text-slate-500">{item.unidad}</p>
                </div>
                {item.alerta && <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full shrink-0">⚠️ Stock bajo</span>}
              </div>
            ))}
          </div>
        )
      ) : (
        pedidos.length === 0 ? (
          <div className="flex flex-col items-center py-12 bg-white border border-slate-200 rounded-2xl">
            <ShoppingCart size={32} className="text-slate-300 mb-2"/>
            <p className="text-slate-400 text-sm">Sin pedidos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pedidos.map((p:any) => {
              const estadoColor = p.estado==='entregado'?'bg-emerald-100 text-emerald-700':p.estado==='enviado'?'bg-blue-100 text-blue-700':'bg-amber-100 text-amber-700'
              return (
                <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{p.nombre_material}</p>
                      <p className="text-xs text-slate-500">{p.cantidad} uds · {p.proveedor} · {p.fecha_pedido}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${estadoColor}`}>{p.estado}</span>
                  </div>
                  {p.estado === 'pendiente' && (
                    <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                      <button onClick={()=>handleEstadoPedido(p.id,'enviado')}
                        className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl">Enviado</button>
                      <button onClick={()=>handleEstadoPedido(p.id,'entregado')}
                        className="flex-1 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl">Entregado</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}