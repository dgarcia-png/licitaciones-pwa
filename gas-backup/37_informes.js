// ============================================================================
// 37_informes.gs — Módulo de Informes y Reporting completo
// ============================================================================

// ── INFORME COSTES Y P&L POR CONTRATO ────────────────────────────────────────
function informeCostesContratoAPI_(opoId, filtros) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  filtros = filtros || {};

  // Datos del contrato
  var contrato = {};
  var hojaRes = ss.getSheetByName('RESULTADOS_LICITACIONES');
  if (hojaRes) {
    var dRes = hojaRes.getDataRange().getValues();
    for (var r = 1; r < dRes.length; r++) {
      if (dRes[r][0] === opoId) {
        contrato = {
          id: dRes[r][0], titulo: dRes[r][1], organismo: dRes[r][2],
          importe_adj: parseFloat(dRes[r][5])||0,
          duracion_meses: parseInt(dRes[r][13])||12,
          estado: dRes[r][16]||''
        };
        break;
      }
    }
  }

  // Seguimiento mensual
  var meses = [];
  var hojaSeg = ss.getSheetByName('SEGUIMIENTO_MENSUAL');
  if (hojaSeg && hojaSeg.getLastRow() > 1) {
    var dSeg = hojaSeg.getDataRange().getValues();
    for (var si = 1; si < dSeg.length; si++) {
      if (dSeg[si][0] !== opoId) continue;
      meses.push({
        periodo:          dSeg[si][3],
        ingresos_base:    parseFloat(dSeg[si][4])||0,
        ingresos_adicionales: parseFloat(dSeg[si][5])||0,
        total_ingresos:   parseFloat(dSeg[si][6])||0,
        coste_personal:   parseFloat(dSeg[si][7])||0,
        coste_materiales: parseFloat(dSeg[si][9])||0,
        coste_maquinaria: parseFloat(dSeg[si][12])||0,
        costes_indirectos:parseFloat(dSeg[si][14])||0,
        total_costes:     parseFloat(dSeg[si][16])||0,
        beneficio:        parseFloat(dSeg[si][17])||0,
        margen:           parseFloat(dSeg[si][18])||0,
        desviacion:       parseFloat(dSeg[si][20])||0,
        desviacion_pct:   parseFloat(dSeg[si][21])||0
      });
    }
  }
  meses.sort(function(a,b){return a.periodo>b.periodo?1:-1;});

  // Acumulados
  var totalIngresos = 0, totalCostes = 0, totalBeneficio = 0;
  var totalPersonal = 0, totalMateriales = 0, totalMaquinaria = 0, totalIndirectos = 0;
  meses.forEach(function(m) {
    totalIngresos    += m.total_ingresos;
    totalCostes      += m.total_costes;
    totalBeneficio   += m.beneficio;
    totalPersonal    += m.coste_personal;
    totalMateriales  += m.coste_materiales;
    totalMaquinaria  += m.coste_maquinaria;
    totalIndirectos  += m.costes_indirectos;
  });

  var margenTotal = totalIngresos > 0 ? Math.round(totalBeneficio/totalIngresos*100*10)/10 : 0;
  var ingresosMensuales = contrato.duracion_meses > 0 ? Math.round(contrato.importe_adj/contrato.duracion_meses*100)/100 : 0;

  // Costes reales desde COSTES_IMPUTADOS (detalle)
  var costesDetalle = { personal: 0, materiales: 0, maquinaria: 0 };
  var hojaCostes = ss.getSheetByName('COSTES_IMPUTADOS');
  if (hojaCostes) {
    var dC = hojaCostes.getDataRange().getValues();
    for (var ci = 1; ci < dC.length; ci++) {
      if (dC[ci][3] !== opoId) continue;
      var mesCI = String(dC[ci][5]||'');
      if (filtros.mes_desde && mesCI < filtros.mes_desde) continue;
      if (filtros.mes_hasta && mesCI > filtros.mes_hasta) continue;
      costesDetalle.personal    += parseFloat(dC[ci][6])||0;
      costesDetalle.materiales  += parseFloat(dC[ci][7])||0;
      costesDetalle.maquinaria  += parseFloat(dC[ci][8])||0;
    }
  }

  return {
    ok: true,
    contrato: contrato,
    ingresos_mensuales_objetivo: ingresosMensuales,
    meses: meses,
    acumulado: {
      total_ingresos:    Math.round(totalIngresos*100)/100,
      total_costes:      Math.round(totalCostes*100)/100,
      total_beneficio:   Math.round(totalBeneficio*100)/100,
      margen_pct:        margenTotal,
      coste_personal:    Math.round(totalPersonal*100)/100,
      coste_materiales:  Math.round(totalMateriales*100)/100,
      coste_maquinaria:  Math.round(totalMaquinaria*100)/100,
      costes_indirectos: Math.round(totalIndirectos*100)/100,
    },
    costes_imputados: costesDetalle,
    num_meses: meses.length
  };
}

