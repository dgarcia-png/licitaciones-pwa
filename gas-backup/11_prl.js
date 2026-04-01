// ============================================================================
// 11_prl.gs - PREVENCIÓN DE RIESGOS LABORALES (PRL)
// Versión: 1.0 | Fecha: Marzo 2026
// EPIs, Reconocimientos médicos, Formación PRL, Accidentes, Evaluaciones
// ============================================================================

var HOJA_EPIS = 'PRL_EPIS';
var HOJA_RECONOCIMIENTOS = 'PRL_RECONOCIMIENTOS';
var HOJA_FORMACION_PRL = 'PRL_FORMACION';
var HOJA_ACCIDENTES = 'PRL_ACCIDENTES';

// ════════════════════════════════════════
// INICIALIZACIÓN
// ════════════════════════════════════════

function crearHojasPRL_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (!ss.getSheetByName(HOJA_EPIS)) {
    var h = ss.insertSheet(HOJA_EPIS);
    var cab = ['ID', 'ID Empleado', 'Nombre Empleado', 'DNI', 'Centro',
               'Tipo EPI', 'Descripción', 'Talla', 'Cantidad',
               'Fecha Entrega', 'Fecha Caducidad', 'Firmado', 'Estado', 'Notas'];
    h.getRange(1, 1, 1, cab.length).setValues([cab]);
    h.getRange(1, 1, 1, cab.length).setBackground('#e65100').setFontColor('#ffffff').setFontWeight('bold');
    h.setFrozenRows(1);
  }

  if (!ss.getSheetByName(HOJA_RECONOCIMIENTOS)) {
    var h2 = ss.insertSheet(HOJA_RECONOCIMIENTOS);
    var cab2 = ['ID', 'ID Empleado', 'Nombre Empleado', 'DNI', 'Centro',
                'Tipo', 'Resultado', 'Apto', 'Restricciones',
                'Fecha Reconocimiento', 'Fecha Próximo', 'SPA/Mutua', 'Estado', 'Notas'];
    h2.getRange(1, 1, 1, cab2.length).setValues([cab2]);
    h2.getRange(1, 1, 1, cab2.length).setBackground('#b71c1c').setFontColor('#ffffff').setFontWeight('bold');
    h2.setFrozenRows(1);
  }

  if (!ss.getSheetByName(HOJA_FORMACION_PRL)) {
    var h3 = ss.insertSheet(HOJA_FORMACION_PRL);
    var cab3 = ['ID', 'ID Empleado', 'Nombre Empleado', 'DNI', 'Centro',
                'Curso', 'Horas', 'Modalidad', 'Entidad Formadora',
                'Fecha Inicio', 'Fecha Fin', 'Certificado', 'Fecha Caducidad', 'Estado', 'Notas'];
    h3.getRange(1, 1, 1, cab3.length).setValues([cab3]);
    h3.getRange(1, 1, 1, cab3.length).setBackground('#1b5e20').setFontColor('#ffffff').setFontWeight('bold');
    h3.setFrozenRows(1);
  }

  if (!ss.getSheetByName(HOJA_ACCIDENTES)) {
    var h4 = ss.insertSheet(HOJA_ACCIDENTES);
    var cab4 = ['ID', 'ID Empleado', 'Nombre Empleado', 'DNI', 'Centro',
                'Fecha Accidente', 'Hora', 'Lugar', 'Descripción', 'Tipo Lesión',
                'Parte Cuerpo', 'Gravedad', 'Baja Médica', 'Días Baja',
                'Testigos', 'Medidas Adoptadas', 'Notificado Autoridad', 'Estado', 'Notas'];
    h4.getRange(1, 1, 1, cab4.length).setValues([cab4]);
    h4.getRange(1, 1, 1, cab4.length).setBackground('#4a148c').setFontColor('#ffffff').setFontWeight('bold');
    h4.setColumnWidth(9, 400);
    h4.setFrozenRows(1);
  }
}

// ════════════════════════════════════════
// EPIs
// ════════════════════════════════════════

