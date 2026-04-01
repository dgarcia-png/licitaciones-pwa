// ============================================================================
// 10_rrhh_personal.gs - GESTIÓN DE PERSONAL + EXPEDIENTE DIGITAL
// Versión: 2.0 | Marzo 2026
// Ficha empleado + expediente Drive completo con subcarpetas por categoría
// ============================================================================

var HOJA_EMPLEADOS   = 'EMPLEADOS';
var HOJA_HISTORIAL   = 'HISTORIAL_LABORAL';
var HOJA_ASIGNACIONES = 'ASIGNACIONES';

// ── Estructura de subcarpetas del expediente digital ──────────────────────────
var SUBCARPETAS_EXPEDIENTE = [
  '01_Identificacion',        // DNI, NIE, pasaporte, permiso trabajo
  '02_Contrato_Laboral',      // Contrato, anexos, modificaciones, nóminas
  '03_PRL_Seguridad',         // Reconocimientos médicos, EPIs firmados, CAE
  '04_Formacion_Titulacion',  // Títulos, certificados, diplomas, cursos
  '05_RGPD_Consentimientos',  // Consentimientos RGPD firmados, derechos ARCO
  '06_Ausencias_Bajas',       // Partes IT, justificantes médicos, vacaciones
  '07_Subrogacion',           // Docs empresa saliente, carta subrogación firmada
  '08_Comunicaciones',        // Cartas, avisos, apercibimientos, reconocimientos
  '09_Certificaciones',       // Carnet conducir, certificados profesionales
  '10_Otros'                  // Cualquier otro documento
];

// ════════════════════════════════════════
// INICIALIZACIÓN
// ════════════════════════════════════════

function crearHojaEmpleados_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(HOJA_EMPLEADOS)) {
    var hoja = ss.insertSheet(HOJA_EMPLEADOS);
    var cab = [
      'ID Empleado', 'DNI/NIE', 'Nombre', 'Apellidos', 'Fecha Nacimiento', 'Dirección',
      'Teléfono', 'Email', 'Nº Seguridad Social', 'Cuenta Bancaria',
      'Categoría Profesional', 'Grupo', 'Convenio Aplicable', 'Tipo Contrato',
      'Fecha Alta', 'Fecha Baja', 'Centro Asignado', 'Zona',
      'Jornada (h/sem)', 'Turno', 'Salario Bruto Anual',
      'Estado', 'Foto URL', 'Notas', 'Creado', 'Modificado',
      'Horario Entrada', 'Horario Salida', 'Dias Trabajo', 'Carnet Conducir',
      'Vehiculo Matricula', 'Talla Uniforme', 'Competencias',
      'Contacto Emergencia', 'Tel Emergencia', 'Disponible Sustituciones',
      'Carpeta Drive URL', 'Fuente Alta', 'Empresa Anterior'
    ];
    hoja.getRange(1, 1, 1, cab.length).setValues([cab]);
    hoja.getRange(1, 1, 1, cab.length).setBackground('#1a3c34').setFontColor('#ffffff').setFontWeight('bold');
    hoja.setColumnWidth(3, 150); hoja.setColumnWidth(4, 200); hoja.setColumnWidth(6, 250);
    hoja.setColumnWidth(11, 200); hoja.setColumnWidth(17, 200);
    hoja.setFrozenRows(1);
  }
  if (!ss.getSheetByName(HOJA_HISTORIAL)) {
    var h2 = ss.insertSheet(HOJA_HISTORIAL);
    var cab2 = ['ID Empleado', 'Fecha', 'Tipo Cambio', 'Valor Anterior', 'Valor Nuevo', 'Motivo', 'Registrado Por'];
    h2.getRange(1, 1, 1, cab2.length).setValues([cab2]);
    h2.getRange(1, 1, 1, cab2.length).setBackground('#2d5a4e').setFontColor('#ffffff').setFontWeight('bold');
    h2.setFrozenRows(1);
  }
}

// ════════════════════════════════════════
// EXPEDIENTE DIGITAL — CARPETAS DRIVE
// ════════════════════════════════════════

