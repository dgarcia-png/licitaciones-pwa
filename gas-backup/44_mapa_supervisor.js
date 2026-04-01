// ============================================================================
// 44_mapa_supervisor.gs — Mapa supervisor: ubicación en tiempo real de operarios
// Cruza PARTES_V2 (inicio de tarea) y FICHAJES (entrada/salida GPS)
// Versión: 1.1 | Fix: índices correctos hoja EMPLEADOS (Estado=col21, Centro=col16)
// ============================================================================

// Columnas hoja EMPLEADOS (0-indexed):
//  0=ID, 1=DNI, 2=Nombre, 3=Apellidos, 4=Fec.Nac, 5=Dirección,
//  6=Teléfono, 7=Email, 8=NSS, 9=Cuenta Bancaria,
//  10=Categoría, 11=Grupo, 12=Convenio, 13=Tipo Contrato,
//  14=Fecha Alta, 15=Fecha Baja, 16=Centro Asignado, 17=Zona,
//  18=Jornada, 19=Turno, 20=Salario, 21=Estado, 22=Foto URL...

function mapaOperariosAPI_() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var hoy = Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM-dd');

  // ── 1. PARTES_V2 de hoy ───────────────────────────────────────────────────
  var partesPorEmpleado = {};

  var hPartes = ss.getSheetByName('PARTES_V2');
  if (hPartes && hPartes.getLastRow() > 1) {
    var dPartes = hPartes.getDataRange().getValues();
    for (var i = 1; i < dPartes.length; i++) {
      var row = dPartes[i];
      if (!row[0]) continue;

      var fechaParte = row[6] instanceof Date
        ? Utilities.formatDate(row[6], 'Europe/Madrid', 'yyyy-MM-dd')
        : String(row[6] || '');
      if (fechaParte !== hoy) continue;

      var empId = String(row[3] || '');
      if (!empId) continue;

      var latIni = parseFloat(row[10]) || 0;
      var lngIni = parseFloat(row[11]) || 0;
      var latFin = parseFloat(row[12]) || 0;
      var lngFin = parseFloat(row[13]) || 0;
      var estado = String(row[15] || '');
      var horaIni = row[7] instanceof Date ? Utilities.formatDate(row[7], 'Europe/Madrid', 'HH:mm') : String(row[7] || '');
      var horaFin = row[8] instanceof Date ? Utilities.formatDate(row[8], 'Europe/Madrid', 'HH:mm') : String(row[8] || '');

      var lat  = (estado === 'finalizado' && latFin !== 0) ? latFin : latIni;
      var lng  = (estado === 'finalizado' && lngFin !== 0) ? lngFin : lngIni;
      var hora = (estado === 'finalizado' && horaFin) ? horaFin : horaIni;

      if (lat === 0 && lng === 0) continue;

      var esEnCurso = estado === 'en_curso' || estado === 'iniciado';
      var existente = partesPorEmpleado[empId];
      var reemplazar = !existente
        || (esEnCurso && existente.fuente_raw !== 'parte_encurso')
        || (!esEnCurso && existente.fuente_raw !== 'parte_encurso' && hora > existente.hora);

      if (reemplazar) {
        partesPorEmpleado[empId] = {
          id:            empId,
          nombre:        String(row[4] || ''),
          centro:        String(row[2] || ''),
          lat:           lat,
          lng:           lng,
          hora:          hora,
          fuente:        esEnCurso ? 'parte_activo' : 'parte_finalizado',
          fuente_raw:    esEnCurso ? 'parte_encurso' : 'parte_fin',
          tipo_servicio: String(row[14] || ''),
          parte_id:      String(row[0] || ''),
        };
      }
    }
  }

  // ── 2. FICHAJES de hoy ────────────────────────────────────────────────────
  var fichajesPorEmpleado = {};

  var hFich = ss.getSheetByName('FICHAJES');
  if (hFich && hFich.getLastRow() > 1) {
    var dFich = hFich.getDataRange().getValues();
    for (var j = 1; j < dFich.length; j++) {
      var fRow = dFich[j];
      if (!fRow[0]) continue;

      var fechaFich = fRow[5] instanceof Date
        ? Utilities.formatDate(fRow[5], 'Europe/Madrid', 'yyyy-MM-dd')
        : String(fRow[5] || '');
      if (fechaFich !== hoy) continue;

      var fEmpId = String(fRow[1] || '');
      if (!fEmpId) continue;

      var fLat = parseFloat(fRow[8]) || 0;
      var fLng = parseFloat(fRow[9]) || 0;
      if (fLat === 0 && fLng === 0) continue;

      var fHora = fRow[7] instanceof Date
        ? Utilities.formatDate(fRow[7], 'Europe/Madrid', 'HH:mm')
        : String(fRow[7] || '');

      var existFich = fichajesPorEmpleado[fEmpId];
      if (!existFich || fHora > existFich.hora) {
        fichajesPorEmpleado[fEmpId] = {
          id:     fEmpId,
          nombre: String(fRow[2] || ''),
          centro: String(fRow[4] || ''),
          lat:    fLat,
          lng:    fLng,
          hora:   fHora,
          tipo:   String(fRow[6] || ''),
        };
      }
    }
  }

  // ── 3. EMPLEADOS — índices correctos ─────────────────────────────────────
  // col 0=ID, 2=Nombre, 3=Apellidos, 16=Centro Asignado, 21=Estado
  var empleadosActivos = {};
  var hEmp = ss.getSheetByName('EMPLEADOS');
  if (hEmp && hEmp.getLastRow() > 1) {
    var dEmp = hEmp.getDataRange().getValues();
    for (var k = 1; k < dEmp.length; k++) {
      if (!dEmp[k][0]) continue;
      var eEstado = String(dEmp[k][21] || '').toLowerCase();
      // Excluir solo bajas explícitas
      if (eEstado === 'baja' || eEstado === 'inactivo') continue;
      var eId = String(dEmp[k][0]);
      empleadosActivos[eId] = {
        id:     eId,
        nombre: ((dEmp[k][2] || '') + ' ' + (dEmp[k][3] || '')).trim(),
        centro: String(dEmp[k][16] || ''),
      };
    }
  }

  // ── 4. Consolidar ─────────────────────────────────────────────────────────
  var operarios = [];
  var vistos = {};

  // Partes hoy (con GPS)
  for (var eId in partesPorEmpleado) {
    var p = partesPorEmpleado[eId];
    var nombreFinal = (empleadosActivos[eId] && empleadosActivos[eId].nombre) || p.nombre;
    operarios.push({
      id:            p.id,
      nombre:        nombreFinal.trim() || p.nombre,
      centro:        p.centro || (empleadosActivos[eId] && empleadosActivos[eId].centro) || '',
      lat:           p.lat,
      lng:           p.lng,
      hora:          p.hora,
      fuente:        p.fuente,
      estado:        p.fuente === 'parte_activo' ? 'trabajando' : 'disponible',
      tipo_servicio: p.tipo_servicio,
      parte_id:      p.parte_id,
      tiene_gps:     true,
    });
    vistos[eId] = true;
  }

  // Fichajes hoy sin parte
  for (var fId in fichajesPorEmpleado) {
    if (vistos[fId]) continue;
    var f = fichajesPorEmpleado[fId];
    var nombreFich = (empleadosActivos[fId] && empleadosActivos[fId].nombre) || f.nombre;
    operarios.push({
      id:            f.id,
      nombre:        nombreFich.trim() || f.nombre,
      centro:        f.centro || (empleadosActivos[fId] && empleadosActivos[fId].centro) || '',
      lat:           f.lat,
      lng:           f.lng,
      hora:          f.hora,
      fuente:        'fichaje',
      estado:        f.tipo === 'entrada' ? 'en_servicio' : 'fuera',
      tipo_servicio: '',
      parte_id:      '',
      tiene_gps:     true,
    });
    vistos[fId] = true;
  }

  // Empleados activos sin actividad hoy (sin GPS)
  for (var aId in empleadosActivos) {
    if (vistos[aId]) continue;
    var emp = empleadosActivos[aId];
    operarios.push({
      id:            emp.id,
      nombre:        emp.nombre,
      centro:        emp.centro,
      lat:           0,
      lng:           0,
      hora:          '',
      fuente:        'sin_datos',
      estado:        'sin_fichar',
      tipo_servicio: '',
      parte_id:      '',
      tiene_gps:     false,
    });
  }

  // Ordenar: trabajando > en_servicio > disponible > fuera > sin_fichar
  var ord = { trabajando: 0, en_servicio: 1, disponible: 2, fuera: 3, sin_fichar: 4 };
  operarios.sort(function(a, b) { return (ord[a.estado] || 9) - (ord[b.estado] || 9); });

  return {
    ok:          true,
    fecha:       hoy,
    operarios:   operarios,
    total:       operarios.length,
    con_gps:     operarios.filter(function(o) { return o.tiene_gps; }).length,
    trabajando:  operarios.filter(function(o) { return o.estado === 'trabajando'; }).length,
    en_servicio: operarios.filter(function(o) { return o.estado === 'en_servicio'; }).length,
    sin_fichar:  operarios.filter(function(o) { return o.estado === 'sin_fichar'; }).length,
  };
}

function testMapaOperarios() {
  Logger.log(JSON.stringify(mapaOperariosAPI_()));
}