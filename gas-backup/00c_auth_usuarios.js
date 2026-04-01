// ============================================================================
// 00c_auth_usuarios.gs — Funciones auxiliares globales
// Contiene funciones que estaban en 00_extraccion_licitaciones.gs original
// y se perdieron al reemplazarlo con la versión v5.1 del extractor.
// Versión: 1.1 | Fecha: 1 Abril 2026
// ============================================================================

// ════════════════════════════════════════════════════════════════
// SEGURIDAD: Tokens, Hashing, Validación
// ════════════════════════════════════════════════════════════════

function hashSHA256_(texto) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texto, Utilities.Charset.UTF_8);
  return raw.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

function generarToken_() {
  return Utilities.getUuid() + '-' + Utilities.getUuid();
}

function verificarToken_(token) {
  if (!token) return false;
  var props = PropertiesService.getScriptProperties();
  var tokenData = props.getProperty('TOKEN_' + token);
  if (!tokenData) return false;
  try {
    var data = JSON.parse(tokenData);
    if (new Date().getTime() - data.timestamp > 86400000) {
      props.deleteProperty('TOKEN_' + token);
      return false;
    }
    return data.email;
  } catch(e) { return false; }
}

function verificarAuthDoGet_(e) {
  var token = e.parameter.token;
  if (!token) return false;
  return verificarToken_(token);
}

function verificarAuthDoPost_(data) {
  var token = data.token;
  if (!token) return false;
  return verificarToken_(token);
}

function obtenerGeminiKey_() {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('GEMINI_API_KEY');
  if (!key) {
    key = 'AIzaSyCjbxT4sZx7SpqmXyDsX-B0xWMJB8HkpGE';
    props.setProperty('GEMINI_API_KEY', key);
  }
  return key;
}

function migrarPasswordsAHash() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  var migrated = 0;
  for (var key in all) {
    if (key.indexOf('PWD_') === 0 && all[key].length < 60) {
      props.setProperty(key, hashSHA256_(all[key]));
      migrated++;
    }
  }
  Logger.log('Migrated ' + migrated + ' passwords');
}

// ════════════════════════════════════════════════════════════════
// LOGIN
// ════════════════════════════════════════════════════════════════

function loginAPI_(email, password) {
  if (!email) return { ok: false, error: 'Email requerido' };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('USUARIOS');
  if (!hoja) return { ok: false, error: 'Sin hoja USUARIOS' };

  var datos = hoja.getDataRange().getValues();
  var niveles = {
    SUPER_ADMIN: 1, ADMIN_LICITACIONES: 2, ADMIN_RRHH: 2, ADMIN_TERRITORIO: 2,
    DIRECTOR_GERENTE: 2, RESPONSABLE_COMERCIAL: 3, RESPONSABLE_PRL: 3, RESPONSABLE_RGPD: 3,
    SUPERVISOR_TERRITORIO: 3, ENCARGADO_ZONA: 4, TRABAJADOR_CAMPO: 5, TRABAJADOR_LECTURA: 5
  };

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] && datos[i][1].toString().toLowerCase() === email.toLowerCase()) {
      if (datos[i][3] === false || datos[i][3] === 'FALSE') return { ok: false, error: 'Usuario inactivo' };

      var props = PropertiesService.getScriptProperties();
      var storedPwd = props.getProperty('PWD_' + datos[i][1]);

      if (storedPwd) {
        var inputHash = hashSHA256_(password || '');
        if (storedPwd.length === 64) {
          if (inputHash !== storedPwd) return { ok: false, error: 'Contraseña incorrecta' };
        } else {
          if (password !== storedPwd) return { ok: false, error: 'Contraseña incorrecta' };
          props.setProperty('PWD_' + datos[i][1], inputHash);
        }
      }

      var rol = datos[i][2] || 'TRABAJADOR_LECTURA';
      hoja.getRange(i + 1, 8).setValue(new Date());

      var token = generarToken_();
      props.setProperty('TOKEN_' + token, JSON.stringify({ email: datos[i][1], timestamp: new Date().getTime() }));

      return {
        ok: true,
        token: token,
        usuario: {
          nombre: datos[i][0],
          email: datos[i][1],
          rol: rol,
          nivel: niveles[rol] || 5,
          activo: true
        }
      };
    }
  }
  return { ok: false, error: 'Usuario no encontrado' };
}

