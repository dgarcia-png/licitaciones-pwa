// ============================================================================
// 38_datos_prueba.gs — Generador de datos de prueba para todos los módulos
// EJECUTAR: generarDatosPrueba() — crea datos ficticios realistas
// LIMPIAR:  limpiarDatosPrueba() — elimina solo los datos de prueba
// ============================================================================

var PREFIJO_PRUEBA = 'TEST-';

function generarDatosPrueba() {
  Logger.log('🧪 Iniciando generación de datos de prueba...');
  
  generarEmpleadosPrueba_();
  generarCentrosPrueba_();
  generarLicitacionesPrueba_();
  generarContratosPrueba_();
  generarFichajesPrueba_();
  generarAusenciasPrueba_();
  generarPartesPrueba_();
  generarIncidenciasPrueba_();
  generarInventarioPrueba_();
  generarVehiculosPrueba_();
  generarInspeccionesPrueba_();
  
  Logger.log('✅ Datos de prueba generados correctamente');
  return { ok: true, mensaje: 'Datos de prueba generados' };
}

// ── EMPLEADOS ─────────────────────────────────────────────────────────────────
function generarEmpleadosPrueba_() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('EMPLEADOS');
  if (!hoja) return;

  var empleados = [
    [PREFIJO_PRUEBA+'EMP001', 'María', 'García López', '12345678A', 'Limpiadora', '1', 'Indefinido', 38, '', '01/01/2022', 'activo', 'puntovuela@loradelrio.es', 18500, 'Academia Cabos Guardia Civil', '', ''],
    [PREFIJO_PRUEBA+'EMP002', 'Carlos', 'Martínez Ruiz', '23456789B', 'Oficial limpieza', '2', 'Indefinido', 38, '', '15/03/2021', 'activo', 'carlos.martinez@test.es', 21000, 'Academia Cabos Guardia Civil', '', ''],
    [PREFIJO_PRUEBA+'EMP003', 'Ana', 'Sánchez Pérez', '34567890C', 'Encargada', '3', 'Indefinido', 40, '', '01/06/2020', 'activo', 'ana.sanchez@test.es', 24000, 'Academia Cabos Guardia Civil', '', ''],
    [PREFIJO_PRUEBA+'EMP004', 'José', 'López Fernández', '45678901D', 'Peón jardines', '1', 'Temporal', 38, '', '01/01/2026', 'activo', 'jose.lopez@test.es', 17500, 'Parque Municipal Almonte', '', ''],
    [PREFIJO_PRUEBA+'EMP005', 'Laura', 'Jiménez Torres', '56789012E', 'Limpiadora', '1', 'Temporal', 38, '', '15/09/2025', 'activo', 'laura.jimenez@test.es', 18000, 'Parque Municipal Almonte', '', ''],
  ];

  empleados.forEach(function(emp) {
    hoja.appendRow(emp);
  });
  Logger.log('Empleados: ' + empleados.length + ' creados');
}

// ── CENTROS ───────────────────────────────────────────────────────────────────
function generarCentrosPrueba_() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('CENTROS');
  if (!hoja) { crearHojaCentrosSiNoExiste_(); hoja = ss.getSheetByName('CENTROS'); }
  if (!hoja) return;

  var centros = [
    [PREFIJO_PRUEBA+'CEN001', 'Academia Cabos y Guardias GC', 'Ministerio Interior', 'Institucional', 'Ctra. Sevilla km 5, Almonte', 'Almonte', 'Huelva', 37.2654, -6.5123, 2500, 'limpieza', 'diaria', 'Mañana 06:00-14:00', 3, PREFIJO_PRUEBA+'EMP003', '', '', 85000, '01/01/2026', '31/12/2027', 'activo', ''],
    [PREFIJO_PRUEBA+'CEN002', 'Parque Municipal Almonte', 'Ayuntamiento de Almonte', 'Institucional', 'Av. Andalucía s/n, Almonte', 'Almonte', 'Huelva', 37.2601, -6.5089, 15000, 'jardineria', 'semanal', 'Mañana 07:00-15:00', 2, PREFIJO_PRUEBA+'EMP003', '', '', 42000, '01/03/2026', '28/02/2028', 'activo', ''],
    [PREFIJO_PRUEBA+'CEN003', 'Colegio Público Rocío', 'Consejería Educación Junta', 'Educativo', 'C/ Las Flores 12, Almonte', 'Almonte', 'Huelva', 37.2630, -6.5145, 800, 'limpieza', 'diaria', 'Tarde 16:00-20:00', 1, PREFIJO_PRUEBA+'EMP001', '', '', 18000, '01/09/2025', '31/08/2026', 'activo', ''],
  ];

  centros.forEach(function(c) { hoja.appendRow(c); });
  Logger.log('Centros: ' + centros.length + ' creados');
}

