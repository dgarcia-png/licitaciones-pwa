// ============================================================================
// 42_escaneo_expediente.gs — Escaneo automático de documentos para expedientes
// Versión: 2.0 | Fecha: 1 Abril 2026
// ============================================================================
// FLUJO AUTOMÁTICO:
//   1. Frontend sube 1 o N documentos PDF/imagen
//   2. GAS sube cada uno a BANDEJA_ENTRADA
//   3. Gemini clasifica: tipo doc + detecta DNI/nombre → busca empleado
//   4. Si encuentra empleado con confianza alta/media → ARCHIVA automáticamente
//   5. Si NO encuentra o confianza baja → BANDEJA_DOCS como incidencia
//   6. Dashboard: procesados auto vs pendientes de revisión
// ============================================================================

var TIPO_A_SUBCARPETA = {
  'dni':                   '01_Identificacion',
  'certificado_delitos':   '01_Identificacion',
  'vida_laboral':          '01_Identificacion',
  'contrato_laboral':      '02_Contrato_Laboral',
  'nomina':                '02_Contrato_Laboral',
  'reconocimiento_medico': '03_PRL_Seguridad',
  'certificado_prl':       '03_PRL_Seguridad',
  'entrega_epi':           '03_PRL_Seguridad',
  'parte_accidente':       '03_PRL_Seguridad',
  'evaluacion_riesgos':    '03_PRL_Seguridad',
  'titulo_formacion':      '04_Formacion_Titulacion',
  'consentimiento':        '05_RGPD_Consentimientos',
  'solicitud_arco':        '05_RGPD_Consentimientos',
  'curriculum':            '10_Otros',
  'certificacion':         '09_Certificaciones',
  'otro':                  '10_Otros'
};

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL: Procesar documento automáticamente
// ═══════════════════════════════════════════════════════════════════════════════

