// ============================================================================
// 08_seguimiento_contratos.gs - SEGUIMIENTO POST-ADJUDICACIÓN
// Versión: 1.0 | Fecha: Marzo 2026
// ============================================================================
// Registra resultados (ganada/perdida), seguimiento de rentabilidad,
// costes reales vs estimados, y alimenta el aprendizaje del sistema.
// ============================================================================

var HOJA_RESULTADOS = 'RESULTADOS_LICITACIONES';
var HOJA_SEGUIMIENTO_MENSUAL = 'SEGUIMIENTO_MENSUAL';

// ════════════════════════════════════════
// INICIALIZACIÓN
// ════════════════════════════════════════

function crearHojaResultadosSiNoExiste_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(HOJA_RESULTADOS)) return;
  var hoja = ss.insertSheet(HOJA_RESULTADOS);
  var cab = [
    'ID Oportunidad', 'Título', 'Organismo', 'Resultado',
    'Adjudicatario', 'Importe Adjudicación', 'Nuestra Oferta',
    'Diferencia €', 'Diferencia %', 'Motivo Pérdida',
    'Fecha Resultado', 'Fecha Inicio Contrato', 'Fecha Fin Contrato',
    'Duración Meses', 'Coste Estimado Total', 'Margen Estimado %',
    'Estado Contrato', 'Notas', 'JSON Datos'
  ];
  hoja.getRange(1, 1, 1, cab.length).setValues([cab]);
  hoja.getRange(1, 1, 1, cab.length).setBackground('#006064').setFontColor('#ffffff').setFontWeight('bold');
  hoja.setColumnWidth(2, 300); hoja.setColumnWidth(5, 250);
  hoja.getRange('F2:I1000').setNumberFormat('#,##0.00');
  hoja.setFrozenRows(1);
}

function crearHojaSeguimientoSiNoExiste_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(HOJA_SEGUIMIENTO_MENSUAL)) return;
  var hoja = ss.insertSheet(HOJA_SEGUIMIENTO_MENSUAL);
  var cab = [
    'ID Oportunidad', 'Mes', 'Año', 'Periodo',
    'Ingresos Base', 'Ingresos Adicionales', 'Total Ingresos',
    'Coste Personal Real', 'Ajuste Personal',
    'Coste Materiales Recurrentes', 'Materiales No Recurrentes', 'Servicios Externos',
    'Coste Maquinaria Real', 'Costes Indirectos Pct', 'Costes Indirectos',
    'Total Costes Directos', 'Total Costes', 'Beneficio Mes', 'Margen % Mes',
    'Costes Estimados Mes', 'Desviación €', 'Desviación %',
    'Incidencias', 'Penalizaciones', 'Notas'
  ];
  hoja.getRange(1, 1, 1, cab.length).setValues([cab]);
  hoja.getRange(1, 1, 1, cab.length).setBackground('#004d40').setFontColor('#ffffff').setFontWeight('bold');
  hoja.getRange('E2:O1000').setNumberFormat('#,##0.00');
  hoja.setFrozenRows(1);
}

// ════════════════════════════════════════
// REGISTRAR RESULTADO
// ════════════════════════════════════════

