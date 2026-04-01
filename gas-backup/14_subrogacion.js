// ============================================================================
// 14_subrogacion.gs - SUBROGACIÓN DE PERSONAL v2.0
// Art. 44 ET — Proceso completo: pliego → contacto → datos → verificación → incorporación
// ============================================================================

var HOJA_SUBROGACIONES      = 'SUBROGACIONES';
var HOJA_PERSONAL_SUBROGADO = 'PERSONAL_SUBROGADO';

// Estados del trabajador subrogado en el proceso
// pendiente_datos → contactado → datos_recibidos → docs_verificados → incorporado
var ESTADOS_TRABAJADOR = ['pendiente_datos', 'contactado', 'datos_recibidos', 'docs_verificados', 'incorporado', 'rechazado'];

function crearHojasSubrogacion_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(HOJA_SUBROGACIONES)) {
    var h = ss.insertSheet(HOJA_SUBROGACIONES);
    h.getRange(1,1,1,15).setValues([['ID','ID Oportunidad','Título Licitación','Organismo','Empresa Saliente','Convenio Aplicable','Nº Personal','Coste Anual Estimado','Fecha Subrogación','Estado','Responsable','Fecha Creación','Notas','Docs Completos','Fecha Inicio Contrato']]);
    h.getRange(1,1,1,15).setBackground('#e65100').setFontColor('#ffffff').setFontWeight('bold');
    h.setFrozenRows(1);
  }
  if (!ss.getSheetByName(HOJA_PERSONAL_SUBROGADO)) {
    var h2 = ss.insertSheet(HOJA_PERSONAL_SUBROGADO);
    // Columnas ampliadas para datos personales completos
    h2.getRange(1,1,1,35).setValues([[
      'ID','ID Subrogación',
      // Datos básicos del pliego
      'Nombre','Apellidos','DNI/NIE','Categoría','Grupo','Convenio','Antigüedad','Fecha Alta Original','Tipo Contrato','Jornada','Salario Bruto','Complementos','Centro','Turno',
      // Estado del proceso
      'Estado Proceso','Docs Verificados','Incidencias','Notas','Aceptado','Fecha Incorporación',
      // Datos personales (se rellenan post-adjudicación)
      'Fecha Nacimiento','Dirección','Teléfono','Email','Nº SS','Cuenta Bancaria',
      'Contacto Emergencia','Tel Emergencia',
      // Trazabilidad
      'Fecha Contacto','Fecha Datos Recibidos','ID Empleado RRHH','Empresa Anterior Real','Fecha Verificacion'
    ]]);
    h2.getRange(1,1,1,35).setBackground('#bf360c').setFontColor('#ffffff').setFontWeight('bold');
    h2.setFrozenRows(1);
  }
}

// ════════════════════════════════════════
// CRUD SUBROGACIONES
// ════════════════════════════════════════

function obtenerSubrogacionesAPI_(filtro) {
  crearHojasSubrogacion_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_SUBROGACIONES);
  if (!hoja || hoja.getLastRow() <= 1) return { subrogaciones: [], total: 0 };
  var datos = hoja.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    var s = {
      id: datos[i][0], id_oportunidad: datos[i][1], titulo: datos[i][2],
      organismo: datos[i][3], empresa_saliente: datos[i][4], convenio: datos[i][5],
      num_personal: datos[i][6], coste_anual: datos[i][7],
      fecha_subrogacion: datos[i][8], estado: datos[i][9],
      responsable: datos[i][10], fecha_creacion: datos[i][11],
      notas: datos[i][12], docs_completos: datos[i][13],
      fecha_inicio_contrato: datos[i][14] || ''
    };
    if (filtro && filtro.oportunidad && s.id_oportunidad !== filtro.oportunidad) continue;
    items.push(s);
  }
  items.sort(function(a,b) { return new Date(b.fecha_creacion) - new Date(a.fecha_creacion); });
  return { subrogaciones: items, total: items.length };
}

function crearSubrogacion_(data) {
  crearHojasSubrogacion_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_SUBROGACIONES);
  var id   = 'SUB-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).substring(2,5).toUpperCase();
  hoja.appendRow([
    id, data.id_oportunidad||'', data.titulo||'', data.organismo||'',
    data.empresa_saliente||'', data.convenio||'', 0, 0,
    data.fecha_subrogacion||'', 'pendiente', data.responsable||'',
    new Date(), data.notas||'', 'No', data.fecha_inicio_contrato||''
  ]);

  // Crear carpeta Drive para esta subrogación
  try {
    var carpetaRaiz = DriveApp.getFolderById(CARPETA_RAIZ_ID);
    var carpetaRRHH = obtenerOCrearCarpeta_('RRHH', carpetaRaiz);
    var carpetaSubs = obtenerOCrearCarpeta_('Subrogaciones', carpetaRRHH);
    var carpetaSub  = obtenerOCrearCarpeta_(id + ' — ' + (data.titulo||'').substring(0,50), carpetaSubs);
    obtenerOCrearCarpeta_('Listados_Empresa_Saliente', carpetaSub);
    obtenerOCrearCarpeta_('Cartas_Subrogacion', carpetaSub);
    obtenerOCrearCarpeta_('Documentacion_Trabajadores', carpetaSub);
    obtenerOCrearCarpeta_('Comunicaciones', carpetaSub);
  } catch(e) { Logger.log('Error carpeta subrogación: ' + e.message); }

  return { ok: true, id: id };
}

