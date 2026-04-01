// ============================================================================
// 22_territorio_operaciones.gs — Operaciones de campo completas
// Partes GPS, checklist configurable, materiales, maquinaria, costes, P&L
// Versión: 2.0 | Fecha: Marzo 2026
// ============================================================================

var HOJA_PARTES_V2       = 'PARTES_V2';
var HOJA_CHECKLIST_ITEMS = 'CHECKLIST_ITEMS';   // Plantillas de checklist por centro
var HOJA_CHECKLIST_EXEC  = 'CHECKLIST_EXEC';    // Ejecución del checklist por parte
var HOJA_FOTOS_PARTE     = 'FOTOS_PARTE';
var HOJA_MATERIALES_CAT  = 'MATERIALES_CATALOGO';
var HOJA_MATERIALES_PART = 'MATERIALES_PARTE';
var HOJA_MAQUINARIA_CAT  = 'MAQUINARIA_CATALOGO';
var HOJA_MAQUINARIA_PART = 'MAQUINARIA_PARTE';
var HOJA_COSTES_IMPUT    = 'COSTES_IMPUTADOS';
var HOJA_ASISTENCIA      = 'ASISTENCIA_OPERADOR';

// Helper global para normalizar horas — evita bug 1899
function fmtHora_(h) {
  if (!h && h !== 0) return '';
  if (h instanceof Date) return Utilities.formatDate(h, 'Europe/Madrid', 'HH:mm');
  var s = String(h);
  if (s === '' || s === '0') return '';
  // Detectar fecha 1899 o ISO string
  if (s.indexOf('1899') !== -1 || s.indexOf('T') !== -1 || s.indexOf('Z') !== -1) {
    try { return Utilities.formatDate(new Date(s), 'Europe/Madrid', 'HH:mm'); } catch(e) { return ''; }
  }
  // Ya es HH:mm o HH:mm:ss
  return s.substring(0, 5);
}

// ── Inicializar todas las hojas ──────────────────────────────────────────────
function inicializarHojasOperaciones_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var hojas = [
    { nombre: HOJA_PARTES_V2, color: '#1a3c34', cols: [
      'ID','Centro_ID','Centro_Nombre','Empleado_ID','Nombre_Empleado','DNI',
      'Fecha','Hora_Inicio','Hora_Fin','Horas_Reales',
      'Lat_Inicio','Lng_Inicio','Lat_Fin','Lng_Fin',
      'Tipo_Servicio','Estado',
      'Checklist_Total','Checklist_OK','Pct_Completitud',
      'Coste_Personal','Coste_Materiales','Coste_Maquinaria','Coste_Total',
      'Fotos_Antes','Fotos_Despues',
      'Firma_Cliente','Nombre_Firmante','Firma_Drive_URL',
      'Observaciones','Informe_URL','Creado'
    ]},
    { nombre: HOJA_CHECKLIST_ITEMS, color: '#2d5a4e', cols: [
      'ID','Centro_ID','Orden','Tarea','Descripcion',
      'Obligatoria','Tipo_Evidencia','Activa','Creado'
    ]},
    { nombre: HOJA_CHECKLIST_EXEC, color: '#374151', cols: [
      'ID','Parte_ID','Centro_ID','Checklist_Item_ID','Tarea',
      'Completada','Hora','Observacion','Foto_URL'
    ]},
    { nombre: HOJA_FOTOS_PARTE, color: '#4b5563', cols: [
      'ID','Parte_ID','Centro_ID','Tipo','Drive_URL','Drive_ID',
      'Lat','Lng','Timestamp','Nombre_Archivo'
    ]},
    { nombre: HOJA_MATERIALES_CAT, color: '#92400e', cols: [
      'ID','Nombre','Categoria','Unidad','Coste_Unitario',
      'Stock_Global','Stock_Minimo','Proveedor','Referencia','Activo','Creado'
    ]},
    { nombre: HOJA_MATERIALES_PART, color: '#78350f', cols: [
      'ID','Parte_ID','Centro_ID','Oportunidad_ID','Material_ID',
      'Nombre','Unidad','Cantidad','Coste_Unitario','Coste_Total','Creado'
    ]},
    { nombre: HOJA_MAQUINARIA_CAT, color: '#1e3a5f', cols: [
      'ID','Nombre','Tipo','Marca','Modelo','Nº_Serie',
      'Coste_Hora','Coste_Dia','Estado','Activo','Creado'
    ]},
    { nombre: HOJA_MAQUINARIA_PART, color: '#1e40af', cols: [
      'ID','Parte_ID','Centro_ID','Oportunidad_ID','Maquinaria_ID',
      'Nombre','Horas_Uso','Coste_Hora','Coste_Total','Observaciones','Creado'
    ]},
    { nombre: HOJA_COSTES_IMPUT, color: '#064e3b', cols: [
      'ID','Parte_ID','Centro_ID','Oportunidad_ID','Fecha','Periodo',
      'Coste_Personal','Coste_Materiales','Coste_Maquinaria','Coste_Total',
      'Ingresos_Previstos_Mes','Margen_Bruto','Pct_Margen','Creado'
    ]},
    { nombre: HOJA_ASISTENCIA, color: '#1a3c34', cols: [
      'ID','Centro_ID','Centro_Nombre','Empleado_ID','Nombre_Empleado',
      'Fecha','Check_In','Check_Out','Horas',
      'Lat_In','Lng_In','Lat_Out','Lng_Out',
      'Estado','Parte_ID','Creado'
    ]}
  ];

  hojas.forEach(function(def) {
    if (!ss.getSheetByName(def.nombre)) {
      var h = ss.insertSheet(def.nombre);
      h.getRange(1,1,1,def.cols.length).setValues([def.cols])
        .setBackground(def.color).setFontColor('#fff').setFontWeight('bold');
      h.setFrozenRows(1);
    }
  });

  // Insertar catálogo de materiales por defecto si está vacío
  var hMat = ss.getSheetByName(HOJA_MATERIALES_CAT);
  if (hMat && hMat.getLastRow() <= 1) {
    var mats = [
      ['MAT-001','Detergente multiusos','limpieza','litro',2.50,100,10,'Suministros García','DET-001',true,new Date()],
      ['MAT-002','Leja concentrada','limpieza','litro',1.80,80,10,'Suministros García','LEJ-001',true,new Date()],
      ['MAT-003','Desinfectante','limpieza','litro',3.20,50,5,'Suministros García','DES-001',true,new Date()],
      ['MAT-004','Bolsas basura 100L','residuos','unidad',0.30,1000,100,'Suministros García','BOL-100',true,new Date()],
      ['MAT-005','Mopas absorbentes','limpieza','unidad',4.50,40,5,'Material Limpieza SL','MOP-001',true,new Date()],
      ['MAT-006','Papel higiénico industrial','consumibles','unidad',0.90,500,50,'Suministros García','PAP-001',true,new Date()],
      ['MAT-007','Jabón de manos','consumibles','litro',2.10,30,5,'Suministros García','JAB-001',true,new Date()],
      ['MAT-008','Abono NPK granulado','jardineria','kg',1.20,200,20,'Viveros del Sur','ABN-001',true,new Date()],
      ['MAT-009','Herbicida selectivo','jardineria','litro',8.50,15,2,'Viveros del Sur','HER-001',true,new Date()],
      ['MAT-010','Sustrato universal','jardineria','kg',0.40,500,50,'Viveros del Sur','SUS-001',true,new Date()],
      ['MAT-011','Aceite lubricante maquinaria','mantenimiento','litro',6.00,20,5,'Ferretería Central','ACE-001',true,new Date()],
      ['MAT-012','Disco de corte metal','mantenimiento','unidad',3.50,50,10,'Ferretería Central','DIS-001',true,new Date()],
      ['MAT-013','Silicona selladora','mantenimiento','unidad',4.20,20,5,'Ferretería Central','SIL-001',true,new Date()],
      ['MAT-014','Pintura plástica blanca','mantenimiento','litro',5.80,30,5,'Ferretería Central','PIN-001',true,new Date()],
    ];
    hMat.getRange(2,1,mats.length,11).setValues(mats);
  }

  // Maquinaria por defecto
  var hMaq = ss.getSheetByName(HOJA_MAQUINARIA_CAT);
  if (hMaq && hMaq.getLastRow() <= 1) {
    var maquis = [
      ['MAQ-001','Fregadora industrial','fregadora','Tennant','T300','SN001',8.50,65.00,'operativa',true,new Date()],
      ['MAQ-002','Aspirador industrial','aspirador','Kärcher','NT 70/2','SN002',4.00,30.00,'operativa',true,new Date()],
      ['MAQ-003','Desbrozadora gasolina','desbrozadora','Stihl','FS 450','SN003',5.50,40.00,'operativa',true,new Date()],
      ['MAQ-004','Cortacésped autopropulsado','cortacesped','Honda','HRX 476','SN004',6.00,45.00,'operativa',true,new Date()],
      ['MAQ-005','Motosierra','motosierra','Husqvarna','450','SN005',7.00,55.00,'operativa',true,new Date()],
      ['MAQ-006','Soplador de hojas','soplador','Stihl','BR 800','SN006',3.50,25.00,'operativa',true,new Date()],
      ['MAQ-007','Hidrolimpiadora','hidrolimpiadora','Kärcher','HD 9/23','SN007',9.00,70.00,'operativa',true,new Date()],
      ['MAQ-008','Pulidora de suelos','pulidora','Nilfisk','Alto BR 855','SN008',10.00,80.00,'operativa',true,new Date()],
    ];
    hMaq.getRange(2,1,maquis.length,11).setValues(maquis);
  }
}