function registrarResultado_(data) {
  crearHojaResultadosSiNoExiste_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var opoId = data.oportunidad_id;
  if (!opoId) return { ok: false, error: 'ID oportunidad requerido' };

  // Obtener datos de la oportunidad
  var hojaOpo = ss.getSheetByName('OPORTUNIDADES');
  var titulo = '', organismo = '', presupuesto = 0;
  if (hojaOpo) {
    var dOpo = hojaOpo.getDataRange().getValues();
    for (var i = 1; i < dOpo.length; i++) {
      if (dOpo[i][0] === opoId) {
        titulo = dOpo[i][3]; organismo = dOpo[i][4]; presupuesto = dOpo[i][6];
        break;
      }
    }
  }

  // Obtener nuestra oferta del cálculo
  var nuestraOferta = 0;
  var costeEstimado = 0;
  var margenEstimado = 0;
  var hojaCalc = ss.getSheetByName('CALCULOS');
  if (hojaCalc) {
    var dCalc = hojaCalc.getDataRange().getValues();
    for (var j = 1; j < dCalc.length; j++) {
      if (dCalc[j][0] === opoId) {
        try {
          var calcData = JSON.parse(dCalc[j][8] || '{}');
          nuestraOferta = calcData.resumen ? calcData.resumen.totalSinIVA || 0 : 0;
          costeEstimado = calcData.resumen ? (calcData.resumen.costesDirectos || 0) + (calcData.resumen.costesIndirectos || 0) : 0;
          margenEstimado = calcData.resumen ? calcData.resumen.margenReal || 0 : 0;
        } catch (e) {}
        break;
      }
    }
  }

  var resultado = data.resultado || 'ganada'; // ganada, perdida, desierta
  var importeAdj = parseFloat(data.importe_adjudicacion) || nuestraOferta;
  var adjudicatario = data.adjudicatario || '';

  var diferencia = importeAdj - nuestraOferta;
  var diferenciaPct = nuestraOferta > 0 ? (diferencia / nuestraOferta * 100) : 0;

  // Actualizar estado en OPORTUNIDADES
  if (hojaOpo) {
    var dOpo2 = hojaOpo.getDataRange().getValues();
    for (var k = 1; k < dOpo2.length; k++) {
      if (dOpo2[k][0] === opoId) {
        var nuevoEstado = resultado === 'ganada' ? 'adjudicada' : resultado === 'perdida' ? 'perdida' : 'desierta';
        hojaOpo.getRange(k + 1, 12).setValue(nuevoEstado);
        break;
      }
    }
  }

  // Guardar resultado
  var hoja = ss.getSheetByName(HOJA_RESULTADOS);
  // Borrar anterior
  var dRes = hoja.getDataRange().getValues();
  for (var m = dRes.length - 1; m >= 1; m--) {
    if (dRes[m][0] === opoId) hoja.deleteRow(m + 1);
  }

  var duracionMeses = parseInt(data.duracion_meses) || 12;

  hoja.appendRow([
    opoId, titulo, organismo, resultado,
    adjudicatario, importeAdj, nuestraOferta,
    diferencia, diferenciaPct,
    data.motivo_perdida || '',
    new Date(),
    data.fecha_inicio || '',
    data.fecha_fin || '',
    duracionMeses,
    costeEstimado,
    margenEstimado,
    resultado === 'ganada' ? 'en_ejecucion' : 'cerrado',
    data.notas || '',
    JSON.stringify({
      presupuesto: presupuesto,
      nuestra_oferta: nuestraOferta,
      coste_estimado: costeEstimado,
      margen_estimado: margenEstimado
    })
  ]);

  // ── Triggers automáticos al ganar ──
  var triggersResult = null;
  if (resultado === 'ganada') {
    try { triggersResult = triggersAlGanar_(opoId, data); } catch(e) { Logger.log('Triggers error: ' + e.message); }
  }

  // ── Si es pérdida, guardar en conocimiento para aprendizaje ──
  if (resultado === 'perdida' && adjudicatario) {
    try {
      var hojaConoc = ss.getSheetByName('CONOCIMIENTO_BASE');
      if (hojaConoc) {
        hojaConoc.appendRow([
          'CONOC-' + Utilities.formatDate(new Date(),'Europe/Madrid','yyyyMMdd-HHmmss'),
          'contrato_perdido',
          titulo,
          organismo,
          'Contrato perdido. Adjudicado a: ' + adjudicatario +
            ' por ' + importeAdj.toFixed(2) + '€ (nosotros: ' + nuestraOferta.toFixed(2) + '€)' +
            (data.motivo_perdida ? '. Motivo: ' + data.motivo_perdida : ''),
          ['perdida', 'aprendizaje', organismo].join(','),
          new Date(),
          opoId
        ]);
      }
    } catch(e) {}
  }

  return {
    ok: true,
    oportunidad_id: opoId,
    resultado: resultado,
    importe_adjudicacion: importeAdj,
    nuestra_oferta: nuestraOferta,
    diferencia: diferencia,
    estado: resultado === 'ganada' ? 'en_ejecucion' : 'cerrado',
    triggers: triggersResult
  };
}

// ════════════════════════════════════════════════════════════════
// TRIGGERS AUTOMÁTICOS AL GANAR UN CONTRATO
// Se ejecutan desde registrarResultado_ cuando resultado = 'ganada'
// ════════════════════════════════════════════════════════════════