// ── LICITACIONES (variadas: con/sin lotes, con/sin subrogación) ───────────────
function generarLicitacionesPrueba_() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('OPORTUNIDADES');
  if (!hoja) { crearHojaOportunidadesSiNoExiste_(); hoja = ss.getSheetByName('OPORTUNIDADES'); }

  var fmt = function(d) { return Utilities.formatDate(d,'Europe/Madrid','yyyy-MM-dd'); };
  var d = function(dias) { var f=new Date(); f.setDate(f.getDate()+dias); return fmt(f); };

  // Formato: [id, id_externo, fuente, titulo, organismo, cpv, presupuesto, fecha_limite, procedimiento, url, scoring, estado, descripcion, fecha_deteccion, notas, docs_json]
  var lics = [
    // 1. Sin lotes, SIN subrogación — limpieza nueva instalación
    [PREFIJO_PRUEBA+'LIC001','EXP-TEST-001','PLACSP',
     'Servicio de limpieza Centro Deportivo Municipal de Almonte',
     'Ayuntamiento de Almonte','90910000',85000,d(30),'Abierto','https://contratacion.almonte.es',88,'nueva',
     'SIN_LOTES | SIN_SUBROGACION | Instalación nueva, sin personal a subrogar. Licitación ideal para entrar en cliente nuevo.',new Date(),'',''],

    // 2. Sin lotes, CON subrogación — limpieza edificio existente
    [PREFIJO_PRUEBA+'LIC002','EXP-TEST-002','PLACSP',
     'Renovación contrato limpieza edificios Delegación Gobierno Huelva',
     'Delegación del Gobierno en Huelva','90911200',210000,d(21),'Abierto','https://contratacion.huelva.gob.es',82,'en_analisis',
     'SIN_LOTES | CON_SUBROGACION | 8 trabajadoras a subrogar del anterior adjudicatario (Limpiezas Condado SL). Convenio limpieza edificios Huelva.',new Date(),'',''],

    // 3. CON lotes, SIN subrogación — servicio nuevo multicentro
    [PREFIJO_PRUEBA+'LIC003','EXP-TEST-003','PLACSP',
     'Servicio integral limpieza y mantenimiento instalaciones deportivas municipales — 3 LOTES',
     'Patronato Deportes Ayuntamiento Huelva','90910000',380000,d(45),'Abierto','https://sede.huelva.es',75,'nueva',
     'CON_LOTES:3 | SIN_SUBROGACION | Lote 1: Pabellón central (180.000€) | Lote 2: Piscina municipal (120.000€) | Lote 3: Campos exteriores (80.000€). Se puede concursar a 1, 2 o los 3.',new Date(),'',''],

    // 4. CON lotes, CON subrogación — renovación multicentro con personal
    [PREFIJO_PRUEBA+'LIC004','EXP-TEST-004','PLACSP',
     'Contrato servicios limpieza centros educativos Condado Huelva — 4 LOTES GEOGRÁFICOS',
     'Consejería Educación Junta de Andalucía','90919300',520000,d(15),'Abierto','https://juntadeandalucia.es/educacion',91,'go',
     'CON_LOTES:4 | CON_SUBROGACION | Lote 1: Almonte (3 colegios, 6 trabajadores) | Lote 2: Bollullos (2 colegios, 4 trabajadores) | Lote 3: Rociana (2 colegios, 3 trabajadores) | Lote 4: El Cerro (1 colegio, 2 trabajadores). ⚠️ VENCE EN 15 DÍAS',new Date(),'',''],

    // 5. Sin lotes, CON subrogación — gran contrato hospital
    [PREFIJO_PRUEBA+'LIC005','EXP-TEST-005','PLACSP',
     'Servicio limpieza integral Hospital Comarcal Infanta Elena de Huelva',
     'Servicio Andaluz de Salud','90911200',1250000,d(60),'Restringido','https://contratacion.juntadeandalucia.es',55,'nueva',
     'SIN_LOTES | CON_SUBROGACION | 42 trabajadores a subrogar. Solvencia técnica mínima requerida: 3M€/año. Procedimiento restringido — verificar requisitos admisión previa.',new Date(),'',''],

    // 6. CON lotes, SIN subrogación — jardinería
    [PREFIJO_PRUEBA+'LIC006','EXP-TEST-006','PLACSP',
     'Mantenimiento zonas verdes municipio Almonte y pedanías — 2 LOTES',
     'Ayuntamiento de Almonte','77310000',145000,d(35),'Abierto','https://contratacion.almonte.es',80,'nueva',
     'CON_LOTES:2 | SIN_SUBROGACION | Lote 1: Almonte núcleo (95.000€, 4.5ha) | Lote 2: Matalascañas y El Rocío (50.000€, 2.2ha). Nuevo contrato, sin personal anterior.',new Date(),'',''],

    // 7. Sin lotes, SIN subrogación — urgente/negociado
    [PREFIJO_PRUEBA+'LIC007','EXP-TEST-007','PLACSP',
     'Limpieza urgente instalaciones afectadas DANA 2025 — Negociado sin publicidad',
     'Ayuntamiento de Moguer','90910000',38000,d(5),'Negociado','https://moguer.es',70,'go',
     'SIN_LOTES | SIN_SUBROGACION | ⛔ VENCE EN 5 DÍAS — Contrato de emergencia. Limpieza y desinfección edificios afectados por inundaciones. Sin subrogación por ser servicio puntual.',new Date(),'',''],

    // 8. En estado go_aprobado — listo para ofertar
    [PREFIJO_PRUEBA+'LIC008','EXP-TEST-008','PLACSP',
     'Servicio de conserjería y recepción edificios Diputación Provincial Huelva',
     'Diputación Provincial de Huelva','98341000',320000,d(25),'Abierto','https://diphuelva.es',78,'go_aprobado',
     'SIN_LOTES | CON_SUBROGACION | 12 conserjes a subrogar. GO aprobado por dirección. Pendiente elaborar oferta técnica y económica.',new Date(),'',''],
  ];

  lics.forEach(function(l) { hoja.appendRow(l); });
  Logger.log('Licitaciones: ' + lics.length + ' creadas con variantes');

  // Generar lotes para las licitaciones que los tienen
  generarLotesPrueba_(lics);

  // Generar subrogaciones para las licitaciones que las tienen
  generarSubrogacionesPrueba_(lics);
}

