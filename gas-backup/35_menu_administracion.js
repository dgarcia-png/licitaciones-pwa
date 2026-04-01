// ============================================================================
// 35_menu_administracion.gs - MENÚ DE ADMINISTRACIÓN
// Sistema Integrado de Gestión Empresarial
// Versión: 1.1 | Fecha: Marzo 2026
// ============================================================================
// Menú dinámico que se adapta al rol del usuario.
// Requiere: 33_auth_control.gs y 34_usuarios_crud.gs
// ============================================================================


/**
 * Trigger onOpen: Se ejecuta cada vez que se abre el Spreadsheet.
 * Crea el menú personalizado según el rol del usuario.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const usuario = obtenerRolUsuario();
  
  // Si el usuario no está registrado, mostrar menú mínimo
  if (!usuario) {
    ui.createMenu('⚙️ Sistema')
      .addItem('ℹ️ Mi Perfil (No registrado)', 'mostrarNoRegistrado_')
      .addToUi();
    return;
  }
  
  // ── MENÚ PRINCIPAL ──
  const menuSistema = ui.createMenu('⚙️ Sistema');
  menuSistema.addItem('👤 Mi Perfil', 'mostrarMiPerfil');
  menuSistema.addSeparator();
  
  // ── MENÚ ADMINISTRACIÓN (Solo SUPER_ADMIN) ──
  if (usuario.rol === 'SUPER_ADMIN') {
    const subMenuAdmin = ui.createMenu('👥 Administración de Usuarios');
    subMenuAdmin.addItem('➕ Crear Usuario', 'crearNuevoUsuario');
    subMenuAdmin.addItem('🔄 Cambiar Rol', 'modificarRolUsuario');
    subMenuAdmin.addItem('🗺️ Asignar Zonas/Centros', 'asignarZonasCentros');
    subMenuAdmin.addSeparator();
    subMenuAdmin.addItem('⛔ Desactivar Usuario', 'desactivarUsuario');
    subMenuAdmin.addItem('✅ Reactivar Usuario', 'reactivarUsuario');
    subMenuAdmin.addSeparator();
    subMenuAdmin.addItem('📋 Listar Todos los Usuarios', 'listarUsuarios');
    
    menuSistema.addSubMenu(subMenuAdmin);
    menuSistema.addSeparator();
  }
  
  // ── AUDITORÍA (SUPER_ADMIN y RESPONSABLE_RGPD) ──
  if (usuario.rol === 'SUPER_ADMIN' || usuario.rol === 'RESPONSABLE_RGPD') {
    menuSistema.addItem('📊 Ver Logs de Auditoría', 'verLogsAuditoria');
    menuSistema.addSeparator();
  }
  
  // ── LISTAR USUARIOS (Niveles 1-3) ──
  if (usuario.nivel <= 3 && usuario.rol !== 'SUPER_ADMIN') {
    menuSistema.addItem('📋 Ver Usuarios del Sistema', 'listarUsuarios');
    menuSistema.addSeparator();
  }
  
  // ── INFO DEL SISTEMA ──
  menuSistema.addItem('ℹ️ Acerca del Sistema', 'mostrarInfoSistema_');
  
  menuSistema.addToUi();
  
  // ── MENÚ LICITACIONES (si tiene permisos) ──
  if (tieneAlgunPermiso(['LICIT_VER', 'LICIT_CREAR'])) {
    const menuLicit = ui.createMenu('📋 Licitaciones');
    
    if (tienePermiso('LICIT_VER')) {
      menuLicit.addItem('🔍 Ver Oportunidades', 'verOportunidades_placeholder');
    }
    if (tienePermiso('LICIT_CREAR')) {
      menuLicit.addItem('➕ Nueva Licitación', 'nuevaLicitacion_placeholder');
    }
    if (tienePermiso('LICIT_ANALISIS_IA')) {
      menuLicit.addItem('🤖 Análisis IA', 'analisisIA_placeholder');
    }
    if (tienePermiso('LICIT_INFORME')) {
      menuLicit.addItem('📊 Generar Informe', 'generarInforme_placeholder');
    }
    if (tienePermiso('LICIT_CONFIG_PASO0')) {
      menuLicit.addSeparator();
      menuLicit.addItem('⚙️ Configurar PASO 0', 'configurarPaso0_placeholder');
    }
    
    menuLicit.addToUi();
  }
  
  // ── MENÚ RRHH (si tiene permisos) ──
  if (tieneAlgunPermiso(['RRHH_VER_EMPLEADO', 'RRHH_CREAR_EMPLEADO', 'PRL_GESTIONAR', 'RGPD_GESTIONAR'])) {
    const menuRRHH = ui.createMenu('👥 RRHH');
    
    if (tienePermiso('RRHH_VER_EMPLEADO')) {
      menuRRHH.addItem('👤 Ver Empleados', 'verEmpleados_placeholder');
    }
    if (tienePermiso('PRL_GESTIONAR')) {
      menuRRHH.addSeparator();
      menuRRHH.addItem('🦺 Gestión PRL', 'gestionPRL_placeholder');
      menuRRHH.addItem('📋 EPIs', 'gestionEPIs_placeholder');
    }
    if (tienePermiso('RGPD_GESTIONAR')) {
      menuRRHH.addSeparator();
      menuRRHH.addItem('🔒 Gestión RGPD', 'gestionRGPD_placeholder');
      menuRRHH.addItem('📝 Derechos ARCO', 'derechosARCO_placeholder');
    }
    
    menuRRHH.addToUi();
  }
  
  // ── MENÚ TERRITORIO (si tiene permisos) ──
  if (tieneAlgunPermiso(['TERR_VER_CENTRO', 'TERR_CREAR_CENTRO'])) {
    const menuTerr = ui.createMenu('🗺️ Territorio');
    
    if (tienePermiso('TERR_VER_CENTRO')) {
      menuTerr.addItem('🏢 Ver Centros', 'verCentros_placeholder');
    }
    if (tienePermiso('TERR_SERVICIOS')) {
      menuTerr.addItem('📝 Servicios', 'verServicios_placeholder');
    }
    if (tienePermiso('TERR_INCIDENCIAS')) {
      menuTerr.addItem('⚠️ Incidencias', 'verIncidencias_placeholder');
    }
    if (tienePermiso('TERR_MAPA_TIEMPO_REAL')) {
      menuTerr.addSeparator();
      menuTerr.addItem('📍 Mapa en Tiempo Real', 'mapaRealTime_placeholder');
    }
    
    menuTerr.addToUi();
  }
  
  // Registrar apertura del sistema
  registrarAccion('SISTEMA_ABIERTO', usuario);
}


// ============================================================================
// FUNCIONES PLACEHOLDER (Se implementarán en las siguientes semanas)
// ============================================================================

function verOportunidades_placeholder() { _mostrarPlaceholder('Ver Oportunidades', 'Semana 2'); }
function nuevaLicitacion_placeholder() { _mostrarPlaceholder('Nueva Licitación', 'Semana 3'); }
function analisisIA_placeholder() { _mostrarPlaceholder('Análisis IA', 'Semana 4'); }
function generarInforme_placeholder() { _mostrarPlaceholder('Generar Informe', 'Semana 5'); }
function configurarPaso0_placeholder() { _mostrarPlaceholder('Configurar PASO 0', 'Semana 2'); }
function verEmpleados_placeholder() { _mostrarPlaceholder('Ver Empleados', 'Semana 7'); }
function gestionPRL_placeholder() { _mostrarPlaceholder('Gestión PRL', 'Semana 8'); }
function gestionEPIs_placeholder() { _mostrarPlaceholder('Gestión EPIs', 'Semana 8'); }
function gestionRGPD_placeholder() { _mostrarPlaceholder('Gestión RGPD', 'Semana 8'); }
function derechosARCO_placeholder() { _mostrarPlaceholder('Derechos ARCO', 'Semana 8'); }
function verCentros_placeholder() { _mostrarPlaceholder('Ver Centros', 'Semana 9'); }
function verServicios_placeholder() { _mostrarPlaceholder('Servicios', 'Semana 10'); }
function verIncidencias_placeholder() { _mostrarPlaceholder('Incidencias', 'Semana 10'); }
function mapaRealTime_placeholder() { _mostrarPlaceholder('Mapa Tiempo Real', 'Semana 11'); }


// ============================================================================
// FUNCIONES AUXILIARES DEL MENÚ
// ============================================================================

function _mostrarPlaceholder(funcionalidad, semana) {
  SpreadsheetApp.getUi().alert(
    '🚧 En Desarrollo',
    funcionalidad + ' estará disponible en la ' + semana + ' del plan de desarrollo.\n\n' +
    'El sistema de roles y permisos ya está preparado para esta funcionalidad.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function mostrarNoRegistrado_() {
  const email = Session.getActiveUser().getEmail();
  SpreadsheetApp.getUi().alert(
    '⚠️ Usuario No Registrado',
    'Tu email (' + email + ') no está registrado en el sistema.\n\n' +
    'Contacta con el Super Administrador para que te dé de alta.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function mostrarInfoSistema_() {
  const usuario = obtenerRolUsuario();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaUsuarios = ss.getSheetByName(HOJAS.USUARIOS);
  const totalUsuarios = hojaUsuarios ? hojaUsuarios.getLastRow() - 1 : 0;
  
  const info = [
    '═══════════════════════════════════════',
    'SISTEMA INTEGRADO DE GESTIÓN EMPRESARIAL',
    '═══════════════════════════════════════',
    '',
    '📌 Versión: 1.0',
    '📅 Fecha: Marzo 2026',
    '',
    '📦 Módulos:',
    '   📋 Licitaciones (Activo)',
    '   👥 RRHH + PRL + RGPD (En desarrollo)',
    '   🗺️ Territorio (Planificado)',
    '   📱 PWA (Planificado)',
    '',
    '👥 Usuarios registrados: ' + totalUsuarios,
    '🔑 Roles activos: 12',
    '',
    '👤 Tu sesión:',
    '   ' + (usuario ? usuario.nombre + ' (' + usuario.nombre_rol + ')' : 'No registrado'),
    '',
    '═══════════════════════════════════════'
  ];
  
  SpreadsheetApp.getUi().alert('Acerca del Sistema', info.join('\n'), SpreadsheetApp.getUi().ButtonSet.OK);
}


// ============================================================================
// FUNCIONES DE INICIALIZACIÓN (Ejecutar UNA vez al configurar)
// ============================================================================

/**
 * Crea las hojas USUARIOS y AUDITORIA con sus cabeceras.
 * Ejecutar UNA SOLA VEZ al configurar el sistema.
 * 
 * COMPATIBLE con ejecución desde:
 *   - El botón ▶️ del editor de Apps Script
 *   - El menú del Google Sheets
 */