// ════════════════════════════════════════════════════════════════
// CRUD USUARIOS API
// ════════════════════════════════════════════════════════════════

function obtenerUsuariosAPI_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('USUARIOS');
  if (!hoja || hoja.getLastRow() <= 1) return { usuarios: [], total: 0 };

  var niveles = {
    SUPER_ADMIN: 1, ADMIN_LICITACIONES: 2, ADMIN_RRHH: 2, ADMIN_TERRITORIO: 2,
    DIRECTOR_GERENTE: 2, RESPONSABLE_COMERCIAL: 3, RESPONSABLE_PRL: 3, RESPONSABLE_RGPD: 3,
    SUPERVISOR_TERRITORIO: 3, ENCARGADO_ZONA: 4, TRABAJADOR_CAMPO: 5, TRABAJADOR_LECTURA: 5
  };
  var datos = hoja.getDataRange().getValues();
  var usuarios = [];
  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0] && !datos[i][1]) continue;
    var rol = datos[i][2] || 'TRABAJADOR_LECTURA';
    usuarios.push({
      nombre: datos[i][0] || '', email: datos[i][1] || '', rol: rol,
      nivel: niveles[rol] || 5,
      activo: datos[i][3] !== false && datos[i][3] !== 'FALSE',
      zonas: datos[i][4] || '', centros: datos[i][5] || '',
      fecha_alta: datos[i][6] || '', fecha_baja: datos[i][7] || '',
      creado_por: datos[i][8] || '', notas: datos[i][9] || ''
    });
  }
  return { usuarios: usuarios, total: usuarios.length };
}

function agregarUsuario_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('USUARIOS');
  if (!hoja) return { ok: false, error: 'Hoja USUARIOS no encontrada' };
  if (!data.email || !data.nombre) return { ok: false, error: 'Email y nombre requeridos' };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] === data.email) return { ok: false, error: 'El email ya existe' };
  }
  var rol = data.rol || 'TRABAJADOR_LECTURA';
  var filaVacia = -1;
  for (var j = 1; j < datos.length; j++) {
    if (!datos[j][0] && !datos[j][1]) { filaVacia = j + 1; break; }
  }
  var fila = [data.nombre, data.email, rol, true, data.zonas || '', data.centros || '', new Date(), '', '', data.notas || ''];
  if (filaVacia > 0) {
    hoja.getRange(filaVacia, 1, 1, fila.length).setValues([fila]);
  } else {
    hoja.appendRow(fila);
  }
  if (data.password) {
    PropertiesService.getScriptProperties().setProperty('PWD_' + data.email, hashSHA256_(data.password));
  }
  return { ok: true, email: data.email, nombre: data.nombre, rol: rol };
}

function actualizarUsuario_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('USUARIOS');
  if (!hoja) return { ok: false, error: 'Hoja no encontrada' };
  if (!data.email) return { ok: false, error: 'Email requerido' };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] === data.email) {
      var fila = i + 1;
      if (data.nombre !== undefined && data.nombre !== '') hoja.getRange(fila, 1).setValue(data.nombre);
      if (data.rol) hoja.getRange(fila, 3).setValue(data.rol);
      if (data.activo !== undefined) hoja.getRange(fila, 4).setValue(data.activo);
      if (data.zonas !== undefined) hoja.getRange(fila, 5).setValue(data.zonas);
      if (data.centros !== undefined) hoja.getRange(fila, 6).setValue(data.centros);
      if (data.notas !== undefined) hoja.getRange(fila, 10).setValue(data.notas);
      if (data.password) {
        PropertiesService.getScriptProperties().setProperty('PWD_' + data.email, hashSHA256_(data.password));
      }
      return { ok: true, email: data.email };
    }
  }
  return { ok: false, error: 'Usuario no encontrado' };
}

