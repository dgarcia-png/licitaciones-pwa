// ============================================================================
// 00_extraccion_licitaciones.gs
// CAMBIOS: enviarResumenEmail_ usa getEmailNotificacion_('email_licitaciones') v5.1 — Extractor PLACSP definitivo
// API REST v3 devuelve 404 → eliminada
// Feeds 1044 y 642 devuelven HTML → eliminados
// Solo sindicacion_643 funciona → se usa con 4 variaciones de parámetros
// ============================================================================

var HOJA_OPORTUNIDADES = 'OPORTUNIDADES';
var HOJA_HISTORICO     = 'HISTORICO_ADJUDICACIONES';
var HOJA_CONFIG        = 'CONFIG_PASO0';
var CARPETA_RAIZ_ID    = '1WaKzSG6_zmgGCmw3RPcjMQqJHnTmRHop';

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ════════════════════════════════════════════════════════════════════════════

function obtenerConfiguracion() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CONFIG);
  if (!hoja) hoja = crearHojaConfiguracion_();
  var datos = hoja.getDataRange().getValues();
  var config = {};
  for (var i = 1; i < datos.length; i++) {
    var clave  = (datos[i][0] || '').toString().trim();
    var valor  = (datos[i][1] || '').toString().trim();
    var activo = datos[i][2];
    if (!clave || activo === false) continue;
    if (!config[clave]) config[clave] = [];
    config[clave].push(valor);
  }
  return {
    cpvs:                     config['CPV'] || [],
    presupuesto_min:          parseFloat((config['PRESUPUESTO_MIN']       || ['30000'])[0])    || 30000,
    presupuesto_max:          parseFloat((config['PRESUPUESTO_MAX']       || ['15000000'])[0]) || 15000000,
    ubicaciones:              config['UBICACION'] || [],
    nuts_codes:               config['NUTS'] || ['ES61','ES611','ES612','ES613','ES614','ES615','ES616','ES617','ES618'],
    palabras_clave:           config['PALABRA_CLAVE'] || [],
    fuentes:                  config['FUENTE'] || ['PLACSP'],
    emails_notificacion:      config['EMAIL_NOTIFICACION'] || [],
    scoring_cpv_exacto:       parseInt((config['SCORING_CPV_EXACTO']       || ['30'])[0]) || 30,
    scoring_cpv_parcial:      parseInt((config['SCORING_CPV_PARCIAL']      || ['20'])[0]) || 20,
    scoring_presupuesto_ideal:parseInt((config['SCORING_PRESUPUESTO_IDEAL']|| ['25'])[0]) || 25,
    scoring_ubicacion:        parseInt((config['SCORING_UBICACION']        || ['20'])[0]) || 20,
    scoring_palabras:         parseInt((config['SCORING_PALABRAS']         || ['15'])[0]) || 15,
    presupuesto_ideal_min:    parseFloat((config['PRESUPUESTO_IDEAL_MIN']  || ['200000'])[0])  || 200000,
    presupuesto_ideal_max:    parseFloat((config['PRESUPUESTO_IDEAL_MAX']  || ['3000000'])[0]) || 3000000,
    ubicacion_bonus:          (config['UBICACION_BONUS'] || ['ES618'])[0] || 'ES618',
  };
}

