// ============================================================================
// 34_usuarios_crud.gs - GESTIÓN DE USUARIOS (CRUD)
// Sistema Integrado de Gestión Empresarial
// Versión: 1.0 | Fecha: Marzo 2026
// ============================================================================
// Funciones para crear, modificar, desactivar y consultar usuarios.
// Requiere: 33_auth_control.gs cargado previamente.
// ============================================================================


// ============================================================================
// CREAR USUARIO
// ============================================================================

/**
 * Crea un nuevo usuario en el sistema.
 * Solo SUPER_ADMIN puede crear usuarios.
 */
function crearNuevoUsuario() {
  ejecutarConPermiso('*', _crearNuevoUsuario, 'Crear nuevo usuario');
}

function _crearNuevoUsuario(usuarioActual) {
  const ui = SpreadsheetApp.getUi();
  
  // 1. Pedir nombre
  const respNombre = ui.prompt('Crear Usuario (1/4)', 'Nombre completo del nuevo usuario:', ui.ButtonSet.OK_CANCEL);
  if (respNombre.getSelectedButton() !== ui.Button.OK) return;
  const nombre = respNombre.getResponseText().trim();
  if (!nombre) { ui.alert('Error', 'El nombre no puede estar vacío.', ui.ButtonSet.OK); return; }
  
  // 2. Pedir email
  const respEmail = ui.prompt('Crear Usuario (2/4)', 'Email (Google Workspace) del usuario:', ui.ButtonSet.OK_CANCEL);
  if (respEmail.getSelectedButton() !== ui.Button.OK) return;
  const email = respEmail.getResponseText().trim().toLowerCase();
  if (!email || !email.includes('@')) { ui.alert('Error', 'Email no válido.', ui.ButtonSet.OK); return; }
  
  // Verificar que no exista ya
  if (_buscarUsuarioPorEmail(email)) {
    ui.alert('Error', 'Ya existe un usuario con el email: ' + email, ui.ButtonSet.OK);
    return;
  }
  
  // 3. Pedir rol
  const rolesDisponibles = Object.keys(ROLES).map((r, i) => (i + 1) + '. ' + r + ' (' + ROLES[r].nombre + ')').join('\n');
  const respRol = ui.prompt(
    'Crear Usuario (3/4)',
    'Selecciona el rol (escribe el número):\n\n' + rolesDisponibles,
    ui.ButtonSet.OK_CANCEL
  );
  if (respRol.getSelectedButton() !== ui.Button.OK) return;
  
  const indiceRol = parseInt(respRol.getResponseText().trim()) - 1;
  const rolesArray = Object.keys(ROLES);
  if (isNaN(indiceRol) || indiceRol < 0 || indiceRol >= rolesArray.length) {
    ui.alert('Error', 'Número de rol no válido.', ui.ButtonSet.OK);
    return;
  }
  const rolSeleccionado = rolesArray[indiceRol];
  
  // 4. Zonas y centros (opcional, solo para niveles 4-5)
  let zonas = '';
  let centros = '';
  if (ROLES[rolSeleccionado].nivel >= 4) {
    const respZonas = ui.prompt(
      'Crear Usuario (4/4)',
      'Zonas asignadas (separadas por coma, dejar vacío si no aplica):\nEjemplo: Zona Norte, Zona Sur',
      ui.ButtonSet.OK_CANCEL
    );
    if (respZonas.getSelectedButton() === ui.Button.OK) {
      zonas = respZonas.getResponseText().trim();
    }
    
    const respCentros = ui.prompt(
      'Centros Asignados',
      'IDs de centros asignados (separados por coma, dejar vacío si no aplica):\nEjemplo: CENTRO-001, CENTRO-002',
      ui.ButtonSet.OK_CANCEL
    );
    if (respCentros.getSelectedButton() === ui.Button.OK) {
      centros = respCentros.getResponseText().trim();
    }
  }
  
  // Confirmar
  const confirmacion = ui.alert(
    'Confirmar Creación',
    '¿Crear este usuario?\n\n' +
    '👤 Nombre: ' + nombre + '\n' +
    '📧 Email: ' + email + '\n' +
    '🔑 Rol: ' + ROLES[rolSeleccionado].nombre + ' (' + rolSeleccionado + ')\n' +
    '📊 Nivel: ' + ROLES[rolSeleccionado].nivel + '\n' +
    (zonas ? '🗺️ Zonas: ' + zonas + '\n' : '') +
    (centros ? '🏢 Centros: ' + centros + '\n' : ''),
    ui.ButtonSet.YES_NO
  );
  
  if (confirmacion !== ui.Button.YES) return;
  
  // Insertar en la hoja
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJAS.USUARIOS);
  
  hoja.appendRow([
    nombre,                          // A: Nombre
    email,                           // B: Email
    rolSeleccionado,                 // C: Rol
    true,                            // D: Activo
    zonas,                           // E: Zonas
    centros,                         // F: Centros
    new Date(),                      // G: Fecha alta
    '',                              // H: Fecha baja
    usuarioActual.email,             // I: Creado por
    ''                               // J: Notas
  ]);
  
  // Enviar email de bienvenida
  _enviarEmailBienvenida(email, nombre, rolSeleccionado);
  
  registrarAccion('USUARIO_CREADO: ' + email + ' con rol ' + rolSeleccionado, usuarioActual);
  
  ui.alert(
    '✅ Usuario Creado',
    'Se ha creado el usuario correctamente.\n' +
    'Se ha enviado un email de bienvenida a ' + email,
    ui.ButtonSet.OK
  );
}


