import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import {
  ArrowLeft, Upload, Building2, FileText, MapPin, Euro, Calendar,
  Tag, Save, AlertCircle, CheckCircle2, Loader2, Brain, Sparkles, X
} from 'lucide-react'

type TipoOportunidad = 'publica_placsp' | 'publica_ayuntamiento' | 'publica_diputacion' | 'publica_junta' | 'publica_estado' | 'privada_presupuesto' | 'privada_invitacion'

const TIPOS = [
  { value: 'publica_placsp',       label: 'PLACSP / Portal nacional',              grupo: 'Pública',  color: 'blue' },
  { value: 'publica_junta',        label: 'Junta de Andalucía',                    grupo: 'Pública',  color: 'blue' },
  { value: 'publica_ayuntamiento', label: 'Ayuntamiento',                           grupo: 'Pública',  color: 'blue' },
  { value: 'publica_diputacion',   label: 'Diputación',                             grupo: 'Pública',  color: 'blue' },
  { value: 'publica_estado',       label: 'Estado (ministerio, universidad, hospital)', grupo: 'Pública', color: 'blue' },
  { value: 'privada_presupuesto',  label: 'Solicitud de presupuesto (empresa privada)', grupo: 'Privada', color: 'purple' },
  { value: 'privada_invitacion',   label: 'Invitación / negociado sin publicidad',  grupo: 'Privada',  color: 'purple' },
]

const CPVS_COMUNES = [
  { code: '90910000', label: 'Servicios de limpieza' },
  { code: '90911200', label: 'Limpieza de edificios' },
  { code: '90919200', label: 'Limpieza de oficinas' },
  { code: '90919300', label: 'Limpieza de escuelas' },
  { code: '90610000', label: 'Limpieza viaria' },
  { code: '90900000', label: 'Limpieza e higienización' },
  { code: '77310000', label: 'Zonas verdes / Jardinería' },
  { code: '50700000', label: 'Mantenimiento instalaciones' },
  { code: '90921000', label: 'Desinfección' },
  { code: '',         label: 'Otro / No aplica' },
]

const FORM_VACIO = {
  tipo: '' as TipoOportunidad | '',
  titulo: '', organismo: '', cpv: '', presupuesto: '',
  fecha_limite: '', expediente: '', url: '', ubicacion: '',
  procedimiento: 'Abierto', descripcion: '',
}