function procesarDocumentoAutomatico_(data) {
  if (!data.base64 || !data.filename) return { ok: false, error: 'Archivo requerido' };

  var carpetaBandeja = obtenerOCrearCarpetaBandeja_();
  var bytes = Utilities.base64Decode(data.base64);
  var blob = Utilities.newBlob(bytes, data.mime_type || 'application/pdf', data.filename);
  var archivo = carpetaBandeja.createFile(blob);
  archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // Clasificar con Gemini
  var resultadoIA = clasificarDocumentoConGemini_(archivo.getId());

  if (!resultadoIA.ok) {
    registrarDocBandeja_(archivo, data.filename, null, null, 'error_clasificacion', resultadoIA.error || 'Gemini no pudo clasificar');
    return {
      ok: true, estado: 'error_clasificacion',
      archivo_id: archivo.getId(), archivo_nombre: data.filename, archivo_url: archivo.getUrl(),
      error_detalle: resultadoIA.error, empleado: null, clasificacion: null
    };
  }

  var clas = resultadoIA.clasificacion;
  var tipo = clas.tipo || 'otro';
  var subcarpeta = TIPO_A_SUBCARPETA[tipo] || '10_Otros';

  // Buscar empleado
  var empleadoMatch = null;
  if (clas.propietario_dni) empleadoMatch = buscarEmpleadoPorDniExp_(clas.propietario_dni);
  if (!empleadoMatch && clas.propietario_nombre) empleadoMatch = buscarEmpleadoPorNombreExp_(clas.propietario_nombre);

  // Decidir: archivar o bandeja
  if (empleadoMatch && (empleadoMatch.match_confianza === 'alta' || empleadoMatch.match_confianza === 'media')) {
    var res = archivarEnExpediente_(archivo, empleadoMatch, tipo, subcarpeta, clas);
    if (res.ok) {
      return {
        ok: true, estado: 'archivado',
        archivo_id: archivo.getId(), archivo_nombre: data.filename, archivo_url: archivo.getUrl(),
        empleado: { id: empleadoMatch.id, nombre: empleadoMatch.nombre + ' ' + empleadoMatch.apellidos, dni: empleadoMatch.dni },
        clasificacion: { tipo: tipo, tipo_descripcion: TIPOS_DOCUMENTO[tipo] ? TIPOS_DOCUMENTO[tipo].descripcion : tipo, confianza: clas.confianza || 'media', subcarpeta: subcarpeta, datos_extraidos: clas.datos_extraidos || '', fecha_vencimiento: clas.fecha_vencimiento || '' },
        carpeta_destino: res.carpeta_destino, documento_id: res.documento_id
      };
    } else {
      registrarDocBandeja_(archivo, data.filename, clas, empleadoMatch, 'error_archivado', res.error);
      return { ok: true, estado: 'error_archivado', archivo_id: archivo.getId(), archivo_nombre: data.filename, archivo_url: archivo.getUrl(), error_detalle: res.error, empleado: { id: empleadoMatch.id, nombre: empleadoMatch.nombre + ' ' + empleadoMatch.apellidos, dni: empleadoMatch.dni }, clasificacion: { tipo: tipo, confianza: clas.confianza, datos_extraidos: clas.datos_extraidos || '' } };
    }
  } else {
    var motivo = !empleadoMatch ? 'empleado_no_encontrado' : 'confianza_baja';
    var detalle = !empleadoMatch ? 'DNI: ' + (clas.propietario_dni || '?') + ' / Nombre: ' + (clas.propietario_nombre || '?') : 'Match ' + empleadoMatch.match_confianza + ': ' + empleadoMatch.nombre + ' ' + empleadoMatch.apellidos;
    registrarDocBandeja_(archivo, data.filename, clas, empleadoMatch, motivo, detalle);
    return {
      ok: true, estado: motivo,
      archivo_id: archivo.getId(), archivo_nombre: data.filename, archivo_url: archivo.getUrl(),
      error_detalle: detalle,
      empleado: empleadoMatch ? { id: empleadoMatch.id, nombre: empleadoMatch.nombre + ' ' + empleadoMatch.apellidos, dni: empleadoMatch.dni } : null,
      clasificacion: { tipo: tipo, tipo_descripcion: TIPOS_DOCUMENTO[tipo] ? TIPOS_DOCUMENTO[tipo].descripcion : tipo, confianza: clas.confianza || 'baja', propietario_nombre: clas.propietario_nombre || '', propietario_dni: clas.propietario_dni || '', subcarpeta: subcarpeta, datos_extraidos: clas.datos_extraidos || '', fecha_vencimiento: clas.fecha_vencimiento || '' }
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHIVAR EN EXPEDIENTE DRIVE
// ═══════════════════════════════════════════════════════════════════════════════

function archivarEnExpediente_(archivo, empleado, tipo, subcarpeta, clasificacion) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hojaEmp = ss.getSheetByName(HOJA_EMPLEADOS);
  if (!hojaEmp) return { ok: false, error: 'Sin hoja EMPLEADOS' };

  var carpetaUrl = empleado.carpeta_url || '';
  if (!carpetaUrl) {
    var exp = crearExpedienteDigital_(empleado.nombre, empleado.apellidos, empleado.dni, empleado.id);
    if (!exp.ok) return { ok: false, error: 'No se pudo crear expediente' };
    carpetaUrl = exp.url;
    var datosEmp = hojaEmp.getDataRange().getValues();
    for (var i = 1; i < datosEmp.length; i++) {
      if (datosEmp[i][0] === empleado.id) { hojaEmp.getRange(i + 1, 37).setValue(carpetaUrl); break; }
    }
  }

  var carpetaEmp = null;
  try {
    var match = carpetaUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (match) carpetaEmp = DriveApp.getFolderById(match[1]);
  } catch(e) {}

  if (!carpetaEmp) {
    try {
      var cr = DriveApp.getFolderById(CARPETA_RAIZ_ID);
      var cRRHH = obtenerOCrearCarpetaDoc_(cr, 'RRHH');
      var cEmps = obtenerOCrearCarpetaDoc_(cRRHH, 'Empleados');
      var todas = cEmps.getFolders();
      while (todas.hasNext()) { var c = todas.next(); if (c.getName().indexOf(empleado.apellidos) !== -1) { carpetaEmp = c; break; } }
    } catch(e) {}
  }
  if (!carpetaEmp) return { ok: false, error: 'Carpeta expediente no encontrada' };

  var carpetaDestino = obtenerOCrearCarpetaDoc_(carpetaEmp, subcarpeta);

  try {
    var padres = archivo.getParents();
    while (padres.hasNext()) { padres.next().removeFile(archivo); }
    carpetaDestino.addFile(archivo);
  } catch(e) { return { ok: false, error: 'Error moviendo: ' + e.message }; }

  crearHojaDocumentosGeneral_();
  var hojaDocs = ss.getSheetByName(HOJA_DOCUMENTOS);
  var idDoc = 'DOC-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  var tipoInfo = TIPOS_DOCUMENTO[tipo] || TIPOS_DOCUMENTO['otro'];

  hojaDocs.appendRow([
    idDoc, archivo.getName(), tipo, tipoInfo.modulo || 'RRHH',
    (empleado.nombre + ' ' + empleado.apellidos).trim(), empleado.dni || '', '',
    'archivado', new Date(), new Date(), 'Gemini IA (automático)',
    clasificacion.datos_extraidos || '', archivo.getUrl(), subcarpeta,
    clasificacion.fecha_vencimiento || '', ''
  ]);

  return { ok: true, documento_id: idDoc, carpeta_destino: carpetaEmp.getName() + '/' + subcarpeta };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BANDEJA DE INCIDENCIAS
// ═══════════════════════════════════════════════════════════════════════════════

function crearHojaBandejaDocsSiNoExiste_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName('BANDEJA_DOCS')) return;
  var h = ss.insertSheet('BANDEJA_DOCS');
  h.getRange(1, 1, 1, 14).setValues([['ID', 'Archivo_Nombre', 'Archivo_ID', 'Archivo_URL', 'Tipo_Detectado', 'DNI_Detectado', 'Nombre_Detectado', 'Datos_Extraidos', 'Empleado_ID_Sugerido', 'Empleado_Nombre_Sugerido', 'Motivo', 'Detalle', 'Estado', 'Fecha']])
    .setBackground('#7c3aed').setFontColor('#fff').setFontWeight('bold');
  h.setFrozenRows(1); h.setColumnWidth(2, 250); h.setColumnWidth(8, 300); h.setColumnWidth(12, 300);
}

function registrarDocBandeja_(archivo, nombreOriginal, clasificacion, empleadoMatch, motivo, detalle) {
  crearHojaBandejaDocsSiNoExiste_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('BANDEJA_DOCS');
  var id = 'BDJ-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).substring(2, 4).toUpperCase();
  hoja.appendRow([
    id, nombreOriginal || archivo.getName(), archivo.getId(), archivo.getUrl(),
    clasificacion ? (clasificacion.tipo || '') : '', clasificacion ? (clasificacion.propietario_dni || '') : '',
    clasificacion ? (clasificacion.propietario_nombre || '') : '', clasificacion ? (clasificacion.datos_extraidos || '') : '',
    empleadoMatch ? empleadoMatch.id : '', empleadoMatch ? (empleadoMatch.nombre + ' ' + empleadoMatch.apellidos) : '',
    motivo, detalle || '', 'pendiente', new Date()
  ]);
}

function resolverDocBandeja_(data) {
  if (!data.id || !data.empleado_id) return { ok: false, error: 'ID y empleado_id requeridos' };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('BANDEJA_DOCS');
  if (!hoja || hoja.getLastRow() <= 1) return { ok: false, error: 'Sin bandeja' };
  var datos = hoja.getDataRange().getValues();

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] !== data.id) continue;
    if (datos[i][12] === 'resuelto') return { ok: false, error: 'Ya resuelto' };

    var archivo;
    try { archivo = DriveApp.getFileById(datos[i][2]); } catch(e) { return { ok: false, error: 'Archivo no encontrado' }; }

    var hojaEmp = ss.getSheetByName(HOJA_EMPLEADOS);
    var datosEmp = hojaEmp.getDataRange().getValues();
    var empleado = null;
    for (var e = 1; e < datosEmp.length; e++) {
      if (datosEmp[e][0] === data.empleado_id) {
        empleado = { id: datosEmp[e][0], nombre: datosEmp[e][2], apellidos: datosEmp[e][3], dni: datosEmp[e][1], carpeta_url: datosEmp[e][36] || '' };
        break;
      }
    }
    if (!empleado) return { ok: false, error: 'Empleado no encontrado' };

    var tipo = data.tipo || datos[i][4] || 'otro';
    var subcarpeta = data.subcarpeta || TIPO_A_SUBCARPETA[tipo] || '10_Otros';
    var res = archivarEnExpediente_(archivo, empleado, tipo, subcarpeta, { datos_extraidos: datos[i][7] || '', fecha_vencimiento: '' });

    if (res.ok) {
      hoja.getRange(i + 1, 13).setValue('resuelto');
      return { ok: true, documento_id: res.documento_id, empleado: empleado.nombre + ' ' + empleado.apellidos, carpeta_destino: res.carpeta_destino };
    }
    return { ok: false, error: res.error };
  }
  return { ok: false, error: 'No encontrado en bandeja' };
}

