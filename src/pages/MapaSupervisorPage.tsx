// src/pages/MapaSupervisorPage.tsx
// Mapa supervisor: ubicación en tiempo real de operarios
// Leaflet cargado dinámicamente desde CDN (no está en package.json)

import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../services/api'
import {
  Map, RefreshCw, Loader2, Users, Activity,
  AlertTriangle, MapPin, Clock, X
} from 'lucide-react'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Operario {
  id: string
  nombre: string
  centro: string
  lat: number
  lng: number
  hora: string
  fuente: 'parte_activo' | 'parte_finalizado' | 'fichaje' | 'sin_datos'
  estado: 'trabajando' | 'en_servicio' | 'disponible' | 'fuera' | 'sin_fichar'
  tipo_servicio: string
  parte_id: string
  tiene_gps: boolean
}

// ── Colores y etiquetas por estado ────────────────────────────────────────────

const ESTADO_COLOR: Record<string, string> = {
  trabajando:  '#059669',
  en_servicio: '#2563eb',
  disponible:  '#7c3aed',
  fuera:       '#94a3b8',
  sin_fichar:  '#e11d48',
}

const ESTADO_LABEL: Record<string, string> = {
  trabajando:  '🟢 Trabajando',
  en_servicio: '🔵 En servicio',
  disponible:  '🟣 Disponible',
  fuera:       '⚪ Fuera',
  sin_fichar:  '🔴 Sin fichar',
}

const FUENTE_LABEL: Record<string, string> = {
  parte_activo:    'Parte activo',
  parte_finalizado:'Parte finalizado',
  fichaje:         'Fichaje',
  sin_datos:       'Sin datos hoy',
}

// ── Carga dinámica de Leaflet ─────────────────────────────────────────────────

let leafletLoaded = false
let leafletPromise: Promise<void> | null = null

function cargarLeaflet(): Promise<void> {
  if (leafletLoaded) return Promise.resolve()
  if (leafletPromise) return leafletPromise

  leafletPromise = new Promise((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => { leafletLoaded = true; resolve() }
    script.onerror = reject
    document.head.appendChild(script)
  })

  return leafletPromise
}

// ── Icono SVG por estado ──────────────────────────────────────────────────────

