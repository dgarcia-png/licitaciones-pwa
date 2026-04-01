// ============================================================================
// 25_territorio_calidad.gs — Control de calidad, inspecciones, NPS
// ============================================================================

var HOJA_INSPECCIONES = 'INSPECCIONES_CALIDAD';
var HOJA_NPS          = 'NPS_CLIENTE';
var HOJA_ACCIONES_COR = 'ACCIONES_CORRECTIVAS';

function inicializarHojasCalidad_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (!ss.getSheetByName(HOJA_INSPECCIONES)) {
    var h = ss.insertSheet(HOJA_INSPECCIONES);
    h.getRange(1,1,1,16).setValues([[
      'ID','Centro_ID','Centro_Nombre','Inspector_ID','Nombre_Inspector',
      'Fecha','Tipo','Estado',
      'Puntuacion_Limpieza','Puntuacion_Orden','Puntuacion_Seguridad',
      'Puntuacion_Personal','Puntuacion_Total',
      'Observaciones','Fotos_URL','Creado'
    ]]).setBackground('#1a3c34').setFontColor('#fff').setFontWeight('bold');
    h.setFrozenRows(1);
  }

  if (!ss.getSheetByName(HOJA_NPS)) {
    var hn = ss.insertSheet(HOJA_NPS);
    hn.getRange(1,1,1,9).setValues([[
      'ID','Centro_ID','Centro_Nombre','Fecha',
      'Puntuacion_NPS','Comentario','Respondido_Por','Canal','Creado'
    ]]).setBackground('#2d5a4e').setFontColor('#fff').setFontWeight('bold');
    hn.setFrozenRows(1);
  }

  if (!ss.getSheetByName(HOJA_ACCIONES_COR)) {
    var ha = ss.insertSheet(HOJA_ACCIONES_COR);
    ha.getRange(1,1,1,11).setValues([[
      'ID','Centro_ID','Inspeccion_ID','Descripcion_Problema',
      'Accion_Propuesta','Responsable','Fecha_Limite',
      'Estado','Fecha_Cierre','Resultado','Creado'
    ]]).setBackground('#dc2626').setFontColor('#fff').setFontWeight('bold');
    ha.setFrozenRows(1);
  }
}

// ── Inspecciones ─────────────────────────────────────────────────────────────
function crearInspeccionAPI_(data) {
  inicializarHojasCalidad_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_INSPECCIONES);
  var id   = 'INSP-' + Utilities.formatDate(new Date(),'Europe/Madrid','yyyyMMddHHmmss');

  var p1 = parseFloat(data.puntuacion_limpieza) ||0;
  var p2 = parseFloat(data.puntuacion_orden)    ||0;
  var p3 = parseFloat(data.puntuacion_seguridad)||0;
  var p4 = parseFloat(data.puntuacion_personal) ||0;
  var total = Math.round(((p1+p2+p3+p4)/4)*10)/10;

  hoja.appendRow([
    id, data.centro_id||'', data.centro_nombre||'',
    data.inspector_id||'', data.nombre_inspector||'',
    data.fecha||Utilities.formatDate(new Date(),'Europe/Madrid','yyyy-MM-dd'),
    data.tipo||'rutina', 'completada',
    p1, p2, p3, p4, total,
    data.observaciones||'', data.fotos_url||'', new Date()
  ]);

  // Crear acción correctiva si puntuación baja
  if (total < 3 && data.centro_id) {
    try {
      crearAccionCorrectiva_({
        centro_id: data.centro_id,
        inspeccion_id: id,
        descripcion_problema: 'Puntuación baja en inspección: ' + total + '/5',
        accion_propuesta: 'Revisar procedimientos y reforz ar servicio',
        responsable: data.nombre_inspector||'',
        fecha_limite: calcularFechaLimite_(7)
      });
    } catch(e) {}
  }

  return { ok: true, id: id, puntuacion_total: total };
}

function obtenerInspeccionesAPI_(filtros) {
  inicializarHojasCalidad_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_INSPECCIONES);
  if (!hoja || hoja.getLastRow() <= 1) return { inspecciones: [], media: 0 };

  var datos = hoja.getDataRange().getValues();
  var items = [];

  for (var i = datos.length-1; i >= 1; i--) {
    if (!datos[i][0]) continue;
    var ins = {
      id:                  datos[i][0],
      centro_id:           datos[i][1],
      centro_nombre:       datos[i][2],
      inspector_id:        datos[i][3],
      nombre_inspector:    datos[i][4],
      fecha:               datos[i][5] instanceof Date ? Utilities.formatDate(datos[i][5],'Europe/Madrid','yyyy-MM-dd') : String(datos[i][5]||''),
      tipo:                datos[i][6],
      estado:              datos[i][7],
      puntuacion_limpieza: parseFloat(datos[i][8])||0,
      puntuacion_orden:    parseFloat(datos[i][9])||0,
      puntuacion_seguridad:parseFloat(datos[i][10])||0,
      puntuacion_personal: parseFloat(datos[i][11])||0,
      puntuacion_total:    parseFloat(datos[i][12])||0,
      observaciones:       datos[i][13]
    };
    if (filtros) {
      if (filtros.centro_id && ins.centro_id !== filtros.centro_id) continue;
      if (filtros.mes && (!ins.fecha || ins.fecha.substring(0,7) !== filtros.mes)) continue;
    }
    items.push(ins);
    if (items.length >= 50) break;
  }

  var media = items.length > 0
    ? Math.round(items.reduce(function(s,x){return s+x.puntuacion_total;},0)/items.length*10)/10
    : 0;

  return { inspecciones: items, total: items.length, media: media,
    por_debajo_3: items.filter(function(x){return x.puntuacion_total < 3;}).length };
}

