// ============================================================================
// 02_convenios.gs - GESTIÓN DE CONVENIOS COLECTIVOS
// Versión: 1.3 | Fecha: Marzo 2026
// FIX v1.3: Sectores dinámicos (Gemini detecta automáticamente)
// ============================================================================

var HOJA_CONVENIOS = 'CONVENIOS';
var HOJA_CATEGORIAS_CONVENIO = 'CATEGORIAS_CONVENIO';

var PROMPT_CONVENIO_DATOS = 'Eres un experto en derecho laboral español y convenios colectivos.\n' +
'Analiza el documento del convenio colectivo adjunto y extrae la información general.\n' +
'IMPORTANTE sobre el SECTOR: Identifica el sector económico REAL del convenio. Ejemplos de sectores válidos:\n' +
'Limpieza, Mantenimiento, Jardinería, Multiservicios, Metal, Seguridad, Hostelería, Construcción, ' +
'Socorrismo, Transporte, Comercio, Sanidad, Educación, Alimentación, Textil, Químicas, Madera, etc.\n' +
'NO uses "Otro" — identifica siempre el sector concreto del convenio.\n' +
'Responde SOLO con JSON, sin backticks, sin markdown:\n' +
'{\n' +
'  "convenio": {\n' +
'    "nombre_completo": "Nombre oficial del convenio",\n' +
'    "sector": "El sector real detectado (Metal, Limpieza, Hostelería, etc.)",\n' +
'    "ambito_territorial": "Provincial|Autonómico|Nacional",\n' +
'    "provincia": "Sevilla|Cádiz|Huelva|Córdoba|Málaga|Jaén|Granada|Almería|Nacional|Andalucía",\n' +
'    "codigo_convenio": "",\n' +
'    "vigencia_desde": "",\n' +
'    "vigencia_hasta": ""\n' +
'  },\n' +
'  "jornada": { "horas_anuales": 0, "horas_semanales": 0, "dias_vacaciones": 30 },\n' +
'  "seguridad_social_empresa_porcentaje": 32.1,\n' +
'  "num_pagas": 15,\n' +
'  "incremento_salarial_anual": 0,\n' +
'  "nocturnidad_hora_extra": 0,\n' +
'  "notas": ""\n' +
'}\n' +
'Analiza el documento:';

var PROMPT_CONVENIO_TABLAS = 'Analiza este convenio colectivo y extrae SOLO las tablas salariales.\n' +
'IMPORTANTE: Busca en los ANEXOS las tablas salariales. Extrae el año MÁS RECIENTE (preferiblemente 2026, si no 2025).\n' +
'Cada grupo y nivel tiene salario base que PUEDE ser diferente. El plus de especialidad VARÍA por nivel.\n' +
'Desglosa TODAS las categorías/niveles distintos.\n' +
'Para CADA categoría/nivel, extrae: salario base DIARIO, salario base MENSUAL, plus especialidad mensual, plus asiduidad mensual, nocturnidad €/hora, total anual bruto.\n' +
'Responde SOLO con JSON, sin backticks:\n' +
'{\n' +
'  "año_tablas": "2026",\n' +
'  "categorias": [\n' +
'    { "grupo": "GRUPO X", "nivel": "", "categoria": "Nombre", "salario_base_diario": 0.00, "salario_base_mensual": 0.00, "salario_base_anual_15_pagas": 0.00, "plus_especialidad_mensual": 0.00, "plus_asiduidad_mensual": 0.00, "nocturnidad_hora": 0.00, "total_anual_bruto": 0.00 }\n' +
'  ]\n' +
'}\n' +
'Analiza los anexos salariales del documento:';

// ════════════════════════════════════════
// INICIALIZACIÓN
// ════════════════════════════════════════