function crearExpedienteDigital_(nombre, apellidos, dni, idEmpleado) {
  try {
    var carpetaRaiz    = DriveApp.getFolderById(CARPETA_RAIZ_ID);
    var carpetaRRHH    = obtenerOCrearCarpeta_(carpetaRaiz, 'RRHH');
    var carpetaEmps    = obtenerOCrearCarpeta_(carpetaRRHH, 'Empleados');
    var nombreCarpeta  = apellidos.trim() + ', ' + nombre.trim() + (dni ? ' [' + dni + ']' : '') + (idEmpleado ? ' — ' + idEmpleado : '');
    var carpetaEmp     = obtenerOCrearCarpeta_(carpetaEmps, nombreCarpeta);

    // Crear todas las subcarpetas
    for (var i = 0; i < SUBCARPETAS_EXPEDIENTE.length; i++) {
      obtenerOCrearCarpeta_(carpetaEmp, SUBCARPETAS_EXPEDIENTE[i]);
    }

    // Crear README con instrucciones
    try {
      var existeReadme = carpetaEmp.getFilesByName('EXPEDIENTE — ' + apellidos.trim() + ' ' + nombre.trim() + '.txt');
      if (!existeReadme.hasNext()) {
        var contenidoReadme =
          'EXPEDIENTE DIGITAL — ' + apellidos.trim() + ' ' + nombre.trim() + '\n' +
          (dni ? 'DNI/NIE: ' + dni + '\n' : '') +
          'ID Sistema: ' + (idEmpleado || '') + '\n' +
          'Creado: ' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'dd/MM/yyyy') + '\n\n' +
          'ESTRUCTURA DE CARPETAS:\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
          '01_Identificacion      → DNI, NIE, pasaporte, permiso de trabajo\n' +
          '02_Contrato_Laboral    → Contrato, anexos, modificaciones salariales\n' +
          '03_PRL_Seguridad       → Reconocimientos médicos, entrega EPIs, CAE\n' +
          '04_Formacion_Titulacion→ Títulos, certificados, diplomas, cursos PRL\n' +
          '05_RGPD_Consentimientos→ Consentimientos RGPD, derechos ARCO ejercidos\n' +
          '06_Ausencias_Bajas     → Partes IT, justificantes médicos, vacaciones\n' +
          '07_Subrogacion         → Documentación empresa saliente, carta Art.44 ET\n' +
          '08_Comunicaciones      → Cartas empresa, avisos, apercibimientos\n' +
          '09_Certificaciones     → Carnet conducir, certificados profesionales\n' +
          '10_Otros               → Otros documentos relevantes\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
          'Sistema Forgeser Gestión Integrada v2.0\n';
        carpetaEmp.createFile('EXPEDIENTE — ' + apellidos.trim() + ' ' + nombre.trim() + '.txt', contenidoReadme, 'text/plain');
      }
    } catch(re) {}

    return { ok: true, url: carpetaEmp.getUrl(), id: carpetaEmp.getId() };
  } catch(e) {
    Logger.log('Error creando expediente: ' + e.message);
    return { ok: false, error: e.message };
  }
}

function obtenerUrlSubcarpeta_(carpetaEmpUrl, subcarpeta) {
  try {
    // Buscar por ID de la carpeta raíz del empleado
    var carpetaRaiz   = DriveApp.getFolderById(CARPETA_RAIZ_ID);
    var carpetaRRHH   = obtenerOCrearCarpeta_(carpetaRaiz, 'RRHH');
    var carpetaEmps   = obtenerOCrearCarpeta_(carpetaRRHH, 'Empleados');
    var carpetas      = carpetaEmps.getFolders();
    while (carpetas.hasNext()) {
      var c = carpetas.next();
      if (c.getUrl() === carpetaEmpUrl) {
        var sub = c.getFoldersByName(subcarpeta);
        if (sub.hasNext()) return sub.next().getUrl();
      }
    }
  } catch(e) {}
  return null;
}

// ════════════════════════════════════════
// CRUD EMPLEADOS
// ════════════════════════════════════════

function obtenerEmpleadosAPI_(filtro) {
  crearHojaEmpleados_();
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var hoja  = ss.getSheetByName(HOJA_EMPLEADOS);
  if (!hoja || hoja.getLastRow() <= 1) return { empleados: [], total: 0 };

  var datos    = hoja.getDataRange().getValues();
  var empleados = [];
  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0] && !datos[i][2]) continue;
    var emp = {
      id: datos[i][0], dni: datos[i][1], nombre: datos[i][2], apellidos: datos[i][3],
      nombre_completo: (datos[i][2] + ' ' + datos[i][3]).trim(),
      fecha_nacimiento: datos[i][4], direccion: datos[i][5], telefono: datos[i][6],
      email: datos[i][7], nss: datos[i][8], cuenta_banco: datos[i][9],
      categoria: datos[i][10], grupo: datos[i][11], convenio: datos[i][12],
      tipo_contrato: datos[i][13], fecha_alta: datos[i][14], fecha_baja: datos[i][15],
      centro: datos[i][16], zona: datos[i][17], jornada: datos[i][18],
      turno: datos[i][19], salario: datos[i][20], estado: datos[i][21] || 'activo',
      foto_url: datos[i][22], notas: datos[i][23],
      horario_entrada: datos[i][26] || '', horario_salida: datos[i][27] || '',
      dias_trabajo: datos[i][28] || '', carnet: datos[i][29] || '',
      vehiculo: datos[i][30] || '', talla: datos[i][31] || '',
      competencias: datos[i][32] || '', contacto_emergencia: datos[i][33] || '',
      tel_emergencia: datos[i][34] || '', disponible_sustituciones: datos[i][35] || 'Sí',
      carpeta_drive_url: datos[i][36] || '',
      fuente_alta: datos[i][37] || 'Alta directa',
      empresa_anterior: datos[i][38] || ''
    };
    // Filtros
    if (filtro) {
      if (filtro.estado && emp.estado !== filtro.estado) continue;
      if (filtro.busqueda) {
        var b = filtro.busqueda.toLowerCase();
        if (!emp.nombre_completo.toLowerCase().includes(b) &&
            !emp.dni.toLowerCase().includes(b) &&
            !(emp.centro||'').toLowerCase().includes(b) &&
            !(emp.categoria||'').toLowerCase().includes(b)) continue;
      }
    }
    empleados.push(emp);
  }
  empleados.sort(function(a, b) { return (a.apellidos + a.nombre).localeCompare(b.apellidos + b.nombre); });
  return { empleados: empleados, total: empleados.length };
}

