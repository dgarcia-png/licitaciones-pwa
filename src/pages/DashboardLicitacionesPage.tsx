import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import {
  Search, Brain, CheckCircle2, XCircle, TrendingUp, Star,
  RefreshCw, Wifi, WifiOff, Loader2, ArrowRight, Trophy,
  Euro, Database, FileText, BarChart3, Zap, Target
} from 'lucide-react'

function fmt(n: number) { return n.toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €' }

const ESTADO_BADGE: Record<string, { label: string; className: string }> = {
  nueva:       { label: 'Nueva',       className: 'bg-blue-100 text-blue-700' },
  en_analisis: { label: 'En análisis', className: 'bg-amber-100 text-amber-700' },
  go:          { label: 'GO',          className: 'bg-emerald-100 text-emerald-700' },
  no_go:       { label: 'NO-GO',       className: 'bg-red-100 text-red-700' },
  presentada:  { label: 'Presentada',  className: 'bg-blue-100 text-blue-800' },
  descartada:  { label: 'Descartada',  className: 'bg-gray-100 text-gray-700' },
  adjudicada:  { label: 'Adjudicada',  className: 'bg-violet-100 text-violet-700' },
  perdida:     { label: 'Perdida',     className: 'bg-rose-100 text-rose-700' },
  go_aprobado: { label: 'GO Aprobado', className: 'bg-violet-100 text-violet-700' },
  archivada:   { label: 'Archivada',   className: 'bg-slate-100 text-slate-500' },
}

// Skeleton loading
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />
}

