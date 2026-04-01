// ============================================================================
// 09_gestor_documental.gs - GESTOR DOCUMENTAL INTELIGENTE
// Versión: 1.1 | Fecha: Marzo 2026
// FIX: Renombrada obtenerOCrearCarpeta_ → obtenerOCrearCarpetaDoc_
//      para evitar conflicto con 00_extraccion_licitaciones.gs
// Motor transversal: clasifica, archiva y registra documentos automáticamente
// ============================================================================

var HOJA_DOCUMENTOS = 'DOCUMENTOS_GENERAL';
var CARPETA_BANDEJA = 'BANDEJA_ENTRADA';

// ════════════════════════════════════════
// INICIALIZACIÓN
// ════════════════════════════════════════

function crearHojaDocumentosGeneral_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(HOJA_DOCUMENTOS)) return;
  var hoja = ss.insertSheet(HOJA_DOCUMENTOS);
  var cab = ['ID Documento', 'Nombre Archivo', 'Tipo Documento', 'Módulo', 'Propietario', 'DNI/NIF',
             'Centro/Licitación', 'Estado', 'Fecha Subida', 'Fecha Clasificación', 'Clasificado Por',
             'Datos Extraídos', 'URL Drive', 'Carpeta Destino', 'Vencimiento', 'Notas'];
  hoja.getRange(1, 1, 1, cab.length).setValues([cab]);
  hoja.getRange(1, 1, 1, cab.length).setBackground('#1a3c34').setFontColor('#ffffff').setFontWeight('bold');
  hoja.setColumnWidth(2, 300); hoja.setColumnWidth(12, 400); hoja.setFrozenRows(1);
}

function obtenerOCrearCarpetaBandeja_() {
  var carpetaRaiz = DriveApp.getFolderById(CARPETA_RAIZ_ID);
  var carpetas = carpetaRaiz.getFoldersByName(CARPETA_BANDEJA);
  if (carpetas.hasNext()) return carpetas.next();
  return carpetaRaiz.createFolder(CARPETA_BANDEJA);
}

// FIX: Renombrada para evitar colisión con la versión de 00_extraccion
// 00_extraccion tiene: obtenerOCrearCarpeta_(nombre, carpetaPadre)
// Este archivo tenía: obtenerOCrearCarpeta_(padre, nombre) ← parámetros invertidos
// Al compartir namespace en GAS, la última definición cargada sobreescribía a la otra
function obtenerOCrearCarpetaDoc_(padre, nombre) {
  var carpetas = padre.getFoldersByName(nombre);
  if (carpetas.hasNext()) return carpetas.next();
  return padre.createFolder(nombre);
}

// ════════════════════════════════════════
// TIPOS DE DOCUMENTOS RECONOCIDOS
// ════════════════════════════════════════

