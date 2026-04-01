// ============================================================================
// 15_fichajes.gs - CONTROL DE FICHAJES (GPS + Normativa 2026)
// RD-ley 8/2019: registro diario obligatorio, conservar 4 años
// Estados: definitivo | provisional | validado
// Horas extra: cálculo automático vs jornada contrato, límite 80h/año (ET art.35)
// ACTUALIZADO 1/04/2026: integración esDiaLaborable_() — festivos no cuentan como falta
// ============================================================================

var HOJA_FICHAJES     = 'FICHAJES';
var HOJA_HORAS_EXTRA  = 'HORAS_EXTRA';

function crearHojaFichajes_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(HOJA_FICHAJES)) {
    var h = ss.insertSheet(HOJA_FICHAJES);
    h.getRange(1,1,1,17).setValues([[
      'ID','ID Empleado','Nombre','DNI','Centro',
      'Fecha','Tipo','Hora','Latitud','Longitud',
      'Dirección Aprox','Dispositivo','Método','Notas',
      'Estado',        // definitivo | provisional | validado
      'Hora_Validada', // hora corregida por supervisor
      'Validado_Por'
    ]]);
    h.getRange(1,1,1,17).setBackground('#0d47a1').setFontColor('#ffffff').setFontWeight('bold');
    h.setFrozenRows(1);
  }

  if (!ss.getSheetByName(HOJA_HORAS_EXTRA)) {
    var he = ss.insertSheet(HOJA_HORAS_EXTRA);
    he.getRange(1,1,1,12).setValues([[
      'ID','ID Empleado','Nombre','Fecha','Horas_Extra','Minutos_Extra',
      'Tipo',          // estructural | fuerza_mayor | voluntaria
      'Estado',        // pendiente | aprobada | rechazada | compensada
      'Compensacion',  // pago | descanso
      'Aprobado_Por','Fecha_Aprobacion','Notas'
    ]]);
    he.getRange(1,1,1,12).setBackground('#7c3aed').setFontColor('#ffffff').setFontWeight('bold');
    he.setFrozenRows(1);
  }
}

// ════════════════════════════════════════
// FICHAR ENTRADA / SALIDA
// ════════════════════════════════════════

function fichar_(data) {
  crearHojaFichajes_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_FICHAJES);
  var ahora = new Date();
  var id = 'FICH-' + Utilities.formatDate(ahora, 'Europe/Madrid', 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).substring(2,5).toUpperCase();
  var fecha = Utilities.formatDate(ahora, 'Europe/Madrid', 'yyyy-MM-dd');
  var hora  = data.hora || Utilities.formatDate(ahora, 'Europe/Madrid', 'HH:mm:ss');
  var estado = data.estado || 'definitivo';

  hoja.appendRow([
    id, data.id_empleado||'', data.nombre||'', data.dni||'', data.centro||'',
    fecha, data.tipo||'entrada', hora,
    data.lat||'', data.lng||'', data.direccion||'',
    data.dispositivo||'PWA', data.metodo||'GPS', data.notas||'',
    estado, '', ''
  ]);

  if (data.tipo === 'salida' && data.id_empleado) {
    try { calcularHorasExtraDia_(data.id_empleado, fecha, ss); } catch(e) {}
  }

  return { ok: true, id: id, fecha: fecha, hora: hora, tipo: data.tipo, estado: estado };
}

// ════════════════════════════════════════
// CIERRE AUTOMÁTICO DE FICHAJES (trigger diario ~23:00)
// FIX: no cerrar si hoy es festivo o fin de semana
// ════════════════════════════════════════

function configurarTriggerCierreJornada() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'cerrarFichajesAbiertos') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('cerrarFichajesAbiertos').timeBased().everyDays(1).atHour(23).create();
  Logger.log('✅ Trigger cierre jornada configurado — 23:00 diario');
}

