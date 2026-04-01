// ============================================================================
// 16_ausencias.gs - AUSENCIAS, VACACIONES Y PERMISOS
// Vacaciones, permisos retribuidos (art.37.3 ET), IT, calendario
// ============================================================================

var HOJA_AUSENCIAS = 'AUSENCIAS';

var TIPOS_AUSENCIA = [
  { id: 'vacaciones', label: 'Vacaciones', retribuido: true, dias_defecto: 0, requiere_aprobacion: true },
  { id: 'permiso_medico', label: 'Consulta médica', retribuido: true, dias_defecto: 0, requiere_aprobacion: true },
  { id: 'it_enfermedad', label: 'Baja médica (IT enfermedad común)', retribuido: true, dias_defecto: 0, requiere_aprobacion: false },
  { id: 'it_accidente', label: 'Baja médica (IT accidente trabajo)', retribuido: true, dias_defecto: 0, requiere_aprobacion: false },
  { id: 'matrimonio', label: 'Matrimonio / Pareja de hecho', retribuido: true, dias_defecto: 15, requiere_aprobacion: true },
  { id: 'nacimiento', label: 'Nacimiento / Adopción', retribuido: true, dias_defecto: 5, requiere_aprobacion: false },
  { id: 'fallecimiento_1', label: 'Fallecimiento familiar 1er grado', retribuido: true, dias_defecto: 4, requiere_aprobacion: false },
  { id: 'fallecimiento_2', label: 'Fallecimiento familiar 2do grado', retribuido: true, dias_defecto: 2, requiere_aprobacion: false },
  { id: 'hospitalizacion', label: 'Hospitalización familiar', retribuido: true, dias_defecto: 3, requiere_aprobacion: false },
  { id: 'mudanza', label: 'Mudanza / Traslado domicilio', retribuido: true, dias_defecto: 1, requiere_aprobacion: true },
  { id: 'examen', label: 'Examen oficial', retribuido: true, dias_defecto: 1, requiere_aprobacion: true },
  { id: 'deber_publico', label: 'Deber público (jurado, mesa electoral)', retribuido: true, dias_defecto: 0, requiere_aprobacion: false },
  { id: 'lactancia', label: 'Permiso lactancia', retribuido: true, dias_defecto: 0, requiere_aprobacion: true },
  { id: 'asuntos_propios', label: 'Asuntos propios', retribuido: false, dias_defecto: 0, requiere_aprobacion: true },
  { id: 'excedencia', label: 'Excedencia', retribuido: false, dias_defecto: 0, requiere_aprobacion: true },
  { id: 'otro', label: 'Otro permiso', retribuido: false, dias_defecto: 0, requiere_aprobacion: true }
];

function crearHojaAusencias_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(HOJA_AUSENCIAS)) {
    var h = ss.insertSheet(HOJA_AUSENCIAS);
    h.getRange(1,1,1,16).setValues([['ID','ID Empleado','Nombre','DNI','Centro','Tipo','Subtipo','Fecha Inicio','Fecha Fin','Días Solicitados','Estado','Fecha Solicitud','Aprobado Por','Fecha Aprobación','Retribuido','Notas']]);
    h.getRange(1,1,1,16).setBackground('#4527a0').setFontColor('#ffffff').setFontWeight('bold');
    h.setFrozenRows(1);
  }
}

// ════════════════════════════════════════
// OBTENER AUSENCIAS
// ════════════════════════════════════════