var TIPOS_DOCUMENTO = {
  // RRHH
  'dni': { modulo: 'RRHH', carpeta: 'Identificación', descripcion: 'DNI / NIE' },
  'contrato_laboral': { modulo: 'RRHH', carpeta: 'Contratos', descripcion: 'Contrato de trabajo' },
  'nomina': { modulo: 'RRHH', carpeta: 'Nóminas', descripcion: 'Nómina / Recibo de salario' },
  'titulo_formacion': { modulo: 'RRHH', carpeta: 'Formación', descripcion: 'Título o certificado formativo' },
  'certificado_delitos': { modulo: 'RRHH', carpeta: 'Identificación', descripcion: 'Certificado delitos sexuales' },
  'vida_laboral': { modulo: 'RRHH', carpeta: 'Seguridad Social', descripcion: 'Vida laboral' },
  'curriculum': { modulo: 'RRHH', carpeta: 'CV', descripcion: 'Curriculum vitae' },
  // PRL
  'reconocimiento_medico': { modulo: 'PRL', carpeta: 'Reconocimientos', descripcion: 'Reconocimiento médico' },
  'certificado_prl': { modulo: 'PRL', carpeta: 'Formación PRL', descripcion: 'Certificado formación PRL' },
  'entrega_epi': { modulo: 'PRL', carpeta: 'EPIs', descripcion: 'Acuse entrega EPI' },
  'parte_accidente': { modulo: 'PRL', carpeta: 'Accidentes', descripcion: 'Parte de accidente laboral' },
  'evaluacion_riesgos': { modulo: 'PRL', carpeta: 'Evaluaciones', descripcion: 'Evaluación de riesgos' },
  // RGPD
  'consentimiento': { modulo: 'RGPD', carpeta: 'Consentimientos', descripcion: 'Consentimiento firmado' },
  'solicitud_arco': { modulo: 'RGPD', carpeta: 'ARCO', descripcion: 'Solicitud derechos ARCO' },
  // LICITACIONES
  'pliego': { modulo: 'LICITACIONES', carpeta: 'Pliegos', descripcion: 'Pliego de condiciones' },
  'oferta': { modulo: 'LICITACIONES', carpeta: 'Ofertas', descripcion: 'Documento de oferta' },
  'contrato_publico': { modulo: 'LICITACIONES', carpeta: 'Contratos', descripcion: 'Contrato público adjudicado' },
  'solvencia': { modulo: 'LICITACIONES', carpeta: 'Solvencia', descripcion: 'Certificado de solvencia' },
  // TERRITORIO
  'parte_trabajo': { modulo: 'TERRITORIO', carpeta: 'Partes', descripcion: 'Parte de trabajo' },
  'foto_incidencia': { modulo: 'TERRITORIO', carpeta: 'Incidencias', descripcion: 'Foto de incidencia' },
  'informe_cliente': { modulo: 'TERRITORIO', carpeta: 'Informes', descripcion: 'Informe para cliente' },
  // GENERAL
  'factura': { modulo: 'ADMINISTRACIÓN', carpeta: 'Facturas', descripcion: 'Factura' },
  'seguro': { modulo: 'ADMINISTRACIÓN', carpeta: 'Seguros', descripcion: 'Póliza de seguro' },
  'certificacion': { modulo: 'ADMINISTRACIÓN', carpeta: 'Certificaciones', descripcion: 'Certificación (ISO, etc.)' },
  'otro': { modulo: 'GENERAL', carpeta: 'Otros', descripcion: 'Documento no clasificado' }
};

// ════════════════════════════════════════
// CLASIFICACIÓN CON GEMINI
// ════════════════════════════════════════

function clasificarDocumentoConGemini_(archivoId) {
  var geminiKey = obtenerGeminiKey_();
  if (!geminiKey) return { ok: false, error: 'API Key no configurada' };

  var archivo;
  try { archivo = DriveApp.getFileById(archivoId); } catch(e) { return { ok: false, error: 'Archivo no encontrado' }; }

  var blob = archivo.getBlob();
  var base64 = Utilities.base64Encode(blob.getBytes());
  var mimeType = archivo.getMimeType();

  var tiposStr = Object.keys(TIPOS_DOCUMENTO).join(', ');

  var prompt = 'Eres un sistema de clasificación documental para una empresa de limpieza y facilities.\n\n' +
    'Analiza este documento y clasifícalo. Extrae toda la información relevante.\n\n' +
    'TIPOS VÁLIDOS: ' + tiposStr + '\n\n' +
    'Responde SOLO con JSON válido, sin backticks, sin saltos de línea dentro de los strings:\n' +
    '{\n' +
    '  "tipo": "uno de los tipos válidos",\n' +
    '  "confianza": "alta|media|baja",\n' +
    '  "propietario_nombre": "nombre completo de la persona si aparece",\n' +
    '  "propietario_dni": "DNI/NIE/NIF si aparece",\n' +
    '  "empresa_nif": "NIF de empresa si aparece",\n' +
    '  "fecha_documento": "fecha del documento si aparece (DD/MM/YYYY)",\n' +
    '  "fecha_vencimiento": "fecha de vencimiento si aplica (DD/MM/YYYY)",\n' +
    '  "centro_o_licitacion": "nombre del centro o licitación si se menciona",\n' +
    '  "datos_extraidos": "resumen breve de los datos clave del documento (max 200 chars)",\n' +
    '  "modulo_sugerido": "RRHH|PRL|RGPD|LICITACIONES|TERRITORIO|ADMINISTRACIÓN|GENERAL"\n' +
    '}';

  try {
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=' + geminiKey;
    
    var contenido = [];
    if (mimeType === 'application/pdf' || mimeType.indexOf('image') !== -1) {
      contenido.push({ inlineData: { mimeType: mimeType, data: base64 } });
    }
    contenido.push({ text: prompt });

    var payload = { contents: [{ role: 'user', parts: contenido }], generationConfig: { temperature: 0.1, maxOutputTokens: 2048 } };
    var options = { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true };
    var response = UrlFetchApp.fetch(url, options);
    var json = JSON.parse(response.getContentText());

    if (!json.candidates || !json.candidates[0] || !json.candidates[0].content) {
      return { ok: false, error: 'Sin respuesta de Gemini' };
    }

    var allParts = json.candidates[0].content.parts || [];
    var texto = '';
    for (var p = 0; p < allParts.length; p++) { if (allParts[p].text) texto = allParts[p].text; }

    var start = texto.indexOf('{'); var end = texto.lastIndexOf('}');
    if (start < 0 || end <= start) return { ok: false, error: 'Sin JSON en respuesta' };
    var jsonStr = texto.substring(start, end + 1).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
    
    var clasificacion;
    try { clasificacion = JSON.parse(jsonStr); } catch(pe) { return { ok: false, error: 'Error parseando: ' + pe.message }; }

    return { ok: true, clasificacion: clasificacion, archivo: { id: archivoId, nombre: archivo.getName(), mime: mimeType } };
  } catch(e) {
    return { ok: false, error: 'Error Gemini: ' + e.message };
  }
}