function crearIcono(estado: string, inicial: string): any {
  const L = (window as any).L
  const color = ESTADO_COLOR[estado] || '#64748b'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
    <path d="M18 0C8.1 0 0 8.1 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.1 27.9 0 18 0z" fill="${color}" opacity="0.9"/>
    <circle cx="18" cy="18" r="12" fill="white" opacity="0.95"/>
    <text x="18" y="23" text-anchor="middle" font-size="12" font-weight="bold" fill="${color}" font-family="sans-serif">${inicial}</text>
  </svg>`
  return L.divIcon({
    html: svg,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
    className: '',
  })
}

// ─────────────────────────────────────────────────────────────────────────────

export default function MapaSupervisorPage() {
  const mapRef      = useRef<HTMLDivElement>(null)
  const leafletMap  = useRef<any>(null)
  const markers     = useRef<Record<string, any>>({})

  const [operarios, setOperarios] = useState<Operario[]>([])
  const [resumen, setResumen] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [leafletOk, setLeafletOk] = useState(false)
  const [seleccionado, setSeleccionado] = useState<Operario | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [ultimaActualizacion, setUltimaActualizacion] = useState('')

  // ── Cargar datos de la API ──────────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    setCargando(true)
    try {
      const r = await api.mapaOperarios()
      setOperarios(r.operarios || [])
      setResumen(r)
      setUltimaActualizacion(new Date().toLocaleTimeString('es-ES'))
    } catch(e) { console.error(e) }
    finally { setCargando(false) }
  }, [])

  // ── Inicializar Leaflet ─────────────────────────────────────────────────────
  useEffect(() => {
    cargarLeaflet().then(() => {
      setLeafletOk(true)
    }).catch(e => console.error('Error cargando Leaflet:', e))
  }, [])

  // ── Crear mapa cuando Leaflet está listo ────────────────────────────────────
  useEffect(() => {
    if (!leafletOk || !mapRef.current || leafletMap.current) return
    const L = (window as any).L

    leafletMap.current = L.map(mapRef.current, {
      center: [37.2586, -6.5266],
      zoom: 11,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(leafletMap.current)

    cargarDatos()
  }, [leafletOk])

  // ── Actualizar marcadores cuando cambian datos ──────────────────────────────
  useEffect(() => {
    if (!leafletOk || !leafletMap.current) return
    const L = (window as any).L
    const map = leafletMap.current

    // Eliminar marcadores existentes
    Object.values(markers.current).forEach((m: any) => map.removeLayer(m))
    markers.current = {}

    const conGps = operarios.filter(o => o.tiene_gps && o.lat !== 0 && o.lng !== 0)

    conGps.forEach(op => {
      const inicial = (op.nombre.split(' ')[0] || '?')[0].toUpperCase()
      const icono = crearIcono(op.estado, inicial)

      // Sin bindPopup — el panel React de la esquina ya muestra el detalle
      const marker = L.marker([op.lat, op.lng], { icon: icono })
        .addTo(map)
        .on('click', () => setSeleccionado(op))

      markers.current[op.id] = marker
    })

    // Ajustar vista si hay marcadores
    if (conGps.length > 0) {
      const bounds = L.latLngBounds(conGps.map(o => [o.lat, o.lng]))
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    }
  }, [operarios, leafletOk])

  // ── Auto-refresh cada 2 minutos ─────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(cargarDatos, 120000)
    return () => clearInterval(t)
  }, [cargarDatos])

  // ── Filtrar lista lateral ───────────────────────────────────────────────────
  const operariosFiltrados = filtroEstado === 'todos'
    ? operarios
    : operarios.filter(o => o.estado === filtroEstado)

  // ── Centrar en operario seleccionado ─────────────────────────────────────────
  const centrarEn = (op: Operario) => {
    setSeleccionado(op)
    if (!op.tiene_gps || !leafletMap.current) return
    leafletMap.current.setView([op.lat, op.lng], 15)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -m-6 lg:-m-8">

      {/* ── Cabecera ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e] rounded-xl">
            <Map size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Mapa operarios</h1>
            {ultimaActualizacion && (
              <p className="text-[10px] text-slate-400">Actualizado {ultimaActualizacion} · auto cada 2 min</p>
            )}
          </div>
        </div>

        {/* KPIs compactos */}
        <div className="flex items-center gap-3">
          {resumen && (
            <>
              <div className="text-center hidden md:block">
                <p className="text-lg font-black text-emerald-700">{resumen.trabajando || 0}</p>
                <p className="text-[10px] text-slate-500">Trabajando</p>
              </div>
              <div className="text-center hidden md:block">
                <p className="text-lg font-black text-blue-700">{resumen.en_servicio || 0}</p>
                <p className="text-[10px] text-slate-500">En servicio</p>
              </div>
              <div className="text-center hidden md:block">
                <p className="text-lg font-black text-red-600">{resumen.sin_fichar || 0}</p>
                <p className="text-[10px] text-slate-500">Sin fichar</p>
              </div>
              <div className="w-px h-8 bg-slate-200 hidden md:block" />
            </>
          )}
          <button onClick={cargarDatos} disabled={cargando}
            className="flex items-center gap-2 px-3 py-2 bg-[#1a3c34] hover:bg-[#2d5a4e] text-white text-xs font-semibold rounded-xl disabled:opacity-50">
            {cargando ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Actualizar
          </button>
        </div>
      </div>

      {/* ── Cuerpo: mapa + lista lateral ─────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Lista lateral */}
        <div className="w-72 shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
          {/* Filtro */}
          <div className="p-3 border-b border-slate-100">
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white">
              <option value="todos">Todos ({operarios.length})</option>
              <option value="trabajando">🟢 Trabajando ({operarios.filter(o=>o.estado==='trabajando').length})</option>
              <option value="en_servicio">🔵 En servicio ({operarios.filter(o=>o.estado==='en_servicio').length})</option>
              <option value="disponible">🟣 Disponible ({operarios.filter(o=>o.estado==='disponible').length})</option>
              <option value="fuera">⚪ Fuera ({operarios.filter(o=>o.estado==='fuera').length})</option>
              <option value="sin_fichar">🔴 Sin fichar ({operarios.filter(o=>o.estado==='sin_fichar').length})</option>
            </select>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto">
            {cargando && operarios.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="animate-spin text-slate-400" />
              </div>
            ) : operariosFiltrados.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Sin resultados</p>
            ) : (
              operariosFiltrados.map(op => (
                <button key={op.id} onClick={() => centrarEn(op)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${seleccionado?.id === op.id ? 'bg-slate-100' : ''}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: ESTADO_COLOR[op.estado] || '#64748b' }}>
                      {(op.nombre.split(' ')[0] || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{op.nombre}</p>
                      <p className="text-[10px] text-slate-400 truncate">{op.centro || '—'}</p>
                    </div>
                    {op.tiene_gps
                      ? <MapPin size={12} className="text-slate-400 shrink-0" />
                      : <AlertTriangle size={12} className="text-slate-300 shrink-0" />
                    }
                  </div>
                  <div className="flex items-center gap-2 mt-1 ml-9">
                    <span className="text-[10px]" style={{ color: ESTADO_COLOR[op.estado] }}>
                      {ESTADO_LABEL[op.estado]}
                    </span>
                    {op.hora && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        <Clock size={9} /> {op.hora}
                      </span>
                    )}
                  </div>
                  {op.tipo_servicio && (
                    <p className="text-[10px] text-slate-400 truncate ml-9 mt-0.5">{op.tipo_servicio}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Mapa */}
        <div className="flex-1 relative">
          {!leafletOk && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
              <Loader2 size={32} className="animate-spin text-[#1a3c34] mb-3" />
              <p className="text-sm text-slate-500">Cargando mapa...</p>
            </div>
          )}

          <div ref={mapRef} className="w-full h-full" />

          {/* Panel detalle operario seleccionado */}
          {seleccionado && (
            <div className="absolute top-4 right-4 z-[1000] bg-white border border-slate-200 rounded-2xl shadow-lg p-4 w-64">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{seleccionado.nombre}</p>
                  <p className="text-xs text-slate-500">{seleccionado.centro || '—'}</p>
                </div>
                <button onClick={() => setSeleccionado(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Estado</span>
                  <span className="font-semibold" style={{ color: ESTADO_COLOR[seleccionado.estado] }}>
                    {ESTADO_LABEL[seleccionado.estado]}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Fuente</span>
                  <span className="font-semibold text-slate-700">{FUENTE_LABEL[seleccionado.fuente]}</span>
                </div>
                {seleccionado.hora && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Hora</span>
                    <span className="font-semibold text-slate-700">{seleccionado.hora}</span>
                  </div>
                )}
                {seleccionado.tipo_servicio && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Servicio</span>
                    <span className="font-semibold text-slate-700 text-right max-w-[130px] truncate">{seleccionado.tipo_servicio}</span>
                  </div>
                )}
                {seleccionado.tiene_gps && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">GPS</span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {seleccionado.lat.toFixed(5)}, {seleccionado.lng.toFixed(5)}
                    </span>
                  </div>
                )}
                {!seleccionado.tiene_gps && (
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <AlertTriangle size={13} className="text-slate-400" />
                    <span className="text-[10px] text-slate-500">Sin coordenadas GPS hoy</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Leyenda */}
          <div className="absolute bottom-6 left-4 z-[1000] bg-white border border-slate-200 rounded-xl shadow p-3">
            <p className="text-[10px] font-bold text-slate-600 mb-2 uppercase">Leyenda</p>
            {Object.entries(ESTADO_LABEL).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ESTADO_COLOR[k] }} />
                <span className="text-[10px] text-slate-600">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