function crearHojaConfiguracion_() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.insertSheet(HOJA_CONFIG);
  hoja.getRange(1,1,1,4).setValues([['Tipo','Valor','Activo','Descripción']]);
  hoja.getRange(1,1,1,4).setBackground('#1565c0').setFontColor('#ffffff').setFontWeight('bold');
  var d = [
    ['CPV','90910000',true,'Servicios de limpieza'],['CPV','90911000',true,'Limpieza viviendas'],
    ['CPV','90911200',true,'Limpieza edificios'],['CPV','90911300',true,'Limpieza ventanas'],
    ['CPV','90919000',true,'Limpieza oficinas'],['CPV','90919200',true,'Limpieza oficinas'],
    ['CPV','90919300',true,'Limpieza escuelas'],['CPV','90610000',true,'Limpieza viaria'],
    ['CPV','90900000',true,'Limpieza e higienización'],['CPV','90921000',true,'Desinfección'],
    ['CPV','50000000',true,'Reparación y mantenimiento'],['CPV','50700000',true,'Mantenimiento instalaciones'],
    ['CPV','50710000',true,'Mantenimiento eléctrico'],['CPV','50800000',true,'Mantenimiento varios'],
    ['CPV','77310000',true,'Zonas verdes'],['CPV','77314000',true,'Mantenimiento terrenos'],
    ['CPV','90500000',true,'Eliminación residuos'],['CPV','90510000',true,'Tratamiento residuos'],
    ['CPV','90920000',true,'Saneamiento'],
    ['','','',''],
    ['PRESUPUESTO_MIN','30000',true,''],['PRESUPUESTO_MAX','15000000',true,''],
    ['PRESUPUESTO_IDEAL_MIN','200000',true,''],['PRESUPUESTO_IDEAL_MAX','3000000',true,''],
    ['','','',''],
    ['NUTS','ES61',true,'Andalucía'],['NUTS','ES611',true,'Almería'],['NUTS','ES612',true,'Cádiz'],
    ['NUTS','ES613',true,'Córdoba'],['NUTS','ES614',true,'Granada'],['NUTS','ES615',true,'Huelva'],
    ['NUTS','ES616',true,'Jaén'],['NUTS','ES617',true,'Málaga'],['NUTS','ES618',true,'Sevilla'],
    ['','','',''],
    ['UBICACION','Andalucía',true,''],['UBICACION','Sevilla',true,''],['UBICACION','Cádiz',true,''],
    ['UBICACION','Huelva',true,''],['UBICACION','Córdoba',true,''],['UBICACION','Málaga',true,''],
    ['UBICACION','Jaén',true,''],['UBICACION','Granada',true,''],['UBICACION','Almería',true,''],
    ['UBICACION_BONUS','ES618',true,'Bonus Sevilla'],
    ['','','',''],
    ['PALABRA_CLAVE','limpieza',true,''],['PALABRA_CLAVE','higienización',true,''],
    ['PALABRA_CLAVE','desinfección',true,''],['PALABRA_CLAVE','mantenimiento',true,''],
    ['PALABRA_CLAVE','mantenimiento edificios',true,''],['PALABRA_CLAVE','conservación',true,''],
    ['PALABRA_CLAVE','servicios generales',true,''],['PALABRA_CLAVE','facilities',true,''],
    ['PALABRA_CLAVE','jardinería',true,''],['PALABRA_CLAVE','zonas verdes',true,''],
    ['PALABRA_CLAVE','residuos',true,''],['PALABRA_CLAVE','saneamiento',true,''],
    ['PALABRA_CLAVE','limpiadora',true,''],['PALABRA_CLAVE','conserje',true,''],['PALABRA_CLAVE','portería',true,''],
    ['','','',''],
    ['FUENTE','PLACSP',true,''],['FUENTE','Junta Andalucía',true,''],
    ['','','',''],
    ['SCORING_CPV_EXACTO','30',true,''],['SCORING_CPV_PARCIAL','20',true,''],
    ['SCORING_PRESUPUESTO_IDEAL','25',true,''],['SCORING_UBICACION','20',true,''],
    ['SCORING_PALABRAS','15',true,''],
    ['','','',''],
    ['EMAIL_NOTIFICACION','',true,'']
  ];
  hoja.getRange(2, 1, d.length, 4).setValues(d);
  hoja.getRange('C2:C' + (d.length + 1)).insertCheckboxes();
  for (var i = 0; i < d.length; i++) {
    if (d[i][2] === true || d[i][2] === false) hoja.getRange(i + 2, 3).setValue(d[i][2]);
  }
  hoja.setColumnWidth(1, 200); hoja.setColumnWidth(2, 250);
  hoja.setColumnWidth(3, 70);  hoja.setColumnWidth(4, 350);
  hoja.setFrozenRows(1);
  return hoja;
}

// ════════════════════════════════════════════════════════════════════════════
// PUNTO DE ENTRADA — trigger diario 08:00
// ════════════════════════════════════════════════════════════════════════════

function buscarNuevasOportunidades() {
  Logger.log('🔍 PASO 0 — Extractor PLACSP v5.1');
  var config = obtenerConfiguracion();
  crearHojaOportunidadesSiNoExiste_();
  crearHojaHistoricoSiNoExiste_();

  var tn = 0, th = 0, td = 0, err = [], on = [];

  if (config.fuentes.indexOf('PLACSP') !== -1) {
    try {
      var r = extraerPLACSP_(config);
      tn += r.nuevas; th += r.historico; td += r.duplicadas;
      on = on.concat(r.listaNuevas);
      Logger.log('PLACSP: +' + r.nuevas + ' nuevas, +' + r.historico + ' hist, ' + r.duplicadas + ' dup');
    } catch(e) { err.push('PLACSP: ' + e.message); Logger.log('ERROR PLACSP: ' + e.message); }
  }

  if (config.fuentes.indexOf('Junta Andalucía') !== -1) {
    try {
      var r2 = extraerJuntaAndalucia_(config);
      tn += r2.nuevas; td += r2.duplicadas;
    } catch(e) { err.push('Junta: ' + e.message); }
  }

  if (tn > 0) enviarResumenEmail_(on, config);
  try { registrarAccion('PASO0: +' + tn + ' oport, +' + th + ' hist'); } catch(e) {}

  return { nuevas: tn, historico: th, duplicadas: td, errores: err };
}

