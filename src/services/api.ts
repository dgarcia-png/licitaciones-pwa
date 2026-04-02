// src/services/api.ts — ACTUALIZADO 2/04/2026
// [2/04] soft delete: archivar/restaurar oportunidades, reactivar empleados, papelera
// [2/04] nuevo backend Cloud Run para módulos rápidos (fichajes, partes, operario)

const API_BASE  = 'https://script.google.com/macros/s/AKfycbznMdKrUdul1AfeTaAIpoCXjBW7L8HIwynpdbQdJr2G3UVMiaFj94VKbetcqAWMNz_Q8w/exec'
const API_FAST  = 'https://forgeser-backend-801944899567.europe-west1.run.app'

function getToken(): string { return localStorage.getItem('auth_token') || '' }

const TTL: Record<string, number> = {
  convenios: 3600000, costes_referencia: 3600000, config: 3600000,
  usuarios: 1800000, mapa_convenios: 3600000,
  oportunidades: 30000, empleados: 60000, ausencias: 30000,
  fichajes: 15000, analisis: 60000, load_calculo: 60000,
  obtener_lotes: 15000, batch_decisiones: 15000,
  dashboard: 60000, stats: 60000, stats_rrhh: 60000,
  informe: 120000, config_global: 300000,
  mapa_operarios: 30000,
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
  if (data.code === 401) { console.warn('GAS 401 - token no válido para GAS'); throw new Error('No autorizado') }
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
  else if (a.includes('oportun') || a.includes('result') || a.includes('aprobac') || a.includes('archivar') || a.includes('restaurar_oportun')) { cacheInvalidate('oportunidades'); cacheInvalidate('detalle'); cacheInvalidate('stats'); cacheInvalidate('dashboard'); cacheInvalidate('batch') }
  else if (a.includes('prl') || a.includes('epi') || a.includes('reconoc') || a.includes('formacion') || a.includes('accidente')) { cacheInvalidate('prl_'); cacheInvalidate('alertas_caducidad') }
  else if (a.includes('rgpd') || a.includes('consentim') || a.includes('arco') || a.includes('tratam') || a.includes('brecha')) { cacheInvalidate('rgpd_') }
  else if (a.includes('convenio')) { cacheInvalidate('convenio'); cacheInvalidate('mapa_convenio') }
  else if (a.includes('config')) { cacheInvalidate('config') }
  else if (a.includes('plantilla')) { cacheInvalidate('plantilla') }
  else if (a.includes('incidencia')) { cacheInvalidate('incidencia'); cacheInvalidate('dashboard_sla') }
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


// ── Cloud Run helpers (rápido, sin cold start) ───────────────────────────────
async function fetchFAST(path: string, params?: Record<string, string>): Promise<any> {
  let url = `${API_FAST}${path}`
  if (params) { const q = new URLSearchParams(params).toString(); if (q) url += '?' + q }
  const r = await fetch(url, { headers: { 'x-token': getToken() } })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  const data = await r.json()
  if (data.code === 401) { console.warn('GAS 401 - token no válido para GAS'); throw new Error('No autorizado') }
  return data
}

async function postFAST(path: string, data: any): Promise<any> {
  const r = await fetch(`${API_FAST}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-token': getToken() },
    body: JSON.stringify(data)
  })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  const resp = await r.json()
  if (resp.code === 401) { localStorage.removeItem('auth_token'); localStorage.removeItem('usuario'); window.location.href = '/login'; throw new Error('No autorizado') }
  return resp
}

async function putFAST(path: string, data: any): Promise<any> {
  const r = await fetch(`${API_FAST}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-token': getToken() },
    body: JSON.stringify(data)
  })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json()
}