// ════════════════════════════════════════
// PERSONAL SUBROGADO — CRUD
// ════════════════════════════════════════

function obtenerPersonalSubrogadoAPI_(id_subrogacion) {
  crearHojasSubrogacion_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PERSONAL_SUBROGADO);
  if (!hoja || hoja.getLastRow() <= 1) return { personal: [], total: 0, coste_total: 0, coste_ss: 0 };
  var datos    = hoja.getDataRange().getValues();
  var personal = [];
  var costeBruto = 0;

  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    if (id_subrogacion && datos[i][1] !== id_subrogacion) continue;
    var p = {
      id: datos[i][0], id_subrogacion: datos[i][1],
      // Datos del pliego
      nombre: datos[i][2], apellidos: datos[i][3], dni: datos[i][4],
      categoria: datos[i][5], grupo: datos[i][6], convenio: datos[i][7],
      antiguedad: datos[i][8], fecha_alta_original: datos[i][9],
      tipo_contrato: datos[i][10], jornada: datos[i][11],
      salario: datos[i][12], complementos: datos[i][13],
      centro: datos[i][14], turno: datos[i][15],
      // Estado proceso
      estado: datos[i][16] || 'pendiente_datos',
      docs_verificados: datos[i][17], incidencias: datos[i][18],
      notas: datos[i][19], aceptado: datos[i][20],
      fecha_incorporacion: datos[i][21],
      // Datos personales recopilados
      fecha_nacimiento: datos[i][22] || '',
      direccion: datos[i][23] || '',
      telefono: datos[i][24] || '',
      email: datos[i][25] || '',
      nss: datos[i][26] || '',
      cuenta_bancaria: datos[i][27] || '',
      contacto_emergencia: datos[i][28] || '',
      tel_emergencia: datos[i][29] || '',
      // Trazabilidad
      fecha_contacto: datos[i][30] || '',
      fecha_datos_recibidos: datos[i][31] || '',
      id_empleado_rrhh: datos[i][32] || '',
      empresa_anterior_real: datos[i][33] || '',
      fecha_verificacion: datos[i][34] || ''
    };
    costeBruto += parseFloat(p.salario) || 0;
    personal.push(p);
  }

  var costeSS = costeBruto * 0.3308;
  var stats   = calcularStatsPersonal_(personal);
  return { personal: personal, total: personal.length, coste_total: costeBruto, coste_ss: costeSS, stats: stats };
}

function calcularStatsPersonal_(personal) {
  var porEstado = {};
  ESTADOS_TRABAJADOR.forEach(function(e) { porEstado[e] = 0; });
  personal.forEach(function(p) { porEstado[p.estado] = (porEstado[p.estado] || 0) + 1; });
  var sinDatos        = personal.filter(function(p) { return !p.telefono && !p.email && !p.dni; }).length;
  var conDatosCompletos = personal.filter(function(p) { return p.dni && p.nss && p.telefono; }).length;
  var incorporados    = personal.filter(function(p) { return p.estado === 'incorporado'; }).length;
  return {
    por_estado: porEstado,
    sin_datos_personales: sinDatos,
    con_datos_completos: conDatosCompletos,
    incorporados: incorporados,
    pendientes_incorporar: personal.filter(function(p) { return p.estado === 'docs_verificados'; }).length,
    pct_completitud: personal.length > 0 ? Math.round(conDatosCompletos / personal.length * 100) : 0
  };
}

function addPersonalSubrogado_(data) {
  crearHojasSubrogacion_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PERSONAL_SUBROGADO);
  var id   = 'PSUB-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).substring(2,6).toUpperCase();

  hoja.appendRow([
    id, data.id_subrogacion,
    data.nombre||'', data.apellidos||'', data.dni||'',
    data.categoria||'', data.grupo||'', data.convenio||'',
    data.antiguedad||'', data.fecha_alta||'',
    data.tipo_contrato||'Indefinido', data.jornada||38,
    parseFloat(data.salario)||0, data.complementos||'',
    data.centro||'', data.turno||'Mañana',
    'pendiente_datos', '', '', data.notas||'', 'Pendiente', '',
    // Datos personales vacíos — se rellenan después
    '','','','','','','','',
    '', '', '', '', ''
  ]);

  actualizarTotalesSubrogacion_(data.id_subrogacion);
  return { ok: true, id: id };
}