function obtenerEmpleadoAPI_(id) {
  crearHojaEmpleados_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_EMPLEADOS);
  if (!hoja) return { error: 'Sin hoja empleados' };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === id) {
      var emp = {
        id: datos[i][0], dni: datos[i][1], nombre: datos[i][2], apellidos: datos[i][3],
        nombre_completo: (datos[i][2] + ' ' + datos[i][3]).trim(),
        fecha_nacimiento: datos[i][4], direccion: datos[i][5], telefono: datos[i][6],
        email: datos[i][7], nss: datos[i][8], cuenta_banco: datos[i][9],
        categoria: datos[i][10], grupo: datos[i][11], convenio: datos[i][12],
        tipo_contrato: datos[i][13], fecha_alta: datos[i][14], fecha_baja: datos[i][15],
        centro: datos[i][16], zona: datos[i][17], jornada: datos[i][18],
        turno: datos[i][19], salario: datos[i][20], estado: datos[i][21] || 'activo',
        foto_url: datos[i][22], notas: datos[i][23],
        horario_entrada: datos[i][26] || '', horario_salida: datos[i][27] || '',
        dias_trabajo: datos[i][28] || '', carnet: datos[i][29] || '',
        vehiculo: datos[i][30] || '', talla: datos[i][31] || '',
        competencias: datos[i][32] || '', contacto_emergencia: datos[i][33] || '',
        tel_emergencia: datos[i][34] || '', disponible_sustituciones: datos[i][35] || 'Sí',
        carpeta_drive_url: datos[i][36] || '',
        fuente_alta: datos[i][37] || 'Alta directa',
        empresa_anterior: datos[i][38] || ''
      };
      // Añadir URLs de subcarpetas si hay carpeta raíz
      if (emp.carpeta_drive_url) {
        emp.subcarpetas = {};
        for (var s = 0; s < SUBCARPETAS_EXPEDIENTE.length; s++) {
          var key = SUBCARPETAS_EXPEDIENTE[s].toLowerCase().replace(/[^a-z0-9]/g, '_');
          emp.subcarpetas[key] = SUBCARPETAS_EXPEDIENTE[s];
        }
      }
      return emp;
    }
  }
  return { error: 'Empleado no encontrado' };
}

function agregarEmpleado_(data) {
  crearHojaEmpleados_();
  if (!data.nombre || !data.apellidos) return { ok: false, error: 'Nombre y apellidos requeridos' };

  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_EMPLEADOS);

  // Verificar DNI duplicado
  if (data.dni) {
    var datosExist = hoja.getDataRange().getValues();
    for (var i = 1; i < datosExist.length; i++) {
      if (datosExist[i][1] === data.dni) return { ok: false, error: 'Ya existe un empleado con ese DNI: ' + data.dni };
    }
  }

  var id = 'EMP-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMdd') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

  // Crear expediente digital con todas las subcarpetas
  var expediente = crearExpedienteDigital_(data.nombre, data.apellidos, data.dni || '', id);
  var carpetaUrl = expediente.ok ? expediente.url : '';

  hoja.appendRow([
    id, data.dni || '', data.nombre, data.apellidos, data.fecha_nacimiento || '',
    data.direccion || '', data.telefono || '', data.email || '',
    data.nss || '', data.cuenta_banco || '',
    data.categoria || '', data.grupo || '', data.convenio || '',
    data.tipo_contrato || 'Indefinido', data.fecha_alta || new Date(), '',
    data.centro || '', data.zona || '', data.jornada || 38,
    data.turno || 'Mañana', data.salario || 0,
    'activo', '', data.notas || '', new Date(), new Date(),
    data.horario_entrada || '', data.horario_salida || '', data.dias_trabajo || 'L-V',
    data.carnet || '', data.vehiculo || '', data.talla || '',
    data.competencias || '', data.contacto_emergencia || '', data.tel_emergencia || '',
    data.disponible_sustituciones || 'Sí',
    carpetaUrl,
    data.fuente_alta || 'Alta directa',
    data.empresa_anterior || ''
  ]);

  return { ok: true, id: id, nombre: data.nombre + ' ' + data.apellidos, carpeta_url: carpetaUrl };
}

