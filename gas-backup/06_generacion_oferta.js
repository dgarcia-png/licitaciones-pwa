// ============================================================================
// 06_generacion_oferta.gs - GENERACIÓN AUTOMÁTICA DE DOCUMENTOS DE OFERTA
// Versión: 1.1 | Fecha: 1 Abril 2026
// CAMBIOS v1.1: + integración plantillas CPV (detectarFamiliaCPV_ + obtenerPlantillaCPV_)
// ============================================================================

var HOJA_DOCUMENTOS_OFERTA = 'DOCUMENTOS_OFERTA';

var TIPOS_DOC_OFERTA = {
  'memoria_tecnica':    'Memoria Técnica',
  'memoria_economica':  'Memoria Económica / Oferta Económica',
  'plan_trabajo':       'Plan de Trabajo y Organización',
  'plan_calidad':       'Plan de Calidad y Control',
  'plan_prl':           'Plan de Prevención de Riesgos Laborales',
  'plan_medioambiente': 'Plan Medioambiental y Sostenibilidad',
  'carta_presentacion': 'Carta de Presentación'
};

// ════════════════════════════════════════
// INICIALIZACIÓN
// ════════════════════════════════════════

function crearHojaDocumentosOfertaSiNoExiste_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(HOJA_DOCUMENTOS_OFERTA)) return;
  var hoja = ss.insertSheet(HOJA_DOCUMENTOS_OFERTA);
  var cab = ['ID Oportunidad', 'Tipo Documento', 'Título', 'Contenido', 'Fecha Generación', 'Versión'];
  hoja.getRange(1, 1, 1, cab.length).setValues([cab]);
  hoja.getRange(1, 1, 1, cab.length).setBackground('#b71c1c').setFontColor('#ffffff').setFontWeight('bold');
  hoja.setColumnWidth(4, 600); hoja.setFrozenRows(1);
}

// ════════════════════════════════════════
// RECOPILAR CONTEXTO COMPLETO
// ════════════════════════════════════════

function recopilarContextoOferta_(oportunidadId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ctx = { oportunidad: null, analisis: null, calculo: null, rag: '' };

  // Oportunidad
  var hojaOpo = ss.getSheetByName('OPORTUNIDADES');
  if (hojaOpo) {
    var datos = hojaOpo.getDataRange().getValues();
    for (var i = 1; i < datos.length; i++) {
      if (datos[i][0] === oportunidadId) {
        ctx.oportunidad = {
          titulo: datos[i][3], organismo: datos[i][4], cpv: datos[i][5],
          presupuesto: datos[i][6], fecha_limite: datos[i][7], procedimiento: datos[i][8]
        };
        break;
      }
    }
  }

  // Análisis IA
  var hojaAn = ss.getSheetByName('ANALISIS_IA');
  if (hojaAn) {
    var dAn = hojaAn.getDataRange().getValues();
    for (var j = 1; j < dAn.length; j++) {
      if (dAn[j][0] === oportunidadId) {
        try { ctx.analisis = JSON.parse(dAn[j][14] || '{}'); } catch (e) { ctx.analisis = {}; }
        break;
      }
    }
  }

  // Cálculo económico
  var hojaCalc = ss.getSheetByName('CALCULOS');
  if (hojaCalc) {
    var dCalc = hojaCalc.getDataRange().getValues();
    for (var k = 1; k < dCalc.length; k++) {
      if (dCalc[k][0] === oportunidadId) {
        try { ctx.calculo = JSON.parse(dCalc[k][8] || '{}'); } catch (e) { ctx.calculo = {}; }
        break;
      }
    }
  }

  // Contexto RAG
  try {
    var query = (ctx.oportunidad ? ctx.oportunidad.titulo + ' ' + ctx.oportunidad.organismo : oportunidadId);
    ctx.rag = generarContextoEmpresaParaPliego_(query);
  } catch (e) { ctx.rag = ''; }

  return ctx;
}

