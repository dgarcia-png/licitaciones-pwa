// ============================================================================
// 47_papelera.gs — Papelera y soft delete
// Versión: 1.0 | Fecha: 2 Abril 2026
//
// Proporciona:
//   · Papelera genérica para eliminarRegistro_ (PRL, RGPD, Ausencias, etc.)
//   · Archivar/restaurar Oportunidades (usa columna estado)
//   · Reactivar Empleados en baja
// ============================================================================

var HOJA_PAPELERA = 'PAPELERA';

// ── Inicializar hoja PAPELERA ────────────────────────────────────────────────
function inicializarPapelera_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(HOJA_PAPELERA)) return;
  var h = ss.insertSheet(HOJA_PAPELERA);
  h.getRange(1,1,1,6).setValues([[
    'ID_Papelera','Hoja_Origen','ID_Original','Datos_JSON','Borrado_Por','Fecha_Borrado'
  ]]).setBackground('#b71c1c').setFontColor('#fff').setFontWeight('bold');
  h.setFrozenRows(1);
  h.setColumnWidth(4, 400);
}

// ── Mover registro a papelera en lugar de borrarlo físicamente ───────────────
// Llamado desde eliminarRegistro_ (00b_doGet_doPost.gs)
function moverAPapelera_(nombreHoja, id, usuarioEmail) {
  if (!id) return { ok: false, error: 'ID requerido' };

  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(nombreHoja);
  if (!hoja) return { ok: false, error: 'Hoja no encontrada: ' + nombreHoja };

  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][0]) === String(id)) {

      // Guardar fila completa como JSON
      var cabeceras = hoja.getRange(1, 1, 1, datos[0].length).getValues()[0];
      var registro  = {};
      for (var c = 0; c < cabeceras.length; c++) {
        var val = datos[i][c];
        registro[cabeceras[c] || 'col_' + c] = val instanceof Date
          ? Utilities.formatDate(val, 'Europe/Madrid', 'yyyy-MM-dd HH:mm:ss')
          : val;
      }

      // Escribir en papelera
      inicializarPapelera_();
      var hojaPapelera = ss.getSheetByName(HOJA_PAPELERA);
      var idPapelera   = 'PAP-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random()*1000);
      hojaPapelera.appendRow([
        idPapelera,
        nombreHoja,
        id,
        JSON.stringify(registro),
        usuarioEmail || 'desconocido',
        new Date()
      ]);

      // Registrar en auditoría
      try {
        var hojaAudit = ss.getSheetByName('AUDITORIA');
        if (hojaAudit) {
          var resumen = Object.values(registro).slice(1, 5).join(' ').substring(0, 100);
          hojaAudit.appendRow([
            new Date(), usuarioEmail || 'desconocido', '', '',
            'PAPELERA: ' + nombreHoja + ' | ID: ' + id + ' | ' + resumen,
            '', nombreHoja
          ]);
        }
      } catch(eAudit) { Logger.log('Error auditoría papelera: ' + eAudit.message); }

      // Borrar del original
      hoja.deleteRow(i + 1);
      Logger.log('🗑️→📦 Movido a papelera: ' + nombreHoja + ' ID=' + id + ' por ' + (usuarioEmail || 'desconocido'));
      return { ok: true, id_papelera: idPapelera };
    }
  }
  return { ok: false, error: 'Registro no encontrado' };
}

// ── Restaurar registro desde papelera a su hoja original ────────────────────
function restaurarDePapelera_(idPapelera) {
  inicializarPapelera_();
  var ss            = SpreadsheetApp.getActiveSpreadsheet();
  var hojaPapelera  = ss.getSheetByName(HOJA_PAPELERA);
  if (!hojaPapelera) return { ok: false, error: 'No existe la papelera' };

  var datos = hojaPapelera.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][0]) === String(idPapelera)) {
      var nombreHoja  = datos[i][1];
      var datosJSON   = datos[i][3];

      var hoja = ss.getSheetByName(nombreHoja);
      if (!hoja) return { ok: false, error: 'La hoja destino ya no existe: ' + nombreHoja };

      // Reconstruir fila
      var registro = {};
      try { registro = JSON.parse(datosJSON); } catch(e) { return { ok: false, error: 'Datos corruptos en papelera' }; }

      var cabeceras    = hoja.getRange(1, 1, 1, hoja.getLastColumn() || 1).getValues()[0];
      var filaRestaurar = cabeceras.map(function(cab) { return registro[cab] !== undefined ? registro[cab] : ''; });

      hoja.appendRow(filaRestaurar);
      hojaPapelera.deleteRow(i + 1);

      Logger.log('♻️ Restaurado de papelera: ' + nombreHoja + ' ID=' + datos[i][2]);
      return { ok: true, hoja: nombreHoja, id_original: datos[i][2] };
    }
  }
  return { ok: false, error: 'Item no encontrado en papelera' };
}