function actualizarEmpleado_(data) {
  if (!data.id) return { ok: false, error: 'ID requerido' };
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_EMPLEADOS);
  if (!hoja) return { ok: false, error: 'Sin hoja empleados' };

  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === data.id) {
      var fila   = i + 1;
      var cambios = [];
      var campos = [
        { col: 2,  key: 'dni',                  label: 'DNI' },
        { col: 3,  key: 'nombre',               label: 'Nombre' },
        { col: 4,  key: 'apellidos',            label: 'Apellidos' },
        { col: 5,  key: 'fecha_nacimiento',     label: 'Fecha nacimiento' },
        { col: 6,  key: 'direccion',            label: 'Dirección' },
        { col: 7,  key: 'telefono',             label: 'Teléfono' },
        { col: 8,  key: 'email',                label: 'Email' },
        { col: 9,  key: 'nss',                  label: 'Nº SS' },
        { col: 10, key: 'cuenta_banco',         label: 'Cuenta banco' },
        { col: 11, key: 'categoria',            label: 'Categoría' },
        { col: 12, key: 'grupo',                label: 'Grupo' },
        { col: 13, key: 'convenio',             label: 'Convenio' },
        { col: 14, key: 'tipo_contrato',        label: 'Tipo contrato' },
        { col: 15, key: 'fecha_alta',           label: 'Fecha alta' },
        { col: 16, key: 'fecha_baja',           label: 'Fecha baja' },
        { col: 17, key: 'centro',               label: 'Centro' },
        { col: 18, key: 'zona',                 label: 'Zona' },
        { col: 19, key: 'jornada',              label: 'Jornada' },
        { col: 20, key: 'turno',                label: 'Turno' },
        { col: 21, key: 'salario',              label: 'Salario' },
        { col: 22, key: 'estado',               label: 'Estado' },
        { col: 23, key: 'foto_url',             label: 'Foto URL' },
        { col: 24, key: 'notas',                label: 'Notas' },
        { col: 27, key: 'horario_entrada',      label: 'Horario entrada' },
        { col: 28, key: 'horario_salida',       label: 'Horario salida' },
        { col: 29, key: 'dias_trabajo',         label: 'Días trabajo' },
        { col: 30, key: 'carnet',               label: 'Carnet' },
        { col: 31, key: 'vehiculo',             label: 'Vehículo' },
        { col: 32, key: 'talla',                label: 'Talla' },
        { col: 33, key: 'competencias',         label: 'Competencias' },
        { col: 34, key: 'contacto_emergencia',  label: 'Contacto emergencia' },
        { col: 35, key: 'tel_emergencia',       label: 'Tel emergencia' },
        { col: 36, key: 'disponible_sustituciones', label: 'Disponible sustituciones' },
        { col: 39, key: 'empresa_anterior',     label: 'Empresa anterior' }
      ];
      for (var j = 0; j < campos.length; j++) {
        var campo = campos[j];
        if (data[campo.key] !== undefined) {
          var anterior = datos[i][campo.col - 1];
          if (String(anterior) !== String(data[campo.key])) {
            hoja.getRange(fila, campo.col).setValue(data[campo.key]);
            cambios.push(campo.label + ': ' + anterior + ' → ' + data[campo.key]);
          }
        }
      }
      hoja.getRange(fila, 26).setValue(new Date()); // Modificado

      // Registrar historial si hay cambios
      if (cambios.length > 0) registrarHistorial_(data.id, 'Actualización', cambios.join(' | '), data.modificado_por || 'Sistema');

      // Si cambió nombre/apellidos/DNI → renombrar carpeta Drive
      if ((data.nombre || data.apellidos || data.dni) && datos[i][36]) {
        try {
          var carpetas = DriveApp.getFoldersByName('*');
          // Mejor: buscar la carpeta por URL guardada y renombrar
        } catch(re) {}
      }

      return { ok: true, cambios: cambios.length };
    }
  }
  return { ok: false, error: 'Empleado no encontrado' };
}

function bajaEmpleado_(data) {
  if (!data.id) return { ok: false, error: 'ID requerido' };
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_EMPLEADOS);
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === data.id) {
      hoja.getRange(i + 1, 22).setValue('baja');
      hoja.getRange(i + 1, 16).setValue(data.fecha_baja || new Date());
      hoja.getRange(i + 1, 26).setValue(new Date());
      registrarHistorial_(data.id, 'Baja', 'activo → baja', data.motivo || 'Sin especificar');
      return { ok: true };
    }
  }
  return { ok: false, error: 'Empleado no encontrado' };
}

// ════════════════════════════════════════
// EXPEDIENTE — API PÚBLICA
// ════════════════════════════════════════

