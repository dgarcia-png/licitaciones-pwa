// ============================================================================
// 13_rgpd.gs - PROTECCIÓN DE DATOS (RGPD / LOPDGDD)
// Versión: 1.0 | Consentimientos, ARCO, Tratamientos, Auditorías, Brechas
// ============================================================================

var HOJA_CONSENTIMIENTOS = 'RGPD_CONSENTIMIENTOS';
var HOJA_ARCO = 'RGPD_ARCO';
var HOJA_TRATAMIENTOS = 'RGPD_TRATAMIENTOS';
var HOJA_BRECHAS = 'RGPD_BRECHAS';

function crearHojasRGPD_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(HOJA_CONSENTIMIENTOS)) {
    var h = ss.insertSheet(HOJA_CONSENTIMIENTOS);
    h.getRange(1,1,1,14).setValues([['ID','ID Empleado','Nombre','DNI','Tipo Consentimiento','Base Legal','Finalidad','Fecha Consentimiento','Medio','Estado','Fecha Revocación','Motivo Revocación','Doc URL','Notas']]);
    h.getRange(1,1,1,14).setBackground('#1565c0').setFontColor('#ffffff').setFontWeight('bold');
    h.setFrozenRows(1);
  }
  if (!ss.getSheetByName(HOJA_ARCO)) {
    var h2 = ss.insertSheet(HOJA_ARCO);
    h2.getRange(1,1,1,16).setValues([['ID','ID Empleado','Nombre','DNI','Tipo Derecho','Descripción Solicitud','Fecha Solicitud','Fecha Límite','Fecha Respuesta','Estado','Resolución','Responsable','Doc Solicitud URL','Doc Respuesta URL','Canal','Notas']]);
    h2.getRange(1,1,1,16).setBackground('#6a1b9a').setFontColor('#ffffff').setFontWeight('bold');
    h2.setFrozenRows(1);
  }
  if (!ss.getSheetByName(HOJA_TRATAMIENTOS)) {
    var h3 = ss.insertSheet(HOJA_TRATAMIENTOS);
    h3.getRange(1,1,1,14).setValues([['ID','Nombre Tratamiento','Responsable','Finalidad','Base Legal','Categoría Datos','Destinatarios','Transferencias Internacionales','Plazo Conservación','Medidas Seguridad','Fecha Alta','Fecha Revisión','Estado','Notas']]);
    h3.getRange(1,1,1,14).setBackground('#00695c').setFontColor('#ffffff').setFontWeight('bold');
    h3.setFrozenRows(1);
  }
  if (!ss.getSheetByName(HOJA_BRECHAS)) {
    var h4 = ss.insertSheet(HOJA_BRECHAS);
    h4.getRange(1,1,1,16).setValues([['ID','Fecha Detección','Fecha Notificación AEPD','Tipo Brecha','Descripción','Datos Afectados','Nº Personas Afectadas','Gravedad','Medidas Adoptadas','Responsable','Estado','Notificado Afectados','Fecha Cierre','Doc URL','Lecciones Aprendidas','Notas']]);
    h4.getRange(1,1,1,16).setBackground('#b71c1c').setFontColor('#ffffff').setFontWeight('bold');
    h4.setFrozenRows(1);
  }
}

// ════════════════════════════════════════
// CONSENTIMIENTOS
// ════════════════════════════════════════

var TIPOS_CONSENTIMIENTO = ['Tratamiento datos personales','Tratamiento datos salud','Comunicación a terceros','Transferencia internacional','Uso imagen/voz','Comunicaciones comerciales','Geolocalización','Videovigilancia'];
var BASES_LEGALES = ['Consentimiento (art.6.1.a)','Ejecución contrato (art.6.1.b)','Obligación legal (art.6.1.c)','Interés vital (art.6.1.d)','Interés público (art.6.1.e)','Interés legítimo (art.6.1.f)'];