function triggersAlGanar_(opoId, data) {
  var resultados = {
    subrogacion: null,
    asignacion: null,
    conocimiento: null,
    errores: []
  };

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── 1. Obtener datos completos de la oportunidad y análisis ──
  var opoData = null;
  var hojaOpo = ss.getSheetByName('OPORTUNIDADES');
  if (hojaOpo) {
    var dOpo = hojaOpo.getDataRange().getValues();
    for (var i = 1; i < dOpo.length; i++) {
      if (dOpo[i][0] === opoId) {
        opoData = {
          titulo: dOpo[i][3], organismo: dOpo[i][4],
          presupuesto: dOpo[i][6], cpv: dOpo[i][5]
        };
        break;
      }
    }
  }
  if (!opoData) return resultados;

  // ── 2. Obtener análisis IA (para subrogación y centros) ──
  var analisisData = null;
  var hojaAnalisis = ss.getSheetByName('ANALISIS_IA');
  if (hojaAnalisis) {
    var dAn = hojaAnalisis.getDataRange().getValues();
    for (var j = 1; j < dAn.length; j++) {
      if (dAn[j][0] === opoId) {
        try { analisisData = JSON.parse(dAn[j][14] || '{}'); } catch(e) {}
        break;
      }
    }
  }

  // ── 3. TRIGGER: Crear subrogación si hay personal a subrogar ──
  try {
    var haySubrogacion = false;
    var numTrabajadores = 0;
    var convenio = '';
    var empresa_saliente = '';

    if (analisisData) {
      var pr = analisisData.personal_requerido || analisisData.personal_subrogacion || {};
      haySubrogacion = pr.subrogacion === 'Sí' || pr.aplica === 'Sí';
      numTrabajadores = parseInt(pr.num_trabajadores_subrogar || pr.num_trabajadores || 0) || 0;
      convenio = pr.convenio_aplicable || '';
      empresa_saliente = pr.empresa_saliente || '';
    }

    if (haySubrogacion && numTrabajadores > 0) {
      var subData = {
        id_oportunidad: opoId,
        titulo_licitacion: opoData.titulo,
        organismo: opoData.organismo,
        empresa_saliente: empresa_saliente,
        convenio_aplicable: convenio,
        num_personal: numTrabajadores,
        coste_anual_estimado: 0,
        fecha_subrogacion: data.fecha_inicio || '',
        estado: 'pendiente',
        notas: 'Generado automáticamente al adjudicar contrato'
      };
      var rSub = crearSubrogacion_(subData);
      resultados.subrogacion = rSub.ok ? { ok: true, id: rSub.id } : { ok: false, error: rSub.error };
    } else {
      resultados.subrogacion = { ok: true, skipped: true, motivo: 'Sin personal a subrogar' };
    }
  } catch(e) {
    resultados.errores.push('Subrogacion: ' + e.message);
    resultados.subrogacion = { ok: false, error: e.message };
  }

  // ── 4. TRIGGER: Guardar en base de conocimiento (licitación ganada) ──
  try {
    var hojaConoc = ss.getSheetByName('CONOCIMIENTO_BASE');
    if (!hojaConoc) {
      hojaConoc = ss.insertSheet('CONOCIMIENTO_BASE');
      hojaConoc.getRange(1,1,1,8).setValues([['ID','Tipo','Título','Organismo','Descripción','Tags','Fecha','ID Oportunidad']]);
    }
    var tags = ['ganada', 'contrato', opoData.cpv || '', opoData.organismo || ''].join(',');
    var descripcion = 'Contrato adjudicado: ' + opoData.titulo +
      ' | Importe: ' + (parseFloat(data.importe_adjudicacion) || 0).toFixed(2) + '€' +
      ' | Inicio: ' + (data.fecha_inicio || '') +
      ' | Duración: ' + (data.duracion_meses || 12) + ' meses';

    hojaConoc.appendRow([
      'CONOC-' + Utilities.formatDate(new Date(),'Europe/Madrid','yyyyMMdd-HHmmss'),
      'contrato_ganado',
      opoData.titulo,
      opoData.organismo,
      descripcion,
      tags,
      new Date(),
      opoId
    ]);
    resultados.conocimiento = { ok: true };
  } catch(e) {
    resultados.errores.push('Conocimiento: ' + e.message);
    resultados.conocimiento = { ok: false, error: e.message };
  }

  // ── 5. TRIGGER: Notificación email a dirección ──
  try {
    var email = Session.getActiveUser().getEmail();
    if (email) {
      var asunto = '🏆 CONTRATO ADJUDICADO: ' + opoData.titulo.substring(0,60);
      var cuerpo = 'Se ha registrado la adjudicación del siguiente contrato:\n\n' +
        '📋 Contrato: ' + opoData.titulo + '\n' +
        '🏢 Organismo: ' + opoData.organismo + '\n' +
        '💶 Importe adjudicado: ' + (parseFloat(data.importe_adjudicacion) || 0).toLocaleString('es-ES') + ' €\n' +
        '📅 Fecha inicio: ' + (data.fecha_inicio || 'Por determinar') + '\n' +
        '⏱️ Duración: ' + (data.duracion_meses || 12) + ' meses\n\n' +
        (resultados.subrogacion?.ok && !resultados.subrogacion?.skipped
          ? '⚠️ ACCIÓN REQUERIDA: Se ha creado una subrogación pendiente de gestionar en RRHH.\n\n'
          : '') +
        'Accede al sistema para gestionar el inicio del contrato.';
      MailApp.sendEmail(email, asunto, cuerpo);
    }
  } catch(e) {
    resultados.errores.push('Email: ' + e.message);
  }

  // ── 6. TRIGGER: Crear centros en Territorio ──────────────────────────────
  try {
    var rTerritorio = importarCentrosDesdeOportunidad_(opoId);
    resultados.territorio = rTerritorio;
    Logger.log('   🗺️ Territorio: ' + (rTerritorio.centros_creados || 0) + ' centros creados');
  } catch(e) {
    resultados.errores.push('Territorio: ' + e.message);
    resultados.territorio = { ok: false, error: e.message };
  }

  Logger.log('✅ Triggers al ganar ejecutados: ' + JSON.stringify(resultados));
  return resultados;
}
// ════════════════════════════════════════

