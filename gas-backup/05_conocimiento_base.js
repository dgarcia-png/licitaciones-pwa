// ============================================================================
// 05_conocimiento_base.gs - BASE DE CONOCIMIENTO EMPRESA (RAG)
// Versión: 1.1 | Fecha: Marzo 2026
// ============================================================================

var HOJA_CONOCIMIENTO = 'CONOCIMIENTO_BASE';
var EMBEDDING_MODEL = 'text-embedding-004';

var CATEGORIAS_CONOCIMIENTO = {
  'memoria_tecnica':    { nombre: 'Memoria técnica ganadora',    carpeta: 'MEMORIAS_TECNICAS' },
  'memoria_economica':  { nombre: 'Memoria económica ganadora',  carpeta: 'MEMORIAS_ECONOMICAS' },
  'cv':                 { nombre: 'CV personal clave',           carpeta: 'CVS' },
  'certificacion':      { nombre: 'Certificación/acreditación',  carpeta: 'CERTIFICACIONES' },
  'metodologia':        { nombre: 'Metodología de trabajo',      carpeta: 'METODOLOGIAS' },
  'plan_calidad':       { nombre: 'Plan de calidad',             carpeta: 'PLANES_CALIDAD' },
  'plan_prl':           { nombre: 'Plan de PRL',                 carpeta: 'PLANES_PRL' },
  'plan_medioambiente': { nombre: 'Plan medioambiental',         carpeta: 'PLANES_MEDIOAMBIENTE' },
  'experiencia':        { nombre: 'Experiencia acreditada',      carpeta: 'EXPERIENCIA' },
  'mejora_tipo':        { nombre: 'Mejora tipo ofertada',        carpeta: 'MEJORAS' },
  'maquinaria':         { nombre: 'Catálogo maquinaria/productos', carpeta: 'MAQUINARIA' },
  'contrato':           { nombre: 'Contrato vigente/anterior',   carpeta: 'CONTRATOS' },
  'modelo_oferta':      { nombre: 'Modelo de oferta completa',   carpeta: 'MODELOS_OFERTA' },
  'otro':               { nombre: 'Otro documento',              carpeta: 'OTROS' }
};

// ════════════════════════════════════════
// INICIALIZACIÓN
// ════════════════════════════════════════

function crearHojaConocimientoSiNoExiste_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(HOJA_CONOCIMIENTO)) return;
  var hoja = ss.insertSheet(HOJA_CONOCIMIENTO);
  var cab = ['ID', 'Categoría', 'Nombre documento', 'Descripción', 'Sector', 'Ámbito',
    'Fecha documento', 'Resultado', 'Importe contrato', 'Organismo/cliente', 'Tags',
    'Archivo Drive ID', 'Archivo Drive URL', 'Texto extraído (resumen)',
    'Embedding ID', 'Tiene embedding', 'Fecha subida', 'Chunks'];
  hoja.getRange(1, 1, 1, cab.length).setValues([cab]);
  hoja.getRange(1, 1, 1, cab.length).setBackground('#1a237e').setFontColor('#ffffff').setFontWeight('bold');
  hoja.setColumnWidth(3, 300); hoja.setColumnWidth(4, 350); hoja.setColumnWidth(14, 400);
  hoja.setFrozenRows(1);
}

function obtenerOCrearCarpetaConocimiento_() {
  var carpetaRaiz = DriveApp.getFolderById(CARPETA_RAIZ_ID);
  var carpetas = carpetaRaiz.getFoldersByName('BASE_CONOCIMIENTO');
  if (carpetas.hasNext()) return carpetas.next();
  return carpetaRaiz.createFolder('BASE_CONOCIMIENTO');
}

function obtenerOCrearSubcarpeta_(carpetaPadre, nombre) {
  var carpetas = carpetaPadre.getFoldersByName(nombre);
  if (carpetas.hasNext()) return carpetas.next();
  return carpetaPadre.createFolder(nombre);
}

// ════════════════════════════════════════
// SUBIR DOCUMENTO + PROCESAR
// ════════════════════════════════════════

