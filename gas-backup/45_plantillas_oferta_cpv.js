// ============================================================================
// 45_plantillas_oferta_cpv.gs — Plantillas de oferta por familia CPV
// Almacena bloques de texto base (empresa-específicos) por sector y tipo doc.
// Gemini los usa como punto de partida para generar documentos de oferta.
// Versión: 1.0 | Fecha: 1 Abril 2026
// ============================================================================

var HOJA_PLANTILLAS_CPV = 'PLANTILLAS_OFERTA_CPV';

// Familias CPV de Forgeser
var FAMILIAS_CPV = {
  'limpieza':      { label: 'Limpieza de edificios e instalaciones', prefijos: ['9091','9092','9090','9060','9090'] },
  'jardineria':    { label: 'Mantenimiento de zonas verdes',         prefijos: ['7731','7732','7733','7734','7735','7730'] },
  'mantenimiento': { label: 'Mantenimiento de instalaciones',        prefijos: ['5070','5071','5072','5073','5074','5075','5076','5000','5080'] },
  'conserjeria':   { label: 'Conserjería y portería',                prefijos: ['9834','9833'] },
  'residuos':      { label: 'Gestión de residuos y saneamiento',     prefijos: ['9051','9052','9053','9050','9061','9062'] },
};

// ── Inicializar hoja ────────────────────────────────────────────────────────

function inicializarHojaPlantillasCPV_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(HOJA_PLANTILLAS_CPV)) return;
  var h = ss.insertSheet(HOJA_PLANTILLAS_CPV);
  h.getRange(1,1,1,7).setValues([[
    'ID', 'Familia_CPV', 'Tipo_Documento', 'Titulo', 'Contenido_Base', 'Activo', 'Modificado'
  ]]).setBackground('#1a3c34').setFontColor('#fff').setFontWeight('bold');
  h.setColumnWidth(1, 120); h.setColumnWidth(2, 120); h.setColumnWidth(3, 150);
  h.setColumnWidth(4, 200); h.setColumnWidth(5, 600); h.setColumnWidth(6, 60);
  h.setFrozenRows(1);
  Logger.log('✅ Hoja PLANTILLAS_OFERTA_CPV creada');
}

// ── Cargar plantilla por familia CPV + tipo doc ────────────────────────────

function obtenerPlantillaCPV_(familiaCpv, tipoDoc) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var h  = ss.getSheetByName(HOJA_PLANTILLAS_CPV);
  if (!h || h.getLastRow() <= 1) return null;
  var datos = h.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    if (String(datos[i][1]) === familiaCpv &&
        String(datos[i][2]) === tipoDoc &&
        datos[i][5] !== false) {
      return {
        id:             datos[i][0],
        familia_cpv:    datos[i][1],
        tipo_documento: datos[i][2],
        titulo:         datos[i][3],
        contenido_base: datos[i][4],
      };
    }
  }
  return null;
}

// Detectar familia CPV a partir del código CPV de la licitación
function detectarFamiliaCPV_(cpv) {
  if (!cpv) return 'limpieza';
  var c = String(cpv).replace(/[^0-9]/g, '');
  for (var familia in FAMILIAS_CPV) {
    var prefijos = FAMILIAS_CPV[familia].prefijos;
    for (var p = 0; p < prefijos.length; p++) {
      if (c.indexOf(prefijos[p]) === 0) return familia;
    }
  }
  return 'limpieza'; // default
}

// ── API: obtener todas las plantillas ─────────────────────────────────────

function obtenerPlantillasCPV_API_(filtros) {
  inicializarHojaPlantillasCPV_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var h  = ss.getSheetByName(HOJA_PLANTILLAS_CPV);
  if (h.getLastRow() <= 1) {
    // Primera vez: crear plantillas por defecto
    crearPlantillasDefecto_();
  }
  var datos = h.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    var item = {
      id:             datos[i][0],
      familia_cpv:    datos[i][1],
      tipo_documento: datos[i][2],
      titulo:         datos[i][3],
      contenido_base: datos[i][4],
      activo:         datos[i][5] !== false,
      modificado:     datos[i][6] instanceof Date ? Utilities.formatDate(datos[i][6], 'Europe/Madrid', 'dd/MM/yyyy HH:mm') : String(datos[i][6] || ''),
    };
    if (filtros && filtros.familia_cpv && item.familia_cpv !== filtros.familia_cpv) continue;
    if (filtros && filtros.tipo_documento && item.tipo_documento !== filtros.tipo_documento) continue;
    items.push(item);
  }
  return { ok: true, plantillas: items, total: items.length, familias: FAMILIAS_CPV };
}

