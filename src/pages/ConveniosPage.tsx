import { useState, useEffect } from 'react'
import { api } from '../services/api'
import {
  MapPin, AlertTriangle, CheckCircle2, Clock, Upload, Search, BarChart3,
  Loader2, FileText, Trash2, XCircle, Building2, Brain, X, Plus, Briefcase
} from 'lucide-react'

const PROVINCIAS_DEFAULT = ['Almería','Cádiz','Córdoba','Granada','Huelva','Jaén','Málaga','Sevilla']
const SECTORES_DEFAULT = ['Limpieza','Mantenimiento','Jardinería','Multiservicios','Seguridad','Hostelería','Oficinas']

function fmt(n: number) { return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' }

export default function ConveniosPage() {
  const [convenios, setConvenios] = useState<any[]>([])
  const [alertas, setAlertas] = useState<any[]>([])
  const [comparacion, setComparacion] = useState<any[]>([])
  const [categoriasDisp, setCategoriasDisp] = useState<string[]>([])
  const [catSeleccionada, setCatSeleccionada] = useState('')
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [tab, setTab] = useState<'sectores'|'comparador'|'alertas'>('sectores')

  // Sectores configurables
  const [sectores, setSectores] = useState<string[]>(() => {
    const saved = localStorage.getItem('forgeser_sectores')
    return saved ? JSON.parse(saved) : SECTORES_DEFAULT
  })
  const [nuevoSector, setNuevoSector] = useState('')
  const [mostrarAddSector, setMostrarAddSector] = useState(false)

  // Provincias configurables
  const [provincias_config, setProvinciasConfig] = useState<string[]>(() => {
    const saved = localStorage.getItem('forgeser_provincias')
    return saved ? JSON.parse(saved) : PROVINCIAS_DEFAULT
  })
  const [nuevaProvincia, setNuevaProvincia] = useState('')
  const [mostrarAddProvincia, setMostrarAddProvincia] = useState(false)

  // Búsqueda IA
  const [buscando, setBuscando] = useState(false)
  const [busqProvincia, setBusqProvincia] = useState('')
  const [busqSector, setBusqSector] = useState('')
  const [resultadoBusq, setResultadoBusq] = useState<any>(null)
  const [mostrarBusqueda, setMostrarBusqueda] = useState(false)

  // Sector expandido
  const [sectorExpandido, setSectorExpandido] = useState<string|null>(null)

  const cargar = async () => {
    setCargando(true)
    try {
      const [mapa, alerta, comp] = await Promise.all([
        api.mapaConvenios(), api.alertasConvenios(), api.compararConvenios()
      ])
      setConvenios(mapa.provincias || [])
      setAlertas(alerta.alertas || [])
      setComparacion(comp.comparacion || [])
      setCategoriasDisp(comp.categorias_disponibles || [])
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  const guardarSectores = (s: string[]) => { setSectores(s); localStorage.setItem('forgeser_sectores', JSON.stringify(s)) }
  const addSector = () => {
    if (!nuevoSector.trim() || sectores.includes(nuevoSector.trim())) return
    guardarSectores([...sectores, nuevoSector.trim()])
    setNuevoSector(''); setMostrarAddSector(false)
  }
  const removeSector = (s: string) => {
    if (!confirm(`¿Eliminar el sector "${s}"?`)) return
    guardarSectores(sectores.filter(x => x !== s))
  }

  const guardarProvincias = (p: string[]) => { setProvinciasConfig(p); localStorage.setItem('forgeser_provincias', JSON.stringify(p)) }
  const addProvincia = () => {
    if (!nuevaProvincia.trim() || provincias_config.includes(nuevaProvincia.trim())) return
    guardarProvincias([...provincias_config, nuevaProvincia.trim()])
    setNuevaProvincia(''); setMostrarAddProvincia(false)
  }
  const removeProvincia = (p: string) => {
    if (!confirm(`¿Eliminar la provincia "${p}"?`)) return
    guardarProvincias(provincias_config.filter(x => x !== p))
  }

  const handleSubir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendo(true)
    try {
      const result = await api.subirConvenio(file)
      if (result.ok) { await cargar() } else { alert('Error: ' + (result.error || '')) }
    } catch (err) { alert('Error subiendo') }
    finally { setSubiendo(false); e.target.value = '' }
  }

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar este convenio?')) return
    try { await api.eliminarConvenio(id); await cargar() } catch (e) { console.error(e) }
  }

  const handleBuscarAuto = async () => {
    if (!busqProvincia || !busqSector) return
    setBuscando(true); setResultadoBusq(null)
    try { setResultadoBusq(await api.buscarConvenioAuto(busqProvincia, busqSector)) }
    catch (e) { setResultadoBusq({ ok: false, error: 'Error de conexión' }) }
    finally { setBuscando(false) }
  }

  const abrirBusqueda = (sector: string, provincia?: string) => {
    setBusqSector(sector); setBusqProvincia(provincia || ''); setResultadoBusq(null); setMostrarBusqueda(true)
  }

  const filtrarComparacion = async (cat: string) => {
    setCatSeleccionada(cat)
    const comp = await api.compararConvenios(cat || undefined)
    setComparacion(comp.comparacion || [])
  }

  // Agrupar convenios por sector
  const conveniosPorSector = (sector: string) => {
    return convenios.filter(c => c.sector && c.sector.toLowerCase().includes(sector.toLowerCase()))
  }
  const provinciasCubiertas = (sector: string) => {
    return new Set(conveniosPorSector(sector).map(c => c.provincia))
  }

  if (cargando) return (<div className="flex flex-col items-center py-20"><Loader2 size={32} className="text-[#1a3c34] animate-spin mb-3" /><p className="text-slate-500">Cargando convenios...</p></div>)

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e] rounded-xl shadow-lg shadow-emerald-200"><Briefcase size={22} className="text-white" /></div>
          <div><h1 className="text-2xl font-bold text-slate-900">Convenios Multi-Territorio</h1><p className="text-sm text-slate-500">{convenios.length} convenios en {sectores.length} sectores — {alertas.length} alertas</p></div>
        </div>
        <label className={`flex items-center gap-2 px-4 py-2.5 ${subiendo ? 'bg-slate-300' : 'bg-[#1a3c34] hover:bg-[#2d5a4e]'} text-white text-sm font-semibold rounded-xl cursor-pointer transition-colors`}>
          {subiendo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {subiendo ? 'Procesando...' : 'Subir convenio PDF'}
          <input type="file" accept=".pdf" onChange={handleSubir} className="hidden" disabled={subiendo} />
        </label>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6">
        {(['sectores', 'comparador', 'alertas'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow text-[#1a3c34]' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'sectores' && <><Briefcase size={14} className="inline mr-2" />Por Sectores</>}
            {t === 'comparador' && <><BarChart3 size={14} className="inline mr-2" />Comparador Salarial</>}
            {t === 'alertas' && <><AlertTriangle size={14} className="inline mr-2" />Alertas{alertas.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] rounded-full font-bold">{alertas.length}</span>}</>}
          </button>
        ))}
      </div>

      {/* BÚSQUEDA IA GLOBAL */}
      {mostrarBusqueda && (
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-300 rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Brain size={18} className="text-violet-600" /><h3 className="text-sm font-bold text-violet-900">Búsqueda automática de convenio</h3></div>
            <button onClick={() => { setMostrarBusqueda(false); setResultadoBusq(null) }} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-semibold">Sector</label>
              <select value={busqSector} onChange={e => { setBusqSector(e.target.value); setResultadoBusq(null) }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white mt-1">
                <option value="">— Seleccionar —</option>
                {sectores.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-semibold">Provincia</label>
              <select value={busqProvincia} onChange={e => { setBusqProvincia(e.target.value); setResultadoBusq(null) }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white mt-1">
                <option value="">— Seleccionar —</option>
                {provincias_config.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={handleBuscarAuto} disabled={buscando || !busqProvincia || !busqSector}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white text-sm font-semibold rounded-lg transition-colors">
                {buscando ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                {buscando ? 'Buscando...' : 'Buscar con IA'}
              </button>
            </div>
          </div>

          {buscando && (
            <div className="flex items-center justify-center py-6 gap-3">
              <Loader2 size={20} className="text-violet-500 animate-spin" />
              <span className="text-sm text-violet-600">Gemini buscando convenio de {busqSector} en {busqProvincia}...</span>
            </div>
          )}

          {resultadoBusq && !resultadoBusq.ok && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-500" /><span className="text-xs text-red-700">{resultadoBusq.error}</span>
            </div>
          )}
          {resultadoBusq?.ok && !resultadoBusq.encontrado && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" /><span className="text-xs text-amber-700">{resultadoBusq.mensaje}</span>
            </div>
          )}
          {resultadoBusq?.ok && resultadoBusq.encontrado && resultadoBusq.convenio && (
            <div className="bg-white rounded-xl border border-violet-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <h4 className="text-sm font-bold text-slate-900">Convenio encontrado</h4>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${resultadoBusq.convenio.confianza === 'alta' ? 'bg-emerald-100 text-emerald-700' : resultadoBusq.convenio.confianza === 'media' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                  Confianza {resultadoBusq.convenio.confianza}
                </span>
              </div>
              <p className="text-sm text-slate-800 font-semibold mb-2">{resultadoBusq.convenio.nombre}</p>
              <div className="grid grid-cols-4 gap-3 mb-3">
                <div><span className="text-[10px] text-slate-400">Ámbito</span><p className="text-xs font-semibold">{resultadoBusq.convenio.ambito}</p></div>
                <div><span className="text-[10px] text-slate-400">Fuente</span><p className="text-xs font-semibold">{resultadoBusq.convenio.fuente}</p></div>
                <div><span className="text-[10px] text-slate-400">Vigencia</span><p className="text-xs font-semibold">{resultadoBusq.convenio.vigencia_desde} — {resultadoBusq.convenio.vigencia_hasta}</p></div>
                {resultadoBusq.convenio.codigo && <div><span className="text-[10px] text-slate-400">Código</span><p className="text-xs font-semibold">{resultadoBusq.convenio.codigo}</p></div>}
              </div>
              {resultadoBusq.convenio.resumen && <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg mb-3">{resultadoBusq.convenio.resumen}</p>}
              <div className="flex flex-wrap gap-2">
                {resultadoBusq.convenio.url_boe && <a href={resultadoBusq.convenio.url_boe} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 bg-[#1a3c34] text-white text-xs font-semibold rounded-lg hover:bg-[#2d5a4e]"><FileText size={12} /> Descargar PDF</a>}
                {resultadoBusq.convenio.url_boja && <a href={resultadoBusq.convenio.url_boja} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white text-xs font-semibold rounded-lg hover:bg-orange-700"><FileText size={12} /> Buscar en BOJA</a>}
                <a href={resultadoBusq.convenio.url_busqueda_boe} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"><Search size={12} /> Buscar en BOE</a>
              </div>
              <p className="text-[10px] text-slate-400 mt-3">Descarga el PDF y súbelo con "Subir convenio PDF" para extraer las tablas salariales.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB: POR SECTORES */}
      {tab === 'sectores' && (
        <div>
          {/* Botón buscar global */}
          {!mostrarBusqueda && (
            <button onClick={() => setMostrarBusqueda(true)}
              className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-3 bg-violet-50 hover:bg-violet-100 border-2 border-dashed border-violet-300 text-violet-700 text-sm font-semibold rounded-xl transition-colors">
              <Brain size={16} /> Buscar convenio automáticamente con IA
            </button>
          )}

          {/* Sectores */}
          <div className="space-y-4">
            {sectores.map(sector => {
              const convsSector = conveniosPorSector(sector)
              const cubiertas = provinciasCubiertas(sector)
              const expanded = sectorExpandido === sector

              return (
                <div key={sector} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <button onClick={() => setSectorExpandido(expanded ? null : sector)}
                    className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#1a3c34] rounded-xl"><Briefcase size={16} className="text-white" /></div>
                      <div className="text-left">
                        <h3 className="text-sm font-bold text-slate-900">{sector}</h3>
                        <p className="text-xs text-slate-500">{convsSector.length} convenio{convsSector.length !== 1 ? 's' : ''} cargado{convsSector.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Mini mapa de provincias */}
                      <div className="hidden md:flex gap-1">
                        {provincias_config.map(prov => (
                          <div key={prov} title={prov}
                            className={`w-6 h-6 rounded text-[8px] font-bold flex items-center justify-center ${
                              cubiertas.has(prov)
                                ? convsSector.find(c => c.provincia === prov)?.estado === 'vencido' ? 'bg-red-200 text-red-700'
                                : convsSector.find(c => c.provincia === prov)?.estado === 'proximo' ? 'bg-amber-200 text-amber-700'
                                : 'bg-emerald-200 text-emerald-700'
                                : 'bg-slate-100 text-slate-400'
                            }`}>
                            {prov.substring(0, 2)}
                          </div>
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-slate-500">{cubiertas.size}/{provincias_config.length}</span>
                      <svg className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {provincias_config.map(prov => {
                          const conv = convsSector.find(c => c.provincia === prov)
                          if (conv) {
                            const esVencido = conv.estado === 'vencido'
                            const esProximo = conv.estado === 'proximo'
                            return (
                              <div key={prov} className={`${esVencido ? 'bg-red-50 border-red-200' : esProximo ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'} border rounded-xl p-3`}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-slate-800">{prov}</span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${esVencido ? 'bg-red-100 text-red-700' : esProximo ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {esVencido ? 'VENCIDO' : esProximo ? 'POR VENCER' : 'VIGENTE'}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 mb-1">{conv.num_categorias} categorías</p>
                                {conv.dias_restantes !== null && (
                                  <p className={`text-[10px] font-semibold ${conv.dias_restantes < 0 ? 'text-red-600' : conv.dias_restantes < 90 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {conv.dias_restantes < 0 ? `Venció hace ${Math.abs(conv.dias_restantes)}d` : `Vence en ${conv.dias_restantes}d`}
                                  </p>
                                )}
                                <button onClick={() => handleEliminar(conv.id)} className="mt-1.5 text-[9px] text-red-400 hover:text-red-600 flex items-center gap-1"><Trash2 size={9} /> Eliminar</button>
                              </div>
                            )
                          }
                          return (
                            <div key={prov} className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 text-center">
                              <span className="text-xs font-bold text-slate-400">{prov}</span>
                              <p className="text-[10px] text-slate-400 mt-1">Sin convenio</p>
                              <button onClick={() => abrirBusqueda(sector, prov)}
                                className="mt-1.5 text-[10px] text-violet-600 font-semibold hover:underline flex items-center gap-1 mx-auto">
                                <Brain size={10} /> Buscar con IA
                              </button>
                            </div>
                          )
                        })}
                      </div>
                      {/* Convenios de otras provincias */}
                      {convsSector.filter(c => !provincias_config.includes(c.provincia)).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <p className="text-[10px] text-slate-500 uppercase font-semibold mb-2">Otros territorios</p>
                          <div className="flex flex-wrap gap-2">
                            {convsSector.filter(c => !provincias_config.includes(c.provincia)).map(c => (
                              <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                                <span className="text-xs font-semibold text-blue-800">{c.provincia}</span>
                                <span className="text-[10px] text-blue-500">{c.num_categorias} cat.</span>
                                <button onClick={() => handleEliminar(c.id)} className="text-red-400 hover:text-red-600"><Trash2 size={10} /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <button onClick={() => abrirBusqueda(sector)}
                        className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-violet-50 hover:bg-violet-100 border border-dashed border-violet-300 text-violet-600 text-xs font-semibold rounded-lg">
                        <Brain size={12} /> Buscar convenio de {sector} con IA
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Gestión sectores y provincias */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sectores */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Sectores</h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {sectores.map(s => (
                  <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1a3c34]/10 rounded-full text-xs text-[#1a3c34] font-medium">
                    {s}
                    <button onClick={() => removeSector(s)} className="text-slate-400 hover:text-red-500"><X size={12} /></button>
                  </span>
                ))}
              </div>
              {mostrarAddSector ? (
                <div className="flex gap-2">
                  <input type="text" value={nuevoSector} onChange={e => setNuevoSector(e.target.value)} placeholder="Nuevo sector..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a3c34] focus:outline-none"
                    onKeyDown={e => e.key === 'Enter' && addSector()} autoFocus />
                  <button onClick={addSector} className="px-3 py-2 bg-[#1a3c34] text-white text-xs font-semibold rounded-lg">Añadir</button>
                  <button onClick={() => { setMostrarAddSector(false); setNuevoSector('') }} className="px-3 py-2 bg-slate-100 text-slate-500 text-xs rounded-lg">Cancelar</button>
                </div>
              ) : (
                <button onClick={() => setMostrarAddSector(true)} className="flex items-center gap-1.5 text-xs text-[#1a3c34] font-semibold hover:underline"><Plus size={12} /> Añadir sector</button>
              )}
            </div>

            {/* Provincias */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Provincias / Territorios</h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {provincias_config.map(p => (
                  <span key={p} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full text-xs text-blue-700 font-medium">
                    <MapPin size={10} />{p}
                    <button onClick={() => removeProvincia(p)} className="text-slate-400 hover:text-red-500"><X size={12} /></button>
                  </span>
                ))}
              </div>
              {mostrarAddProvincia ? (
                <div className="flex gap-2">
                  <input type="text" value={nuevaProvincia} onChange={e => setNuevaProvincia(e.target.value)} placeholder="Nueva provincia..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a3c34] focus:outline-none"
                    onKeyDown={e => e.key === 'Enter' && addProvincia()} autoFocus />
                  <button onClick={addProvincia} className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg">Añadir</button>
                  <button onClick={() => { setMostrarAddProvincia(false); setNuevaProvincia('') }} className="px-3 py-2 bg-slate-100 text-slate-500 text-xs rounded-lg">Cancelar</button>
                </div>
              ) : (
                <button onClick={() => setMostrarAddProvincia(true)} className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:underline"><Plus size={12} /> Añadir provincia</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: COMPARADOR SALARIAL */}
      {tab === 'comparador' && (
        <div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <Search size={16} className="text-slate-400" />
              <select value={catSeleccionada} onChange={e => filtrarComparacion(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-[#1a3c34] focus:outline-none">
                <option value="">— Todas las categorías —</option>
                {categoriasDisp.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {comparacion.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No hay datos para comparar. Sube convenios de diferentes provincias.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Provincia</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Sector</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Categoría</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Base mensual</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Plus espec.</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Total anual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparacion.map((row: any, idx: number) => {
                      const sameCat = comparacion.filter((r: any) => r.categoria === row.categoria)
                      const maxAnual = Math.max(...sameCat.map((r: any) => r.total_anual_bruto || 0))
                      const minAnual = Math.min(...sameCat.filter((r: any) => r.total_anual_bruto > 0).map((r: any) => r.total_anual_bruto))
                      const isMax = row.total_anual_bruto === maxAnual && sameCat.length > 1
                      const isMin = row.total_anual_bruto === minAnual && sameCat.length > 1 && minAnual !== maxAnual
                      return (
                        <tr key={idx} className={`border-b border-slate-100 hover:bg-slate-50 ${isMax ? 'bg-red-50' : isMin ? 'bg-emerald-50' : ''}`}>
                          <td className="px-4 py-2.5 text-xs font-bold text-slate-700">{row.provincia}</td>
                          <td className="px-4 py-2.5 text-xs text-slate-500">{row.sector}</td>
                          <td className="px-4 py-2.5 text-xs text-slate-600">{row.categoria}</td>
                          <td className="px-4 py-2.5 text-xs text-right font-semibold">{row.salario_base_mensual ? fmt(row.salario_base_mensual) : '—'}</td>
                          <td className="px-4 py-2.5 text-xs text-right">{row.plus_especialidad ? fmt(row.plus_especialidad) : '—'}</td>
                          <td className={`px-4 py-2.5 text-xs text-right font-bold ${isMax ? 'text-red-700' : isMin ? 'text-emerald-700' : 'text-slate-800'}`}>{row.total_anual_bruto ? fmt(row.total_anual_bruto) : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-4 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-50 border border-red-200 rounded"></span> Más caro</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-50 border border-emerald-200 rounded"></span> Más barato</span>
                <span className="ml-auto">{comparacion.length} registros</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: ALERTAS */}
      {tab === 'alertas' && (
        <div>
          {alertas.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 size={40} className="text-emerald-300 mx-auto mb-3" />
              <p className="text-slate-500">Todos los convenios están al día.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alertas.map((a: any) => (
                <div key={a.id} className={`${a.tipo === 'vencido' ? 'bg-red-50 border-red-300' : a.tipo === 'urgente' ? 'bg-amber-50 border-amber-300' : 'bg-yellow-50 border-yellow-200'} border-2 rounded-xl p-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {a.tipo === 'vencido' ? <XCircle size={20} className="text-red-500" /> : <Clock size={20} className="text-amber-500" />}
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{a.sector} — {a.provincia}</h4>
                        <p className="text-xs text-slate-600 truncate max-w-md">{a.nombre}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${a.tipo === 'vencido' ? 'text-red-700' : 'text-amber-700'}`}>
                        {a.dias_restantes < 0 ? `Vencido hace ${Math.abs(a.dias_restantes)} días` : `Vence en ${a.dias_restantes} días`}
                      </p>
                      <button onClick={() => abrirBusqueda(a.sector, a.provincia)} className="text-xs text-violet-600 font-semibold hover:underline mt-1">Buscar actualización con IA</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}