// ── INFORME GLOBAL LICITACIONES ───────────────────────────────────────────────
function informeLicitacionesAPI_(filtros) {
  filtros = filtros || {};
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var hojaOpo = ss.getSheetByName('OPORTUNIDADES');
  var hojaRes = ss.getSheetByName('RESULTADOS_LICITACIONES');
  var hojaHist = ss.getSheetByName('HISTORICO_ADJUDICACIONES');

  var oportunidades = [], resultados = [], historico = [];

  if (hojaOpo && hojaOpo.getLastRow() > 1) {
    var dO = hojaOpo.getDataRange().getValues();
    for (var i = 1; i < dO.length; i++) {
      if (!dO[i][0]) continue;
      oportunidades.push({
        id: dO[i][0], titulo: String(dO[i][3]||'').substring(0,80),
        organismo: String(dO[i][4]||'').substring(0,60),
        presupuesto: parseFloat(dO[i][6])||0,
        scoring: parseFloat(dO[i][7])||0,
        estado: String(dO[i][11]||'')
      });
    }
  }

  if (hojaRes && hojaRes.getLastRow() > 1) {
    var dR = hojaRes.getDataRange().getValues();
    for (var ri = 1; ri < dR.length; ri++) {
      if (!dR[ri][0]) continue;
      resultados.push({
        id: dR[ri][0], titulo: String(dR[ri][1]||'').substring(0,80),
        importe: parseFloat(dR[ri][5])||0,
        estado: String(dR[ri][16]||''),
        margen_estimado: parseFloat(dR[ri][15])||0
      });
    }
  }

  // KPIs
  var total = oportunidades.length;
  var porEstado = {};
  var presupuestoTotal = 0;
  oportunidades.forEach(function(o) {
    porEstado[o.estado] = (porEstado[o.estado]||0) + 1;
    presupuestoTotal += o.presupuesto;
  });

  var adjudicadas = resultados.filter(function(r){return r.estado==='en_ejecucion'||r.estado==='adjudicada';});
  var importeAdj = adjudicadas.reduce(function(s,r){return s+r.importe;},0);
  var tasaExito = total > 0 ? Math.round(adjudicadas.length/total*100) : 0;
  var scoringMedio = total > 0 ? Math.round(oportunidades.reduce(function(s,o){return s+o.scoring;},0)/total) : 0;

  return {
    ok: true,
    kpis: {
      total_oportunidades: total,
      tasa_exito_pct: tasaExito,
      importe_adjudicado: Math.round(importeAdj*100)/100,
      presupuesto_pipeline: Math.round(presupuestoTotal*100)/100,
      scoring_medio: scoringMedio,
      contratos_activos: adjudicadas.length
    },
    por_estado: porEstado,
    ultimas_oportunidades: oportunidades.slice(0,10),
    contratos_activos: adjudicadas
  };
}