export default function DashboardLicitacionesPage() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [conectado, setConectado] = useState(false)

  const cargarDatos = async () => {
    setCargando(true)
    try {
      const d = await api.dashboard()
      setData(d); setConectado(true)
    } catch (e) { console.error(e); setConectado(false) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargarDatos() }, [])

  const pipeline = data?.pipeline || {}
  const stats = data?.stats || {}
  const oportunidades = data?.oportunidades || []
  const contratos = data?.contratos || {}
  const conocimiento = data?.conocimiento || {}
  const activas = oportunidades.filter((o: any) => !['descartada', 'perdida'].includes(o.estado))

  // Pipeline stages
  const pipelineStages = [
    { key: 'nueva',       label: 'Nuevas',      count: pipeline.nueva || 0,       color: 'bg-blue-500',    lightColor: 'bg-blue-50 border-blue-200 text-blue-700' },
    { key: 'en_analisis', label: 'Análisis',    count: pipeline.en_analisis || 0, color: 'bg-amber-500',   lightColor: 'bg-amber-50 border-amber-200 text-amber-700' },
    { key: 'go',          label: 'GO',          count: pipeline.go || 0,          color: 'bg-emerald-500', lightColor: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    { key: 'presentada',  label: 'Presentadas', count: pipeline.presentada || 0,  color: 'bg-blue-600',    lightColor: 'bg-blue-100 border-blue-300 text-blue-800' },
    { key: 'adjudicada',  label: 'Adjudicadas', count: pipeline.adjudicada || 0,  color: 'bg-violet-500',  lightColor: 'bg-violet-50 border-violet-200 text-violet-700' },
  ]
  const totalPipeline = pipelineStages.reduce((s, p) => s + p.count, 0)

  const hora = new Date().getHours()
  const saludo = hora < 14 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm text-slate-500 mb-1">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="text-2xl font-bold text-slate-900">{saludo}, {usuario?.nombre.split(' ')[0]}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${conectado ? 'bg-emerald-50 text-emerald-700' : cargando ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
            {conectado ? <Wifi size={12} /> : <WifiOff size={12} />}
            {conectado ? 'Conectado' : cargando ? 'Cargando...' : 'Sin conexión'}
          </div>
          <button onClick={cargarDatos} disabled={cargando}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Pipeline visual */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Pipeline de licitaciones</h2>
          <span className="text-xs text-slate-400">{totalPipeline} activas | {pipeline.no_go || 0} NO-GO | {pipeline.descartada || 0} descartadas</span>
        </div>

        {cargando ? (
          <div className="flex gap-3"><Skeleton className="h-20 flex-1" /><Skeleton className="h-20 flex-1" /><Skeleton className="h-20 flex-1" /><Skeleton className="h-20 flex-1" /></div>
        ) : (
          <>
            {/* Pipeline bar */}
            <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 mb-4">
              {pipelineStages.map(stage => {
                const pct = totalPipeline > 0 ? (stage.count / totalPipeline * 100) : 0
                if (pct === 0) return null
                return <div key={stage.key} className={`${stage.color} transition-all`} style={{ width: `${pct}%` }} />
              })}
            </div>

            {/* Stage cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {pipelineStages.map(stage => (
                <div key={stage.key} className={`border rounded-xl p-4 ${stage.lightColor}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{stage.label}</span>
                    <ArrowRight size={12} className="opacity-30" />
                  </div>
                  <p className="text-3xl font-black mt-1">{stage.count}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* KPIs row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {cargando ? (
          <><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></>
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><Euro size={16} className="text-blue-500" /><span className="text-[10px] text-slate-400 uppercase">Valor pipeline GO</span></div>
              <p className="text-lg font-bold text-slate-900">{data?.valor_pipeline_go ? fmt(data.valor_pipeline_go) : '0 €'}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><Trophy size={16} className="text-emerald-500" /><span className="text-[10px] text-slate-400 uppercase">Tasa éxito</span></div>
              <p className="text-lg font-bold text-slate-900">{contratos.tasa_exito || 0}%</p>
              <p className="text-[10px] text-slate-400">{contratos.ganadas || 0} de {contratos.total_presentadas || 0}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><Database size={16} className="text-purple-500" /><span className="text-[10px] text-slate-400 uppercase">Base conocimiento</span></div>
              <p className="text-lg font-bold text-slate-900">{conocimiento.total_documentos || 0} docs</p>
              <p className="text-[10px] text-slate-400">{conocimiento.total_chunks_indexados || 0} chunks</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><Zap size={16} className="text-amber-500" /><span className="text-[10px] text-slate-400 uppercase">RAG</span></div>
              <p className={`text-lg font-bold ${conocimiento.listo_para_rag ? 'text-emerald-600' : 'text-slate-400'}`}>
                {conocimiento.listo_para_rag ? 'Activo' : 'Sin datos'}
              </p>
              <p className="text-[10px] text-slate-400">IA con contexto empresa</p>
            </div>
          </>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <button onClick={() => navigate('/oportunidades')} className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors">
          <Search size={18} className="text-blue-600" />
          <div className="text-left"><p className="text-sm font-semibold text-blue-900">Oportunidades</p><p className="text-[10px] text-blue-600">{stats.total || 0} en seguimiento</p></div>
        </button>
        <button onClick={() => api.buscar().then(() => cargarDatos())} className="flex items-center gap-3 p-4 bg-violet-50 border border-violet-200 rounded-xl hover:bg-violet-100 transition-colors">
          <RefreshCw size={18} className="text-violet-600" />
          <div className="text-left"><p className="text-sm font-semibold text-violet-900">Buscar PLACSP</p><p className="text-[10px] text-violet-600">Nuevas oportunidades</p></div>
        </button>
        <button onClick={() => navigate('/conocimiento')} className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors">
          <Database size={18} className="text-purple-600" />
          <div className="text-left"><p className="text-sm font-semibold text-purple-900">Base conocimiento</p><p className="text-[10px] text-purple-600">Subir documentos</p></div>
        </button>
        <button onClick={() => navigate('/seguimiento')} className="flex items-center gap-3 p-4 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 transition-colors">
          <BarChart3 size={18} className="text-teal-600" />
          <div className="text-left"><p className="text-sm font-semibold text-teal-900">Seguimiento</p><p className="text-[10px] text-teal-600">{contratos.ganadas || 0} contratos</p></div>
        </button>
      </div>

      {/* Tabla oportunidades */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Oportunidades activas</h2>
            <p className="text-xs text-slate-500 mt-0.5">{activas.length} oportunidades (sin descartadas)</p>
          </div>
          {conectado && <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium text-emerald-600 bg-emerald-50"><TrendingUp size={12} /> En vivo</span>}
        </div>

        {cargando ? (
          <div className="p-6 space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
        ) : activas.length === 0 ? (
          <div className="p-12 text-center">
            <Search size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No hay oportunidades</p>
            <p className="text-sm text-slate-400 mt-1">Busca en PLACSP o añade manualmente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Licitación</th>
                  <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Organismo</th>
                  <th className="text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Presupuesto</th>
                  <th className="text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Score</th>
                  <th className="text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activas.slice(0, 10).map((lic: any, i: number) => (
                  <tr key={i} onClick={() => navigate('/oportunidades/' + lic.id)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900 line-clamp-1">{lic.titulo || 'Sin título'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{lic.fuente}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600 max-w-[200px] truncate">{lic.organismo || '-'}</td>
                    <td className="px-4 py-4 text-right text-sm font-semibold text-slate-900">
                      {lic.presupuesto && Number(lic.presupuesto) > 0 ? fmt(Number(lic.presupuesto)) : '-'}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${
                        (lic.scoring || 0) >= 70 ? 'bg-emerald-50 text-emerald-600' :
                        (lic.scoring || 0) >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                      }`}>{lic.scoring || 0}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        ESTADO_BADGE[lic.estado]?.className || 'bg-gray-100 text-gray-700'
                      }`}>{ESTADO_BADGE[lic.estado]?.label || lic.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
