// ============================================================================
// 23_territorio_ordenes.gs — Órdenes de trabajo (5 tipos, workflow 6 estados)
// ============================================================================

var HOJA_ORDENES = 'ORDENES_TRABAJO';

var TIPOS_OT    = ['programada','extraordinaria','correctiva','inspeccion','preventiva'];
var ESTADOS_OT  = ['pendiente','asignada','en_proceso','pausada','completada','cancelada'];
var PRIORIDAD_OT= ['baja','media','alta','urgente'];

function crearHojaOrdenesSiNoExiste_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(HOJA_ORDENES)) return;
  var h = ss.insertSheet(HOJA_ORDENES);
  h.getRange(1,1,1,22).setValues([[
    'ID','Titulo','Tipo','Prioridad','Estado',
    'Centro_ID','Centro_Nombre','Empleado_ID','Nombre_Empleado',
    'Fecha_Programada','Hora_Inicio','Hora_Fin','Horas_Estimadas',
    'Descripcion','Checklist_Template','Parte_ID',
    'Fecha_Inicio_Real','Fecha_Fin_Real','Horas_Reales',
    'Observaciones','Creado','Modificado'
  ]]).setBackground('#1a3c34').setFontColor('#fff').setFontWeight('bold');
  h.setFrozenRows(1);
}

function crearOrdenTrabajo_(data) {
  crearHojaOrdenesSiNoExiste_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_ORDENES);
  var id   = 'OT-' + Utilities.formatDate(new Date(),'Europe/Madrid','yyyyMMdd-HHmmss') +
             '-' + Math.floor(Math.random()*100);

  // Validar PRL si es asignación a empleado
  var alertaPRL = '';
  if (data.empleado_id) {
    try {
      var emp = obtenerEmpleadoAPI_(data.empleado_id);
      if (emp && emp.prl_al_dia === false) alertaPRL = 'ADVERTENCIA: PRL del empleado puede estar desactualizado';
    } catch(e) {}
  }

  hoja.appendRow([
    id, data.titulo||'', data.tipo||'programada',
    data.prioridad||'media', 'pendiente',
    data.centro_id||'', data.centro_nombre||'',
    data.empleado_id||'', data.nombre_empleado||'',
    data.fecha_programada||'',
    data.hora_inicio ? String(data.hora_inicio).substring(0,5) : '',
    data.hora_fin    ? String(data.hora_fin).substring(0,5)    : '',
    parseFloat(data.horas_estimadas)||0,
    data.descripcion||'', data.checklist_template||'', '',
    '', '', 0, '', new Date(), new Date()
  ]);

  return { ok: true, id: id, alerta_prl: alertaPRL };
}

function obtenerOrdenesAPI_(filtros) {
  crearHojaOrdenesSiNoExiste_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_ORDENES);
  if (!hoja || hoja.getLastRow() <= 1) return { ordenes: [], total: 0 };

  var datos  = hoja.getDataRange().getValues();
  var ordenes = [];
  for (var i = datos.length-1; i >= 1; i--) {
    if (!datos[i][0]) continue;
    var ot = parsearOrden_(datos[i]);
    if (filtros) {
      if (filtros.centro_id   && ot.centro_id   !== filtros.centro_id)   continue;
      if (filtros.empleado_id && ot.empleado_id !== filtros.empleado_id) continue;
      if (filtros.estado      && ot.estado      !== filtros.estado)      continue;
      if (filtros.tipo        && ot.tipo        !== filtros.tipo)        continue;
      if (filtros.fecha       && ot.fecha_programada !== filtros.fecha)  continue;
    }
    ordenes.push(ot);
    if (ordenes.length >= 100) break;
  }
  return {
    ordenes: ordenes, total: ordenes.length,
    pendientes:   ordenes.filter(function(o){return o.estado==='pendiente';}).length,
    en_proceso:   ordenes.filter(function(o){return o.estado==='en_proceso';}).length,
    urgentes:     ordenes.filter(function(o){return o.prioridad==='urgente';}).length
  };
}

function actualizarEstadoOrden_(id, estado, data) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_ORDENES);
  if (!hoja) return { ok: false };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] !== id) continue;
    hoja.getRange(i+1, 5).setValue(estado);
    if (estado === 'en_proceso') hoja.getRange(i+1, 17).setValue(Utilities.formatDate(new Date(),'Europe/Madrid','yyyy-MM-dd HH:mm'));
    if (estado === 'completada') {
      hoja.getRange(i+1, 18).setValue(Utilities.formatDate(new Date(),'Europe/Madrid','yyyy-MM-dd HH:mm'));
      if (data && data.horas_reales) hoja.getRange(i+1, 19).setValue(parseFloat(data.horas_reales)||0);
    }
    if (data && data.empleado_id) {
      hoja.getRange(i+1, 8).setValue(data.empleado_id);
      hoja.getRange(i+1, 9).setValue(data.nombre_empleado||'');
    }
    if (data && data.observaciones) hoja.getRange(i+1, 20).setValue(data.observaciones);
    hoja.getRange(i+1, 22).setValue(new Date());
    return { ok: true };
  }
  return { ok: false, error: 'OT no encontrada' };
}

function eliminarOrden_(id) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_ORDENES);
  if (!hoja) return { ok: false };
  var datos = hoja.getDataRange().getValues();
  for (var i = datos.length-1; i >= 1; i--) {
    if (datos[i][0] === id) { hoja.deleteRow(i+1); return { ok: true }; }
  }
  return { ok: false };
}