function subirDocumentoConocimiento_(data) {
  crearHojaConocimientoSiNoExiste_();
  if (!data.base64) return { ok: false, error: 'No se recibió archivo' };

  var categoria = data.categoria || 'otro';
  var catInfo = CATEGORIAS_CONOCIMIENTO[categoria] || CATEGORIAS_CONOCIMIENTO['otro'];

  var carpetaBase = obtenerOCrearCarpetaConocimiento_();
  var subcarpeta = obtenerOCrearSubcarpeta_(carpetaBase, catInfo.carpeta);
  var blob = Utilities.newBlob(Utilities.base64Decode(data.base64), data.mime_type || 'application/pdf', data.filename || 'documento.pdf');
  var archivo = subcarpeta.createFile(blob);

  var textoExtraido = '';
  var resumen = '';
  try {
    var resultado = extraerTextoConGemini_(archivo);
    textoExtraido = resultado.texto || '';
    resumen = resultado.resumen || '';
  } catch (e) { Logger.log('Error extrayendo texto: ' + e.message); }

  var tieneEmbedding = false;
  var numChunks = 0;
  var embeddingId = '';
  try {
    var chunks = fragmentarTexto_(textoExtraido, 800);
    numChunks = chunks.length;
    if (numChunks > 0) {
      embeddingId = 'EMB-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss');
      guardarEmbeddings_(embeddingId, chunks, { categoria: categoria, nombre: data.filename, sector: data.sector || '', resultado: data.resultado || '', tags: data.tags || '' });
      tieneEmbedding = true;
    }
  } catch (e) { Logger.log('Error embeddings: ' + e.message); }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CONOCIMIENTO);
  var id = 'DOC-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 1000);

  hoja.appendRow([id, categoria, data.filename || 'documento.pdf', data.descripcion || resumen.substring(0, 500),
    data.sector || '', data.ambito || 'público', data.fecha_documento || '', data.resultado || '',
    parseFloat(data.importe) || '', data.organismo || '', data.tags || '',
    archivo.getId(), archivo.getUrl(), (resumen + '\n\n' + textoExtraido).substring(0, 5000),
    embeddingId, tieneEmbedding, new Date(), numChunks]);

  return { ok: true, id: id, nombre: data.filename, categoria: catInfo.nombre,
    texto_extraido: resumen.substring(0, 300), chunks: numChunks,
    tiene_embedding: tieneEmbedding, drive_url: archivo.getUrl() };
}

// ════════════════════════════════════════
// EXTRAER TEXTO CON GEMINI
// ════════════════════════════════════════

function extraerTextoConGemini_(archivo) {
  var base64 = Utilities.base64Encode(archivo.getBlob().getBytes());
  var mimeType = archivo.getMimeType();

  var prompt = 'Analiza este documento de una empresa de servicios (limpieza, mantenimiento, facilities). '
    + 'Extrae TODO el contenido textual relevante. '
    + 'Primero RESUMEN: 2-3 frases. Luego CONTENIDO: texto completo. '
    + 'Si es memoria técnica: metodología, medios, organización, mejoras. '
    + 'Si es CV: nombre, puesto, experiencia, formación. '
    + 'Si es certificación: tipo, alcance, entidad, vigencia. '
    + 'Si es experiencia: cliente, objeto, importe, fechas. '
    + 'Formato: RESUMEN: [texto]\n\nCONTENIDO: [texto completo]';

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + GEMINI_API_KEY;
  var payload = { contents: [{ parts: [{ inline_data: { mime_type: mimeType, data: base64 } }, { text: prompt }] }], generationConfig: { maxOutputTokens: 65000, temperature: 0.1 } };

  var response = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) return { texto: '', resumen: '' };

  var data = JSON.parse(response.getContentText());
  var textoCompleto = '';
  if (data.candidates && data.candidates[0]) textoCompleto = data.candidates[0].content.parts[0].text;

  var resumen = '', contenido = textoCompleto;
  var split = textoCompleto.split('CONTENIDO:');
  if (split.length > 1) { resumen = split[0].replace('RESUMEN:', '').trim(); contenido = split[1].trim(); }

  return { texto: contenido, resumen: resumen };
}

