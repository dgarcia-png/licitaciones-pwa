// ════════════════════════════════════════════════════════════════════════════
// 00b_doGet_doPost.gs — Router principal API REST
// Versión: 3.3 | Fecha: 2 Abril 2026
// CAMBIOS v3.3:
//   - doPost: restaurado al original v3.1 (nombres de funciones correctos)
//   - doGet: caché en endpoints pesados (dashboards + informes)
//   - invalidarCacheServidor_ recibe action para invalidación inteligente
// ════════════════════════════════════════════════════════════════════════════

var ACCIONES_PUBLICAS = ['login', 'portal_cliente'];

function doGet(e) {
  var action = e.parameter.action || 'oportunidades';
  var result;

  // ── VALIDACIÓN DE TOKEN ──
  if (ACCIONES_PUBLICAS.indexOf(action) === -1) {
    var emailAuth = verificarAuthDoGet_(e);
    if (!emailAuth) {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: false, code: 401, error: 'Token inválido o expirado' })
      ).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // ── OPORTUNIDADES Y LICITACIONES ──
  if (action === 'oportunidades') result = obtenerOportunidadesAPI_();
  else if (action === 'stats') result = obtenerEstadisticasAPI_();
  else if (action === 'buscar') result = buscarNuevasOportunidades();
  else if (action === 'detalle') {
    var ss=SpreadsheetApp.getActiveSpreadsheet();var hoja=ss.getSheetByName(HOJA_OPORTUNIDADES);
    if(!hoja){result={error:'No hay datos'};}else{var datos=hoja.getDataRange().getValues();var enc=null;
    for(var i=1;i<datos.length;i++){if(datos[i][0]===e.parameter.id){var dj=datos[i][15]||'';var nd=0;try{nd=JSON.parse(dj||'[]').length;}catch(x){}
    enc={id:datos[i][0],id_externo:datos[i][1],fuente:datos[i][2],titulo:datos[i][3],organismo:datos[i][4],cpv:datos[i][5],presupuesto:datos[i][6],fecha_limite:datos[i][7],procedimiento:datos[i][8],url:datos[i][9],scoring:datos[i][10],estado:datos[i][11],descripcion:datos[i][12],fecha_deteccion:datos[i][13],notas:datos[i][14]||'',num_docs_disponibles:nd,docs_descargados:(datos[i][14]||'').split('📎').length-1};break;}}result=enc||{error:'No encontrada'};}
  }
  else if (action === 'actualizar') {
    var ss=SpreadsheetApp.getActiveSpreadsheet();var hoja=ss.getSheetByName(HOJA_OPORTUNIDADES);var datos=hoja.getDataRange().getValues();var ok=false;
    for(var i=1;i<datos.length;i++){if(datos[i][0]===e.parameter.id){var f=i+1;
    if(e.parameter.titulo)hoja.getRange(f,4).setValue(e.parameter.titulo);if(e.parameter.organismo)hoja.getRange(f,5).setValue(e.parameter.organismo);
    if(e.parameter.cpv)hoja.getRange(f,6).setValue(e.parameter.cpv);if(e.parameter.presupuesto)hoja.getRange(f,7).setValue(parseFloat(e.parameter.presupuesto)||0);
    if(e.parameter.fecha_limite)hoja.getRange(f,8).setValue(e.parameter.fecha_limite);if(e.parameter.procedimiento)hoja.getRange(f,9).setValue(e.parameter.procedimiento);
    if(e.parameter.url_anuncio)hoja.getRange(f,10).setValue(e.parameter.url_anuncio);if(e.parameter.estado){hoja.getRange(f,12).setValue(e.parameter.estado);try{registrarActividad_(e.parameter.id,'ESTADO','Estado cambiado a: '+e.parameter.estado,'',{estado:e.parameter.estado});}catch(ea){}}
    if(e.parameter.descripcion)hoja.getRange(f,13).setValue(e.parameter.descripcion);ok=true;break;}}
    result={ok:ok,id:e.parameter.id};
  }
  else if (action === 'crear') {
    crearHojaOportunidadesSiNoExiste_();var ss=SpreadsheetApp.getActiveSpreadsheet();var hoja=ss.getSheetByName(HOJA_OPORTUNIDADES);
    var id='OPO-'+Utilities.formatDate(new Date(),'Europe/Madrid','yyyyMMdd-HHmmss-')+Math.floor(Math.random()*1000);
    hoja.appendRow([id,'MANUAL-'+Date.now(),e.parameter.fuente||'Manual',e.parameter.titulo||'',e.parameter.organismo||'',e.parameter.cpv||'',parseFloat(e.parameter.presupuesto)||0,e.parameter.fecha_limite||'',e.parameter.procedimiento||'',e.parameter.url_anuncio||'',50,'nueva',e.parameter.descripcion||'',new Date(),'','']);
    try{registrarActividad_(id,'CREACION','Oportunidad creada manualmente: '+(e.parameter.titulo||'').substring(0,80),'',{fuente:e.parameter.fuente||'Manual'});}catch(ea){}
    result={ok:true,id:id};
  }
  else if (action === 'descargar_pliegos') { result = descargarPliegosOportunidad(e.parameter.id); try{if(result.ok)registrarActividad_(e.parameter.id,'PLIEGOS','Pliegos descargados: '+(result.archivos||0)+' archivos','',{archivos:result.archivos});}catch(ea){} }
  else if (action === 'analizar') { result = analizarPliegosOportunidad(e.parameter.id); try{if(result.ok)registrarActividad_(e.parameter.id,'ANALISIS_IA','Análisis IA completado. Puntuación: '+(result.puntuacion_interes||0)+'/100','',{puntuacion:result.puntuacion_interes,lotes_creados:result.lotes_creados});}catch(ea){} }
  else if (action === 'actividad') result = actividadAPI_(e.parameter.id);
  else if (action === 'analisis') result = obtenerAnalisisAPI_(e.parameter.id);
  else if (action === 'load_calculo') result = cargarCalculoAPI_(e.parameter.id);
  else if (action === 'obtener_lotes') result = obtenerLotesAPI_(e.parameter.id_oportunidad);
  else if (action === 'resumen_lotes') result = resumenLotesAPI_(e.parameter.id_oportunidad);
  else if (action === 'cargar_calculo_lote') result = cargarCalculoLoteAPI_(e.parameter.oportunidad_id, e.parameter.id_lote);
  else if (action === 'aprobacion') result = obtenerAprobacionAPI_(e.parameter.id);
  else if (action === 'investigacion') result = obtenerInvestigacionAPI_(e.parameter.id);
  else if (action === 'resultado') result = obtenerResultadoAPI_(e.parameter.id);
  else if (action === 'seguimiento') result = obtenerSeguimientoAPI_(e.parameter.id);
  else if (action === 'resumen_contratos') result = obtenerResumenContratosAPI_();
  else if (action === 'batch_decisiones') result = batchPaginaDecisiones_(e.parameter.id);
  else if (action === 'batch_ofertas') result = batchPaginaOfertas_(e.parameter.id);
  else if (action === 'batch_seguimiento') result = batchPaginaSeguimiento_();

  // ── CONFIGURACIÓN ──
  else if (action === 'config') result = obtenerConfiguracion();
  else if (action === 'config_raw') result = obtenerConfigRawAPI_();
  else if (action === 'config_global') result = obtenerConfigGlobalAPI_();
  else if (action === 'modulo_config') result = obtenerModuloConfigAPI_(e.parameter.modulo);
  else if (action === 'convenios') result = obtenerConveniosAPI_();
  else if (action === 'categorias_convenio') result = obtenerCategoriasConvenioAPI_(e.parameter.id);
  else if (action === 'comparar_convenios') result = compararConveniosAPI_(e.parameter.categoria);
  else if (action === 'detectar_convenio') result = detectarConvenioAPI_(e.parameter.provincia, e.parameter.sector);
  else if (action === 'alertas_convenios') result = alertasConveniosAPI_();
  else if (action === 'mapa_convenios') result = mapaConveniosAPI_();
  else if (action === 'costes_referencia') result = obtenerCostesReferenciaAPI_();
  else if (action === 'conocimiento') result = obtenerDocumentosConocimientoAPI_();
  else if (action === 'conocimiento_stats') result = statsConocimientoAPI_();
  else if (action === 'conocimiento_buscar') result = buscarConocimientoAPI_(e.parameter.q, parseInt(e.parameter.limit)||8);

  // ── DOCUMENTOS Y DASHBOARDS ──
  else if (action === 'documentos_oferta') result = obtenerDocumentosOfertaAPI_(e.parameter.id);
  else if (action === 'documentos') result = obtenerDocumentosGeneralAPI_(e.parameter.modulo ? { modulo: e.parameter.modulo } : null);
  else if (action === 'alertas_documentos') result = alertasVencimientoDocumentos_();
  else if (action === 'dashboard') result = obtenerDashboardAPI_();

  // ── DASHBOARDS PESADOS — con caché ──────────────────────────────────────────
  else if (action === 'dashboard_360')        result = serverCache_('dash_360',  90, function() { return obtenerDashboard360_(); });
  else if (action === 'dashboard_rrhh')       result = serverCache_('dash_rrhh', 90, function() { return dashboardRRHH_(); });
  else if (action === 'dashboard_territorio') result = serverCache_('dash_terr', 90, function() { return dashboardTerritorioAPI_(); });
  else if (action === 'dashboard_sla')        result = serverCache_('dash_sla',  60, function() { return dashboardSLAAPI_(); });
  // ────────────────────────────────────────────────────────────────────────────

  else if (action === 'usuarios') result = obtenerUsuariosAPI_();
  else if (action === 'obtener_plantillas') result = obtenerPlantillasAPI_(e.parameter);

  // ── RRHH ──
  else if (action === 'empleados') result = obtenerEmpleadosAPI_(e.parameter.estado ? { estado: e.parameter.estado } : e.parameter.busqueda ? { busqueda: e.parameter.busqueda } : null);
  else if (action === 'empleado') result = obtenerEmpleadoAPI_(e.parameter.id);
  else if (action === 'expediente') result = obtenerExpedienteAPI_(e.parameter.id);
  else if (action === 'stats_rrhh') result = statsRRHH_();
  else if (action === 'asignaciones') result = obtenerAsignacionesAPI_(e.parameter.empleado ? { empleado: e.parameter.empleado } : e.parameter.proyecto ? { proyecto: e.parameter.proyecto } : null);
  else if (action === 'capacidad_empleado') result = capacidadEmpleado_(e.parameter.id);
  else if (action === 'coste_proyecto') result = costeRealProyecto_(e.parameter.id);
  else if (action === 'empleados_disponibles') result = empleadosDisponiblesAPI_(e.parameter.porcentaje ? parseInt(e.parameter.porcentaje) : null);
  else if (action === 'historial_centros_empleado') result = obtenerHistorialCentrosEmpleado_(e.parameter.id);
  else if (action === 'batch') result = batchAPI_(e.parameter);
  else if (action === 'batch_personal') result = batchPaginaPersonal_();
  else if (action === 'batch_subrogacion') result = batchPaginaSubrogacion_();

  // ── SUBROGACIÓN ──
  else if (action === 'subrogaciones') result = obtenerSubrogacionesAPI_(e.parameter.oportunidad ? { oportunidad: e.parameter.oportunidad } : null);
  else if (action === 'personal_subrogado') result = obtenerPersonalSubrogadoAPI_(e.parameter.id_subrogacion || null);
  else if (action === 'resumen_subrogacion') result = resumenSubrogacionParaLicitacion_(e.parameter.id_oportunidad || '');

  // ── FICHAJES ──
  else if (action === 'fichajes') result = obtenerFichajesAPI_(e.parameter);
  else if (action === 'horas_extra') result = obtenerHorasExtraAPI_(e.parameter.empleado_id ? {empleado_id:e.parameter.empleado_id} : e.parameter.mes ? {mes:e.parameter.mes} : null);
  else if (action === 'estado_fichaje') result = estadoFichajeHoy_(e.parameter.id_empleado || '');
  else if (action === 'resumen_diario_fichajes') result = resumenDiarioFichajes_(e.parameter.id_empleado || '', e.parameter.mes || '', e.parameter.anio || '');
  else if (action === 'resumen_mensual_fichajes') result = resumenMensualTodos_(e.parameter.mes || '', e.parameter.anio || '');
  else if (action === 'generar_informe_fichajes') result = generarInformeMensualFichajes_(e.parameter);
  else if (action === 'batch_supervision_fichajes') result = batchPaginaSupervisionFichajes_(e.parameter.mes, e.parameter.anio);

  // ── AUSENCIAS ──
  else if (action === 'ausencias') result = obtenerAusenciasAPI_(e.parameter);
  else if (action === 'resumen_vacaciones') result = resumenVacaciones_(e.parameter.id_empleado || '', e.parameter.anio || '');
  else if (action === 'calendario_ausencias') result = calendarioAusencias_(e.parameter.mes || '', e.parameter.anio || '');
  else if (action === 'dashboard_ausencias') result = dashboardAusencias_();
  else if (action === 'batch_ausencias') result = batchPaginaAusencias_();

  // ── PRL ──
  else if (action === 'prl_dashboard') result = dashboardPRL_();
  else if (action === 'prl_epis') result = obtenerEpisAPI_(e.parameter.empleado ? { empleado: e.parameter.empleado } : null);
  else if (action === 'prl_reconocimientos') result = obtenerReconocimientosAPI_(e.parameter.empleado ? { empleado: e.parameter.empleado } : null);
  else if (action === 'prl_formacion') result = obtenerFormacionPrlAPI_(e.parameter.empleado ? { empleado: e.parameter.empleado } : null);
  else if (action === 'prl_accidentes') result = obtenerAccidentesAPI_(e.parameter.empleado ? { empleado: e.parameter.empleado } : null);
  else if (action === 'alertas_caducidad') result = generarAlertasCaducidad_();

  // ── RGPD ──
  else if (action === 'rgpd_dashboard') result = dashboardRGPD_();
  else if (action === 'rgpd_consentimientos') result = obtenerConsentimientosAPI_(e.parameter.empleado ? { empleado: e.parameter.empleado } : null);
  else if (action === 'rgpd_arco') result = obtenerArcoAPI_(e.parameter.empleado ? { empleado: e.parameter.empleado } : null);
  else if (action === 'rgpd_tratamientos') result = obtenerTratamientosAPI_();
  else if (action === 'rgpd_brechas') result = obtenerBrechasAPI_();

  // ── TERRITORIO ──
  else if (action === 'centros') result = obtenerCentrosAPI_(e.parameter.estado ? { estado: e.parameter.estado } : e.parameter.municipio ? { municipio: e.parameter.municipio } : null);
  else if (action === 'centro') result = obtenerCentroAPI_(e.parameter.id);
  else if (action === 'mapa_operarios') result = mapaOperariosAPI_();
  else if (action === 'partes') result = obtenerPartesAPI_(e.parameter.centro_id ? { centro_id: e.parameter.centro_id } : e.parameter.empleado_id ? { empleado_id: e.parameter.empleado_id } : e.parameter.mes ? { mes: e.parameter.mes } : null);
  else if (action === 'incidencias') result = obtenerIncidenciasAPI_(e.parameter.centro_id ? { centro_id: e.parameter.centro_id } : e.parameter.estado ? { estado: e.parameter.estado } : null);
  else if (action === 'comentarios_incidencia') result = obtenerComentariosIncidencia_(e.parameter.id);
  else if (action === 'resumen_operativo') result = resumenOperativoCentro_(e.parameter.id);
  else if (action === 'batch_territorio') result = batchPaginaTerritorio_();
  else if (action === 'batch_partes') result = batchPaginaPartes_();
  else if (action === 'batch_ordenes') result = batchPaginaOrdenes_();

  // ── OPERACIONES V2 ──
  else if (action === 'partes_v2') result = obtenerPartesV2API_(e.parameter.centro_id ? {centro_id:e.parameter.centro_id} : e.parameter.empleado_id ? {empleado_id:e.parameter.empleado_id} : e.parameter.mes ? {mes:e.parameter.mes} : e.parameter.estado ? {estado:e.parameter.estado} : null);
  else if (action === 'parte_completo') result = obtenerParteCompletoAPI_(e.parameter.id);
  else if (action === 'checklist_centro') result = obtenerChecklistCentroAPI_(e.parameter.id);
  else if (action === 'checklist_ejecucion') result = obtenerChecklistEjecucionAPI_(e.parameter.id);
  else if (action === 'fotos_parte') result = obtenerFotosParteAPI_(e.parameter.id);
  else if (action === 'materiales_parte') result = obtenerMaterialesParteAPI_(e.parameter.id);
  else if (action === 'maquinaria_parte') result = obtenerMaquinariaParteAPI_(e.parameter.id);
  else if (action === 'catalogo_materiales') result = obtenerCatalogoMaterialesAPI_();
  else if (action === 'catalogo_maquinaria') result = obtenerCatalogoMaquinariaAPI_();
  else if (action === 'pl_contrato') result = obtenerPLContrato_(e.parameter.id, parseInt(e.parameter.meses)||6);
  else if (action === 'pl_mes_actual') result = calcularPLMesActualAPI_(e.parameter.id);
  else if (action === 'asistencia_dia') result = obtenerAsistenciaDiaAPI_(e.parameter.id, e.parameter.fecha);
  else if (action === 'tareas_dia') result = obtenerTareasDelDiaAPI_(e.parameter.id);

  // ── ÓRDENES ──
  else if (action === 'ordenes') result = obtenerOrdenesAPI_(e.parameter.centro_id ? {centro_id:e.parameter.centro_id} : e.parameter.empleado_id ? {empleado_id:e.parameter.empleado_id} : e.parameter.estado ? {estado:e.parameter.estado} : e.parameter.fecha ? {fecha:e.parameter.fecha} : null);
  else if (action === 'partes_de_orden') result = obtenerPartesDeOrdenAPI_(e.parameter.id);
  else if (action === 'ordenes_de_parte') result = obtenerOrdenesDeParte_(e.parameter.id);

  // ── INVENTARIO ──
  else if (action === 'stock_centro') result = obtenerStockCentroAPI_(e.parameter.id);
  else if (action === 'alertas_stock') result = obtenerAlertasStockAPI_(e.parameter.id||null);
  else if (action === 'pedidos') result = obtenerPedidosAPI_(e.parameter.id||'');

  // ── MAQUINARIA / VEHÍCULOS ──
  else if (action === 'mantenimientos') result = obtenerMantenimientosAPI_(e.parameter.id||'');
  else if (action === 'vehiculos') result = obtenerVehiculosAPI_();
  else if (action === 'combustible_vehiculo') result = obtenerCombustibleVehiculo_(e.parameter.id);

  // ── CALIDAD ──
  else if (action === 'inspecciones') result = obtenerInspeccionesAPI_(e.parameter.centro_id ? {centro_id:e.parameter.centro_id} : null);
  else if (action === 'nps_centro') result = obtenerNPSCentroAPI_(e.parameter.id);
  else if (action === 'acciones_correctivas') result = obtenerAccionesCorrectivas_(e.parameter.id||'');
  else if (action === 'dashboard_calidad') result = dashboardCalidadAPI_();

  // ── PORTAL CLIENTE ──
  else if (action === 'portal_cliente') result = obtenerDatosPortalCliente_(e.parameter.portal_token || e.parameter.token);
  else if (action === 'tokens_cliente') result = obtenerTokensClienteAPI_();

  // ── PLANIFICACIÓN ──
  else if (action === 'servicios_programados') result = obtenerServiciosProgramados_(e.parameter.centro_id ? {centro_id:e.parameter.centro_id} : e.parameter.empleado_id ? {empleado_id:e.parameter.empleado_id} : null);
  else if (action === 'cuadrante_semanal') result = obtenerCuadranteSemanal_(e.parameter.semana||'');
  else if (action === 'sustituciones') result = obtenerSustituciones_(e.parameter.fecha||'');
  else if (action === 'batch_planificacion') result = batchPaginaPlanificacion_(e.parameter.semana);

  // ── INFORMES PESADOS — con caché ────────────────────────────────────────────
  else if (action === 'informe_costes_contrato') {
    var claveCostesC = 'inf_cc_' + (e.parameter.id||'') + '_' + (e.parameter.mes_desde||'') + '_' + (e.parameter.mes_hasta||'');
    var paramsCC = { mes_desde: e.parameter.mes_desde, mes_hasta: e.parameter.mes_hasta };
    var idCC = e.parameter.id;
    result = serverCache_(claveCostesC, 300, function() { return informeCostesContratoAPI_(idCC, paramsCC); });
  }
  else if (action === 'informe_licitaciones') {
    result = serverCache_('inf_lic', 300, function() { return informeLicitacionesAPI_({}); });
  }
  else if (action === 'informe_rrhh') {
    var mesRRHH = e.parameter.mes || Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM');
    result = serverCache_('inf_rrhh_' + mesRRHH, 300, function() { return informeRRHHAPI_({ mes: mesRRHH }); });
  }
  else if (action === 'informe_territorio') {
    var mesTerr = e.parameter.mes || Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM');
    var claveTerr = 'inf_terr_' + mesTerr + (e.parameter.centro_id ? '_' + e.parameter.centro_id : '');
    result = serverCache_(claveTerr, 300, function() { return informeTerritorioAPI_({ mes: mesTerr, centro_id: e.parameter.centro_id }); });
  }
  else if (action === 'informe_economico_global') {
    result = serverCache_('inf_eco', 300, function() { return informeEconomicoGlobalAPI_({}); });
  }
  else if (action === 'informe_rendimiento') {
    result = serverCache_('inf_rend', 300, function() { return informeRendimientoProyectos_(); });
  }
  // ────────────────────────────────────────────────────────────────────────────

  // ── CALENDARIO LABORAL ──
  else if (action === 'festivos') result = obtenerFestivosAPI_(e.parameter.anio, e.parameter.tipo);
  else if (action === 'dia_laborable') result = consultarDiaLaborableAPI_(e.parameter.fecha, e.parameter.municipio, e.parameter.convenio_id);
  else if (action === 'dias_laborables') result = diasLaborablesAPI_(e.parameter.desde, e.parameter.hasta, e.parameter.municipio, e.parameter.convenio_id);

  // ── CERTIFICACIONES / CARNETS ──
  else if (action === 'certificaciones') result = obtenerCertificacionesAPI_(e.parameter.empleado_id ? {empleado_id:e.parameter.empleado_id} : e.parameter.tipo ? {tipo:e.parameter.tipo} : e.parameter.estado ? {estado:e.parameter.estado} : null);
  else if (action === 'certificaciones_empleado') result = certificacionesEmpleado_(e.parameter.id);
  else if (action === 'dashboard_certificaciones') result = dashboardCertificaciones_();
  else if (action === 'batch_certificaciones') result = batchPaginaCertificaciones_();

  // ── PLANTILLAS OFERTA CPV ──
  else if (action === 'obtener_plantillas_cpv') result = obtenerPlantillasCPV_API_(e.parameter.familia_cpv ? { familia_cpv: e.parameter.familia_cpv } : null);

  // ── ESCANEO DOCUMENTOS / EXPEDIENTE ──
  else if (action === 'bandeja_docs') result = obtenerBandejaDocs_(e.parameter.estado ? { estado: e.parameter.estado } : null);
  else if (action === 'dashboard_escaneo') result = dashboardEscaneo_();

  // ── BÚSQUEDA GLOBAL ──
  else if (action === 'busqueda_global') result = busquedaGlobalAPI_(e.parameter.q);

  else result = { error: 'Acción GET no válida: ' + action };

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}


