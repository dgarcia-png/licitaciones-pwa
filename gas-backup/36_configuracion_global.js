// ============================================================================
// 36_configuracion_global.gs — Configuración centralizada de toda la aplicación
// Versión: 1.1 | Fecha: 2 Abril 2026
// CAMBIOS v1.1: + módulo notificaciones (un email por tipo de alerta)
//               + helper getEmailNotificacion_(tipo)
// ============================================================================

var HOJA_CONFIG_GLOBAL = 'CONFIG_GLOBAL';

function inicializarConfigGlobal_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(HOJA_CONFIG_GLOBAL)) {
    // Si ya existe, añadir filas de notificaciones que falten
    _añadirFilasNotificacionesSiFaltan_();
    return;
  }

  var h = ss.insertSheet(HOJA_CONFIG_GLOBAL);
  h.getRange(1,1,1,4).setValues([['Modulo','Clave','Valor','Descripcion']])
    .setBackground('#1a3c34').setFontColor('#fff').setFontWeight('bold');
  h.setFrozenRows(1);

  var defaults = [
    // EMPRESA
    ['empresa','nombre','Forgeser Servicios del Sur SL','Nombre de la empresa'],
    ['empresa','nif','B21XXXXXX','NIF de la empresa'],
    ['empresa','direccion','Almonte, Huelva','Dirección fiscal'],
    ['empresa','telefono','','Teléfono de contacto'],
    ['empresa','email_contacto','','Email de contacto'],
    ['empresa','email_notificaciones','','Emails notificaciones genéricas (separados por coma)'],
    ['empresa','logo_url','','URL del logo'],

    // LICITACIONES
    ['licitaciones','presupuesto_min','30000','Presupuesto mínimo búsqueda (€)'],
    ['licitaciones','presupuesto_max','15000000','Presupuesto máximo búsqueda (€)'],
    ['licitaciones','presupuesto_ideal_min','200000','Presupuesto ideal mínimo (€)'],
    ['licitaciones','presupuesto_ideal_max','3000000','Presupuesto ideal máximo (€)'],
    ['licitaciones','ubicacion_bonus','ES618','Código NUTS provincia prioritaria'],
    ['licitaciones','margen_minimo_go','10','Margen mínimo aceptable para GO (%)'],
    ['licitaciones','scoring_cpv_exacto','30','Peso scoring CPV exacto'],
    ['licitaciones','scoring_cpv_parcial','20','Peso scoring CPV parcial'],
    ['licitaciones','scoring_presupuesto','25','Peso scoring presupuesto ideal'],
    ['licitaciones','scoring_ubicacion','20','Peso scoring ubicación'],
    ['licitaciones','scoring_palabras','15','Peso scoring palabras clave'],

    // RRHH
    ['rrhh','jornada_semanal_horas','38','Horas jornada laboral semanal'],
    ['rrhh','limite_horas_extra_anual','80','Límite horas extra anuales (art. 35 ET)'],
    ['rrhh','dias_vacaciones','22','Días vacaciones anuales'],
    ['rrhh','ss_empresa_pct','30.5','% Seguridad Social a cargo empresa'],
    ['rrhh','hora_cierre_fichajes','23:00','Hora cierre automático fichajes abiertos'],
    ['rrhh','dias_aviso_contrato_vencer','30','Días previos para alerta vencimiento contrato'],
    ['rrhh','hora_busqueda_licitaciones','08:00','Hora búsqueda automática de licitaciones'],

    // TERRITORIO
    ['territorio','pct_indirectos','15','% costes indirectos sobre directos (P&L)'],
    ['territorio','stock_minimo_defecto','5','Stock mínimo por defecto en materiales'],
    ['territorio','hora_generacion_ordenes','06:00','Hora generación automática órdenes desde planificación'],
    ['territorio','hora_cierre_ordenes','23:00','Hora cierre automático jornada operarios'],
    ['territorio','tipos_servicio','limpieza,jardineria,mantenimiento,conserjeria,vigilancia,otros','Tipos de servicio disponibles'],
    ['territorio','frecuencias','diaria,semanal,quincenal,mensual,puntual','Frecuencias de servicio'],
    ['territorio','turnos','manana,tarde,noche,partido','Turnos disponibles'],
    ['territorio','coste_hora_maquinaria_defecto','15','Coste/hora maquinaria por defecto (€)'],

    // INCIDENCIAS SLA
    ['incidencias','sla_critica_horas','4','Horas SLA incidencia crítica'],
    ['incidencias','sla_alta_horas','24','Horas SLA incidencia alta'],
    ['incidencias','sla_media_horas','72','Horas SLA incidencia media'],
    ['incidencias','sla_baja_horas','168','Horas SLA incidencia baja'],
    ['incidencias','aviso_previo_horas','2','Horas previas aviso antes de vencer SLA'],
    ['incidencias','max_escalaciones','3','Máximo número de escalaciones automáticas'],
    ['incidencias','emails_escalacion','','Emails escalación (separados por coma)'],
    ['incidencias','plazo_accion_correctiva_dias','3','Días plazo acción correctiva desde incidencia'],

    // CALIDAD
    ['calidad','puntuacion_minima_alerta','3','Puntuación mínima (0-5) para generar acción correctiva'],
    ['calidad','nps_promotor_minimo','9','Puntuación mínima NPS para promotor'],
    ['calidad','nps_detractor_maximo','6','Puntuación máxima NPS para detractor'],
    ['calidad','plazo_accion_correctiva_dias','7','Días plazo acción correctiva desde inspección'],
    ['calidad','frecuencia_inspeccion_dias','30','Días entre inspecciones de calidad'],

    // ECONOMICO / P&L
    ['economico','pct_indirectos','15','% costes indirectos P&L'],
    ['economico','dia_consolidacion_mensual','1','Día del mes para consolidación automática P&L'],
    ['economico','margen_alerta_pct','10','Margen mínimo antes de generar alerta (%)'],
    ['economico','incluir_iva_presupuestos','false','Incluir IVA en cálculos de presupuesto'],

    // LISTAS DESPLEGABLES
    ['listas','categorias_profesionales','Peón de limpieza,Oficial de limpieza,Encargado,Supervisor,Coordinador,Administrativo,Técnico PRL','Categorías profesionales'],
    ['listas','tipos_contrato','Indefinido,Temporal,Obra y servicio,Interinidad,Formación,Prácticas','Tipos de contrato'],
    ['listas','motivos_ausencia','Vacaciones,Enfermedad,AT,Maternidad,Paternidad,Permiso retribuido,Permiso no retribuido,Licencia,ERTE','Motivos de ausencia'],
    ['listas','tipos_incidencia','limpieza,mantenimiento,seguridad,averias,suministros,quejas,accidente,general','Tipos de incidencia'],
    ['listas','tipos_vehiculo','Furgoneta,Camión,Turismo,Moto,Maquinaria','Tipos de vehículo'],
    ['listas','tipos_material','Producto limpieza,Maquinaria,EPI,Consumible,Herramienta,Otros','Tipos de material'],
    ['listas','carnets_profesionales','Carnet conducir B,Carnet conducir C,Manipulador alimentos,Fitosanitarios,PRL básico,PRL 60h,PRL 20h,Trabajo en altura,Espacios confinados,Primeros auxilios','Carnets y certificaciones'],
    ['listas','convenios','Limpieza edificios y locales Huelva,Limpieza edificios y locales Sevilla,Limpieza edificios y locales Cádiz,Jardines y parques Andalucía','Convenios colectivos aplicables'],

    // ── NOTIFICACIONES — un email por tipo de alerta ──────────────────────────
    ['notificaciones','email_sla_vencida',          '','Incidencia que supera el tiempo SLA'],
    ['notificaciones','email_sla_escalacion',        '','Escalación automática de incidencia crítica'],
    ['notificaciones','email_prl_caducidad',         '','EPIs, reconocimientos o formación PRL próximos a vencer'],
    ['notificaciones','email_certificaciones',       '','Carnets o certificaciones del personal próximos a vencer'],
    ['notificaciones','email_stock_minimo',          '','Material por debajo del stock mínimo configurado'],
    ['notificaciones','email_contratos_vencer',      '','Contratos de empleados próximos a vencer'],
    ['notificaciones','email_horas_extras_aprobar',  '','Horas extra generadas pendientes de aprobación'],
    ['notificaciones','email_horas_extras_limite',   '','Empleado acercándose al límite anual de 80h (art. 35 ET)'],
    ['notificaciones','email_fichajes_prov',         '','Fichajes provisionales sin validar por supervisor'],
    ['notificaciones','email_ausencias_pendientes',  '','Solicitudes de ausencia pendientes de aprobar'],
    ['notificaciones','email_licitaciones',          '','Nueva licitación relevante detectada por el sistema'],
    ['notificaciones','email_backup',                '','Resultado del backup semanal a Google Drive'],
  ];

  h.getRange(2, 1, defaults.length, 4).setValues(defaults);
  h.setColumnWidth(1, 120);
  h.setColumnWidth(2, 240);
  h.setColumnWidth(3, 300);
  h.setColumnWidth(4, 350);
}

