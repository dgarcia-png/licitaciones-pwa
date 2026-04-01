// ============================================================================
// 33_auth_control.gs - SISTEMA DE CONTROL DE ACCESO RBAC
// Sistema Integrado de Gestión Empresarial
// Versión: 1.1 | Fecha: 2 Abril 2026
// CAMBIOS v1.1: + obtenerRolPorEmail_(), tienePermisoEmail_(), tieneNivelEmail_()
// ============================================================================

// ============================================================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================================================

const HOJAS = {
  USUARIOS: 'USUARIOS',
  AUDITORIA: 'AUDITORIA',
  CONFIG: 'CONFIG'
};

const COL_USUARIOS = {
  NOMBRE: 0,
  EMAIL: 1,
  ROL: 2,
  ACTIVO: 3,
  ZONAS: 4,
  CENTROS: 5,
  FECHA_ALTA: 6,
  FECHA_BAJA: 7,
  CREADO_POR: 8,
  NOTAS: 9
};

const ROLES = {
  SUPER_ADMIN: {
    nombre: 'Super Administrador',
    nivel: 1,
    descripcion: 'Acceso total al sistema. IT/Informático.',
    color: '#FF0000'
  },
  ADMIN_LICITACIONES: {
    nombre: 'Administrador de Licitaciones',
    nivel: 2,
    descripcion: 'Control total del módulo de licitaciones.',
    color: '#FF6600'
  },
  ADMIN_RRHH: {
    nombre: 'Administrador de RRHH',
    nivel: 2,
    descripcion: 'Control total del módulo RRHH (PRL/RGPD).',
    color: '#FF6600'
  },
  ADMIN_TERRITORIO: {
    nombre: 'Administrador de Territorio',
    nivel: 2,
    descripcion: 'Control total del módulo de territorio.',
    color: '#FF6600'
  },
  DIRECTOR_GERENTE: {
    nombre: 'Director / Gerente',
    nivel: 3,
    descripcion: 'Lectura de todos los módulos + dashboards.',
    color: '#0066CC'
  },
  RESPONSABLE_COMERCIAL: {
    nombre: 'Responsable Comercial',
    nivel: 3,
    descripcion: 'Gestión completa licitaciones + lectura RRHH.',
    color: '#0066CC'
  },
  RESPONSABLE_PRL: {
    nombre: 'Responsable PRL',
    nivel: 3,
    descripcion: 'Gestión submódulo PRL dentro de RRHH.',
    color: '#0066CC'
  },
  RESPONSABLE_RGPD: {
    nombre: 'Responsable RGPD',
    nivel: 3,
    descripcion: 'Gestión submódulo RGPD + auditorías.',
    color: '#0066CC'
  },
  SUPERVISOR_TERRITORIO: {
    nombre: 'Supervisor de Territorio',
    nivel: 4,
    descripcion: 'Gestión parcial territorio (solo su zona) + app.',
    color: '#009933'
  },
  ENCARGADO_ZONA: {
    nombre: 'Encargado de Zona',
    nivel: 4,
    descripcion: 'Gestión parcial territorio (solo su zona) + app.',
    color: '#009933'
  },
  TRABAJADOR_CAMPO: {
    nombre: 'Trabajador de Campo',
    nivel: 5,
    descripcion: 'Acceso app móvil: servicios, incidencias, checklist.',
    color: '#666666'
  },
  TRABAJADOR_LECTURA: {
    nombre: 'Trabajador (Solo Lectura)',
    nivel: 5,
    descripcion: 'Solo consulta de información en app.',
    color: '#999999'
  }
};

