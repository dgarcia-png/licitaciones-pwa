// ============================================================================
// 41_certificaciones_carnets.gs — Módulo Certificaciones y Carnets
// ============================================================================
// Gestiona: carnet conducir, manipulador alimentos, fitosanitario, PRL,
// plataformas elevadoras, socorrista, legionella, etc.
// Con fechas de vencimiento y alertas automáticas.
// Hoja: CERTIFICACIONES
// Columnas: ID, empleado_id, nombre_empleado, dni, tipo, descripcion,
//           fecha_obtencion, fecha_vencimiento, numero_certificado,
//           organismo_emisor, documento_url, estado, notas, creado, modificado
// ============================================================================

var HOJA_CERTIFICACIONES = 'CERTIFICACIONES';

function crearHojaCertificaciones_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(HOJA_CERTIFICACIONES)) return;
  var h = ss.insertSheet(HOJA_CERTIFICACIONES);
  var cab = [
    'ID', 'Empleado ID', 'Nombre empleado', 'DNI', 'Tipo', 'Descripción',
    'Fecha obtención', 'Fecha vencimiento', 'Nº certificado',
    'Organismo emisor', 'Documento URL', 'Estado', 'Notas', 'Creado', 'Modificado'
  ];
  h.getRange(1, 1, 1, cab.length).setValues([cab]);
  h.getRange(1, 1, 1, cab.length).setBackground('#0d47a1').setFontColor('#fff').setFontWeight('bold');
  h.setFrozenRows(1);
  h.setColumnWidth(3, 200);
  h.setColumnWidth(5, 180);
  h.setColumnWidth(6, 250);
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

function obtenerCertificacionesAPI_(filtros) {
  crearHojaCertificaciones_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CERTIFICACIONES);
  if (!hoja || hoja.getLastRow() <= 1) return { certificaciones: [], total: 0 };

  var datos = hoja.getDataRange().getValues();
  var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  var certs = [];

  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;

    var fechaVenc = datos[i][7];
    var estado = 'vigente';
    var diasRestantes = null;

    if (fechaVenc) {
      try {
        var fv = fechaVenc instanceof Date ? fechaVenc : new Date(fechaVenc);
        if (!isNaN(fv.getTime())) {
          diasRestantes = Math.floor((fv - hoy) / 86400000);
          if (diasRestantes < 0) estado = 'vencido';
          else if (diasRestantes <= 30) estado = 'por_vencer';
          else if (diasRestantes <= 90) estado = 'proximo';
          else estado = 'vigente';
        }
      } catch(e) {}
    } else {
      estado = 'sin_vencimiento';
    }

    // Actualizar estado en hoja si cambió
    if (datos[i][11] !== estado) {
      hoja.getRange(i + 1, 12).setValue(estado);
    }

    var cert = {
      id:                datos[i][0],
      empleado_id:       datos[i][1],
      nombre_empleado:   datos[i][2],
      dni:               datos[i][3],
      tipo:              datos[i][4],
      descripcion:       datos[i][5],
      fecha_obtencion:   datos[i][6] instanceof Date ? Utilities.formatDate(datos[i][6], 'Europe/Madrid', 'yyyy-MM-dd') : String(datos[i][6] || ''),
      fecha_vencimiento: datos[i][7] instanceof Date ? Utilities.formatDate(datos[i][7], 'Europe/Madrid', 'yyyy-MM-dd') : String(datos[i][7] || ''),
      numero_certificado:datos[i][8] || '',
      organismo_emisor:  datos[i][9] || '',
      documento_url:     datos[i][10] || '',
      estado:            estado,
      dias_restantes:    diasRestantes,
      notas:             datos[i][12] || ''
    };

    // Aplicar filtros
    if (filtros) {
      if (filtros.empleado_id && String(cert.empleado_id) !== String(filtros.empleado_id)) continue;
      if (filtros.tipo && cert.tipo !== filtros.tipo) continue;
      if (filtros.estado && cert.estado !== filtros.estado) continue;
    }

    certs.push(cert);
  }

  // Ordenar: vencidos primero, luego por_vencer, luego por fecha
  certs.sort(function(a, b) {
    var prioridad = { vencido: 0, por_vencer: 1, proximo: 2, vigente: 3, sin_vencimiento: 4 };
    var pa = prioridad[a.estado] || 5;
    var pb = prioridad[b.estado] || 5;
    if (pa !== pb) return pa - pb;
    return (a.fecha_vencimiento || 'z').localeCompare(b.fecha_vencimiento || 'z');
  });

  return { certificaciones: certs, total: certs.length };
}

function agregarCertificacion_(data) {
  crearHojaCertificaciones_();
  if (!data.empleado_id || !data.tipo) return { ok: false, error: 'Empleado y tipo requeridos' };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CERTIFICACIONES);

  // Obtener datos del empleado si no vienen
  var nombre = data.nombre_empleado || '';
  var dni = data.dni || '';
  if ((!nombre || !dni) && data.empleado_id) {
    var emp = obtenerEmpleadoAPI_(data.empleado_id);
    if (!emp.error) {
      nombre = nombre || ((emp.nombre || '') + ' ' + (emp.apellidos || ''));
      dni = dni || emp.dni || '';
    }
  }

  // Verificar duplicado (mismo empleado + tipo + no vencido)
  if (hoja.getLastRow() > 1) {
    var datos = hoja.getDataRange().getValues();
    for (var i = 1; i < datos.length; i++) {
      if (String(datos[i][1]) === String(data.empleado_id) && datos[i][4] === data.tipo) {
        var estadoExist = datos[i][11];
        if (estadoExist !== 'vencido') {
          return { ok: false, error: 'Ya existe una certificación vigente de tipo "' + data.tipo + '" para este empleado' };
        }
      }
    }
  }

  var id = 'CERT-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMdd-HHmmss') +
           '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

  hoja.appendRow([
    id,
    data.empleado_id,
    nombre,
    dni,
    data.tipo,
    data.descripcion || data.tipo,
    data.fecha_obtencion || '',
    data.fecha_vencimiento || '',
    data.numero_certificado || '',
    data.organismo_emisor || '',
    data.documento_url || '',
    'vigente',
    data.notas || '',
    new Date(),
    new Date()
  ]);

  return { ok: true, id: id };
}