var TIPOS_EPI = ['Guantes', 'Calzado seguridad', 'Gafas protección', 'Casco', 'Arnés', 'Mascarilla', 'Chaleco reflectante', 'Protectores auditivos', 'Ropa trabajo', 'Uniforme', 'Otro'];

function obtenerEpisAPI_(filtro) {
  crearHojasPRL_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_EPIS);
  if (!hoja || hoja.getLastRow() <= 1) return { epis: [], total: 0 };
  var datos = hoja.getDataRange().getValues();
  var epis = [];
  var hoy = new Date();
  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    var e = { id: datos[i][0], id_empleado: datos[i][1], nombre: datos[i][2], dni: datos[i][3], centro: datos[i][4],
      tipo: datos[i][5], descripcion: datos[i][6], talla: datos[i][7], cantidad: datos[i][8],
      fecha_entrega: datos[i][9], fecha_caducidad: datos[i][10], firmado: datos[i][11], estado: datos[i][12], notas: datos[i][13] };
    if (e.fecha_caducidad) {
      var fc = new Date(e.fecha_caducidad);
      var dias = Math.floor((fc - hoy) / 86400000);
      e.dias_caducidad = dias;
      if (dias < 0) e.alerta = 'caducado';
      else if (dias < 30) e.alerta = 'urgente';
      else if (dias < 90) e.alerta = 'proximo';
    }
    if (filtro && filtro.empleado && e.id_empleado !== filtro.empleado) continue;
    if (filtro && filtro.centro && e.centro !== filtro.centro) continue;
    epis.push(e);
  }
  epis.sort(function(a, b) { return new Date(b.fecha_entrega) - new Date(a.fecha_entrega); });
  return { epis: epis, total: epis.length, tipos: TIPOS_EPI };
}

function agregarEpi_(data) {
  crearHojasPRL_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_EPIS);
  var id = 'EPI-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();
  hoja.appendRow([id, data.id_empleado || '', data.nombre_empleado || '', data.dni || '', data.centro || '',
    data.tipo || '', data.descripcion || '', data.talla || '', data.cantidad || 1,
    data.fecha_entrega || new Date(), data.fecha_caducidad || '', data.firmado || 'Pendiente', 'entregado', data.notas || '']);
  return { ok: true, id: id };
}

// ════════════════════════════════════════
// RECONOCIMIENTOS MÉDICOS
// ════════════════════════════════════════

function obtenerReconocimientosAPI_(filtro) {
  crearHojasPRL_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_RECONOCIMIENTOS);
  if (!hoja || hoja.getLastRow() <= 1) return { reconocimientos: [], total: 0 };
  var datos = hoja.getDataRange().getValues();
  var items = [];
  var hoy = new Date();
  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    var r = { id: datos[i][0], id_empleado: datos[i][1], nombre: datos[i][2], dni: datos[i][3], centro: datos[i][4],
      tipo: datos[i][5], resultado: datos[i][6], apto: datos[i][7], restricciones: datos[i][8],
      fecha: datos[i][9], fecha_proximo: datos[i][10], spa: datos[i][11], estado: datos[i][12], notas: datos[i][13] };
    if (r.fecha_proximo) {
      var fp = new Date(r.fecha_proximo);
      var dias = Math.floor((fp - hoy) / 86400000);
      r.dias_proximo = dias;
      if (dias < 0) r.alerta = 'vencido';
      else if (dias < 30) r.alerta = 'urgente';
      else if (dias < 90) r.alerta = 'proximo';
    }
    if (filtro && filtro.empleado && r.id_empleado !== filtro.empleado) continue;
    items.push(r);
  }
  items.sort(function(a, b) { return new Date(b.fecha) - new Date(a.fecha); });
  return { reconocimientos: items, total: items.length };
}

function agregarReconocimiento_(data) {
  crearHojasPRL_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_RECONOCIMIENTOS);
  var id = 'REC-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();
  hoja.appendRow([id, data.id_empleado || '', data.nombre_empleado || '', data.dni || '', data.centro || '',
    data.tipo || 'Anual', data.resultado || '', data.apto || 'Apto', data.restricciones || '',
    data.fecha || new Date(), data.fecha_proximo || '', data.spa || '', 'completado', data.notas || '']);
  return { ok: true, id: id };
}