function obtenerAusenciasAPI_(filtro) {
  crearHojaAusencias_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_AUSENCIAS);
  if (!hoja || hoja.getLastRow() <= 1) return { ausencias: [], total: 0, tipos: TIPOS_AUSENCIA };
  var datos = hoja.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    var a = { id: datos[i][0], id_empleado: datos[i][1], nombre: datos[i][2], dni: datos[i][3], centro: datos[i][4],
      tipo: datos[i][5], subtipo: datos[i][6],
      fecha_inicio: datos[i][7] instanceof Date ? Utilities.formatDate(datos[i][7], 'Europe/Madrid', 'yyyy-MM-dd') : String(datos[i][7]),
      fecha_fin: datos[i][8] instanceof Date ? Utilities.formatDate(datos[i][8], 'Europe/Madrid', 'yyyy-MM-dd') : String(datos[i][8]),
      dias: datos[i][9], estado: datos[i][10],
      fecha_solicitud: datos[i][11] instanceof Date ? Utilities.formatDate(datos[i][11], 'Europe/Madrid', 'yyyy-MM-dd') : String(datos[i][11]),
      aprobado_por: datos[i][12],
      fecha_aprobacion: datos[i][13] instanceof Date ? Utilities.formatDate(datos[i][13], 'Europe/Madrid', 'yyyy-MM-dd') : String(datos[i][13]),
      retribuido: datos[i][14], notas: datos[i][15] };
    if (filtro && filtro.empleado && a.id_empleado !== filtro.empleado) continue;
    if (filtro && filtro.estado && a.estado !== filtro.estado) continue;
    if (filtro && filtro.mes && filtro.anio) {
      var fi = new Date(a.fecha_inicio);
      if (fi.getMonth()+1 !== parseInt(filtro.mes) || fi.getFullYear() !== parseInt(filtro.anio)) continue;
    }
    items.push(a);
  }
  items.sort(function(a,b) { return new Date(b.fecha_solicitud) - new Date(a.fecha_solicitud); });
  return { ausencias: items, total: items.length, tipos: TIPOS_AUSENCIA };
}

// ════════════════════════════════════════
// SOLICITAR AUSENCIA
// ════════════════════════════════════════

function solicitarAusencia_(data) {
  crearHojaAusencias_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_AUSENCIAS);
  var id = 'AUS-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).substring(2,5).toUpperCase();

  var tipoInfo = TIPOS_AUSENCIA.filter(function(t) { return t.id === data.tipo; })[0];
  var estado = (tipoInfo && !tipoInfo.requiere_aprobacion) ? 'aprobada' : 'pendiente';

  // Calcular días
  var dias = parseInt(data.dias) || 0;
  if (!dias && data.fecha_inicio && data.fecha_fin) {
    var fi = new Date(data.fecha_inicio);
    var ff = new Date(data.fecha_fin);
    dias = Math.ceil((ff - fi) / 86400000) + 1;
    // Descontar fines de semana
    var diasLab = 0;
    for (var d = new Date(fi); d <= ff; d.setDate(d.getDate() + 1)) {
      var dow = d.getDay();
      if (dow !== 0 && dow !== 6) diasLab++;
    }
    dias = diasLab;
  }
  if (!dias && tipoInfo && tipoInfo.dias_defecto > 0) dias = tipoInfo.dias_defecto;

  hoja.appendRow([id, data.id_empleado||'', data.nombre_empleado||'', data.dni||'', data.centro||'',
    data.tipo||'', tipoInfo ? tipoInfo.label : data.tipo, data.fecha_inicio||'', data.fecha_fin||'',
    dias, estado, new Date(), '', '', tipoInfo ? (tipoInfo.retribuido ? 'Sí' : 'No') : '', data.notas||'']);

  return { ok: true, id: id, estado: estado, dias: dias };
}

// ════════════════════════════════════════
// APROBAR / RECHAZAR
// ════════════════════════════════════════

function aprobarAusencia_(data) {
  crearHojaAusencias_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_AUSENCIAS);
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === data.id) {
      hoja.getRange(i+1, 11).setValue(data.estado || 'aprobada');
      hoja.getRange(i+1, 13).setValue(data.aprobado_por || '');
      hoja.getRange(i+1, 14).setValue(new Date());
      if (data.notas) hoja.getRange(i+1, 16).setValue(data.notas);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Ausencia no encontrada' };
}

// ════════════════════════════════════════
// RESUMEN VACACIONES POR EMPLEADO
// ════════════════════════════════════════

