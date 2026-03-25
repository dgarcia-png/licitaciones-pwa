import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import {
  ArrowLeft, Upload, Building2, Briefcase, Mail, FileText,
  MapPin, Euro, Calendar, Tag, Save, AlertCircle, CheckCircle2, Loader2
} from 'lucide-react'

type TipoOportunidad = 'publica_placsp' | 'publica_ayuntamiento' | 'publica_diputacion' | 'publica_junta' | 'publica_estado' | 'privada_presupuesto' | 'privada_invitacion'

const TIPOS: { value: TipoOportunidad; label: string; grupo: string; color: string }[] = [
  { value: 'publica_placsp', label: 'PLACSP / Portal nacional', grupo: 'Pública', color: 'blue' },
  { value: 'publica_junta', label: 'Junta de Andalucía', grupo: 'Pública', color: 'blue' },
  { value: 'publica_ayuntamiento', label: 'Ayuntamiento', grupo: 'Pública', color: 'blue' },
  { value: 'publica_diputacion', label: 'Diputación', grupo: 'Pública', color: 'blue' },
  { value: 'publica_estado', label: 'Estado (ministerio, universidad, hospital)', grupo: 'Pública', color: 'blue' },
  { value: 'privada_presupuesto', label: 'Solicitud de presupuesto (empresa privada)', grupo: 'Privada', color: 'purple' },
  { value: 'privada_invitacion', label: 'Invitación / negociado sin publicidad', grupo: 'Privada', color: 'purple' },
]

const CPVS_COMUNES = [
  { code: '90910000', label: 'Servicios de limpieza' },
  { code: '90911200', label: 'Limpieza de edificios' },
  { code: '90919200', label: 'Limpieza de oficinas' },
  { code: '90919300', label: 'Limpieza de escuelas' },
  { code: '90610000', label: 'Limpieza viaria' },
  { code: '90900000', label: 'Limpieza e higienización' },
  { code: '90921000', label: 'Desinfección' },
  { code: '', label: 'Otro / No aplica' },
]

