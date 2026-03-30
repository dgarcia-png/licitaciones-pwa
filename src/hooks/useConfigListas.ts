// src/hooks/useConfigListas.ts
// ═══════════════════════════════════════════════════════════════════════════
// Hook central que carga las listas dinámicas desde CONFIG_GLOBAL (tab listas)
// y las proporciona a todos los componentes que las necesiten.
// Si CONFIG_GLOBAL no tiene valores, usa fallbacks hardcodeados.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { api } from '../services/api'

// ── Fallbacks por defecto (se usan si CONFIG_GLOBAL está vacío) ──────────
const DEFAULTS = {
  tipos_contrato:          ['Indefinido', 'Temporal', 'Obra y servicio', 'Interinidad', 'Formación', 'Prácticas'],
  turnos:                  ['Mañana', 'Tarde', 'Noche', 'Rotativo', 'Partido', 'Completo'],
  estados_empleado:        ['activo', 'baja', 'excedencia', 'suspendido'],
  motivos_ausencia:        ['Vacaciones', 'Permiso retribuido', 'IT', 'Accidente laboral', 'Maternidad', 'Paternidad', 'Asuntos propios', 'Otro'],
  tipos_incidencia:        ['limpieza', 'mantenimiento', 'seguridad', 'averias', 'suministros', 'quejas', 'accidente', 'general'],
  tipos_vehiculo:          ['furgoneta', 'turismo', 'camion', 'moto', 'otro'],
  tipos_material:          ['Producto químico', 'Utillaje', 'EPI', 'Consumible', 'Repuesto', 'Otro'],
  categorias_profesionales:['Peón', 'Oficial 2ª', 'Oficial 1ª', 'Encargado/a', 'Jefe/a de equipo', 'Supervisor/a'],
  tipos_servicio:          ['limpieza', 'jardineria', 'mantenimiento', 'conserjeria', 'vigilancia'],
  carnets_profesionales:   ['Carnet conducir B', 'Manipulador alimentos', 'Fitosanitario', 'PRL básico', 'PRL 60h', 'Carretilla elevadora'],
  convenios_lista:         [],
}

// ── Cache en memoria (evita llamadas repetidas en la misma sesión) ───────
let _cache: Record<string, string[]> | null = null
let _cacheTimestamp = 0
const CACHE_TTL = 300000 // 5 minutos

// ── Parsear lista separada por comas ─────────────────────────────────────
function parseLista(valor: string | undefined | null): string[] {
  if (!valor || typeof valor !== 'string') return []
  return valor.split(',').map(s => s.trim()).filter(s => s.length > 0)
}

// ── Hook principal ───────────────────────────────────────────────────────
export function useConfigListas() {
  const [listas, setListas] = useState<Record<string, string[]>>(_cache || {})
  const [cargando, setCargando] = useState(!_cache)

  useEffect(() => {
    // Si la cache es reciente, no recargar
    if (_cache && Date.now() - _cacheTimestamp < CACHE_TTL) {
      setListas(_cache)
      setCargando(false)
      return
    }

    let cancelled = false
    const cargar = async () => {
      try {
        const r = await api.configGlobal()
        if (cancelled) return
        if (r.ok && r.config) {
          const listasConfig = r.config.listas || {}
          const territorioConfig = r.config.territorio || {}
          const rrhhConfig = r.config.rrhh || {}

          const result: Record<string, string[]> = {}

          // Parsear cada lista desde CONFIG_GLOBAL
          for (const key of Object.keys(DEFAULTS)) {
            const valorGlobal = listasConfig[key] || territorioConfig[key] || rrhhConfig[key] || ''
            const parsed = parseLista(valorGlobal)
            result[key] = parsed.length > 0 ? parsed : (DEFAULTS as any)[key]
          }

          _cache = result
          _cacheTimestamp = Date.now()
          setListas(result)
        } else {
          // API falló → usar defaults
          setListas(DEFAULTS)
        }
      } catch {
        if (!cancelled) setListas(DEFAULTS)
      } finally {
        if (!cancelled) setCargando(false)
      }
    }
    cargar()
    return () => { cancelled = true }
  }, [])

  return {
    cargando,
    // ── Listas individuales con tipado claro ──
    tiposContrato:           listas.tipos_contrato          || DEFAULTS.tipos_contrato,
    turnos:                  listas.turnos                  || DEFAULTS.turnos,
    estadosEmpleado:         listas.estados_empleado        || DEFAULTS.estados_empleado,
    motivosAusencia:         listas.motivos_ausencia        || DEFAULTS.motivos_ausencia,
    tiposIncidencia:         listas.tipos_incidencia        || DEFAULTS.tipos_incidencia,
    tiposVehiculo:           listas.tipos_vehiculo          || DEFAULTS.tipos_vehiculo,
    tiposMaterial:           listas.tipos_material          || DEFAULTS.tipos_material,
    categoriasProfesionales: listas.categorias_profesionales|| DEFAULTS.categorias_profesionales,
    tiposServicio:           listas.tipos_servicio          || DEFAULTS.tipos_servicio,
    carnetsProfesionales:    listas.carnets_profesionales   || DEFAULTS.carnets_profesionales,
    conveniosLista:          listas.convenios_lista         || DEFAULTS.convenios_lista,
    // ── Acceso genérico por clave ──
    getLista: (clave: string): string[] => listas[clave] || (DEFAULTS as any)[clave] || [],
    // ── Invalidar caché (tras guardar cambios en Configuración) ──
    invalidar: () => { _cache = null; _cacheTimestamp = 0 },
  }
}