function obtenerConsentimientosAPI_(filtro) {
  crearHojasRGPD_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CONSENTIMIENTOS);
  if (!hoja || hoja.getLastRow() <= 1) return { consentimientos: [], total: 0, tipos: TIPOS_CONSENTIMIENTO, bases_legales: BASES_LEGALES };
  var datos = hoja.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    var c = { id: datos[i][0], id_empleado: datos[i][1], nombre: datos[i][2], dni: datos[i][3], tipo: datos[i][4], base_legal: datos[i][5], finalidad: datos[i][6], fecha: datos[i][7], medio: datos[i][8], estado: datos[i][9], fecha_revocacion: datos[i][10], motivo_revocacion: datos[i][11], doc_url: datos[i][12], notas: datos[i][13] };
    if (filtro && filtro.empleado && c.id_empleado !== filtro.empleado) continue;
    items.push(c);
  }
  items.sort(function(a,b) { return new Date(b.fecha) - new Date(a.fecha); });
  return { consentimientos: items, total: items.length, tipos: TIPOS_CONSENTIMIENTO, bases_legales: BASES_LEGALES };
}

function agregarConsentimiento_(data) {
  crearHojasRGPD_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CONSENTIMIENTOS);
  var id = 'CONS-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).substring(2,5).toUpperCase();
  hoja.appendRow([id, data.id_empleado||'', data.nombre_empleado||'', data.dni||'', data.tipo||'', data.base_legal||'', data.finalidad||'', data.fecha||new Date(), data.medio||'Digital', 'vigente', '', '', '', data.notas||'']);
  return { ok: true, id: id };
}

function revocarConsentimiento_(data) {
  crearHojasRGPD_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CONSENTIMIENTOS);
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === data.id) {
      hoja.getRange(i+1, 10).setValue('revocado');
      hoja.getRange(i+1, 11).setValue(new Date());
      hoja.getRange(i+1, 12).setValue(data.motivo || 'Sin motivo');
      return { ok: true };
    }
  }
  return { ok: false, error: 'Consentimiento no encontrado' };
}

// ════════════════════════════════════════
// DERECHOS ARCO (Acceso, Rectificación, Cancelación/Supresión, Oposición, Portabilidad, Limitación)
// ════════════════════════════════════════

var TIPOS_ARCO = ['Acceso','Rectificación','Supresión','Oposición','Portabilidad','Limitación del tratamiento'];

function obtenerArcoAPI_(filtro) {
  crearHojasRGPD_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_ARCO);
  if (!hoja || hoja.getLastRow() <= 1) return { solicitudes: [], total: 0, tipos: TIPOS_ARCO };
  var datos = hoja.getDataRange().getValues();
  var items = [];
  var hoy = new Date();
  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    var a = { id: datos[i][0], id_empleado: datos[i][1], nombre: datos[i][2], dni: datos[i][3], tipo: datos[i][4], descripcion: datos[i][5], fecha_solicitud: datos[i][6], fecha_limite: datos[i][7], fecha_respuesta: datos[i][8], estado: datos[i][9], resolucion: datos[i][10], responsable: datos[i][11], doc_solicitud: datos[i][12], doc_respuesta: datos[i][13], canal: datos[i][14], notas: datos[i][15] };
    if (a.fecha_limite && a.estado === 'pendiente') {
      var dl = new Date(a.fecha_limite);
      a.dias_restantes = Math.floor((dl - hoy) / 86400000);
      if (a.dias_restantes < 0) a.alerta = 'vencido';
      else if (a.dias_restantes < 7) a.alerta = 'urgente';
    }
    if (filtro && filtro.empleado && a.id_empleado !== filtro.empleado) continue;
    items.push(a);
  }
  items.sort(function(a,b) { return new Date(b.fecha_solicitud) - new Date(a.fecha_solicitud); });
  return { solicitudes: items, total: items.length, tipos: TIPOS_ARCO };
}

