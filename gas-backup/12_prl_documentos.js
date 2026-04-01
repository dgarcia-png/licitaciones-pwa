// ============================================================================
// 12_prl_documentos.gs v1.4 - CON TABLAS - Fondo claro + texto negro
// ============================================================================

var CERTIFICACIONES_EXTRA = [
  { id: 'carnet_conducir', label: 'Carnet de conducir', caduca: true, modulo: 'RRHH' },
  { id: 'manipulador_alimentos', label: 'Manipulación de alimentos', caduca: true, modulo: 'PRL' },
  { id: 'fitosanitarios', label: 'Carnet fitosanitarios', caduca: true, modulo: 'PRL' },
  { id: 'socorrista', label: 'Título socorrista', caduca: true, modulo: 'PRL' },
  { id: 'legionella', label: 'Tratamiento legionella', caduca: true, modulo: 'PRL' },
  { id: 'piscinas', label: 'Mantenimiento piscinas', caduca: true, modulo: 'PRL' },
  { id: 'soldadura', label: 'Certificado soldadura', caduca: false, modulo: 'PRL' },
  { id: 'plataformas_elevadoras', label: 'Plataformas elevadoras (PEMP)', caduca: true, modulo: 'PRL' },
  { id: 'carretilla', label: 'Carretilla elevadora', caduca: true, modulo: 'PRL' },
  { id: 'trabajos_altura', label: 'Trabajos en altura', caduca: true, modulo: 'PRL' },
  { id: 'espacios_confinados', label: 'Espacios confinados', caduca: true, modulo: 'PRL' },
  { id: 'riesgo_electrico', label: 'Riesgo eléctrico', caduca: true, modulo: 'PRL' },
  { id: 'adr', label: 'ADR (mercancías peligrosas)', caduca: true, modulo: 'PRL' },
  { id: 'primeros_auxilios', label: 'Primeros auxilios', caduca: true, modulo: 'PRL' }
];

function registrarDocumentoGenerado_(tipo, modulo, nombre, dni, centro, titulo, url) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('DOCUMENTOS_GENERAL');
  if (!hoja) return;
  var idDoc = 'DOC-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  hoja.appendRow([idDoc, titulo, tipo, modulo, nombre, dni, centro, 'generado', new Date(), new Date(), 'Sistema', 'Documento generado automáticamente', url, 'PRL', '', '']);
}

function fmtFecha_(f) {
  if (!f) return 'N/A';
  try { var d = new Date(f); if (isNaN(d.getTime())) return String(f); return Utilities.formatDate(d, 'Europe/Madrid', 'dd/MM/yyyy'); } catch(e) { return String(f); }
}

// ════════════════════════════════════════
// GENERAR RECIBÍ DE EPIS — TABLA CON FONDO CLARO
// ════════════════════════════════════════

