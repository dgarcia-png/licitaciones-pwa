// ============================================================================
// 03_costes_referencia.gs - TABLAS DE COSTES DE REFERENCIA
// Versión: 1.1 | Fecha: Marzo 2026
// ============================================================================

var HOJA_COSTES_REF = 'COSTES_REFERENCIA';

function crearHojaCostesReferencia_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(HOJA_COSTES_REF)) return;
  var hoja = ss.insertSheet(HOJA_COSTES_REF);
  var cab = ['Bloque', 'Concepto', 'Unidad', 'Coste Unitario (€)', 'Notas', 'Activo'];
  hoja.getRange(1, 1, 1, cab.length).setValues([cab]);
  hoja.getRange(1, 1, 1, cab.length).setBackground('#1b5e20').setFontColor('#ffffff').setFontWeight('bold');
  var datos = [
    ['Absentismo', 'Tasa absentismo IT', '% sobre plantilla', 9.5, 'Sector limpieza ~10%, otros ~6-7%', true],
    ['Absentismo', 'Factor absentismo global', 'multiplicador', 1.12, 'Factor sobre coste salarial (1.10-1.15)', true],
    ['', '', '', '', '', ''],
    ['Uniformidad', 'Uniforme completo (pantalón+camisa+calzado)', '€/trabajador/año', 120, 'Reposición anual', true],
    ['Uniformidad', 'Ropa de abrigo', '€/trabajador/año', 35, 'Chaqueta, chaleco exterior', true],
    ['Uniformidad', 'Calzado de seguridad', '€/trabajador/año', 45, '', true],
    ['Uniformidad', 'EPIs básicos (guantes, gafas, mascarilla)', '€/trabajador/año', 60, '', true],
    ['Uniformidad', 'EPIs especiales (arnés, anticaídas)', '€/trabajador/año', 150, 'Solo trabajos en altura', false],
    ['Uniformidad', 'Identificación y serigrafía', '€/trabajador/año', 15, '', true],
    ['', '', '', '', '', ''],
    ['Productos', 'Productos de limpieza general', '€/m²/año', 0.80, 'Detergentes, desengrasantes', true],
    ['Productos', 'Productos limpieza por trabajador', '€/trabajador/mes', 45, 'Alternativa por trabajador', false],
    ['Productos', 'Productos desinfección sanitario', '€/m²/año', 1.50, 'Biocidas, virucidas', false],
    ['Productos', 'Bolsas de basura', '€/trabajador/mes', 12, '', true],
    ['Productos', 'Consumibles higiénicos (jabón, papel)', '€/m²/año', 0.60, 'Si incluido en contrato', false],
    ['Productos', 'Contenedores higiénicos femeninos', '€/unidad/mes', 8, '', false],
    ['', '', '', '', '', ''],
    ['Maquinaria', 'Fregadora automática', '€/unidad/año', 3500, 'Amortización 5 años', false],
    ['Maquinaria', 'Barredora industrial', '€/unidad/año', 2800, 'Amortización 5 años', false],
    ['Maquinaria', 'Abrillantadora/pulidora', '€/unidad/año', 1200, 'Amortización 5 años', false],
    ['Maquinaria', 'Hidrolimpiadora', '€/unidad/año', 800, 'Amortización 5 años', false],
    ['Maquinaria', 'Aspirador industrial', '€/unidad/año', 400, 'Amortización 3 años', true],
    ['Maquinaria', 'Carros de limpieza completos', '€/unidad/año', 180, 'Amortización 3 años', true],
    ['Maquinaria', 'Utillaje menor (mopas, fregonas, cubos)', '€/trabajador/año', 90, '', true],
    ['Maquinaria', 'Mantenimiento maquinaria', '% sobre valor/año', 10, 'Preventivo + correctivo', true],
    ['Maquinaria', 'Señalización', '€/centro/año', 30, '', true],
    ['', '', '', '', '', ''],
    ['Transporte', 'Vehículo renting', '€/vehículo/mes', 350, 'Furgoneta', false],
    ['Transporte', 'Combustible', '€/vehículo/mes', 180, '', false],
    ['Transporte', 'Seguro vehículo', '€/vehículo/año', 600, '', false],
    ['Transporte', 'Mantenimiento vehículo', '€/vehículo/año', 500, '', false],
    ['Transporte', 'Kilometraje personal', '€/km', 0.26, 'Según IRPF', false],
    ['', '', '', '', '', ''],
    ['Seguros', 'Seguro Responsabilidad Civil', '€/año', 1200, 'Varía por facturación', true],
    ['Seguros', 'Seguro RC complementario', '€/año', 2500, 'Contratos >500k€', false],
    ['Seguros', 'Seguro accidentes convenio', '€/trabajador/año', 25, 'Obligatorio', true],
    ['Seguros', 'Seguro multirriesgo', '€/año', 400, 'Oficina, almacén', false],
    ['', '', '', '', '', ''],
    ['PRL', 'Servicio Prevención Ajeno (SPA)', '€/trabajador/año', 65, '', true],
    ['PRL', 'Reconocimiento médico', '€/trabajador/año', 45, 'Anual', true],
    ['PRL', 'Formación PRL inicial', '€/trabajador', 40, 'Una vez', true],
    ['PRL', 'Formación PRL reciclaje', '€/trabajador/año', 20, '', true],
    ['PRL', 'CAE (coord. actividades)', '€/centro/año', 120, '', true],
    ['', '', '', '', '', ''],
    ['Gestión', 'Control horario', '€/trabajador/año', 25, 'App o terminal', true],
    ['Gestión', 'Gestión administrativa', '€/contrato/mes', 150, 'Nóminas, facturación', true],
    ['Gestión', 'Control calidad y supervisión', '€/contrato/mes', 200, 'Visitas, informes', true],
    ['', '', '', '', '', ''],
    ['Certificaciones', 'ISO 9001', '€/año', 1500, '', false],
    ['Certificaciones', 'ISO 14001', '€/año', 1200, '', false],
    ['Certificaciones', 'UNE 179002 hospitalaria', '€/año', 2000, '', false],
    ['', '', '', '', '', ''],
    ['Garantías', 'Garantía definitiva', '% presupuesto', 5, 'LCSP', true],
    ['Garantías', 'Coste aval bancario', '% sobre garantía/año', 1.5, '', true],
    ['', '', '', '', '', ''],
    ['Estructura', 'Gastos generales de estructura', '% sobre costes', 13, 'LCSP: 13-17%', true],
    ['Estructura', 'Beneficio industrial', '% sobre costes', 6, 'LCSP: 6%', true],
    ['Estructura', 'IVA', '%', 21, '', true],
    ['', '', '', '', '', ''],
    ['SS Empresa', 'Contingencias comunes', '%', 23.60, '', true],
    ['SS Empresa', 'Desempleo indefinido', '%', 5.50, '', true],
    ['SS Empresa', 'Desempleo temporal', '%', 6.70, '', false],
    ['SS Empresa', 'FOGASA', '%', 0.20, '', true],
    ['SS Empresa', 'Formación profesional', '%', 0.60, '', true],
    ['SS Empresa', 'AT/EP (IT)', '%', 1.50, 'Varía por CNAE', true],
    ['SS Empresa', 'AT/EP (IMS)', '%', 1.10, '', true],
    ['SS Empresa', 'MEI', '%', 0.58, '2026', true],
  ];
  hoja.getRange(2, 1, datos.length, 6).setValues(datos);
  hoja.getRange('F2:F' + (datos.length + 1)).insertCheckboxes();
  for (var i = 0; i < datos.length; i++) { if (datos[i][5] === true || datos[i][5] === false) hoja.getRange(i + 2, 6).setValue(datos[i][5]); }
  hoja.setColumnWidth(1, 130); hoja.setColumnWidth(2, 300); hoja.setColumnWidth(3, 200);
  hoja.setColumnWidth(4, 120); hoja.setColumnWidth(5, 300); hoja.setColumnWidth(6, 60);
  hoja.getRange('D2:D' + (datos.length + 1)).setNumberFormat('#,##0.00');
  hoja.setFrozenRows(1);
}