function configurarTriggerDiario() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'buscarNuevasOportunidades') ScriptApp.deleteTrigger(triggers[i]);
  }
  ScriptApp.newTrigger('buscarNuevasOportunidades').timeBased().everyDays(1).atHour(8).create();
  Logger.log('✅ Trigger diario configurado — 08:00');
}

// ════════════════════════════════════════════════════════════════════════════
// EXTRACTOR PRINCIPAL — 4 variaciones del feed 643
// ════════════════════════════════════════════════════════════════════════════

function extraerPLACSP_(config) {
  var nuevas = 0, historico = 0, duplicadas = 0, listaNuevas = [];
  var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  var procesadas = {};
  var licitaciones = [];
  var BASE = 'https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_643/licitacionesPerfilesContratanteCompleto3.atom';

  // Capa 1: todas las activas en Andalucía
  try {
    var l1 = extraerAtomFeed_(BASE, { comunidadAutonoma: 'ES61' }, config, hoy);
    licitaciones = licitaciones.concat(l1);
    Logger.log('Capa 1 (643 Andalucía): ' + l1.length + ' candidatas');
  } catch(e) { Logger.log('Capa 1 error: ' + e.message); }

  // Capa 2: publicadas en los últimos 7 días (captura las recientes)
  try {
    var hace7 = new Date(hoy); hace7.setDate(hace7.getDate() - 7);
    var fecha7 = Utilities.formatDate(hace7, 'Europe/Madrid', 'yyyy-MM-dd');
    var l2 = extraerAtomFeed_(BASE, { comunidadAutonoma: 'ES61', fechaDesde: fecha7 }, config, hoy);
    licitaciones = licitaciones.concat(l2);
    Logger.log('Capa 2 (643 últimos 7d): ' + l2.length + ' candidatas');
  } catch(e) { Logger.log('Capa 2 error: ' + e.message); }

  // Capa 3: publicadas hoy
  try {
    var fechaHoy = Utilities.formatDate(hoy, 'Europe/Madrid', 'yyyy-MM-dd');
    var l3 = extraerAtomFeed_(BASE, { comunidadAutonoma: 'ES61', fechaDesde: fechaHoy }, config, hoy);
    licitaciones = licitaciones.concat(l3);
    Logger.log('Capa 3 (643 hoy): ' + l3.length + ' candidatas');
  } catch(e) { Logger.log('Capa 3 error: ' + e.message); }

  // Capa 4: sin filtro de NUTS (captura licitaciones sin ubicación declarada)
  // pero con palabras clave — para no traer demasiado ruido
  try {
    var l4 = extraerAtomFeed_(BASE, {}, config, hoy);
    // Solo añadir las que no vienen del paso anterior (son de fuera de Andalucía o sin NUTS)
    licitaciones = licitaciones.concat(l4);
    Logger.log('Capa 4 (643 sin filtro): ' + l4.length + ' candidatas');
  } catch(e) { Logger.log('Capa 4 error: ' + e.message); }

  // ── Deduplicar y clasificar ──────────────────────────────────────────────
  for (var i = 0; i < licitaciones.length; i++) {
    var lic = licitaciones[i];
    var clave = lic.id_externo || normalizarTitulo_(lic.titulo);
    if (!clave || procesadas[clave]) continue;
    procesadas[clave] = true;

    var esActiva = false;
    if (lic.fecha_limite) {
      try {
        var fechaStr = lic.fecha_limite.split(' ')[0];
        var fLim = new Date(fechaStr + 'T23:59:59');
        esActiva = !isNaN(fLim.getTime()) && fLim >= hoy;
      } catch(e) { esActiva = false; }
    } else {
      esActiva = lic.titulo && lic.titulo.length > 20 && lic.organismo && lic.organismo.length > 5;
    }

    if (esActiva) {
      var id = guardarOportunidad_(lic, HOJA_OPORTUNIDADES);
      if (id) { nuevas++; listaNuevas.push(lic); } else duplicadas++;
    } else {
      if (guardarOportunidad_(lic, HOJA_HISTORICO)) historico++; else duplicadas++;
    }
  }

  return { nuevas: nuevas, historico: historico, duplicadas: duplicadas, listaNuevas: listaNuevas };
}

// ════════════════════════════════════════════════════════════════════════════
// FEED ATOM — parser genérico
// ════════════════════════════════════════════════════════════════════════════