// ─── ACTUALIZAR DATOS PERSONALES (post-adjudicación) ─────────────────────────
function actualizarDatosPersonalesSubrogado_(data) {
  if (!data.id) return { ok: false, error: 'ID requerido' };
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PERSONAL_SUBROGADO);
  if (!hoja) return { ok: false, error: 'Sin hoja' };

  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] !== data.id) continue;
    var fila = i + 1;

    // Datos básicos del pliego (por si se completan)
    if (data.nombre)     hoja.getRange(fila, 3).setValue(data.nombre);
    if (data.apellidos)  hoja.getRange(fila, 4).setValue(data.apellidos);
    if (data.dni)        hoja.getRange(fila, 5).setValue(data.dni);
    if (data.categoria)  hoja.getRange(fila, 6).setValue(data.categoria);
    if (data.antiguedad) hoja.getRange(fila, 9).setValue(data.antiguedad);
    if (data.salario)    hoja.getRange(fila, 13).setValue(parseFloat(data.salario)||0);
    if (data.centro)     hoja.getRange(fila, 15).setValue(data.centro);

    // Datos personales recopilados
    if (data.fecha_nacimiento)    hoja.getRange(fila, 23).setValue(data.fecha_nacimiento);
    if (data.direccion)           hoja.getRange(fila, 24).setValue(data.direccion);
    if (data.telefono)            hoja.getRange(fila, 25).setValue(data.telefono);
    if (data.email)               hoja.getRange(fila, 26).setValue(data.email);
    if (data.nss)                 hoja.getRange(fila, 27).setValue(data.nss);
    if (data.cuenta_bancaria)     hoja.getRange(fila, 28).setValue(data.cuenta_bancaria);
    if (data.contacto_emergencia) hoja.getRange(fila, 29).setValue(data.contacto_emergencia);
    if (data.tel_emergencia)      hoja.getRange(fila, 30).setValue(data.tel_emergencia);
    if (data.empresa_anterior_real) hoja.getRange(fila, 34).setValue(data.empresa_anterior_real);

    // Trazabilidad
    if (data.fecha_contacto)        hoja.getRange(fila, 31).setValue(data.fecha_contacto);
    if (data.fecha_datos_recibidos) hoja.getRange(fila, 32).setValue(data.fecha_datos_recibidos);

    // Actualizar estado según datos recibidos
    var estadoActual = datos[i][16] || 'pendiente_datos';
    var nuevoEstado  = estadoActual;

    if (data.estado) {
      nuevoEstado = data.estado;
    } else {
      // Calcular con los valores finales (lo que había + lo que llega)
      var nombreFinal  = data.nombre    || datos[i][2]  || '';
      var dniFinal     = data.dni       || datos[i][4]  || '';
      var telFinal     = data.telefono  || datos[i][24] || '';
      var nssFinal     = data.nss       || datos[i][26] || '';
      var fnacFinal    = data.fecha_nacimiento || datos[i][22] || '';

      var tieneDatosBasicos    = nombreFinal && (dniFinal || telFinal);
      var tieneDatosCompletos  = tieneDatosBasicos && nssFinal && fnacFinal;

      // Avanzar estado si tenemos datos mínimos (independientemente del estado anterior)
      if (tieneDatosCompletos && estadoActual !== 'docs_verificados' && estadoActual !== 'incorporado') {
        nuevoEstado = 'datos_recibidos';
      } else if (tieneDatosBasicos && (estadoActual === 'pendiente_datos' || estadoActual === 'contactado')) {
        nuevoEstado = 'datos_recibidos';
      }
    }

    if (nuevoEstado !== estadoActual) {
      hoja.getRange(fila, 17).setValue(nuevoEstado);
      if (nuevoEstado === 'datos_recibidos' && !datos[i][31]) {
        hoja.getRange(fila, 32).setValue(new Date());
      }
    }

    if (data.notas) hoja.getRange(fila, 20).setValue(data.notas);
    if (data.incidencias) hoja.getRange(fila, 19).setValue(data.incidencias);

    actualizarTotalesSubrogacion_(datos[i][1]);
    return { ok: true, estado_nuevo: nuevoEstado, estado_anterior: estadoActual };
  }
  return { ok: false, error: 'Persona no encontrada' };
}