// ════════════════════════════════════════
// ARCHIVAR DOCUMENTO
// ════════════════════════════════════════

function archivarDocumento_(archivoId, clasificacion) {
  crearHojaDocumentosGeneral_();
  var archivo = DriveApp.getFileById(archivoId);
  var carpetaRaiz = DriveApp.getFolderById(CARPETA_RAIZ_ID);
  
  var tipo = clasificacion.tipo || 'otro';
  var tipoInfo = TIPOS_DOCUMENTO[tipo] || TIPOS_DOCUMENTO['otro'];
  var modulo = clasificacion.modulo_sugerido || tipoInfo.modulo;

  // Crear estructura de carpetas: RAIZ / MODULO / CARPETA_TIPO / [PERSONA]
  // FIX: Usando obtenerOCrearCarpetaDoc_ en lugar de obtenerOCrearCarpeta_
  var carpetaModulo = obtenerOCrearCarpetaDoc_(carpetaRaiz, modulo);
  var carpetaTipo = obtenerOCrearCarpetaDoc_(carpetaModulo, tipoInfo.carpeta);

  // Si tiene propietario, crear subcarpeta personal
  var carpetaFinal = carpetaTipo;
  if (clasificacion.propietario_nombre) {
    var nombreCarpeta = clasificacion.propietario_nombre.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s]/g, '').trim();
    if (clasificacion.propietario_dni) nombreCarpeta += ' (' + clasificacion.propietario_dni + ')';
    // FIX: Usando obtenerOCrearCarpetaDoc_
    if (nombreCarpeta) carpetaFinal = obtenerOCrearCarpetaDoc_(carpetaTipo, nombreCarpeta);
  }

  // Mover archivo
  var padres = archivo.getParents();
  while (padres.hasNext()) { padres.next().removeFile(archivo); }
  carpetaFinal.addFile(archivo);

  // Registrar en hoja
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_DOCUMENTOS);
  var idDoc = 'DOC-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

  hoja.appendRow([
    idDoc,
    archivo.getName(),
    tipo,
    modulo,
    clasificacion.propietario_nombre || '',
    clasificacion.propietario_dni || clasificacion.empresa_nif || '',
    clasificacion.centro_o_licitacion || '',
    'clasificado',
    new Date(),
    new Date(),
    'Gemini IA',
    clasificacion.datos_extraidos || '',
    archivo.getUrl(),
    carpetaFinal.getName(),
    clasificacion.fecha_vencimiento || '',
    ''
  ]);

  return {
    ok: true,
    documento: {
      id: idDoc,
      nombre: archivo.getName(),
      tipo: tipo,
      tipo_descripcion: tipoInfo.descripcion,
      modulo: modulo,
      propietario: clasificacion.propietario_nombre || '',
      dni: clasificacion.propietario_dni || '',
      datos_extraidos: clasificacion.datos_extraidos || '',
      url: archivo.getUrl(),
      carpeta: modulo + '/' + tipoInfo.carpeta + (clasificacion.propietario_nombre ? '/' + clasificacion.propietario_nombre : ''),
      vencimiento: clasificacion.fecha_vencimiento || '',
      confianza: clasificacion.confianza || 'media'
    }
  };
}