function eliminarUsuario_(email) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('USUARIOS');
  if (!hoja) return { ok: false, error: 'Hoja no encontrada' };
  var datos = hoja.getDataRange().getValues();
  for (var i = datos.length - 1; i >= 1; i--) {
    if (datos[i][1] === email) {
      hoja.getRange(i + 1, 1, 1, 10).clearContent();
      try { PropertiesService.getScriptProperties().deleteProperty('PWD_' + email); } catch(e) {}
      return { ok: true, email: email };
    }
  }
  return { ok: false, error: 'No encontrado' };
}

// ════════════════════════════════════════════════════════════════
// CONFIG CRUD
// ════════════════════════════════════════════════════════════════

function obtenerConfigRawAPI_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('CONFIG_PASO0');
  if (!hoja) return { items: [], total: 0 };
  var datos = hoja.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < datos.length; i++) {
    var tipo = (datos[i][0] || '').toString().trim();
    var valor = (datos[i][1] || '').toString().trim();
    if (!tipo && !valor) continue;
    items.push({
      fila: i + 1, tipo: tipo, valor: valor,
      activo: datos[i][2] === true || datos[i][2] === 'TRUE',
      descripcion: (datos[i][3] || '').toString().trim()
    });
  }
  return { items: items, total: items.length };
}

function addConfigItem_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('CONFIG_PASO0');
  if (!hoja) return { ok: false, error: 'Hoja no encontrada' };
  if (!data.tipo || !data.valor) return { ok: false, error: 'Tipo y valor obligatorios' };
  var datos = hoja.getDataRange().getValues();
  var ultimaFilaTipo = -1;
  for (var i = 1; i < datos.length; i++) {
    if ((datos[i][0] || '').toString().trim() === data.tipo) ultimaFilaTipo = i + 1;
  }
  var fila = [data.tipo, data.valor, data.activo !== false, data.descripcion || ''];
  if (ultimaFilaTipo > 0) {
    hoja.insertRowAfter(ultimaFilaTipo);
    hoja.getRange(ultimaFilaTipo + 1, 1, 1, 4).setValues([fila]);
    hoja.getRange(ultimaFilaTipo + 1, 3).insertCheckboxes().setValue(data.activo !== false);
  } else {
    hoja.appendRow(fila);
    var lr = hoja.getLastRow();
    hoja.getRange(lr, 3).insertCheckboxes().setValue(data.activo !== false);
  }
  return { ok: true, tipo: data.tipo, valor: data.valor };
}

function updateConfigItem_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('CONFIG_PASO0');
  if (!hoja) return { ok: false, error: 'Hoja no encontrada' };
  if (!data.fila) return { ok: false, error: 'Fila requerida' };
  var f = parseInt(data.fila);
  if (data.valor !== undefined) hoja.getRange(f, 2).setValue(data.valor);
  if (data.activo !== undefined) hoja.getRange(f, 3).setValue(data.activo === true || data.activo === 'true');
  if (data.descripcion !== undefined) hoja.getRange(f, 4).setValue(data.descripcion);
  return { ok: true };
}

function deleteConfigItem_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('CONFIG_PASO0');
  if (!hoja) return { ok: false, error: 'Hoja no encontrada' };
  if (!data.fila) return { ok: false, error: 'Fila requerida' };
  hoja.deleteRow(parseInt(data.fila));
  return { ok: true };
}

// ════════════════════════════════════════════════════════════════
// ELIMINAR REGISTRO GENÉRICO
// ════════════════════════════════════════════════════════════════

function eliminarRegistro_(nombreHoja, id) {
  if (!id) return { ok: false, error: 'ID requerido' };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(nombreHoja);
  if (!hoja) return { ok: false, error: 'Hoja no encontrada: ' + nombreHoja };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][0]) === String(id)) {
      hoja.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Registro no encontrado' };
}

// ════════════════════════════════════════════════════════════════
// SERVER CACHE
// ════════════════════════════════════════════════════════════════

function serverCache_(key, ttlSeconds, fn) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get(key);
  if (cached) { try { return JSON.parse(cached); } catch(e) {} }
  var data = fn();
  try { cache.put(key, JSON.stringify(data), ttlSeconds); } catch(e) {}
  return data;
}