function generarLotesPrueba_(lics) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('LOTES');
  if (!hoja) { crearHojaLotes_(); hoja = ss.getSheetByName('LOTES'); }
  if (!hoja) return;

  // Encontrar IDs generados de las oportunidades con lotes
  var hojaOpo = ss.getSheetByName('OPORTUNIDADES');
  var dOpo = hojaOpo.getDataRange().getValues();
  var idPorExterno = {};
  dOpo.forEach(function(r) { if (r[1]) idPorExterno[r[1]] = r[0]; });

  // LIC003 — 3 lotes instalaciones deportivas SIN subrogación
  var idLic003 = idPorExterno['EXP-TEST-003'] || PREFIJO_PRUEBA+'LIC003';
  [
    [PREFIJO_PRUEBA+'LOTE003-1', idLic003, 1, 'Lote 1 — Pabellón Central Huelva', 148760, 180000, 1800, 'Pabellón cubierto 3200m²', 'No', 0, 'pendiente', 0, 0, 0, 'Instalación nueva, maquinaria incluida', 'activo', new Date(), new Date(), '{}'],
    [PREFIJO_PRUEBA+'LOTE003-2', idLic003, 2, 'Lote 2 — Piscina Municipal Huelva', 99174, 120000, 950, 'Piscina cubierta + vestuarios 1800m²', 'No', 0, 'go', 145000, 21.0, 8.5, 'Margen ajustado pero viable', 'activo', new Date(), new Date(), '{}'],
    [PREFIJO_PRUEBA+'LOTE003-3', idLic003, 3, 'Lote 3 — Campos exteriores y pistas', 66116, 80000, 600, 'Campos fútbol, pistas atletismo 8500m²', 'No', 0, 'no_go', 0, 0, 0, 'Desplazamiento excesivo, margen insuficiente', 'activo', new Date(), new Date(), '{}'],
  ].forEach(function(l) { hoja.appendRow(l); });

  // LIC004 — 4 lotes centros educativos CON subrogación
  var idLic004 = idPorExterno['EXP-TEST-004'] || PREFIJO_PRUEBA+'LIC004';
  [
    [PREFIJO_PRUEBA+'LOTE004-1', idLic004, 1, 'Lote 1 — Almonte (3 centros)', 107438, 130000, 2400, 'CEIP El Rocío, CEIP Marismas, IES Doñana', 'Sí', 6, 'go', 128000, 16.5, 1.5, '6 trabajadoras convenio limpieza Huelva. Subrogación asumible.', 'activo', new Date(), new Date(), '{}'],
    [PREFIJO_PRUEBA+'LOTE004-2', idLic004, 2, 'Lote 2 — Bollullos (2 centros)', 66116, 80000, 1600, 'CEIP San Sebastián, IES Doñana Bollullos', 'Sí', 4, 'go', 78000, 15.0, 2.5, '4 trabajadoras. Gestión directa posible.', 'activo', new Date(), new Date(), '{}'],
    [PREFIJO_PRUEBA+'LOTE004-3', idLic004, 3, 'Lote 3 — Rociana (2 centros)', 57851, 70000, 1200, 'CEIP Rociana, CEIP El Villar', 'Sí', 3, 'pendiente', 0, 0, 0, 'Revisar convenio colectivo aplicable', 'activo', new Date(), new Date(), '{}'],
    [PREFIJO_PRUEBA+'LOTE004-4', idLic004, 4, 'Lote 4 — El Cerro (1 centro)', 19835, 24000, 480, 'CEIP La Palma del Condado', 'Sí', 2, 'pendiente', 0, 0, 0, 'Lote pequeño — evaluar si compensa desplazamiento', 'activo', new Date(), new Date(), '{}'],
  ].forEach(function(l) { hoja.appendRow(l); });

  // LIC006 — 2 lotes jardinería SIN subrogación
  var idLic006 = idPorExterno['EXP-TEST-006'] || PREFIJO_PRUEBA+'LIC006';
  [
    [PREFIJO_PRUEBA+'LOTE006-1', idLic006, 1, 'Lote 1 — Almonte núcleo', 78512, 95000, 1820, 'Parque Forestal, Alameda, jardines urbanos', 'No', 0, 'go', 92000, 18.5, 3.2, 'Zona conocida, recursos propios disponibles', 'activo', new Date(), new Date(), '{}'],
    [PREFIJO_PRUEBA+'LOTE006-2', idLic006, 2, 'Lote 2 — Matalascañas y El Rocío', 41322, 50000, 980, 'Paseos marítimos, zonas verdes El Rocío', 'No', 0, 'pendiente', 0, 0, 0, 'Valorar desplazamiento y temporada alta verano', 'activo', new Date(), new Date(), '{}'],
  ].forEach(function(l) { hoja.appendRow(l); });

  Logger.log('Lotes: generados para LIC003, LIC004, LIC006');
}