export default function NuevaOportunidadPage() {
  const navigate  = useNavigate()
  const [form, setForm]           = useState({ ...FORM_VACIO })
  const [archivos, setArchivos]   = useState<File[]>([])
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado]   = useState(false)
  const [error, setError]         = useState('')
  const [progreso, setProgreso]   = useState('')
  const [extrayendo, setExtrayendo] = useState(false)
  const [extraido, setExtraido]   = useState(false)
  const [dragOver, setDragOver]   = useState(false)

  const set = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.size < 20 * 1024 * 1024)
    if (files.length > 0) { setArchivos(prev => [...prev, ...files]); setExtraido(false) }
  }, [])

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) { setArchivos(prev => [...prev, ...Array.from(e.target.files!)]); setExtraido(false) }
  }

  // ── Extracción IA ─────────────────────────────────────────────────────────
  const extraerConIA = async () => {
    if (archivos.length === 0) return
    setExtrayendo(true); setError(''); setProgreso('Analizando documentos con Gemini...')
    try {
      // Convertir PDFs a base64 y enviar al backend
      const docsBase64: { nombre: string; base64: string; mime: string }[] = []
      for (const file of archivos.slice(0, 4)) { // máx 4 docs
        const b64 = await fileToBase64(file)
        docsBase64.push({ nombre: file.name, base64: b64, mime: file.type || 'application/pdf' })
      }

      const result = await api.extraerDatosPliego({ docs: docsBase64 })
      if (!result?.ok) throw new Error(result?.error || 'Sin respuesta de IA')

      const d = result.datos
      // Rellenar formulario con los datos extraídos
      setForm(prev => ({
        ...prev,
        titulo:      d.titulo      || prev.titulo,
        organismo:   d.organismo   || prev.organismo,
        presupuesto: d.presupuesto ? String(d.presupuesto) : prev.presupuesto,
        fecha_limite: d.fecha_limite || prev.fecha_limite,
        cpv:         d.cpv         || prev.cpv,
        expediente:  d.expediente  || prev.expediente,
        ubicacion:   d.ubicacion   || prev.ubicacion,
        procedimiento: d.procedimiento || prev.procedimiento,
        descripcion: d.descripcion || prev.descripcion,
      }))
      setExtraido(true)
      setProgreso('')
    } catch (e: any) {
      setError('Error extrayendo datos: ' + e.message)
      setProgreso('')
    } finally {
      setExtrayendo(false)
    }
  }

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader()
      reader.onload = () => res((reader.result as string).split(',')[1])
      reader.onerror = rej
      reader.readAsDataURL(file)
    })

  // ── Guardar ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.tipo)      { setError('Selecciona el tipo de oportunidad'); return }
    if (!form.titulo)    { setError('El título es obligatorio'); return }
    if (!form.organismo) { setError('El organismo/empresa es obligatorio'); return }

    setGuardando(true); setError('')
    setProgreso('Guardando oportunidad...')
    try {
      const resultado = await api.crearOportunidad({
        titulo:       form.titulo,
        organismo:    form.organismo,
        cpv:          form.cpv,
        presupuesto:  form.presupuesto ? parseFloat(form.presupuesto) : 0,
        fecha_limite: form.fecha_limite,
        procedimiento: form.procedimiento,
        url:          form.url,
        descripcion:  form.descripcion,
        fuente:       form.tipo?.startsWith('privada') ? 'Privada' : 'Manual',
        notas:        form.tipo + (form.expediente ? ' | Exp: ' + form.expediente : '') + (form.ubicacion ? ' | ' + form.ubicacion : ''),
      })

      const opoId = resultado.id || 'SIN_ID'

      if (archivos.length > 0) {
        for (let i = 0; i < archivos.length; i++) {
          setProgreso('Subiendo ' + (i + 1) + '/' + archivos.length + ': ' + archivos[i].name)
          try { await api.subirArchivo(archivos[i], opoId) } catch {}
        }
      }

      setProgreso(''); setGuardado(true)
      setTimeout(() => navigate('/oportunidades/' + opoId), 1500)
    } catch {
      setError('Error al guardar. Inténtalo de nuevo.')
      setProgreso('')
    } finally { setGuardando(false) }
  }

  const esPrivada = form.tipo?.startsWith('privada')

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      {/* Cabecera */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/oportunidades')} className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nueva oportunidad</h1>
          <p className="text-slate-500 text-sm mt-0.5">Sube los pliegos y la IA rellenará los datos automáticamente</p>
        </div>
      </div>

      {/* PASO 1 — Tipo */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          1 · Tipo de oportunidad *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TIPOS.map(t => (
            <button key={t.value} onClick={() => set('tipo', t.value)}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                form.tipo === t.value
                  ? t.color === 'blue' ? 'border-blue-500 bg-blue-50' : 'border-purple-500 bg-purple-50'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}>
              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                t.color === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
              }`}>{t.grupo}</span>
              <p className="text-sm font-medium text-slate-900 mt-1">{t.label}</p>
            </button>
          ))}
        </div>
      </div>

      {form.tipo && (
        <>
          {/* PASO 2 — Subir documentos + extraer con IA */}
          <div className={`bg-white border-2 rounded-2xl p-6 mb-4 transition-all ${
            extraido ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  2 · {esPrivada ? 'Documentación adjunta' : 'Pliegos y documentación'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sube los PDFs y pulsa <strong>"Extraer con IA"</strong> — rellenará el formulario automáticamente
                </p>
              </div>
              {extraido && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full">
                  <CheckCircle2 size={13} /> Datos extraídos
                </div>
              )}
            </div>

            {/* Drop zone */}
            <div
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              className={`relative border-2 border-dashed rounded-xl transition-all ${
                dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-300 hover:bg-slate-50'
              }`}>
              <label className="flex flex-col items-center justify-center p-6 cursor-pointer">
                <Upload size={24} className="text-slate-400 mb-2" />
                <span className="text-sm text-slate-600 font-medium">Arrastra archivos o haz clic</span>
                <span className="text-xs text-slate-400 mt-1">PDF, DOC, DOCX (máx 20MB por archivo)</span>
                <input type="file" multiple accept=".pdf,.doc,.docx" onChange={onFileInput} className="hidden" />
              </label>
            </div>

            {/* Lista de archivos */}
            {archivos.length > 0 && (
              <div className="mt-3 space-y-2">
                {archivos.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-blue-600 shrink-0" />
                      <span className="text-sm text-slate-700 truncate max-w-[300px]">{file.name}</span>
                      <span className="text-xs text-slate-400 shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <button onClick={() => { setArchivos(prev => prev.filter((_, j) => j !== i)); setExtraido(false) }}
                      className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}

                {/* Botón extraer */}
                <button onClick={extraerConIA} disabled={extrayendo}
                  className="w-full flex items-center justify-center gap-2 mt-2 px-5 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-violet-200">
                  {extrayendo
                    ? <><Loader2 size={16} className="animate-spin" /> Analizando con Gemini...</>
                    : <><Sparkles size={16} /> {extraido ? 'Re-extraer datos con IA' : 'Extraer datos con IA'}</>
                  }
                </button>
              </div>
            )}
          </div>

          {/* PASO 3 — Formulario (se rellena solo o manualmente) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-semibold text-slate-900">3 · Datos de la oportunidad</h2>
              {extraido && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">
                  <Brain size={10} /> Rellenado por IA
                </span>
              )}
            </div>
            <div className="space-y-4">

              {/* Título */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Título / Objeto del contrato *</label>
                <div className="relative">
                  <FileText size={15} className="absolute left-3 top-3 text-slate-400" />
                  <input type="text" value={form.titulo} onChange={e => set('titulo', e.target.value)}
                    placeholder="Ej: Servicio de limpieza de edificios municipales"
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                </div>
              </div>

              {/* Organismo */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{esPrivada ? 'Empresa' : 'Organismo'} *</label>
                <div className="relative">
                  <Building2 size={15} className="absolute left-3 top-3 text-slate-400" />
                  <input type="text" value={form.organismo} onChange={e => set('organismo', e.target.value)}
                    placeholder={esPrivada ? 'Ej: Grupo Hoteles XYZ S.L.' : 'Ej: Ayuntamiento de Sevilla'}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                </div>
              </div>

              {/* Presupuesto + Fecha */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Presupuesto base (€)</label>
                  <div className="relative">
                    <Euro size={15} className="absolute left-3 top-3 text-slate-400" />
                    <input type="number" value={form.presupuesto} onChange={e => set('presupuesto', e.target.value)}
                      placeholder="Ej: 250000"
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Fecha límite presentación</label>
                  <div className="relative">
                    <Calendar size={15} className="absolute left-3 top-3 text-slate-400" />
                    <input type="date" value={form.fecha_limite} onChange={e => set('fecha_limite', e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                  </div>
                </div>
              </div>

              {/* CPV */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">CPV</label>
                <div className="relative">
                  <Tag size={15} className="absolute left-3 top-3 text-slate-400" />
                  <select value={form.cpv} onChange={e => set('cpv', e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 appearance-none">
                    <option value="">Seleccionar CPV</option>
                    {CPVS_COMUNES.map(c => (
                      <option key={c.code} value={c.code}>{c.code ? c.code + ' — ' + c.label : c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ubicación + Expediente */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Ubicación</label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3 top-3 text-slate-400" />
                    <input type="text" value={form.ubicacion} onChange={e => set('ubicacion', e.target.value)}
                      placeholder="Ej: Sevilla, Córdoba..."
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nº Expediente</label>
                  <input type="text" value={form.expediente} onChange={e => set('expediente', e.target.value)}
                    placeholder="Ej: 2026/001234"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                </div>
              </div>

              {/* URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">URL del anuncio</label>
                <input type="url" value={form.url} onChange={e => set('url', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
              </div>

              {/* Procedimiento */}
              {!esPrivada && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Tipo de procedimiento</label>
                  <div className="flex gap-2 flex-wrap">
                    {['Abierto', 'Abierto simplificado', 'Restringido', 'Negociado', 'Menor', 'Otro'].map(p => (
                      <button key={p} onClick={() => set('procedimiento', p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          form.procedimiento === p ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}>{p}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Descripción / Notas</label>
                <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                  placeholder="Detalles adicionales, condiciones especiales, servicios solicitados..."
                  rows={3} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 resize-none" />
              </div>
            </div>
          </div>

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
              <CheckCircle2 size={16} className="shrink-0" />Oportunidad guardada. Redirigiendo a la ficha...
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3">
            <button onClick={() => navigate('/oportunidades')}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={guardando || guardado}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1a3c34] hover:bg-[#2d5a4e] disabled:bg-slate-400 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
              {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {guardando ? 'Guardando...' : 'Guardar oportunidad'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}