function registrarSeguimientoMensual_(data) {
  crearHojaSeguimientoSiNoExiste_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var opoId = data.oportunidad_id;
  if (!opoId) return { ok: false, error: 'ID requerido' };

  var mes = parseInt(data.mes) || new Date().getMonth() + 1;
  var anio = parseInt(data.anio) || new Date().getFullYear();
  var periodo = anio + '-' + (mes < 10 ? '0' : '') + mes;

  // ── INGRESOS ──────────────────────────────────────────────
  // Ingresos base = importe_adjudicacion / duracion_meses
  var ingresosBase = 0;
  var hojaRes = ss.getSheetByName(HOJA_RESULTADOS);
  if (hojaRes) {
    var dRes = hojaRes.getDataRange().getValues();
    for (var r = 1; r < dRes.length; r++) {
      if (dRes[r][0] === opoId) {
        var importeAdj = parseFloat(dRes[r][5]) || 0;
        var durMeses   = parseInt(dRes[r][13]) || 12;
        ingresosBase   = Math.round(importeAdj / durMeses * 100) / 100;
        break;
      }
    }
  }
  // Permitir sobreescribir ingresos_base si viene explícito
  if (data.ingresos_base !== undefined && data.ingresos_base !== '') {
    ingresosBase = parseFloat(data.ingresos_base) || ingresosBase;
  }
  var ingresosAdicionales = parseFloat(data.ingresos_adicionales) || 0;
  var totalIngresos = ingresosBase + ingresosAdicionales;

  // ── COSTES DIRECTOS ───────────────────────────────────────
  // Personal: automático desde COSTES_IMPUTADOS o manual
  var costePersonalAuto = 0;
  var hojaCostes = ss.getSheetByName('COSTES_IMPUTADOS');
  if (hojaCostes) {
    var dCost = hojaCostes.getDataRange().getValues();
    for (var ci = 1; ci < dCost.length; ci++) {
      if (dCost[ci][3] === opoId && dCost[ci][5] === periodo) {
        costePersonalAuto += parseFloat(dCost[ci][6]) || 0;
      }
    }
  }
  var costePersonal     = parseFloat(data.coste_personal) || costePersonalAuto;
  var ajustePersonal    = parseFloat(data.ajuste_personal) || 0;
  var costePersonalFinal = costePersonal + ajustePersonal;

  // Materiales recurrentes: automático desde partes o manual
  var costeMatsAuto = 0;
  if (hojaCostes) {
    var dCost2 = hojaCostes.getDataRange().getValues();
    for (var ci2 = 1; ci2 < dCost2.length; ci2++) {
      if (dCost2[ci2][3] === opoId && dCost2[ci2][5] === periodo) {
        costeMatsAuto += parseFloat(dCost2[ci2][7]) || 0;
      }
    }
  }
  var costeMateriales    = parseFloat(data.coste_materiales) || costeMatsAuto;
  var matsNoRecurrentes  = parseFloat(data.materiales_no_recurrentes) || 0;
  var serviciosExternos  = parseFloat(data.servicios_externos) || 0;

  // Maquinaria: automático o manual
  var costeMaqAuto = 0;
  if (hojaCostes) {
    var dCost3 = hojaCostes.getDataRange().getValues();
    for (var ci3 = 1; ci3 < dCost3.length; ci3++) {
      if (dCost3[ci3][3] === opoId && dCost3[ci3][5] === periodo) {
        costeMaqAuto += parseFloat(dCost3[ci3][8]) || 0;
      }
    }
  }
  var costeMaquinaria = parseFloat(data.coste_maquinaria) || costeMaqAuto;

  // ── COSTES INDIRECTOS ─────────────────────────────────────
  var pctIndirectos = parseFloat(data.pct_indirectos) || 15; // 15% por defecto
  var totalDirectos = costePersonalFinal + costeMateriales + matsNoRecurrentes + serviciosExternos + costeMaquinaria;
  var costesIndirectos = Math.round(totalDirectos * pctIndirectos / 100 * 100) / 100;
  var totalCostes = totalDirectos + costesIndirectos;

  var beneficio = totalIngresos - totalCostes;
  var margen = totalIngresos > 0 ? (beneficio / totalIngresos * 100) : 0;

  // ── COSTE ESTIMADO (del cálculo de licitación) ────────────
  var costeEstimadoMes = 0;
  var hojaCalc = ss.getSheetByName('CALCULOS');
  if (hojaCalc) {
    var dCalc = hojaCalc.getDataRange().getValues();
    for (var i = 1; i < dCalc.length; i++) {
      if (dCalc[i][0] === opoId) {
        try {
          var calcData = JSON.parse(dCalc[i][8] || '{}');
          var duracion = calcData.parametros ? calcData.parametros.duracionMeses || 12 : 12;
          var totalEstimado = calcData.resumen ? (calcData.resumen.costesDirectos || 0) + (calcData.resumen.costesIndirectos || 0) : 0;
          costeEstimadoMes = totalEstimado / duracion;
        } catch (e) {}
        break;
      }
    }
  }

  var desviacion = totalCostes - costeEstimadoMes;
  var desviacionPct = costeEstimadoMes > 0 ? (desviacion / costeEstimadoMes * 100) : 0;

  // ── GUARDAR ───────────────────────────────────────────────
  var hoja = ss.getSheetByName(HOJA_SEGUIMIENTO_MENSUAL);
  var dSeg = hoja.getDataRange().getValues();
  for (var j = dSeg.length - 1; j >= 1; j--) {
    if (dSeg[j][0] === opoId && dSeg[j][3] === periodo) hoja.deleteRow(j + 1);
  }

  hoja.appendRow([
    opoId, mes, anio, periodo,
    ingresosBase, ingresosAdicionales, totalIngresos,
    costePersonal, ajustePersonal,
    costeMateriales, matsNoRecurrentes, serviciosExternos,
    costeMaquinaria, pctIndirectos, costesIndirectos,
    totalDirectos, totalCostes, beneficio, margen,
    costeEstimadoMes, desviacion, desviacionPct,
    parseInt(data.incidencias) || 0,
    parseFloat(data.penalizaciones) || 0,
    data.notas || ''
  ]);

  return {
    ok: true, periodo: periodo,
    ingresos_base: ingresosBase,
    ingresos_adicionales: ingresosAdicionales,
    total_ingresos: totalIngresos,
    coste_personal: costePersonalFinal,
    coste_materiales: costeMateriales,
    materiales_no_recurrentes: matsNoRecurrentes,
    servicios_externos: serviciosExternos,
    coste_maquinaria: costeMaquinaria,
    costes_indirectos: costesIndirectos,
    total_costes: totalCostes,
    beneficio: beneficio,
    margen: margen
  };
}

