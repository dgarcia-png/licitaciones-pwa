import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { FileText, X, Loader2, ExternalLink, ChevronRight, Tag, CheckCircle2 } from 'lucide-react'

interface Props {
  modulo: string               // 'PRL' | 'RGPD' | 'RRHH' | 'LICITACIONES' | 'TERRITORIO' | 'GENERAL'
  datos: Record<string, any>   // datos del registro (empleado, licitación, etc.)
  onCerrar: () => void
  onGenerado?: (url: string) => void
  titulo?: string
}

const COLORES_MODULO: Record<string, string> = {
  PRL:          'bg-orange-100 text-orange-800',
  RGPD:         'bg-blue-100 text-blue-800',
  RRHH:         'bg-teal-100 text-teal-800',
  LICITACIONES: 'bg-purple-100 text-purple-800',
  TERRITORIO:   'bg-green-100 text-green-800',
  GENERAL:      'bg-slate-100 text-slate-700',
}

export default function ModalPlantilla({ modulo, datos, onCerrar, onGenerado, titulo }: Props) {
  const [plantillas, setPlantillas] = useState<any[]>([])
  const [etiquetasDisp, setEtiquetasDisp] = useState<Record<string, string>>({})
  const [cargando, setCargando] = useState(true)
  const [paso, setPaso] = useState<'elegir' | 'confirmar' | 'generando' | 'listo'>('elegir')
  const [plantillaSel, setPlantillaSel] = useState<any>(null)
  const [datosExtra, setDatosExtra] = useState<Record<string, string>>({})
  const [urlGenerado, setUrlGenerado] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const cargar = async () => {
      try {
        // Cargar plantillas del módulo actual + GENERAL
        const [r1, r2] = await Promise.all([
          (api as any).plantillas(modulo),
          (api as any).plantillas('GENERAL'),
        ])
        const todas = [
          ...(r1.plantillas || []).filter((p: any) => p.activa),
          ...(r2.plantillas || []).filter((p: any) => p.activa && p.modulo === 'GENERAL'),
        ]
        setPlantillas(todas)
        setEtiquetasDisp({ ...(r1.etiquetas || {}), ...(r2.etiquetas || {}) })
      } catch (e) { console.error(e) }
      finally { setCargando(false) }
    }
    cargar()
  }, [modulo])

  const seleccionarPlantilla = (p: any) => {
    setPlantillaSel(p)
    // Detectar etiquetas que NO están cubiertas por los datos recibidos
    const etiquetasFaltantes: Record<string, string> = {}
    ;(p.etiquetas || []).forEach((et: string) => {
      const clave = et.replace(/[{}]/g, '')
      const esSistema = ['fecha_hoy', 'fecha_hoy_larga', 'anio_actual', 'empresa_nombre', 'empresa_cif', 'empresa_direccion', 'empresa_tel'].includes(clave)
      const estaEnDatos = datos[clave] !== undefined && datos[clave] !== ''
      if (!esSistema && !estaEnDatos) etiquetasFaltantes[et] = etiquetasDisp[et] || clave
    })
    setDatosExtra(Object.fromEntries(Object.keys(etiquetasFaltantes).map(k => [k, ''])))
    setPaso('confirmar')
  }

  const handleGenerar = async () => {
    if (!plantillaSel) return
    setPaso('generando')
    setError('')
    try {
      // Combinar datos recibidos + datos extra introducidos
      const datosCompletos: Record<string, string> = {}
      // Datos del registro (convertir claves a formato sin llaves)
      Object.entries(datos).forEach(([k, v]) => { datosCompletos[k] = String(v || '') })
      // Datos extra introducidos manualmente
      Object.entries(datosExtra).forEach(([k, v]) => {
        const clave = k.replace(/[{}]/g, '')
        datosCompletos[clave] = String(v || '')
      })

      const r = await (api as any).generarDesdePlantilla({
        id_plantilla: plantillaSel.id,
        datos: datosCompletos,
      })

      if (r.ok) {
        setUrlGenerado(r.url)
        setPaso('listo')
        onGenerado?.(r.url)
      } else {
        setError(r.error || 'Error generando el documento')
        setPaso('confirmar')
      }
    } catch (e: any) {
      setError('Error de conexión')
      setPaso('confirmar')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e: any) => { if (e.target === e.currentTarget) onCerrar() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Cabecera */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
              <FileText size={17} className="text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{titulo || 'Generar documento'}</p>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${COLORES_MODULO[modulo] || COLORES_MODULO.GENERAL}`}>{modulo}</span>
            </div>
          </div>
          <button onClick={onCerrar} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X size={16} />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── PASO 1: elegir plantilla ── */}
          {paso === 'elegir' && (
            <div>
              {cargando ? (
                <div className="text-center py-10"><Loader2 size={24} className="text-violet-500 animate-spin mx-auto mb-2" /><p className="text-slate-400 text-sm">Cargando plantillas...</p></div>
              ) : plantillas.length === 0 ? (
                <div className="text-center py-10">
                  <FileText size={36} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No hay plantillas para {modulo}</p>
                  <p className="text-xs text-slate-400 mt-1">Crea plantillas en Administración → Plantillas docs</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Selecciona una plantilla</p>
                  {plantillas.map((p: any) => (
                    <button key={p.id} onClick={() => seleccionarPlantilla(p)}
                      className="w-full flex items-center gap-3 p-3.5 bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-200 rounded-xl text-left transition-all">
                      <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                        <FileText size={14} className="text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{p.nombre}</p>
                        {p.descripcion && <p className="text-xs text-slate-500 truncate">{p.descripcion}</p>}
                        {p.etiquetas?.length > 0 && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            <Tag size={9} className="inline mr-1" />{p.etiquetas.length} etiqueta{p.etiquetas.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PASO 2: confirmar datos ── */}
          {paso === 'confirmar' && plantillaSel && (
            <div>
              <button onClick={() => setPaso('elegir')} className="text-xs text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1">
                ← Cambiar plantilla
              </button>

              <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 mb-4">
                <p className="text-sm font-bold text-violet-800">{plantillaSel.nombre}</p>
                {plantillaSel.descripcion && <p className="text-xs text-violet-600 mt-0.5">{plantillaSel.descripcion}</p>}
              </div>

              {/* Datos que se usarán automáticamente */}
              {plantillaSel.etiquetas?.filter((et: string) => {
                const clave = et.replace(/[{}]/g, '')
                return datos[clave] !== undefined && datos[clave] !== ''
              }).length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-emerald-500" /> Datos que se rellenan automáticamente
                  </p>
                  <div className="space-y-1">
                    {plantillaSel.etiquetas.filter((et: string) => {
                      const clave = et.replace(/[{}]/g, '')
                      return datos[clave] !== undefined && datos[clave] !== ''
                    }).map((et: string) => {
                      const clave = et.replace(/[{}]/g, '')
                      return (
                        <div key={et} className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg">
                          <span className="text-[10px] font-mono text-emerald-700 flex-shrink-0">{et}</span>
                          <span className="text-xs text-emerald-800 font-medium truncate">{String(datos[clave])}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Campos que necesitan valor manual */}
              {Object.keys(datosExtra).length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Completar manualmente</p>
                  <div className="space-y-3">
                    {Object.entries(datosExtra).map(([et, val]) => (
                      <div key={et}>
                        <label className="text-xs font-semibold text-slate-600">
                          <span className="font-mono text-violet-700">{et}</span>
                          {etiquetasDisp[et] && <span className="text-slate-400 font-normal ml-1">— {etiquetasDisp[et]}</span>}
                        </label>
                        <input type="text" value={val} onChange={(e: any) => setDatosExtra({ ...datosExtra, [et]: e.target.value })}
                          placeholder="Introduce el valor..."
                          className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-3">❌ {error}</p>}
            </div>
          )}

          {/* ── PASO 3: generando ── */}
          {paso === 'generando' && (
            <div className="text-center py-12">
              <Loader2 size={32} className="text-violet-500 animate-spin mx-auto mb-4" />
              <p className="text-slate-700 font-medium">Generando documento...</p>
              <p className="text-sm text-slate-400 mt-1">Rellenando etiquetas y creando copia en Drive</p>
            </div>
          )}

          {/* ── PASO 4: listo ── */}
          {paso === 'listo' && (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-emerald-600" />
              </div>
              <p className="text-slate-900 font-bold mb-1">Documento generado</p>
              <p className="text-sm text-slate-500 mb-5">Se ha creado y archivado en Drive automáticamente</p>
              <a href={urlGenerado} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-violet-700 hover:bg-violet-800 text-white text-sm font-bold rounded-xl">
                <ExternalLink size={15} /> Abrir documento
              </a>
            </div>
          )}
        </div>

        {/* Footer con botón generar */}
        {paso === 'confirmar' && (
          <div className="border-t border-slate-100 p-4 flex gap-3">
            <button onClick={handleGenerar}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-700 hover:bg-violet-800 text-white text-sm font-bold rounded-xl">
              <FileText size={15} /> Generar documento
            </button>
            <button onClick={onCerrar} className="px-5 py-3 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl">
              Cancelar
            </button>
          </div>
        )}
        {paso === 'listo' && (
          <div className="border-t border-slate-100 p-4">
            <button onClick={onCerrar} className="w-full py-3 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl">
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}