// ════════════════════════════════════════
// PROMPTS POR TIPO DE DOCUMENTO
// ════════════════════════════════════════

function construirPromptDocumento_(tipo, ctx) {
  var an   = ctx.analisis  || {};
  var calc = ctx.calculo   || {};
  var opo  = ctx.oportunidad || {};
  var estr = an.estrategia_para_ganar || {};

  // ── Detectar tipo de servicio por CPV ──
  var tipoServicio = detectarTipoServicioCPV_(opo.cpv || an.cpv || '');

  // ── Cargar plantilla base por CPV (45_plantillas_oferta_cpv.gs) ──
  var familiaCpv   = detectarFamiliaCPV_(opo.cpv || an.cpv || '');
  var plantillaCpv = null;
  try { plantillaCpv = obtenerPlantillaCPV_(familiaCpv, tipo); } catch(ep) {}

  var base = 'Eres un experto redactor de ofertas para licitaciones públicas españolas (LCSP 9/2017).\n';
  base += 'Genera un documento profesional, detallado y convincente en ESPAÑOL.\n';
  base += 'El documento debe ser específico para esta licitación concreta, NO genérico.\n';
  base += 'Tipo de servicio: ' + tipoServicio.label + '\n';
  base += 'Usa datos reales del pliego y de la empresa.\n';
  base += 'Formato: usa encabezados con ##, párrafos bien estructurados, listas con -.\n';
  base += 'NO uses JSON, responde con el documento en texto plano formateado.\n\n';

  base += '=== DATOS DE LA LICITACIÓN ===\n';
  base += 'Título: ' + (opo.titulo || '') + '\n';
  base += 'Organismo: ' + (opo.organismo || '') + '\n';
  base += 'Presupuesto: ' + (opo.presupuesto || '') + ' €\n';
  base += 'Objeto: ' + (an.resumen_ejecutivo || '') + '\n';
  base += 'Duración: ' + (an.datos_basicos ? an.datos_basicos.duracion_contrato : '') + '\n';
  base += 'Tipo: ' + (an.datos_basicos ? an.datos_basicos.tipo_contrato : '') + '\n';

  if (an.personal_requerido) {
    base += 'Personal: Subrogación=' + (an.personal_requerido.subrogacion || '?') + ', Convenio=' + (an.personal_requerido.convenio_aplicable || '?') + '\n';
    if (an.personal_requerido.detalle) base += 'Detalle personal: ' + an.personal_requerido.detalle + '\n';
  }

  if (an.criterios_adjudicacion && an.criterios_adjudicacion.length > 0) {
    base += '\n=== CRITERIOS DE ADJUDICACIÓN ===\n';
    an.criterios_adjudicacion.forEach(function(c) {
      base += '- ' + c.criterio + ' (' + c.puntuacion_maxima + 'pts, ' + c.tipo + ')';
      if (c.como_maximizar) base += ' → ' + c.como_maximizar;
      base += '\n';
    });
  }

  if (estr.mejoras_recomendadas && estr.mejoras_recomendadas.length > 0) {
    base += '\n=== MEJORAS RECOMENDADAS POR LA IA ===\n';
    estr.mejoras_recomendadas.forEach(function(m) {
      base += '- ' + m.mejora + ' (+' + m.puntos_que_aporta + 'pts, rentabilidad: ' + m.rentabilidad + ')\n';
    });
  }

  if (ctx.rag) base += '\n' + ctx.rag + '\n';

  // ── Texto base de plantilla CPV (Forgeser-específico) ──
  if (plantillaCpv && plantillaCpv.contenido_base) {
    base += '\n=== TEXTO BASE DE REFERENCIA EMPRESA (adaptar y mejorar) ===\n';
    base += plantillaCpv.contenido_base + '\n';
    base += 'INSTRUCCIÓN: Usa el texto anterior como base corporativa, mejóralo y adáptalo específicamente al pliego concreto.\n\n';
  }

  // ── Mejoras seleccionadas por el equipo comercial ──
  var mejoras = [];
  if (calc.mejorasSeleccionadas && calc.mejorasSeleccionadas.length > 0) {
    mejoras = calc.mejorasSeleccionadas;
  } else if (calc.resumen && calc.resumen.mejorasSeleccionadas && calc.resumen.mejorasSeleccionadas.length > 0) {
    mejoras = calc.resumen.mejorasSeleccionadas;
  }
  if (mejoras.length > 0) {
    base += '\n=== MEJORAS QUE OFERTAMOS (COMPROMETIDAS EN NUESTRA OFERTA) ===\n';
    base += 'IMPORTANTE: Estas mejoras han sido SELECCIONADAS y COMPROMETIDAS. Deben aparecer DESTACADAS en el documento.\n';
    mejoras.forEach(function(m, i) {
      base += (i+1) + '. ' + m.mejora + '\n';
      if (m.puntuacion > 0) base += '   → Valor en adjudicación: +' + m.puntuacion + ' puntos\n';
      if (m.descripcionOferta) base += '   → Descripción: ' + m.descripcionOferta + '\n';
      if (m.costeEstimado > 0) base += '   → Inversión: ' + m.costeEstimado + ' €\n';
    });
    base += '\n';
  }

  // ── Prompt específico por tipo ──
  var especifico = '';

  if (tipo === 'memoria_tecnica') {
    var secciones = getSeccionesMemoriaTecnica_(tipoServicio.tipo);
    especifico = '\n=== GENERA LA MEMORIA TÉCNICA ===\n';
    especifico += 'Servicio: ' + tipoServicio.label + '\n';
    especifico += 'Estructura obligatoria (adapta el contenido a este tipo de servicio):\n';
    secciones.forEach(function(s) { especifico += s + '\n'; });
    especifico += '\nExtensión: mínimo 15 páginas equivalentes. Sé DETALLADO y ESPECÍFICO.\n';
    especifico += 'Adapta TODO el contenido al tipo de servicio (' + tipoServicio.label + ').\n';
    especifico += 'Adapta el contenido a los criterios de adjudicación para MAXIMIZAR la puntuación.\n';

  } else if (tipo === 'memoria_economica') {
    if (calc.resumen) {
      base += '\n=== DATOS DEL CÁLCULO ECONÓMICO ===\n';
      base += 'Costes directos: '    + (calc.resumen.costesDirectos  || 0) + ' €\n';
      base += 'Costes indirectos: '  + (calc.resumen.costesIndirectos|| 0) + ' €\n';
      base += 'GG: '                 + (calc.resumen.importeGG        || 0) + ' €\n';
      base += 'BI: '                 + (calc.resumen.importeBI        || 0) + ' €\n';
      base += 'Total sin IVA: '      + (calc.resumen.totalSinIVA      || 0) + ' €\n';
      base += 'Total con IVA: '      + (calc.resumen.totalConIVA      || 0) + ' €\n';
      base += 'Baja: '               + (calc.resumen.baja             || 0) + ' %\n';
      base += 'Trabajadores: '       + (calc.resumen.totalTrabajadores|| 0) + '\n';
    }
    if (calc.personal && calc.personal.length > 0) {
      base += 'Desglose personal:\n';
      calc.personal.forEach(function(p) {
        base += '- ' + p.cantidad + 'x ' + p.categoria + ' (' + p.grupo + ') ' + p.horasSemanales + 'h/sem, bruto anual: ' + p.totalAnualBruto + '€\n';
      });
    }
    especifico = '\n=== GENERA LA MEMORIA ECONÓMICA ===\n';
    especifico += 'Estructura:\n';
    especifico += '1. PRESUPUESTO GLOBAL Y JUSTIFICACIÓN DE LA OFERTA ECONÓMICA\n';
    especifico += '2. DESGLOSE DE COSTES DE PERSONAL (por categoría y convenio)\n';
    especifico += '3. COSTES DE MATERIALES Y PRODUCTOS\n';
    especifico += '4. COSTES DE MAQUINARIA Y EQUIPAMIENTO\n';
    especifico += '5. COSTES INDIRECTOS (PRL, seguros, gestión, transporte)\n';
    especifico += '6. GASTOS GENERALES Y BENEFICIO INDUSTRIAL\n';
    especifico += '7. JUSTIFICACIÓN DE LA BAJA OFERTADA\n';
    especifico += '8. VIABILIDAD ECONÓMICA DEL CONTRATO\n\n';
    especifico += 'Incluye tablas con datos numéricos reales del cálculo.\n';

  } else if (tipo === 'plan_trabajo') {
    especifico = '\n=== GENERA EL PLAN DE TRABAJO ===\n';
    especifico += 'Servicio: ' + tipoServicio.label + '\n';
    especifico += 'Estructura (adapta al tipo de servicio ' + tipoServicio.tipo + '):\n';
    especifico += '1. ORGANIZACIÓN DEL SERVICIO\n';
    especifico += '   - Distribución de tareas por zona/turno/trabajador\n';
    especifico += '   - Cuadros horarios y turnos del personal\n';
    especifico += '2. PLANIFICACIÓN TEMPORAL\n';
    especifico += '   - Calendario de trabajos diarios/semanales/mensuales/anuales\n';
    especifico += '   - Trabajos periódicos especiales o estacionales\n';
    especifico += '3. PROCEDIMIENTOS OPERATIVOS\n';
    especifico += '   - Protocolos detallados específicos para ' + tipoServicio.label + '\n';
    especifico += '   - Materiales, herramientas y equipos por operación\n';
    especifico += '4. GESTIÓN DE INCIDENCIAS Y URGENCIAS\n';
    especifico += '   - Tiempos de respuesta, protocolo de comunicación\n';
    especifico += '5. COMUNICACIÓN CON EL CLIENTE\n';
    especifico += '   - Canales, frecuencia de informes, libro de servicio, interlocutores\n';
    especifico += '6. PLAN DE TRANSICIÓN (primeros 30 días)\n';
    especifico += '   - Cronograma detallado de arranque, subrogación si aplica\n\n';

  } else if (tipo === 'plan_calidad') {
    especifico = '\n=== GENERA EL PLAN DE CALIDAD ===\n';
    especifico += 'Estructura:\n';
    especifico += '1. POLÍTICA DE CALIDAD DE LA EMPRESA\n';
    especifico += '2. SISTEMA DE GESTIÓN DE CALIDAD (ISO 9001 si aplica)\n';
    especifico += '3. INDICADORES DE CALIDAD DEL SERVICIO (KPIs)\n';
    especifico += '4. PROCEDIMIENTO DE INSPECCIÓN Y CONTROL\n';
    especifico += '   - Checklist de verificación\n';
    especifico += '   - Frecuencia de inspecciones\n';
    especifico += '   - Responsables\n';
    especifico += '5. GESTIÓN DE NO CONFORMIDADES\n';
    especifico += '6. ENCUESTAS DE SATISFACCIÓN\n';
    especifico += '7. MEJORA CONTINUA\n';
    especifico += '8. AUDITORÍAS INTERNAS\n\n';

  } else if (tipo === 'plan_prl') {
    especifico = '\n=== GENERA EL PLAN DE PRL ===\n';
    especifico += 'Estructura:\n';
    especifico += '1. POLÍTICA DE PREVENCIÓN\n';
    especifico += '2. EVALUACIÓN DE RIESGOS ESPECÍFICA\n';
    especifico += '   - Riesgos por puesto de trabajo\n';
    especifico += '   - Riesgos por tipo de instalación\n';
    especifico += '3. MEDIDAS PREVENTIVAS\n';
    especifico += '   - EPIs necesarios\n';
    especifico += '   - Protocolos de seguridad\n';
    especifico += '4. PLAN DE FORMACIÓN EN PRL\n';
    especifico += '5. COORDINACIÓN DE ACTIVIDADES EMPRESARIALES (CAE)\n';
    especifico += '6. VIGILANCIA DE LA SALUD\n';
    especifico += '7. PLAN DE EMERGENCIAS\n';
    especifico += '8. GESTIÓN DE PRODUCTOS QUÍMICOS (fichas seguridad)\n\n';

  } else if (tipo === 'plan_medioambiente') {
    especifico = '\n=== GENERA EL PLAN MEDIOAMBIENTAL ===\n';
    especifico += '1. POLÍTICA MEDIOAMBIENTAL\n';
    especifico += '2. PRODUCTOS ECOLÓGICOS Y ECOETIQUETAS\n';
    especifico += '3. GESTIÓN DE RESIDUOS\n';
    especifico += '4. AHORRO ENERGÉTICO E HÍDRICO\n';
    especifico += '5. HUELLA DE CARBONO\n';
    especifico += '6. ECONOMÍA CIRCULAR\n\n';

  } else if (tipo === 'carta_presentacion') {
    especifico = '\n=== GENERA LA CARTA DE PRESENTACIÓN ===\n';
    especifico += 'Carta formal dirigida al órgano de contratación.\n';
    especifico += 'Debe incluir: presentación empresa, experiencia relevante,\n';
    especifico += 'compromiso con el servicio, resumen de la propuesta de valor.\n';
    especifico += 'Extensión: 1-2 páginas. Tono profesional y convincente.\n\n';
  }

  return base + especifico;
}

