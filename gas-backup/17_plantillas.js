// ============================================================================
// 17_plantillas.gs - GESTOR DE PLANTILLAS DOCUMENTALES
// Versión: 1.0 | Fecha: Marzo 2026
// Sistema de plantillas Google Docs con etiquetas {{campo}}
// Transversal: PRL, RGPD, RRHH, Licitaciones, Territorio
// ============================================================================

var HOJA_PLANTILLAS = 'PLANTILLAS_DOCS';

// ════════════════════════════════════════
// MÓDULOS Y ETIQUETAS DISPONIBLES
// ════════════════════════════════════════

var MODULOS_PLANTILLA = ['PRL', 'RGPD', 'RRHH', 'LICITACIONES', 'TERRITORIO', 'GENERAL'];

var ETIQUETAS_DISPONIBLES = {
  // Empleado
  '{{nombre_empleado}}':    'Nombre completo del empleado',
  '{{apellidos}}':          'Apellidos del empleado',
  '{{dni}}':                'DNI/NIE del empleado',
  '{{nss}}':                'Número de Seguridad Social',
  '{{centro}}':             'Centro de trabajo',
  '{{categoria}}':          'Categoría profesional',
  '{{fecha_alta}}':         'Fecha de alta en la empresa',
  '{{salario}}':            'Salario bruto anual',
  '{{jornada}}':            'Horas de jornada semanal',
  '{{turno}}':              'Turno de trabajo',
  // Empresa
  '{{empresa_nombre}}':     'Nombre de la empresa',
  '{{empresa_cif}}':        'CIF de la empresa',
  '{{empresa_direccion}}':  'Dirección de la empresa',
  '{{empresa_tel}}':        'Teléfono de la empresa',
  // Fechas
  '{{fecha_hoy}}':          'Fecha actual (dd/mm/aaaa)',
  '{{fecha_hoy_larga}}':    'Fecha actual en formato largo',
  '{{anio_actual}}':        'Año actual',
  // PRL
  '{{tipo_epi}}':           'Tipo de EPI',
  '{{descripcion_epi}}':    'Descripción del EPI',
  '{{cantidad_epi}}':       'Cantidad de EPIs',
  '{{talla_epi}}':          'Talla del EPI',
  '{{caducidad_epi}}':      'Fecha caducidad EPI',
  '{{tipo_reconocimiento}}':'Tipo de reconocimiento médico',
  '{{resultado_reconocimiento}}': 'Resultado del reconocimiento',
  '{{fecha_reconocimiento}}': 'Fecha del reconocimiento',
  '{{proximo_reconocimiento}}': 'Fecha próximo reconocimiento',
  '{{curso_prl}}':          'Nombre del curso PRL',
  '{{horas_formacion}}':    'Horas de formación',
  '{{entidad_formadora}}':  'Entidad formadora',
  '{{fecha_formacion}}':    'Fecha de la formación',
  // RGPD
  '{{tipo_consentimiento}}':'Tipo de consentimiento RGPD',
  '{{finalidad}}':          'Finalidad del tratamiento',
  '{{base_legal}}':         'Base legal del tratamiento',
  '{{tipo_arco}}':          'Tipo de solicitud ARCO',
  '{{fecha_solicitud_arco}}': 'Fecha de la solicitud ARCO',
  // RRHH
  '{{tipo_contrato}}':      'Tipo de contrato',
  '{{fecha_inicio_contrato}}': 'Fecha inicio del contrato',
  '{{fecha_fin_contrato}}': 'Fecha fin del contrato',
  '{{empresa_anterior}}':   'Empresa anterior (subrogación)',
  // Licitaciones
  '{{nombre_licitacion}}':  'Nombre de la licitación',
  '{{organismo}}':          'Organismo convocante',
  '{{presupuesto}}':        'Presupuesto de licitación',
  '{{fecha_limite}}':       'Fecha límite presentación',
  // General
  '{{responsable}}':        'Nombre del responsable firmante',
  '{{cargo_responsable}}':  'Cargo del responsable',
  '{{notas}}':              'Observaciones / notas adicionales'
};

// ════════════════════════════════════════
// INICIALIZACIÓN
// ════════════════════════════════════════

