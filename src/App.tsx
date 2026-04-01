import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { usePermisos, MENU_POR_ROL } from './hooks/usePermisos'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import { ReactNode, lazy, Suspense } from 'react'
import { Loader2, ShieldOff } from 'lucide-react'

const DashboardPage              = lazy(() => import('./pages/DashboardPage'))
const OportunidadesPage          = lazy(() => import('./pages/OportunidadesPage'))
const NuevaOportunidadPage       = lazy(() => import('./pages/NuevaOportunidadPage'))
const DetalleOportunidadPage     = lazy(() => import('./pages/DetalleOportunidadPage'))
const AnalisisPage               = lazy(() => import('./pages/AnalisisPage'))
const CalculoPage                = lazy(() => import('./pages/CalculoPage'))
const DecisionesPage             = lazy(() => import('./pages/DecisionesPage'))
const OfertaPage                 = lazy(() => import('./pages/OfertaPage'))
const SeguimientoPage            = lazy(() => import('./pages/SeguimientoPage'))
const ConveniosPage              = lazy(() => import('./pages/ConveniosPage'))
const DocumentosPage             = lazy(() => import('./pages/DocumentosPage'))
const PersonalPage               = lazy(() => import('./pages/PersonalPage'))
const PrlPage                    = lazy(() => import('./pages/PrlPage'))
const RgpdPage                   = lazy(() => import('./pages/RgpdPage'))
const SubrogacionPage            = lazy(() => import('./pages/SubrogacionPage'))
const FichajesPage               = lazy(() => import('./pages/FichajesPage'))
const AusenciasPage              = lazy(() => import('./pages/AusenciasPage'))
const ConocimientoPage           = lazy(() => import('./pages/ConocimientoPage'))
const ConfiguracionPage          = lazy(() => import('./pages/ConfiguracionPage'))
const UsuariosPage               = lazy(() => import('./pages/UsuariosPage'))
const PlantillasPage             = lazy(() => import('./pages/PlantillasPage'))
const PortalEmpleadoPage         = lazy(() => import('./pages/PortalEmpleadoPage'))
const DashboardRRHHPage          = lazy(() => import('./pages/DashboardRRHHPage'))
const DashboardLicitacionesPage  = lazy(() => import('./pages/DashboardLicitacionesPage'))
const TerritorioPage             = lazy(() => import('./pages/TerritorioPage'))
const PartesPage                 = lazy(() => import('./pages/PartesPage'))
const IncidenciasPage            = lazy(() => import('./pages/IncidenciasPage'))
const InformesPage               = lazy(() => import('./pages/InformesPage'))
const Dashboard360Page           = lazy(() => import('./pages/Dashboard360Page'))
const OperadorCampoPage          = lazy(() => import('./pages/OperadorCampoV2Page'))
const ChecklistConfigPage        = lazy(() => import('./pages/ChecklistConfigPage'))
const OrdenesPage                = lazy(() => import('./pages/OrdenesPage'))
const InventarioPage             = lazy(() => import('./pages/InventarioPage'))
const VehiculosPage              = lazy(() => import('./pages/VehiculosPage'))
const CalidadPage                = lazy(() => import('./pages/CalidadPage'))
const PortalClientePage          = lazy(() => import('./pages/PortalClientePage'))
const PortalTokensPage           = lazy(() => import('./pages/PortalTokensPage'))
const PlanificacionPage          = lazy(() => import('./pages/PlanificacionPage'))
const CertificacionesPage        = lazy(() => import('./pages/CertificacionesPage'))
const EscaneoDocumentosPage      = lazy(() => import('./pages/EscaneoDocumentosPage'))
const MapaSupervisorPage         = lazy(() => import('./pages/MapaSupervisorPage'))

function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 size={28} className="text-[#1a3c34] animate-spin mb-2" />
      <p className="text-sm text-slate-400">Cargando...</p>
    </div>
  )
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  if (!usuario) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  if (usuario) return <Navigate to="/" replace />
  return <>{children}</>
}

function AccesoDenegado() {
  const { usuario } = useAuth()
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <ShieldOff size={28} className="text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Acceso restringido</h2>
      <p className="text-slate-500 max-w-sm">
        Tu rol <span className="font-semibold text-slate-700">
          ({usuario?.rol?.replace(/_/g, ' ')})
        </span> no tiene permiso para acceder a esta sección.
      </p>
      <a href="/" className="mt-6 px-5 py-2.5 bg-[#1a3c34] text-white text-sm font-semibold rounded-xl hover:bg-[#2d5a4e] transition-colors">
        Volver al dashboard
      </a>
    </div>
  )
}

