// ============================================================================
// 28_incidencias_sla.gs — Módulo Incidencias con SLA y escalado automático
// Versión: 1.1 | Fecha: 31 Marzo 2026
// CAMBIOS: añadidas asignarIncidencia_, comentarios incidencia (CRUD)
// ============================================================================

var SLA_HORAS = {
  critica:  4,   // 4 horas para resolver
  alta:     24,  // 1 día
  media:    72,  // 3 días
  baja:     168  // 7 días
};

var SLA_TIPOS = {
  limpieza:      'media',
  mantenimiento: 'alta',
  seguridad:     'critica',
  averias:       'alta',
  suministros:   'baja',
  quejas:        'media',
  accidente:     'critica',
  general:       'media'
};

// ── Crear/actualizar incidencia con SLA ──────────────────────────────────────
function crearIncidenciaSLA_(data) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('INCIDENCIAS');
  if (!hoja) return crearIncidencia_(data); // fallback

  var id    = 'INC-' + Utilities.formatDate(new Date(),'Europe/Madrid','yyyyMMddHHmmss');
  var prioridad = data.prioridad || SLA_TIPOS[data.tipo] || 'media';
  var horasSLA  = SLA_HORAS[prioridad] || 72;

  // Calcular fecha límite SLA
  var fechaLimSLA = new Date();
  fechaLimSLA.setHours(fechaLimSLA.getHours() + horasSLA);
  var slaLimite = Utilities.formatDate(fechaLimSLA,'Europe/Madrid','yyyy-MM-dd HH:mm');

  hoja.appendRow([
    id,
    data.centro_id||'', data.centro_nombre||'',
    data.empleado_id||'', data.nombre_empleado||'',
    data.fecha||Utilities.formatDate(new Date(),'Europe/Madrid','yyyy-MM-dd'),
    data.tipo||'general',
    data.descripcion||'',
    prioridad,
    'abierta',
    data.asignado_a||'',
    '', // fecha_resolucion
    '', // resolucion
    new Date(),
    slaLimite,   // col 15 = SLA_Limite
    horasSLA,    // col 16 = SLA_Horas
    'en_plazo',  // col 17 = SLA_Estado
    0            // col 18 = Escalaciones
  ]);

  // Notificar si es crítica o alta
  if (prioridad === 'critica' || prioridad === 'alta') {
    try {
      var email = Session.getActiveUser().getEmail();
      if (email) {
        MailApp.sendEmail(email,
          '🚨 Forgeser — Incidencia ' + prioridad.toUpperCase() + ': ' + data.centro_nombre,
          'Nueva incidencia ' + prioridad + ' en ' + data.centro_nombre + '\n\n' +
          'Tipo: ' + data.tipo + '\n' +
          'Descripción: ' + data.descripcion + '\n' +
          'SLA: resolver antes de ' + slaLimite
        );
      }
    } catch(eM) {}
  }

  return { ok: true, id: id, sla_limite: slaLimite, horas_sla: horasSLA };
}

// ── Verificar SLA de todas las incidencias abiertas (trigger cada hora) ──────
function verificarSLAIncidencias() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('INCIDENCIAS');
  if (!hoja || hoja.getLastRow() <= 1) return { verificadas: 0 };

  var ahora  = new Date();
  var datos  = hoja.getDataRange().getValues();
  var vencidas = 0, escaladas = 0;

  for (var i = 1; i < datos.length; i++) {
    var estado = String(datos[i][9]||'');
    if (estado === 'resuelta' || estado === 'cerrada') continue;

    var slaLimStr = datos[i][14]; // col 15 = SLA_Limite
    if (!slaLimStr) continue;

    var slaLim;
    try { slaLim = new Date(slaLimStr); } catch(e) { continue; }
    if (isNaN(slaLim.getTime())) continue;

    var horasRestantes = (slaLim - ahora) / 3600000;
    var prioridad = String(datos[i][8]||'media');
    var escalaciones = parseInt(datos[i][17]||0);

    if (horasRestantes <= 0) {
      // SLA VENCIDO
      hoja.getRange(i+1, 17).setValue('vencido');
      vencidas++;

      // Escalar si no se ha escalado ya
      if (escalaciones < 3) {
        hoja.getRange(i+1, 18).setValue(escalaciones + 1);
        escalarIncidencia_(datos[i], escalaciones + 1, ahora);
        escaladas++;
      }
    } else if (horasRestantes <= 2 && String(datos[i][16]||'') !== 'aviso_enviado') {
      // Próximo a vencer — avisar
      hoja.getRange(i+1, 17).setValue('proximo_vencer');
      try {
        var email2 = Session.getActiveUser().getEmail();
        if (email2) {
          MailApp.sendEmail(email2,
            '⚠️ Forgeser — SLA próximo a vencer: ' + datos[i][2],
            'La incidencia ' + datos[i][0] + ' en ' + datos[i][2] +
            ' vence en ' + Math.round(horasRestantes) + ' horas.\n' +
            'Descripción: ' + datos[i][7]
          );
        }
      } catch(eM) {}
    } else {
      hoja.getRange(i+1, 17).setValue('en_plazo');
    }
  }

  Logger.log('SLA verificado: ' + vencidas + ' vencidas, ' + escaladas + ' escaladas');
  return { verificadas: datos.length - 1, vencidas: vencidas, escaladas: escaladas };
}