function extraerAtomFeed_(baseUrl, params, config, hoy) {
  var licitaciones = [];

  var paramStr = Object.keys(params).map(function(k) {
    return k + '=' + encodeURIComponent(params[k]);
  }).join('&');
  var url = baseUrl + (paramStr ? '?' + paramStr : '');

  var resp = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    headers: { 'User-Agent': 'ForgeserPWA/5.1' }
  });
  if (resp.getResponseCode() !== 200) throw new Error('HTTP ' + resp.getResponseCode());

  var contenido = resp.getContentText();
  if (!contenido || contenido.length < 100) throw new Error('Feed vacío');
  if (contenido.indexOf('<feed') === -1 && contenido.indexOf('<?xml') === -1) {
    throw new Error('Respuesta no es XML (probablemente HTML)');
  }

  var doc  = XmlService.parse(contenido);
  var root = doc.getRootElement();
  var ns     = XmlService.getNamespace('http://www.w3.org/2005/Atom');
  var cbc    = XmlService.getNamespace('cbc',          'urn:dgpe:names:draft:codice:schema:xsd:CommonBasicComponents-2');
  var cac    = XmlService.getNamespace('cac',          'urn:dgpe:names:draft:codice:schema:xsd:CommonAggregateComponents-2');
  var cacExt = XmlService.getNamespace('cac-place-ext','urn:dgpe:names:draft:codice-place-ext:schema:xsd:CommonAggregateComponents-2');
  var cbcExt = XmlService.getNamespace('cbc-place-ext','urn:dgpe:names:draft:codice-place-ext:schema:xsd:CommonBasicComponents-2');

  var entries = root.getChildren('entry', ns);
  for (var i = 0; i < entries.length; i++) {
    try {
      var lic = parsearEntryAtom_(entries[i], ns, cbc, cac, cacExt, cbcExt, config, hoy);
      if (lic) licitaciones.push(lic);
    } catch(e) {}
  }
  return licitaciones;
}