function crearHojaConveniosSiNoExiste_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(HOJA_CONVENIOS)) {
    var hoja = ss.insertSheet(HOJA_CONVENIOS);
    var cab = ['ID Convenio', 'Nombre', 'Sector', 'Provincia', 'Ámbito', 'Vigencia Desde', 'Vigencia Hasta',
               'Horas Anuales', 'Horas Semanales', 'Días Vacaciones', 'Num Pagas', 'SS Empresa %',
               'Incremento Anual %', 'Nocturnidad €/h', 'Fecha Extracción', 'URL Documento', 'Notas'];
    hoja.getRange(1, 1, 1, cab.length).setValues([cab]);
    hoja.getRange(1, 1, 1, cab.length).setBackground('#e65100').setFontColor('#ffffff').setFontWeight('bold');
    hoja.setColumnWidth(2, 350); hoja.setFrozenRows(1);
  }
  if (!ss.getSheetByName(HOJA_CATEGORIAS_CONVENIO)) {
    var hoja2 = ss.insertSheet(HOJA_CATEGORIAS_CONVENIO);
    var cab2 = ['ID Convenio', 'Sector', 'Provincia', 'Año Tablas', 'Grupo', 'Nivel', 'Categoría',
                'Salario Base Diario', 'Salario Base Mensual', 'Salario Base Anual (15 pagas)',
                'Plus Especialidad Mensual', 'Plus Asiduidad Mensual', 'Nocturnidad €/h', 'Total Anual Bruto'];
    hoja2.getRange(1, 1, 1, cab2.length).setValues([cab2]);
    hoja2.getRange(1, 1, 1, cab2.length).setBackground('#bf360c').setFontColor('#ffffff').setFontWeight('bold');
    hoja2.setColumnWidth(7, 300); hoja2.setFrozenRows(1);
    hoja2.getRange('H2:N1000').setNumberFormat('#,##0.00 €');
  }
}

function obtenerOCrearCarpetaConvenios_() {
  var carpetaRaiz = DriveApp.getFolderById(CARPETA_RAIZ_ID);
  var carpetas = carpetaRaiz.getFoldersByName('CONVENIOS');
  if (carpetas.hasNext()) return carpetas.next();
  return carpetaRaiz.createFolder('CONVENIOS');
}

// ════════════════════════════════════════
// PROCESAR CONVENIO PDF (2 pasos Gemini)
// ════════════════════════════════════════