function agregarArco_(data) {
  crearHojasRGPD_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_ARCO);
  var id = 'ARCO-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).substring(2,5).toUpperCase();
  var fechaSol = data.fecha_solicitud || new Date();
  var fechaLim = new Date(fechaSol);
  fechaLim.setDate(fechaLim.getDate() + 30);
  hoja.appendRow([id, data.id_empleado||'', data.nombre_empleado||'', data.dni||'', data.tipo||'', data.descripcion||'', fechaSol, fechaLim, '', 'pendiente', '', data.responsable||'', '', '', data.canal||'Escrito', data.notas||'']);
  return { ok: true, id: id, fecha_limite: fechaLim };
}

function responderArco_(data) {
  crearHojasRGPD_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_ARCO);
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === data.id) {
      hoja.getRange(i+1, 9).setValue(new Date());
      hoja.getRange(i+1, 10).setValue(data.estado || 'resuelto');
      hoja.getRange(i+1, 11).setValue(data.resolucion || '');
      return { ok: true };
    }
  }
  return { ok: false, error: 'Solicitud no encontrada' };
}

// ════════════════════════════════════════
// REGISTRO DE TRATAMIENTOS (art. 30 RGPD)
// ════════════════════════════════════════

function obtenerTratamientosAPI_() {
  crearHojasRGPD_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_TRATAMIENTOS);
  if (!hoja || hoja.getLastRow() <= 1) return { tratamientos: [], total: 0 };
  var datos = hoja.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    items.push({ id: datos[i][0], nombre: datos[i][1], responsable: datos[i][2], finalidad: datos[i][3], base_legal: datos[i][4], categoria_datos: datos[i][5], destinatarios: datos[i][6], transferencias: datos[i][7], plazo: datos[i][8], medidas: datos[i][9], fecha_alta: datos[i][10], fecha_revision: datos[i][11], estado: datos[i][12], notas: datos[i][13] });
  }
  return { tratamientos: items, total: items.length };
}

function agregarTratamiento_(data) {
  crearHojasRGPD_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_TRATAMIENTOS);
  var id = 'TRAT-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).substring(2,5).toUpperCase();
  hoja.appendRow([id, data.nombre||'', data.responsable||'', data.finalidad||'', data.base_legal||'', data.categoria_datos||'', data.destinatarios||'', data.transferencias||'No', data.plazo||'', data.medidas||'', new Date(), data.fecha_revision||'', 'activo', data.notas||'']);
  return { ok: true, id: id };
}

// ════════════════════════════════════════
// BRECHAS DE SEGURIDAD
// ════════════════════════════════════════

function obtenerBrechasAPI_() {
  crearHojasRGPD_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_BRECHAS);
  if (!hoja || hoja.getLastRow() <= 1) return { brechas: [], total: 0 };
  var datos = hoja.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    items.push({ id: datos[i][0], fecha_deteccion: datos[i][1], fecha_notificacion: datos[i][2], tipo: datos[i][3], descripcion: datos[i][4], datos_afectados: datos[i][5], num_afectados: datos[i][6], gravedad: datos[i][7], medidas: datos[i][8], responsable: datos[i][9], estado: datos[i][10], notificado_afectados: datos[i][11], fecha_cierre: datos[i][12], doc_url: datos[i][13], lecciones: datos[i][14], notas: datos[i][15] });
  }
  items.sort(function(a,b) { return new Date(b.fecha_deteccion) - new Date(a.fecha_deteccion); });
  return { brechas: items, total: items.length };
}

function agregarBrecha_(data) {
  crearHojasRGPD_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_BRECHAS);
  var id = 'BRCH-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).substring(2,5).toUpperCase();
  hoja.appendRow([id, data.fecha_deteccion||new Date(), '', data.tipo||'', data.descripcion||'', data.datos_afectados||'', data.num_afectados||0, data.gravedad||'Media', data.medidas||'', data.responsable||'', 'abierta', 'No', '', '', '', data.notas||'']);
  return { ok: true, id: id };
}

// ════════════════════════════════════════
// DASHBOARD RGPD
// ════════════════════════════════════════

