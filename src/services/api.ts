const API_BASE = 'https://script.google.com/macros/s/AKfycbxAqDQfnjew21PPYZniTkoNn-Y-lx0SVUmOYM9yVOSfUWVyYiojMjW7mQA1GHOlcwY61Q/exec'

function getToken(): string { return localStorage.getItem('auth_token') || '' }

// ═══ CACHÉ PERSISTENTE (localStorage + stale-while-revalidate) ═══
const CACHE_TTL = 120000      // 2 min = datos frescos
const STALE_TTL = 86400000    // 24h = datos obsoletos pero usables mientras refresca
const CACHE_PREFIX = 'fc_'

function cacheGet(key: string): { data: any; fresh: boolean } | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const entry = JSON.parse(raw)
    const age = Date.now() - entry.ts
    if (age < CACHE_TTL) return { data: entry.data, fresh: true }
    if (age < STALE_TTL) return { data: entry.data, fresh: false } // stale pero usable
    localStorage.removeItem(CACHE_PREFIX + key)
    return null
  } catch { return null }
}

function cacheSet(key: string, data: any) {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() })) } catch { /* storage full */ }
}

function cacheInvalidate(prefix?: string) {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX))
  if (!prefix) { keys.forEach(k => localStorage.removeItem(k)); return }
  keys.filter(k => k.includes(prefix)).forEach(k => localStorage.removeItem(k))
}

// Refresco en segundo plano (no bloquea UI)
function refreshInBackground(action: string, params?: Record<string, string>) {
  const cacheKey = `${action}:${JSON.stringify(params || {})}`
  let url = `${API_BASE}?action=${action}&token=${encodeURIComponent(getToken())}`
  if (params) { for (const [k, v] of Object.entries(params)) url += `&${k}=${encodeURIComponent(v)}` }
  fetch(url).then(r => r.json()).then(data => { if (data.code !== 401) cacheSet(cacheKey, data) }).catch(() => {})
}

async function fetchAPI(action: string, params?: Record<string, string>): Promise<any> {
  let url = `${API_BASE}?action=${action}&token=${encodeURIComponent(getToken())}`
  if (params) { for (const [k, v] of Object.entries(params)) url += `&${k}=${encodeURIComponent(v)}` }
  const cacheKey = `${action}:${JSON.stringify(params || {})}`

  // 1. Datos frescos en caché → devolver directo
  const cached = cacheGet(cacheKey)
  if (cached?.fresh) return cached.data

  // 2. Datos obsoletos → devolver + refrescar en segundo plano
  if (cached && !cached.fresh) {
    refreshInBackground(action, params)
    return cached.data
  }

  // 3. Sin caché → llamada real
  const r = await fetch(url)
  if (!r.ok) throw new Error('Error: ' + r.status)
  const data = await r.json()
  if (data.code === 401) { localStorage.removeItem('auth_token'); localStorage.removeItem('usuario'); window.location.href = '/login'; throw new Error('No autorizado') }
  cacheSet(cacheKey, data)
  return data
}

async function postAPI(data: any): Promise<any> {
  const payload = { ...data, token: getToken() }
  const r = await fetch(API_BASE, { method: 'POST', body: JSON.stringify(payload) })
  if (!r.ok) throw new Error('Error: ' + r.status)
  const resp = await r.json()
  if (resp.code === 401) { localStorage.removeItem('auth_token'); localStorage.removeItem('usuario'); window.location.href = '/login'; throw new Error('No autorizado') }
  // Invalidar solo la caché relacionada con la acción (no toda)
  const _accion = data.action || ""
  if (_accion.includes("fichaj") || _accion.includes("fichar")) cacheInvalidate("fichaj")
  else if (_accion.includes("ausenc")) cacheInvalidate("ausenc")
  else if (_accion.includes("emplead") || _accion.includes("subrogad") || _accion.includes("incorpor")) cacheInvalidate("emplead")
  else if (_accion.includes("oportun") || _accion.includes("licit") || _accion.includes("analiz") || _accion.includes("calcul") || _accion.includes("result")) cacheInvalidate("oportun")
  else if (_accion.includes("batch_")) {} // batch no invalida
  else cacheInvalidate() // acciones generales sí invalidan todo
  return resp
}