function cerrarFichajesAbiertos() {
  crearHojaFichajes_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_FICHAJES);
  if (!hoja || hoja.getLastRow() <= 1) return;

  var hoy = Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM-dd');

  // ── FIX: No cerrar fichajes en días no laborables ─────────────────────────
  try {
    var laborable = esDiaLaborable_(hoy);
    if (!laborable.laborable) {
      Logger.log('Cierre jornada: día no laborable (' + laborable.motivo + '), sin acción.');
      return;
    }
  } catch(e) {
    // Si esDiaLaborable_ no está disponible por algún motivo, continuar con cautela
    Logger.log('WARN: esDiaLaborable_ no disponible — ' + e);
  }
  // ─────────────────────────────────────────────────────────────────────────

  var datos = hoja.getDataRange().getValues();
  var cerrados = 0;

  var porEmpleado = {};
  for (var i = 1; i < datos.length; i++) {
    var fechaRaw = datos[i][5];
    var fecha = fechaRaw instanceof Date ? Utilities.formatDate(fechaRaw,'Europe/Madrid','yyyy-MM-dd') : String(fechaRaw||'');
    if (fecha !== hoy) continue;
    var empId = String(datos[i][1]||'');
    if (!empId) continue;
    if (!porEmpleado[empId]) porEmpleado[empId] = { entradas: [], salidas: [], emp: { nombre: datos[i][2], dni: datos[i][3], centro: datos[i][4] } };
    if (datos[i][6] === 'entrada') porEmpleado[empId].entradas.push(i);
    if (datos[i][6] === 'salida')  porEmpleado[empId].salidas.push(i);
  }

  for (var empId in porEmpleado) {
    var emp = porEmpleado[empId];
    if (emp.entradas.length > 0 && emp.salidas.length < emp.entradas.length) {
      var entradaRow = datos[emp.entradas[0]];
      var horaEntRaw = entradaRow[7];
      var horaEnt = horaEntRaw instanceof Date ? Utilities.formatDate(horaEntRaw,'Europe/Madrid','HH:mm') : String(horaEntRaw||'08:00');

      var jornadaHoras = 7.6;
      try {
        var empData = obtenerEmpleadoAPI_(empId);
        if (empData && empData.jornada) jornadaHoras = parseFloat(empData.jornada) / 5;
      } catch(e) {}

      var partes = horaEnt.split(':');
      var minEnt = parseInt(partes[0])*60 + parseInt(partes[1]);
      var minSal = minEnt + Math.round(jornadaHoras * 60);
      var horaSal = (Math.floor(minSal/60) % 24).toString().padStart(2,'0') + ':' + (minSal%60).toString().padStart(2,'0');

      var idFich = 'FICH-' + Utilities.formatDate(new Date(),'Europe/Madrid','yyyyMMddHHmmss') + '-PROV';
      hoja.appendRow([
        idFich, empId, emp.emp.nombre, emp.emp.dni, emp.emp.centro,
        hoy, 'salida', horaSal,
        '', '', '',
        'Sistema', 'Automático-Cierre',
        'Cierre automático al finalizar jornada — pendiente validación supervisor',
        'provisional', '', ''
      ]);
      cerrados++;

      try { calcularHorasExtraDia_(empId, hoy, ss); } catch(e) {}
    }
  }

  Logger.log('Cierre jornada: ' + cerrados + ' fichajes cerrados provisionalmente (' + hoy + ')');
}

// ════════════════════════════════════════
// VALIDAR / EDITAR FICHAJE (supervisor)
// ════════════════════════════════════════

function validarFichaje_(data) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_FICHAJES);
  if (!hoja) return { ok: false };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] !== data.id) continue;
    hoja.getRange(i+1, 15).setValue('validado');
    if (data.hora_corregida) {
      hoja.getRange(i+1, 16).setValue(data.hora_corregida);
    }
    hoja.getRange(i+1, 17).setValue(data.validado_por || 'Supervisor');
    if (data.hora_corregida) {
      var empId = String(datos[i][1]||'');
      var fechaRaw = datos[i][5];
      var fecha = fechaRaw instanceof Date ? Utilities.formatDate(fechaRaw,'Europe/Madrid','yyyy-MM-dd') : String(fechaRaw||'');
      try { calcularHorasExtraDia_(empId, fecha, ss); } catch(e) {}
    }
    return { ok: true };
  }
  return { ok: false, error: 'Fichaje no encontrado' };
}