// ── API: guardar/actualizar plantilla ─────────────────────────────────────

function guardarPlantillaCPV_API_(data) {
  inicializarHojaPlantillasCPV_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var h  = ss.getSheetByName(HOJA_PLANTILLAS_CPV);
  var ahora = new Date();

  if (data.id) {
    // Actualizar existente
    var datos = h.getDataRange().getValues();
    for (var i = 1; i < datos.length; i++) {
      if (datos[i][0] !== data.id) continue;
      h.getRange(i+1, 4).setValue(data.titulo || datos[i][3]);
      h.getRange(i+1, 5).setValue(data.contenido_base || datos[i][4]);
      if (data.activo !== undefined) h.getRange(i+1, 6).setValue(data.activo);
      h.getRange(i+1, 7).setValue(ahora);
      return { ok: true, id: data.id };
    }
    return { ok: false, error: 'Plantilla no encontrada' };
  }

  // Nueva plantilla
  var id = 'PCPV-' + Utilities.formatDate(ahora, 'Europe/Madrid', 'yyyyMMddHHmmss');
  h.appendRow([
    id,
    data.familia_cpv || 'limpieza',
    data.tipo_documento || 'memoria_tecnica',
    data.titulo || '',
    data.contenido_base || '',
    true,
    ahora
  ]);
  return { ok: true, id: id };
}

// ── API: eliminar plantilla ───────────────────────────────────────────────

function eliminarPlantillaCPV_API_(id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var h  = ss.getSheetByName(HOJA_PLANTILLAS_CPV);
  if (!h) return { ok: false };
  var datos = h.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === id) { h.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: false, error: 'No encontrada' };
}

// ════════════════════════════════════════════════════════════════════════════
// PLANTILLAS POR DEFECTO (se cargan la primera vez)
// Texto base real de Forgeser — Gemini lo mejora y adapta al pliego concreto
// ════════════════════════════════════════════════════════════════════════════