function generarRecibiEPI_(data) {
  var nombre = data.nombre_empleado || data.nombre || '';
  var dni = data.dni || '';
  var centro = data.centro || '';
  if (!nombre) return { ok: false, error: 'Nombre requerido' };

  var carpetaRaiz = DriveApp.getFolderById(CARPETA_RAIZ_ID);
  var carpetaPRL = obtenerOCrearCarpeta_(carpetaRaiz, 'PRL');
  var carpetaDocs = obtenerOCrearCarpeta_(carpetaPRL, 'Recibís EPIs');

  var titulo = 'RECIBÍ EPI — ' + nombre + ' — ' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'dd-MM-yyyy');
  var doc = DocumentApp.create(titulo);
  var body = doc.getBody();

  body.appendParagraph('RECIBÍ DE EQUIPO DE PROTECCIÓN INDIVIDUAL').setHeading(DocumentApp.ParagraphHeading.HEADING1).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph('________________________________________').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph('');
  body.appendParagraph('EMPRESA: Forgeser Servicios del Sur SL').setBold(true);
  body.appendParagraph('CIF: B21XXXXXX');
  body.appendParagraph('Fecha: ' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'dd/MM/yyyy'));
  body.appendParagraph('');
  body.appendParagraph('DATOS DE LA PERSONA TRABAJADORA').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Nombre: ' + nombre);
  body.appendParagraph('DNI: ' + dni);
  body.appendParagraph('Centro de trabajo: ' + centro);
  body.appendParagraph('');
  body.appendParagraph('EQUIPOS DE PROTECCIÓN ENTREGADOS').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('');

  var table = body.appendTable();
  // Cabecera: fondo verde claro, texto NEGRO negrita (nunca blanco)
  var headerRow = table.appendTableRow();
  ['Tipo EPI', 'Descripción', 'Talla', 'Cant.', 'Caducidad'].forEach(function(h) {
    var cell = headerRow.appendTableCell(h);
    cell.setBackgroundColor('#c8e6c9');
    cell.getChild(0).asParagraph().editAsText().setBold(true).setFontSize(9);
  });

  var items = [];
  if (data.items && data.items.length > 0) { items = data.items; }
  else { items = [{ tipo: data.tipo || '', descripcion: data.descripcion || '', talla: data.talla || '', cantidad: data.cantidad || 1, fecha_caducidad: data.fecha_caducidad || '' }]; }

  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var row = table.appendTableRow();
    row.appendTableCell(String(it.tipo || 'N/D'));
    row.appendTableCell(String(it.descripcion || ''));
    row.appendTableCell(String(it.talla || ''));
    row.appendTableCell(String(it.cantidad || 1));
    row.appendTableCell(fmtFecha_(it.fecha_caducidad));
  }

  body.appendParagraph('');
  body.appendParagraph('La persona trabajadora declara haber recibido los equipos de protección individual arriba indicados, comprometiéndose a:');
  body.appendParagraph('  - Utilizar correctamente los EPIs según la formación recibida.');
  body.appendParagraph('  - Conservarlos en buen estado y comunicar cualquier deterioro.');
  body.appendParagraph('  - Solicitar su reposición cuando sea necesario.');
  body.appendParagraph('');
  body.appendParagraph('Conforme al artículo 29 de la Ley 31/1995, de 8 de noviembre, de Prevención de Riesgos Laborales.');
  body.appendParagraph('');
  body.appendParagraph('');
  body.appendParagraph('Firma de la persona trabajadora:                    Por la empresa:');
  body.appendParagraph('');
  body.appendParagraph('');
  body.appendParagraph('');
  body.appendParagraph('Fdo: ' + nombre + '                                           Fdo:');

  doc.saveAndClose();
  DriveApp.getFileById(doc.getId()).moveTo(carpetaDocs);
  registrarDocumentoGenerado_('entrega_epi', 'PRL', nombre, dni, centro, titulo, doc.getUrl());
  return { ok: true, url: doc.getUrl(), id: doc.getId(), titulo: titulo };
}

// ════════════════════════════════════════
// GENERAR NOTIFICACIÓN RECONOCIMIENTO MÉDICO
// ════════════════════════════════════════

