// ============================================================================
// 01_analisis_gemini.gs v1.5 | Marzo 2026
// v1.5: OPTIMIZADO - envía PDFs directamente a Gemini (1 llamada, sin timeout)
// ============================================================================

var GEMINI_API_KEY = obtenerGeminiKey_();
var GEMINI_MODEL = 'gemini-3.1-pro-preview';
var HOJA_ANALISIS = 'ANALISIS_IA';

var PROMPT_ANALISIS_PLIEGO = `Eres un experto en licitaciones públicas españolas (LCSP 9/2017) especializado en servicios de limpieza, mantenimiento, jardinería y facilities.
Analiza los documentos del pliego adjuntos y extrae la información en formato JSON estricto.

INSTRUCCIONES:
- Responde SOLO con el JSON, sin texto adicional, sin backticks, sin markdown.
- Si un dato no está disponible, pon null o array vacío según el tipo.
- Los importes siempre en euros con 2 decimales (número, no string).
- Las fechas en formato DD/MM/AAAA.
- BUSCA EN TODO EL DOCUMENTO: cuerpo principal, anexos, tablas, apéndices, notas al pie.
- Para servicios de limpieza: prioriza el PPT (Prescripciones Técnicas) sobre el PCAP para datos operativos.
- Para zonas verdes/jardinería: busca ratios UTH/ha, inventario de zonas, tipologías.

ESTRUCTURA JSON REQUERIDA:
{
  "resumen_ejecutivo": "Resumen de 3-5 líneas con lo más relevante para tomar la decisión GO/NO-GO",
  "datos_basicos": {
    "objeto_contrato": "",
    "tipo_servicio": "limpieza_edificios|zonas_verdes|mantenimiento|mixto|otro",
    "organismo": "",
    "municipio": "",
    "provincia": "",
    "tipo_contrato": "Servicios|Obras|Suministros|Mixto",
    "presupuesto_base_con_iva": 0.00,
    "presupuesto_base_sin_iva": 0.00,
    "valor_estimado": 0.00,
    "duracion_meses": 0,
    "prorrogas": "",
    "num_lotes": 0,
    "lotes_descripcion": "",
    "lotes": [
      {
        "num_lote": 1,
        "descripcion": "",
        "presupuesto_sin_iva": 0.00,
        "presupuesto_con_iva": 0.00,
        "horas_totales": 0,
        "superficie_total_m2": 0,
        "centros": "",
        "subrogacion_aplica": "Sí/No",
        "num_trabajadores": 0,
        "observaciones": ""
      }
    ],
    "revision_precios": "Sí/No",
    "cpv": ""
  },
  "plazos": {
    "presentacion_ofertas": "",
    "duracion_ejecucion": "",
    "inicio_previsto": ""
  },
  "estructura_economica": {
    "precio_hora_maximo": 0.00,
    "precio_hora_nocturna": 0.00,
    "precio_hora_festiva": 0.00,
    "pct_coste_personal": 0,
    "pct_materiales": 0,
    "pct_costes_indirectos": 0,
    "pct_beneficio_industrial": 0,
    "convenio_referencia": "",
    "forma_pago": "mensual|trimestral|fin_contrato",
    "notas_economicas": ""
  },
  "servicios_requeridos": {
    "descripcion_general": "",
    "tipo_espacios": [""],
    "centros_o_zonas": [
      {
        "nombre": "",
        "direccion": "",
        "superficie_m2": 0,
        "dias_servicio": "",
        "horario_inicio": "",
        "horario_fin": "",
        "horas_semana": 0,
        "horas_anuales": 0,
        "observaciones": ""
      }
    ],
    "total_horas_contrato": 0,
    "bolsa_horas_emergencia": 0,
    "total_superficie_m2": 0,
    "tareas_principales": [
      {
        "tarea": "",
        "frecuencia": "diaria|semanal|quincenal|mensual|anual|a_demanda",
        "espacios_afectados": "",
        "observaciones": ""
      }
    ],
    "tareas_periodicas": [
      {
        "tarea": "",
        "frecuencia": "",
        "mes_realizacion": ""
      }
    ],
    "materiales_cargo_empresa": [""],
    "materiales_cargo_administracion": [""],
    "uniformidad_requerida": "Sí/No",
    "identificacion_requerida": "Sí/No",
    "plan_trabajo_requerido": "Sí/No",
    "informes_requeridos": ""
  },
  "medios_minimos_requeridos": {
    "personal": [
      {
        "categoria": "",
        "num_minimo": 0,
        "jornada_horas_semana": 0,
        "requisitos_especificos": "",
        "certificaciones_requeridas": ""
      }
    ],
    "maquinaria": [
      {
        "tipo": "",
        "unidades": 0,
        "disponibilidad": "100%|requerimiento",
        "especificaciones": ""
      }
    ],
    "vehiculos": [
      {
        "tipo": "",
        "unidades": 0,
        "capacidad": "",
        "especificaciones": ""
      }
    ],
    "herramientas_especificas": [""],
    "software_gestion": "Sí/No",
    "seguro_responsabilidad_minimo": 0.00
  },
  "dimensionamiento_estimado": {
    "operarios_estimados": 0,
    "encargados_estimados": 0,
    "total_personas": 0,
    "jornada_tipo": "completa|parcial|mixta",
    "turnos": "",
    "notas_dimensionamiento": "Justifica cómo has calculado el número de personas basándote en horas totales, ratios UTH/ha, horarios o cualquier dato del pliego"
  },
  "solvencia_economica": {
    "volumen_anual_negocios": "",
    "importe_minimo": 0.00,
    "seguro_responsabilidad": 0.00,
    "otros": ""
  },
  "solvencia_tecnica": {
    "trabajos_similares": "",
    "importe_minimo_trabajos": 0.00,
    "anos_experiencia": 0,
    "personal_cualificado": "",
    "certificaciones": [""],
    "otros": ""
  },
  "clasificacion_empresarial": {
    "requerida": "Sí/No",
    "grupo": "",
    "subgrupo": "",
    "categoria": ""
  },
  "garantias": {
    "provisional": "",
    "definitiva_pct": 0,
    "complementaria": ""
  },
  "criterios_adjudicacion": [
    {
      "criterio": "",
      "tipo": "Automático|Juicio de valor",
      "puntuacion_maxima": 0,
      "descripcion": "",
      "como_puntuar": "Indicaciones concretas para maximizar puntuación en este criterio"
    }
  ],
  "personal_subrogacion": {
    "aplica": "Sí/No",
    "obligatoria": "Sí/No",
    "num_trabajadores": 0,
    "convenio_aplicable": "",
    "empresa_saliente": "",
    "categorias_resumen": "",
    "coste_masa_salarial_estimado": 0.00,
    "trabajadores": [
      {
        "nombre": "",
        "apellidos": "",
        "categoria": "",
        "grupo": "",
        "tipo_contrato": "Indefinido|Temporal|No especificado",
        "jornada_horas_semana": 0,
        "antiguedad_anos": 0,
        "salario_bruto_anual": 0.00,
        "complementos": "",
        "centro": "",
        "turno": ""
      }
    ]
  },
  "condiciones_especiales": {
    "medioambientales": "",
    "sociales": "",
    "insercion_laboral": "",
    "cae_prl_requerido": "Sí/No",
    "otras": ""
  },
  "penalizaciones": {
    "por_incumplimiento": "",
    "por_retraso": "",
    "por_calidad": "",
    "causas_resolucion": ""
  },
  "mejoras_valorables": [
    {
      "mejora": "",
      "puntuacion": 0,
      "como_aprovecharla": ""
    }
  ],
  "documentacion_oferta": [""],
  "riesgos_detectados": [
    {
      "riesgo": "",
      "gravedad": "alta|media|baja",
      "mitigacion": ""
    }
  ],
  "oportunidades_detectadas": [
    {
      "oportunidad": "",
      "impacto": "alto|medio|bajo"
    }
  ],
  "puntuacion_interes": {
    "valor": 0,
    "justificacion": "",
    "recomendacion": "GO|NO-GO|REVISAR"
  }
}

CONTEXTO EMPRESA: Forgeser Servicios del Sur SL — limpieza de edificios, mantenimiento, jardinería y facilities en Andalucía. Experiencia principal en sector público (ayuntamientos, colegios, hospitales, servicios sociales).

GUÍA PARA DIMENSIONAMIENTO — IMPORTANTE:
- Limpieza edificios: total_horas_contrato / 1720h_año = operarios (jornada completa). Luego ajusta por convenio y absentismo.
- Zonas verdes CON inventario UTH/ha en pliego: suma(superficie_ha × ratio_UTH) = operarios. Ratios del propio pliego si los da; si no: Tipo A=0,80, Tipo B=0,70, periurbano=0,05, maceteros=0,0057 por unidad, árbol alineación=0,001 por árbol.
- Zonas verdes SIN inventario UTH/ha: usa maquinaria mínima exigida (número de equipos simultáneos × operarios por equipo) + especialistas (podadores, encargado riego).
- NUNCA calcules operarios dividiendo el presupuesto entre un coste salarial estimado. Eso es incorrecto.
- Busca primero en el pliego si especifica explícitamente el número mínimo de personas → usa ese dato.
- Para maceteros/lote 2: usa ratio maceteros × 0,0057 UTH si hay inventario; si no, estima por horas de trabajo indicadas.

SOBRE SUBROGACIÓN:
- Si hay tabla de trabajadores, rellena TODOS en el array trabajadores
- Si hay categorías sin nombre, crea una entrada por trabajador estimado
- Calcula coste_masa_salarial_estimado sumando salarios + 33% SS empresa

SOBRE LOTES — MUY IMPORTANTE:
- El array "datos_basicos.lotes" debe tener UNA ENTRADA POR CADA LOTE del contrato
- num_lotes debe coincidir exactamente con el número de entradas del array
- Para cada lote extrae: num_lote, descripcion completa, presupuesto_sin_iva propio, presupuesto_con_iva, horas_totales propias, centros/zonas incluidas, subrogacion_aplica, num_trabajadores
- Si el presupuesto no está desglosado por lote, estima en base a la proporción de horas o superficie de cada lote respecto al total
- Si no hay lotes, pon num_lotes=1 y un único elemento en el array lotes con los datos del contrato completo

Analiza los documentos adjuntos:`;