const PERMISOS_POR_ROL = {

  SUPER_ADMIN: ['*'],

  ADMIN_LICITACIONES: [
    'LICIT_CREAR', 'LICIT_MODIFICAR', 'LICIT_ELIMINAR', 'LICIT_VER',
    'LICIT_ANALISIS_IA', 'LICIT_CALCULO', 'LICIT_INFORME',
    'LICIT_CONFIG_PASO0', 'LICIT_PRECIOS_REFERENCIA',
    'LICIT_EXPORTAR', 'LICIT_HISTORICO',
    'CONFIG_LICITACIONES'
  ],

  ADMIN_RRHH: [
    'RRHH_CREAR_EMPLEADO', 'RRHH_MODIFICAR_EMPLEADO', 'RRHH_VER_EMPLEADO',
    'RRHH_ELIMINAR_EMPLEADO',
    'PRL_GESTIONAR', 'PRL_EPIS', 'PRL_RECONOCIMIENTOS', 'PRL_FORMACION',
    'PRL_DOCUMENTOS', 'PRL_INFORMES',
    'RGPD_GESTIONAR', 'RGPD_CONSENTIMIENTOS', 'RGPD_ARCO', 'RGPD_AUDITORIA',
    'RRHH_AUSENCIAS', 'RRHH_VACACIONES', 'RRHH_DOCUMENTOS',
    'RRHH_SUBROGACION', 'RRHH_INFORMES', 'RRHH_EXPORTAR',
    'CONFIG_RRHH'
  ],

  ADMIN_TERRITORIO: [
    'TERR_CREAR_CENTRO', 'TERR_MODIFICAR_CENTRO', 'TERR_ELIMINAR_CENTRO',
    'TERR_VER_CENTRO',
    'TERR_PLANIFICACION', 'TERR_ASIGNAR_PERSONAL', 'TERR_RUTAS',
    'TERR_SERVICIOS', 'TERR_INCIDENCIAS', 'TERR_INCIDENCIAS_GESTIONAR',
    'TERR_INVENTARIO', 'TERR_MAQUINARIA',
    'TERR_MAPA_TIEMPO_REAL', 'TERR_INFORMES_CLIENTE',
    'TERR_EXPORTAR',
    'CONFIG_TERRITORIO'
  ],

  DIRECTOR_GERENTE: [
    'LICIT_VER', 'LICIT_INFORME',
    'RRHH_VER_EMPLEADO', 'RRHH_INFORMES',
    'TERR_VER_CENTRO', 'TERR_MAPA_TIEMPO_REAL', 'TERR_INFORMES_CLIENTE',
    'DASHBOARD_GENERAL', 'DASHBOARD_LICITACIONES', 'DASHBOARD_RRHH', 'DASHBOARD_TERRITORIO'
  ],

  RESPONSABLE_COMERCIAL: [
    'LICIT_CREAR', 'LICIT_MODIFICAR', 'LICIT_VER',
    'LICIT_ANALISIS_IA', 'LICIT_CALCULO', 'LICIT_INFORME',
    'LICIT_HISTORICO', 'LICIT_EXPORTAR',
    'RRHH_VER_EMPLEADO',
    'DASHBOARD_LICITACIONES'
  ],

  RESPONSABLE_PRL: [
    'PRL_GESTIONAR', 'PRL_EPIS', 'PRL_RECONOCIMIENTOS', 'PRL_FORMACION',
    'PRL_DOCUMENTOS', 'PRL_INFORMES',
    'RRHH_VER_EMPLEADO',
    'DASHBOARD_PRL'
  ],

  RESPONSABLE_RGPD: [
    'RGPD_GESTIONAR', 'RGPD_CONSENTIMIENTOS', 'RGPD_ARCO', 'RGPD_AUDITORIA',
    'RRHH_VER_EMPLEADO',
    'TERR_VER_CENTRO',
    'VER_LOGS_AUDITORIA',
    'DASHBOARD_RGPD'
  ],

  SUPERVISOR_TERRITORIO: [
    'TERR_VER_CENTRO',
    'TERR_SERVICIOS',
    'TERR_INCIDENCIAS', 'TERR_INCIDENCIAS_GESTIONAR',
    'TERR_INVENTARIO',
    'TERR_MAPA_TIEMPO_REAL',
    'TERR_INFORMES_CLIENTE',
    'TERR_ASIGNAR_TAREAS',
    'RRHH_VER_EMPLEADO',
    'APP_ACCESO', 'APP_DASHBOARD_SUPERVISION',
    'DASHBOARD_TERRITORIO'
  ],

  ENCARGADO_ZONA: [
    'TERR_VER_CENTRO',
    'TERR_SERVICIOS',
    'TERR_INCIDENCIAS',
    'TERR_INVENTARIO',
    'APP_ACCESO', 'APP_DASHBOARD_SUPERVISION'
  ],

  TRABAJADOR_CAMPO: [
    'APP_ACCESO',
    'APP_INICIAR_SERVICIO', 'APP_FINALIZAR_SERVICIO',
    'APP_COMPLETAR_CHECKLIST',
    'APP_REPORTAR_INCIDENCIA',
    'APP_SOLICITAR_MATERIAL',
    'APP_VER_MI_CENTRO', 'APP_VER_MIS_TAREAS'
  ],

  TRABAJADOR_LECTURA: [
    'APP_ACCESO',
    'APP_VER_MI_CENTRO', 'APP_VER_MIS_TAREAS'
  ]
};