// ════════════════════════════════════════
// SUBIR Y CLASIFICAR DESDE PWA
// ════════════════════════════════════════

function subirYClasificarDocumento_(data) {
  if (!data.filename || !data.base64) return { ok: false, error: 'Archivo requerido' };

  crearHojaDocumentosGeneral_();
  var carpetaBandeja = obtenerOCrearCarpetaBandeja_();

  // Subir a bandeja de entrada
  var bytes = Utilities.base64Decode(data.base64);
  var blob = Utilities.newBlob(bytes, data.mime_type || 'application/pdf', data.filename);
  var archivo = carpetaBandeja.createFile(blob);

  // Clasificar con Gemini
  var resultado = clasificarDocumentoConGemini_(archivo.getId());
  if (!resultado.ok) {
    // Registrar como no clasificado
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var hoja = ss.getSheetByName(HOJA_DOCUMENTOS);
    if (!hoja) crearHojaDocumentosGeneral_();
    hoja = ss.getSheetByName(HOJA_DOCUMENTOS);
    var idDoc = 'DOC-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    hoja.appendRow([idDoc, data.filename, 'otro', 'GENERAL', '', '', '', 'pendiente', new Date(), '', '', resultado.error || '', archivo.getUrl(), 'BANDEJA_ENTRADA', '', '']);
    return { ok: true, clasificado: false, error: resultado.error, documento: { id: idDoc, nombre: data.filename, url: archivo.getUrl(), estado: 'pendiente' } };
  }

  // Archivar
  return archivarDocumento_(archivo.getId(), resultado.clasificacion);
}

// ════════════════════════════════════════
// LISTAR DOCUMENTOS
// ════════════════════════════════════════

function obtenerDocumentosGeneralAPI_(filtro) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_DOCUMENTOS);
  if (!hoja || hoja.getLastRow() <= 1) return { documentos: [], total: 0 };

  var datos = hoja.getDataRange().getValues();
  var docs = [];
  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    var doc = {
      id: datos[i][0], nombre: datos[i][1], tipo: datos[i][2], modulo: datos[i][3],
      propietario: datos[i][4], dni: datos[i][5], centro: datos[i][6], estado: datos[i][7],
      fecha_subida: datos[i][8], fecha_clasificacion: datos[i][9], clasificado_por: datos[i][10],
      datos_extraidos: datos[i][11], url: datos[i][12], carpeta: datos[i][13],
      vencimiento: datos[i][14], notas: datos[i][15]
    };
    if (filtro) {
      if (filtro.modulo && doc.modulo !== filtro.modulo) continue;
      if (filtro.tipo && doc.tipo !== filtro.tipo) continue;
      if (filtro.propietario && doc.propietario.indexOf(filtro.propietario) === -1) continue;
    }
    docs.push(doc);
  }

  docs.sort(function(a, b) { return new Date(b.fecha_subida) - new Date(a.fecha_subida); });

  // Stats
  var stats = { total: docs.length, por_modulo: {}, por_tipo: {}, pendientes: 0, con_vencimiento: 0 };
  for (var j = 0; j < docs.length; j++) {
    stats.por_modulo[docs[j].modulo] = (stats.por_modulo[docs[j].modulo] || 0) + 1;
    stats.por_tipo[docs[j].tipo] = (stats.por_tipo[docs[j].tipo] || 0) + 1;
    if (docs[j].estado === 'pendiente') stats.pendientes++;
    if (docs[j].vencimiento) stats.con_vencimiento++;
  }

  return { documentos: docs, total: docs.length, stats: stats };
}