// ════════════════════════════════════════
// DETECCIÓN TIPO SERVICIO POR CPV
// ════════════════════════════════════════

function detectarTipoServicioCPV_(cpv) {
  if (!cpv) return { tipo: 'limpieza', label: 'Limpieza de edificios e instalaciones' };
  var c = String(cpv).replace(/[^0-9]/g, '');

  if (c.indexOf('7731') === 0 || c.indexOf('7732') === 0 || c.indexOf('7733') === 0 ||
      c.indexOf('7734') === 0 || c.indexOf('7735') === 0 || c.indexOf('7730') === 0)
    return { tipo: 'jardineria', label: 'Mantenimiento de zonas verdes y jardinería' };

  if (c.indexOf('5070') === 0 || c.indexOf('5071') === 0 || c.indexOf('5072') === 0 ||
      c.indexOf('5073') === 0 || c.indexOf('5074') === 0 || c.indexOf('5075') === 0 ||
      c.indexOf('5076') === 0 || c.indexOf('4525') === 0 || c.indexOf('4526') === 0)
    return { tipo: 'mantenimiento', label: 'Mantenimiento y reparación de instalaciones' };

  if (c.indexOf('9834') === 0)
    return { tipo: 'conserjeria', label: 'Servicios de conserjería y portería' };

  if (c.indexOf('7971') === 0 || c.indexOf('7972') === 0)
    return { tipo: 'vigilancia', label: 'Servicios de seguridad y vigilancia' };

  if (c.indexOf('9051') === 0 || c.indexOf('9052') === 0 || c.indexOf('9053') === 0 ||
      c.indexOf('9050') === 0 || c.indexOf('9060') === 0 || c.indexOf('9061') === 0)
    return { tipo: 'residuos', label: 'Recogida y gestión de residuos' };

  return { tipo: 'limpieza', label: 'Limpieza de edificios e instalaciones' };
}