function generarSubrogacionesPrueba_(lics) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hojaS = ss.getSheetByName('SUBROGACIONES');
  if (!hojaS) { crearHojasSubrogacion_(); hojaS = ss.getSheetByName('SUBROGACIONES'); }
  if (!hojaS) return;

  var hojaOpo = ss.getSheetByName('OPORTUNIDADES');
  var dOpo = hojaOpo.getDataRange().getValues();
  var idPorExterno = {};
  dOpo.forEach(function(r) { if (r[1]) idPorExterno[r[1]] = r[0]; });

  var hojaPS = ss.getSheetByName('PERSONAL_SUBROGADO');

  // Subrogación LIC002 — Delegación Gobierno 8 trabajadoras
  var idLic002 = idPorExterno['EXP-TEST-002'] || PREFIJO_PRUEBA+'LIC002';
  var idSub002 = PREFIJO_PRUEBA+'SUB002';
  hojaS.appendRow([idSub002, idLic002, 'CONV-LIMP-HUE-2024', 'Limpieza edificios y locales Huelva', 8, 280000, 'Limpiezas Condado SL', '2024-01-01', '2025-12-31', new Date(), 'pendiente_revision', '']);

  if (hojaPS) {
    var trabajadoras = [
      ['María Dolores García', '11111111A', 'Limpiadora edificios', '1', 18500, 'Indefinido', 38, '3 años', '', ''],
      ['Carmen Jesús Pérez', '22222222B', 'Limpiadora edificios', '1', 18500, 'Indefinido', 38, '5 años', '', ''],
      ['Rocío Martín López', '33333333C', 'Oficial 1ª limpieza', '2', 20800, 'Indefinido', 38, '7 años', '', ''],
      ['Isabel Romero Núñez', '44444444D', 'Limpiadora edificios', '1', 18500, 'Temporal', 38, '1 año', '', ''],
      ['Antonia Vázquez Gil', '55555555E', 'Limpiadora edificios', '1', 18500, 'Indefinido', 30, '4 años', '', 'Jornada parcial 30h'],
      ['Josefa Sánchez Mora', '66666666F', 'Encargada', '4', 26500, 'Indefinido', 40, '10 años', '', ''],
      ['Remedios Torres Alba', '77777777G', 'Limpiadora edificios', '1', 18500, 'Temporal', 38, '6 meses', '', 'Contrato interinidad'],
      ['Manuela Díaz Reyes', '88888888H', 'Oficial 2ª limpieza', '2', 19500, 'Indefinido', 38, '2 años', '', ''],
    ];
    trabajadoras.forEach(function(t, idx) {
      hojaPS.appendRow([
        PREFIJO_PRUEBA+'PS002-'+idx, idSub002, t[0], '', t[1], t[2], t[3],
        'CONV-LIMP-HUE-2024', t[7], t[7], t[4] <= 26500 ? 'Indefinido' : 'Indefinido',
        t[5], t[6], t[4], t[8], '', 'pendiente', '', '', t[9], '', ''
      ]);
    });
  }

  // Subrogación LIC005 — Hospital 42 trabajadores (solo 5 de muestra)
  var idLic005 = idPorExterno['EXP-TEST-005'] || PREFIJO_PRUEBA+'LIC005';
  var idSub005 = PREFIJO_PRUEBA+'SUB005';
  hojaS.appendRow([idSub005, idLic005, 'CONV-LIMP-HUE-2024', 'Limpieza edificios y locales Huelva', 42, 1250000, 'ISS Facility Services SAU', '2022-01-01', '2025-12-31', new Date(), 'pendiente_revision', 'Gran contrato. Solicitar plantilla completa al cliente.']);

  // Subrogación LIC008 — Diputación 12 conserjes
  var idLic008 = idPorExterno['EXP-TEST-008'] || PREFIJO_PRUEBA+'LIC008';
  var idSub008 = PREFIJO_PRUEBA+'SUB008';
  hojaS.appendRow([idSub008, idLic008, 'CONV-CONS-AND-2023', 'Convenio conserjes Andalucía', 12, 320000, 'Securitas Facility Services SA', '2023-01-01', '2025-12-31', new Date(), 'incorporado', '']);

  Logger.log('Subrogaciones: 3 generadas con personal de muestra');
}