function obtenerExpedienteAPI_(id_empleado) {
  var emp = obtenerEmpleadoAPI_(id_empleado);
  if (emp.error) return { ok: false, error: emp.error };

  var expediente = {
    empleado: { id: emp.id, nombre: emp.nombre_completo, dni: emp.dni, categoria: emp.categoria, centro: emp.centro },
    carpeta_raiz_url: emp.carpeta_drive_url || '',
    subcarpetas: []
  };

  // ── Auto-crear carpeta Drive si no existe ──────────────────────────────────
  if (!emp.carpeta_drive_url) {
    try {
      var carpetaRaiz = DriveApp.getFolderById(CARPETA_RAIZ_ID);
      var nombreCarpeta = (emp.apellidos || '') + '_' + (emp.nombre || '') + '_' + (emp.dni || id_empleado);
      var carpetaEmp;

      // Buscar si ya existe
      var iter = carpetaRaiz.getFoldersByName(nombreCarpeta);
      if (iter.hasNext()) {
        carpetaEmp = iter.next();
      } else {
        // Crear carpeta principal del empleado
        carpetaEmp = carpetaRaiz.createFolder(nombreCarpeta);
        // Crear subcarpetas
        for (var s = 0; s < SUBCARPETAS_EXPEDIENTE.length; s++) {
          carpetaEmp.createFolder(SUBCARPETAS_EXPEDIENTE[s]);
        }
      }

      // Guardar URL en la hoja de empleados
      var ss2 = SpreadsheetApp.getActiveSpreadsheet();
      var hojaEmp = ss2.getSheetByName(HOJA_EMPLEADOS);
      var datosEmp = hojaEmp.getDataRange().getValues();
      for (var e2 = 1; e2 < datosEmp.length; e2++) {
        if (datosEmp[e2][0] === id_empleado) {
          hojaEmp.getRange(e2 + 1, 37).setValue(carpetaEmp.getUrl());
          break;
        }
      }
      expediente.carpeta_raiz_url = carpetaEmp.getUrl();
      expediente.carpeta_creada   = true;
    } catch(e) {
      Logger.log('⚠️ Expediente Drive: ' + e.message);
    }
  }

  // Subcarpetas
  for (var i = 0; i < SUBCARPETAS_EXPEDIENTE.length; i++) {
    expediente.subcarpetas.push({
      nombre: SUBCARPETAS_EXPEDIENTE[i],
      url: expediente.carpeta_raiz_url || null,
      descripcion: getDescripcionSubcarpeta_(SUBCARPETAS_EXPEDIENTE[i])
    });
  }

  // ── Documentos del empleado ────────────────────────────────────────────────
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hojaDocs = ss.getSheetByName('DOCUMENTOS');
  var docs = [];
  if (hojaDocs && hojaDocs.getLastRow() > 1) {
    var datosDocs = hojaDocs.getDataRange().getValues();
    for (var j = 1; j < datosDocs.length; j++) {
      if (datosDocs[j][3] === emp.dni || datosDocs[j][4] === id_empleado) {
        docs.push({
          tipo:       datosDocs[j][0],
          categoria:  datosDocs[j][1],
          nombre:     datosDocs[j][2],
          fecha:      datosDocs[j][8],
          url:        datosDocs[j][12] || '',
          vencimiento: datosDocs[j][10] || ''
        });
      }
    }
  }
  expediente.documentos  = docs;
  expediente.total_docs  = docs.length;

  // ── Alertas ────────────────────────────────────────────────────────────────
  var alertas = [];
  var tieneReco     = docs.some(function(d) { return d.tipo === 'reconocimiento_medico'; });
  var tieneConsent  = docs.some(function(d) { return d.tipo === 'consentimiento'; });
  var tieneDni      = docs.some(function(d) { return d.tipo === 'dni'; });
  var tieneContrato = docs.some(function(d) { return d.tipo === 'contrato_laboral'; });
  var tieneIrpf     = docs.some(function(d) { return d.tipo === 'irpf'; });

  if (!tieneContrato) alertas.push({ tipo: 'contrato',       nivel: 'alta',  msg: 'Sin contrato laboral' });
  if (!tieneReco)     alertas.push({ tipo: 'prl',            nivel: 'alta',  msg: 'Sin reconocimiento médico' });
  if (!tieneDni)      alertas.push({ tipo: 'identificacion', nivel: 'media', msg: 'Sin copia de DNI/NIE' });
  if (!tieneConsent)  alertas.push({ tipo: 'rgpd',           nivel: 'media', msg: 'Sin consentimiento RGPD' });
  if (!tieneIrpf)     alertas.push({ tipo: 'fiscal',         nivel: 'baja',  msg: 'Sin modelo 145 (IRPF)' });

  // Docs próximos a vencer (30 días)
  var hoy = new Date(); var en30 = new Date(); en30.setDate(en30.getDate() + 30);
  docs.forEach(function(d) {
    if (d.vencimiento) {
      var fv = new Date(d.vencimiento);
      if (fv < hoy) alertas.push({ tipo: d.tipo, nivel: 'alta', msg: d.nombre + ' — CADUCADO' });
      else if (fv < en30) alertas.push({ tipo: d.tipo, nivel: 'media', msg: d.nombre + ' — vence en menos de 30 días' });
    }
  });

  expediente.alertas         = alertas;
  // Completitud: 5 docs base + penalización por alertas altas
  var alertasAltas = alertas.filter(function(a) { return a.nivel === 'alta'; }).length;
  expediente.completitud_pct = Math.max(0, Math.round(100 - (alertasAltas * 25)));

  return expediente;
}

