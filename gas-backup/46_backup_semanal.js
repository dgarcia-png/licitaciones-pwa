// ============================================================================
// 46_backup_semanal.gs — Backup automático semanal a Google Drive
// Versión: 1.0 | Fecha: 2 Abril 2026
// Crea una copia completa de la Spreadsheet cada lunes a las 07:00
// Las copias se guardan en la carpeta BACKUPS dentro de CARPETA_RAIZ_ID
// Se conservan los últimos 8 backups (2 meses) y se eliminan los más antiguos
// ============================================================================

var MAX_BACKUPS = 8; // Número máximo de backups a conservar

// ════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL — llamada por el trigger semanal
// ════════════════════════════════════════════════════════════════

function backupSemanalDrive() {
  try {
    Logger.log('💾 Iniciando backup semanal...');

    var ss        = SpreadsheetApp.getActiveSpreadsheet();
    var nombre    = ss.getName();
    var ahora     = new Date();
    var fechaStr  = Utilities.formatDate(ahora, 'Europe/Madrid', 'yyyy-MM-dd_HH-mm');
    var nombreBackup = 'BACKUP_' + nombre + '_' + fechaStr;

    // Obtener o crear carpeta de backups
    var carpetaBackups = obtenerCarpetaBackups_();

    // Copiar la spreadsheet
    var fileId  = ss.getId();
    var file    = DriveApp.getFileById(fileId);
    var copia   = file.makeCopy(nombreBackup, carpetaBackups);

    Logger.log('✅ Backup creado: ' + nombreBackup + ' (' + copia.getId() + ')');

    // Eliminar backups antiguos si superamos el máximo
    limpiarBackupsAntiguos_(carpetaBackups);

    // Registrar en historial
    var msg = 'Backup semanal creado: ' + nombreBackup;
    try { registrarActividad_('SISTEMA', 'BACKUP', msg, 'Sistema', { archivo: nombreBackup, id: copia.getId() }); } catch(e) {}

    // Notificar por email
    try {
      var dest = Session.getActiveUser().getEmail();
      MailApp.sendEmail(
        dest,
        '✅ Backup Forgeser completado — ' + fechaStr,
        'Se ha creado el backup semanal correctamente.\n\n' +
        'Archivo: ' + nombreBackup + '\n' +
        'Carpeta: ' + carpetaBackups.getUrl() + '\n' +
        'Backups conservados: ' + contarBackups_(carpetaBackups) + ' de ' + MAX_BACKUPS + '\n\n' +
        'Forgeser PWA — Backup automático'
      );
    } catch(e) { Logger.log('⚠️ Email de notificación no enviado: ' + e.message); }

    return { ok: true, nombre: nombreBackup, id: copia.getId(), url: copia.getUrl() };

  } catch(e) {
    Logger.log('❌ Error en backup: ' + e.message);
    // Intentar notificar el fallo
    try {
      MailApp.sendEmail(
        Session.getActiveUser().getEmail(),
        '❌ Error en backup Forgeser — ' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM-dd'),
        'El backup semanal ha fallado con el siguiente error:\n\n' + e.message + '\n\nRevisa los logs de Apps Script.'
      );
    } catch(me) {}
    return { ok: false, error: e.message };
  }
}

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

function obtenerCarpetaBackups_() {
  var carpetaRaizId = PropertiesService.getScriptProperties().getProperty('CARPETA_RAIZ_ID') || '';
  var carpetaRaiz;
  if (carpetaRaizId) {
    try { carpetaRaiz = DriveApp.getFolderById(carpetaRaizId); }
    catch(e) { carpetaRaiz = DriveApp.getRootFolder(); }
  } else {
    carpetaRaiz = DriveApp.getRootFolder();
  }
  return obtenerOCrearCarpeta_('BACKUPS_FORGESER', carpetaRaiz);
}

function limpiarBackupsAntiguos_(carpeta) {
  try {
    var archivos = [];
    var iter = carpeta.getFiles();
    while (iter.hasNext()) {
      var f = iter.next();
      if (f.getName().indexOf('BACKUP_') === 0) {
        archivos.push({ file: f, fecha: f.getDateCreated() });
      }
    }
    // Ordenar por fecha descendente (más reciente primero)
    archivos.sort(function(a, b) { return b.fecha - a.fecha; });

    // Eliminar los que superan el máximo
    for (var i = MAX_BACKUPS; i < archivos.length; i++) {
      Logger.log('🗑️ Eliminando backup antiguo: ' + archivos[i].file.getName());
      archivos[i].file.setTrashed(true);
    }
    Logger.log('✅ Limpieza completada. Backups conservados: ' + Math.min(archivos.length, MAX_BACKUPS));
  } catch(e) {
    Logger.log('⚠️ Error limpiando backups antiguos: ' + e.message);
  }
}

function contarBackups_(carpeta) {
  var count = 0;
  try {
    var iter = carpeta.getFiles();
    while (iter.hasNext()) { iter.next(); count++; }
  } catch(e) {}
  return count;
}

// ════════════════════════════════════════════════════════════════
// CONFIGURAR TRIGGER SEMANAL — ejecutar UNA VEZ manualmente
// ════════════════════════════════════════════════════════════════

function configurarTriggerBackupSemanal() {
  // Eliminar triggers anteriores de backup para evitar duplicados
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'backupSemanalDrive') {
      ScriptApp.deleteTrigger(triggers[i]);
      Logger.log('🗑️ Trigger anterior eliminado');
    }
  }

  // Crear nuevo trigger: cada lunes a las 07:00
  ScriptApp.newTrigger('backupSemanalDrive')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(7)
    .create();

  Logger.log('✅ Trigger backup semanal configurado — lunes 07:00');
  return { ok: true, mensaje: 'Trigger configurado: lunes 07:00' };
}

// ════════════════════════════════════════════════════════════════
// TEST — ejecutar manualmente para verificar que funciona
// ════════════════════════════════════════════════════════════════

function testBackup() {
  var resultado = backupSemanalDrive();
  Logger.log(JSON.stringify(resultado));
}