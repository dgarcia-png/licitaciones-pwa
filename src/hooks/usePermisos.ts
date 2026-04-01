import { useAuth, Rol } from '../context/AuthContext'

// ── Niveles jerárquicos ──────────────────────────────────────────────────────
const NIVELES: Record<Rol, number> = {
  SUPER_ADMIN:           1,
  DIRECTOR_GERENTE:      2,
  ADMIN_LICITACIONES:    2,
  ADMIN_RRHH:            2,
  ADMIN_TERRITORIO:      2,
  RESPONSABLE_COMERCIAL: 3,
  RESPONSABLE_PRL:       3,
  RESPONSABLE_RGPD:      3,
  ENCARGADO_ZONA:        3,
  SUPERVISOR_TERRITORIO: 4,
  TRABAJADOR_CAMPO:      5,
  TRABAJADOR_LECTURA:    5,
}

// ── Permisos por módulo ──────────────────────────────────────────────────────
const PERMISOS: Record<Rol, string[]> = {
  SUPER_ADMIN:           ['*'],
  DIRECTOR_GERENTE:      ['VER_LICIT', 'VER_RRHH', 'VER_TERRITORIO', 'VER_DASHBOARD'],
  ADMIN_LICITACIONES:    ['LICIT_TOTAL', 'VER_RRHH_BASICO'],
  ADMIN_RRHH:            ['RRHH_TOTAL', 'PRL_TOTAL', 'RGPD_TOTAL', 'VER_LICIT'],
  ADMIN_TERRITORIO:      ['TERRITORIO_TOTAL', 'VER_RRHH_BASICO'],
  RESPONSABLE_COMERCIAL: ['LICIT_TOTAL', 'VER_RRHH_BASICO'],
  RESPONSABLE_PRL:       ['PRL_TOTAL', 'VER_RRHH_BASICO'],
  RESPONSABLE_RGPD:      ['RGPD_TOTAL', 'VER_RRHH_BASICO'],
  ENCARGADO_ZONA:        ['VER_MI_ZONA', 'FICHAR', 'VER_MIS_DATOS'],
  SUPERVISOR_TERRITORIO: ['VER_MI_ZONA', 'VER_MI_EQUIPO_RRHH', 'FICHAR_EQUIPO', 'GESTIONAR_AUSENCIAS_ZONA'],
  TRABAJADOR_CAMPO:      ['FICHAR', 'VER_MIS_DATOS', 'SOLICITAR_AUSENCIA'],
  TRABAJADOR_LECTURA:    ['VER_MIS_DATOS'],
}

// ── Visibilidad del menú por rol ─────────────────────────────────────────────
export const MENU_POR_ROL: Record<Rol, string[]> = {
  SUPER_ADMIN: ['*'],

  DIRECTOR_GERENTE: [
    'dashboard', 'informes',
    'oportunidades', 'seguimiento',
    'personal', 'ausencias', 'fichajes', 'horas-extras',
    'prl', 'rgpd', 'configuracion', 'usuarios',
    'escaneo-documentos', 'mapa-supervisor',
  ],

  ADMIN_LICITACIONES: [
    'dashboard', 'informes',
    'licitaciones-dashboard',
    'oportunidades', 'nueva', 'analisis', 'calculo',
    'decisiones', 'oferta', 'seguimiento',
    'conocimiento', 'convenios', 'documentos',
  ],

  ADMIN_RRHH: [
    'dashboard', 'informes',
    'personal', 'subrogacion', 'fichajes', 'ausencias', 'horas-extras',
    'prl', 'rgpd', 'plantillas', 'usuarios',
    'dashboard-rrhh', 'escaneo-documentos', 'certificaciones',
  ],

  ADMIN_TERRITORIO: [
    'dashboard', 'informes',
    'personal', 'fichajes', 'ausencias',
    'territorio', 'partes', 'incidencias', 'ordenes',
    'inventario', 'vehiculos', 'calidad',
    'planificacion', 'checklist-config',
    'escaneo-documentos', 'mapa-supervisor',
    'portal-tokens',
  ],

  RESPONSABLE_COMERCIAL: [
    'dashboard',
    'licitaciones-dashboard',
    'oportunidades', 'nueva', 'analisis', 'calculo',
    'decisiones', 'oferta', 'seguimiento', 'conocimiento',
  ],

  RESPONSABLE_PRL: [
    'dashboard',
    'personal', 'prl', 'certificaciones', 'escaneo-documentos',
  ],

  RESPONSABLE_RGPD: [
    'dashboard',
    'personal', 'rgpd',
  ],

  ENCARGADO_ZONA: [
    'dashboard',
    'fichajes', 'ausencias', 'mapa-supervisor',
  ],

  SUPERVISOR_TERRITORIO: [
    'dashboard',
    'personal', 'fichajes', 'ausencias', 'horas-extras', 'mapa-supervisor',
  ],

  TRABAJADOR_CAMPO: [
    'portal', 'fichajes', 'ausencias', 'mis-datos',
  ],

  TRABAJADOR_LECTURA: [
    'portal', 'fichajes', 'mis-datos',
  ],
}

// ── Hook principal ───────────────────────────────────────────────────────────
export function usePermisos() {
  const { usuario } = useAuth()
  const rol = usuario?.rol as Rol | undefined
  const nivel = rol ? NIVELES[rol] : 99

  const tiene = (permiso: string): boolean => {
    if (!rol) return false
    const perms = PERMISOS[rol] || []
    if (perms.includes('*')) return true
    return perms.includes(permiso)
  }

  const puedeVerMenu = (seccion: string): boolean => {
    if (!rol) return false
    const menu = MENU_POR_ROL[rol] || []
    if (menu.includes('*')) return true
    return menu.includes(seccion)
  }

  // Helpers semánticos
  const esSuperAdmin   = rol === 'SUPER_ADMIN'
  const esAdmin        = nivel <= 2
  const esAdminRRHH    = rol === 'ADMIN_RRHH' || esSuperAdmin
  const esAdminLicit   = rol === 'ADMIN_LICITACIONES' || esSuperAdmin
  const esSupervisor   = rol === 'SUPERVISOR_TERRITORIO' || rol === 'ENCARGADO_ZONA'
  const esTrabajador   = rol === 'TRABAJADOR_CAMPO' || rol === 'TRABAJADOR_LECTURA'
  const esDirector     = rol === 'DIRECTOR_GERENTE' || esSuperAdmin
  const puedeGestionarRRHH    = esAdmin || esDirector
  const puedeVerTodaPlantilla = nivel <= 3
  const soloSusDatos          = esTrabajador
  const puedeAprobarAusencias = nivel <= 3

  const zonasAsignadas   = (usuario as any)?.zonas_asignadas   || []
  const centrosAsignados = (usuario as any)?.centros_asignados || []

  return {
    rol, nivel, usuario,
    tiene, puedeVerMenu,
    esSuperAdmin, esAdmin, esAdminRRHH, esAdminLicit,
    esSupervisor, esTrabajador, esDirector,
    puedeGestionarRRHH, puedeVerTodaPlantilla,
    soloSusDatos, puedeAprobarAusencias,
    zonasAsignadas, centrosAsignados,
  }
}