// ============================================================================
// MODIFICAR ROL DE USUARIO
// ============================================================================

/**
 * Cambia el rol de un usuario existente.
 * Solo SUPER_ADMIN puede cambiar roles.
 */
function modificarRolUsuario() {
  ejecutarConPermiso('*', _modificarRolUsuario, 'Modificar rol de usuario');
}

function _modificarRolUsuario(usuarioActual) {
  const ui = SpreadsheetApp.getUi();
  
  // Pedir email del usuario a modificar
  const respEmail = ui.prompt('Modificar Rol', 'Email del usuario a modificar:', ui.ButtonSet.OK_CANCEL);
  if (respEmail.getSelectedButton() !== ui.Button.OK) return;
  const email = respEmail.getResponseText().trim().toLowerCase();
  
  const datosUsuario = _buscarUsuarioPorEmail(email);
  if (!datosUsuario) {
    ui.alert('Error', 'No se encontró usuario con email: ' + email, ui.ButtonSet.OK);
    return;
  }
  
  // Mostrar rol actual y pedir nuevo rol
  const rolesDisponibles = Object.keys(ROLES).map((r, i) => (i + 1) + '. ' + r + ' (' + ROLES[r].nombre + ')').join('\n');
  const respRol = ui.prompt(
    'Cambiar Rol',
    'Usuario: ' + datosUsuario.nombre + '\n' +
    'Rol actual: ' + datosUsuario.rol + '\n\n' +
    'Selecciona el nuevo rol (escribe el número):\n\n' + rolesDisponibles,
    ui.ButtonSet.OK_CANCEL
  );
  if (respRol.getSelectedButton() !== ui.Button.OK) return;
  
  const indiceRol = parseInt(respRol.getResponseText().trim()) - 1;
  const rolesArray = Object.keys(ROLES);
  if (isNaN(indiceRol) || indiceRol < 0 || indiceRol >= rolesArray.length) {
    ui.alert('Error', 'Número de rol no válido.', ui.ButtonSet.OK);
    return;
  }
  const nuevoRol = rolesArray[indiceRol];
  
  if (nuevoRol === datosUsuario.rol) {
    ui.alert('Sin Cambios', 'El usuario ya tiene ese rol.', ui.ButtonSet.OK);
    return;
  }
  
  // Confirmar
  const confirmacion = ui.alert(
    'Confirmar Cambio de Rol',
    '¿Cambiar el rol de ' + datosUsuario.nombre + '?\n\n' +
    'Rol anterior: ' + datosUsuario.rol + '\n' +
    'Nuevo rol: ' + nuevoRol + ' (' + ROLES[nuevoRol].nombre + ')',
    ui.ButtonSet.YES_NO
  );
  if (confirmacion !== ui.Button.YES) return;
  
  // Actualizar
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJAS.USUARIOS);
  hoja.getRange(datosUsuario.fila, COL_USUARIOS.ROL + 1).setValue(nuevoRol);
  
  // Notificar al usuario
  _enviarEmailCambioRol(email, datosUsuario.nombre, datosUsuario.rol, nuevoRol);
  
  registrarAccion('ROL_MODIFICADO: ' + email + ' de ' + datosUsuario.rol + ' a ' + nuevoRol, usuarioActual);
  
  ui.alert('✅ Rol Actualizado', 'El rol de ' + datosUsuario.nombre + ' ha sido actualizado a ' + ROLES[nuevoRol].nombre + '.', ui.ButtonSet.OK);
}