// ════════════════════════════════════════
// CHECKLIST CONFIGURABLE POR CENTRO
// ════════════════════════════════════════

function obtenerChecklistCentroAPI_(centroId) {
  inicializarHojasOperaciones_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CHECKLIST_ITEMS);
  if (!hoja || hoja.getLastRow() <= 1) return { items: [], total: 0 };

  var datos = hoja.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] === centroId && datos[i][7] !== false) {
      items.push({
        id:             datos[i][0],
        orden:          parseInt(datos[i][2]) || i,
        tarea:          datos[i][3],
        descripcion:    datos[i][4],
        obligatoria:    datos[i][5] !== false,
        tipo_evidencia: datos[i][6] || 'ninguna', // ninguna, foto, observacion, foto_y_obs
        activa:         datos[i][7] !== false
      });
    }
  }
  items.sort(function(a,b) { return a.orden - b.orden; });
  return { items: items, total: items.length };
}

function crearChecklistItemAPI_(data) {
  inicializarHojasOperaciones_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CHECKLIST_ITEMS);
  var id   = 'CHKITEM-' + Utilities.formatDate(new Date(),'Europe/Madrid','yyyyMMddHHmmss') +
             '-' + Math.floor(Math.random()*100);
  // Calcular orden máximo
  var maxOrden = 0;
  if (hoja.getLastRow() > 1) {
    var datos = hoja.getDataRange().getValues();
    for (var i = 1; i < datos.length; i++) {
      if (datos[i][1] === data.centro_id) maxOrden = Math.max(maxOrden, parseInt(datos[i][2])||0);
    }
  }
  hoja.appendRow([
    id, data.centro_id, (parseInt(data.orden)||maxOrden+1),
    data.tarea||'', data.descripcion||'',
    data.obligatoria !== false,
    data.tipo_evidencia||'ninguna', true, new Date()
  ]);
  return { ok: true, id: id };
}

function actualizarChecklistItemAPI_(data) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CHECKLIST_ITEMS);
  if (!hoja) return { ok: false };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === data.id) {
      if (data.tarea       !== undefined) hoja.getRange(i+1,4).setValue(data.tarea);
      if (data.descripcion !== undefined) hoja.getRange(i+1,5).setValue(data.descripcion);
      if (data.obligatoria !== undefined) hoja.getRange(i+1,6).setValue(data.obligatoria);
      if (data.tipo_evidencia !== undefined) hoja.getRange(i+1,7).setValue(data.tipo_evidencia);
      if (data.activa      !== undefined) hoja.getRange(i+1,8).setValue(data.activa);
      if (data.orden       !== undefined) hoja.getRange(i+1,3).setValue(parseInt(data.orden));
      return { ok: true };
    }
  }
  return { ok: false, error: 'Item no encontrado' };
}

function eliminarChecklistItemAPI_(id) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CHECKLIST_ITEMS);
  if (!hoja) return { ok: false };
  var datos = hoja.getDataRange().getValues();
  for (var i = datos.length - 1; i >= 1; i--) {
    if (datos[i][0] === id) { hoja.deleteRow(i+1); return { ok: true }; }
  }
  return { ok: false };
}

// Copiar checklist de un centro a otro
function copiarChecklistAPI_(origen_id, destino_id) {
  var origen = obtenerChecklistCentroAPI_(origen_id);
  var copiados = 0;
  origen.items.forEach(function(item) {
    crearChecklistItemAPI_({
      centro_id: destino_id,
      orden: item.orden, tarea: item.tarea,
      descripcion: item.descripcion, obligatoria: item.obligatoria,
      tipo_evidencia: item.tipo_evidencia
    });
    copiados++;
  });
  return { ok: true, copiados: copiados };
}

// ════════════════════════════════════════
// PARTES DE TRABAJO V2 (completos)
// ════════════════════════════════════════

function iniciarParteAPI_(data) {
  inicializarHojasOperaciones_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PARTES_V2);
  var hojaAs = ss.getSheetByName(HOJA_ASISTENCIA);

  var id = 'PARTEv2-' + Utilities.formatDate(new Date(),'Europe/Madrid','yyyyMMdd-HHmmss') +
           '-' + Math.floor(Math.random()*100);
  var hora = Utilities.formatDate(new Date(),'Europe/Madrid','HH:mm');
  var fecha = data.fecha || Utilities.formatDate(new Date(),'Europe/Madrid','yyyy-MM-dd');

  // Obtener nombre del centro si no viene en data
  var centroNombre = data.centro_nombre || '';
  if (!centroNombre && data.centro_id) {
    try {
      var hCentros = ss.getSheetByName(HOJA_CENTROS);
      if (hCentros) {
        var dC = hCentros.getDataRange().getValues();
        for (var ci = 1; ci < dC.length; ci++) {
          if (dC[ci][0] === data.centro_id) { centroNombre = dC[ci][1] || ''; break; }
        }
      }
    } catch(e) {}
  }

  hoja.appendRow([
    id, data.centro_id||'', centroNombre,
    data.empleado_id||'', data.nombre_empleado||'', data.dni||'',
    fecha, hora, '', 0,
    parseFloat(data.lat)||0, parseFloat(data.lng)||0, 0, 0,
    data.tipo_servicio||'', 'en_curso',
    0, 0, 0,
    0, 0, 0, 0,
    0, 0,
    'no', '', '',
    '', '', new Date()
  ]);

  // Registrar asistencia operador
  if (hojaAs) {
    var idAs = 'ASIS-' + Utilities.formatDate(new Date(),'Europe/Madrid','yyyyMMddHHmmss');
    hojaAs.appendRow([
      idAs, data.centro_id||'', centroNombre,
      data.empleado_id||'', data.nombre_empleado||'',
      fecha, hora, '', 0,
      parseFloat(data.lat)||0, parseFloat(data.lng)||0, 0, 0,
      'activo', id, new Date()
    ]);
  }

  // Fichar entrada automáticamente si no ha fichado aún hoy
  try {
    var hojaFich = ss.getSheetByName(HOJA_FICHAJES);
    if (hojaFich && data.empleado_id) {
      var dFich = hojaFich.getDataRange().getValues();
      var yaFichado = false;
      for (var fi = 1; fi < dFich.length; fi++) {
        var fechaFich = dFich[fi][5] instanceof Date ?
          Utilities.formatDate(dFich[fi][5],'Europe/Madrid','yyyy-MM-dd') : String(dFich[fi][5]||'');
        if (fechaFich === fecha && String(dFich[fi][1]) === String(data.empleado_id) && dFich[fi][6] === 'entrada') {
          yaFichado = true; break;
        }
      }
      if (!yaFichado) {
        var idFich = 'FICH-' + Utilities.formatDate(new Date(),'Europe/Madrid','yyyyMMddHHmmss') + '-AUTO';
        hojaFich.appendRow([
          idFich, data.empleado_id||'', data.nombre_empleado||'', data.dni||'',
          centroNombre, fecha, 'entrada', hora,
          parseFloat(data.lat)||0, parseFloat(data.lng)||0, '',
          'PWA', 'Automático-Parte', 'Fichaje automático al iniciar parte ' + id
        ]);
      }
    }
  } catch(eFich) { Logger.log('Error fichaje auto entrada: ' + eFich.message); }

  // Generar checklist vacío desde la plantilla del centro
  var checklist = obtenerChecklistCentroAPI_(data.centro_id);
  var hojaChk = ss.getSheetByName(HOJA_CHECKLIST_EXEC);
  if (hojaChk && checklist.items.length > 0) {
    checklist.items.forEach(function(item) {
      var idChk = 'CHKEXEC-' + id + '-' + item.id;
      hojaChk.appendRow([
        idChk, id, data.centro_id||'', item.id,
        item.tarea, false, '', '', ''
      ]);
    });
  }

  // Vincular con orden 1:N si viene orden_id
  if (data.orden_id) {
    try {
      actualizarEstadoOrden_(data.orden_id, 'en_proceso', {});
      // Guardar parte_id último en columna 16 de la orden
      var hojaOT2 = ss.getSheetByName(HOJA_ORDENES);
      if (hojaOT2) {
        var dOT2 = hojaOT2.getDataRange().getValues();
        for (var oi2 = 1; oi2 < dOT2.length; oi2++) {
          if (dOT2[oi2][0] === data.orden_id) {
            hojaOT2.getRange(oi2+1, 16).setValue(id);
            break;
          }
        }
      }
      // Registrar en tabla 1:N
      vincularParteOrden_(data.orden_id, id, data.empleado_id||'', data.nombre_empleado||'', fecha, 0);
    } catch(eOrd) { Logger.log('Error vinculando orden: ' + eOrd.message); }
  }

  return {
    ok: true, id: id,
    hora_inicio: hora,
    checklist_generado: checklist.total,
    mensaje: 'Parte iniciado. ' + checklist.total + ' tareas en el checklist.'
  };
}

