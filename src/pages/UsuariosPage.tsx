import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  Users, Loader2, CheckCircle2, AlertTriangle, X, Plus, Save,
  Trash2, Edit3, Shield, Mail, Eye, EyeOff, UserPlus
} from 'lucide-react'

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin', nivel: 1, color: 'bg-red-100 text-red-700' },
  { value: 'ADMIN_LICITACIONES', label: 'Admin Licitaciones', nivel: 2, color: 'bg-orange-100 text-orange-700' },
  { value: 'ADMIN_RRHH', label: 'Admin RRHH', nivel: 2, color: 'bg-orange-100 text-orange-700' },
  { value: 'ADMIN_TERRITORIO', label: 'Admin Territorio', nivel: 2, color: 'bg-orange-100 text-orange-700' },
  { value: 'DIRECTOR_GERENTE', label: 'Director / Gerente', nivel: 2, color: 'bg-amber-100 text-amber-700' },
  { value: 'RESPONSABLE_COMERCIAL', label: 'Resp. Comercial', nivel: 3, color: 'bg-blue-100 text-blue-700' },
  { value: 'RESPONSABLE_PRL', label: 'Resp. PRL', nivel: 3, color: 'bg-blue-100 text-blue-700' },
  { value: 'RESPONSABLE_RGPD', label: 'Resp. RGPD', nivel: 3, color: 'bg-blue-100 text-blue-700' },
  { value: 'SUPERVISOR_TERRITORIO', label: 'Supervisor Territorio', nivel: 3, color: 'bg-blue-100 text-blue-700' },
  { value: 'ENCARGADO_ZONA', label: 'Encargado de Zona', nivel: 4, color: 'bg-green-100 text-green-700' },
  { value: 'TRABAJADOR_CAMPO', label: 'Trabajador Campo', nivel: 5, color: 'bg-gray-100 text-gray-600' },
  { value: 'TRABAJADOR_LECTURA', label: 'Solo Lectura', nivel: 5, color: 'bg-gray-100 text-gray-600' },
]

const MODULOS_POR_ROL: Record<string, string[]> = {
  SUPER_ADMIN: ['Licitaciones', 'RRHH', 'PRL', 'RGPD', 'Territorio', 'Usuarios'],
  ADMIN_LICITACIONES: ['Licitaciones'],
  ADMIN_RRHH: ['RRHH', 'PRL', 'RGPD'],
  ADMIN_TERRITORIO: ['Territorio'],
  DIRECTOR_GERENTE: ['Licitaciones (lectura)', 'RRHH (lectura)', 'Territorio (lectura)', 'Dashboards'],
  RESPONSABLE_COMERCIAL: ['Licitaciones'],
  RESPONSABLE_PRL: ['PRL'],
  RESPONSABLE_RGPD: ['RGPD'],
  SUPERVISOR_TERRITORIO: ['Territorio (su zona)'],
  ENCARGADO_ZONA: ['Territorio (su zona)', 'Incidencias'],
  TRABAJADOR_CAMPO: ['PWA campo', 'Mis centros', 'Tareas'],
  TRABAJADOR_LECTURA: ['Solo consulta'],
}

const emptyForm = { nombre: '', email: '', password: 'Forgeser2026', rol: 'TRABAJADOR_LECTURA', activo: true }

