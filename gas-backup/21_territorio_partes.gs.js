// ============================================================================
// 21_territorio_partes.gs — Partes de trabajo e incidencias
// Versión: 1.1 | Fecha: 31 Marzo 2026
// CAMBIOS: obtenerIncidenciasAPI_ ahora devuelve campos SLA (cols 15-18)
//          Cabecera INCIDENCIAS ampliada con SLA_Limite, SLA_Horas, SLA_Estado, Escalaciones
// ============================================================================

var HOJA_PARTES      = 'PARTES_TRABAJO';
var HOJA_INCIDENCIAS = 'INCIDENCIAS';

// ── Crear hojas ──────────────────────────────────────────────────────────────
function crearHojaPartesSiNoExiste_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(HOJA_PARTES)) {
    var h = ss.insertSheet(HOJA_PARTES);
    var cab = [
      'ID', 'Centro_ID', 'Centro_Nombre', 'Empleado_ID', 'Nombre_Empleado',
      'Fecha', 'Hora_Inicio', 'Hora_Fin', 'Horas_Trabajadas',
      'Tipo_Servicio', 'Tareas_Realizadas', 'Observaciones',
      'Estado', 'Incidencias', 'Firma_Cliente', 'Creado'
    ];
    h.getRange(1, 1, 1, cab.length).setValues([cab])
      .setBackground('#1a3c34').setFontColor('#fff').setFontWeight('bold');
    h.setFrozenRows(1);
    h.setColumnWidth(11, 400); h.setColumnWidth(12, 300);
  }

  if (!ss.getSheetByName(HOJA_INCIDENCIAS)) {
    var h2 = ss.insertSheet(HOJA_INCIDENCIAS);
    var cab2 = [
      'ID', 'Centro_ID', 'Centro_Nombre', 'Empleado_ID', 'Nombre_Empleado',
      'Fecha', 'Tipo', 'Descripcion', 'Prioridad', 'Estado',
      'Asignado_A', 'Fecha_Resolucion', 'Resolucion', 'Creado',
      'SLA_Limite', 'SLA_Horas', 'SLA_Estado', 'Escalaciones'
    ];
    h2.getRange(1, 1, 1, cab2.length).setValues([cab2])
      .setBackground('#dc2626').setFontColor('#fff').setFontWeight('bold');
    h2.setFrozenRows(1);
    h2.setColumnWidth(8, 400); h2.setColumnWidth(13, 300);
  }
}

// ════════════════════════════════════════
// PARTES DE TRABAJO
// ════════════════════════════════════════

function crearParte_(data) {
  crearHojaPartesSiNoExiste_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PARTES);
  var id   = 'PARTE-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMdd-HHmmss') +
             '-' + Math.floor(Math.random() * 100);

  // Calcular horas trabajadas
  var horas = 0;
  if (data.hora_inicio && data.hora_fin) {
    try {
      var ini = data.hora_inicio.split(':');
      var fin = data.hora_fin.split(':');
      horas = Math.round(((parseInt(fin[0]) * 60 + parseInt(fin[1])) -
                          (parseInt(ini[0]) * 60 + parseInt(ini[1]))) / 60 * 10) / 10;
    } catch(e) {}
  }

  hoja.appendRow([
    id,
    data.centro_id || '',
    data.centro_nombre || '',
    data.empleado_id || '',
    data.nombre_empleado || '',
    data.fecha || Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM-dd'),
    data.hora_inicio || '',
    data.hora_fin || '',
    horas || parseFloat(data.horas_trabajadas) || 0,
    data.tipo_servicio || '',
    data.tareas_realizadas || '',
    data.observaciones || '',
    data.estado || 'completado',
    data.incidencias || '',
    data.firma_cliente || 'no',
    new Date()
  ]);

  return { ok: true, id: id, horas: horas };
}