function procesarConvenioPDF(archivoId) {
  Logger.log('📋 Procesando convenio PDF...');
  crearHojaConveniosSiNoExiste_();
  var archivo;
  try { archivo = DriveApp.getFileById(archivoId); } catch (e) { return { ok: false, error: 'Archivo no encontrado' }; }
  Logger.log('   📄 ' + archivo.getName() + ' (' + Math.round(archivo.getSize() / 1024) + ' KB)');
  var blob = archivo.getBlob(); var base64 = Utilities.base64Encode(blob.getBytes());

  Logger.log('   🤖 Paso 1: Datos generales...');
  var datosGenerales = llamarGeminiConPDF_(base64, PROMPT_CONVENIO_DATOS);
  if (!datosGenerales) return { ok: false, error: 'Error extrayendo datos generales' };
  var general;
  try {
    var cleanJson = datosGenerales.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    var start = cleanJson.indexOf('{'); var end = cleanJson.lastIndexOf('}');
    if (start >= 0 && end > start) cleanJson = cleanJson.substring(start, end + 1);
    cleanJson = cleanJson.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
    general = JSON.parse(cleanJson);
  } catch (e) { return { ok: false, error: 'Error parseando datos generales: ' + e.message }; }
  var conv = general.convenio || {};

  // Normalizar sector: primera letra mayúscula
  if (conv.sector) {
    conv.sector = conv.sector.charAt(0).toUpperCase() + conv.sector.slice(1).toLowerCase();
    // Corregir algunos sectores comunes que Gemini puede devolver con variaciones
    var normalizacion = {
      'Limpieza de edificios': 'Limpieza', 'Limpieza y mantenimiento': 'Limpieza',
      'Jardineria': 'Jardinería', 'Metalurgico': 'Metal', 'Metalurgia': 'Metal', 'Metalúrgico': 'Metal',
      'Siderometalúrgico': 'Metal', 'Siderometalurgico': 'Metal', 'Siderurgia': 'Metal',
      'Hosteleria': 'Hostelería', 'Restauración': 'Hostelería',
      'Construccion': 'Construcción', 'Edificación': 'Construcción',
      'Vigilancia': 'Seguridad', 'Seguridad privada': 'Seguridad',
      'Socorrista': 'Socorrismo', 'Socorristas': 'Socorrismo',
      'Instalaciones': 'Metal', 'Montajes': 'Metal', 'Instalaciones eléctricas': 'Metal'
    };
    if (normalizacion[conv.sector]) conv.sector = normalizacion[conv.sector];
    // Si sigue siendo "Otro", intentar detectar del nombre
    if (conv.sector === 'Otro' && conv.nombre_completo) {
      var nombre = conv.nombre_completo.toLowerCase();
      if (nombre.indexOf('metal') !== -1 || nombre.indexOf('siderometalúrgic') !== -1) conv.sector = 'Metal';
      else if (nombre.indexOf('limpieza') !== -1) conv.sector = 'Limpieza';
      else if (nombre.indexOf('jardiner') !== -1 || nombre.indexOf('zonas verdes') !== -1) conv.sector = 'Jardinería';
      else if (nombre.indexOf('hostel') !== -1 || nombre.indexOf('restaur') !== -1) conv.sector = 'Hostelería';
      else if (nombre.indexOf('construcci') !== -1 || nombre.indexOf('edificaci') !== -1) conv.sector = 'Construcción';
      else if (nombre.indexOf('seguridad') !== -1 || nombre.indexOf('vigilancia') !== -1) conv.sector = 'Seguridad';
      else if (nombre.indexOf('mantenimiento') !== -1) conv.sector = 'Mantenimiento';
      else if (nombre.indexOf('multiservicios') !== -1 || nombre.indexOf('servicios auxiliares') !== -1) conv.sector = 'Multiservicios';
      else if (nombre.indexOf('socorr') !== -1) conv.sector = 'Socorrismo';
      else if (nombre.indexOf('transport') !== -1) conv.sector = 'Transporte';
      else if (nombre.indexOf('comercio') !== -1) conv.sector = 'Comercio';
      else if (nombre.indexOf('sanidad') !== -1 || nombre.indexOf('sanitari') !== -1) conv.sector = 'Sanidad';
      else if (nombre.indexOf('instalacion') !== -1 || nombre.indexOf('montaje') !== -1 || nombre.indexOf('eléctric') !== -1) conv.sector = 'Metal';
    }
  }

  Logger.log('   ✅ ' + (conv.nombre_completo || '?') + ' | ' + (conv.sector || '?') + ' | ' + (conv.provincia || '?'));

  Logger.log('   🤖 Paso 2: Tablas salariales...');
  var datosTablas = llamarGeminiConPDF_(base64, PROMPT_CONVENIO_TABLAS);
  if (!datosTablas) return { ok: false, error: 'Error extrayendo tablas' };
  var tablas;
  try {
    var cleanTablas = datosTablas.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    var startT = cleanTablas.indexOf('{'); var endT = cleanTablas.lastIndexOf('}');
    if (startT >= 0 && endT > startT) cleanTablas = cleanTablas.substring(startT, endT + 1);
    cleanTablas = cleanTablas.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
    tablas = JSON.parse(cleanTablas);
  } catch (e) { return { ok: false, error: 'Error parseando tablas: ' + e.message }; }
  var categorias = tablas.categorias || [];
  Logger.log('   ✅ ' + categorias.length + ' categorías para año ' + (tablas.año_tablas || '?'));

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sectorAbrev = (conv.sector || 'X').substring(0, 3).toUpperCase();
  var provAbrev = (conv.provincia || 'X').substring(0, 3).toUpperCase();
  var idConvenio = 'CONV-' + sectorAbrev + '-' + provAbrev + '-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMdd');

  // Borrar anterior del mismo sector+provincia
  var hojaConv = ss.getSheetByName(HOJA_CONVENIOS);
  var de = hojaConv.getDataRange().getValues();
  for (var e2 = de.length - 1; e2 >= 1; e2--) {
    if (de[e2][2] === conv.sector && de[e2][3] === conv.provincia) { idConvenio = de[e2][0]; hojaConv.deleteRow(e2 + 1); break; }
  }

  var ssE = general.seguridad_social_empresa_porcentaje || 32.1;
  hojaConv.appendRow([idConvenio, conv.nombre_completo || archivo.getName(), conv.sector || '', conv.provincia || '',
    conv.ambito_territorial || '', conv.vigencia_desde || '', conv.vigencia_hasta || '',
    general.jornada ? general.jornada.horas_anuales : '', general.jornada ? general.jornada.horas_semanales : '',
    general.jornada ? general.jornada.dias_vacaciones : '', general.num_pagas || 15, ssE,
    general.incremento_salarial_anual || '', general.nocturnidad_hora_extra || 0, new Date(), archivo.getUrl(), general.notas || '']);

  var hojaCat = ss.getSheetByName(HOJA_CATEGORIAS_CONVENIO);
  var dc = hojaCat.getDataRange().getValues();
  for (var c = dc.length - 1; c >= 1; c--) { if (dc[c][0] === idConvenio) hojaCat.deleteRow(c + 1); }

  for (var i = 0; i < categorias.length; i++) {
    var cat = categorias[i];
    hojaCat.appendRow([idConvenio, conv.sector || '', conv.provincia || '', tablas.año_tablas || '',
      cat.grupo || '', cat.nivel || '', cat.categoria || '', cat.salario_base_diario || 0,
      cat.salario_base_mensual || 0, cat.salario_base_anual_15_pagas || 0,
      cat.plus_especialidad_mensual || 0, cat.plus_asiduidad_mensual || 0,
      cat.nocturnidad_hora || 0, cat.total_anual_bruto || 0]);
  }
  Logger.log('   ✅ Convenio procesado y guardado');
  return { ok: true, id_convenio: idConvenio, nombre: conv.nombre_completo || archivo.getName(), sector: conv.sector || '', provincia: conv.provincia || '', num_categorias: categorias.length, ss_empresa: ssE, año_tablas: tablas.año_tablas || '' };
}