function parsearEntryAtom_(entry, ns, cbc, cac, cacExt, cbcExt, config, hoy) {
  try {
    var titleEl = entry.getChild('title', ns);
    var idEl    = entry.getChild('id', ns);
    var linkEl  = entry.getChild('link', ns);
    var titulo    = titleEl ? titleEl.getText() : '';
    var idExterno = idEl    ? idEl.getText()    : '';
    var urlLic    = linkEl  ? linkEl.getAttribute('href').getValue() : '';

    var folder = entry.getChild('ContractFolderStatus', cacExt);
    if (!folder) {
      var allChildren = entry.getChildren();
      for (var c = 0; c < allChildren.length; c++) {
        if (allChildren[c].getName() === 'ContractFolderStatus') { folder = allChildren[c]; break; }
      }
    }
    if (!folder) return null;

    var expediente = '', estadoCodice = '', organismo = '', cpv = '', presupuesto = 0;
    var ubicacionCodigo = '', ubicacionNombre = '', fechaLimite = '', procedimiento = '', objeto = titulo;
    var docsPliegos = [];

    var expEl = folder.getChild('ContractFolderID', cbc);
    if (expEl) expediente = expEl.getText();
    var estEl = folder.getChild('ContractFolderStatusCode', cbcExt);
    if (estEl) estadoCodice = estEl.getText();

    var party = folder.getChild('LocatedContractingParty', cacExt);
    if (party) {
      var pp = party.getChild('Party', cac);
      if (pp) {
        var pn = pp.getChild('PartyName', cac);
        if (pn) { var nm = pn.getChild('Name', cbc); if (nm) organismo = nm.getText(); }
      }
    }

    var project = folder.getChild('ProcurementProject', cac);
    if (project) {
      var pjn = project.getChild('Name', cbc); if (pjn) objeto = pjn.getText();
      var budget = project.getChild('BudgetAmount', cac);
      if (budget) { var ta = budget.getChild('TotalAmount', cbc); if (ta) presupuesto = parseFloat(ta.getText()) || 0; }
      var cpvEl = project.getChild('RequiredCommodityClassification', cac);
      if (cpvEl) { var ic = cpvEl.getChild('ItemClassificationCode', cbc); if (ic) cpv = ic.getText(); }
      var rp = project.getChild('RealizedLocation', cac);
      if (rp) {
        var ce = rp.getChild('CountrySubentityCode', cbc); if (ce) ubicacionCodigo = ce.getText();
        var ne = rp.getChild('CountrySubentity', cbc);     if (ne) ubicacionNombre = ne.getText();
      }
    }

    var process = folder.getChild('TenderingProcess', cac);
    if (process) {
      var pt = process.getChild('ProcedureCode', cbc);
      if (pt) {
        var pc = pt.getText();
        if      (pc === '1')   procedimiento = 'Abierto';
        else if (pc === '2')   procedimiento = 'Restringido';
        else if (pc === '3')   procedimiento = 'Negociado';
        else if (pc === '100') procedimiento = 'Abierto simplificado';
        else procedimiento = pc;
      }
      var dp = process.getChild('TenderSubmissionDeadlinePeriod', cac);
      if (dp) {
        var ed = dp.getChild('EndDate', cbc); if (ed) fechaLimite = ed.getText();
        var et = dp.getChild('EndTime', cbc);
        if (et && fechaLimite) fechaLimite += ' ' + et.getText().substring(0, 5);
      }
      if (!fechaLimite) {
        var dp2 = process.getChild('DocumentAvailabilityPeriod', cac);
        if (dp2) { var ed2 = dp2.getChild('EndDate', cbc); if (ed2) fechaLimite = ed2.getText(); }
      }
    }

    // Documentos
    var legalDoc = folder.getChild('LegalDocumentReference', cac);
    if (legalDoc) { var d1 = extraerDocURL_(legalDoc, cbc, cac); if (d1) { d1.tipo = 'PCAP'; docsPliegos.push(d1); } }
    var techDoc = folder.getChild('TechnicalDocumentReference', cac);
    if (techDoc)  { var d2 = extraerDocURL_(techDoc, cbc, cac);  if (d2) { d2.tipo = 'PPT';  docsPliegos.push(d2); } }
    var allCh = folder.getChildren();
    for (var ch = 0; ch < allCh.length; ch++) {
      if (allCh[ch].getName() === 'AdditionalDocumentReference') {
        var d3 = extraerDocURL_(allCh[ch], cbc, cac);
        if (d3) { d3.tipo = 'Anexo'; docsPliegos.push(d3); }
      }
    }

    // Filtros
    var estadosValidos = ['PUB', 'PRE', 'EV', 'ADJ', 'PUBLICADA', ''];
    if (estadoCodice && estadosValidos.indexOf(estadoCodice) === -1) return null;

    var textoCompleto = (objeto + ' ' + titulo + ' ' + organismo + ' ' + ubicacionNombre).toLowerCase();
    var esRelCPV = cpv && config.cpvs.some(function(c2) { return cpv.substring(0, 5) === c2.substring(0, 5); });
    var esRelPal = config.palabras_clave.some(function(p2) { return textoCompleto.indexOf(p2.toLowerCase()) !== -1; });
    if (!esRelCPV && !esRelPal) return null;

    if (presupuesto > 0 && (presupuesto < config.presupuesto_min || presupuesto > config.presupuesto_max)) return null;

    // Filtro Andalucía
    var esAndalucia = false;
    if (ubicacionCodigo) {
      esAndalucia = config.nuts_codes.some(function(nut) {
        return ubicacionCodigo.indexOf(nut) === 0 || nut.indexOf(ubicacionCodigo) === 0;
      });
    }
    if (!esAndalucia && ubicacionNombre) {
      esAndalucia = config.ubicaciones.some(function(u) {
        return ubicacionNombre.toLowerCase().indexOf(u.toLowerCase()) !== -1;
      });
    }
    // Sin ubicación declarada: aceptar (la licitación puede ser de Andalucía igualmente)
    if (!esAndalucia && !ubicacionCodigo && !ubicacionNombre) esAndalucia = true;
    if (!esAndalucia) return null;

    var lic = {
      fuente:          'PLACSP',
      id_externo:      idExterno || ('EXP-' + expediente),
      titulo:          (objeto || titulo).substring(0, 500),
      organismo:       organismo.substring(0, 300),
      cpv:             cpv,
      presupuesto:     presupuesto,
      fecha_limite:    fechaLimite,
      procedimiento:   procedimiento || 'No especificado',
      url:             urlLic,
      descripcion:     ('Exp:' + expediente + '|' + estadoCodice + '|' + ubicacionNombre + '(' + ubicacionCodigo + ')').substring(0, 500),
      fecha_deteccion: new Date(),
      estado:          'nueva',
      scoring:         0,
      docs_json:       docsPliegos.length > 0 ? JSON.stringify(docsPliegos) : ''
    };
    lic.scoring = calcularScoring_(lic, config, ubicacionCodigo, fechaLimite.split(' ')[0]);
    return lic;
  } catch(e) { return null; }
}

// ════════════════════════════════════════════════════════════════════════════
// JUNTA DE ANDALUCÍA
// ════════════════════════════════════════════════════════════════════════════