// ─── VERIFICAR DOCUMENTACIÓN ──────────────────────────────────────────────────
function verificarPersonalSubrogado_(data) {
  if (!data.id) return { ok: false, error: 'ID requerido' };
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PERSONAL_SUBROGADO);
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] !== data.id) continue;
    hoja.getRange(i+1, 17).setValue('docs_verificados');
    hoja.getRange(i+1, 18).setValue('Sí');
    hoja.getRange(i+1, 21).setValue(data.aceptado || 'Sí');
    hoja.getRange(i+1, 35).setValue(new Date());
    actualizarTotalesSubrogacion_(datos[i][1]);
    return { ok: true };
  }
  return { ok: false, error: 'Persona no encontrada' };
}

// ─── MARCAR COMO CONTACTADO ───────────────────────────────────────────────────
function marcarContactadoSubrogado_(data) {
  if (!data.id) return { ok: false, error: 'ID requerido' };
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PERSONAL_SUBROGADO);
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] !== data.id) continue;
    hoja.getRange(i+1, 17).setValue('contactado');
    hoja.getRange(i+1, 31).setValue(new Date());
    if (data.notas) hoja.getRange(i+1, 20).setValue(data.notas);
    return { ok: true };
  }
  return { ok: false, error: 'Persona no encontrada' };
}

// ════════════════════════════════════════
// INCORPORAR A RRHH
// ════════════════════════════════════════

function incorporarSubrogadoRRHH_(data) {
  if (!data.id) return { ok: false, error: 'ID requerido' };
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PERSONAL_SUBROGADO);
  var datos = hoja.getDataRange().getValues();

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] !== data.id) continue;

    // Verificar datos mínimos obligatorios
    var nombre    = datos[i][2] || '';
    var apellidos = datos[i][3] || '';
    if (!nombre || !apellidos) return { ok: false, error: 'Faltan nombre y apellidos' };

    // Construir datos completos del empleado
    var empData = {
      nombre:              nombre,
      apellidos:           apellidos,
      dni:                 datos[i][4]  || '',
      categoria:           datos[i][5]  || '',
      grupo:               datos[i][6]  || '',
      convenio:            datos[i][7]  || '',
      fecha_alta:          datos[i][9]  || data.fecha_alta || new Date(),
      tipo_contrato:       datos[i][10] || 'Indefinido',
      jornada:             datos[i][11] || 38,
      salario:             datos[i][12] || 0,
      centro:              datos[i][14] || '',
      turno:               datos[i][15] || 'Mañana',
      // Datos personales recopilados
      fecha_nacimiento:    datos[i][22] || '',
      direccion:           datos[i][23] || '',
      telefono:            datos[i][24] || '',
      email:               datos[i][25] || '',
      nss:                 datos[i][26] || '',
      cuenta_banco:        datos[i][27] || '',
      contacto_emergencia: datos[i][28] || '',
      tel_emergencia:      datos[i][29] || '',
      empresa_anterior:    datos[i][33] || '',
      fuente_alta:         'Subrogación Art.44 ET',
      notas:               'Subrogado — Antigüedad original: ' + (datos[i][8] || 'No especificada') + ' — Empresa anterior: ' + (datos[i][33] || 'No especificada')
    };

    var result = agregarEmpleado_(empData);
    if (result.ok) {
      var empId = result.id;
      hoja.getRange(i+1, 17).setValue('incorporado');
      hoja.getRange(i+1, 21).setValue('Sí');
      hoja.getRange(i+1, 22).setValue(data.fecha_alta || new Date());
      hoja.getRange(i+1, 33).setValue(empId);
      actualizarTotalesSubrogacion_(datos[i][1]);

      // ── Asignar automáticamente al centro vinculado a la licitación ──
      try {
        var subId  = datos[i][1]; // ID de la subrogación
        var opoId  = '';
        var hSubs  = ss.getSheetByName(HOJA_SUBROGACIONES);
        if (hSubs) {
          var dSubs = hSubs.getDataRange().getValues();
          for (var si = 1; si < dSubs.length; si++) {
            if (dSubs[si][0] === subId) { opoId = dSubs[si][1] || ''; break; }
          }
        }

        // Buscar el centro que tiene ese oportunidad_id en CENTROS
        if (opoId) {
          var hCentros = ss.getSheetByName('CENTROS');
          if (hCentros) {
            var dCentros = hCentros.getDataRange().getValues();
            for (var ci = 1; ci < dCentros.length; ci++) {
              if (dCentros[ci][16] === opoId && dCentros[ci][5] !== 'inactivo') {
                var centroId  = dCentros[ci][0];
                var convenio  = datos[i][7] || '';
                var categoria = datos[i][5] || '';
                var jornada   = parseFloat(datos[i][11]) || 38;

                // Asignar al centro
                asignarPersonalCentro_({
                  centro_id:      centroId,
                  empleado_id:    empId,
                  nombre_empleado: (empData.nombre + ' ' + empData.apellidos).trim(),
                  dni:            empData.dni,
                  categoria:      categoria,
                  horas_semanales: jornada,
                  turno:          empData.turno || 'mañana',
                  fecha_inicio:   data.fecha_alta || Utilities.formatDate(new Date(),'Europe/Madrid','yyyy-MM-dd'),
                  notas:          'Asignado automáticamente por subrogación Art.44 ET'
                });

                // Actualizar campo centro en la ficha RRHH
                var hEmp = ss.getSheetByName('EMPLEADOS');
                if (hEmp) {
                  var dEmp = hEmp.getDataRange().getValues();
                  for (var ei = 1; ei < dEmp.length; ei++) {
                    if (dEmp[ei][0] === empId) {
                      hEmp.getRange(ei+1, 17).setValue(centroId); // col 17 = centro
                      break;
                    }
                  }
                }
                Logger.log('Subrogado ' + empId + ' asignado al centro ' + centroId);
                break;
              }
            }
          }
        }
      } catch(eAsig) {
        Logger.log('Error asignando subrogado al centro: ' + eAsig.message);
      }

      return { ok: true, id_empleado: empId, carpeta_url: result.carpeta_url || '' };
    }
    return result;
  }
  return { ok: false, error: 'Persona no encontrada' };
}