// ── Añadir filas de notificaciones si la hoja ya existe sin ellas ─────────────
function _añadirFilasNotificacionesSiFaltan_() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CONFIG_GLOBAL);
  if (!hoja) return;

  var datos = hoja.getDataRange().getValues();
  var clavesExistentes = {};
  for (var i = 1; i < datos.length; i++) {
    clavesExistentes[datos[i][0] + '|' + datos[i][1]] = true;
  }

  var nuevas = [
    ['notificaciones','email_sla_vencida',          '','Incidencia que supera el tiempo SLA'],
    ['notificaciones','email_sla_escalacion',        '','Escalación automática de incidencia crítica'],
    ['notificaciones','email_prl_caducidad',         '','EPIs, reconocimientos o formación PRL próximos a vencer'],
    ['notificaciones','email_certificaciones',       '','Carnets o certificaciones del personal próximos a vencer'],
    ['notificaciones','email_stock_minimo',          '','Material por debajo del stock mínimo configurado'],
    ['notificaciones','email_contratos_vencer',      '','Contratos de empleados próximos a vencer'],
    ['notificaciones','email_horas_extras_aprobar',  '','Horas extra generadas pendientes de aprobación'],
    ['notificaciones','email_horas_extras_limite',   '','Empleado acercándose al límite anual de 80h (art. 35 ET)'],
    ['notificaciones','email_fichajes_prov',         '','Fichajes provisionales sin validar por supervisor'],
    ['notificaciones','email_ausencias_pendientes',  '','Solicitudes de ausencia pendientes de aprobar'],
    ['notificaciones','email_licitaciones',          '','Nueva licitación relevante detectada por el sistema'],
    ['notificaciones','email_backup',                '','Resultado del backup semanal a Google Drive'],
  ];

  var añadidas = 0;
  for (var j = 0; j < nuevas.length; j++) {
    var key = nuevas[j][0] + '|' + nuevas[j][1];
    if (!clavesExistentes[key]) {
      hoja.appendRow(nuevas[j]);
      añadidas++;
    }
  }
  if (añadidas > 0) Logger.log('✅ Añadidas ' + añadidas + ' filas de notificaciones a CONFIG_GLOBAL');
}

