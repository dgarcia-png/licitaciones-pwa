// ============================================================================
// 07_investigacion_historico.gs - INVESTIGACIÓN AUTOMÁTICA HISTÓRICA
// Versión: 1.0 | Fecha: Marzo 2026
// ============================================================================
// Investiga automáticamente si una licitación ha existido antes:
// 1. Busca en nuestro HISTORICO_ADJUDICACIONES
// 2. Busca en PLACSP licitaciones del mismo organismo
// 3. Usa Gemini para analizar y recomendar estrategia
// ============================================================================

var HOJA_INVESTIGACIONES = 'INVESTIGACIONES';

// ════════════════════════════════════════
// INICIALIZACIÓN
// ════════════════════════════════════════

function crearHojaInvestigacionesSiNoExiste_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(HOJA_INVESTIGACIONES)) return;
  var hoja = ss.insertSheet(HOJA_INVESTIGACIONES);
  var cab = ['ID Oportunidad', 'Fecha Investigación', 'Tiene Histórico', 'Ediciones Encontradas',
    'Adjudicatarios Anteriores', 'Importes Anteriores', 'Tendencia Precios',
    'Recomendación IA', 'Probabilidad Éxito', 'JSON Completo'];
  hoja.getRange(1, 1, 1, cab.length).setValues([cab]);
  hoja.getRange(1, 1, 1, cab.length).setBackground('#004d40').setFontColor('#ffffff').setFontWeight('bold');
  hoja.setColumnWidth(5, 300); hoja.setColumnWidth(8, 400); hoja.setColumnWidth(10, 300);
  hoja.setFrozenRows(1);
}

// ════════════════════════════════════════
// INVESTIGAR HISTÓRICO DE UNA OPORTUNIDAD
// ════════════════════════════════════════

