import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, Loader2, Shield, Lock } from 'lucide-react'

export default function LoginPage() {
  const [usuario,    setUsuario]   = useState('')
  const [password,   setPassword]  = useState('')
  const [showPass,   setShowPass]  = useState(false)
  const [loading,    setLoading]   = useState(false)
  const [error,      setError]     = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuario.trim() || !password.trim()) {
      setError('Introduce usuario y contraseña')
      return
    }
    setLoading(true)
    setError('')
    try {
      await login(usuario.trim(), password)
      navigate('/')
    } catch (err: any) {
      setError(err?.message || 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(155deg, #1a3c34 0%, #1f4840 40%, #2d5a4e 100%)' }}
    >
      {/* Decoración de fondo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(255,255,255,0.04) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(255,255,255,0.03) 0%, transparent 50%)
          `,
        }}
      />
      {/* Grid sutil */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Formulario */}
      <div
        className="w-full max-w-[400px] relative z-10 animate-slide-up"
      >
        {/* Card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.97)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.1)',
          }}
        >
          {/* Header de la card */}
          <div
            className="px-8 pt-8 pb-6 text-center"
            style={{ borderBottom: '1px solid var(--color-surface-border)' }}
          >
            {/* Logo */}
            <div className="flex justify-center mb-5">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl font-bold"
                style={{
                  background: 'linear-gradient(135deg, #1a3c34 0%, #2d5a4e 100%)',
                  fontFamily: '"Playfair Display", Georgia, serif',
                  boxShadow: '0 8px 24px rgba(26,60,52,0.35)',
                }}
              >
                F
              </div>
            </div>

            <h1
              className="text-xl font-semibold text-gray-900 tracking-tight"
              style={{ fontFamily: '"DM Sans", sans-serif' }}
            >
              Forgeser
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Sistema de Gestión Integrada
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
            {/* Error */}
            {error && (
              <div className="alert-error flex items-center gap-2 animate-fade-in">
                <Shield size={15} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Usuario */}
            <div>
              <label className="input-label">Usuario</label>
              <input
                type="text"
                value={usuario}
                onChange={e => setUsuario(e.target.value)}
                className="input-field"
                placeholder="Tu nombre de usuario"
                autoComplete="username"
                autoFocus
                disabled={loading}
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="input-label">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pr-11"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white
                         transition-all duration-200 flex items-center justify-center gap-2
                         disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: loading
                  ? '#2d5a4e'
                  : 'linear-gradient(135deg, #1a3c34 0%, #2d5a4e 100%)',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(26,60,52,0.35)',
              }}
              onMouseEnter={e => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(26,60,52,0.4)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,60,52,0.35)'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Iniciando sesión…</span>
                </>
              ) : (
                <>
                  <Lock size={15} />
                  <span>Iniciar sesión</span>
                </>
              )}
            </button>
          </form>

          {/* Footer de la card */}
          <div
            className="px-8 py-4 text-center"
            style={{ borderTop: '1px solid var(--color-surface-border)', background: 'var(--color-surface-muted)' }}
          >
            <p className="text-[11px] text-gray-400">
              Acceso restringido a personal autorizado
            </p>
          </div>
        </div>

        {/* Versión y empresa */}
        <div className="mt-5 text-center space-y-1">
          <p className="text-white/40 text-[11px]">
            Forgeser Servicios del Sur SL · Almonte (Huelva)
          </p>
          <p className="text-white/25 text-[10px]">
            v4.1 · Sistema Integrado de Gestión
          </p>
        </div>
      </div>
    </div>
  )
}