// ── Helper principal: obtener email para un tipo de alerta ────────────────────
// Uso: var email = getEmailNotificacion_('email_sla_vencida');
// Fallback: email_notificaciones genérico → email_contacto → owner del script
function getEmailNotificacion_(tipo) {
  // 1. Email específico del tipo
  var email = getConfig_('notificaciones', tipo, '');

  // 2. Fallback: email_notificaciones genérico de empresa
  if (!email) email = getConfig_('empresa', 'email_notificaciones', '');

  // 3. Fallback: email de contacto de la empresa
  if (!email) email = getConfig_('empresa', 'email_contacto', '');

  // 4. Último recurso: email del propietario del script
  if (!email) {
    try { email = Session.getActiveUser().getEmail(); } catch(e) {}
  }

  return email || '';
}

// ── Obtener toda la configuración ────────────────────────────────────────────
function obtenerConfigGlobalAPI_() {
  inicializarConfigGlobal_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CONFIG_GLOBAL);
  if (!hoja || hoja.getLastRow() <= 1) return {};

  var datos  = hoja.getDataRange().getValues();
  var config = {};

  for (var i = 1; i < datos.length; i++) {
    var modulo = String(datos[i][0]||'').trim();
    var clave  = String(datos[i][1]||'').trim();
    var valor  = String(datos[i][2]||'').trim();
    if (!modulo || !clave) continue;
    if (!config[modulo]) config[modulo] = {};
    config[modulo][clave] = valor;
  }

  return { ok: true, config: config };
}

// ── Obtener un módulo específico ──────────────────────────────────────────────
function obtenerModuloConfigAPI_(modulo) {
  var res = obtenerConfigGlobalAPI_();
  return { ok: true, modulo: modulo, config: res.config[modulo] || {} };
}

// ── Guardar configuración (módulo completo o clave individual) ────────────────
function guardarConfigGlobalAPI_(data) {
  inicializarConfigGlobal_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CONFIG_GLOBAL);
  var datos = hoja.getDataRange().getValues();

  var cambios = data.cambios || []; // [{ modulo, clave, valor }]

  for (var c = 0; c < cambios.length; c++) {
    var cam = cambios[c];
    var encontrado = false;

    for (var i = 1; i < datos.length; i++) {
      if (datos[i][0] === cam.modulo && datos[i][1] === cam.clave) {
        hoja.getRange(i+1, 3).setValue(cam.valor);
        datos[i][2] = cam.valor;
        encontrado = true;
        break;
      }
    }

    // Si no existe la clave, añadir nueva fila
    if (!encontrado) {
      hoja.appendRow([cam.modulo, cam.clave, cam.valor, cam.descripcion || '']);
    }
  }

  // Invalidar caché
  try { CacheService.getScriptCache().removeAll(['config_global']); } catch(e) {}

  return { ok: true, cambios_guardados: cambios.length };
}

// ── Helper para obtener valor individual ──────────────────────────────────────
function getConfig_(modulo, clave, defecto) {
  var res = obtenerConfigGlobalAPI_();
  var mod = res.config[modulo] || {};
  return mod[clave] !== undefined && mod[clave] !== '' ? mod[clave] : defecto;
}

// ── Función pública para ejecutar manualmente desde Apps Script ───────────────
function inicializar() {
  inicializarConfigGlobal_();
  Logger.log('✅ CONFIG_GLOBAL inicializada/actualizada');
}