function investigarHistoricoLicitacion_(oportunidadId) {
  Logger.log('🔍 Investigación histórica: ' + oportunidadId);
  crearHojaInvestigacionesSiNoExiste_();

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Obtener datos de la oportunidad
  var hojaOpo = ss.getSheetByName('OPORTUNIDADES');
  if (!hojaOpo) return { ok: false, error: 'Sin oportunidades' };
  var datos = hojaOpo.getDataRange().getValues();
  var oportunidad = null;
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === oportunidadId) {
      oportunidad = { id: datos[i][0], titulo: datos[i][3], organismo: datos[i][4], cpv: datos[i][5], presupuesto: datos[i][6], descripcion: datos[i][12] };
      break;
    }
  }
  if (!oportunidad) return { ok: false, error: 'Oportunidad no encontrada' };

  Logger.log('   📋 ' + oportunidad.titulo.substring(0, 80));
  Logger.log('   🏛️ ' + oportunidad.organismo);

  // 2. Buscar en nuestro HISTORICO_ADJUDICACIONES
  var coincidenciasHistorico = buscarEnHistoricoPropio_(oportunidad);
  Logger.log('   📚 Histórico propio: ' + coincidenciasHistorico.length + ' coincidencias');

  // 3. Buscar en PLACSP licitaciones del mismo organismo
  var coincidenciasPLACSP = buscarEnPLACSPPorOrganismo_(oportunidad);
  Logger.log('   🌐 PLACSP: ' + coincidenciasPLACSP.length + ' coincidencias');

  // 4. Combinar resultados
  var todasCoincidencias = coincidenciasHistorico.concat(coincidenciasPLACSP);

  // Eliminar duplicados por título similar
  var unicas = [];
  var titulosVistos = [];
  for (var j = 0; j < todasCoincidencias.length; j++) {
    var tituloNorm = normalizarTexto_(todasCoincidencias[j].titulo);
    var esDuplicado = false;
    for (var k = 0; k < titulosVistos.length; k++) {
      if (similitudTexto_(tituloNorm, titulosVistos[k]) > 0.7) { esDuplicado = true; break; }
    }
    if (!esDuplicado) { unicas.push(todasCoincidencias[j]); titulosVistos.push(tituloNorm); }
  }

  Logger.log('   📊 Total únicas: ' + unicas.length);

  // 5. Analizar con Gemini
  var analisisIA = null;
  try {
    analisisIA = analizarHistoricoConGemini_(oportunidad, unicas);
    Logger.log('   🤖 Análisis IA completado');
  } catch (e) {
    Logger.log('   ⚠️ Error IA: ' + e.message);
  }

  // 6. Construir resultado
  var resultado = {
    ok: true,
    oportunidad_id: oportunidadId,
    tiene_historico: unicas.length > 0,
    ediciones_encontradas: unicas.length,
    coincidencias: unicas.map(function(c) {
      return {
        titulo: c.titulo,
        organismo: c.organismo,
        presupuesto: c.presupuesto,
        estado: c.estado,
        fuente: c.fuente,
        fecha: c.fecha,
        adjudicatario: c.adjudicatario || '',
        importe_adjudicacion: c.importe_adjudicacion || 0
      };
    }),
    adjudicatarios: extraerAdjudicatarios_(unicas),
    tendencia_precios: calcularTendenciaPrecios_(unicas, oportunidad.presupuesto),
    analisis_ia: analisisIA,
    fecha_investigacion: new Date()
  };

  // 7. Guardar en hoja
  var hojaInv = ss.getSheetByName(HOJA_INVESTIGACIONES);
  // Borrar investigación anterior
  var dInv = hojaInv.getDataRange().getValues();
  for (var m = dInv.length - 1; m >= 1; m--) {
    if (dInv[m][0] === oportunidadId) hojaInv.deleteRow(m + 1);
  }

  var adjTexto = resultado.adjudicatarios.map(function(a) { return a.nombre + ' (' + a.veces + 'x)'; }).join(', ');
  var importesTexto = unicas.filter(function(c) { return c.presupuesto > 0; }).map(function(c) { return Number(c.presupuesto).toLocaleString('es-ES') + '€'; }).join(', ');

  hojaInv.appendRow([
    oportunidadId,
    new Date(),
    unicas.length > 0,
    unicas.length,
    adjTexto.substring(0, 500),
    importesTexto.substring(0, 500),
    resultado.tendencia_precios.descripcion || '',
    analisisIA ? (analisisIA.recomendacion_final || '') : '',
    analisisIA ? (analisisIA.probabilidad_exito || 0) : 0,
    JSON.stringify(resultado).substring(0, 50000)
  ]);

  return resultado;
}

// ════════════════════════════════════════
// BUSCAR EN HISTORICO PROPIO
// ════════════════════════════════════════

