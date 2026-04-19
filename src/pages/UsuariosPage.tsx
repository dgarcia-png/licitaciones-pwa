// src/pages/UsuariosPage.tsx — v2.0 (20/04/2026)
// [F-NEW-2] CRUD usuarios + asignación de rol + toggle activo + matriz permisos
import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  Users, Loader2, CheckCircle2, AlertTriangle, X, Plus, Save,
  Trash2, Edit3, Shield, Mail, Eye, EyeOff, UserPlus, ToggleLeft,
  ToggleRight, Settings, ChevronDown, ChevronUp, RefreshCw, Key
} from 'lucide-react'

const ROLES = [
  { value: 'SUPER_ADMIN',           label: 'Super Admin',           nivel: 1, color: 'bg-red-100 text-red-700' },
  { value: 'ADMIN_LICITACIONES',    label: 'Admin Licitaciones',    nivel: 2, color: 'bg-orange-100 text-orange-700' },
  { value: 'ADMIN_RRHH',            label: 'Admin RRHH',            nivel: 2, color: 'bg-orange-100 text-orange-700' },
  { value: 'ADMIN_TERRITORIO',      label: 'Admin Territorio',      nivel: 2, color: 'bg-orange-100 text-orange-700' },
  { value: 'DIRECTOR_GERENTE',      label: 'Director / Gerente',    nivel: 2, color: 'bg-amber-100 text-amber-700' },
  { value: 'RESPONSABLE_COMERCIAL', label: 'Resp. Comercial',       nivel: 3, color: 'bg-blue-100 text-blue-700' },
  { value: 'RESPONSABLE_PRL',       label: 'Resp. PRL',             nivel: 3, color: 'bg-blue-100 text-blue-700' },
  { value: 'RESPONSABLE_RGPD',      label: 'Resp. RGPD',            nivel: 3, color: 'bg-blue-100 text-blue-700' },
  { value: 'SUPERVISOR_TERRITORIO', label: 'Supervisor Territorio', nivel: 3, color: 'bg-blue-100 text-blue-700' },
  { value: 'ENCARGADO_ZONA',        label: 'Encargado de Zona',     nivel: 4, color: 'bg-green-100 text-green-700' },
  { value: 'TRABAJADOR_CAMPO',      label: 'Trabajador Campo',      nivel: 5, color: 'bg-gray-100 text-gray-600' },
  { value: 'TRABAJADOR_LECTURA',    label: 'Solo Lectura',          nivel: 5, color: 'bg-gray-100 text-gray-600' },
]

const MODULOS_DISPONIBLES = [
  { id: 'licitaciones',    label: 'Licitaciones (escritura)' },
  { id: 'licitaciones_ro', label: 'Licitaciones (solo lectura)' },
  { id: 'rrhh',            label: 'RRHH (escritura)' },
  { id: 'rrhh_ro',         label: 'RRHH (solo lectura)' },
  { id: 'prl',             label: 'PRL' },
  { id: 'rgpd',            label: 'RGPD' },
  { id: 'territorio',      label: 'Territorio (escritura)' },
  { id: 'territorio_ro',   label: 'Territorio (solo lectura)' },
  { id: 'territorio_zona', label: 'Territorio (solo su zona)' },
  { id: 'incidencias',     label: 'Incidencias' },
  { id: 'usuarios',        label: 'Gestión de usuarios' },
  { id: 'config',          label: 'Configuración' },
  { id: 'informes',        label: 'Informes' },
  { id: 'portal_campo',    label: 'Portal operario campo' },
]

function rolColor(rol: string) {
  return ROLES.find(r => r.value === rol)?.color || 'bg-gray-100 text-gray-600'
}
function rolLabel(rol: string) {
  return ROLES.find(r => r.value === rol)?.label || rol
}

const emptyForm = { nombre: '', email: '', password: 'Forgeser2026!', rol: 'TRABAJADOR_LECTURA', activo: true }

