import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import LotesPanel from '../components/LotesPanel'
import PipelineBar from '../components/PipelineBar'
import {
  ArrowLeft, Save, Upload, FileText, Building2, Euro, Calendar,
  Tag, ExternalLink, Loader2, CheckCircle2, AlertCircle,
  Download, Brain, AlertTriangle, Lightbulb, Award, Shield,
  Users, Scale, Target, XCircle, ChevronDown, ChevronUp,
  Clock, Wrench, Layers, BarChart3
} from 'lucide-react'

const ESTADOS = [
  { value: 'nueva', label: 'Nueva', className: 'bg-blue-100 text-blue-700' },
  { value: 'en_analisis', label: 'En análisis', className: 'bg-amber-100 text-amber-700' },
  { value: 'go', label: 'GO', className: 'bg-emerald-100 text-emerald-700' },
  { value: 'no_go', label: 'NO-GO', className: 'bg-red-100 text-red-700' },
  { value: 'descartada', label: 'Descartada', className: 'bg-gray-100 text-gray-700' },
  { value: 'adjudicada', label: 'Adjudicada', className: 'bg-purple-100 text-purple-700' },
]

const PROCEDIMIENTOS = ['Abierto', 'Abierto simplificado', 'Restringido', 'Negociado', 'Menor']

const CPVS_COMUNES = [
  { code: '90910000', label: 'Servicios de limpieza' },
  { code: '90911000', label: 'Limpieza viviendas, edificios y ventanas' },
  { code: '90911200', label: 'Limpieza de edificios' },
  { code: '90911300', label: 'Limpieza de ventanas' },
  { code: '90919000', label: 'Limpieza oficinas, escuelas y equipo' },
  { code: '90919200', label: 'Limpieza de oficinas' },
  { code: '90919300', label: 'Limpieza de escuelas' },
  { code: '90610000', label: 'Limpieza viaria' },
  { code: '90900000', label: 'Limpieza e higienización' },
  { code: '90921000', label: 'Desinfección e higienización' },
  { code: '90670000', label: 'Desinfección y desinsectación' },
  { code: '50000000', label: 'Reparación y mantenimiento' },
  { code: '50700000', label: 'Mantenimiento instalaciones edificios' },
  { code: '50710000', label: 'Mantenimiento eléctrico/mecánico' },
  { code: '50800000', label: 'Mantenimiento varios' },
  { code: '77310000', label: 'Zonas verdes' },
  { code: '77314000', label: 'Mantenimiento terrenos' },
  { code: '90500000', label: 'Eliminación residuos' },
  { code: '90510000', label: 'Tratamiento residuos' },
  { code: '90920000', label: 'Saneamiento' },
  { code: '92610000', label: 'Gestión instalaciones deportivas' },
  { code: '45310000', label: 'Trabajos instalación eléctrica' },
  { code: '45232150', label: 'Obras conducción agua' },
]

const PROC_CODES: Record<string, string> = {
  '1': 'Abierto', '2': 'Restringido', '3': 'Negociado',
  '9': 'Abierto simplificado', '100': 'Abierto simplificado',
  '6': 'Negociado sin publicidad', '4': 'Diálogo competitivo',
}

function formatearFecha(fecha: unknown): string {
  if (!fecha) return ''
  try {
    const str = String(fecha)
    if (str.includes('T')) {
      const d = new Date(str)
      if (!isNaN(d.getTime())) {
        return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
      }
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const p = str.split(' '); const f = p[0].split('-')
      return `${f[2]}/${f[1]}/${f[0]}${p[1] ? ' ' + p[1] : ''}`
    }
    return str
  } catch { return String(fecha) }
}

function calcularDiasRestantes(fecha: unknown): { dias: number, texto: string, color: string } | null {
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
    if (dias < 0) return { dias, texto: 'Vencida', color: 'text-red-600 bg-red-50' }
    if (dias === 0) return { dias, texto: '¡Hoy!', color: 'text-red-600 bg-red-50' }
    if (dias <= 7) return { dias, texto: `${dias} días`, color: 'text-red-600 bg-red-50' }
    if (dias <= 15) return { dias, texto: `${dias} días`, color: 'text-amber-600 bg-amber-50' }
    if (dias <= 30) return { dias, texto: `${dias} días`, color: 'text-blue-600 bg-blue-50' }
    return { dias, texto: `${dias} días`, color: 'text-slate-600 bg-slate-50' }
  } catch { return null }
}

function normalizarProcedimiento(proc: unknown): string {
  if (proc === null || proc === undefined || proc === '') return ''
  const p = String(proc).trim()
  if (PROC_CODES[p]) return PROC_CODES[p]
  const lower = p.toLowerCase()
  for (const opt of PROCEDIMIENTOS) { if (opt.toLowerCase() === lower) return opt }
  if (lower.includes('simplificado')) return 'Abierto simplificado'
  if (lower.includes('abierto')) return 'Abierto'
  if (lower.includes('negociado')) return 'Negociado'
  if (lower.includes('restringido')) return 'Restringido'
  if (lower.includes('menor')) return 'Menor'
  return p
}