// ============================================================================
// FUNCIONES PRINCIPALES DE AUTENTICACIÓN (uso desde UI/menús)
// ============================================================================

function obtenerRolUsuario() {
  try {
    const email = Session.getActiveUser().getEmail();
    if (!email) {
      Logger.log('ERROR: No se pudo obtener el email del usuario activo.');
      return null;
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaUsuarios = ss.getSheetByName(HOJAS.USUARIOS);
    if (!hojaUsuarios) {
      Logger.log('ERROR: No existe la hoja ' + HOJAS.USUARIOS);
      return null;
    }
    const datos = hojaUsuarios.getDataRange().getValues();
    for (let i = 1; i < datos.length; i++) {
      if (datos[i][COL_USUARIOS.EMAIL] &&
          datos[i][COL_USUARIOS.EMAIL].toString().toLowerCase().trim() === email.toLowerCase().trim()) {
        const usuario = {
          fila: i + 1,
          nombre: datos[i][COL_USUARIOS.NOMBRE] || '',
          email: email,
          rol: datos[i][COL_USUARIOS.ROL] || '',
          activo: datos[i][COL_USUARIOS.ACTIVO] === true || datos[i][COL_USUARIOS.ACTIVO] === 'TRUE',
          zonas_asignadas: datos[i][COL_USUARIOS.ZONAS]
            ? datos[i][COL_USUARIOS.ZONAS].toString().split(',').map(z => z.trim()).filter(z => z)
            : [],
          centros_asignados: datos[i][COL_USUARIOS.CENTROS]
            ? datos[i][COL_USUARIOS.CENTROS].toString().split(',').map(c => c.trim()).filter(c => c)
            : [],
          fecha_alta: datos[i][COL_USUARIOS.FECHA_ALTA] || '',
          notas: datos[i][COL_USUARIOS.NOTAS] || ''
        };
        if (!usuario.activo) {
          Logger.log('AVISO: Usuario ' + email + ' está desactivado.');
          return null;
        }
        if (!ROLES[usuario.rol]) {
          Logger.log('ERROR: Rol desconocido "' + usuario.rol + '" para usuario ' + email);
          return null;
        }
        usuario.nivel = ROLES[usuario.rol].nivel;
        usuario.nombre_rol = ROLES[usuario.rol].nombre;
        return usuario;
      }
    }
    Logger.log('AVISO: Usuario ' + email + ' no encontrado en la hoja USUARIOS.');
    return null;
  } catch (error) {
    Logger.log('ERROR en obtenerRolUsuario(): ' + error.message);
    return null;
  }
}

function tienePermiso(permiso) {
  const usuario = obtenerRolUsuario();
  if (!usuario) return false;
  const permisosRol = PERMISOS_POR_ROL[usuario.rol];
  if (!permisosRol) return false;
  if (permisosRol.includes('*')) return true;
  return permisosRol.includes(permiso);
}

function tieneAlgunPermiso(permisos) {
  const usuario = obtenerRolUsuario();
  if (!usuario) return false;
  const permisosRol = PERMISOS_POR_ROL[usuario.rol];
  if (!permisosRol) return false;
  if (permisosRol.includes('*')) return true;
  return permisos.some(p => permisosRol.includes(p));
}

function tieneTodosPermisos(permisos) {
  const usuario = obtenerRolUsuario();
  if (!usuario) return false;
  const permisosRol = PERMISOS_POR_ROL[usuario.rol];
  if (!permisosRol) return false;
  if (permisosRol.includes('*')) return true;
  return permisos.every(p => permisosRol.includes(p));
}

function tieneNivelMinimo(nivelRequerido) {
  const usuario = obtenerRolUsuario();
  if (!usuario) return false;
  return usuario.nivel <= nivelRequerido;
}


// ============================================================================
// DECORADORES DE PERMISOS
// ============================================================================

function ejecutarConPermiso(permisoRequerido, funcion, nombreAccion) {
  const usuario = obtenerRolUsuario();
  if (!usuario) {
    SpreadsheetApp.getUi().alert(
      '⛔ Acceso Denegado',
      'No estás registrado en el sistema. Contacta con el administrador.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return null;
  }
  if (!tienePermiso(permisoRequerido)) {
    SpreadsheetApp.getUi().alert(
      '⛔ Sin Permisos',
      'No tienes permisos para: ' + nombreAccion + '\n\n' +
      'Tu rol (' + usuario.nombre_rol + ') no incluye este permiso.\n' +
      'Contacta con el Super Administrador si necesitas acceso.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    registrarAccion('ACCESO_DENEGADO: ' + nombreAccion + ' (requería: ' + permisoRequerido + ')', usuario);
    return null;
  }
  registrarAccion(nombreAccion, usuario);
  return funcion(usuario);
}

function ejecutarConNivel(nivelMinimo, funcion, nombreAccion) {
  const usuario = obtenerRolUsuario();
  if (!usuario) {
    SpreadsheetApp.getUi().alert('⛔ Acceso Denegado', 'No estás registrado en el sistema.', SpreadsheetApp.getUi().ButtonSet.OK);
    return null;
  }
  if (usuario.nivel > nivelMinimo) {
    SpreadsheetApp.getUi().alert(
      '⛔ Nivel Insuficiente',
      'Esta acción requiere nivel ' + nivelMinimo + ' o superior.\n' +
      'Tu nivel actual: ' + usuario.nivel + ' (' + usuario.nombre_rol + ')',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    registrarAccion('NIVEL_INSUFICIENTE: ' + nombreAccion, usuario);
    return null;
  }
  registrarAccion(nombreAccion, usuario);
  return funcion(usuario);
}


// ============================================================================
// FILTROS POR ALCANCE GEOGRÁFICO
// ============================================================================

function filtrarDatosSegunAlcance(datos, tipo, columnas) {
  const usuario = obtenerRolUsuario();
  if (!usuario) return [];
  if (usuario.nivel <= 3) return datos;
  const colConfig = columnas || {
    zona: tipo === 'CENTROS' ? 3 : tipo === 'EMPLEADOS' ? 5 : 2,
    centro: tipo === 'CENTROS' ? 0 : tipo === 'EMPLEADOS' ? 6 : 3
  };
  return datos.filter(fila => {
    const zonaFila = fila[colConfig.zona] ? fila[colConfig.zona].toString().trim() : '';
    const centroFila = fila[colConfig.centro] ? fila[colConfig.centro].toString().trim() : '';
    if (usuario.zonas_asignadas.length > 0 && usuario.zonas_asignadas.includes(zonaFila)) return true;
    if (usuario.centros_asignados.length > 0 && usuario.centros_asignados.includes(centroFila)) return true;
    return false;
  });
}

function tieneAccesoCentro(idCentro) {
  const usuario = obtenerRolUsuario();
  if (!usuario) return false;
  if (usuario.nivel <= 3) return true;
  return usuario.centros_asignados.includes(idCentro);
}

function tieneAccesoZona(zona) {
  const usuario = obtenerRolUsuario();
  if (!usuario) return false;
  if (usuario.nivel <= 3) return true;
  return usuario.zonas_asignadas.includes(zona);
}


// ============================================================================
// SISTEMA DE AUDITORÍA
// ============================================================================

function registrarAccion(accion, usuario) {
  try {
    if (!usuario) usuario = obtenerRolUsuario();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaAuditoria = ss.getSheetByName(HOJAS.AUDITORIA);
    if (!hojaAuditoria) {
      Logger.log('AVISO: No existe hoja AUDITORIA. No se registró: ' + accion);
      return;
    }
    const nuevaFila = [
      new Date(),
      usuario ? usuario.email : Session.getActiveUser().getEmail(),
      usuario ? usuario.nombre : 'Desconocido',
      usuario ? usuario.rol : 'SIN_ROL',
      accion,
      Session.getTemporaryActiveUserKey(),
      obtenerIPAproximada_()
    ];
    hojaAuditoria.appendRow(nuevaFila);
  } catch (error) {
    Logger.log('ERROR registrando auditoría: ' + error.message);
  }
}

function obtenerIPAproximada_() {
  try {
    return 'Zona horaria: ' + Session.getScriptTimeZone() + ' | Locale: ' + Session.getActiveUserLocale();
  } catch (e) {
    return 'N/A';
  }
}


// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

function obtenerRolesValidos() {
  return Object.keys(ROLES);
}

function obtenerInfoRol(codigoRol) {
  return ROLES[codigoRol] || null;
}

function obtenerPermisosRol(codigoRol) {
  return PERMISOS_POR_ROL[codigoRol] || [];
}

function esSuperAdmin() {
  const usuario = obtenerRolUsuario();
  return usuario && usuario.rol === 'SUPER_ADMIN';
}

function esAdministrador() {
  const usuario = obtenerRolUsuario();
  return usuario && usuario.nivel <= 2;
}

function obtenerResumenUsuarioActual() {
  const usuario = obtenerRolUsuario();
  if (!usuario) return 'Usuario no registrado';
  return usuario.nombre + ' | ' + usuario.nombre_rol + ' (Nivel ' + usuario.nivel + ')';
}

function mostrarMiPerfil() {
  const usuario = obtenerRolUsuario();
  if (!usuario) {
    SpreadsheetApp.getUi().alert('No estás registrado en el sistema.');
    return;
  }
  const info = [
    '👤 ' + usuario.nombre,
    '📧 ' + usuario.email,
    '🔑 Rol: ' + usuario.nombre_rol,
    '📊 Nivel: ' + usuario.nivel + ' de 5',
    '📅 Alta: ' + (usuario.fecha_alta ? Utilities.formatDate(new Date(usuario.fecha_alta), 'Europe/Madrid', 'dd/MM/yyyy') : 'N/A'),
    '',
    '🗺️ Zonas: ' + (usuario.zonas_asignadas.length > 0 ? usuario.zonas_asignadas.join(', ') : 'Todas'),
    '🏢 Centros: ' + (usuario.centros_asignados.length > 0 ? usuario.centros_asignados.join(', ') : 'Todos'),
    '',
    '✅ Permisos: ' + (PERMISOS_POR_ROL[usuario.rol].includes('*') ? 'TODOS' : PERMISOS_POR_ROL[usuario.rol].length + ' permisos asignados')
  ];
  SpreadsheetApp.getUi().alert('Mi Perfil', info.join('\n'), SpreadsheetApp.getUi().ButtonSet.OK);
}


// ============================================================================
// NUEVAS FUNCIONES PARA doPost — v1.1
// Buscan por email directamente, sin Session.getActiveUser()
// que no funciona en contexto de Web App con token propio
// ============================================================================

/**
 * Obtiene el rol de un usuario a partir de su email.
 * Uso en doPost donde emailAuth viene del token, no de Session.
 */
function obtenerRolPorEmail_(email) {
  try {
    if (!email) return null;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var hojaUsuarios = ss.getSheetByName(HOJAS.USUARIOS);
    if (!hojaUsuarios) return null;

    var datos = hojaUsuarios.getDataRange().getValues();
    for (var i = 1; i < datos.length; i++) {
      var emailFila = datos[i][COL_USUARIOS.EMAIL];
      if (!emailFila) continue;
      if (emailFila.toString().toLowerCase().trim() !== email.toLowerCase().trim()) continue;

      var activo = datos[i][COL_USUARIOS.ACTIVO];
      if (!(activo === true || activo === 'TRUE' || activo === 'true' || activo === 1)) return null;

      var rol = datos[i][COL_USUARIOS.ROL] || '';
      if (!ROLES[rol]) return null;

      return {
        nombre:            datos[i][COL_USUARIOS.NOMBRE] || '',
        email:             email,
        rol:               rol,
        nivel:             ROLES[rol].nivel,
        nombre_rol:        ROLES[rol].nombre,
        zonas_asignadas:   datos[i][COL_USUARIOS.ZONAS]
          ? datos[i][COL_USUARIOS.ZONAS].toString().split(',').map(function(z){return z.trim();}).filter(function(z){return z;})
          : [],
        centros_asignados: datos[i][COL_USUARIOS.CENTROS]
          ? datos[i][COL_USUARIOS.CENTROS].toString().split(',').map(function(c){return c.trim();}).filter(function(c){return c;})
          : []
      };
    }
    return null;
  } catch (error) {
    Logger.log('ERROR en obtenerRolPorEmail_(): ' + error.message);
    return null;
  }
}

/**
 * Verifica si un email tiene un permiso concreto.
 * Retorna { ok: true } o { ok: false, error: '...' }
 * Uso en doPost para proteger acciones críticas.
 */
function tienePermisoEmail_(email, permiso) {
  var usuario = obtenerRolPorEmail_(email);
  if (!usuario) return { ok: false, error: 'Usuario no encontrado o inactivo en el sistema' };

  var permisosRol = PERMISOS_POR_ROL[usuario.rol];
  if (!permisosRol) return { ok: false, error: 'Rol sin permisos definidos' };

  if (permisosRol.indexOf('*') !== -1) return { ok: true };
  if (permisosRol.indexOf(permiso) !== -1) return { ok: true };

  return {
    ok: false,
    error: 'Sin permisos. Tu rol (' + usuario.nombre_rol + ') no puede realizar esta acción.'
  };
}

/**
 * Verifica si un email tiene nivel jerárquico suficiente.
 * nivel 1 = más alto (SUPER_ADMIN), nivel 5 = más bajo (TRABAJADOR).
 */
function tieneNivelEmail_(email, nivelRequerido) {
  var usuario = obtenerRolPorEmail_(email);
  if (!usuario) return { ok: false, error: 'Usuario no encontrado o inactivo en el sistema' };
  if (usuario.nivel <= nivelRequerido) return { ok: true };
  return {
    ok: false,
    error: 'Acción reservada a nivel ' + nivelRequerido + ' o superior. Tu nivel es ' + usuario.nivel + ' (' + usuario.nombre_rol + ').'
  };
}