function crearPlantillasDefecto_() {
  var plantillas = [

    // ── LIMPIEZA ──────────────────────────────────────────────────────────

    { familia: 'limpieza', tipo: 'memoria_tecnica', titulo: 'Memoria Técnica — Limpieza', contenido:
'## EMPRESA Y EXPERIENCIA\nForgeser Servicios del Sur SL es una empresa especializada en servicios de limpieza y mantenimiento de edificios e instalaciones en el ámbito del sector público andaluz, con más de 10 años de experiencia en contratos de la Administración Pública. Contamos con certificación ISO 9001:2015 en gestión de calidad y una plantilla estable de personal formado y comprometido.\n\n## METODOLOGÍA DE LIMPIEZA\nNuestra metodología se basa en la planificación detallada de tareas por frecuencia (diaria, semanal, mensual, anual), asignación específica de zonas a cada operario/a, y supervisión continua mediante parte de trabajo diario firmado. Empleamos técnicas de limpieza profesional con maquinaria industrial de última generación y productos homologados con ecoetiqueta ecológica europea.\n\n## ORGANIZACIÓN DEL PERSONAL\nEl equipo de trabajo está coordinado por un/a Encargado/a de Servicio con dedicación parcial, responsable de la supervisión diaria, control de calidad, atención al cliente y gestión de incidencias. Todo el personal cuenta con formación específica en técnicas de limpieza, prevención de riesgos laborales y manipulación de productos químicos.\n\n## COMPROMISO DE CALIDAD\nRealizamos inspecciones de calidad con checklist estandarizado, informes mensuales al cliente y encuestas de satisfacción trimestrales. Tiempo de respuesta ante incidencias: máximo 4 horas en días laborables.'
    },

    { familia: 'limpieza', tipo: 'plan_trabajo', titulo: 'Plan de Trabajo — Limpieza', contenido:
'## ORGANIZACIÓN DIARIA DEL SERVICIO\nEl servicio se organiza en turnos de mañana y/o tarde según las necesidades del cliente, con presencia garantizada en el horario acordado. El/la Encargado/a realiza una ronda de supervisión al inicio y fin de cada turno.\n\n## PROTOCOLO DE LIMPIEZA POR ZONAS\n- **Zonas de trabajo y oficinas**: limpieza diaria de superficies, papeleras, teléfonos y equipos informáticos; fregado de suelos; limpieza semanal profunda de armarios y estanterías.\n- **Baños y aseos**: limpieza y desinfección diaria completa con productos bactericidas; revisión y reposición de consumibles (papel, jabón).\n- **Zonas comunes y pasillos**: barrido húmedo diario, fregado semanal, limpieza de cristales mensuales.\n- **Exteriores e inmediaciones**: baldeo semanal de accesos y rampas.\n\n## GESTIÓN DE INCIDENCIAS\nCanal directo de comunicación con el responsable del cliente via teléfono/app. Registro de todas las incidencias y resolución documentada. Partes de servicio diarios disponibles para revisión del cliente.'
    },

    // ── JARDINERÍA ────────────────────────────────────────────────────────

    { familia: 'jardineria', tipo: 'memoria_tecnica', titulo: 'Memoria Técnica — Zonas Verdes', contenido:
'## EMPRESA Y EXPERIENCIA\nForgeser Servicios del Sur SL dispone de un equipo especializado en mantenimiento de zonas verdes urbanas y jardines de edificios públicos en Andalucía. Contamos con personal titulado en jardinería y agricultura, con carné de aplicador de productos fitosanitarios nivel básico y, en su caso, cualificado para trabajos en altura.\n\n## METODOLOGÍA DE MANTENIMIENTO\nNuestra metodología contempla la realización de un inventario inicial de las zonas a mantener, identificando especies vegetales, arbolado, sistemas de riego y estado fitosanitario. A partir de este diagnóstico, elaboramos un programa de mantenimiento anualizado con operaciones programadas y registro de cada intervención.\n\n## OPERACIONES PRINCIPALES\n- Siegas periódicas de céspedes y praderas según crecimiento estacional.\n- Podas de mantenimiento y formación de arbustos y setos.\n- Tratamientos fitosanitarios preventivos y curativos con productos registrados.\n- Mantenimiento y programación de sistemas de riego automático.\n- Plantaciones estacionales y reposición de marras.\n- Limpieza de hojarasca, malas hierbas y elementos residuales.\n\n## GESTIÓN AMBIENTAL\nPriorizamos el uso de productos fitosanitarios de bajo impacto ambiental y la gestión sostenible del agua. Los residuos vegetales son gestionados a través de gestores autorizados o compostados en instalaciones propias.'
    },

    // ── MANTENIMIENTO ─────────────────────────────────────────────────────

    { familia: 'mantenimiento', tipo: 'memoria_tecnica', titulo: 'Memoria Técnica — Mantenimiento Instalaciones', contenido:
'## EMPRESA Y EXPERIENCIA\nForgeser Servicios del Sur SL ofrece servicios integrales de mantenimiento preventivo y correctivo de instalaciones en edificios del sector público. Nuestro equipo técnico cuenta con las habilitaciones reglamentarias exigidas (electricidad BT, climatización, fontanería, aparatos a presión) y experiencia contrastada en mantenimiento de instalaciones complejas.\n\n## PLAN DE MANTENIMIENTO PREVENTIVO\nEstandarizamos nuestro plan de mantenimiento preventivo siguiendo las instrucciones técnicas aplicables (RITE, REBT, ITC) y las recomendaciones de los fabricantes. Cada instalación dispone de su ficha técnica individual con registro histórico de todas las intervenciones.\n\n## MANTENIMIENTO CORRECTIVO\nGarantizamos tiempo de respuesta ante avería ordinaria de 24 horas laborables y ante avería urgente de 4 horas. Disponemos de almacén de repuestos para las piezas de mayor rotación, minimizando los tiempos de inmovilización.\n\n## SISTEMA DE GESTIÓN\nUtilizamos un sistema informatizado de gestión del mantenimiento (GMAO) que permite el seguimiento en tiempo real de órdenes de trabajo, histórico de averías por instalación, control de costes y generación automática de informes mensuales al cliente.\n\n## MEDIOS HUMANOS Y TÉCNICOS\nEquipo de oficiales de mantenimiento multidisciplinares (electricidad, fontanería, climatización, pintura, albañilería) coordinados por un responsable técnico con titulación de grado medio o superior en instalaciones.'
    },

    // ── CONSERJERÍA ───────────────────────────────────────────────────────

    { familia: 'conserjeria', tipo: 'memoria_tecnica', titulo: 'Memoria Técnica — Conserjería', contenido:
'## EMPRESA Y EXPERIENCIA\nForgeser Servicios del Sur SL presta servicios de conserjería y portería en edificios públicos y privados, garantizando una atención profesional, discreta y eficiente. Nuestro personal de conserjería cuenta con formación específica en atención al público, control de accesos, primeros auxilios y uso de sistemas de comunicación.\n\n## METODOLOGÍA DEL SERVICIO\nEl servicio de conserjería contempla las siguientes funciones principales:\n- Control de accesos y gestión de visitas con registro.\n- Recepción, clasificación y distribución de correspondencia y paquetería.\n- Supervisión de las instalaciones comunes y comunicación de incidencias.\n- Apertura y cierre de instalaciones según horarios establecidos.\n- Atención telefónica e información al público.\n- Coordinación con otros servicios del edificio.\n\n## ORGANIZACIÓN\nEl personal de conserjería está coordinado por un responsable de servicio que garantiza la cobertura de todos los turnos y la sustitución ante ausencias. Utilizamos libro de registro de incidencias y partes de servicio diarios.'
    },

    // ── RESIDUOS ──────────────────────────────────────────────────────────

    { familia: 'residuos', tipo: 'memoria_tecnica', titulo: 'Memoria Técnica — Gestión de Residuos', contenido:
'## EMPRESA Y EXPERIENCIA\nForgeser Servicios del Sur SL cuenta con experiencia en la gestión y recogida de residuos urbanos y asimilables, así como en servicios de limpieza viaria. Disponemos de las autorizaciones y permisos reglamentarios para el transporte y gestión de residuos según la normativa vigente.\n\n## METODOLOGÍA\nNuestra metodología de gestión de residuos contempla:\n- Recogida selectiva y diferenciada según fracciones: envases, papel/cartón, vidrio, orgánico, resto.\n- Gestión de residuos especiales o peligrosos a través de gestores autorizados.\n- Limpieza y desinfección periódica de contenedores e instalaciones de recogida.\n- Registro y trazabilidad documental de todos los movimientos de residuos.\n\n## MEDIOS\nFlota de vehículos adaptados al tipo de residuo, equipados con sistemas de seguimiento GPS. Personal con formación específica en gestión de residuos y PRL.\n\n## COMPROMISO MEDIOAMBIENTAL\nImpulsamos la reducción en origen, la reutilización y el reciclaje como pilares de nuestra gestión. Elaboramos memoria medioambiental anual con indicadores de valorización y reducción de residuos depositados en vertedero.'
    },
  ];

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var h  = ss.getSheetByName(HOJA_PLANTILLAS_CPV);
  var ahora = new Date();

  for (var i = 0; i < plantillas.length; i++) {
    var p = plantillas[i];
    var id = 'PCPV-DEF-' + p.familia.toUpperCase() + '-' + p.tipo.toUpperCase().substring(0, 6);
    h.appendRow([id, p.familia, p.tipo, p.titulo, p.contenido, true, ahora]);
  }
  Logger.log('✅ ' + plantillas.length + ' plantillas por defecto creadas');
}

// Wrapper público para inicializar desde Apps Script manualmente
function inicializarPlantillasCPV() {
  inicializarHojaPlantillasCPV_();
  crearPlantillasDefecto_();
  Logger.log('✅ Plantillas CPV inicializadas');
}