// ════════════════════════════════════════
// IMPORTAR LISTADO CSV
// ════════════════════════════════════════

function importarListadoSubrogacion_(data) {
  if (!data.id_subrogacion || !data.listado) return { ok: false, error: 'Datos incompletos' };
  crearHojasSubrogacion_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PERSONAL_SUBROGADO);

  var lineas    = data.listado.split('\n').filter(function(l) { return l.trim().length > 0; });
  var importados = 0;

  for (var i = 0; i < lineas.length; i++) {
    // Ignorar cabecera
    if (i === 0 && lineas[i].toLowerCase().includes('nombre')) continue;
    var campos = lineas[i].split(/[;\t,]/).map(function(c) { return c.trim().replace(/^"|"$/g,''); });
    if (campos.length < 2) continue;
    // Formato flexible: Nombre;Apellidos;Categoría;Grupo;Antigüedad;Salario;Jornada;Centro
    var id = 'PSUB-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss') + '-' + i + '-' + Math.random().toString(36).substring(2,5).toUpperCase();
    hoja.appendRow([
      id, data.id_subrogacion,
      campos[0]||'', campos[1]||'', campos[2]||'',
      campos[3]||'', campos[4]||'', data.convenio||'',
      campos[5]||'', '', 'Indefinido', parseFloat(campos[7])||38,
      parseFloat(campos[6])||0, '', campos[8]||'', 'Mañana',
      'pendiente_datos', '', '', '', 'Pendiente', '',
      '','','','','','','','',
      '', '', '', '', ''
    ]);
    importados++;
  }

  actualizarTotalesSubrogacion_(data.id_subrogacion);
  return { ok: true, importados: importados };
}

// ════════════════════════════════════════
// GENERAR CARTA DE SUBROGACIÓN (Drive)
// ════════════════════════════════════════

