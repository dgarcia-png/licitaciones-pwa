// ============================================================================
// 48_busqueda_global.gs — Búsqueda cross-módulo
// Versión: 1.0 | Fecha: 2 Abril 2026
// Busca simultáneamente en: Oportunidades, Empleados, Centros
// ============================================================================

function busquedaGlobalAPI_(q) {
  if (!q || String(q).trim().length < 2) return { resultados: [], total: 0 };

  var query = String(q).trim().toLowerCase();
  var resultados = [];
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── OPORTUNIDADES ──────────────────────────────────────────────────────────
  try {
    var hOpo = ss.getSheetByName(HOJA_OPORTUNIDADES);
    if (hOpo && hOpo.getLastRow() > 1) {
      var datos = hOpo.getDataRange().getValues();
      var cont = 0;
      for (var i = 1; i < datos.length && cont < 8; i++) {
        var estado = String(datos[i][11] || '').toLowerCase();
        if (estado === 'archivada') continue;
        var titulo    = String(datos[i][3]  || '').toLowerCase();
        var organismo = String(datos[i][4]  || '').toLowerCase();
        var cpv       = String(datos[i][5]  || '').toLowerCase();
        if (titulo.includes(query) || organismo.includes(query) || cpv.includes(query)) {
          resultados.push({
            modulo:    'licitaciones',
            tipo:      'Licitación',
            id:        datos[i][0],
            titulo:    datos[i][3] || '',
            subtitulo: datos[i][4] || '',
            meta:      datos[i][11] || '',
            url:       '/oportunidades/' + datos[i][0]
          });
          cont++;
        }
      }
    }
  } catch(e) { Logger.log('busquedaGlobal opos: ' + e.message); }

  // ── EMPLEADOS ──────────────────────────────────────────────────────────────
  try {
    var hEmp = ss.getSheetByName(HOJA_EMPLEADOS);
    if (hEmp && hEmp.getLastRow() > 1) {
      var datos = hEmp.getDataRange().getValues();
      var cont = 0;
      for (var i = 1; i < datos.length && cont < 6; i++) {
        var nombre   = (String(datos[i][2] || '') + ' ' + String(datos[i][1] || '')).toLowerCase();
        var dni      = String(datos[i][3]  || '').toLowerCase();
        var email    = String(datos[i][6]  || '').toLowerCase();
        var categoria = String(datos[i][9] || '').toLowerCase();
        var estado   = String(datos[i][21] || '').toLowerCase();
        if (nombre.includes(query) || dni.includes(query) || email.includes(query) || categoria.includes(query)) {
          resultados.push({
            modulo:    'rrhh',
            tipo:      'Empleado',
            id:        datos[i][0],
            titulo:    (datos[i][2] || '') + ' ' + (datos[i][1] || ''),
            subtitulo: datos[i][9] || '',
            meta:      estado,
            url:       '/personal'
          });
          cont++;
        }
      }
    }
  } catch(e) { Logger.log('busquedaGlobal empleados: ' + e.message); }

  // ── CENTROS ────────────────────────────────────────────────────────────────
  try {
    var hCen = ss.getSheetByName('CENTROS');
    if (hCen && hCen.getLastRow() > 1) {
      var datos = hCen.getDataRange().getValues();
      var cont = 0;
      for (var i = 1; i < datos.length && cont < 6; i++) {
        var nombre     = String(datos[i][1]  || '').toLowerCase();
        var organismo2 = String(datos[i][3]  || '').toLowerCase();
        var municipio  = String(datos[i][5]  || '').toLowerCase();
        if (nombre.includes(query) || organismo2.includes(query) || municipio.includes(query)) {
          resultados.push({
            modulo:    'territorio',
            tipo:      'Centro',
            id:        datos[i][0],
            titulo:    datos[i][1] || '',
            subtitulo: datos[i][3] || '',
            meta:      datos[i][5] || '',
            url:       '/territorio'
          });
          cont++;
        }
      }
    }
  } catch(e) { Logger.log('busquedaGlobal centros: ' + e.message); }

  // ── CONVENIOS ──────────────────────────────────────────────────────────────
  try {
    var hConv = ss.getSheetByName('CONVENIOS');
    if (hConv && hConv.getLastRow() > 1) {
      var datos = hConv.getDataRange().getValues();
      var cont = 0;
      for (var i = 1; i < datos.length && cont < 4; i++) {
        var nombre = String(datos[i][1] || '').toLowerCase();
        var prov   = String(datos[i][2] || '').toLowerCase();
        if (nombre.includes(query) || prov.includes(query)) {
          resultados.push({
            modulo:    'licitaciones',
            tipo:      'Convenio',
            id:        datos[i][0],
            titulo:    datos[i][1] || '',
            subtitulo: datos[i][2] || '',
            meta:      '',
            url:       '/convenios'
          });
          cont++;
        }
      }
    }
  } catch(e) { Logger.log('busquedaGlobal convenios: ' + e.message); }

  return {
    resultados: resultados,
    total:      resultados.length,
    query:      q
  };
}