function llamarGeminiConPDF_(base64, prompt) {
  var geminiKey = obtenerGeminiKey_();
  if (!geminiKey) { Logger.log('❌ Sin API Key Gemini'); return null; }
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-05-06:generateContent?key=' + geminiKey;
  var payload = { contents: [{ parts: [{ inline_data: { mime_type: 'application/pdf', data: base64 } }, { text: prompt }] }], generationConfig: { maxOutputTokens: 65000, temperature: 0.1 } };
  try {
    var response = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      var data = JSON.parse(response.getContentText());
      if (data.candidates && data.candidates[0]) {
        // Handle thinking models (parts may include thought + text)
        var parts = data.candidates[0].content.parts || [];
        var texto = '';
        for (var p = 0; p < parts.length; p++) {
          if (parts[p].text) texto = parts[p].text;
        }
        return texto;
      }
    }
    else Logger.log('   ❌ Gemini HTTP ' + response.getResponseCode() + ': ' + response.getContentText().substring(0, 200));
  } catch (e) { Logger.log('   ❌ ' + e.message); }
  return null;
}

// ════════════════════════════════════════
// SUBIR CONVENIO VÍA POST
// ════════════════════════════════════════

function subirYProcesarConvenio(data) {
  if (!data.base64) return { ok: false, error: 'No se recibió archivo' };
  var carpeta = obtenerOCrearCarpetaConvenios_();
  var blob = Utilities.newBlob(Utilities.base64Decode(data.base64), data.mime_type || 'application/pdf', data.filename || 'convenio.pdf');
  var archivo = carpeta.createFile(blob);
  return procesarConvenioPDF(archivo.getId());
}