// ════════════════════════════════════════
// FORMACIÓN PRL
// ════════════════════════════════════════

var CURSOS_PRL = ['PRL Básico (60h)', 'PRL Nivel Básico (30h)', 'PRL Oficio Limpieza', 'PRL Oficio Jardinería',
  'PRL Oficio Mantenimiento', 'PRL Trabajos en Altura', 'PRL Espacios Confinados', 'PRL Riesgo Eléctrico',
  'PRL Manejo Productos Químicos', 'PRL Plataformas Elevadoras', 'PRL Carretillas', 'Primeros Auxilios',
  'Plan Emergencia y Evacuación', 'Manipulación Manual Cargas', 'Riesgos Psicosociales', 'Otro'];

function obtenerFormacionPrlAPI_(filtro) {
  crearHojasPRL_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_FORMACION_PRL);
  if (!hoja || hoja.getLastRow() <= 1) return { formaciones: [], total: 0 };
  var datos = hoja.getDataRange().getValues();
  var items = [];
  var hoy = new Date();
  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    var f = { id: datos[i][0], id_empleado: datos[i][1], nombre: datos[i][2], dni: datos[i][3], centro: datos[i][4],
      curso: datos[i][5], horas: datos[i][6], modalidad: datos[i][7], entidad: datos[i][8],
      fecha_inicio: datos[i][9], fecha_fin: datos[i][10], certificado: datos[i][11],
      fecha_caducidad: datos[i][12], estado: datos[i][13], notas: datos[i][14] };
    if (f.fecha_caducidad) {
      var fc = new Date(f.fecha_caducidad);
      var dias = Math.floor((fc - hoy) / 86400000);
      f.dias_caducidad = dias;
      if (dias < 0) f.alerta = 'caducado';
      else if (dias < 30) f.alerta = 'urgente';
      else if (dias < 90) f.alerta = 'proximo';
    }
    if (filtro && filtro.empleado && f.id_empleado !== filtro.empleado) continue;
    items.push(f);
  }
  return { formaciones: items, total: items.length, cursos: CURSOS_PRL };
}

function agregarFormacionPrl_(data) {
  crearHojasPRL_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_FORMACION_PRL);
  var id = 'FPRL-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();
  hoja.appendRow([id, data.id_empleado || '', data.nombre_empleado || '', data.dni || '', data.centro || '',
    data.curso || '', data.horas || 0, data.modalidad || 'Presencial', data.entidad || '',
    data.fecha_inicio || new Date(), data.fecha_fin || '', data.certificado || 'Pendiente',
    data.fecha_caducidad || '', 'completado', data.notas || '']);
  return { ok: true, id: id };
}

// ════════════════════════════════════════
// ACCIDENTES LABORALES
// ════════════════════════════════════════

function obtenerAccidentesAPI_(filtro) {
  crearHojasPRL_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_ACCIDENTES);
  if (!hoja || hoja.getLastRow() <= 1) return { accidentes: [], total: 0 };
  var datos = hoja.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    var a = { id: datos[i][0], id_empleado: datos[i][1], nombre: datos[i][2], dni: datos[i][3], centro: datos[i][4],
      fecha: datos[i][5], hora: datos[i][6], lugar: datos[i][7], descripcion: datos[i][8],
      tipo_lesion: datos[i][9], parte_cuerpo: datos[i][10], gravedad: datos[i][11],
      baja_medica: datos[i][12], dias_baja: datos[i][13], testigos: datos[i][14],
      medidas: datos[i][15], notificado: datos[i][16], estado: datos[i][17], notas: datos[i][18] };
    if (filtro && filtro.empleado && a.id_empleado !== filtro.empleado) continue;
    if (filtro && filtro.centro && a.centro !== filtro.centro) continue;
    items.push(a);
  }
  items.sort(function(a, b) { return new Date(b.fecha) - new Date(a.fecha); });
  return { accidentes: items, total: items.length };
}