function getSeccionesMemoriaTecnica_(tipoServicio) {
  var secciones = {
    limpieza: [
      '1. INTRODUCCIÓN Y COMPRENSIÓN DEL SERVICIO',
      '   - Análisis del objeto del contrato y características del edificio/instalación',
      '   - Conocimiento del entorno, superficies y zonas a limpiar',
      '2. ORGANIZACIÓN Y MEDIOS HUMANOS',
      '   - Organigrama funcional del servicio',
      '   - Descripción de puestos: encargado/a, limpiadoras, auxiliares',
      '   - Gestión de la subrogación del personal saliente (si aplica)',
      '   - Plan de formación continua',
      '3. METODOLOGÍA DE LIMPIEZA',
      '   - Procedimientos por tipo de espacio (oficinas, baños, zonas comunes, exteriores)',
      '   - Frecuencias diarias, semanales, mensuales y anuales',
      '   - Protocolos de limpieza de suelos, cristales, mobiliario',
      '   - Limpieza de emergencia e imprevistos',
      '4. MEDIOS MATERIALES Y PRODUCTOS',
      '   - Maquinaria (fregadoras, aspiradoras industriales, etc.)',
      '   - Productos homologados — preferencia por ecológicos con ecoetiqueta',
      '   - Fichas de seguridad y toxicología',
      '5. MEJORAS OFERTADAS',
      '   - Detalla cada mejora con justificación técnica y valor añadido',
      '6. PLAN DE TRANSICIÓN Y PUESTA EN MARCHA',
      '   - Cronograma de inicio del servicio (primeros 30 días)',
      '   - Gestión de la subrogación y documentación laboral',
      '7. COMPROMISO MEDIOAMBIENTAL Y SOCIAL',
    ],
    jardineria: [
      '1. INTRODUCCIÓN Y CONOCIMIENTO DE LAS ZONAS VERDES',
      '   - Inventario de zonas, superficies, especies vegetales y arbolado',
      '   - Diagnóstico del estado actual de las instalaciones',
      '2. ORGANIZACIÓN Y MEDIOS HUMANOS',
      '   - Organigrama: Responsable técnico, jardineros oficiales, peones',
      '   - Cualificaciones requeridas (fitosanitarios, poda de altura, etc.)',
      '   - Gestión de la subrogación (si aplica)',
      '3. METODOLOGÍA DE MANTENIMIENTO',
      '   - Operaciones de mantenimiento ordinario: siegas, podas, riegos, fertirrigación',
      '   - Tratamientos fitosanitarios: plagas, enfermedades, malas hierbas',
      '   - Mantenimiento del arbolado urbano: poda, apeo, tratamientos',
      '   - Mantenimiento de sistemas de riego automático',
      '   - Labores estacionales: siembras, plantaciones, bulbos',
      '   - Mantenimiento de mobiliario urbano, caminos y elementos decorativos',
      '4. FRECUENCIAS Y PLANIFICACIÓN',
      '   - Calendario anual de operaciones por zona',
      '   - Adaptación a condicionantes climáticos y estacionales',
      '5. MEDIOS MATERIALES',
      '   - Maquinaria: cortacésped, desbrozadora, motosierra, retroexcavadora mini',
      '   - Vehículos, herramientas y equipos de trabajo en altura',
      '   - Productos fitosanitarios registrados (carné de aplicador)',
      '6. MEJORAS OFERTADAS',
      '   - Detalla cada mejora con justificación técnica y valor añadido',
      '7. PLAN DE TRANSICIÓN Y PUESTA EN MARCHA',
      '8. COMPROMISO MEDIOAMBIENTAL',
      '   - Gestión de residuos vegetales, uso eficiente del agua, productos ecológicos',
    ],
    mantenimiento: [
      '1. INTRODUCCIÓN Y ALCANCE DEL SERVICIO',
      '   - Inventario de instalaciones: eléctrica, fontanería, climatización, ascensores, etc.',
      '   - Diagnóstico del estado actual',
      '2. ORGANIZACIÓN Y MEDIOS HUMANOS',
      '   - Organigrama: Responsable técnico, oficiales de mantenimiento, especialistas',
      '   - Titulaciones y habilitaciones requeridas',
      '3. PLAN DE MANTENIMIENTO PREVENTIVO',
      '   - Programa de revisiones periódicas por instalación',
      '   - Fichas técnicas de mantenimiento por equipo',
      '   - Sistema de registro y trazabilidad (GMAO)',
      '4. MANTENIMIENTO CORRECTIVO',
      '   - Tiempos de respuesta ante averías (urgentes/ordinarias)',
      '   - Protocolo de actuación y comunicación',
      '   - Gestión de recambios y materiales',
      '5. MEDIOS MATERIALES',
      '   - Herramientas, equipos de diagnóstico, vehículos',
      '   - Almacén de repuestos críticos',
      '6. MEJORAS OFERTADAS',
      '7. PLAN DE TRANSICIÓN',
      '8. SISTEMA DE GESTIÓN Y REPORTING',
      '   - Informes mensuales al cliente, indicadores de mantenimiento',
    ],
    conserjeria: [
      '1. INTRODUCCIÓN Y COMPRENSIÓN DEL SERVICIO',
      '   - Análisis de las necesidades de conserjería/portería del edificio',
      '2. ORGANIZACIÓN Y MEDIOS HUMANOS',
      '   - Conserjes, auxiliares, responsables de turno',
      '   - Gestión de la subrogación',
      '3. METODOLOGÍA DEL SERVICIO',
      '   - Control de accesos y gestión de visitas',
      '   - Recepción y distribución de correspondencia',
      '   - Supervisión y comunicación de incidencias',
      '   - Apertura y cierre de instalaciones',
      '   - Atención telefónica y presencial',
      '4. GESTIÓN DE INCIDENCIAS',
      '5. MEDIOS MATERIALES Y TECNOLÓGICOS',
      '   - Sistemas de control de acceso, intercomunicadores, software de registro',
      '6. MEJORAS OFERTADAS',
      '7. PLAN DE TRANSICIÓN',
    ],
    vigilancia: [
      '1. INTRODUCCIÓN Y ANÁLISIS DE SEGURIDAD',
      '   - Evaluación de riesgos y necesidades de seguridad',
      '2. ORGANIZACIÓN Y MEDIOS HUMANOS',
      '   - Vigilantes de seguridad habilitados (TIP)',
      '   - Responsable del servicio y coordinación con el cliente',
      '3. METODOLOGÍA DEL SERVICIO',
      '   - Rondas de vigilancia, control de accesos, gestión de alarmas',
      '   - Protocolos ante incidencias, robos, emergencias',
      '   - Comunicación con Fuerzas y Cuerpos de Seguridad',
      '4. MEDIOS TÉCNICOS',
      '   - CCTV, control de accesos, sistemas de alarma',
      '5. MEJORAS OFERTADAS',
      '6. PLAN DE TRANSICIÓN',
    ],
    residuos: [
      '1. INTRODUCCIÓN Y ALCANCE DEL SERVICIO',
      '   - Tipos de residuos, volúmenes estimados, puntos de recogida',
      '2. ORGANIZACIÓN Y MEDIOS HUMANOS',
      '3. METODOLOGÍA DE RECOGIDA Y TRANSPORTE',
      '   - Frecuencias y rutas de recogida',
      '   - Clasificación y separación de residuos',
      '   - Vehículos homologados y procedimientos de carga',
      '4. GESTIÓN EN PLANTA DE TRATAMIENTO',
      '5. MEDIOS MATERIALES',
      '6. MEJORAS OFERTADAS',
      '7. PLAN DE TRANSICIÓN',
      '8. COMPROMISO MEDIOAMBIENTAL',
    ]
  };
  return secciones[tipoServicio] || secciones['limpieza'];
}