// ============================================================================
// FUNCIÓN PRINCIPAL — OPTIMIZADA: 1 sola llamada a Gemini con PDFs directos
// ============================================================================

function analizarPliegosOportunidad(oportunidadId) {
  Logger.log('🤖 Análisis IA: ' + oportunidadId);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('OPORTUNIDADES');
  if (!hoja) return { ok: false, error: 'Hoja OPORTUNIDADES no encontrada' };

  var datos = hoja.getDataRange().getValues();
  var fila = -1, oportunidad = null;
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === oportunidadId) {
      fila = i + 1;
      oportunidad = { id: datos[i][0], titulo: datos[i][3], organismo: datos[i][4], cpv: datos[i][5], presupuesto: datos[i][6], descripcion: datos[i][12], notas: datos[i][14] || '', docs_json: datos[i][15] || '' };
      break;
    }
  }
  if (!oportunidad) return { ok: false, error: 'Oportunidad no encontrada' };

  // Buscar PDFs en Drive
  var pdfs = [];
  try {
    var carpetaRaiz = DriveApp.getFolderById(CARPETA_RAIZ_ID);
    var carpetas = carpetaRaiz.getFoldersByName(oportunidadId);
    if (carpetas.hasNext()) {
      var carpetaOpo = carpetas.next();
      var archivos = carpetaOpo.getFiles();
      while (archivos.hasNext()) {
        var archivo = archivos.next();
        if (archivo.getMimeType() === 'application/pdf') {
          pdfs.push(archivo);
        }
      }
    }
  } catch (e) { Logger.log('   ⚠️ Drive: ' + e.message); }

  // Si no hay archivos, intentar descargar
  if (pdfs.length === 0 && oportunidad.docs_json) {
    try {
      descargarPliegosOportunidad(oportunidadId);
      var carpetas2 = carpetaRaiz.getFoldersByName(oportunidadId);
      if (carpetas2.hasNext()) {
        var carpetaOpo2 = carpetas2.next();
        var archivos2 = carpetaOpo2.getFiles();
        while (archivos2.hasNext()) {
          var a2 = archivos2.next();
          if (a2.getMimeType() === 'application/pdf') pdfs.push(a2);
        }
      }
    } catch (e) { Logger.log('   ⚠️ Descarga: ' + e.message); }
  }

  if (pdfs.length === 0) return { ok: false, error: 'No se encontraron documentos. Descarga los pliegos primero.' };

  // Priorizar: PCAP y PPT primero, luego otros
  pdfs.sort(function(a, b) {
    var na = a.getName().toUpperCase(), nb = b.getName().toUpperCase();
    var pa = (na.indexOf('PCAP') !== -1 || na.indexOf('PLIEGO') !== -1) ? 0 : (na.indexOf('PPT') !== -1 || na.indexOf('PRESCRIPCION') !== -1) ? 1 : 2;
    var pb = (nb.indexOf('PCAP') !== -1 || nb.indexOf('PLIEGO') !== -1) ? 0 : (nb.indexOf('PPT') !== -1 || nb.indexOf('PRESCRIPCION') !== -1) ? 1 : 2;
    return pa - pb;
  });

  // Limitar a 4 PDFs máximo (los más importantes) para no exceder límites
  var maxPdfs = Math.min(pdfs.length, 4);
  Logger.log('   📄 ' + pdfs.length + ' PDFs encontrados, usando ' + maxPdfs);

  // Construir partes: PDFs como inline_data + prompt como texto
  var parts = [];
  var totalBytes = 0;
  var maxBytes = 15 * 1024 * 1024; // 15MB máximo total

  for (var p = 0; p < maxPdfs; p++) {
    var pdf = pdfs[p];
    var size = pdf.getSize();
    if (totalBytes + size > maxBytes) {
      Logger.log('   ⚠️ Omitiendo ' + pdf.getName() + ' (excede límite)');
      continue;
    }
    Logger.log('   📎 ' + pdf.getName() + ' (' + Math.round(size / 1024) + ' KB)');
    var base64 = Utilities.base64Encode(pdf.getBlob().getBytes());
    parts.push({ inline_data: { mime_type: 'application/pdf', data: base64 } });
    totalBytes += size;
  }

  // Añadir prompt al final
  parts.push({ text: PROMPT_ANALISIS_PLIEGO });

  Logger.log('   🤖 Enviando ' + (parts.length - 1) + ' PDFs a Gemini en 1 llamada...');

  // UNA SOLA llamada a Gemini con todos los PDFs
  var geminiKey = obtenerGeminiKey_();
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + geminiKey;
  var payload = {
    contents: [{ parts: parts }],
    generationConfig: { maxOutputTokens: 65000, temperature: 0.2 }
  };

  var analisis = null;
  try {
    var response = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
    Logger.log('   Gemini HTTP: ' + response.getResponseCode());
    if (response.getResponseCode() === 200) {
      var data = JSON.parse(response.getContentText());
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        var respParts = data.candidates[0].content.parts || [];
        for (var rp = 0; rp < respParts.length; rp++) { if (respParts[rp].text) analisis = respParts[rp].text; }
      }
    } else {
      Logger.log('   ❌ ' + response.getContentText().substring(0, 300));
    }
  } catch (e) { Logger.log('   ❌ ' + e.message); }

  if (!analisis) return { ok: false, error: 'Error en el análisis de Gemini' };

  // Parsear JSON
  var resultado;
  try {
    var jsonStr = analisis.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    var startJ = jsonStr.indexOf('{'); var endJ = jsonStr.lastIndexOf('}');
    if (startJ >= 0 && endJ > startJ) jsonStr = jsonStr.substring(startJ, endJ + 1);
    jsonStr = jsonStr.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
    resultado = JSON.parse(jsonStr);
  } catch (e) {
    Logger.log('   ⚠️ Parse: ' + e.message);
    resultado = { resumen_ejecutivo: analisis.substring(0, 2000), error_parseo: true };
  }

  // Guardar en ANALISIS_IA
  crearHojaAnalisisSiNoExiste_();
  var hojaAnalisis = ss.getSheetByName(HOJA_ANALISIS);
  var datosAnalisis = hojaAnalisis.getDataRange().getValues();
  var filaExistente = -1;
  for (var a = 1; a < datosAnalisis.length; a++) { if (datosAnalisis[a][0] === oportunidadId) { filaExistente = a + 1; break; } }

  var resumenCorto = (resultado.resumen_ejecutivo || '').substring(0, 500);
  var criteriosTexto = '';
  if (resultado.criterios_adjudicacion) { criteriosTexto = resultado.criterios_adjudicacion.map(function(c) { return c.criterio + ' (' + c.puntuacion_maxima + 'pts, ' + c.tipo + ')'; }).join(' | '); }
  var personalTexto = resultado.personal_requerido ? (resultado.personal_requerido.subrogacion === 'Sí' ? 'SUBROGACIÓN: ' + resultado.personal_requerido.num_trabajadores_subrogar + ' trabajadores. ' : '') + (resultado.personal_requerido.detalle || '') : '';
  var riesgosTexto = (resultado.riesgos_detectados || []).join(' | ');
  var oportunidadesTexto = (resultado.oportunidades_detectadas || []).join(' | ');
  var puntuacion = resultado.puntuacion_interes ? resultado.puntuacion_interes.valor : 0;

  var filaData = [oportunidadId, oportunidad.titulo, oportunidad.organismo, new Date(), resumenCorto, resultado.datos_basicos ? resultado.datos_basicos.tipo_contrato : '', resultado.datos_basicos ? resultado.datos_basicos.duracion_contrato : '', criteriosTexto.substring(0, 1000), personalTexto.substring(0, 500), resultado.solvencia_tecnica ? resultado.solvencia_tecnica.trabajos_similares : '', resultado.clasificacion_empresarial ? resultado.clasificacion_empresarial.requerida : '', riesgosTexto.substring(0, 500), oportunidadesTexto.substring(0, 500), puntuacion, JSON.stringify(resultado).substring(0, 50000)];

  if (filaExistente > 0) hojaAnalisis.getRange(filaExistente, 1, 1, filaData.length).setValues([filaData]);
  else hojaAnalisis.appendRow(filaData);

  if (puntuacion > 0 && fila > 0) { var sc = datos[fila - 1][10] || 0; hoja.getRange(fila, 11).setValue(Math.min(100, Math.round((sc + puntuacion) / 2))); }

  // ═══ SUBROGACIÓN AUTOMÁTICA ═══
  var numSubrogados = 0;
  var idSubrogacion = '';

  if (resultado.personal_requerido && resultado.personal_requerido.subrogacion === 'Sí') {
    var trabajadores = (resultado.personal_requerido.trabajadores || []).filter(function(t) { return t && t.categoria; });

    // FALLBACK: generar desde categorías
    if (trabajadores.length === 0 && resultado.personal_requerido.num_trabajadores_subrogar > 0) {
      Logger.log('   👥 Generando desde categorías...');
      var catTexto = resultado.personal_requerido.categorias_profesionales || '';
      var partes2 = catTexto.split(/[,;]+/);
      for (var cp = 0; cp < partes2.length; cp++) {
        var parte = partes2[cp].trim();
        if (!parte) continue;
        var match = parte.match(/^(\d+)\s+(.+)$/);
        if (match) {
          for (var q = 0; q < parseInt(match[1]); q++) {
            trabajadores.push({ nombre: '', apellidos: '', categoria: match[2].trim(), grupo: '', tipo_contrato: 'No especificado', jornada: '', antiguedad: '', salario_bruto_anual: 0, complementos: '', centro: '', turno: 'No especificado', observaciones: 'Generado desde análisis IA' });
          }
        } else {
          trabajadores.push({ nombre: '', apellidos: '', categoria: parte, grupo: '', tipo_contrato: 'No especificado', jornada: '', antiguedad: '', salario_bruto_anual: 0, complementos: '', centro: '', turno: 'No especificado', observaciones: 'Generado desde análisis IA' });
        }
      }
      var faltan = resultado.personal_requerido.num_trabajadores_subrogar - trabajadores.length;
      for (var g = 0; g < faltan; g++) {
        trabajadores.push({ nombre: '', apellidos: '', categoria: 'Sin especificar', grupo: '', tipo_contrato: 'No especificado', jornada: '', antiguedad: '', salario_bruto_anual: 0, complementos: '', centro: '', turno: 'No especificado', observaciones: 'Sin datos en pliego' });
      }
    }

    if (trabajadores.length > 0) {
      Logger.log('   👥 Subrogación: ' + trabajadores.length + ' trabajadores');
      try {
        var hojaSubr = ss.getSheetByName('SUBROGACIONES');
        if (!hojaSubr) {
          hojaSubr = ss.insertSheet('SUBROGACIONES');
          hojaSubr.getRange(1, 1, 1, 14).setValues([['ID', 'ID Oportunidad', 'Título Licitación', 'Organismo', 'Empresa Saliente', 'Convenio Aplicable', 'Nº Personal', 'Coste Anual Estimado', 'Fecha Subrogación', 'Estado', 'Responsable', 'Fecha Creación', 'Notas', 'Docs Completos']]);
          hojaSubr.getRange(1, 1, 1, 14).setBackground('#4a148c').setFontColor('#ffffff').setFontWeight('bold');
          hojaSubr.setFrozenRows(1);
        }

        // Buscar existente
        var datosSubr = hojaSubr.getDataRange().getValues();
        var subrExistente = false;
        for (var s = 1; s < datosSubr.length; s++) {
          if (datosSubr[s][1] === oportunidadId) { idSubrogacion = datosSubr[s][0]; subrExistente = true;
            hojaSubr.getRange(s + 1, 5).setValue(resultado.personal_requerido.empresa_saliente || '');
            hojaSubr.getRange(s + 1, 6).setValue(resultado.personal_requerido.convenio_aplicable || '');
            hojaSubr.getRange(s + 1, 7).setValue(trabajadores.length);
            break;
          }
        }

        if (!subrExistente) {
          idSubrogacion = 'SUB-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();
          var costeEst = 0;
          for (var w = 0; w < trabajadores.length; w++) costeEst += (parseFloat(trabajadores[w].salario_bruto_anual) || 0);
          hojaSubr.appendRow([idSubrogacion, oportunidadId, oportunidad.titulo, oportunidad.organismo, resultado.personal_requerido.empresa_saliente || '', resultado.personal_requerido.convenio_aplicable || '', trabajadores.length, costeEst, '', 'pendiente', '', new Date(), 'Generado desde análisis IA', 'No']);
        }

        var hojaPS = ss.getSheetByName('PERSONAL_SUBROGADO');
        if (!hojaPS) {
          hojaPS = ss.insertSheet('PERSONAL_SUBROGADO');
          hojaPS.getRange(1, 1, 1, 22).setValues([['ID', 'ID Subrogación', 'Nombre', 'Apellidos', 'DNI', 'Categoría', 'Grupo', 'Convenio', 'Antigüedad', 'Fecha Alta Original', 'Tipo Contrato', 'Jornada', 'Salario Bruto', 'Complementos', 'Centro', 'Turno', 'Estado', 'Docs Verificados', 'Incidencias', 'Notas', 'Aceptado', 'Fecha Incorporación']]);
          hojaPS.getRange(1, 1, 1, 22).setBackground('#311b92').setFontColor('#ffffff').setFontWeight('bold');
          hojaPS.setFrozenRows(1);
        }

        // Borrar previos
        var datosPS = hojaPS.getDataRange().getValues();
        for (var ps = datosPS.length - 1; ps >= 1; ps--) { if (datosPS[ps][1] === idSubrogacion) hojaPS.deleteRow(ps + 1); }

        for (var w = 0; w < trabajadores.length; w++) {
          var trab = trabajadores[w];
          var idPS = 'PSUB-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();
          var jornada = 0; var js = String(trab.jornada || '');
          if (js.indexOf('%') !== -1) jornada = Math.round(parseFloat(js) * 40 / 100);
          else jornada = parseFloat(js) || 0;
          hojaPS.appendRow([idPS, idSubrogacion, trab.nombre || '', trab.apellidos || '', '', trab.categoria || '', trab.grupo || '', resultado.personal_requerido.convenio_aplicable || '', trab.antiguedad || '', trab.antiguedad || '', trab.tipo_contrato || 'No especificado', jornada || '', parseFloat(trab.salario_bruto_anual) || 0, trab.complementos || '', trab.centro || '', trab.turno || '', 'pendiente', '', '', trab.observaciones || '', '', '']);
          numSubrogados++;
        }
        Logger.log('   ✅ Subrogación: ' + idSubrogacion + ' → ' + numSubrogados + ' trabajadores');
      } catch (subErr) { Logger.log('   ⚠️ Subrogación: ' + subErr.message); }
    }
  }

  Logger.log('   ✅ Análisis completado. Puntuación: ' + puntuacion);

  // ── Auto-crear lotes si el análisis detecta más de 1 lote ──────────────────
  var lotesCreados = 0;
  try {
    var numLotesDetectados = parseInt((resultado.datos_basicos || {}).num_lotes) || 0;
    if (numLotesDetectados > 0) {
      Logger.log('   🔄 Auto-creando ' + numLotesDetectados + ' lotes...');
      var rLotes = crearLotesDesdeAnalisis_(oportunidadId);
      if (rLotes.ok) {
        lotesCreados = rLotes.lotes_creados || 0;
        Logger.log('   ✅ Lotes creados automáticamente: ' + lotesCreados);
      }
    }
  } catch(e) { Logger.log('   ⚠️ Auto-lotes: ' + e.message); }

  return { ok: true, oportunidad_id: oportunidadId, resumen: resumenCorto, puntuacion_interes: puntuacion, num_criterios: (resultado.criterios_adjudicacion || []).length, subrogacion: resultado.personal_requerido ? resultado.personal_requerido.subrogacion : 'No', num_trabajadores_subrogados: numSubrogados, id_subrogacion: idSubrogacion, num_riesgos: (resultado.riesgos_detectados || []).length, num_oportunidades: (resultado.oportunidades_detectadas || []).length, lotes_creados: lotesCreados, analisis_completo: resultado };
}