// ════════════════════════════════════════
// ELIMINAR CONVENIO
// ════════════════════════════════════════

function eliminarConvenio_(idConvenio) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CONVENIOS);
  if (hoja) {
    var datos = hoja.getDataRange().getValues();
    for (var i = datos.length - 1; i >= 1; i--) {
      if (datos[i][0] === idConvenio) { hoja.deleteRow(i + 1); break; }
    }
  }
  var hojaCat = ss.getSheetByName(HOJA_CATEGORIAS_CONVENIO);
  if (hojaCat) {
    var dc = hojaCat.getDataRange().getValues();
    for (var c = dc.length - 1; c >= 1; c--) {
      if (dc[c][0] === idConvenio) hojaCat.deleteRow(c + 1);
    }
  }
  return { ok: true, id: idConvenio };
}

// ════════════════════════════════════════
// APIs
// ════════════════════════════════════════

function obtenerConveniosAPI_() {
  crearHojaConveniosSiNoExiste_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CONVENIOS);
  if (!hoja || hoja.getLastRow() <= 1) return { convenios: [], total: 0 };
  var datos = hoja.getDataRange().getValues(); var convenios = [];
  for (var i = 1; i < datos.length; i++) {
    convenios.push({ id: datos[i][0], nombre: datos[i][1], sector: datos[i][2], provincia: datos[i][3], ambito: datos[i][4],
      vigencia_desde: datos[i][5], vigencia_hasta: datos[i][6], horas_anuales: datos[i][7], horas_semanales: datos[i][8],
      dias_vacaciones: datos[i][9], num_pagas: datos[i][10], ss_empresa: datos[i][11], incremento_anual: datos[i][12],
      nocturnidad_hora: datos[i][13], url_documento: datos[i][15] });
  }
  return { convenios: convenios, total: convenios.length };
}

function obtenerCategoriasConvenioAPI_(idConvenio) {
  crearHojaConveniosSiNoExiste_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CATEGORIAS_CONVENIO);
  if (!hoja || hoja.getLastRow() <= 1) return { categorias: [], total: 0 };
  var datos = hoja.getDataRange().getValues(); var categorias = [];
  for (var i = 1; i < datos.length; i++) {
    if (!idConvenio || datos[i][0] === idConvenio) {
      categorias.push({ id_convenio: datos[i][0], sector: datos[i][1], provincia: datos[i][2], año: datos[i][3],
        grupo: datos[i][4], nivel: datos[i][5], categoria: datos[i][6], salario_base_diario: datos[i][7],
        salario_base_mensual: datos[i][8], salario_base_anual: datos[i][9], plus_especialidad: datos[i][10],
        plus_asiduidad: datos[i][11], nocturnidad_hora: datos[i][12], total_anual_bruto: datos[i][13] });
    }
  }
  return { categorias: categorias, total: categorias.length };
}

function buscarConvenioAplicable_(sector, provincia) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CONVENIOS);
  if (!hoja || hoja.getLastRow() <= 1) return null;
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) { if (datos[i][2].toLowerCase() === sector.toLowerCase() && datos[i][3].toLowerCase() === provincia.toLowerCase()) return datos[i][0]; }
  for (var i = 1; i < datos.length; i++) { if (datos[i][2].toLowerCase() === sector.toLowerCase() && (datos[i][3] === 'Andalucía' || datos[i][3] === 'Nacional')) return datos[i][0]; }
  return null;
}