function getDescripcionSubcarpeta_(nombre) {
  var mapa = {
    '01_Identificacion':        'DNI, NIE, pasaporte, permiso de trabajo',
    '02_Contrato_Laboral':      'Contrato, anexos, modificaciones salariales',
    '03_PRL_Seguridad':         'Reconocimientos médicos, entrega EPIs, CAE',
    '04_Formacion_Titulacion':  'Títulos, certificados, diplomas, cursos',
    '05_RGPD_Consentimientos':  'Consentimientos RGPD firmados, derechos ARCO',
    '06_Ausencias_Bajas':       'Partes IT, justificantes, vacaciones',
    '07_Subrogacion':           'Docs empresa saliente, carta Art.44 ET',
    '08_Comunicaciones':        'Cartas, avisos, apercibimientos',
    '09_Certificaciones':       'Carnet conducir, certificados profesionales',
    '10_Otros':                 'Otros documentos relevantes'
  };
  return mapa[nombre] || '';
}

// ════════════════════════════════════════
// HISTORIAL LABORAL
// ════════════════════════════════════════

function registrarHistorial_(id_empleado, tipo, detalle, registrado_por) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_HISTORIAL);
  if (!hoja) return;
  hoja.appendRow([id_empleado, new Date(), tipo, '', detalle, '', registrado_por || 'Sistema']);
}

// ════════════════════════════════════════
// STATS RRHH
// ════════════════════════════════════════

function statsRRHH_() {
  crearHojaEmpleados_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_EMPLEADOS);
  if (!hoja || hoja.getLastRow() <= 1) return { total: 0, activos: 0, bajas: 0, por_estado: {}, por_centro: {}, por_categoria: {} };

  var datos  = hoja.getDataRange().getValues();
  var stats  = { total: 0, activos: 0, bajas: 0, excedencias: 0, por_estado: {}, por_centro: {}, por_categoria: {}, por_tipo_contrato: {}, con_expediente: 0, sin_expediente: 0 };

  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    stats.total++;
    var estado    = datos[i][21] || 'activo';
    var centro    = datos[i][16] || 'Sin asignar';
    var categoria = datos[i][10] || 'Sin categoría';
    var contrato  = datos[i][13] || 'Sin especificar';
    var carpeta   = datos[i][36] || '';

    if (estado === 'activo')     stats.activos++;
    else if (estado === 'baja')  stats.bajas++;
    else if (estado === 'excedencia') stats.excedencias++;

    stats.por_estado[estado]       = (stats.por_estado[estado] || 0) + 1;
    stats.por_centro[centro]       = (stats.por_centro[centro] || 0) + 1;
    stats.por_categoria[categoria] = (stats.por_categoria[categoria] || 0) + 1;
    stats.por_tipo_contrato[contrato] = (stats.por_tipo_contrato[contrato] || 0) + 1;
    if (carpeta) stats.con_expediente++; else stats.sin_expediente++;
  }
  return stats;
}

// ════════════════════════════════════════
// ASIGNACIONES A PROYECTOS/CONTRATOS
// ════════════════════════════════════════

function obtenerAsignacionesAPI_(filtro) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_ASIGNACIONES);
  if (!hoja || hoja.getLastRow() <= 1) return { asignaciones: [], total: 0 };
  var datos    = hoja.getDataRange().getValues();
  var items    = [];
  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    var a = { id: datos[i][0], id_empleado: datos[i][1], nombre: datos[i][2], dni: datos[i][3],
      nombre_proyecto: datos[i][4], id_proyecto: datos[i][5], cliente: datos[i][6],
      porcentaje: datos[i][7], rol: datos[i][8], fecha_inicio: datos[i][9], fecha_fin: datos[i][10],
      estado: datos[i][11] || 'activa', subrogable: datos[i][12] || 'No', notas: datos[i][13] };
    if (filtro && filtro.empleado && a.id_empleado !== filtro.empleado) continue;
    if (filtro && filtro.proyecto && a.id_proyecto !== filtro.proyecto) continue;
    items.push(a);
  }
  return { asignaciones: items, total: items.length };
}

function agregarAsignacion_(data) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_ASIGNACIONES);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA_ASIGNACIONES);
    hoja.getRange(1,1,1,14).setValues([['ID','ID Empleado','Nombre','DNI','Proyecto','ID Proyecto','Cliente','% Dedicación','Rol','Fecha Inicio','Fecha Fin','Estado','Subrogable','Notas']]);
    hoja.getRange(1,1,1,14).setBackground('#1a3c34').setFontColor('#ffffff').setFontWeight('bold');
    hoja.setFrozenRows(1);
  }
  var emp = obtenerEmpleadoAPI_(data.id_empleado);
  var id  = 'ASIG-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHHmmss');
  hoja.appendRow([id, data.id_empleado, emp.nombre_completo || '', emp.dni || '',
    data.nombre_proyecto || '', data.id_proyecto || '', data.cliente || '',
    data.porcentaje || 100, data.rol || '', data.fecha_inicio || new Date(), data.fecha_fin || '',
    'activa', data.subrogable || 'No', data.notas || '']);
  return { ok: true, id: id };
}

