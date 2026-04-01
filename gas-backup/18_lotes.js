// ============================================================================
// 18_lotes.gs - GESTIÓN DE LOTES POR OPORTUNIDAD
// Versión: 1.0 | Fecha: Marzo 2026
// Permite gestionar licitaciones divididas en lotes de forma independiente
// Cada lote tiene su propio análisis, cálculo, GO/NO-GO y oferta
// ============================================================================

var HOJA_LOTES = 'LOTES';

// ════════════════════════════════════════
// INICIALIZACIÓN
// ════════════════════════════════════════

function crearHojaLotes_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(HOJA_LOTES)) return;
  var hoja = ss.insertSheet(HOJA_LOTES);
  var cab = [
    'ID Lote', 'ID Oportunidad', 'Num Lote', 'Descripcion', 'Presupuesto Sin IVA',
    'Presupuesto Con IVA', 'Horas Totales', 'Centros/Zonas', 'Subrogacion Aplica',
    'Num Trabajadores', 'Decision', 'Precio Oferta', 'Margen %', 'Baja %',
    'Notas Decision', 'Estado', 'Fecha Creacion', 'Fecha Actualizacion', 'JSON Detalle'
  ];
  hoja.getRange(1, 1, 1, cab.length).setValues([cab]);
  hoja.getRange(1, 1, 1, cab.length).setBackground('#1a3c34').setFontColor('#ffffff').setFontWeight('bold');
  hoja.setColumnWidth(1, 200); hoja.setColumnWidth(4, 300); hoja.setColumnWidth(8, 300);
  hoja.setFrozenRows(1);
}

// ════════════════════════════════════════
// OBTENER LOTES DE UNA OPORTUNIDAD
// ════════════════════════════════════════

function obtenerLotesAPI_(opoId) {
  if (!opoId) return { lotes: [] };
  crearHojaLotes_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_LOTES);
  if (!hoja || hoja.getLastRow() <= 1) return { lotes: [] };

  var datos = hoja.getDataRange().getValues();
  var lotes = [];

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] !== opoId) continue;
    var detalle = {};
    try { detalle = JSON.parse(datos[i][18] || '{}'); } catch(e) {}
    lotes.push({
      id:               datos[i][0],
      id_oportunidad:   datos[i][1],
      num_lote:         datos[i][2],
      descripcion:      datos[i][3],
      presupuesto_sin_iva: datos[i][4] || 0,
      presupuesto_con_iva: datos[i][5] || 0,
      horas_totales:    datos[i][6] || 0,
      centros:          datos[i][7] || '',
      subrogacion:      datos[i][8] || 'No',
      num_trabajadores: datos[i][9] || 0,
      decision:         datos[i][10] || 'pendiente',
      precio_oferta:    datos[i][11] || 0,
      margen_pct:       datos[i][12] || 0,
      baja_pct:         datos[i][13] || 0,
      notas_decision:   datos[i][14] || '',
      estado:           datos[i][15] || 'activo',
      fecha_creacion:   datos[i][16],
      fecha_actualizacion: datos[i][17],
      detalle:          detalle
    });
  }

  lotes.sort(function(a, b) { return parseInt(a.num_lote) - parseInt(b.num_lote); });
  return { lotes: lotes, total: lotes.length };
}

// ════════════════════════════════════════
// CREAR LOTES DESDE ANÁLISIS IA
// ════════════════════════════════════════