// ── INFORME RRHH ──────────────────────────────────────────────────────────────
function informeRRHHAPI_(filtros) {
  filtros = filtros || {};
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var mes = filtros.mes || Utilities.formatDate(new Date(),'Europe/Madrid','yyyy-MM');

  // Empleados
  var empleados = obtenerEmpleadosAPI_(null);
  var plantilla = empleados.empleados || [];

  // Fichajes del mes
  var horasTotales = 0, diasTrabajados = 0, fichajes = 0;
  var horasExtra = 0;
  var hojaFich = ss.getSheetByName('FICHAJES');
  if (hojaFich && hojaFich.getLastRow() > 1) {
    var dF = hojaFich.getDataRange().getValues();
    for (var fi = 1; fi < dF.length; fi++) {
      var fFich = dF[fi][5] instanceof Date ? Utilities.formatDate(dF[fi][5],'Europe/Madrid','yyyy-MM') : String(dF[fi][5]||'').substring(0,7);
      if (fFich !== mes) continue;
      fichajes++;
      horasTotales += parseFloat(dF[fi][11])||0;
      horasExtra   += parseFloat(dF[fi][12])||0;
    }
    diasTrabajados = Math.round(fichajes / 2); // entrada + salida
  }

  // Ausencias del mes
  var ausencias = 0, ausenciasPendientes = 0;
  var hojaAus = ss.getSheetByName('AUSENCIAS');
  if (hojaAus && hojaAus.getLastRow() > 1) {
    var dA = hojaAus.getDataRange().getValues();
    for (var ai = 1; ai < dA.length; ai++) {
      var fAus = dA[ai][4] instanceof Date ? Utilities.formatDate(dA[ai][4],'Europe/Madrid','yyyy-MM') : String(dA[ai][4]||'').substring(0,7);
      if (fAus !== mes) continue;
      ausencias++;
      if (dA[ai][8] === 'pendiente') ausenciasPendientes++;
    }
  }

  // Coste nómina estimado
  var costePlantilla = plantilla.reduce(function(s,e){return s+(parseFloat(e.salario_bruto)||0)/12;},0);

  return {
    ok: true,
    mes: mes,
    plantilla: {
      total: plantilla.length,
      activos: plantilla.filter(function(e){return e.estado==='activo';}).length,
      contratos_vencer_30d: plantilla.filter(function(e){
        if (!e.fecha_fin_contrato) return false;
        var d = (new Date(e.fecha_fin_contrato)-new Date())/86400000;
        return d >= 0 && d <= 30;
      }).length
    },
    fichajes: {
      total_horas: Math.round(horasTotales*10)/10,
      horas_extra: Math.round(horasExtra*10)/10,
      dias_trabajados: diasTrabajados
    },
    ausencias: { total: ausencias, pendientes_aprobar: ausenciasPendientes },
    coste_nomina_estimado: Math.round(costePlantilla*100)/100,
    empleados_detalle: plantilla.slice(0,20)
  };
}

// ── INFORME TERRITORIO ────────────────────────────────────────────────────────
function informeTerritorioAPI_(filtros) {
  filtros = filtros || {};
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var mes = filtros.mes || Utilities.formatDate(new Date(),'Europe/Madrid','yyyy-MM');

  // Centros
  var centros = obtenerCentrosAPI_(null);

  // Partes del mes
  var partesTotales = 0, horasTotal = 0, partesCompletados = 0;
  var costePersonal = 0, costeMateriales = 0;
  var hojaPartes = ss.getSheetByName('PARTES_V2');
  if (hojaPartes && hojaPartes.getLastRow() > 1) {
    var dP = hojaPartes.getDataRange().getValues();
    for (var pi = 1; pi < dP.length; pi++) {
      var fP = dP[pi][6] instanceof Date ? Utilities.formatDate(dP[pi][6],'Europe/Madrid','yyyy-MM') : String(dP[pi][6]||'').substring(0,7);
      if (fP !== mes) continue;
      if (filtros.centro_id && dP[pi][1] !== filtros.centro_id) continue;
      partesTotales++;
      horasTotal += parseFloat(dP[pi][9])||0;
      costePersonal   += parseFloat(dP[pi][20])||0;
      costeMateriales += parseFloat(dP[pi][21])||0;
      if (dP[pi][15] === 'completado') partesCompletados++;
    }
  }

  // Incidencias abiertas
  var incAbiertas = 0, incVencidas = 0;
  var hojaInc = ss.getSheetByName('INCIDENCIAS');
  if (hojaInc && hojaInc.getLastRow() > 1) {
    var dI = hojaInc.getDataRange().getValues();
    for (var ii = 1; ii < dI.length; ii++) {
      if (dI[ii][9] === 'abierta' || dI[ii][9] === 'en_proceso') {
        incAbiertas++;
        if (String(dI[ii][16]||'') === 'vencido') incVencidas++;
      }
    }
  }

  // Calidad media del mes
  var calidadMedia = 0, numInsp = 0;
  var hojaInsp = ss.getSheetByName('INSPECCIONES_CALIDAD');
  if (hojaInsp && hojaInsp.getLastRow() > 1) {
    var dInsp = hojaInsp.getDataRange().getValues();
    for (var insi = 1; insi < dInsp.length; insi++) {
      var fInsp = dInsp[insi][5] instanceof Date ? Utilities.formatDate(dInsp[insi][5],'Europe/Madrid','yyyy-MM') : String(dInsp[insi][5]||'').substring(0,7);
      if (fInsp === mes) { calidadMedia += parseFloat(dInsp[insi][12])||0; numInsp++; }
    }
  }
  if (numInsp > 0) calidadMedia = Math.round(calidadMedia/numInsp*10)/10;

  return {
    ok: true,
    mes: mes,
    centros: {
      total: centros.total,
      activos: centros.activos,
      total_presupuesto_anual: centros.total_presupuesto
    },
    operativo: {
      partes_totales: partesTotales,
      partes_completados: partesCompletados,
      horas_trabajadas: Math.round(horasTotal*10)/10,
      coste_personal: Math.round(costePersonal*100)/100,
      coste_materiales: Math.round(costeMateriales*100)/100
    },
    incidencias: { abiertas: incAbiertas, sla_vencidas: incVencidas },
    calidad: { media_mes: calidadMedia, num_inspecciones: numInsp }
  };
}