// ── CONTRATOS EN EJECUCIÓN ────────────────────────────────────────────────────
function generarContratosPrueba_() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('RESULTADOS_LICITACIONES');
  if (!hoja) { crearHojaSeguimientoSiNoExiste_(); hoja = ss.getSheetByName('RESULTADOS_LICITACIONES'); }

  var contratos = [
    [PREFIJO_PRUEBA+'RES001', 'Limpieza Academia GC Almonte', 'Ministerio Interior', 'Ctra. Sevilla km5', 'Huelva', 85000, '2026-01-01', '2027-12-31', 'Abierto', 90910000, '', '', 24, 15.5, 12, 'en_ejecucion', ''],
    [PREFIJO_PRUEBA+'RES002', 'Mantenimiento Parque Municipal', 'Ayuntamiento Almonte', 'Av. Andalucía s/n', 'Huelva', 42000, '2026-03-01', '2028-02-28', 'Abierto', 77310000, '', '', 24, 18.2, 10, 'en_ejecucion', ''],
    [PREFIJO_PRUEBA+'RES003', 'Limpieza Colegio Rocío', 'Consejería Educación', 'C/ Las Flores 12', 'Huelva', 18000, '2025-09-01', '2026-08-31', 'Negociado', 90911200, '', '', 12, 22.0, 8, 'en_ejecucion', ''],
  ];

  contratos.forEach(function(c) { hoja.appendRow(c); });

  // Generar seguimiento mensual para los últimos 3 meses
  var hojaSeg = ss.getSheetByName('SEGUIMIENTO_MENSUAL');
  if (!hojaSeg) return;

  var meses = ['2025-11', '2025-12', '2026-01', '2026-02'];
  contratos.forEach(function(c) {
    var ingBase = parseFloat(c[5]) / parseInt(c[12]);
    meses.forEach(function(mes) {
      var anio = parseInt(mes.split('-')[0]);
      var mesN = parseInt(mes.split('-')[1]);
      var costePers = ingBase * 0.45 * (0.9 + Math.random()*0.2);
      var costeMats = ingBase * 0.08 * (0.8 + Math.random()*0.3);
      var costeMaqui = ingBase * 0.03;
      var totalDir = costePers + costeMats + costeMaqui;
      var indirectos = totalDir * 0.15;
      var totalCostes = totalDir + indirectos;
      var beneficio = ingBase - totalCostes;
      var margen = ingBase > 0 ? (beneficio/ingBase*100) : 0;

      hojaSeg.appendRow([
        c[0], mesN, anio, mes,
        Math.round(ingBase*100)/100, 0, Math.round(ingBase*100)/100,
        Math.round(costePers*100)/100, 0,
        Math.round(costeMats*100)/100, 0, 0,
        Math.round(costeMaqui*100)/100, 15, Math.round(indirectos*100)/100,
        Math.round(totalDir*100)/100, Math.round(totalCostes*100)/100,
        Math.round(beneficio*100)/100, Math.round(margen*10)/10,
        Math.round(ingBase*100)/100, 0, 0, 0, 0, 'Generado automáticamente - datos prueba'
      ]);
    });
  });
  Logger.log('Contratos y seguimiento generados');
}