// ════════════════════════════════════════
// APIs
// ════════════════════════════════════════

function obtenerResultadoAPI_(opoId) {
  crearHojaResultadosSiNoExiste_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_RESULTADOS);
  if (!hoja || hoja.getLastRow() <= 1) return { existe: false };

  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === opoId) {
      return {
        existe: true,
        oportunidad_id: datos[i][0], titulo: datos[i][1], organismo: datos[i][2],
        resultado: datos[i][3], adjudicatario: datos[i][4],
        importe_adjudicacion: datos[i][5], nuestra_oferta: datos[i][6],
        diferencia: datos[i][7], diferencia_pct: datos[i][8],
        motivo_perdida: datos[i][9], fecha_resultado: datos[i][10],
        fecha_inicio: datos[i][11], fecha_fin: datos[i][12],
        duracion_meses: datos[i][13], coste_estimado: datos[i][14],
        margen_estimado: datos[i][15], estado_contrato: datos[i][16],
        notas: datos[i][17]
      };
    }
  }
  return { existe: false };
}

function obtenerSeguimientoAPI_(opoId) {
  crearHojaSeguimientoSiNoExiste_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_SEGUIMIENTO_MENSUAL);
  if (!hoja || hoja.getLastRow() <= 1) return { meses: [], total: 0 };

  var datos = hoja.getDataRange().getValues();
  var meses = [];
  var totalIngresos = 0, totalCostes = 0, totalBeneficio = 0;

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === opoId) {
      var m = {
        periodo: datos[i][3], mes: datos[i][1], anio: datos[i][2],
        ingresos_base: parseFloat(datos[i][4])||0,
        ingresos_adicionales: parseFloat(datos[i][5])||0,
        total_ingresos: parseFloat(datos[i][6])||0,
        coste_personal: parseFloat(datos[i][7])||0,
        ajuste_personal: parseFloat(datos[i][8])||0,
        coste_materiales: parseFloat(datos[i][9])||0,
        materiales_no_recurrentes: parseFloat(datos[i][10])||0,
        servicios_externos: parseFloat(datos[i][11])||0,
        coste_maquinaria: parseFloat(datos[i][12])||0,
        pct_indirectos: parseFloat(datos[i][13])||15,
        costes_indirectos: parseFloat(datos[i][14])||0,
        total_directos: parseFloat(datos[i][15])||0,
        total_costes: parseFloat(datos[i][16])||0,
        beneficio: parseFloat(datos[i][17])||0,
        margen: parseFloat(datos[i][18])||0,
        coste_estimado: parseFloat(datos[i][19])||0,
        desviacion: parseFloat(datos[i][20])||0,
        desviacion_pct: parseFloat(datos[i][21])||0,
        incidencias: datos[i][22],
        penalizaciones: parseFloat(datos[i][23])||0,
        notas: datos[i][24]||''
      };
      meses.push(m);
      totalIngresos  += m.total_ingresos || 0;
      totalCostes    += m.total_costes || 0;
      totalBeneficio += m.beneficio || 0;
    }
  }

  meses.sort(function(a, b) { return a.periodo > b.periodo ? 1 : -1; });

  return {
    meses: meses,
    total: meses.length,
    resumen: {
      total_ingresos: totalIngresos,
      total_costes: totalCostes,
      total_beneficio: totalBeneficio,
      margen_medio: totalIngresos > 0 ? (totalBeneficio / totalIngresos * 100) : 0
    }
  };
}

