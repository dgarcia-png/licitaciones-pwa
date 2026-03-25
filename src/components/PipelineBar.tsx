import { useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { FileSearch, Brain, Layers, Calculator, Gavel, FileText, Activity, ChevronRight, CheckCircle2, Circle, ArrowRight } from 'lucide-react'

// ── Pasos del pipeline ────────────────────────────────────────────────────────
export const PIPELINE_STEPS = [
  { key: 'oportunidad', label: 'Ficha',       icon: FileSearch, path: (id: string) => `/oportunidades/${id}` },
  { key: 'analisis',    label: 'Análisis IA', icon: Brain,      path: (id: string) => `/analisis?id=${id}` },
  { key: 'lotes',       label: 'Lotes',       icon: Layers,     path: (id: string) => `/oportunidades/${id}#lotes` },
  { key: 'calculo',     label: 'Cálculo',     icon: Calculator, path: (id: string) => `/calculo?id=${id}` },
  { key: 'decisiones',  label: 'GO/NO-GO',    icon: Gavel,      path: (id: string) => `/decisiones?id=${id}` },
  { key: 'oferta',      label: 'Oferta',      icon: FileText,   path: (id: string) => `/oferta?id=${id}` },
  { key: 'seguimiento', label: 'Seguimiento', icon: Activity,   path: (id: string) => `/seguimiento?id=${id}` },
]

export type PipelineStepKey = typeof PIPELINE_STEPS[number]['key']

interface PipelineBarProps {
  currentStep:      PipelineStepKey
  idOverride?:      string
  showNext?:        boolean
  nextLabel?:       string
  onNext?:          () => void
  nextDisabled?:    boolean
  nextDisabledMsg?: string
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function PipelineBar({
  currentStep,
  idOverride,
  showNext = true,
  nextLabel,
  onNext,
  nextDisabled = false,
  nextDisabledMsg = 'Completa este paso primero',
}: PipelineBarProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = idOverride || searchParams.get('id') || ''

  const [titulo, setTitulo] = useState('')
  const [estado, setEstado] = useState('')

  useEffect(() => {
    if (!id) return
    try {
      const cached = localStorage.getItem(`fc_detalle:${JSON.stringify({ id })}`)
      if (cached) {
        const d = JSON.parse(cached)
        const op = d?.data?.oportunidad
        if (op?.titulo) { setTitulo(op.titulo); setEstado(op.estado || ''); return }
      }
    } catch { /* nada */ }
    api.detalle(id)
      .then(d => { setTitulo(d?.oportunidad?.titulo || d?.titulo || ''); setEstado(d?.oportunidad?.estado || '') })
      .catch(() => {})
  }, [id])

  const currentIndex = PIPELINE_STEPS.findIndex(s => s.key === currentStep)
  const nextStep     = PIPELINE_STEPS[currentIndex + 1]

  const handleNext = () => {
    if (onNext) { onNext(); return }
    if (nextStep && id) navigate(nextStep.path(id))
  }

  const estadoColor: Record<string, string> = {
    nueva: 'bg-blue-100 text-blue-700', en_analisis: 'bg-amber-100 text-amber-700',
    go: 'bg-emerald-100 text-emerald-700', no_go: 'bg-red-100 text-red-700',
    descartada: 'bg-gray-100 text-gray-600', adjudicada: 'bg-violet-100 text-violet-700',
    perdida: 'bg-rose-100 text-rose-700',
  }
  const estadoLabel: Record<string, string> = {
    nueva: 'Nueva', en_analisis: 'En análisis', go: 'GO', no_go: 'NO-GO',
    descartada: 'Descartada', adjudicada: 'Adjudicada', perdida: 'Perdida',
  }

  if (!id) return null

  return (
    <div className="mb-6 rounded-2xl overflow-hidden bg-white border border-[var(--color-surface-border)] shadow-sm">

      {/* Cabecera — nombre licitación */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ background: 'linear-gradient(135deg, #1a3c34 0%, #2d5a4e 100%)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.15)' }}>L</div>
          <div className="min-w-0">
            <p className="text-white/60 text-[10px] uppercase tracking-widest font-semibold">Licitación activa</p>
            <p className="text-white font-semibold text-sm truncate max-w-[380px]">{titulo || `ID: ${id}`}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {estado && (
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${estadoColor[estado] || 'bg-gray-100 text-gray-600'}`}>
              {estadoLabel[estado] || estado}
            </span>
          )}
          <button onClick={() => navigate(`/oportunidades/${id}`)}
            className="text-white/60 hover:text-white text-[11px] font-medium transition-colors px-2 py-1 rounded-lg hover:bg-white/10">
            Ver ficha
          </button>
        </div>
      </div>

      {/* Pasos + botón siguiente */}
      <div className="flex items-center px-4 py-3 overflow-x-auto gap-1 bg-white">
        {PIPELINE_STEPS.map((step, idx) => {
          const Icon     = step.icon
          const isCurrent = step.key === currentStep
          const isPast    = idx < currentIndex
          const isFuture  = idx > currentIndex
          const isLast    = idx === PIPELINE_STEPS.length - 1
          return (
            <div key={step.key} className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => !isFuture && id && navigate(step.path(id))}
                disabled={isFuture}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
                  ${isCurrent ? 'text-white shadow-sm' : isPast ? 'text-[#1a3c34] hover:bg-[#e8f0ee] cursor-pointer' : 'text-slate-400 cursor-default'}`}
                style={isCurrent ? { background: 'linear-gradient(135deg,#1a3c34,#2d5a4e)' } : isPast ? { background: '#f0f7f4' } : {}}
              >
                {isPast   ? <CheckCircle2 size={13} className="text-[#2d5a4e]" /> :
                 isCurrent ? <Icon size={13} /> :
                 <Circle size={13} className="text-slate-300" />}
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {!isLast && (
                <ChevronRight size={13} className={isPast || isCurrent ? 'text-[#2d5a4e]' : 'text-slate-300'} />
              )}
            </div>
          )
        })}

        {/* Botón siguiente */}
        {showNext && nextStep && (
          <div className="ml-auto flex-shrink-0 relative group">
            <button
              onClick={handleNext}
              disabled={nextDisabled || !id}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all
                ${nextDisabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'text-white cursor-pointer hover:opacity-90 active:scale-95 shadow-sm'}`}
              style={!nextDisabled ? { background: 'linear-gradient(135deg,#1a3c34,#2d5a4e)', boxShadow: '0 2px 8px rgba(26,60,52,0.25)' } : {}}
            >
              {nextLabel || `${nextStep.label} →`}
              {!nextDisabled && <ArrowRight size={13} />}
            </button>
            {nextDisabled && (
              <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-slate-800 text-white text-[11px] rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {nextDisabledMsg}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}