// ════════════════════════════════════════
// CÁLCULO DE HORAS EXTRA
// ════════════════════════════════════════

function calcularHorasExtraDia_(empId, fecha, ss) {
  if (!empId || !fecha) return;
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();

  var hoja = ss.getSheetByName(HOJA_FICHAJES);
  if (!hoja) return;

  var jornadaMinutos = 456;
  var nombreEmp = '';
  try {
    var emp = obtenerEmpleadoAPI_(empId);
    if (emp && emp.jornada) jornadaMinutos = Math.round(parseFloat(emp.jornada) / 5 * 60);
    if (emp) nombreEmp = (emp.nombre||'') + ' ' + (emp.apellidos||'');
  } catch(e) {}

  var datos = hoja.getDataRange().getValues();
  var entradas = [], salidas = [];
  for (var i = 1; i < datos.length; i++) {
    var fechaRaw = datos[i][5];
    var fStr = fechaRaw instanceof Date ? Utilities.formatDate(fechaRaw,'Europe/Madrid','yyyy-MM-dd') : String(fechaRaw||'');
    if (fStr !== fecha || String(datos[i][1]) !== String(empId)) continue;
    var horaEfectiva = datos[i][15] || datos[i][7];
    var h = horaEfectiva instanceof Date ? Utilities.formatDate(horaEfectiva,'Europe/Madrid','HH:mm') : String(horaEfectiva||'');
    if (datos[i][6] === 'entrada') entradas.push(h);
    if (datos[i][6] === 'salida')  salidas.push(h);
  }

  var minutosTrabajados = 0;
  for (var j = 0; j < Math.min(entradas.length, salidas.length); j++) {
    var pe = entradas[j].split(':'), ps = salidas[j].split(':');
    var me = parseInt(pe[0])*60 + parseInt(pe[1]);
    var ms = parseInt(ps[0])*60 + parseInt(ps[1]);
    if (ms > me) minutosTrabajados += (ms - me);
  }

  // FIX: En festivos toda hora trabajada es extra (jornada esperada = 0)
  var jornadaEfectiva = jornadaMinutos;
  try {
    var esLab = esDiaLaborable_(fecha);
    if (!esLab.laborable) jornadaEfectiva = 0; // festivo: toda hora es extra
  } catch(e) {}

  var minutosExtra = minutosTrabajados - jornadaEfectiva;
  if (minutosExtra <= 0) return;

  var horasExtra = Math.floor(minutosExtra / 60);
  var minsExtra  = minutosExtra % 60;

  var hojaHE = ss.getSheetByName(HOJA_HORAS_EXTRA);
  if (!hojaHE) return;
  var dHE = hojaHE.getDataRange().getValues();
  for (var k = dHE.length - 1; k >= 1; k--) {
    var fHE = dHE[k][3] instanceof Date ? Utilities.formatDate(dHE[k][3],'Europe/Madrid','yyyy-MM-dd') : String(dHE[k][3]||'');
    if (fHE === fecha && String(dHE[k][1]) === String(empId)) {
      hojaHE.deleteRow(k+1); break;
    }
  }

  hojaHE.appendRow([
    'HE-' + Date.now(), empId, nombreEmp.trim(), fecha,
    horasExtra + minsExtra/60, minutosExtra,
    jornadaEfectiva === 0 ? 'fuerza_mayor' : 'estructural',
    'pendiente', '', '', '', ''
  ]);
}

// ════════════════════════════════════════
// OBTENER HORAS EXTRA (empleado o mes)
// ════════════════════════════════════════

