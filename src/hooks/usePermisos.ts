// src/hooks/usePermisos.ts — CORREGIDO 30/03/2026
// ═══════════════════════════════════════════════════════════════════════════
// CAMBIOS:
//   1. ADMIN_TERRITORIO: añadidas todas las sub-páginas de territorio
//   2. DIRECTOR_GERENTE: añadidos dashboards y territorio
//   3. 'informes' añadido a roles de gestión y admin
//   4. ENCARGADO_ZONA: añadidas páginas de territorio que necesita
//   5. SUPERVISOR_TERRITORIO: añadidas páginas de territorio + operador
//   6. Nivel de ENCARGADO_ZONA corregido a 4 (igual que SUPERVISOR)
// ═══════════════════════════════════════════════════════════════════════════

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
  ENCARGADO_ZONA:        4,
  SUPERVISOR_TERRITORIO: 4,
  TRABAJADOR_CAMPO:      5,
  TRABAJADOR_LECTURA:    5,
}

// ── Permisos por módulo ──────────────────────────────────────────────────────
const PERMISOS: Record<Rol, string[]> = {
  SUPER_ADMIN:           ['*'],
  DIRECTOR_GERENTE:      ['VER_LICIT', 'VER_RRHH', 'VER_TERRITORIO', 'VER_DASHBOARD', 'VER_INFORMES'],
  ADMIN_LICITACIONES:    ['LICIT_TOTAL', 'VER_RRHH_BASICO', 'VER_INFORMES'],
  ADMIN_RRHH:            ['RRHH_TOTAL', 'PRL_TOTAL', 'RGPD_TOTAL', 'VER_LICIT', 'VER_INFORMES'],
  ADMIN_TERRITORIO:      ['TERRITORIO_TOTAL', 'VER_RRHH_BASICO', 'VER_INFORMES'],
  RESPONSABLE_COMERCIAL: ['LICIT_TOTAL', 'VER_RRHH_BASICO'],
  RESPONSABLE_PRL:       ['PRL_TOTAL', 'VER_RRHH_BASICO'],
  RESPONSABLE_RGPD:      ['RGPD_TOTAL', 'VER_RRHH_BASICO'],
  ENCARGADO_ZONA:        ['VER_MI_ZONA', 'FICHAR', 'VER_MIS_DATOS', 'TERR_SERVICIOS', 'TERR_INCIDENCIAS'],
  SUPERVISOR_TERRITORIO: ['VER_MI_ZONA', 'VER_MI_EQUIPO_RRHH', 'FICHAR_EQUIPO', 'GESTIONAR_AUSENCIAS_ZONA', 'TERR_SERVICIOS', 'TERR_INCIDENCIAS'],
  TRABAJADOR_CAMPO:      ['FICHAR', 'VER_MIS_DATOS', 'SOLICITAR_AUSENCIA'],
  TRABAJADOR_LECTURA:    ['VER_MIS_DATOS'],
}

// ── Visibilidad del menú por rol ─────────────────────────────────────────────
export const MENU_POR_ROL: Record<Rol, string[]> = {
  SUPER_ADMIN: ['*'],

  DIRECTOR_GERENTE: [
    'dashboard', 'informes',
    // Licitaciones (lectura)
    'licitaciones-dashboard', 'oportunidades', 'seguimiento',
    // RRHH
    'dashboard-rrhh', 'personal', 'ausencias', 'certificaciones', 'fichajes',
    // Cumplimiento
    'prl', 'rgpd',
    // Territorio (lectura)
    'territorio', 'partes', 'incidencias', 'calidad',
    // Admin
    'configuracion', 'usuarios',
  ],

  ADMIN_LICITACIONES: [
    'dashboard', 'informes',
    'licitaciones-dashboard', 'oportunidades', 'nueva', 'analisis', 'calculo',
    'decisiones', 'oferta', 'seguimiento', 'conocimiento', 'convenios', 'documentos',
  ],

  ADMIN_RRHH: [
    'dashboard', 'informes',
    'dashboard-rrhh', 'personal', 'subrogacion', 'fichajes', 'ausencias', 'certificaciones',
    'prl', 'rgpd', 'plantillas', 'usuarios',
  ],

  ADMIN_TERRITORIO: [
    'dashboard', 'informes',
    // RRHH básico
    'personal', 'fichajes', 'ausencias', 'certificaciones',
    // Territorio completo
    'territorio', 'planificacion', 'ordenes', 'partes', 'incidencias',
    'inventario', 'vehiculos', 'calidad', 'checklist-config', 'portal-tokens',
    'operador',
  ],

  RESPONSABLE_COMERCIAL: [
    'dashboard',
    'licitaciones-dashboard', 'oportunidades', 'nueva', 'analisis', 'calculo',
    'decisiones', 'oferta', 'seguimiento', 'conocimiento',
  ],

  RESPONSABLE_PRL: [
    'dashboard', 'personal', 'prl',
  ],

  RESPONSABLE_RGPD: [
    'dashboard', 'personal', 'rgpd',
  ],

  SUPERVISOR_TERRITORIO: [
    'dashboard',
    'personal', 'fichajes', 'ausencias', 'certificaciones',
    // Territorio (su zona)
    'territorio', 'planificacion', 'ordenes', 'partes', 'incidencias',
    'inventario', 'calidad', 'operador',
  ],

  ENCARGADO_ZONA: [
    'dashboard', 'fichajes', 'ausencias', 'certificaciones',
    // Territorio (su zona, limitado)
    'territorio', 'partes', 'incidencias', 'ordenes', 'inventario',
    'operador',
  ],

  TRABAJADOR_CAMPO: [
    'operador', 'portal', 'fichajes', 'ausencias', 'certificaciones',
  ],

  TRABAJADOR_LECTURA: [
    'portal',
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
  const esSuperAdmin    = rol === 'SUPER_ADMIN'
  const esAdmin         = nivel <= 2
  const esAdminRRHH     = rol === 'ADMIN_RRHH' || esSuperAdmin
  const esAdminLicit    = rol === 'ADMIN_LICITACIONES' || esSuperAdmin
  const esAdminTerritorio = rol === 'ADMIN_TERRITORIO' || esSuperAdmin
  const esSupervisor    = rol === 'SUPERVISOR_TERRITORIO' || rol === 'ENCARGADO_ZONA'
  const esTrabajador    = rol === 'TRABAJADOR_CAMPO' || rol === 'TRABAJADOR_LECTURA'
  const esDirector      = rol === 'DIRECTOR_GERENTE' || esSuperAdmin
  const puedeGestionarRRHH     = esAdmin || esDirector
  const puedeVerTodaPlantilla  = nivel <= 3
  const soloSusDatos           = esTrabajador
  const puedeAprobarAusencias  = nivel <= 3

  // Zonas/centros asignados (para supervisores)
  const zonasAsignadas   = (usuario as any)?.zonas_asignadas || []
  const centrosAsignados = (usuario as any)?.centros_asignados || []

  return {
    rol, nivel, usuario,
    tiene, puedeVerMenu,
    esSuperAdmin, esAdmin, esAdminRRHH, esAdminLicit, esAdminTerritorio,
    esSupervisor, esTrabajador, esDirector,
    puedeGestionarRRHH, puedeVerTodaPlantilla,
    soloSusDatos, puedeAprobarAusencias,
    zonasAsignadas, centrosAsignados,
  }
}