// ── INFORME ECONÓMICO GLOBAL (todos los contratos) ────────────────────────────
function informeEconomicoGlobalAPI_(filtros) {
  filtros = filtros || {};
  var ss  = SpreadsheetApp.getActiveSpreadsheet();

  var hojaRes = ss.getSheetByName('RESULTADOS_LICITACIONES');
  var hojaSeg = ss.getSheetByName('SEGUIMIENTO_MENSUAL');

  if (!hojaRes || !hojaSeg) return { ok: false, error: 'Sin datos' };

  // Contratos en ejecución
  var contratos = [];
  var dRes = hojaRes.getDataRange().getValues();
  for (var r = 1; r < dRes.length; r++) {
    if (!dRes[r][0]) continue;
    if (dRes[r][16] !== 'en_ejecucion') continue;
    contratos.push({
      id: dRes[r][0],
      titulo: String(dRes[r][1]||'').substring(0,80),
      organismo: String(dRes[r][2]||'').substring(0,60),
      importe: parseFloat(dRes[r][5])||0,
      duracion_meses: parseInt(dRes[r][13])||12,
      margen_estimado: parseFloat(dRes[r][15])||0
    });
  }

  // Acumular seguimiento por contrato
  var dSeg = hojaSeg.getDataRange().getValues();
  var resumenContratos = [];
  var totalIngresosGlobal = 0, totalCostesGlobal = 0, totalBeneficioGlobal = 0;

  contratos.forEach(function(c) {
    var ingresos = 0, costes = 0, beneficio = 0, mesesReg = 0;
    var lastMargen = 0;
    for (var si = 1; si < dSeg.length; si++) {
      if (dSeg[si][0] !== c.id) continue;
      ingresos  += parseFloat(dSeg[si][6])||0;
      costes    += parseFloat(dSeg[si][16])||0;
      beneficio += parseFloat(dSeg[si][17])||0;
      lastMargen = parseFloat(dSeg[si][18])||0;
      mesesReg++;
    }
    var margenReal = ingresos > 0 ? Math.round(beneficio/ingresos*100*10)/10 : 0;
    var alerta = margenReal < 10 && ingresos > 0;

    resumenContratos.push({
      id: c.id,
      titulo: c.titulo,
      organismo: c.organismo,
      importe_total: c.importe,
      ingresos_acum: Math.round(ingresos*100)/100,
      costes_acum:   Math.round(costes*100)/100,
      beneficio_acum:Math.round(beneficio*100)/100,
      margen_real_pct: margenReal,
      margen_estimado_pct: c.margen_estimado,
      meses_registrados: mesesReg,
      alerta_margen: alerta
    });

    totalIngresosGlobal  += ingresos;
    totalCostesGlobal    += costes;
    totalBeneficioGlobal += beneficio;
  });

  resumenContratos.sort(function(a,b){return a.margen_real_pct - b.margen_real_pct;});

  var margenGlobal = totalIngresosGlobal > 0 ? Math.round(totalBeneficioGlobal/totalIngresosGlobal*100*10)/10 : 0;

  return {
    ok: true,
    global: {
      contratos_activos: contratos.length,
      total_ingresos:    Math.round(totalIngresosGlobal*100)/100,
      total_costes:      Math.round(totalCostesGlobal*100)/100,
      total_beneficio:   Math.round(totalBeneficioGlobal*100)/100,
      margen_global_pct: margenGlobal,
      contratos_alerta:  resumenContratos.filter(function(c){return c.alerta_margen;}).length
    },
    contratos: resumenContratos
  };
}