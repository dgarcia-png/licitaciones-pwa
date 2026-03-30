import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../services/api'
import { Building2, CheckCircle2, AlertTriangle, Star, Clock,
  Loader2, ChevronRight, X, Camera, PenTool, Users, TrendingUp } from 'lucide-react'

function fmtFecha(f: string) {
  if (!f) return '—'
  try { return new Date(f).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' }) }
  catch { return f }
}

function fmtHora(h: string) {
  if (!h) return '—'
  if (h.includes('1899') || h.includes('T')) {
    try {
      const d = new Date(h)
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    } catch { return h }
  }
  return h
}

function fmtEuro(n: number) {
  if (!n) return '—'
  if (n >= 1000) return Math.round(n/1000) + 'K €'
  return n.toFixed(2) + ' €'
}

export default function PortalClientePage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [data, setData] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [parteSel, setParteSel] = useState<any>(null)

  useEffect(() => {
    const cargar = async () => {
      if (!token) { setError('Token requerido'); setCargando(false); return }
      try {
        const r = await api.portalCliente(token)
        if (r.error) setError(r.error)
        else setData(r)
      } catch (e) { setError('Error cargando datos') }
      finally { setCargando(false) }
    }
    cargar()
  }, [token])

  if (cargando) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <Loader2 size={32} className="text-[#1a3c34] animate-spin mb-3" />
      <p className="text-slate-500 text-sm">Cargando portal de seguimiento...</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-md w-full text-center shadow">
        <AlertTriangle size={40} className="text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 mb-2">Acceso no válido</h2>
        <p className="text-sm text-slate-500">{error}</p>
        <p className="text-xs text-slate-400 mt-3">Contacte con Forgeser para obtener un enlace actualizado.</p>
      </div>
    </div>
  )

  if (!data) return null

  const { centro, partes_mes, partes_anterior, incidencias, calidad, proximos } = data
  const mesLabel = data.mes_actual?.replace('-', ' · ')

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Modal parte detallado */}
      {parteSel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setParteSel(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Detalle del servicio</h3>
                <p className="text-xs text-slate-400">{fmtFecha(parteSel.fecha)}</p>
              </div>
              <button onClick={() => setParteSel(null)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Datos básicos */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Trabajador', parteSel.nombre_empleado || '—'],
                  ['Estado', parteSel.estado || '—'],
                  ['Entrada', fmtHora(parteSel.hora_inicio)],
                  ['Salida', fmtHora(parteSel.hora_fin)],
                  ['Horas', (parteSel.horas_reales || 0) + 'h'],
                  ['Checklist', (parteSel.pct_completitud || 0) + '%'],
                ].map(([l, v]) => (
                  <div key={String(l)} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">{l}</p>
                    <p className="text-sm font-bold text-slate-800">{String(v)}</p>
                  </div>
                ))}
              </div>

              {/* Costes */}
              {(parteSel.coste_total > 0) && (
                <div className="bg-emerald-50 rounded-xl p-3">
                  <p className="text-[10px] text-emerald-600 uppercase font-semibold mb-1">Costes del servicio</p>
                  <div className="flex gap-4 text-xs text-emerald-700">
                    {parteSel.coste_personal > 0 && <span>Personal: {fmtEuro(parteSel.coste_personal)}</span>}
                    {parteSel.coste_materiales > 0 && <span>Materiales: {fmtEuro(parteSel.coste_materiales)}</span>}
                    {parteSel.coste_maquinaria > 0 && <span>Maquinaria: {fmtEuro(parteSel.coste_maquinaria)}</span>}
                  </div>
                  <p className="text-sm font-black text-emerald-800 mt-1">Total: {fmtEuro(parteSel.coste_total)}</p>
                </div>
              )}

              {/* Fotos */}
              {(parteSel.fotos && parteSel.fotos.length > 0) && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                    <Camera size={12} /> Fotografías del servicio
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {parteSel.fotos.map((f: any, idx: number) => (
                      <div key={idx} className="relative">
                        <span className={`absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10 ${f.tipo === 'antes' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'}`}>
                          {f.tipo}
                        </span>
                        {f.url ? (
                          <a href={f.url} target="_blank" rel="noopener noreferrer"
                            className="block w-full h-32 bg-slate-100 rounded-xl border border-slate-200 flex flex-col items-center justify-center hover:bg-slate-200 transition-colors">
                            <Camera size={20} className="text-slate-400 mb-1" />
                            <span className="text-xs text-blue-600 font-medium">Ver foto</span>
                          </a>
                        ) : (
                          <div className="w-full h-32 bg-slate-100 rounded-xl flex items-center justify-center">
                            <Camera size={20} className="text-slate-300" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(!parteSel.fotos || parteSel.fotos.length === 0) && (parteSel.fotos_antes > 0 || parteSel.fotos_despues > 0) && (
                <div className="flex gap-3">
                  {parteSel.fotos_antes > 0 && (
                    <div className="flex-1 bg-slate-100 rounded-xl p-3 text-center">
                      <Camera size={20} className="text-slate-400 mx-auto mb-1" />
                      <p className="text-xs text-slate-500">{parteSel.fotos_antes} foto{parteSel.fotos_antes > 1 ? 's' : ''} antes</p>
                    </div>
                  )}
                  {parteSel.fotos_despues > 0 && (
                    <div className="flex-1 bg-slate-100 rounded-xl p-3 text-center">
                      <Camera size={20} className="text-slate-400 mx-auto mb-1" />
                      <p className="text-xs text-slate-500">{parteSel.fotos_despues} foto{parteSel.fotos_despues > 1 ? 's' : ''} después</p>
                    </div>
                  )}
                </div>
              )}

              {/* Firma */}
              {parteSel.firma_cliente === 'si' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                  <PenTool size={16} className="text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-700">Servicio firmado por el cliente</p>
                    {parteSel.nombre_firmante && <p className="text-xs text-emerald-600">{parteSel.nombre_firmante}</p>}
                  </div>
                  <CheckCircle2 size={16} className="text-emerald-500 ml-auto" />
                </div>
              )}

              {/* Firma imagen */}
              {parteSel.firma_url && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Firma digital</p>
                  <a href={parteSel.firma_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                    <PenTool size={14} className="text-slate-400" />
                    <span className="text-sm text-blue-600 font-medium">Ver firma digital</span>
                  </a>
                </div>
              )}

              {/* Observaciones */}
              {parteSel.observaciones && (
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-[10px] text-amber-600 uppercase font-semibold mb-1">Observaciones</p>
                  <p className="text-sm text-amber-800">{parteSel.observaciones}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cabecera */}
      <div className="bg-[#1a3c34] text-white">
        <div className="max-w-3xl mx-auto px-5 py-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-white/60 uppercase tracking-wide">Portal de seguimiento</p>
              <h1 className="text-lg font-bold">{centro.nombre}</h1>
            </div>
          </div>
          <p className="text-sm text-white/70">{centro.organismo} · {centro.municipio}</p>
          <p className="text-xs text-white/40 mt-1">Datos actualizados · {new Date().toLocaleDateString('es-ES')}</p>

          {/* Personal asignado */}
          {centro.personal_asignado > 0 && (
            <div className="mt-4 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 w-fit">
              <Users size={14} className="text-white/70" />
              <span className="text-xs text-white/80">{centro.personal_asignado} personas asignadas</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* KPIs */}
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase mb-3">Resumen {mesLabel}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Servicios realizados', valor: partes_mes.total, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Horas trabajadas', valor: partes_mes.horas + 'h', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Calidad media', valor: (calidad.media || 0).toFixed(1) + '/5', icon: Star, color: calidad.media >= 4 ? 'text-emerald-600' : calidad.media >= 3 ? 'text-amber-600' : 'text-red-600', bg: 'bg-amber-50' },
              { label: 'Incidencias abiertas', valor: incidencias.abiertas, icon: AlertTriangle, color: incidencias.abiertas > 0 ? 'text-red-600' : 'text-emerald-600', bg: incidencias.abiertas > 0 ? 'bg-red-50' : 'bg-emerald-50' },
            ].map((k, i) => (
              <div key={i} className={`${k.bg} border border-slate-200 rounded-2xl p-4`}>
                <k.icon size={18} className={k.color + ' mb-2'} />
                <p className={`text-2xl font-black ${k.color}`}>{k.valor}</p>
                <p className="text-xs text-slate-500 mt-1">{k.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Comparativa mes anterior */}
        {partes_anterior.total > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
            <TrendingUp size={18} className="text-slate-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-slate-500">Comparativa con mes anterior</p>
              <p className="text-sm font-semibold text-slate-800">
                {partes_mes.total >= partes_anterior.total
                  ? `+${partes_mes.total - partes_anterior.total} servicios más que el mes pasado`
                  : `${partes_anterior.total - partes_mes.total} servicios menos que el mes pasado`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Mes anterior</p>
              <p className="text-sm font-bold text-slate-600">{partes_anterior.total} servicios</p>
            </div>
          </div>
        )}

        {/* Servicios del mes */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Servicios del mes</h3>
            <span className="text-xs text-slate-400">{partes_mes.total} registros</span>
          </div>
          {partes_mes.partes.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400">Sin servicios registrados este mes</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {partes_mes.partes.map((p: any) => (
                <button key={p.id} onClick={() => setParteSel(p)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.estado === 'completado' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{fmtFecha(p.fecha)}</p>
                      <p className="text-xs text-slate-500">
                        {p.nombre_empleado || '—'} · {fmtHora(p.hora_inicio)}
                        {p.hora_fin ? ` → ${fmtHora(p.hora_fin)}` : ''} · {p.pct_completitud || 0}% ✓
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {p.firma_cliente === 'si' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Firmado</span>
                    )}
                    {(p.fotos_antes > 0 || p.fotos_despues > 0) && (
                      <Camera size={13} className="text-slate-400" />
                    )}
                    <ChevronRight size={14} className="text-slate-300" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Incidencias */}
        {incidencias.todas.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Incidencias</h3>
              {incidencias.abiertas > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                  {incidencias.abiertas} abierta{incidencias.abiertas > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="divide-y divide-slate-50">
              {incidencias.todas.map((inc: any) => (
                <div key={inc.id} className="flex items-start gap-3 px-5 py-3">
                  <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    inc.estado === 'abierta' ? 'bg-red-500' :
                    inc.estado === 'en_proceso' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 leading-snug">{inc.descripcion}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{fmtFecha(inc.fecha)} · {inc.tipo}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    inc.estado === 'abierta' ? 'bg-red-100 text-red-700' :
                    inc.estado === 'en_proceso' ? 'bg-amber-100 text-amber-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>{inc.estado.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calidad */}
        {calidad.inspecciones.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Inspecciones de calidad</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {calidad.inspecciones.map((ins: any) => (
                <div key={ins.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm text-slate-700">{fmtFecha(ins.fecha)}</p>
                    <p className="text-xs text-slate-400">{ins.tipo}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(n => (
                      <span key={n} className={`text-base ${n <= Math.round(ins.puntuacion_total) ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                    ))}
                    <span className={`text-sm font-black ml-1 ${ins.puntuacion_total >= 4 ? 'text-emerald-600' : ins.puntuacion_total >= 3 ? 'text-amber-600' : 'text-red-600'}`}>
                      {ins.puntuacion_total?.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Próximos servicios */}
        {proximos.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Próximos servicios programados</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {proximos.map((ot: any) => (
                <div key={ot.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm text-slate-700 font-medium">{ot.titulo}</p>
                    <p className="text-xs text-slate-400">{fmtFecha(ot.fecha_programada)}{ot.hora_inicio ? ` · ${ot.hora_inicio}` : ''}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{ot.tipo}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-[#1a3c34] rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">F</span>
            </div>
            <span className="text-xs font-semibold text-slate-500">Forgeser Servicios del Sur SL</span>
          </div>
          <p className="text-xs text-slate-300">Portal de seguimiento · Los datos se actualizan en tiempo real</p>
        </div>
      </div>
    </div>
  )
}