function actualizarCertificacion_(data) {
  if (!data.id) return { ok: false, error: 'ID requerido' };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CERTIFICACIONES);
  if (!hoja || hoja.getLastRow() <= 1) return { ok: false, error: 'Sin datos' };

  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === data.id) {
      var fila = i + 1;
      if (data.tipo !== undefined)              hoja.getRange(fila, 5).setValue(data.tipo);
      if (data.descripcion !== undefined)       hoja.getRange(fila, 6).setValue(data.descripcion);
      if (data.fecha_obtencion !== undefined)   hoja.getRange(fila, 7).setValue(data.fecha_obtencion);
      if (data.fecha_vencimiento !== undefined) hoja.getRange(fila, 8).setValue(data.fecha_vencimiento);
      if (data.numero_certificado !== undefined)hoja.getRange(fila, 9).setValue(data.numero_certificado);
      if (data.organismo_emisor !== undefined)  hoja.getRange(fila, 10).setValue(data.organismo_emisor);
      if (data.documento_url !== undefined)     hoja.getRange(fila, 11).setValue(data.documento_url);
      if (data.notas !== undefined)             hoja.getRange(fila, 13).setValue(data.notas);
      hoja.getRange(fila, 15).setValue(new Date());
      return { ok: true };
    }
  }
  return { ok: false, error: 'No encontrado' };
}

function eliminarCertificacion_(id) {
  return eliminarRegistro_(HOJA_CERTIFICACIONES, id);
}

// ── DASHBOARD ────────────────────────────────────────────────────────────────

function dashboardCertificaciones_() {
  var r = obtenerCertificacionesAPI_(null);
  var certs = r.certificaciones || [];

  var stats = { total: certs.length, vigentes: 0, por_vencer: 0, vencidos: 0, proximos: 0, sin_vencimiento: 0 };
  var porTipo = {};
  var alertas = [];

  certs.forEach(function(c) {
    stats[c.estado === 'por_vencer' ? 'por_vencer' : c.estado === 'vencido' ? 'vencidos' : c.estado === 'proximo' ? 'proximos' : c.estado === 'sin_vencimiento' ? 'sin_vencimiento' : 'vigentes']++;
    porTipo[c.tipo] = (porTipo[c.tipo] || 0) + 1;

    if (c.estado === 'vencido') {
      alertas.push({
        nivel: 'alta', tipo: c.tipo,
        msg: c.tipo + ' de ' + c.nombre_empleado + ' VENCIDO hace ' + Math.abs(c.dias_restantes) + ' días',
        empleado_id: c.empleado_id, cert_id: c.id
      });
    } else if (c.estado === 'por_vencer') {
      alertas.push({
        nivel: 'media', tipo: c.tipo,
        msg: c.tipo + ' de ' + c.nombre_empleado + ' vence en ' + c.dias_restantes + ' días',
        empleado_id: c.empleado_id, cert_id: c.id
      });
    }
  });

  // Tipos de certificación disponibles
  var tiposDisponibles = CERTIFICACIONES_EXTRA.map(function(c) {
    return { id: c.id, label: c.label, caduca: c.caduca, modulo: c.modulo };
  });

  return {
    stats: stats,
    por_tipo: porTipo,
    alertas: alertas,
    tipos_disponibles: tiposDisponibles,
    total_alertas: alertas.length
  };
}

// ── CERTIFICACIONES DE UN EMPLEADO ───────────────────────────────────────────

function certificacionesEmpleado_(empleadoId) {
  if (!empleadoId) return { certificaciones: [], tipos_faltantes: [] };

  var r = obtenerCertificacionesAPI_({ empleado_id: empleadoId });
  var certs = r.certificaciones || [];
  var tiposObtenidos = certs.map(function(c) { return c.tipo; });

  // Calcular qué certificaciones le faltan (basado en CERTIFICACIONES_EXTRA)
  var faltantes = CERTIFICACIONES_EXTRA.filter(function(ce) {
    return tiposObtenidos.indexOf(ce.label) === -1 && tiposObtenidos.indexOf(ce.id) === -1;
  }).map(function(ce) {
    return { id: ce.id, label: ce.label, caduca: ce.caduca };
  });

  return {
    certificaciones: certs,
    total: certs.length,
    tipos_faltantes: faltantes,
    vencidos: certs.filter(function(c) { return c.estado === 'vencido'; }).length,
    por_vencer: certs.filter(function(c) { return c.estado === 'por_vencer'; }).length
  };
}

// ── BATCH para la página ─────────────────────────────────────────────────────

function batchPaginaCertificaciones_() {
  return {
    dashboard:       dashboardCertificaciones_(),
    certificaciones: obtenerCertificacionesAPI_(null),
    empleados:       obtenerEmpleadosAPI_(null)
  };
}

// ── Wrapper público para inicializar ─────────────────────────────────────────

function inicializarCertificaciones() {
  crearHojaCertificaciones_();
  Logger.log('✅ Hoja CERTIFICACIONES creada/verificada');
}