function obtenerHorasExtraAPI_(filtro) {
  crearHojaFichajes_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_HORAS_EXTRA);
  if (!hoja || hoja.getLastRow() <= 1) return { horas_extra: [], total_horas: 0, total_anio: 0 };

  var datos = hoja.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    var fRaw = datos[i][3];
    var fecha = fRaw instanceof Date ? Utilities.formatDate(fRaw,'Europe/Madrid','yyyy-MM-dd') : String(fRaw||'');
    var item = {
      id:          datos[i][0],
      empleado_id: datos[i][1],
      nombre:      datos[i][2],
      fecha:       fecha,
      horas_extra: parseFloat(datos[i][4])||0,
      minutos:     parseInt(datos[i][5])||0,
      tipo:        datos[i][6],
      estado:      datos[i][7],
      compensacion:datos[i][8],
      aprobado_por:datos[i][9],
      notas:       datos[i][11]
    };
    if (filtro) {
      if (filtro.empleado_id && item.empleado_id !== filtro.empleado_id) continue;
      if (filtro.estado && item.estado !== filtro.estado) continue;
      if (filtro.mes && fecha.substring(0,7) !== filtro.mes) continue;
    }
    items.push(item);
  }

  var totalMinutos = items.reduce(function(s,i){ return s + (i.minutos||0); }, 0);
  var anio = new Date().getFullYear().toString();
  var totalAnioMin = items.filter(function(i){ return i.fecha.startsWith(anio); })
                         .reduce(function(s,i){ return s + (i.minutos||0); }, 0);

  return {
    horas_extra: items,
    total: items.length,
    total_horas: Math.round(totalMinutos / 60 * 100) / 100,
    total_anio_horas: Math.round(totalAnioMin / 60 * 100) / 100,
    limite_anual: 80,
    disponibles_anio: Math.max(0, 80 - Math.round(totalAnioMin / 60 * 100) / 100)
  };
}

function aprobarHorasExtra_(data) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_HORAS_EXTRA);
  if (!hoja) return { ok: false };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] !== data.id) continue;
    hoja.getRange(i+1, 8).setValue(data.estado || 'aprobada');
    hoja.getRange(i+1, 9).setValue(data.compensacion || 'pago');
    hoja.getRange(i+1, 10).setValue(data.aprobado_por || 'Supervisor');
    hoja.getRange(i+1, 11).setValue(Utilities.formatDate(new Date(),'Europe/Madrid','yyyy-MM-dd'));
    if (data.notas) hoja.getRange(i+1, 12).setValue(data.notas);
    return { ok: true };
  }
  return { ok: false };
}

// ════════════════════════════════════════
// OBTENER FICHAJES (por empleado, fecha, rango)
// ════════════════════════════════════════

function obtenerFichajesAPI_(filtro) {
  crearHojaFichajes_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_FICHAJES);
  if (!hoja || hoja.getLastRow() <= 1) return { fichajes: [], total: 0 };
  var datos = hoja.getDataRange().getValues();
  var items = [];

  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    var fechaRaw = datos[i][5];
    var fechaStr = (fechaRaw instanceof Date) ? Utilities.formatDate(fechaRaw, 'Europe/Madrid', 'yyyy-MM-dd') : String(fechaRaw);
    var horaRaw = datos[i][7];
    var horaStr = (horaRaw instanceof Date) ? Utilities.formatDate(horaRaw, 'Europe/Madrid', 'HH:mm:ss') : String(horaRaw);
    var horaValidada = datos[i][15] ? (datos[i][15] instanceof Date ? Utilities.formatDate(datos[i][15],'Europe/Madrid','HH:mm') : String(datos[i][15])) : '';

    var f = {
      id: datos[i][0], id_empleado: datos[i][1], nombre: datos[i][2],
      dni: datos[i][3], centro: datos[i][4],
      fecha: fechaStr, tipo: datos[i][6], hora: horaStr,
      lat: datos[i][8], lng: datos[i][9], direccion: datos[i][10],
      dispositivo: datos[i][11], metodo: datos[i][12], notas: datos[i][13],
      estado: datos[i][14] || 'definitivo',
      hora_validada: horaValidada,
      validado_por: datos[i][16] || ''
    };

    if (filtro) {
      if (filtro.empleado && f.id_empleado !== filtro.empleado) continue;
      if (filtro.fecha && fechaStr !== filtro.fecha) continue;
      if (filtro.estado && f.estado !== filtro.estado) continue;
      if (filtro.desde && fechaStr < filtro.desde) continue;
      if (filtro.hasta && fechaStr > filtro.hasta) continue;
    }
    items.push(f);
  }

  items.sort(function(a,b) {
    var da = a.fecha + ' ' + a.hora, db = b.fecha + ' ' + b.hora;
    return db.localeCompare(da);
  });
  return { fichajes: items, total: items.length,
    provisionales: items.filter(function(f){ return f.estado === 'provisional'; }).length };
}

