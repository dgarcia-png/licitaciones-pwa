import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
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
const Dashboard360Page = lazy(() => import('./pages/Dashboard360Page'))
const OperadorCampoV2Page = lazy(() => import('./pages/OperadorCampoV2Page'))
const ChecklistConfigPage = lazy(() => import('./pages/ChecklistConfigPage'))
const OrdenesPage = lazy(() => import('./pages/OrdenesPage'))
const InventarioPage = lazy(() => import('./pages/InventarioPage'))
const VehiculosPage = lazy(() => import('./pages/VehiculosPage'))
const CalidadPage = lazy(() => import('./pages/CalidadPage'))
const PortalClientePage = lazy(() => import('./pages/PortalClientePage'))
const PortalTokensPage = lazy(() => import('./pages/PortalTokensPage'))
const PlanificacionPage = lazy(() => import('./pages/PlanificacionPage'))

function PageLoader() {
  return <div className="flex flex-col items-center justify-center py-20"><Loader2 size={28} className="text-[#1a3c34] animate-spin mb-2" /><p className="text-sm text-slate-400">Cargando...</p></div>
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { usuario } = useAuth(); if (!usuario) return <Navigate to="/login" replace />; return <>{children}</>
}
function PublicRoute({ children }: { children: ReactNode }) {
  const { usuario } = useAuth(); if (usuario) return <Navigate to="/" replace />; return <>{children}</>
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/portal-cliente" element={<PortalClientePage />} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard360Page />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/oportunidades" element={<OportunidadesPage />} />
          <Route path="/oportunidades/nueva" element={<NuevaOportunidadPage />} />
          <Route path="/oportunidades/:id" element={<DetalleOportunidadPage />} />
          <Route path="/analisis" element={<AnalisisPage />} />
          <Route path="/calculo" element={<CalculoPage />} />
          <Route path="/decisiones" element={<DecisionesPage />} />
          <Route path="/oferta" element={<OfertaPage />} />
          <Route path="/seguimiento" element={<SeguimientoPage />} />
          <Route path="/convenios" element={<ConveniosPage />} />
          <Route path="/documentos" element={<DocumentosPage />} />
          <Route path="/personal" element={<PersonalPage />} />
          <Route path="/prl" element={<PrlPage />} />
          <Route path="/rgpd" element={<RgpdPage />} />
          <Route path="/subrogacion" element={<SubrogacionPage />} />
          <Route path="/fichajes" element={<FichajesPage />} />
          <Route path="/ausencias" element={<AusenciasPage />} />
          <Route path="/conocimiento" element={<ConocimientoPage />} />
          <Route path="/configuracion" element={<ConfiguracionPage />} />
          <Route path="/usuarios" element={<UsuariosPage />} />
          <Route path="/plantillas" element={<PlantillasPage />} />
          <Route path="/portal" element={<PortalEmpleadoPage />} />
          <Route path="/dashboard-rrhh" element={<DashboardRRHHPage />} />
          <Route path="/licitaciones-dashboard" element={<DashboardLicitacionesPage />} />
          <Route path="/territorio" element={<TerritorioPage />} />
          <Route path="/partes" element={<PartesPage />} />
          <Route path="/operador" element={<OperadorCampoV2Page />} />
          <Route path="/checklist-config" element={<ChecklistConfigPage />} />
          <Route path="/ordenes" element={<OrdenesPage />} />
          <Route path="/inventario" element={<InventarioPage />} />
          <Route path="/vehiculos" element={<VehiculosPage />} />
          <Route path="/calidad" element={<CalidadPage />} />
          <Route path="/portal-tokens" element={<PortalTokensPage />} />
          <Route path="/planificacion" element={<PlanificacionPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (<AuthProvider><BrowserRouter><AppRoutes /></BrowserRouter></AuthProvider>)
}