export default function UsuariosPage() {
  const { usuario } = useAuth()
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [formNuevo, setFormNuevo] = useState<any>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [formEdit, setFormEdit] = useState<any>(null)
  const [showPass, setShowPass] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const cargar = async () => {
    setCargando(true)
    try {
      const data = await api.usuarios()
      setUsuarios(data.usuarios || [])
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  const handleAgregar = async () => {
    if (!formNuevo?.nombre || !formNuevo?.email) { setError('Nombre y email son obligatorios'); return }
    setGuardando(true); setError('')
    try {
      const r = await api.addUsuario(formNuevo)
      if (r.ok) { setMensaje('Usuario ' + r.nombre + ' creado'); setFormNuevo(null); await cargar() }
      else setError(r.error || 'Error')
    } catch (e) { setError('Error creando usuario') }
    finally { setGuardando(false) }
  }

  const handleEditar = async () => {
    if (!formEdit) return
    setGuardando(true); setError('')
    try {
      const r = await api.updateUsuario(formEdit)
      if (r.ok) { setMensaje('Usuario actualizado'); setEditando(null); setFormEdit(null); await cargar() }
      else setError(r.error || 'Error')
    } catch (e) { setError('Error actualizando') }
    finally { setGuardando(false) }
  }

  const handleEliminar = async (email: string) => {
    if (email === usuario?.email) { setError('No puedes eliminarte a ti mismo'); setConfirmDelete(null); return }
    setGuardando(true); setError('')
    try {
      const r = await api.deleteUsuario(email)
      if (r.ok) { setMensaje('Usuario eliminado'); setConfirmDelete(null); await cargar() }
      else setError(r.error || 'Error')
    } catch (e) { setError('Error eliminando') }
    finally { setGuardando(false) }
  }

  const handleToggleActivo = async (u: any) => {
    try {
      await api.updateUsuario({ email: u.email, activo: !u.activo })
      await cargar()
    } catch (e) { console.error(e) }
  }

  const getRolInfo = (rol: string) => ROLES.find(r => r.value === rol) || ROLES[ROLES.length - 1]

  if (cargando) return (<div className="flex flex-col items-center py-20"><Loader2 size={32} className="text-[#1a3c34] animate-spin mb-3" /><p className="text-slate-500">Cargando usuarios...</p></div>)

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e] rounded-xl shadow-lg"><Users size={22} className="text-white" /></div>
          <div><h1 className="text-2xl font-bold text-slate-900">Gestión de usuarios</h1><p className="text-sm text-slate-500">{usuarios.length} usuarios registrados</p></div>
        </div>
        <button onClick={() => setFormNuevo({ ...emptyForm })}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#1a3c34] hover:bg-[#2d5a4e] rounded-xl">
          <UserPlus size={16} /> Nuevo usuario
        </button>
      </div>

      {mensaje && <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4"><CheckCircle2 size={16} className="text-emerald-600" /><span className="text-sm text-emerald-800">{mensaje}</span><button onClick={() => setMensaje('')} className="ml-auto"><X size={14} /></button></div>}
      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4"><AlertTriangle size={16} className="text-red-600" /><span className="text-sm text-red-800">{error}</span><button onClick={() => setError('')} className="ml-auto"><X size={14} /></button></div>}

      {/* Form nuevo usuario */}
      {formNuevo && (
        <div className="bg-[#1a3c34]/5 border border-[#2d5a4e]/20 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Nuevo usuario</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Nombre completo *</label>
              <input type="text" value={formNuevo.nombre} onChange={e => setFormNuevo({ ...formNuevo, nombre: e.target.value })}
                placeholder="Antonio García" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Email *</label>
              <input type="email" value={formNuevo.email} onChange={e => setFormNuevo({ ...formNuevo, email: e.target.value })}
                placeholder="usuario@forgeser.com" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Contraseña</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={formNuevo.password} onChange={e => setFormNuevo({ ...formNuevo, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white pr-8" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Rol</label>
              <select value={formNuevo.rol} onChange={e => setFormNuevo({ ...formNuevo, rol: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                {ROLES.map(r => <option key={r.value} value={r.value}>Nivel {r.nivel} — {r.label}</option>)}
              </select>
            </div>
          </div>
          {formNuevo.rol && (
            <div className="mb-4 p-3 bg-white rounded-xl border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase mb-1">Acceso a módulos</p>
              <div className="flex flex-wrap gap-1.5">
                {(MODULOS_POR_ROL[formNuevo.rol] || []).map((m, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 bg-[#1a3c34]/10 text-[#1a3c34] rounded-full">{m}</span>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handleAgregar} disabled={guardando}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-[#1a3c34] hover:bg-[#2d5a4e] disabled:bg-slate-400 rounded-lg">
              {guardando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Crear usuario
            </button>
            <button onClick={() => setFormNuevo(null)} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg">Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista usuarios */}
      <div className="space-y-2">
        {usuarios.map((u, i) => {
          const rolInfo = getRolInfo(u.rol)
          const isEditing = editando === u.email
          const isMe = u.email === usuario?.email

          return (
            <div key={i} className={`bg-white border rounded-2xl overflow-hidden ${!u.activo ? 'opacity-50 border-slate-200' : 'border-slate-200'}`}>
              {!isEditing ? (
                <div className="flex items-center gap-4 p-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${u.activo ? 'bg-[#1a3c34] text-white' : 'bg-slate-300 text-white'}`}>
                    {u.nombre.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{u.nombre}</p>
                      {isMe && <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full font-medium">Tú</span>}
                      {!u.activo && <span className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">Inactivo</span>}
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1"><Mail size={10} />{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${rolInfo.color}`}>
                      <Shield size={10} className="inline mr-1" />{rolInfo.label}
                    </span>
                    <span className="text-[10px] text-slate-300">N{u.nivel}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleToggleActivo(u)} title={u.activo ? 'Desactivar' : 'Activar'}
                      className={`w-10 h-5 rounded-full transition-colors relative ${u.activo ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${u.activo ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                    <button onClick={() => { setEditando(u.email); setFormEdit({ email: u.email, nombre: u.nombre, rol: u.rol, password: '' }) }}
                      className="p-1.5 text-slate-400 hover:text-[#1a3c34] hover:bg-[#1a3c34]/5 rounded-lg"><Edit3 size={14} /></button>
                    {!isMe && (
                      confirmDelete === u.email ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEliminar(u.email)} className="px-2 py-1 text-[10px] text-white bg-red-500 rounded">Sí</button>
                          <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 text-[10px] text-slate-500 bg-slate-100 rounded">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(u.email)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[#1a3c34]/5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase">Nombre</label>
                      <input type="text" value={formEdit.nombre} onChange={e => setFormEdit({ ...formEdit, nombre: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase">Rol</label>
                      <select value={formEdit.rol} onChange={e => setFormEdit({ ...formEdit, rol: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                        {ROLES.map(r => <option key={r.value} value={r.value}>N{r.nivel} — {r.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase">Nueva contraseña (dejar vacío = no cambiar)</label>
                      <input type="text" value={formEdit.password} onChange={e => setFormEdit({ ...formEdit, password: e.target.value })}
                        placeholder="Sin cambios" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleEditar} disabled={guardando}
                      className="flex items-center gap-1 px-4 py-2 text-xs font-medium text-white bg-[#1a3c34] hover:bg-[#2d5a4e] rounded-lg">
                      {guardando ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Guardar
                    </button>
                    <button onClick={() => { setEditando(null); setFormEdit(null) }} className="px-4 py-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {usuarios.length === 0 && !cargando && (
        <div className="text-center py-16">
          <Users size={48} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No hay usuarios</p>
          <p className="text-sm text-slate-400">Crea el primer usuario con el botón de arriba</p>
        </div>
      )}
    </div>
  )
}