// ============================================================================
// EXTRACCIÓN TEXTO PDF (solo para uso externo, el análisis ya no lo necesita)
// ============================================================================

function extraerTextoPDF_(archivo) {
  try {
    var blob = archivo.getBlob(); var base64 = Utilities.base64Encode(blob.getBytes());
    var geminiKey = obtenerGeminiKey_();
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + geminiKey;
    var payload = { contents: [{ parts: [{ inline_data: { mime_type: archivo.getMimeType(), data: base64 } }, { text: 'Extrae TODO el texto. Mantén estructura y tablas.' }] }], generationConfig: { maxOutputTokens: 65000, temperature: 0.1 } };
    var response = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      var data = JSON.parse(response.getContentText());
      if (data.candidates && data.candidates[0]) { var parts = data.candidates[0].content.parts || []; var t = ''; for (var p = 0; p < parts.length; p++) { if (parts[p].text) t = parts[p].text; } return t; }
    }
  } catch (e) { Logger.log('   ⚠️ ' + e.message); }
  return null;
}

function llamarGemini_(prompt) {
  var geminiKey = obtenerGeminiKey_();
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + geminiKey;
  try {
    var response = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 65000, temperature: 0.2 } }), muteHttpExceptions: true });
    if (response.getResponseCode() === 200) { var data = JSON.parse(response.getContentText()); if (data.candidates && data.candidates[0]) { var parts = data.candidates[0].content.parts || []; var t = ''; for (var p = 0; p < parts.length; p++) { if (parts[p].text) t = parts[p].text; } return t; } }
  } catch (e) { Logger.log('   ❌ ' + e.message); }
  return null;
}

