import { Search, Filter, RefreshCw, ExternalLink, Plus, Loader2, FileText, Brain, Calendar, Building2, Archive, ArchiveRestore, FileDown } from 'lucide-react'
import { SkeletonList } from '../components/Skeleton'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import ConfirmModal from '../components/ConfirmModal'
import { ScoreBadge } from '../components/ScoreDesglose'

const ESTADO_BADGE: Record<string, { label: string; className: string }> = {
  nueva:       { label: 'Nueva',        className: 'bg-blue-100 text-blue-700' },
  en_analisis: { label: 'En análisis',  className: 'bg-amber-100 text-amber-700' },
  go:          { label: 'GO',           className: 'bg-emerald-100 text-emerald-700' },
  no_go:       { label: 'NO-GO',        className: 'bg-red-100 text-red-700' },
  presentada:  { label: 'Presentada',   className: 'bg-blue-100 text-blue-800' },
  descartada:  { label: 'Descartada',   className: 'bg-gray-100 text-gray-700' },
  adjudicada:  { label: 'Adjudicada',   className: 'bg-purple-100 text-purple-700' },
  perdida:     { label: 'Perdida',      className: 'bg-rose-100 text-rose-700' },
  go_aprobado: { label: 'GO Aprobado',  className: 'bg-violet-100 text-violet-700' },
  archivada:   { label: 'Archivada',    className: 'bg-slate-100 text-slate-500' },
}

function formatearFechaCorta(fecha: unknown): string {
  if (!fecha) return ''
  try {
    const str = String(fecha)
    if (str.includes('T')) {
      const d = new Date(str)
      if (!isNaN(d.getTime())) return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const f = str.split(' ')[0].split('-')
      return `${f[2]}/${f[1]}/${f[0]}`
    }
    return str.substring(0, 10)
  } catch { return '' }
}

function diasRestantes(fecha: unknown): { dias: number, texto: string, color: string } | null {
  if (!fecha) return null
  try {
    const str = String(fecha)
    let fechaObj: Date
    if (str.includes('T')) fechaObj = new Date(str)
    else if (/^\d{4}-\d{2}-\d{2}/.test(str)) fechaObj = new Date(str.split(' ')[0])
    else return null
    if (isNaN(fechaObj.getTime())) return null
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    const dias = Math.ceil((fechaObj.getTime() - hoy.getTime()) / 86400000)
    if (dias < 0) return { dias, texto: 'Vencida', color: 'text-red-600' }
    if (dias === 0) return { dias, texto: '¡Hoy!', color: 'text-red-600' }
    if (dias <= 7) return { dias, texto: `${dias}d`, color: 'text-red-600' }
    if (dias <= 15) return { dias, texto: `${dias}d`, color: 'text-amber-600' }
    if (dias <= 30) return { dias, texto: `${dias}d`, color: 'text-blue-600' }
    return { dias, texto: `${dias}d`, color: 'text-slate-500' }
  } catch { return null }
}