// ── FICHAJES ──────────────────────────────────────────────────────────────────
function generarFichajesPrueba_() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('FICHAJES');
  if (!hoja) return;

  var empIds = [PREFIJO_PRUEBA+'EMP001', PREFIJO_PRUEBA+'EMP002', PREFIJO_PRUEBA+'EMP003'];
  var empNombres = ['María García López', 'Carlos Martínez Ruiz', 'Ana Sánchez Pérez'];

  for (var d = 1; d <= 20; d++) {
    var fecha = new Date(2026, 2, d); // Marzo 2026
    var diaSem = fecha.getDay();
    if (diaSem === 0 || diaSem === 6) continue; // Skip fines de semana

    empIds.forEach(function(empId, idx) {
      var idEnt = PREFIJO_PRUEBA+'FICH-'+d+'-'+idx+'-E';
      var idSal = PREFIJO_PRUEBA+'FICH-'+d+'-'+idx+'-S';
      var horaEnt = '08:' + (Math.random()<0.5?'00':'15');
      var horaSal = '16:' + (Math.random()<0.5?'00':'30');
      var horas = 8 + (Math.random()<0.3?0.5:0);
      var fStr = Utilities.formatDate(fecha,'Europe/Madrid','yyyy-MM-dd');

      hoja.appendRow([idEnt, empId, empNombres[idx], '12345678A', 'Academia Cabos GC', fStr, 'entrada', horaEnt, 37.265, -6.512, '', 'PWA', 'Normal', '', '', '', 0, 'validado', '', '']);
      hoja.appendRow([idSal, empId, empNombres[idx], '12345678A', 'Academia Cabos GC', fStr, 'salida', horaSal, 37.265, -6.512, '', 'PWA', 'Normal', '', '', '', horas, 'validado', '', '']);
    });
  }
  Logger.log('Fichajes generados: 3 empleados × 20 días');
}

// ── AUSENCIAS ─────────────────────────────────────────────────────────────────
function generarAusenciasPrueba_() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('AUSENCIAS');
  if (!hoja) return;

  var ausencias = [
    [PREFIJO_PRUEBA+'AUS001', PREFIJO_PRUEBA+'EMP001', 'María García López', '12345678A', '2026-03-10', '2026-03-14', 5, 'enfermedad', 'Baja médica gripal', 'aprobada', '', PREFIJO_PRUEBA+'EMP003', new Date()],
    [PREFIJO_PRUEBA+'AUS002', PREFIJO_PRUEBA+'EMP002', 'Carlos Martínez Ruiz','23456789B', '2026-04-07', '2026-04-11', 5, 'vacaciones', 'Semana Santa', 'pendiente', '', '', new Date()],
    [PREFIJO_PRUEBA+'AUS003', PREFIJO_PRUEBA+'EMP004', 'José López Fernández', '45678901D', '2026-03-25', '2026-03-25', 1, 'permiso_retribuido', 'Asunto propio', 'aprobada', '', PREFIJO_PRUEBA+'EMP003', new Date()],
  ];

  ausencias.forEach(function(a) { hoja.appendRow(a); });
  Logger.log('Ausencias: ' + ausencias.length + ' creadas');
}

// ── PARTES DE TRABAJO ─────────────────────────────────────────────────────────
function generarPartesPrueba_() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('PARTES_V2');
  if (!hoja) return;

  var partes = [];
  for (var d = 1; d <= 15; d++) {
    var fecha = new Date(2026, 2, d);
    var diaSem = fecha.getDay();
    if (diaSem === 0 || diaSem === 6) continue;
    var fStr = Utilities.formatDate(fecha,'Europe/Madrid','yyyy-MM-dd');
    var horas = 7 + Math.floor(Math.random()*2);

    partes.push([
      PREFIJO_PRUEBA+'PARTE-'+d,
      PREFIJO_PRUEBA+'CEN001', 'Academia Cabos y Guardias GC',
      PREFIJO_PRUEBA+'EMP001', 'María García López', '12345678A',
      fStr, '08:00', '15:00', horas,
      'limpieza', 'Limpieza diaria zonas comunes y despachos',
      d % 3 === 0 ? 'Se detectó suciedad excesiva en baños planta 2' : '',
      d % 5 === 0 ? '1' : '0', // incidencias
      d < 10 ? 'si' : 'no', // firma cliente
      'completado',
      37.265, -6.512, 37.265, -6.512,
      horas * 12.5, // coste personal
      d % 3 === 0 ? 15.80 : 8.50, // coste materiales
      0, horas*12.5 + (d%3===0?15.80:8.50),
      '', // fotos
      d < 10 ? 'Juan Pérez (responsable)' : '', // nombre firmante
      8, d < 8 ? 8 : 6, // checklist total y ok
      Math.round(((d < 8 ? 8 : 6)/8)*100), // pct checklist
      new Date(), ''
    ]);
  }

  partes.forEach(function(p) { hoja.appendRow(p); });
  Logger.log('Partes: ' + partes.length + ' creados');
}