// ════════════════════════════════════════
// ESTADO ACTUAL (¿está fichado hoy?)
// ════════════════════════════════════════

function estadoFichajeHoy_(idEmpleado) {
  crearHojaFichajes_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_FICHAJES);
  if (!hoja || hoja.getLastRow() <= 1) return { fichado: false, fichajes_hoy: [] };
  var datos = hoja.getDataRange().getValues();
  var hoy = Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM-dd');
  var fichajesHoy = [];

  for (var i = 1; i < datos.length; i++) {
    var fechaRaw = datos[i][5];
    var fechaStr = (fechaRaw instanceof Date) ? Utilities.formatDate(fechaRaw, 'Europe/Madrid', 'yyyy-MM-dd') : String(fechaRaw);
    var horaRaw = datos[i][7];
    var horaStr = (horaRaw instanceof Date) ? Utilities.formatDate(horaRaw, 'Europe/Madrid', 'HH:mm:ss') : String(horaRaw);
    if (datos[i][1] === idEmpleado && fechaStr === hoy) {
      fichajesHoy.push({
        tipo: datos[i][6], hora: horaStr,
        estado: datos[i][14] || 'definitivo',
        lat: datos[i][8], lng: datos[i][9]
      });
    }
  }

  var ultimoTipo = fichajesHoy.length > 0 ? fichajesHoy[fichajesHoy.length - 1].tipo : null;

  // Añadir info de laborabilidad de hoy
  var esLaborableHoy = true;
  var motivoNoLaborable = '';
  try {
    var lab = esDiaLaborable_(hoy);
    esLaborableHoy = lab.laborable;
    motivoNoLaborable = lab.motivo || '';
  } catch(e) {}

  return {
    fichado: ultimoTipo === 'entrada',
    ultimo_tipo: ultimoTipo,
    fichajes_hoy: fichajesHoy,
    total_hoy: fichajesHoy.length,
    provisionales_hoy: fichajesHoy.filter(function(f){ return f.estado === 'provisional'; }).length,
    es_laborable_hoy: esLaborableHoy,
    motivo_no_laborable: motivoNoLaborable
  };
}

// ════════════════════════════════════════
// RESUMEN DIARIO — FIX: integra esDiaLaborable_
// Ahora devuelve TODOS los días del mes, clasificados:
//   tipo_dia: 'trabajado' | 'festivo' | 'fin_de_semana' | 'falta' | 'futuro'
// ════════════════════════════════════════