function obtenerPartesAPI_(filtros) {
  crearHojaPartesSiNoExiste_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PARTES);
  if (!hoja || hoja.getLastRow() <= 1) return { partes: [], total: 0 };

  var datos  = hoja.getDataRange().getValues();
  var partes = [];

  for (var i = datos.length - 1; i >= 1; i--) {
    if (!datos[i][0]) continue;
    var parte = {
      id:               datos[i][0],
      centro_id:        datos[i][1],
      centro_nombre:    datos[i][2],
      empleado_id:      datos[i][3],
      nombre_empleado:  datos[i][4],
      fecha:            datos[i][5] instanceof Date ? Utilities.formatDate(datos[i][5], 'Europe/Madrid', 'yyyy-MM-dd') : String(datos[i][5] || ''),
      hora_inicio:      datos[i][6],
      hora_fin:         datos[i][7],
      horas_trabajadas: parseFloat(datos[i][8]) || 0,
      tipo_servicio:    datos[i][9],
      tareas_realizadas:datos[i][10],
      observaciones:    datos[i][11],
      estado:           datos[i][12],
      incidencias:      datos[i][13],
      firma_cliente:    datos[i][14]
    };

    if (filtros) {
      if (filtros.centro_id && parte.centro_id !== filtros.centro_id) continue;
      if (filtros.empleado_id && parte.empleado_id !== filtros.empleado_id) continue;
      if (filtros.fecha && parte.fecha !== filtros.fecha) continue;
      if (filtros.mes) {
        var fechaMes = parte.fecha ? parte.fecha.substring(0, 7) : '';
        if (fechaMes !== filtros.mes) continue;
      }
    }

    partes.push(parte);
    if (partes.length >= 100) break;
  }

  var totalHoras = partes.reduce(function(s, p) { return s + (p.horas_trabajadas || 0); }, 0);

  return {
    partes: partes,
    total: partes.length,
    total_horas: Math.round(totalHoras * 10) / 10
  };
}

function actualizarParte_(data) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PARTES);
  if (!hoja) return { ok: false };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === data.id) {
      if (data.tareas_realizadas !== undefined) hoja.getRange(i+1, 11).setValue(data.tareas_realizadas);
      if (data.observaciones !== undefined) hoja.getRange(i+1, 12).setValue(data.observaciones);
      if (data.estado !== undefined) hoja.getRange(i+1, 13).setValue(data.estado);
      if (data.firma_cliente !== undefined) hoja.getRange(i+1, 15).setValue(data.firma_cliente);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Parte no encontrado' };
}

function eliminarParte_(id) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PARTES);
  if (!hoja) return { ok: false };
  var datos = hoja.getDataRange().getValues();
  for (var i = datos.length - 1; i >= 1; i--) {
    if (datos[i][0] === id) { hoja.deleteRow(i+1); return { ok: true }; }
  }
  return { ok: false };
}

// ════════════════════════════════════════
// INCIDENCIAS
// ════════════════════════════════════════

function crearIncidencia_(data) {
  crearHojaPartesSiNoExiste_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_INCIDENCIAS);
  var id   = 'INC-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') +
             '-' + Math.floor(Math.random() * 100);

  hoja.appendRow([
    id,
    data.centro_id || '',
    data.centro_nombre || '',
    data.empleado_id || '',
    data.nombre_empleado || '',
    data.fecha || Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM-dd'),
    data.tipo || 'general',
    data.descripcion || '',
    data.prioridad || 'media',
    'abierta',
    data.asignado_a || '',
    '',
    '',
    new Date()
  ]);

  return { ok: true, id: id };
}