// ── Listar items de papelera ─────────────────────────────────────────────────
function obtenerPapeleraAPI_(filtro) {
  inicializarPapelera_();
  var ss           = SpreadsheetApp.getActiveSpreadsheet();
  var hojaPapelera = ss.getSheetByName(HOJA_PAPELERA);
  if (!hojaPapelera || hojaPapelera.getLastRow() <= 1) return { items: [], total: 0 };

  var datos = hojaPapelera.getDataRange().getValues();
  var items = [];
  var hojaFiltro = filtro ? filtro.hoja : null;

  for (var i = datos.length - 1; i >= 1; i--) {
    if (!datos[i][0]) continue;
    if (hojaFiltro && datos[i][1] !== hojaFiltro) continue;

    // Extraer resumen legible de los datos
    var resumen = '';
    try {
      var reg = JSON.parse(datos[i][3] || '{}');
      var vals = Object.values(reg).filter(function(v) { return v && String(v).trim(); });
      resumen = vals.slice(1, 4).join(' · ').substring(0, 120);
    } catch(e) { resumen = '(sin datos)'; }

    items.push({
      id_papelera:  datos[i][0],
      hoja:         datos[i][1],
      id_original:  datos[i][2],
      resumen:      resumen,
      borrado_por:  datos[i][4],
      fecha_borrado: datos[i][5] instanceof Date
        ? Utilities.formatDate(datos[i][5], 'Europe/Madrid', 'dd/MM/yyyy HH:mm')
        : String(datos[i][5])
    });
    if (items.length >= 100) break;
  }

  return { items: items, total: items.length };
}

// ── Vaciar papelera (borrado permanente de items antiguos) ───────────────────
function vaciarPapelera_(diasAntiguedad) {
  inicializarPapelera_();
  var ss           = SpreadsheetApp.getActiveSpreadsheet();
  var hojaPapelera = ss.getSheetByName(HOJA_PAPELERA);
  if (!hojaPapelera || hojaPapelera.getLastRow() <= 1) return { ok: true, eliminados: 0 };

  var limite      = new Date();
  limite.setDate(limite.getDate() - (diasAntiguedad || 30));
  var datos       = hojaPapelera.getDataRange().getValues();
  var filasABorrar = [];

  for (var i = datos.length - 1; i >= 1; i--) {
    if (!datos[i][0]) continue;
    var fechaBorrado = datos[i][5] instanceof Date ? datos[i][5] : new Date(datos[i][5]);
    if (!isNaN(fechaBorrado.getTime()) && fechaBorrado < limite) {
      filasABorrar.push(i + 1);
    }
  }

  filasABorrar.forEach(function(fila) { hojaPapelera.deleteRow(fila); });
  return { ok: true, eliminados: filasABorrar.length };
}


// ============================================================================
// ARCHIVAR / RESTAURAR OPORTUNIDADES
// Usa la columna estado — no borra físicamente
// ============================================================================

function archivarOportunidad_(id) {
  if (!id) return { ok: false, error: 'ID requerido' };
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_OPORTUNIDADES);
  if (!hoja) return { ok: false, error: 'Hoja OPORTUNIDADES no encontrada' };

  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][0]) === String(id)) {
      var estadoAnterior = datos[i][11] || 'nueva'; // columna L = estado
      hoja.getRange(i + 1, 12).setValue('archivada');
      // Guardar estado anterior en notas (col O = notas, índice 14)
      var notas = String(datos[i][14] || '');
      if (!notas.includes('[estado_pre_archivo:')) {
        hoja.getRange(i + 1, 15).setValue(notas + '[estado_pre_archivo:' + estadoAnterior + ']');
      }
      return { ok: true, estado_anterior: estadoAnterior };
    }
  }
  return { ok: false, error: 'Oportunidad no encontrada' };
}

function restaurarOportunidad_(id) {
  if (!id) return { ok: false, error: 'ID requerido' };
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_OPORTUNIDADES);
  if (!hoja) return { ok: false, error: 'Hoja OPORTUNIDADES no encontrada' };

  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][0]) === String(id)) {
      var notas          = String(datos[i][14] || '');
      var match          = notas.match(/\[estado_pre_archivo:([^\]]+)\]/);
      var estadoRestaurado = match ? match[1] : 'nueva';

      hoja.getRange(i + 1, 12).setValue(estadoRestaurado);
      // Limpiar marcador de archivo en notas
      hoja.getRange(i + 1, 15).setValue(notas.replace(/\[estado_pre_archivo:[^\]]+\]/g, '').trim());
      return { ok: true, estado_restaurado: estadoRestaurado };
    }
  }
  return { ok: false, error: 'Oportunidad no encontrada' };
}


// ============================================================================
// REACTIVAR EMPLEADO EN BAJA
// ============================================================================

function restaurarEmpleado_(data) {
  if (!data.id) return { ok: false, error: 'ID requerido' };
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var hoja  = ss.getSheetByName(HOJA_EMPLEADOS);
  if (!hoja) return { ok: false, error: 'Hoja EMPLEADOS no encontrada' };

  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][0]) === String(data.id)) {
      var estadoActual = datos[i][21]; // col V = estado (índice 21)
      if (estadoActual !== 'baja') {
        return { ok: false, error: 'El empleado no está en baja (estado actual: ' + estadoActual + ')' };
      }
      hoja.getRange(i + 1, 22).setValue('activo');   // col V = estado
      hoja.getRange(i + 1, 16).setValue('');         // col P = fecha_baja → limpiar
      registrarHistorial_(data.id, 'Reactivación', 'baja → activo', data.motivo || 'Reactivado manualmente');
      return { ok: true };
    }
  }
  return { ok: false, error: 'Empleado no encontrado' };
}