function borrarTodo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ['OPORTUNIDADES', 'HISTORICO_ADJUDICACIONES'].forEach(function(nombre) {
    var h = ss.getSheetByName(nombre);
    if (h && h.getLastRow() > 1) {
      h.deleteRows(2, h.getLastRow() - 1);
      Logger.log('✅ ' + nombre);
    }
  });
  try {
    CacheService.getScriptCache().removeAll(['batch_opos', 'batch_stats', 'batch_dashboard']);
  } catch(e) {}
  Logger.log('Listo');
}