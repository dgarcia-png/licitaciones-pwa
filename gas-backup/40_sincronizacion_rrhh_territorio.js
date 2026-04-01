// ============================================================================
// 40_sincronizacion_rrhh_territorio.gs — Sincronización RRHH ↔ Territorio
// ============================================================================
// Mantiene sincronizados:
//   EMPLEADOS.centro ↔ ASIGNACIONES_CENTROS
//   - Alta empleado con centro → crear asignación en territorio
//   - Cambio de centro en empleado → finalizar asignación vieja, crear nueva
//   - Asignar personal en territorio → actualizar campo centro del empleado
//   - Desasignar personal → limpiar campo centro del empleado
//   - Baja empleado → finalizar todas las asignaciones activas
// ============================================================================

/**
 * Después de dar de alta un empleado con centro asignado,
 * crea automáticamente la asignación en ASIGNACIONES_CENTROS
 */
function sincronizarAltaEmpleadoACentro_(empleadoId, data) {
  if (!data.centro || !empleadoId) return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('ASIGNACIONES_CENTROS');
  if (!hoja) return;

  // Verificar que no existe ya una asignación activa para este empleado en este centro
  if (hoja.getLastRow() > 1) {
    var datos = hoja.getDataRange().getValues();
    for (var i = 1; i < datos.length; i++) {
      if (String(datos[i][2]) === String(empleadoId) && datos[i][10] === 'activo') {
        // Ya tiene asignación activa, no duplicar
        return;
      }
    }
  }

  // Buscar el centro_id que coincida con el nombre del centro
  var centroId = buscarCentroIdPorNombre_(data.centro);

  if (centroId) {
    try {
      asignarPersonalCentro_({
        centro_id:        centroId,
        empleado_id:      empleadoId,
        nombre_empleado:  (data.nombre || '') + ' ' + (data.apellidos || ''),
        dni:              data.dni || '',
        categoria:        data.categoria || '',
        horas_semanales:  data.jornada || 38,
        turno:            data.turno || 'Mañana',
        fecha_inicio:     data.fecha_alta || Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM-dd'),
        notas:            'Auto-asignado desde alta RRHH'
      });
    } catch(e) {
      Logger.log('Error sincronizando alta a centro: ' + e.message);
    }
  }
}

/**
 * Cuando se actualiza el campo centro de un empleado,
 * finaliza la asignación anterior y crea una nueva
 */
function sincronizarCambiocentroEmpleado_(empleadoId, centroAnterior, centroNuevo, data) {
  if (!empleadoId) return;
  if (centroAnterior === centroNuevo) return; // Sin cambio real

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('ASIGNACIONES_CENTROS');
  if (!hoja || hoja.getLastRow() <= 1) {
    // No hay hoja → si hay centro nuevo, crear asignación directa
    if (centroNuevo) {
      var centroIdNew = buscarCentroIdPorNombre_(centroNuevo);
      if (centroIdNew) {
        asignarPersonalCentro_({
          centro_id: centroIdNew, empleado_id: empleadoId,
          nombre_empleado: (data.nombre || '') + ' ' + (data.apellidos || ''),
          horas_semanales: data.jornada || 38, turno: data.turno || 'Mañana',
          notas: 'Auto-asignado desde cambio centro RRHH'
        });
      }
    }
    return;
  }

  var datos = hoja.getDataRange().getValues();
  var hoy = Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM-dd');

  // 1. Finalizar asignaciones activas previas de este empleado
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][2]) === String(empleadoId) && datos[i][10] === 'activo') {
      hoja.getRange(i + 1, 10).setValue(hoy);        // fecha_fin
      hoja.getRange(i + 1, 11).setValue('finalizado');// estado
      // Actualizar contador del centro anterior
      try { actualizarContadorPersonal_(datos[i][1]); } catch(e) {}
    }
  }

  // 2. Si hay centro nuevo, crear nueva asignación
  if (centroNuevo) {
    var centroIdNuevo = buscarCentroIdPorNombre_(centroNuevo);
    if (centroIdNuevo) {
      try {
        asignarPersonalCentro_({
          centro_id:       centroIdNuevo,
          empleado_id:     empleadoId,
          nombre_empleado: (data.nombre || '') + ' ' + (data.apellidos || ''),
          dni:             data.dni || '',
          categoria:       data.categoria || '',
          horas_semanales: data.jornada || 38,
          turno:           data.turno || 'Mañana',
          fecha_inicio:    hoy,
          notas:           'Auto-asignado desde cambio centro RRHH'
        });
      } catch(e) {
        Logger.log('Error creando nueva asignación: ' + e.message);
      }
    }
  }
}

/**
 * Cuando se asigna personal desde Territorio,
 * actualiza el campo centro en la ficha RRHH del empleado
 */
