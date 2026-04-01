// ============================================================================
// 26_portal_cliente.gs — Portal cliente con acceso por token
// ============================================================================

var HOJA_TOKENS_CLIENTE = 'TOKENS_CLIENTE';

function inicializarPortalCliente_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(HOJA_TOKENS_CLIENTE)) return;
  var h = ss.insertSheet(HOJA_TOKENS_CLIENTE);
  h.getRange(1,1,1,10).setValues([[
    'ID','Token','Centro_ID','Centro_Nombre','Organismo',
    'Email_Contacto','Nombre_Contacto','Activo','Creado','Ultimo_Acceso'
  ]]).setBackground('#1a3c34').setFontColor('#fff').setFontWeight('bold');
  h.setFrozenRows(1);
}

// ── Generar token para un centro ────────────────────────────────────────────
function generarTokenClienteAPI_(data) {
  inicializarPortalCliente_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_TOKENS_CLIENTE);

  // Generar token único
  var token = Utilities.computeHmacSha256Signature(
    data.centro_id + Date.now(),
    'forgeser_secret_2026'
  ).map(function(b) { return (b < 0 ? b + 256 : b).toString(16).padStart(2,'0'); }).join('').substring(0,32);

  var id = 'TOK-' + Utilities.formatDate(new Date(),'Europe/Madrid','yyyyMMddHHmmss');
  hoja.appendRow([
    id, token, data.centro_id||'', data.centro_nombre||'',
    data.organismo||'', data.email_contacto||'', data.nombre_contacto||'',
    true, new Date(), ''
  ]);

  var url = 'https://licitaciones-pwa.vercel.app/portal-cliente?token=' + token;

  if (data.email_contacto && data.enviar_email) {
    try {
      MailApp.sendEmail(
        data.email_contacto,
        'Acceso a su Portal de Seguimiento de Servicios — Forgeser',
        'Estimado/a ' + (data.nombre_contacto||'') + ',\n\n' +
        'Le facilitamos el acceso a su portal personalizado de seguimiento de servicios:\n\n' +
        url + '\n\n' +
        'En este portal podrá consultar:\n' +
        '• Servicios realizados con fecha, trabajador y checklist\n' +
        '• Incidencias abiertas y su estado\n' +
        '• Indicadores de calidad y cumplimiento\n\n' +
        'Atentamente,\nForgeser Servicios del Sur SL'
      );
    } catch(e) { Logger.log('Email error: ' + e.message); }
  }

  return { ok: true, id: id, token: token, url: url };
}

