// ============================================================================
// 33_auth_control.gs - SISTEMA DE CONTROL DE ACCESO RBAC
// Sistema Integrado de Gestión Empresarial
// Versión: 1.0 | Fecha: Marzo 2026
// ============================================================================
// Este módulo implementa el control de acceso basado en roles (RBAC)
// con 12 roles predefinidos en 5 niveles jerárquicos.
// ============================================================================

// ============================================================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================================================

/**
 * Nombre de las hojas del sistema
 */
const HOJAS = {
  USUARIOS: 'USUARIOS',
  AUDITORIA: 'AUDITORIA',
  CONFIG: 'CONFIG'
};

/**
 * Columnas de la hoja USUARIOS (índice 0)
 */
const COL_USUARIOS = {
  NOMBRE: 0,        // A: Nombre completo
  EMAIL: 1,         // B: Email (Google Workspace)
  ROL: 2,           // C: Rol asignado
  ACTIVO: 3,        // D: TRUE/FALSE
  ZONAS: 4,         // E: Zonas asignadas (separadas por coma)
  CENTROS: 5,       // F: Centros asignados (separados por coma)
  FECHA_ALTA: 6,    // G: Fecha de alta
  FECHA_BAJA: 7,    // H: Fecha de baja (si aplica)
  CREADO_POR: 8,    // I: Email del creador
  NOTAS: 9          // J: Notas adicionales
};

/**
 * Definición de los 12 roles del sistema organizados por nivel jerárquico
 */
const ROLES = {
  // ── NIVEL 1: SUPER ADMINISTRADOR ──
  SUPER_ADMIN: {
    nombre: 'Super Administrador',
    nivel: 1,
    descripcion: 'Acceso total al sistema. IT/Informático.',
    color: '#FF0000'
  },

  // ── NIVEL 2: ADMINISTRADORES POR MÓDULO ──
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

  // ── NIVEL 3: GESTIÓN ──
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

  // ── NIVEL 4: SUPERVISIÓN ──
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

  // ── NIVEL 5: OPERATIVO ──
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

/**
 * Matriz completa de permisos por rol
 * Cada permiso es una cadena que identifica una acción específica del sistema
 */
const PERMISOS_POR_ROL = {

  SUPER_ADMIN: ['*'], // Comodín = todos los permisos

  // ── ADMINISTRADORES ──
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

  // ── GESTIÓN ──
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
    'RRHH_VER_EMPLEADO', // Solo lectura RRHH para consultar disponibilidad
    'DASHBOARD_LICITACIONES'
  ],

  RESPONSABLE_PRL: [
    'PRL_GESTIONAR', 'PRL_EPIS', 'PRL_RECONOCIMIENTOS', 'PRL_FORMACION',
    'PRL_DOCUMENTOS', 'PRL_INFORMES',
    'RRHH_VER_EMPLEADO', // Solo lectura de datos básicos empleados
    'DASHBOARD_PRL'
  ],

  RESPONSABLE_RGPD: [
    'RGPD_GESTIONAR', 'RGPD_CONSENTIMIENTOS', 'RGPD_ARCO', 'RGPD_AUDITORIA',
    'RRHH_VER_EMPLEADO', // Solo lectura de datos básicos
    'TERR_VER_CENTRO',   // Solo lectura territorio (auditoría datos)
    'VER_LOGS_AUDITORIA', // Acceso a logs del sistema
    'DASHBOARD_RGPD'
  ],

  // ── SUPERVISIÓN ──
  SUPERVISOR_TERRITORIO: [
    'TERR_VER_CENTRO',   // Solo sus centros/zona
    'TERR_SERVICIOS',    // Gestionar servicios de su zona
    'TERR_INCIDENCIAS', 'TERR_INCIDENCIAS_GESTIONAR',
    'TERR_INVENTARIO',   // Solicitar material
    'TERR_MAPA_TIEMPO_REAL', // Solo su zona
    'TERR_INFORMES_CLIENTE', // Generar informes de sus centros
    'TERR_ASIGNAR_TAREAS',  // Asignar tareas desde app
    'RRHH_VER_EMPLEADO',    // Solo lectura de su equipo
    'APP_ACCESO', 'APP_DASHBOARD_SUPERVISION',
    'DASHBOARD_TERRITORIO'
  ],

  ENCARGADO_ZONA: [
    'TERR_VER_CENTRO',     // Solo sus centros
    'TERR_SERVICIOS',
    'TERR_INCIDENCIAS',    // Reportar incidencias
    'TERR_INVENTARIO',     // Solicitar material
    'APP_ACCESO', 'APP_DASHBOARD_SUPERVISION'
  ],

  // ── OPERATIVO ──
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
    // Solo consulta, no puede modificar nada
  ]
};


// ============================================================================
// FUNCIONES PRINCIPALES DE AUTENTICACIÓN
// ============================================================================