function generarCartaSubrogacion_(data) {
  var nombre    = (data.nombre || '') + ' ' + (data.apellidos || '');
  var dni       = data.dni || 'Sin DNI aún';
  var categoria = data.categoria || '';
  var antiguedad = data.antiguedad || '';
  var salario   = data.salario || '';
  var jornada   = data.jornada || 38;
  var centro    = data.centro || '';
  var convenio  = data.convenio || '';
  var tipoContrato = data.tipo_contrato || 'Indefinido';
  var fechaSub  = data.fecha_subrogacion || '[POR CONFIRMAR]';

  var carpetaRaiz = DriveApp.getFolderById(CARPETA_RAIZ_ID);
  var carpetaRRHH = obtenerOCrearCarpeta_('RRHH', carpetaRaiz);
  var carpetaSubs = obtenerOCrearCarpeta_('Subrogaciones', carpetaRRHH);
  var carpetaSub  = obtenerOCrearCarpeta_((data.id_subrogacion || 'General'), carpetaSubs);
  var carpetaCartas = obtenerOCrearCarpeta_('Cartas_Subrogacion', carpetaSub);

  var titulo = 'CARTA SUBROGACION — ' + apellidos_(nombre) + ' — ' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'dd-MM-yyyy');
  var doc    = DocumentApp.create(titulo);
  var body   = doc.getBody();

  body.setPageHeight(841.89); // A4

  // Encabezado empresa
  var p = body.appendParagraph('Forgeser Servicios del Sur, S.L.');
  p.setHeading(DocumentApp.ParagraphHeading.NORMAL).setBold(true);
  body.appendParagraph('CIF: B21XXXXXX · Almonte, Huelva');
  body.appendParagraph('Fecha: ' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'dd/MM/yyyy'));
  body.appendParagraph('');
  body.appendParagraph('Ref: Subrogación contrato público — ' + (data.titulo || '') + ' (' + (data.organismo || '') + ')');
  body.appendParagraph('');

  // Destinatario
  var pDest = body.appendParagraph('A D./Dña. ' + nombre.trim());
  pDest.setBold(true);
  if (dni !== 'Sin DNI aún') body.appendParagraph('DNI/NIE: ' + dni);
  body.appendParagraph('');

  // Cuerpo
  body.appendParagraph('Muy Sr./Sra. nuestro/a:').setBold(false);
  body.appendParagraph('');
  body.appendParagraph(
    'En virtud de la adjudicación a FORGESER SERVICIOS DEL SUR, S.L. del contrato de ' +
    (data.titulo || '[servicio]') + ' licitado por ' + (data.organismo || '[organismo]') +
    ', y de conformidad con lo dispuesto en el Artículo 44 del Real Decreto Legislativo 2/2015 ' +
    'por el que se aprueba el texto refundido de la Ley del Estatuto de los Trabajadores, ' +
    'y en el convenio colectivo sectorial aplicable, ponemos en su conocimiento que esta empresa ' +
    'se subroga en la posición de empleador, asumiendo íntegramente los derechos y obligaciones ' +
    'laborales derivados de su contrato de trabajo.'
  );
  body.appendParagraph('');

  var h2 = body.appendParagraph('CONDICIONES LABORALES RECONOCIDAS');
  h2.setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Se mantienen en su integridad las siguientes condiciones:');
  body.appendParagraph('');
  body.appendParagraph('• Categoría profesional: ' + categoria);
  body.appendParagraph('• Antigüedad reconocida: ' + antiguedad);
  body.appendParagraph('• Salario bruto anual: ' + salario + ' €');
  body.appendParagraph('• Tipo de contrato: ' + tipoContrato);
  body.appendParagraph('• Jornada semanal: ' + jornada + ' horas');
  body.appendParagraph('• Centro de trabajo: ' + centro);
  body.appendParagraph('• Convenio colectivo aplicable: ' + convenio);
  body.appendParagraph('');

  var h3 = body.appendParagraph('FECHA DE INCORPORACIÓN');
  h3.setHeading(DocumentApp.ParagraphHeading.HEADING2);
  var pFecha = body.appendParagraph('La subrogación tendrá efectividad el día: ' + fechaSub);
  pFecha.setBold(true);
  body.appendParagraph('');
  body.appendParagraph(
    'Le rogamos se ponga en contacto con el departamento de Recursos Humanos de Forgeser ' +
    'a la mayor brevedad posible para completar la documentación necesaria para su incorporación ' +
    '(DNI/NIE, número de cuenta bancaria, número de Seguridad Social, etc.).'
  );
  body.appendParagraph('');
  body.appendParagraph('Contacto RRHH: rrhh@forgeser.com | Tel: +34 XXX XXX XXX');
  body.appendParagraph('');
  body.appendParagraph('Atentamente,');
  body.appendParagraph('');
  body.appendParagraph('');
  body.appendParagraph('_________________________________');
  body.appendParagraph('Por Forgeser Servicios del Sur, S.L.');
  body.appendParagraph('Dirección de Recursos Humanos');
  body.appendParagraph('');
  body.appendParagraph('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  body.appendParagraph('ACUSE DE RECIBO — Firmar y devolver a RRHH').setBold(true).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph('');
  body.appendParagraph('D./Dña. ' + nombre.trim() + ', con DNI/NIE ' + dni + ', declara haber recibido la presente comunicación.');
  body.appendParagraph('');
  body.appendParagraph('Firma: _______________________     Fecha: ___/___/______');
  body.appendParagraph('');

  doc.saveAndClose();
  DriveApp.getFileById(doc.getId()).moveTo(carpetaCartas);

  try {
    registrarDocumentoGenerado_('carta_subrogacion', 'RRHH', nombre.trim(), dni, centro, titulo, doc.getUrl());
  } catch(e) {}

  return { ok: true, url: doc.getUrl(), id: doc.getId(), titulo: titulo };
}

function apellidos_(nombreCompleto) {
  var partes = nombreCompleto.trim().split(' ');
  return partes.slice(1).join(' ') || partes[0];
}

// ════════════════════════════════════════
// ACTUALIZAR TOTALES
// ════════════════════════════════════════