// ════════════════════════════════════════
// RECLASIFICAR MANUALMENTE
// ════════════════════════════════════════

function reclasificarDocumento_(data) {
  if (!data.id) return { ok: false, error: 'ID requerido' };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_DOCUMENTOS);
  if (!hoja) return { ok: false, error: 'Sin hoja documentos' };

  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === data.id) {
      var fila = i + 1;
      if (data.tipo) hoja.getRange(fila, 3).setValue(data.tipo);
      if (data.modulo) hoja.getRange(fila, 4).setValue(data.modulo);
      if (data.propietario) hoja.getRange(fila, 5).setValue(data.propietario);
      if (data.dni) hoja.getRange(fila, 6).setValue(data.dni);
      if (data.centro) hoja.getRange(fila, 7).setValue(data.centro);
      hoja.getRange(fila, 8).setValue('reclasificado');
      hoja.getRange(fila, 10).setValue(new Date());
      hoja.getRange(fila, 11).setValue('Manual');
      return { ok: true };
    }
  }
  return { ok: false, error: 'Documento no encontrado' };
}

// ════════════════════════════════════════
// PROCESAR BANDEJA AUTOMÁTICAMENTE (trigger)
// ════════════════════════════════════════

function procesarBandejaEntrada() {
  Logger.log('📨 Procesando bandeja de entrada...');
  var carpeta = obtenerOCrearCarpetaBandeja_();
  var archivos = carpeta.getFiles();
  var procesados = 0;
  var errores = 0;

  while (archivos.hasNext()) {
    var archivo = archivos.next();
    var mime = archivo.getMimeType();
    if (mime !== 'application/pdf' && mime.indexOf('image') === -1) continue;

    Logger.log('  📄 ' + archivo.getName());
    var resultado = clasificarDocumentoConGemini_(archivo.getId());
    if (resultado.ok) {
      archivarDocumento_(archivo.getId(), resultado.clasificacion);
      procesados++;
      Logger.log('    ✅ Clasificado: ' + resultado.clasificacion.tipo + ' → ' + (resultado.clasificacion.propietario_nombre || 'sin propietario'));
    } else {
      errores++;
      Logger.log('    ❌ Error: ' + resultado.error);
    }

    // Rate limiting
    Utilities.sleep(2000);
  }

  Logger.log('📨 Resultado: ' + procesados + ' procesados, ' + errores + ' errores');
  return { procesados: procesados, errores: errores };
}

// ════════════════════════════════════════
// ALERTAS DE VENCIMIENTO
// ════════════════════════════════════════

function alertasVencimientoDocumentos_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_DOCUMENTOS);
  if (!hoja || hoja.getLastRow() <= 1) return { alertas: [], total: 0 };

  var datos = hoja.getDataRange().getValues();
  var hoy = new Date();
  var alertas = [];

  for (var i = 1; i < datos.length; i++) {
    var venc = datos[i][14];
    if (!venc) continue;
    var fechaVenc;
    try {
      if (typeof venc === 'string' && venc.indexOf('/') !== -1) {
        var partes = venc.split('/');
        fechaVenc = new Date(partes[2], partes[1] - 1, partes[0]);
      } else { fechaVenc = new Date(venc); }
    } catch(e) { continue; }
    if (isNaN(fechaVenc.getTime())) continue;

    var dias = Math.floor((fechaVenc - hoy) / 86400000);
    if (dias > 90) continue;

    alertas.push({
      id: datos[i][0], nombre: datos[i][1], tipo: datos[i][2], modulo: datos[i][3],
      propietario: datos[i][4], vencimiento: venc, dias_restantes: dias,
      urgencia: dias < 0 ? 'vencido' : dias < 15 ? 'critico' : dias < 30 ? 'urgente' : 'proximo'
    });
  }

  alertas.sort(function(a, b) { return a.dias_restantes - b.dias_restantes; });
  return { alertas: alertas, total: alertas.length };
}