// ════════════════════════════════════════
// EMBEDDINGS (Gemini text-embedding-004)
// ════════════════════════════════════════

var HOJA_EMBEDDINGS = 'EMBEDDINGS_INDEX';

function crearHojaEmbeddingsSiNoExiste_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(HOJA_EMBEDDINGS)) return;
  var hoja = ss.insertSheet(HOJA_EMBEDDINGS);
  hoja.getRange(1, 1, 1, 5).setValues([['Embedding ID', 'Chunk Index', 'Texto', 'Metadata JSON', 'Vector JSON']]);
  hoja.getRange(1, 1, 1, 5).setBackground('#311b92').setFontColor('#ffffff').setFontWeight('bold');
  hoja.setColumnWidth(3, 500); hoja.setColumnWidth(5, 300); hoja.setFrozenRows(1);
}

function generarEmbedding_(texto) {
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=' + GEMINI_API_KEY;
  var payload = {
    model: 'models/text-embedding-004',
    content: { parts: [{ text: texto }] }
  };

  var response = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });

  if (response.getResponseCode() !== 200) {
    Logger.log('Error embedding: ' + response.getContentText().substring(0, 200));
    return null;
  }

  var data = JSON.parse(response.getContentText());
  return data.embedding ? data.embedding.values : null;
}

function fragmentarTexto_(texto, tamanoChunk) {
  if (!texto || texto.length < 50) return [];
  var chunks = [];
  var parrafos = texto.split(/\n\n+/);
  var actual = '';
  for (var i = 0; i < parrafos.length; i++) {
    if ((actual + '\n' + parrafos[i]).length > tamanoChunk && actual.length > 100) {
      chunks.push(actual.trim());
      actual = parrafos[i];
    } else {
      actual += (actual ? '\n' : '') + parrafos[i];
    }
  }
  if (actual.length > 50) chunks.push(actual.trim());
  return chunks;
}

function guardarEmbeddings_(embeddingId, chunks, metadata) {
  crearHojaEmbeddingsSiNoExiste_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_EMBEDDINGS);
  var metaJson = JSON.stringify(metadata);

  for (var i = 0; i < chunks.length; i++) {
    var vector = generarEmbedding_(chunks[i]);
    if (vector) {
      hoja.appendRow([embeddingId, i, chunks[i].substring(0, 10000), metaJson, JSON.stringify(vector)]);
    }
    if (i > 0 && i % 5 === 0) Utilities.sleep(1000);
  }
}

// ════════════════════════════════════════
// BÚSQUEDA SEMÁNTICA (RAG)
// ════════════════════════════════════════

function buscarConocimientoRelevante_(query, limit) {
  limit = limit || 5;
  crearHojaEmbeddingsSiNoExiste_();

  var queryVector = generarEmbedding_(query);
  if (!queryVector) return [];

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_EMBEDDINGS);
  if (!hoja || hoja.getLastRow() <= 1) return [];

  var datos = hoja.getDataRange().getValues();
  var resultados = [];
  for (var i = 1; i < datos.length; i++) {
    try {
      var docVector = JSON.parse(datos[i][4]);
      var similitud = similitudCoseno_(queryVector, docVector);
      resultados.push({ embedding_id: datos[i][0], chunk_index: datos[i][1], texto: datos[i][2], metadata: JSON.parse(datos[i][3] || '{}'), similitud: similitud });
    } catch (e) {}
  }
  resultados.sort(function(a, b) { return b.similitud - a.similitud; });
  return resultados.slice(0, limit);
}

