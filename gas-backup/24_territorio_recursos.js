// ============================================================================
// 24_territorio_recursos.gs — Inventario por centro, Maquinaria, Vehículos
// ============================================================================

var HOJA_STOCK_CENTRO  = 'STOCK_POR_CENTRO';
var HOJA_MOV_STOCK     = 'MOVIMIENTOS_STOCK';
var HOJA_PEDIDOS       = 'PEDIDOS_PROVEEDOR';
var HOJA_MANT_PREV     = 'MANTENIMIENTOS_PREV';
var HOJA_VEHICULOS     = 'VEHICULOS';
var HOJA_COMBUSTIBLE   = 'COMBUSTIBLE';

// ════════════════════════════════════════
// INVENTARIO POR CENTRO (T-26)
// ════════════════════════════════════════

function inicializarHojasRecursos_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (!ss.getSheetByName(HOJA_STOCK_CENTRO)) {
    var h = ss.insertSheet(HOJA_STOCK_CENTRO);
    h.getRange(1,1,1,10).setValues([[
      'ID','Centro_ID','Material_ID','Nombre_Material',
      'Stock_Actual','Stock_Minimo','Stock_Maximo',
      'Unidad','Ultima_Actualizacion','Responsable'
    ]]).setBackground('#78350f').setFontColor('#fff').setFontWeight('bold');
    h.setFrozenRows(1);
  }

  if (!ss.getSheetByName(HOJA_MOV_STOCK)) {
    var hm = ss.insertSheet(HOJA_MOV_STOCK);
    hm.getRange(1,1,1,9).setValues([[
      'ID','Centro_ID','Material_ID','Nombre','Tipo',
      'Cantidad','Stock_Resultante','Parte_ID','Fecha'
    ]]).setBackground('#92400e').setFontColor('#fff').setFontWeight('bold');
    hm.setFrozenRows(1);
  }

  if (!ss.getSheetByName(HOJA_PEDIDOS)) {
    var hp = ss.insertSheet(HOJA_PEDIDOS);
    hp.getRange(1,1,1,11).setValues([[
      'ID','Centro_ID','Material_ID','Nombre_Material',
      'Cantidad_Pedida','Proveedor','Estado',
      'Fecha_Pedido','Fecha_Entrega','Coste_Estimado','Notas'
    ]]).setBackground('#1e3a5f').setFontColor('#fff').setFontWeight('bold');
    hp.setFrozenRows(1);
  }

  if (!ss.getSheetByName(HOJA_MANT_PREV)) {
    var hmant = ss.insertSheet(HOJA_MANT_PREV);
    hmant.getRange(1,1,1,12).setValues([[
      'ID','Maquinaria_ID','Nombre_Maquinaria','Tipo_Mantenimiento',
      'Frecuencia_Dias','Ultima_Revision','Proxima_Revision',
      'Coste_Estimado','Estado','Tecnico','Observaciones','Creado'
    ]]).setBackground('#1e40af').setFontColor('#fff').setFontWeight('bold');
    hmant.setFrozenRows(1);
  }

  if (!ss.getSheetByName(HOJA_VEHICULOS)) {
    var hv = ss.insertSheet(HOJA_VEHICULOS);
    hv.getRange(1,1,1,18).setValues([[
      'ID','Matricula','Marca','Modelo','Tipo','Año',
      'Color','Combustible','Km_Actuales',
      'Fecha_ITV','Fecha_Seguro','Fecha_Revision',
      'Empleado_Asignado','Nombre_Empleado',
      'Estado','Notas','Creado','Modificado'
    ]]).setBackground('#1a3c34').setFontColor('#fff').setFontWeight('bold');
    hv.setFrozenRows(1);
  }

  if (!ss.getSheetByName(HOJA_COMBUSTIBLE)) {
    var hc = ss.insertSheet(HOJA_COMBUSTIBLE);
    hc.getRange(1,1,1,9).setValues([[
      'ID','Vehiculo_ID','Matricula','Fecha',
      'Litros','Precio_Litro','Importe_Total','Km_En_Repostaje','Creado'
    ]]).setBackground('#374151').setFontColor('#fff').setFontWeight('bold');
    hc.setFrozenRows(1);
  }
}