function escalarIncidencia_(fila, nivel, ahora) {
  try {
    var email = Session.getActiveUser().getEmail();
    if (!email) return;
    var asunto = '🚨 ESCALACIÓN NIVEL ' + nivel + ' — Incidencia ' + fila[0] + ' (' + fila[8] + ')';
    var cuerpo = 'INCIDENCIA SLA VENCIDA — ESCALACIÓN NIVEL ' + nivel + '\n\n' +
      'ID: ' + fila[0] + '\n' +
      'Centro: ' + fila[2] + '\n' +
      'Tipo: ' + fila[6] + '\n' +
      'Prioridad: ' + fila[8] + '\n' +
      'Descripción: ' + fila[7] + '\n' +
      'Fecha apertura: ' + fila[5] + '\n' +
      'SLA límite: ' + fila[14] + '\n' +
      'Escalación automática generada: ' + Utilities.formatDate(ahora,'Europe/Madrid','dd/MM/yyyy HH:mm');
    MailApp.sendEmail(email, asunto, cuerpo);
  } catch(e) {}
}

// ── Dashboard SLA ────────────────────────────────────────────────────────────
function dashboardSLAAPI_() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('INCIDENCIAS');
  if (!hoja || hoja.getLastRow() <= 1) return { total: 0, abiertas: 0, vencidas: 0, en_plazo: 0 };

  var datos = hoja.getDataRange().getValues();
  var abiertas = 0, vencidas = 0, enPlazo = 0, proxVencer = 0;
  var criticas = 0, altas = 0;

  for (var i = 1; i < datos.length; i++) {
    var estado = String(datos[i][9]||'');
    if (estado === 'resuelta' || estado === 'cerrada') continue;
    abiertas++;
    var slaEstado = String(datos[i][16]||'en_plazo');
    if (slaEstado === 'vencido') vencidas++;
    else if (slaEstado === 'proximo_vencer') proxVencer++;
    else enPlazo++;
    var prio = String(datos[i][8]||'');
    if (prio === 'critica') criticas++;
    else if (prio === 'alta') altas++;
  }

  return {
    total: datos.length - 1,
    abiertas: abiertas,
    vencidas: vencidas,
    proximo_vencer: proxVencer,
    en_plazo: enPlazo,
    criticas: criticas,
    altas: altas
  };
}

// ── Configurar trigger SLA ────────────────────────────────────────────────────
function configurarTriggerSLA() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'verificarSLAIncidencias') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  // Verificar cada hora
  ScriptApp.newTrigger('verificarSLAIncidencias')
    .timeBased().everyHours(1).create();
  Logger.log('✅ Trigger SLA configurado — cada hora');
}

// ── Asignar incidencia a responsable ─────────────────────────────────────────
function asignarIncidencia_(data) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('INCIDENCIAS');
  if (!hoja) return { ok: false, error: 'Sin hoja INCIDENCIAS' };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === data.id) {
      hoja.getRange(i+1, 11).setValue(data.asignado_a || '');
      if (data.estado) hoja.getRange(i+1, 10).setValue(data.estado);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Incidencia no encontrada' };
}

// ── Comentarios de incidencia ────────────────────────────────────────────────
function crearHojaComentariosIncSiNoExiste_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName('INCIDENCIAS_COMENTARIOS')) return;
  var h = ss.insertSheet('INCIDENCIAS_COMENTARIOS');
  h.getRange(1,1,1,6).setValues([['ID','Incidencia_ID','Autor','Fecha','Texto','Tipo']])
    .setBackground('#dc2626').setFontColor('#fff').setFontWeight('bold');
  h.setFrozenRows(1);
}

function agregarComentarioIncidencia_(data) {
  crearHojaComentariosIncSiNoExiste_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('INCIDENCIAS_COMENTARIOS');
  var id = 'COM-' + Date.now();
  hoja.appendRow([
    id,
    data.incidencia_id || '',
    data.autor || '',
    new Date(),
    data.texto || '',
    data.tipo || 'comentario'  // comentario, estado, escalacion
  ]);
  return { ok: true, id: id };
}

function obtenerComentariosIncidencia_(incidenciaId) {
  crearHojaComentariosIncSiNoExiste_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('INCIDENCIAS_COMENTARIOS');
  if (!hoja || hoja.getLastRow() <= 1) return { comentarios: [] };
  var datos = hoja.getDataRange().getValues();
  var comentarios = [];
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] === incidenciaId) {
      comentarios.push({
        id:    datos[i][0],
        autor: datos[i][2],
        fecha: datos[i][3] instanceof Date ? Utilities.formatDate(datos[i][3], 'Europe/Madrid', 'dd/MM/yyyy HH:mm') : String(datos[i][3]||''),
        texto: datos[i][4],
        tipo:  datos[i][5]
      });
    }
  }
  return { comentarios: comentarios };
}