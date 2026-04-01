// ============================================================================
// 27_territorio_planificacion.gs — Planificación y cuadrante semanal
// ============================================================================

var HOJA_SERVICIOS_PROG = 'SERVICIOS_PROGRAMADOS';
var HOJA_SUSTITUCIONES  = 'SUSTITUCIONES';

function inicializarPlanificacion_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (!ss.getSheetByName(HOJA_SERVICIOS_PROG)) {
    var h = ss.insertSheet(HOJA_SERVICIOS_PROG);
    h.getRange(1,1,1,14).setValues([[
      'ID','Centro_ID','Centro_Nombre','Empleado_ID','Nombre_Empleado',
      'Dia_Semana','Hora_Inicio','Hora_Fin','Horas',
      'Tipo_Servicio','Frecuencia','Activo','Notas','Creado'
    ]]).setBackground('#1a3c34').setFontColor('#fff').setFontWeight('bold');
    h.setFrozenRows(1);
  }

  if (!ss.getSheetByName(HOJA_SUSTITUCIONES)) {
    var hs = ss.insertSheet(HOJA_SUSTITUCIONES);
    hs.getRange(1,1,1,10).setValues([[
      'ID','Centro_ID','Centro_Nombre','Empleado_Original_ID','Nombre_Original',
      'Empleado_Sustituto_ID','Nombre_Sustituto','Fecha','Motivo','Creado'
    ]]).setBackground('#2d5a4e').setFontColor('#fff').setFontWeight('bold');
    hs.setFrozenRows(1);
  }
}

// ── CRUD Servicios programados ───────────────────────────────────────────────
function crearServicioProgramado_(data) {
  inicializarPlanificacion_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_SERVICIOS_PROG);
  var id   = 'SERV-' + Utilities.formatDate(new Date(),'Europe/Madrid','yyyyMMddHHmmss') +
             '-' + Math.floor(Math.random()*100);

  var horas = 0;
  if (data.hora_inicio && data.hora_fin) {
    try {
      var ini = data.hora_inicio.split(':'); var fin = data.hora_fin.split(':');
      horas = Math.round(((parseInt(fin[0])*60+parseInt(fin[1])) - (parseInt(ini[0])*60+parseInt(ini[1]))) / 60 * 10) / 10;
    } catch(e) {}
  }

  hoja.appendRow([
    id, data.centro_id||'', data.centro_nombre||'',
    data.empleado_id||'', data.nombre_empleado||'',
    parseInt(data.dia_semana)||1, // 1=Lunes ... 7=Domingo
    data.hora_inicio||'', data.hora_fin||'', horas,
    data.tipo_servicio||'', data.frecuencia||'semanal',
    true, data.notas||'', new Date()
  ]);
  return { ok: true, id: id };
}

function obtenerServiciosProgramados_(filtros) {
  inicializarPlanificacion_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_SERVICIOS_PROG);
  if (!hoja || hoja.getLastRow() <= 1) return { servicios: [] };

  var datos    = hoja.getDataRange().getValues();
  var servicios = [];
  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0] || datos[i][11] === false) continue;
    var svc = {
      id:             datos[i][0],
      centro_id:      datos[i][1],
      centro_nombre:  datos[i][2],
      empleado_id:    datos[i][3],
      nombre_empleado:datos[i][4],
      dia_semana:     parseInt(datos[i][5])||1,
      hora_inicio:    datos[i][6] instanceof Date ? Utilities.formatDate(datos[i][6],'Europe/Madrid','HH:mm') : String(datos[i][6]||''),
      hora_fin:       datos[i][7] instanceof Date ? Utilities.formatDate(datos[i][7],'Europe/Madrid','HH:mm') : String(datos[i][7]||''),
      horas:          parseFloat(datos[i][8])||0,
      tipo_servicio:  datos[i][9],
      frecuencia:     datos[i][10],
      notas:          datos[i][12]
    };
    if (filtros) {
      if (filtros.centro_id   && svc.centro_id   !== filtros.centro_id)   continue;
      if (filtros.empleado_id && svc.empleado_id !== filtros.empleado_id) continue;
      if (filtros.dia_semana  && svc.dia_semana  !== parseInt(filtros.dia_semana)) continue;
    }
    servicios.push(svc);
  }
  return { servicios: servicios, total: servicios.length };
}

function eliminarServicioProgramado_(id) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_SERVICIOS_PROG);
  if (!hoja) return { ok: false };
  var datos = hoja.getDataRange().getValues();
  for (var i = datos.length-1; i >= 1; i--) {
    if (datos[i][0] === id) { hoja.deleteRow(i+1); return { ok: true }; }
  }
  return { ok: false };
}