// ── Stock por centro ─────────────────────────────────────────────────────────
function obtenerStockCentroAPI_(centroId) {
  inicializarHojasRecursos_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_STOCK_CENTRO);
  if (!hoja || hoja.getLastRow() <= 1) return { stock: [], alertas: [] };

  var datos  = hoja.getDataRange().getValues();
  var stock  = [];
  var alertas = [];

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] !== centroId) continue;
    var item = {
      id:           datos[i][0],
      material_id:  datos[i][2],
      nombre:       datos[i][3],
      stock_actual: parseFloat(datos[i][4])||0,
      stock_minimo: parseFloat(datos[i][5])||0,
      stock_maximo: parseFloat(datos[i][6])||100,
      unidad:       datos[i][7],
      actualizado:  datos[i][8] instanceof Date ? Utilities.formatDate(datos[i][8],'Europe/Madrid','dd/MM/yyyy') : String(datos[i][8]||''),
      alerta:       (parseFloat(datos[i][4])||0) <= (parseFloat(datos[i][5])||0)
    };
    stock.push(item);
    if (item.alerta) alertas.push({ material: item.nombre, stock: item.stock_actual, minimo: item.stock_minimo });
  }
  return { stock: stock, total: stock.length, alertas: alertas };
}

function ajustarStockCentroAPI_(data) {
  inicializarHojasRecursos_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_STOCK_CENTRO);
  var datos = hoja.getDataRange().getValues();

  // Buscar si ya existe stock de este material en este centro
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] === data.centro_id && datos[i][2] === data.material_id) {
      var actual    = parseFloat(datos[i][4])||0;
      var nuevo     = data.tipo === 'entrada' ? actual + (parseFloat(data.cantidad)||0)
                                              : Math.max(0, actual - (parseFloat(data.cantidad)||0));
      hoja.getRange(i+1, 5).setValue(nuevo);
      hoja.getRange(i+1, 9).setValue(new Date());
      registrarMovimientoStock_(data.centro_id, data.material_id, datos[i][3], data.tipo, parseFloat(data.cantidad)||0, nuevo, data.parte_id||'');
      return { ok: true, stock_anterior: actual, stock_nuevo: nuevo };
    }
  }

  // Crear nuevo registro de stock
  var id = 'STK-' + Date.now();
  var cat = obtenerMaterialDelCatalogo_(data.material_id);
  hoja.appendRow([
    id, data.centro_id, data.material_id,
    data.nombre || (cat ? cat.nombre : ''),
    parseFloat(data.cantidad)||0,
    parseFloat(data.stock_minimo)||5,
    parseFloat(data.stock_maximo)||100,
    cat ? cat.unidad : 'unidad',
    new Date(), ''
  ]);
  return { ok: true, stock_nuevo: parseFloat(data.cantidad)||0 };
}

function obtenerMaterialDelCatalogo_(id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var h  = ss.getSheetByName(HOJA_MATERIALES_CAT);
  if (!h) return null;
  var d = h.getDataRange().getValues();
  for (var i = 1; i < d.length; i++) { if (d[i][0] === id) return { nombre: d[i][1], unidad: d[i][3] }; }
  return null;
}

function registrarMovimientoStock_(centroId, matId, nombre, tipo, cantidad, resultante, parteId) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_MOV_STOCK);
  if (!hoja) return;
  hoja.appendRow(['MOV-'+Date.now(), centroId, matId, nombre, tipo, cantidad, resultante, parteId, new Date()]);
}

function crearPedidoProveedorAPI_(data) {
  inicializarHojasRecursos_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PEDIDOS);
  var id   = 'PED-' + Utilities.formatDate(new Date(),'Europe/Madrid','yyyyMMddHHmmss');
  hoja.appendRow([
    id, data.centro_id||'', data.material_id||'', data.nombre_material||'',
    parseFloat(data.cantidad)||0, data.proveedor||'',
    'pendiente',
    Utilities.formatDate(new Date(),'Europe/Madrid','yyyy-MM-dd'),
    data.fecha_entrega||'',
    parseFloat(data.coste_estimado)||0,
    data.notas||''
  ]);
  return { ok: true, id: id };
}