// ============================================================================
// DESACTIVAR USUARIO
// ============================================================================

/**
 * Desactiva un usuario (no lo elimina, solo pierde acceso).
 * Solo SUPER_ADMIN puede desactivar usuarios.
 */
function desactivarUsuario() {
  ejecutarConPermiso('*', _desactivarUsuario, 'Desactivar usuario');
}

function _desactivarUsuario(usuarioActual) {
  const ui = SpreadsheetApp.getUi();
  
  const respEmail = ui.prompt('Desactivar Usuario', 'Email del usuario a desactivar:', ui.ButtonSet.OK_CANCEL);
  if (respEmail.getSelectedButton() !== ui.Button.OK) return;
  const email = respEmail.getResponseText().trim().toLowerCase();
  
  // No permitir desactivarse a uno mismo
  if (email === usuarioActual.email) {
    ui.alert('Error', 'No puedes desactivar tu propio usuario.', ui.ButtonSet.OK);
    return;
  }
  
  const datosUsuario = _buscarUsuarioPorEmail(email);
  if (!datosUsuario) {
    ui.alert('Error', 'No se encontró usuario con email: ' + email, ui.ButtonSet.OK);
    return;
  }
  
  if (!datosUsuario.activo) {
    ui.alert('Información', 'Este usuario ya está desactivado.', ui.ButtonSet.OK);
    return;
  }
  
  const confirmacion = ui.alert(
    '⚠️ Confirmar Desactivación',
    '¿Desactivar al usuario ' + datosUsuario.nombre + ' (' + email + ')?\n\n' +
    'El usuario perderá acceso inmediatamente al sistema.\n' +
    'Esta acción es reversible (se puede reactivar después).',
    ui.ButtonSet.YES_NO
  );
  if (confirmacion !== ui.Button.YES) return;
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJAS.USUARIOS);
  
  // Desactivar
  hoja.getRange(datosUsuario.fila, COL_USUARIOS.ACTIVO + 1).setValue(false);
  // Registrar fecha de baja
  hoja.getRange(datosUsuario.fila, COL_USUARIOS.FECHA_BAJA + 1).setValue(new Date());
  
  registrarAccion('USUARIO_DESACTIVADO: ' + email, usuarioActual);
  
  ui.alert('✅ Usuario Desactivado', datosUsuario.nombre + ' ha sido desactivado. Ya no tiene acceso al sistema.', ui.ButtonSet.OK);
}


// ============================================================================
// REACTIVAR USUARIO
// ============================================================================

/**
 * Reactiva un usuario previamente desactivado.
 */
function reactivarUsuario() {
  ejecutarConPermiso('*', _reactivarUsuario, 'Reactivar usuario');
}