function extraerJuntaAndalucia_(config) {
  var nuevas = 0, duplicadas = 0;
  var url = 'https://www.juntadeandalucia.es/datosabiertos/portal/api/3/action/package_search?q=licitaciones&rows=10';
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { 'Accept': 'application/json' } });
  if (response.getResponseCode() !== 200) return { nuevas: 0, duplicadas: 0 };
  var data = JSON.parse(response.getContentText());
  if (!data.success || !data.result) return { nuevas: 0, duplicadas: 0 };
  var results = data.result.results || [];
  for (var i = 0; i < results.length; i++) {
    var resources = results[i].resources || [];
    for (var r = 0; r < resources.length; r++) {
      var res = resources[r];
      if (res.format && res.format.toUpperCase() === 'CSV' && res.url) {
        try {
          var csvResp = UrlFetchApp.fetch(res.url, { muteHttpExceptions: true });
          if (csvResp.getResponseCode() !== 200) continue;
          var resultado = parsearCSVJunta_(csvResp.getContentText(), config, results[i].title);
          nuevas += resultado.nuevas; duplicadas += resultado.duplicadas;
        } catch(e) {}
      }
    }
  }
  return { nuevas: nuevas, duplicadas: duplicadas };
}

function parsearCSVJunta_(csvText, config, datasetTitle) {
  var nuevas = 0, duplicadas = 0;
  var lines = csvText.split('\n');
  if (lines.length < 2) return { nuevas: 0, duplicadas: 0 };
  var headers = lines[0].split(';').map(function(h) { return h.trim().replace(/"/g, '').toLowerCase(); });
  var iObj = -1, iOrg = -1, iPre = -1, iCpv = -1, iExp = -1;
  for (var h = 0; h < headers.length; h++) {
    var col = headers[h];
    if (col.indexOf('objeto') !== -1 || col.indexOf('descripci') !== -1) iObj = h;
    if (col.indexOf('organo') !== -1 || col.indexOf('órgano') !== -1 || col.indexOf('organismo') !== -1) iOrg = h;
    if (col.indexOf('presupuesto') !== -1 || col.indexOf('importe') !== -1) iPre = h;
    if (col.indexOf('cpv') !== -1) iCpv = h;
    if (col.indexOf('expediente') !== -1) iExp = h;
  }
  for (var i = 1; i < Math.min(lines.length, 200); i++) {
    try {
      var cols = lines[i].split(';').map(function(c2) { return c2.trim().replace(/^"|"$/g, ''); });
      if (cols.length < 3) continue;
      var titulo     = iObj >= 0 ? cols[iObj] : cols[0];
      var organismo  = iOrg >= 0 ? cols[iOrg] : 'Junta de Andalucía';
      var presupuesto = iPre >= 0 ? parseFloat(cols[iPre].replace(/\./g, '').replace(',', '.')) || 0 : 0;
      var cpv        = iCpv >= 0 ? cols[iCpv] : '';
      var expediente = iExp >= 0 ? cols[iExp] : '';
      if (!titulo || titulo.length < 5) continue;
      var texto = (titulo + ' ' + organismo).toLowerCase();
      var esRel = cpv && config.cpvs.some(function(c2) { return c2.substring(0, 5) === cpv.substring(0, 5); });
      if (!esRel) esRel = config.palabras_clave.some(function(p) { return texto.indexOf(p.toLowerCase()) !== -1; });
      if (!esRel) continue;
      if (presupuesto > 0 && (presupuesto < config.presupuesto_min || presupuesto > config.presupuesto_max)) continue;
      var lic = {
        fuente: 'Junta Andalucía',
        id_externo: 'JA-' + (expediente || normalizarTitulo_(titulo).substring(0, 20)),
        titulo: titulo.substring(0, 500), organismo: organismo.substring(0, 300),
        cpv: cpv, presupuesto: presupuesto, fecha_limite: '', procedimiento: 'No especificado',
        url: 'https://www.juntadeandalucia.es/temas/contratacion-publica/perfiles-licitaciones.html',
        descripcion: (datasetTitle + ' | Exp: ' + expediente).substring(0, 500),
        fecha_deteccion: new Date(), estado: 'historico', scoring: 0, docs_json: ''
      };
      lic.scoring = calcularScoring_(lic, config, '', '');
      if (guardarOportunidad_(lic, HOJA_HISTORICO)) nuevas++; else duplicadas++;
    } catch(e) {}
  }
  return { nuevas: nuevas, duplicadas: duplicadas };
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function normalizarTitulo_(titulo) {
  return (titulo || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 40);
}

function extraerDocURL_(docRef, cbc, cac) {
  var idEl = docRef.getChild('ID', cbc);
  var nombre = idEl ? idEl.getText() : '';
  if (!nombre) return null;
  var attachment = docRef.getChild('Attachment', cac);
  if (!attachment) return null;
  var extRef = attachment.getChild('ExternalReference', cac);
  if (!extRef) return null;
  var uriEl = extRef.getChild('URI', cbc);
  var url = uriEl ? uriEl.getText() : '';
  if (!url) return null;
  return { nombre: nombre, url: url, tipo: '' };
}

function calcularScoring_(lic, config, nutsCode, fechaLimiteISO) {
  var s = 0;
  if (lic.cpv) {
    if (config.cpvs.indexOf(lic.cpv) !== -1) s += config.scoring_cpv_exacto;
    else if (config.cpvs.some(function(c2) { return c2.substring(0, 5) === lic.cpv.substring(0, 5); })) s += config.scoring_cpv_parcial;
  }
  if (lic.presupuesto > 0) {
    if (lic.presupuesto >= config.presupuesto_ideal_min && lic.presupuesto <= config.presupuesto_ideal_max)
      s += config.scoring_presupuesto_ideal;
    else s += Math.round(config.scoring_presupuesto_ideal * 0.6);
  }
  if (nutsCode && nutsCode === config.ubicacion_bonus) s += config.scoring_ubicacion + 5;
  else if (nutsCode && config.nuts_codes.indexOf(nutsCode) !== -1) s += config.scoring_ubicacion;
  else {
    var texto = (lic.titulo + ' ' + lic.organismo + ' ' + lic.descripcion).toLowerCase();
    if (config.ubicaciones.some(function(u) { return texto.indexOf(u.toLowerCase()) !== -1; }))
      s += config.scoring_ubicacion;
  }
  var enc = config.palabras_clave.filter(function(p) { return lic.titulo.toLowerCase().indexOf(p.toLowerCase()) !== -1; });
  s += Math.min(config.scoring_palabras, enc.length * 5);
  if (fechaLimiteISO) {
    s += 5;
    try {
      var fo = new Date(fechaLimiteISO);
      var h  = new Date(); h.setHours(0, 0, 0, 0);
      var d  = Math.ceil((fo - h) / 86400000);
      if (d <= 7) s += 10; else if (d <= 15) s += 7; else if (d <= 30) s += 5;
    } catch(e) {}
  }
  return Math.min(100, s);
}

function guardarOportunidad_(lic, nombreHoja) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(nombreHoja);
  if (!hoja) return null;
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] === lic.id_externo) return null;
  }
  var id = 'OPO-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMdd-HHmmss-') + Math.floor(Math.random() * 1000);
  hoja.appendRow([
    id, lic.id_externo, lic.fuente, lic.titulo, lic.organismo,
    lic.cpv, lic.presupuesto, lic.fecha_limite, lic.procedimiento, lic.url,
    lic.scoring, lic.estado, lic.descripcion.substring(0, 500),
    new Date(), '', lic.docs_json || ''
  ]);
  return id;
}

