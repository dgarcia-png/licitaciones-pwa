// src/components/FestivosManager.tsx
// ═══════════════════════════════════════════════════════════════════════════
// Gestión de festivos: nacionales, autonómicos, locales, convenio, empresa
// Se usa como tab dentro de ConfiguracionPage
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { api } from '../services/api'
import {
  Calendar, Plus, Loader2, CheckCircle2, AlertTriangle, X, Save,
  Trash2, RefreshCw, Download, Globe, MapPin, Building2, FileText, Star
} from 'lucide-react'

const TIPO_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  nacional:   { label: 'Nacional (BOE)',     icon: Globe,     color: 'text-red-700',     bg: 'bg-red-100' },
  autonomico: { label: 'Autonómico (BOJA)',  icon: Star,      color: 'text-purple-700',  bg: 'bg-purple-100' },
  local:      { label: 'Local (BOP)',        icon: MapPin,    color: 'text-blue-700',    bg: 'bg-blue-100' },
  convenio:   { label: 'Convenio',           icon: FileText,  color: 'text-amber-700',   bg: 'bg-amber-100' },
  empresa:    { label: 'Empresa',            icon: Building2, color: 'text-emerald-700',  bg: 'bg-emerald-100' },
}

const FORM_VACIO = { fecha: '', descripcion: '', tipo: 'local', ambito: '' }