function obtenerIncidenciasAPI_(filtros) {
  crearHojaPartesSiNoExiste_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_INCIDENCIAS);
  if (!hoja || hoja.getLastRow() <= 1) return { incidencias: [], total: 0, abiertas: 0 };

  var datos       = hoja.getDataRange().getValues();
  var incidencias = [];
  var ahora       = new Date();

  for (var i = datos.length - 1; i >= 1; i--) {
    if (!datos[i][0]) continue;

    // Calcular horas restantes SLA en tiempo real
    var slaLimStr      = datos[i][14] || '';
    var horasRestantes = null;
    var slaEstadoCalc  = String(datos[i][16] || 'sin_sla');

    if (slaLimStr) {
      try {
        var slaLim = slaLimStr instanceof Date ? slaLimStr : new Date(slaLimStr);
        if (!isNaN(slaLim.getTime())) {
          horasRestantes = Math.round((slaLim - ahora) / 3600000 * 10) / 10;
          var estado = String(datos[i][9] || '');
          if (estado !== 'resuelta' && estado !== 'cerrada') {
            if (horasRestantes <= 0) slaEstadoCalc = 'vencido';
            else if (horasRestantes <= 2) slaEstadoCalc = 'proximo_vencer';
            else slaEstadoCalc = 'en_plazo';
          } else {
            slaEstadoCalc = 'completado';
          }
        }
      } catch(e) {}
    }

    var inc = {
      id:               datos[i][0],
      centro_id:        datos[i][1],
      centro_nombre:    datos[i][2],
      empleado_id:      datos[i][3],
      nombre_empleado:  datos[i][4],
      fecha:            datos[i][5] instanceof Date ? Utilities.formatDate(datos[i][5], 'Europe/Madrid', 'yyyy-MM-dd') : String(datos[i][5] || ''),
      tipo:             datos[i][6],
      descripcion:      datos[i][7],
      prioridad:        datos[i][8],
      estado:           datos[i][9],
      asignado_a:       datos[i][10],
      fecha_resolucion: datos[i][11] instanceof Date ? Utilities.formatDate(datos[i][11], 'Europe/Madrid', 'yyyy-MM-dd HH:mm') : String(datos[i][11] || ''),
      resolucion:       datos[i][12],
      creado:           datos[i][13] instanceof Date ? Utilities.formatDate(datos[i][13], 'Europe/Madrid', 'yyyy-MM-dd HH:mm') : String(datos[i][13] || ''),
      sla_limite:       slaLimStr instanceof Date ? Utilities.formatDate(slaLimStr, 'Europe/Madrid', 'yyyy-MM-dd HH:mm') : String(slaLimStr),
      sla_horas:        parseInt(datos[i][15]) || 0,
      sla_estado:       slaEstadoCalc,
      escalaciones:     parseInt(datos[i][17]) || 0,
      horas_restantes:  horasRestantes
    };

    if (filtros) {
      if (filtros.centro_id && inc.centro_id !== filtros.centro_id) continue;
      if (filtros.estado && inc.estado !== filtros.estado) continue;
      if (filtros.prioridad && inc.prioridad !== filtros.prioridad) continue;
    }

    incidencias.push(inc);
    if (incidencias.length >= 200) break;
  }

  return {
    incidencias: incidencias,
    total: incidencias.length,
    abiertas: incidencias.filter(function(i) { return i.estado === 'abierta' || i.estado === 'en_proceso'; }).length,
    en_proceso: incidencias.filter(function(i) { return i.estado === 'en_proceso'; }).length,
    vencidas: incidencias.filter(function(i) { return i.sla_estado === 'vencido'; }).length
  };
}

function resolverIncidencia_(data) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_INCIDENCIAS);
  if (!hoja) return { ok: false };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === data.id) {
      hoja.getRange(i+1, 10).setValue(data.estado || 'resuelta');
      hoja.getRange(i+1, 12).setValue(Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM-dd'));
      hoja.getRange(i+1, 13).setValue(data.resolucion || '');
      if (data.asignado_a) hoja.getRange(i+1, 11).setValue(data.asignado_a);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Incidencia no encontrada' };
}

// ── Resumen operativo por centro ─────────────────────────────────────────────
function resumenOperativoCentro_(centroId) {
  var hoy   = new Date();
  var mes   = Utilities.formatDate(hoy, 'Europe/Madrid', 'yyyy-MM');

  var partesMes    = obtenerPartesAPI_({ centro_id: centroId, mes: mes });
  var incAbiertas  = obtenerIncidenciasAPI_({ centro_id: centroId, estado: 'abierta' });

  return {
    partes_mes:      partesMes.total,
    horas_mes:       partesMes.total_horas,
    incidencias_abiertas: incAbiertas.abiertas,
    ultimo_parte:    partesMes.partes.length > 0 ? partesMes.partes[0].fecha : null
  };
}