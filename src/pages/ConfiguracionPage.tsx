import { useState, useEffect } from 'react'
import { api } from '../services/api'
import {
  Settings, Upload, Trash2, Loader2, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp, BookOpen, Euro, ExternalLink, Plus, Save, X,
  ToggleLeft, ToggleRight, Filter, MapPin, Tag, Hash, Globe,
  Building2, Users, Map, AlertTriangle, Star, TrendingUp, List
} from 'lucide-react'

const TIPOS_CONFIG: Record<string, { label: string; icon: any; color: string; placeholder: string }> = {
  CPV:                  { label: 'Códigos CPV',         icon: Hash,   color: 'bg-blue-100 text-blue-700',      placeholder: 'Ej: 90910000' },
  NUTS:                 { label: 'Códigos NUTS',        icon: Globe,  color: 'bg-purple-100 text-purple-700',   placeholder: 'Ej: ES618' },
  UBICACION:            { label: 'Ubicaciones',          icon: MapPin, color: 'bg-green-100 text-green-700',    placeholder: 'Ej: Sevilla' },
  PALABRA_CLAVE:        { label: 'Palabras clave',       icon: Tag,    color: 'bg-amber-100 text-amber-700',    placeholder: 'Ej: limpieza' },
  FUENTE:               { label: 'Fuentes',              icon: Globe,  color: 'bg-cyan-100 text-cyan-700',      placeholder: 'Ej: PLACSP' },
  PRESUPUESTO_MIN:      { label: 'Presupuesto mínimo',   icon: Euro,   color: 'bg-slate-100 text-slate-700',   placeholder: '30000' },
  PRESUPUESTO_MAX:      { label: 'Presupuesto máximo',   icon: Euro,   color: 'bg-slate-100 text-slate-700',   placeholder: '15000000' },
  PRESUPUESTO_IDEAL_MIN:{ label: 'Ideal mínimo',         icon: Euro,   color: 'bg-slate-100 text-slate-700',   placeholder: '200000' },
  PRESUPUESTO_IDEAL_MAX:{ label: 'Ideal máximo',         icon: Euro,   color: 'bg-slate-100 text-slate-700',   placeholder: '3000000' },
  UBICACION_BONUS:      { label: 'NUTS bonus (Sevilla)', icon: MapPin, color: 'bg-emerald-100 text-emerald-700', placeholder: 'ES618' },
  SCORING_CPV_EXACTO:   { label: 'Score CPV exacto',     icon: Hash,   color: 'bg-slate-100 text-slate-700',   placeholder: '30' },
  SCORING_CPV_PARCIAL:  { label: 'Score CPV parcial',    icon: Hash,   color: 'bg-slate-100 text-slate-700',   placeholder: '20' },
  SCORING_PRESUPUESTO_IDEAL: { label: 'Score presupuesto', icon: Euro, color: 'bg-slate-100 text-slate-700',   placeholder: '25' },
  SCORING_UBICACION:    { label: 'Score ubicación',      icon: MapPin, color: 'bg-slate-100 text-slate-700',   placeholder: '20' },
  SCORING_PALABRAS:     { label: 'Score palabras',       icon: Tag,    color: 'bg-slate-100 text-slate-700',   placeholder: '15' },
  EMAIL_NOTIFICACION:   { label: 'Email notificación',   icon: Globe,  color: 'bg-slate-100 text-slate-700',   placeholder: 'email@empresa.com' },
}

const GRUPOS_CONFIG = [
  { titulo: 'Filtros principales', tipos: ['CPV', 'PALABRA_CLAVE', 'UBICACION', 'NUTS', 'FUENTE'] },
  { titulo: 'Presupuestos', tipos: ['PRESUPUESTO_MIN', 'PRESUPUESTO_MAX', 'PRESUPUESTO_IDEAL_MIN', 'PRESUPUESTO_IDEAL_MAX'] },
  { titulo: 'Scoring', tipos: ['SCORING_CPV_EXACTO', 'SCORING_CPV_PARCIAL', 'SCORING_PRESUPUESTO_IDEAL', 'SCORING_UBICACION', 'SCORING_PALABRAS', 'UBICACION_BONUS'] },
  { titulo: 'Notificaciones', tipos: ['EMAIL_NOTIFICACION'] },
]

type Modulo = 'empresa'|'licitaciones'|'rrhh'|'territorio'|'incidencias'|'calidad'|'economico'|'listas'

const MODULOS_SISTEMA: { id: Modulo, label: string, icon: any, color: string }[] = [
  { id: 'empresa',      label: 'Empresa',            icon: Building2,    color: 'text-[#1a3c34]' },
  { id: 'licitaciones', label: 'Licitaciones',       icon: Filter,       color: 'text-blue-600' },
  { id: 'rrhh',         label: 'RRHH',               icon: Users,        color: 'text-purple-600' },
  { id: 'territorio',   label: 'Territorio',          icon: Map,          color: 'text-emerald-600' },
  { id: 'incidencias',  label: 'Incidencias SLA',    icon: AlertTriangle,color: 'text-red-600' },
  { id: 'calidad',      label: 'Calidad',             icon: Star,         color: 'text-amber-500' },
  { id: 'economico',    label: 'Económico / P&L',    icon: TrendingUp,   color: 'text-green-600' },
  { id: 'listas',       label: 'Listas desplegables', icon: List,         color: 'text-slate-600' },
]

