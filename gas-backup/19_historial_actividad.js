// ============================================================================
// 19_historial_actividad.gs — Registro de actividad por oportunidad
// Registra automáticamente cada acción relevante del pipeline
// ============================================================================

var HOJA_ACTIVIDAD = 'ACTIVIDAD';

// ── Crear hoja si no existe ──────────────────────────────────────────────────
function crearHojaActividadSiNoExiste_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(HOJA_ACTIVIDAD)) return;
  var hoja = ss.insertSheet(HOJA_ACTIVIDAD);
  var cab = ['ID', 'Oportunidad ID', 'Tipo', 'Descripcion', 'Usuario', 'Fecha', 'Metadata'];
  hoja.getRange(1, 1, 1, cab.length).setValues([cab]);
  hoja.getRange(1, 1, 1, cab.length).setBackground('#1a3c34').setFontColor('#ffffff').setFontWeight('bold');
  hoja.setColumnWidth(4, 500);
  hoja.setFrozenRows(1);
}

// ── Registrar una acción ─────────────────────────────────────────────────────
function registrarActividad_(oportunidadId, tipo, descripcion, usuario, metadata) {
  try {
    crearHojaActividadSiNoExiste_();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var hoja = ss.getSheetByName(HOJA_ACTIVIDAD);
    var id = 'ACT-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') +
             '-' + Math.random().toString(36).substring(2,5).toUpperCase();
    hoja.appendRow([
      id,
      oportunidadId || '',
      tipo || '',
      descripcion || '',
      usuario || 'Sistema',
      new Date(),
      metadata ? JSON.stringify(metadata) : ''
    ]);
  } catch(e) {
    Logger.log('⚠️ registrarActividad_: ' + e.message);
  }
}

// ── También registrar acciones globales (sin oportunidad) ────────────────────
function registrarAccion(descripcion, usuario) {
  registrarActividad_('', 'SISTEMA', descripcion, usuario || 'Sistema', null);
}

// ── Obtener historial de una oportunidad ─────────────────────────────────────
function obtenerActividadOportunidad_(oportunidadId) {
  crearHojaActividadSiNoExiste_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_ACTIVIDAD);
  if (!hoja || hoja.getLastRow() <= 1) return [];

  var datos = hoja.getDataRange().getValues();
  var actividad = [];

  for (var i = datos.length - 1; i >= 1; i--) {
    if (datos[i][1] === oportunidadId) {
      var meta = {};
      try { meta = datos[i][6] ? JSON.parse(datos[i][6]) : {}; } catch(e) {}
      actividad.push({
        id:          datos[i][0],
        tipo:        datos[i][2],
        descripcion: datos[i][3],
        usuario:     datos[i][4],
        fecha:       datos[i][5] ? Utilities.formatDate(new Date(datos[i][5]), 'Europe/Madrid', 'dd/MM/yyyy HH:mm') : '',
        metadata:    meta
      });
    }
    if (actividad.length >= 50) break; // máx 50 eventos
  }

  return actividad;
}

// ── API ──────────────────────────────────────────────────────────────────────
function actividadAPI_(oportunidadId) {
  if (!oportunidadId) return { actividad: [], total: 0 };
  var actividad = obtenerActividadOportunidad_(oportunidadId);
  return { actividad: actividad, total: actividad.length };
}