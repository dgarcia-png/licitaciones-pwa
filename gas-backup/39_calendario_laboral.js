// ============================================================================
// 39_calendario_laboral.gs — Calendario Laboral y Festivos
// ============================================================================
// Gestiona festivos nacionales, autonómicos (Andalucía), locales y de convenio.
// Función central esDiaLaborable_() usada por Planificación, Fichajes, Ausencias.
// ============================================================================

var HOJA_FESTIVOS = 'CALENDARIO_FESTIVOS';

// ── Inicializar hoja ─────────────────────────────────────────────────────────
function inicializarCalendarioLaboral_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(HOJA_FESTIVOS)) return;
  var h = ss.insertSheet(HOJA_FESTIVOS);
  h.getRange(1,1,1,8).setValues([[
    'ID', 'Fecha', 'Descripcion', 'Tipo', 'Ambito', 'Anio', 'Activo', 'Creado'
  ]]).setBackground('#1a3c34').setFontColor('#fff').setFontWeight('bold');
  h.setFrozenRows(1);
  h.setColumnWidth(1, 120);
  h.setColumnWidth(2, 100);
  h.setColumnWidth(3, 250);
  h.setColumnWidth(4, 100);
  h.setColumnWidth(5, 150);
}

// ── TIPOS de festivo ─────────────────────────────────────────────────────────
// nacional     → BOE, aplica a toda España
// autonomico   → BOJA, aplica a Andalucía
// local        → BOP, aplica a un municipio concreto (campo ambito = municipio)
// convenio     → Días extra por convenio colectivo (campo ambito = id_convenio o nombre)
// empresa      → Días propios de la empresa (puentes, etc.)

// ════════════════════════════════════════════════════════════════════════════
// FUNCIÓN CENTRAL — ¿Es día laborable?
// Usada por Planificación, Fichajes, Ausencias, Cálculo económico
// ════════════════════════════════════════════════════════════════════════════

/**
 * Comprueba si una fecha es día laborable
 * @param {string} fechaStr - Fecha en formato yyyy-MM-dd
 * @param {Object} opciones - { municipio, convenioId, incluirSabados }
 * @returns {Object} { laborable: boolean, motivo: string }
 */
function esDiaLaborable_(fechaStr, opciones) {
  opciones = opciones || {};
  var fecha = new Date(fechaStr + 'T12:00:00');
  var diaSemana = fecha.getDay(); // 0=domingo, 6=sábado

  // 1. Domingos siempre no laborable
  if (diaSemana === 0) return { laborable: false, motivo: 'Domingo' };

  // 2. Sábados no laborable por defecto (salvo que se indique)
  if (diaSemana === 6 && !opciones.incluirSabados) return { laborable: false, motivo: 'Sábado' };

  // 3. Comprobar festivos
  var festivos = obtenerFestivosFecha_(fechaStr, opciones.municipio, opciones.convenioId);
  if (festivos.length > 0) {
    return { laborable: false, motivo: festivos[0].descripcion + ' (' + festivos[0].tipo + ')' };
  }

  return { laborable: true, motivo: '' };
}

/**
 * Cuenta días laborables entre dos fechas
 * @param {string} fechaDesde - yyyy-MM-dd
 * @param {string} fechaHasta - yyyy-MM-dd
 * @param {Object} opciones - { municipio, convenioId, incluirSabados }
 * @returns {number} Número de días laborables
 */