// ════════════════════════════════════════════════════════════════════════════
// DESCARGA DE PLIEGOS
// ════════════════════════════════════════════════════════════════════════════

function descargarPliegosOportunidad(oportunidadId) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_OPORTUNIDADES);
  if (!hoja) return { ok: false, error: 'Hoja no encontrada' };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] !== oportunidadId) continue;
    var docsJson = datos[i][15] || '';
    if (!docsJson) return { ok: false, error: 'No hay documentos registrados' };
    try {
      var docs = JSON.parse(docsJson);
      var carpetaRaiz = DriveApp.getFolderById(CARPETA_RAIZ_ID);
      var carpetaOpo  = obtenerOCrearCarpeta_(oportunidadId, carpetaRaiz);
      var descargados = 0;
      for (var d = 0; d < docs.length; d++) {
        try {
          var docInfo = docs[d];
          var nombreArchivo = (docInfo.tipo || 'DOC') + '_' + (docInfo.nombre || d);
          var existentes = carpetaOpo.getFilesByName(nombreArchivo);
          if (existentes.hasNext()) { descargados++; continue; }
          var resp = UrlFetchApp.fetch(docInfo.url, { muteHttpExceptions: true, followRedirects: true });
          if (resp.getResponseCode() === 200) {
            var blob = resp.getBlob(); blob.setName(nombreArchivo);
            carpetaOpo.createFile(blob); descargados++;
            actualizarNotasOportunidad_(oportunidadId, carpetaOpo.getUrl(), nombreArchivo);
          }
        } catch(de) {}
      }
      return { ok: true, descargados: descargados, total: docs.length };
    } catch(e) { return { ok: false, error: e.message }; }
  }
  return { ok: false, error: 'Oportunidad no encontrada' };
}