function obtenerResumenContratosAPI_() {
  crearHojaResultadosSiNoExiste_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_RESULTADOS);
  if (!hoja || hoja.getLastRow() <= 1) return { contratos: [], stats: { ganadas: 0, perdidas: 0, desiertas: 0, tasa_exito: 0 } };

  var datos = hoja.getDataRange().getValues();
  var contratos = [];
  var ganadas = 0, perdidas = 0, desiertas = 0;

  for (var i = 1; i < datos.length; i++) {
    contratos.push({
      oportunidad_id: datos[i][0], titulo: datos[i][1], organismo: datos[i][2],
      resultado: datos[i][3], adjudicatario: datos[i][4],
      importe: datos[i][5], nuestra_oferta: datos[i][6],
      estado: datos[i][16], fecha: datos[i][10]
    });
    if (datos[i][3] === 'ganada') ganadas++;
    else if (datos[i][3] === 'perdida') perdidas++;
    else desiertas++;
  }

  var total = ganadas + perdidas;
  return {
    contratos: contratos,
    stats: {
      ganadas: ganadas, perdidas: perdidas, desiertas: desiertas,
      total_presentadas: total,
      tasa_exito: total > 0 ? Math.round(ganadas / total * 100) : 0
    }
  };
}
// ════════════════════════════════════════════════════════════════
// CALCULAR P&L DEL MES ACTUAL DESDE COSTES_IMPUTADOS (automático)
// Llama a esto para ver el P&L en tiempo real sin registrar mes
// ════════════════════════════════════════════════════════════════

