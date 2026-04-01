// src/components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    console.error('ErrorBoundary capturó un error:', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle size={28} className="text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Algo ha fallado en esta página</h2>
          <p className="text-sm text-slate-500 mb-1 max-w-sm">
            Se ha producido un error inesperado. El resto de la aplicación sigue funcionando con normalidad.
          </p>
          {this.state.error && (
            <p className="text-xs text-slate-400 font-mono bg-slate-100 px-3 py-2 rounded-lg mb-6 max-w-md break-all">
              {this.state.error.message}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a3c34] hover:bg-[#2d5a4e] text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <RefreshCw size={14} /> Reintentar
            </button>
            <button
              onClick={() => { this.handleReset(); window.location.href = '/' }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
            >
              <Home size={14} /> Ir al inicio
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
