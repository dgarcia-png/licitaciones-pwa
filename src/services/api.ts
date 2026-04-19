// src/services/api.ts — ACTUALIZADO 19/04/2026
// [6/04] AUDITORÍA COMPLETA: corregido API_BASE, migradas 11 llamadas GAS→CR
// [4/04] Bloques 6-11: validarMasivo, vehículos/calidad/portal/planificación/informes → Cloud Run

const API_BASE  = 'https://script.google.com/macros/s/AKfycbwrUSLBq5M9rLuDdqISOD8aip5LCqBVJGhms4tf4-z0SlQEr_JbnBsDR-jQuSAmJahQlg/exec'
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
  if (data.code === 401) { console.warn('GAS 401 - módulo en GAS no accesible'); return {} }
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

// ── [6/04] prefetch ahora usa Cloud Run ──────────────────────────────────────
function prefetchCommonData() {
  const endpoints = [
    { path: '/licitaciones/oportunidades', key: 'oportunidades' },
    { path: '/empleados', key: 'empleados' },
    { path: '/convenios/mapa/provincias', key: 'mapa_convenios' },
  ]
  endpoints.forEach(({ path, key }) => {
    const cacheKey = `${key}:{}`
    if (!cacheGet(cacheKey, key)?.fresh) {
      fetch(`${API_FAST}${path}`, { headers: { 'x-token': getToken() } })
        .then(r => r.json()).then(d => cacheSet(cacheKey, d)).catch(() => {})
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



// ── Sanitizador global — convierte Timestamps, fechas numéricas, protege arrays ──
const DATE_KEYS = /^(fecha|date|created|updated|modified|periodo|vencimiento|caducidad|proxima|inicio|fin_contrato|alta|baja|nacimiento|itv|seguro|revision|obtencion|solicitud|aprobacion|incorporacion|deteccion|resolucion|entrega|pedido|timestamp|check_in|check_out|ultimo_acceso)/i
const ARRAY_KEYS = /^(empleados|centros|fichajes|partes|ordenes|incidencias|vehiculos|inspecciones|servicios|sustituciones|festivos|ausencias|acciones|nps|asignaciones|materiales|maquinaria|documentos|oportunidades|resultados|lotes|convenios|categorias|comentarios|alertas|repostajes|pedidos|contratos|proyectos|tokens|certificaciones|subrogaciones|personal|checklist|fotos|costes|seguimiento|top_|por_|ultimas_)/i

function sanitize(obj: any): any {
  if (obj === null || obj === undefined) return obj
  // Firestore Timestamp → ISO string
  if (typeof obj === 'object' && '_seconds' in obj && '_nanoseconds' in obj) {
    return new Date(obj._seconds * 1000).toISOString().split('T')[0]
  }
  if (Array.isArray(obj)) return obj.map(sanitize)
  if (typeof obj === 'object' && obj.constructor === Object) {
    const out: any = {}
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined) { out[k] = v; continue }
      // Firestore Timestamp object
      if (typeof v === 'object' && !Array.isArray(v) && v !== null && '_seconds' in (v as any)) {
        out[k] = new Date((v as any)._seconds * 1000).toISOString().split('T')[0]
        continue
      }
      // Número en campo de fecha → convertir a string YYYY-MM-DD
      if (typeof v === 'number' && DATE_KEYS.test(k) && v > 1e12) {
        out[k] = new Date(v).toISOString().split('T')[0]
        continue
      }
      // ISO string largo → recortar a YYYY-MM-DD para campos de fecha pura
      if (typeof v === 'string' && DATE_KEYS.test(k) && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
        out[k] = v.substring(0, 10)
        continue
      }
      // Array esperado pero es undefined → array vacío
      if (v === undefined && ARRAY_KEYS.test(k)) { out[k] = []; continue }
      // Recursión
      out[k] = sanitize(v)
    }
    // Garantizar arrays comunes
    for (const k of Object.keys(out)) {
      if (ARRAY_KEYS.test(k) && out[k] === undefined) out[k] = []
    }
    return out
  }
  return obj
}

// ── Cloud Run helpers ────────────────────────────────────────────────────────
async function fetchFAST(path: string, params?: Record<string, string>): Promise<any> {
  let url = `${API_FAST}${path}`
  if (params) { const q = new URLSearchParams(params).toString(); if (q) url += '?' + q }
  const r = await fetch(url, { headers: { 'x-token': getToken() } })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  const data = await r.json()
  if (data.code === 401) { console.warn('CR 401'); return {} }
  return sanitize(data)
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
  return sanitize(resp)
}

async function putFAST(path: string, data: any): Promise<any> {
  const r = await fetch(`${API_FAST}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-token': getToken() },
    body: JSON.stringify(data)
  })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json().then(sanitize)
}

async function deleteFAST(path: string): Promise<any> {
  const r = await fetch(`${API_FAST}${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'x-token': getToken() }
  })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json().then(sanitize)
}


export interface Stats { total: number; nueva: number; en_analisis: number; go: number; no_go: number }

export const api = {
  invalidarCache: () => cacheInvalidate(),
  prefetch: () => prefetchCommonData(),

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════════════════════════════════════
  login: (email: string, password: string) => postFAST('/auth/login', { email, password }),
  logout: () => postFAST('/auth/logout', {}),

  // ═══════════════════════════════════════════════════════════════════════════
  // LICITACIONES — Cloud Run
  // ═══════════════════════════════════════════════════════════════════════════
  extraerDatosPliego: (data: any) => postFAST('/licitaciones/extraer-datos-pliego', data),
  batchDecisiones:  (id: string) => { cacheInvalidate('batch_decisiones'); return fetchFAST('/licitaciones/batch-decisiones/' + id) },
  dashboard:        () => fetchFAST('/licitaciones/dashboard'),
  oportunidades:    () => fetchFAST('/licitaciones/oportunidades'),
  stats:            () => fetchFAST('/licitaciones/oportunidades/stats') as Promise<Stats>,
  buscar: async () => { cacheInvalidate('oportunidades'); cacheInvalidate('stats'); cacheInvalidate('dashboard'); return fetchFAST('/licitaciones/oportunidades') },
  crearOportunidad: (data: any) => { cacheInvalidate('oportunidades'); cacheInvalidate('stats'); return postFAST('/licitaciones/oportunidades', data) },
  detalle: (id: string) => fetchFAST('/licitaciones/oportunidades/' + id),
  actualizar: (id: string, data: any) => putFAST('/licitaciones/oportunidades/' + id, data),
  descargarPliegos: async (id: string) => { const r = await postFAST('/licitaciones/descargar-pliegos/' + id, {}); cacheInvalidate('detalle'); cacheInvalidate('oportunidades'); return r },
  analizarPliegos: async (id: string) => { const r = await postFAST('/licitaciones/analizar/' + id, {}); cacheInvalidate('analisis'); cacheInvalidate('obtener_lotes'); cacheInvalidate('detalle'); cacheInvalidate('batch_decisiones'); return r },
  obtenerAnalisis:  (id: string) => fetchFAST('/licitaciones/analisis/' + id),
  obtenerLotes: (id_oportunidad: string) => { cacheInvalidate('obtener_lotes'); return fetchFAST('/licitaciones/lotes/' + id_oportunidad) },
  crearLotesDesdeAnalisis: async (id_oportunidad: string) => { const r = await postFAST('/licitaciones/lotes/desde-analisis/' + id_oportunidad, {}); cacheInvalidate('obtener_lotes'); cacheInvalidate('detalle'); return r },
  actualizarLote:   (data: any) => putFAST('/licitaciones/lotes/' + data.id, data),
  guardarCalculoLote:(data: any) => postFAST('/licitaciones/calculo', data),
  cargarCalculoLote:(oportunidad_id: string, id_lote: string) => fetchFAST('/licitaciones/calculo/' + oportunidad_id, { id_lote }),
  guardarCalculo:   (id: string, json: string) => postFAST('/licitaciones/calculo', { id_oportunidad: id, json_datos: json }),
  cargarCalculo:    (id: string) => fetchFAST('/licitaciones/calculo/' + id),
  investigacion:    (id: string) => fetchFAST('/licitaciones/investigacion/' + id),
  investigarHistorico:(id: string) => postFAST('/licitaciones/investigar/' + id, {}),
  recomendarPrecio: (data: any) => postFAST('/licitaciones/recomendar/' + data.oportunidad_id, data),  // [I-LIC-5]
  obtenerAprobacion:(id: string) => fetchFAST('/licitaciones/aprobacion/' + id),
  aprobarDireccion: (data: any) => postFAST('/licitaciones/aprobar', data),
  resultado:        (id: string) => fetchFAST('/licitaciones/resultado/' + id),
  seguimiento:      (id: string) => fetchFAST('/licitaciones/seguimiento/' + id),
  actividad:        (id: string) => fetchFAST('/licitaciones/actividad/' + id),
  resumenContratos: () => fetchFAST('/licitaciones/resumen-contratos'),
  registrarResultado:(data: any) => postFAST('/licitaciones/resultado', data),
  registrarSeguimiento:(data: any) => postFAST('/licitaciones/seguimiento', data),
  plContrato:       (id: string, meses?: number) => fetchFAST('/licitaciones/pl-contrato/' + id, meses ? { meses: String(meses) } : {}),
  plMesActual:      (id: string) => fetchFAST('/licitaciones/pl-mes-actual/' + id),
  buscarNuevasLicitaciones: () => postFAST('/licitaciones/buscar-nuevas', {}),
  recalcularScoring:        () => postFAST('/licitaciones/recalcular-scoring', {}),
  buscarConvenioInternet:(data: any) => postFAST('/licitaciones/buscar-convenio', data),
  archivarOportunidad:  (id: string) => postFAST('/licitaciones/oportunidades/' + id + '/archivar', {}),
  restaurarOportunidad: (id: string) => postFAST('/licitaciones/oportunidades/' + id + '/restaurar', {}),
  papelera:             (_hoja?: string) => Promise.resolve({ oportunidades: [], empleados: [] }),
  restaurarPapelera:    (id_papelera: string) => postFAST('/licitaciones/oportunidades/' + id_papelera + '/restaurar', {}),
  busquedaGlobal:       (q: string) => fetchFAST('/licitaciones/busqueda-global', { q }),
  // Aliases
  dashboard360:     () => fetchFAST('/dashboard/360'),
  batchOfertas:     (id: string) => fetchFAST('/licitaciones/oportunidades/' + id),
  batchSeguimiento: () => fetchFAST('/licitaciones/oportunidades'),

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIG
  // ═══════════════════════════════════════════════════════════════════════════
  config:           () => fetchFAST('/config/licitaciones'),
  configRaw:        () => fetchFAST('/config/licitaciones/raw'),
  addConfig:        (data: any) => postFAST('/config/licitaciones', data),
  updateConfig:     (data: any) => putFAST('/config/licitaciones/' + data.id, data),
  deleteConfig:     (id: string) => deleteFAST('/config/licitaciones/' + id),
  configGlobal:          () => fetchFAST('/config/global'),
  guardarConfigGlobal:   (data: any) => putFAST('/config/global', data),

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVENIOS — Cloud Run
  // ═══════════════════════════════════════════════════════════════════════════
  convenios:        () => fetchFAST('/convenios'),
  categoriasConvenio:(id: string) => fetchFAST('/convenios/' + id + '/categorias'),
  compararConvenios:(categoria?: string) => fetchFAST('/convenios/comparar/todos', categoria ? { categoria } : {}),
  detectarConvenio: (provincia: string, sector?: string) => fetchFAST('/convenios/detectar/' + provincia, sector ? { sector } : {}),
  alertasConvenios: () => fetchFAST('/convenios/alertas/vencimientos'),
  mapaConvenios:    () => fetchFAST('/convenios/mapa/provincias'),
  buscarConvenioAuto:(provincia: string, sector: string) => fetchFAST('/convenios/detectar/' + provincia, { sector }),  // [C-LIC-4] era postFAST, backend define GET
  subirConvenio:    async (file: File) => { const b = await fileToBase64(file); return postAPI({ action: 'upload_convenio', filename: file.name, base64: b, mime_type: file.type||'application/pdf' }) },
  eliminarConvenio: async (id: string) => { const r = await deleteFAST('/convenios/' + id); cacheInvalidate('convenios'); cacheInvalidate('categorias_convenio'); return r },
  costesReferencia: () => fetchFAST('/convenios/costes/referencia'),
  addCosteRef:      (data: any) => postFAST('/convenios/costes/referencia', data),
  updateCosteRef:   (data: any) => putFAST('/convenios/costes/referencia/' + data.id, data),
  deleteCosteRef:   (id: string) => deleteFAST('/convenios/costes/referencia/' + id),

  // ═══════════════════════════════════════════════════════════════════════════
  // CONOCIMIENTO — Cloud Run (excepto upload binario → GAS)
  // ═══════════════════════════════════════════════════════════════════════════
  conocimiento:     () => fetchFAST('/conocimiento'),
  conocimientoStats:() => fetchFAST('/conocimiento/stats'),
  buscarConocimiento:(q: string, l?: number) => fetchFAST('/conocimiento/buscar', { q, limit: String(l||8) }),
  subirConocimiento:async (file: File, meta: any) => { const b = await fileToBase64(file); return postAPI({ action: 'upload_conocimiento', filename: file.name, base64: b, mime_type: file.type||'application/pdf', ...meta }) },
  eliminarConocimiento:(id: string) => deleteFAST('/conocimiento/' + id),

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCUMENTOS — Cloud Run
  // ═══════════════════════════════════════════════════════════════════════════
  documentosOferta: (id: string) => fetchFAST('/documentos/oferta/' + id),
  generarDocumento: (id: string, tipo: string) => postFAST('/documentos/oferta/generar', { id_oportunidad: id, tipo }),
  generarTodosDocumentos:(id: string) => postFAST('/documentos/oferta/generar-todos', { id_oportunidad: id }),
  documentosGeneral:(modulo?: string) => fetchFAST('/documentos', modulo ? { modulo } : {}),
  alertasDocumentos:() => fetchFAST('/documentos/alertas'),
  subirDocumentoGeneral: async (file: File) => { const b = await fileToBase64(file); return postFAST('/documentos', { filename: file.name, base64: b, mime_type: file.type||'application/pdf' }) },
  reclasificarDocumento:(data: any) => putFAST('/documentos/' + data.id, data),
  subirArchivo:     async (file: File, id: string) => { const b = await fileToBase64(file); return postFAST('/documentos/subir-archivo', { filename: file.name, base64: b, oportunidad_id: id, mime_type: file.type||'application/pdf' }) },
  plantillas:       (modulo?: string) => fetchFAST('/documentos/plantillas', modulo ? { modulo } : {}),
  registrarPlantilla:(data: any) => postFAST('/documentos/plantillas', data),
  crearPlantillaVacia:(data: any) => postFAST('/documentos/plantillas', data),
  actualizarPlantilla:(data: any) => putFAST('/documentos/plantillas/' + data.id, data),
  generarDesdePlantilla:(data: any) => postFAST('/documentos/generar-pdf', { tipo: 'plantilla', ...data }),

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPLEADOS — Cloud Run
  // ═══════════════════════════════════════════════════════════════════════════
  empleados:        (filtro?: string) => fetchFAST('/empleados', filtro ? { busqueda: filtro } : {}),
  empleado:         (id: string) => fetchFAST('/empleados/' + id),
  batchPersonal:    () => fetchFAST('/empleados'),
  statsRRHH:        () => fetchFAST('/empleados/stats'),
  dashboardRRHH:    () => fetchFAST('/dashboard/rrhh'),
  expediente:       (id_empleado: string) => fetchFAST('/empleados/' + id_empleado + '/expediente'),
  addEmpleado:      (data: any) => postFAST('/empleados', data),
  updateEmpleado:   (data: any) => putFAST('/empleados/' + data.id, data),
  bajaEmpleado:     (data: any) => postFAST('/empleados/' + data.id + '/baja', data),
  restaurarEmpleado:(data: any) => postFAST('/empleados/' + data.id + '/reactivar', data),
  asignaciones:     (filtros?: any) => fetchFAST('/empleados/asignaciones/todas', filtros || {}),
  addAsignacion:    (data: any) => postFAST('/empleados/asignaciones', data),
  actualizarAsignacion:(data: any) => putFAST('/empleados/asignaciones/' + data.id, data),
  finalizarAsignacion:(data: any) => putFAST('/empleados/asignaciones/' + data.id + '/finalizar', data),
  capacidadEmpleado:(id: string) => fetchFAST('/empleados/' + id + '/capacidad'),
  costeProyecto:    (id: string) => fetchFAST('/empleados/' + id + '/coste-proyecto'),
  empleadosDisponibles:(porcentaje?: number) => fetchFAST('/empleados/disponibles', porcentaje ? { porcentaje: String(porcentaje) } : {}),
  historialCentrosEmpleado:(id: string) => fetchFAST('/empleados/' + id + '/historial-centros'),
  asignacionesEmp:  (id: string) => fetchFAST('/empleados/' + id + '/asignaciones'),

  // ═══════════════════════════════════════════════════════════════════════════
  // USUARIOS — Cloud Run
  // ═══════════════════════════════════════════════════════════════════════════
  usuarios:         () => fetchFAST('/usuarios'),
  addUsuario:       (data: any) => postFAST('/usuarios', data),
  updateUsuario:    (data: any) => putFAST('/usuarios/' + data.email.replace(/[^a-zA-Z0-9]/g, '_'), data),
  deleteUsuario:    (email: string) => deleteFAST('/usuarios/' + email.replace(/[^a-zA-Z0-9]/g, '_')),

  // ═══════════════════════════════════════════════════════════════════════════
  // FICHAJES — Cloud Run
  // ═══════════════════════════════════════════════════════════════════════════
  fichajes:         (params?: any) => fetchFAST('/fichajes', params || {}),
  estadoFichaje:    (id: string) => fetchFAST('/fichajes/estado/' + id),
  resumenDiarioFichajes:(id: string, mes: string, anio: string) => fetchFAST('/fichajes/resumen/' + id, { mes, anio }),
  resumenMensualFichajes:(mes: string, anio: string) => fetchFAST('/fichajes/resumen-mensual', { mes, anio }),
  horasExtra:       (filtros?: any) => fetchFAST('/fichajes/horas-extra', filtros || {}),
  horasExtraEmpleado:(id: string) => fetchFAST('/fichajes/horas-extra', { empleado_id: id }),
  horasExtraAnual:   (anio?: number) => fetchFAST('/fichajes/horas-extra/anual', anio ? { anio: String(anio) } : {}),
  fichar:           (data: any) => postFAST('/fichajes', data),
  validarFichaje:   (data: any) => putFAST('/fichajes/' + data.id + '/validar', data),
  validarMasivoFichajes: (data: any) => putFAST('/fichajes/validar-masivo', data),
  aprobarHorasExtra:(data: any) => putFAST('/fichajes/horas-extra/' + data.id + '/aprobar', data),
  generarInformeFichajes:(data: any) => postFAST('/documentos/generar-pdf', { tipo: 'informe_fichajes', ...data }),
  batchSupervisionFichajes:(mes: string, anio: string) => fetchFAST('/fichajes/supervision', { mes, anio }),
  estadoHoy:            () => fetchFAST('/fichajes/estado-hoy'),

  // ═══════════════════════════════════════════════════════════════════════════
  // AUSENCIAS — Cloud Run
  // ═══════════════════════════════════════════════════════════════════════════
  ausencias:        (filtros?: any) => fetchFAST('/ausencias', filtros || {}),
  batchAusencias:   () => fetchFAST('/ausencias'),
  resumenVacaciones:(id: string, anio?: string) => fetchFAST('/fichajes/vacaciones/' + id, anio ? { anio } : {}),
  calendarioAusencias:(mes: string, anio: string) => fetchFAST('/ausencias/calendario', { mes, anio }),
  dashboardAusencias:() => fetchFAST('/ausencias/dashboard'),
  solicitarAusencia:(data: any) => postFAST('/ausencias/solicitar', data),
  aprobarAusencia:  (data: any) => putFAST('/ausencias/' + data.id + '/aprobar', data),
  eliminarAusencia: (id: string) => deleteFAST('/ausencias/' + id),

  // ═══════════════════════════════════════════════════════════════════════════
  // PRL — Cloud Run
  // ═══════════════════════════════════════════════════════════════════════════
  prlDashboard:     () => fetchFAST('/prl/dashboard'),
  prlEpis:          (empleado?: string) => fetchFAST('/prl/epis', empleado ? { dni: empleado, empleado_id: empleado } : {}),
  prlReconocimientos:(empleado?: string) => fetchFAST('/prl/reconocimientos', empleado ? { dni: empleado, empleado_id: empleado } : {}),
  prlFormacion:     (empleado?: string) => fetchFAST('/prl/formacion', empleado ? { empleado_id: empleado } : {}),
  prlAccidentes:    (empleado?: string) => fetchFAST('/prl/accidentes', empleado ? { empleado_id: empleado } : {}),
  alertasCaducidad: () => fetchFAST('/prl/alertas'),
  agregarEpi:       (data: any) => postFAST('/prl/epis', data),
  agregarReconocimiento:(data: any) => postFAST('/prl/reconocimientos', data),
  agregarFormacionPrl:(data: any) => postFAST('/prl/formacion', data),
  agregarAccidente: (data: any) => postFAST('/prl/accidentes', data),
  generarRecibiEPI: (data: any) => postFAST('/documentos/generar-pdf', { tipo: 'recibi_epi', ...data }),
  generarNotifReconocimiento:(data: any) => postFAST('/documentos/generar-pdf', { tipo: 'notif_reconocimiento', ...data }),
  generarActaFormacion:(data: any) => postFAST('/documentos/generar-pdf', { tipo: 'acta_formacion', ...data }),
  generarAvisoCaducidad:(data: any) => postFAST('/documentos/generar-pdf', { tipo: 'aviso_caducidad', ...data }),
  eliminarEpi:      (id: string) => deleteFAST('/prl/epis/' + id),
  eliminarReconocimiento:(id: string) => deleteFAST('/prl/reconocimientos/' + id),
  eliminarFormacionPrl:(id: string) => deleteFAST('/prl/formacion/' + id),
  eliminarAccidente:(id: string) => deleteFAST('/prl/accidentes/' + id),

  // ═══════════════════════════════════════════════════════════════════════════
  // RGPD — Cloud Run
  // ═══════════════════════════════════════════════════════════════════════════
  rgpdDashboard:    () => fetchFAST('/rgpd/dashboard'),
  rgpdConsentimientos:(empleado?: string) => fetchFAST('/rgpd/consentimientos', empleado ? { empleado } : {}),
  rgpdArco:         (empleado?: string) => fetchFAST('/rgpd/arco', empleado ? { empleado } : {}),
  rgpdTratamientos: () => fetchFAST('/rgpd/tratamientos'),
  rgpdBrechas:      () => fetchFAST('/rgpd/brechas'),
  agregarConsentimiento:(data: any) => postFAST('/rgpd/consentimientos', data),
  revocarConsentimiento:(data: any) => putFAST('/rgpd/consentimientos/' + data.id + '/revocar', data),
  agregarArco:      (data: any) => postFAST('/rgpd/arco', data),
  responderArco:    (data: any) => putFAST('/rgpd/arco/' + data.id + '/responder', data),
  agregarTratamiento:(data: any) => postFAST('/rgpd/tratamientos', data),
  agregarBrecha:    (data: any) => postFAST('/rgpd/brechas', data),
  generarDocConsentimiento:(data: any) => postFAST('/documentos/generar-pdf', { tipo: 'consentimiento', ...data }),
  generarDocArco:   (data: any) => postFAST('/documentos/generar-pdf', { tipo: 'arco', ...data }),
  eliminarConsentimiento:(id: string) => deleteFAST('/rgpd/consentimientos/' + id),
  eliminarArco:     (id: string) => deleteFAST('/rgpd/arco/' + id),
  eliminarTratamiento:(id: string) => deleteFAST('/rgpd/tratamientos/' + id),
  eliminarBrecha:   (id: string) => deleteFAST('/rgpd/brechas/' + id),

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBROGACIONES — Cloud Run
  // ═══════════════════════════════════════════════════════════════════════════
  subrogaciones:    (filtros?: any) => fetchFAST('/subrogaciones', filtros || {}),
  batchSubrogacion: () => fetchFAST('/subrogaciones'),
  personalSubrogado:(id: string) => fetchFAST('/subrogaciones/' + id + '/personal'),
  resumenSubrogacion:(id_oportunidad: string) => fetchFAST('/subrogaciones/resumen/' + id_oportunidad),
  crearSubrogacion: (data: any) => postFAST('/subrogaciones', data),
  addPersonalSubrogado:(data: any) => postFAST('/subrogaciones/' + data.id_subrogacion + '/personal', data),
  verificarPersonalSubrogado:(data: any) => postFAST('/subrogaciones/personal/' + data.id + '/verificar', data),
  importarListadoSubrogacion:(data: any) => postFAST('/subrogaciones/' + data.id_subrogacion + '/importar', data),
  incorporarSubrogadoRRHH:(data: any) => postFAST('/subrogaciones/personal/' + data.id + '/incorporar', data),
  incorporarSubrogadoSinDniCheck:(data: any) => postFAST('/subrogaciones/personal/' + data.id + '/incorporar', { ...data, skip_dni_check: true }),
  marcarContactadoSubrogado:(data: any) => postFAST('/subrogaciones/personal/' + data.id + '/contactar', data),
  generarCartaSubrogacion:(data: any) => postFAST('/documentos/generar-pdf', { tipo: 'carta_subrogacion', ...data }),
  eliminarPersonalSubrogado:(id: string, _?: string) => deleteFAST('/subrogaciones/personal/' + id),
  eliminarSubrogacion:(id: string) => deleteFAST('/subrogaciones/' + id),
  actualizarDatosPersonalesSubrogado:(data: any) => putFAST('/subrogaciones/personal/' + data.id, data),

  // ═══════════════════════════════════════════════════════════════════════════
  // CERTIFICACIONES — Cloud Run
  // ═══════════════════════════════════════════════════════════════════════════
  certificaciones:          (filtros?: any) => fetchFAST('/certificaciones', filtros || {}),
  certificacionesEmpleado:  (id: string) => fetchFAST('/certificaciones/empleado/' + id),
  dashboardCertificaciones: () => fetchFAST('/certificaciones/dashboard'),
  batchCertificaciones:     () => fetchFAST('/certificaciones'),
  agregarCertificacion:     (data: any) => postFAST('/certificaciones', data),
  actualizarCertificacion:  (data: any) => putFAST('/certificaciones/' + data.id, data),
  eliminarCertificacion:    (id: string) => deleteFAST('/certificaciones/' + id),

  // ═══════════════════════════════════════════════════════════════════════════
  // CENTROS — Cloud Run [6/04] migrado eliminarCentro + desasignarEmpleado
  // ═══════════════════════════════════════════════════════════════════════════
  centros:          (filtros?: any) => fetchFAST('/centros', filtros || {}),
  centro:           (id: string) => fetchFAST('/centros/' + id),
  dashboardTerritorio:() => fetchFAST('/dashboard/territorio'),     // [6/04] era fetchAPI GAS
  mapaOperarios:    () => fetchFAST('/centros/mapa/operarios'),
  agregarCentro:    (data: any) => postFAST('/centros', data),
  actualizarCentro: (data: any) => putFAST('/centros/' + data.id, data),
  eliminarCentro:   (id: string) => deleteFAST('/centros/' + id),
  crearCentro:      (data: any) => postFAST('/centros', data),
  asignarPersonalCentro:(data: any) => postFAST('/centros/' + data.centro_id + '/asignar', data),  // [6/04] era postAPI GAS
  asignarEmpleadoCentro:(data: any) => postFAST('/centros/' + data.centro_id + '/asignar', data),
  desasignarEmpleado:(data: any) => deleteFAST('/centros/' + data.centro_id + '/desasignar/' + data.asignacion_id),  // [6/04] era postAPI GAS
  desasignarPersonalCentro:(asignacionId: string) => deleteFAST('/centros/x/desasignar/' + asignacionId),  // [7/04] usado por TerritorioPage

  // ═══════════════════════════════════════════════════════════════════════════
  // PARTES — Cloud Run [6/04] consolidado V2, eliminado código muerto
  // ═══════════════════════════════════════════════════════════════════════════
  partes:           (filtros?: any) => fetchFAST('/partes', filtros || {}),        // [6/04] era fetchAPI GAS
  partesV2:         (filtros?: any) => fetchFAST('/partes', filtros || {}),        // alias compat
  batchPartes:      () => fetchFAST('/partes'),                                    // [6/04] era fetchAPI GAS
  parteCompleto:    (id: string) => fetchFAST('/partes/' + id),
  checklistCentro:  (id: string) => fetchFAST('/catalogos/checklist', { centro_id: id }),  // [6/04] usa nueva ruta catalogos
  checklistEjecucion:(id: string) => fetchFAST('/partes/' + id + '/checklist'),
  fotosParte:       (id: string) => fetchFAST('/partes/' + id + '/fotos_lista'),
  materialesParte:  (id: string) => fetchFAST('/partes/' + id + '/materiales_lista'),
  maquinariaParte:  (id: string) => fetchFAST('/partes/' + id + '/maquinaria_lista'),
  tareasDia:        (id: string) => fetchFAST('/ordenes/hoy/' + id),
  crearParte:       (data: any) => postFAST('/partes/iniciar', data),             // [6/04] era postAPI GAS
  cerrarParte:      (data: any) => postFAST('/partes/cerrar', data),
  eliminarParte:    (id: string) => deleteFAST('/partes/' + id),
  actualizarChecklistEjecucion:(data: any) => putFAST('/partes/' + data.parte_id + '/checklist/' + data.id, data),
  registrarFotoParte:(data: any) => postFAST('/partes/' + data.parte_id + '/foto', data),
  registrarMaterialParte:(data: any) => postFAST('/partes/' + data.parte_id + '/material', data),
  eliminarMaterialParte:(id: string) => deleteFAST('/partes/materiales/' + id),
  registrarMaquinariaParte:(data: any) => postFAST('/partes/' + data.parte_id + '/maquinaria', data),
  // Aliases compat OperadorCampoV2Page
  crearParteV2:     (data: any) => postFAST('/partes/iniciar', data),
  cerrarParteV2:    (data: any) => postFAST('/partes/cerrar', data),
  actualizarParte:  (id: string, data: any) => putFAST('/partes/' + id, data),
  eliminarParteV2:      (id: string) => deleteFAST('/partes/' + id),
  reimputarHistoricoCostes: () => postFAST('/partes/reimputar-historico', {}),
  alertasSistema:           () => fetchFAST('/alertas'),
  // Escaneo documentos
  procesarDocumentoAutomatico: (data: any) => postFAST('/escaneo/procesar', data),
  dashboardEscaneo:         () => fetchFAST('/escaneo/dashboard'),
  bandejaDocs:              () => fetchFAST('/escaneo/bandeja'),
  resolverDocBandeja:       (data: any) => postFAST('/escaneo/resolver', data),
  descartarDocBandeja:      (data: any) => postFAST('/escaneo/descartar', data),
  expedienteDocumentos:     (empleadoId: string) => fetchFAST('/escaneo/documentos/' + empleadoId),
  iniciarParte:     (data: any) => postFAST('/partes/iniciar', data),
  finalizarParte:   (data: any) => postFAST('/partes/cerrar', data),
  actualizarChecklistExec:(data: any) => putFAST('/partes/' + data.parte_id + '/checklist/' + data.id, data),

  // ═══════════════════════════════════════════════════════════════════════════
  // CATÁLOGOS — Cloud Run [6/04] migrado crear material/maquinaria
  // ═══════════════════════════════════════════════════════════════════════════
  catalogoMateriales:() => fetchFAST('/catalogos/materiales'),
  catalogoMaquinaria:() => fetchFAST('/catalogos/maquinaria'),
  crearMaterialCatalogo:(data: any) => postFAST('/catalogos/materiales', data),     // [6/04] era postAPI GAS
  crearMaquinariaCatalogo:(data: any) => postFAST('/catalogos/maquinaria', data),   // [6/04] era postAPI GAS
  // Checklist catálogo (config)
  crearChecklistItem:(data: any) => postFAST('/catalogos/checklist', data),
  actualizarChecklistItem:(data: any) => putFAST('/catalogos/checklist/' + data.id, data),
  eliminarChecklistItem:(id: string) => deleteFAST('/catalogos/checklist/' + id),

  // ═══════════════════════════════════════════════════════════════════════════
  // ÓRDENES — Cloud Run [6/04] migrado batch
  // ═══════════════════════════════════════════════════════════════════════════
  ordenes:          (filtros?: any) => fetchFAST('/ordenes', filtros || {}),
  batchOrdenes:     () => fetchFAST('/ordenes'),                                    // [6/04] era fetchAPI GAS
  partesDeOrden:    (id: string) => fetchFAST('/ordenes/' + id + '/partes'),        // [6/04] migrado a CR
  crearOrden:       (data: any) => postFAST('/ordenes', data),
  actualizarEstadoOrden:(data: any) => putFAST('/ordenes/' + data.id + '/estado', data),
  eliminarOrden:    (id: string) => deleteFAST('/ordenes/' + id),

  // ═══════════════════════════════════════════════════════════════════════════
  // INVENTARIO — Cloud Run [6/04] migrado stock + alertas + ajustar
  // ═══════════════════════════════════════════════════════════════════════════
  stockCentro:      (id: string) => fetchFAST('/inventario/stock/' + id),           // [6/04] era fetchAPI GAS
  alertasStock:     (id?: string) => fetchFAST('/inventario/alertas'),              // [6/04] era fetchAPI GAS
  ajustarStock:     (data: any) => postFAST('/inventario/ajustar', data),           // [6/04] era postAPI GAS
  pedidos:          (id?: string) => fetchFAST('/inventario/pedidos', id ? { centro_id: id } : {}),
  crearPedido:      (data: any) => postFAST('/inventario/pedidos', data),
  actualizarEstadoPedido:(data: any) => putFAST('/inventario/pedidos/' + data.id + '/estado', data),

  // ═══════════════════════════════════════════════════════════════════════════
  // INCIDENCIAS — Cloud Run
  // ═══════════════════════════════════════════════════════════════════════════
  incidencias:      (filtros?: any) => fetchFAST('/incidencias', filtros || {}),
  dashboardSLA:     () => fetchFAST('/incidencias/dashboard'),                     // [6/04] migrado a CR
  comentariosIncidencia:(id: string) => fetchFAST('/incidencias/' + id + '/comentarios'),  // [6/04] migrado a CR
  resumenOperativo: (id: string) => fetchFAST('/centros/' + id),                   // [6/04] redirigido a centro detalle
  batchTerritorio:  () => fetchFAST('/dashboard/territorio'),                      // [6/04] era fetchAPI GAS
  crearIncidencia:  (data: any) => postFAST('/incidencias', data),
  actualizarIncidencia:(data: any) => putFAST('/incidencias/' + data.id, data),
  resolverIncidencia:(data: any) => putFAST('/incidencias/' + data.id + '/resolver', data),
  addComentarioIncidencia:(data: any) => postFAST('/incidencias/' + data.incidencia_id + '/comentario', data),
  // Aliases usados por IncidenciasPage
  asignarIncidencia:(data: any) => putFAST('/incidencias/' + data.id, { asignado_a: data.asignado_a, estado: data.estado }),
  agregarComentarioIncidencia:(data: any) => postFAST('/incidencias/' + data.incidencia_id + '/comentario', data),

  // ═══════════════════════════════════════════════════════════════════════════
  // VEHÍCULOS — GAS (pendiente migrar)
  // ═══════════════════════════════════════════════════════════════════════════
  vehiculos:                () => fetchFAST('/vehiculos'),
  combustibleVehiculo:      (id: string) => fetchFAST('/vehiculos/' + id + '/combustible'),
  crearVehiculo:            (data: any) => postFAST('/vehiculos', data),
  actualizarVehiculo:       (data: any) => putFAST('/vehiculos/' + data.id, data),
  eliminarVehiculo:         (id: string) => deleteFAST('/vehiculos/' + id),
  registrarRepostaje:       (data: any) => postFAST('/vehiculos/' + data.vehiculo_id + '/repostaje', data),
  mantenimientos:           (id?: string) => fetchFAST('/inventario/mantenimientos', id ? { centro_id: id } : {}),
  crearMantenimiento:       (data: any) => postFAST('/inventario/mantenimientos', data),
  registrarMantRealizado:   (data: any) => putFAST('/inventario/mantenimientos/' + data.id + '/realizado', data),

  // ═══════════════════════════════════════════════════════════════════════════
  // CALIDAD — GAS (pendiente migrar)
  // ═══════════════════════════════════════════════════════════════════════════
  inspecciones:             (filtros?: any) => fetchFAST('/calidad/inspecciones', filtros || {}),
  npsCentro:                (id: string) => fetchFAST('/calidad/nps', { centro_id: id }),
  accionesCorrectivas:      (id?: string) => fetchFAST('/calidad/acciones', id ? { centro_id: id } : {}),
  dashboardCalidad:         () => fetchFAST('/calidad/dashboard'),
  crearInspeccion:          (data: any) => postFAST('/calidad/inspecciones', data),
  registrarNPS:             (data: any) => postFAST('/calidad/nps', data),
  crearAccionCorrectiva:    (data: any) => postFAST('/calidad/acciones', data),
  cerrarAccionCorrectiva:   (data: any) => putFAST('/calidad/acciones/' + data.id + '/cerrar', data),

  // ═══════════════════════════════════════════════════════════════════════════
  // PORTAL CLIENTE — GAS (pendiente migrar)
  // ═══════════════════════════════════════════════════════════════════════════
  portalCliente:            (token: string) => fetch(`${API_FAST}/portal/cliente/${token}`).then(r => r.json()),
  tokensCliente:            () => fetchFAST('/portal/tokens'),
  generarTokenCliente:      (data: any) => postFAST('/portal/tokens', data),
  revocarToken:             (id: string) => putFAST('/portal/tokens/' + id + '/revocar', {}),

  // ═══════════════════════════════════════════════════════════════════════════
  // PLANIFICACIÓN / FESTIVOS — GAS (pendiente migrar)
  // ═══════════════════════════════════════════════════════════════════════════
  serviciosProgramados:     (filtros?: any) => fetchFAST('/planificacion/servicios', filtros || {}),
  cuadranteSemanal:         (semana?: string) => fetchFAST('/planificacion/cuadrante', semana ? { semana } : {}),
  sustituciones:            (fecha?: string) => fetchFAST('/planificacion/sustituciones', fecha ? { fecha } : {}),
  crearServicioProgramado:  (data: any) => postFAST('/planificacion/servicios', data),
  eliminarServicioProgramado:(id: string) => deleteFAST('/planificacion/servicios/' + id),
  crearSustitucion:         (data: any) => postFAST('/planificacion/sustituciones', data),
  festivos:                 (anio?: string, tipo?: string) => fetchFAST('/planificacion/festivos', { ...(anio ? { anio } : {}), ...(tipo ? { tipo } : {}) }),
  crearFestivo:             (data: any) => postFAST('/planificacion/festivos', data),
  actualizarFestivo:        (data: any) => putFAST('/planificacion/festivos/' + data.id, data),
  eliminarFestivo:          (id: string) => deleteFAST('/planificacion/festivos/' + id),
  cargarFestivosNacionales: (anio: number) => postFAST('/planificacion/festivos/nacionales', { anio }),
  diaLaborable:             (fecha: string, municipio?: string) => fetchFAST('/planificacion/dia-laborable', { fecha, ...(municipio ? { municipio } : {}) }),
  diasLaborables:           (desde: string, hasta: string, municipio?: string) => fetchFAST('/planificacion/dias-laborables', { desde, hasta, ...(municipio ? { municipio } : {}) }),
  programarServicioRango:   (data: any) => postFAST('/planificacion/servicios/rango', data),
  generarInformeMensual:    (data: any) => postFAST('/documentos/generar-pdf', { tipo: 'informe_mensual', ...data }),
  validarConflictosPlaning: (data: any) => postFAST('/planificacion/validar-conflictos', data),
  editarServicioPlanificacion: (id: string, data: any, scope: string) => putFAST('/planificacion/servicios/' + id + '?scope=' + scope, data),
  borrarServicioPlanificacion: (id: string, scope: string, fecha?: string) => deleteFAST('/planificacion/servicios/' + id + '?scope=' + scope + (fecha ? '&fecha=' + fecha : '')),

  // ═══════════════════════════════════════════════════════════════════════════
  // INFORMES — GAS (pendiente migrar a Cloud Run)
  // ═══════════════════════════════════════════════════════════════════════════
  informeEconomicoGlobal:   (filtros?: any) => fetchFAST('/informes/economico', filtros || {}),
  informeLicitaciones:      (filtros?: any) => fetchFAST('/informes/licitaciones', filtros || {}),
  informeRRHH:              (filtros?: any) => fetchFAST('/informes/rrhh', filtros || {}),
  informeTerritorio:        (filtros?: any) => fetchFAST('/informes/territorio', filtros || {}),
  informeCostesContrato:    (data: { id: string; mes_desde?: string; mes_hasta?: string }) =>
    fetchFAST('/licitaciones/seguimiento/' + data.id),
  informeRendimiento:       () => fetchFAST('/informes/rendimiento'),
  informeCostesContrato:    (filtros?: any) => fetchFAST('/informes/costes-contrato', filtros || {}),

  // ═══════════════════════════════════════════════════════════════════════════
  // PLANTILLAS CPV — GAS (pendiente migrar)
  // ═══════════════════════════════════════════════════════════════════════════
  plantillasCPV:      (familia_cpv?: string) => fetchAPI('obtener_plantillas_cpv', familia_cpv ? { familia_cpv } : {}),
  guardarPlantillaCPV:(data: any) => postAPI({ action: 'guardar_plantilla_cpv', ...data }),
  eliminarPlantillaCPV:(id: string) => postAPI({ action: 'eliminar_plantilla_cpv', id }),
}