function resumenDiarioFichajes_(idEmpleado, mes, anio) {
  crearHojaFichajes_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_FICHAJES);

  var m = parseInt(mes) || (new Date().getMonth() + 1);
  var a = parseInt(anio) || new Date().getFullYear();

  // Obtener jornada del empleado
  var jornadaMinutos = 456; // 7h36m por defecto
  try {
    var emp = obtenerEmpleadoAPI_(idEmpleado);
    if (emp && emp.jornada) jornadaMinutos = Math.round(parseFloat(emp.jornada) / 5 * 60);
  } catch(e) {}

  // ── Recoger fichajes del mes por día ───────────────────────────────────────
  var porDia = {}; // { fecha: { fichajes: [] } }

  if (hoja && hoja.getLastRow() > 1) {
    var datos = hoja.getDataRange().getValues();
    for (var i = 1; i < datos.length; i++) {
      if (String(datos[i][1]) !== String(idEmpleado)) continue;
      var fechaRaw = datos[i][5];
      var fecha = fechaRaw instanceof Date ? Utilities.formatDate(fechaRaw,'Europe/Madrid','yyyy-MM-dd') : String(fechaRaw);
      var parts = fecha.split('-');
      if (parseInt(parts[1]) !== m || parseInt(parts[0]) !== a) continue;
      var horaEf = datos[i][15] || datos[i][7];
      var hora = horaEf instanceof Date ? Utilities.formatDate(horaEf,'Europe/Madrid','HH:mm:ss') : String(horaEf);
      if (!porDia[fecha]) porDia[fecha] = { fichajes: [] };
      porDia[fecha].fichajes.push({
        tipo: datos[i][6], hora: hora,
        estado: datos[i][14] || 'definitivo'
      });
    }
  }

  // ── Enumerar TODOS los días del mes ────────────────────────────────────────
  var hoy = Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM-dd');
  var diasEnMes = new Date(a, m, 0).getDate(); // días totales del mes
  var dias = [];
  var totalMinutos = 0;
  var diasTrabajados = 0;
  var diasFalta = 0;
  var diasFestivo = 0;
  var diasFinSemana = 0;
  var diasLaborablesEsperados = 0;

  for (var d = 1; d <= diasEnMes; d++) {
    var fechaStr = a + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
    var esFuturo = fechaStr > hoy;

    // Clasificar el día
    var tipoDia = 'falta';
    var motivoFestivo = '';
    var diaSemana = new Date(fechaStr + 'T12:00:00').getDay();

    if (esFuturo) {
      tipoDia = 'futuro';
    } else if (diaSemana === 0) {
      tipoDia = 'fin_de_semana';
      motivoFestivo = 'Domingo';
      diasFinSemana++;
    } else if (diaSemana === 6) {
      tipoDia = 'fin_de_semana';
      motivoFestivo = 'Sábado';
      diasFinSemana++;
    } else {
      // Verificar festivo
      try {
        var lab = esDiaLaborable_(fechaStr);
        if (!lab.laborable) {
          tipoDia = 'festivo';
          motivoFestivo = lab.motivo || 'Festivo';
          diasFestivo++;
        } else {
          diasLaborablesEsperados++;
        }
      } catch(e) {
        // Si falla la función, asumir laborable
        diasLaborablesEsperados++;
      }
    }

    // Procesar fichajes del día si hay
    var diaData = porDia[fechaStr];
    var minutosdia = 0;
    var entrada = '', salida = '';
    var completo = false;
    var tieneProvisional = false;
    var fichajes = [];

    if (diaData && diaData.fichajes.length > 0) {
      fichajes = diaData.fichajes.sort(function(a,b){ return a.hora.localeCompare(b.hora); });
      var entradas = fichajes.filter(function(f){ return f.tipo === 'entrada'; });
      var salidas  = fichajes.filter(function(f){ return f.tipo === 'salida'; });

      for (var j = 0; j < Math.min(entradas.length, salidas.length); j++) {
        var he = entradas[j].hora.split(':');
        var hs = salidas[j].hora.split(':');
        var minE = parseInt(he[0])*60 + parseInt(he[1]);
        var minS = parseInt(hs[0])*60 + parseInt(hs[1]);
        if (minS > minE) minutosdia += (minS - minE);
      }

      entrada = entradas.length > 0 ? entradas[0].hora : '';
      salida  = salidas.length > 0 ? salidas[salidas.length-1].hora : '';
      completo = entradas.length === salidas.length && entradas.length > 0;
      tieneProvisional = fichajes.some(function(f){ return f.estado === 'provisional'; });

      // Si hay fichajes, el día es trabajado (aunque sea festivo — voluntario)
      if (tipoDia !== 'futuro') {
        tipoDia = 'trabajado';
        diasTrabajados++;
        totalMinutos += minutosdia;
      }
    } else if (tipoDia === 'falta') {
      // Día laborable sin fichaje y no futuro = falta
      diasFalta++;
    }

    var minutosExtra = Math.max(0, minutosdia - jornadaMinutos);
    var horas = Math.floor(minutosdia / 60);
    var mins  = minutosdia % 60;

    dias.push({
      fecha:       fechaStr,
      tipo_dia:    tipoDia,         // 'trabajado' | 'festivo' | 'fin_de_semana' | 'falta' | 'futuro'
      motivo:      motivoFestivo,   // descripción del festivo si aplica
      fichajes:    fichajes,
      minutos:     minutosdia,
      horas_texto: minutosdia > 0 ? horas + 'h ' + (mins < 10 ? '0' : '') + mins + 'm' : '',
      entrada:     entrada,
      salida:      salida,
      completo:    completo,
      provisional: tieneProvisional,
      minutos_extra: minutosExtra,
      horas_extra_texto: minutosExtra > 0 ? Math.floor(minutosExtra/60) + 'h ' + (minutosExtra%60).toString().padStart(2,'0') + 'm' : ''
    });
  }

  var totalHoras = Math.floor(totalMinutos/60);
  var totalMins  = totalMinutos % 60;
  var totalExtra = dias.reduce(function(s,d){ return s + (d.minutos_extra||0); }, 0);

  return {
    dias: dias,
    total_minutos: totalMinutos,
    total_horas_texto: totalHoras + 'h ' + (totalMins < 10 ? '0' : '') + totalMins + 'm',
    dias_trabajados: diasTrabajados,
    dias_laborables_esperados: diasLaborablesEsperados,
    dias_falta: diasFalta,
    dias_festivo: diasFestivo,
    dias_fin_semana: diasFinSemana,
    total_extra_minutos: totalExtra,
    total_extra_horas: Math.round(totalExtra / 60 * 100) / 100,
    dias_provisionales: dias.filter(function(d){ return d.provisional; }).length
  };
}