function finalizarParteAPI_(data) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PARTES_V2);
  if (!hoja) return { ok: false, error: 'Sin hoja' };

  var hora_fin = Utilities.formatDate(new Date(),'Europe/Madrid','HH:mm');
  var datos    = hoja.getDataRange().getValues();

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] !== data.id) continue;

    var hora_ini_raw = datos[i][7];
    var hora_ini_str = (hora_ini_raw instanceof Date)
      ? Utilities.formatDate(hora_ini_raw, 'Europe/Madrid', 'HH:mm')
      : String(hora_ini_raw || '');
    var horas = 0;
    if (hora_ini_str && hora_ini_str.indexOf(':') > -1) {
      try {
        var ini = hora_ini_str.split(':');
        var fin = hora_fin.split(':');
        horas = Math.round(((parseInt(fin[0])*60+parseInt(fin[1])) -
                            (parseInt(ini[0])*60+parseInt(ini[1]))) / 60 * 10) / 10;
        if (horas < 0) horas = 0;
      } catch(e) {}
    }

    // Recalcular costes totales
    var costePers  = calcularCostePersonal_(data.id, datos[i][3], horas);
    var costeMats  = calcularCosteMateriales_(data.id);
    var costeMaqui = calcularCosteMaquinaria_(data.id);
    var costeTotal = costePers + costeMats + costeMaqui;

    // Checklist stats
    var chkStats = obtenerStatsChecklist_(data.id);

    hoja.getRange(i+1, 9).setValue(hora_fin);
    hoja.getRange(i+1, 10).setValue(horas);
    hoja.getRange(i+1, 13).setValue(parseFloat(data.lat_fin)||0);
    hoja.getRange(i+1, 14).setValue(parseFloat(data.lng_fin)||0);
    hoja.getRange(i+1, 16).setValue('completado');
    hoja.getRange(i+1, 17).setValue(chkStats.total);
    hoja.getRange(i+1, 18).setValue(chkStats.completadas);
    hoja.getRange(i+1, 19).setValue(chkStats.pct);
    hoja.getRange(i+1, 20).setValue(costePers);
    hoja.getRange(i+1, 21).setValue(costeMats);
    hoja.getRange(i+1, 22).setValue(costeMaqui);
    hoja.getRange(i+1, 23).setValue(costeTotal);
    if (data.observaciones) hoja.getRange(i+1, 28).setValue(data.observaciones);
    hoja.getRange(i+1, 31).setValue(new Date());

    // Registrar salida asistencia
    var hojaAs = ss.getSheetByName(HOJA_ASISTENCIA);
    if (hojaAs) {
      var dAs = hojaAs.getDataRange().getValues();
      for (var j = 1; j < dAs.length; j++) {
        if (dAs[j][14] === data.id && dAs[j][13] === 'activo') {
          hojaAs.getRange(j+1, 8).setValue(hora_fin);
          hojaAs.getRange(j+1, 9).setValue(horas);
          hojaAs.getRange(j+1, 12).setValue(parseFloat(data.lat_fin)||0);
          hojaAs.getRange(j+1, 13).setValue(parseFloat(data.lng_fin)||0);
          hojaAs.getRange(j+1, 14).setValue('completado');
          break;
        }
      }
    }

    // Fichar salida automáticamente si no quedan más partes activos hoy
    try {
      var hojaFichF = ss.getSheetByName(HOJA_FICHAJES);
      var hojaAsisF = ss.getSheetByName(HOJA_ASISTENCIA);
      var fecha_str = datos[i][6] instanceof Date ?
        Utilities.formatDate(datos[i][6],'Europe/Madrid','yyyy-MM-dd') : String(datos[i][6]||'');
      if (!fecha_str) fecha_str = Utilities.formatDate(new Date(),'Europe/Madrid','yyyy-MM-dd');
      if (hojaFichF && hojaAsisF && datos[i][3]) {
        var empIdF = datos[i][3];
        // Comprobar si quedan partes activos del mismo empleado hoy
        var dAsF = hojaAsisF.getDataRange().getValues();
        var partesActivosHoy = 0;
        for (var pf = 1; pf < dAsF.length; pf++) {
          var fAsF = dAsF[pf][5] instanceof Date ?
            Utilities.formatDate(dAsF[pf][5],'Europe/Madrid','yyyy-MM-dd') : String(dAsF[pf][5]||'');
          if (fAsF === fecha_str && String(dAsF[pf][3]) === String(empIdF) && dAsF[pf][13] === 'activo') {
            partesActivosHoy++;
          }
        }
        if (partesActivosHoy === 0) {
          // No quedan partes activos — fichar salida si no existe ya
          var dFichF = hojaFichF.getDataRange().getValues();
          var yaFichadoSalida = false;
          for (var fsi = 1; fsi < dFichF.length; fsi++) {
            var fFichF = dFichF[fsi][5] instanceof Date ?
              Utilities.formatDate(dFichF[fsi][5],'Europe/Madrid','yyyy-MM-dd') : String(dFichF[fsi][5]||'');
            if (fFichF === fecha_str && String(dFichF[fsi][1]) === String(empIdF) && dFichF[fsi][6] === 'salida') {
              yaFichadoSalida = true; break;
            }
          }
          if (!yaFichadoSalida) {
            var idFichS = 'FICH-' + Utilities.formatDate(new Date(),'Europe/Madrid','yyyyMMddHHmmss') + '-AUTO-S';
            hojaFichF.appendRow([
              idFichS, empIdF, datos[i][4]||'', datos[i][5]||'',
              datos[i][2]||'', fecha_str, 'salida', hora_fin,
              parseFloat(data.lat_fin)||0, parseFloat(data.lng_fin)||0, '',
              'PWA', 'Automático-Parte', 'Fichaje automático al finalizar parte ' + data.id
            ]);
          }
        }
      }
    } catch(eFichS) { Logger.log('Error fichaje auto salida: ' + eFichS.message); }

    // Imputar costes al contrato
    try { imputarCostesContrato_(datos[i], costeTotal, costePers, costeMats, costeMaqui, data.id); } catch(e) {}

    // Actualizar horas en PARTES_POR_ORDEN y evaluar si completar la orden
    if (data.orden_id) {
      try {
        // Actualizar horas en la tabla 1:N
        var hPPO = ss.getSheetByName('PARTES_POR_ORDEN');
        if (hPPO) {
          var dPPO = hPPO.getDataRange().getValues();
          for (var po = 1; po < dPPO.length; po++) {
            if (dPPO[po][1] === data.orden_id && dPPO[po][2] === data.id) {
              hPPO.getRange(po+1, 7).setValue(horas);
              break;
            }
          }
        }
        // Verificar si la orden está completa (horas reales >= estimadas)
        var resPartes = obtenerPartesDeOrdenAPI_(data.orden_id);
        var horasTotales = resPartes.total_horas || 0;
        var pct = resPartes.pct_completado || 0;
        if (pct >= 100) {
          actualizarEstadoOrden_(data.orden_id, 'completada', { horas_reales: horasTotales });
        }
        // Si no está completa al 100% pero este parte finalizó → dejar en_proceso
        // El supervisor puede completarla manualmente
      } catch(e) { Logger.log('Error actualizando orden tras parte: ' + e.message); }
    }

    // Generar PDF del parte automáticamente
    var informeUrl = '';
    try {
      informeUrl = generarPDFParte_(data.id, datos[i]);
      if (informeUrl) hoja.getRange(i+1, 30).setValue(informeUrl); // col 30 = Informe_URL
    } catch(e) { Logger.log('Error generando PDF: ' + e.message); }

    // ── Conexión con CALIDAD ──────────────────────────────────────────────
    try {
      var centroIdQ  = datos[i][1];
      var observQ    = data.observaciones || '';
      var pctCheckQ  = chkStats ? chkStats.pct : 0;
      var nombreEmpQ = datos[i][4] || '';

      // 1. Si hay observaciones → crear acción correctiva sugerida
      if (observQ && observQ.trim().length > 10 && centroIdQ) {
        crearAccionCorrectiva_({
          centro_id:            centroIdQ,
          inspeccion_id:        data.id, // parte como origen
          descripcion_problema: 'Observación en parte ' + data.id + ': ' + observQ.substring(0,200),
          accion_propuesta:     'Revisar incidencia reportada por operario',
          responsable:          nombreEmpQ,
          fecha_limite:         calcularFechaLimite_(3) // 3 días
        });
        Logger.log('Acción correctiva creada desde parte ' + data.id);
      }

      // 2. Registrar puntuación de calidad basada en checklist del parte
      if (centroIdQ && pctCheckQ >= 0) {
        // Convertir % checklist a escala 0-5
        var puntuacion = Math.round(pctCheckQ / 100 * 5 * 10) / 10;
        crearInspeccionAPI_({
          centro_id:             centroIdQ,
          centro_nombre:         datos[i][2] || '',
          inspector_id:          datos[i][3] || '',
          nombre_inspector:      nombreEmpQ,
          fecha:                 Utilities.formatDate(new Date(),'Europe/Madrid','yyyy-MM-dd'),
          tipo:                  'parte_trabajo',
          puntuacion_limpieza:   puntuacion,
          puntuacion_orden:      puntuacion,
          puntuacion_seguridad:  5, // seguridad no evaluada en parte → máximo
          puntuacion_personal:   puntuacion,
          observaciones:         observQ || ('Parte completado al ' + pctCheckQ + '%')
        });
      }
    } catch(eQ) { Logger.log('Error calidad desde parte: ' + eQ.message); }

    return {
      ok: true, id: data.id,
      hora_fin: hora_fin, horas: horas,
      coste_personal: costePers, coste_materiales: costeMats,
      coste_maquinaria: costeMaqui, coste_total: costeTotal,
      checklist_pct: chkStats.pct,
      informe_url: informeUrl
    };
  }
  return { ok: false, error: 'Parte no encontrado' };
}