function generarNotificacionReconocimiento_(data) {
  var nombre = data.nombre_empleado || data.nombre || '';
  var dni = data.dni || '';
  var centro = data.centro || '';

  var carpetaRaiz = DriveApp.getFolderById(CARPETA_RAIZ_ID);
  var carpetaPRL = obtenerOCrearCarpeta_(carpetaRaiz, 'PRL');
  var carpetaDocs = obtenerOCrearCarpeta_(carpetaPRL, 'Notificaciones');

  var titulo = 'NOTIFICACIÓN RECONOCIMIENTO — ' + nombre + ' — ' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'dd-MM-yyyy');
  var doc = DocumentApp.create(titulo);
  var body = doc.getBody();

  body.appendParagraph('NOTIFICACIÓN DE VIGILANCIA DE LA SALUD').setHeading(DocumentApp.ParagraphHeading.HEADING1).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph('RECONOCIMIENTO MÉDICO ' + (data.tipo || 'PERIÓDICO').toUpperCase()).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph('________________________________________').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph('');
  body.appendParagraph('Forgeser Servicios del Sur SL');
  body.appendParagraph('Fecha: ' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'dd/MM/yyyy'));
  body.appendParagraph('');
  body.appendParagraph('A la atención de: ' + nombre).setBold(true);
  body.appendParagraph('DNI: ' + dni);
  body.appendParagraph('Centro: ' + centro);
  body.appendParagraph('');
  body.appendParagraph('Le comunicamos que, conforme al artículo 22 de la Ley 31/1995, de Prevención de Riesgos Laborales, se ha programado su reconocimiento médico de vigilancia de la salud.');
  body.appendParagraph('');
  body.appendParagraph('DATOS DE LA CITA').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Fecha: ' + (data.fecha_cita || '[POR CONFIRMAR]'));
  body.appendParagraph('Hora: ' + (data.hora_cita || '[POR CONFIRMAR]'));
  body.appendParagraph('Lugar: ' + (data.lugar_cita || '[POR CONFIRMAR]'));
  body.appendParagraph('SPA / Mutua: ' + (data.spa || '[POR CONFIRMAR]'));
  body.appendParagraph('');
  body.appendParagraph('Le recordamos que el reconocimiento médico es voluntario, salvo en los casos previstos en el artículo 22.1 de la LPRL.');
  body.appendParagraph('');
  body.appendParagraph('Firma de recepción: _____________________     Fecha: ___/___/______');
  body.appendParagraph('');
  body.appendParagraph('□ ACEPTO realizarme el reconocimiento médico');
  body.appendParagraph('□ RENUNCIO voluntariamente al reconocimiento médico');
  body.appendParagraph('');
  body.appendParagraph('Fdo: ' + nombre);

  doc.saveAndClose();
  DriveApp.getFileById(doc.getId()).moveTo(carpetaDocs);
  registrarDocumentoGenerado_('reconocimiento_medico', 'PRL', nombre, dni, centro, titulo, doc.getUrl());
  return { ok: true, url: doc.getUrl(), id: doc.getId(), titulo: titulo };
}

// ════════════════════════════════════════
// GENERAR ACTA DE FORMACIÓN — TABLA CON FONDO CLARO
// ════════════════════════════════════════

function generarActaFormacion_(data) {
  var nombre = data.nombre_empleado || data.nombre || '';
  var dni = data.dni || '';
  var centro = data.centro || '';

  var carpetaRaiz = DriveApp.getFolderById(CARPETA_RAIZ_ID);
  var carpetaPRL = obtenerOCrearCarpeta_(carpetaRaiz, 'PRL');
  var carpetaDocs = obtenerOCrearCarpeta_(carpetaPRL, 'Actas formación');

  var titulo = 'ACTA FORMACIÓN — ' + (data.curso || '') + ' — ' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'dd-MM-yyyy');
  var doc = DocumentApp.create(titulo);
  var body = doc.getBody();

  body.appendParagraph('ACTA DE FORMACIÓN EN PREVENCIÓN DE RIESGOS LABORALES').setHeading(DocumentApp.ParagraphHeading.HEADING1).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph('________________________________________').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph('');
  body.appendParagraph('Empresa: Forgeser Servicios del Sur SL');
  body.appendParagraph('Fecha: ' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'dd/MM/yyyy'));
  body.appendParagraph('');
  body.appendParagraph('DATOS DE LA FORMACIÓN').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Curso: ' + (data.curso || ''));
  body.appendParagraph('Horas: ' + (data.horas || ''));
  body.appendParagraph('Modalidad: ' + (data.modalidad || 'Presencial'));
  body.appendParagraph('Entidad formadora: ' + (data.entidad || ''));
  body.appendParagraph('Fecha inicio: ' + (data.fecha_inicio || ''));
  body.appendParagraph('Fecha fin: ' + (data.fecha_fin || ''));
  body.appendParagraph('');
  body.appendParagraph('ASISTENTES').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('');

  var table = body.appendTable();
  var headerRow = table.appendTableRow();
  ['Nombre', 'DNI', 'Centro', 'Firma'].forEach(function(h) {
    var cell = headerRow.appendTableCell(h);
    cell.setBackgroundColor('#c8e6c9');
    cell.getChild(0).asParagraph().editAsText().setBold(true).setFontSize(9);
  });

  var asistentes = data.asistentes || [{ nombre: nombre, dni: dni, centro: centro }];
  for (var i = 0; i < asistentes.length; i++) {
    var row = table.appendTableRow();
    row.appendTableCell(asistentes[i].nombre || '');
    row.appendTableCell(asistentes[i].dni || '');
    row.appendTableCell(asistentes[i].centro || '');
    row.appendTableCell('');
  }

  body.appendParagraph('');
  body.appendParagraph('Conforme al artículo 19 de la Ley 31/1995, de Prevención de Riesgos Laborales.');
  body.appendParagraph('');
  body.appendParagraph('Firma responsable formación: _____________________');
  body.appendParagraph('');
  body.appendParagraph('Firma responsable PRL empresa: _____________________');

  doc.saveAndClose();
  DriveApp.getFileById(doc.getId()).moveTo(carpetaDocs);
  registrarDocumentoGenerado_('certificado_prl', 'PRL', nombre, dni, centro, titulo, doc.getUrl());
  return { ok: true, url: doc.getUrl(), id: doc.getId(), titulo: titulo };
}