function similitudCoseno_(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  var dot = 0, normA = 0, normB = 0;
  for (var i = 0; i < vecA.length; i++) { dot += vecA[i] * vecB[i]; normA += vecA[i] * vecA[i]; normB += vecB[i] * vecB[i]; }
  var denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

// ════════════════════════════════════════
// APIs
// ════════════════════════════════════════

function obtenerDocumentosConocimientoAPI_() {
  crearHojaConocimientoSiNoExiste_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CONOCIMIENTO);
  if (!hoja || hoja.getLastRow() <= 1) return { documentos: [], total: 0, categorias: CATEGORIAS_CONOCIMIENTO };

  var datos = hoja.getDataRange().getValues();
  var docs = [];
  for (var i = 1; i < datos.length; i++) {
    docs.push({ id: datos[i][0], categoria: datos[i][1], nombre: datos[i][2],
      descripcion: (datos[i][3] || '').substring(0, 200), sector: datos[i][4], ambito: datos[i][5],
      fecha_documento: datos[i][6], resultado: datos[i][7], importe: datos[i][8],
      organismo: datos[i][9], tags: datos[i][10], drive_url: datos[i][12],
      tiene_embedding: datos[i][15], fecha_subida: datos[i][16], chunks: datos[i][17] });
  }

  var stats = {};
  for (var cat in CATEGORIAS_CONOCIMIENTO) stats[cat] = 0;
  docs.forEach(function(d) { if (stats[d.categoria] !== undefined) stats[d.categoria]++; });

  return { documentos: docs, total: docs.length, categorias: CATEGORIAS_CONOCIMIENTO, stats: stats };
}

function eliminarDocumentoConocimiento_(docId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CONOCIMIENTO);
  if (hoja) {
    var datos = hoja.getDataRange().getValues();
    var embId = '';
    for (var i = datos.length - 1; i >= 1; i--) {
      if (datos[i][0] === docId) {
        embId = datos[i][14];
        try { DriveApp.getFileById(datos[i][11]).setTrashed(true); } catch (e) {}
        hoja.deleteRow(i + 1);
        break;
      }
    }
    if (embId) {
      var hojaEmb = ss.getSheetByName(HOJA_EMBEDDINGS);
      if (hojaEmb) {
        var de = hojaEmb.getDataRange().getValues();
        for (var j = de.length - 1; j >= 1; j--) {
          if (de[j][0] === embId) hojaEmb.deleteRow(j + 1);
        }
      }
    }
  }
  return { ok: true, id: docId };
}

function buscarConocimientoAPI_(query, limit) {
  var resultados = buscarConocimientoRelevante_(query, limit || 8);
  return { query: query, resultados: resultados.map(function(r) {
    return { texto: r.texto.substring(0, 500), categoria: r.metadata.categoria || '', nombre: r.metadata.nombre || '', similitud: Math.round(r.similitud * 100) / 100 };
  }), total: resultados.length };
}

// ════════════════════════════════════════
// CONTEXTO RAG PARA ANÁLISIS DE PLIEGOS
// ════════════════════════════════════════

function generarContextoEmpresaParaPliego_(textoPliego) {
  var query = textoPliego.substring(0, 500);
  var relevantes = buscarConocimientoRelevante_(query, 10);
  if (relevantes.length === 0) return '';

  var contexto = '\n\n=== CONOCIMIENTO DE LA EMPRESA ===\n';
  contexto += 'Fragmentos de documentos internos relevantes:\n\n';

  for (var i = 0; i < relevantes.length; i++) {
    var r = relevantes[i];
    if (r.similitud < 0.3) continue;
    contexto += '--- Doc: ' + (r.metadata.nombre || '?') + ' | Tipo: ' + (r.metadata.categoria || '?') + ' | Rel: ' + Math.round(r.similitud * 100) + '% ---\n';
    contexto += r.texto.substring(0, 800) + '\n\n';
  }
  return contexto;
}

function statsConocimientoAPI_() {
  crearHojaConocimientoSiNoExiste_();
  crearHojaEmbeddingsSiNoExiste_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hojaDocs = ss.getSheetByName(HOJA_CONOCIMIENTO);
  var totalDocs = hojaDocs ? Math.max(0, hojaDocs.getLastRow() - 1) : 0;
  var hojaEmb = ss.getSheetByName(HOJA_EMBEDDINGS);
  var totalChunks = hojaEmb ? Math.max(0, hojaEmb.getLastRow() - 1) : 0;
  return { total_documentos: totalDocs, total_chunks_indexados: totalChunks, categorias_disponibles: Object.keys(CATEGORIAS_CONOCIMIENTO).length, listo_para_rag: totalChunks > 0 };
}