function dashboardRGPD_() {
  crearHojasRGPD_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var stats = { consentimientos: { total: 0, vigentes: 0, revocados: 0 }, arco: { total: 0, pendientes: 0, vencidos: 0, resueltos: 0 }, tratamientos: { total: 0, activos: 0 }, brechas: { total: 0, abiertas: 0 } };
  var hoy = new Date();

  var hCons = ss.getSheetByName(HOJA_CONSENTIMIENTOS);
  if (hCons && hCons.getLastRow() > 1) { var d = hCons.getDataRange().getValues(); for (var i=1;i<d.length;i++) { if (!d[i][0]) continue; stats.consentimientos.total++; if (d[i][9]==='vigente') stats.consentimientos.vigentes++; else stats.consentimientos.revocados++; } }

  var hArco = ss.getSheetByName(HOJA_ARCO);
  if (hArco && hArco.getLastRow() > 1) { var d2 = hArco.getDataRange().getValues(); for (var j=1;j<d2.length;j++) { if (!d2[j][0]) continue; stats.arco.total++; if (d2[j][9]==='pendiente') { stats.arco.pendientes++; if (d2[j][7] && new Date(d2[j][7]) < hoy) stats.arco.vencidos++; } else stats.arco.resueltos++; } }

  var hTrat = ss.getSheetByName(HOJA_TRATAMIENTOS);
  if (hTrat && hTrat.getLastRow() > 1) { var d3 = hTrat.getDataRange().getValues(); for (var k=1;k<d3.length;k++) { if (!d3[k][0]) continue; stats.tratamientos.total++; if (d3[k][12]==='activo') stats.tratamientos.activos++; } }

  var hBrch = ss.getSheetByName(HOJA_BRECHAS);
  if (hBrch && hBrch.getLastRow() > 1) { var d4 = hBrch.getDataRange().getValues(); for (var l=1;l<d4.length;l++) { if (!d4[l][0]) continue; stats.brechas.total++; if (d4[l][10]==='abierta') stats.brechas.abiertas++; } }

  return { stats: stats, alertas: stats.arco.vencidos + stats.brechas.abiertas };
}

// ════════════════════════════════════════
// GENERAR DOCUMENTO CONSENTIMIENTO
// ════════════════════════════════════════

function generarDocConsentimiento_(data) {
  var nombre = data.nombre_empleado || data.nombre || '';
  var dni = data.dni || '';
  var carpetaRaiz = DriveApp.getFolderById(CARPETA_RAIZ_ID);
  var carpetaRGPD = obtenerOCrearCarpeta_(carpetaRaiz, 'RGPD');
  var carpetaDocs = obtenerOCrearCarpeta_(carpetaRGPD, 'Consentimientos');

  var titulo = 'CONSENTIMIENTO — ' + (data.tipo || '') + ' — ' + nombre + ' — ' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'dd-MM-yyyy');
  var doc = DocumentApp.create(titulo);
  var body = doc.getBody();

  body.appendParagraph('CONSENTIMIENTO PARA EL TRATAMIENTO DE DATOS PERSONALES').setHeading(DocumentApp.ParagraphHeading.HEADING1).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph('________________________________________').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph('');
  body.appendParagraph('RESPONSABLE DEL TRATAMIENTO').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Empresa: Forgeser Servicios del Sur SL');
  body.appendParagraph('CIF: B21XXXXXX');
  body.appendParagraph('Dirección: Almonte, Huelva');
  body.appendParagraph('');
  body.appendParagraph('PERSONA INTERESADA').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Nombre: ' + nombre);
  body.appendParagraph('DNI: ' + dni);
  body.appendParagraph('');
  body.appendParagraph('DATOS DEL CONSENTIMIENTO').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Tipo: ' + (data.tipo || ''));
  body.appendParagraph('Finalidad: ' + (data.finalidad || ''));
  body.appendParagraph('Base legal: ' + (data.base_legal || ''));
  body.appendParagraph('');
  body.appendParagraph('INFORMACIÓN ADICIONAL').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Sus datos serán tratados conforme al Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD).');
  body.appendParagraph('Puede ejercer sus derechos de acceso, rectificación, supresión, oposición, portabilidad y limitación del tratamiento dirigiéndose a la empresa.');
  body.appendParagraph('Tiene derecho a presentar reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).');
  body.appendParagraph('');
  body.appendParagraph('DECLARACIÓN DE CONSENTIMIENTO').setHeading(DocumentApp.ParagraphHeading.HEADING2).setBold(true);
  body.appendParagraph('Declaro haber sido informado/a de los extremos anteriores y CONSIENTO expresamente el tratamiento de mis datos personales para la finalidad indicada.');
  body.appendParagraph('');
  body.appendParagraph('□ DOY MI CONSENTIMIENTO');
  body.appendParagraph('□ NO DOY MI CONSENTIMIENTO');
  body.appendParagraph('');
  body.appendParagraph('');
  body.appendParagraph('Firma: _____________________     Fecha: ' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'dd/MM/yyyy'));
  body.appendParagraph('');
  body.appendParagraph('Fdo: ' + nombre);

  doc.saveAndClose();
  DriveApp.getFileById(doc.getId()).moveTo(carpetaDocs);
  registrarDocumentoGenerado_('consentimiento_rgpd', 'RGPD', nombre, dni, data.centro || '', titulo, doc.getUrl());
  return { ok: true, url: doc.getUrl(), id: doc.getId(), titulo: titulo };
}

