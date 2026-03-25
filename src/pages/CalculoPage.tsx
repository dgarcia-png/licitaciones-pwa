import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import PipelineBar from '../components/PipelineBar'
import {
  Calculator, Users, Package, Shield, Settings, TrendingUp, Loader2, Plus, Trash2,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle, Brain, Wrench,
  RotateCcw, UserPlus, Save, ArrowLeft, ArrowRight, FileText, Truck, BarChart3, Star
} from 'lucide-react'

interface LineaPersonal {
  id: string; convenioId: string; categoria: string; grupo: string; nivel: string
  cantidad: number; horasSemanales: number; meses: number; totalAnualBruto: number
}
interface LineaCoste {
  id: string; concepto: string; cantidad: number; costeUnitario: number; meses: number; unidad: string
}
interface ItemCatalogo { concepto: string; unidad: string; valor: number; notas: string; activo: boolean }
interface MejoraSeleccionada {
  mejora: string
  puntuacion: number
  seleccionada: boolean
  costeEstimado: number
  descripcionOferta: string
}

function uid() { return Math.random().toString(36).substring(2, 8) }
function fmt(n: number) { return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' }
function fmtPct(n: number) { return n.toFixed(2) + ' %' }
function sumaLineas(ls: LineaCoste[]) { return ls.reduce((s, l) => s + (l.cantidad * l.costeUnitario * l.meses), 0) }

const STEPS = [
  { id: 'datos', label: 'Datos', icon: FileText },
  { id: 'personal', label: 'Personal', icon: Users },
  { id: 'directos', label: 'C. Directos', icon: Package },
  { id: 'indirectos', label: 'C. Indirectos', icon: Shield },
  { id: 'resumen', label: 'Oferta', icon: BarChart3 },
]

function Bloque({ title, icon: Icon, children, defaultOpen = true, badge }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean; badge?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white border border-[#dce5e1] rounded-2xl mb-4 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 hover:bg-[#f1f5f3] transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#e8f0ee] rounded-xl"><Icon size={16} className="text-[#1a3c34]" /></div>
          <span className="text-sm font-bold text-[#1a2e28]">{title}</span>
          {badge && <span className="text-[11px] bg-[#e8f0ee] text-[#1a3c34] px-2.5 py-0.5 rounded-full font-bold">{badge}</span>}
        </div>
        {open ? <ChevronUp size={16} className="text-[#8a9e96]" /> : <ChevronDown size={16} className="text-[#8a9e96]" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-[#e8eeeb] pt-4">{children}</div>}
    </div>
  )
}

function TablaCatalogo({ lineas, setLineas, catalogo, conMeses = true, duracion = 12, numTrab = 1, numCentros = 1 }: {
  lineas: LineaCoste[]; setLineas: (l: LineaCoste[]) => void; catalogo: ItemCatalogo[]
  conMeses?: boolean; duracion?: number; numTrab?: number; numCentros?: number
}) {
  const [sel, setSel] = useState('')
  const upd = (id: string, f: string, v: any) => setLineas(lineas.map(l => l.id === id ? { ...l, [f]: v } : l))
  const used = new Set(lineas.map(l => l.concepto))
  const avail = catalogo.filter(i => !used.has(i.concepto) && i.activo !== false)
  const autoCant = (u: string) => { const s = (u||'').toLowerCase(); return s.includes('/trabajador') ? numTrab : s.includes('/centro') ? numCentros : 1 }
  const autoMes = (u: string) => { const s = (u||'').toLowerCase(); if (s.includes('/mes') && conMeses) return duracion; if (s.includes('/año')) return Math.ceil(duracion/12); return conMeses ? duracion : 1 }
  const addCat = () => { if (!sel) return; const it = catalogo.find(c => c.concepto === sel); if (!it) return; setLineas([...lineas, { id: uid(), concepto: it.concepto, cantidad: autoCant(it.unidad), costeUnitario: it.valor, meses: autoMes(it.unidad), unidad: it.unidad }]); setSel('') }
  const addCustom = () => setLineas([...lineas, { id: uid(), concepto: 'Nuevo ítem', cantidad: 1, costeUnitario: 0, meses: conMeses ? duracion : 1, unidad: '' }])
  const inp = "w-full px-2 py-1.5 border border-[#dce5e1] rounded-lg text-xs focus:border-[#2d5a4e] focus:outline-none"
  return (
    <>
      <div className="flex gap-2 mb-3">
        <select value={sel} onChange={e => setSel(e.target.value)} className={`flex-1 ${inp} bg-white`}>
          <option value="">— Añadir del catálogo —</option>
          {avail.map((it, i) => <option key={i} value={it.concepto}>{it.concepto} ({fmt(it.valor)}/{it.unidad})</option>)}
        </select>
        <button onClick={addCat} disabled={!sel} className="px-3 py-1.5 bg-[#1a3c34] text-white text-xs rounded-lg hover:bg-[#2d5a4e] disabled:opacity-30"><Plus size={14} /></button>
      </div>
      {lineas.map((l, i) => (
        <div key={l.id} className={`grid ${conMeses ? 'grid-cols-[3fr_1fr_1.5fr_1fr_1.5fr_auto]' : 'grid-cols-[3fr_1fr_1.5fr_1.5fr_auto]'} gap-2 items-end mb-1.5`}>
          <div>{i===0 && <label className="text-[10px] text-[#8a9e96]">Concepto</label>}<input type="text" value={l.concepto} onChange={e => upd(l.id,'concepto',e.target.value)} className={inp}/></div>
          <div>{i===0 && <label className="text-[10px] text-[#8a9e96]">Cant.</label>}<input type="number" step="any" value={l.cantidad} onChange={e => upd(l.id,'cantidad',parseFloat(e.target.value)||0)} className={`${inp} text-center`}/></div>
          <div>{i===0 && <label className="text-[10px] text-[#8a9e96]">€/ud</label>}<input type="number" step="any" value={l.costeUnitario} onChange={e => upd(l.id,'costeUnitario',parseFloat(e.target.value)||0)} className={`${inp} text-center`}/></div>
          {conMeses && <div>{i===0 && <label className="text-[10px] text-[#8a9e96]">Meses</label>}<input type="number" value={l.meses} onChange={e => upd(l.id,'meses',parseInt(e.target.value)||1)} className={`${inp} text-center`}/></div>}
          <div>{i===0 && <label className="text-[10px] text-[#8a9e96]">Total</label>}<p className="text-xs font-bold text-[#1a2e28] py-1.5 text-right">{fmt(l.cantidad*l.costeUnitario*l.meses)}</p></div>
          <div className="flex justify-center"><button onClick={() => setLineas(lineas.filter(x => x.id !== l.id))} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={13}/></button></div>
        </div>
      ))}
      <button onClick={addCustom} className="flex items-center gap-1 text-xs text-[#5a7a70] hover:text-[#1a3c34] mt-2"><Plus size={14}/> Añadir ítem personalizado</button>
      {lineas.length > 0 && <div className="flex justify-end mt-3 pt-2 border-t border-[#e8eeeb]"><span className="text-sm font-extrabold text-[#1a3c34]">{fmt(sumaLineas(lineas))}</span></div>}
    </>
  )
}

// ═════════════════════════════════════════════════════════════
export default function CalculoPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const idParam = searchParams.get('id')
  const [step, setStep] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const goToStep = useCallback((target: number) => {
    if (target === step || target < 0 || target >= STEPS.length) return
    setTransitioning(true)
    setTimeout(() => {
      setStep(target)
      setTransitioning(false)
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
  }, [step])

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardadoOk, setGuardadoOk] = useState(false)
  const [oportunidades, setOportunidades] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState(idParam || '')
  const [oportunidad, setOportunidad] = useState<any>(null)
  const [analisis, setAnalisis] = useState<any>(null)
  const [mejoras, setMejoras] = useState<MejoraSeleccionada[]>([])

  // Sync selector ↔ URL
  const handleSelectId = (id: string) => {
    setSelectedId(id)
    if (id) setSearchParams({ id }, { replace: true })
    else setSearchParams({}, { replace: true })
  }
  useEffect(() => {
    if (idParam && idParam !== selectedId) setSelectedId(idParam)
  }, [idParam]) // eslint-disable-line

  const [convenios, setConvenios] = useState<any[]>([])
  const [categoriasPorConvenio, setCategoriasPorConvenio] = useState<Record<string, any[]>>({})
  const [catalogoPorBloque, setCatalogoPorBloque] = useState<Record<string, ItemCatalogo[]>>({})
  const [duracionMeses, setDuracionMeses] = useState(12)
  const [presupuestoLicitacion, setPresupuestoLicitacion] = useState(0)
  const [numCentros, setNumCentros] = useState(1)
  const [personal, setPersonal] = useState<LineaPersonal[]>([])
  const [uniformidad, setUniformidad] = useState<LineaCoste[]>([])
  const [materiales, setMateriales] = useState<LineaCoste[]>([])
  const [maquinaria, setMaquinaria] = useState<LineaCoste[]>([])
  const [prl, setPrl] = useState<LineaCoste[]>([])
  const [seguros, setSeguros] = useState<LineaCoste[]>([])
  const [gestion, setGestion] = useState<LineaCoste[]>([])
  const [transporte, setTransporte] = useState<LineaCoste[]>([])
  const [otrosIndirectos, setOtrosIndirectos] = useState<LineaCoste[]>([])
  const [pctGG, setPctGG] = useState(13)
  const [pctBI, setPctBI] = useState(6)
  const [pctIVA, setPctIVA] = useState(21)
  const [ssTotal, setSsTotal] = useState(33.08)
  const [factorAbsentismo, setFactorAbsentismo] = useState(1.12)
  const [importandoSubrogados, setImportandoSubrogados] = useState(false)
  const [subrogadosImportados, setSubrogadosImportados] = useState(false)
  const [pidiendo, setPidiendo] = useState(false)
  const [recomendacion, setRecomendacion] = useState<any>(null)

  useEffect(() => {
    (async () => {
      setCargando(true)
      try {
        const [opData, convData, costData] = await Promise.all([api.oportunidades(), api.convenios(), api.costesReferencia()])
        setOportunidades(opData.oportunidades || [])
        setConvenios(convData.convenios || [])
        const bloques: Record<string, ItemCatalogo[]> = {}
        for (const [b, items] of Object.entries(costData.costes || {})) { if (b && Array.isArray(items)) bloques[b] = items as ItemCatalogo[] }
        setCatalogoPorBloque(bloques)
        const cats: Record<string, any[]> = {}
        for (const conv of (convData.convenios || [])) { const d = await api.categoriasConvenio(conv.id); cats[conv.id] = d.categorias || [] }
        setCategoriasPorConvenio(cats)
        if (costData.activos) {
          const a = costData.activos
          if (a['Estructura']) { setPctGG(a['Estructura']['Gastos generales de estructura']||13); setPctBI(a['Estructura']['Beneficio industrial']||6); setPctIVA(a['Estructura']['IVA']||21) }
          setSsTotal(a['ss_empresa_total']||33.08); setFactorAbsentismo(a['Absentismo']?.['Factor absentismo global']||1.12)
        }
      } catch(e) { console.error(e) }
      finally { setCargando(false) }
    })()
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setSubrogadosImportados(false); setRecomendacion(null); setGuardadoOk(false)
    setPersonal([]); setUniformidad([]); setMateriales([]); setMaquinaria([])
    setPrl([]); setSeguros([]); setGestion([]); setTransporte([]); setOtrosIndirectos([]);
    setMejoras([])
    ;(async () => {
      try {
        const data = await api.detalle(selectedId)
        if (data.error) return
        setOportunidad(data); setPresupuestoLicitacion(Number(data.presupuesto)||0)
        const an = await api.obtenerAnalisis(selectedId)
        if (an.existe) {
          setAnalisis(an); const ac = an.analisis_completo||{}
          if (ac.datos_basicos?.duracion_contrato) {
            const dur = ac.datos_basicos.duracion_contrato.toLowerCase()
            const mA = dur.match(/(\d+)\s*año/); const mM = dur.match(/(\d+)\s*mes/)
            if (mA) setDuracionMeses(parseInt(mA[1])*12); else if (mM) setDuracionMeses(parseInt(mM[1]))
          }
          // Inicializar mejoras del pliego
          if (ac.mejoras_valorables && ac.mejoras_valorables.length > 0) {
            setMejoras(ac.mejoras_valorables.map((m: any) => ({
              mejora: m.mejora || '',
              puntuacion: m.puntuacion || 0,
              seleccionada: false,
              costeEstimado: 0,
              descripcionOferta: '',
            })))
          }
        }
        try {
          const calc = await api.cargarCalculo(selectedId)
          if (calc.existe && calc.datos) {
            const d = typeof calc.datos === 'string' ? JSON.parse(calc.datos) : calc.datos
            if (d.personal) setPersonal(d.personal); if (d.uniformidad) setUniformidad(d.uniformidad)
            if (d.materiales) setMateriales(d.materiales); if (d.maquinaria) setMaquinaria(d.maquinaria)
            if (d.prl) setPrl(d.prl); if (d.seguros) setSeguros(d.seguros)
            if (d.gestion) setGestion(d.gestion); if (d.transporte) setTransporte(d.transporte)
            if (d.otrosIndirectos) setOtrosIndirectos(d.otrosIndirectos)
            if (d.duracionMeses) setDuracionMeses(d.duracionMeses); if (d.numCentros) setNumCentros(d.numCentros)
            if (d.pctGG !== undefined) setPctGG(d.pctGG); if (d.pctBI !== undefined) setPctBI(d.pctBI)
            if (d.factorAbsentismo) setFactorAbsentismo(d.factorAbsentismo)
            // Restaurar mejoras guardadas (preserva selección y costes)
            if (d.mejoras && d.mejoras.length > 0) setMejoras(d.mejoras)
          }
        } catch { /* no saved calc */ }
      } catch(e) { console.error(e) }
    })()
  }, [selectedId])

  const totalTrabajadores = personal.reduce((s,l) => s + l.cantidad, 0)
  const calcPersonalLinea = (l: LineaPersonal) => {
    const prop = l.horasSemanales / 38
    const conSS = l.convenioId ? (1 + ssTotal/100) : 1
    return (l.totalAnualBruto * prop * conSS * factorAbsentismo / 12) * l.meses * l.cantidad
  }
  const totalPersonal = personal.reduce((s,l) => s + calcPersonalLinea(l), 0)
  const totalUniformidad = sumaLineas(uniformidad); const totalMateriales = sumaLineas(materiales)
  const totalMaquinaria = sumaLineas(maquinaria); const totalPRL = sumaLineas(prl)
  const totalSeguros = sumaLineas(seguros); const totalGestion = sumaLineas(gestion)
  const totalTransporte = sumaLineas(transporte); const totalOtrosInd = sumaLineas(otrosIndirectos)
  const totalMejoras = mejoras.filter(m => m.seleccionada).reduce((s, m) => s + (m.costeEstimado || 0), 0)
  const mejorasSeleccionadas = mejoras.filter(m => m.seleccionada)
  const puntosExtraMejoras = mejorasSeleccionadas.reduce((s, m) => s + (m.puntuacion || 0), 0)
  const costesDirectos = totalPersonal + totalUniformidad + totalMateriales + totalMaquinaria + totalMejoras
  const costesIndirectos = totalPRL + totalSeguros + totalGestion + totalTransporte + totalOtrosInd
  const base = costesDirectos + costesIndirectos
  const importeGG = base * (pctGG/100); const importeBI = base * (pctBI/100)
  const totalSinIVA = base + importeGG + importeBI
  const importeIVA = totalSinIVA * (pctIVA/100); const totalConIVA = totalSinIVA + importeIVA
  const presSinIVA = presupuestoLicitacion / (1 + pctIVA/100)
  const baja = presSinIVA > 0 ? ((presSinIVA - totalSinIVA) / presSinIVA * 100) : 0
  const margenReal = presSinIVA > 0 ? ((presSinIVA - costesDirectos - costesIndirectos - importeGG) / presSinIVA * 100) : 0
  const esRentable = totalSinIVA < presSinIVA && presSinIVA > 0
  const haySubrogacion = analisis?.existe && analisis?.analisis_completo?.personal_requerido?.subrogacion === 'Sí'

  const escenarios = useMemo(() => [
    { nombre: 'Conservador', gg: pctGG+2, bi: pctBI+1 },
    { nombre: 'Base', gg: pctGG, bi: pctBI },
    { nombre: 'Agresivo', gg: Math.max(pctGG-3,5), bi: Math.max(pctBI-2,2) },
  ].map(e => {
    const tot = base * (1 + e.gg/100 + e.bi/100)
    const b = presSinIVA > 0 ? ((presSinIVA - tot) / presSinIVA * 100) : 0
    return { ...e, total: tot, baja: b, viable: tot < presSinIVA }
  }), [base, pctGG, pctBI, presSinIVA])

  const guardarCalculo = async () => {
    if (!selectedId) return; setGuardando(true); setGuardadoOk(false)
    try {
      const datos = {
        personal, uniformidad, materiales, maquinaria, prl, seguros, gestion, transporte, otrosIndirectos,
        mejoras,
        duracionMeses, numCentros, pctGG, pctBI, pctIVA, factorAbsentismo, ssTotal, presupuestoLicitacion,
        resumen: {
          trabajadores: totalTrabajadores, personal: totalPersonal, uniformidad: totalUniformidad,
          materiales: totalMateriales, maquinaria: totalMaquinaria, prl: totalPRL, seguros: totalSeguros,
          gestion: totalGestion, transporte: totalTransporte, otrosIndirectos: totalOtrosInd,
          mejoras: totalMejoras, mejorasSeleccionadas,
          costesDirectos, costesIndirectos, base, importeGG, importeBI,
          totalSinIVA, importeIVA, totalConIVA,
          presupuestoSinIVA: presSinIVA, bajaPct: baja, margenRealPct: margenReal, esRentable,
          costeMes: duracionMeses > 0 ? totalSinIVA/duracionMeses : 0,
          costeTrabMes: (duracionMeses > 0 && totalTrabajadores > 0) ? totalSinIVA/duracionMeses/totalTrabajadores : 0,
          pctPersonal: totalSinIVA > 0 ? (totalPersonal/totalSinIVA*100) : 0,
        },
        escenarios: escenarios.map(e => ({ nombre: e.nombre, gg: e.gg, bi: e.bi, total: e.total, baja: e.baja, viable: e.viable })),
        fechaCalculo: new Date().toISOString(),
      }
      await api.guardarCalculo(selectedId, JSON.stringify(datos))
      setGuardadoOk(true); setTimeout(() => setGuardadoOk(false), 3000)
    } catch { alert('Error guardando cálculo') }
    finally { setGuardando(false) }
  }

  const importarSubrogados = async () => {
    if (!selectedId) return; setImportandoSubrogados(true)
    try {
      const subData = await api.subrogaciones(selectedId)
      if (subData.subrogaciones?.length > 0) {
        const psData = await api.personalSubrogado(subData.subrogaciones[0].id)
        if (psData.personal?.length > 0) {
          setPersonal(prev => [...prev, ...psData.personal.map((p: any) => ({
            id: uid(), convenioId: '', categoria: p.categoria||'Sin especificar', grupo: p.grupo||'', nivel: '',
            cantidad: 1, horasSemanales: p.jornada ? parseInt(p.jornada)||38 : 38, meses: duracionMeses,
            totalAnualBruto: parseFloat(p.salario_bruto||p.salario_bruto_anual||p.salario||p['Salario Bruto']||0)||0,
          }))]); setSubrogadosImportados(true); return
        }
      }
      const res = await api.resumenSubrogacion(selectedId)
      if (res?.personal?.length > 0) {
        setPersonal(prev => [...prev, ...res.personal.map((p: any) => ({
          id: uid(), convenioId: '', categoria: p.categoria||'Sin especificar', grupo: p.grupo||'', nivel: '',
          cantidad: 1, horasSemanales: p.jornada ? parseInt(p.jornada)||38 : 38, meses: duracionMeses,
          totalAnualBruto: parseFloat(p.salario_bruto||p.salario_bruto_anual||p.salario||0)||0,
        }))]); setSubrogadosImportados(true); return
      }
      alert('No se encontró personal subrogado. Analiza los pliegos primero con IA.')
    } catch(e) { console.error(e); alert('Error importando personal subrogado') }
    finally { setImportandoSubrogados(false) }
  }

  const pedirRecomendacion = async () => {
    if (!selectedId) return; setPidiendo(true); setRecomendacion(null)
    try {
      const res = await api.recomendarPrecio({
        oportunidad_id: selectedId, coste_real: totalSinIVA, costes_directos: costesDirectos,
        costes_indirectos: costesIndirectos, gg_bi: importeGG + importeBI,
        precio_suelo: base, presupuesto_sin_iva: presSinIVA, trabajadores: totalTrabajadores
      })
      if (res.ok) setRecomendacion(res.recomendacion); else alert(res.error||'Error en recomendación')
    } catch { alert('Error pidiendo recomendación') }
    finally { setPidiendo(false) }
  }

  const addPersonal = () => {
    const fc = convenios[0]; const cats = fc ? (categoriasPorConvenio[fc.id]||[]) : []; const c1 = cats[0]
    setPersonal([...personal, { id: uid(), convenioId: fc?.id||'', categoria: c1?.categoria||'', grupo: c1?.grupo||'', nivel: c1?.nivel||'', cantidad: 1, horasSemanales: 38, meses: duracionMeses, totalAnualBruto: c1?.total_anual_bruto||0 }])
  }
  const updatePersonal = (id: string, field: string, value: any) => {
    setPersonal(prev => prev.map(l => {
      if (l.id !== id) return l; const u = { ...l, [field]: value }
      if (field === 'convenioId' || field === 'categoria') {
        const cid = field === 'convenioId' ? value : l.convenioId; const cats = categoriasPorConvenio[cid]||[]
        if (field === 'convenioId') { const c1 = cats[0]; if (c1) { u.categoria=c1.categoria; u.grupo=c1.grupo||''; u.nivel=c1.nivel||''; u.totalAnualBruto=c1.total_anual_bruto||0 }}
        else { const cat = cats.find((c:any) => c.categoria===value); if (cat) { u.grupo=cat.grupo||''; u.nivel=cat.nivel||''; u.totalAnualBruto=cat.total_anual_bruto||0 }}
      }
      return u
    }))
  }
  const limpiarTodo = () => { setPersonal([]); setUniformidad([]); setMateriales([]); setMaquinaria([]); setPrl([]); setSeguros([]); setGestion([]); setTransporte([]); setOtrosIndirectos([]) }

  const catProps = { numTrab: totalTrabajadores||1, numCentros, duracion: duracionMeses }
  const inp = "w-full px-3 py-2 border border-[#dce5e1] rounded-xl text-sm focus:border-[#2d5a4e] focus:outline-none focus:ring-1 focus:ring-[#2d5a4e]/20"
  const lbl = "block text-[10px] text-[#8a9e96] uppercase tracking-wider mb-1 font-medium"

  if (cargando) return (<div className="flex flex-col items-center py-20"><Loader2 size={36} className="text-[#1a3c34] animate-spin mb-3"/><p className="text-[#5a7a70] text-sm">Cargando datos del sistema...</p></div>)

  // ═══════ STEP CONTENT ═══════
  const stepDatos = (<>
    <div className="bg-white border border-[#dce5e1] rounded-2xl p-6">
      <label className={lbl}>Seleccionar oportunidad</label>
      <select value={selectedId} onChange={e => handleSelectId(e.target.value)} className={`${inp} bg-[#f8faf9] cursor-pointer`}>
        <option value="">— Seleccionar oportunidad —</option>
        {oportunidades.filter(o => o.estado !== 'descartada').map((o: any) => (<option key={o.id} value={o.id}>{o.titulo?.substring(0,80)} — {o.presupuesto ? Number(o.presupuesto).toLocaleString('es-ES')+' €' : '?'}</option>))}
      </select>
      {oportunidad && (<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        <div><span className={lbl}>Presupuesto (IVA incl.)</span><p className="text-base font-extrabold text-[#1a3c34]">{fmt(presupuestoLicitacion)}</p></div>
        <div><span className={lbl}>Duración (meses)</span><input type="number" value={duracionMeses} onChange={e => setDuracionMeses(parseInt(e.target.value)||12)} className={inp}/></div>
        <div><span className={lbl}>Nº centros</span><input type="number" value={numCentros} onChange={e => setNumCentros(parseInt(e.target.value)||1)} className={inp}/></div>
        <div><span className={lbl}>SS empresa %</span><input type="number" step="0.01" value={ssTotal} onChange={e => setSsTotal(parseFloat(e.target.value)||33)} className={inp}/></div>
      </div>)}
    </div>
    {analisis?.existe && (<div className="mt-4 p-4 bg-[#e8f0ee] border border-[#dce5e1] rounded-2xl">
      <div className="flex items-center gap-2 mb-1"><Brain size={15} className="text-[#1a3c34]"/><span className="text-xs font-bold text-[#1a3c34]">Información del análisis IA</span></div>
      <p className="text-xs text-[#5a7a70] leading-relaxed">{analisis.analisis_completo?.datos_basicos?.duracion_contrato && `Duración: ${analisis.analisis_completo.datos_basicos.duracion_contrato} · `}{analisis.analisis_completo?.personal_requerido?.subrogacion && `Subrogación: ${analisis.analisis_completo.personal_requerido.subrogacion} · `}{analisis.analisis_completo?.personal_requerido?.num_trabajadores_subrogar > 0 && `${analisis.analisis_completo.personal_requerido.num_trabajadores_subrogar} trabajadores · `}{analisis.analisis_completo?.personal_requerido?.convenio_aplicable && `Convenio: ${analisis.analisis_completo.personal_requerido.convenio_aplicable}`}</p>
    </div>)}
  </>)

  const stepPersonal = (<>
    {convenios.length === 0 && <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4 flex items-center gap-2"><AlertTriangle size={14} className="text-amber-600"/><span className="text-xs text-amber-800">No hay convenios cargados. Ve a Configuración para subir un PDF.</span></div>}
    {haySubrogacion && !subrogadosImportados && (<button onClick={importarSubrogados} disabled={importandoSubrogados} className="flex items-center justify-center gap-2 w-full px-4 py-3.5 mb-5 text-sm font-bold text-white bg-gradient-to-r from-[#1a3c34] to-[#3a7a6a] hover:from-[#2d5a4e] hover:to-[#4a8a7a] rounded-xl shadow-lg shadow-[#1a3c34]/20 transition-all disabled:opacity-60">{importandoSubrogados ? <Loader2 size={16} className="animate-spin"/> : <UserPlus size={16}/>}{importandoSubrogados ? 'Importando...' : `Incorporar plantilla subrogada (${analisis.analisis_completo.personal_requerido.num_trabajadores_subrogar} trabajadores)`}</button>)}
    {subrogadosImportados && <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4"><CheckCircle2 size={16} className="text-emerald-600"/><span className="text-xs font-medium text-emerald-800">Plantilla subrogada incorporada. El coste bruto ya incluye SS empresa — revisa y ajusta.</span></div>}
    {personal.map((l, idx) => (<div key={l.id} className="p-4 bg-[#f8faf9] rounded-xl mb-3 border border-[#e8eeeb]">
      <div className="flex items-center justify-between mb-3"><span className="text-xs font-bold text-[#5a7a70]">Trabajador {idx+1} {l.convenioId==='' && l.totalAnualBruto > 0 ? '(subrogado — coste con SS incluida)' : ''}</span><button onClick={() => setPersonal(personal.filter(p => p.id !== l.id))} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button></div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div><label className={lbl}>Convenio</label><select value={l.convenioId} onChange={e => updatePersonal(l.id,'convenioId',e.target.value)} className={`${inp} bg-white cursor-pointer`}><option value="">— Sin convenio (coste real) —</option>{convenios.map((c:any) => <option key={c.id} value={c.id}>{c.sector} — {c.provincia}</option>)}</select></div>
        <div><label className={lbl}>Categoría</label>{l.convenioId ? (<select value={l.categoria} onChange={e => updatePersonal(l.id,'categoria',e.target.value)} className={`${inp} bg-white cursor-pointer`}>{(categoriasPorConvenio[l.convenioId]||[]).map((c:any,i:number) => <option key={i} value={c.categoria}>{c.grupo} {c.nivel ? `- ${c.nivel}` : ''} — {c.categoria}</option>)}{!(categoriasPorConvenio[l.convenioId]?.length) && <option value="">Sin categorías</option>}</select>) : <input type="text" value={l.categoria} onChange={e => updatePersonal(l.id,'categoria',e.target.value)} className={inp} placeholder="Categoría"/>}</div>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        <div><label className={lbl}>Cantidad</label><input type="number" min={1} value={l.cantidad} onChange={e => updatePersonal(l.id,'cantidad',parseInt(e.target.value)||1)} className={`${inp} text-center`}/></div>
        <div><label className={lbl}>h/sem</label><input type="number" min={1} max={40} value={l.horasSemanales} onChange={e => updatePersonal(l.id,'horasSemanales',parseInt(e.target.value)||38)} className={`${inp} text-center`}/></div>
        <div><label className={lbl}>Meses</label><input type="number" min={1} value={l.meses} onChange={e => updatePersonal(l.id,'meses',parseInt(e.target.value)||12)} className={`${inp} text-center`}/></div>
        <div><label className={lbl}>{l.convenioId ? 'Bruto anual' : 'Coste empresa anual'}</label>{l.convenioId ? <p className="text-xs font-bold text-[#1a2e28] mt-1.5">{fmt(l.totalAnualBruto)}</p> : <input type="number" step="0.01" value={l.totalAnualBruto} onChange={e => updatePersonal(l.id,'totalAnualBruto',parseFloat(e.target.value)||0)} className={`${inp} text-center text-xs`}/>}</div>
        <div><label className={lbl}>{l.convenioId ? '+ SS + absent.' : '+ absentismo'}</label><p className="text-[11px] text-[#5a7a70] mt-1.5">{fmt(l.totalAnualBruto * (l.convenioId ? (1+ssTotal/100) : 1) * factorAbsentismo)}</p></div>
        <div><label className={lbl}>Total línea</label><p className="text-xs font-extrabold text-[#1a3c34] mt-1.5">{fmt(calcPersonalLinea(l))}</p></div>
      </div>
    </div>))}
    <button onClick={addPersonal} className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-[#1a3c34] bg-[#e8f0ee] hover:bg-[#dce5e1] border border-dashed border-[#2d5a4e]/30 rounded-xl w-full justify-center transition-colors"><Plus size={16}/> Añadir personal</button>
    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#e8eeeb]">
      <span className="text-[10px] text-[#8a9e96]">Factor absentismo:</span>
      <input type="number" step="0.01" value={factorAbsentismo} onChange={e => setFactorAbsentismo(parseFloat(e.target.value)||1)} className="w-16 px-2 py-1 border border-[#dce5e1] rounded-lg text-xs text-center focus:border-[#2d5a4e] focus:outline-none"/>
      <span className="text-[10px] text-[#8a9e96]">({((factorAbsentismo-1)*100).toFixed(0)}% sobre coste)</span>
      {totalPersonal > 0 && <span className="ml-auto text-sm font-extrabold text-[#1a3c34]">{fmt(totalPersonal)}</span>}
    </div>
  </>)

  const stepDirectos = (<>
    <Bloque title="Uniformidad y EPIs" icon={Shield} badge={totalUniformidad > 0 ? fmt(totalUniformidad) : undefined}><TablaCatalogo lineas={uniformidad} setLineas={setUniformidad} catalogo={catalogoPorBloque['Uniformidad']||[]} conMeses={false} {...catProps}/></Bloque>
    <Bloque title="Materiales y suministros" icon={Package} badge={totalMateriales > 0 ? fmt(totalMateriales) : undefined}><TablaCatalogo lineas={materiales} setLineas={setMateriales} catalogo={catalogoPorBloque['Productos']||[]} conMeses={true} {...catProps}/></Bloque>
    <Bloque title="Maquinaria y utillaje" icon={Wrench} badge={totalMaquinaria > 0 ? fmt(totalMaquinaria) : undefined}><TablaCatalogo lineas={maquinaria} setLineas={setMaquinaria} catalogo={catalogoPorBloque['Maquinaria']||[]} conMeses={false} {...catProps}/></Bloque>

    {/* ── MEJORAS DEL PLIEGO ── */}
    <Bloque
      title="Mejoras valorables del pliego"
      icon={Star}
      badge={mejorasSeleccionadas.length > 0 ? `${mejorasSeleccionadas.length} selec. · +${puntosExtraMejoras}pts · ${fmt(totalMejoras)}` : undefined}
    >
      {mejoras.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-[#8a9e96] py-2">
          <Brain size={15} />
          <span>No se detectaron mejoras valorables en el pliego. Analiza primero con IA.</span>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Cabecera informativa */}
          <div className="flex items-center gap-2 p-3 bg-[#e8f0ee] rounded-xl">
            <Star size={14} className="text-[#1a3c34]" />
            <p className="text-xs text-[#1a3c34] font-medium">
              Selecciona las mejoras que vas a ofertar. Su coste se sumará a los costes directos y aparecerán destacadas en los documentos generados.
            </p>
          </div>

          {mejoras.map((m, idx) => (
            <div
              key={idx}
              className={`rounded-xl border p-4 transition-all ${m.seleccionada ? 'border-[#2d5a4e] bg-[#f0f7f4]' : 'border-[#dce5e1] bg-white'}`}
            >
              {/* Fila principal: checkbox + mejora + puntos */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={m.seleccionada}
                  onChange={e => setMejoras(prev => prev.map((x, i) => i === idx ? { ...x, seleccionada: e.target.checked } : x))}
                  className="mt-0.5 w-4 h-4 accent-[#1a3c34] cursor-pointer flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-[#1a2e28]">{m.mejora}</p>
                    {m.puntuacion > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                        <Star size={10} />+{m.puntuacion} pts
                      </span>
                    )}
                  </div>

                  {/* Campos adicionales solo si está seleccionada */}
                  {m.seleccionada && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block text-[10px] text-[#8a9e96] uppercase tracking-wider mb-1 font-medium">Coste estimado (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={m.costeEstimado || ''}
                          placeholder="0.00"
                          onChange={e => setMejoras(prev => prev.map((x, i) => i === idx ? { ...x, costeEstimado: parseFloat(e.target.value) || 0 } : x))}
                          className="w-full px-3 py-2 border border-[#dce5e1] rounded-xl text-sm focus:border-[#2d5a4e] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#8a9e96] uppercase tracking-wider mb-1 font-medium">Descripción para la oferta</label>
                        <input
                          type="text"
                          value={m.descripcionOferta}
                          placeholder="Cómo la presentamos en la oferta..."
                          onChange={e => setMejoras(prev => prev.map((x, i) => i === idx ? { ...x, descripcionOferta: e.target.value } : x))}
                          className="w-full px-3 py-2 border border-[#dce5e1] rounded-xl text-sm focus:border-[#2d5a4e] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Totales mejoras */}
          {mejorasSeleccionadas.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-[#1a3c34] rounded-xl text-white">
              <span className="text-xs font-semibold opacity-80">{mejorasSeleccionadas.length} mejoras · +{puntosExtraMejoras} puntos extra</span>
              <span className="text-sm font-extrabold">{fmt(totalMejoras)}</span>
            </div>
          )}
        </div>
      )}
    </Bloque>

    {costesDirectos > 0 && (
      <div className="flex justify-end p-3 bg-[#e8f0ee] rounded-xl border border-[#1a3c34]/10">
        <span className="text-sm font-extrabold text-[#1a3c34]">
          Total costes directos: {fmt(costesDirectos)}
          {totalMejoras > 0 && <span className="text-[11px] font-medium opacity-70 ml-2">(incl. {fmt(totalMejoras)} mejoras)</span>}
        </span>
      </div>
    )}
  </>)

  const stepIndirectos = (<>
    <Bloque title="Prevención Riesgos Laborales" icon={Shield} badge={totalPRL > 0 ? fmt(totalPRL) : undefined}><TablaCatalogo lineas={prl} setLineas={setPrl} catalogo={catalogoPorBloque['PRL']||[]} conMeses={false} {...catProps}/></Bloque>
    <Bloque title="Seguros" icon={Shield} badge={totalSeguros > 0 ? fmt(totalSeguros) : undefined}><TablaCatalogo lineas={seguros} setLineas={setSeguros} catalogo={catalogoPorBloque['Seguros']||[]} conMeses={false} {...catProps}/></Bloque>
    <Bloque title="Gestión y administración" icon={Settings} badge={totalGestion > 0 ? fmt(totalGestion) : undefined}><TablaCatalogo lineas={gestion} setLineas={setGestion} catalogo={catalogoPorBloque['Gestión']||[]} conMeses={true} {...catProps}/></Bloque>
    <Bloque title="Transporte y vehículos" icon={Truck} badge={totalTransporte > 0 ? fmt(totalTransporte) : undefined}><TablaCatalogo lineas={transporte} setLineas={setTransporte} catalogo={catalogoPorBloque['Transporte']||[]} conMeses={true} {...catProps}/></Bloque>
    <Bloque title="Otros costes" icon={Package} badge={totalOtrosInd > 0 ? fmt(totalOtrosInd) : undefined}><TablaCatalogo lineas={otrosIndirectos} setLineas={setOtrosIndirectos} catalogo={[...(catalogoPorBloque['Certificaciones']||[]), ...(catalogoPorBloque['Garantías']||[])]} conMeses={false} {...catProps}/></Bloque>
    {costesIndirectos > 0 && <div className="flex justify-end p-3 bg-amber-50 rounded-xl border border-amber-200/50"><span className="text-sm font-extrabold text-amber-800">Total costes indirectos: {fmt(costesIndirectos)}</span></div>}
  </>)

  const stepResumen = (<>
    {base > 0 && presSinIVA > 0 && (<div className="bg-white border border-[#dce5e1] rounded-2xl p-5 mb-4">
      <h3 className="text-sm font-bold text-[#1a2e28] mb-4">Escenarios de oferta</h3>
      <div className="grid grid-cols-3 gap-3">{escenarios.map(e => (<div key={e.nombre} className={`p-4 rounded-xl border-2 text-center ${e.viable ? (e.baja > 10 ? 'border-emerald-300 bg-emerald-50' : 'border-blue-300 bg-blue-50') : 'border-red-300 bg-red-50'}`}><p className="text-xs font-bold text-[#1a2e28] mb-1">{e.nombre}</p><p className="text-[10px] text-[#8a9e96]">GG {e.gg}% / BI {e.bi}%</p><p className="text-sm font-extrabold mt-2">{fmt(e.total)}</p><p className={`text-xs font-bold mt-1 ${e.baja > 0 ? 'text-emerald-700' : 'text-red-700'}`}>Baja: {fmtPct(e.baja)}</p></div>))}</div>
    </div>)}
    <div className="bg-white border-2 border-[#1a3c34]/20 rounded-2xl p-6 mb-4">
      <div className="flex items-center gap-3 mb-5"><div className="p-2.5 bg-gradient-to-br from-[#1a3c34] to-[#3a7a6a] rounded-xl"><TrendingUp size={18} className="text-white"/></div><h3 className="text-lg font-extrabold text-[#1a2e28]">Resumen económico</h3></div>
      <div className="space-y-1 mb-5">
        {totalPersonal > 0 && <div className="flex justify-between py-2 border-b border-[#e8eeeb]"><span className="text-sm text-[#5a7a70]">Personal (salario + SS + absentismo)</span><span className="text-sm font-bold">{fmt(totalPersonal)}</span></div>}
        {totalUniformidad > 0 && <div className="flex justify-between py-2 border-b border-[#e8eeeb]"><span className="text-sm text-[#5a7a70]">Uniformidad y EPIs</span><span className="text-sm font-bold">{fmt(totalUniformidad)}</span></div>}
        {totalMateriales > 0 && <div className="flex justify-between py-2 border-b border-[#e8eeeb]"><span className="text-sm text-[#5a7a70]">Materiales</span><span className="text-sm font-bold">{fmt(totalMateriales)}</span></div>}
        {totalMaquinaria > 0 && <div className="flex justify-between py-2 border-b border-[#e8eeeb]"><span className="text-sm text-[#5a7a70]">Maquinaria</span><span className="text-sm font-bold">{fmt(totalMaquinaria)}</span></div>}
        {totalMejoras > 0 && (
          <div className="flex justify-between py-2 border-b border-[#e8eeeb]">
            <span className="text-sm text-[#5a7a70] flex items-center gap-1.5">
              <Star size={12} className="text-amber-500" />
              Mejoras ofertadas ({mejorasSeleccionadas.length})
            </span>
            <span className="text-sm font-bold text-amber-700">{fmt(totalMejoras)}</span>
          </div>
        )}
        <div className="flex justify-between py-2.5 bg-[#e8f0ee] px-4 rounded-xl"><span className="text-sm font-bold text-[#1a3c34]">COSTES DIRECTOS</span><span className="text-sm font-extrabold text-[#1a3c34]">{fmt(costesDirectos)}</span></div>
        {costesIndirectos > 0 && <div className="flex justify-between py-2.5 bg-amber-50 px-4 rounded-xl mt-1"><span className="text-sm font-bold text-amber-800">COSTES INDIRECTOS</span><span className="text-sm font-extrabold text-amber-800">{fmt(costesIndirectos)}</span></div>}
      </div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div><label className={lbl}>GG %</label><input type="number" step="0.1" value={pctGG} onChange={e => setPctGG(parseFloat(e.target.value)||0)} className={`${inp} text-center`}/><p className="text-[10px] text-[#8a9e96] mt-1 text-center">{fmt(importeGG)}</p></div>
        <div><label className={lbl}>BI %</label><input type="number" step="0.1" value={pctBI} onChange={e => setPctBI(parseFloat(e.target.value)||0)} className={`${inp} text-center`}/><p className="text-[10px] text-[#8a9e96] mt-1 text-center">{fmt(importeBI)}</p></div>
        <div><label className={lbl}>IVA %</label><input type="number" step="0.1" value={pctIVA} onChange={e => setPctIVA(parseFloat(e.target.value)||0)} className={`${inp} text-center`}/><p className="text-[10px] text-[#8a9e96] mt-1 text-center">{fmt(importeIVA)}</p></div>
      </div>
      <div className="bg-[#1a3c34] text-white rounded-xl p-5 mb-5">
        <div className="flex justify-between mb-2"><span className="text-sm opacity-70">Total sin IVA</span><span className="text-lg font-extrabold">{fmt(totalSinIVA)}</span></div>
        <div className="flex justify-between"><span className="text-sm opacity-70">Total con IVA</span><span className="text-2xl font-black">{fmt(totalConIVA)}</span></div>
      </div>
      {presupuestoLicitacion > 0 && (<div className={`rounded-xl p-5 border-2 ${esRentable ? (baja > 20 ? 'bg-emerald-50 border-emerald-300' : baja > 5 ? 'bg-blue-50 border-blue-300' : 'bg-amber-50 border-amber-300') : 'bg-red-50 border-red-300'}`}>
        <div className="flex items-center gap-2 mb-3">{esRentable ? <CheckCircle2 size={18} className="text-emerald-600"/> : <XCircle size={18} className="text-red-600"/>}<span className="text-sm font-extrabold">{esRentable ? (baja > 20 ? 'MUY RENTABLE' : baja > 5 ? 'RENTABLE' : 'AJUSTADO') : 'NO RENTABLE'}</span></div>
        <div className="grid grid-cols-3 gap-4">
          <div><span className="text-[9px] text-[#5a7a70] uppercase font-medium">Presup. (sin IVA)</span><p className="text-sm font-extrabold mt-1">{fmt(presSinIVA)}</p></div>
          <div><span className="text-[9px] text-[#5a7a70] uppercase font-medium">Baja</span><p className={`text-sm font-extrabold mt-1 ${baja > 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtPct(baja)}</p></div>
          <div><span className="text-[9px] text-[#5a7a70] uppercase font-medium">Margen real</span><p className={`text-sm font-extrabold mt-1 ${margenReal > 5 ? 'text-emerald-700' : margenReal > 0 ? 'text-amber-700' : 'text-red-700'}`}>{fmtPct(margenReal)}</p></div>
        </div>
      </div>)}
    </div>
    {selectedId && totalSinIVA > 0 && (<div className="bg-white border border-[#dce5e1] rounded-2xl p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><Brain size={18} className="text-[#3a7a6a]"/><h3 className="text-sm font-bold text-[#1a2e28]">Recomendación precio IA</h3></div>
        <button onClick={pedirRecomendacion} disabled={pidiendo} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#2d5a4e] hover:bg-[#1a3c34] rounded-xl disabled:opacity-50 transition-colors">{pidiendo ? <Loader2 size={14} className="animate-spin"/> : <Brain size={14}/>}{pidiendo ? 'Analizando...' : 'Pedir recomendación'}</button>
      </div>
      {recomendacion && (<div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-[#e8f0ee] rounded-xl text-center"><p className="text-[10px] text-[#5a7a70]">Precio recomendado</p><p className="text-lg font-extrabold text-[#1a3c34]">{fmt(recomendacion.precio_recomendado||0)}</p></div>
          <div className="p-3 bg-[#e8f0ee] rounded-xl text-center"><p className="text-[10px] text-[#5a7a70]">Baja recomendada</p><p className="text-lg font-extrabold text-[#1a3c34]">{fmtPct(recomendacion.baja_recomendada_pct||0)}</p></div>
          <div className="p-3 bg-[#e8f0ee] rounded-xl text-center"><p className="text-[10px] text-[#5a7a70]">Confianza</p><p className={`text-lg font-extrabold ${recomendacion.confianza==='alta' ? 'text-emerald-700' : recomendacion.confianza==='media' ? 'text-amber-700' : 'text-red-700'}`}>{recomendacion.confianza}</p></div>
        </div>
        {recomendacion.razonamiento && <p className="text-xs text-[#5a7a70] bg-[#f8faf9] p-3 rounded-xl leading-relaxed">{recomendacion.razonamiento}</p>}
        {recomendacion.consejo && <p className="text-xs text-[#1a3c34] bg-[#e8f0ee] p-3 rounded-xl font-semibold">{recomendacion.consejo}</p>}
      </div>)}
    </div>)}
    {totalSinIVA > 0 && duracionMeses > 0 && (<div className="bg-white border border-[#dce5e1] rounded-2xl p-5">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div><span className="text-[10px] text-[#8a9e96] uppercase font-medium">Coste/mes</span><p className="text-lg font-extrabold text-[#1a2e28]">{fmt(totalSinIVA/duracionMeses)}</p></div>
        <div><span className="text-[10px] text-[#8a9e96] uppercase font-medium">Coste/trab./mes</span><p className="text-lg font-extrabold text-[#1a2e28]">{totalTrabajadores > 0 ? fmt(totalSinIVA/duracionMeses/totalTrabajadores) : '—'}</p></div>
        <div><span className="text-[10px] text-[#8a9e96] uppercase font-medium">% personal</span><p className="text-lg font-extrabold text-[#1a2e28]">{totalSinIVA > 0 ? fmtPct(totalPersonal/totalSinIVA*100) : '—'}</p></div>
      </div>
    </div>)}
  </>)

  const stepContent = [stepDatos, stepPersonal, stepDirectos, stepIndirectos, stepResumen]

  return (
    <div ref={containerRef} className="max-w-4xl mx-auto">
      <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Pipeline */}
      <PipelineBar
        currentStep="calculo"
        showNext={!!(selectedId && step === STEPS.length - 1 && totalSinIVA > 0)}
        nextLabel="Ir a GO/NO-GO →"
        nextDisabled={!(totalSinIVA > 0)}
        nextDisabledMsg="Completa el cálculo económico antes de continuar"
      />

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-[#1a3c34] to-[#3a7a6a] rounded-xl shadow-lg shadow-[#1a3c34]/20"><Calculator size={22} className="text-white"/></div>
        <div className="flex-1"><h1 className="text-2xl font-extrabold text-[#1a2e28]">Cálculo Económico</h1><p className="text-sm text-[#5a7a70]">Escandallo de costes — LCSP</p></div>
        <div className="flex gap-2">
          {selectedId && (<button onClick={guardarCalculo} disabled={guardando} className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${guardadoOk ? 'bg-emerald-100 text-emerald-700' : 'bg-[#1a3c34] text-white hover:bg-[#2d5a4e]'} disabled:opacity-50`}>{guardando ? <Loader2 size={14} className="animate-spin"/> : guardadoOk ? <CheckCircle2 size={14}/> : <Save size={14}/>}{guardando ? 'Guardando...' : guardadoOk ? 'Guardado' : 'Guardar'}</button>)}
          <button onClick={limpiarTodo} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#5a7a70] bg-[#f1f5f3] hover:bg-[#dce5e1] rounded-xl transition-colors"><RotateCcw size={14}/> Limpiar</button>
        </div>
      </div>

      {/* Step tabs — libre, sin bloqueos */}
      <div className="flex items-center gap-1 mb-6 bg-white border border-[#dce5e1] rounded-2xl p-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          return (<button key={s.id} onClick={() => goToStep(i)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-xs font-bold transition-all duration-200 ${i === step ? 'bg-[#1a3c34] text-white shadow-md shadow-[#1a3c34]/20' : 'text-[#8a9e96] hover:bg-[#f1f5f3] hover:text-[#5a7a70]'}`}><Icon size={14}/> <span className="hidden sm:inline">{s.label}</span></button>)
        })}
      </div>

      {/* Mini summary */}
      {totalSinIVA > 0 && step < 4 && (<div className="flex items-center justify-between mb-4 px-4 py-2.5 bg-[#1a3c34] text-white rounded-xl text-xs"><span className="font-medium opacity-80">{totalTrabajadores} trab. · Directos: {fmt(costesDirectos)} · Indirectos: {fmt(costesIndirectos)}</span><span className="font-extrabold text-sm">{fmt(totalSinIVA)} sin IVA</span></div>)}

      {/* Step content — fade transition */}
      <div key={step} className={`min-h-[400px] transition-all duration-150 ease-out ${transitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`} style={{ animation: transitioning ? 'none' : 'fadeSlideIn 0.25s ease-out' }}>{stepContent[step]}</div>

      {/* Navigation — libre */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#e8eeeb]">
        <button onClick={() => goToStep(step-1)} disabled={step===0} className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#5a7a70] bg-[#f1f5f3] hover:bg-[#dce5e1] rounded-xl disabled:opacity-30 transition-colors"><ArrowLeft size={16}/> Anterior</button>
        <span className="text-xs text-[#8a9e96] font-medium">Paso {step+1} de {STEPS.length}</span>
        <button onClick={() => goToStep(step+1)} disabled={step===STEPS.length-1} className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#1a3c34] hover:bg-[#2d5a4e] rounded-xl disabled:opacity-30 transition-colors">Siguiente <ArrowRight size={16}/></button>
      </div>
    </div>
  )
}