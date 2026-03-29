const API_BASE = 'https://script.google.com/macros/s/AKfycby2jL6JziygK3H05w4jwIEeFIwsho547cBBxpegfuaW1Ankwa2NnW7FYSO62rQiZ17rmw/exec'

function getToken(): string { return localStorage.getItem('auth_token') || '' }

// ═══ TTLs por tipo de dato ═══════════════════════════════════════════════════
const TTL: Record<string, number> = {
  convenios: 3600000, costes_referencia: 3600000, config: 3600000,
  usuarios: 1800000, mapa_convenios: 3600000,
  oportunidades: 30000, empleados: 60000, ausencias: 30000,
  fichajes: 15000, analisis: 60000, load_calculo: 60000,
  obtener_lotes: 15000, batch_decisiones: 15000,
  dashboard: 60000, stats: 60000, stats_rrhh: 60000,
}
const DEFAULT_TTL  = 60000
const STALE_TTL    = 3600000
const CACHE_PREFIX = 'fc_'

function getTTL(action: string): number {
  for (const key of Object.keys(TTL)) { if (action.includes(key)) return TTL[key] }
  return DEFAULT_TTL
}

function cacheGet(key: string, action: string): { data: any; fresh: boolean } | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const entry = JSON.parse(raw)
    const age = Date.now() - entry.ts
    const ttl = getTTL(action)
    if (age < ttl) return { data: entry.data, fresh: true }
    if (age < STALE_TTL) return { data: entry.data, fresh: false }
    localStorage.removeItem(CACHE_PREFIX + key)
    return null
  } catch { return null }
}

function cacheSet(key: string, data: any) {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

export function cacheInvalidate(prefix?: string) {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX))
  if (!prefix) { keys.forEach(k => localStorage.removeItem(k)); return }
  keys.filter(k => k.includes(prefix)).forEach(k => localStorage.removeItem(k))
}

function refreshInBackground(action: string, params?: Record<string, string>) {
  const cacheKey = `${action}:${JSON.stringify(params || {})}`
  let url = `${API_BASE}?action=${action}&token=${encodeURIComponent(getToken())}`
  if (params) { for (const [k, v] of Object.entries(params)) url += `&${k}=${encodeURIComponent(String(v))}` }
  fetch(url).then(r => r.json()).then(data => { if (data.code !== 401) cacheSet(cacheKey, data) }).catch(() => {})
}

async function fetchAPI(action: string, params?: Record<string, string>): Promise<any> {
  let url = `${API_BASE}?action=${action}&token=${encodeURIComponent(getToken())}`
  if (params) { for (const [k, v] of Object.entries(params)) url += `&${k}=${encodeURIComponent(String(v ?? ''))}` }
  const cacheKey = `${action}:${JSON.stringify(params || {})}`
  const cached = cacheGet(cacheKey, action)
  if (cached?.fresh) return cached.data
  if (cached && !cached.fresh) { refreshInBackground(action, params); return cached.data }
  const r = await fetch(url)
  if (!r.ok) throw new Error('HTTP ' + r.status)
  const data = await r.json()
  if (data.code === 401) { localStorage.removeItem('auth_token'); localStorage.removeItem('usuario'); window.location.href = '/login'; throw new Error('No autorizado') }
  cacheSet(cacheKey, data)
  return data
}