function obtenerPedidosAPI_(centroId) {
  inicializarHojasRecursos_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PEDIDOS);
  if (!hoja || hoja.getLastRow() <= 1) return { pedidos: [] };
  var datos   = hoja.getDataRange().getValues();
  var pedidos = [];
  for (var i = datos.length-1; i >= 1; i--) {
    if (centroId && datos[i][1] !== centroId) continue;
    pedidos.push({
      id: datos[i][0], centro_id: datos[i][1],
      nombre_material: datos[i][3], cantidad: datos[i][4],
      proveedor: datos[i][5], estado: datos[i][6],
      fecha_pedido: datos[i][7], fecha_entrega: datos[i][8],
      coste_estimado: datos[i][9]
    });
    if (pedidos.length >= 50) break;
  }
  return { pedidos: pedidos };
}

function actualizarEstadoPedido_(id, estado) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PEDIDOS);
  if (!hoja) return { ok: false };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] !== id) continue;
    hoja.getRange(i+1, 7).setValue(estado);

    // Si el pedido se marca como ENTREGADO → actualizar stock del centro
    if (estado === 'entregado') {
      var centroId    = datos[i][1];
      var materialId  = datos[i][2];
      var nombre      = datos[i][3];
      var cantidad    = parseFloat(datos[i][4]) || 0;

      if (centroId && materialId && cantidad > 0) {
        try {
          ajustarStockCentroAPI_({
            centro_id:   centroId,
            material_id: materialId,
            nombre:      nombre,
            tipo:        'entrada',
            cantidad:    cantidad,
            parte_id:    'PEDIDO-' + id
          });
          Logger.log('Stock actualizado por pedido entregado: ' + nombre + ' × ' + cantidad + ' → centro ' + centroId);
        } catch(e) {
          Logger.log('Error actualizando stock por pedido: ' + e.message);
        }
      }

      // Guardar fecha real de entrega
      hoja.getRange(i+1, 8).setValue(Utilities.formatDate(new Date(),'Europe/Madrid','yyyy-MM-dd'));
    }

    return { ok: true };
  }
  return { ok: false };
}

// ════════════════════════════════════════
// MAQUINARIA — MANTENIMIENTOS (T-27)
// ════════════════════════════════════════

function crearMantenimientoAPI_(data) {
  inicializarHojasRecursos_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_MANT_PREV);
  var id   = 'MANT-' + Utilities.formatDate(new Date(),'Europe/Madrid','yyyyMMddHHmmss');

  // Calcular próxima revisión
  var proxima = '';
  if (data.ultima_revision && data.frecuencia_dias) {
    var f = new Date(data.ultima_revision);
    f.setDate(f.getDate() + parseInt(data.frecuencia_dias));
    proxima = Utilities.formatDate(f,'Europe/Madrid','yyyy-MM-dd');
  }

  hoja.appendRow([
    id, data.maquinaria_id||'', data.nombre_maquinaria||'',
    data.tipo_mantenimiento||'revision',
    parseInt(data.frecuencia_dias)||90,
    data.ultima_revision||'', proxima,
    parseFloat(data.coste_estimado)||0,
    'pendiente', data.tecnico||'', data.observaciones||'', new Date()
  ]);
  return { ok: true, id: id, proxima_revision: proxima };
}

function obtenerMantenimientosAPI_(maquinariaId) {
  inicializarHojasRecursos_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_MANT_PREV);
  if (!hoja || hoja.getLastRow() <= 1) return { mantenimientos: [], vencidos: 0, proximos: 0 };

  var datos  = hoja.getDataRange().getValues();
  var items  = [];
  var hoy    = new Date(); hoy.setHours(0,0,0,0);
  var en30   = new Date(); en30.setDate(en30.getDate()+30);

  for (var i = 1; i < datos.length; i++) {
    if (maquinariaId && datos[i][1] !== maquinariaId) continue;
    var proxDate = datos[i][6] ? new Date(datos[i][6]) : null;
    var vencido  = proxDate && proxDate < hoy;
    var proximo  = proxDate && proxDate >= hoy && proxDate <= en30;
    items.push({
      id:                datos[i][0],
      maquinaria_id:     datos[i][1],
      nombre_maquinaria: datos[i][2],
      tipo:              datos[i][3],
      frecuencia_dias:   parseInt(datos[i][4])||90,
      ultima_revision:   datos[i][5],
      proxima_revision:  datos[i][6],
      coste_estimado:    parseFloat(datos[i][7])||0,
      estado:            vencido ? 'vencido' : proximo ? 'proximo' : datos[i][8],
      tecnico:           datos[i][9],
      vencido:           vencido,
      proximo:           proximo
    });
  }
  return {
    mantenimientos: items,
    vencidos: items.filter(function(m){return m.vencido;}).length,
    proximos: items.filter(function(m){return m.proximo;}).length
  };
}