// ── Checklist ejecución ──────────────────────────────────────────────────────
function actualizarChecklistEjecucionAPI_(data) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CHECKLIST_EXEC);
  if (!hoja) return { ok: false };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === data.id) {
      hoja.getRange(i+1, 6).setValue(data.completada !== false);
      hoja.getRange(i+1, 7).setValue(
        data.completada !== false ?
        Utilities.formatDate(new Date(),'Europe/Madrid','HH:mm') : '');
      if (data.observacion !== undefined) hoja.getRange(i+1, 8).setValue(data.observacion);
      if (data.foto_url)    hoja.getRange(i+1, 9).setValue(data.foto_url);
      return { ok: true };
    }
  }
  return { ok: false };
}

function obtenerChecklistEjecucionAPI_(parteId) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CHECKLIST_EXEC);
  if (!hoja || hoja.getLastRow() <= 1) return { items: [], stats: { total:0, completadas:0, pct:0 } };
  var datos = hoja.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] === parteId) {
      items.push({
        id:          datos[i][0],
        item_id:     datos[i][3],
        tarea:       datos[i][4],
        completada:  datos[i][5] === true || datos[i][5] === 'TRUE',
        hora:        datos[i][6],
        observacion: datos[i][7],
        foto_url:    datos[i][8]
      });
    }
  }
  var completadas = items.filter(function(x){return x.completada;}).length;
  return {
    items: items,
    stats: {
      total: items.length,
      completadas: completadas,
      pct: items.length > 0 ? Math.round(completadas/items.length*100) : 0
    }
  };
}

function obtenerStatsChecklist_(parteId) {
  var r = obtenerChecklistEjecucionAPI_(parteId);
  return r.stats;
}

// ── Materiales ───────────────────────────────────────────────────────────────
function registrarMaterialParteAPI_(data) {
  inicializarHojasOperaciones_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_MATERIALES_PART);
  var id   = 'MATPART-' + Date.now();

  // Obtener coste unitario del catálogo si no viene
  var costeUnit = parseFloat(data.coste_unitario)||0;
  if (!costeUnit && data.material_id) {
    var hCat = ss.getSheetByName(HOJA_MATERIALES_CAT);
    if (hCat) {
      var dCat = hCat.getDataRange().getValues();
      for (var i = 1; i < dCat.length; i++) {
        if (dCat[i][0] === data.material_id) {
          costeUnit = parseFloat(dCat[i][4])||0; break;
        }
      }
    }
  }

  var cantidad   = parseFloat(data.cantidad)||1;
  var costeTotal = Math.round(costeUnit * cantidad * 100) / 100;

  // Obtener oportunidad_id del centro
  var opoId = obtenerOportunidadDeCentro_(data.centro_id);

  hoja.appendRow([
    id, data.parte_id||'', data.centro_id||'', opoId,
    data.material_id||'', data.nombre||'', data.unidad||'',
    cantidad, costeUnit, costeTotal, new Date()
  ]);

  // Descontar del stock global (catálogo)
  try { descontarStock_(data.material_id, cantidad); } catch(e) {}

  // Descontar del stock por centro
  if (data.centro_id && data.material_id) {
    try {
      ajustarStockCentroAPI_({
        centro_id:   data.centro_id,
        material_id: data.material_id,
        nombre:      data.nombre || '',
        tipo:        'salida',
        cantidad:    cantidad,
        parte_id:    data.parte_id || ''
      });
    } catch(e) { Logger.log('Error descontando stock centro: ' + e.message); }
  }

  return { ok: true, id: id, coste_total: costeTotal };
}

function obtenerMaterialesParteAPI_(parteId) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_MATERIALES_PART);
  if (!hoja || hoja.getLastRow() <= 1) return { materiales: [], coste_total: 0 };
  var datos = hoja.getDataRange().getValues();
  var mats = [];
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] === parteId) {
      mats.push({
        id:            datos[i][0],
        material_id:   datos[i][4],
        nombre:        datos[i][5],
        unidad:        datos[i][6],
        cantidad:      parseFloat(datos[i][7])||0,
        coste_unitario:parseFloat(datos[i][8])||0,
        coste_total:   parseFloat(datos[i][9])||0
      });
    }
  }
  var total = mats.reduce(function(s,m){return s+m.coste_total;},0);
  return { materiales: mats, coste_total: Math.round(total*100)/100 };
}

function eliminarMaterialParteAPI_(id) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_MATERIALES_PART);
  if (!hoja) return { ok: false };
  var datos = hoja.getDataRange().getValues();
  for (var i = datos.length-1; i >= 1; i--) {
    if (datos[i][0] === id) {
      var matId   = datos[i][4];
      var centroId = datos[i][2];
      var cant    = parseFloat(datos[i][7])||0;
      var nombre  = datos[i][5]||'';
      // Devolver al stock global
      try { descontarStock_(matId, -cant); } catch(e) {}
      // Devolver al stock por centro
      if (centroId && matId) {
        try {
          ajustarStockCentroAPI_({ centro_id: centroId, material_id: matId, nombre: nombre, tipo: 'entrada', cantidad: cant });
        } catch(e) {}
      }
      hoja.deleteRow(i+1);
      return { ok: true };
    }
  }
  return { ok: false };
}

// ── Maquinaria ───────────────────────────────────────────────────────────────
function registrarMaquinariaParteAPI_(data) {
  inicializarHojasOperaciones_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_MAQUINARIA_PART);
  var id   = 'MAQPART-' + Date.now();

  var costeHora = parseFloat(data.coste_hora)||0;
  if (!costeHora && data.maquinaria_id) {
    var hCat = ss.getSheetByName(HOJA_MAQUINARIA_CAT);
    if (hCat) {
      var dCat = hCat.getDataRange().getValues();
      for (var i = 1; i < dCat.length; i++) {
        if (dCat[i][0] === data.maquinaria_id) {
          costeHora = parseFloat(dCat[i][6])||0; break;
        }
      }
    }
  }

  var horas      = parseFloat(data.horas_uso)||0;
  var costeTotal = Math.round(costeHora * horas * 100) / 100;
  var opoId      = obtenerOportunidadDeCentro_(data.centro_id);

  hoja.appendRow([
    id, data.parte_id||'', data.centro_id||'', opoId,
    data.maquinaria_id||'', data.nombre||'',
    horas, costeHora, costeTotal, data.observaciones||'', new Date()
  ]);

  return { ok: true, id: id, coste_total: costeTotal };
}

function obtenerMaquinariaParteAPI_(parteId) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_MAQUINARIA_PART);
  if (!hoja || hoja.getLastRow() <= 1) return { maquinaria: [], coste_total: 0 };
  var datos = hoja.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] === parteId) {
      items.push({
        id:           datos[i][0],
        maquinaria_id:datos[i][4],
        nombre:       datos[i][5],
        horas_uso:    parseFloat(datos[i][6])||0,
        coste_hora:   parseFloat(datos[i][7])||0,
        coste_total:  parseFloat(datos[i][8])||0,
        observaciones:datos[i][9]
      });
    }
  }
  var total = items.reduce(function(s,m){return s+m.coste_total;},0);
  return { maquinaria: items, coste_total: Math.round(total*100)/100 };
}