async function deleteFAST(path: string, data?: any): Promise<any> {
  const r = await fetch(`${API_FAST}${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'x-token': getToken() },
    body: data ? JSON.stringify(data) : undefined
  })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json()
}

export interface Stats { total: number; nueva: number; en_analisis: number; go: number; no_go: number }

export const api = {
  invalidarCache: () => cacheInvalidate(),
  prefetch: () => prefetchCommonData(),
  login: (email: string, password: string) => postFAST('/auth/login', { email, password }),
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
  configGlobal:          () => fetchAPI('config_global'),
  guardarConfigGlobal:   (data: any) => postAPI({ action: 'guardar_config_global', ...data }),
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
  empleados:        (filtro?: string) => fetchFAST('/empleados', filtro ? { busqueda: filtro } : {}),
  empleado:         (id: string) => fetchFAST('/empleados/' + id),
  statsRRHH:        () => fetchAPI('stats_rrhh'),
  dashboardRRHH:    () => fetchAPI('dashboard_rrhh', {}),
  expediente:       (id_empleado: string) => fetchAPI('expediente', { id: id_empleado }),
  addEmpleado:      (data: any) => postAPI({ action: 'add_empleado', ...data }),
  updateEmpleado:   (data: any) => postAPI({ action: 'update_empleado', ...data }),
  bajaEmpleado:     (data: any) => postAPI({ action: 'baja_empleado', ...data }),
  restaurarEmpleado:(data: any) => postAPI({ action: 'restaurar_empleado', ...data }),
  asignaciones:     (filtros?: any) => fetchAPI('asignaciones', filtros || {}),
  addAsignacion:    (data: any) => postAPI({ action: 'add_asignacion', ...data }),
  actualizarAsignacion:(data: any) => postAPI({ action: 'update_asignacion', ...data }),
  finalizarAsignacion:(data: any) => postAPI({ action: 'finalizar_asignacion', ...data }),
  capacidadEmpleado:(id: string) => fetchAPI('capacidad_empleado', { id }),
  costeProyecto:    (id: string) => fetchAPI('coste_proyecto', { id }),
  empleadosDisponibles:(porcentaje?: number) => fetchAPI('empleados_disponibles', porcentaje ? { porcentaje: String(porcentaje) } : {}),
  historialCentrosEmpleado:(id: string) => fetchAPI('historial_centros_empleado', { id }),
  asignacionesEmp:  (id: string) => fetchAPI('asignaciones', { empleado: id }),
  oportunidades_:   (id: string) => fetchAPI('oportunidades', { id }),
  plantillas:       (modulo?: string) => postAPI({ action: 'obtener_plantillas', ...(modulo ? { modulo } : {}) }),
  registrarPlantilla:(data: any) => postAPI({ action: 'registrar_plantilla', ...data }),
  crearPlantillaVacia:(data: any) => postAPI({ action: 'crear_plantilla_vacia', ...data }),
  actualizarPlantilla:(data: any) => postAPI({ action: 'actualizar_plantilla', ...data }),
  generarDesdePlantilla:(data: any) => postAPI({ action: 'generar_desde_plantilla', ...data }),
  usuarios:         () => fetchAPI('usuarios'),
  addUsuario:       (data: any) => postAPI({ action: 'add_usuario', ...data }),
  updateUsuario:    (data: any) => postAPI({ action: 'update_usuario', ...data }),
  deleteUsuario:    (email: string) => postAPI({ action: 'delete_usuario', email }),
  // ── FICHAJES → Cloud Run (rápido) ──
  fichajes:         (params?: any) => fetchFAST('/fichajes', params || {}),
  estadoFichaje:    (id: string) => fetchFAST('/fichajes/estado/' + id),
  resumenDiarioFichajes:(id: string, mes: string, anio: string) => fetchFAST('/fichajes/resumen/' + id, { mes, anio }),
  resumenMensualFichajes:(mes: string, anio: string) => fetchAPI('resumen_mensual_fichajes', { mes, anio }),
  horasExtra:       (filtros?: any) => fetchAPI('horas_extra', filtros || {}),
  horasExtraEmpleado:(id: string) => fetchAPI('horas_extra', { empleado_id: id }),
  horasExtraAnual:   (anio?: number) => fetchAPI('horas_extra', anio ? { anio: String(anio) } : {}),
  fichar:           (data: any) => postFAST('/fichajes', data),
  validarFichaje:   (data: any) => putFAST('/fichajes/' + data.id + '/validar', data),
  aprobarHorasExtra:(data: any) => postAPI({ action: 'aprobar_horas_extra', ...data }),
  generarInformeFichajes:(data: any) => postAPI({ action: 'generar_informe_fichajes', ...data }),
  batchSupervisionFichajes:(mes: string, anio: string) => fetchAPI('batch_supervision_fichajes', { mes, anio }),
  ausencias:        (filtros?: any) => fetchAPI('ausencias', filtros || {}),
  resumenVacaciones:(id: string, anio?: string) => fetchAPI('resumen_vacaciones', { id_empleado: id, ...(anio ? { anio } : {}) }),
  calendarioAusencias:(mes: string, anio: string) => fetchAPI('calendario_ausencias', { mes, anio }),
  dashboardAusencias:() => fetchAPI('dashboard_ausencias'),
  solicitarAusencia:(data: any) => postFAST('/ausencias/solicitar', data),
  aprobarAusencia:  (data: any) => postAPI({ action: 'aprobar_ausencia', ...data }),
  eliminarAusencia: (id: string) => postAPI({ action: 'eliminar_ausencia', id }),
  prlDashboard:     () => fetchAPI('prl_dashboard'),
  prlEpis:          (empleado?: string) => fetchAPI('prl_epis', empleado ? { empleado } : {}),
  prlReconocimientos:(empleado?: string) => fetchAPI('prl_reconocimientos', empleado ? { empleado } : {}),
  prlFormacion:     (empleado?: string) => fetchAPI('prl_formacion', empleado ? { empleado } : {}),
  prlAccidentes:    (empleado?: string) => fetchAPI('prl_accidentes', empleado ? { empleado } : {}),
  alertasCaducidad: () => fetchAPI('alertas_caducidad'),
  agregarEpi:       (data: any) => postAPI({ action: 'add_epi', ...data }),
  agregarReconocimiento:(data: any) => postAPI({ action: 'add_reconocimiento', ...data }),
  agregarFormacionPrl:(data: any) => postAPI({ action: 'add_formacion_prl', ...data }),
  agregarAccidente: (data: any) => postAPI({ action: 'add_accidente', ...data }),
  generarRecibiEPI: (data: any) => postAPI({ action: 'generar_recibi_epi', ...data }),
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
  agregarConsentimiento:(data: any) => postAPI({ action: 'add_consentimiento', ...data }),
  revocarConsentimiento:(data: any) => postAPI({ action: 'revocar_consentimiento', ...data }),
  agregarArco:      (data: any) => postAPI({ action: 'add_arco', ...data }),
  responderArco:    (data: any) => postAPI({ action: 'responder_arco', ...data }),
  agregarTratamiento:(data: any) => postAPI({ action: 'add_tratamiento', ...data }),
  agregarBrecha:    (data: any) => postAPI({ action: 'add_brecha', ...data }),
  generarDocConsentimiento:(data: any) => postAPI({ action: 'generar_doc_consentimiento', ...data }),
  generarDocArco:   (data: any) => postAPI({ action: 'generar_doc_arco', ...data }),
  eliminarConsentimiento:(id: string) => postAPI({ action: 'eliminar_consentimiento', id }),
  eliminarArco:     (id: string) => postAPI({ action: 'eliminar_arco', id }),
  eliminarTratamiento:(id: string) => postAPI({ action: 'eliminar_tratamiento', id }),
  eliminarBrecha:   (id: string) => postAPI({ action: 'eliminar_brecha', id }),
  subrogaciones:    (filtros?: any) => fetchAPI('subrogaciones', filtros || {}),
  personalSubrogado:(id: string) => fetchAPI('personal_subrogado', { id_subrogacion: id }),
  resumenSubrogacion:(id_oportunidad: string) => fetchAPI('resumen_subrogacion', { id_oportunidad }),
  crearSubrogacion: (data: any) => postAPI({ action: 'crear_subrogacion', ...data }),
  addPersonalSubrogado:(data: any) => postAPI({ action: 'add_personal_subrogado', ...data }),
  verificarPersonalSubrogado:(data: any) => postAPI({ action: 'verificar_personal_subrogado', ...data }),
  importarListadoSubrogacion:(data: any) => postAPI({ action: 'importar_listado_subrogacion', ...data }),
  incorporarSubrogadoRRHH:(data: any) => postAPI({ action: 'incorporar_subrogado_rrhh', ...data }),
  incorporarSubrogadoSinDniCheck:(data: any) => postAPI({ action: 'incorporar_subrogado_sin_dni_check', ...data }),
  marcarContactadoSubrogado:(data: any) => postAPI({ action: 'marcar_contactado_subrogado', ...data }),
  generarCartaSubrogacion:(data: any) => postAPI({ action: 'generar_carta_subrogacion', ...data }),
  eliminarPersonalSubrogado:(id: string, id_subrogacion: string) => postAPI({ action: 'eliminar_personal_subrogado', id, id_subrogacion }),
  eliminarSubrogacion:(id: string) => postAPI({ action: 'eliminar_subrogacion', id }),
  actualizarDatosPersonalesSubrogado:(data: any) => postAPI({ action: 'actualizar_datos_personales_subrogado', ...data }),
  centros:          (filtros?: any) => fetchFAST('/centros', filtros || {}),
  centro:           (id: string) => fetchFAST('/centros/' + id),
  dashboardTerritorio:() => fetchAPI('dashboard_territorio'),
  mapaOperarios:    () => fetchFAST('/centros/mapa/operarios'),
  partes:           (filtros?: any) => fetchAPI('partes', filtros || {}),
  dashboardSLA:     () => fetchAPI('dashboard_sla'),
  incidencias:      (filtros?: any) => fetchAPI('incidencias', filtros || {}),
  comentariosIncidencia:(id: string) => fetchAPI('comentarios_incidencia', { id }),
  resumenOperativo: (id: string) => fetchAPI('resumen_operativo', { id }),
  agregarCentro:    (data: any) => postAPI({ action: 'add_centro', ...data }),
  actualizarCentro: (data: any) => postAPI({ action: 'update_centro', ...data }),
  eliminarCentro:   (id: string) => postAPI({ action: 'update_centro', id, activo: false }),
  asignarEmpleadoCentro:(data: any) => postAPI({ action: 'asignar_empleado_centro', ...data }),
  desasignarEmpleado:(data: any) => postAPI({ action: 'desasignar_empleado', ...data }),
  crearParte:       (data: any) => postAPI({ action: 'add_parte', ...data }),
  actualizarParte:  (data: any) => postAPI({ action: 'update_parte', ...data }),
  resolverIncidencia:(data: any) => postAPI({ action: 'resolver_incidencia', ...data }),
  addComentarioIncidencia:(data: any) => postAPI({ action: 'add_comentario_incidencia', ...data }),
  crearIncidencia:  (data: any) => postAPI({ action: 'create_incidencia', ...data }),
  actualizarIncidencia:(data: any) => postAPI({ action: 'update_incidencia', ...data }),
  batchTerritorio:  () => fetchAPI('batch_territorio'),
  batchPartes:      () => fetchAPI('batch_partes'),
  batchOrdenes:     () => fetchAPI('batch_ordenes'),
  partesV2:         (filtros?: any) => fetchFAST('/partes', filtros || {}),
  parteCompleto:    (id: string) => fetchFAST('/partes/' + id),
  checklistCentro:  (id: string) => fetchAPI('checklist_centro', { id }),
  checklistEjecucion:(id: string) => fetchAPI('checklist_ejecucion', { id }),
  fotosParte:       (id: string) => fetchAPI('fotos_parte', { id }),
  materialesParte:  (id: string) => fetchAPI('materiales_parte', { id }),
  maquinariaParte:  (id: string) => fetchAPI('maquinaria_parte', { id }),
  catalogoMateriales:() => fetchFAST('/catalogos/materiales'),
  catalogoMaquinaria:() => fetchFAST('/catalogos/maquinaria'),
  plContrato:       (id: string, meses?: number) => fetchAPI('pl_contrato', { id, ...(meses ? { meses: String(meses) } : {}) }),
  plMesActual:      (id: string) => fetchAPI('pl_mes_actual', { id }),
  asistenciaDia:    (id: string, fecha: string) => fetchAPI('asistencia_dia', { id, fecha }),
  tareasDia:        (id: string) => fetchFAST('/ordenes/hoy/' + id),
  // ── PARTES V2 → Cloud Run (rápido) ──
  crearParteV2:     (data: any) => postFAST('/partes/iniciar', data),
  cerrarParteV2:    (data: any) => postFAST('/partes/cerrar', data),
  eliminarParteV2:  (id: string) => deleteFAST('/partes/' + id),
  actualizarChecklistEjecucion:(data: any) => putFAST('/partes/' + data.parte_id + '/checklist/' + data.id, data),
  registrarFotoParte:(data: any) => postFAST('/partes/' + data.parte_id + '/foto', data),
  registrarFirma:   (data: any) => postAPI({ action: 'registrar_firma', ...data }),
  registrarMaterialParte:(data: any) => postFAST('/partes/' + data.parte_id + '/material', data),
  eliminarMaterialParte:(id: string) => postAPI({ action: 'eliminar_material_parte', id }),
  registrarMaquinariaParte:(data: any) => postAPI({ action: 'registrar_maquinaria_parte', ...data }),
  crearChecklistItem:(data: any) => postAPI({ action: 'crear_checklist_item', ...data }),
  actualizarChecklistItem:(data: any) => postAPI({ action: 'actualizar_checklist_item', ...data }),
  eliminarChecklistItem:(id: string) => postAPI({ action: 'eliminar_checklist_item', id }),
  copiarChecklist:  (origen_id: string, destino_id: string) => postAPI({ action: 'copiar_checklist', origen_id, destino_id }),
  crearMaterialCatalogo:(data: any) => postAPI({ action: 'crear_material_catalogo', ...data }),
  crearMaquinariaCatalogo:(data: any) => postAPI({ action: 'crear_maquinaria_catalogo', ...data }),
  generarInformeMensual:(data: any) => postAPI({ action: 'generar_informe_mensual', ...data }),
  // ── ÓRDENES → Cloud Run (rápido) ──
  ordenes:          (filtros?: any) => fetchFAST('/ordenes', filtros || {}),
  partesDeOrden:    (id: string) => fetchAPI('partes_de_orden', { id }),
  ordenesDeParte:   (id: string) => fetchAPI('ordenes_de_parte', { id }),
  crearOrden:       (data: any) => postFAST('/ordenes', data),
  actualizarEstadoOrden:(data: any) => putFAST('/ordenes/' + data.id + '/estado', data),
  eliminarOrden:    (id: string) => deleteFAST('/ordenes/' + id),
  stockCentro:      (id: string) => fetchAPI('stock_centro', { id }),
  alertasStock:     (id?: string) => fetchAPI('alertas_stock', id ? { id } : {}),
  pedidos:          (id?: string) => fetchAPI('pedidos', id ? { id } : {}),
  ajustarStock:             (data: any) => postAPI({ action: 'ajustar_stock', ...data }),
  crearPedido:              (data: any) => postAPI({ action: 'crear_pedido', ...data }),
  actualizarEstadoPedido:   (data: any) => postAPI({ action: 'actualizar_estado_pedido', ...data }),
  mantenimientos:           (id?: string) => fetchAPI('mantenimientos', id ? { id } : {}),
  crearMantenimiento:       (data: any) => postAPI({ action: 'crear_mantenimiento', ...data }),
  registrarMantRealizado:   (data: any) => postAPI({ action: 'registrar_mant_realizado', ...data }),
  vehiculos:                () => fetchAPI('vehiculos'),
  combustibleVehiculo:      (id: string) => fetchAPI('combustible_vehiculo', { id }),
  crearVehiculo:            (data: any) => postAPI({ action: 'crear_vehiculo', ...data }),
  actualizarVehiculo:       (data: any) => postAPI({ action: 'actualizar_vehiculo', ...data }),
  registrarRepostaje:       (data: any) => postAPI({ action: 'registrar_repostaje', ...data }),
  inspecciones:             (filtros?: any) => fetchAPI('inspecciones', filtros || {}),
  npsCentro:                (id: string) => fetchAPI('nps_centro', { id }),
  accionesCorrectivas:      (id?: string) => fetchAPI('acciones_correctivas', id ? { id } : {}),
  dashboardCalidad:         () => fetchAPI('dashboard_calidad'),
  crearInspeccion:          (data: any) => postAPI({ action: 'crear_inspeccion', ...data }),
  registrarNPS:             (data: any) => postAPI({ action: 'registrar_nps', ...data }),
  crearAccionCorrectiva:    (data: any) => postAPI({ action: 'crear_accion_correctiva', ...data }),
  cerrarAccionCorrectiva:   (data: any) => postAPI({ action: 'cerrar_accion_correctiva', ...data }),
  portalCliente:            (token: string) => fetch(`${API_BASE}?action=portal_cliente&portal_token=${encodeURIComponent(token)}`).then(r => r.json()),
  tokensCliente:            () => fetchAPI('tokens_cliente'),
  generarTokenCliente:      (data: any) => postAPI({ action: 'generar_token_cliente', ...data }),
  revocarToken:             (id: string) => postAPI({ action: 'revocar_token', id }),
  serviciosProgramados:     (filtros?: any) => fetchAPI('servicios_programados', filtros || {}),
  cuadranteSemanal:         (semana?: string) => fetchAPI('cuadrante_semanal', semana ? { semana } : {}),
  sustituciones:            (fecha?: string) => fetchAPI('sustituciones', fecha ? { fecha } : {}),
  crearServicioProgramado:  (data: any) => postAPI({ action: 'crear_servicio_programado', ...data }),
  eliminarServicioProgramado:(id: string) => postAPI({ action: 'eliminar_servicio_programado', id }),
  crearSustitucion:         (data: any) => postAPI({ action: 'crear_sustitucion', ...data }),
  festivos:                 (anio?: string, tipo?: string) => fetchAPI('festivos', { ...(anio ? { anio } : {}), ...(tipo ? { tipo } : {}) }),
  crearFestivo:             (data: any) => postAPI({ action: 'crear_festivo', ...data }),
  actualizarFestivo:        (data: any) => postAPI({ action: 'actualizar_festivo', ...data }),
  eliminarFestivo:          (id: string) => postAPI({ action: 'eliminar_festivo', id }),
  cargarFestivosNacionales: (anio: number) => postAPI({ action: 'cargar_festivos_nacionales', anio }),
  diaLaborable:             (fecha: string, municipio?: string, convenioId?: string) => fetchAPI('dia_laborable', { fecha, ...(municipio ? { municipio } : {}), ...(convenioId ? { convenio_id: convenioId } : {}) }),
  diasLaborables:           (desde: string, hasta: string, municipio?: string) => fetchAPI('dias_laborables', { desde, hasta, ...(municipio ? { municipio } : {}) }),
  programarServicioRango:   (data: any) => postAPI({ action: 'programar_servicio_rango', ...data }),
  certificaciones:          (filtros?: any) => fetchAPI('certificaciones', filtros || {}),
  certificacionesEmpleado:  (id: string) => fetchAPI('certificaciones_empleado', { id }),
  dashboardCertificaciones: () => fetchAPI('dashboard_certificaciones'),
  batchCertificaciones:     () => fetchAPI('batch_certificaciones'),
  agregarCertificacion:     (data: any) => postAPI({ action: 'agregar_certificacion', ...data }),
  actualizarCertificacion:  (data: any) => postAPI({ action: 'actualizar_certificacion', ...data }),
  eliminarCertificacion:    (id: string) => postAPI({ action: 'eliminar_certificacion', id }),
  // ═══ INFORMES ═══
  informeEconomicoGlobal:   (filtros?: any) => fetchAPI('informe_economico_global', filtros || {}),
  informeLicitaciones:      (filtros?: any) => fetchAPI('informe_licitaciones', filtros || {}),
  informeRRHH:              (filtros?: any) => fetchAPI('informe_rrhh', filtros || {}),
  informeTerritorio:        (filtros?: any) => fetchAPI('informe_territorio', filtros || {}),
  informeCostesContrato:    (data: { id: string; mes_desde?: string; mes_hasta?: string }) =>
    fetchAPI('informe_costes_contrato', { id: data.id, ...(data.mes_desde ? { mes_desde: data.mes_desde } : {}), ...(data.mes_hasta ? { mes_hasta: data.mes_hasta } : {}) }),
  informeRendimiento:       () => fetchAPI('informe_rendimiento'),
  // ═══ PLANTILLAS CPV ═══
  plantillasCPV:      (familia_cpv?: string) => fetchAPI('obtener_plantillas_cpv', familia_cpv ? { familia_cpv } : {}),
  guardarPlantillaCPV:(data: any) => postAPI({ action: 'guardar_plantilla_cpv', ...data }),
  eliminarPlantillaCPV:(id: string) => postAPI({ action: 'eliminar_plantilla_cpv', id }),
  // ═══ SOFT DELETE — PAPELERA ═══
  archivarOportunidad:  (id: string) => postAPI({ action: 'archivar_oportunidad', id }),
  restaurarOportunidad: (id: string) => postAPI({ action: 'restaurar_oportunidad', id }),
  papelera:             (hoja?: string) => fetchAPI('papelera', hoja ? { hoja } : {}),
  restaurarPapelera:    (id_papelera: string) => postAPI({ action: 'restaurar_papelera', id_papelera }),
  // ═══ BÚSQUEDA GLOBAL ═══
  busquedaGlobal:       (q: string) => fetchAPI('busqueda_global', { q }),
  // ── Métodos para OperadorCampoV2Page → Cloud Run ──
  iniciarParte:         (data: any) => postFAST('/partes/iniciar', data),
  finalizarParte:       (data: any) => postFAST('/partes/cerrar', data),
  actualizarChecklistExec:(data: any) => putFAST('/partes/' + data.parte_id + '/checklist/' + data.id, data),
}