function actualizarTotalesSubrogacion_(idSub) {
  if (!idSub) return;
  var ss       = SpreadsheetApp.getActiveSpreadsheet();
  var hPersonal = ss.getSheetByName(HOJA_PERSONAL_SUBROGADO);
  var hSub     = ss.getSheetByName(HOJA_SUBROGACIONES);
  if (!hPersonal || !hSub) return;
  var datos    = hPersonal.getDataRange().getValues();
  var count = 0, coste = 0, docsOk = 0, incorporados = 0;
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] !== idSub) continue;
    count++;
    coste += (parseFloat(datos[i][12]) || 0);
    if (datos[i][16] === 'docs_verificados' || datos[i][16] === 'incorporado') docsOk++;
    if (datos[i][16] === 'incorporado') incorporados++;
  }
  var dSub = hSub.getDataRange().getValues();
  for (var j = 1; j < dSub.length; j++) {
    if (dSub[j][0] === idSub) {
      hSub.getRange(j+1, 7).setValue(count);
      hSub.getRange(j+1, 8).setValue(coste);
      hSub.getRange(j+1, 14).setValue(docsOk === count && count > 0 ? 'Sí' : 'No (' + docsOk + '/' + count + ')');
      // Actualizar estado global de la subrogación
      var estadoSub = 'pendiente';
      if (count > 0 && incorporados === count) estadoSub = 'completada';
      else if (incorporados > 0) estadoSub = 'en_proceso';
      else if (docsOk > 0) estadoSub = 'verificando';
      else if (count > 0) estadoSub = 'recopilando_datos';
      hSub.getRange(j+1, 10).setValue(estadoSub);
      break;
    }
  }
}

// ════════════════════════════════════════
// ELIMINAR
// ════════════════════════════════════════

function eliminarPersonalSubrogado_(data) {
  if (!data.id) return { ok: false, error: 'ID requerido' };
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PERSONAL_SUBROGADO);
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] !== data.id) continue;
    var idSub = datos[i][1];
    hoja.deleteRow(i + 1);
    if (idSub) actualizarTotalesSubrogacion_(idSub);
    return { ok: true };
  }
  return { ok: false, error: 'No encontrado' };
}

function eliminarSubrogacion_(id) {
  if (!id) return { ok: false, error: 'ID requerido' };
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var hSub  = ss.getSheetByName(HOJA_SUBROGACIONES);
  var hPers = ss.getSheetByName(HOJA_PERSONAL_SUBROGADO);
  var datos = hSub.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] !== id) continue;
    hSub.deleteRow(i + 1);
    // Eliminar personal asociado
    if (hPers && hPers.getLastRow() > 1) {
      var dPers = hPers.getDataRange().getValues();
      for (var j = dPers.length - 1; j >= 1; j--) {
        if (dPers[j][1] === id) hPers.deleteRow(j + 1);
      }
    }
    return { ok: true };
  }
  return { ok: false, error: 'No encontrada' };
}

// ════════════════════════════════════════
// RESUMEN PARA GO/NO-GO (Licitaciones)
// ════════════════════════════════════════

function resumenSubrogacionParaLicitacion_(idOportunidad) {
  crearHojasSubrogacion_();
  var subs = obtenerSubrogacionesAPI_({ oportunidad: idOportunidad });
  if (!subs.subrogaciones || subs.subrogaciones.length === 0) return { hay_subrogacion: false };
  var sub      = subs.subrogaciones[0];
  var personal = obtenerPersonalSubrogadoAPI_(sub.id);
  var porCategoria = {};
  personal.personal.forEach(function(p) {
    var cat = p.categoria || 'Sin categoría';
    if (!porCategoria[cat]) porCategoria[cat] = { count: 0, coste: 0 };
    porCategoria[cat].count++;
    porCategoria[cat].coste += (parseFloat(p.salario) || 0);
  });
  return {
    hay_subrogacion:    true,
    id_subrogacion:     sub.id,
    empresa_saliente:   sub.empresa_saliente,
    num_personal:       personal.total,
    coste_bruto:        personal.coste_total,
    coste_ss:           personal.coste_ss,
    coste_total:        personal.coste_total + personal.coste_ss,
    por_categoria:      porCategoria,
    docs_completos:     sub.docs_completos,
    estado:             sub.estado,
    verificados:        personal.personal.filter(function(p) { return p.estado === 'docs_verificados' || p.estado === 'incorporado'; }).length,
    pendientes:         personal.personal.filter(function(p) { return p.estado === 'pendiente_datos'; }).length,
    incidencias:        personal.personal.filter(function(p) { return p.incidencias; }).length
  };
}

// ════════════════════════════════════════
// INCORPORAR FORZADO + CREAR EXPEDIENTE
// ════════════════════════════════════════