function crearLotesDesdeAnalisis_(opoId) {
  if (!opoId) return { ok: false, error: 'ID requerido' };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hojaAnalisis = ss.getSheetByName('ANALISIS_IA');
  if (!hojaAnalisis) return { ok: false, error: 'No hay análisis disponible' };

  var datos = hojaAnalisis.getDataRange().getValues();
  var jsonAnalisis = null;
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === opoId) {
      try { jsonAnalisis = JSON.parse(datos[i][14] || '{}'); } catch(e) {}
      break;
    }
  }

  if (!jsonAnalisis) return { ok: false, error: 'Análisis no encontrado. Analiza primero los pliegos.' };

  var datosBasicos = jsonAnalisis.datos_basicos || {};
  var serviciosReq = jsonAnalisis.servicios_requeridos || {};
  var subrogacion = (jsonAnalisis.personal_subrogacion && jsonAnalisis.personal_subrogacion.aplica === 'Sí') ? 'Sí' :
                    (jsonAnalisis.personal_requerido && jsonAnalisis.personal_requerido.subrogacion === 'Sí') ? 'Sí' : 'No';
  var numTrabTotal = (jsonAnalisis.personal_subrogacion && jsonAnalisis.personal_subrogacion.num_trabajadores) ||
                     (jsonAnalisis.personal_requerido && jsonAnalisis.personal_requerido.num_trabajadores_subrogar) || 0;
  var presupuestoTotal = datosBasicos.presupuesto_base_sin_iva || 0;
  var horasTotales = serviciosReq.total_horas_contrato || 0;

  // ── Buscar array de lotes en múltiples lugares ──────────────────────────────
  var lotesArray = null;

  // 1. datos_basicos.lotes como array
  if (Array.isArray(datosBasicos.lotes)) {
    lotesArray = datosBasicos.lotes;
  }
  // 2. jsonAnalisis.lotes como array (nivel raíz)
  else if (Array.isArray(jsonAnalisis.lotes)) {
    lotesArray = jsonAnalisis.lotes;
  }
  // 3. datos_basicos.lotes_descripcion puede contener JSON array
  else {
    var descRaw = datosBasicos.lotes_descripcion || datosBasicos.lotes || '';
    if (typeof descRaw === 'string' && descRaw.trim().charAt(0) === '[') {
      try {
        // Normalizar comillas Python → JSON
        var normalized = descRaw
          .replace(/'/g, '"')
          .replace(/\bNone\b/g, 'null')
          .replace(/\bTrue\b/g, 'true')
          .replace(/\bFalse\b/g, 'false');
        var parsed = JSON.parse(normalized);
        if (Array.isArray(parsed) && parsed.length > 0) lotesArray = parsed;
      } catch(e) { Logger.log('Parse lotes JSON error: ' + e.message); }
    }
  }

  var numLotes = parseInt(datosBasicos.num_lotes) || (lotesArray ? lotesArray.length : 0);

  // Borrar lotes anteriores
  eliminarLotesOportunidad_(opoId);

  // ── CASO 1: Tenemos array de lotes ──────────────────────────────────────────
  if (lotesArray && lotesArray.length > 0) {
    var lotesCreados = [];
    for (var j = 0; j < lotesArray.length; j++) {
      var l = lotesArray[j];
      var presSinIVA = parseFloat(l.presupuesto_sin_iva || l.presupuesto || 0);
      var presConIVA = parseFloat(l.presupuesto_con_iva || 0);
      if (presSinIVA === 0 && presupuestoTotal > 0) presSinIVA = presupuestoTotal / lotesArray.length;
      if (presConIVA === 0 && presSinIVA > 0) presConIVA = presSinIVA * 1.10;
      var horasLote = parseFloat(l.horas_totales || l.horas || 0);
      if (horasLote === 0 && horasTotales > 0) horasLote = horasTotales / lotesArray.length;

      var idLote = crearLote_({
        id_oportunidad:      opoId,
        num_lote:            l.num_lote || (j + 1),
        descripcion:         l.descripcion || l.nombre || ('Lote ' + (j + 1)),
        presupuesto_sin_iva: presSinIVA,
        presupuesto_con_iva: presConIVA,
        horas_totales:       horasLote,
        centros:             l.centros || l.zonas || l.centros_zonas || '',
        subrogacion:         l.subrogacion_aplica || subrogacion,
        num_trabajadores:    parseInt(l.num_trabajadores || 0) || Math.round(numTrabTotal / lotesArray.length) || 0,
        detalle:             l
      });
      lotesCreados.push(idLote);
    }
    return { ok: true, lotes_creados: lotesCreados.length, ids: lotesCreados };
  }

  // ── CASO 2: num_lotes > 1 pero sin array — parsear texto del campo lotes ────
  if (numLotes > 1) {
    var lotesCreados2 = [];
    var lotesTexto = typeof datosBasicos.lotes === 'string' ? datosBasicos.lotes : '';
    var nombresLotes = [];
    var presupuestosLotes = [];
    // Buscar "Lote N: descripcion (X.XXX € o X €)"
    var rx = /[Ll]ote\s*(\d+)[:\-–—]\s*([^.(]+?)(?:\s*[\(\[]([\d.,]+)\s*€?[\)\]])?(?:[,.]|\s*(?:[Ll]ote|$))/g;
    var m;
    while ((m = rx.exec(lotesTexto)) !== null) {
      var idx = parseInt(m[1]) - 1;
      nombresLotes[idx] = m[2].trim().replace(/\s+/g, ' ');
      if (m[3]) presupuestosLotes[idx] = parseFloat(m[3].replace(/\./g,'').replace(',','.'));
    }
    for (var k = 0; k < numLotes; k++) {
      var desc2 = nombresLotes[k] || ('Lote ' + (k + 1) + ' — ' + (datosBasicos.objeto_contrato || '').substring(0, 60));
      var presLote = presupuestosLotes[k] || (presupuestoTotal / numLotes);
      var idLoteGen = crearLote_({
        id_oportunidad:      opoId,
        num_lote:            k + 1,
        descripcion:         desc2,
        presupuesto_sin_iva: presLote,
        presupuesto_con_iva: presLote * 1.10,
        horas_totales:       horasTotales > 0 ? horasTotales / numLotes : 0,
        centros:             '',
        subrogacion:         subrogacion,
        num_trabajadores:    Math.round(numTrabTotal / numLotes) || 0,
        detalle:             {}
      });
      lotesCreados2.push(idLoteGen);
    }
    return { ok: true, lotes_creados: lotesCreados2.length, ids: lotesCreados2 };
  }

  // ── CASO 3: Sin lotes — contrato único ──────────────────────────────────────
  return crearLoteUnico_(opoId, jsonAnalisis);
}

function crearLoteUnico_(opoId, jsonAnalisis) {
  eliminarLotesOportunidad_(opoId);
  var datosBasicos = jsonAnalisis.datos_basicos || {};
  var serviciosReq = jsonAnalisis.servicios_requeridos || {};
  var subrogacion = (jsonAnalisis.personal_subrogacion && jsonAnalisis.personal_subrogacion.aplica === 'Sí') ? 'Sí' : 'No';
  var numTrab = (jsonAnalisis.personal_subrogacion && jsonAnalisis.personal_subrogacion.num_trabajadores) || 0;

  var idLote = crearLote_({
    id_oportunidad:      opoId,
    num_lote:            1,
    descripcion:         datosBasicos.objeto_contrato || 'Contrato completo',
    presupuesto_sin_iva: datosBasicos.presupuesto_base_sin_iva || 0,
    presupuesto_con_iva: datosBasicos.presupuesto_base_con_iva || 0,
    horas_totales:       serviciosReq.total_horas_contrato || 0,
    centros:             (serviciosReq.centros_o_zonas || []).map(function(c) { return c.nombre; }).join(', '),
    subrogacion:         subrogacion,
    num_trabajadores:    numTrab,
    detalle:             jsonAnalisis
  });

  return { ok: true, lotes_creados: 1, ids: [idLote], lote_unico: true };
}

// ════════════════════════════════════════
// CREAR / ACTUALIZAR LOTE
// ════════════════════════════════════════

function crearLote_(data) {
  crearHojaLotes_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_LOTES);
  var idLote = 'LOTE-' + data.id_oportunidad + '-' + data.num_lote;
  var ahora = new Date();

  hoja.appendRow([
    idLote,
    data.id_oportunidad,
    data.num_lote,
    data.descripcion || '',
    data.presupuesto_sin_iva || 0,
    data.presupuesto_con_iva || 0,
    data.horas_totales || 0,
    data.centros || '',
    data.subrogacion || 'No',
    data.num_trabajadores || 0,
    'pendiente',
    0, 0, 0,
    '',
    'activo',
    ahora, ahora,
    JSON.stringify(data.detalle || {}).substring(0, 50000)
  ]);

  return idLote;
}