// ════════════════════════════════════════════════════════════════════════════
// CREAR HOJAS Y EMAILS
// ════════════════════════════════════════════════════════════════════════════

function crearHojaOportunidadesSiNoExiste_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(HOJA_OPORTUNIDADES)) return;
  crearHojaConFormato_(HOJA_OPORTUNIDADES, '#0d47a1');
}
function crearHojaHistoricoSiNoExiste_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(HOJA_HISTORICO)) return;
  crearHojaConFormato_(HOJA_HISTORICO, '#4a148c');
}
function crearHojaConFormato_(nombre, color) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.insertSheet(nombre);
  var cab  = ['ID Oportunidad','ID Externo','Fuente','Título','Organismo','CPV',
              'Presupuesto (€)','Fecha Límite','Procedimiento','URL','Scoring',
              'Estado','Descripción','Fecha Detección','Notas','URLs Documentos'];
  hoja.getRange(1, 1, 1, cab.length).setValues([cab]);
  hoja.getRange(1, 1, 1, cab.length).setBackground(color).setFontColor('#ffffff').setFontWeight('bold');
  hoja.setColumnWidth(4, 400); hoja.setColumnWidth(5, 250);
  hoja.setFrozenRows(1);
}

function enviarResumenEmail_(oportunidades, config) {
  try {
    var dest = getEmailNotificacion_('email_licitaciones');
    if (!dest) return; // Sin email configurado, no enviar
    var asunto = '🔍 ' + oportunidades.length + ' nuevas oportunidades — Forgeser';
    var cuerpo = 'RESUMEN EXTRACTOR PLACSP\n\n';
    for (var i = 0; i < oportunidades.length; i++) {
      var o = oportunidades[i];
      cuerpo += (i + 1) + '. ' + o.titulo + '\n';
      cuerpo += '   ' + o.organismo + ' | ' + (o.presupuesto ? Number(o.presupuesto).toLocaleString('es-ES') + ' €' : '?');
      cuerpo += ' | Score: ' + o.scoring + '\n';
      if (o.fecha_limite) cuerpo += '   Plazo: ' + o.fecha_limite + '\n';
      if (o.url) cuerpo += '   ' + o.url + '\n';
      cuerpo += '\n';
    }
    MailApp.sendEmail(dest, asunto, cuerpo);
  } catch(e) {}
}

// ════════════════════════════════════════════════════════════════════════════
// API ESTADÍSTICAS
// ════════════════════════════════════════════════════════════════════════════

function obtenerOportunidadesAPI_() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_OPORTUNIDADES);
  if (!hoja || hoja.getLastRow() <= 1) return { oportunidades: [], total: 0 };
  var datos = hoja.getDataRange().getValues();
  var ops = [];
  for (var i = 1; i < datos.length; i++) {
    var dj = datos[i][15] || '';
    var nd = 0; try { nd = JSON.parse(dj || '[]').length; } catch(x) {}
    ops.push({
      id: datos[i][0], id_externo: datos[i][1], fuente: datos[i][2],
      titulo: datos[i][3], organismo: datos[i][4], cpv: datos[i][5],
      presupuesto: datos[i][6], fecha_limite: datos[i][7], procedimiento: datos[i][8],
      url: datos[i][9], scoring: datos[i][10], estado: datos[i][11],
      descripcion: datos[i][12], fecha_deteccion: datos[i][13], num_docs: nd
    });
  }
  ops.sort(function(a, b) { return (b.scoring || 0) - (a.scoring || 0); });
  return { oportunidades: ops, total: ops.length };
}

function obtenerEstadisticasAPI_() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_OPORTUNIDADES);
  if (!hoja || hoja.getLastRow() <= 1) return { total: 0, nueva: 0, en_analisis: 0, go: 0, no_go: 0 };
  var datos = hoja.getDataRange().getValues();
  var st = { total: 0, nueva: 0, en_analisis: 0, go: 0, no_go: 0, descartada: 0 };
  for (var i = 1; i < datos.length; i++) {
    st.total++;
    var e2 = datos[i][11];
    if (st[e2] !== undefined) st[e2]++;
  }
  return st;
}

// doGet/doPost viejos — renombrados para no interferir con 00b
function doGet_VIEJO(e) { return ContentService.createTextOutput('{}').setMimeType(ContentService.MimeType.JSON); }
function doPost_VIEJO(e) { return ContentService.createTextOutput('{}').setMimeType(ContentService.MimeType.JSON); }