const CAMPOS_SISTEMA: Record<Modulo, { clave: string, label: string, tipo: 'text'|'number'|'email'|'time'|'textarea'|'lista', descripcion: string }[]> = {
  empresa: [
    { clave: 'nombre',               label: 'Nombre empresa',         tipo: 'text',     descripcion: 'Nombre legal de la empresa' },
    { clave: 'nif',                  label: 'NIF',                    tipo: 'text',     descripcion: 'NIF / CIF de la empresa' },
    { clave: 'direccion',            label: 'Dirección',              tipo: 'text',     descripcion: 'Dirección fiscal completa' },
    { clave: 'telefono',             label: 'Teléfono',               tipo: 'text',     descripcion: 'Teléfono de contacto' },
    { clave: 'email_contacto',       label: 'Email contacto',         tipo: 'email',    descripcion: 'Email principal de contacto' },
    { clave: 'email_notificaciones', label: 'Emails notificaciones',  tipo: 'textarea', descripcion: 'Emails para alertas del sistema (separados por coma)' },
    { clave: 'logo_url',             label: 'URL Logo',               tipo: 'text',     descripcion: 'URL pública del logo' },
  ],
  licitaciones: [
    { clave: 'presupuesto_min',       label: 'Presupuesto mínimo (€)',       tipo: 'number', descripcion: 'Presupuesto mínimo para filtrar licitaciones' },
    { clave: 'presupuesto_max',       label: 'Presupuesto máximo (€)',       tipo: 'number', descripcion: 'Presupuesto máximo para filtrar licitaciones' },
    { clave: 'presupuesto_ideal_min', label: 'Presupuesto ideal mín (€)',    tipo: 'number', descripcion: 'Rango ideal mínimo para scoring máximo' },
    { clave: 'presupuesto_ideal_max', label: 'Presupuesto ideal máx (€)',    tipo: 'number', descripcion: 'Rango ideal máximo para scoring máximo' },
    { clave: 'ubicacion_bonus',       label: 'Provincia prioritaria (NUTS)', tipo: 'text',   descripcion: 'Código NUTS de la provincia con bonus (ej: ES618)' },
    { clave: 'margen_minimo_go',      label: 'Margen mínimo GO (%)',         tipo: 'number', descripcion: 'Margen mínimo para aprobar licitación como GO' },
    { clave: 'scoring_cpv_exacto',    label: 'Peso CPV exacto',              tipo: 'number', descripcion: 'Puntos scoring por CPV exacto' },
    { clave: 'scoring_cpv_parcial',   label: 'Peso CPV parcial',             tipo: 'number', descripcion: 'Puntos scoring por CPV parcial' },
    { clave: 'scoring_presupuesto',   label: 'Peso presupuesto ideal',       tipo: 'number', descripcion: 'Puntos scoring por presupuesto en rango ideal' },
    { clave: 'scoring_ubicacion',     label: 'Peso ubicación',               tipo: 'number', descripcion: 'Puntos scoring por ubicación en Andalucía' },
    { clave: 'scoring_palabras',      label: 'Peso palabras clave',          tipo: 'number', descripcion: 'Puntos scoring por palabras clave encontradas' },
  ],
  rrhh: [
    { clave: 'jornada_semanal_horas',      label: 'Jornada semanal (horas)',          tipo: 'number', descripcion: 'Horas de jornada laboral semanal' },
    { clave: 'limite_horas_extra_anual',   label: 'Límite horas extra/año',           tipo: 'number', descripcion: 'Máximo horas extra anuales (art. 35 ET)' },
    { clave: 'dias_vacaciones',            label: 'Días vacaciones anuales',          tipo: 'number', descripcion: 'Días de vacaciones anuales por convenio' },
    { clave: 'ss_empresa_pct',             label: 'SS empresa (%)',                   tipo: 'number', descripcion: '% Seguridad Social a cargo de la empresa' },
    { clave: 'hora_cierre_fichajes',       label: 'Hora cierre fichajes',             tipo: 'time',   descripcion: 'Hora de cierre automático de fichajes abiertos' },
    { clave: 'dias_aviso_contrato_vencer', label: 'Días aviso vencimiento contrato',  tipo: 'number', descripcion: 'Días de antelación para alerta de vencimiento' },
    { clave: 'hora_busqueda_licitaciones', label: 'Hora búsqueda licitaciones',       tipo: 'time',   descripcion: 'Hora de búsqueda automática diaria de licitaciones' },
  ],
  territorio: [
    { clave: 'pct_indirectos',                label: '% Costes indirectos',           tipo: 'number', descripcion: '% sobre costes directos para indirectos en P&L' },
    { clave: 'stock_minimo_defecto',          label: 'Stock mínimo por defecto',      tipo: 'number', descripcion: 'Cantidad mínima por defecto al crear material' },
    { clave: 'hora_generacion_ordenes',       label: 'Hora generación órdenes',       tipo: 'time',   descripcion: 'Hora de generación automática de órdenes desde planificación' },
    { clave: 'hora_cierre_ordenes',           label: 'Hora cierre jornada',           tipo: 'time',   descripcion: 'Hora de cierre automático de jornada de operarios' },
    { clave: 'coste_hora_maquinaria_defecto', label: 'Coste/hora maquinaria (€)',     tipo: 'number', descripcion: 'Coste por hora de maquinaria por defecto' },
    { clave: 'tipos_servicio',                label: 'Tipos de servicio',             tipo: 'lista',  descripcion: 'Tipos de servicio disponibles (separados por coma)' },
    { clave: 'frecuencias',                   label: 'Frecuencias servicio',          tipo: 'lista',  descripcion: 'Frecuencias disponibles en planificación' },
    { clave: 'turnos',                        label: 'Turnos disponibles',            tipo: 'lista',  descripcion: 'Turnos de trabajo disponibles' },
  ],
  incidencias: [
    { clave: 'sla_critica_horas',            label: 'SLA crítica (horas)',            tipo: 'number',   descripcion: 'Horas para resolver incidencia crítica' },
    { clave: 'sla_alta_horas',               label: 'SLA alta (horas)',               tipo: 'number',   descripcion: 'Horas para resolver incidencia alta' },
    { clave: 'sla_media_horas',              label: 'SLA media (horas)',              tipo: 'number',   descripcion: 'Horas para resolver incidencia media' },
    { clave: 'sla_baja_horas',               label: 'SLA baja (horas)',               tipo: 'number',   descripcion: 'Horas para resolver incidencia baja' },
    { clave: 'aviso_previo_horas',           label: 'Aviso previo vencimiento (h)',   tipo: 'number',   descripcion: 'Horas antes del vencimiento SLA para enviar aviso' },
    { clave: 'max_escalaciones',             label: 'Máx. escalaciones',              tipo: 'number',   descripcion: 'Número máximo de escalaciones automáticas' },
    { clave: 'emails_escalacion',            label: 'Emails escalación',              tipo: 'textarea', descripcion: 'Emails para escalaciones automáticas (separados por coma)' },
    { clave: 'plazo_accion_correctiva_dias', label: 'Plazo acción correctiva (días)', tipo: 'number',   descripcion: 'Días de plazo para resolver acción correctiva' },
  ],
  calidad: [
    { clave: 'puntuacion_minima_alerta',     label: 'Puntuación mínima alerta',       tipo: 'number', descripcion: 'Puntuación por debajo de la cual se genera acción correctiva (0-5)' },
    { clave: 'nps_promotor_minimo',          label: 'NPS promotor (mín)',             tipo: 'number', descripcion: 'Puntuación mínima para considerar cliente promotor' },
    { clave: 'nps_detractor_maximo',         label: 'NPS detractor (máx)',            tipo: 'number', descripcion: 'Puntuación máxima para considerar cliente detractor' },
    { clave: 'plazo_accion_correctiva_dias', label: 'Plazo acción correctiva (días)', tipo: 'number', descripcion: 'Días de plazo para resolución de acciones correctivas' },
    { clave: 'frecuencia_inspeccion_dias',   label: 'Frecuencia inspecciones (días)', tipo: 'number', descripcion: 'Días entre inspecciones de calidad por centro' },
  ],
  economico: [
    { clave: 'pct_indirectos',            label: '% Costes indirectos P&L',   tipo: 'number', descripcion: '% costes indirectos aplicado en el cálculo de P&L' },
    { clave: 'dia_consolidacion_mensual', label: 'Día consolidación mensual',  tipo: 'number', descripcion: 'Día del mes para la consolidación automática del P&L' },
    { clave: 'margen_alerta_pct',         label: 'Margen mínimo alerta (%)',   tipo: 'number', descripcion: 'Margen por debajo del cual se genera alerta económica' },
    { clave: 'incluir_iva_presupuestos',  label: 'IVA en presupuestos',        tipo: 'text',   descripcion: 'true/false — Incluir IVA en cálculos de presupuesto' },
  ],
  listas: [
    { clave: 'categorias_profesionales', label: 'Categorías profesionales',  tipo: 'lista', descripcion: 'Categorías del personal (separadas por coma)' },
    { clave: 'tipos_contrato',           label: 'Tipos de contrato',         tipo: 'lista', descripcion: 'Tipos de contrato disponibles' },
    { clave: 'motivos_ausencia',         label: 'Motivos de ausencia',       tipo: 'lista', descripcion: 'Motivos de ausencia disponibles' },
    { clave: 'tipos_incidencia',         label: 'Tipos de incidencia',       tipo: 'lista', descripcion: 'Tipos de incidencia disponibles' },
    { clave: 'tipos_vehiculo',           label: 'Tipos de vehículo',         tipo: 'lista', descripcion: 'Tipos de vehículo de la flota' },
    { clave: 'tipos_material',           label: 'Tipos de material',         tipo: 'lista', descripcion: 'Tipos de material en inventario' },
    { clave: 'carnets_profesionales',    label: 'Carnets y certificaciones', tipo: 'lista', descripcion: 'Tipos de carnets y certificaciones del personal' },
    { clave: 'convenios_lista',          label: 'Convenios colectivos',      tipo: 'lista', descripcion: 'Convenios colectivos aplicables en la empresa' },
  ],
}