// ════════════════════════════════════════
// ALERTAS DE CADUCIDAD
// ════════════════════════════════════════

function generarAlertasCaducidad_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoy = new Date();
  var alertas = [];

  var hEpi = ss.getSheetByName('PRL_EPIS');
  if (hEpi && hEpi.getLastRow() > 1) {
    var dEpi = hEpi.getDataRange().getValues();
    for (var i = 1; i < dEpi.length; i++) {
      if (!dEpi[i][10]) continue;
      var dias = Math.floor((new Date(dEpi[i][10]) - hoy) / 86400000);
      if (dias <= 90) alertas.push({ tipo: 'epi', subtipo: dEpi[i][5], nombre: dEpi[i][2], dni: dEpi[i][3], centro: dEpi[i][4], descripcion: dEpi[i][6], fecha_caducidad: dEpi[i][10], dias: dias, urgencia: dias < 0 ? 'vencido' : dias < 15 ? 'critico' : dias < 30 ? 'urgente' : 'proximo' });
    }
  }

  var hRec = ss.getSheetByName('PRL_RECONOCIMIENTOS');
  if (hRec && hRec.getLastRow() > 1) {
    var dRec = hRec.getDataRange().getValues();
    for (var j = 1; j < dRec.length; j++) {
      if (!dRec[j][10]) continue;
      var dias2 = Math.floor((new Date(dRec[j][10]) - hoy) / 86400000);
      if (dias2 <= 90) alertas.push({ tipo: 'reconocimiento', subtipo: dRec[j][5], nombre: dRec[j][2], dni: dRec[j][3], centro: dRec[j][4], fecha_caducidad: dRec[j][10], dias: dias2, urgencia: dias2 < 0 ? 'vencido' : dias2 < 15 ? 'critico' : dias2 < 30 ? 'urgente' : 'proximo' });
    }
  }

  var hForm = ss.getSheetByName('PRL_FORMACION');
  if (hForm && hForm.getLastRow() > 1) {
    var dForm = hForm.getDataRange().getValues();
    for (var k = 1; k < dForm.length; k++) {
      if (!dForm[k][12]) continue;
      var dias3 = Math.floor((new Date(dForm[k][12]) - hoy) / 86400000);
      if (dias3 <= 90) alertas.push({ tipo: 'formacion', subtipo: dForm[k][5], nombre: dForm[k][2], dni: dForm[k][3], centro: dForm[k][4], fecha_caducidad: dForm[k][12], dias: dias3, urgencia: dias3 < 0 ? 'vencido' : dias3 < 15 ? 'critico' : dias3 < 30 ? 'urgente' : 'proximo' });
    }
  }

  var hDocs = ss.getSheetByName('DOCUMENTOS_GENERAL');
  if (hDocs && hDocs.getLastRow() > 1) {
    var dDocs = hDocs.getDataRange().getValues();
    for (var l = 1; l < dDocs.length; l++) {
      if (!dDocs[l][14]) continue;
      var fechaVenc = dDocs[l][14];
      var fv;
      try {
        if (typeof fechaVenc === 'string' && fechaVenc.indexOf('/') !== -1) { var p = fechaVenc.split('/'); fv = new Date(p[2], p[1]-1, p[0]); }
        else fv = new Date(fechaVenc);
      } catch(e) { continue; }
      if (isNaN(fv.getTime())) continue;
      var dias4 = Math.floor((fv - hoy) / 86400000);
      if (dias4 <= 90) alertas.push({ tipo: 'documento', subtipo: dDocs[l][2], nombre: dDocs[l][4], dni: dDocs[l][5], centro: dDocs[l][6], fecha_caducidad: fechaVenc, dias: dias4, urgencia: dias4 < 0 ? 'vencido' : dias4 < 15 ? 'critico' : dias4 < 30 ? 'urgente' : 'proximo' });
    }
  }

  alertas.sort(function(a, b) { return a.dias - b.dias; });
  var resumen = { total: alertas.length, vencidos: 0, criticos: 0, urgentes: 0, proximos: 0 };
  for (var m = 0; m < alertas.length; m++) { resumen[alertas[m].urgencia + 's'] = (resumen[alertas[m].urgencia + 's'] || 0) + 1; }
  return { alertas: alertas, resumen: resumen, certificaciones_disponibles: CERTIFICACIONES_EXTRA };
}