// ════════════════════════════════════════
// API: Leer costes
// ════════════════════════════════════════

function obtenerCostesReferenciaAPI_() {
  crearHojaCostesReferencia_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_COSTES_REF);
  if (!hoja || hoja.getLastRow() <= 1) return { costes: [], total: 0 };
  var datos = hoja.getDataRange().getValues();
  var costes = {};
  for (var i = 1; i < datos.length; i++) {
    var bloque = (datos[i][0] || '').toString().trim();
    var concepto = (datos[i][1] || '').toString().trim();
    if (!bloque || !concepto) continue;
    if (!costes[bloque]) costes[bloque] = [];
    costes[bloque].push({
      fila: i + 1,
      concepto: concepto,
      unidad: (datos[i][2] || '').toString().trim(),
      valor: parseFloat(datos[i][3]) || 0,
      notas: (datos[i][4] || '').toString().trim(),
      activo: datos[i][5] === true || datos[i][5] === 'TRUE'
    });
  }
  var activos = {};
  for (var b in costes) { activos[b] = {}; costes[b].forEach(function(c) { if (c.activo) activos[b][c.concepto] = c.valor; }); }
  var ssTotal = 0;
  if (activos['SS Empresa']) { for (var c in activos['SS Empresa']) ssTotal += activos['SS Empresa'][c]; }
  activos['ss_empresa_total'] = ssTotal;
  return { costes: costes, activos: activos, total: Object.keys(costes).length };
}