function normalizarCPV(cpv: unknown): string {
  if (cpv === null || cpv === undefined || cpv === '') return ''
  const cpvStr = String(cpv).replace(/\.0$/, '').trim()
  if (!cpvStr || cpvStr === '0') return ''
  if (CPVS_COMUNES.some(c => c.code === cpvStr)) return cpvStr
  const prefix = cpvStr.substring(0, 5)
  const match = CPVS_COMUNES.find(c => c.code.startsWith(prefix))
  if (match) return match.code
  return cpvStr
}

function DataRow({ label, value }: { label: string, value: string | number | undefined }) {
  if (!value || value === 'No especificado') return null
  return (
    <div className="flex justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      <span className="text-sm text-slate-800 text-right max-w-[60%]">{String(value)}</span>
    </div>
  )
}

function Collapsible({ title, icon: Icon, children, defaultOpen = false }: {
  title: string, icon: any, children: React.ReactNode, defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-slate-200 rounded-xl mb-3 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">{title}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-slate-100 pt-3">{children}</div>}
    </div>
  )
}

export default function DetalleOportunidadPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const [analizando, setAnalizando] = useState(false)
  const [error, setError] = useState('')
  const [progreso, setProgreso] = useState('')
  const [archivosNuevos, setArchivosNuevos] = useState<File[]>([])
  const [numDocsDisponibles, setNumDocsDisponibles] = useState(0)
  const [docsDescargados, setDocsDescargados] = useState(0)
  const [cpvOriginal, setCpvOriginal] = useState('')
  const [analisis, setAnalisis] = useState<any>(null)
  const [sugerenciaIA, setSugerenciaIA] = useState('')
  const [lotes, setLotes] = useState<any[]>([])
  const [cargandoLotes, setCargandoLotes] = useState(false)

  const recargarLotes = async () => {
    if (!id) return
    setCargandoLotes(true)
    try {
      const data = await (api as any).obtenerLotes(id)
      setLotes(data.lotes || [])
    } catch (e) {}
    finally { setCargandoLotes(false) }
  }

  const [form, setForm] = useState({
    titulo: '', organismo: '', cpv: '', presupuesto: '',
    fecha_limite: '', procedimiento: '', url: '', estado: '',
    descripcion: '', notas: '', fuente: '', scoring: 0,
    id_externo: '', fecha_deteccion: '',
  })

  const recargarDatos = async () => {
    try {
      const data = await api.detalle(id || '')
      if (data.error) return
      const cpvRaw = String(data.cpv ?? '').replace(/\.0$/, '')
      setCpvOriginal(cpvRaw)
      setNumDocsDisponibles(data.num_docs_disponibles || 0)
      setDocsDescargados(data.docs_descargados || 0)
      setForm({
        titulo: String(data.titulo ?? ''),
        organismo: String(data.organismo ?? ''),
        cpv: normalizarCPV(data.cpv),
        presupuesto: String(data.presupuesto ?? ''),
        fecha_limite: String(data.fecha_limite ?? ''),
        procedimiento: normalizarProcedimiento(data.procedimiento),
        url: String(data.url ?? ''),
        estado: String(data.estado ?? 'nueva'),
        descripcion: String(data.descripcion ?? ''),
        notas: String(data.notas ?? ''),
        fuente: String(data.fuente ?? ''),
        scoring: Number(data.scoring) || 0,
        id_externo: String(data.id_externo ?? ''),
        fecha_deteccion: String(data.fecha_deteccion ?? ''),
      })
    } catch (e) {}
  }

  const recargarAnalisis = async () => {
    try {
      const data = await api.obtenerAnalisis(id || '')
      if (data.existe) {
        setAnalisis(data)
        const puntIA = data.analisis_completo?.puntuacion_interes?.valor ?? data.puntuacion_interes ?? 0
        if (puntIA < 30) setSugerenciaIA('La IA recomienda DESCARTAR esta oportunidad. No encaja con el perfil de la empresa.')
        else if (puntIA >= 70) setSugerenciaIA('La IA considera esta oportunidad MUY INTERESANTE. Pendiente de cálculo económico para decisión GO.')
        else setSugerenciaIA('La IA ve potencial pero con reservas. Revisa los riesgos antes de decidir.')
      }
    } catch (e) {}
  }

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      try {
        const data = await api.detalle(id || '')
        if (data.error) { setError('Oportunidad no encontrada'); setCargando(false); return }
        const cpvRaw = String(data.cpv ?? '').replace(/\.0$/, '')
        setCpvOriginal(cpvRaw)
        setNumDocsDisponibles(data.num_docs_disponibles || 0)
        setDocsDescargados(data.docs_descargados || 0)
        setForm({
          titulo: String(data.titulo ?? ''),
          organismo: String(data.organismo ?? ''),
          cpv: normalizarCPV(data.cpv),
          presupuesto: String(data.presupuesto ?? ''),
          fecha_limite: String(data.fecha_limite ?? ''),
          procedimiento: normalizarProcedimiento(data.procedimiento),
          url: String(data.url ?? ''),
          estado: String(data.estado ?? 'nueva'),
          descripcion: String(data.descripcion ?? ''),
          notas: String(data.notas ?? ''),
          fuente: String(data.fuente ?? ''),
          scoring: Number(data.scoring) || 0,
          id_externo: String(data.id_externo ?? ''),
          fecha_deteccion: String(data.fecha_deteccion ?? ''),
        })
        await recargarAnalisis()
        await recargarLotes()
      } catch (e) {
        setError('Error cargando la oportunidad')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [id])

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setGuardado(false); setError('')
  }

  const cambiarEstado = async (nuevoEstado: string) => {
    handleChange('estado', nuevoEstado)
    try { await api.actualizar(id || '', { estado: nuevoEstado }) } catch (e) {}
  }

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setArchivosNuevos(prev => [...prev, ...Array.from(e.target.files!)])
  }

  const removeFile = (index: number) => {
    setArchivosNuevos(prev => prev.filter((_, i) => i !== index))
  }

  // PASO 1: Descargar pliegos → auto cambia a en_analisis
  const handleDescargarPliegos = async () => {
    setDescargando(true); setError('')
    setProgreso('Descargando pliegos de PLACSP...')
    try {
      const result = await api.descargarPliegos(id || '')
      if (result.ok) {
        setDocsDescargados(result.descargados)
        // Auto cambiar estado a en_analisis
        if (form.estado === 'nueva') {
          await cambiarEstado('en_analisis')
          setProgreso(`${result.descargados} pliegos descargados. Estado actualizado a "En análisis".`)
        } else {
          setProgreso(`${result.descargados} pliegos descargados a Drive.`)
        }
        await recargarDatos()
        setTimeout(() => setProgreso(''), 4000)
      } else { setError(result.error || 'Error descargando pliegos') }
    } catch (e) { setError('Error descargando pliegos') }
    finally { setDescargando(false) }
  }

  // PASO 2: Analizar con IA → sugiere descartada si <30
  const handleAnalizarIA = async () => {
    setAnalizando(true); setError(''); setSugerenciaIA('')
    setProgreso('Analizando pliegos con Gemini 3.1 Pro... (1-2 minutos)')
    try {
      const result = await api.analizarPliegos(id || '')
      if (result.ok) {
        await recargarAnalisis()
        await recargarDatos()
        const puntIA = result.puntuacion_interes || 0

        // Auto-descartar si la IA dice que no es para nosotros
        if (puntIA < 30 && form.estado === 'en_analisis') {
          await cambiarEstado('descartada')
          setProgreso('')
        } else {
          setProgreso('')
        }
      } else { setError(result.error || 'Error en el análisis') }
    } catch (e) { setError('Error ejecutando análisis. Puede tardar hasta 2 minutos.') }
    finally { setAnalizando(false); setProgreso('') }
  }

  const handleGuardar = async () => {
    setGuardando(true); setError(''); setProgreso('Guardando cambios...')
    try {
      await api.actualizar(id || '', {
        titulo: form.titulo, organismo: form.organismo, cpv: form.cpv,
        presupuesto: form.presupuesto, fecha_limite: form.fecha_limite,
        procedimiento: form.procedimiento, url: form.url,
        estado: form.estado, descripcion: form.descripcion,
      })
      if (archivosNuevos.length > 0) {
        for (let i = 0; i < archivosNuevos.length; i++) {
          setProgreso(`Subiendo ${i+1}/${archivosNuevos.length}: ${archivosNuevos[i].name}`)
          try { await api.subirArchivo(archivosNuevos[i], id || '') } catch (e) { console.error(e) }
        }
        setArchivosNuevos([])
      }
      setProgreso(''); setGuardado(true); setTimeout(() => setGuardado(false), 3000)
    } catch (e) { setError('Error al guardar'); setProgreso('') }
    finally { setGuardando(false) }
  }

  const documentosExistentes = (form.notas || '').split('\n').filter((l: string) => l.startsWith('📎'))
  const diasRestantes = calcularDiasRestantes(form.fecha_limite)
  const cpvEnLista = CPVS_COMUNES.some(c => c.code === form.cpv)
  const ac = analisis?.analisis_completo || {}
  const puntIA = ac.puntuacion_interes?.valor ?? analisis?.puntuacion_interes ?? null

  // Siguiente acción recomendada
  let nextAction = ''
  let nextActionLabel = ''
  let NextActionIcon = Download
  if (form.estado === 'nueva' && numDocsDisponibles > 0) {
    nextAction = 'descargar'
    nextActionLabel = 'Siguiente paso: Descargar pliegos'
    NextActionIcon = Download
  } else if (docsDescargados > 0 && !analisis?.existe) {
    nextAction = 'analizar'
    nextActionLabel = 'Siguiente paso: Analizar con IA'
    NextActionIcon = Brain
  } else if (analisis?.existe && puntIA !== null && puntIA >= 30 && !['go','no_go','descartada'].includes(form.estado)) {
    nextAction = 'calculo'
    nextActionLabel = 'Siguiente paso: Cálculo económico'
    NextActionIcon = Euro
  }

  if (cargando) return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 size={32} className="text-blue-500 animate-spin mb-3" />
      <p className="text-slate-500">Cargando oportunidad...</p>
    </div>
  )

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Cabecera */}
      <div className="flex items-start gap-4 mb-4">
        <button onClick={() => navigate('/oportunidades')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors mt-1">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">Detalle de oportunidad</h1>
          <p className="text-xs font-mono text-slate-400 mt-0.5">{id}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {puntIA !== null && (
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
              puntIA >= 70 ? 'bg-emerald-100 text-emerald-700' : puntIA >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
            }`}><Brain size={12} /> IA: {puntIA}</div>
          )}
          <div className="text-right">
            <span className="text-xs text-slate-500">Score</span>
            <span className={`block text-lg font-bold ${form.scoring >= 70 ? 'text-emerald-600' : form.scoring >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {form.scoring}
            </span>
          </div>
        </div>
      </div>

      {/* ── PipelineBar de navegación ── */}
      <div className="mb-6 mt-2">
        <PipelineBar currentStep="oportunidad" idOverride={id} showNext={false} />
      </div>

      {/* Siguiente acción recomendada */}
      {nextAction && (
        <div className="mb-4">
          <button
            onClick={() => {
              if (nextAction === 'descargar') handleDescargarPliegos()
              else if (nextAction === 'analizar') handleAnalizarIA()
              else if (nextAction === 'calculo') navigate('/calculo?id=' + id)
            }}
            disabled={descargando || analizando}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all border-violet-300 bg-violet-50 hover:bg-violet-100 text-violet-700 cursor-pointer">
            {(descargando || analizando) ? <Loader2 size={20} className="animate-spin" /> : <NextActionIcon size={20} />}
            <div className="text-left flex-1">
              <p className="text-sm font-semibold">
                {descargando ? 'Descargando pliegos...' : analizando ? 'Analizando con IA... (1-2 min)' : nextActionLabel}
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Sugerencia IA */}
      {sugerenciaIA && (
        <div className={`flex items-start gap-3 p-4 rounded-xl mb-4 ${
          puntIA !== null && puntIA < 30 ? 'bg-red-50 border border-red-200' :
          puntIA !== null && puntIA >= 70 ? 'bg-emerald-50 border border-emerald-200' :
          'bg-amber-50 border border-amber-200'
        }`}>
          <Brain size={18} className={puntIA !== null && puntIA < 30 ? 'text-red-600' : puntIA !== null && puntIA >= 70 ? 'text-emerald-600' : 'text-amber-600'} />
          <p className="text-sm text-slate-700">{sugerenciaIA}</p>
        </div>
      )}

      {/* Estado */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Estado de la oportunidad</label>
        <div className="flex gap-2 flex-wrap">
          {ESTADOS.map(est => (
            <button key={est.value} onClick={() => handleChange('estado', est.value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                form.estado === est.value ? est.className + ' ring-2 ring-offset-1 ring-slate-400' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}>{est.label}</button>
          ))}
        </div>
      </div>

      {/* Datos principales */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Datos principales</h2>
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-medium">{form.fuente}</span>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Título</label>
            <div className="relative">
              <FileText size={16} className="absolute left-3 top-3 text-slate-400" />
              <textarea value={form.titulo} onChange={e => handleChange('titulo', e.target.value)} rows={3}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 resize-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Organismo</label>
            <div className="relative">
              <Building2 size={16} className="absolute left-3 top-3 text-slate-400" />
              <input type="text" value={form.organismo} onChange={e => handleChange('organismo', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Presupuesto (€)</label>
              <div className="relative">
                <Euro size={16} className="absolute left-3 top-3 text-slate-400" />
                <input type="number" value={form.presupuesto} onChange={e => handleChange('presupuesto', e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
              </div>
              {form.presupuesto && Number(form.presupuesto) > 0 && (
                <p className="text-xs text-slate-400 mt-1">{Number(form.presupuesto).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Fecha límite</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                <div className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 min-h-[42px] flex items-center">
                  {formatearFecha(form.fecha_limite) || <span className="text-slate-400">Sin fecha</span>}
                </div>
              </div>
              {diasRestantes && (
                <div className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-lg text-xs font-semibold ${diasRestantes.color}`}>
                  <Calendar size={12} />{diasRestantes.texto}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">CPV</label>
              <div className="relative">
                <Tag size={16} className="absolute left-3 top-3 text-slate-400" />
                <select value={cpvEnLista ? form.cpv : '_otro_'} onChange={e => { if (e.target.value !== '_otro_') handleChange('cpv', e.target.value) }}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 appearance-none">
                  <option value="">Seleccionar CPV</option>
                  {CPVS_COMUNES.map(c => (<option key={c.code} value={c.code}>{c.code} — {c.label}</option>))}
                  {!cpvEnLista && cpvOriginal && (<option value="_otro_">{cpvOriginal} — Otro CPV</option>)}
                </select>
              </div>
              {cpvOriginal && !cpvEnLista && <p className="text-xs text-amber-600 mt-1">CPV original: {cpvOriginal}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Procedimiento</label>
              <div className="flex gap-2 flex-wrap">
                {PROCEDIMIENTOS.map(proc => (
                  <button key={proc} onClick={() => handleChange('procedimiento', proc)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      form.procedimiento === proc ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}>{proc}</button>
                ))}
              </div>
            </div>
          </div>
          {form.url && (
            <div className="flex items-center gap-2">
              <ExternalLink size={14} className="text-slate-400 shrink-0" />
              <a href={form.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">{form.url}</a>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Descripción</label>
            <textarea value={form.descripcion} onChange={e => handleChange('descripcion', e.target.value)}
              rows={2} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 resize-none" />
          </div>
        </div>
      </div>

      {/* Documentos */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">Documentos</h2>
          {numDocsDisponibles > 0 && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">{numDocsDisponibles} en PLACSP</span>}
        </div>

        {documentosExistentes.length > 0 && (
          <div className="space-y-2 mb-4">
            {documentosExistentes.map((doc: string, i: number) => {
              const parts = doc.replace('📎 ', '').split(': ')
              const nombre = parts[0] || 'Documento'
              const url = parts.slice(1).join(': ') || ''
              return (
                <div key={i} className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={16} className="text-emerald-600 shrink-0" />
                    <span className="text-sm text-slate-700 truncate">{nombre}</span>
                    <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                  </div>
                  {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline font-medium shrink-0 ml-2">Abrir</a>}
                </div>
              )
            })}
          </div>
        )}

        <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer">
          <Upload size={18} className="text-slate-400 mb-1" />
          <span className="text-xs text-slate-600 font-medium">Añadir documentos manualmente</span>
          <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={handleFiles} className="hidden" />
        </label>

        {archivosNuevos.length > 0 && (
          <div className="mt-3 space-y-2">
            {archivosNuevos.map((file, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-blue-600" />
                  <span className="text-sm text-slate-700">{file.name}</span>
                  <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(0)} KB)</span>
                </div>
                <button onClick={() => removeFile(i)} className="text-xs text-red-500 hover:text-red-700 font-medium">Eliminar</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ LOTES ═══ */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4">
        <LotesPanel
          oportunidadId={id || ''}
          lotes={lotes}
          cargando={cargandoLotes}
          onRecargar={recargarLotes}
          modo="detalle"
        />
      </div>

      {/* ═══ ANÁLISIS IA ═══ */}
      {analisis?.existe && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-violet-100 rounded-xl"><Brain size={18} className="text-violet-600" /></div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-slate-900">Análisis IA — Gemini 3.1 Pro</h2>
              <p className="text-xs text-slate-400">{analisis.fecha_analisis ? new Date(analisis.fecha_analisis).toLocaleString('es-ES') : ''}</p>
            </div>
            {puntIA !== null && (
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold ring-1 ${
                puntIA >= 70 ? 'bg-emerald-100 text-emerald-700 ring-emerald-300' :
                puntIA >= 40 ? 'bg-amber-100 text-amber-700 ring-amber-300' :
                'bg-red-100 text-red-700 ring-red-300'
              }`}><Target size={14} />{puntIA}/100</div>
            )}
          </div>

          {ac.puntuacion_interes && (
            <div className={`rounded-xl p-4 mb-4 ${
              ac.puntuacion_interes.valor >= 70 ? 'bg-emerald-50 border border-emerald-200' :
              ac.puntuacion_interes.valor >= 40 ? 'bg-amber-50 border border-amber-200' :
              'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {ac.puntuacion_interes.valor >= 70 ? <CheckCircle2 size={16} className="text-emerald-600" /> :
                 ac.puntuacion_interes.valor >= 40 ? <AlertTriangle size={16} className="text-amber-600" /> :
                 <XCircle size={16} className="text-red-600" />}
                <span className="text-sm font-bold">
                  {ac.puntuacion_interes.valor >= 70 ? 'RECOMENDADA' : ac.puntuacion_interes.valor >= 40 ? 'EVALUAR' : 'NO RECOMENDADA'}
                </span>
              </div>
              <p className="text-sm text-slate-700">{ac.puntuacion_interes.justificacion}</p>
            </div>
          )}

          {analisis.resumen && <p className="text-sm text-slate-700 leading-relaxed mb-4 p-3 bg-slate-50 rounded-xl">{analisis.resumen}</p>}

          {ac.criterios_adjudicacion && ac.criterios_adjudicacion.length > 0 && (
            <Collapsible title={`Criterios de adjudicación (${ac.criterios_adjudicacion.length})`} icon={Award} defaultOpen={true}>
              <div className="space-y-2">
                {ac.criterios_adjudicacion.map((c: any, i: number) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-800">{c.criterio}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${c.tipo === 'Automático' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{c.tipo}</span>
                        <span className="text-sm font-bold">{c.puntuacion_maxima} pts</span>
                      </div>
                    </div>
                    {c.descripcion && <p className="text-xs text-slate-500">{c.descripcion}</p>}
                  </div>
                ))}
              </div>
            </Collapsible>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            {ac.riesgos_detectados && ac.riesgos_detectados.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2"><AlertTriangle size={16} className="text-red-600" /><span className="text-xs font-bold text-red-800">Riesgos</span></div>
                {ac.riesgos_detectados.map((r: any, i: number) => (
                  <div key={i} className="mb-1.5">
                    {typeof r === 'string' ? (
                      <p className="text-xs text-red-700">• {r}</p>
                    ) : (
                      <div className="flex items-start gap-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                          r.gravedad === 'alta' ? 'bg-red-200 text-red-800' :
                          r.gravedad === 'media' ? 'bg-amber-200 text-amber-800' :
                          'bg-slate-200 text-slate-700'
                        }`}>{(r.gravedad || 'media').toUpperCase()}</span>
                        <div>
                          <p className="text-xs text-red-700 font-medium">{r.riesgo}</p>
                          {r.mitigacion && <p className="text-[10px] text-slate-500 mt-0.5">{r.mitigacion}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {ac.oportunidades_detectadas && ac.oportunidades_detectadas.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2"><Lightbulb size={16} className="text-emerald-600" /><span className="text-xs font-bold text-emerald-800">Oportunidades</span></div>
                {ac.oportunidades_detectadas.map((o: any, i: number) => (
                  <div key={i} className="mb-1.5">
                    {typeof o === 'string' ? (
                      <p className="text-xs text-emerald-700">• {o}</p>
                    ) : (
                      <div className="flex items-start gap-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                          o.impacto === 'alto' ? 'bg-emerald-200 text-emerald-800' :
                          o.impacto === 'medio' ? 'bg-blue-200 text-blue-800' :
                          'bg-slate-200 text-slate-700'
                        }`}>{(o.impacto || 'medio').toUpperCase()}</span>
                        <p className="text-xs text-emerald-700">{o.oportunidad}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Collapsible title="Datos del contrato" icon={FileText}>
            <DataRow label="Tipo" value={ac.datos_basicos?.tipo_contrato} />
            <DataRow label="Presupuesto sin IVA" value={ac.datos_basicos?.presupuesto_base_sin_iva ? Number(ac.datos_basicos.presupuesto_base_sin_iva).toLocaleString('es-ES') + ' €' : undefined} />
            <DataRow label="Presupuesto con IVA" value={ac.datos_basicos?.presupuesto_base_con_iva ? Number(ac.datos_basicos.presupuesto_base_con_iva).toLocaleString('es-ES') + ' €' : undefined} />
            <DataRow label="Valor estimado" value={ac.datos_basicos?.valor_estimado ? Number(ac.datos_basicos.valor_estimado).toLocaleString('es-ES') + ' €' : undefined} />
            <DataRow label="Duración" value={ac.datos_basicos?.duracion_contrato} />
            <DataRow label="Lotes" value={ac.datos_basicos?.num_lotes ? `${ac.datos_basicos.num_lotes} lotes — ${ac.datos_basicos.lotes_descripcion || ''}` : ac.datos_basicos?.lotes} />
            <DataRow label="Prórrogas" value={ac.datos_basicos?.prorrogas} />
            <DataRow label="Revisión precios" value={ac.datos_basicos?.revision_precios} />
          </Collapsible>

          {/* Estructura económica — nueva sección v2 */}
          {ac.estructura_economica && (ac.estructura_economica.precio_hora_maximo > 0 || ac.estructura_economica.convenio_referencia) && (
            <Collapsible title="Estructura económica del pliego" icon={BarChart3} defaultOpen={true}>
              <DataRow label="Precio/hora máximo" value={ac.estructura_economica.precio_hora_maximo ? ac.estructura_economica.precio_hora_maximo + ' €/h' : undefined} />
              <DataRow label="% Coste personal" value={ac.estructura_economica.pct_coste_personal ? ac.estructura_economica.pct_coste_personal + '%' : undefined} />
              <DataRow label="% Materiales" value={ac.estructura_economica.pct_materiales ? ac.estructura_economica.pct_materiales + '%' : undefined} />
              <DataRow label="% Indirectos" value={ac.estructura_economica.pct_costes_indirectos ? ac.estructura_economica.pct_costes_indirectos + '%' : undefined} />
              <DataRow label="% Beneficio industrial" value={ac.estructura_economica.pct_beneficio ? ac.estructura_economica.pct_beneficio + '%' : undefined} />
              <DataRow label="Convenio referencia" value={ac.estructura_economica.convenio_referencia} />
              <DataRow label="Forma de pago" value={ac.estructura_economica.forma_pago} />
            </Collapsible>
          )}

          {/* Servicios requeridos — nueva sección v2 */}
          {ac.servicios_requeridos && (ac.servicios_requeridos.total_horas_contrato > 0 || ac.servicios_requeridos.centros_o_zonas?.length > 0) && (
            <Collapsible title={`Servicios requeridos${ac.servicios_requeridos.total_horas_contrato > 0 ? ` — ${ac.servicios_requeridos.total_horas_contrato.toLocaleString('es-ES')}h` : ''}`} icon={Wrench} defaultOpen={true}>
              <DataRow label="Total horas contrato" value={ac.servicios_requeridos.total_horas_contrato ? ac.servicios_requeridos.total_horas_contrato.toLocaleString('es-ES') + ' h' : undefined} />
              <DataRow label="Bolsa emergencia" value={ac.servicios_requeridos.bolsa_horas_emergencia ? ac.servicios_requeridos.bolsa_horas_emergencia.toLocaleString('es-ES') + ' h' : undefined} />
              <DataRow label="Superficie total" value={ac.servicios_requeridos.total_superficie_m2 ? ac.servicios_requeridos.total_superficie_m2.toLocaleString('es-ES') + ' m²' : undefined} />
              <DataRow label="Materiales empresa" value={(ac.servicios_requeridos.materiales_cargo_empresa || []).join(', ')} />
              {/* Tabla de centros */}
              {ac.servicios_requeridos.centros_o_zonas?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Centros / zonas ({ac.servicios_requeridos.centros_o_zonas.length})</p>
                  <div className="space-y-2">
                    {ac.servicios_requeridos.centros_o_zonas.map((c: any, i: number) => (
                      <div key={i} className="p-2.5 bg-slate-50 rounded-lg">
                        <p className="text-xs font-bold text-slate-800">{c.nombre}</p>
                        <div className="flex flex-wrap gap-3 mt-1">
                          {c.dias_servicio && <span className="text-[10px] text-slate-500">📅 {c.dias_servicio}</span>}
                          {(c.horario_inicio || c.horario_fin) && <span className="text-[10px] text-slate-500">🕐 {c.horario_inicio}–{c.horario_fin}</span>}
                          {c.horas_anuales > 0 && <span className="text-[10px] text-slate-500">⏱ {c.horas_anuales.toLocaleString('es-ES')}h/año</span>}
                          {c.superficie_m2 > 0 && <span className="text-[10px] text-slate-500">📐 {c.superficie_m2.toLocaleString('es-ES')} m²</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Tareas principales */}
              {ac.servicios_requeridos.tareas_principales?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Tareas principales</p>
                  <div className="space-y-1.5">
                    {ac.servicios_requeridos.tareas_principales.map((t: any, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold shrink-0 mt-0.5">{t.frecuencia}</span>
                        <p className="text-xs text-slate-700">{t.tarea}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Collapsible>
          )}

          {/* Medios mínimos — nueva sección v2 */}
          {ac.medios_minimos_requeridos && (ac.medios_minimos_requeridos.personal?.length > 0 || ac.medios_minimos_requeridos.maquinaria?.length > 0) && (
            <Collapsible title="Medios mínimos requeridos" icon={Users} defaultOpen={false}>
              {ac.medios_minimos_requeridos.personal?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Personal mínimo</p>
                  {ac.medios_minimos_requeridos.personal.map((p: any, i: number) => (
                    <div key={i} className="flex justify-between py-1.5 border-b border-slate-50 last:border-0">
                      <span className="text-xs text-slate-700">{p.categoria}</span>
                      <span className="text-xs font-bold text-slate-900">{p.num_minimo} · {p.jornada_horas_semana}h/sem</span>
                    </div>
                  ))}
                </div>
              )}
              {ac.medios_minimos_requeridos.maquinaria?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Maquinaria</p>
                  {ac.medios_minimos_requeridos.maquinaria.map((m: any, i: number) => (
                    <div key={i} className="flex justify-between py-1.5 border-b border-slate-50 last:border-0">
                      <span className="text-xs text-slate-700">{m.tipo}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{m.unidades} ud</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${m.disponibilidad === '100%' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{m.disponibilidad}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {ac.medios_minimos_requeridos.vehiculos?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2">Vehículos</p>
                  {ac.medios_minimos_requeridos.vehiculos.map((v: any, i: number) => (
                    <div key={i} className="flex justify-between py-1.5 border-b border-slate-50 last:border-0">
                      <span className="text-xs text-slate-700">{v.tipo}</span>
                      <span className="text-xs font-bold text-slate-900">{v.unidades} ud</span>
                    </div>
                  ))}
                </div>
              )}
              {ac.medios_minimos_requeridos.seguro_responsabilidad_minimo > 0 && (
                <DataRow label="Seguro RC mínimo" value={Number(ac.medios_minimos_requeridos.seguro_responsabilidad_minimo).toLocaleString('es-ES') + ' €'} />
              )}
            </Collapsible>
          )}

          {/* Dimensionamiento estimado — nueva sección v2 */}
          {ac.dimensionamiento_estimado && ac.dimensionamiento_estimado.total_personas > 0 && (
            <Collapsible title="Dimensionamiento estimado" icon={Clock} defaultOpen={true}>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-slate-900">{ac.dimensionamiento_estimado.operarios_estimados || 0}</p>
                  <p className="text-[10px] text-slate-500">Operarios</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-slate-900">{ac.dimensionamiento_estimado.encargados_estimados || 0}</p>
                  <p className="text-[10px] text-slate-500">Encargados</p>
                </div>
                <div className="bg-[#1a3c34] rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-white">{ac.dimensionamiento_estimado.total_personas}</p>
                  <p className="text-[10px] text-white/70">Total personas</p>
                </div>
              </div>
              <DataRow label="Jornada tipo" value={ac.dimensionamiento_estimado.jornada_tipo} />
              <DataRow label="Turnos" value={ac.dimensionamiento_estimado.turnos} />
              {ac.dimensionamiento_estimado.notas_dimensionamiento && (
                <div className="mt-2 p-3 bg-amber-50 rounded-lg">
                  <p className="text-xs text-amber-800">{ac.dimensionamiento_estimado.notas_dimensionamiento}</p>
                </div>
              )}
            </Collapsible>
          )}

          <Collapsible title="Solvencia y clasificación" icon={Shield}>
            <DataRow label="Volumen negocios" value={ac.solvencia_economica?.volumen_anual_negocios} />
            <DataRow label="Importe mínimo" value={ac.solvencia_economica?.importe_minimo ? Number(ac.solvencia_economica.importe_minimo).toLocaleString('es-ES') + ' €' : undefined} />
            <DataRow label="Seguro RC" value={ac.solvencia_economica?.seguro_responsabilidad ? Number(ac.solvencia_economica.seguro_responsabilidad).toLocaleString('es-ES') + ' €' : undefined} />
            <DataRow label="Trabajos similares" value={ac.solvencia_tecnica?.trabajos_similares} />
            <DataRow label="Certificaciones" value={Array.isArray(ac.solvencia_tecnica?.certificaciones) ? ac.solvencia_tecnica.certificaciones.join(', ') : ac.solvencia_tecnica?.certificaciones} />
            <DataRow label="Clasificación" value={ac.clasificacion_empresarial?.requerida === 'Sí' ? `Sí — ${ac.clasificacion_empresarial.grupo}` : ac.clasificacion_empresarial?.requerida} />
          </Collapsible>

          <Collapsible title="Personal y subrogación" icon={Users}>
            <DataRow label="Subrogación" value={ac.personal_subrogacion?.aplica || ac.personal_requerido?.subrogacion} />
            <DataRow label="Nº trabajadores" value={ac.personal_subrogacion?.num_trabajadores} />
            <DataRow label="Convenio" value={ac.personal_subrogacion?.convenio_aplicable || ac.personal_requerido?.convenio_aplicable} />
            <DataRow label="Empresa saliente" value={ac.personal_subrogacion?.empresa_saliente} />
            <DataRow label="Categorías" value={ac.personal_subrogacion?.categorias_resumen || ac.personal_requerido?.categorias_profesionales} />
          </Collapsible>

          <Collapsible title="Garantías y penalizaciones" icon={Scale}>
            <DataRow label="Garantía definitiva" value={ac.garantias?.definitiva_pct ? ac.garantias.definitiva_pct + '%' : ac.garantias?.definitiva} />
            <DataRow label="Penalización incumplimiento" value={ac.penalizaciones?.por_incumplimiento} />
            <DataRow label="Penalización retraso" value={ac.penalizaciones?.por_retraso} />
          </Collapsible>

          <button onClick={() => navigate('/analisis?id=' + id)}
            className="text-sm text-violet-600 hover:text-violet-800 font-medium mt-2">
            → Ver análisis completo en página dedicada
          </button>
        </div>
      )}

      {/* Mensajes */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm mb-4">
          <AlertCircle size={16} className="shrink-0" />{error}
        </div>
      )}
      {progreso && !guardado && (
        <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-sm mb-4">
          <Loader2 size={16} className="shrink-0 animate-spin" />{progreso}
        </div>
      )}
      {guardado && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm mb-4">
          <CheckCircle2 size={16} className="shrink-0" />Cambios guardados correctamente
        </div>
      )}

      {/* Botones */}
      <div className="flex justify-between">
        <button onClick={() => navigate('/oportunidades')}
          className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
          Volver
        </button>
        <button onClick={handleGuardar} disabled={guardando}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
          {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}