function RoleRoute({ children, clave }: { children: ReactNode; clave: string }) {
  const { usuario } = useAuth()
  const { rol } = usePermisos()
  if (!usuario) return <Navigate to="/login" replace />
  if (!rol) return <AccesoDenegado />
  const menu = MENU_POR_ROL[rol] || []
  if (!menu.includes('*') && !menu.includes(clave)) return <AccesoDenegado />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/portal-cliente" element={<PortalClientePage />} />

        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          {/* Accesible a todos los roles autenticados */}
          <Route path="/" element={<Dashboard360Page />} />

          {/* Dashboard */}
          <Route path="/dashboard" element={<RoleRoute clave="dashboard"><DashboardPage /></RoleRoute>} />
          <Route path="/informes"  element={<RoleRoute clave="informes"><InformesPage /></RoleRoute>} />

          {/* Licitaciones */}
          <Route path="/licitaciones-dashboard" element={<RoleRoute clave="licitaciones-dashboard"><DashboardLicitacionesPage /></RoleRoute>} />
          <Route path="/oportunidades"          element={<RoleRoute clave="oportunidades"><OportunidadesPage /></RoleRoute>} />
          <Route path="/oportunidades/nueva"    element={<RoleRoute clave="nueva"><NuevaOportunidadPage /></RoleRoute>} />
          <Route path="/oportunidades/:id"      element={<RoleRoute clave="oportunidades"><DetalleOportunidadPage /></RoleRoute>} />
          <Route path="/analisis"               element={<RoleRoute clave="analisis"><AnalisisPage /></RoleRoute>} />
          <Route path="/calculo"                element={<RoleRoute clave="calculo"><CalculoPage /></RoleRoute>} />
          <Route path="/decisiones"             element={<RoleRoute clave="decisiones"><DecisionesPage /></RoleRoute>} />
          <Route path="/oferta"                 element={<RoleRoute clave="oferta"><OfertaPage /></RoleRoute>} />
          <Route path="/seguimiento"            element={<RoleRoute clave="seguimiento"><SeguimientoPage /></RoleRoute>} />
          <Route path="/conocimiento"           element={<RoleRoute clave="conocimiento"><ConocimientoPage /></RoleRoute>} />
          <Route path="/convenios"              element={<RoleRoute clave="convenios"><ConveniosPage /></RoleRoute>} />
          <Route path="/documentos"             element={<RoleRoute clave="documentos"><DocumentosPage /></RoleRoute>} />

          {/* RRHH */}
          <Route path="/dashboard-rrhh"     element={<RoleRoute clave="dashboard-rrhh"><DashboardRRHHPage /></RoleRoute>} />
          <Route path="/personal"           element={<RoleRoute clave="personal"><PersonalPage /></RoleRoute>} />
          <Route path="/subrogacion"        element={<RoleRoute clave="subrogacion"><SubrogacionPage /></RoleRoute>} />
          <Route path="/fichajes"           element={<RoleRoute clave="fichajes"><FichajesPage /></RoleRoute>} />
          <Route path="/ausencias"          element={<RoleRoute clave="ausencias"><AusenciasPage /></RoleRoute>} />
          <Route path="/certificaciones"    element={<RoleRoute clave="certificaciones"><CertificacionesPage /></RoleRoute>} />
          <Route path="/escaneo-documentos" element={<RoleRoute clave="escaneo-documentos"><EscaneoDocumentosPage /></RoleRoute>} />

          {/* Cumplimiento */}
          <Route path="/prl"  element={<RoleRoute clave="prl"><PrlPage /></RoleRoute>} />
          <Route path="/rgpd" element={<RoleRoute clave="rgpd"><RgpdPage /></RoleRoute>} />

          {/* Territorio */}
          <Route path="/territorio"       element={<RoleRoute clave="territorio"><TerritorioPage /></RoleRoute>} />
          <Route path="/mapa-supervisor"  element={<RoleRoute clave="mapa-supervisor"><MapaSupervisorPage /></RoleRoute>} />
          <Route path="/planificacion"    element={<RoleRoute clave="planificacion"><PlanificacionPage /></RoleRoute>} />
          <Route path="/ordenes"          element={<RoleRoute clave="ordenes"><OrdenesPage /></RoleRoute>} />
          <Route path="/partes"           element={<RoleRoute clave="partes"><PartesPage /></RoleRoute>} />
          <Route path="/incidencias"      element={<RoleRoute clave="incidencias"><IncidenciasPage /></RoleRoute>} />
          <Route path="/inventario"       element={<RoleRoute clave="inventario"><InventarioPage /></RoleRoute>} />
          <Route path="/vehiculos"        element={<RoleRoute clave="vehiculos"><VehiculosPage /></RoleRoute>} />
          <Route path="/calidad"          element={<RoleRoute clave="calidad"><CalidadPage /></RoleRoute>} />
          <Route path="/checklist-config" element={<RoleRoute clave="checklist-config"><ChecklistConfigPage /></RoleRoute>} />
          <Route path="/portal-tokens"    element={<RoleRoute clave="portal-tokens"><PortalTokensPage /></RoleRoute>} />

          {/* Administración */}
          <Route path="/configuracion" element={<RoleRoute clave="configuracion"><ConfiguracionPage /></RoleRoute>} />
          <Route path="/usuarios"      element={<RoleRoute clave="usuarios"><UsuariosPage /></RoleRoute>} />
          <Route path="/plantillas"    element={<RoleRoute clave="plantillas"><PlantillasPage /></RoleRoute>} />

          {/* Portal empleado / operador campo */}
          <Route path="/portal"   element={<RoleRoute clave="portal"><PortalEmpleadoPage /></RoleRoute>} />
          <Route path="/operador" element={<ProtectedRoute><OperadorCampoPage /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