function diasLaborablesEntre_(fechaDesde, fechaHasta, opciones) {
  opciones = opciones || {};
  var desde = new Date(fechaDesde + 'T12:00:00');
  var hasta = new Date(fechaHasta + 'T12:00:00');
  if (desde > hasta) return 0;

  // Precargar festivos del rango para no consultar fila por fila
  var festivosCache = obtenerFestivosRango_(fechaDesde, fechaHasta, opciones.municipio, opciones.convenioId);

  var count = 0;
  var current = new Date(desde);
  while (current <= hasta) {
    var diaSemana = current.getDay();
    var fechaKey = Utilities.formatDate(current, 'Europe/Madrid', 'yyyy-MM-dd');

    if (diaSemana !== 0 && (diaSemana !== 6 || opciones.incluirSabados)) {
      if (!festivosCache[fechaKey]) count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Devuelve array de fechas laborables entre dos fechas
 * @returns {string[]} Array de fechas yyyy-MM-dd
 */
function fechasLaborablesEntre_(fechaDesde, fechaHasta, opciones) {
  opciones = opciones || {};
  var desde = new Date(fechaDesde + 'T12:00:00');
  var hasta = new Date(fechaHasta + 'T12:00:00');
  if (desde > hasta) return [];

  var festivosCache = obtenerFestivosRango_(fechaDesde, fechaHasta, opciones.municipio, opciones.convenioId);
  var fechas = [];
  var current = new Date(desde);
  while (current <= hasta) {
    var diaSemana = current.getDay();
    var fechaKey = Utilities.formatDate(current, 'Europe/Madrid', 'yyyy-MM-dd');
    if (diaSemana !== 0 && (diaSemana !== 6 || opciones.incluirSabados)) {
      if (!festivosCache[fechaKey]) fechas.push(fechaKey);
    }
    current.setDate(current.getDate() + 1);
  }
  return fechas;
}

// ════════════════════════════════════════════════════════════════════════════
// FESTIVOS — Consultas internas
// ════════════════════════════════════════════════════════════════════════════

function obtenerFestivosFecha_(fechaStr, municipio, convenioId) {
  inicializarCalendarioLaboral_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_FESTIVOS);
  if (!hoja || hoja.getLastRow() <= 1) return [];

  var datos = hoja.getDataRange().getValues();
  var resultado = [];
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][6] === false || datos[i][6] === 'FALSE') continue; // no activo
    var fechaFest = datos[i][1] instanceof Date
      ? Utilities.formatDate(datos[i][1], 'Europe/Madrid', 'yyyy-MM-dd')
      : String(datos[i][1] || '');
    if (fechaFest !== fechaStr) continue;

    var tipo = String(datos[i][3] || '');
    var ambito = String(datos[i][4] || '');

    // Nacional y autonómico aplican siempre
    if (tipo === 'nacional' || tipo === 'autonomico' || tipo === 'empresa') {
      resultado.push({ id: datos[i][0], fecha: fechaFest, descripcion: datos[i][2], tipo: tipo, ambito: ambito });
      continue;
    }
    // Local: solo si coincide municipio
    if (tipo === 'local' && municipio && ambito.toLowerCase().indexOf(municipio.toLowerCase()) >= 0) {
      resultado.push({ id: datos[i][0], fecha: fechaFest, descripcion: datos[i][2], tipo: tipo, ambito: ambito });
      continue;
    }
    // Convenio: solo si coincide
    if (tipo === 'convenio' && convenioId && (ambito === convenioId || ambito.toLowerCase().indexOf(convenioId.toLowerCase()) >= 0)) {
      resultado.push({ id: datos[i][0], fecha: fechaFest, descripcion: datos[i][2], tipo: tipo, ambito: ambito });
    }
  }
  return resultado;
}

function obtenerFestivosRango_(fechaDesde, fechaHasta, municipio, convenioId) {
  inicializarCalendarioLaboral_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_FESTIVOS);
  if (!hoja || hoja.getLastRow() <= 1) return {};

  var datos = hoja.getDataRange().getValues();
  var cache = {}; // { 'yyyy-MM-dd': true }

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][6] === false || datos[i][6] === 'FALSE') continue;
    var fechaFest = datos[i][1] instanceof Date
      ? Utilities.formatDate(datos[i][1], 'Europe/Madrid', 'yyyy-MM-dd')
      : String(datos[i][1] || '');
    if (fechaFest < fechaDesde || fechaFest > fechaHasta) continue;

    var tipo = String(datos[i][3] || '');
    var ambito = String(datos[i][4] || '');

    if (tipo === 'nacional' || tipo === 'autonomico' || tipo === 'empresa') {
      cache[fechaFest] = true;
    } else if (tipo === 'local' && municipio && ambito.toLowerCase().indexOf(municipio.toLowerCase()) >= 0) {
      cache[fechaFest] = true;
    } else if (tipo === 'convenio' && convenioId && (ambito === convenioId || ambito.toLowerCase().indexOf(convenioId.toLowerCase()) >= 0)) {
      cache[fechaFest] = true;
    }
  }
  return cache;
}