// ── Fotos ────────────────────────────────────────────────────────────────────
function registrarFotoParteAPI_(data) {
  inicializarHojasOperaciones_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_FOTOS_PARTE);
  var id   = 'FOTO-' + Date.now();
  var driveUrl = '', driveId = '';

  // Subir a Drive si viene base64
  if (data.base64) {
    try {
      var decoded  = Utilities.base64Decode(data.base64);
      var blob     = Utilities.newBlob(decoded, data.mime||'image/jpeg', data.nombre||'foto.jpg');
      var carpetaRaiz = DriveApp.getFolderById(CARPETA_RAIZ_ID);
      var carpetaFotos = obtenerOCrearCarpeta_('FOTOS_PARTES', carpetaRaiz);
      var carpetaCentro = obtenerOCrearCarpeta_(data.centro_id||'sin_centro', carpetaFotos);
      var archivo  = carpetaCentro.createFile(blob);
      archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      driveId  = archivo.getId();
      driveUrl = 'https://drive.google.com/uc?export=view&id=' + driveId;
    } catch(e) { Logger.log('Foto error: ' + e.message); }
  } else {
    driveUrl = data.url||'';
    driveId  = data.drive_id||'';
  }

  hoja.appendRow([
    id, data.parte_id||'', data.centro_id||'',
    data.tipo||'otro', // antes, despues, incidencia, referencia
    driveUrl, driveId,
    parseFloat(data.lat)||0, parseFloat(data.lng)||0,
    new Date(), data.nombre||'foto.jpg'
  ]);

  // Actualizar contador de fotos en el parte
  if (data.parte_id) {
    try {
      var hojaPartes = ss.getSheetByName(HOJA_PARTES_V2);
      if (hojaPartes) {
        var dpArtes = hojaPartes.getDataRange().getValues();
        for (var p = 1; p < dpArtes.length; p++) {
          if (dpArtes[p][0] === data.parte_id) {
            var tipo = (data.tipo || 'otro').toLowerCase();
            if (tipo === 'antes') {
              var actual = parseInt(dpArtes[p][23]) || 0;
              hojaPartes.getRange(p+1, 24).setValue(actual + 1);
            } else if (tipo === 'despues') {
              var actual2 = parseInt(dpArtes[p][24]) || 0;
              hojaPartes.getRange(p+1, 25).setValue(actual2 + 1);
            }
            break;
          }
        }
      }
    } catch(e) { Logger.log('Error actualizando contador fotos: ' + e.message); }
  }

  return { ok: true, id: id, url: driveUrl, drive_id: driveId };
}

function obtenerFotosParteAPI_(parteId) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_FOTOS_PARTE);
  if (!hoja || hoja.getLastRow() <= 1) return { fotos: [], total: 0 };
  var datos = hoja.getDataRange().getValues();
  var fotos = [];
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] === parteId) {
      fotos.push({
        id:    datos[i][0],
        tipo:  datos[i][3],
        url:   datos[i][4],
        lat:   datos[i][6],
        lng:   datos[i][7],
        ts:    datos[i][8]
      });
    }
  }
  return {
    fotos: fotos, total: fotos.length,
    antes:   fotos.filter(function(f){return f.tipo==='antes';}).length,
    despues: fotos.filter(function(f){return f.tipo==='despues';}).length
  };
}

// ── Firma digital ────────────────────────────────────────────────────────────
function registrarFirmaAPI_(data) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PARTES_V2);
  if (!hoja) return { ok: false };
  var datos = hoja.getDataRange().getValues();

  var firmaUrl = '';
  if (data.firma_base64) {
    try {
      var decoded = Utilities.base64Decode(data.firma_base64);
      var blob    = Utilities.newBlob(decoded, 'image/png', 'firma_' + data.parte_id + '.png');
      var carpeta = DriveApp.getFolderById(CARPETA_RAIZ_ID);
      var carpetaFirmas = obtenerOCrearCarpeta_('FIRMAS_CLIENTES', carpeta);
      var archivo = carpetaFirmas.createFile(blob);
      archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      firmaUrl    = 'https://drive.google.com/uc?export=view&id=' + archivo.getId();
    } catch(e) {}
  }

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === data.parte_id) {
      hoja.getRange(i+1, 26).setValue('si');
      hoja.getRange(i+1, 27).setValue(data.nombre_firmante||'Cliente');
      hoja.getRange(i+1, 28).setValue(firmaUrl);
      return { ok: true, firma_url: firmaUrl };
    }
  }
  return { ok: false, error: 'Parte no encontrado' };
}

// ── Parte completo (para mostrar en detalle) ─────────────────────────────────
function obtenerParteCompletoAPI_(parteId) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PARTES_V2);
  if (!hoja) return { error: 'Sin datos' };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] !== parteId) continue;
    var parte = parsearParteV2_(datos[i]);
    parte.checklist  = obtenerChecklistEjecucionAPI_(parteId);
    parte.materiales = obtenerMaterialesParteAPI_(parteId);
    parte.maquinaria = obtenerMaquinariaParteAPI_(parteId);
    parte.fotos      = obtenerFotosParteAPI_(parteId);
    return parte;
  }
  return { error: 'Parte no encontrado' };
}

function obtenerPartesV2API_(filtros) {
  inicializarHojasOperaciones_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PARTES_V2);
  if (!hoja || hoja.getLastRow() <= 1) return { partes: [], total: 0 };

  var datos  = hoja.getDataRange().getValues();
  var partes = [];

  for (var i = datos.length - 1; i >= 1; i--) {
    if (!datos[i][0]) continue;
    var parte = parsearParteV2_(datos[i]);

    if (filtros) {
      if (filtros.centro_id && parte.centro_id !== filtros.centro_id) continue;
      if (filtros.empleado_id && parte.empleado_id !== filtros.empleado_id) continue;
      if (filtros.fecha && parte.fecha !== filtros.fecha) continue;
      if (filtros.estado && parte.estado !== filtros.estado) continue;
      if (filtros.mes && (!parte.fecha || parte.fecha.substring(0,7) !== filtros.mes)) continue;
    }

    // Si se pide para portal cliente, añadir URLs de fotos
    if (filtros && filtros.con_fotos) {
      try {
        var fotosData = obtenerFotosParteAPI_(parte.id);
        parte.fotos = fotosData.fotos || [];
      } catch(e) { parte.fotos = []; }
    }

    partes.push(parte);
    if (partes.length >= 100) break;
  }

  var totalHoras  = partes.reduce(function(s,p){return s+(p.horas_reales||0);},0);
  var totalCoste  = partes.reduce(function(s,p){return s+(p.coste_total||0);},0);

  return {
    partes: partes, total: partes.length,
    total_horas: Math.round(totalHoras*10)/10,
    total_coste: Math.round(totalCoste*100)/100
  };
}

function parsearParteV2_(row) {
  return {
    id:               row[0],
    centro_id:        row[1],
    centro_nombre:    row[2],
    empleado_id:      row[3],
    nombre_empleado:  row[4],
    dni:              row[5],
    fecha:            row[6] instanceof Date ? Utilities.formatDate(row[6],'Europe/Madrid','yyyy-MM-dd') : String(row[6]||''),
    hora_inicio:      fmtHora_(row[7]),
    hora_fin:         fmtHora_(row[8]),
    horas_reales:     parseFloat(row[9])||0,
    lat_inicio:       parseFloat(row[10])||0,
    lng_inicio:       parseFloat(row[11])||0,
    lat_fin:          parseFloat(row[12])||0,
    lng_fin:          parseFloat(row[13])||0,
    tipo_servicio:    row[14],
    estado:           row[15],
    checklist_total:  parseInt(row[16])||0,
    checklist_ok:     parseInt(row[17])||0,
    pct_completitud:  parseFloat(row[18])||0,
    coste_personal:   parseFloat(row[19])||0,
    coste_materiales: parseFloat(row[20])||0,
    coste_maquinaria: parseFloat(row[21])||0,
    coste_total:      parseFloat(row[22])||0,
    fotos_antes:      parseInt(row[23])||0,
    fotos_despues:    parseInt(row[24])||0,
    firma_cliente:    row[25],
    nombre_firmante:  row[26],
    firma_url:        row[27],
    observaciones:    row[28],
    informe_url:      row[29]
  };
}

// ════════════════════════════════════════
// CATÁLOGOS — Materiales y Maquinaria
// ════════════════════════════════════════