function invalidarCacheServidor_() {
  try {
    var cache = CacheService.getScriptCache();
    cache.removeAll(['batch_dashboard', 'batch_opos', 'batch_stats', 'batch_rrhh', 'batch_conv', 'batch_alertconv', 'batch_alertdoc', 'batch_contratos']);
  } catch(e) {}
}

// ════════════════════════════════════════════════════════════════
// BATCH API
// ════════════════════════════════════════════════════════════════

function batchAPI_(params) {
  var acciones = (params.acciones || '').split(',');
  var id  = params.id  || '';
  var resultado = { _batch: true, _ts: new Date().getTime() };

  for (var i = 0; i < acciones.length; i++) {
    var a = acciones[i].trim();
    if (!a) continue;
    try {
      if      (a === 'oportunidades')     resultado.oportunidades     = serverCache_('batch_opos',      60,  function() { return obtenerOportunidadesAPI_(); });
      else if (a === 'estadisticas')      resultado.estadisticas      = serverCache_('batch_stats',     120, function() { return obtenerEstadisticasAPI_(); });
      else if (a === 'dashboard')         resultado.dashboard         = serverCache_('batch_dashboard', 120, function() { return obtenerDashboardAPI_(); });
      else if (a === 'resumen_contratos') resultado.resumen_contratos = serverCache_('batch_contratos', 120, function() { return obtenerResumenContratosAPI_(); });
      else if (a === 'mapa_convenios')    resultado.mapa_convenios    = serverCache_('batch_conv',      300, function() { return mapaConveniosAPI_(); });
      else if (a === 'alertas_convenios') resultado.alertas_convenios = serverCache_('batch_alertconv', 300, function() { return alertasConveniosAPI_(); });
      else if (a === 'alertas_documentos')resultado.alertas_documentos= serverCache_('batch_alertdoc', 300, function() { return alertasVencimientoDocumentos_(); });
      else if (a === 'detalle'       && id) resultado.detalle       = obtenerDetalleOportunidadAPI_(id);
      else if (a === 'analisis'      && id) resultado.analisis      = obtenerAnalisisAPI_(id);
      else if (a === 'calculo'       && id) resultado.calculo       = cargarCalculoAPI_(id);
      else if (a === 'investigacion' && id) resultado.investigacion = obtenerInvestigacionAPI_(id);
      else if (a === 'aprobacion'    && id) resultado.aprobacion    = obtenerAprobacionAPI_(id);
      else if (a === 'documentos_oferta' && id) resultado.documentos_oferta = obtenerDocumentosOfertaAPI_(id);
      else if (a === 'resultado'     && id) resultado.resultado     = obtenerResultadoAPI_(id);
      else if (a === 'seguimiento'   && id) resultado.seguimiento   = obtenerSeguimientoAPI_(id);
      else if (a === 'empleados')     resultado.empleados     = serverCache_('batch_emps', 60, function() { return obtenerEmpleadosAPI_(null); });
      else if (a === 'stats_rrhh')    resultado.stats_rrhh    = serverCache_('batch_rrhh', 120, function() { return statsRRHH_(); });
      else if (a === 'empleado'    && id) resultado.empleado   = obtenerEmpleadoAPI_(id);
      else if (a === 'asignaciones_emp' && id) resultado.asignaciones = obtenerAsignacionesAPI_({ empleado: id });
      else if (a === 'capacidad'   && id) resultado.capacidad  = capacidadEmpleado_(id);
      else if (a === 'expediente'  && id) resultado.expediente = obtenerExpedienteAPI_(id);
      else if (a === 'subrogaciones')  resultado.subrogaciones  = obtenerSubrogacionesAPI_(null);
      else if (a === 'personal_sub' && id) resultado.personal_sub = obtenerPersonalSubrogadoAPI_(id);
      else if (a === 'ausencias')      resultado.ausencias      = obtenerAusenciasAPI_({});
      else if (a === 'dashboard_aus')  resultado.dashboard_aus  = serverCache_('batch_daus', 60, function() { return dashboardAusencias_(); });
      else if (a === 'resumen_vac'  && id) resultado.resumen_vac = resumenVacaciones_(id);
      else if (a === 'estado_fichaje' && id) resultado.estado_fichaje = estadoFichajeHoy_(id);
      else if (a === 'resumen_diario' && id) resultado.resumen_diario = resumenDiarioFichajes_(id, params.mes, params.anio);
      else if (a === 'prl_dashboard')  resultado.prl_dashboard  = serverCache_('batch_prl',  120, function() { return dashboardPRL_(); });
      else if (a === 'rgpd_dashboard') resultado.rgpd_dashboard = serverCache_('batch_rgpd', 120, function() { return dashboardRGPD_(); });
      else if (a === 'prl_epis_emp'  && id) resultado.prl_epis            = obtenerEpisAPI_({ empleado: id });
      else if (a === 'prl_reco_emp'  && id) resultado.prl_reconocimientos  = obtenerReconocimientosAPI_({ empleado: id });
      else if (a === 'prl_form_emp'  && id) resultado.prl_formacion        = obtenerFormacionPrlAPI_({ empleado: id });
      else if (a === 'prl_acc_emp'   && id) resultado.prl_accidentes       = obtenerAccidentesAPI_({ empleado: id });
      else if (a === 'documentos')         resultado.documentos            = obtenerDocumentosGeneralAPI_(null);
      else if (a === 'conocimiento_stats') resultado.conocimiento_stats    = serverCache_('batch_cono', 300, function() { return statsConocimientoAPI_(); });
    } catch(e) { resultado[a + '_error'] = e.message; }
  }
  return resultado;
}