function registrarMantenimientoRealizado_(id, data) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_MANT_PREV);
  if (!hoja) return { ok: false };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] !== id) continue;
    var hoy = Utilities.formatDate(new Date(),'Europe/Madrid','yyyy-MM-dd');
    var freq = parseInt(datos[i][4])||90;
    var prox = new Date(); prox.setDate(prox.getDate()+freq);
    var proxStr = Utilities.formatDate(prox,'Europe/Madrid','yyyy-MM-dd');
    hoja.getRange(i+1, 6).setValue(hoy);
    hoja.getRange(i+1, 7).setValue(proxStr);
    hoja.getRange(i+1, 9).setValue('completado');
    if (data.coste_real) hoja.getRange(i+1, 8).setValue(parseFloat(data.coste_real));
    if (data.observaciones) hoja.getRange(i+1, 11).setValue(data.observaciones);
    return { ok: true, proxima_revision: proxStr };
  }
  return { ok: false };
}

// ════════════════════════════════════════
// VEHÍCULOS (T-28)
// ════════════════════════════════════════

function crearVehiculoAPI_(data) {
  inicializarHojasRecursos_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_VEHICULOS);
  var id   = 'VEH-' + Utilities.formatDate(new Date(),'Europe/Madrid','yyyyMMddHHmmss');
  hoja.appendRow([
    id, data.matricula||'', data.marca||'', data.modelo||'',
    data.tipo||'furgoneta', parseInt(data.anio)||2020,
    data.color||'', data.combustible||'diesel',
    parseFloat(data.km_actuales)||0,
    data.fecha_itv||'', data.fecha_seguro||'', data.fecha_revision||'',
    data.empleado_asignado||'', data.nombre_empleado||'',
    'activo', data.notas||'', new Date(), new Date()
  ]);
  return { ok: true, id: id };
}

function obtenerVehiculosAPI_() {
  inicializarHojasRecursos_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_VEHICULOS);
  if (!hoja || hoja.getLastRow() <= 1) return { vehiculos: [], alertas: [] };

  var datos     = hoja.getDataRange().getValues();
  var vehiculos = [];
  var alertas   = [];
  var hoy       = new Date(); hoy.setHours(0,0,0,0);
  var en30      = new Date(); en30.setDate(en30.getDate()+30);

  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    var veh = {
      id:               datos[i][0],
      matricula:        datos[i][1],
      marca:            datos[i][2],
      modelo:           datos[i][3],
      tipo:             datos[i][4],
      anio:             datos[i][5],
      color:            datos[i][6],
      combustible:      datos[i][7],
      km:               parseFloat(datos[i][8])||0,
      fecha_itv:        datos[i][9],
      fecha_seguro:     datos[i][10],
      fecha_revision:   datos[i][11],
      empleado_asignado:datos[i][12],
      nombre_empleado:  datos[i][13],
      estado:           datos[i][14],
      alerta_itv:       false, alerta_seguro: false
    };

    // Alertas ITV y seguro
    var checkFecha = function(fecha, label, id, matricula) {
      if (!fecha) return;
      var f = new Date(fecha);
      if (f < hoy) {
        alertas.push({ tipo: label + '_vencido', nivel:'alta', msg: matricula + ': ' + label + ' VENCIDA', id: id });
        return 'vencido';
      } else if (f <= en30) {
        alertas.push({ tipo: label + '_proximo', nivel:'media', msg: matricula + ': ' + label + ' vence en menos de 30 días', id: id });
        return 'proximo';
      }
      return 'ok';
    };
    veh.alerta_itv    = checkFecha(veh.fecha_itv, 'ITV', veh.id, veh.matricula);
    veh.alerta_seguro = checkFecha(veh.fecha_seguro, 'Seguro', veh.id, veh.matricula);

    vehiculos.push(veh);
  }
  return { vehiculos: vehiculos, total: vehiculos.length, alertas: alertas };
}