// ── Validar token y obtener datos del portal ─────────────────────────────────
function obtenerDatosPortalCliente_(token) {
  if (!token) return { error: 'Token requerido' };
  inicializarPortalCliente_();

  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_TOKENS_CLIENTE);
  if (!hoja || hoja.getLastRow() <= 1) return { error: 'Token inválido' };

  var datos    = hoja.getDataRange().getValues();
  var tokenRow = null;

  Logger.log('Buscando token: ' + token + ' (longitud: ' + token.length + ')');
  Logger.log('Total filas en hoja: ' + datos.length);

  for (var i = 1; i < datos.length; i++) {
    var tokenGuardado = String(datos[i][1]).trim();
    var tokenBuscado  = String(token).trim();
    var activo        = datos[i][7];
    Logger.log('Fila ' + i + ': token=' + tokenGuardado.substring(0,8) + '... activo=' + activo + ' (' + typeof activo + ')');
    if (tokenGuardado === tokenBuscado && (activo === true || activo === 'TRUE' || activo === 'true' || activo === 1)) {
      tokenRow = { row: i+1, centro_id: datos[i][2], centro_nombre: datos[i][3], organismo: datos[i][4] };
      try { hoja.getRange(i+1, 10).setValue(new Date()); } catch(e) {}
      break;
    }
  }

  if (!tokenRow) {
    Logger.log('Token NO encontrado');
    return { error: 'Token inválido o expirado', debug: 'token_length=' + String(token).length };
  }

  var centroId = tokenRow.centro_id;
  var mes      = Utilities.formatDate(new Date(),'Europe/Madrid','yyyy-MM');

  // Centro
  var centro = {};
  try {
    var c = obtenerCentroAPI_(centroId);
    centro = c.error ? { id: centroId, nombre: tokenRow.centro_nombre, organismo: tokenRow.organismo, municipio: '' } : c;
  } catch(e) {
    centro = { id: centroId, nombre: tokenRow.centro_nombre, organismo: tokenRow.organismo, municipio: '' };
  }

  // Partes del mes actual
  var partesMes = { total: 0, horas: 0, partes: [] };
  try {
    var pm = obtenerPartesV2API_({ centro_id: centroId, mes: mes, con_fotos: true });
    partesMes = { total: pm.total || 0, horas: pm.total_horas || 0, partes: (pm.partes || []).slice(0, 20) };
  } catch(e) { Logger.log('partesMes error: ' + e.message); }

  // Partes mes anterior
  var partesAnterior = { total: 0, horas: 0 };
  try {
    var mesAnterior = restarMes_(mes);
    var pa = obtenerPartesV2API_({ centro_id: centroId, mes: mesAnterior });
    partesAnterior = { total: pa.total || 0, horas: pa.total_horas || 0 };
  } catch(e) { Logger.log('partesAnterior error: ' + e.message); }

  // Incidencias
  var incidencias = { abiertas: 0, todas: [] };
  try {
    var incA = obtenerIncidenciasAPI_({ centro_id: centroId, estado: 'abierta' });
    var incT = obtenerIncidenciasAPI_({ centro_id: centroId });
    incidencias = { abiertas: incA.abiertas || 0, todas: (incT.incidencias || []).slice(0, 10) };
  } catch(e) { Logger.log('incidencias error: ' + e.message); }

  // Calidad
  var calidad = { media: 0, total: 0, inspecciones: [] };
  try {
    var ins = obtenerInspeccionesAPI_({ centro_id: centroId });
    calidad = { media: ins.media || 0, total: ins.total || 0, inspecciones: (ins.inspecciones || []).slice(0, 5) };
  } catch(e) { Logger.log('calidad error: ' + e.message); }

  // Próximos servicios
  var proximos = [];
  try {
    var ord = obtenerOrdenesAPI_({ centro_id: centroId, estado: 'pendiente' });
    proximos = (ord.ordenes || []).slice(0, 5);
  } catch(e) { Logger.log('proximos error: ' + e.message); }

  // P&L
  var plResumen = {};
  try {
    var pl = obtenerPLContrato_(centroId, 3);
    plResumen = pl.resumen || {};
  } catch(e) { Logger.log('pl error: ' + e.message); }

  return {
    ok:              true,
    centro:          centro,
    mes_actual:      mes,
    partes_mes:      partesMes,
    partes_anterior: partesAnterior,
    incidencias:     incidencias,
    calidad:         calidad,
    pl_resumen:      plResumen,
    proximos:        proximos
  };
}

// ── Listar tokens activos ────────────────────────────────────────────────────
function obtenerTokensClienteAPI_() {
  inicializarPortalCliente_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_TOKENS_CLIENTE);
  if (!hoja || hoja.getLastRow() <= 1) return { tokens: [] };

  var datos  = hoja.getDataRange().getValues();
  var tokens = [];
  for (var i = datos.length-1; i >= 1; i--) {
    if (!datos[i][0]) continue;
    tokens.push({
      id:            datos[i][0],
      token:         String(datos[i][1]).substring(0,8) + '...',
      centro_id:     datos[i][2],
      centro_nombre: datos[i][3],
      organismo:     datos[i][4],
      email:         datos[i][5],
      contacto:      datos[i][6],
      activo:        datos[i][7],
      creado:        datos[i][8] instanceof Date ? Utilities.formatDate(datos[i][8],'Europe/Madrid','dd/MM/yyyy') : '',
      ultimo_acceso: datos[i][9] instanceof Date ? Utilities.formatDate(datos[i][9],'Europe/Madrid','dd/MM/yyyy HH:mm') : 'Nunca',
      url:           'https://licitaciones-pwa.vercel.app/portal-cliente?token=' + datos[i][1]
    });
    if (tokens.length >= 50) break;
  }
  return { tokens: tokens };
}

function revocarTokenAPI_(id) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_TOKENS_CLIENTE);
  if (!hoja) return { ok: false };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === id) { hoja.getRange(i+1,8).setValue(false); return { ok: true }; }
  }
  return { ok: false };
}

function restarMes_(mes) {
  var anio = parseInt(mes.substring(0,4));
  var m    = parseInt(mes.substring(5,7));
  m--;
  if (m === 0) { m = 12; anio--; }
  return anio + '-' + (m < 10 ? '0' : '') + m;
}