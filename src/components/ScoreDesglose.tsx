import { Target, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface Props {
  oportunidad: any
  config?: any
}

function calcularDesglose(o: any) {
  const cpv = o.cpv || ''
  const presupuesto = Number(o.presupuesto) || 0
  const nuts = o.nuts_code || o.ubicacion_code || ''
  const titulo = (o.titulo || '').toLowerCase()
  const organismo = (o.organismo || '').toLowerCase()
  const fecha = o.fecha_limite || ''

  const items: { label: string; puntos: number; positivo: boolean; detalle?: string }[] = []

  // CPV
  if (cpv) {
    // Simulamos exacto vs parcial basado en longitud CPV
    if (cpv.length >= 8) {
      items.push({ label: 'CPV exacto', puntos: 30, positivo: true, detalle: cpv })
    } else if (cpv.length >= 5) {
      items.push({ label: 'CPV parcial', puntos: 20, positivo: true, detalle: cpv })
    } else {
      items.push({ label: 'CPV sin coincidencia', puntos: 0, positivo: false })
    }
  } else {
    items.push({ label: 'Sin CPV', puntos: 0, positivo: false })
  }

  // Presupuesto
  if (presupuesto > 0) {
    if (presupuesto >= 200000 && presupuesto <= 3000000) {
      items.push({ label: 'Presupuesto ideal', puntos: 25, positivo: true, detalle: presupuesto.toLocaleString('es-ES') + ' €' })
    } else if (presupuesto >= 30000 && presupuesto <= 15000000) {
      items.push({ label: 'Presupuesto fuera rango ideal', puntos: 15, positivo: true, detalle: presupuesto.toLocaleString('es-ES') + ' €' })
    } else {
      items.push({ label: 'Presupuesto fuera de rango', puntos: 0, positivo: false, detalle: presupuesto.toLocaleString('es-ES') + ' €' })
    }
  }

  // Ubicación
  if (nuts === 'ES618' || nuts === 'ES61') {
    items.push({ label: 'Ubicación Huelva/Andalucía', puntos: 25, positivo: true, detalle: nuts })
  } else if (nuts && nuts.startsWith('ES6')) {
    items.push({ label: 'Ubicación Andalucía', puntos: 20, positivo: true, detalle: nuts })
  } else {
    const palabrasUbic = ['sevilla', 'huelva', 'málaga', 'córdoba', 'granada', 'jaén', 'almería', 'cádiz', 'andalucía', 'almonte']
    const coincide = palabrasUbic.some(p => titulo.includes(p) || organismo.includes(p))
    if (coincide) {
      items.push({ label: 'Ubicación detectada en texto', puntos: 15, positivo: true })
    } else {
      items.push({ label: 'Ubicación fuera de zona', puntos: 0, positivo: false })
    }
  }

  // Palabras clave
  const keywords = ['limpieza', 'mantenimiento', 'jardinería', 'zonas verdes', 'conserjería', 'portería', 'residuos', 'saneamiento', 'obras', 'servicios']
  const encontradas = keywords.filter(k => titulo.includes(k))
  const puntosPal = Math.min(15, encontradas.length * 5)
  if (puntosPal > 0) {
    items.push({ label: 'Palabras clave', puntos: puntosPal, positivo: true, detalle: encontradas.join(', ') })
  } else {
    items.push({ label: 'Sin palabras clave', puntos: 0, positivo: false })
  }

  // Fecha límite
  if (fecha) {
    try {
      const f = new Date(fecha.split(' ')[0])
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
      const dias = Math.ceil((f.getTime() - hoy.getTime()) / 86400000)
      if (dias >= 0) {
        items.push({ label: 'Tiene fecha límite', puntos: 5, positivo: true, detalle: dias + ' días restantes' })
        if (dias <= 7) items.push({ label: 'Vence próximamente', puntos: 10, positivo: true, detalle: 'Bonus urgencia' })
        else if (dias <= 15) items.push({ label: 'Vence en 15 días', puntos: 7, positivo: true })
        else if (dias <= 30) items.push({ label: 'Vence en 30 días', puntos: 5, positivo: true })
      }
    } catch {}
  }

  return items
}

export function ScoreBadge({ score, onClick }: { score: number; onClick?: () => void }) {
  const color = score >= 70 ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
    : score >= 40 ? 'bg-amber-100 text-amber-700 ring-amber-200'
    : score > 0 ? 'bg-red-100 text-red-700 ring-red-200'
    : 'bg-slate-100 text-slate-500 ring-slate-200'

  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ring-1 ${color} ${onClick ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}>
      <Target size={11} />
      {score}/100
    </button>
  )
}

export default function ScoreDesglose({ oportunidad }: Props) {
  const [abierto, setAbierto] = useState(false)
  const score = Number(oportunidad.scoring) || 0
  const items = calcularDesglose(oportunidad)
  const total = items.reduce((s, i) => s + i.puntos, 0)

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <button onClick={() => setAbierto(!abierto)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3">
          <Target size={16} className="text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Scoring de interés</span>
        </div>
        <div className="flex items-center gap-2">
          <ScoreBadge score={score} />
          {abierto ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
        </div>
      </button>

      {abierto && (
        <div className="border-t border-slate-100 p-4">
          <div className="space-y-2 mb-4">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`text-xs font-bold shrink-0 ${item.positivo && item.puntos > 0 ? 'text-emerald-500' : 'text-slate-300'}`}>
                    {item.positivo && item.puntos > 0 ? '+' : '·'}
                  </span>
                  <span className="text-xs text-slate-600 truncate">{item.label}</span>
                  {item.detalle && <span className="text-[10px] text-slate-400 truncate hidden sm:block">({item.detalle})</span>}
                </div>
                <span className={`text-xs font-black shrink-0 ml-2 ${item.puntos > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                  {item.puntos > 0 ? '+' + item.puntos : '0'}
                </span>
              </div>
            ))}
          </div>

          {/* Barra visual */}
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
            <div className={`h-full rounded-full transition-all ${
              score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-400'
            }`} style={{ width: score + '%' }} />
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-slate-400">Puntuación calculada</span>
            <span className="text-xs font-black text-slate-700">{score}/100</span>
          </div>
        </div>
      )}
    </div>
  )
}