export default function NuevaOportunidadPage() {
  const navigate = useNavigate()
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState('')
  const [progreso, setProgreso] = useState('')

  const [form, setForm] = useState({
    tipo: '' as TipoOportunidad | '',
    titulo: '',
    organismo: '',
    contacto: '',
    email_contacto: '',
    cpv: '',
    presupuesto: '',
    fecha_limite: '',
    expediente: '',
    url: '',
    ubicacion: '',
    procedimiento: 'Abierto',
    descripcion: '',
    notas: '',
  })

  const [archivos, setArchivos] = useState<File[]>([])

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
    setGuardado(false)
  }

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setArchivos(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const removeFile = (index: number) => {
    setArchivos(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!form.tipo) { setError('Selecciona el tipo de oportunidad'); return }
    if (!form.titulo) { setError('El título es obligatorio'); return }
    if (!form.organismo) { setError('El organismo/empresa es obligatorio'); return }

    setGuardando(true)
    setError('')
    setProgreso('Guardando oportunidad...')

    try {
      // 1. Crear la oportunidad en el Sheets
      const resultado = await api.crearOportunidad({
        titulo: form.titulo,
        organismo: form.organismo,
        cpv: form.cpv,
        presupuesto: form.presupuesto ? parseFloat(form.presupuesto) : 0,
        fecha_limite: form.fecha_limite,
        procedimiento: form.procedimiento,
        url: form.url,
        descripcion: form.descripcion,
        fuente: form.tipo?.startsWith('privada') ? 'Privada' : 'Manual',
        notas: form.tipo + (form.contacto ? ' | Contacto: ' + form.contacto + ' ' + form.email_contacto : ''),
      })

      const oportunidadId = resultado.id || 'SIN_ID'

      // 2. Subir archivos a Google Drive
      if (archivos.length > 0) {
        for (let i = 0; i < archivos.length; i++) {
          setProgreso('Subiendo archivo ' + (i + 1) + ' de ' + archivos.length + ': ' + archivos[i].name + '...')
          try {
            await api.subirArchivo(archivos[i], oportunidadId)
          } catch (uploadErr) {
            console.error('Error subiendo ' + archivos[i].name, uploadErr)
          }
        }
      }

      setProgreso('')
      setGuardado(true)
      setTimeout(() => navigate('/oportunidades'), 2000)
    } catch (e) {
      setError('Error al guardar. Inténtalo de nuevo.')
      setProgreso('')
    } finally {
      setGuardando(false)
    }
  }

  const esPrivada = form.tipo?.startsWith('privada')

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/oportunidades')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nueva oportunidad</h1>
          <p className="text-slate-500 mt-0.5">Entrada manual de licitación o solicitud de presupuesto</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Tipo de oportunidad *</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TIPOS.map(tipo => (
            <button key={tipo.value} onClick={() => handleChange('tipo', tipo.value)}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                form.tipo === tipo.value
                  ? tipo.color === 'blue' ? 'border-blue-500 bg-blue-50' : 'border-purple-500 bg-purple-50'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                  tipo.color === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                }`}>{tipo.grupo}</span>
              </div>
              <p className="text-sm font-medium text-slate-900 mt-1">{tipo.label}</p>
            </button>
          ))}
        </div>
      </div>

      {form.tipo && (
        <>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Datos principales</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Título / Objeto del contrato *</label>
                <div className="relative">
                  <FileText size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input type="text" value={form.titulo} onChange={e => handleChange('titulo', e.target.value)}
                    placeholder="Ej: Servicio de limpieza de edificios municipales"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{esPrivada ? 'Empresa' : 'Organismo'} *</label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input type="text" value={form.organismo} onChange={e => handleChange('organismo', e.target.value)}
                    placeholder={esPrivada ? 'Ej: Grupo Hoteles XYZ S.L.' : 'Ej: Ayuntamiento de Sevilla'}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                </div>
              </div>

              {esPrivada && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Persona de contacto</label>
                    <div className="relative">
                      <Briefcase size={16} className="absolute left-3 top-3 text-slate-400" />
                      <input type="text" value={form.contacto} onChange={e => handleChange('contacto', e.target.value)}
                        placeholder="Nombre y apellidos"
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email de contacto</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                      <input type="email" value={form.email_contacto} onChange={e => handleChange('email_contacto', e.target.value)}
                        placeholder="email@empresa.com"
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{esPrivada ? 'Presupuesto estimado' : 'Presupuesto base (€)'}</label>
                  <div className="relative">
                    <Euro size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input type="number" value={form.presupuesto} onChange={e => handleChange('presupuesto', e.target.value)}
                      placeholder="1286912"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{esPrivada ? 'Fecha de respuesta' : 'Fecha límite presentación'}</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input type="date" value={form.fecha_limite} onChange={e => handleChange('fecha_limite', e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {!esPrivada && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">CPV</label>
                    <div className="relative">
                      <Tag size={16} className="absolute left-3 top-3 text-slate-400" />
                      <select value={form.cpv} onChange={e => handleChange('cpv', e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 appearance-none">
                        <option value="">Seleccionar CPV</option>
                        {CPVS_COMUNES.map(c => (
                          <option key={c.code} value={c.code}>{c.code ? c.code + ' — ' : ''}{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                <div className={esPrivada ? 'col-span-2' : ''}>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Ubicación</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input type="text" value={form.ubicacion} onChange={e => handleChange('ubicacion', e.target.value)}
                      placeholder="Ej: Sevilla, Dos Hermanas, Provincia de Cádiz..."
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                  </div>
                </div>
              </div>

              {!esPrivada && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nº Expediente</label>
                    <input type="text" value={form.expediente} onChange={e => handleChange('expediente', e.target.value)}
                      placeholder="Ej: 2026/001234"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">URL del anuncio</label>
                    <input type="url" value={form.url} onChange={e => handleChange('url', e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                  </div>
                </div>
              )}

              {!esPrivada && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Tipo de procedimiento</label>
                  <div className="flex gap-2 flex-wrap">
                    {['Abierto', 'Abierto simplificado', 'Restringido', 'Negociado', 'Menor', 'Otro'].map(proc => (
                      <button key={proc} onClick={() => handleChange('procedimiento', proc)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          form.procedimiento === proc ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}>{proc}</button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Descripción / Notas</label>
                <textarea value={form.descripcion} onChange={e => handleChange('descripcion', e.target.value)}
                  placeholder="Detalles adicionales, condiciones especiales, servicios solicitados..."
                  rows={3} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 resize-none" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">{esPrivada ? 'Documentación adjunta' : 'Pliegos y documentación'}</h2>
            <p className="text-xs text-slate-500 mb-3">
              {esPrivada ? 'Adjunta la solicitud, especificaciones, planos, etc.' : 'Adjunta los pliegos (PCAP, PPT), anexos. Se guardarán en Google Drive y el sistema los analizará con IA.'}
            </p>
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer">
              <Upload size={24} className="text-slate-400 mb-2" />
              <span className="text-sm text-slate-600 font-medium">Arrastra archivos o haz clic</span>
              <span className="text-xs text-slate-400 mt-1">PDF, DOC, DOCX, XLS, XLSX (máx 10MB)</span>
              <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={handleFiles} className="hidden" />
            </label>
            {archivos.length > 0 && (
              <div className="mt-3 space-y-2">
                {archivos.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
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
              <CheckCircle2 size={16} className="shrink-0" />Oportunidad guardada en Google Sheets{archivos.length > 0 ? ' y archivos subidos a Google Drive' : ''}. Redirigiendo...
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={() => navigate('/oportunidades')}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
            <button onClick={handleSubmit} disabled={guardando || guardado}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
              {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {guardando ? 'Guardando...' : 'Guardar oportunidad'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}