// ── INCIDENCIAS ───────────────────────────────────────────────────────────────
function generarIncidenciasPrueba_() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('INCIDENCIAS');
  if (!hoja) { crearHojaPartesSiNoExiste_(); hoja = ss.getSheetByName('INCIDENCIAS'); }

  var ahora = new Date();
  var sla4h = new Date(); sla4h.setHours(sla4h.getHours()+4);
  var slaVencida = new Date(); slaVencida.setHours(slaVencida.getHours()-2);

  var incidencias = [
    [PREFIJO_PRUEBA+'INC001', PREFIJO_PRUEBA+'CEN001', 'Academia Cabos GC', PREFIJO_PRUEBA+'EMP001', 'María García', Utilities.formatDate(ahora,'Europe/Madrid','yyyy-MM-dd'), 'averias', 'Fregona industrial averiada, no puede completar limpieza', 'alta', 'abierta', PREFIJO_PRUEBA+'EMP003', '', '', new Date(), Utilities.formatDate(sla4h,'Europe/Madrid','yyyy-MM-dd HH:mm'), 24, 'en_plazo', 0],
    [PREFIJO_PRUEBA+'INC002', PREFIJO_PRUEBA+'CEN002', 'Parque Municipal', PREFIJO_PRUEBA+'EMP004', 'José López', Utilities.formatDate(ahora,'Europe/Madrid','yyyy-MM-dd'), 'mantenimiento', 'Cortacésped con fallo en motor, hace ruido extraño', 'media', 'en_proceso', PREFIJO_PRUEBA+'EMP003', '', '', new Date(), Utilities.formatDate(slaVencida,'Europe/Madrid','yyyy-MM-dd HH:mm'), 72, 'vencido', 1],
    [PREFIJO_PRUEBA+'INC003', PREFIJO_PRUEBA+'CEN003', 'Colegio Rocío', PREFIJO_PRUEBA+'EMP001', 'María García', Utilities.formatDate(ahora,'Europe/Madrid','yyyy-MM-dd'), 'quejas', 'Director del centro ha indicado que los baños no quedan suficientemente limpios', 'baja', 'abierta', '', '', '', new Date(), '', 168, 'en_plazo', 0],
  ];

  incidencias.forEach(function(i) { hoja.appendRow(i); });
  Logger.log('Incidencias: ' + incidencias.length + ' creadas');
}

// ── INVENTARIO ────────────────────────────────────────────────────────────────
function generarInventarioPrueba_() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('STOCK_POR_CENTRO');
  if (!hoja) { inicializarHojasRecursos_(); hoja = ss.getSheetByName('STOCK_POR_CENTRO'); }
  if (!hoja) return;

  var stock = [
    [PREFIJO_PRUEBA+'STK001', PREFIJO_PRUEBA+'CEN001', PREFIJO_PRUEBA+'MAT001', 'Lejía concentrada 5L', 8, 5, 20, 'litros', 'Quimi-Romar', new Date()],
    [PREFIJO_PRUEBA+'STK002', PREFIJO_PRUEBA+'CEN001', PREFIJO_PRUEBA+'MAT002', 'Papel higiénico (pack 96u)', 3, 5, 15, 'packs', 'Inpacs', new Date()],
    [PREFIJO_PRUEBA+'STK003', PREFIJO_PRUEBA+'CEN001', PREFIJO_PRUEBA+'MAT003', 'Guantes nitrilo L (caja 100)', 12, 3, 10, 'cajas', 'Kimberly-Clark', new Date()],
    [PREFIJO_PRUEBA+'STK004', PREFIJO_PRUEBA+'CEN002', PREFIJO_PRUEBA+'MAT004', 'Abono NPK 15-15-15 (saco 25kg)', 2, 3, 10, 'sacos', 'Compo', new Date()], // ALERTA: bajo mínimo
    [PREFIJO_PRUEBA+'STK005', PREFIJO_PRUEBA+'CEN002', PREFIJO_PRUEBA+'MAT005', 'Herbicida sistémico 1L', 0, 2, 8, 'litros', 'Bayer Garden', new Date()], // URGENTE: sin stock
  ];

  stock.forEach(function(s) { hoja.appendRow(s); });
  Logger.log('Inventario: ' + stock.length + ' items creados');
}

