// ============================================================================
// 04_calculos.gs - GUARDAR/CARGAR CÁLCULOS ECONÓMICOS
// Versión: 1.0 | Fecha: Marzo 2026
// ============================================================================

var HOJA_CALCULOS = 'CALCULOS';

function crearHojaCalculosSiNoExiste_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(HOJA_CALCULOS)) return;
  var hoja = ss.insertSheet(HOJA_CALCULOS);
  var cab = ['ID Oportunidad', 'Fecha', 'Total Sin IVA', 'Total Con IVA', 'Baja %', 'Margen %', 'Rentable', 'Trabajadores', 'JSON Datos'];
  hoja.getRange(1, 1, 1, cab.length).setValues([cab]);
  hoja.getRange(1, 1, 1, cab.length).setBackground('#0d47a1').setFontColor('#ffffff').setFontWeight('bold');
  hoja.setColumnWidth(1, 250); hoja.setColumnWidth(9, 500); hoja.setFrozenRows(1);
  hoja.getRange('C2:D1000').setNumberFormat('#,##0.00 €');
  hoja.getRange('E2:F1000').setNumberFormat('#,##0.00 %');
}

function guardarCalculoAPI_(data) {
  crearHojaCalculosSiNoExiste_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CALCULOS);
  var opoId = data.oportunidad_id || '';
  if (!opoId) return { ok: false, error: 'ID oportunidad requerido' };

  // Borrar cálculo anterior de esta oportunidad
  var datos = hoja.getDataRange().getValues();
  for (var i = datos.length - 1; i >= 1; i--) {
    if (datos[i][0] === opoId) hoja.deleteRow(i + 1);
  }

  // Guardar nuevo
  var jsonDatos = data.json_datos || '{}';
  var resumen = {};
  try { resumen = JSON.parse(jsonDatos).resumen || {}; } catch (e) {}

  hoja.appendRow([
    opoId,
    new Date(),
    resumen.totalSinIVA || 0,
    resumen.totalConIVA || 0,
    (resumen.baja || 0) / 100,
    (resumen.margenReal || 0) / 100,
    resumen.esRentable ? 'SÍ' : 'NO',
    resumen.totalTrabajadores || 0,
    jsonDatos.substring(0, 50000)
  ]);

  return { ok: true, oportunidad_id: opoId };
}

function cargarCalculoAPI_(opoId) {
  crearHojaCalculosSiNoExiste_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CALCULOS);
  if (!hoja || hoja.getLastRow() <= 1) return { existe: false };

  var datos = hoja.getDataRange().getValues();

  // 1. Buscar cálculo general (guardado con el opoId exacto)
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === opoId) {
      var jsonStr = datos[i][8] || '{}';
      try {
        var parsed = JSON.parse(jsonStr);
        return {
          existe: true,
          oportunidad_id: opoId,
          fecha: datos[i][1],
          totalSinIVA: datos[i][2],
          totalConIVA: datos[i][3],
          datos: parsed
        };
      } catch (e) {
        return { existe: true, oportunidad_id: opoId, fecha: datos[i][1], datos: {} };
      }
    }
  }

  // 2. Si no hay cálculo general, buscar cálculos por lotes y agregarlos
  var calcLotes = [];
  for (var j = 1; j < datos.length; j++) {
    var idFila = String(datos[j][0] || '');
    // Los lotes se guardan como "LOTE-OPO-xxx-1", "LOTE-OPO-xxx-2" o "OPO-xxx_LOTE-1"
    if (idFila.indexOf(opoId) !== -1 && idFila !== opoId) {
      try {
        var parsed2 = JSON.parse(datos[j][8] || '{}');
        calcLotes.push({
          id: idFila,
          totalSinIVA: datos[j][2] || 0,
          totalConIVA: datos[j][3] || 0,
          baja: datos[j][4] || 0,
          margen: datos[j][5] || 0,
          rentable: datos[j][6],
          trabajadores: datos[j][7] || 0,
          datos: parsed2
        });
      } catch(e) {}
    }
  }

  if (calcLotes.length === 0) return { existe: false };

  // Agregar totales de todos los lotes
  var totalSinIVA = 0, totalConIVA = 0, totalTrab = 0;
  calcLotes.forEach(function(l) {
    totalSinIVA += parseFloat(l.totalSinIVA) || 0;
    totalConIVA += parseFloat(l.totalConIVA) || 0;
    totalTrab   += parseInt(l.trabajadores)  || 0;
  });

  // Calcular baja y margen medios ponderados
  var presupuesto = 0;
  try {
    var hojaOpo = ss.getSheetByName('OPORTUNIDADES');
    if (hojaOpo) {
      var datosOpo = hojaOpo.getDataRange().getValues();
      for (var k = 1; k < datosOpo.length; k++) {
        if (datosOpo[k][0] === opoId) { presupuesto = parseFloat(datosOpo[k][6]) || 0; break; }
      }
    }
  } catch(e) {}

  var presSinIVA = presupuesto / 1.21;
  var baja       = presSinIVA > 0 ? ((presSinIVA - totalSinIVA) / presSinIVA * 100) : 0;
  var margen     = totalSinIVA > 0 ? ((calcLotes[0].datos.resumen?.margenReal) || 0) : 0;

  return {
    existe: true,
    oportunidad_id: opoId,
    fecha: calcLotes[0].datos.fecha || new Date(),
    totalSinIVA: totalSinIVA,
    totalConIVA: totalConIVA,
    por_lotes: true,
    num_lotes: calcLotes.length,
    datos: {
      resumen: {
        totalSinIVA:      totalSinIVA,
        totalConIVA:      totalConIVA,
        baja:             baja,
        margenReal:       margen,
        esRentable:       totalSinIVA > 0 && totalSinIVA < presSinIVA,
        totalTrabajadores: totalTrab,
        nota:             'Suma de ' + calcLotes.length + ' lotes'
      },
      lotes: calcLotes
    }
  };
}