export default function FestivosManager() {
  const [festivos, setFestivos] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState<any>(FORM_VACIO)
  const [filtroAnio, setFiltroAnio] = useState(String(new Date().getFullYear()))
  const [filtroTipo, setFiltroTipo] = useState('')
  const [cargandoAuto, setCargandoAuto] = useState(false)
  const [editandoId, setEditandoId] = useState<string|null>(null)

  const showMsg = (m: string, err = false) => {
    if (err) setError(m); else setMsg(m)
    setTimeout(() => { setMsg(''); setError('') }, 4000)
  }

  const cargar = async () => {
    setCargando(true)
    try {
      const r = await api.festivos(filtroAnio || undefined, filtroTipo || undefined)
      setFestivos(r.festivos || [])
      setStats(r.stats || {})
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [filtroAnio, filtroTipo])

  const handleCargarNacionales = async (anio: number) => {
    setCargandoAuto(true)
    try {
      const r = await api.cargarFestivosNacionales(anio)
      if (r.ok) { showMsg(`✅ ${r.creados} festivos añadidos para ${anio}`); cargar() }
      else showMsg(r.error || 'Error', true)
    } catch (e) { showMsg('Error cargando festivos', true) }
    finally { setCargandoAuto(false) }
  }

  const handleGuardar = async () => {
    if (!form.fecha || !form.descripcion) { showMsg('Fecha y descripción obligatorios', true); return }
    setGuardando(true)
    try {
      if (editandoId) {
        const r = await api.actualizarFestivo({ id: editandoId, ...form })
        if (r.ok) { showMsg('✅ Festivo actualizado'); setEditandoId(null) }
        else showMsg(r.error || 'Error', true)
      } else {
        const r = await api.crearFestivo(form)
        if (r.ok) showMsg('✅ Festivo añadido')
        else showMsg(r.error || 'Error', true)
      }
      setMostrarForm(false); setForm(FORM_VACIO); cargar()
    } catch (e) { showMsg('Error', true) }
    finally { setGuardando(false) }
  }

  const handleEliminar = async (id: string, desc: string) => {
    if (!confirm(`¿Eliminar "${desc}"?`)) return
    try {
      const r = await api.eliminarFestivo(id)
      if (r.ok) { showMsg('Eliminado'); cargar() }
    } catch (e) { showMsg('Error', true) }
  }

  const handleEditar = (f: any) => {
    setForm({ fecha: f.fecha, descripcion: f.descripcion, tipo: f.tipo, ambito: f.ambito })
    setEditandoId(f.id)
    setMostrarForm(true)
  }

  const toggleActivo = async (f: any) => {
    try {
      await api.actualizarFestivo({ id: f.id, activo: !f.activo })
      cargar()
    } catch (e) {}
  }

  const anioActual = new Date().getFullYear()
  const totalFestivos = festivos.length
  const festivosActivos = festivos.filter(f => f.activo).length

  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <p className="text-xs text-blue-700">
          Gestiona los festivos que afectan a planificación, fichajes y ausencias.
          Los <strong>nacionales y autonómicos</strong> se cargan automáticamente.
          Añade manualmente los <strong>locales</strong> de cada municipio y los <strong>de convenio</strong>.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {Object.entries(TIPO_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon
          const count = stats[key] || 0
          return (
            <div key={key} className={`${cfg.bg} rounded-xl p-3 text-center`}>
              <Icon size={16} className={`${cfg.color} mx-auto mb-1`} />
              <p className={`text-lg font-black ${cfg.color}`}>{count}</p>
              <p className="text-[10px] font-semibold text-slate-600">{cfg.label}</p>
            </div>
          )
        })}
      </div>

      {/* Controles */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={filtroAnio} onChange={e => setFiltroAnio(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
          {[anioActual - 1, anioActual, anioActual + 1, anioActual + 2].map(a => (
            <option key={a} value={String(a)}>{a}</option>
          ))}
          <option value="">Todos</option>
        </select>

        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <button onClick={cargar} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl">
          <RefreshCw size={16} />
        </button>

        <div className="flex-1" />

        <div className="flex gap-2">
          <button onClick={() => handleCargarNacionales(parseInt(filtroAnio) || anioActual)}
            disabled={cargandoAuto}
            className="flex items-center gap-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold rounded-xl">
            {cargandoAuto ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            Cargar nacionales {filtroAnio || anioActual}
          </button>

          <button onClick={() => { setForm(FORM_VACIO); setEditandoId(null); setMostrarForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a3c34] hover:bg-[#2d5a4e] text-white text-xs font-bold rounded-xl">
            <Plus size={14} /> Añadir festivo
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {msg && <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700"><CheckCircle2 size={15} />{msg}</div>}
      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"><AlertTriangle size={15} />{error}</div>}

      {/* Form */}
      {mostrarForm && (
        <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-slate-800">
              {editandoId ? 'Editar festivo' : 'Nuevo festivo'}
            </p>
            <button onClick={() => { setMostrarForm(false); setEditandoId(null); setForm(FORM_VACIO) }}>
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Fecha *</label>
              <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Tipo *</label>
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                {Object.entries(TIPO_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Descripción *</label>
              <input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Ej: Feria de Almonte, Patrona de Huelva..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Ámbito {form.tipo === 'local' ? '(municipio)' : form.tipo === 'convenio' ? '(convenio)' : ''}
              </label>
              <input value={form.ambito} onChange={e => setForm({ ...form, ambito: e.target.value })}
                placeholder={
                  form.tipo === 'local' ? 'Ej: Almonte' :
                  form.tipo === 'convenio' ? 'Ej: Limpieza Huelva' :
                  form.tipo === 'autonomico' ? 'Andalucía' :
                  form.tipo === 'nacional' ? 'España' : 'Forgeser'
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            </div>
          </div>
          <button onClick={handleGuardar} disabled={guardando}
            className="w-full py-2.5 bg-[#1a3c34] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
            {guardando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {editandoId ? 'Actualizar' : 'Añadir festivo'}
          </button>
        </div>
      )}

      {/* Lista */}
      {cargando ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-[#1a3c34]" /></div>
      ) : festivos.length === 0 ? (
        <div className="flex flex-col items-center py-12 bg-white border border-slate-200 rounded-2xl">
          <Calendar size={36} className="text-slate-300 mb-3" />
          <p className="text-slate-500">Sin festivos para {filtroAnio || 'este período'}</p>
          <button onClick={() => handleCargarNacionales(parseInt(filtroAnio) || anioActual)}
            className="mt-3 text-sm text-blue-600 hover:underline font-semibold">
            Cargar festivos nacionales automáticamente
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-600">{festivosActivos} activos de {totalFestivos} total</p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 w-24">Fecha</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Descripción</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 w-32">Tipo</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 w-28">Ámbito</th>
                <th className="text-center px-2 py-2.5 font-semibold text-slate-500 w-16">Activo</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {festivos.map((f: any) => {
                const cfg = TIPO_CONFIG[f.tipo] || TIPO_CONFIG.empresa
                const Icon = cfg.icon
                const fechaDisplay = f.fecha ? new Date(f.fecha + 'T12:00:00').toLocaleDateString('es-ES', {
                  weekday: 'short', day: '2-digit', month: 'short'
                }) : '—'
                return (
                  <tr key={f.id} className={`border-b border-slate-50 hover:bg-slate-50 ${!f.activo ? 'opacity-40' : ''}`}>
                    <td className="px-4 py-2 font-mono font-semibold text-slate-800">{fechaDisplay}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => handleEditar(f)} className="text-slate-800 font-medium hover:text-blue-600 text-left">
                        {f.descripcion}
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>
                        <Icon size={10} /> {cfg.label.split(' ')[0]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-500">{f.ambito || '—'}</td>
                    <td className="px-2 py-2 text-center">
                      <button onClick={() => toggleActivo(f)}
                        className={`w-4 h-4 rounded border-2 ${f.activo ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`} />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button onClick={() => handleEliminar(f.id, f.descripcion)}
                        className="text-red-300 hover:text-red-600 p-1">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
