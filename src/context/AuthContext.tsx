import { createContext, useContext, useState, ReactNode } from 'react'
import { api } from '../services/api'

export type Rol =
  | 'SUPER_ADMIN' | 'ADMIN_LICITACIONES' | 'ADMIN_RRHH' | 'ADMIN_TERRITORIO'
  | 'DIRECTOR_GERENTE' | 'RESPONSABLE_COMERCIAL' | 'RESPONSABLE_PRL' | 'RESPONSABLE_RGPD'
  | 'SUPERVISOR_TERRITORIO' | 'ENCARGADO_ZONA' | 'TRABAJADOR_CAMPO' | 'TRABAJADOR_LECTURA'

export interface Usuario {
  nombre: string
  email: string
  rol: Rol
  nivel: number
  activo: boolean
}

interface AuthContextType {
  usuario: Usuario | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  cargando: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const saved = localStorage.getItem('usuario')
    const token = localStorage.getItem('auth_token')
    if (saved && token) {
      setTimeout(() => api.prefetch(), 500)
      // [C32] Verificar token en background — si ha expirado, cerrar sesión
      setTimeout(async () => {
        try {
          const r = await api.usuarios()
          if (r && (r.ok === false && (r.code === 401 || r.code === 403))) {
            setUsuario(null)
            localStorage.removeItem('usuario')
            localStorage.removeItem('auth_token')
            window.location.href = '/login'
          }
        } catch {}
      }, 2000)
      return JSON.parse(saved)
    }
    return null
  })
  const [cargando, setCargando] = useState(false)

  const login = async (email: string, password: string): Promise<boolean> => {
    setCargando(true)
    try {
      const result = await api.login(email, password)
      if (result.ok && result.usuario && result.token) {
        setUsuario(result.usuario)
        localStorage.setItem('usuario', JSON.stringify(result.usuario))
        localStorage.setItem('auth_token', result.token)
        setTimeout(() => api.prefetch(), 200)
        setCargando(false)
        return true
      }
      setCargando(false)
      // [C31] Propagar mensaje de error del backend para mostrarlo en LoginPage
      const msg = result.error || 'Credenciales incorrectas'
      throw new Error(msg)
    } catch (e: any) {
      console.error('Login error:', e)
      setCargando(false)
      throw e  // [C31] Re-lanzar para que LoginPage muestre el mensaje real
    }
  }

  const logout = async (): Promise<void> => {
    // 1. Intenta invalidar la sesión en el backend (cierra token server-side)
    //    Si falla (red caída, etc.), seguimos cerrando en cliente.
    try {
      await api.logout()
    } catch (e) {
      console.warn('Logout backend falló, cerrando solo cliente:', e)
    }
    // 2. Limpia siempre estado cliente
    setUsuario(null)
    localStorage.removeItem('usuario')
    localStorage.removeItem('auth_token')
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout, cargando }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}