function calcularPLMesActualAPI_(opoId) {
  if (!opoId) return { ok: false, error: 'opoId requerido' };
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var mes = Utilities.formatDate(new Date(),'Europe/Madrid','yyyy-MM');

  // Ingresos base desde adjudicación
  var ingresosBase = 0;
  var hojaRes = ss.getSheetByName(HOJA_RESULTADOS);
  if (hojaRes) {
    var dRes = hojaRes.getDataRange().getValues();
    for (var r = 1; r < dRes.length; r++) {
      if (dRes[r][0] === opoId) {
        var importeAdj = parseFloat(dRes[r][5])||0;
        var durMeses   = parseInt(dRes[r][13])||12;
        ingresosBase   = Math.round(importeAdj/durMeses*100)/100;
        break;
      }
    }
  }

  // Costes reales del mes desde COSTES_IMPUTADOS
  var costePers = 0, costeMats = 0, costeMaqui = 0;
  var hojaCostes = ss.getSheetByName('COSTES_IMPUTADOS');
  if (hojaCostes) {
    var dC = hojaCostes.getDataRange().getValues();
    for (var ci = 1; ci < dC.length; ci++) {
      if (dC[ci][3] === opoId && dC[ci][5] === mes) {
        costePers  += parseFloat(dC[ci][6])||0;
        costeMats  += parseFloat(dC[ci][7])||0;
        costeMaqui += parseFloat(dC[ci][8])||0;
      }
    }
  }

  var totalDirectos   = costePers + costeMats + costeMaqui;
  var pctIndirectos   = 15;
  var costesIndirectos = Math.round(totalDirectos * pctIndirectos/100 * 100)/100;
  var totalCostes     = totalDirectos + costesIndirectos;
  var beneficio       = ingresosBase - totalCostes;
  var margen          = ingresosBase > 0 ? Math.round(beneficio/ingresosBase*100*10)/10 : 0;

  // Partes del mes
  var partesMes = obtenerPartesV2API_ ? obtenerPartesV2API_({ mes: mes }) : { total: 0, total_horas: 0 };

  return {
    ok: true,
    periodo: mes,
    ingresos_base: ingresosBase,
    coste_personal: Math.round(costePers*100)/100,
    coste_materiales: Math.round(costeMats*100)/100,
    coste_maquinaria: Math.round(costeMaqui*100)/100,
    costes_indirectos: costesIndirectos,
    total_directos: Math.round(totalDirectos*100)/100,
    total_costes: Math.round(totalCostes*100)/100,
    beneficio: Math.round(beneficio*100)/100,
    margen: margen,
    partes_mes: partesMes.total || 0,
    horas_mes: partesMes.total_horas || 0,
    automatico: true // indica que es calculado en tiempo real
  };
}

// ════════════════════════════════════════════════════════════════
// CONSOLIDACIÓN AUTOMÁTICA MENSUAL
// Trigger el día 1 de cada mes a las 07:00
// Consolida el mes anterior para todos los contratos en ejecución
// ════════════════════════════════════════════════════════════════

function configurarTriggerConsolidacionMensual() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'consolidarMesAnterior') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('consolidarMesAnterior')
    .timeBased().onMonthDay(1).atHour(7).create();
  Logger.log('✅ Trigger consolidación mensual configurado — día 1 de cada mes a las 07:00');
}

