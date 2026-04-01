// ============================================================================
// 43_informe_rendimiento.gs — Informe de rendimiento de proyectos
// y desviación presupuestaria por partidas con proyección por tendencia
// Versión: 1.0 | Fecha: 1 Abril 2026
// ============================================================================

function informeRendimientoProyectos_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hojaRes = ss.getSheetByName('RESULTADOS');
  var hojaSeg = ss.getSheetByName('SEGUIMIENTO_MENSUAL');
  var hojaCalc = ss.getSheetByName('CALCULOS');

  if (!hojaRes || hojaRes.getLastRow() <= 1) return { ok: true, proyectos: [], total: 0 };

  var dRes = hojaRes.getDataRange().getValues();
  var dSeg = hojaSeg && hojaSeg.getLastRow() > 1 ? hojaSeg.getDataRange().getValues() : [];
  var dCalc = hojaCalc && hojaCalc.getLastRow() > 1 ? hojaCalc.getDataRange().getValues() : [];

  var proyectos = [];

  for (var r = 1; r < dRes.length; r++) {
    var resultado = String(dRes[r][3] || '');
    if (resultado !== 'ganada') continue;
    var estadoContrato = String(dRes[r][16] || '');
    if (estadoContrato === 'cerrado' || estadoContrato === 'finalizado') continue;

    var opoId = dRes[r][0];
    var titulo = dRes[r][1];
    var organismo = dRes[r][2];
    var importeAdj = parseFloat(dRes[r][5]) || 0;
    var duracionMeses = parseInt(dRes[r][13]) || 12;
    var costeEstimadoTotal = parseFloat(dRes[r][14]) || 0;
    var margenEstimado = parseFloat(dRes[r][15]) || 0;
    var fechaInicio = dRes[r][11];
    var fechaFin = dRes[r][12];

    // ── Obtener estimaciones originales del cálculo ──
    var estimacionPartidas = { personal: 0, materiales: 0, maquinaria: 0, indirectos: 0, total: 0 };
    for (var c = 1; c < dCalc.length; c++) {
      if (dCalc[c][0] === opoId) {
        try {
          var calcData = JSON.parse(dCalc[c][8] || '{}');
          if (calcData.resumen) {
            estimacionPartidas.personal = calcData.resumen.costePersonalTotal || 0;
            estimacionPartidas.materiales = calcData.resumen.costeMateriales || 0;
            estimacionPartidas.maquinaria = calcData.resumen.costeMaquinaria || 0;
            estimacionPartidas.indirectos = calcData.resumen.costesIndirectos || 0;
            estimacionPartidas.total = (calcData.resumen.costesDirectos || 0) + (calcData.resumen.costesIndirectos || 0);
          }
        } catch (e) {}
        break;
      }
    }

    // ── Agregar datos reales de seguimiento mensual ──
    var meses = [];
    var realAcum = { ingresos: 0, personal: 0, materiales: 0, mat_no_rec: 0, servicios_ext: 0, maquinaria: 0, indirectos: 0, total_costes: 0, beneficio: 0 };

    for (var s = 1; s < dSeg.length; s++) {
      if (dSeg[s][0] !== opoId) continue;
      var periodo = String(dSeg[s][3] || '');
      var mesData = {
        periodo: periodo,
        ingresos: parseFloat(dSeg[s][6]) || 0,
        personal: (parseFloat(dSeg[s][7]) || 0) + (parseFloat(dSeg[s][8]) || 0),
        materiales: parseFloat(dSeg[s][9]) || 0,
        mat_no_rec: parseFloat(dSeg[s][10]) || 0,
        servicios_ext: parseFloat(dSeg[s][11]) || 0,
        maquinaria: parseFloat(dSeg[s][12]) || 0,
        indirectos: parseFloat(dSeg[s][14]) || 0,
        total_costes: parseFloat(dSeg[s][16]) || 0,
        beneficio: parseFloat(dSeg[s][17]) || 0,
        margen: parseFloat(dSeg[s][18]) || 0,
        coste_estimado_mes: parseFloat(dSeg[s][19]) || 0,
        desviacion: parseFloat(dSeg[s][20]) || 0,
        desviacion_pct: parseFloat(dSeg[s][21]) || 0,
        incidencias: parseInt(dSeg[s][22]) || 0,
        penalizaciones: parseFloat(dSeg[s][23]) || 0
      };

      realAcum.ingresos += mesData.ingresos;
      realAcum.personal += mesData.personal;
      realAcum.materiales += mesData.materiales + mesData.mat_no_rec;
      realAcum.servicios_ext += mesData.servicios_ext;
      realAcum.maquinaria += mesData.maquinaria;
      realAcum.indirectos += mesData.indirectos;
      realAcum.total_costes += mesData.total_costes;
      realAcum.beneficio += mesData.beneficio;

      meses.push(mesData);
    }

    // Ordenar meses cronológicamente
    meses.sort(function(a, b) { return a.periodo < b.periodo ? -1 : 1; });

    var mesesEjecutados = meses.length;
    var mesesRestantes = Math.max(0, duracionMeses - mesesEjecutados);
    var pctEjecucion = duracionMeses > 0 ? Math.round(mesesEjecutados / duracionMeses * 1000) / 10 : 0;

    // ── DESVIACIÓN POR PARTIDA ──
    // Estimación mensualizada original
    var estMensual = {
      personal: estimacionPartidas.personal / duracionMeses,
      materiales: estimacionPartidas.materiales / duracionMeses,
      maquinaria: estimacionPartidas.maquinaria / duracionMeses,
      indirectos: estimacionPartidas.indirectos / duracionMeses,
      total: estimacionPartidas.total / duracionMeses
    };

    // Estimación acumulada a esta fecha (proporcional a meses ejecutados)
    var estAcum = {
      personal: estMensual.personal * mesesEjecutados,
      materiales: estMensual.materiales * mesesEjecutados,
      maquinaria: estMensual.maquinaria * mesesEjecutados,
      indirectos: estMensual.indirectos * mesesEjecutados,
      total: estMensual.total * mesesEjecutados
    };

    // Desviación acumulada por partida
    var desviacionPartidas = {
      personal:   { real: realAcum.personal,   estimado: estAcum.personal,   desv: realAcum.personal - estAcum.personal,   pct: estAcum.personal > 0 ? ((realAcum.personal - estAcum.personal) / estAcum.personal * 100) : 0 },
      materiales: { real: realAcum.materiales,  estimado: estAcum.materiales,  desv: realAcum.materiales - estAcum.materiales, pct: estAcum.materiales > 0 ? ((realAcum.materiales - estAcum.materiales) / estAcum.materiales * 100) : 0 },
      maquinaria: { real: realAcum.maquinaria,  estimado: estAcum.maquinaria,  desv: realAcum.maquinaria - estAcum.maquinaria, pct: estAcum.maquinaria > 0 ? ((realAcum.maquinaria - estAcum.maquinaria) / estAcum.maquinaria * 100) : 0 },
      indirectos: { real: realAcum.indirectos,  estimado: estAcum.indirectos,  desv: realAcum.indirectos - estAcum.indirectos, pct: estAcum.indirectos > 0 ? ((realAcum.indirectos - estAcum.indirectos) / estAcum.indirectos * 100) : 0 },
      total:      { real: realAcum.total_costes, estimado: estAcum.total,       desv: realAcum.total_costes - estAcum.total,    pct: estAcum.total > 0 ? ((realAcum.total_costes - estAcum.total) / estAcum.total * 100) : 0 }
    };

    // ── PROYECCIÓN A FIN DE CONTRATO POR TENDENCIA ──
    // Media mensual real
    var mediaMensualReal = {
      ingresos: mesesEjecutados > 0 ? realAcum.ingresos / mesesEjecutados : 0,
      personal: mesesEjecutados > 0 ? realAcum.personal / mesesEjecutados : 0,
      materiales: mesesEjecutados > 0 ? realAcum.materiales / mesesEjecutados : 0,
      maquinaria: mesesEjecutados > 0 ? realAcum.maquinaria / mesesEjecutados : 0,
      indirectos: mesesEjecutados > 0 ? realAcum.indirectos / mesesEjecutados : 0,
      total_costes: mesesEjecutados > 0 ? realAcum.total_costes / mesesEjecutados : 0
    };

    // Proyección = real acumulado + (media mensual × meses restantes)
    var proyeccion = {
      ingresos:     r2(realAcum.ingresos + mediaMensualReal.ingresos * mesesRestantes),
      personal:     r2(realAcum.personal + mediaMensualReal.personal * mesesRestantes),
      materiales:   r2(realAcum.materiales + mediaMensualReal.materiales * mesesRestantes),
      maquinaria:   r2(realAcum.maquinaria + mediaMensualReal.maquinaria * mesesRestantes),
      indirectos:   r2(realAcum.indirectos + mediaMensualReal.indirectos * mesesRestantes),
      total_costes: r2(realAcum.total_costes + mediaMensualReal.total_costes * mesesRestantes),
    };
    proyeccion.beneficio = r2(proyeccion.ingresos - proyeccion.total_costes);
    proyeccion.margen = proyeccion.ingresos > 0 ? r2(proyeccion.beneficio / proyeccion.ingresos * 100) : 0;

    // Desviación proyectada vs estimación total
    var desvProyectada = {
      personal:   { proyectado: proyeccion.personal,     estimado: estimacionPartidas.personal,   desv: r2(proyeccion.personal - estimacionPartidas.personal),     pct: estimacionPartidas.personal > 0 ? r2((proyeccion.personal - estimacionPartidas.personal) / estimacionPartidas.personal * 100) : 0 },
      materiales: { proyectado: proyeccion.materiales,   estimado: estimacionPartidas.materiales, desv: r2(proyeccion.materiales - estimacionPartidas.materiales), pct: estimacionPartidas.materiales > 0 ? r2((proyeccion.materiales - estimacionPartidas.materiales) / estimacionPartidas.materiales * 100) : 0 },
      maquinaria: { proyectado: proyeccion.maquinaria,   estimado: estimacionPartidas.maquinaria, desv: r2(proyeccion.maquinaria - estimacionPartidas.maquinaria), pct: estimacionPartidas.maquinaria > 0 ? r2((proyeccion.maquinaria - estimacionPartidas.maquinaria) / estimacionPartidas.maquinaria * 100) : 0 },
      indirectos: { proyectado: proyeccion.indirectos,   estimado: estimacionPartidas.indirectos, desv: r2(proyeccion.indirectos - estimacionPartidas.indirectos), pct: estimacionPartidas.indirectos > 0 ? r2((proyeccion.indirectos - estimacionPartidas.indirectos) / estimacionPartidas.indirectos * 100) : 0 },
      total:      { proyectado: proyeccion.total_costes, estimado: estimacionPartidas.total,      desv: r2(proyeccion.total_costes - estimacionPartidas.total),    pct: estimacionPartidas.total > 0 ? r2((proyeccion.total_costes - estimacionPartidas.total) / estimacionPartidas.total * 100) : 0 }
    };

    // ── ALERTAS ──
    var alertas = [];
    if (desviacionPartidas.total.pct > 10) alertas.push({ nivel: 'alta', msg: 'Costes totales +' + r2(desviacionPartidas.total.pct) + '% sobre estimación' });
    if (desviacionPartidas.personal.pct > 15) alertas.push({ nivel: 'alta', msg: 'Personal +' + r2(desviacionPartidas.personal.pct) + '% sobre estimación' });
    if (desviacionPartidas.materiales.pct > 20) alertas.push({ nivel: 'media', msg: 'Materiales +' + r2(desviacionPartidas.materiales.pct) + '% sobre estimación' });
    if (proyeccion.margen < 5) alertas.push({ nivel: 'critica', msg: 'Margen proyectado a fin de contrato: ' + proyeccion.margen + '% (por debajo del 5%)' });
    if (proyeccion.beneficio < 0) alertas.push({ nivel: 'critica', msg: 'Pérdida proyectada a fin de contrato: ' + Math.abs(proyeccion.beneficio).toLocaleString('es-ES') + ' €' });

    // ── RESUMEN ÍNDICES ──
    var margenReal = realAcum.ingresos > 0 ? r2(realAcum.beneficio / realAcum.ingresos * 100) : 0;
    var ipc = estAcum.total > 0 ? r2(realAcum.total_costes / estAcum.total * 100) : 0; // Índice de performance costes (CPI inverso, >100 = sobrecoste)
    var spi = duracionMeses > 0 ? r2(mesesEjecutados / duracionMeses * 100) : 0; // Schedule performance

    proyectos.push({
      id: opoId,
      titulo: titulo,
      organismo: organismo,
      importe_adjudicacion: importeAdj,
      duracion_meses: duracionMeses,
      meses_ejecutados: mesesEjecutados,
      meses_restantes: mesesRestantes,
      pct_ejecucion: pctEjecucion,
      fecha_inicio: fechaInicio instanceof Date ? Utilities.formatDate(fechaInicio, 'Europe/Madrid', 'yyyy-MM-dd') : String(fechaInicio || ''),
      fecha_fin: fechaFin instanceof Date ? Utilities.formatDate(fechaFin, 'Europe/Madrid', 'yyyy-MM-dd') : String(fechaFin || ''),
      // Estimación original
      estimacion: estimacionPartidas,
      // Acumulado real
      real_acumulado: {
        ingresos: r2(realAcum.ingresos),
        personal: r2(realAcum.personal),
        materiales: r2(realAcum.materiales),
        maquinaria: r2(realAcum.maquinaria),
        indirectos: r2(realAcum.indirectos),
        total_costes: r2(realAcum.total_costes),
        beneficio: r2(realAcum.beneficio),
        margen: margenReal
      },
      // Desviación actual por partida
      desviacion_partidas: desviacionPartidas,
      // Proyección a fin de contrato
      proyeccion: proyeccion,
      // Desviación proyectada vs estimación total
      desviacion_proyectada: desvProyectada,
      // Índices
      indice_coste: ipc,
      indice_avance: spi,
      margen_estimado: margenEstimado,
      margen_real: margenReal,
      margen_proyectado: proyeccion.margen,
      // Evolución mensual
      meses: meses,
      // Alertas
      alertas: alertas,
      // Semáforo global
      semaforo: proyeccion.beneficio < 0 ? 'rojo' : proyeccion.margen < 5 ? 'rojo' : proyeccion.margen < 10 ? 'amarillo' : desviacionPartidas.total.pct > 10 ? 'amarillo' : 'verde'
    });
  }

  // Ordenar: rojos primero, luego amarillos, luego verdes
  var ordenSemaforo = { rojo: 0, amarillo: 1, verde: 2 };
  proyectos.sort(function(a, b) { return (ordenSemaforo[a.semaforo] || 2) - (ordenSemaforo[b.semaforo] || 2); });

  // Resumen global
  var totalIngresos = 0, totalCostes = 0, totalBeneficio = 0;
  var proyEnRojo = 0, proyEnAmarillo = 0;
  for (var p = 0; p < proyectos.length; p++) {
    totalIngresos += proyectos[p].real_acumulado.ingresos;
    totalCostes += proyectos[p].real_acumulado.total_costes;
    totalBeneficio += proyectos[p].real_acumulado.beneficio;
    if (proyectos[p].semaforo === 'rojo') proyEnRojo++;
    if (proyectos[p].semaforo === 'amarillo') proyEnAmarillo++;
  }

  return {
    ok: true,
    resumen: {
      total_proyectos: proyectos.length,
      proyectos_rojo: proyEnRojo,
      proyectos_amarillo: proyEnAmarillo,
      proyectos_verde: proyectos.length - proyEnRojo - proyEnAmarillo,
      total_ingresos: r2(totalIngresos),
      total_costes: r2(totalCostes),
      total_beneficio: r2(totalBeneficio),
      margen_global: totalIngresos > 0 ? r2(totalBeneficio / totalIngresos * 100) : 0
    },
    proyectos: proyectos,
    total: proyectos.length
  };
}

function r2(n) { return Math.round((n || 0) * 100) / 100; }

// Wrapper público
function verInformeRendimiento() { Logger.log(JSON.stringify(informeRendimientoProyectos_())); }