// ════════════════════════════════════════
// GENERACIÓN
// ════════════════════════════════════════

function generarDocumentoOferta_(oportunidadId, tipo) {
  Logger.log('📝 Generando: ' + tipo + ' para ' + oportunidadId);
  crearHojaDocumentosOfertaSiNoExiste_();

  if (!TIPOS_DOC_OFERTA[tipo]) return { ok: false, error: 'Tipo no válido: ' + tipo };

  var ctx = recopilarContextoOferta_(oportunidadId);
  if (!ctx.oportunidad) return { ok: false, error: 'Oportunidad no encontrada' };
  if (!ctx.analisis)    return { ok: false, error: 'Analiza el pliego primero con IA' };

  var prompt = construirPromptDocumento_(tipo, ctx);
  Logger.log('   Prompt: ' + prompt.length + ' chars');

  var geminiKey = obtenerGeminiKey_();
  if (!geminiKey) return { ok: false, error: 'API Key Gemini no configurada' };
  var modelo = 'gemini-3.1-pro-preview';

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + modelo + ':generateContent?key=' + geminiKey;
  var payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 65000, temperature: 0.3, topP: 0.9 }
  };
  var options = { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true };

  var response;
  for (var intento = 1; intento <= 3; intento++) {
    try {
      response = UrlFetchApp.fetch(url, options);
      if (response.getResponseCode() !== 503) break;
      Logger.log('   ⚠️ 503 — reintento ' + intento + '/3');
      if (intento < 3) Utilities.sleep(4000 * intento);
    } catch (e) { return { ok: false, error: 'Error red: ' + e.message }; }
  }

  var code = response.getResponseCode();
  if (code !== 200) {
    var bodyErr = '';
    try { bodyErr = JSON.parse(response.getContentText()).error.message; } catch(e) {}
    return { ok: false, error: 'Gemini ' + code + (bodyErr ? ': ' + bodyErr : '') };
  }

  var data = JSON.parse(response.getContentText());
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content)
    return { ok: false, error: 'Respuesta vacía de Gemini' };

  var partes = data.candidates[0].content.parts || [];
  var contenido = '';
  for (var p = 0; p < partes.length; p++) {
    if (partes[p].text) contenido = partes[p].text;
  }
  if (!contenido) return { ok: false, error: 'Sin texto en respuesta Gemini' };

  Logger.log('   Generado: ' + contenido.length + ' chars');

  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_DOCUMENTOS_OFERTA);
  var datos = hoja.getDataRange().getValues();
  for (var i = datos.length - 1; i >= 1; i--) {
    if (datos[i][0] === oportunidadId && datos[i][1] === tipo) hoja.deleteRow(i + 1);
  }
  hoja.appendRow([
    oportunidadId, tipo,
    TIPOS_DOC_OFERTA[tipo] + ' — ' + (ctx.oportunidad.titulo || '').substring(0, 100),
    contenido.substring(0, 50000),
    new Date(), 1
  ]);

  return { ok: true, oportunidad_id: oportunidadId, tipo: tipo, titulo: TIPOS_DOC_OFERTA[tipo], contenido: contenido, chars: contenido.length };
}

