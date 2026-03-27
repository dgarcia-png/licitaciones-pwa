import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePermisos, MENU_POR_ROL } from '../hooks/usePermisos'
import OfflineBanner from './OfflineBanner'
import {
  LayoutDashboard, FileSearch, PlusCircle, BarChart3,
  Calculator, Gavel, FileText, BookOpen, Settings, Users,
  LogOut, Menu, X, UserCheck, Shield, ClipboardList,
  Clock, CalendarDays, Map, Activity, Briefcase, CheckSquare,
  Package, Car, Star, Link2,
} from 'lucide-react'

const RUTA_A_CLAVE: Record<string, string> = {
  '/': 'dashboard', '/oportunidades': 'oportunidades', '/nueva': 'nueva',
  '/analisis': 'analisis', '/calculo': 'calculo', '/decisiones': 'decisiones',
  '/oferta': 'oferta', '/seguimiento': 'seguimiento', '/conocimiento': 'conocimiento',
  '/convenios': 'convenios', '/documentos': 'documentos', '/personal': 'personal',
  '/subrogacion': 'subrogacion', '/fichajes': 'fichajes', '/ausencias': 'ausencias',
  '/prl': 'prl', '/rgpd': 'rgpd', '/territorio': 'territorio', '/partes': 'partes',
  '/operador': 'operador', '/checklist-config': 'checklist-config',
  '/ordenes': 'ordenes', '/inventario': 'inventario', '/vehiculos': 'vehiculos', '/calidad': 'calidad',
  '/portal-tokens': 'portal-tokens', '/planificacion': 'planificacion',
  '/configuracion': 'configuracion', '/usuarios': 'usuarios', '/plantillas': 'plantillas', '/portal': 'portal', '/dashboard-rrhh': 'dashboard-rrhh', '/licitaciones-dashboard': 'licitaciones-dashboard',
}

const NAV = [
  { grupo: 'Principal', items: [
    { clave: 'dashboard', to: '/', label: 'Dashboard', icon: LayoutDashboard },
  ]},
  { grupo: 'Licitaciones', items: [
    { clave: 'licitaciones-dashboard', to: '/licitaciones-dashboard', label: 'Dashboard', icon: BarChart3 },
    { clave: 'oportunidades', to: '/oportunidades', label: 'Oportunidades', icon: FileSearch },
    { clave: 'nueva', to: '/oportunidades/nueva', label: 'Nueva licitación', icon: PlusCircle },
    { clave: 'analisis', to: '/analisis', label: 'Análisis IA', icon: Activity },
    { clave: 'calculo', to: '/calculo', label: 'Cálculo económico', icon: Calculator },
    { clave: 'decisiones', to: '/decisiones', label: 'GO/NO-GO', icon: Gavel },
    { clave: 'oferta', to: '/oferta', label: 'Generar oferta', icon: FileText },
    { clave: 'seguimiento', to: '/seguimiento', label: 'Seguimiento', icon: ClipboardList },
    { clave: 'conocimiento', to: '/conocimiento', label: 'Base conocimiento', icon: BookOpen },
  ]},
  { grupo: 'RRHH', items: [
    { clave: 'dashboard-rrhh', to: '/dashboard-rrhh', label: 'Dashboard RRHH', icon: BarChart3 },
    { clave: 'personal', to: '/personal', label: 'Personal', icon: Users },
    { clave: 'subrogacion', to: '/subrogacion', label: 'Subrogación', icon: UserCheck },
    { clave: 'fichajes', to: '/fichajes', label: 'Fichajes', icon: Clock },
    { clave: 'ausencias', to: '/ausencias', label: 'Ausencias', icon: CalendarDays },
  ]},
  { grupo: 'Cumplimiento', items: [
    { clave: 'prl', to: '/prl', label: 'PRL', icon: Shield },
    { clave: 'rgpd', to: '/rgpd', label: 'RGPD', icon: ClipboardList },
  ]},
  { grupo: 'Territorio', items: [
    { clave: 'territorio', to: '/territorio', label: 'Territorio', icon: Map },
    { clave: 'partes', to: '/partes', label: 'Partes / Incidencias', icon: ClipboardList },
    { clave: 'checklist-config', to: '/checklist-config', label: 'Config. Checklist', icon: CheckSquare },
    { clave: 'ordenes',         to: '/ordenes',          label: 'Órdenes de trabajo', icon: ClipboardList },
    { clave: 'inventario',      to: '/inventario',       label: 'Inventario',         icon: Package },
    { clave: 'vehiculos',       to: '/vehiculos',        label: 'Vehículos',          icon: Car },
    { clave: 'calidad',         to: '/calidad',          label: 'Calidad',            icon: Star },
    { clave: 'planificacion',   to: '/planificacion',    label: 'Planificación',      icon: CalendarDays },
    { clave: 'portal-tokens',   to: '/portal-tokens',    label: 'Portal cliente',     icon: Link2 },
  ]},
  { grupo: 'Administración', items: [
    { clave: 'configuracion', to: '/configuracion', label: 'Configuración', icon: Settings },
    { clave: 'plantillas',    to: '/plantillas',    label: 'Plantillas docs', icon: FileText },
    { clave: 'usuarios',      to: '/usuarios',       label: 'Usuarios',      icon: Briefcase },
  ]},
]