/**
 * Obtiene los datos del usuario actual autenticado
 * @returns {Object|null} Datos del usuario o null si no encontrado
 */
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
    
    // Buscar usuario por email (columna B, índice 1)
    for (let i = 1; i < datos.length; i++) {
      if (datos[i][COL_USUARIOS.EMAIL] && 
          datos[i][COL_USUARIOS.EMAIL].toString().toLowerCase().trim() === email.toLowerCase().trim()) {
        
        const usuario = {
          fila: i + 1, // Fila real en la hoja (1-indexed)
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
        
        // Verificar que el usuario está activo
        if (!usuario.activo) {
          Logger.log('AVISO: Usuario ' + email + ' está desactivado.');
          return null;
        }
        
        // Verificar que el rol existe
        if (!ROLES[usuario.rol]) {
          Logger.log('ERROR: Rol desconocido "' + usuario.rol + '" para usuario ' + email);
          return null;
        }
        
        // Añadir información del rol
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

/**
 * Verifica si el usuario actual tiene un permiso específico
 * @param {string} permiso - Código del permiso a verificar
 * @returns {boolean} true si tiene el permiso
 */
function tienePermiso(permiso) {
  const usuario = obtenerRolUsuario();
  
  if (!usuario) return false;
  
  const permisosRol = PERMISOS_POR_ROL[usuario.rol];
  
  if (!permisosRol) return false;
  
  // Comodín: SUPER_ADMIN tiene todos los permisos
  if (permisosRol.includes('*')) return true;
  
  return permisosRol.includes(permiso);
}

/**
 * Verifica si el usuario tiene AL MENOS UNO de los permisos indicados
 * @param {string[]} permisos - Array de códigos de permiso
 * @returns {boolean}
 */
function tieneAlgunPermiso(permisos) {
  const usuario = obtenerRolUsuario();
  if (!usuario) return false;
  
  const permisosRol = PERMISOS_POR_ROL[usuario.rol];
  if (!permisosRol) return false;
  if (permisosRol.includes('*')) return true;
  
  return permisos.some(p => permisosRol.includes(p));
}

/**
 * Verifica si el usuario tiene TODOS los permisos indicados
 * @param {string[]} permisos - Array de códigos de permiso
 * @returns {boolean}
 */
function tieneTodosPermisos(permisos) {
  const usuario = obtenerRolUsuario();
  if (!usuario) return false;
  
  const permisosRol = PERMISOS_POR_ROL[usuario.rol];
  if (!permisosRol) return false;
  if (permisosRol.includes('*')) return true;
  
  return permisos.every(p => permisosRol.includes(p));
}

/**
 * Verifica si el usuario tiene un nivel jerárquico igual o superior al indicado
 * (nivel 1 = más alto, nivel 5 = más bajo)
 * @param {number} nivelRequerido - Nivel mínimo requerido (1-5)
 * @returns {boolean}
 */
function tieneNivelMinimo(nivelRequerido) {
  const usuario = obtenerRolUsuario();
  if (!usuario) return false;
  
  return usuario.nivel <= nivelRequerido;
}


// ============================================================================
// DECORADORES DE PERMISOS (Wrappers para funciones protegidas)
// ============================================================================

/**
 * Ejecuta una función solo si el usuario tiene el permiso requerido.
 * Si no tiene permiso, muestra un mensaje y registra el intento.
 * 
 * @param {string} permisoRequerido - Código del permiso
 * @param {Function} funcion - Función a ejecutar
 * @param {string} nombreAccion - Descripción de la acción (para logs)
 * @returns {*} Resultado de la función o null si no autorizado
 */
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
  
  // Tiene permiso: ejecutar y registrar
  registrarAccion(nombreAccion, usuario);
  return funcion(usuario);
}

/**
 * Ejecuta una función solo si el usuario tiene nivel jerárquico suficiente
 * @param {number} nivelMinimo - Nivel mínimo requerido (1 = más alto)
 * @param {Function} funcion - Función a ejecutar
 * @param {string} nombreAccion - Descripción de la acción
 * @returns {*}
 */
function ejecutarConNivel(nivelMinimo, funcion, nombreAccion) {
  const usuario = obtenerRolUsuario();
  
  if (!usuario) {
    SpreadsheetApp.getUi().alert(
      '⛔ Acceso Denegado',
      'No estás registrado en el sistema.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
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

/**
 * Filtra un array de datos según el alcance geográfico del usuario.
 * Los roles de nivel 1-3 ven todos los datos.
 * Supervisores y trabajadores solo ven sus zonas/centros.
 * 
 * @param {Array[]} datos - Array de filas de datos
 * @param {string} tipo - Tipo de datos: 'CENTROS', 'EMPLEADOS', 'SERVICIOS', 'INCIDENCIAS'
 * @param {Object} [columnas] - Índices de columnas relevantes
 * @param {number} [columnas.zona] - Índice de la columna zona
 * @param {number} [columnas.centro] - Índice de la columna centro
 * @returns {Array[]} Datos filtrados
 */
function filtrarDatosSegunAlcance(datos, tipo, columnas) {
  const usuario = obtenerRolUsuario();
  if (!usuario) return [];
  
  // Niveles 1, 2 y 3 ven todo
  if (usuario.nivel <= 3) return datos;
  
  // Configuración por defecto de columnas según tipo
  const colConfig = columnas || {
    zona: tipo === 'CENTROS' ? 3 : tipo === 'EMPLEADOS' ? 5 : 2,
    centro: tipo === 'CENTROS' ? 0 : tipo === 'EMPLEADOS' ? 6 : 3
  };
  
  return datos.filter(fila => {
    const zonaFila = fila[colConfig.zona] ? fila[colConfig.zona].toString().trim() : '';
    const centroFila = fila[colConfig.centro] ? fila[colConfig.centro].toString().trim() : '';
    
    // ¿Tiene la zona asignada?
    if (usuario.zonas_asignadas.length > 0 && usuario.zonas_asignadas.includes(zonaFila)) {
      return true;
    }
    
    // ¿Tiene el centro asignado?
    if (usuario.centros_asignados.length > 0 && usuario.centros_asignados.includes(centroFila)) {
      return true;
    }
    
    return false;
  });
}

/**
 * Verifica si el usuario tiene acceso a un centro específico
 * @param {string} idCentro - ID del centro
 * @returns {boolean}
 */
function tieneAccesoCentro(idCentro) {
  const usuario = obtenerRolUsuario();
  if (!usuario) return false;
  
  // Niveles 1-3 tienen acceso a todos los centros
  if (usuario.nivel <= 3) return true;
  
  return usuario.centros_asignados.includes(idCentro);
}

/**
 * Verifica si el usuario tiene acceso a una zona específica
 * @param {string} zona - Nombre/código de la zona
 * @returns {boolean}
 */
function tieneAccesoZona(zona) {
  const usuario = obtenerRolUsuario();
  if (!usuario) return false;
  
  if (usuario.nivel <= 3) return true;
  
  return usuario.zonas_asignadas.includes(zona);
}


// ============================================================================
// SISTEMA DE AUDITORÍA
// ============================================================================

/**
 * Registra una acción en la hoja de auditoría
 * @param {string} accion - Descripción de la acción realizada
 * @param {Object} [usuario] - Datos del usuario (si ya se tienen)
 */
function registrarAccion(accion, usuario) {
  try {
    if (!usuario) {
      usuario = obtenerRolUsuario();
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaAuditoria = ss.getSheetByName(HOJAS.AUDITORIA);
    
    if (!hojaAuditoria) {
      Logger.log('AVISO: No existe hoja AUDITORIA. No se registró: ' + accion);
      return;
    }
    
    const nuevaFila = [
      new Date(),                                          // A: Timestamp
      usuario ? usuario.email : Session.getActiveUser().getEmail(), // B: Email
      usuario ? usuario.nombre : 'Desconocido',            // C: Nombre
      usuario ? usuario.rol : 'SIN_ROL',                   // D: Rol
      accion,                                              // E: Acción
      Session.getTemporaryActiveUserKey(),                  // F: Session Key
      obtenerIPAproximada_()                                // G: Info adicional
    ];
    
    hojaAuditoria.appendRow(nuevaFila);
    
  } catch (error) {
    Logger.log('ERROR registrando auditoría: ' + error.message);
  }
}

/**
 * Obtiene información aproximada de la sesión (no IP real por limitaciones de GAS)
 * @returns {string}
 * @private
 */
function obtenerIPAproximada_() {
  try {
    return 'Zona horaria: ' + Session.getScriptTimeZone() + 
           ' | Locale: ' + Session.getActiveUserLocale();
  } catch (e) {
    return 'N/A';
  }
}


// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

/**
 * Devuelve la lista de roles válidos del sistema
 * @returns {string[]}
 */
function obtenerRolesValidos() {
  return Object.keys(ROLES);
}

/**
 * Devuelve información completa de un rol
 * @param {string} codigoRol - Código del rol (ej: 'SUPER_ADMIN')
 * @returns {Object|null}
 */
function obtenerInfoRol(codigoRol) {
  return ROLES[codigoRol] || null;
}

/**
 * Devuelve los permisos de un rol
 * @param {string} codigoRol - Código del rol
 * @returns {string[]}
 */
function obtenerPermisosRol(codigoRol) {
  return PERMISOS_POR_ROL[codigoRol] || [];
}

/**
 * Verifica si el usuario actual es Super Admin
 * @returns {boolean}
 */
function esSuperAdmin() {
  const usuario = obtenerRolUsuario();
  return usuario && usuario.rol === 'SUPER_ADMIN';
}

/**
 * Verifica si el usuario actual es administrador (nivel 1 o 2)
 * @returns {boolean}
 */
function esAdministrador() {
  const usuario = obtenerRolUsuario();
  return usuario && usuario.nivel <= 2;
}

/**
 * Obtiene un resumen del usuario actual para mostrar en la UI
 * @returns {string}
 */
function obtenerResumenUsuarioActual() {
  const usuario = obtenerRolUsuario();
  if (!usuario) return 'Usuario no registrado';
  
  return usuario.nombre + ' | ' + usuario.nombre_rol + ' (Nivel ' + usuario.nivel + ')';
}

/**
 * Muestra un diálogo con la información del usuario actual
 */
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