export default function UsuariosPage() {
  const { usuario } = useAuth()
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'usuarios' | 'roles'>('usuarios')

  // Formulario nuevo usuario
  const [formNuevo, setFormNuevo] = useState<any>(null)
  const [showPass, setShowPass] = useState(false)

  // Edición inline
  const [editando, setEditando] = useState<string | null>(null)
  const [formEdit, setFormEdit] = useState<any>(null)

  // Confirmaciones
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmRol, setConfirmRol] = useState<{ id: string; rol: string } | null>(null)

  // Matriz de roles
  const [rolesConfig, setRolesConfig] = useState<any>({})
  const [cargandoRoles, setCargandoRoles] = useState(false)
  const [rolExpandido, setRolExpandido] = useState<string | null>(null)
  const [guardandoRol, setGuardandoRol] = useState<string | null>(null)

  const esSuperAdmin = usuario?.rol === 'SUPER_ADMIN'

  const mostrarMsg = (m: string) => { setMensaje(m); setTimeout(() => setMensaje(''), 3000) }
  const mostrarErr = (e: string) => { setError(e); setTimeout(() => setError(''), 4000) }

  const cargar = async () => {
    setCargando(true)
    try {
      const data = await api.usuarios()
      setUsuarios(data.usuarios || [])
    } catch { mostrarErr('Error cargando usuarios') }
    finally { setCargando(false) }
  }

  const cargarRoles = async () => {
    setCargandoRoles(true)
    try {
      const data = await api.rolesConfig()
      setRolesConfig(data.roles || {})
    } catch { mostrarErr('Error cargando configuración de roles') }
    finally { setCargandoRoles(false) }
  }

  useEffect(() => { cargar() }, [])
  useEffect(() => { if (tab === 'roles') cargarRoles() }, [tab])

  // ── Crear usuario ─────────────────────────────────────────────────────────

  const handleCrear = async () => {
    if (!formNuevo?.email || !formNuevo?.rol) return mostrarErr('Email y rol son obligatorios')
    setGuardando(true)
    try {
      const r = await api.addUsuario(formNuevo)
      if (r.ok) {
        mostrarMsg('✅ Usuario creado')
        setFormNuevo(null)
        await cargar()
      } else mostrarErr(r.error || 'Error al crear')
    } catch { mostrarErr('Error de conexión') }
    finally { setGuardando(false) }
  }

  // ── Editar usuario ────────────────────────────────────────────────────────

  const handleEditar = async () => {
    if (!editando || !formEdit) return
    setGuardando(true)
    try {
      const r = await api.updateUsuario({ ...formEdit, email: formEdit.email })
      if (r.ok) {
        mostrarMsg('✅ Guardado')
        setEditando(null)
        setFormEdit(null)
        await cargar()
      } else mostrarErr(r.error || 'Error')
    } catch { mostrarErr('Error de conexión') }
    finally { setGuardando(false) }
  }

  // ── Cambiar rol ───────────────────────────────────────────────────────────

  const handleCambiarRol = async (id: string, rol: string) => {
    setGuardando(true)
    try {
      const r = await api.cambiarRol(id, rol)
      if (r.ok) {
        mostrarMsg(`✅ Rol cambiado a ${rolLabel(rol)}${r.sesiones_cerradas > 0 ? ` · ${r.sesiones_cerradas} sesión(es) cerrada(s)` : ''}`)
        setConfirmRol(null)
        await cargar()
      } else mostrarErr(r.error || 'Error')
    } catch { mostrarErr('Error de conexión') }
    finally { setGuardando(false) }
  }

  // ── Toggle activo ─────────────────────────────────────────────────────────

  const handleToggleActivo = async (u: any) => {
    setGuardando(true)
    try {
      const r = await api.cambiarActivo(u.id, !u.activo)
      if (r.ok) {
        mostrarMsg(u.activo ? '⚠️ Usuario desactivado' : '✅ Usuario reactivado')
        await cargar()
      } else mostrarErr(r.error || 'Error')
    } catch { mostrarErr('Error de conexión') }
    finally { setGuardando(false) }
  }

  // ── Eliminar usuario ──────────────────────────────────────────────────────

  const handleEliminar = async (id: string) => {
    setGuardando(true)
    try {
      const r = await api.deleteUsuario(id)
      if (r.ok) { mostrarMsg('✅ Usuario desactivado'); setConfirmDelete(null); await cargar() }
      else mostrarErr(r.error || 'Error')
    } catch { mostrarErr('Error de conexión') }
    finally { setGuardando(false) }
  }

  // ── Guardar módulos de un rol ─────────────────────────────────────────────

  const handleGuardarRol = async (nombre: string, modulos: string[]) => {
    setGuardandoRol(nombre)
    try {
      const r = await api.updateRolConfig(nombre, { modulos })
      if (r.ok) { mostrarMsg('✅ Permisos guardados'); await cargarRoles() }
      else mostrarErr(r.error || 'Error')
    } catch { mostrarErr('Error de conexión') }
    finally { setGuardandoRol(null) }
  }

  // ── Backfill nivel ────────────────────────────────────────────────────────

  const handleBackfill = async () => {
    try {
      const r = await api.backfillNivel()
      if (r.ok) mostrarMsg(`✅ Nivel actualizado en ${r.actualizados} usuario(s)`)
      else mostrarErr(r.error || 'Error')
    } catch { mostrarErr('Error') }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1a3c34] rounded-xl flex items-center justify-center">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Usuarios</h1>
            <p className="text-xs text-slate-500">{usuarios.length} usuarios registrados</p>
          </div>
        </div>
        <div className="flex gap-2">
          {esSuperAdmin && (
            <button onClick={() => setFormNuevo(emptyForm)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#1a3c34] hover:bg-[#2d5a4e] rounded-lg">
              <UserPlus size={14} /> Nuevo usuario
            </button>
          )}
        </div>
      </div>

      {/* Mensajes */}
      {mensaje && <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4"><CheckCircle2 size={16} className="text-emerald-600" /><span className="text-sm text-emerald-800">{mensaje}</span><button onClick={() => setMensaje('')} className="ml-auto"><X size={14} /></button></div>}
      {error   && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4"><AlertTriangle size={16} className="text-red-600" /><span className="text-sm text-red-800">{error}</span><button onClick={() => setError('')} className="ml-auto"><X size={14} /></button></div>}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6 w-fit">
        <button onClick={() => setTab('usuarios')} className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${tab === 'usuarios' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
          <Users size={12} className="inline mr-1" />Usuarios
        </button>
        {esSuperAdmin && (
          <button onClick={() => setTab('roles')} className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${tab === 'roles' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            <Shield size={12} className="inline mr-1" />Matriz de roles
          </button>
        )}
      </div>

      {/* ── TAB USUARIOS ── */}
      {tab === 'usuarios' && (
        <>
          {/* Formulario nuevo usuario */}
          {formNuevo && (
            <div className="bg-white border border-[#1a3c34]/20 rounded-2xl p-5 mb-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2"><UserPlus size={14} className="text-[#1a3c34]" /> Nuevo usuario</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Nombre</label>
                  <input value={formNuevo.nombre} onChange={e => setFormNuevo({ ...formNuevo, nombre: e.target.value })}
                    placeholder="Nombre completo" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Email *</label>
                  <input value={formNuevo.email} onChange={e => setFormNuevo({ ...formNuevo, email: e.target.value })}
                    placeholder="usuario@forgeser.es" type="email" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Contraseña inicial</label>
                  <div className="relative">
                    <input value={formNuevo.password} onChange={e => setFormNuevo({ ...formNuevo, password: e.target.value })}
                      type={showPass ? 'text' : 'password'} className="w-full px-3 py-2 pr-8 border border-slate-200 rounded-lg text-sm bg-white" />
                    <button onClick={() => setShowPass(!showPass)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Rol *</label>
                  <select value={formNuevo.rol} onChange={e => setFormNuevo({ ...formNuevo, rol: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label} (N{r.nivel})</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCrear} disabled={guardando}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1a3c34] hover:bg-[#2d5a4e] rounded-lg disabled:opacity-60">
                  {guardando ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Crear usuario
                </button>
                <button onClick={() => setFormNuevo(null)} className="px-4 py-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg">Cancelar</button>
              </div>
            </div>
          )}

          {/* Lista de usuarios */}
          {cargando ? (
            <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#1a3c34]" /></div>
          ) : (
            <div className="space-y-2">
              {usuarios.map(u => (
                <div key={u.id} className={`bg-white border rounded-2xl p-4 transition-all ${!u.activo ? 'opacity-60 border-slate-200' : 'border-slate-200 hover:border-[#1a3c34]/30'}`}>
                  {editando === u.id && formEdit ? (
                    // Formulario edición
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase">Nombre</label>
                          <input value={formEdit.nombre} onChange={e => setFormEdit({ ...formEdit, nombre: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase">Email</label>
                          <input value={formEdit.email} disabled className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-400" />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase">Rol</label>
                          <select value={formEdit.rol} onChange={e => setFormEdit({ ...formEdit, rol: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase">Nueva contraseña (vacío = sin cambios)</label>
                          <input type="text" value={formEdit.password || ''} onChange={e => setFormEdit({ ...formEdit, password: e.target.value })}
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
                  ) : (
                    // Vista normal
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#1a3c34]/10 flex items-center justify-center text-[#1a3c34] font-bold text-sm flex-shrink-0">
                        {(u.nombre || u.email || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-900 truncate">{u.nombre || '(sin nombre)'}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${rolColor(u.rol)}`}>{rolLabel(u.rol)}</span>
                          {!u.activo && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full font-medium">Inactivo</span>}
                          {u.email === usuario?.email && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-full font-medium">Tú</span>}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Mail size={10} className="text-slate-400" />
                          <span className="text-xs text-slate-500 truncate">{u.email}</span>
                          {u.nivel && <span className="text-[10px] text-slate-400 ml-2">N{u.nivel}</span>}
                        </div>
                      </div>
                      {esSuperAdmin && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Cambio rápido de rol */}
                          {confirmRol?.id === u.id ? (
                            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-lg p-2">
                              <select value={confirmRol.rol} onChange={e => setConfirmRol({ id: u.id, rol: e.target.value })}
                                className="text-xs border-0 bg-transparent">
                                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                              </select>
                              <button onClick={() => handleCambiarRol(u.id, confirmRol.rol)} disabled={guardando}
                                className="px-2 py-1 text-[10px] font-medium text-white bg-[#1a3c34] rounded">OK</button>
                              <button onClick={() => setConfirmRol(null)} className="p-1 text-slate-400 hover:text-slate-600"><X size={12} /></button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmRol({ id: u.id, rol: u.rol })}
                              title="Cambiar rol" className="p-1.5 text-slate-400 hover:text-[#1a3c34] hover:bg-slate-50 rounded-lg">
                              <Key size={14} />
                            </button>
                          )}
                          {/* Toggle activo */}
                          <button onClick={() => handleToggleActivo(u)} disabled={guardando || u.email === usuario?.email}
                            title={u.activo ? 'Desactivar' : 'Reactivar'}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg disabled:opacity-30">
                            {u.activo ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} />}
                          </button>
                          {/* Editar */}
                          <button onClick={() => { setEditando(u.id); setFormEdit({ ...u, password: '' }) }}
                            className="p-1.5 text-slate-400 hover:text-[#1a3c34] hover:bg-slate-50 rounded-lg">
                            <Edit3 size={14} />
                          </button>
                          {/* Eliminar */}
                          {confirmDelete === u.id ? (
                            <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg p-1">
                              <span className="text-[10px] text-red-700">¿Desactivar?</span>
                              <button onClick={() => handleEliminar(u.id)} className="px-2 py-0.5 text-[10px] text-white bg-red-500 rounded">Sí</button>
                              <button onClick={() => setConfirmDelete(null)} className="px-2 py-0.5 text-[10px] text-slate-600 bg-white border border-slate-200 rounded">No</button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDelete(u.id)} disabled={u.email === usuario?.email}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {usuarios.length === 0 && (
                <div className="text-center py-16">
                  <Users size={48} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No hay usuarios</p>
                </div>
              )}
            </div>
          )}

          {/* Backfill nivel */}
          {esSuperAdmin && (
            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-700">Mantenimiento</p>
                  <p className="text-[10px] text-slate-500">Rellena el campo "nivel" en usuarios que no lo tengan</p>
                </div>
                <button onClick={handleBackfill} className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
                  <RefreshCw size={12} /> Backfill nivel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── TAB MATRIZ DE ROLES ── */}
      {tab === 'roles' && esSuperAdmin && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500">Configura qué módulos puede ver cada rol. Los cambios se aplican en el próximo inicio de sesión.</p>
            <button onClick={cargarRoles} disabled={cargandoRoles} className="p-1.5 text-slate-400 hover:text-[#1a3c34] rounded-lg">
              <RefreshCw size={14} className={cargandoRoles ? 'animate-spin' : ''} />
            </button>
          </div>

          {cargandoRoles ? (
            <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-[#1a3c34]" /></div>
          ) : (
            ROLES.map(rol => {
              const cfg = rolesConfig[rol.value] || {}
              const modulosActivos: string[] = cfg.modulos || []
              const expandido = rolExpandido === rol.value

              return (
                <div key={rol.value} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <button onClick={() => setRolExpandido(expandido ? null : rol.value)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${rol.color}`}>{rol.label}</span>
                      <span className="text-[10px] text-slate-400">N{rol.nivel} · {modulosActivos.length} módulo(s)</span>
                    </div>
                    {expandido ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                  </button>

                  {expandido && (
                    <div className="px-4 pb-4 border-t border-slate-100">
                      <p className="text-[10px] text-slate-500 mt-3 mb-2 uppercase">Módulos accesibles</p>
                      <RolModulosEditor
                        rolNombre={rol.value}
                        modulosActivos={modulosActivos}
                        guardando={guardandoRol === rol.value}
                        onGuardar={(modulos) => handleGuardarRol(rol.value, modulos)}
                      />
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ── Subcomponente editor de módulos por rol ───────────────────────────────────

function RolModulosEditor({ rolNombre, modulosActivos, guardando, onGuardar }: {
  rolNombre: string
  modulosActivos: string[]
  guardando: boolean
  onGuardar: (modulos: string[]) => void
}) {
  const [seleccionados, setSeleccionados] = useState<string[]>(modulosActivos)

  const toggle = (id: string) => {
    setSeleccionados(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
        {MODULOS_DISPONIBLES.map(m => (
          <label key={m.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
            <input type="checkbox" checked={seleccionados.includes(m.id)} onChange={() => toggle(m.id)}
              className="rounded border-slate-300 text-[#1a3c34]" />
            <span className="text-xs text-slate-700">{m.label}</span>
          </label>
        ))}
      </div>
      <button onClick={() => onGuardar(seleccionados)} disabled={guardando}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1a3c34] hover:bg-[#2d5a4e] rounded-lg disabled:opacity-60">
        {guardando ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Guardar permisos
      </button>
    </div>
  )
}