// ════════════════════════════════════════
// GENERAR AVISO DE CADUCIDAD
// ════════════════════════════════════════

function generarAvisoCaducidad_(data) {
  var nombre = data.nombre || '';
  var dni = data.dni || '';
  var centro = data.centro || '';

  var carpetaRaiz = DriveApp.getFolderById(CARPETA_RAIZ_ID);
  var carpetaPRL = obtenerOCrearCarpeta_(carpetaRaiz, 'PRL');
  var carpetaDocs = obtenerOCrearCarpeta_(carpetaPRL, 'Avisos caducidad');

  var titulo = 'AVISO CADUCIDAD — ' + (data.subtipo || data.tipo || '') + ' — ' + nombre + ' — ' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'dd-MM-yyyy');
  var doc = DocumentApp.create(titulo);
  var body = doc.getBody();

  body.appendParagraph('AVISO DE RENOVACIÓN / CADUCIDAD').setHeading(DocumentApp.ParagraphHeading.HEADING1).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph('________________________________________').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph('');
  body.appendParagraph('Forgeser Servicios del Sur SL');
  body.appendParagraph('Fecha: ' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'dd/MM/yyyy'));
  body.appendParagraph('');
  body.appendParagraph('A la atención de: ' + nombre).setBold(true);
  body.appendParagraph('DNI: ' + dni);
  body.appendParagraph('');

  var tipoTexto = data.subtipo || data.tipo || 'documento';
  var diasTexto = data.dias < 0 ? 'ha caducado hace ' + Math.abs(data.dias) + ' días' : 'caduca en ' + data.dias + ' días';

  body.appendParagraph('Le informamos que su ' + tipoTexto + ' ' + diasTexto + '.').setBold(true);
  body.appendParagraph('');
  body.appendParagraph('Fecha de caducidad: ' + (data.fecha_caducidad || ''));
  body.appendParagraph('');

  if (data.tipo === 'epi') {
    body.appendParagraph('Es obligatorio sustituir el EPI caducado. Por favor, acuda a su responsable de zona para la reposición.');
  } else if (data.tipo === 'reconocimiento') {
    body.appendParagraph('Es necesario programar una nueva cita de vigilancia de la salud. Contacte con el departamento de RRHH.');
  } else if (data.tipo === 'formacion') {
    body.appendParagraph('Debe renovar la formación indicada para continuar desempeñando sus funciones.');
  } else {
    body.appendParagraph('Rogamos proceda a la renovación del documento indicado y entregue copia actualizada al departamento de RRHH.');
  }

  body.appendParagraph('');
  body.appendParagraph('Recibí:');
  body.appendParagraph('');
  body.appendParagraph('Firma: _____________________     Fecha: ___/___/______');
  body.appendParagraph('');
  body.appendParagraph('Fdo: ' + nombre);

  doc.saveAndClose();
  DriveApp.getFileById(doc.getId()).moveTo(carpetaDocs);
  registrarDocumentoGenerado_('aviso_caducidad', 'PRL', nombre, dni, centro, titulo, doc.getUrl());
  return { ok: true, url: doc.getUrl(), id: doc.getId(), titulo: titulo };
}