function _reactivarUsuario(usuarioActual) {
  const ui = SpreadsheetApp.getUi();
  
  const respEmail = ui.prompt('Reactivar Usuario', 'Email del usuario a reactivar:', ui.ButtonSet.OK_CANCEL);
  if (respEmail.getSelectedButton() !== ui.Button.OK) return;
  const email = respEmail.getResponseText().trim().toLowerCase();
  
  const datosUsuario = _buscarUsuarioPorEmail(email, true); // true = incluir inactivos
  if (!datosUsuario) {
    ui.alert('Error', 'No se encontró usuario con email: ' + email, ui.ButtonSet.OK);
    return;
  }
  
  if (datosUsuario.activo) {
    ui.alert('Información', 'Este usuario ya está activo.', ui.ButtonSet.OK);
    return;
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJAS.USUARIOS);
  
  hoja.getRange(datosUsuario.fila, COL_USUARIOS.ACTIVO + 1).setValue(true);
  hoja.getRange(datosUsuario.fila, COL_USUARIOS.FECHA_BAJA + 1).setValue('');
  
  registrarAccion('USUARIO_REACTIVADO: ' + email, usuarioActual);
  
  ui.alert('✅ Usuario Reactivado', datosUsuario.nombre + ' ha sido reactivado.', ui.ButtonSet.OK);
}


// ============================================================================
// ASIGNAR ZONAS Y CENTROS
// ============================================================================

/**
 * Asigna zonas y centros a un usuario (para supervisores y trabajadores).
 */
function asignarZonasCentros() {
  ejecutarConPermiso('*', _asignarZonasCentros, 'Asignar zonas/centros a usuario');
}

function _asignarZonasCentros(usuarioActual) {
  const ui = SpreadsheetApp.getUi();
  
  const respEmail = ui.prompt('Asignar Zonas/Centros', 'Email del usuario:', ui.ButtonSet.OK_CANCEL);
  if (respEmail.getSelectedButton() !== ui.Button.OK) return;
  const email = respEmail.getResponseText().trim().toLowerCase();
  
  const datosUsuario = _buscarUsuarioPorEmail(email);
  if (!datosUsuario) {
    ui.alert('Error', 'No se encontró usuario con email: ' + email, ui.ButtonSet.OK);
    return;
  }
  
  // Pedir zonas
  const respZonas = ui.prompt(
    'Asignar Zonas',
    'Usuario: ' + datosUsuario.nombre + ' (' + datosUsuario.rol + ')\n' +
    'Zonas actuales: ' + (datosUsuario.zonas || 'Ninguna') + '\n\n' +
    'Nuevas zonas (separadas por coma, vacío para eliminar):',
    ui.ButtonSet.OK_CANCEL
  );
  if (respZonas.getSelectedButton() !== ui.Button.OK) return;
  const nuevasZonas = respZonas.getResponseText().trim();
  
  // Pedir centros
  const respCentros = ui.prompt(
    'Asignar Centros',
    'Centros actuales: ' + (datosUsuario.centros || 'Ninguno') + '\n\n' +
    'Nuevos centros (separados por coma, vacío para eliminar):',
    ui.ButtonSet.OK_CANCEL
  );
  if (respCentros.getSelectedButton() !== ui.Button.OK) return;
  const nuevosCentros = respCentros.getResponseText().trim();
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJAS.USUARIOS);
  
  hoja.getRange(datosUsuario.fila, COL_USUARIOS.ZONAS + 1).setValue(nuevasZonas);
  hoja.getRange(datosUsuario.fila, COL_USUARIOS.CENTROS + 1).setValue(nuevosCentros);
  
  registrarAccion('ZONAS_CENTROS_ASIGNADOS: ' + email + ' → Zonas: [' + nuevasZonas + '] Centros: [' + nuevosCentros + ']', usuarioActual);
  
  ui.alert('✅ Asignación Actualizada', 'Zonas y centros actualizados para ' + datosUsuario.nombre + '.', ui.ButtonSet.OK);
}