// ── Cuadrante semanal completo ────────────────────────────────────────────────
function obtenerCuadranteSemanal_(semana) {
  // semana: 'yyyy-WNN' o null para semana actual
  var hoy   = new Date();
  var lunes = obtenerLunesSemana_(semana ? parseSemana_(semana) : hoy);

  var dias = [];
  for (var d = 0; d < 7; d++) {
    var fecha = new Date(lunes);
    fecha.setDate(lunes.getDate() + d);
    dias.push(Utilities.formatDate(fecha,'Europe/Madrid','yyyy-MM-dd'));
  }

  var svcProg = obtenerServiciosProgramados_(null);
  var ausencias = obtenerAusenciasAPI_ ? obtenerAusenciasAPI_({ estado: 'aprobada' }) : { ausencias: [] };

  // Organizar por empleado y día
  var cuadrante = {};
  var empleadosSet = {};

  svcProg.servicios.forEach(function(svc) {
    var key = svc.empleado_id || '_sin_asignar';
    if (!cuadrante[key]) {
      cuadrante[key] = {
        empleado_id:   svc.empleado_id,
        nombre:        svc.nombre_empleado || 'Sin asignar',
        dias: { 1:[], 2:[], 3:[], 4:[], 5:[], 6:[], 7:[] }
      };
    }
    cuadrante[key].dias[svc.dia_semana].push({
      id:            svc.id,
      centro_id:     svc.centro_id,
      centro:        svc.centro_nombre,
      hora_inicio:   svc.hora_inicio,
      hora_fin:      svc.hora_fin,
      horas:         svc.horas,
      tipo_servicio: svc.tipo_servicio
    });
  });

  // Marcar ausencias
  var aus = ausencias.ausencias || [];
  aus.forEach(function(a) {
    if (!cuadrante[a.empleado_id]) return;
    dias.forEach(function(fecha, idx) {
      var diaNum = idx + 1;
      if (fecha >= (a.fecha_inicio||'') && fecha <= (a.fecha_fin||'')) {
        cuadrante[a.empleado_id].dias[diaNum].push({
          ausencia: true, motivo: a.tipo||'ausencia', fecha: fecha
        });
      }
    });
  });

  return {
    semana:     semana || Utilities.formatDate(lunes,'Europe/Madrid',"yyyy-'W'ww"),
    lunes:      Utilities.formatDate(lunes,'Europe/Madrid','yyyy-MM-dd'),
    dias:       dias,
    cuadrante:  Object.values(cuadrante),
    total_filas:Object.keys(cuadrante).length
  };
}

// ── Sustituciones ────────────────────────────────────────────────────────────
function crearSustitucion_(data) {
  inicializarPlanificacion_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_SUSTITUCIONES);
  var id   = 'SUST-' + Date.now();
  hoja.appendRow([
    id, data.centro_id||'', data.centro_nombre||'',
    data.empleado_original_id||'', data.nombre_original||'',
    data.empleado_sustituto_id||'', data.nombre_sustituto||'',
    data.fecha||'', data.motivo||'', new Date()
  ]);
  return { ok: true, id: id };
}

function obtenerSustituciones_(fecha) {
  inicializarPlanificacion_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_SUSTITUCIONES);
  if (!hoja || hoja.getLastRow() <= 1) return { sustituciones: [] };
  var datos = hoja.getDataRange().getValues();
  var items = [];
  for (var i = datos.length-1; i >= 1; i--) {
    if (fecha && datos[i][7] !== fecha) continue;
    items.push({
      id: datos[i][0], centro_id: datos[i][1], centro_nombre: datos[i][2],
      nombre_original: datos[i][4], nombre_sustituto: datos[i][6],
      fecha: datos[i][7], motivo: datos[i][8]
    });
    if (items.length >= 30) break;
  }
  return { sustituciones: items };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function obtenerLunesSemana_(fecha) {
  var d = new Date(fecha);
  var dia = d.getDay();
  var diff = d.getDate() - dia + (dia === 0 ? -6 : 1);
  d.setDate(diff); d.setHours(0,0,0,0);
  return d;
}

function parseSemana_(str) {
  // 'yyyy-WNN' → fecha del lunes
  var parts = str.split('-W');
  if (parts.length !== 2) return new Date();
  var anio  = parseInt(parts[0]);
  var semNum = parseInt(parts[1]);
  var d = new Date(anio, 0, 1 + (semNum - 1) * 7);
  return obtenerLunesSemana_(d);
}