// Skeleton — componentes de carga para eliminar pantallas en blanco
// Uso: import { SkeletonCard, SkeletonList, SkeletonPage } from '../components/Skeleton'

function pulse(className: string) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
}

// ── Card skeleton (para oportunidades, empleados, etc.) ────────────────────
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
      <div className="flex justify-between">
        {pulse('h-4 w-3/4')}
        {pulse('h-4 w-16')}
      </div>
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <div key={i}>{pulse(`h-3 ${i % 2 === 0 ? 'w-1/2' : 'w-2/3'}`)}</div>
      ))}
    </div>
  )
}

// ── Lista de cards (página de oportunidades, empleados) ────────────────────
export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={i % 2 === 0 ? 3 : 2} />
      ))}
    </div>
  )
}

// ── Stats row (dashboards) ─────────────────────────────────────────────────
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${count} gap-3 mb-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          {pulse('h-3 w-1/2 mx-auto')}
          {pulse('h-8 w-16 mx-auto')}
          {pulse('h-2 w-1/3 mx-auto')}
        </div>
      ))}
    </div>
  )
}

// ── Detalle de oportunidad ─────────────────────────────────────────────────
export function SkeletonDetalle() {
  return (
    <div className="max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {pulse('h-8 w-8 rounded-full')}
        <div className="space-y-2 flex-1">
          {pulse('h-6 w-1/2')}
          {pulse('h-3 w-1/4')}
        </div>
      </div>
      {/* Pipeline bar */}
      {pulse('h-12 w-full rounded-2xl')}
      {/* Bloque datos */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        {pulse('h-4 w-1/3')}
        {pulse('h-10 w-full')}
        {pulse('h-10 w-full')}
        <div className="grid grid-cols-2 gap-3">
          {pulse('h-10 w-full')}
          {pulse('h-10 w-full')}
        </div>
      </div>
      {/* Análisis */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        {pulse('h-4 w-1/4')}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            {pulse('h-3 w-1/3')}
            {pulse('h-3 w-1/4')}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Análisis IA ────────────────────────────────────────────────────────────
export function SkeletonAnalisis() {
  return (
    <div className="max-w-4xl space-y-4">
      {pulse('h-12 w-full rounded-2xl mb-2')}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        {pulse('h-5 w-1/3')}
        {pulse('h-16 w-full')}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          {pulse('h-4 w-1/4')}
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="flex justify-between">
              {pulse('h-3 w-1/3')}
              {pulse('h-3 w-1/2')}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Tabla RRHH ─────────────────────────────────────────────────────────────
export function SkeletonTabla({ filas = 5, cols = 4 }: { filas?: number; cols?: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className={`grid gap-3 p-3 bg-slate-50 border-b border-slate-200`}
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i}>{pulse('h-3 w-3/4')}</div>
        ))}
      </div>
      {/* Filas */}
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i}
          className={`grid gap-3 p-3 border-b border-slate-100 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j}>{pulse(`h-3 ${j === 0 ? 'w-full' : 'w-2/3'}`)}</div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Página genérica ────────────────────────────────────────────────────────
export function SkeletonPage() {
  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-4">
      <div className="flex items-center gap-4 mb-6">
        {pulse('h-10 w-10 rounded-xl')}
        <div className="space-y-2">
          {pulse('h-7 w-48')}
          {pulse('h-3 w-32')}
        </div>
      </div>
      <SkeletonStats count={4} />
      <SkeletonList count={3} />
    </div>
  )
}