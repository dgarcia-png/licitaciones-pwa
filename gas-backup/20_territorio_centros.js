// ============================================================================
// 20_territorio_centros.gs — Módulo Territorio: Centros de Servicio
// Versión: 1.0 | Fecha: Marzo 2026
// ============================================================================
// Gestiona los centros de trabajo donde se prestan los servicios contratados.
// Un centro = un contrato adjudicado + ubicación + personal asignado
// ============================================================================

var HOJA_CENTROS      = 'CENTROS_SERVICIO';
var HOJA_ASIG_CENTROS = 'ASIGNACIONES_CENTROS';

var ESTADO_CENTRO = ['activo', 'suspendido', 'finalizado', 'pendiente_inicio'];

var TIPO_CENTRO = [
  'edificio_publico', 'colegio', 'dependencia_municipal', 'parque_jardin',
  'via_publica', 'instalacion_deportiva', 'centro_sanitario', 'otro'
];

// ── Crear hojas si no existen ────────────────────────────────────────────────
function crearHojaCentrosSiNoExiste_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(HOJA_CENTROS)) {
    var h = ss.insertSheet(HOJA_CENTROS);
    var cab = [
      'ID', 'Nombre', 'Organismo', 'Tipo', 'Dirección', 'Municipio', 'Provincia',
      'Latitud', 'Longitud', 'Superficie_m2', 'Tipo_Servicio',
      'Frecuencia', 'Horario', 'Personal_Asignado', 'Responsable',
      'Contrato_ID', 'Oportunidad_ID', 'Presupuesto_Anual', 'Fecha_Inicio',
      'Fecha_Fin', 'Estado', 'Notas', 'Creado', 'Modificado'
    ];
    h.getRange(1, 1, 1, cab.length).setValues([cab])
      .setBackground('#1a3c34').setFontColor('#ffffff').setFontWeight('bold');
    h.setFrozenRows(1);
    h.setColumnWidth(2, 250); h.setColumnWidth(3, 200); h.setColumnWidth(5, 300);
  }

  if (!ss.getSheetByName(HOJA_ASIG_CENTROS)) {
    var h2 = ss.insertSheet(HOJA_ASIG_CENTROS);
    var cab2 = [
      'ID', 'Centro_ID', 'Empleado_ID', 'Nombre_Empleado', 'DNI',
      'Categoria', 'Horas_Semanales', 'Turno', 'Fecha_Inicio', 'Fecha_Fin',
      'Estado', 'Notas', 'Creado'
    ];
    h2.getRange(1, 1, 1, cab2.length).setValues([cab2])
      .setBackground('#2d5a4e').setFontColor('#ffffff').setFontWeight('bold');
    h2.setFrozenRows(1);
  }
}

// ── CRUD Centros ─────────────────────────────────────────────────────────────

function crearCentro_(data) {
  crearHojaCentrosSiNoExiste_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CENTROS);
  var id   = 'CTR-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMdd-HHmmss') +
             '-' + Math.floor(Math.random() * 1000);
  hoja.appendRow([
    id,
    data.nombre || '',
    data.organismo || '',
    data.tipo || 'edificio_publico',
    data.direccion || '',
    data.municipio || '',
    data.provincia || 'Huelva',
    parseFloat(data.latitud) || 0,
    parseFloat(data.longitud) || 0,
    parseFloat(data.superficie_m2) || 0,
    data.tipo_servicio || '',
    data.frecuencia || '',
    data.horario || '',
    parseInt(data.personal_asignado) || 0,
    data.responsable || '',
    data.contrato_id || '',
    data.oportunidad_id || '',
    parseFloat(data.presupuesto_anual) || 0,
    data.fecha_inicio || '',
    data.fecha_fin || '',
    data.estado || 'activo',
    data.notas || '',
    new Date(),
    new Date()
  ]);
  return { ok: true, id: id };
}

function obtenerCentrosAPI_(filtros) {
  crearHojaCentrosSiNoExiste_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CENTROS);
  if (!hoja || hoja.getLastRow() <= 1) return { centros: [], total: 0 };

  var datos   = hoja.getDataRange().getValues();
  var centros = [];

  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    var centro = parsearCentro_(datos[i]);

    // Filtros
    if (filtros) {
      if (filtros.estado && centro.estado !== filtros.estado) continue;
      if (filtros.municipio && !centro.municipio.toLowerCase().includes(filtros.municipio.toLowerCase())) continue;
      if (filtros.tipo_servicio && centro.tipo_servicio !== filtros.tipo_servicio) continue;
      if (filtros.oportunidad_id && centro.oportunidad_id !== filtros.oportunidad_id) continue;
    }
    centros.push(centro);
  }

  return {
    centros: centros,
    total: centros.length,
    activos: centros.filter(function(c) { return c.estado === 'activo'; }).length,
    total_personal: centros.reduce(function(s, c) { return s + (c.personal_asignado || 0); }, 0),
    total_presupuesto: centros.reduce(function(s, c) { return s + (c.presupuesto_anual || 0); }, 0)
  };
}