function actualizarVehiculoAPI_(data) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_VEHICULOS);
  if (!hoja) return { ok: false };
  var datos = hoja.getDataRange().getValues();
  var campos = [
    {k:'matricula',c:2},{k:'marca',c:3},{k:'modelo',c:4},{k:'tipo',c:5},
    {k:'km_actuales',c:9},{k:'fecha_itv',c:10},{k:'fecha_seguro',c:11},
    {k:'fecha_revision',c:12},{k:'empleado_asignado',c:13},
    {k:'nombre_empleado',c:14},{k:'estado',c:15},{k:'notas',c:16}
  ];
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] !== data.id) continue;
    campos.forEach(function(c) {
      if (data[c.k] !== undefined) hoja.getRange(i+1,c.c).setValue(data[c.k]);
    });
    hoja.getRange(i+1,18).setValue(new Date());
    return { ok: true };
  }
  return { ok: false };
}

function registrarRepostaje_(data) {
  inicializarHojasRecursos_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_COMBUSTIBLE);
  var id   = 'COMB-' + Date.now();
  var litros = parseFloat(data.litros)||0;
  var precio = parseFloat(data.precio_litro)||0;
  var importe = Math.round(litros*precio*100)/100;
  hoja.appendRow([
    id, data.vehiculo_id||'', data.matricula||'',
    data.fecha||Utilities.formatDate(new Date(),'Europe/Madrid','yyyy-MM-dd'),
    litros, precio, importe,
    parseFloat(data.km)||0, new Date()
  ]);
  // Actualizar km del vehículo
  if (data.vehiculo_id && data.km) actualizarVehiculoAPI_({ id: data.vehiculo_id, km_actuales: parseFloat(data.km) });
  return { ok: true, id: id, importe: importe };
}

function obtenerCombustibleVehiculo_(vehiculoId) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_COMBUSTIBLE);
  if (!hoja || hoja.getLastRow() <= 1) return { repostajes: [], total_importe: 0 };
  var datos = hoja.getDataRange().getValues();
  var items = [];
  for (var i = datos.length-1; i >= 1; i--) {
    if (datos[i][1] !== vehiculoId) continue;
    items.push({
      id: datos[i][0], fecha: datos[i][3],
      litros: datos[i][4], precio: datos[i][5],
      importe: datos[i][6], km: datos[i][7]
    });
    if (items.length >= 20) break;
  }
  var total = items.reduce(function(s,r){return s+r.importe;},0);
  return { repostajes: items, total_importe: Math.round(total*100)/100 };
}

// ════════════════════════════════════════
// ALERTAS STOCK MÍNIMO
// Comprueba si algún material está por debajo del mínimo y lo devuelve
// ════════════════════════════════════════

function obtenerAlertasStockAPI_(centroId) {
  inicializarHojasRecursos_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_STOCK_CENTRO);
  if (!hoja || hoja.getLastRow() <= 1) return { alertas: [] };

  var datos  = hoja.getDataRange().getValues();
  var alertas = [];

  for (var i = 1; i < datos.length; i++) {
    if (centroId && datos[i][1] !== centroId) continue;
    var actual  = parseFloat(datos[i][4]) || 0;
    var minimo  = parseFloat(datos[i][5]) || 0;
    if (actual <= minimo && minimo > 0) {
      alertas.push({
        centro_id:    datos[i][1],
        material_id:  datos[i][2],
        nombre:       datos[i][3],
        stock_actual: actual,
        stock_minimo: minimo,
        unidad:       datos[i][7],
        urgente:      actual === 0
      });
    }
  }

  return {
    alertas: alertas,
    total: alertas.length,
    urgentes: alertas.filter(function(a) { return a.urgente; }).length
  };
}