// ============================================================================
// LISTAR USUARIOS
// ============================================================================

/**
 * Muestra un listado de todos los usuarios del sistema.
 * Accesible para SUPER_ADMIN y RESPONSABLE_RGPD (auditoría).
 */
function listarUsuarios() {
  ejecutarConNivel(3, _listarUsuarios, 'Listar usuarios del sistema');
}

function _listarUsuarios(usuarioActual) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJAS.USUARIOS);
  const datos = hoja.getDataRange().getValues();
  
  if (datos.length <= 1) {
    SpreadsheetApp.getUi().alert('No hay usuarios registrados.');
    return;
  }
  
  let resumen = '📋 USUARIOS DEL SISTEMA (' + (datos.length - 1) + ' usuarios)\n';
  resumen += '═══════════════════════════════════════\n\n';
  
  let activos = 0;
  let inactivos = 0;
  
  for (let i = 1; i < datos.length; i++) {
    const estado = datos[i][COL_USUARIOS.ACTIVO] === true ? '✅' : '❌';
    if (datos[i][COL_USUARIOS.ACTIVO] === true) activos++; else inactivos++;
    
    resumen += estado + ' ' + datos[i][COL_USUARIOS.NOMBRE] + '\n';
    resumen += '   📧 ' + datos[i][COL_USUARIOS.EMAIL] + '\n';
    resumen += '   🔑 ' + datos[i][COL_USUARIOS.ROL] + '\n\n';
  }
  
  resumen += '═══════════════════════════════════════\n';
  resumen += '✅ Activos: ' + activos + ' | ❌ Inactivos: ' + inactivos;
  
  SpreadsheetApp.getUi().alert('Usuarios del Sistema', resumen, SpreadsheetApp.getUi().ButtonSet.OK);
}


// ============================================================================
// VER LOGS DE AUDITORÍA
// ============================================================================

/**
 * Muestra los últimos registros de auditoría.
 * Accesible para SUPER_ADMIN y RESPONSABLE_RGPD.
 */
function verLogsAuditoria() {
  const usuario = obtenerRolUsuario();
  if (!usuario) return;
  
  if (usuario.rol !== 'SUPER_ADMIN' && usuario.rol !== 'RESPONSABLE_RGPD') {
    SpreadsheetApp.getUi().alert('⛔ Solo SUPER_ADMIN y RESPONSABLE_RGPD pueden ver los logs.');
    return;
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJAS.AUDITORIA);
  
  if (!hoja || hoja.getLastRow() <= 1) {
    SpreadsheetApp.getUi().alert('No hay registros de auditoría.');
    return;
  }
  
  // Mostrar los últimos 20 registros
  const ultimaFila = hoja.getLastRow();
  const inicio = Math.max(2, ultimaFila - 19);
  const datos = hoja.getRange(inicio, 1, ultimaFila - inicio + 1, 5).getValues();
  
  let resumen = '📋 ÚLTIMOS ' + datos.length + ' REGISTROS DE AUDITORÍA\n';
  resumen += '═══════════════════════════════════════\n\n';
  
  // Mostrar en orden inverso (más reciente primero)
  for (let i = datos.length - 1; i >= 0; i--) {
    const fecha = datos[i][0] ? Utilities.formatDate(new Date(datos[i][0]), 'Europe/Madrid', 'dd/MM/yyyy HH:mm') : 'N/A';
    resumen += '🕐 ' + fecha + '\n';
    resumen += '   👤 ' + datos[i][2] + ' (' + datos[i][3] + ')\n';
    resumen += '   📝 ' + datos[i][4] + '\n\n';
  }
  
  registrarAccion('VER_LOGS_AUDITORIA', usuario);
  
  SpreadsheetApp.getUi().alert('Auditoría del Sistema', resumen, SpreadsheetApp.getUi().ButtonSet.OK);
}