function inicializarSistema() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Detectar si estamos en contexto UI (menú del Sheets) o en el editor
  var tieneUI = false;
  try {
    SpreadsheetApp.getUi();
    tieneUI = true;
  } catch (e) {
    tieneUI = false;
    Logger.log('Ejecutando desde el editor de Apps Script (sin ventana UI).');
    Logger.log('Los resultados se mostrarán aquí en el log.');
    Logger.log('───────────────────────────────────────');
  }
  
  // Si hay UI disponible, pedir confirmación
  if (tieneUI) {
    var ui = SpreadsheetApp.getUi();
    var confirmacion = ui.alert(
      '⚠️ Inicializar Sistema',
      '¿Crear las hojas USUARIOS y AUDITORIA?\n\n' +
      'IMPORTANTE: Esto solo debe ejecutarse UNA VEZ.\n' +
      'Si las hojas ya existen, NO se sobreescribirán.',
      ui.ButtonSet.YES_NO
    );
    if (confirmacion !== ui.Button.YES) return;
  }
  
  var mensajes = [];
  
  // ══════════════════════════════════════════════════
  // Crear hoja USUARIOS
  // ══════════════════════════════════════════════════
  var hojaUsuarios = ss.getSheetByName(HOJAS.USUARIOS);
  if (!hojaUsuarios) {
    hojaUsuarios = ss.insertSheet(HOJAS.USUARIOS);
    
    // Cabeceras
    var cabeceras = [
      'Nombre', 'Email', 'Rol', 'Activo', 
      'Zonas Asignadas', 'Centros Asignados',
      'Fecha Alta', 'Fecha Baja', 'Creado Por', 'Notas'
    ];
    hojaUsuarios.getRange(1, 1, 1, cabeceras.length).setValues([cabeceras]);
    
    // Formato cabeceras
    var rangoCabeceras = hojaUsuarios.getRange(1, 1, 1, cabeceras.length);
    rangoCabeceras.setBackground('#1a73e8');
    rangoCabeceras.setFontColor('#ffffff');
    rangoCabeceras.setFontWeight('bold');
    rangoCabeceras.setFontSize(10);
    
    // Anchos de columna
    hojaUsuarios.setColumnWidth(1, 200);  // Nombre
    hojaUsuarios.setColumnWidth(2, 250);  // Email
    hojaUsuarios.setColumnWidth(3, 220);  // Rol
    hojaUsuarios.setColumnWidth(4, 80);   // Activo
    hojaUsuarios.setColumnWidth(5, 200);  // Zonas
    hojaUsuarios.setColumnWidth(6, 200);  // Centros
    hojaUsuarios.setColumnWidth(7, 120);  // Fecha Alta
    hojaUsuarios.setColumnWidth(8, 120);  // Fecha Baja
    hojaUsuarios.setColumnWidth(9, 250);  // Creado Por
    hojaUsuarios.setColumnWidth(10, 200); // Notas
    
    // Congelar primera fila
    hojaUsuarios.setFrozenRows(1);
    
    // Validación de datos para columna Rol (C)
    var rolesValidos = Object.keys(ROLES);
    var reglaRol = SpreadsheetApp.newDataValidation()
      .requireValueInList(rolesValidos, true)
      .setAllowInvalid(false)
      .setHelpText('Selecciona un rol válido del sistema.')
      .build();
    hojaUsuarios.getRange('C2:C1000').setDataValidation(reglaRol);
    
    // Validación columna Activo (D) - checkbox
    hojaUsuarios.getRange('D2:D1000').insertCheckboxes();
    
    // Formato fecha
    hojaUsuarios.getRange('G2:H1000').setNumberFormat('dd/mm/yyyy');
    
    // Insertar el primer SUPER_ADMIN (el usuario actual)
    var emailActual = Session.getActiveUser().getEmail();
    hojaUsuarios.appendRow([
      'Administrador del Sistema',   // Nombre (cambiar después)
      emailActual,                   // Email
      'SUPER_ADMIN',                 // Rol
      true,                          // Activo
      '',                            // Zonas
      '',                            // Centros
      new Date(),                    // Fecha Alta
      '',                            // Fecha Baja
      emailActual,                   // Creado Por
      'Usuario inicial del sistema'  // Notas
    ]);
    
    mensajes.push('✅ Hoja USUARIOS creada con tu usuario como SUPER_ADMIN');
    mensajes.push('   Email registrado: ' + emailActual);
  } else {
    mensajes.push('ℹ️ Hoja USUARIOS ya existía (no se modificó)');
  }
  
  // ══════════════════════════════════════════════════
  // Crear hoja AUDITORIA
  // ══════════════════════════════════════════════════
  var hojaAuditoria = ss.getSheetByName(HOJAS.AUDITORIA);
  if (!hojaAuditoria) {
    hojaAuditoria = ss.insertSheet(HOJAS.AUDITORIA);
    
    var cabecerasAud = [
      'Timestamp', 'Email', 'Nombre', 'Rol', 'Acción', 'Session Key', 'Info Adicional'
    ];
    hojaAuditoria.getRange(1, 1, 1, cabecerasAud.length).setValues([cabecerasAud]);
    
    // Formato cabeceras
    var rangoCab = hojaAuditoria.getRange(1, 1, 1, cabecerasAud.length);
    rangoCab.setBackground('#e8453c');
    rangoCab.setFontColor('#ffffff');
    rangoCab.setFontWeight('bold');
    rangoCab.setFontSize(10);
    
    // Anchos
    hojaAuditoria.setColumnWidth(1, 160);  // Timestamp
    hojaAuditoria.setColumnWidth(2, 250);  // Email
    hojaAuditoria.setColumnWidth(3, 200);  // Nombre
    hojaAuditoria.setColumnWidth(4, 200);  // Rol
    hojaAuditoria.setColumnWidth(5, 400);  // Acción
    hojaAuditoria.setColumnWidth(6, 150);  // Session
    hojaAuditoria.setColumnWidth(7, 250);  // Info
    
    // Congelar
    hojaAuditoria.setFrozenRows(1);
    
    // Formato timestamp
    hojaAuditoria.getRange('A2:A10000').setNumberFormat('dd/mm/yyyy hh:mm:ss');
    
    // Proteger la hoja (solo SUPER_ADMIN puede editarla directamente)
    var proteccion = hojaAuditoria.protect().setDescription('Auditoría - Solo lectura');
    proteccion.setWarningOnly(true);
    
    mensajes.push('✅ Hoja AUDITORIA creada y protegida');
  } else {
    mensajes.push('ℹ️ Hoja AUDITORIA ya existía (no se modificó)');
  }
  
  // Registrar inicialización
  registrarAccion('SISTEMA_INICIALIZADO');
  
  // ══════════════════════════════════════════════════
  // Mostrar resultado
  // ══════════════════════════════════════════════════
  var resultado = mensajes.join('\n') + '\n\n' +
    '📌 Próximos pasos:\n' +
    '1. Ve a la hoja USUARIOS y cambia "Administrador del Sistema" por tu nombre\n' +
    '2. Cierra y vuelve a abrir el Sheets para ver el menú ⚙️ Sistema\n' +
    '3. Desde el menú podrás crear más usuarios';
  
  if (tieneUI) {
    SpreadsheetApp.getUi().alert('🎉 Sistema Inicializado', resultado, SpreadsheetApp.getUi().ButtonSet.OK);
  } else {
    // Ejecutado desde el editor: mostrar en el log de ejecución
    Logger.log('');
    Logger.log('═══════════════════════════════════════');
    Logger.log('🎉 SISTEMA INICIALIZADO CORRECTAMENTE');
    Logger.log('═══════════════════════════════════════');
    Logger.log('');
    mensajes.forEach(function(m) { Logger.log(m); });
    Logger.log('');
    Logger.log('📌 PRÓXIMOS PASOS:');
    Logger.log('1. Ve al Google Sheets → verás las pestañas USUARIOS y AUDITORIA');
    Logger.log('2. En USUARIOS, cambia "Administrador del Sistema" por tu nombre');
    Logger.log('3. Cierra el Sheets y vuelve a abrirlo para que cargue el menú');
    Logger.log('═══════════════════════════════════════');
  }
}