function agregarAccidente_(data) {
  crearHojasPRL_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_ACCIDENTES);
  var id = 'ACC-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();
  hoja.appendRow([id, data.id_empleado || '', data.nombre_empleado || '', data.dni || '', data.centro || '',
    data.fecha || new Date(), data.hora || '', data.lugar || '', data.descripcion || '',
    data.tipo_lesion || '', data.parte_cuerpo || '', data.gravedad || 'Leve',
    data.baja_medica || 'No', data.dias_baja || 0, data.testigos || '',
    data.medidas || '', data.notificado || 'No', 'abierto', data.notas || '']);
  return { ok: true, id: id };
}

// ════════════════════════════════════════
// DASHBOARD PRL
// ════════════════════════════════════════

function dashboardPRL_() {
  crearHojasPRL_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoy = new Date();
  var stats = { epis: { total: 0, caducados: 0, por_caducar: 0 }, reconocimientos: { total: 0, vencidos: 0, por_vencer: 0 },
    formacion: { total: 0, caducadas: 0, por_caducar: 0 }, accidentes: { total: 0, con_baja: 0, abiertos: 0, dias_baja_total: 0 } };

  // EPIs
  var hEpi = ss.getSheetByName(HOJA_EPIS);
  if (hEpi && hEpi.getLastRow() > 1) {
    var dEpi = hEpi.getDataRange().getValues();
    for (var i = 1; i < dEpi.length; i++) {
      if (!dEpi[i][0]) continue;
      stats.epis.total++;
      if (dEpi[i][10]) { var d = Math.floor((new Date(dEpi[i][10]) - hoy) / 86400000); if (d < 0) stats.epis.caducados++; else if (d < 90) stats.epis.por_caducar++; }
    }
  }

  // Reconocimientos
  var hRec = ss.getSheetByName(HOJA_RECONOCIMIENTOS);
  if (hRec && hRec.getLastRow() > 1) {
    var dRec = hRec.getDataRange().getValues();
    for (var j = 1; j < dRec.length; j++) {
      if (!dRec[j][0]) continue;
      stats.reconocimientos.total++;
      if (dRec[j][10]) { var d2 = Math.floor((new Date(dRec[j][10]) - hoy) / 86400000); if (d2 < 0) stats.reconocimientos.vencidos++; else if (d2 < 90) stats.reconocimientos.por_vencer++; }
    }
  }

  // Formación
  var hForm = ss.getSheetByName(HOJA_FORMACION_PRL);
  if (hForm && hForm.getLastRow() > 1) {
    var dForm = hForm.getDataRange().getValues();
    for (var k = 1; k < dForm.length; k++) {
      if (!dForm[k][0]) continue;
      stats.formacion.total++;
      if (dForm[k][12]) { var d3 = Math.floor((new Date(dForm[k][12]) - hoy) / 86400000); if (d3 < 0) stats.formacion.caducadas++; else if (d3 < 90) stats.formacion.por_caducar++; }
    }
  }

  // Accidentes
  var hAcc = ss.getSheetByName(HOJA_ACCIDENTES);
  if (hAcc && hAcc.getLastRow() > 1) {
    var dAcc = hAcc.getDataRange().getValues();
    for (var l = 1; l < dAcc.length; l++) {
      if (!dAcc[l][0]) continue;
      stats.accidentes.total++;
      if (dAcc[l][12] === 'Sí') stats.accidentes.con_baja++;
      if (dAcc[l][17] === 'abierto') stats.accidentes.abiertos++;
      stats.accidentes.dias_baja_total += (dAcc[l][13] || 0);
    }
  }

  var alertas_total = stats.epis.caducados + stats.epis.por_caducar + stats.reconocimientos.vencidos +
    stats.reconocimientos.por_vencer + stats.formacion.caducadas + stats.formacion.por_caducar + stats.accidentes.abiertos;

  return { stats: stats, alertas_total: alertas_total };
}