// ============================================================================
// HOJA + API
// ============================================================================

function crearHojaAnalisisSiNoExiste_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(HOJA_ANALISIS)) return;
  var hoja = ss.insertSheet(HOJA_ANALISIS);
  hoja.getRange(1, 1, 1, 15).setValues([['ID Oportunidad', 'Título', 'Organismo', 'Fecha Análisis', 'Resumen', 'Tipo Contrato', 'Duración', 'Criterios Adjudicación', 'Personal Requerido', 'Solvencia Técnica', 'Clasificación Requerida', 'Riesgos', 'Oportunidades', 'Puntuación Interés', 'JSON Completo']]);
  hoja.getRange(1, 1, 1, 15).setBackground('#1b5e20').setFontColor('#ffffff').setFontWeight('bold');
  hoja.setFrozenRows(1);
}

function obtenerAnalisisAPI_(oportunidadId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_ANALISIS);
  if (!hoja || hoja.getLastRow() <= 1) return { existe: false };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === oportunidadId) {
      var jc = {}; try { jc = JSON.parse(datos[i][14] || '{}'); } catch (e) {}
      return { existe: true, oportunidad_id: datos[i][0], titulo: datos[i][1], organismo: datos[i][2], fecha_analisis: datos[i][3], resumen: datos[i][4], tipo_contrato: datos[i][5], duracion: datos[i][6], criterios: datos[i][7], personal: datos[i][8], solvencia: datos[i][9], clasificacion: datos[i][10], riesgos: datos[i][11], oportunidades: datos[i][12], puntuacion_interes: datos[i][13], analisis_completo: jc };
    }
  }
  return { existe: false };
}
function testAnalisis() {
  var result = analizarPliegosOportunidad('OPO-20260330-004511-222');
  Logger.log(JSON.stringify(result).substring(0, 500));
}