function batchPaginaDecisiones_(id) {
  if (!id) return { error: 'ID requerido' };
  return batchAPI_({ acciones: 'oportunidades,analisis,calculo,investigacion,aprobacion', id: id });
}
function batchPaginaOfertas_(id) {
  if (!id) return { error: 'ID requerido' };
  return batchAPI_({ acciones: 'oportunidades,documentos_oferta', id: id });
}
function batchPaginaSeguimiento_()   { return batchAPI_({ acciones: 'oportunidades,resumen_contratos' }); }
function batchPaginaSubrogacion_()   { return batchAPI_({ acciones: 'subrogaciones,oportunidades,mapa_convenios' }); }
function batchPaginaPersonal_()      { return batchAPI_({ acciones: 'empleados,mapa_convenios,stats_rrhh' }); }
function batchPaginaAusencias_()     { return batchAPI_({ acciones: 'ausencias,empleados,dashboard_aus' }); }

function batchPaginaTerritorio_() {
  return { centros: obtenerCentrosAPI_(null), dashboard: dashboardTerritorioAPI_() };
}
function batchPaginaPartes_() {
  return { partes: obtenerPartesV2API_(null), incidencias: obtenerIncidenciasAPI_(null), centros: obtenerCentrosAPI_(null), empleados: obtenerEmpleadosAPI_(null) };
}
function batchPaginaOrdenes_() {
  return { ordenes: obtenerOrdenesAPI_(null), centros: obtenerCentrosAPI_(null), empleados: obtenerEmpleadosAPI_(null) };
}
function batchPaginaPlanificacion_(semana) {
  return { cuadrante: obtenerCuadranteSemanal_(semana || null), centros: obtenerCentrosAPI_(null), empleados: obtenerEmpleadosAPI_(null) };
}
function batchPaginaSupervisionFichajes_(mes, anio) {
  var m = parseInt(mes) || new Date().getMonth() + 1;
  var a = parseInt(anio) || new Date().getFullYear();
  return {
    resumen_mensual:        resumenMensualTodos_(m, a),
    fichajes_provisionales: obtenerFichajesAPI_({ estado: 'provisional' }),
    horas_extra:            obtenerHorasExtraAPI_({ estado: 'pendiente' })
  };
}

// ════════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════════