// ════════════════════════════════════════════════════════════════════════════
// doPost — ORIGINAL v3.1 con nombres de funciones correctos
// ════════════════════════════════════════════════════════════════════════════

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || '';
    var result;

    // ── VALIDACIÓN DE TOKEN ──
    if (ACCIONES_PUBLICAS.indexOf(action) === -1) {
      var emailAuth = verificarAuthDoPost_(data);
      if (!emailAuth) {
        return ContentService.createTextOutput(
          JSON.stringify({ ok: false, code: 401, error: 'Token inválido o expirado' })
        ).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // ── LOGIN / USUARIOS ──
    if (action === 'login') {
      result = loginAPI_(data.email, data.password);
    } else if (action === 'add_usuario') {
      result = agregarUsuario_(data);
    } else if (action === 'update_usuario') {
      result = actualizarUsuario_(data);
    } else if (action === 'delete_usuario') {
      result = eliminarUsuario_(data.email);

    // ── LICITACIONES ──
    } else if (action === 'upload') {
      result = guardarArchivoEnDrive_(data);
    } else if (action === 'extraer_datos_pliego') {
      result = extraerDatosPliego_(data);
    } else if (action === 'save_calculo') {
      result = guardarCalculoAPI_(data);
    } else if (action === 'crear_lotes_desde_analisis') {
      result = crearLotesDesdeAnalisis_(data.id_oportunidad);
    } else if (action === 'actualizar_lote') {
      result = actualizarLoteAPI_(data);
    } else if (action === 'guardar_calculo_lote') {
      result = guardarCalculoLoteAPI_(data);
    } else if (action === 'registrar_resultado') {
      result = registrarResultado_(data);
      try{if(result.ok)registrarActividad_(data.oportunidad_id,'RESULTADO','Resultado registrado: '+(data.resultado||''),'',{resultado:data.resultado,importe:data.importe_adjudicacion});}catch(ea){}
    } else if (action === 'registrar_seguimiento') {
      result = registrarSeguimientoMensual_(data);
    } else if (action === 'investigar_historico') {
      result = investigarHistoricoLicitacion_(data.oportunidad_id);
    } else if (action === 'recomendar_precio') {
      result = recomendarPrecioIA_(data);
    } else if (action === 'aprobar_direccion') {
      result = aprobarDireccion_(data);
      try{if(result&&result.ok)registrarActividad_(data.oportunidad_id,'APROBACION','Decisión Dirección: '+(data.estado||''),'',{estado:data.estado,notas:data.notas});}catch(ea){}
    } else if (action === 'generar_documento') {
      result = generarDocumentoOferta_(data.oportunidad_id, data.tipo);
    } else if (action === 'generar_todos_documentos') {
      result = generarTodosDocumentosOferta_(data.oportunidad_id);

    // ── CONVENIOS / COSTES / CONFIG ──
    } else if (action === 'upload_convenio') {
      result = subirYProcesarConvenio(data);
    } else if (action === 'delete_convenio') {
      result = eliminarConvenio_(data.id);
    } else if (action === 'buscar_convenio_auto') {
      result = buscarConvenioAplicable_(data.provincia, data.sector);
    } else if (action === 'add_coste_ref') {
      result = addCosteReferencia_(data);
    } else if (action === 'update_coste_ref') {
      result = updateCosteReferencia_(data);
    } else if (action === 'delete_coste_ref') {
      result = deleteCosteReferencia_(data);
    } else if (action === 'add_config') {
      result = addConfigItem_(data);
    } else if (action === 'update_config') {
      result = updateConfigItem_(data);
    } else if (action === 'delete_config') {
      result = deleteConfigItem_(data);
    } else if (action === 'guardar_config_global') {
      result = guardarConfigGlobalAPI_(data);

    // ── CONOCIMIENTO ──
    } else if (action === 'upload_conocimiento') {
      result = subirDocumentoConocimiento_(data);
    } else if (action === 'delete_conocimiento') {
      result = eliminarDocumentoConocimiento_(data.id);

    // ── DOCUMENTOS ──
    } else if (action === 'upload_documento_general') {
      result = subirYClasificarDocumento_(data);
    } else if (action === 'reclasificar_documento') {
      result = reclasificarDocumento_(data);

    // ── RRHH PERSONAL ──
    } else if (action === 'add_empleado') {
      result = agregarEmpleado_(data);
      if (result.ok && data.centro) { try { sincronizarAltaEmpleadoACentro_(result.id, data); } catch(e) {} }
    } else if (action === 'update_empleado') {
      var centroAntes = obtenerCentroActualEmpleado_(data.id);
      result = actualizarEmpleado_(data);
      if (result.ok && data.centro !== undefined) { try { sincronizarCambiocentroEmpleado_(data.id, centroAntes, data.centro, data); } catch(e) {} }
    } else if (action === 'baja_empleado') {
      result = darBajaEmpleado_(data);
      if (result.ok) { try { sincronizarBajaEmpleado_(data.id); } catch(e) {} }
    } else if (action === 'reactivar_empleado') {
      result = reactivarEmpleado_(data);
    } else if (action === 'add_asignacion') {
      result = agregarAsignacion_(data);
    } else if (action === 'update_asignacion') {
      result = actualizarAsignacion_(data);
    } else if (action === 'finalizar_asignacion') {
      result = finalizarAsignacion_(data);

    // ── PRL ──
    } else if (action === 'add_epi') {
      result = agregarEpi_(data);
    } else if (action === 'add_reconocimiento') {
      result = agregarReconocimiento_(data);
    } else if (action === 'add_formacion_prl') {
      result = agregarFormacionPrl_(data);
    } else if (action === 'add_accidente') {
      result = agregarAccidente_(data);
    } else if (action === 'generar_recibi_epi') {
      result = generarRecibiEPI_(data);
    } else if (action === 'generar_notif_reconocimiento') {
      result = generarNotificacionReconocimiento_(data);
    } else if (action === 'generar_acta_formacion') {
      result = generarActaFormacion_(data);
    } else if (action === 'generar_aviso_caducidad') {
      result = generarAvisoCaducidad_(data);
    } else if (action === 'eliminar_epi') {
      result = eliminarRegistro_('PRL_EPIS', data.id);
    } else if (action === 'eliminar_reconocimiento') {
      result = eliminarRegistro_('PRL_RECONOCIMIENTOS', data.id);
    } else if (action === 'eliminar_formacion_prl') {
      result = eliminarRegistro_('PRL_FORMACION', data.id);
    } else if (action === 'eliminar_accidente') {
      result = eliminarRegistro_('PRL_ACCIDENTES', data.id);

    // ── RGPD ──
    } else if (action === 'add_consentimiento') {
      result = agregarConsentimiento_(data);
    } else if (action === 'revocar_consentimiento') {
      result = revocarConsentimiento_(data);
    } else if (action === 'add_arco') {
      result = agregarArco_(data);
    } else if (action === 'responder_arco') {
      result = responderArco_(data);
    } else if (action === 'add_tratamiento') {
      result = agregarTratamiento_(data);
    } else if (action === 'add_brecha') {
      result = agregarBrecha_(data);
    } else if (action === 'generar_doc_consentimiento') {
      result = generarDocConsentimiento_(data);
    } else if (action === 'generar_doc_arco') {
      result = generarDocArco_(data);
    } else if (action === 'eliminar_consentimiento') {
      result = eliminarRegistro_('RGPD_CONSENTIMIENTOS', data.id);
    } else if (action === 'eliminar_arco') {
      result = eliminarRegistro_('RGPD_ARCO', data.id);
    } else if (action === 'eliminar_tratamiento') {
      result = eliminarRegistro_('RGPD_TRATAMIENTOS', data.id);
    } else if (action === 'eliminar_brecha') {
      result = eliminarRegistro_('RGPD_BRECHAS', data.id);

    // ── SUBROGACIÓN ──
    } else if (action === 'crear_subrogacion') {
      result = crearSubrogacion_(data);
    } else if (action === 'add_personal_subrogado') {
      result = agregarPersonalSubrogado_(data);
    } else if (action === 'verificar_personal_subrogado') {
      result = verificarPersonalSubrogado_(data);
    } else if (action === 'importar_listado_subrogacion') {
      result = importarListadoSubrogacion_(data);
    } else if (action === 'incorporar_subrogado_rrhh') {
      result = incorporarSubrogadoRRHH_(data);
    } else if (action === 'incorporar_subrogado_forzado') {
      result = incorporarSubrogadoForzado_(data);
    } else if (action === 'incorporar_subrogado_sin_dni_check') {
      result = incorporarSubrogadoSinDniCheck_(data);
    } else if (action === 'generar_carta_subrogacion') {
      result = generarCartaSubrogacion_(data);
    } else if (action === 'eliminar_personal_subrogado') {
      result = eliminarRegistro_('PERSONAL_SUBROGADO', data.id);
      if (data.id_subrogacion) actualizarTotalesSubrogacion_(data.id_subrogacion);
    } else if (action === 'eliminar_subrogacion') {
      result = eliminarRegistro_('SUBROGACIONES', data.id);
    } else if (action === 'actualizar_datos_personales_subrogado') {
      result = actualizarDatosPersonalesSubrogado_(data);
    } else if (action === 'marcar_contactado_subrogado') {
      result = marcarContactadoSubrogado_(data);

    // ── FICHAJES ──
    } else if (action === 'fichar') {
      result = fichar_(data);
    } else if (action === 'validar_fichaje') {
      result = validarFichaje_(data);
    } else if (action === 'aprobar_horas_extra') {
      result = aprobarHorasExtra_(data);
    } else if (action === 'generar_informe_fichajes') {
      result = generarInformeMensualFichajes_(data);

    // ── AUSENCIAS ──
    } else if (action === 'solicitar_ausencia') {
      result = solicitarAusencia_(data);
    } else if (action === 'aprobar_ausencia') {
      result = aprobarAusencia_(data);
    } else if (action === 'eliminar_ausencia') {
      result = eliminarRegistro_('AUSENCIAS', data.id);

    // ── PLANTILLAS ──
    } else if (action === 'obtener_plantillas') {
      result = obtenerPlantillasAPI_(data);
    } else if (action === 'registrar_plantilla') {
      result = registrarPlantilla_(data);
    } else if (action === 'crear_plantilla_vacia') {
      result = crearPlantillaVacia_(data);
    } else if (action === 'generar_desde_plantilla') {
      result = generarDesdePlantilla_(data);
    } else if (action === 'actualizar_plantilla') {
      result = actualizarPlantilla_(data);
    } else if (action === 'obtener_etiquetas_plantilla') {
      result = obtenerEtiquetasPlantilla_(data.id);

    // ── TERRITORIO ──
    } else if (action === 'crear_centro') {
      result = crearCentro_(data);
    } else if (action === 'actualizar_centro') {
      result = actualizarCentro_(data);
    } else if (action === 'eliminar_centro') {
      result = eliminarCentro_(data.id);
    } else if (action === 'asignar_personal_centro') {
      result = asignarPersonalCentro_(data);
      if (result.ok && data.empleado_id && data.centro_id) { try { sincronizarAsignacionAEmpleado_(data.empleado_id, data.centro_id); } catch(e) {} }
    } else if (action === 'desasignar_personal_centro') {
      var _empIdDesasig = '', _centroIdDesasig = '';
      try { var _hAsig = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ASIGNACIONES_CENTROS'); if (_hAsig) { var _dAsig = _hAsig.getDataRange().getValues(); for (var _ai=1;_ai<_dAsig.length;_ai++) { if (_dAsig[_ai][0]===data.id) { _empIdDesasig=String(_dAsig[_ai][2]); _centroIdDesasig=String(_dAsig[_ai][1]); break; } } } } catch(e) {}
      result = desasignarPersonalCentro_(data.id);
      if (result.ok && _empIdDesasig) { try { sincronizarDesasignacionAEmpleado_(_empIdDesasig, _centroIdDesasig); } catch(e) {} }
    } else if (action === 'importar_centros_oportunidad') {
      result = importarCentrosDesdeOportunidad_(data.oportunidad_id);
    } else if (action === 'crear_parte') {
      result = crearParte_(data);
    } else if (action === 'actualizar_parte') {
      result = actualizarParte_(data);
    } else if (action === 'eliminar_parte') {
      result = eliminarParte_(data.id);
    } else if (action === 'crear_incidencia') {
      result = crearIncidenciaSLA_(data);
    } else if (action === 'crear_incidencia_legacy') {
      result = crearIncidencia_(data);
    } else if (action === 'update_incidencia') {
      result = actualizarIncidenciaSLA_(data);
    } else if (action === 'resolver_incidencia') {
      result = resolverIncidencia_(data);
    } else if (action === 'asignar_incidencia') {
      result = asignarIncidencia_(data);
    } else if (action === 'agregar_comentario_incidencia') {
      result = agregarComentarioIncidencia_(data);

    // ── OPERACIONES V2 ──
    } else if (action === 'eliminar_parte_v2') {
      result = eliminarParteV2_(data.id);
    } else if (action === 'iniciar_parte') {
      result = iniciarParteAPI_(data);
    } else if (action === 'finalizar_parte') {
      result = finalizarParteAPI_(data);
    } else if (action === 'actualizar_checklist_exec') {
      result = actualizarChecklistEjecucionAPI_(data);
    } else if (action === 'registrar_foto_parte') {
      result = registrarFotoParteAPI_(data);
    } else if (action === 'registrar_firma') {
      result = registrarFirmaAPI_(data);
    } else if (action === 'registrar_material_parte') {
      result = registrarMaterialParteAPI_(data);
    } else if (action === 'eliminar_material_parte') {
      result = eliminarMaterialParteAPI_(data.id);
    } else if (action === 'registrar_maquinaria_parte') {
      result = registrarMaquinariaParteAPI_(data);
    } else if (action === 'crear_checklist_item') {
      result = crearChecklistItemAPI_(data);
    } else if (action === 'actualizar_checklist_item') {
      result = actualizarChecklistItemAPI_(data);
    } else if (action === 'eliminar_checklist_item') {
      result = eliminarChecklistItemAPI_(data.id);
    } else if (action === 'copiar_checklist') {
      result = copiarChecklistAPI_(data.origen_id, data.destino_id);
    } else if (action === 'crear_material_catalogo') {
      result = crearMaterialCatalogoAPI_(data);
    } else if (action === 'crear_maquinaria_catalogo') {
      result = crearMaquinariaCatalogoAPI_(data);
    } else if (action === 'generar_informe_mensual') {
      result = generarInformeMensualClienteAPI_(data);

    // ── ÓRDENES ──
    } else if (action === 'crear_orden') {
      result = crearOrdenTrabajo_(data);
    } else if (action === 'actualizar_estado_orden') {
      result = actualizarEstadoOrden_(data.id, data.estado, data);
    } else if (action === 'eliminar_orden') {
      result = eliminarOrden_(data.id);

    // ── INVENTARIO ──
    } else if (action === 'ajustar_stock') {
      result = ajustarStockCentroAPI_(data);
    } else if (action === 'crear_pedido') {
      result = crearPedidoProveedorAPI_(data);
    } else if (action === 'actualizar_estado_pedido') {
      result = actualizarEstadoPedido_(data.id, data.estado);

    // ── MAQUINARIA ──
    } else if (action === 'crear_mantenimiento') {
      result = crearMantenimientoAPI_(data);
    } else if (action === 'registrar_mant_realizado') {
      result = registrarMantenimientoRealizado_(data.id, data);

    // ── VEHÍCULOS ──
    } else if (action === 'crear_vehiculo') {
      result = crearVehiculoAPI_(data);
    } else if (action === 'actualizar_vehiculo') {
      result = actualizarVehiculoAPI_(data);
    } else if (action === 'registrar_repostaje') {
      result = registrarRepostaje_(data);

    // ── CALIDAD ──
    } else if (action === 'crear_inspeccion') {
      result = crearInspeccionAPI_(data);
    } else if (action === 'registrar_nps') {
      result = registrarNPSAPI_(data);
    } else if (action === 'crear_accion_correctiva') {
      result = crearAccionCorrectiva_(data);
    } else if (action === 'cerrar_accion_correctiva') {
      result = cerrarAccionCorrectiva_(data.id, data.resultado);

    // ── PORTAL CLIENTE ──
    } else if (action === 'generar_token_cliente') {
      result = generarTokenClienteAPI_(data);
    } else if (action === 'revocar_token') {
      result = revocarTokenAPI_(data.id);

    // ── PLANIFICACIÓN ──
    } else if (action === 'crear_servicio_programado') {
      result = crearServicioProgramado_(data);
    } else if (action === 'eliminar_servicio_programado') {
      result = eliminarServicioProgramado_(data.id);
    } else if (action === 'crear_sustitucion') {
      result = crearSustitucion_(data);

    // ── CALENDARIO LABORAL ──
    } else if (action === 'crear_festivo') {
      result = crearFestivo_(data);
    } else if (action === 'actualizar_festivo') {
      result = actualizarFestivo_(data);
    } else if (action === 'eliminar_festivo') {
      result = eliminarFestivo_(data.id);
    } else if (action === 'cargar_festivos_nacionales') {
      result = cargarFestivosNacionales_(parseInt(data.anio) || new Date().getFullYear());
    } else if (action === 'programar_servicio_rango') {
      result = programarServicioRango_(data);

    // ── CERTIFICACIONES / CARNETS ──
    } else if (action === 'agregar_certificacion') {
      result = agregarCertificacion_(data);
    } else if (action === 'actualizar_certificacion') {
      result = actualizarCertificacion_(data);
    } else if (action === 'eliminar_certificacion') {
      result = eliminarCertificacion_(data.id);

    // ── PLANTILLAS CPV ──
    } else if (action === 'guardar_plantilla_cpv') {
      result = guardarPlantillaCPV_API_(data);
    } else if (action === 'eliminar_plantilla_cpv') {
      result = eliminarPlantillaCPV_API_(data.id);

    // ── ESCANEO DOCUMENTOS / EXPEDIENTE ──
    } else if (action === 'procesar_documento_auto') {
      result = procesarDocumentoAutomatico_(data);
    } else if (action === 'resolver_doc_bandeja') {
      result = resolverDocBandeja_(data);
    } else if (action === 'descartar_doc_bandeja') {
      result = descartarDocBandeja_(data.id);


    // ── ALIASES — nombres alternativos que envía api.ts ────────────────────────
    // Territorio
    } else if (action === 'add_centro') {
      result = crearCentro_(data);
    } else if (action === 'update_centro') {
      result = actualizarCentro_(data);
    } else if (action === 'asignar_empleado_centro') {
      result = asignarPersonalCentro_(data);
      if (result.ok && data.empleado_id && data.centro_id) { try { sincronizarAsignacionAEmpleado_(data.empleado_id, data.centro_id); } catch(e) {} }
    } else if (action === 'desasignar_empleado') {
      result = desasignarPersonalCentro_(data.id);
    // Partes V2
    } else if (action === 'crear_parte_v2') {
      result = iniciarParteAPI_(data);
    } else if (action === 'cerrar_parte_v2') {
      result = finalizarParteAPI_(data);
    // Partes legacy
    } else if (action === 'add_parte') {
      result = crearParte_(data);
    } else if (action === 'update_parte') {
      result = actualizarParte_(data);
    // Incidencias
    } else if (action === 'create_incidencia') {
      result = crearIncidenciaSLA_(data);
    } else if (action === 'add_comentario_incidencia') {
      result = agregarComentarioIncidencia_(data);
    // Checklist ejecucion
    } else if (action === 'actualizar_checklist_ejecucion') {
      result = actualizarChecklistEjecucionAPI_(data);
    // Soft delete / papelera
    } else if (action === 'archivar_oportunidad') {
      result = archivarOportunidad_(data.id);
    } else if (action === 'restaurar_oportunidad') {
      result = restaurarOportunidad_(data.id);
    } else if (action === 'restaurar_empleado') {
      result = reactivarEmpleado_(data);
    } else if (action === 'restaurar_papelera') {
      result = restaurarDePapelera_(data.id_papelera);
    } else if (action === 'papelera') {
      result = obtenerPapelera_(data.hoja);
    } else {
      result = { ok: false, error: 'Acción POST no válida: ' + action };
    }

    invalidarCacheServidor_(action);
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}