function buscarEnHistoricoPropio_(oportunidad) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Buscar en HISTORICO_ADJUDICACIONES (licitaciones pasadas resueltas)
  var hoja = ss.getSheetByName('HISTORICO_ADJUDICACIONES');
  if (!hoja || hoja.getLastRow() <= 1) return [];

  var datos = hoja.getDataRange().getValues();
  var resultados = [];
  var orgNorm = normalizarTexto_(oportunidad.organismo);
  var titNorm = normalizarTexto_(oportunidad.titulo);
  var palabrasClave = extraerPalabrasClave_(oportunidad.titulo);

  for (var i = 1; i < datos.length; i++) {
    // Excluir la propia oportunidad por id_externo o id interno
    if (datos[i][0] === oportunidad.id || datos[i][1] === oportunidad.id_externo) continue;

    var tituloHist = (datos[i][3] || '').toString();
    var orgHist = (datos[i][4] || '').toString();
    var cpvHist = (datos[i][5] || '').toString();
    var estadoHist = (datos[i][11] || '').toString();

    // Excluir si estado es "nueva", "en_analisis", "go", etc. (son actuales, no históricas)
    // Solo incluir si tiene estado que indica resolución pasada
    var estadosActivos = ['nueva','en_analisis','go','go_aprobado','no_go','pendiente'];
    if (estadosActivos.indexOf(estadoHist.toLowerCase()) !== -1) continue;

    var coincide = false;
    var score = 0;

    // Mismo organismo
    if (similitudTexto_(normalizarTexto_(orgHist), orgNorm) > 0.6) {
      score += 40;
      // Mismo CPV
      if (oportunidad.cpv && cpvHist && cpvHist.toString().substring(0, 5) === oportunidad.cpv.toString().substring(0, 5)) {
        score += 30;
      }
      // Título similar
      if (similitudTexto_(normalizarTexto_(tituloHist), titNorm) > 0.4) {
        score += 30;
      }
      // Palabras clave
      var palEncontradas = 0;
      for (var p = 0; p < palabrasClave.length; p++) {
        if (tituloHist.toLowerCase().indexOf(palabrasClave[p]) !== -1) palEncontradas++;
      }
      score += Math.min(20, palEncontradas * 7);

      if (score >= 50) coincide = true;
    }

    if (coincide) {
      resultados.push({
        titulo: tituloHist,
        organismo: orgHist,
        cpv: cpvHist,
        presupuesto: datos[i][6] || 0,
        estado: datos[i][11] || '',
        fuente: 'Histórico propio',
        fecha: datos[i][13] || '',
        score: score,
        adjudicatario: '',
        importe_adjudicacion: 0
      });
    }
  }

  resultados.sort(function(a, b) { return b.score - a.score; });
  return resultados.slice(0, 20);
}

// ════════════════════════════════════════
// BUSCAR EN PLACSP POR ORGANISMO
// ════════════════════════════════════════