function obtenerDashboardAPI_() {
  var stats = obtenerEstadisticasAPI_();
  var opos  = obtenerOportunidadesAPI_();
  var resContratos = { stats: { ganadas: 0, perdidas: 0, desiertas: 0, tasa_exito: 0, total_presentadas: 0 } };
  try { resContratos = obtenerResumenContratosAPI_(); } catch(e) {}
  var conocStats = { total_documentos: 0, total_chunks_indexados: 0, listo_para_rag: false };
  try { conocStats = statsConocimientoAPI_(); } catch(e) {}

  var pipeline = { nueva: stats.nueva || 0, en_analisis: stats.en_analisis || 0, go: stats.go || 0, no_go: stats.no_go || 0, descartada: stats.descartada || 0, adjudicada: 0, perdida: 0 };
  var oportunidades = opos.oportunidades || [];
  oportunidades.forEach(function(o) {
    if (o.estado === 'adjudicada') pipeline.adjudicada++;
    if (o.estado === 'perdida')    pipeline.perdida++;
  });
  var valorGO = 0, valorAnalisis = 0;
  oportunidades.forEach(function(o) {
    if (o.estado === 'go' || o.estado === 'adjudicada') valorGO += Number(o.presupuesto) || 0;
    if (o.estado === 'en_analisis') valorAnalisis += Number(o.presupuesto) || 0;
  });
  return {
    stats: stats, pipeline: pipeline,
    oportunidades: oportunidades.slice(0, 15),
    total_oportunidades: oportunidades.length,
    valor_pipeline_go: valorGO, valor_pipeline_analisis: valorAnalisis,
    contratos: resContratos.stats || {}, conocimiento: conocStats,
    timestamp: new Date().toISOString()
  };
}

function obtenerDashboard360_() {
  var resultado = { licitaciones: {}, rrhh: {}, territorio: {}, alertas: [], timestamp: new Date().toISOString() };

  try {
    var dash = obtenerDashboardAPI_();
    resultado.licitaciones = { pipeline: dash.pipeline || {}, valor_pipeline_go: dash.valor_pipeline_go || 0, contratos: dash.contratos || {}, total: dash.total_oportunidades || 0, proximas_vencer: [] };
    var hoy = new Date(); hoy.setHours(0,0,0,0);
    (dash.oportunidades || []).forEach(function(o) {
      if (!o.fecha_limite || ['adjudicada','perdida','desierta','no_go'].indexOf(o.estado) !== -1) return;
      var fl = new Date(o.fecha_limite.split(' ')[0]);
      var dias = Math.ceil((fl - hoy) / 86400000);
      if (dias >= 0 && dias <= 7) {
        resultado.licitaciones.proximas_vencer.push({ titulo: o.titulo, organismo: o.organismo, dias: dias, id: o.id });
        resultado.alertas.push({ modulo: 'licitaciones', nivel: dias <= 2 ? 'alta' : 'media', msg: 'Vence en ' + dias + 'd: ' + (o.titulo||'').substring(0,50), id: o.id });
      }
    });
  } catch(e) { resultado.licitaciones = { error: e.message }; }

  try {
    var sRRHH = statsRRHH_();
    var dashRRHH = dashboardRRHHAPI_();
    resultado.rrhh = { plantilla: sRRHH, fichajes: dashRRHH.fichajes || {}, ausencias: dashRRHH.ausencias || {}, prl: dashRRHH.prl || {}, costes: dashRRHH.costes || {} };
    var prl = dashRRHH.prl || {};
    if ((prl.epis_caducados || 0) > 0) resultado.alertas.push({ modulo: 'prl', nivel: 'alta', msg: prl.epis_caducados + ' EPIs caducados' });
    if ((prl.recos_vencidos || 0) > 0) resultado.alertas.push({ modulo: 'prl', nivel: 'alta', msg: prl.recos_vencidos + ' reconocimientos médicos vencidos' });
  } catch(e) { resultado.rrhh = { error: e.message }; }

  try {
    var dashTerr = dashboardTerritorioAPI_();
    var incAbiertas = obtenerIncidenciasAPI_({ estado: 'abierta' });
    resultado.territorio = { centros: dashTerr.total_centros || 0, activos: dashTerr.activos || 0, personal: dashTerr.total_personal || 0, presupuesto_anual: dashTerr.total_presupuesto || 0, incidencias_abiertas: incAbiertas.abiertas || 0 };
    if ((incAbiertas.abiertas || 0) > 0) resultado.alertas.push({ modulo: 'territorio', nivel: 'media', msg: incAbiertas.abiertas + ' incidencias abiertas en centros' });
  } catch(e) { resultado.territorio = { error: e.message }; }

  return resultado;
}

