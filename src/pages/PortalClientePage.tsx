import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../services/api'
import { Building2, CheckCircle2, AlertTriangle, Star, Euro,
  Calendar, Clock, FileText, Loader2, ChevronRight, X } from 'lucide-react'

function fmtFecha(f: string) {
  if (!f) return '—'
  try { return new Date(f).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' }) }
  catch { return f }
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
      if (!token) { setError('Token de acceso no proporcionado'); setCargando(false); return }
      try {
        const r = await (api as any).portalCliente(token)
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

  const { centro, partes_mes, partes_anterior, incidencias, calidad, pl_resumen, proximos } = data
  const mesLabel = data.mes_actual?.replace('-', ' · ')

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Modal parte */}
      {parteSel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setParteSel(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Detalle del servicio</h3>
              <button onClick={() => setParteSel(null)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ['Fecha', fmtFecha(parteSel.fecha)],
                ['Trabajador', parteSel.nombre_empleado||'—'],
                ['Entrada', parteSel.hora_inicio||'—'],
                ['Salida', parteSel.hora_fin||'—'],
                ['Horas', (parteSel.horas_reales||0) + 'h'],
                ['Checklist', (parteSel.pct_completitud||0) + '%'],
                ['Fotos antes', parteSel.fotos_antes||0],
                ['Fotos después', parteSel.fotos_despues||0],
                ['Firma cliente', parteSel.firma_cliente === 'si' ? '✅ Firmado' : '—'],
              ].map(([l,v]) => (
                <div key={String(l)} className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">{l}</span>
                  <span className="text-slate-800 font-semibold">{String(v)}</span>
                </div>
              ))}
              {parteSel.observaciones && (
                <div className="mt-2 p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-600">{parteSel.observaciones}</p>
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
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* KPIs del mes */}
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase mb-3">Resumen {mesLabel}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Servicios realizados', valor: partes_mes.total, icon: CheckCircle2, color: 'text-emerald-600' },
              { label: 'Horas trabajadas', valor: partes_mes.horas + 'h', icon: Clock, color: 'text-blue-600' },
              { label: 'Calidad media', valor: (calidad.media || 0).toFixed(1) + '/5', icon: Star, color: calidad.media >= 4 ? 'text-emerald-600' : calidad.media >= 3 ? 'text-amber-600' : 'text-red-600' },
              { label: 'Incidencias abiertas', valor: incidencias.abiertas, icon: AlertTriangle, color: incidencias.abiertas > 0 ? 'text-red-600' : 'text-emerald-600' },
            ].map((k, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4">
                <k.icon size={18} className={k.color + ' mb-2'} />
                <p className={`text-2xl font-black ${k.color}`}>{k.valor}</p>
                <p className="text-xs text-slate-500 mt-1">{k.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Últimos servicios */}
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
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors text-left">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{fmtFecha(p.fecha)}</p>
                    <p className="text-xs text-slate-500">{p.nombre_empleado || '—'} · {p.horas_reales||0}h · {p.pct_completitud||0}% checklist</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.firma_cliente === 'si' && <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Firmado</span>}
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
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${inc.estado === 'abierta' ? 'bg-red-500' : inc.estado === 'en_proceso' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
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
          <p className="text-xs text-slate-400">Portal de seguimiento · Forgeser Servicios del Sur SL</p>
          <p className="text-xs text-slate-300 mt-0.5">Los datos se actualizan en tiempo real</p>
        </div>
      </div>
    </div>
  )
}