function obtenerCatalogoMaterialesAPI_() {
  inicializarHojasOperaciones_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_MATERIALES_CAT);
  if (!hoja || hoja.getLastRow() <= 1) return { materiales: [] };
  var datos = hoja.getDataRange().getValues();
  var mats  = [];
  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0] || datos[i][9] === false) continue;
    mats.push({
      id:            datos[i][0],
      nombre:        datos[i][1],
      categoria:     datos[i][2],
      unidad:        datos[i][3],
      coste_unitario:parseFloat(datos[i][4])||0,
      stock:         parseFloat(datos[i][5])||0,
      stock_minimo:  parseFloat(datos[i][6])||0,
      alerta_stock:  (parseFloat(datos[i][5])||0) <= (parseFloat(datos[i][6])||0),
      proveedor:     datos[i][7]
    });
  }
  return { materiales: mats, total: mats.length };
}

function crearMaterialCatalogoAPI_(data) {
  inicializarHojasOperaciones_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_MATERIALES_CAT);
  var id   = 'MAT-' + Utilities.formatDate(new Date(),'Europe/Madrid','yyyyMMddHHmmss');
  hoja.appendRow([
    id, data.nombre||'', data.categoria||'', data.unidad||'unidad',
    parseFloat(data.coste_unitario)||0, parseFloat(data.stock)||0,
    parseFloat(data.stock_minimo)||0, data.proveedor||'',
    data.referencia||'', true, new Date()
  ]);
  return { ok: true, id: id };
}

function obtenerCatalogoMaquinariaAPI_() {
  inicializarHojasOperaciones_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_MAQUINARIA_CAT);
  if (!hoja || hoja.getLastRow() <= 1) return { maquinaria: [] };
  var datos = hoja.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0] || datos[i][9] === false) continue;
    items.push({
      id:          datos[i][0],
      nombre:      datos[i][1],
      tipo:        datos[i][2],
      marca:       datos[i][3],
      modelo:      datos[i][4],
      coste_hora:  parseFloat(datos[i][6])||0,
      coste_dia:   parseFloat(datos[i][7])||0,
      estado:      datos[i][8]
    });
  }
  return { maquinaria: items, total: items.length };
}

function crearMaquinariaCatalogoAPI_(data) {
  inicializarHojasOperaciones_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_MAQUINARIA_CAT);
  var id   = 'MAQ-' + Utilities.formatDate(new Date(),'Europe/Madrid','yyyyMMddHHmmss');
  hoja.appendRow([
    id, data.nombre||'', data.tipo||'', data.marca||'',
    data.modelo||'', data.num_serie||'',
    parseFloat(data.coste_hora)||0, parseFloat(data.coste_dia)||0,
    'operativa', true, new Date()
  ]);
  return { ok: true, id: id };
}

// ════════════════════════════════════════
// IMPUTACIÓN DE COSTES Y P&L
// ════════════════════════════════════════

function imputarCostesContrato_(parteRow, costeTotal, costePers, costeMats, costeMaqui, parteId) {
  inicializarHojasOperaciones_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_COSTES_IMPUT);
  var id   = 'COST-' + Date.now();

  var centroId = parteRow[1];
  var fecha    = parteRow[6] instanceof Date ? Utilities.formatDate(parteRow[6],'Europe/Madrid','yyyy-MM-dd') : String(parteRow[6]||'');
  var periodo  = fecha ? fecha.substring(0,7) : '';
  var opoId    = obtenerOportunidadDeCentro_(centroId);

  // Calcular ingresos previstos del mes (presupuesto_anual / 12)
  var ingMes = 0;
  var hCentros = ss.getSheetByName(HOJA_CENTROS);
  if (hCentros) {
    var dCentros = hCentros.getDataRange().getValues();
    for (var i = 1; i < dCentros.length; i++) {
      if (dCentros[i][0] === centroId) {
        ingMes = Math.round((parseFloat(dCentros[i][17])||0) / 12 * 100) / 100; break;
      }
    }
  }

  var margen = ingMes > 0 ? Math.round((ingMes - costeTotal) * 100) / 100 : 0;
  var pctMargen = ingMes > 0 ? Math.round((margen / ingMes) * 100) : 0;

  hoja.appendRow([
    id, parteId, centroId, opoId, fecha, periodo,
    Math.round(costePers*100)/100,
    Math.round(costeMats*100)/100,
    Math.round(costeMaqui*100)/100,
    Math.round(costeTotal*100)/100,
    ingMes, margen, pctMargen, new Date()
  ]);
}

function obtenerPLContrato_(centroId, meses) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_COSTES_IMPUT);
  if (!hoja || hoja.getLastRow() <= 1) return { periodos: [], resumen: {} };

  var datos = hoja.getDataRange().getValues();
  var porPeriodo = {};

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] && datos[i][1] !== centroId && centroId) continue;
    var periodo = datos[i][5];
    if (!periodo) continue;
    if (!porPeriodo[periodo]) {
      porPeriodo[periodo] = {
        periodo: periodo, partes: 0,
        coste_personal:0, coste_materiales:0, coste_maquinaria:0,
        coste_total:0, ingresos:parseFloat(datos[i][10])||0, margen:0
      };
    }
    var p = porPeriodo[periodo];
    p.partes++;
    p.coste_personal    += parseFloat(datos[i][6])||0;
    p.coste_materiales  += parseFloat(datos[i][7])||0;
    p.coste_maquinaria  += parseFloat(datos[i][8])||0;
    p.coste_total       += parseFloat(datos[i][9])||0;
    if (!p.ingresos) p.ingresos = parseFloat(datos[i][10])||0;
  }

  var periodos = Object.keys(porPeriodo).sort().reverse().slice(0, meses||12);
  var resultado = periodos.map(function(k) {
    var p = porPeriodo[k];
    p.margen = Math.round((p.ingresos - p.coste_total)*100)/100;
    p.pct_margen = p.ingresos > 0 ? Math.round(p.margen/p.ingresos*100) : 0;
    return p;
  });

  var totalIngresos = resultado.reduce(function(s,p){return s+p.ingresos;},0);
  var totalCostes   = resultado.reduce(function(s,p){return s+p.coste_total;},0);

  return {
    periodos: resultado,
    resumen: {
      total_ingresos: Math.round(totalIngresos*100)/100,
      total_costes:   Math.round(totalCostes*100)/100,
      margen_total:   Math.round((totalIngresos-totalCostes)*100)/100,
      pct_margen:     totalIngresos > 0 ? Math.round((totalIngresos-totalCostes)/totalIngresos*100) : 0
    }
  };
}

// ════════════════════════════════════════
// GENERADOR DE INFORME MENSUAL PDF (HTML→Drive)
// ════════════════════════════════════════