// ════════════════════════════════════════════════════════════════
// HELPERS GENERALES
// ════════════════════════════════════════════════════════════════

function obtenerOCrearCarpeta_(nombre, carpetaPadre) {
  var carpetas = carpetaPadre.getFoldersByName(nombre);
  if (carpetas.hasNext()) return carpetas.next();
  return carpetaPadre.createFolder(nombre);
}

function actualizarNotasOportunidad_(oportunidadId, archivoUrl, fileName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var hoja = ss.getSheetByName(HOJA_OPORTUNIDADES);
    if (!hoja) return;
    var datos = hoja.getDataRange().getValues();
    for (var i = 1; i < datos.length; i++) {
      if (datos[i][0] === oportunidadId) {
        var notas = datos[i][14] || '';
        hoja.getRange(i+1, 15).setValue((notas ? notas+'\n' : '') + '📎 ' + fileName + ': ' + archivoUrl);
        break;
      }
    }
  } catch(e) {}
}

function obtenerHistorialCentrosEmpleado_(empleadoId) {
  if (!empleadoId) return { centros: [] };
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('ASIGNACIONES_CENTROS');
  if (!hoja || hoja.getLastRow() <= 1) return { centros: [], total: 0 };
  var datos    = hoja.getDataRange().getValues();
  var centros  = [];
  var hCentros = ss.getSheetByName('CENTROS');

  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][2]) !== String(empleadoId)) continue;
    var centroId = datos[i][1];
    var nombreCentro = centroId, organismo = '', tipoServicio = '';
    if (hCentros) {
      var dC = hCentros.getDataRange().getValues();
      for (var ci = 1; ci < dC.length; ci++) {
        if (dC[ci][0] === centroId) { nombreCentro = dC[ci][1] || centroId; organismo = dC[ci][3] || ''; tipoServicio = dC[ci][10] || ''; break; }
      }
    }
    var fechaIni = datos[i][8], fechaFin = datos[i][9];
    centros.push({
      id: datos[i][0], centro_id: centroId, nombre_centro: nombreCentro,
      organismo: organismo, tipo_servicio: tipoServicio,
      categoria: datos[i][5] || '', horas_semanales: parseFloat(datos[i][6]) || 0,
      turno: datos[i][7] || '',
      fecha_inicio: fechaIni instanceof Date ? Utilities.formatDate(fechaIni,'Europe/Madrid','yyyy-MM-dd') : String(fechaIni||''),
      fecha_fin:    fechaFin instanceof Date ? Utilities.formatDate(fechaFin,'Europe/Madrid','yyyy-MM-dd') : String(fechaFin||''),
      estado: datos[i][10] || 'activo', notas: datos[i][11] || ''
    });
  }
  centros.sort(function(a,b){ return (b.fecha_inicio||'').localeCompare(a.fecha_inicio||''); });
  return { centros: centros, total: centros.length, activos: centros.filter(function(c){ return c.estado==='activo'; }).length };
}

// ════════════════════════════════════════════════════════════════
// KEEP ALIVE
// ════════════════════════════════════════════════════════════════

function keepAlive() {
  try {
    var cache = CacheService.getScriptCache();
    cache.put('keepalive', new Date().getTime().toString(), 300);
    if (!cache.get('batch_opos')) { try { cache.put('batch_opos', JSON.stringify(obtenerOportunidadesAPI_()), 60); } catch(e) {} }
    if (!cache.get('batch_emps')) { try { cache.put('batch_emps', JSON.stringify(obtenerEmpleadosAPI_(null)), 60); } catch(e) {} }
  } catch(e) {}
}

function configurarKeepAlive() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'keepAlive') ScriptApp.deleteTrigger(triggers[i]);
  }
  ScriptApp.newTrigger('keepAlive').timeBased().everyMinutes(4).create();
  Logger.log('✅ KeepAlive configurado cada 4 minutos');
}