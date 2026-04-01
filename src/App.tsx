import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import ErrorBoundary from './components/ErrorBoundary'
import { ReactNode, lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const OportunidadesPage = lazy(() => import('./pages/OportunidadesPage'))
const NuevaOportunidadPage = lazy(() => import('./pages/NuevaOportunidadPage'))
const DetalleOportunidadPage = lazy(() => import('./pages/DetalleOportunidadPage'))
const AnalisisPage = lazy(() => import('./pages/AnalisisPage'))
const CalculoPage = lazy(() => import('./pages/CalculoPage'))
const DecisionesPage = lazy(() => import('./pages/DecisionesPage'))
const OfertaPage = lazy(() => import('./pages/OfertaPage'))
const SeguimientoPage = lazy(() => import('./pages/SeguimientoPage'))
const ConveniosPage = lazy(() => import('./pages/ConveniosPage'))
const DocumentosPage = lazy(() => import('./pages/DocumentosPage'))
const PersonalPage = lazy(() => import('./pages/PersonalPage'))
const PrlPage = lazy(() => import('./pages/PrlPage'))
const RgpdPage = lazy(() => import('./pages/RgpdPage'))
const SubrogacionPage = lazy(() => import('./pages/SubrogacionPage'))
const FichajesPage = lazy(() => import('./pages/FichajesPage'))
const AusenciasPage = lazy(() => import('./pages/AusenciasPage'))
const ConocimientoPage = lazy(() => import('./pages/ConocimientoPage'))
const ConfiguracionPage = lazy(() => import('./pages/ConfiguracionPage'))
const UsuariosPage = lazy(() => import('./pages/UsuariosPage'))
const PlantillasPage = lazy(() => import('./pages/PlantillasPage'))
const PortalEmpleadoPage = lazy(() => import('./pages/PortalEmpleadoPage'))
const DashboardRRHHPage = lazy(() => import('./pages/DashboardRRHHPage'))
const DashboardLicitacionesPage = lazy(() => import('./pages/DashboardLicitacionesPage'))
const TerritorioPage = lazy(() => import('./pages/TerritorioPage'))
const PartesPage = lazy(() => import('./pages/PartesPage'))
const IncidenciasPage = lazy(() => import('./pages/IncidenciasPage'))
const InformesPage = lazy(() => import('./pages/InformesPage'))
const Dashboard360Page = lazy(() => import('./pages/Dashboard360Page'))
const OperadorCampoPage = lazy(() => import('./pages/OperadorCampoV2Page'))
const ChecklistConfigPage = lazy(() => import('./pages/ChecklistConfigPage'))
const OrdenesPage = lazy(() => import('./pages/OrdenesPage'))
const InventarioPage = lazy(() => import('./pages/InventarioPage'))
const VehiculosPage = lazy(() => import('./pages/VehiculosPage'))
const CalidadPage = lazy(() => import('./pages/CalidadPage'))
const PortalClientePage = lazy(() => import('./pages/PortalClientePage'))
const PortalTokensPage = lazy(() => import('./pages/PortalTokensPage'))
const PlanificacionPage = lazy(() => import('./pages/PlanificacionPage'))
const CertificacionesPage = lazy(() => import('./pages/CertificacionesPage'))
const EscaneoDocumentosPage = lazy(() => import('./pages/EscaneoDocumentosPage'))
const MapaSupervisorPage = lazy(() => import('./pages/MapaSupervisorPage'))

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

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/portal-cliente" element={<PortalClientePage />} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<ErrorBoundary><Dashboard360Page /></ErrorBoundary>} />
          <Route path="/dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
          <Route path="/oportunidades" element={<ErrorBoundary><OportunidadesPage /></ErrorBoundary>} />
          <Route path="/oportunidades/nueva" element={<ErrorBoundary><NuevaOportunidadPage /></ErrorBoundary>} />
          <Route path="/oportunidades/:id" element={<ErrorBoundary><DetalleOportunidadPage /></ErrorBoundary>} />
          <Route path="/analisis" element={<ErrorBoundary><AnalisisPage /></ErrorBoundary>} />
          <Route path="/calculo" element={<ErrorBoundary><CalculoPage /></ErrorBoundary>} />
          <Route path="/decisiones" element={<ErrorBoundary><DecisionesPage /></ErrorBoundary>} />
          <Route path="/oferta" element={<ErrorBoundary><OfertaPage /></ErrorBoundary>} />
          <Route path="/seguimiento" element={<ErrorBoundary><SeguimientoPage /></ErrorBoundary>} />
          <Route path="/convenios" element={<ErrorBoundary><ConveniosPage /></ErrorBoundary>} />
          <Route path="/documentos" element={<ErrorBoundary><DocumentosPage /></ErrorBoundary>} />
          <Route path="/personal" element={<ErrorBoundary><PersonalPage /></ErrorBoundary>} />
          <Route path="/prl" element={<ErrorBoundary><PrlPage /></ErrorBoundary>} />
          <Route path="/rgpd" element={<ErrorBoundary><RgpdPage /></ErrorBoundary>} />
          <Route path="/subrogacion" element={<ErrorBoundary><SubrogacionPage /></ErrorBoundary>} />
          <Route path="/fichajes" element={<ErrorBoundary><FichajesPage /></ErrorBoundary>} />
          <Route path="/ausencias" element={<ErrorBoundary><AusenciasPage /></ErrorBoundary>} />
          <Route path="/conocimiento" element={<ErrorBoundary><ConocimientoPage /></ErrorBoundary>} />
          <Route path="/configuracion" element={<ErrorBoundary><ConfiguracionPage /></ErrorBoundary>} />
          <Route path="/usuarios" element={<ErrorBoundary><UsuariosPage /></ErrorBoundary>} />
          <Route path="/plantillas" element={<ErrorBoundary><PlantillasPage /></ErrorBoundary>} />
          <Route path="/portal" element={<ErrorBoundary><PortalEmpleadoPage /></ErrorBoundary>} />
          <Route path="/dashboard-rrhh" element={<ErrorBoundary><DashboardRRHHPage /></ErrorBoundary>} />
          <Route path="/licitaciones-dashboard" element={<ErrorBoundary><DashboardLicitacionesPage /></ErrorBoundary>} />
          <Route path="/territorio" element={<ErrorBoundary><TerritorioPage /></ErrorBoundary>} />
          <Route path="/partes" element={<ErrorBoundary><PartesPage /></ErrorBoundary>} />
          <Route path="/incidencias" element={<ErrorBoundary><IncidenciasPage /></ErrorBoundary>} />
          <Route path="/informes" element={<ErrorBoundary><InformesPage /></ErrorBoundary>} />
          <Route path="/operador" element={<ErrorBoundary><OperadorCampoPage /></ErrorBoundary>} />
          <Route path="/checklist-config" element={<ErrorBoundary><ChecklistConfigPage /></ErrorBoundary>} />
          <Route path="/ordenes" element={<ErrorBoundary><OrdenesPage /></ErrorBoundary>} />
          <Route path="/inventario" element={<ErrorBoundary><InventarioPage /></ErrorBoundary>} />
          <Route path="/vehiculos" element={<ErrorBoundary><VehiculosPage /></ErrorBoundary>} />
          <Route path="/calidad" element={<ErrorBoundary><CalidadPage /></ErrorBoundary>} />
          <Route path="/portal-tokens" element={<ErrorBoundary><PortalTokensPage /></ErrorBoundary>} />
          <Route path="/planificacion" element={<ErrorBoundary><PlanificacionPage /></ErrorBoundary>} />
          <Route path="/certificaciones" element={<ErrorBoundary><CertificacionesPage /></ErrorBoundary>} />
          <Route path="/escaneo-documentos" element={<ErrorBoundary><EscaneoDocumentosPage /></ErrorBoundary>} />
          <Route path="/mapa-supervisor" element={<ErrorBoundary><MapaSupervisorPage /></ErrorBoundary>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