function generarInformeMensualClienteAPI_(data) {
  var centroId = data.centro_id;
  var mes      = data.mes; // 'yyyy-MM'
  if (!centroId || !mes) return { ok: false, error: 'Centro y mes requeridos' };

  // Datos del centro
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hCentros = ss.getSheetByName(HOJA_CENTROS);
  var centro = null;
  if (hCentros) {
    var dC = hCentros.getDataRange().getValues();
    for (var i = 1; i < dC.length; i++) {
      if (dC[i][0] === centroId) { centro = parsearCentro_(dC[i]); break; }
    }
  }
  if (!centro) return { ok: false, error: 'Centro no encontrado' };

  // Partes del mes
  var partesMes = obtenerPartesV2API_({ centro_id: centroId, mes: mes });
  var pl        = obtenerPLContrato_(centroId, 1);

  // Generar HTML del informe
  var mesLabel  = mes.substring(0,4) + ' - ' + ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][parseInt(mes.substring(5,7))];

  var html = generarHTMLInforme_(centro, partesMes, pl, mesLabel);

  // Guardar en Drive como HTML (cliente puede imprimir como PDF)
  try {
    var blob    = Utilities.newBlob(html, 'text/html', 'Informe_' + centro.nombre.replace(/\s/g,'_') + '_' + mes + '.html');
    var carpeta = DriveApp.getFolderById(CARPETA_RAIZ_ID);
    var carpInf = obtenerOCrearCarpeta_('INFORMES_CLIENTES', carpeta);
    var carpCentro = obtenerOCrearCarpeta_(centroId, carpInf);
    var archivo = carpCentro.createFile(blob);
    archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var url = 'https://drive.google.com/uc?export=view&id=' + archivo.getId();

    // Guardar URL en el parte más reciente del mes
    actualizarInformeURLPartes_(centroId, mes, url);

    return { ok: true, url: url, partes: partesMes.total, horas: partesMes.total_horas };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

function generarHTMLInforme_(centro, partesMes, pl, mesLabel) {
  var p = pl.resumen || {};
  var fecha = Utilities.formatDate(new Date(),'Europe/Madrid','dd/MM/yyyy');

  var tablaPart = '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
    '<tr style="background:#1a3c34;color:#fff"><th style="padding:6px">Fecha</th><th>Trabajador</th>' +
    '<th>Entrada</th><th>Salida</th><th>Horas</th><th>Checklist</th><th>Firma</th></tr>';

  (partesMes.partes || []).forEach(function(parte) {
    tablaPart += '<tr style="border-bottom:1px solid #eee">' +
      '<td style="padding:5px">' + parte.fecha + '</td>' +
      '<td>' + (parte.nombre_empleado||'-') + '</td>' +
      '<td>' + (parte.hora_inicio||'-') + '</td>' +
      '<td>' + (parte.hora_fin||'-') + '</td>' +
      '<td style="text-align:center">' + (parte.horas_reales||0) + 'h</td>' +
      '<td style="text-align:center">' + (parte.pct_completitud||0) + '%</td>' +
      '<td style="text-align:center">' + (parte.firma_cliente==='si' ? '✓' : '-') + '</td>' +
      '</tr>';
  });
  tablaPart += '</table>';

  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">' +
    '<style>body{font-family:Arial,sans-serif;color:#1e293b;margin:0;padding:20px}' +
    'h1{color:#1a3c34}h2{color:#2d5a4e;border-bottom:2px solid #1a3c34;padding-bottom:6px}' +
    '.kpi{display:inline-block;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;' +
    'padding:12px 20px;margin:6px;text-align:center}.kpi-val{font-size:22px;font-weight:900;color:#1a3c34}' +
    '.kpi-lab{font-size:11px;color:#64748b;text-transform:uppercase}' +
    'table{width:100%;border-collapse:collapse}th,td{padding:8px;text-align:left}' +
    'th{background:#1a3c34;color:#fff}.footer{color:#94a3b8;font-size:11px;margin-top:30px;border-top:1px solid #e2e8f0;padding-top:12px}' +
    '@media print{body{margin:0}}</style></head><body>' +
    '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:20px">' +
    '<div><h1>Informe de Servicios</h1>' +
    '<p style="color:#64748b;margin:0">' + mesLabel + '</p></div>' +
    '<div style="text-align:right"><p style="font-weight:bold;margin:0">Forgeser Servicios del Sur SL</p>' +
    '<p style="color:#64748b;font-size:12px;margin:0">Almonte, Huelva · ' + fecha + '</p></div></div>' +
    '<h2>Centro: ' + centro.nombre + '</h2>' +
    '<p><strong>Organismo:</strong> ' + (centro.organismo||'-') + ' &nbsp;|&nbsp; ' +
    '<strong>Tipo:</strong> ' + (centro.tipo_servicio||'-') + ' &nbsp;|&nbsp; ' +
    '<strong>Dirección:</strong> ' + (centro.direccion||'-') + '</p>' +
    '<h2>Resumen del mes</h2>' +
    '<div>' +
    '<div class="kpi"><div class="kpi-val">' + partesMes.total + '</div><div class="kpi-lab">Partes realizados</div></div>' +
    '<div class="kpi"><div class="kpi-val">' + partesMes.total_horas + 'h</div><div class="kpi-lab">Horas trabajadas</div></div>' +
    '<div class="kpi"><div class="kpi-val">' + (p.pct_margen||0) + '%</div><div class="kpi-lab">Margen</div></div>' +
    '</div>' +
    '<h2>Registro de servicios</h2>' + tablaPart +
    '<div class="footer">Informe generado automáticamente por Forgeser Gestión Integrada &nbsp;|&nbsp; Confidencial</div>' +
    '</body></html>';
}

function actualizarInformeURLPartes_(centroId, mes, url) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PARTES_V2);
  if (!hoja) return;
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    var fecha = datos[i][6] instanceof Date ? Utilities.formatDate(datos[i][6],'Europe/Madrid','yyyy-MM') : String(datos[i][6]||'').substring(0,7);
    if (datos[i][1] === centroId && fecha === mes) {
      hoja.getRange(i+1, 30).setValue(url);
    }
  }
}

// ════════════════════════════════════════
// ASISTENCIA OPERADOR (partes del día)
// ════════════════════════════════════════

function obtenerAsistenciaDiaAPI_(empleadoId, fecha) {
  inicializarHojasOperaciones_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var fechaHoy = fecha || Utilities.formatDate(new Date(),'Europe/Madrid','yyyy-MM-dd');

  // Partes del día del empleado
  var partesDia = obtenerPartesV2API_({ empleado_id: empleadoId, fecha: fechaHoy });

  // Estado actual (en_curso o no)
  var enCurso = partesDia.partes.find(function(p) { return p.estado === 'en_curso'; });

  return {
    fecha:       fechaHoy,
    partes:      partesDia.partes,
    total_partes:partesDia.total,
    total_horas: partesDia.total_horas,
    en_curso:    enCurso || null,
    puede_iniciar: !enCurso
  };
}

function obtenerTareasDelDiaAPI_(empleadoId) {
  // Obtener centros asignados al empleado y sus checklists
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hAsig = ss.getSheetByName(HOJA_ASIG_CENTROS);
  if (!hAsig || hAsig.getLastRow() <= 1) return { centros: [] };

  var datos   = hAsig.getDataRange().getValues();
  var centros = [];

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][2] !== empleadoId || datos[i][10] === 'finalizado') continue;
    var centroId = datos[i][1];
    var chk = obtenerChecklistCentroAPI_(centroId);
    var hCentros = ss.getSheetByName(HOJA_CENTROS);
    var nombreCentro = datos[i][1], horario = '', tipoServicio = '';
    if (hCentros) {
      var dC = hCentros.getDataRange().getValues();
      for (var j = 1; j < dC.length; j++) {
        if (dC[j][0] === centroId) {
          nombreCentro  = dC[j][1];
          horario       = dC[j][12];
          tipoServicio  = dC[j][10];
          break;
        }
      }
    }
    centros.push({
      centro_id:    centroId,
      nombre:       nombreCentro,
      horario:      horario,
      tipo_servicio:tipoServicio,
      horas_semanales: parseFloat(datos[i][6])||40,
      turno:        datos[i][7],
      checklist:    chk.items,
      total_tareas: chk.total
    });
  }
  return { centros: centros };
}

// ════════════════════════════════════════
// HELPERS INTERNOS
// ════════════════════════════════════════

function calcularCostePersonal_(parteId, empleadoId, horas) {
  if (!empleadoId || !horas || horas <= 0) return 0;
  try {
    var emp = obtenerEmpleadoAPI_(empleadoId);
    // El campo puede llamarse salario o salario_bruto_anual
    var salarioAnual = parseFloat(emp.salario_bruto_anual || emp.salario || 0);
    if (salarioAnual > 0) {
      var jornada = parseFloat(emp.jornada || 1760); // horas anuales
      var costeAnual = salarioAnual * 1.32; // +32% SS empresa
      var costeHora  = costeAnual / jornada;
      return Math.round(costeHora * horas * 100) / 100;
    }
  } catch(e) { Logger.log('calcularCostePersonal error: ' + e.message); }
  return 0;
}

function calcularCosteMateriales_(parteId) {
  var r = obtenerMaterialesParteAPI_(parteId);
  return r.coste_total || 0;
}

function calcularCosteMaquinaria_(parteId) {
  var r = obtenerMaquinariaParteAPI_(parteId);
  return r.coste_total || 0;
}

function descontarStock_(materialId, cantidad) {
  if (!materialId) return;
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_MATERIALES_CAT);
  if (!hoja) return;
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === materialId) {
      var actual = parseFloat(datos[i][5])||0;
      hoja.getRange(i+1, 6).setValue(Math.max(0, actual - cantidad));
      return;
    }
  }
}

function obtenerOportunidadDeCentro_(centroId) {
  if (!centroId) return '';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var h  = ss.getSheetByName(HOJA_CENTROS);
  if (!h) return '';
  var d = h.getDataRange().getValues();
  for (var i = 1; i < d.length; i++) {
    if (d[i][0] === centroId) return d[i][16]||'';
  }
  return '';
}

function eliminarParteV2_(id) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PARTES_V2);
  if (!hoja) return { ok: false };
  var datos = hoja.getDataRange().getValues();
  for (var i = datos.length-1; i >= 1; i--) {
    if (datos[i][0] === id) { hoja.deleteRow(i+1); return { ok: true }; }
  }
  return { ok: false, error: 'Parte no encontrado' };
}

// ============================================================================
// GENERACIÓN PDF PARTE DE TRABAJO
// ============================================================================