async function postAPI(data: any): Promise<any> {
  const payload = { ...data, token: getToken() }
  const r = await fetch(API_BASE, { method: 'POST', body: JSON.stringify(payload) })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  const resp = await r.json()
  if (resp.code === 401) { localStorage.removeItem('auth_token'); localStorage.removeItem('usuario'); window.location.href = '/login'; throw new Error('No autorizado') }
  const a = data.action || ''
  if (a.includes('fichar') || a.includes('fichaj')) { cacheInvalidate('fichaj'); cacheInvalidate('estado_fichaje'); cacheInvalidate('resumen') }
  else if (a.includes('ausenc')) { cacheInvalidate('ausenc'); cacheInvalidate('vacacion'); cacheInvalidate('calendario') }
  else if (a.includes('emplead') || a.includes('subrogad') || a.includes('incorpor')) { cacheInvalidate('emplead'); cacheInvalidate('stats_rrhh'); cacheInvalidate('batch_personal') }
  else if (a.includes('lote')) { cacheInvalidate('obtener_lotes'); cacheInvalidate('resumen_lotes') }
  else if (a.includes('calculo') || a.includes('calcul')) { cacheInvalidate('load_calculo'); cacheInvalidate('cargar_calculo'); cacheInvalidate('batch_decisiones') }
  else if (a.includes('analiz') || a.includes('extrae')) { cacheInvalidate('analisis'); cacheInvalidate('obtener_lotes'); cacheInvalidate('batch_decisiones') }
  else if (a.includes('descargar') || a.includes('pliegos')) { cacheInvalidate('detalle'); cacheInvalidate('oportunidades') }
  else if (a.includes('oportun') || a.includes('result') || a.includes('aprobac')) { cacheInvalidate('oportunidades'); cacheInvalidate('detalle'); cacheInvalidate('stats'); cacheInvalidate('dashboard'); cacheInvalidate('batch') }
  else if (a.includes('prl') || a.includes('epi') || a.includes('reconoc') || a.includes('formacion') || a.includes('accidente')) { cacheInvalidate('prl_'); cacheInvalidate('alertas_caducidad') }
  else if (a.includes('rgpd') || a.includes('consentim') || a.includes('arco') || a.includes('tratam') || a.includes('brecha')) { cacheInvalidate('rgpd_') }
  else if (a.includes('convenio')) { cacheInvalidate('convenio'); cacheInvalidate('mapa_convenio') }
  else if (a.includes('config')) { cacheInvalidate('config') }
  else if (a.includes('plantilla')) { cacheInvalidate('plantilla') }
  else if (!a.includes('generar') && !a.includes('upload') && !a.includes('investigar') && !a.includes('recomendar') && !a.includes('login')) { cacheInvalidate() }
  return resp
}