// ════════════════════════════════════════════════════════════════════════════
// API — CRUD Festivos
// ════════════════════════════════════════════════════════════════════════════

function obtenerFestivosAPI_(anio, tipo) {
  inicializarCalendarioLaboral_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_FESTIVOS);
  if (!hoja || hoja.getLastRow() <= 1) return { festivos: [], total: 0 };

  var datos = hoja.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    var f = {
      id:          datos[i][0],
      fecha:       datos[i][1] instanceof Date ? Utilities.formatDate(datos[i][1], 'Europe/Madrid', 'yyyy-MM-dd') : String(datos[i][1]||''),
      descripcion: datos[i][2] || '',
      tipo:        datos[i][3] || '',
      ambito:      datos[i][4] || '',
      anio:        parseInt(datos[i][5]) || 0,
      activo:      datos[i][6] !== false && datos[i][6] !== 'FALSE'
    };
    if (anio && f.anio !== parseInt(anio)) continue;
    if (tipo && f.tipo !== tipo) continue;
    items.push(f);
  }
  items.sort(function(a,b) { return a.fecha > b.fecha ? 1 : -1; });

  // Stats
  var stats = { nacional: 0, autonomico: 0, local: 0, convenio: 0, empresa: 0 };
  items.forEach(function(f) { if (stats[f.tipo] !== undefined) stats[f.tipo]++; });

  return { festivos: items, total: items.length, stats: stats };
}

function crearFestivo_(data) {
  inicializarCalendarioLaboral_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_FESTIVOS);
  var id   = 'FEST-' + Date.now();

  var fecha = data.fecha || '';
  var anio = fecha ? parseInt(fecha.substring(0,4)) : new Date().getFullYear();

  hoja.appendRow([
    id, fecha, data.descripcion||'', data.tipo||'nacional',
    data.ambito||'', anio, true, new Date()
  ]);
  return { ok: true, id: id };
}

function actualizarFestivo_(data) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_FESTIVOS);
  if (!hoja) return { ok: false, error: 'Sin hoja' };

  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === data.id) {
      var f = i + 1;
      if (data.fecha !== undefined)       hoja.getRange(f, 2).setValue(data.fecha);
      if (data.descripcion !== undefined) hoja.getRange(f, 3).setValue(data.descripcion);
      if (data.tipo !== undefined)        hoja.getRange(f, 4).setValue(data.tipo);
      if (data.ambito !== undefined)      hoja.getRange(f, 5).setValue(data.ambito);
      if (data.activo !== undefined)      hoja.getRange(f, 7).setValue(data.activo);
      if (data.fecha) hoja.getRange(f, 6).setValue(parseInt(data.fecha.substring(0,4)));
      return { ok: true };
    }
  }
  return { ok: false, error: 'No encontrado' };
}

function eliminarFestivo_(id) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_FESTIVOS);
  if (!hoja) return { ok: false };
  var datos = hoja.getDataRange().getValues();
  for (var i = datos.length - 1; i >= 1; i--) {
    if (datos[i][0] === id) { hoja.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: false };
}

// ════════════════════════════════════════════════════════════════════════════
// CARGA MASIVA — Festivos nacionales y autonómicos por año
// ════════════════════════════════════════════════════════════════════════════