// ============================================================================
// FUNCIONES AUXILIARES PRIVADAS
// ============================================================================

/**
 * Busca un usuario por email en la hoja USUARIOS
 * @param {string} email
 * @param {boolean} [incluirInactivos=false]
 * @returns {Object|null}
 * @private
 */
function _buscarUsuarioPorEmail(email, incluirInactivos) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJAS.USUARIOS);
  if (!hoja) return null;
  
  const datos = hoja.getDataRange().getValues();
  
  for (let i = 1; i < datos.length; i++) {
    if (datos[i][COL_USUARIOS.EMAIL] && 
        datos[i][COL_USUARIOS.EMAIL].toString().toLowerCase().trim() === email.toLowerCase().trim()) {
      
      const activo = datos[i][COL_USUARIOS.ACTIVO] === true || datos[i][COL_USUARIOS.ACTIVO] === 'TRUE';
      
      if (!incluirInactivos && !activo) return null;
      
      return {
        fila: i + 1,
        nombre: datos[i][COL_USUARIOS.NOMBRE] || '',
        email: datos[i][COL_USUARIOS.EMAIL] || '',
        rol: datos[i][COL_USUARIOS.ROL] || '',
        activo: activo,
        zonas: datos[i][COL_USUARIOS.ZONAS] || '',
        centros: datos[i][COL_USUARIOS.CENTROS] || ''
      };
    }
  }
  
  return null;
}

/**
 * Envía email de bienvenida al nuevo usuario
 * @private
 */
function _enviarEmailBienvenida(email, nombre, rol) {
  try {
    const nombreRol = ROLES[rol] ? ROLES[rol].nombre : rol;
    const asunto = '🎉 Bienvenido al Sistema de Gestión';
    const cuerpo = 
      'Hola ' + nombre + ',\n\n' +
      'Se te ha dado de alta en el Sistema Integrado de Gestión Empresarial.\n\n' +
      '🔑 Tu rol asignado: ' + nombreRol + '\n' +
      '📊 Nivel de acceso: ' + (ROLES[rol] ? ROLES[rol].nivel : 'N/A') + '\n\n' +
      'Ya puedes acceder al sistema abriendo el Google Sheets compartido.\n\n' +
      'Si tienes alguna duda, contacta con el administrador del sistema.\n\n' +
      'Un saludo,\n' +
      'Sistema de Gestión Empresarial';
    
    MailApp.sendEmail(email, asunto, cuerpo);
    Logger.log('Email de bienvenida enviado a: ' + email);
  } catch (error) {
    Logger.log('ERROR enviando email de bienvenida a ' + email + ': ' + error.message);
  }
}

/**
 * Envía email notificando cambio de rol
 * @private
 */
function _enviarEmailCambioRol(email, nombre, rolAnterior, nuevoRol) {
  try {
    const asunto = '🔄 Cambio de Rol en el Sistema de Gestión';
    const cuerpo = 
      'Hola ' + nombre + ',\n\n' +
      'Tu rol en el Sistema de Gestión ha sido actualizado.\n\n' +
      '🔑 Rol anterior: ' + (ROLES[rolAnterior] ? ROLES[rolAnterior].nombre : rolAnterior) + '\n' +
      '🔑 Nuevo rol: ' + (ROLES[nuevoRol] ? ROLES[nuevoRol].nombre : nuevoRol) + '\n\n' +
      'Los cambios de permisos son efectivos inmediatamente.\n\n' +
      'Si tienes alguna duda, contacta con el administrador.\n\n' +
      'Un saludo,\n' +
      'Sistema de Gestión Empresarial';
    
    MailApp.sendEmail(email, asunto, cuerpo);
  } catch (error) {
    Logger.log('ERROR enviando email de cambio de rol a ' + email + ': ' + error.message);
  }
}