function incorporarSubrogadoForzado_(data) {
  // Igual que incorporarSubrogadoRRHH_ pero si el DNI ya existe,
  // localiza el empleado existente y crea/completa su expediente Drive
  if (!data.id) return { ok: false, error: 'ID requerido' };
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PERSONAL_SUBROGADO);
  if (!hoja) return { ok: false, error: 'Sin hoja personal subrogado' };
  var datos = hoja.getDataRange().getValues();

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] !== data.id) continue;

    var nombre    = datos[i][2] || '';
    var apellidos = datos[i][3] || '';
    var dni       = datos[i][4] || '';
    if (!nombre || !apellidos) return { ok: false, error: 'Faltan nombre y apellidos' };

    // Buscar empleado existente por DNI
    var hojaEmp = ss.getSheetByName(HOJA_EMPLEADOS);
    var idEmpleado = '';
    var carpetaUrl = '';

    if (hojaEmp && dni) {
      var dEmp = hojaEmp.getDataRange().getValues();
      for (var e = 1; e < dEmp.length; e++) {
        if (dEmp[e][1] === dni) {
          idEmpleado = dEmp[e][0];
          carpetaUrl = dEmp[e][36] || '';
          break;
        }
      }
    }

    // Crear expediente Drive (con todas las subcarpetas) para el empleado
    var expediente = crearExpedienteDigital_(nombre, apellidos, dni, idEmpleado || data.id);
    if (expediente.ok) {
      carpetaUrl = expediente.url;
      // Guardar URL en EMPLEADOS si no tenía
      if (idEmpleado && hojaEmp) {
        var dEmp2 = hojaEmp.getDataRange().getValues();
        for (var e2 = 1; e2 < dEmp2.length; e2++) {
          if (dEmp2[e2][0] === idEmpleado && !dEmp2[e2][36]) {
            hojaEmp.getRange(e2+1, 37).setValue(carpetaUrl);
            break;
          }
        }
      }
    }

    // Marcar como incorporado en subrogación
    hoja.getRange(i+1, 17).setValue('incorporado');
    hoja.getRange(i+1, 21).setValue('Sí');
    hoja.getRange(i+1, 22).setValue(new Date());
    if (idEmpleado) hoja.getRange(i+1, 33).setValue(idEmpleado);
    actualizarTotalesSubrogacion_(datos[i][1]);

    return { ok: true, id_empleado: idEmpleado || 'ya_existente', carpeta_url: carpetaUrl };
  }
  return { ok: false, error: 'Persona no encontrada' };
}

// ════════════════════════════════════════
// CREAR FICHA RRHH SIN CHECK DNI
// Para casos donde el DNI colisiona pero hay que crear empleado igualmente
// ════════════════════════════════════════

function incorporarSubrogadoSinDniCheck_(data) {
  if (!data.id) return { ok: false, error: 'ID requerido' };
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PERSONAL_SUBROGADO);
  if (!hoja) return { ok: false, error: 'Sin hoja' };
  var datos = hoja.getDataRange().getValues();

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] !== data.id) continue;

    var nombre    = datos[i][2] || '';
    var apellidos = datos[i][3] || '';
    if (!nombre || !apellidos) return { ok: false, error: 'Faltan nombre y apellidos' };

    var hojaEmp = ss.getSheetByName(HOJA_EMPLEADOS);
    if (!hojaEmp) return { ok: false, error: 'Sin hoja empleados' };

    var id = 'EMP-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMdd') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

    // Crear expediente Drive
    var dni = datos[i][4] || '';
    var expediente = crearExpedienteDigital_(nombre, apellidos, dni, id);
    var carpetaUrl = expediente.ok ? expediente.url : '';

    // Insertar empleado SIN check DNI
    hojaEmp.appendRow([
      id, dni, nombre, apellidos, datos[i][22] || '',
      datos[i][23] || '', datos[i][24] || '', datos[i][25] || '',
      datos[i][26] || '', datos[i][27] || '',
      datos[i][5] || '', datos[i][6] || '', datos[i][7] || '',
      datos[i][10] || 'Indefinido', datos[i][9] || new Date(), '',
      datos[i][14] || '', '', datos[i][11] || 38,
      datos[i][15] || 'Mañana', datos[i][12] || 0,
      'activo', '', 'Subrogado — Antigüedad: ' + (datos[i][8]||'?') + ' — Empresa anterior: ' + (datos[i][33]||'?'),
      new Date(), new Date(),
      '', '', 'L-V', '', '', '', '', datos[i][28] || '', datos[i][29] || '', 'Sí',
      carpetaUrl, 'Subrogación Art.44 ET', datos[i][33] || ''
    ]);

    // Actualizar estado en subrogación
    hoja.getRange(i+1, 17).setValue('incorporado');
    hoja.getRange(i+1, 21).setValue('Sí');
    hoja.getRange(i+1, 22).setValue(new Date());
    hoja.getRange(i+1, 33).setValue(id);
    actualizarTotalesSubrogacion_(datos[i][1]);

    return { ok: true, id_empleado: id, carpeta_url: carpetaUrl };
  }
  return { ok: false, error: 'Persona no encontrada' };
}