function crearHojaPlantillas_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(HOJA_PLANTILLAS)) return;
  var hoja = ss.insertSheet(HOJA_PLANTILLAS);
  var cab = ['ID', 'Nombre', 'Módulo', 'Descripción', 'ID Doc Google', 'URL Plantilla',
             'Etiquetas', 'Activa', 'Usos', 'Creada', 'Actualizada', 'Creada Por'];
  hoja.getRange(1, 1, 1, cab.length).setValues([cab]);
  hoja.getRange(1, 1, 1, cab.length).setBackground('#1a3c34').setFontColor('#ffffff').setFontWeight('bold');
  hoja.setColumnWidth(2, 250); hoja.setColumnWidth(4, 350); hoja.setFrozenRows(1);
}

// ════════════════════════════════════════
// OBTENER PLANTILLAS
// ════════════════════════════════════════

function obtenerPlantillasAPI_(filtro) {
  crearHojaPlantillas_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PLANTILLAS);
  if (!hoja || hoja.getLastRow() < 2) return { plantillas: [], etiquetas: ETIQUETAS_DISPONIBLES, modulos: MODULOS_PLANTILLA };

  var datos = hoja.getDataRange().getValues();
  var plantillas = [];

  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    var p = {
      id:          datos[i][0],
      nombre:      datos[i][1],
      modulo:      datos[i][2],
      descripcion: datos[i][3],
      id_doc:      datos[i][4],
      url:         datos[i][5],
      etiquetas:   datos[i][6] ? datos[i][6].split(',') : [],
      activa:      datos[i][7] !== 'No',
      usos:        datos[i][8] || 0,
      creada:      datos[i][9],
      actualizada: datos[i][10],
      creada_por:  datos[i][11]
    };
    // Verificar que el documento de Drive sigue existiendo
    if (p.id_doc) {
      try { DriveApp.getFileById(p.id_doc); } catch(e) { p.error = 'Documento no encontrado en Drive'; }
    }
    if (!filtro || !filtro.modulo || p.modulo === filtro.modulo) plantillas.push(p);
  }

  return { plantillas: plantillas, etiquetas: ETIQUETAS_DISPONIBLES, modulos: MODULOS_PLANTILLA };
}

// ════════════════════════════════════════
// REGISTRAR PLANTILLA (desde URL de Google Doc)
// ════════════════════════════════════════

function registrarPlantilla_(data) {
  if (!data.nombre || !data.modulo || !data.id_doc) return { ok: false, error: 'Nombre, módulo e ID del documento son obligatorios' };

  crearHojaPlantillas_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PLANTILLAS);

  // Verificar que el documento existe y es accesible
  var docUrl = '';
  try {
    var archivo = DriveApp.getFileById(data.id_doc);
    docUrl = archivo.getUrl();
    // Detectar etiquetas en el documento
    var doc = DocumentApp.openById(data.id_doc);
    var texto = doc.getBody().getText();
    var etiquetasEncontradas = [];
    var todasEtiquetas = Object.keys(ETIQUETAS_DISPONIBLES);
    for (var i = 0; i < todasEtiquetas.length; i++) {
      if (texto.indexOf(todasEtiquetas[i]) !== -1) etiquetasEncontradas.push(todasEtiquetas[i]);
    }
    data.etiquetas_detectadas = etiquetasEncontradas;
  } catch(e) {
    return { ok: false, error: 'No se puede acceder al documento. Verifica que el ID es correcto y que está compartido con la cuenta de servicio.' };
  }

  var id = 'TPL-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMdd') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

  hoja.appendRow([
    id, data.nombre, data.modulo, data.descripcion || '', data.id_doc, docUrl,
    (data.etiquetas_detectadas || []).join(','), 'Sí', 0, new Date(), new Date(), data.creada_por || 'Admin'
  ]);

  return { ok: true, id: id, url: docUrl, etiquetas_detectadas: data.etiquetas_detectadas || [] };
}

// ════════════════════════════════════════
// CREAR PLANTILLA VACÍA EN DRIVE
// ════════════════════════════════════════