function prefetchCommonData() {
  const actions = ['oportunidades', 'estadisticas', 'empleados', 'mapa_convenios']
  actions.forEach(a => {
    const key = `${a}:{}`
    if (!cacheGet(key, a)?.fresh) {
      fetch(`${API_BASE}?action=${a}&token=${encodeURIComponent(getToken())}`)
        .then(r => r.json()).then(d => { if (d.code !== 401) cacheSet(key, d) }).catch(() => {})
    }
  })
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export interface Stats { total: number; nueva: number; en_analisis: number; go: number; no_go: number }

export const api = {
  invalidarCache: () => cacheInvalidate(),
  prefetch: () => prefetchCommonData(),
  login: (email: string, password: string) => postAPI({ action: 'login', email, password }),
  extraerDatosPliego: (data: any) => postAPI({ action: 'extraer_datos_pliego', ...data }),
  batch: (acciones: string[], id?: string) => fetchAPI('batch', { acciones: acciones.join(','), ...(id ? { id } : {}) }),
  batchDecisiones:  (id: string) => { cacheInvalidate('batch_decisiones'); return fetchAPI('batch_decisiones', { id }) },
  batchOfertas:     (id: string) => fetchAPI('batch_ofertas', { id }),
  batchSeguimiento: () => fetchAPI('batch_seguimiento'),
  batchSubrogacion: () => fetchAPI('batch_subrogacion'),
  batchPersonal:    () => fetchAPI('batch_personal'),
  batchAusencias:   () => fetchAPI('batch_ausencias'),
  dashboard:        () => fetchAPI('dashboard'),
  dashboard360:     () => fetchAPI('dashboard_360'),
  oportunidades:    () => fetchAPI('oportunidades'),
  stats:            () => fetchAPI('stats') as Promise<Stats>,
  buscar: async () => { cacheInvalidate('oportunidades'); cacheInvalidate('stats'); cacheInvalidate('dashboard'); return fetchAPI('buscar') },
  crearOportunidad: (data: any) => { cacheInvalidate('oportunidades'); cacheInvalidate('stats'); return fetchAPI('crear', { titulo: data.titulo||'', organismo: data.organismo||'', cpv: data.cpv||'', presupuesto: String(data.presupuesto||0), fecha_limite: data.fecha_limite||'', procedimiento: data.procedimiento||'', url_anuncio: data.url||'', descripcion: data.descripcion||'', fuente: data.fuente||'Manual', notas: data.notas||'' }) },
  detalle: (id: string) => fetchAPI('detalle', { id }),
  actualizar: async (id: string, data: any) => {
    cacheInvalidate('detalle'); cacheInvalidate('oportunidades')
    const p: Record<string, string> = { id }
    if (data.titulo) p.titulo = data.titulo; if (data.organismo) p.organismo = data.organismo
    if (data.cpv) p.cpv = data.cpv; if (data.presupuesto) p.presupuesto = String(data.presupuesto)
    if (data.fecha_limite) p.fecha_limite = data.fecha_limite; if (data.procedimiento) p.procedimiento = data.procedimiento
    if (data.url) p.url_anuncio = data.url; if (data.estado) p.estado = data.estado
    if (data.descripcion) p.descripcion = data.descripcion; if (data.notas) p.notas = data.notas
    return fetchAPI('actualizar', p)
  },
  descargarPliegos: async (id: string) => { const r = await fetchAPI('descargar_pliegos', { id }); cacheInvalidate('detalle'); cacheInvalidate('oportunidades'); return r },
  analizarPliegos: async (id: string) => { const r = await fetchAPI('analizar', { id }); cacheInvalidate('analisis'); cacheInvalidate('obtener_lotes'); cacheInvalidate('detalle'); cacheInvalidate('batch_decisiones'); return r },
  obtenerAnalisis:  (id: string) => fetchAPI('analisis', { id }),
  obtenerLotes: (id_oportunidad: string) => { cacheInvalidate('obtener_lotes'); return fetchAPI('obtener_lotes', { id_oportunidad }) },
  resumenLotes:     (id_oportunidad: string) => fetchAPI('resumen_lotes', { id_oportunidad }),
  crearLotesDesdeAnalisis: async (id_oportunidad: string) => { const r = await postAPI({ action: 'crear_lotes_desde_analisis', id_oportunidad }); cacheInvalidate('obtener_lotes'); cacheInvalidate('detalle'); return r },
  actualizarLote:   (data: any) => postAPI({ action: 'actualizar_lote', ...data }),
  guardarCalculoLote:(data: any) => postAPI({ action: 'guardar_calculo_lote', ...data }),
  cargarCalculoLote:(oportunidad_id: string, id_lote: string) => fetchAPI('cargar_calculo_lote', { oportunidad_id, id_lote }),
  guardarCalculo:   (id: string, json: string) => postAPI({ action: 'save_calculo', oportunidad_id: id, json_datos: json }),
  cargarCalculo:    (id: string) => fetchAPI('load_calculo', { id }),
  investigacion:    (id: string) => fetchAPI('investigacion', { id }),
  investigarHistorico:(id: string) => postAPI({ action: 'investigar_historico', oportunidad_id: id }),
  recomendarPrecio: (data: any) => postAPI({ action: 'recomendar_precio', ...data }),
  obtenerAprobacion:(id: string) => fetchAPI('aprobacion', { id }),
  aprobarDireccion: (data: any) => postAPI({ action: 'aprobar_direccion', ...data }),
  config:           () => fetchAPI('config'),
  configRaw:        () => fetchAPI('config_raw'),
  addConfig:        (data: any) => postAPI({ action: 'add_config', ...data }),
  updateConfig:     (data: any) => postAPI({ action: 'update_config', ...data }),
  deleteConfig:     (fila: number) => postAPI({ action: 'delete_config', fila }),
  convenios:        () => fetchAPI('convenios'),
  categoriasConvenio:(id: string) => fetchAPI('categorias_convenio', { id }),
  compararConvenios:(categoria?: string) => fetchAPI('comparar_convenios', categoria ? { categoria } : {}),
  detectarConvenio: (provincia: string, sector?: string) => fetchAPI('detectar_convenio', { provincia, ...(sector ? { sector } : {}) }),
  alertasConvenios: () => fetchAPI('alertas_convenios'),
  mapaConvenios:    () => fetchAPI('mapa_convenios'),
  buscarConvenioAuto:(provincia: string, sector: string) => postAPI({ action: 'buscar_convenio_auto', provincia, sector }),
  subirConvenio:    async (file: File) => { const b = await fileToBase64(file); return postAPI({ action: 'upload_convenio', filename: file.name, base64: b, mime_type: file.type||'application/pdf' }) },
  eliminarConvenio: (id: string) => postAPI({ action: 'delete_convenio', id }),
  costesReferencia: () => fetchAPI('costes_referencia'),
  addCosteRef:      (data: any) => postAPI({ action: 'add_coste_ref', ...data }),
  updateCosteRef:   (data: any) => postAPI({ action: 'update_coste_ref', ...data }),
  deleteCosteRef:   (bloque: string, concepto: string) => postAPI({ action: 'delete_coste_ref', bloque, concepto }),
  conocimiento:     () => fetchAPI('conocimiento'),
  conocimientoStats:() => fetchAPI('conocimiento_stats'),
  buscarConocimiento:(q: string, l?: number) => fetchAPI('conocimiento_buscar', { q, limit: String(l||8) }),
  subirConocimiento:async (file: File, meta: any) => { const b = await fileToBase64(file); return postAPI({ action: 'upload_conocimiento', filename: file.name, base64: b, mime_type: file.type||'application/pdf', ...meta }) },
  eliminarConocimiento:(id: string) => postAPI({ action: 'delete_conocimiento', id }),
  documentosOferta: (id: string) => fetchAPI('documentos_oferta', { id }),
  generarDocumento: (id: string, tipo: string) => postAPI({ action: 'generar_documento', oportunidad_id: id, tipo }),
  generarTodosDocumentos:(id: string) => postAPI({ action: 'generar_todos_documentos', oportunidad_id: id }),
  documentosGeneral:(modulo?: string) => fetchAPI('documentos', modulo ? { modulo } : {}),
  alertasDocumentos:() => fetchAPI('alertas_documentos'),
  subirDocumentoGeneral: async (file: File) => { const b = await fileToBase64(file); return postAPI({ action: 'upload_documento_general', filename: file.name, base64: b, mime_type: file.type||'application/pdf' }) },
  reclasificarDocumento:(data: any) => postAPI({ action: 'reclasificar_documento', ...data }),
  subirArchivo:     async (file: File, id: string) => { const b = await fileToBase64(file); return postAPI({ action: 'upload', filename: file.name, base64: b, oportunidad_id: id, mime_type: file.type||'application/pdf' }) },
  resultado:        (id: string) => fetchAPI('resultado', { id }),
  seguimiento:      (id: string) => fetchAPI('seguimiento', { id }),
  actividad:        (id: string) => fetchAPI('actividad', { id }),
  resumenContratos: () => fetchAPI('resumen_contratos'),
  registrarResultado:(data: any) => postAPI({ action: 'registrar_resultado', ...data }),
  registrarSeguimiento:(data: any) => postAPI({ action: 'registrar_seguimiento', ...data }),
  empleados:        (filtro?: string) => fetchAPI('empleados', filtro ? { busqueda: filtro } : {}),
  empleado:         (id: string) => fetchAPI('empleado', { id }),
  statsRRHH:        () => fetchAPI('stats_rrhh'),
  dashboardRRHH:    () => fetchAPI('dashboard_rrhh', {}),
  expediente:       (id_empleado: string) => fetchAPI('expediente', { id: id_empleado }),
  addEmpleado:      (data: any) => postAPI({ action: 'add_empleado', ...data }),
  updateEmpleado:   (data: any) => postAPI({ action: 'update_empleado', ...data }),
  bajaEmpleado:     (data: any) => postAPI({ action: 'baja_empleado', ...data }),
  asignaciones:     (filtro?: any) => fetchAPI('asignaciones', filtro || {}),
  capacidadEmpleado:(id: string) => fetchAPI('capacidad_empleado', { id }),
  costeProyecto:    (id: string) => fetchAPI('coste_proyecto', { id }),
  empleadosDisponibles:(pct?: number) => fetchAPI('empleados_disponibles', pct ? { porcentaje: String(pct) } : {}),
  addAsignacion:    (data: any) => postAPI({ action: 'add_asignacion', ...data }),
  updateAsignacion: (data: any) => postAPI({ action: 'update_asignacion', ...data }),
  finalizarAsignacion:(data: any) => postAPI({ action: 'finalizar_asignacion', ...data }),
  prlDashboard:     () => fetchAPI('prl_dashboard'),
  prlEpis:          (empleado?: string) => fetchAPI('prl_epis', empleado ? { empleado } : {}),
  prlReconocimientos:(empleado?: string) => fetchAPI('prl_reconocimientos', empleado ? { empleado } : {}),
  prlFormacion:     (empleado?: string) => fetchAPI('prl_formacion', empleado ? { empleado } : {}),
  prlAccidentes:    (empleado?: string) => fetchAPI('prl_accidentes', empleado ? { empleado } : {}),
  alertasCaducidad: () => fetchAPI('alertas_caducidad'),
  addEpi:           (data: any) => postAPI({ action: 'add_epi', ...data }),
  addReconocimiento:(data: any) => postAPI({ action: 'add_reconocimiento', ...data }),
  addFormacionPrl:  (data: any) => postAPI({ action: 'add_formacion_prl', ...data }),
  addAccidente:     (data: any) => postAPI({ action: 'add_accidente', ...data }),
  generarRecibiEpi: (data: any) => postAPI({ action: 'generar_recibi_epi', ...data }),
  generarNotifReconocimiento:(data: any) => postAPI({ action: 'generar_notif_reconocimiento', ...data }),
  generarActaFormacion:(data: any) => postAPI({ action: 'generar_acta_formacion', ...data }),
  generarAvisoCaducidad:(data: any) => postAPI({ action: 'generar_aviso_caducidad', ...data }),
  eliminarEpi:      (id: string) => postAPI({ action: 'eliminar_epi', id }),
  eliminarReconocimiento:(id: string) => postAPI({ action: 'eliminar_reconocimiento', id }),
  eliminarFormacionPrl:(id: string) => postAPI({ action: 'eliminar_formacion_prl', id }),
  eliminarAccidente:(id: string) => postAPI({ action: 'eliminar_accidente', id }),
  rgpdDashboard:    () => fetchAPI('rgpd_dashboard'),
  rgpdConsentimientos:(empleado?: string) => fetchAPI('rgpd_consentimientos', empleado ? { empleado } : {}),
  rgpdArco:         (empleado?: string) => fetchAPI('rgpd_arco', empleado ? { empleado } : {}),
  rgpdTratamientos: () => fetchAPI('rgpd_tratamientos'),
  rgpdBrechas:      () => fetchAPI('rgpd_brechas'),
  addConsentimiento:(data: any) => postAPI({ action: 'add_consentimiento', ...data }),
  revocarConsentimiento:(data: any) => postAPI({ action: 'revocar_consentimiento', ...data }),
  addArco:          (data: any) => postAPI({ action: 'add_arco', ...data }),
  responderArco:    (data: any) => postAPI({ action: 'responder_arco', ...data }),
  addTratamiento:   (data: any) => postAPI({ action: 'add_tratamiento', ...data }),
  addBrecha:        (data: any) => postAPI({ action: 'add_brecha', ...data }),
  generarDocConsentimiento:(data: any) => postAPI({ action: 'generar_doc_consentimiento', ...data }),
  generarDocArco:   (data: any) => postAPI({ action: 'generar_doc_arco', ...data }),
  eliminarConsentimiento:(id: string) => postAPI({ action: 'eliminar_consentimiento', id }),
  eliminarArco:     (id: string) => postAPI({ action: 'eliminar_arco', id }),
  eliminarTratamiento:(id: string) => postAPI({ action: 'eliminar_tratamiento', id }),
  eliminarBrecha:   (id: string) => postAPI({ action: 'eliminar_brecha', id }),
  subrogaciones:    (oportunidad?: string) => fetchAPI('subrogaciones', oportunidad ? { oportunidad } : {}),
  personalSubrogado:(id_subrogacion: string) => fetchAPI('personal_subrogado', { id_subrogacion }),
  resumenSubrogacion:(id_oportunidad: string) => fetchAPI('resumen_subrogacion', { id_oportunidad }),
  crearSubrogacion: (data: any) => postAPI({ action: 'crear_subrogacion', ...data }),
  addPersonalSubrogado:(data: any) => postAPI({ action: 'add_personal_subrogado', ...data }),
  verificarPersonalSubrogado:(data: any) => postAPI({ action: 'verificar_personal_subrogado', ...data }),
  importarListadoSubrogacion:(data: any) => postAPI({ action: 'importar_listado_subrogacion', ...data }),
  incorporarSubrogadoRRHH:(data: any) => postAPI({ action: 'incorporar_subrogado_rrhh', ...data }),
  generarCartaSubrogacion:(data: any) => postAPI({ action: 'generar_carta_subrogacion', ...data }),
  eliminarPersonalSubrogado:(id: string, id_subrogacion?: string) => postAPI({ action: 'eliminar_personal_subrogado', id, id_subrogacion }),
  eliminarSubrogacion:(id: string) => postAPI({ action: 'eliminar_subrogacion', id }),
  actualizarDatosPersonalesSubrogado:(data: any) => postAPI({ action: 'actualizar_datos_personales_subrogado', ...data }),
  marcarContactadoSubrogado:(data: any) => postAPI({ action: 'marcar_contactado_subrogado', ...data }),
  incorporarSubrogadoForzado:(data: any) => postAPI({ action: 'incorporar_subrogado_forzado', ...data }),
  incorporarSubrogadoSinDniCheck:(data: any) => postAPI({ action: 'incorporar_subrogado_sin_dni_check', ...data }),
  fichar:           (data: any) => postAPI({ action: 'fichar', ...data }),
  fichajes:         (filtro?: any) => fetchAPI('fichajes', filtro || {}),
  estadoFichaje:    (id_empleado: string) => fetchAPI('estado_fichaje', { id_empleado }),
  resumenDiarioFichajes:(id_empleado: string, mes: string, anio: string) => fetchAPI('resumen_diario_fichajes', { id_empleado, mes, anio }),
  resumenMensualFichajes:(mes: string, anio: string) => fetchAPI('resumen_mensual_fichajes', { mes, anio }),
  generarInformeFichajes:(id_empleado: string, mes: string, anio: string) => postAPI({ action: 'generar_informe_fichajes', id_empleado, mes, anio }),
  ausencias:        (filtro?: any) => fetchAPI('ausencias', filtro || {}),
  resumenVacaciones:(id_empleado: string, anio?: string) => fetchAPI('resumen_vacaciones', { id_empleado, anio: anio||String(new Date().getFullYear()) }),
  calendarioAusencias:(mes: string, anio: string) => fetchAPI('calendario_ausencias', { mes, anio }),
  dashboardAusencias:() => fetchAPI('dashboard_ausencias'),
  solicitarAusencia:(data: any) => postAPI({ action: 'solicitar_ausencia', ...data }),
  aprobarAusencia:  (data: any) => postAPI({ action: 'aprobar_ausencia', ...data }),
  eliminarAusencia: (id: string) => postAPI({ action: 'eliminar_ausencia', id }),
  usuarios:         () => fetchAPI('usuarios'),
  addUsuario:       (data: any) => postAPI({ action: 'add_usuario', ...data }),
  updateUsuario:    (data: any) => postAPI({ action: 'update_usuario', ...data }),
  deleteUsuario:    (email: string) => postAPI({ action: 'delete_usuario', email }),
  plantillas:       (modulo?: string) => fetchAPI('obtener_plantillas', modulo ? { modulo } : {}),
  registrarPlantilla:(data: any) => postAPI({ action: 'registrar_plantilla', ...data }),
  crearPlantillaVacia:(data: any) => postAPI({ action: 'crear_plantilla_vacia', ...data }),
  generarDesdePlantilla:(data: any) => postAPI({ action: 'generar_desde_plantilla', ...data }),
  actualizarPlantilla:(data: any) => postAPI({ action: 'actualizar_plantilla', ...data }),
  etiquetasPlantilla:(id: string) => postAPI({ action: 'obtener_etiquetas_plantilla', id }),
  // ═══ TERRITORIO ═══
  centros:                (filtros?: any) => fetchAPI('centros', filtros || {}),
  centro:                 (id: string) => fetchAPI('centro', { id }),
  dashboardTerritorio:    () => fetchAPI('dashboard_territorio'),
  crearCentro:            (data: any) => postAPI({ action: 'crear_centro', ...data }),
  actualizarCentro:       (data: any) => postAPI({ action: 'actualizar_centro', ...data }),
  eliminarCentro:         (id: string) => postAPI({ action: 'eliminar_centro', id }),
  asignarPersonalCentro:  (data: any) => postAPI({ action: 'asignar_personal_centro', ...data }),
  desasignarPersonalCentro:(id: string) => postAPI({ action: 'desasignar_personal_centro', id }),
  importarCentrosOportunidad:(oportunidad_id: string) => postAPI({ action: 'importar_centros_oportunidad', oportunidad_id }),
  // ═══ PARTES E INCIDENCIAS ═══
  partes:                 (filtros?: any) => fetchAPI('partes', filtros || {}),
  incidencias:            (filtros?: any) => fetchAPI('incidencias', filtros || {}),
  resumenOperativo:       (id: string) => fetchAPI('resumen_operativo', { id }),
  crearParte:             (data: any) => postAPI({ action: 'crear_parte', ...data }),
  actualizarParte:        (data: any) => postAPI({ action: 'actualizar_parte', ...data }),
  eliminarParte:          (id: string) => postAPI({ action: 'eliminar_parte', id }),
  crearIncidencia:        (data: any) => postAPI({ action: 'crear_incidencia', ...data }),
  resolverIncidencia:     (data: any) => postAPI({ action: 'resolver_incidencia', ...data }),
  // ═══ OPERACIONES V2 ═══
  partesV2:              (filtros?: any) => fetchAPI('partes_v2', filtros || {}),
  eliminarParteV2:       (id: string) => postAPI({ action: 'eliminar_parte_v2', id }),
  parteCompleto:         (id: string) => fetchAPI('parte_completo', { id }),
  checklistCentro:       (id: string) => fetchAPI('checklist_centro', { id }),
  checklistEjecucion:    (id: string) => fetchAPI('checklist_ejecucion', { id }),
  fotosParte:            (id: string) => fetchAPI('fotos_parte', { id }),
  materialesParte:       (id: string) => fetchAPI('materiales_parte', { id }),
  maquinariaParte:       (id: string) => fetchAPI('maquinaria_parte', { id }),
  catalogoMateriales:    () => fetchAPI('catalogo_materiales'),
  catalogoMaquinaria:    () => fetchAPI('catalogo_maquinaria'),
  plContrato:            (id: string, meses?: number) => fetchAPI('pl_contrato', { id, meses: String(meses || 6) }),
  asistenciaDia:         (id: string, fecha?: string) => fetchAPI('asistencia_dia', { id, ...(fecha ? { fecha } : {}) }),
  tareasDia:             (id: string) => fetchAPI('tareas_dia', { id }),
  iniciarParte:          (data: any) => postAPI({ action: 'iniciar_parte', ...data }),
  finalizarParte:        (data: any) => postAPI({ action: 'finalizar_parte', ...data }),
  actualizarChecklistExec:(data: any) => postAPI({ action: 'actualizar_checklist_exec', ...data }),
  registrarFotoParte:    (data: any) => postAPI({ action: 'registrar_foto_parte', ...data }),
  registrarFirma:        (data: any) => postAPI({ action: 'registrar_firma', ...data }),
  registrarMaterialParte:(data: any) => postAPI({ action: 'registrar_material_parte', ...data }),
  eliminarMaterialParte: (id: string) => postAPI({ action: 'eliminar_material_parte', id }),
  registrarMaquinariaParte:(data: any) => postAPI({ action: 'registrar_maquinaria_parte', ...data }),
  crearChecklistItem:    (data: any) => postAPI({ action: 'crear_checklist_item', ...data }),
  actualizarChecklistItem:(data: any) => postAPI({ action: 'actualizar_checklist_item', ...data }),
  eliminarChecklistItem: (id: string) => postAPI({ action: 'eliminar_checklist_item', id }),
  copiarChecklist:       (origen_id: string, destino_id: string) => postAPI({ action: 'copiar_checklist', origen_id, destino_id }),
  crearMaterialCatalogo: (data: any) => postAPI({ action: 'crear_material_catalogo', ...data }),
  crearMaquinariaCatalogo:(data: any) => postAPI({ action: 'crear_maquinaria_catalogo', ...data }),
  generarInformeMensual: (data: any) => postAPI({ action: 'generar_informe_mensual', ...data }),
  // ═══ T-23 ÓRDENES ═══
  ordenes:                  (filtros?: any) => fetchAPI('ordenes', filtros || {}),
  crearOrden:               (data: any) => postAPI({ action: 'crear_orden', ...data }),
  actualizarEstadoOrden:    (data: any) => postAPI({ action: 'actualizar_estado_orden', ...data }),
  eliminarOrden:            (id: string) => postAPI({ action: 'eliminar_orden', id }),
  // ═══ T-26 INVENTARIO ═══
  stockCentro:              (id: string) => fetchAPI('stock_centro', { id }),
  pedidos:                  (id?: string) => fetchAPI('pedidos', id ? { id } : {}),
  ajustarStock:             (data: any) => postAPI({ action: 'ajustar_stock', ...data }),
  crearPedido:              (data: any) => postAPI({ action: 'crear_pedido', ...data }),
  actualizarEstadoPedido:   (data: any) => postAPI({ action: 'actualizar_estado_pedido', ...data }),
  // ═══ T-27 MAQUINARIA ═══
  mantenimientos:           (id?: string) => fetchAPI('mantenimientos', id ? { id } : {}),
  crearMantenimiento:       (data: any) => postAPI({ action: 'crear_mantenimiento', ...data }),
  registrarMantRealizado:   (data: any) => postAPI({ action: 'registrar_mant_realizado', ...data }),
  // ═══ T-28 VEHÍCULOS ═══
  vehiculos:                () => fetchAPI('vehiculos'),
  combustibleVehiculo:      (id: string) => fetchAPI('combustible_vehiculo', { id }),
  crearVehiculo:            (data: any) => postAPI({ action: 'crear_vehiculo', ...data }),
  actualizarVehiculo:       (data: any) => postAPI({ action: 'actualizar_vehiculo', ...data }),
  registrarRepostaje:       (data: any) => postAPI({ action: 'registrar_repostaje', ...data }),
  // ═══ T-29 CALIDAD ═══
  inspecciones:             (filtros?: any) => fetchAPI('inspecciones', filtros || {}),
  npsCentro:                (id: string) => fetchAPI('nps_centro', { id }),
  accionesCorrectivas:      (id?: string) => fetchAPI('acciones_correctivas', id ? { id } : {}),
  dashboardCalidad:         () => fetchAPI('dashboard_calidad'),
  crearInspeccion:          (data: any) => postAPI({ action: 'crear_inspeccion', ...data }),
  registrarNPS:             (data: any) => postAPI({ action: 'registrar_nps', ...data }),
  crearAccionCorrectiva:    (data: any) => postAPI({ action: 'crear_accion_correctiva', ...data }),
  cerrarAccionCorrectiva:   (data: any) => postAPI({ action: 'cerrar_accion_correctiva', ...data }),
  // ═══ T-30 PORTAL CLIENTE ═══
  portalCliente:            (token: string) => fetch(`${API_BASE}?action=portal_cliente&portal_token=${encodeURIComponent(token)}`).then(r => r.json()),
  tokensCliente:            () => fetchAPI('tokens_cliente'),
  generarTokenCliente:      (data: any) => postAPI({ action: 'generar_token_cliente', ...data }),
  revocarToken:             (id: string) => postAPI({ action: 'revocar_token', id }),
  // ═══ T-22 PLANIFICACIÓN ═══
  serviciosProgramados:     (filtros?: any) => fetchAPI('servicios_programados', filtros || {}),
  cuadranteSemanal:         (semana?: string) => fetchAPI('cuadrante_semanal', semana ? { semana } : {}),
  sustituciones:            (fecha?: string) => fetchAPI('sustituciones', fecha ? { fecha } : {}),
  crearServicioProgramado:  (data: any) => postAPI({ action: 'crear_servicio_programado', ...data }),
  eliminarServicioProgramado:(id: string) => postAPI({ action: 'eliminar_servicio_programado', id }),
  crearSustitucion:         (data: any) => postAPI({ action: 'crear_sustitucion', ...data }),
}