function descartarDocBandeja_(id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('BANDEJA_DOCS');
  if (!hoja) return { ok: false };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === id) { hoja.getRange(i + 1, 13).setValue('descartado'); return { ok: true }; }
  }
  return { ok: false, error: 'No encontrado' };
}

function obtenerBandejaDocs_(filtro) {
  crearHojaBandejaDocsSiNoExiste_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('BANDEJA_DOCS');
  if (!hoja || hoja.getLastRow() <= 1) return { documentos: [], total: 0, pendientes: 0 };
  var datos = hoja.getDataRange().getValues();
  var docs = [], pendientes = 0;

  for (var i = datos.length - 1; i >= 1; i--) {
    if (!datos[i][0]) continue;
    var estado = String(datos[i][12] || 'pendiente');
    if (estado === 'pendiente') pendientes++;
    if (filtro && filtro.estado && estado !== filtro.estado) continue;

    docs.push({
      id: datos[i][0], archivo_nombre: datos[i][1], archivo_id: datos[i][2], archivo_url: datos[i][3],
      tipo_detectado: datos[i][4], dni_detectado: datos[i][5], nombre_detectado: datos[i][6],
      datos_extraidos: datos[i][7], empleado_id_sugerido: datos[i][8], empleado_nombre_sugerido: datos[i][9],
      motivo: datos[i][10], detalle: datos[i][11], estado: estado,
      fecha: datos[i][13] instanceof Date ? Utilities.formatDate(datos[i][13], 'Europe/Madrid', 'dd/MM/yyyy HH:mm') : String(datos[i][13] || '')
    });
    if (docs.length >= 100) break;
  }
  return { documentos: docs, total: docs.length, pendientes: pendientes };
}