function generarPDFParte_(parteId, parteRow) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Datos del parte
  var centroId      = parteRow[1];
  var centroNombre  = parteRow[2] || 'Centro';
  var empleado      = parteRow[4] || '';
  var fecha         = parteRow[6] instanceof Date ? Utilities.formatDate(parteRow[6],'Europe/Madrid','dd/MM/yyyy') : String(parteRow[6]||'');
  var horaIni       = parteRow[7] instanceof Date ? Utilities.formatDate(parteRow[7],'Europe/Madrid','HH:mm') : String(parteRow[7]||'');
  var horaFin       = parteRow[8] instanceof Date ? Utilities.formatDate(parteRow[8],'Europe/Madrid','HH:mm') : String(parteRow[8]||'');
  var horas         = parseFloat(parteRow[9])||0;
  var tipoServicio  = parteRow[13] || '';
  var estado        = parteRow[14] || '';
  var chkTotal      = parseInt(parteRow[15])||0;
  var chkOK         = parseInt(parteRow[16])||0;
  var pctCheck      = parseInt(parteRow[17])||0;
  var costePers     = parseFloat(parteRow[19])||0;
  var costeMats     = parseFloat(parteRow[20])||0;
  var costeMaqui    = parseFloat(parteRow[21])||0;
  var costeTotal    = parseFloat(parteRow[22])||0;
  var fotosAntes    = parseInt(parteRow[23])||0;
  var fotosDespues  = parseInt(parteRow[24])||0;
  var firmaCliente  = parteRow[25] === 'si';
  var nombreFirm    = parteRow[26] || '';
  var firmaUrl      = parteRow[27] || '';
  var observaciones = parteRow[27+1] || '';  // col 29 = observaciones

  // Checklist
  var checklistHTML = '';
  var hChk = ss.getSheetByName(HOJA_CHECKLIST_EXEC);
  if (hChk) {
    var dChk = hChk.getDataRange().getValues();
    var items = [];
    for (var ci = 1; ci < dChk.length; ci++) {
      if (dChk[ci][1] === parteId) {
        items.push({
          tarea:      dChk[ci][3] || '',
          completada: dChk[ci][5] === true || dChk[ci][5] === 'TRUE',
          hora:       dChk[ci][6] || ''
        });
      }
    }
    if (items.length > 0) {
      checklistHTML = '<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px">' +
        '<tr style="background:#1a3c34;color:#fff"><th style="padding:6px;text-align:left">Tarea</th>' +
        '<th style="padding:6px;text-align:center;width:80px">Estado</th>' +
        '<th style="padding:6px;text-align:center;width:60px">Hora</th></tr>';
      items.forEach(function(it) {
        checklistHTML += '<tr style="border-bottom:1px solid #eee">' +
          '<td style="padding:5px">' + it.tarea + '</td>' +
          '<td style="text-align:center;color:' + (it.completada ? '#16a34a' : '#dc2626') + '">' +
          (it.completada ? '✓ Completada' : '✗ Pendiente') + '</td>' +
          '<td style="text-align:center;color:#64748b">' + (it.hora||'—') + '</td></tr>';
      });
      checklistHTML += '</table>';
    }
  }

  // Materiales
  var materialesHTML = '';
  var hMats = ss.getSheetByName(HOJA_MATERIALES_PART);
  if (hMats) {
    var dMats = hMats.getDataRange().getValues();
    var mats = [];
    for (var mi = 1; mi < dMats.length; mi++) {
      if (dMats[mi][1] === parteId) {
        mats.push({
          nombre:   dMats[mi][5]||'',
          unidad:   dMats[mi][6]||'',
          cantidad: parseFloat(dMats[mi][7])||0,
          coste:    parseFloat(dMats[mi][9])||0
        });
      }
    }
    if (mats.length > 0) {
      materialesHTML = '<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px">' +
        '<tr style="background:#1a3c34;color:#fff"><th style="padding:6px;text-align:left">Material</th>' +
        '<th style="padding:6px;text-align:center">Cantidad</th>' +
        '<th style="padding:6px;text-align:right">Coste</th></tr>';
      mats.forEach(function(m) {
        materialesHTML += '<tr style="border-bottom:1px solid #eee">' +
          '<td style="padding:5px">' + m.nombre + '</td>' +
          '<td style="text-align:center">' + m.cantidad + ' ' + m.unidad + '</td>' +
          '<td style="text-align:right">' + m.coste.toFixed(2) + ' €</td></tr>';
      });
      materialesHTML += '</table>';
    }
  }

  // Fotos
  var fotosInfo = '';
  if (fotosAntes > 0 || fotosDespues > 0) {
    fotosInfo = '<p style="color:#475569;font-size:11px">📷 ' + fotosAntes + ' foto(s) antes del servicio · ' + fotosDespues + ' foto(s) después del servicio</p>';
  }

  // Firma
  var firmaInfo = '';
  if (firmaCliente) {
    firmaInfo = '<div style="margin-top:15px;padding:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px">' +
      '<p style="margin:0;font-size:12px;color:#15803d;font-weight:bold">✓ Servicio firmado por el cliente</p>' +
      (nombreFirm ? '<p style="margin:3px 0 0;font-size:11px;color:#166534">' + nombreFirm + '</p>' : '') + '</div>';
  }

  var html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">' +
    '<style>body{font-family:Arial,sans-serif;color:#1e293b;margin:0;padding:24px;font-size:12px}' +
    'h1{color:#1a3c34;font-size:18px;margin-bottom:4px}' +
    'h2{color:#2d5a4e;font-size:13px;border-bottom:2px solid #1a3c34;padding-bottom:4px;margin-top:20px}' +
    '.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}' +
    '.campo{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px}' +
    '.campo-lab{font-size:9px;color:#94a3b8;text-transform:uppercase;font-weight:bold}' +
    '.campo-val{font-size:13px;font-weight:bold;color:#1e293b;margin-top:2px}' +
    '.kpi-row{display:flex;gap:10px;margin-bottom:16px}' +
    '.kpi{flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px;text-align:center}' +
    '.kpi-val{font-size:20px;font-weight:900;color:#1a3c34}' +
    '.kpi-lab{font-size:10px;color:#64748b;text-transform:uppercase}' +
    '.footer{color:#94a3b8;font-size:10px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:10px;text-align:center}' +
    '@page{margin:15mm}@media print{body{padding:0}}</style></head><body>' +

    '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:16px">' +
    '<div><h1>Parte de Trabajo</h1><p style="color:#64748b;margin:2px 0">Nº ' + parteId + '</p></div>' +
    '<div style="text-align:right"><p style="font-weight:bold;margin:0;color:#1a3c34">Forgeser Servicios del Sur SL</p>' +
    '<p style="color:#64748b;margin:2px 0;font-size:11px">Almonte, Huelva</p></div></div>' +

    '<h2>Datos del Servicio</h2>' +
    '<div class="grid">' +
    '<div class="campo"><div class="campo-lab">Centro</div><div class="campo-val">' + centroNombre + '</div></div>' +
    '<div class="campo"><div class="campo-lab">Trabajador</div><div class="campo-val">' + empleado + '</div></div>' +
    '<div class="campo"><div class="campo-lab">Fecha</div><div class="campo-val">' + fecha + '</div></div>' +
    '<div class="campo"><div class="campo-lab">Tipo de servicio</div><div class="campo-val">' + tipoServicio + '</div></div>' +
    '<div class="campo"><div class="campo-lab">Entrada</div><div class="campo-val">' + horaIni + '</div></div>' +
    '<div class="campo"><div class="campo-lab">Salida</div><div class="campo-val">' + horaFin + '</div></div>' +
    '</div>' +

    '<div class="kpi-row">' +
    '<div class="kpi"><div class="kpi-val">' + horas + 'h</div><div class="kpi-lab">Horas trabajadas</div></div>' +
    '<div class="kpi"><div class="kpi-val">' + pctCheck + '%</div><div class="kpi-lab">Checklist (' + chkOK + '/' + chkTotal + ')</div></div>' +
    '<div class="kpi"><div class="kpi-val">' + (fotosAntes+fotosDespues) + '</div><div class="kpi-lab">Fotografías</div></div>' +
    '</div>' +

    (checklistHTML ? '<h2>Checklist de Tareas</h2>' + checklistHTML : '') +
    (materialesHTML ? '<h2>Materiales Utilizados</h2>' + materialesHTML : '') +
    fotosInfo +
    (observaciones ? '<h2>Observaciones</h2><p style="padding:10px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px">' + observaciones + '</p>' : '') +
    firmaInfo +

    '<div class="footer">Documento generado automáticamente · ' +
    Utilities.formatDate(new Date(),'Europe/Madrid','dd/MM/yyyy HH:mm') + ' · Forgeser Servicios del Sur SL</div>' +
    '</body></html>';

  // Convertir a PDF via Drive
  var carpeta    = DriveApp.getFolderById(CARPETA_RAIZ_ID);
  var carpInf    = obtenerOCrearCarpeta_('PARTES_PDF', carpeta);
  var tempBlob   = Utilities.newBlob(html, 'text/html', 'temp_' + parteId + '.html');
  var tempFile   = carpInf.createFile(tempBlob);
  var pdfBlob    = tempFile.getAs('application/pdf');
  pdfBlob.setName('Parte_' + parteId + '.pdf');
  var pdfFile    = carpInf.createFile(pdfBlob);
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  tempFile.setTrashed(true); // borrar HTML temporal

  return 'https://drive.google.com/uc?export=view&id=' + pdfFile.getId();
}