// ── NPS ──────────────────────────────────────────────────────────────────────
function registrarNPSAPI_(data) {
  inicializarHojasCalidad_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_NPS);
  var id   = 'NPS-' + Date.now();
  hoja.appendRow([
    id, data.centro_id||'', data.centro_nombre||'',
    data.fecha||Utilities.formatDate(new Date(),'Europe/Madrid','yyyy-MM-dd'),
    parseInt(data.puntuacion)||5,
    data.comentario||'', data.respondido_por||'',
    data.canal||'directo', new Date()
  ]);
  return { ok: true, id: id };
}

function obtenerNPSCentroAPI_(centroId) {
  inicializarHojasCalidad_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_NPS);
  if (!hoja || hoja.getLastRow() <= 1) return { respuestas: [], nps_score: 0 };

  var datos = hoja.getDataRange().getValues();
  var items = [];
  for (var i = datos.length-1; i >= 1; i--) {
    if (centroId && datos[i][1] !== centroId) continue;
    items.push({
      id:          datos[i][0],
      fecha:       datos[i][3] instanceof Date ? Utilities.formatDate(datos[i][3],'Europe/Madrid','yyyy-MM-dd') : String(datos[i][3]||''),
      puntuacion:  parseInt(datos[i][4])||0,
      comentario:  datos[i][5]
    });
    if (items.length >= 20) break;
  }

  // NPS = % promotores (9-10) - % detractores (0-6)
  var total      = items.length;
  var promotores = items.filter(function(x){return x.puntuacion >= 9;}).length;
  var detractores= items.filter(function(x){return x.puntuacion <= 6;}).length;
  var nps = total > 0 ? Math.round((promotores-detractores)/total*100) : 0;

  return { respuestas: items, total: total, nps_score: nps,
    promotores: promotores, detractores: detractores };
}

// ── Acciones correctivas ─────────────────────────────────────────────────────
function crearAccionCorrectiva_(data) {
  inicializarHojasCalidad_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_ACCIONES_COR);
  var id   = 'ACC-' + Date.now();
  hoja.appendRow([
    id, data.centro_id||'', data.inspeccion_id||'',
    data.descripcion_problema||'', data.accion_propuesta||'',
    data.responsable||'', data.fecha_limite||'',
    'abierta', '', '', new Date()
  ]);
  return { ok: true, id: id };
}

function obtenerAccionesCorrectivas_(centroId) {
  inicializarHojasCalidad_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_ACCIONES_COR);
  if (!hoja || hoja.getLastRow() <= 1) return { acciones: [], abiertas: 0 };
  var datos  = hoja.getDataRange().getValues();
  var items  = [];
  for (var i = datos.length-1; i >= 1; i--) {
    if (centroId && datos[i][1] !== centroId) continue;
    items.push({
      id:                  datos[i][0],
      centro_id:           datos[i][1],
      descripcion_problema:datos[i][3],
      accion_propuesta:    datos[i][4],
      responsable:         datos[i][5],
      fecha_limite:        datos[i][6],
      estado:              datos[i][7],
      resultado:           datos[i][9]
    });
    if (items.length >= 30) break;
  }
  return { acciones: items, abiertas: items.filter(function(x){return x.estado==='abierta';}).length };
}

function cerrarAccionCorrectiva_(id, resultado) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_ACCIONES_COR);
  if (!hoja) return { ok: false };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] !== id) continue;
    hoja.getRange(i+1,8).setValue('cerrada');
    hoja.getRange(i+1,9).setValue(Utilities.formatDate(new Date(),'Europe/Madrid','yyyy-MM-dd'));
    hoja.getRange(i+1,10).setValue(resultado||'');
    return { ok: true };
  }
  return { ok: false };
}

// ── Dashboard calidad ────────────────────────────────────────────────────────
function dashboardCalidadAPI_() {
  var ins = obtenerInspeccionesAPI_(null);
  var acc = obtenerAccionesCorrectivas_(null);
  var mes = Utilities.formatDate(new Date(),'Europe/Madrid','yyyy-MM');
  var insMes = obtenerInspeccionesAPI_({ mes: mes });
  return {
    total_inspecciones: ins.total,
    media_calidad:      ins.media,
    inspecciones_mes:   insMes.total,
    media_mes:          insMes.media,
    alertas_calidad:    ins.por_debajo_3,
    acciones_abiertas:  acc.abiertas
  };
}

function calcularFechaLimite_(dias) {
  var f = new Date(); f.setDate(f.getDate()+dias);
  return Utilities.formatDate(f,'Europe/Madrid','yyyy-MM-dd');
}