// ════════════════════════════════════════
// GENERAR RESPUESTA ARCO
// ════════════════════════════════════════

function generarDocArco_(data) {
  var nombre = data.nombre || '';
  var dni = data.dni || '';
  var carpetaRaiz = DriveApp.getFolderById(CARPETA_RAIZ_ID);
  var carpetaRGPD = obtenerOCrearCarpeta_(carpetaRaiz, 'RGPD');
  var carpetaDocs = obtenerOCrearCarpeta_(carpetaRGPD, 'Respuestas ARCO');

  var titulo = 'RESPUESTA ARCO — ' + (data.tipo || '') + ' — ' + nombre + ' — ' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'dd-MM-yyyy');
  var doc = DocumentApp.create(titulo);
  var body = doc.getBody();

  body.appendParagraph('RESPUESTA A EJERCICIO DE DERECHOS').setHeading(DocumentApp.ParagraphHeading.HEADING1).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph('Derecho de ' + (data.tipo || '').toUpperCase()).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph('________________________________________').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph('');
  body.appendParagraph('Forgeser Servicios del Sur SL');
  body.appendParagraph('Fecha: ' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'dd/MM/yyyy'));
  body.appendParagraph('');
  body.appendParagraph('Estimado/a ' + nombre + ',').setBold(true);
  body.appendParagraph('DNI: ' + dni);
  body.appendParagraph('');
  body.appendParagraph('En relación con su solicitud de ejercicio del derecho de ' + (data.tipo || '') + ', registrada con fecha ' + (data.fecha_solicitud || '') + ', le comunicamos que:');
  body.appendParagraph('');
  body.appendParagraph('[RESOLUCIÓN]').setBold(true);
  body.appendParagraph('');
  body.appendParagraph('Conforme al Reglamento (UE) 2016/679 y la Ley Orgánica 3/2018, le informamos de su derecho a presentar reclamación ante la AEPD si considera que el tratamiento no se ajusta a la normativa.');
  body.appendParagraph('');
  body.appendParagraph('Atentamente,');
  body.appendParagraph('');
  body.appendParagraph('Responsable de Protección de Datos');
  body.appendParagraph('Forgeser Servicios del Sur SL');

  doc.saveAndClose();
  DriveApp.getFileById(doc.getId()).moveTo(carpetaDocs);
  registrarDocumentoGenerado_('respuesta_arco', 'RGPD', nombre, dni, '', titulo, doc.getUrl());
  return { ok: true, url: doc.getUrl(), id: doc.getId(), titulo: titulo };
}