// ── VEHÍCULOS ─────────────────────────────────────────────────────────────────
function generarVehiculosPrueba_() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('VEHICULOS');
  if (!hoja) return;

  var vehiculos = [
    [PREFIJO_PRUEBA+'VEH001', 'Furgoneta Limpieza 1', 'Ford Transit', '2020', 'H-1234-AB', 'Furgoneta', PREFIJO_PRUEBA+'CEN001', PREFIJO_PRUEBA+'EMP002', 95000, '2026-06-15', '2026-01-01', 'activo', 'ITV en Junio 2026'],
    [PREFIJO_PRUEBA+'VEH002', 'Tractor Jardines', 'Kubota L2501', '2019', '—', 'Maquinaria', PREFIJO_PRUEBA+'CEN002', PREFIJO_PRUEBA+'EMP004', 450, '2026-04-01', '2026-01-15', 'activo', 'Revisión anual pendiente'],
    [PREFIJO_PRUEBA+'VEH003', 'Furgoneta Limpieza 2', 'Citroen Berlingo', '2018', 'H-5678-CD', 'Furgoneta', PREFIJO_PRUEBA+'CEN003', PREFIJO_PRUEBA+'EMP005', 142000, '2026-03-31', '2025-12-01', 'activo', '⚠️ ITV vence este mes'],
  ];

  vehiculos.forEach(function(v) { hoja.appendRow(v); });
  Logger.log('Vehículos: ' + vehiculos.length + ' creados');
}

// ── INSPECCIONES CALIDAD ──────────────────────────────────────────────────────
function generarInspeccionesPrueba_() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('INSPECCIONES_CALIDAD');
  if (!hoja) { inicializarHojasCalidad_(); hoja = ss.getSheetByName('INSPECCIONES_CALIDAD'); }

  var inspecciones = [
    [PREFIJO_PRUEBA+'INSP001', PREFIJO_PRUEBA+'CEN001', 'Academia Cabos GC', PREFIJO_PRUEBA+'EMP003', 'Ana Sánchez', '2026-03-01', 'rutina', 'completada', 4, 4.5, 5, 4, 4.4, 'Todo en orden. Baños impecables.', '', new Date()],
    [PREFIJO_PRUEBA+'INSP002', PREFIJO_PRUEBA+'CEN001', 'Academia Cabos GC', PREFIJO_PRUEBA+'EMP003', 'Ana Sánchez', '2026-03-15', 'rutina', 'completada', 3.5, 4, 5, 3.5, 4, 'Zona de vestuarios mejorable.', '', new Date()],
    [PREFIJO_PRUEBA+'INSP003', PREFIJO_PRUEBA+'CEN002', 'Parque Municipal', PREFIJO_PRUEBA+'EMP003', 'Ana Sánchez', '2026-03-08', 'rutina', 'completada', 4.5, 4.5, 5, 4, 4.5, 'Excelente mantenimiento del cesped.', '', new Date()],
    [PREFIJO_PRUEBA+'INSP004', PREFIJO_PRUEBA+'CEN003', 'Colegio Rocío', PREFIJO_PRUEBA+'EMP003', 'Ana Sánchez', '2026-03-20', 'rutina', 'completada', 2.5, 3, 4.5, 3, 3.3, 'Baños insuficientes. Acción correctiva generada.', '', new Date()],
  ];

  inspecciones.forEach(function(i) { hoja.appendRow(i); });
  Logger.log('Inspecciones: ' + inspecciones.length + ' creadas');
}

// ── LIMPIAR DATOS DE PRUEBA ───────────────────────────────────────────────────
function limpiarDatosPrueba() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hojas = [
    'EMPLEADOS', 'CENTROS', 'OPORTUNIDADES', 'RESULTADOS_LICITACIONES',
    'SEGUIMIENTO_MENSUAL', 'FICHAJES', 'AUSENCIAS', 'PARTES_V2',
    'INCIDENCIAS', 'STOCK_POR_CENTRO', 'VEHICULOS', 'INSPECCIONES_CALIDAD'
  ];
  var totalEliminadas = 0;

  hojas.forEach(function(nombreHoja) {
    var hoja = ss.getSheetByName(nombreHoja);
    if (!hoja || hoja.getLastRow() <= 1) return;
    var datos = hoja.getDataRange().getValues();
    for (var i = datos.length - 1; i >= 1; i--) {
      if (String(datos[i][0]).indexOf(PREFIJO_PRUEBA) === 0) {
        hoja.deleteRow(i + 1);
        totalEliminadas++;
      }
    }
  });

  Logger.log('✅ Limpieza completada: ' + totalEliminadas + ' filas eliminadas');
  return { ok: true, eliminadas: totalEliminadas };
}