// ═══ PRECARGA AL LOGIN ═══
function prefetchCommonData() {
  const actions = ['estadisticas', 'oportunidades', 'empleados', 'mapa_convenios']
  actions.forEach(a => {
    const key = `${a}:{}`
    const cached = cacheGet(key)
    if (!cached || !cached.fresh) {
      const url = `${API_BASE}?action=${a}&token=${encodeURIComponent(getToken())}`
      fetch(url).then(r => r.json()).then(data => { if (data.code !== 401) cacheSet(key, data) }).catch(() => {})
    }
  })
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve((reader.result as string).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file) })
}

export interface Stats { total: number; nueva: number; en_analisis: number; go: number; no_go: number }

export const api = {
  // ═══ PRECARGA ═══
  prefetch: () => prefetchCommonData(),
  // ═══ BATCH (una llamada por página) ═══
  batch: (acciones: string[], id?: string) => fetchAPI('batch', { acciones: acciones.join(','), ...(id ? { id } : {}) }),
  login: (email: string, password: string) => postAPI({ action: 'login', email, password }),
  dashboard: () => fetchAPI('dashboard'),
  oportunidades: () => fetchAPI('oportunidades'),
  stats: () => fetchAPI('stats') as Promise<Stats>,
  config: () => fetchAPI('config'),
  configRaw: () => fetchAPI('config_raw'),
  addConfig: (data: { tipo: string; valor: string; activo?: boolean; descripcion?: string }) => postAPI({ action: 'add_config', ...data }),
  updateConfig: (data: { fila: number; valor?: string; activo?: boolean; descripcion?: string }) => postAPI({ action: 'update_config', ...data }),
  deleteConfig: (fila: number) => postAPI({ action: 'delete_config', fila }),
  buscar: () => fetchAPI('buscar'),
  crearOportunidad: (data: any) => fetchAPI('crear', { titulo: data.titulo||'', organismo: data.organismo||'', cpv: data.cpv||'', presupuesto: String(data.presupuesto||0), fecha_limite: data.fecha_limite||'', procedimiento: data.procedimiento||'', url_anuncio: data.url||'', descripcion: data.descripcion||'', fuente: data.fuente||'Manual', notas: data.notas||'' }),
  detalle: (id: string) => fetchAPI('detalle', { id }),
  actualizar: (id: string, data: any) => { const p: Record<string, string> = { id }; if (data.titulo) p.titulo = data.titulo; if (data.organismo) p.organismo = data.organismo; if (data.cpv) p.cpv = data.cpv; if (data.presupuesto) p.presupuesto = String(data.presupuesto); if (data.fecha_limite) p.fecha_limite = data.fecha_limite; if (data.procedimiento) p.procedimiento = data.procedimiento; if (data.url) p.url_anuncio = data.url; if (data.estado) p.estado = data.estado; if (data.descripcion) p.descripcion = data.descripcion; return fetchAPI('actualizar', p) },
  descargarPliegos: (id: string) => fetchAPI('descargar_pliegos', { id }),
  analizarPliegos: (id: string) => fetchAPI('analizar', { id }),
  obtenerAnalisis: (id: string) => fetchAPI('analisis', { id }),
  convenios: () => fetchAPI('convenios'),
  categoriasConvenio: (id: string) => fetchAPI('categorias_convenio', { id }),
  compararConvenios: (categoria?: string) => fetchAPI('comparar_convenios', categoria ? { categoria } : {}),
  detectarConvenio: (provincia: string, sector?: string) => fetchAPI('detectar_convenio', { provincia, ...(sector ? { sector } : {}) }),
  alertasConvenios: () => fetchAPI('alertas_convenios'),
  mapaConvenios: () => fetchAPI('mapa_convenios'),
  buscarConvenioAuto: (provincia: string, sector: string) => postAPI({ action: 'buscar_convenio_auto', provincia, sector }),
  subirConvenio: async (file: File) => { const b = await fileToBase64(file); return postAPI({ action: 'upload_convenio', filename: file.name, base64: b, mime_type: file.type || 'application/pdf' }) },
  eliminarConvenio: (id: string) => postAPI({ action: 'delete_convenio', id }),
  costesReferencia: () => fetchAPI('costes_referencia'),
  addCosteRef: (data: any) => postAPI({ action: 'add_coste_ref', ...data }),
  updateCosteRef: (data: any) => postAPI({ action: 'update_coste_ref', ...data }),
  deleteCosteRef: (bloque: string, concepto: string) => postAPI({ action: 'delete_coste_ref', bloque, concepto }),
  guardarCalculo: (id: string, json: string) => postAPI({ action: 'save_calculo', oportunidad_id: id, json_datos: json }),
  cargarCalculo: (id: string) => fetchAPI('load_calculo', { id }),
  conocimiento: () => fetchAPI('conocimiento'),
  conocimientoStats: () => fetchAPI('conocimiento_stats'),
  buscarConocimiento: (q: string, l?: number) => fetchAPI('conocimiento_buscar', { q, limit: String(l || 8) }),
  subirConocimiento: async (file: File, meta: any) => { const b = await fileToBase64(file); return postAPI({ action: 'upload_conocimiento', filename: file.name, base64: b, mime_type: file.type || 'application/pdf', ...meta }) },
  eliminarConocimiento: (id: string) => postAPI({ action: 'delete_conocimiento', id }),
  documentosOferta: (id: string) => fetchAPI('documentos_oferta', { id }),
  generarDocumento: (id: string, tipo: string) => postAPI({ action: 'generar_documento', oportunidad_id: id, tipo }),
  generarTodosDocumentos: (id: string) => postAPI({ action: 'generar_todos_documentos', oportunidad_id: id }),
  investigacion: (id: string) => fetchAPI('investigacion', { id }),
  investigarHistorico: (id: string) => postAPI({ action: 'investigar_historico', oportunidad_id: id }),
  recomendarPrecio: (data: any) => postAPI({ action: 'recomendar_precio', ...data }),
  obtenerAprobacion: (id: string) => fetchAPI('aprobacion', { id }),
  aprobarDireccion: (data: any) => postAPI({ action: 'aprobar_direccion', ...data }),
  documentosGeneral: (modulo?: string) => fetchAPI('documentos', modulo ? { modulo } : {}),
  alertasDocumentos: () => fetchAPI('alertas_documentos'),
  subirDocumentoGeneral: async (file: File) => { const b = await fileToBase64(file); return postAPI({ action: 'upload_documento_general', filename: file.name, base64: b, mime_type: file.type || 'application/pdf' }) },
  reclasificarDocumento: (data: any) => postAPI({ action: 'reclasificar_documento', ...data }),
  empleados: (filtro?: string) => fetchAPI('empleados', filtro ? { busqueda: filtro } : {}),
  empleado: (id: string) => fetchAPI('empleado', { id }),
  statsRRHH: () => fetchAPI('stats_rrhh'),
  addEmpleado: (data: any) => postAPI({ action: 'add_empleado', ...data }),
  updateEmpleado: (data: any) => postAPI({ action: 'update_empleado', ...data }),
  bajaEmpleado: (data: any) => postAPI({ action: 'baja_empleado', ...data }),
  asignaciones: (filtro?: { empleado?: string; proyecto?: string }) => fetchAPI('asignaciones', filtro || {}),
  capacidadEmpleado: (id: string) => fetchAPI('capacidad_empleado', { id }),
  costeProyecto: (id: string) => fetchAPI('coste_proyecto', { id }),
  empleadosDisponibles: (pct?: number) => fetchAPI('empleados_disponibles', pct ? { porcentaje: String(pct) } : {}),
  addAsignacion: (data: any) => postAPI({ action: 'add_asignacion', ...data }),
  updateAsignacion: (data: any) => postAPI({ action: 'update_asignacion', ...data }),
  finalizarAsignacion: (data: any) => postAPI({ action: 'finalizar_asignacion', ...data }),
  // PRL
  prlDashboard: () => fetchAPI('prl_dashboard'),
  prlEpis: (empleado?: string) => fetchAPI('prl_epis', empleado ? { empleado } : {}),
  prlReconocimientos: (empleado?: string) => fetchAPI('prl_reconocimientos', empleado ? { empleado } : {}),
  prlFormacion: (empleado?: string) => fetchAPI('prl_formacion', empleado ? { empleado } : {}),
  prlAccidentes: (empleado?: string) => fetchAPI('prl_accidentes', empleado ? { empleado } : {}),
  addEpi: (data: any) => postAPI({ action: 'add_epi', ...data }),
  addReconocimiento: (data: any) => postAPI({ action: 'add_reconocimiento', ...data }),
  addFormacionPrl: (data: any) => postAPI({ action: 'add_formacion_prl', ...data }),
  addAccidente: (data: any) => postAPI({ action: 'add_accidente', ...data }),
  alertasCaducidad: () => fetchAPI('alertas_caducidad'),
  generarRecibiEpi: (data: any) => postAPI({ action: 'generar_recibi_epi', ...data }),
  generarNotifReconocimiento: (data: any) => postAPI({ action: 'generar_notif_reconocimiento', ...data }),
  generarActaFormacion: (data: any) => postAPI({ action: 'generar_acta_formacion', ...data }),
  generarAvisoCaducidad: (data: any) => postAPI({ action: 'generar_aviso_caducidad', ...data }),
  // RGPD
  rgpdDashboard: () => fetchAPI('rgpd_dashboard'),
  rgpdConsentimientos: (empleado?: string) => fetchAPI('rgpd_consentimientos', empleado ? { empleado } : {}),
  rgpdArco: (empleado?: string) => fetchAPI('rgpd_arco', empleado ? { empleado } : {}),
  rgpdTratamientos: () => fetchAPI('rgpd_tratamientos'),
  rgpdBrechas: () => fetchAPI('rgpd_brechas'),
  addConsentimiento: (data: any) => postAPI({ action: 'add_consentimiento', ...data }),
  revocarConsentimiento: (data: any) => postAPI({ action: 'revocar_consentimiento', ...data }),
  addArco: (data: any) => postAPI({ action: 'add_arco', ...data }),
  responderArco: (data: any) => postAPI({ action: 'responder_arco', ...data }),
  addTratamiento: (data: any) => postAPI({ action: 'add_tratamiento', ...data }),
  addBrecha: (data: any) => postAPI({ action: 'add_brecha', ...data }),
  generarDocConsentimiento: (data: any) => postAPI({ action: 'generar_doc_consentimiento', ...data }),
  generarDocArco: (data: any) => postAPI({ action: 'generar_doc_arco', ...data }),
  // SUBROGACIÓN
  subrogaciones: (oportunidad?: string) => fetchAPI('subrogaciones', oportunidad ? { oportunidad } : {}),
  personalSubrogado: (id_subrogacion: string) => fetchAPI('personal_subrogado', { id_subrogacion }),
  resumenSubrogacion: (id_oportunidad: string) => fetchAPI('resumen_subrogacion', { id_oportunidad }),
  crearSubrogacion: (data: any) => postAPI({ action: 'crear_subrogacion', ...data }),
  addPersonalSubrogado: (data: any) => postAPI({ action: 'add_personal_subrogado', ...data }),
  verificarPersonalSubrogado: (data: any) => postAPI({ action: 'verificar_personal_subrogado', ...data }),
  importarListadoSubrogacion: (data: any) => postAPI({ action: 'importar_listado_subrogacion', ...data }),
  incorporarSubrogadoRRHH: (data: any) => postAPI({ action: 'incorporar_subrogado_rrhh', ...data }),
  generarCartaSubrogacion: (data: any) => postAPI({ action: 'generar_carta_subrogacion', ...data }),
  // ELIMINAR (genérico)
  eliminarPersonalSubrogado: (id: string, id_subrogacion?: string) => postAPI({ action: 'eliminar_personal_subrogado', id, id_subrogacion }),
  eliminarSubrogacion: (id: string) => postAPI({ action: 'eliminar_subrogacion', id }),
  eliminarEpi: (id: string) => postAPI({ action: 'eliminar_epi', id }),
  eliminarReconocimiento: (id: string) => postAPI({ action: 'eliminar_reconocimiento', id }),
  eliminarFormacionPrl: (id: string) => postAPI({ action: 'eliminar_formacion_prl', id }),
  eliminarAccidente: (id: string) => postAPI({ action: 'eliminar_accidente', id }),
  eliminarConsentimiento: (id: string) => postAPI({ action: 'eliminar_consentimiento', id }),
  eliminarArco: (id: string) => postAPI({ action: 'eliminar_arco', id }),
  eliminarTratamiento: (id: string) => postAPI({ action: 'eliminar_tratamiento', id }),
  eliminarBrecha: (id: string) => postAPI({ action: 'eliminar_brecha', id }),
  // FICHAJES
  fichar: (data: any) => postAPI({ action: 'fichar', ...data }),
  fichajes: (filtro?: any) => fetchAPI('fichajes', filtro),
  estadoFichaje: (id_empleado: string) => fetchAPI('estado_fichaje', { id_empleado }),
  resumenDiarioFichajes: (id_empleado: string, mes: string, anio: string) => fetchAPI('resumen_diario_fichajes', { id_empleado, mes, anio }),
  resumenMensualFichajes: (mes: string, anio: string) => fetchAPI('resumen_mensual_fichajes', { mes, anio }),
  // AUSENCIAS
  ausencias: (filtro?: any) => fetchAPI('ausencias', filtro || {}),
  resumenVacaciones: (id_empleado: string, anio?: string) => fetchAPI('resumen_vacaciones', { id_empleado, anio: anio || String(new Date().getFullYear()) }),
  calendarioAusencias: (mes: string, anio: string) => fetchAPI('calendario_ausencias', { mes, anio }),
  dashboardAusencias: () => fetchAPI('dashboard_ausencias'),
  solicitarAusencia: (data: any) => postAPI({ action: 'solicitar_ausencia', ...data }),
  aprobarAusencia: (data: any) => postAPI({ action: 'aprobar_ausencia', ...data }),
  eliminarAusencia: (id: string) => postAPI({ action: 'eliminar_ausencia', id }),
  resultado: (id: string) => fetchAPI('resultado', { id }),
  seguimiento: (id: string) => fetchAPI('seguimiento', { id }),
  resumenContratos: () => fetchAPI('resumen_contratos'),
  registrarResultado: (data: any) => postAPI({ action: 'registrar_resultado', ...data }),
  registrarSeguimiento: (data: any) => postAPI({ action: 'registrar_seguimiento', ...data }),
  usuarios: () => fetchAPI('usuarios'),
  addUsuario: (data: any) => postAPI({ action: 'add_usuario', ...data }),
  updateUsuario: (data: any) => postAPI({ action: 'update_usuario', ...data }),
  deleteUsuario: (email: string) => postAPI({ action: 'delete_usuario', email }),
  subirArchivo: async (file: File, id: string) => { const b = await fileToBase64(file); return postAPI({ action: 'upload', filename: file.name, base64: b, oportunidad_id: id, mime_type: file.type || 'application/pdf' }) },

  // ═══ BATCH POR PÁGINA (1 llamada = toda la página) ═══
  batchDecisiones:   (id: string) => fetchAPI('batch_decisiones', { id }),
  batchOfertas:      (id: string) => fetchAPI('batch_ofertas', { id }),
  batchSeguimiento:  ()           => fetchAPI('batch_seguimiento'),
  batchSubrogacion:  ()           => fetchAPI('batch_subrogacion'),
  batchPersonal:     ()           => fetchAPI('batch_personal'),
  batchAusencias:    ()           => fetchAPI('batch_ausencias'),

  // ═══ SUBROGACIÓN ═══
  actualizarDatosPersonalesSubrogado: (data: any) => postAPI({ action: 'actualizar_datos_personales_subrogado', ...data }),
  marcarContactadoSubrogado: (data: any) => postAPI({ action: 'marcar_contactado_subrogado', ...data }),
  incorporarSubrogadoForzado: (data: any) => postAPI({ action: 'incorporar_subrogado_forzado', ...data }),
  incorporarSubrogadoSinDniCheck: (data: any) => postAPI({ action: 'incorporar_subrogado_sin_dni_check', ...data }),

  // ═══ EXPEDIENTE DIGITAL ═══
  expediente: (id_empleado: string) => fetchAPI('expediente', { id: id_empleado }),
}