// ════════════════════════════════════════════════════════════════
// EXTRACCIÓN RÁPIDA DE DATOS DE PLIEGO (para Nueva Oportunidad)
// Recibe PDFs en base64, extrae datos básicos con Gemini
// ════════════════════════════════════════════════════════════════

function extraerDatosPliego_(data) {
  var docs = data.docs || [];
  if (docs.length === 0) return { ok: false, error: 'No se recibieron documentos' };

  var geminiKey = obtenerGeminiKey_();
  if (!geminiKey) return { ok: false, error: 'API Key Gemini no configurada' };

  // Construir partes con los PDFs
  var parts = [];
  var maxDocs = Math.min(docs.length, 4);
  for (var i = 0; i < maxDocs; i++) {
    var doc = docs[i];
    if (!doc.base64) continue;
    parts.push({
      inline_data: {
        mime_type: doc.mime || 'application/pdf',
        data: doc.base64
      }
    });
    parts.push({ text: 'Documento ' + (i + 1) + ': ' + (doc.nombre || 'pliego') });
  }

  var prompt = 'Eres un experto en contratación pública española. Analiza los documentos adjuntos (pliegos de una licitación) y extrae los datos básicos.\n\n' +
    'Responde ÚNICAMENTE con un objeto JSON válido, sin backticks, con estos campos:\n' +
    '{\n' +
    '  "titulo": "Objeto/título completo del contrato",\n' +
    '  "organismo": "Nombre completo del organismo contratante",\n' +
    '  "presupuesto": 000000.00,\n' +
    '  "presupuesto_con_iva": 000000.00,\n' +
    '  "fecha_limite": "YYYY-MM-DD",\n' +
    '  "cpv": "00000000",\n' +
    '  "expediente": "numero de expediente",\n' +
    '  "ubicacion": "municipio, provincia",\n' +
    '  "procedimiento": "Abierto|Restringido|Negociado|Abierto simplificado|Menor",\n' +
    '  "duracion": "X años / X meses",\n' +
    '  "num_lotes": 0,\n' +
    '  "descripcion": "Resumen breve en 2-3 frases del objeto del contrato"\n' +
    '}\n\n' +
    'Si no encuentras algún dato, pon null. El presupuesto debe ser sin IVA si aparece desglosado.';

  parts.push({ text: prompt });

  try {
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + geminiKey;
    var payload = {
      contents: [{ role: 'user', parts: parts }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
    };
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(url, options);
    var json = JSON.parse(response.getContentText());

    if (!json.candidates || !json.candidates[0] || !json.candidates[0].content) {
      return { ok: false, error: 'Sin respuesta de Gemini. Code: ' + response.getResponseCode() };
    }

    var allParts = json.candidates[0].content.parts || [];
    var texto = '';
    for (var p = 0; p < allParts.length; p++) {
      if (allParts[p].text) texto = allParts[p].text;
    }

    texto = texto.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    var start = texto.indexOf('{'); var end = texto.lastIndexOf('}');
    if (start < 0 || end <= start) return { ok: false, error: 'Sin JSON en respuesta' };

    var datos;
    try {
      datos = JSON.parse(texto.substring(start, end + 1));
    } catch(e) {
      return { ok: false, error: 'Error parseando respuesta: ' + e.message };
    }

    // Normalizar fecha si viene en formato español DD/MM/YYYY
    if (datos.fecha_limite && datos.fecha_limite.indexOf('/') !== -1) {
      var partes = datos.fecha_limite.split('/');
      if (partes.length === 3) datos.fecha_limite = partes[2] + '-' + partes[1] + '-' + partes[0];
    }

    return { ok: true, datos: datos };

  } catch(e) {
    return { ok: false, error: 'Error: ' + e.message };
  }
}

function setGeminiKey() {
  PropertiesService.getScriptProperties().setProperty(
    'GEMINI_API_KEY', 
    'AIzaSyAAAJfjZ_ptjOzE4GfzHZHHXMaSdpkQCRg'
  );
  Logger.log('OK: ' + PropertiesService.getScriptProperties()
    .getProperty('GEMINI_API_KEY').substring(0,10) + '...');
}