function fmtHoraOT_(h) {
  if (!h) return '';
  if (h instanceof Date) return Utilities.formatDate(h,'Europe/Madrid','HH:mm');
  var s = String(h);
  if (s.indexOf('1899') !== -1 || s.indexOf('T') !== -1) {
    try { return Utilities.formatDate(new Date(s),'Europe/Madrid','HH:mm'); } catch(e) { return ''; }
  }
  return s;
}

function parsearOrden_(row) {
  return {
    id:               row[0],  titulo:        row[1],
    tipo:             row[2],  prioridad:     row[3],  estado:     row[4],
    centro_id:        row[5],  centro_nombre: row[6],
    empleado_id:      row[7],  nombre_empleado: row[8],
    fecha_programada: row[9] instanceof Date ? Utilities.formatDate(row[9],'Europe/Madrid','yyyy-MM-dd') : String(row[9]||''),
    hora_inicio:      fmtHoraOT_(row[10]),
    hora_fin:         fmtHoraOT_(row[11]),
    horas_estimadas:  parseFloat(row[12])||0,
    descripcion:      row[13], parte_id:      row[15],
    horas_reales:     parseFloat(row[18])||0,
    observaciones:    row[19]
  };
}

// ============================================================================
// RELACIÓN 1:N ÓRDENES ↔ PARTES
// Tabla PARTES_POR_ORDEN: una orden puede tener múltiples partes
// ============================================================================

var HOJA_PARTES_POR_ORDEN = 'PARTES_POR_ORDEN';

function crearHojaPartesPorOrdenSiNoExiste_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(HOJA_PARTES_POR_ORDEN)) return;
  var h = ss.insertSheet(HOJA_PARTES_POR_ORDEN);
  h.getRange(1,1,1,8).setValues([[
    'ID','Orden_ID','Parte_ID','Empleado_ID','Nombre_Empleado',
    'Fecha','Horas_Reales','Creado'
  ]]).setBackground('#1a3c34').setFontColor('#fff').setFontWeight('bold');
  h.setFrozenRows(1);
}

function vincularParteOrden_(ordenId, parteId, empleadoId, nombreEmpleado, fecha, horas) {
  crearHojaPartesPorOrdenSiNoExiste_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PARTES_POR_ORDEN);
  var id   = 'PPO-' + Date.now();

  hoja.appendRow([
    id, ordenId, parteId,
    empleadoId||'', nombreEmpleado||'',
    fecha || Utilities.formatDate(new Date(),'Europe/Madrid','yyyy-MM-dd'),
    parseFloat(horas)||0,
    new Date()
  ]);
  return { ok: true, id: id };
}

function obtenerPartesDeOrdenAPI_(ordenId) {
  crearHojaPartesPorOrdenSiNoExiste_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PARTES_POR_ORDEN);
  if (!hoja || hoja.getLastRow() <= 1) return { partes: [], total: 0, total_horas: 0 };

  var datos  = hoja.getDataRange().getValues();
  var items  = [];
  var totalH = 0;

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] !== ordenId) continue;
    var fRaw = datos[i][5];
    items.push({
      id:              datos[i][0],
      orden_id:        datos[i][1],
      parte_id:        datos[i][2],
      empleado_id:     datos[i][3],
      nombre_empleado: datos[i][4],
      fecha:           fRaw instanceof Date ? Utilities.formatDate(fRaw,'Europe/Madrid','yyyy-MM-dd') : String(fRaw||''),
      horas_reales:    parseFloat(datos[i][6])||0
    });
    totalH += parseFloat(datos[i][6])||0;
  }

  // Calcular si la orden está completa (todas las horas estimadas cubiertas)
  var ordenData = null;
  var hOT = ss.getSheetByName(HOJA_ORDENES);
  if (hOT) {
    var dOT = hOT.getDataRange().getValues();
    for (var oi = 1; oi < dOT.length; oi++) {
      if (dOT[oi][0] === ordenId) {
        ordenData = parsearOrden_(dOT[oi]);
        break;
      }
    }
  }

  var pctCompletado = ordenData && ordenData.horas_estimadas > 0
    ? Math.min(100, Math.round(totalH / ordenData.horas_estimadas * 100))
    : 0;

  return {
    partes: items,
    total: items.length,
    total_horas: Math.round(totalH * 100) / 100,
    horas_estimadas: ordenData ? ordenData.horas_estimadas : 0,
    pct_completado: pctCompletado
  };
}

function obtenerOrdenesDeParte_(parteId) {
  crearHojaPartesPorOrdenSiNoExiste_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PARTES_POR_ORDEN);
  if (!hoja || hoja.getLastRow() <= 1) return { ordenes: [] };

  var datos  = hoja.getDataRange().getValues();
  var ordIds = [];
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][2] === parteId) ordIds.push(datos[i][1]);
  }

  var ordenes = [];
  if (ordIds.length > 0) {
    var hOT = ss.getSheetByName(HOJA_ORDENES);
    if (hOT) {
      var dOT = hOT.getDataRange().getValues();
      for (var oi = 1; oi < dOT.length; oi++) {
        if (ordIds.indexOf(dOT[oi][0]) !== -1) {
          ordenes.push(parsearOrden_(dOT[oi]));
        }
      }
    }
  }
  return { ordenes: ordenes };
}