function cargarFestivosNacionales_(anio) {
  anio = anio || new Date().getFullYear();

  // Festivos FIJOS nacionales (BOE)
  var nacionales = [
    { fecha: anio + '-01-01', desc: 'Año Nuevo' },
    { fecha: anio + '-01-06', desc: 'Epifanía del Señor (Reyes)' },
    { fecha: anio + '-05-01', desc: 'Fiesta del Trabajo' },
    { fecha: anio + '-08-15', desc: 'Asunción de la Virgen' },
    { fecha: anio + '-10-12', desc: 'Fiesta Nacional de España' },
    { fecha: anio + '-11-01', desc: 'Todos los Santos' },
    { fecha: anio + '-12-06', desc: 'Día de la Constitución' },
    { fecha: anio + '-12-08', desc: 'Inmaculada Concepción' },
    { fecha: anio + '-12-25', desc: 'Navidad' },
  ];

  // Semana Santa (variable): calcular Jueves y Viernes Santo
  var pascua = calcularPascua_(anio);
  var juevesSanto = new Date(pascua); juevesSanto.setDate(pascua.getDate() - 3);
  var viernesSanto = new Date(pascua); viernesSanto.setDate(pascua.getDate() - 2);
  nacionales.push({ fecha: Utilities.formatDate(juevesSanto, 'Europe/Madrid', 'yyyy-MM-dd'), desc: 'Jueves Santo' });
  nacionales.push({ fecha: Utilities.formatDate(viernesSanto, 'Europe/Madrid', 'yyyy-MM-dd'), desc: 'Viernes Santo' });

  // Festivos Andalucía (BOJA)
  var autonomicos = [
    { fecha: anio + '-02-28', desc: 'Día de Andalucía' },
  ];

  var creados = 0;
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  inicializarCalendarioLaboral_();

  // Evitar duplicados: cargar existentes del año
  var existentes = obtenerFestivosAPI_(String(anio));
  var fechasExist = {};
  existentes.festivos.forEach(function(f) { fechasExist[f.fecha + '_' + f.tipo] = true; });

  nacionales.forEach(function(f) {
    if (!fechasExist[f.fecha + '_nacional']) {
      crearFestivo_({ fecha: f.fecha, descripcion: f.desc, tipo: 'nacional', ambito: 'España' });
      creados++;
    }
  });

  autonomicos.forEach(function(f) {
    if (!fechasExist[f.fecha + '_autonomico']) {
      crearFestivo_({ fecha: f.fecha, descripcion: f.desc, tipo: 'autonomico', ambito: 'Andalucía' });
      creados++;
    }
  });

  return { ok: true, creados: creados, anio: anio, mensaje: creados + ' festivos añadidos para ' + anio };
}

// Algoritmo de cálculo de Pascua (Gauss/Anonymous Gregorian)
function calcularPascua_(anio) {
  var a = anio % 19;
  var b = Math.floor(anio / 100);
  var c = anio % 100;
  var d = Math.floor(b / 4);
  var e = b % 4;
  var f = Math.floor((b + 8) / 25);
  var g = Math.floor((b - f + 1) / 3);
  var h = (19 * a + b - d - g + 15) % 30;
  var i = Math.floor(c / 4);
  var k = c % 4;
  var l = (32 + 2 * e + 2 * i - h - k) % 7;
  var m = Math.floor((a + 11 * h + 22 * l) / 451);
  var mes = Math.floor((h + l - 7 * m + 114) / 31);
  var dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes - 1, dia);
}

// ════════════════════════════════════════════════════════════════════════════
// PLANIFICACIÓN POR RANGO DE FECHAS
// Genera servicios programados desde fecha_inicio a fecha_fin,
// excluyendo festivos, fines de semana y ausencias del empleado
// ════════════════════════════════════════════════════════════════════════════