function Bloque({ title, children, defaultOpen = true, badge, actions }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean; badge?: string; actions?: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white border border-slate-200 rounded-2xl mb-4 overflow-hidden">
      <div className="flex items-center justify-between p-5">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-3 hover:opacity-80">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {badge && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{badge}</span>}
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      {open && <div className="px-5 pb-5 border-t border-slate-100 pt-4">{children}</div>}
    </div>
  )
}

function CosteRow({ bloque, item, guardando, onToggle, onUpdateValor, onDelete }: {
  bloque: string; item: any; guardando: string; onToggle: () => void; onUpdateValor: (v: number) => void; onDelete: () => void
}) {
  const [editando, setEditando] = useState(false)
  const [valorTemp, setValorTemp] = useState(String(item.valor))
  const isG = guardando === bloque + item.concepto
  const guardar = () => { const v = parseFloat(valorTemp); if (!isNaN(v) && v !== item.valor) onUpdateValor(v); setEditando(false) }
  return (
    <tr className={`border-b border-slate-50 hover:bg-slate-50 ${item.activo ? '' : 'opacity-50'}`}>
      <td className="px-2 py-1.5"><button onClick={onToggle} disabled={isG}>{isG ? <Loader2 size={14} className="animate-spin" /> : item.activo ? <ToggleRight size={16} className="text-emerald-600" /> : <ToggleLeft size={16} />}</button></td>
      <td className="px-2 py-1.5 font-medium text-slate-800">{item.concepto}</td>
      <td className="px-2 py-1.5 text-slate-500">{item.unidad}</td>
      <td className="px-2 py-1.5 text-right">
        {editando
          ? <div className="flex items-center gap-1 justify-end">
              <input type="number" step="any" value={valorTemp} onChange={e => setValorTemp(e.target.value)} autoFocus
                onKeyDown={e => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') setEditando(false) }}
                className="w-20 px-2 py-0.5 border border-blue-300 rounded text-xs text-right" />
              <button onClick={guardar} className="text-emerald-600"><Save size={12} /></button>
              <button onClick={() => setEditando(false)} className="text-slate-400"><X size={12} /></button>
            </div>
          : <button onClick={() => { setValorTemp(String(item.valor)); setEditando(true) }} className="font-semibold text-slate-800 hover:text-blue-600">{Number(item.valor).toFixed(2)}</button>
        }
      </td>
      <td className="px-2 py-1.5 text-slate-400 max-w-[150px] truncate">{item.notas}</td>
      <td className="px-2 py-1.5"><button onClick={onDelete} className="text-red-300 hover:text-red-600"><Trash2 size={12} /></button></td>
    </tr>
  )
}

export default function ConfiguracionPage() {
  const [tab, setTab] = useState<'filtros'|'convenios'|'costes'|'sistema'>('filtros')

  // Estados originales
  const [convenios, setConvenios] = useState<any[]>([])
  const [categorias, setCategorias] = useState<Record<string, any[]>>({})
  const [costesRef, setCostesRef] = useState<any>({ costes: {}, activos: {} })
  const [configItems, setConfigItems] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState('')
  const [nuevoItem, setNuevoItem] = useState<{bloque:string;concepto:string;unidad:string;valor:string;notas:string}|null>(null)
  const [nuevoConfig, setNuevoConfig] = useState<{tipo:string;valor:string;descripcion:string}|null>(null)

  // Estados tab Sistema
  const [configGlobal, setConfigGlobal] = useState<Record<string,Record<string,string>>>({})
  const [editadoGlobal, setEditadoGlobal] = useState<Record<string,Record<string,string>>>({})
  const [seccionSistema, setSeccionSistema] = useState<Modulo>('empresa')
  const [cambiosPendientes, setCambiosPendientes] = useState(false)
  const [guardandoSistema, setGuardandoSistema] = useState(false)

  const showMsg = (m: string, err = false) => {
    if (err) setError(m); else setMensaje(m)
    setTimeout(() => { setMensaje(''); setError('') }, 4000)
  }

  const cargarDatos = async () => {
    setCargando(true)
    try {
      const [convData, costData, cfgData] = await Promise.all([api.convenios(), api.costesReferencia(), api.configRaw()])
      setConvenios(convData.convenios || [])
      setCostesRef(costData)
      setConfigItems(cfgData.items || [])
      const cats: Record<string,any[]> = {}
      for (const conv of (convData.convenios || [])) {
        const catData = await api.categoriasConvenio(conv.id)
        cats[conv.id] = catData.categorias || []
      }
      setCategorias(cats)
    } catch(e) { console.error(e) }
    finally { setCargando(false) }
  }

  const cargarConfigGlobal = async () => {
    try {
      const r = await api.configGlobal()
      if (r.ok) { setConfigGlobal(r.config||{}); setEditadoGlobal(JSON.parse(JSON.stringify(r.config||{}))) }
    } catch(e) {}
  }

  useEffect(() => { cargarDatos(); cargarConfigGlobal() }, [])

  // Handlers convenios
  const handleSubirConvenio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) { setError('Solo PDF'); return }
    setSubiendo(true); setError(''); setMensaje('')
    try {
      const result = await api.subirConvenio(file)
      if (result.ok) { setMensaje(`Convenio procesado: ${result.nombre} — ${result.num_categorias} categorías`); await cargarDatos() }
      else setError(result.error || 'Error procesando')
    } catch(err) { setError('Error subiendo. Puede tardar 1-3 min.') }
    finally { setSubiendo(false); e.target.value = '' }
  }
  const handleEliminarConvenio = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return
    setGuardando(id)
    try { const r = await api.eliminarConvenio(id); if (r.ok) { setMensaje('Convenio eliminado'); await cargarDatos() } else setError(r.error) }
    catch(e) { setError('Error') } finally { setGuardando('') }
  }

  // Handlers costes
  const handleToggleCoste = async (bloque: string, concepto: string, activo: boolean) => {
    setGuardando(bloque+concepto)
    try { await api.updateCosteRef({ bloque, concepto_original: concepto, activo: !activo }); await cargarDatos() }
    catch(e) { setError('Error') } finally { setGuardando('') }
  }
  const handleUpdateValor = async (bloque: string, concepto: string, v: number) => {
    setGuardando(bloque+concepto)
    try { await api.updateCosteRef({ bloque, concepto_original: concepto, valor: v }); await cargarDatos() }
    catch(e) { setError('Error') } finally { setGuardando('') }
  }
  const handleDeleteCoste = async (bloque: string, concepto: string) => {
    if (!confirm(`¿Eliminar "${concepto}"?`)) return
    setGuardando(bloque+concepto)
    try { await api.deleteCosteRef(bloque, concepto); await cargarDatos() }
    catch(e) { setError('Error') } finally { setGuardando('') }
  }
  const handleAddCoste = async () => {
    if (!nuevoItem?.bloque || !nuevoItem?.concepto) { setError('Bloque y concepto obligatorios'); return }
    setGuardando('nuevo')
    try {
      await api.addCosteRef({ bloque: nuevoItem.bloque, concepto: nuevoItem.concepto, unidad: nuevoItem.unidad, valor: parseFloat(nuevoItem.valor)||0, notas: nuevoItem.notas, activo: true })
      setNuevoItem(null); setMensaje('Añadido'); await cargarDatos()
    } catch(e) { setError('Error') } finally { setGuardando('') }
  }

  // Handlers filtros config
  const handleToggleConfig = async (fila: number, activo: boolean) => {
    setGuardando('cfg'+fila)
    try { await api.updateConfig({ fila, activo: !activo }); await cargarDatos() }
    catch(e) { setError('Error') } finally { setGuardando('') }
  }
  const handleDeleteConfig = async (fila: number, valor: string) => {
    if (!confirm(`¿Eliminar "${valor}"?`)) return
    setGuardando('cfg'+fila)
    try { await api.deleteConfig(fila); await cargarDatos() }
    catch(e) { setError('Error') } finally { setGuardando('') }
  }
  const handleAddConfig = async () => {
    if (!nuevoConfig?.tipo || !nuevoConfig?.valor) { setError('Tipo y valor obligatorios'); return }
    setGuardando('cfgnuevo')
    try {
      await api.addConfig({ tipo: nuevoConfig.tipo, valor: nuevoConfig.valor, activo: true, descripcion: nuevoConfig.descripcion })
      setNuevoConfig(null); setMensaje('Añadido'); await cargarDatos()
    } catch(e) { setError('Error') } finally { setGuardando('') }
  }

  // Handlers sistema global
  const getValSistema = (modulo: Modulo, clave: string) => editadoGlobal[modulo]?.[clave] ?? configGlobal[modulo]?.[clave] ?? ''
  const setValSistema = (modulo: Modulo, clave: string, valor: string) => {
    setEditadoGlobal(prev => ({ ...prev, [modulo]: { ...(prev[modulo]||{}), [clave]: valor } }))
    setCambiosPendientes(true)
  }
  const guardarSistema = async (modulo?: Modulo) => {
    setGuardandoSistema(true)
    try {
      const modulosAGuardar = modulo ? [modulo] : (Object.keys(editadoGlobal) as Modulo[])
      const cambios: any[] = []
      for (const mod of modulosAGuardar) {
        for (const campo of (CAMPOS_SISTEMA[mod as Modulo]||[])) {
          const val = editadoGlobal[mod]?.[campo.clave]
          if (val !== undefined) cambios.push({ modulo: mod, clave: campo.clave, valor: val })
        }
      }
      const r = await api.guardarConfigGlobal({ cambios })
      if (r.ok) { showMsg(`✅ ${r.cambios_guardados} parámetros guardados`); setCambiosPendientes(false); setConfigGlobal(JSON.parse(JSON.stringify(editadoGlobal))) }
      else showMsg('Error al guardar', true)
    } catch(e) { showMsg('Error de conexión', true) }
    finally { setGuardandoSistema(false) }
  }

  const renderCampoSistema = (modulo: Modulo, campo: typeof CAMPOS_SISTEMA['empresa'][0]) => {
    const val = getValSistema(modulo, campo.clave)
    if (campo.tipo === 'textarea' || campo.tipo === 'lista') return (
      <div key={campo.clave} className="col-span-2">
        <label className="text-xs font-semibold text-slate-700 block mb-1">{campo.label}</label>
        <textarea value={val} onChange={e => setValSistema(modulo, campo.clave, e.target.value)} rows={campo.tipo==='lista'?3:2}
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:border-[#1a3c34] focus:outline-none" placeholder={campo.descripcion} />
        <p className="text-[10px] text-slate-400 mt-0.5">{campo.descripcion}</p>
      </div>
    )
    return (
      <div key={campo.clave}>
        <label className="text-xs font-semibold text-slate-700 block mb-1">{campo.label}</label>
        <input type={campo.tipo} value={val} onChange={e => setValSistema(modulo, campo.clave, e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-[#1a3c34] focus:outline-none" placeholder={campo.descripcion} />
        <p className="text-[10px] text-slate-400 mt-0.5">{campo.descripcion}</p>
      </div>
    )
  }

  if (cargando) return <div className="flex flex-col items-center py-20"><Loader2 size={32} className="text-blue-500 animate-spin mb-3" /><p className="text-slate-500">Cargando...</p></div>

  const bloques = Object.keys(costesRef.costes||{}).filter(b => b)

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e] rounded-xl shadow-lg"><Settings size={22} className="text-white" /></div>
        <div><h1 className="text-2xl font-bold text-slate-900">Configuración</h1><p className="text-sm text-slate-500">Filtros, convenios, costes y parámetros del sistema</p></div>
        {tab === 'sistema' && cambiosPendientes && (
          <button onClick={() => guardarSistema()} disabled={guardandoSistema}
            className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-[#1a3c34] hover:bg-[#2d5a4e] text-white text-sm font-bold rounded-xl">
            {guardandoSistema ? <Loader2 size={15} className="animate-spin"/> : <Save size={15}/>} Guardar cambios
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: 'filtros',   label: 'Filtros PASO 0',           icon: Filter   },
          { id: 'convenios', label: `Convenios (${convenios.length})`, icon: BookOpen },
          { id: 'costes',    label: 'Costes ref.',               icon: Euro     },
          { id: 'sistema',   label: 'Sistema',                   icon: Settings },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === t.id ? 'bg-[#1a3c34] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {mensaje && <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4"><CheckCircle2 size={16} className="text-emerald-600" /><span className="text-sm text-emerald-800">{mensaje}</span><button onClick={() => setMensaje('')} className="ml-auto"><X size={14} className="text-emerald-400" /></button></div>}
      {error   && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4"><AlertCircle size={16} className="text-red-600" /><span className="text-sm text-red-800">{error}</span><button onClick={() => setError('')} className="ml-auto"><X size={14} className="text-red-400" /></button></div>}

      {/* TAB FILTROS */}
      {tab === 'filtros' && <>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">Configura qué oportunidades detecta el PASO 0: CPVs, territorios, palabras clave, presupuestos y scoring.</p>
            <button onClick={() => setNuevoConfig({ tipo: 'CPV', valor: '', descripcion: '' })} className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl"><Plus size={14} /> Añadir</button>
          </div>
        </div>
        {nuevoConfig && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-3">Nuevo filtro</h3>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-[10px] text-slate-500">Tipo</label>
                <select value={nuevoConfig.tipo} onChange={e => setNuevoConfig({...nuevoConfig,tipo:e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white">
                  {Object.entries(TIPOS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
              <div><label className="text-[10px] text-slate-500">Valor</label><input type="text" value={nuevoConfig.valor} onChange={e => setNuevoConfig({...nuevoConfig,valor:e.target.value})} placeholder={TIPOS_CONFIG[nuevoConfig.tipo]?.placeholder||''} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" /></div>
              <div><label className="text-[10px] text-slate-500">Descripción</label><input type="text" value={nuevoConfig.descripcion} onChange={e => setNuevoConfig({...nuevoConfig,descripcion:e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" /></div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleAddConfig} disabled={guardando==='cfgnuevo'} className="flex items-center gap-1 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:bg-blue-400">{guardando==='cfgnuevo'?<Loader2 size={12} className="animate-spin"/>:<Save size={12}/>} Guardar</button>
              <button onClick={() => setNuevoConfig(null)} className="px-4 py-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg">Cancelar</button>
            </div>
          </div>
        )}
        {GRUPOS_CONFIG.map(grupo => {
          const items = configItems.filter(i => grupo.tipos.includes(i.tipo)); if (!items.length) return null
          const subgrupos: Record<string,any[]> = {}; items.forEach(i => { if (!subgrupos[i.tipo]) subgrupos[i.tipo]=[]; subgrupos[i.tipo].push(i) })
          return (
            <Bloque key={grupo.titulo} title={grupo.titulo} badge={`${items.filter(i=>i.activo).length}/${items.length}`} defaultOpen={grupo.titulo==='Filtros principales'}>
              {Object.entries(subgrupos).map(([tipo, tipoItems]) => {
                const info = TIPOS_CONFIG[tipo]||{label:tipo,icon:Hash,color:'bg-slate-100 text-slate-700',placeholder:''}; const TipoIcon = info.icon
                return (
                  <div key={tipo} className="mb-4 last:mb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${info.color}`}><TipoIcon size={10}/>{info.label}</span>
                      <span className="text-[10px] text-slate-400">{tipoItems.filter(i=>i.activo).length} activos</span>
                    </div>
                    <div className="space-y-1">
                      {tipoItems.map((item:any) => (
                        <div key={item.fila} className={`flex items-center gap-2 p-2 rounded-lg ${item.activo?'bg-white':'bg-slate-50 opacity-60'}`}>
                          <button onClick={() => handleToggleConfig(item.fila,item.activo)} disabled={guardando==='cfg'+item.fila} className="shrink-0">
                            {guardando==='cfg'+item.fila?<Loader2 size={14} className="animate-spin text-slate-400"/>:item.activo?<ToggleRight size={16} className="text-emerald-600"/>:<ToggleLeft size={16} className="text-slate-400"/>}
                          </button>
                          <span className="text-sm font-medium text-slate-800 flex-1">{item.valor}</span>
                          {item.descripcion && <span className="text-[10px] text-slate-400 max-w-[150px] truncate">{item.descripcion}</span>}
                          <button onClick={() => handleDeleteConfig(item.fila,item.valor)} className="text-red-300 hover:text-red-600 shrink-0"><Trash2 size={12}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </Bloque>
          )
        })}
      </>}

      {/* TAB CONVENIOS */}
      {tab === 'convenios' && <>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Subir nuevo convenio</h3>
          <p className="text-xs text-slate-500 mb-4">Sube el PDF. Gemini extrae tablas salariales automáticamente (1-3 min).</p>
          <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${subiendo?'border-blue-300 bg-blue-50':'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50'}`}>
            {subiendo?(<><Loader2 size={24} className="text-blue-500 animate-spin mb-2"/><span className="text-sm text-blue-700 font-medium">Procesando con Gemini...</span></>):(<><Upload size={24} className="text-slate-400 mb-2"/><span className="text-sm text-slate-600 font-medium">Seleccionar PDF del convenio</span></>)}
            <input type="file" accept=".pdf" onChange={handleSubirConvenio} disabled={subiendo} className="hidden"/>
          </label>
        </div>
        {convenios.length===0?(<div className="flex flex-col items-center py-12"><BookOpen size={40} className="text-slate-300 mb-3"/><p className="text-slate-500">No hay convenios cargados</p></div>)
        :convenios.map((conv:any) => {
          const cats = categorias[conv.id]||[]
          return (
            <Bloque key={conv.id} title={`${conv.sector} — ${conv.provincia}`} badge={`${cats.length} cat.`} defaultOpen={false}
              actions={<button onClick={() => handleEliminarConvenio(conv.id,`${conv.sector} ${conv.provincia}`)} disabled={guardando===conv.id} className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-lg">{guardando===conv.id?<Loader2 size={12} className="animate-spin"/>:<Trash2 size={12}/>} Eliminar</button>}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <div><span className="text-[10px] text-slate-400 uppercase">Nombre</span><p className="text-xs text-slate-700">{conv.nombre?.substring(0,100)}</p></div>
                <div><span className="text-[10px] text-slate-400 uppercase">Vigencia</span><p className="text-xs text-slate-700">{conv.vigencia_desde} → {conv.vigencia_hasta}</p></div>
                <div><span className="text-[10px] text-slate-400 uppercase">Jornada</span><p className="text-xs text-slate-700">{conv.horas_anuales} h/año</p></div>
                <div><span className="text-[10px] text-slate-400 uppercase">Pagas</span><p className="text-xs text-slate-700">{conv.num_pagas}</p></div>
                <div><span className="text-[10px] text-slate-400 uppercase">SS Empresa</span><p className="text-xs text-slate-700">{conv.ss_empresa}%</p></div>
                <div><span className="text-[10px] text-slate-400 uppercase">Ámbito</span><p className="text-xs text-slate-700">{conv.ambito}</p></div>
              </div>
              {conv.url_documento && <a href={conv.url_documento} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mb-4"><ExternalLink size={12}/> Ver PDF</a>}
              {cats.length>0 && (
                <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="bg-slate-100">
                  <th className="text-left px-2 py-2 font-semibold text-slate-600">Grupo / Nivel</th>
                  <th className="text-left px-2 py-2 font-semibold text-slate-600">Categoría</th>
                  <th className="text-right px-2 py-2 font-semibold text-slate-600">Base diario</th>
                  <th className="text-right px-2 py-2 font-semibold text-slate-600">Especialidad</th>
                  <th className="text-right px-2 py-2 font-semibold text-slate-600 bg-blue-50">Total anual</th>
                </tr></thead><tbody>{cats.map((cat:any,i:number)=>(
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-2 py-1.5 font-medium">{cat.grupo}{cat.nivel?` - ${cat.nivel}`:''}</td>
                    <td className="px-2 py-1.5">{cat.categoria}</td>
                    <td className="px-2 py-1.5 text-right">{Number(cat.salario_base_diario).toFixed(2)} €</td>
                    <td className="px-2 py-1.5 text-right">{Number(cat.plus_especialidad).toFixed(2)} €</td>
                    <td className="px-2 py-1.5 text-right font-bold bg-blue-50">{Number(cat.total_anual_bruto).toLocaleString('es-ES',{minimumFractionDigits:2})} €</td>
                  </tr>
                ))}</tbody></table></div>
              )}
            </Bloque>
          )
        })}
      </>}

      {/* TAB COSTES */}
      {tab === 'costes' && <>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-600">Catálogo de costes unitarios.</p>
            <button onClick={() => setNuevoItem({bloque:bloques[0]||'',concepto:'',unidad:'',valor:'0',notas:''})} className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl"><Plus size={14}/> Añadir ítem</button>
          </div>
          {costesRef.activos?.ss_empresa_total && (
            <div className="p-3 bg-slate-50 rounded-xl"><span className="text-xs font-medium text-slate-700">SS: <strong>{costesRef.activos.ss_empresa_total.toFixed(2)}%</strong> | GG: <strong>{costesRef.activos?.['Estructura']?.['Gastos generales de estructura']}%</strong> | BI: <strong>{costesRef.activos?.['Estructura']?.['Beneficio industrial']}%</strong></span></div>
          )}
        </div>
        {nuevoItem && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-3">Nuevo ítem</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div><label className="text-[10px] text-slate-500">Bloque</label>
                <select value={nuevoItem.bloque} onChange={e => setNuevoItem({...nuevoItem,bloque:e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white">
                  {bloques.map(b=><option key={b} value={b}>{b}</option>)}<option value="_nuevo">— Nuevo —</option></select>
                {nuevoItem.bloque==='_nuevo'&&<input type="text" placeholder="Nombre" onChange={e=>setNuevoItem({...nuevoItem,bloque:e.target.value})} className="w-full px-2 py-1.5 border border-blue-300 rounded-lg text-xs mt-1"/>}</div>
              <div><label className="text-[10px] text-slate-500">Concepto</label><input type="text" value={nuevoItem.concepto} onChange={e=>setNuevoItem({...nuevoItem,concepto:e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"/></div>
              <div><label className="text-[10px] text-slate-500">Unidad</label><input type="text" value={nuevoItem.unidad} onChange={e=>setNuevoItem({...nuevoItem,unidad:e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"/></div>
              <div><label className="text-[10px] text-slate-500">Valor</label><input type="number" step="any" value={nuevoItem.valor} onChange={e=>setNuevoItem({...nuevoItem,valor:e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-center"/></div>
              <div><label className="text-[10px] text-slate-500">Notas</label><input type="text" value={nuevoItem.notas} onChange={e=>setNuevoItem({...nuevoItem,notas:e.target.value})} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"/></div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleAddCoste} disabled={guardando==='nuevo'} className="flex items-center gap-1 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:bg-blue-400">{guardando==='nuevo'?<Loader2 size={12} className="animate-spin"/>:<Save size={12}/>} Guardar</button>
              <button onClick={() => setNuevoItem(null)} className="px-4 py-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg">Cancelar</button>
            </div>
          </div>
        )}
        {bloques.map(bloque => {
          const items = costesRef.costes[bloque]||[]; if (!items.length) return null
          const activos = items.filter((i:any)=>i.activo).length
          return (
            <Bloque key={bloque} title={bloque} badge={`${activos}/${items.length}`} defaultOpen={false}>
              <table className="w-full text-xs"><thead><tr className="bg-slate-50">
                <th className="text-left px-2 py-2 font-semibold text-slate-500 w-8">Act.</th>
                <th className="text-left px-2 py-2 font-semibold text-slate-500">Concepto</th>
                <th className="text-left px-2 py-2 font-semibold text-slate-500">Unidad</th>
                <th className="text-right px-2 py-2 font-semibold text-slate-500 w-24">Valor</th>
                <th className="text-left px-2 py-2 font-semibold text-slate-500">Notas</th>
                <th className="w-8"></th>
              </tr></thead><tbody>
                {items.map((item:any,i:number)=>(
                  <CosteRow key={i} bloque={bloque} item={item} guardando={guardando}
                    onToggle={() => handleToggleCoste(bloque,item.concepto,item.activo)}
                    onUpdateValor={v => handleUpdateValor(bloque,item.concepto,v)}
                    onDelete={() => handleDeleteCoste(bloque,item.concepto)}/>
                ))}
              </tbody></table>
            </Bloque>
          )
        })}
      </>}

      {/* TAB SISTEMA */}
      {tab === 'sistema' && (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-2">
            <p className="text-xs text-blue-700">Los cambios se guardan en la hoja <strong>CONFIG_GLOBAL</strong> y se aplican al sistema en tiempo real.</p>
          </div>
          {MODULOS_SISTEMA.map(mod => (
            <div key={mod.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <button onClick={() => setSeccionSistema(seccionSistema===mod.id?'' as Modulo:mod.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <mod.icon size={18} className={mod.color}/>
                  <span className="text-sm font-bold text-slate-900">{mod.label}</span>
                  <span className="text-[10px] text-slate-400">{CAMPOS_SISTEMA[mod.id].length} parámetros</span>
                </div>
                <div className="flex items-center gap-2">
                  {seccionSistema===mod.id && cambiosPendientes && (
                    <button onClick={e=>{e.stopPropagation();guardarSistema(mod.id)}} disabled={guardandoSistema}
                      className="text-[10px] px-2 py-1 bg-[#1a3c34] text-white rounded-lg font-bold">
                      {guardandoSistema?<Loader2 size={10} className="animate-spin inline"/>:'Guardar'}
                    </button>
                  )}
                  {seccionSistema===mod.id?<ChevronUp size={16} className="text-slate-400"/>:<ChevronDown size={16} className="text-slate-400"/>}
                </div>
              </button>
              {seccionSistema===mod.id && (
                <div className="border-t border-slate-100 p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {CAMPOS_SISTEMA[mod.id].map(campo => renderCampoSistema(mod.id, campo))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {cambiosPendientes && (
            <div className="flex justify-end pt-2">
              <button onClick={() => guardarSistema()} disabled={guardandoSistema}
                className="flex items-center gap-2 px-6 py-3 bg-[#1a3c34] hover:bg-[#2d5a4e] text-white font-bold rounded-xl">
                {guardandoSistema?<Loader2 size={16} className="animate-spin"/>:<Save size={16}/>} Guardar toda la configuración
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}