function obtenerCentroAPI_(id) {
  crearHojaCentrosSiNoExiste_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CENTROS);
  if (!hoja) return { error: 'Sin datos' };

  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === id) {
      var centro = parsearCentro_(datos[i]);
      // Añadir personal asignado al centro
      centro.personal = obtenerPersonalCentro_(id);
      return centro;
    }
  }
  return { error: 'Centro no encontrado' };
}

function actualizarCentro_(data) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CENTROS);
  if (!hoja) return { ok: false, error: 'Sin hoja' };

  var datos = hoja.getDataRange().getValues();
  var campos = [
    { key: 'nombre', col: 2 }, { key: 'organismo', col: 3 }, { key: 'tipo', col: 4 },
    { key: 'direccion', col: 5 }, { key: 'municipio', col: 6 }, { key: 'provincia', col: 7 },
    { key: 'latitud', col: 8 }, { key: 'longitud', col: 9 }, { key: 'superficie_m2', col: 10 },
    { key: 'tipo_servicio', col: 11 }, { key: 'frecuencia', col: 12 }, { key: 'horario', col: 13 },
    { key: 'personal_asignado', col: 14 }, { key: 'responsable', col: 15 },
    { key: 'presupuesto_anual', col: 18 }, { key: 'fecha_inicio', col: 19 }, { key: 'fecha_fin', col: 20 },
    { key: 'estado', col: 21 }, { key: 'notas', col: 22 }
  ];

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === data.id) {
      campos.forEach(function(c) {
        if (data[c.key] !== undefined) hoja.getRange(i + 1, c.col).setValue(data[c.key]);
      });
      hoja.getRange(i + 1, 24).setValue(new Date());
      return { ok: true };
    }
  }
  return { ok: false, error: 'Centro no encontrado' };
}

function eliminarCentro_(id) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CENTROS);
  if (!hoja) return { ok: false };
  var datos = hoja.getDataRange().getValues();
  for (var i = datos.length - 1; i >= 1; i--) {
    if (datos[i][0] === id) { hoja.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: false, error: 'No encontrado' };
}

// ── Personal asignado al centro ──────────────────────────────────────────────

function obtenerPersonalCentro_(centroId) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_ASIG_CENTROS);
  if (!hoja || hoja.getLastRow() <= 1) return [];

  var datos    = hoja.getDataRange().getValues();
  var personal = [];
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] === centroId && datos[i][10] !== 'finalizado') {
      personal.push({
        id:              datos[i][0],
        empleado_id:     datos[i][2],
        nombre:          datos[i][3],
        dni:             datos[i][4],
        categoria:       datos[i][5],
        horas_semanales: datos[i][6],
        turno:           datos[i][7],
        fecha_inicio:    datos[i][8],
        estado:          datos[i][10]
      });
    }
  }
  return personal;
}

function asignarPersonalCentro_(data) {
  crearHojaCentrosSiNoExiste_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_ASIG_CENTROS);
  var id   = 'ASIG-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') +
             '-' + Math.floor(Math.random() * 100);

  // Obtener nombre del empleado si no viene
  var nombre = data.nombre_empleado || '';
  if (!nombre && data.empleado_id) {
    var emp = obtenerEmpleadoAPI_(data.empleado_id);
    if (!emp.error) nombre = (emp.nombre || '') + ' ' + (emp.apellidos || '');
  }

  hoja.appendRow([
    id, data.centro_id, data.empleado_id || '', nombre,
    data.dni || '', data.categoria || '',
    parseFloat(data.horas_semanales) || 40,
    data.turno || 'mañana',
    data.fecha_inicio || Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM-dd'),
    data.fecha_fin || '',
    'activo', data.notas || '', new Date()
  ]);

  // Actualizar contador de personal en el centro
  actualizarContadorPersonal_(data.centro_id);

  return { ok: true, id: id };
}

function desasignarPersonalCentro_(id) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_ASIG_CENTROS);
  if (!hoja) return { ok: false };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === id) {
      hoja.getRange(i + 1, 10).setValue(Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM-dd'));
      hoja.getRange(i + 1, 11).setValue('finalizado');
      actualizarContadorPersonal_(datos[i][1]);
      return { ok: true };
    }
  }
  return { ok: false };
}