function crearPlantillaVacia_(data) {
  if (!data.nombre || !data.modulo) return { ok: false, error: 'Nombre y módulo requeridos' };

  var carpetaRaiz = DriveApp.getFolderById(CARPETA_RAIZ_ID);
  var carpetaPlantillas = obtenerOCrearCarpeta_('PLANTILLAS', carpetaRaiz);
  var carpetaModulo = obtenerOCrearCarpeta_(data.modulo, carpetaPlantillas);

  var titulo = 'PLANTILLA — ' + data.nombre + ' [' + data.modulo + ']';
  var doc = DocumentApp.create(titulo);
  var body = doc.getBody();

  // Estructura base de la plantilla
  body.appendParagraph(data.nombre.toUpperCase()).setHeading(DocumentApp.ParagraphHeading.HEADING1).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph('Forgeser Servicios del Sur SL').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph('');
  body.appendParagraph('Fecha: {{fecha_hoy}}');
  body.appendParagraph('');

  if (data.descripcion) body.appendParagraph(data.descripcion);
  body.appendParagraph('');

  // Sección de datos según módulo
  if (data.modulo === 'RRHH' || data.modulo === 'PRL' || data.modulo === 'RGPD') {
    body.appendParagraph('DATOS DEL EMPLEADO').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph('Nombre: {{nombre_empleado}}');
    body.appendParagraph('DNI: {{dni}}');
    body.appendParagraph('Centro: {{centro}}');
    body.appendParagraph('');
  }

  body.appendParagraph('OBSERVACIONES').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('{{notas}}');
  body.appendParagraph('');
  body.appendParagraph('');
  body.appendParagraph('Firma: ________________________________     Por la empresa: ________________________________');

  // Mover a carpeta de plantillas
  var docFile = DriveApp.getFileById(doc.getId());
  carpetaModulo.addFile(docFile);
  DriveApp.getRootFolder().removeFile(docFile);

  doc.saveAndClose();

  // Registrar en la hoja
  var resultado = registrarPlantilla_({
    nombre: data.nombre,
    modulo: data.modulo,
    descripcion: data.descripcion || '',
    id_doc: doc.getId(),
    creada_por: data.creada_por || 'Admin'
  });

  return { ok: true, id: resultado.id, id_doc: doc.getId(), url: doc.getUrl(), etiquetas_detectadas: resultado.etiquetas_detectadas || [] };
}

// ════════════════════════════════════════
// GENERAR DOCUMENTO DESDE PLANTILLA
// ════════════════════════════════════════

function generarDesdePlantilla_(data) {
  // data: { id_plantilla, datos: { nombre_empleado, dni, ... }, carpeta_destino_id, nombre_archivo }
  if (!data.id_plantilla) return { ok: false, error: 'ID de plantilla requerido' };

  crearHojaPlantillas_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PLANTILLAS);
  var plantilla = null;
  var filaIdx = -1;

  if (hoja && hoja.getLastRow() > 1) {
    var datos = hoja.getDataRange().getValues();
    for (var i = 1; i < datos.length; i++) {
      if (datos[i][0] === data.id_plantilla) { plantilla = datos[i]; filaIdx = i + 1; break; }
    }
  }

  if (!plantilla) return { ok: false, error: 'Plantilla no encontrada' };
  var idDoc = plantilla[4];
  if (!idDoc) return { ok: false, error: 'Plantilla sin documento asociado' };

  // Copiar el documento plantilla
  var nombreDoc = data.nombre_archivo || (plantilla[1] + ' — ' + (data.datos.nombre_empleado || '') + ' — ' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'dd-MM-yyyy'));
  var copia;
  try {
    var archivoPlantilla = DriveApp.getFileById(idDoc);
    copia = archivoPlantilla.makeCopy(nombreDoc);
  } catch(e) {
    return { ok: false, error: 'No se puede copiar la plantilla: ' + e.message };
  }

  // Sustituir etiquetas en el documento copiado
  var docGenerado = DocumentApp.openById(copia.getId());
  var body = docGenerado.getBody();

  // Datos del sistema (siempre disponibles)
  var hoy = new Date();
  var datosCompletos = {
    '{{fecha_hoy}}':         Utilities.formatDate(hoy, 'Europe/Madrid', 'dd/MM/yyyy'),
    '{{fecha_hoy_larga}}':   Utilities.formatDate(hoy, 'Europe/Madrid', "EEEE, dd 'de' MMMM 'de' yyyy"),
    '{{anio_actual}}':       String(hoy.getFullYear()),
    '{{empresa_nombre}}':    'Forgeser Servicios del Sur SL',
    '{{empresa_cif}}':       'B21XXXXXX',
    '{{empresa_direccion}}': 'Almonte, Huelva',
    '{{empresa_tel}}':       '959 000 000'
  };

  // Combinar con los datos recibidos
  if (data.datos) {
    var camposRecibidos = Object.keys(data.datos);
    for (var j = 0; j < camposRecibidos.length; j++) {
      var clave = camposRecibidos[j];
      // Convertir clave al formato {{clave}} si no lo tiene ya
      var etiqueta = clave.indexOf('{{') === 0 ? clave : '{{' + clave + '}}';
      datosCompletos[etiqueta] = String(data.datos[clave] || '');
    }
  }

  // Sustituir todas las etiquetas
  var etiquetas = Object.keys(datosCompletos);
  for (var k = 0; k < etiquetas.length; k++) {
    body.replaceText(etiquetas[k].replace(/[{}]/g, '\\$&'), datosCompletos[etiquetas[k]]);
  }

  docGenerado.saveAndClose();

  // Mover a carpeta destino si se especifica
  if (data.carpeta_destino_id) {
    try {
      var carpetaDestino = DriveApp.getFolderById(data.carpeta_destino_id);
      carpetaDestino.addFile(copia);
      DriveApp.getRootFolder().removeFile(copia);
    } catch(e) { /* mantener en raíz si falla */ }
  } else {
    // Mover a carpeta de documentos generados por módulo
    var carpetaRaiz = DriveApp.getFolderById(CARPETA_RAIZ_ID);
    var carpetaGenerados = obtenerOCrearCarpeta_('Documentos Generados', carpetaRaiz);
    var carpetaModulo = obtenerOCrearCarpeta_(plantilla[2], carpetaGenerados);
    carpetaModulo.addFile(copia);
    try { DriveApp.getRootFolder().removeFile(copia); } catch(e) {}
  }

  // Incrementar contador de usos
  if (filaIdx > 0) hoja.getRange(filaIdx, 9).setValue((plantilla[8] || 0) + 1);

  // Registrar en DOCUMENTOS_GENERAL
  var hojaDoc = ss.getSheetByName('DOCUMENTOS_GENERAL');
  if (hojaDoc) {
    var idDocGenerado = 'DOC-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();
    hojaDoc.appendRow([idDocGenerado, nombreDoc, 'generado', plantilla[2], data.datos.nombre_empleado || '', data.datos.dni || '', data.datos.centro || '', 'generado', new Date(), new Date(), 'Sistema', 'Generado desde plantilla: ' + plantilla[1], copia.getUrl(), 'PLANTILLAS', '', '']);
  }

  return { ok: true, url: copia.getUrl(), id_doc_generado: copia.getId(), nombre: nombreDoc };
}