function buscarEnPLACSPPorOrganismo_(oportunidad) {
  var resultados = [];

  try {
    // Buscar en el Atom feed actual (últimas licitaciones)
    var url = 'https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_643/licitacionesPerfilesContratanteCompleto3.atom';
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) return [];

    var doc = XmlService.parse(response.getContentText());
    var root = doc.getRootElement();
    var ns = XmlService.getNamespace('http://www.w3.org/2005/Atom');
    var cbc = XmlService.getNamespace('cbc', 'urn:dgpe:names:draft:codice:schema:xsd:CommonBasicComponents-2');
    var cac = XmlService.getNamespace('cac', 'urn:dgpe:names:draft:codice:schema:xsd:CommonAggregateComponents-2');
    var cbcExt = XmlService.getNamespace('cbc-place-ext', 'urn:dgpe:names:draft:codice-place-ext:schema:xsd:CommonBasicComponents-2');
    var cacExt = XmlService.getNamespace('cac-place-ext', 'urn:dgpe:names:draft:codice-place-ext:schema:xsd:CommonAggregateComponents-2');

    var entries = root.getChildren('entry', ns);
    var orgNorm = normalizarTexto_(oportunidad.organismo);
    var palabrasClave = extraerPalabrasClave_(oportunidad.titulo);

    for (var i = 0; i < entries.length; i++) {
      try {
        var entry = entries[i];
        var title = entry.getChild('title', ns);
        var titulo = title ? title.getText() : '';

        var folder = entry.getChild('ContractFolderStatus', cacExt);
        if (!folder) continue;

        var organismo = '';
        var party = folder.getChild('LocatedContractingParty', cacExt);
        if (party) {
          var pp = party.getChild('Party', cac);
          if (pp) { var pn = pp.getChild('PartyName', cac); if (pn) { var nm = pn.getChild('Name', cbc); if (nm) organismo = nm.getText(); } }
        }

        // Solo del mismo organismo
        if (similitudTexto_(normalizarTexto_(organismo), orgNorm) < 0.5) continue;

        var objeto = titulo;
        var presupuesto = 0;
        var cpv = '';
        var estadoCodice = '';

        var estEl = folder.getChild('ContractFolderStatusCode', cbcExt);
        if (estEl) estadoCodice = estEl.getText();

        var project = folder.getChild('ProcurementProject', cac);
        if (project) {
          var pjn = project.getChild('Name', cbc);
          if (pjn) objeto = pjn.getText();
          var budget = project.getChild('BudgetAmount', cac);
          if (budget) { var ta = budget.getChild('TotalAmount', cbc); if (ta) presupuesto = parseFloat(ta.getText()) || 0; }
          var cpvEl = project.getChild('RequiredCommodityClassification', cac);
          if (cpvEl) { var ic = cpvEl.getChild('ItemClassificationCode', cbc); if (ic) cpv = ic.getText(); }
        }

        // Buscar adjudicatario (si estado es ADJ o RES)
        var adjudicatario = '';
        var importeAdj = 0;
        var tenderResult = folder.getChild('TenderResult', cacExt);
        if (tenderResult) {
          var winParty = tenderResult.getChild('WinningParty', cac);
          if (winParty) {
            var wp = winParty.getChild('PartyName', cac);
            if (wp) { var wn = wp.getChild('Name', cbc); if (wn) adjudicatario = wn.getText(); }
          }
          var awardAmount = tenderResult.getChild('AwardedTenderedProject', cac);
          if (awardAmount) {
            var la = awardAmount.getChild('LegalMonetaryTotal', cac);
            if (la) { var pa = la.getChild('PayableAmount', cbc); if (pa) importeAdj = parseFloat(pa.getText()) || 0; }
          }
        }

        // Filtrar por relevancia (mismo CPV o palabras clave)
        var esRelevante = false;
        if (oportunidad.cpv && cpv && cpv.toString().substring(0, 5) === oportunidad.cpv.toString().substring(0, 5)) esRelevante = true;
        if (!esRelevante) {
          var textoLower = (objeto + ' ' + titulo).toLowerCase();
          for (var p = 0; p < palabrasClave.length; p++) {
            if (textoLower.indexOf(palabrasClave[p]) !== -1) { esRelevante = true; break; }
          }
        }

        if (esRelevante) {
          // ── EXCLUIR LA PROPIA LICITACIÓN ──────────────────────────────────
          // Si está en estado PUB (publicada/en curso) Y el título es muy similar
          // (>85%) es casi seguro que es la misma licitación que estamos analizando.
          // No aporta valor histórico — la excluimos para no confundir a Gemini.
          var esPropiaLicitacion = false;
          if (estadoCodice === 'PUB' || estadoCodice === 'PRE' || estadoCodice === 'EV') {
            var simTitulo = similitudTexto_(normalizarTexto_(objeto || titulo), normalizarTexto_(oportunidad.titulo));
            var simOrg    = similitudTexto_(normalizarTexto_(organismo), normalizarTexto_(oportunidad.organismo));
            // Excluir solo si título casi idéntico (>0.92) Y mismo organismo (>0.85)
            // Así no descartamos licitaciones similares de entidades distintas
            if (simTitulo > 0.92 && simOrg > 0.85) {
              esPropiaLicitacion = true;
              Logger.log('   ⚠️ Excluida: propia licitación (simTit=' + simTitulo.toFixed(2) + ', simOrg=' + simOrg.toFixed(2) + ')');
            }
          }

          if (!esPropiaLicitacion) {
            resultados.push({
              titulo: objeto || titulo,
              organismo: organismo,
              cpv: cpv,
              presupuesto: presupuesto,
              estado: estadoCodice,
              fuente: 'PLACSP',
              fecha: new Date().toISOString().split('T')[0],
              adjudicatario: adjudicatario,
              importe_adjudicacion: importeAdj
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {
    Logger.log('   ⚠️ Error PLACSP: ' + e.message);
  }

  return resultados.slice(0, 20);
}

// ════════════════════════════════════════
// UTILIDADES DE TEXTO
// ════════════════════════════════════════

function normalizarTexto_(texto) {
  return (texto || '').toString().toLowerCase()
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function extraerPalabrasClave_(titulo) {
  var stopwords = ['de', 'del', 'la', 'el', 'los', 'las', 'en', 'para', 'por', 'con', 'y', 'a', 'un', 'una', 'se', 'que', 'es'];
  var palabras = normalizarTexto_(titulo).split(' ');
  return palabras.filter(function(p) { return p.length > 3 && stopwords.indexOf(p) === -1; });
}

function similitudTexto_(a, b) {
  if (!a || !b) return 0;
  var palA = a.split(' ');
  var palB = b.split(' ');
  var comunes = 0;
  for (var i = 0; i < palA.length; i++) {
    for (var j = 0; j < palB.length; j++) {
      if (palA[i] === palB[j] && palA[i].length > 3) { comunes++; break; }
    }
  }
  var maxPal = Math.max(palA.length, palB.length);
  return maxPal > 0 ? comunes / maxPal : 0;
}

// ════════════════════════════════════════
// ANÁLISIS DE RESULTADOS
// ════════════════════════════════════════

function extraerAdjudicatarios_(coincidencias) {
  var adj = {};
  for (var i = 0; i < coincidencias.length; i++) {
    var nombre = coincidencias[i].adjudicatario;
    if (!nombre) continue;
    if (!adj[nombre]) adj[nombre] = { nombre: nombre, veces: 0, importes: [] };
    adj[nombre].veces++;
    if (coincidencias[i].importe_adjudicacion > 0) adj[nombre].importes.push(coincidencias[i].importe_adjudicacion);
  }
  var lista = [];
  for (var k in adj) lista.push(adj[k]);
  lista.sort(function(a, b) { return b.veces - a.veces; });
  return lista;
}

function calcularTendenciaPrecios_(coincidencias, presupuestoActual) {
  var precios = coincidencias.filter(function(c) { return c.presupuesto > 0; }).map(function(c) { return c.presupuesto; });
  if (precios.length === 0) return { descripcion: 'Sin datos de precios anteriores', tendencia: 'desconocida' };

  var media = precios.reduce(function(a, b) { return a + b; }, 0) / precios.length;
  var min = Math.min.apply(null, precios);
  var max = Math.max.apply(null, precios);
  var pActual = Number(presupuestoActual) || 0;

  var tendencia = 'estable';
  if (pActual > 0 && media > 0) {
    var variacion = ((pActual - media) / media * 100);
    if (variacion > 10) tendencia = 'al alza';
    else if (variacion < -10) tendencia = 'a la baja';
  }

  return {
    media: Math.round(media),
    min: Math.round(min),
    max: Math.round(max),
    num_datos: precios.length,
    presupuesto_actual: pActual,
    variacion_vs_media: pActual > 0 && media > 0 ? Math.round((pActual - media) / media * 100) : 0,
    tendencia: tendencia,
    descripcion: 'Media histórica: ' + Math.round(media).toLocaleString('es-ES') + '€ | Rango: ' + Math.round(min).toLocaleString('es-ES') + '€ - ' + Math.round(max).toLocaleString('es-ES') + '€ | Tendencia: ' + tendencia
  };
}

// ════════════════════════════════════════
// ANÁLISIS IA DEL HISTÓRICO
// ════════════════════════════════════════

function analizarHistoricoConGemini_(oportunidad, coincidencias) {
  if (coincidencias.length === 0) return { recomendacion_final: 'Sin histórico', probabilidad_exito: 50 };

  var prompt = 'Eres un consultor experto en licitaciones públicas españolas.\n';
  prompt += 'Analiza el histórico de esta licitación y genera recomendaciones estratégicas.\n';
  prompt += 'Responde SOLO con JSON, sin backticks.\n\n';

  prompt += '=== OPORTUNIDAD ACTUAL ===\n';
  prompt += 'Título: ' + oportunidad.titulo + '\n';
  prompt += 'Organismo: ' + oportunidad.organismo + '\n';
  prompt += 'Presupuesto: ' + oportunidad.presupuesto + ' €\n';
  prompt += 'CPV: ' + oportunidad.cpv + '\n\n';

  prompt += '=== EDICIONES ANTERIORES ENCONTRADAS (' + coincidencias.length + ') ===\n';
  prompt += 'IMPORTANTE: Esta lista ya está filtrada. No incluye la licitación actual que se analiza.\n';
  prompt += 'Solo incluye contratos del mismo organismo resueltos o adjudicados en el pasado.\n';
  prompt += 'Si hay 0 ediciones, significa que es una licitación nueva sin historial previo conocido.\n';
  for (var i = 0; i < Math.min(coincidencias.length, 15); i++) {
    var c = coincidencias[i];
    prompt += (i + 1) + '. ' + c.titulo.substring(0, 100) + '\n';
    prompt += '   Organismo: ' + c.organismo + ' | Presupuesto: ' + (c.presupuesto || '?') + '€';
    prompt += ' | Estado: ' + c.estado + ' | Fuente: ' + c.fuente;
    if (c.adjudicatario) prompt += ' | Ganador: ' + c.adjudicatario;
    if (c.importe_adjudicacion > 0) prompt += ' | Importe adj.: ' + c.importe_adjudicacion + '€';
    prompt += '\n';
  }

  prompt += '\n=== GENERA ESTE JSON ===\n';
  prompt += '{\n';
  prompt += '  "resumen_historico": "Resumen de 2-3 frases del historial encontrado",\n';
  prompt += '  "ediciones_previas": "Número estimado de veces que se ha licitado antes",\n';
  prompt += '  "patron_adjudicacion": "¿Siempre gana el mismo? ¿Rota? ¿Hay competencia real?",\n';
  prompt += '  "competidores_principales": ["Nombre empresa 1", "Nombre empresa 2"],\n';
  prompt += '  "precio_recomendado": {\n';
  prompt += '    "minimo": 0, "maximo": 0, "optimo": 0,\n';
  prompt += '    "justificacion": "Basado en histórico de precios"\n';
  prompt += '  },\n';
  prompt += '  "baja_recomendada": {\n';
  prompt += '    "porcentaje_min": 0, "porcentaje_max": 0,\n';
  prompt += '    "justificacion": ""\n';
  prompt += '  },\n';
  prompt += '  "factores_exito": ["Factor 1", "Factor 2"],\n';
  prompt += '  "riesgos_historicos": ["Riesgo 1"],\n';
  prompt += '  "recomendaciones_estrategicas": ["Recomendación 1", "Recomendación 2"],\n';
  prompt += '  "probabilidad_exito": 0,\n';
  prompt += '  "recomendacion_final": "GO|NO-GO|EVALUAR con justificación"\n';
  prompt += '}\n';

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + GEMINI_API_KEY;
  var payload = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 8000, temperature: 0.2 } };

  var response = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) return null;

  var data = JSON.parse(response.getContentText());
  if (!data.candidates || !data.candidates[0]) return null;

  var texto = data.candidates[0].content.parts[0].text;
  try {
    return JSON.parse(texto.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
  } catch (e) {
    return { resumen_historico: texto.substring(0, 500), recomendacion_final: 'Error parseando', probabilidad_exito: 50 };
  }
}

// ════════════════════════════════════════
// APIs
// ════════════════════════════════════════

function obtenerInvestigacionAPI_(oportunidadId) {
  crearHojaInvestigacionesSiNoExiste_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_INVESTIGACIONES);
  if (!hoja || hoja.getLastRow() <= 1) return { existe: false };

  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === oportunidadId) {
      var jsonCompleto = {};
      try { jsonCompleto = JSON.parse(datos[i][9] || '{}'); } catch (e) {}
      return {
        existe: true,
        oportunidad_id: datos[i][0],
        fecha: datos[i][1],
        tiene_historico: datos[i][2],
        ediciones: datos[i][3],
        adjudicatarios: datos[i][4],
        importes: datos[i][5],
        tendencia: datos[i][6],
        recomendacion: datos[i][7],
        probabilidad: datos[i][8],
        datos: jsonCompleto
      };
    }
  }
  return { existe: false };
}