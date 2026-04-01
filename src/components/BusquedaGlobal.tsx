// src/components/BusquedaGlobal.tsx
// Paleta de búsqueda cross-módulo — actívala con Cmd+K / Ctrl+K
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Search, FileSearch, Users, Building2, BookOpen, Loader2, X, ArrowRight, Hash } from 'lucide-react'

const MODULO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  licitaciones: { label: 'Licitaciones', color: 'text-blue-700',    bg: 'bg-blue-100' },
  rrhh:         { label: 'RRHH',         color: 'text-teal-700',    bg: 'bg-teal-100' },
  territorio:   { label: 'Territorio',   color: 'text-green-700',   bg: 'bg-green-100' },
  cumplimiento: { label: 'Cumplimiento', color: 'text-orange-700',  bg: 'bg-orange-100' },
}

const TIPO_ICON: Record<string, any> = {
  'Licitación': FileSearch,
  'Empleado':   Users,
  'Centro':     Building2,
  'Convenio':   BookOpen,
}

interface Resultado {
  modulo: string
  tipo: string
  id: string
  titulo: string
  subtitulo: string
  meta: string
  url: string
}

interface Props {
  abierto: boolean
  onCerrar: () => void
}

export default function BusquedaGlobal({ abierto, onCerrar }: Props) {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [cargando, setCargando] = useState(false)
  const [activo, setActivo] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Foco al abrir
  useEffect(() => {
    if (abierto) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResultados([])
      setActivo(0)
    }
  }, [abierto])

  // Buscar con debounce
  const buscar = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResultados([]); return }
    setCargando(true)
    try {
      const r = await api.busquedaGlobal(q)
      setResultados(r.resultados || [])
      setActivo(0)
    } catch { setResultados([]) }
    finally { setCargando(false) }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => buscar(query), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, buscar])

  // Cerrar con Escape, navegar con Enter/flechas
  useEffect(() => {
    if (!abierto) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCerrar(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActivo(a => Math.min(a + 1, resultados.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActivo(a => Math.max(a - 1, 0)) }
      if (e.key === 'Enter' && resultados[activo]) { irA(resultados[activo]) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [abierto, activo, resultados])

  const irA = (r: Resultado) => {
    navigate(r.url)
    onCerrar()
  }

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
      onClick={e => { if (e.target === e.currentTarget) onCerrar() }}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCerrar} />

      {/* Panel */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden z-10">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          {cargando
            ? <Loader2 size={18} className="text-[#1a3c34] animate-spin shrink-0" />
            : <Search size={18} className="text-slate-400 shrink-0" />
          }
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar licitaciones, empleados, centros..."
            className="flex-1 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent outline-none"
          />
          {query && (
            <button onClick={() => { setQuery(''); setResultados([]) }} className="text-slate-400 hover:text-slate-600">
              <X size={15} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-slate-400 border border-slate-200 rounded font-mono">
            ESC
          </kbd>
        </div>

        {/* Resultados */}
        <div className="max-h-80 overflow-y-auto">
          {query.trim().length >= 2 && resultados.length === 0 && !cargando && (
            <div className="flex flex-col items-center py-10 text-slate-400">
              <Hash size={24} className="mb-2 opacity-40" />
              <p className="text-sm">Sin resultados para <strong className="text-slate-600">"{query}"</strong></p>
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="py-8 text-center text-sm text-slate-400">
              Escribe al menos 2 caracteres para buscar
            </div>
          )}

          {resultados.length > 0 && (
            <ul className="py-1">
              {resultados.map((r, i) => {
                const cfg   = MODULO_CONFIG[r.modulo] || { label: r.modulo, color: 'text-slate-600', bg: 'bg-slate-100' }
                const Icon  = TIPO_ICON[r.tipo] || FileSearch
                const estaActivo = i === activo
                return (
                  <li key={r.id + i}>
                    <button
                      onClick={() => irA(r)}
                      onMouseEnter={() => setActivo(i)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${estaActivo ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                      <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                        <Icon size={15} className={cfg.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{r.titulo}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>{r.tipo}</span>
                          {r.subtitulo && <span className="text-xs text-slate-400 truncate">{r.subtitulo}</span>}
                          {r.meta && <span className="text-xs text-slate-300">· {r.meta}</span>}
                        </div>
                      </div>
                      {estaActivo && <ArrowRight size={14} className="text-slate-400 shrink-0" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><kbd className="font-mono border border-slate-300 rounded px-1">↑↓</kbd> navegar</span>
            <span className="flex items-center gap-1"><kbd className="font-mono border border-slate-300 rounded px-1">↵</kbd> abrir</span>
            <span className="flex items-center gap-1"><kbd className="font-mono border border-slate-300 rounded px-1">ESC</kbd> cerrar</span>
          </div>
          {resultados.length > 0 && (
            <span className="text-[10px] text-slate-400">{resultados.length} resultado{resultados.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
    </div>
  )
}