function actualizarAsignacion_(data) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_ASIGNACIONES);
  if (!hoja) return { ok: false, error: 'Sin hoja asignaciones' };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === data.id) {
      if (data.porcentaje !== undefined) hoja.getRange(i+1, 8).setValue(data.porcentaje);
      if (data.rol)         hoja.getRange(i+1, 9).setValue(data.rol);
      if (data.fecha_fin)   hoja.getRange(i+1, 11).setValue(data.fecha_fin);
      if (data.estado)      hoja.getRange(i+1, 12).setValue(data.estado);
      if (data.notas)       hoja.getRange(i+1, 14).setValue(data.notas);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Asignación no encontrada' };
}

function finalizarAsignacion_(data) {
  return actualizarAsignacion_({ id: data.id, estado: 'finalizada', fecha_fin: data.fecha_fin || new Date() });
}

function capacidadEmpleado_(id) {
  var asigs  = obtenerAsignacionesAPI_({ empleado: id });
  var activas = asigs.asignaciones.filter(function(a) { return a.estado === 'activa'; });
  var pctUsado = activas.reduce(function(s, a) { return s + (parseFloat(a.porcentaje) || 0); }, 0);
  return { id_empleado: id, pct_asignado: pctUsado, pct_disponible: Math.max(0, 100 - pctUsado), asignaciones_activas: activas.length, asignaciones: activas };
}

function empleadosDisponiblesAPI_(porcentaje) {
  var pct  = porcentaje || 20;
  var emps = obtenerEmpleadosAPI_({ estado: 'activo' });
  var disponibles = [];
  for (var i = 0; i < emps.empleados.length; i++) {
    var cap = capacidadEmpleado_(emps.empleados[i].id);
    if (cap.pct_disponible >= pct) {
      disponibles.push({ ...emps.empleados[i], pct_disponible: cap.pct_disponible, pct_asignado: cap.pct_asignado });
    }
  }
  return { empleados: disponibles, total: disponibles.length };
}

function costeRealProyecto_(idProyecto) {
  var asigs  = obtenerAsignacionesAPI_({ proyecto: idProyecto });
  var activas = asigs.asignaciones.filter(function(a) { return a.estado === 'activa'; });
  var costeTotal = 0;
  for (var i = 0; i < activas.length; i++) {
    var emp = obtenerEmpleadoAPI_(activas[i].id_empleado);
    var salarioAnual = parseFloat(emp.salario || 0);
    costeTotal += salarioAnual * (parseFloat(activas[i].porcentaje || 100) / 100);
  }
  return { id_proyecto: idProyecto, coste_anual_estimado: costeTotal, num_empleados: activas.length, asignaciones: activas };
}

// ════════════════════════════════════════
// DASHBOARD RRHH — KPIs CONSOLIDADOS
// ════════════════════════════════════════