function generarTodosDocumentosOferta_(oportunidadId) {
  var tipos = ['carta_presentacion', 'memoria_tecnica', 'memoria_economica', 'plan_trabajo', 'plan_calidad', 'plan_prl', 'plan_medioambiente'];
  var resultados = [], errores = [];
  for (var i = 0; i < tipos.length; i++) {
    try {
      var r = generarDocumentoOferta_(oportunidadId, tipos[i]);
      if (r.ok) resultados.push({ tipo: tipos[i], titulo: r.titulo, chars: r.chars });
      else errores.push(tipos[i] + ': ' + r.error);
      if (i < tipos.length - 1) Utilities.sleep(3000);
    } catch (e) { errores.push(tipos[i] + ': ' + e.message); }
  }
  return { ok: true, generados: resultados.length, documentos: resultados, errores: errores };
}

// ════════════════════════════════════════
// APIs
// ════════════════════════════════════════

function obtenerDocumentosOfertaAPI_(oportunidadId) {
  crearHojaDocumentosOfertaSiNoExiste_();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_DOCUMENTOS_OFERTA);
  if (!hoja || hoja.getLastRow() <= 1) return { documentos: [], total: 0 };
  var datos = hoja.getDataRange().getValues();
  var docs  = [];
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === oportunidadId) {
      docs.push({ tipo: datos[i][1], titulo: datos[i][2], contenido: datos[i][3], fecha: datos[i][4], version: datos[i][5] });
    }
  }
  return { documentos: docs, total: docs.length, tipos_disponibles: TIPOS_DOC_OFERTA };
}