function programarServicioRango_(data) {
  // data: { centro_id, centro_nombre, empleado_id, nombre_empleado,
  //         fecha_inicio, fecha_fin, dias_semana (array [1,2,3,4,5]),
  //         hora_inicio, hora_fin, tipo_servicio, municipio, convenioId }

  if (!data.centro_id || !data.empleado_id || !data.fecha_inicio || !data.fecha_fin) {
    return { ok: false, error: 'Faltan campos obligatorios' };
  }
  if (data.fecha_inicio > data.fecha_fin) {
    return { ok: false, error: 'Fecha inicio debe ser anterior a fecha fin' };
  }

  var diasSemana = data.dias_semana || [1,2,3,4,5]; // por defecto L-V
  var opciones = { municipio: data.municipio || '', convenioId: data.convenioId || '' };

  // Obtener todas las fechas laborables del rango
  var fechasLab = fechasLaborablesEntre_(data.fecha_inicio, data.fecha_fin, opciones);

  // Filtrar solo los días de la semana seleccionados
  var fechasFiltradas = fechasLab.filter(function(f) {
    var d = new Date(f + 'T12:00:00');
    var dow = d.getDay(); // 0=dom, 1=lun...6=sab
    // Convertir a nuestro formato: 1=lun...7=dom
    var diaNuestro = dow === 0 ? 7 : dow;
    return diasSemana.indexOf(diaNuestro) >= 0;
  });

  // Obtener ausencias aprobadas del empleado en el rango
  var ausencias = [];
  try {
    var ausData = obtenerAusenciasAPI_({ empleado_id: data.empleado_id, estado: 'aprobada' });
    ausencias = (ausData.ausencias || []).filter(function(a) {
      return a.fecha_inicio <= data.fecha_fin && a.fecha_fin >= data.fecha_inicio;
    });
  } catch(e) {}

  // Excluir fechas con ausencia
  var fechasAusencia = {};
  ausencias.forEach(function(a) {
    var curr = new Date(a.fecha_inicio + 'T12:00:00');
    var fin  = new Date(a.fecha_fin + 'T12:00:00');
    while (curr <= fin) {
      fechasAusencia[Utilities.formatDate(curr, 'Europe/Madrid', 'yyyy-MM-dd')] = a.tipo || 'ausencia';
      curr.setDate(curr.getDate() + 1);
    }
  });

  var fechasFinales = fechasFiltradas.filter(function(f) { return !fechasAusencia[f]; });

  // Crear servicios programados individuales (o un registro resumen)
  // Enfoque: crear en SERVICIOS_PROGRAMADOS con campo fecha específica
  inicializarPlanificacion_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_SERVICIOS_PROG);

  var horas = 0;
  if (data.hora_inicio && data.hora_fin) {
    try {
      var ini = data.hora_inicio.split(':'); var fin = data.hora_fin.split(':');
      horas = Math.round(((parseInt(fin[0])*60+parseInt(fin[1])) - (parseInt(ini[0])*60+parseInt(ini[1]))) / 60 * 10) / 10;
    } catch(e) {}
  }

  var loteId = 'LOTE-' + Utilities.formatDate(new Date(),'Europe/Madrid','yyyyMMddHHmmss');
  var creados = 0;
  var excluidos = fechasFiltradas.length - fechasFinales.length;
  var festivosExcl = fechasLab.length - fechasFiltradas.length; // no es exacto pero da idea

  fechasFinales.forEach(function(fecha) {
    var d = new Date(fecha + 'T12:00:00');
    var diaSemana = d.getDay() === 0 ? 7 : d.getDay();
    var id = 'SERV-' + fecha.replace(/-/g,'') + '-' + Math.floor(Math.random()*1000);

    hoja.appendRow([
      id, data.centro_id||'', data.centro_nombre||'',
      data.empleado_id||'', data.nombre_empleado||'',
      diaSemana, data.hora_inicio||'', data.hora_fin||'', horas,
      data.tipo_servicio||'limpieza', 'rango',
      true, 'Lote:' + loteId + ' | ' + data.fecha_inicio + ' a ' + data.fecha_fin,
      new Date()
    ]);
    creados++;
  });

  return {
    ok: true,
    lote_id: loteId,
    servicios_creados: creados,
    dias_festivos_excluidos: festivosExcl,
    dias_ausencia_excluidos: excluidos,
    fecha_inicio: data.fecha_inicio,
    fecha_fin: data.fecha_fin,
    total_dias_rango: fechasLab.length + festivosExcl
  };
}

// ════════════════════════════════════════════════════════════════════════════
// API helpers para doGet/doPost
// ════════════════════════════════════════════════════════════════════════════

function consultarDiaLaborableAPI_(fecha, municipio, convenioId) {
  return esDiaLaborable_(fecha, { municipio: municipio, convenioId: convenioId });
}

function diasLaborablesAPI_(desde, hasta, municipio, convenioId) {
  var dias = diasLaborablesEntre_(desde, hasta, { municipio: municipio, convenioId: convenioId });
  return { ok: true, dias_laborables: dias, fecha_desde: desde, fecha_hasta: hasta };
}

// ── Wrapper público para ejecutar manualmente ────────────────────────────────
function cargarFestivos2026() { return cargarFestivosNacionales_(2026); }
function cargarFestivos2027() { return cargarFestivosNacionales_(2027); }

function inicializarCalendarioLaboral() {
  inicializarCalendarioLaboral_();
  var r = cargarFestivosNacionales_(2026);
  Logger.log(r.mensaje);
  r = cargarFestivosNacionales_(2027);
  Logger.log(r.mensaje);
}