function resumenVacaciones_(idEmpleado, anio) {
  crearHojaAusencias_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_AUSENCIAS);
  if (!hoja || hoja.getLastRow() <= 1) return { dias_totales: 22, dias_disfrutados: 0, dias_pendientes: 22, dias_solicitados: 0 };
  var datos = hoja.getDataRange().getValues();
  var diasDisf = 0, diasSol = 0;
  var anioNum = parseInt(anio) || new Date().getFullYear();

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] !== idEmpleado) continue;
    if (datos[i][5] !== 'vacaciones') continue;
    var fi = datos[i][7] instanceof Date ? datos[i][7] : new Date(datos[i][7]);
    if (fi.getFullYear() !== anioNum) continue;
    var d = parseInt(datos[i][9]) || 0;
    if (datos[i][10] === 'aprobada' || datos[i][10] === 'disfrutada') diasDisf += d;
    if (datos[i][10] === 'pendiente') diasSol += d;
  }

  return { dias_totales: 22, dias_disfrutados: diasDisf, dias_pendientes: 22 - diasDisf, dias_solicitados: diasSol, anio: anioNum };
}

// ════════════════════════════════════════
// CALENDARIO (quién falta cada día del mes)
// ════════════════════════════════════════

function calendarioAusencias_(mes, anio) {
  crearHojaAusencias_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_AUSENCIAS);
  if (!hoja || hoja.getLastRow() <= 1) return { dias: {}, mes: mes, anio: anio };
  var datos = hoja.getDataRange().getValues();
  var calendario = {};

  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    if (datos[i][10] !== 'aprobada' && datos[i][10] !== 'disfrutada') continue;
    var fi = datos[i][7] instanceof Date ? datos[i][7] : new Date(datos[i][7]);
    var ff = datos[i][8] instanceof Date ? datos[i][8] : new Date(datos[i][8]);
    if (isNaN(fi.getTime())) continue;
    if (isNaN(ff.getTime())) ff = fi;

    for (var d = new Date(fi); d <= ff; d.setDate(d.getDate() + 1)) {
      if (d.getMonth()+1 !== parseInt(mes) || d.getFullYear() !== parseInt(anio)) continue;
      var key = Utilities.formatDate(d, 'Europe/Madrid', 'yyyy-MM-dd');
      if (!calendario[key]) calendario[key] = [];
      calendario[key].push({ nombre: datos[i][2], tipo: datos[i][5], subtipo: datos[i][6] });
    }
  }

  return { dias: calendario, mes: mes, anio: anio };
}

// ════════════════════════════════════════
// DASHBOARD AUSENCIAS
// ════════════════════════════════════════

function dashboardAusencias_() {
  crearHojaAusencias_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_AUSENCIAS);
  var stats = { total: 0, pendientes: 0, aprobadas: 0, rechazadas: 0, hoy_ausentes: 0 };
  if (!hoja || hoja.getLastRow() <= 1) return { stats: stats };
  var datos = hoja.getDataRange().getValues();
  var hoy = Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM-dd');

  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    stats.total++;
    if (datos[i][10] === 'pendiente') stats.pendientes++;
    else if (datos[i][10] === 'aprobada' || datos[i][10] === 'disfrutada') stats.aprobadas++;
    else if (datos[i][10] === 'rechazada') stats.rechazadas++;

    if (datos[i][10] === 'aprobada' || datos[i][10] === 'disfrutada') {
      var fi = datos[i][7] instanceof Date ? Utilities.formatDate(datos[i][7], 'Europe/Madrid', 'yyyy-MM-dd') : String(datos[i][7]);
      var ff = datos[i][8] instanceof Date ? Utilities.formatDate(datos[i][8], 'Europe/Madrid', 'yyyy-MM-dd') : String(datos[i][8]);
      if (hoy >= fi && hoy <= ff) stats.hoy_ausentes++;
    }
  }
  return { stats: stats };
}