function actualizarLoteAPI_(data) {
  if (!data.id) return { ok: false, error: 'ID de lote requerido' };
  crearHojaLotes_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_LOTES);
  if (!hoja || hoja.getLastRow() <= 1) return { ok: false, error: 'Sin lotes' };

  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] !== data.id) continue;
    if (data.descripcion !== undefined)      hoja.getRange(i+1, 4).setValue(data.descripcion);
    if (data.presupuesto_sin_iva !== undefined) hoja.getRange(i+1, 5).setValue(data.presupuesto_sin_iva);
    if (data.presupuesto_con_iva !== undefined) hoja.getRange(i+1, 6).setValue(data.presupuesto_con_iva);
    if (data.horas_totales !== undefined)    hoja.getRange(i+1, 7).setValue(data.horas_totales);
    if (data.centros !== undefined)          hoja.getRange(i+1, 8).setValue(data.centros);
    if (data.subrogacion !== undefined)      hoja.getRange(i+1, 9).setValue(data.subrogacion);
    if (data.num_trabajadores !== undefined) hoja.getRange(i+1, 10).setValue(data.num_trabajadores);
    if (data.decision !== undefined)         hoja.getRange(i+1, 11).setValue(data.decision);
    if (data.precio_oferta !== undefined)    hoja.getRange(i+1, 12).setValue(data.precio_oferta);
    if (data.margen_pct !== undefined)       hoja.getRange(i+1, 13).setValue(data.margen_pct);
    if (data.baja_pct !== undefined)         hoja.getRange(i+1, 14).setValue(data.baja_pct);
    if (data.notas_decision !== undefined)   hoja.getRange(i+1, 15).setValue(data.notas_decision);
    if (data.estado !== undefined)           hoja.getRange(i+1, 16).setValue(data.estado);
    hoja.getRange(i+1, 18).setValue(new Date());
    return { ok: true };
  }
  return { ok: false, error: 'Lote no encontrado' };
}