function consolidarMesAnterior() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var hoy = new Date();

  // Calcular el mes anterior
  var mesSel = hoy.getMonth(); // 0-11, ya apunta al mes anterior
  var anioSel = hoy.getFullYear();
  if (mesSel === 0) { mesSel = 12; anioSel--; }

  Logger.log('📊 Consolidando P&L: ' + mesSel + '/' + anioSel);

  // Obtener todos los contratos en ejecución
  var hojaRes = ss.getSheetByName(HOJA_RESULTADOS);
  if (!hojaRes || hojaRes.getLastRow() <= 1) {
    Logger.log('Sin contratos en RESULTADOS');
    return { consolidados: 0 };
  }

  var dRes = hojaRes.getDataRange().getValues();
  var consolidados = 0;
  var errores = [];

  for (var i = 1; i < dRes.length; i++) {
    var estado = String(dRes[i][16] || '');
    if (estado !== 'en_ejecucion') continue;

    var opoId = dRes[i][0];
    if (!opoId) continue;

    try {
      // Calcular datos automáticamente desde COSTES_IMPUTADOS
      var periodo = anioSel + '-' + (mesSel < 10 ? '0' : '') + mesSel;

      // Ingresos base
      var importeAdj = parseFloat(dRes[i][5]) || 0;
      var durMeses   = parseInt(dRes[i][13]) || 12;
      var ingresosBase = Math.round(importeAdj / durMeses * 100) / 100;

      // Costes desde COSTES_IMPUTADOS
      var costePers = 0, costeMats = 0, costeMaqui = 0;
      var hojaCostes = ss.getSheetByName('COSTES_IMPUTADOS');
      if (hojaCostes) {
        var dC = hojaCostes.getDataRange().getValues();
        for (var ci = 1; ci < dC.length; ci++) {
          if (dC[ci][3] === opoId && dC[ci][5] === periodo) {
            costePers  += parseFloat(dC[ci][6]) || 0;
            costeMats  += parseFloat(dC[ci][7]) || 0;
            costeMaqui += parseFloat(dC[ci][8]) || 0;
          }
        }
      }

      // Solo consolidar si hay datos reales (al menos un parte del mes)
      if (costePers === 0 && costeMats === 0 && costeMaqui === 0 && ingresosBase === 0) continue;

      // Comprobar si ya existe registro manual del mes (no sobreescribir)
      var hojaSeg = ss.getSheetByName(HOJA_SEGUIMIENTO_MENSUAL);
      if (hojaSeg) {
        var dSeg = hojaSeg.getDataRange().getValues();
        var yaExiste = false;
        for (var si = 1; si < dSeg.length; si++) {
          if (dSeg[si][0] === opoId && dSeg[si][3] === periodo) {
            // Si existe y tiene ingresos adicionales o ajustes manuales, no sobreescribir
            var tieneManual = (parseFloat(dSeg[si][5])||0) > 0 || // ingresos_adicionales
                              (parseFloat(dSeg[si][8])||0) !== 0 || // ajuste_personal
                              (parseFloat(dSeg[si][10])||0) > 0 || // materiales_no_recurrentes
                              (parseFloat(dSeg[si][11])||0) > 0;   // servicios_externos
            if (tieneManual) { yaExiste = true; break; }
            // Si existe pero es solo automático, actualizar
            hojaSeg.deleteRow(si + 1);
            break;
          }
        }
        if (yaExiste) continue;
      }

      // Consolidar automáticamente
      var r = registrarSeguimientoMensual_({
        oportunidad_id: opoId,
        mes: mesSel,
        anio: anioSel,
        coste_personal: costePers,
        coste_materiales: costeMats,
        coste_maquinaria: costeMaqui,
        pct_indirectos: 15,
        notas: 'Consolidado automáticamente el ' + Utilities.formatDate(hoy,'Europe/Madrid','dd/MM/yyyy')
      });

      if (r.ok) {
        consolidados++;
        Logger.log('✅ Consolidado: ' + opoId + ' → B: ' + r.beneficio.toFixed(2) + '€ (' + r.margen.toFixed(1) + '%)');
      }
    } catch(e) {
      errores.push(opoId + ': ' + e.message);
      Logger.log('Error consolidando ' + opoId + ': ' + e.message);
    }
  }

  var resumen = '📊 Consolidación P&L ' + mesSel + '/' + anioSel + ': ' +
                consolidados + ' contratos consolidados' +
                (errores.length > 0 ? ', ' + errores.length + ' errores' : '');
  Logger.log(resumen);

  // Enviar email resumen
  try {
    var email = Session.getActiveUser().getEmail();
    if (email) MailApp.sendEmail(email, 'Forgeser — P&L consolidado ' + mesSel + '/' + anioSel, resumen);
  } catch(eM) {}

  return { consolidados: consolidados, errores: errores.length, periodo: periodo };
}