// ════════════════════════════════════════
// CRUD: Añadir ítem al catálogo
// ════════════════════════════════════════

function addCosteReferencia_(data) {
  crearHojaCostesReferencia_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_COSTES_REF);
  var bloque = data.bloque || '';
  var concepto = data.concepto || '';
  if (!bloque || !concepto) return { ok: false, error: 'Bloque y concepto son obligatorios' };

  // Buscar última fila del bloque para insertar ahí
  var datos = hoja.getDataRange().getValues();
  var ultimaFilaBloque = -1;
  for (var i = 1; i < datos.length; i++) {
    if ((datos[i][0] || '').toString().trim() === bloque) ultimaFilaBloque = i + 1;
  }

  var fila = [bloque, concepto, data.unidad || '', parseFloat(data.valor) || 0, data.notas || '', data.activo !== false];

  if (ultimaFilaBloque > 0) {
    hoja.insertRowAfter(ultimaFilaBloque);
    hoja.getRange(ultimaFilaBloque + 1, 1, 1, 6).setValues([fila]);
    hoja.getRange(ultimaFilaBloque + 1, 6).insertCheckboxes().setValue(data.activo !== false);
  } else {
    hoja.appendRow(fila);
    var lr = hoja.getLastRow();
    hoja.getRange(lr, 6).insertCheckboxes().setValue(data.activo !== false);
  }

  return { ok: true, bloque: bloque, concepto: concepto };
}

// ════════════════════════════════════════
// CRUD: Actualizar ítem
// ════════════════════════════════════════

function updateCosteReferencia_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_COSTES_REF);
  if (!hoja) return { ok: false, error: 'Hoja no encontrada' };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if ((datos[i][0] || '').toString().trim() === data.bloque &&
        (datos[i][1] || '').toString().trim() === data.concepto_original) {
      var f = i + 1;
      if (data.concepto_nuevo) hoja.getRange(f, 2).setValue(data.concepto_nuevo);
      if (data.unidad !== undefined) hoja.getRange(f, 3).setValue(data.unidad);
      if (data.valor !== undefined) hoja.getRange(f, 4).setValue(parseFloat(data.valor) || 0);
      if (data.notas !== undefined) hoja.getRange(f, 5).setValue(data.notas);
      if (data.activo !== undefined) hoja.getRange(f, 6).setValue(data.activo === true || data.activo === 'true');
      return { ok: true };
    }
  }
  return { ok: false, error: 'No encontrado' };
}

// ════════════════════════════════════════
// CRUD: Eliminar ítem
// ════════════════════════════════════════

function deleteCosteReferencia_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_COSTES_REF);
  if (!hoja) return { ok: false, error: 'Hoja no encontrada' };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if ((datos[i][0] || '').toString().trim() === data.bloque &&
        (datos[i][1] || '').toString().trim() === data.concepto) {
      hoja.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false, error: 'No encontrado' };
}

// ════════════════════════════════════════
// TEST
// ════════════════════════════════════════

function testCrearCostesReferencia() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_COSTES_REF);
  if (hoja) ss.deleteSheet(hoja);
  crearHojaCostesReferencia_();
  var r = obtenerCostesReferenciaAPI_();
  Logger.log('Bloques: ' + Object.keys(r.costes).join(', '));
  Logger.log('SS total: ' + r.activos.ss_empresa_total + '%');
}