function eliminarLotesOportunidad_(opoId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_LOTES);
  if (!hoja || hoja.getLastRow() <= 1) return;
  var datos = hoja.getDataRange().getValues();
  for (var i = datos.length - 1; i >= 1; i--) {
    if (datos[i][1] === opoId) hoja.deleteRow(i + 1);
  }
}

// ════════════════════════════════════════
// GUARDAR CÁLCULO POR LOTE
// ════════════════════════════════════════

function guardarCalculoLoteAPI_(data) {
  if (!data.id_lote) return { ok: false, error: 'id_lote requerido' };

  // Guardar en CALCULOS con clave opoId + loteId
  var claveCalculo = (data.oportunidad_id || '') + '__' + data.id_lote;
  var dataCalculo = Object.assign({}, data, { oportunidad_id: claveCalculo });
  var resultado = guardarCalculoAPI_(dataCalculo);

  if (resultado.ok) {
    // Actualizar precio y margen en LOTES
    var resumen = {};
    try { resumen = JSON.parse(data.json_datos || '{}').resumen || {}; } catch(e) {}
    actualizarLoteAPI_({
      id: data.id_lote,
      precio_oferta: resumen.totalSinIVA || 0,
      margen_pct: resumen.margenReal || 0,
      baja_pct: resumen.baja || 0
    });
  }
  return resultado;
}

function cargarCalculoLoteAPI_(opoId, loteId) {
  var claveCalculo = opoId + '__' + loteId;
  return cargarCalculoAPI_(claveCalculo);
}

// ════════════════════════════════════════
// RESUMEN GLOBAL DE LOTES DE UNA OPORTUNIDAD
// ════════════════════════════════════════

function resumenLotesAPI_(opoId) {
  var data = obtenerLotesAPI_(opoId);
  var lotes = data.lotes || [];

  var totalPresupuesto = 0, totalHoras = 0, lotesGO = 0, lotesNoGO = 0, lotesPendientes = 0;
  var totalOferta = 0, lotesConCalculo = 0;

  lotes.forEach(function(l) {
    totalPresupuesto += l.presupuesto_sin_iva || 0;
    totalHoras += l.horas_totales || 0;
    if (l.decision === 'go') lotesGO++;
    else if (l.decision === 'no_go') lotesNoGO++;
    else lotesPendientes++;
    if (l.precio_oferta > 0) { totalOferta += l.precio_oferta; lotesConCalculo++; }
  });

  var recomendacion = 'pendiente';
  if (lotes.length > 0) {
    if (lotesGO === lotes.length) recomendacion = 'todos_go';
    else if (lotesNoGO === lotes.length) recomendacion = 'todos_no_go';
    else if (lotesGO > 0) recomendacion = 'parcial_go';
    else recomendacion = 'pendiente';
  }

  return {
    id_oportunidad: opoId,
    total_lotes: lotes.length,
    lotes_go: lotesGO,
    lotes_no_go: lotesNoGO,
    lotes_pendientes: lotesPendientes,
    lotes_con_calculo: lotesConCalculo,
    total_presupuesto_sin_iva: totalPresupuesto,
    total_horas: totalHoras,
    total_oferta: totalOferta,
    recomendacion: recomendacion,
    lotes: lotes
  };
}