// ════════════════════════════════════════
// RESUMEN MENSUAL TODOS (supervisión)
// ════════════════════════════════════════

function resumenMensualTodos_(mes, anio) {
  crearHojaFichajes_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_FICHAJES);
  if (!hoja || hoja.getLastRow() <= 1) return { resumen: [] };
  var datos = hoja.getDataRange().getValues();

  var porEmpleado = {};
  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    var fechaRaw = datos[i][5];
    var fecha = fechaRaw instanceof Date ? Utilities.formatDate(fechaRaw,'Europe/Madrid','yyyy-MM-dd') : String(fechaRaw);
    var parts = fecha.split('-');
    if (parseInt(parts[1]) !== parseInt(mes) || parseInt(parts[0]) !== parseInt(anio)) continue;
    var empId = String(datos[i][1]||'');
    if (!porEmpleado[empId]) porEmpleado[empId] = {
      id: empId, nombre: datos[i][2], dni: datos[i][3],
      fichajes: [], provisionales: 0
    };
    var horaEf = datos[i][15] || datos[i][7];
    var hora = horaEf instanceof Date ? Utilities.formatDate(horaEf,'Europe/Madrid','HH:mm') : String(horaEf);
    porEmpleado[empId].fichajes.push({ tipo: datos[i][6], hora: hora, fecha: fecha, estado: datos[i][14]||'definitivo' });
    if ((datos[i][14]||'definitivo') === 'provisional') porEmpleado[empId].provisionales++;
  }

  var resumen = [];
  for (var eId in porEmpleado) {
    var emp = porEmpleado[eId];
    var summary = resumenDiarioFichajes_(eId, mes, anio);
    resumen.push({
      id: emp.id, nombre: emp.nombre, dni: emp.dni,
      total_horas: summary.total_horas_texto,
      total_minutos: summary.total_minutos,
      dias_trabajados: summary.dias_trabajados,
      dias_laborables_esperados: summary.dias_laborables_esperados,
      dias_falta: summary.dias_falta,
      dias_festivo: summary.dias_festivo,
      total_extra_horas: summary.total_extra_horas || 0,
      dias_provisionales: emp.provisionales,
      pendiente_validacion: emp.provisionales > 0
    });
  }

  return { resumen: resumen, total: resumen.length,
    pendientes_validacion: resumen.filter(function(e){ return e.pendiente_validacion; }).length };
}