const ROL_BADGE: Record<string, { label: string; color: string }> = {
  SUPER_ADMIN:           { label: 'Super Admin',    color: 'bg-red-500/20 text-red-200' },
  DIRECTOR_GERENTE:      { label: 'Director',       color: 'bg-purple-500/20 text-purple-200' },
  ADMIN_LICITACIONES:    { label: 'Admin Licit.',   color: 'bg-blue-500/20 text-blue-200' },
  ADMIN_RRHH:            { label: 'Admin RRHH',     color: 'bg-teal-500/20 text-teal-200' },
  ADMIN_TERRITORIO:      { label: 'Admin Territ.',  color: 'bg-green-500/20 text-green-200' },
  RESPONSABLE_COMERCIAL: { label: 'R. Comercial',   color: 'bg-amber-500/20 text-amber-200' },
  RESPONSABLE_PRL:       { label: 'R. PRL',         color: 'bg-orange-500/20 text-orange-200' },
  RESPONSABLE_RGPD:      { label: 'R. RGPD',        color: 'bg-pink-500/20 text-pink-200' },
  SUPERVISOR_TERRITORIO: { label: 'Supervisor',     color: 'bg-cyan-500/20 text-cyan-200' },
  ENCARGADO_ZONA:        { label: 'Encargado',      color: 'bg-lime-500/20 text-lime-200' },
  TRABAJADOR_CAMPO:      { label: 'Trabajador',     color: 'bg-slate-500/20 text-slate-300' },
  TRABAJADOR_LECTURA:    { label: 'Solo lectura',   color: 'bg-slate-500/20 text-slate-400' },
}

function ForgeserLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
      <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg text-white select-none"
        style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', fontFamily: 'Georgia, serif' }}>
        F
      </div>
      {!collapsed && (
        <div>
          <div className="text-white font-semibold text-[15px] leading-tight">Forgeser</div>
          <div className="text-[10px] text-white/50 uppercase tracking-widest">Gestión integrada</div>
        </div>
      )}
    </div>
  )
}

function SidebarContent({ collapsed, onToggle, onClose }: { collapsed: boolean; onToggle: () => void; onClose: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { usuario, logout } = useAuth()
  const { rol } = usePermisos()

  const rutaBase = location.pathname === '/' ? '/' : '/' + location.pathname.split('/')[1]
  const claveActiva = RUTA_A_CLAVE[rutaBase] || ''

  const tieneAcceso = (clave: string): boolean => {
    if (!rol) return false
    const menu = MENU_POR_ROL[rol] || []
    return menu.includes('*') || menu.includes(clave)
  }

  const handleLogout = () => { logout(); navigate('/login') }
  const rolInfo = ROL_BADGE[rol || ''] || { label: rol || '', color: 'bg-slate-500/20 text-slate-300' }

  return (
    <div className="flex flex-col h-full" style={{ background: 'linear-gradient(180deg, #1a3c34 0%, #0f2420 100%)' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <ForgeserLogo collapsed={collapsed} />
        <button onClick={onToggle} className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 hidden md:block">
          <Menu size={18} />
        </button>
        <button onClick={onClose} className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 md:hidden">
          <X size={18} />
        </button>
      </div>

      {/* Nav items filtrados por rol */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV.map(grupo => {
          const visibles = grupo.items.filter(i => tieneAcceso(i.clave))
          if (!visibles.length) return null
          return (
            <div key={grupo.grupo} className="mb-4">
              {!collapsed && (
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 px-3 mb-1">{grupo.grupo}</p>
              )}
              {visibles.map(item => {
                const Icon = item.icon
                const activo = item.clave === claveActiva ||
                  (item.clave === 'oportunidades' && location.pathname.startsWith('/oportunidades'))
                return (
                  <Link key={item.clave} to={item.to} onClick={onClose}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5 ${
                      collapsed ? 'justify-center px-0' : ''
                    } ${activo
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}>
                    <Icon size={17} className="flex-shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Perfil usuario */}
      <div className="p-3 border-t border-white/10">
        {!collapsed ? (
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/10 transition-colors">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {usuario?.nombre?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{usuario?.nombre}</p>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${rolInfo.color}`}>{rolInfo.label}</span>
            </div>
            <button onClick={handleLogout} title="Cerrar sesión" className="text-white/40 hover:text-white p-1">
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button onClick={handleLogout} className="w-full flex justify-center p-2 text-white/40 hover:text-white rounded-xl hover:bg-white/10">
            <LogOut size={18} />
          </button>
        )}
      </div>
    </div>
  )
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { rol } = usePermisos()
  const navigate = useNavigate()
  const location = useLocation()
  const rolInfo = ROL_BADGE[rol || ''] || { label: '', color: '' }

  // Redirigir TRABAJADOR_CAMPO al operador de campo
  useEffect(() => {
    if ((rol === 'TRABAJADOR_CAMPO' || rol === 'TRABAJADOR_LECTURA') &&
        location.pathname !== '/operador' && location.pathname !== '/portal') {
      navigate('/operador', { replace: true })
    }
  }, [rol, location.pathname])

  // Portal sin sidebar para trabajadores
  if (rol === 'TRABAJADOR_CAMPO' || rol === 'TRABAJADOR_LECTURA') {
    return <Outlet />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <OfflineBanner />
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col flex-shrink-0 transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
        <SidebarContent collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} onClose={() => {}} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 z-50 flex flex-col md:hidden">
            <SidebarContent collapsed={false} onToggle={() => {}} onClose={() => setMobileOpen(false)} />
          </aside>
        </>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar mobile */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
          <button onClick={() => setMobileOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-sm" style={{ background: '#1a3c34' }}>F</div>
            <span className="font-semibold text-slate-800 text-sm">Forgeser</span>
          </div>
          <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${rolInfo.color}`}>{rolInfo.label}</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}