// ════════════════════════════════════════
// ACTUALIZAR / DESACTIVAR PLANTILLA
// ════════════════════════════════════════

function actualizarPlantilla_(data) {
  if (!data.id) return { ok: false, error: 'ID requerido' };
  crearHojaPlantillas_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PLANTILLAS);
  if (!hoja) return { ok: false, error: 'Sin hoja' };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] !== data.id) continue;
    if (data.nombre)      hoja.getRange(i+1, 2).setValue(data.nombre);
    if (data.descripcion) hoja.getRange(i+1, 4).setValue(data.descripcion);
    if (data.activa !== undefined) hoja.getRange(i+1, 8).setValue(data.activa ? 'Sí' : 'No');
    hoja.getRange(i+1, 11).setValue(new Date());
    return { ok: true };
  }
  return { ok: false, error: 'Plantilla no encontrada' };
}

// ════════════════════════════════════════
// OBTENER ETIQUETAS DE UNA PLANTILLA
// ════════════════════════════════════════

function obtenerEtiquetasPlantilla_(idPlantilla) {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_PLANTILLAS);
  if (!hoja) return { ok: false, error: 'Sin hoja' };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] !== idPlantilla) continue;
    var idDoc = datos[i][4];
    if (!idDoc) return { ok: false, error: 'Sin documento' };
    try {
      var doc = DocumentApp.openById(idDoc);
      var texto = doc.getBody().getText();
      var encontradas = [];
      var todasEtiquetas = Object.keys(ETIQUETAS_DISPONIBLES);
      for (var j = 0; j < todasEtiquetas.length; j++) {
        if (texto.indexOf(todasEtiquetas[j]) !== -1) {
          encontradas.push({ etiqueta: todasEtiquetas[j], descripcion: ETIQUETAS_DISPONIBLES[todasEtiquetas[j]] });
        }
      }
      return { ok: true, etiquetas: encontradas };
    } catch(e) { return { ok: false, error: 'No se puede leer el documento' }; }
  }
  return { ok: false, error: 'Plantilla no encontrada' };
}