export default function OportunidadesPage() {
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [mostrarArchivadas, setMostrarArchivadas] = useState(false)
  const [oportunidades, setOportunidades] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [buscandoPLACSP, setBuscandoPLACSP] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [confirmBuscar, setConfirmBuscar] = useState(false)
  const [confirmArchivar, setConfirmArchivar] = useState<any>(null)
  const [confirmRestaurar, setConfirmRestaurar] = useState<any>(null)
  const navigate = useNavigate()

  const cargar = async () => {
    setCargando(true)
    try {
      const data = await api.oportunidades()
      setOportunidades(data.oportunidades || [])
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  const buscarPLACSP = async () => {
    setBuscandoPLACSP(true); setMensaje('')
    try {
      const r = await api.buscarNuevasLicitaciones()
      if (!r.ok) { setMensaje('❌ Error: ' + (r.error || 'desconocido')); return }
      if (r.msg) {
        setMensaje((r.nuevas > 0 ? '✅ ' : 'ℹ️ ') + r.msg)
      } else {
        const partes = []
        if (r.nuevas > 0)     partes.push(r.nuevas + ' nuevas')
        if (r.duplicadas > 0) partes.push(r.duplicadas + ' ya existentes')
        if (r.total_recibidas) partes.push('de ' + r.total_recibidas + ' revisadas')
        setMensaje(partes.length > 0 ? '✅ ' + partes.join(' · ') : '✅ Sin novedades en PLACSP.')
      }
      ;(api as any).invalidarCache?.()
      await cargar()
    } catch (e) {
      setMensaje('❌ Error al conectar con PLACSP. Inténtalo de nuevo.')
    } finally { setBuscandoPLACSP(false) }
  }

  const handleArchivar = async (o: any) => {
    try {
      const r = await api.archivarOportunidad(o.id)
      if (r.ok) {
        setOportunidades(prev => prev.map(x => x.id === o.id ? { ...x, estado: 'archivada' } : x))
        setMensaje('Oportunidad archivada correctamente')
        setTimeout(() => setMensaje(''), 3000)
      }
    } catch (e) { console.error(e) }
  }

  const handleDescargarPliegos = async (o: any) => {
    try {
      setMensaje('Descargando pliegos...')
      const r = await api.descargarPliegos(o.id)
      if (r.ok) {
        setOportunidades(prev => prev.map(x => x.id === o.id ? { ...x, estado: x.estado === 'nueva' ? 'en_analisis' : x.estado, pliegos_descargados: true } : x))
        setMensaje(`✅ ${r.descargados || 0} documentos disponibles para análisis`)
      } else {
        setMensaje('⚠️ ' + (r.error || 'Sin documentos disponibles'))
      }
      setTimeout(() => setMensaje(''), 4000)
    } catch (e) { console.error(e) }
  }

  const handleRestaurar = async (o: any) => {
    try {
      const r = await api.restaurarOportunidad(o.id)
      if (r.ok) {
        setOportunidades(prev => prev.map(x => x.id === o.id ? { ...x, estado: r.estado_restaurado || 'nueva' } : x))
        setMensaje('Oportunidad restaurada — estado: ' + (r.estado_restaurado || 'nueva'))
        setTimeout(() => setMensaje(''), 3000)
      }
    } catch (e) { console.error(e) }
  }

  useEffect(() => { cargar() }, [])

  const activas    = oportunidades.filter(o => o.estado !== 'archivada')
  const archivadas = oportunidades.filter(o => o.estado === 'archivada')
  const base       = mostrarArchivadas ? archivadas : activas

  const filtradas = base.filter((o: any) => {
    const matchTexto = !busqueda ||
      (o.titulo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (o.organismo || '').toLowerCase().includes(busqueda.toLowerCase())
    const matchEstado = mostrarArchivadas || filtroEstado === 'todos' || o.estado === filtroEstado
    return matchTexto && matchEstado
  })

  const contadores: Record<string, number> = { todos: activas.length }
  activas.forEach((o: any) => { contadores[o.estado] = (contadores[o.estado] || 0) + 1 })

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Cabecera */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Oportunidades</h1>
          <p className="text-slate-500 mt-1">
            {activas.length} licitaciones en seguimiento
            {archivadas.length > 0 && <span className="text-slate-400"> · {archivadas.length} archivadas</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/oportunidades/nueva')}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
            <Plus size={15} /> Nueva manual
          </button>
          <button onClick={() => setConfirmBuscar(true)} disabled={buscandoPLACSP}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
            {buscandoPLACSP ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            {buscandoPLACSP ? 'Buscando...' : 'Buscar PLACSP'}
          </button>
        </div>
      </div>

      <ConfirmModal
        open={confirmBuscar}
        titulo="Buscar en PLACSP"
        mensaje="Se buscarán licitaciones activas en PLACSP. Las nuevas se añadirán automáticamente a la lista. ¿Continuar?"
        labelOk="Sí, buscar" labelCancel="Cancelar" cargando={buscandoPLACSP}
        onConfirm={() => { setConfirmBuscar(false); buscarPLACSP() }}
        onCancel={() => setConfirmBuscar(false)}
      />

      <ConfirmModal
        open={!!confirmArchivar}
        titulo="¿Archivar esta oportunidad?"
        mensaje={`"${confirmArchivar?.titulo}" se moverá al archivo. Podrás restaurarla en cualquier momento.`}
        labelOk="Sí, archivar"
        onConfirm={() => { handleArchivar(confirmArchivar); setConfirmArchivar(null) }}
        onCancel={() => setConfirmArchivar(null)}
      />

      <ConfirmModal
        open={!!confirmRestaurar}
        titulo="¿Restaurar esta oportunidad?"
        mensaje={`"${confirmRestaurar?.titulo}" volverá a su estado anterior y aparecerá en la lista activa.`}
        labelOk="Sí, restaurar"
        onConfirm={() => { handleRestaurar(confirmRestaurar); setConfirmRestaurar(null) }}
        onCancel={() => setConfirmRestaurar(null)}
      />

      {mensaje && (
        <div className={`p-3 rounded-xl text-sm mb-4 ${mensaje.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {mensaje}
        </div>
      )}

      {/* Toggle archivadas */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => { setMostrarArchivadas(!mostrarArchivadas); setFiltroEstado('todos') }}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${mostrarArchivadas ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
          <Archive size={13} />
          {mostrarArchivadas ? 'Ver activas' : `Archivadas (${archivadas.length})`}
        </button>
      </div>

      {/* Filtros — solo en vista activa */}
      {!mostrarArchivadas && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por título u organismo..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={15} className="text-slate-400" />
            {['todos', 'nueva', 'en_analisis', 'go', 'no_go', 'descartada'].map(estado => (
              <button key={estado} onClick={() => setFiltroEstado(estado)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  filtroEstado === estado ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}>
                {estado === 'todos' ? 'Todos' : ESTADO_BADGE[estado]?.label || estado}
                {contadores[estado] ? ` (${contadores[estado]})` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Búsqueda en archivadas */}
      {mostrarArchivadas && (
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar en archivadas..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
      )}

      {/* Lista */}
      {cargando ? (
        <SkeletonList count={4} />
      ) : filtradas.length === 0 ? (
        <div className="flex flex-col items-center py-20">
          {mostrarArchivadas
            ? <><Archive size={40} className="text-slate-300 mb-3" /><p className="text-slate-500 font-medium">No hay oportunidades archivadas</p></>
            : <><Search size={40} className="text-slate-300 mb-3" /><p className="text-slate-500 font-medium">{oportunidades.length === 0 ? 'No hay oportunidades todavía' : 'Sin resultados para este filtro'}</p><p className="text-sm text-slate-400 mt-1">Haz clic en "Buscar PLACSP" o añade una manualmente</p></>
          }
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map((lic: any, i: number) => {
            const dr = diasRestantes(lic.fecha_limite)
            const numDocs = lic.num_docs || 0
            const esArchivada = lic.estado === 'archivada'
            return (
              <div key={lic.id || i}
                className={`bg-white border rounded-2xl p-5 transition-all ${esArchivada ? 'border-slate-200 opacity-75' : 'border-slate-200 hover:shadow-md hover:border-slate-300 cursor-pointer group'}`}
                onClick={esArchivada ? undefined : () => navigate('/oportunidades/' + lic.id)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${ESTADO_BADGE[lic.estado]?.className || 'bg-gray-100 text-gray-700'}`}>
                        {ESTADO_BADGE[lic.estado]?.label || lic.estado}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">{lic.fuente}</span>
                      {numDocs > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                          <FileText size={10} />{numDocs} docs
                        </span>
                      )}
                    </div>
                    <h3 className={`text-sm font-semibold text-slate-900 line-clamp-2 ${!esArchivada ? 'group-hover:text-blue-600 transition-colors' : ''}`}>
                      {lic.titulo || 'Sin título'}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-slate-500"><Building2 size={12} /> {lic.organismo || '-'}</span>
                      {lic.fecha_limite && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Calendar size={12} /> {formatearFechaCorta(lic.fecha_limite)}
                          {dr && !esArchivada && <span className={`font-semibold ml-1 ${dr.color}`}>{dr.texto}</span>}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">
                        {lic.presupuesto && Number(lic.presupuesto) > 0 ? Number(lic.presupuesto).toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €' : '-'}
                      </p>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${
                          (lic.scoring || 0) >= 70 ? 'bg-emerald-50 text-emerald-600' :
                          (lic.scoring || 0) >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                        }`}>{lic.scoring || 0}</span>
                        {(lic.url_detalle || lic.url) && (
                          <a href={lic.url_detalle || lic.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                            <ExternalLink size={14} className="text-slate-400 hover:text-blue-500" />
                          </a>
                        )}
                      </div>
                    </div>
                    {/* Botón archivar / restaurar */}
                    {esArchivada ? (
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmRestaurar(lic) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                        title="Restaurar oportunidad">
                        <ArchiveRestore size={13} /> Restaurar
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => { e.stopPropagation(); handleDescargarPliegos(lic) }}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                          title="Descargar pliegos">
                          <FileDown size={12} /> Pliegos
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmArchivar(lic) }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                          title="Archivar oportunidad">
                          <Archive size={13} /> Archivar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-center text-xs text-slate-400 mt-6">
        {mostrarArchivadas ? `${filtradas.length} archivadas` : `${filtradas.length} de ${activas.length} oportunidades`}
      </p>
    </div>
  )
}