function dashboardRRHH_() {
  var hoy = new Date();
  var mesActual = hoy.getMonth() + 1;
  var anioActual = hoy.getFullYear();
  var hoyStr = Utilities.formatDate(hoy, 'Europe/Madrid', 'yyyy-MM-dd');
  var en30 = new Date(hoy); en30.setDate(en30.getDate() + 30);
  var en60 = new Date(hoy); en60.setDate(en60.getDate() + 60);
  var en90 = new Date(hoy); en90.setDate(en90.getDate() + 90);

  // ── Plantilla ─────────────────────────────────────────────────
  var empsData = obtenerEmpleadosAPI_({});
  var emps = empsData.empleados || [];
  var activos = emps.filter(function(e) { return e.estado === 'activo'; });
  var bajas   = emps.filter(function(e) { return e.estado === 'baja'; });

  // Distribución por centro
  var porCentro = {};
  activos.forEach(function(e) {
    var c = e.centro || 'Sin centro';
    if (!porCentro[c]) porCentro[c] = 0;
    porCentro[c]++;
  });
  var centros = Object.keys(porCentro).map(function(c) { return { centro: c, total: porCentro[c] }; });
  centros.sort(function(a, b) { return b.total - a.total; });

  // Distribución por categoría
  var porCategoria = {};
  activos.forEach(function(e) {
    var cat = e.categoria || 'Sin categoría';
    if (!porCategoria[cat]) porCategoria[cat] = 0;
    porCategoria[cat]++;
  });
  var categorias = Object.keys(porCategoria).map(function(c) { return { categoria: c, total: porCategoria[c] }; });
  categorias.sort(function(a, b) { return b.total - a.total; });

  // Contratos temporales próximos a vencer
  var contratosVencer = [];
  activos.forEach(function(e) {
    if (e.tipo_contrato && e.tipo_contrato.toLowerCase().indexOf('temporal') !== -1 && e.fecha_baja) {
      try {
        var fb = new Date(e.fecha_baja);
        if (!isNaN(fb) && fb <= en90 && fb >= hoy) {
          var diasRestantes = Math.floor((fb - hoy) / 86400000);
          contratosVencer.push({ id: e.id, nombre: e.nombre + ' ' + e.apellidos, centro: e.centro, categoria: e.categoria, fecha_fin: Utilities.formatDate(fb, 'Europe/Madrid', 'dd/MM/yyyy'), dias_restantes: diasRestantes });
        }
      } catch(err) {}
    }
  });
  contratosVencer.sort(function(a, b) { return a.dias_restantes - b.dias_restantes; });

  // Altas recientes (últimos 30 días)
  var altasRecientes = activos.filter(function(e) {
    if (!e.fecha_alta) return false;
    try { var fa = new Date(e.fecha_alta); return !isNaN(fa) && fa >= new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 30); } catch(err) { return false; }
  });

  // ── Fichajes del mes ──────────────────────────────────────────
  var fichajesData = resumenMensualTodos_(mesActual, anioActual);
  var resumenFichajes = fichajesData.resumen || [];
  var totalHorasMes = resumenFichajes.reduce(function(acc, r) { return acc + (r.total_minutos || 0); }, 0);
  var sinFicharHoy = activos.filter(function(e) {
    return !resumenFichajes.some(function(f) { return f.id === e.id; });
  }).length;

  // Fichados ahora mismo (estado hoy)
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hFich = ss.getSheetByName('FICHAJES');
  var fichadosAhora = 0;
  if (hFich && hFich.getLastRow() > 1) {
    var dFich = hFich.getDataRange().getValues();
    var porEmpHoy = {};
    for (var i = 1; i < dFich.length; i++) {
      if (!dFich[i][0]) continue;
      var fechaF = dFich[i][5] instanceof Date ? Utilities.formatDate(dFich[i][5], 'Europe/Madrid', 'yyyy-MM-dd') : String(dFich[i][5]);
      if (fechaF !== hoyStr) continue;
      var empId = dFich[i][1];
      if (!porEmpHoy[empId]) porEmpHoy[empId] = [];
      porEmpHoy[empId].push(dFich[i][6]);
    }
    Object.keys(porEmpHoy).forEach(function(id) {
      var tipos = porEmpHoy[id];
      var ultimo = tipos[tipos.length - 1];
      if (ultimo === 'entrada') fichadosAhora++;
    });
  }

  // ── Ausencias ────────────────────────────────────────────────
  var ausData = dashboardAusencias_();
  var ausStats = ausData.stats || {};

  // ── PRL alertas ──────────────────────────────────────────────
  var prlStats = { epis_caducados: 0, recos_vencidos: 0, formacion_caducada: 0 };
  try {
    var prl = dashboardPRL_();
    if (prl && prl.stats) {
      prlStats.epis_caducados    = prl.stats.epis?.caducados || 0;
      prlStats.recos_vencidos    = prl.stats.reconocimientos?.vencidos || 0;
      prlStats.formacion_caducada = prl.stats.formacion?.caducadas || 0;
    }
  } catch(e) {}

  // ── Coste estimado plantilla ──────────────────────────────────
  var costeMensualTotal = activos.reduce(function(acc, e) {
    var salAnual = parseFloat(e.salario || 0);
    return acc + (salAnual / 12);
  }, 0);

  return {
    fecha: hoyStr,
    mes: mesActual,
    anio: anioActual,
    plantilla: {
      total: emps.length,
      activos: activos.length,
      bajas: bajas.length,
      altas_recientes: altasRecientes.length,
      contratos_vencer_30d: contratosVencer.filter(function(c) { return c.dias_restantes <= 30; }).length,
      contratos_vencer_60d: contratosVencer.filter(function(c) { return c.dias_restantes <= 60; }).length,
      por_centro: centros,
      por_categoria: categorias.slice(0, 6),
      contratos_vencer: contratosVencer.slice(0, 10),
      altas_recientes_lista: altasRecientes.slice(0, 5).map(function(e) { return { nombre: e.nombre + ' ' + e.apellidos, centro: e.centro, fecha_alta: e.fecha_alta }; })
    },
    fichajes: {
      fichados_ahora: fichadosAhora,
      sin_fichar_hoy: Math.max(0, activos.length - fichadosAhora),
      total_horas_mes: Math.floor(totalHorasMes / 60) + 'h ' + (totalHorasMes % 60 < 10 ? '0' : '') + (totalHorasMes % 60) + 'm',
      empleados_con_fichaje: resumenFichajes.length,
      top_horas: resumenFichajes.slice(0, 5)
    },
    ausencias: {
      hoy_ausentes: ausStats.hoy_ausentes || 0,
      pendientes_aprobar: ausStats.pendientes || 0,
      total_mes: ausStats.total || 0
    },
    prl: prlStats,
    costes: {
      coste_mensual_estimado: Math.round(costeMensualTotal),
      coste_anual_estimado: Math.round(costeMensualTotal * 12)
    }
  };
}