function dashboardEscaneo_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hojaDocs = ss.getSheetByName(HOJA_DOCUMENTOS);
  var archivadosHoy = 0, archivadosTotal = 0;
  var hoy = Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM-dd');
  if (hojaDocs && hojaDocs.getLastRow() > 1) {
    var d = hojaDocs.getDataRange().getValues();
    for (var i = 1; i < d.length; i++) {
      if (String(d[i][10] || '').indexOf('Gemini') !== -1) {
        archivadosTotal++;
        if (d[i][8] instanceof Date && Utilities.formatDate(d[i][8], 'Europe/Madrid', 'yyyy-MM-dd') === hoy) archivadosHoy++;
      }
    }
  }
  var bandeja = obtenerBandejaDocs_({ estado: 'pendiente' });
  return { archivados_hoy: archivadosHoy, archivados_total: archivadosTotal, pendientes_revision: bandeja.pendientes };
}

// ═══ HELPERS ═══

function buscarEmpleadoPorDniExp_(dni) {
  if (!dni) return null;
  var dniClean = dni.toString().replace(/[\s.-]/g, '').toUpperCase();
  if (dniClean.length < 5) return null;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_EMPLEADOS);
  if (!hoja || hoja.getLastRow() <= 1) return null;
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    var empDni = (datos[i][1] || '').toString().replace(/[\s.-]/g, '').toUpperCase();
    if (empDni === dniClean) {
      return { id: datos[i][0], nombre: datos[i][2], apellidos: datos[i][3], dni: datos[i][1], centro: datos[i][16] || '', estado: datos[i][21] || 'activo', carpeta_url: datos[i][36] || '', match_tipo: 'dni', match_confianza: 'alta' };
    }
  }
  return null;
}

function buscarEmpleadoPorNombreExp_(nombreCompleto) {
  if (!nombreCompleto) return null;
  var buscar = nombreCompleto.toLowerCase().replace(/[^a-záéíóúñü\s]/g, '').trim();
  if (buscar.length < 4) return null;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_EMPLEADOS);
  if (!hoja || hoja.getLastRow() <= 1) return null;
  var datos = hoja.getDataRange().getValues();
  var palabras = buscar.split(/\s+/);
  var mejor = null, mejorScore = 0;
  for (var i = 1; i < datos.length; i++) {
    var nombre = ((datos[i][2] || '') + ' ' + (datos[i][3] || '')).toLowerCase();
    var score = 0;
    for (var p = 0; p < palabras.length; p++) { if (palabras[p].length >= 3 && nombre.indexOf(palabras[p]) !== -1) score++; }
    if (score > mejorScore && score >= 2) {
      mejorScore = score;
      mejor = { id: datos[i][0], nombre: datos[i][2], apellidos: datos[i][3], dni: datos[i][1], centro: datos[i][16] || '', estado: datos[i][21] || 'activo', carpeta_url: datos[i][36] || '', match_tipo: 'nombre', match_confianza: score >= 3 ? 'alta' : 'media' };
    }
  }
  return mejor;
}

function ejecutarEscaneo() { _mostrarPlaceholder('Escaneo Documentos', 'Usar desde la PWA'); }