function actualizarContadorPersonal_(centroId) {
  var personal = obtenerPersonalCentro_(centroId);
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CENTROS);
  if (!hoja) return;
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === centroId) {
      hoja.getRange(i + 1, 14).setValue(personal.length);
      return;
    }
  }
}

// ── Importar centros desde licitación ganada ─────────────────────────────────

function importarCentrosDesdeOportunidad_(oportunidadId) {
  // Obtener datos de la oportunidad y su análisis
  var ss     = SpreadsheetApp.getActiveSpreadsheet();
  var hojaO  = ss.getSheetByName('OPORTUNIDADES');
  if (!hojaO) return { ok: false, error: 'Sin hoja oportunidades' };

  var datos  = hojaO.getDataRange().getValues();
  var opo    = null;
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === oportunidadId) {
      opo = {
        titulo:      datos[i][3],
        organismo:   datos[i][4],
        cpv:         datos[i][5],
        presupuesto: datos[i][6],
        fecha_inicio: datos[i][7]
      };
      break;
    }
  }
  if (!opo) return { ok: false, error: 'Oportunidad no encontrada' };

  // Obtener análisis para sacar lotes/ubicaciones
  var analisis = null;
  var hojaAn   = ss.getSheetByName('ANALISIS_IA');
  if (hojaAn) {
    var dAn = hojaAn.getDataRange().getValues();
    for (var j = 1; j < dAn.length; j++) {
      if (dAn[j][0] === oportunidadId) {
        try { analisis = JSON.parse(dAn[j][14] || '{}'); } catch(e) {}
        break;
      }
    }
  }

  // Obtener lotes si existen
  var lotes = [];
  var hojaL = ss.getSheetByName('LOTES');
  if (hojaL) {
    var dL = hojaL.getDataRange().getValues();
    for (var l = 1; l < dL.length; l++) {
      if (dL[l][1] === oportunidadId) {
        lotes.push({ nombre: dL[l][2], descripcion: dL[l][3], presupuesto: dL[l][4] });
      }
    }
  }

  // Detectar tipo de servicio por CPV
  var tipoServicio = detectarTipoServicioCPV_(opo.cpv || '').tipo;

  // Crear centros: uno por lote, o uno general si no hay lotes
  var centrosCreados = 0;
  if (lotes.length > 0) {
    for (var k = 0; k < lotes.length; k++) {
      var r = crearCentro_({
        nombre:           lotes[k].nombre || opo.titulo.substring(0, 80),
        organismo:        opo.organismo,
        tipo:             'dependencia_municipal',
        municipio:        analisis ? (analisis.datos_basicos ? analisis.datos_basicos.municipio || '' : '') : '',
        provincia:        'Huelva',
        tipo_servicio:    tipoServicio,
        oportunidad_id:   oportunidadId,
        presupuesto_anual: parseFloat(lotes[k].presupuesto) || (parseFloat(opo.presupuesto) / lotes.length),
        fecha_inicio:     opo.fecha_inicio || '',
        estado:           'activo',
        notas:            'Importado automáticamente al registrar licitación ganada'
      });
      if (r.ok) centrosCreados++;
    }
  } else {
    var r2 = crearCentro_({
      nombre:           opo.titulo.substring(0, 100),
      organismo:        opo.organismo,
      tipo:             'dependencia_municipal',
      tipo_servicio:    tipoServicio,
      oportunidad_id:   oportunidadId,
      presupuesto_anual: parseFloat(opo.presupuesto) || 0,
      estado:           'activo',
      notas:            'Importado automáticamente al registrar licitación ganada'
    });
    if (r2.ok) centrosCreados++;
  }

  return { ok: true, centros_creados: centrosCreados, oportunidad_id: oportunidadId };
}

// ── Dashboard Territorio ─────────────────────────────────────────────────────