function sincronizarAsignacionAEmpleado_(empleadoId, centroId) {
  if (!empleadoId || !centroId) return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Obtener nombre del centro
  var nombreCentro = '';
  var hojaCentros = ss.getSheetByName('CENTROS_SERVICIO');
  if (hojaCentros && hojaCentros.getLastRow() > 1) {
    var datosCentros = hojaCentros.getDataRange().getValues();
    for (var c = 1; c < datosCentros.length; c++) {
      if (datosCentros[c][0] === centroId) {
        nombreCentro = datosCentros[c][1] || '';
        break;
      }
    }
  }
  if (!nombreCentro) return;

  // Actualizar campo centro en EMPLEADOS
  var hojaEmpleados = ss.getSheetByName('EMPLEADOS');
  if (!hojaEmpleados || hojaEmpleados.getLastRow() <= 1) return;

  var datosEmp = hojaEmpleados.getDataRange().getValues();
  for (var i = 1; i < datosEmp.length; i++) {
    if (String(datosEmp[i][0]) === String(empleadoId)) {
      var centroActual = String(datosEmp[i][16] || '');
      if (centroActual !== nombreCentro) {
        hojaEmpleados.getRange(i + 1, 17).setValue(nombreCentro); // col 17 = centro
        hojaEmpleados.getRange(i + 1, 26).setValue(new Date());   // col 26 = fecha modificación
      }
      break;
    }
  }
}

/**
 * Cuando se desasigna personal desde Territorio,
 * limpia el campo centro del empleado SI no tiene otras asignaciones activas
 */
function sincronizarDesasignacionAEmpleado_(empleadoId, centroId) {
  if (!empleadoId) return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Comprobar si tiene otras asignaciones activas
  var hojaAsig = ss.getSheetByName('ASIGNACIONES_CENTROS');
  if (hojaAsig && hojaAsig.getLastRow() > 1) {
    var datosAsig = hojaAsig.getDataRange().getValues();
    for (var i = 1; i < datosAsig.length; i++) {
      if (String(datosAsig[i][2]) === String(empleadoId) &&
          datosAsig[i][10] === 'activo' &&
          datosAsig[i][1] !== centroId) {
        // Tiene otra asignación activa en otro centro → actualizar a ese centro
        sincronizarAsignacionAEmpleado_(empleadoId, datosAsig[i][1]);
        return;
      }
    }
  }

  // No tiene más asignaciones activas → limpiar campo centro
  var hojaEmpleados = ss.getSheetByName('EMPLEADOS');
  if (!hojaEmpleados || hojaEmpleados.getLastRow() <= 1) return;

  var datosEmp = hojaEmpleados.getDataRange().getValues();
  for (var i = 1; i < datosEmp.length; i++) {
    if (String(datosEmp[i][0]) === String(empleadoId)) {
      hojaEmpleados.getRange(i + 1, 17).setValue(''); // Limpiar centro
      hojaEmpleados.getRange(i + 1, 26).setValue(new Date());
      break;
    }
  }
}

/**
 * Cuando un empleado se da de baja,
 * finaliza todas sus asignaciones activas en territorio
 */
function sincronizarBajaEmpleado_(empleadoId) {
  if (!empleadoId) return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('ASIGNACIONES_CENTROS');
  if (!hoja || hoja.getLastRow() <= 1) return;

  var datos = hoja.getDataRange().getValues();
  var hoy = Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM-dd');
  var centrosAfectados = [];

  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][2]) === String(empleadoId) && datos[i][10] === 'activo') {
      hoja.getRange(i + 1, 10).setValue(hoy);
      hoja.getRange(i + 1, 11).setValue('baja');
      centrosAfectados.push(datos[i][1]);
    }
  }

  // Actualizar contadores de los centros afectados
  var centrosUnicos = [];
  centrosAfectados.forEach(function(c) {
    if (centrosUnicos.indexOf(c) === -1) centrosUnicos.push(c);
  });
  centrosUnicos.forEach(function(cId) {
    try { actualizarContadorPersonal_(cId); } catch(e) {}
  });
}

// ════════════════════════════════════════════════════════════════════════════
// HELPER — Buscar centro_id por nombre
// ════════════════════════════════════════════════════════════════════════════

function buscarCentroIdPorNombre_(nombreCentro) {
  if (!nombreCentro) return null;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('CENTROS_SERVICIO');
  if (!hoja || hoja.getLastRow() <= 1) return null;

  var datos = hoja.getDataRange().getValues();
  var nombreNorm = nombreCentro.toLowerCase().trim();

  // Búsqueda exacta
  for (var i = 1; i < datos.length; i++) {
    if ((datos[i][1] || '').toLowerCase().trim() === nombreNorm) return datos[i][0];
  }

  // Búsqueda parcial (contiene)
  for (var j = 1; j < datos.length; j++) {
    var nom = (datos[j][1] || '').toLowerCase().trim();
    if (nom.indexOf(nombreNorm) !== -1 || nombreNorm.indexOf(nom) !== -1) return datos[j][0];
  }

  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// HELPER — Obtener centro anterior de un empleado (para detectar cambios)
// ════════════════════════════════════════════════════════════════════════════

function obtenerCentroActualEmpleado_(empleadoId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('EMPLEADOS');
  if (!hoja || hoja.getLastRow() <= 1) return '';

  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][0]) === String(empleadoId)) {
      return String(datos[i][16] || ''); // col 17 (index 16) = centro
    }
  }
  return '';
}