function dashboardTerritorioAPI_() {
  var ss      = SpreadsheetApp.getActiveSpreadsheet();
  var data    = obtenerCentrosAPI_(null);
  var centros = data.centros || [];
  var hoy     = Utilities.formatDate(new Date(),'Europe/Madrid','yyyy-MM-dd');
  var mes     = Utilities.formatDate(new Date(),'Europe/Madrid','yyyy-MM');

  var porTipo = {};
  centros.forEach(function(c) {
    porTipo[c.tipo_servicio || 'otro'] = (porTipo[c.tipo_servicio || 'otro'] || 0) + 1;
  });

  // Partes del día (en curso y completados hoy)
  var partesHoy = 0, partesEnCurso = 0, horasHoy = 0;
  try {
    var hPartes = ss.getSheetByName('PARTES_V2');
    if (hPartes) {
      var dP = hPartes.getDataRange().getValues();
      for (var i = 1; i < dP.length; i++) {
        var fP = dP[i][6] instanceof Date ? Utilities.formatDate(dP[i][6],'Europe/Madrid','yyyy-MM-dd') : String(dP[i][6]||'');
        if (fP !== hoy) continue;
        partesHoy++;
        if (dP[i][15] === 'en_curso') partesEnCurso++;
        horasHoy += parseFloat(dP[i][9])||0;
      }
    }
  } catch(e) {}

  // Incidencias abiertas
  var incidenciasAbiertas = 0;
  try {
    var hInc = ss.getSheetByName('INCIDENCIAS');
    if (hInc) {
      var dI = hInc.getDataRange().getValues();
      for (var ii = 1; ii < dI.length; ii++) {
        if (dI[ii][9] === 'abierta') incidenciasAbiertas++;
      }
    }
  } catch(e) {}

  // Órdenes pendientes y en proceso
  var ordenesPendientes = 0, ordenesEnProceso = 0;
  try {
    var hOT = ss.getSheetByName('ORDENES_TRABAJO');
    if (hOT) {
      var dOT = hOT.getDataRange().getValues();
      for (var oi = 1; oi < dOT.length; oi++) {
        if (dOT[oi][4] === 'pendiente') ordenesPendientes++;
        if (dOT[oi][4] === 'en_proceso') ordenesEnProceso++;
      }
    }
  } catch(e) {}

  // Acciones correctivas abiertas
  var accionesAbiertas = 0;
  try {
    var hAC = ss.getSheetByName('ACCIONES_CORRECTIVAS');
    if (hAC) {
      var dAC = hAC.getDataRange().getValues();
      for (var ac = 1; ac < dAC.length; ac++) {
        if (dAC[ac][7] === 'abierta') accionesAbiertas++;
      }
    }
  } catch(e) {}

  // Calidad media del mes
  var calidad_media = 0;
  try {
    var hInsp = ss.getSheetByName('INSPECCIONES_CALIDAD');
    if (hInsp) {
      var dInsp = hInsp.getDataRange().getValues();
      var sumCal = 0, numCal = 0;
      for (var ci = 1; ci < dInsp.length; ci++) {
        var fCI = dInsp[ci][5] instanceof Date ? Utilities.formatDate(dInsp[ci][5],'Europe/Madrid','yyyy-MM') : String(dInsp[ci][5]||'').substring(0,7);
        if (fCI === mes) { sumCal += parseFloat(dInsp[ci][12])||0; numCal++; }
      }
      if (numCal > 0) calidad_media = Math.round(sumCal/numCal*10)/10;
    }
  } catch(e) {}

  return {
    // Centros
    total_centros:     data.total,
    activos:           data.activos,
    total_personal:    data.total_personal,
    total_presupuesto: data.total_presupuesto,
    por_tipo_servicio: porTipo,
    // Operativo hoy
    partes_hoy:        partesHoy,
    partes_en_curso:   partesEnCurso,
    horas_hoy:         Math.round(horasHoy*10)/10,
    // Alertas
    incidencias_abiertas: incidenciasAbiertas,
    ordenes_pendientes:   ordenesPendientes,
    ordenes_en_proceso:   ordenesEnProceso,
    acciones_correctivas: accionesAbiertas,
    // Calidad
    calidad_media_mes: calidad_media,
    // Meta
    ultima_actualizacion: Utilities.formatDate(new Date(),'Europe/Madrid','HH:mm:ss')
  };
}

// ── Parser ───────────────────────────────────────────────────────────────────

function parsearCentro_(row) {
  return {
    id:               row[0],
    nombre:           row[1],
    organismo:        row[2],
    tipo:             row[3],
    direccion:        row[4],
    municipio:        row[5],
    provincia:        row[6],
    latitud:          parseFloat(row[7]) || 0,
    longitud:         parseFloat(row[8]) || 0,
    superficie_m2:    parseFloat(row[9]) || 0,
    tipo_servicio:    row[10],
    frecuencia:       row[11],
    horario:          row[12],
    personal_asignado: parseInt(row[13]) || 0,
    responsable:      row[14],
    contrato_id:      row[15],
    oportunidad_id:   row[16],
    presupuesto_anual: parseFloat(row[17]) || 0,
    fecha_inicio:     row[18],
    fecha_fin:        row[19],
    estado:           row[20],
    notas:            row[21]
  };
}