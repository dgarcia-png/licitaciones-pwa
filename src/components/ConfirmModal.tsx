import { AlertTriangle, Loader2 } from 'lucide-react'

interface ConfirmModalProps {
  open:        boolean
  titulo:      string
  mensaje:     string
  labelOk?:    string
  labelCancel?: string
  peligroso?:  boolean
  cargando?:   boolean
  onConfirm:   () => void
  onCancel:    () => void
}

export default function ConfirmModal({
  open, titulo, mensaje,
  labelOk = 'Confirmar',
  labelCancel = 'Cancelar',
  peligroso = false,
  cargando = false,
  onConfirm, onCancel
}: ConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 z-10">
        {/* Icono */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
          peligroso ? 'bg-red-100' : 'bg-amber-100'
        }`}>
          <AlertTriangle size={22} className={peligroso ? 'text-red-600' : 'text-amber-600'} />
        </div>

        {/* Texto */}
        <h3 className="text-base font-bold text-slate-900 text-center mb-2">{titulo}</h3>
        <p className="text-sm text-slate-500 text-center leading-relaxed mb-6">{mensaje}</p>

        {/* Botones */}
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={cargando}
            className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50">
            {labelCancel}
          </button>
          <button onClick={onConfirm} disabled={cargando}
            className={`flex-1 py-2.5 px-4 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
              peligroso
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-[#1a3c34] hover:bg-[#2d5a4e]'
            }`}>
            {cargando && <Loader2 size={14} className="animate-spin" />}
            {labelOk}
          </button>
        </div>
      </div>
    </div>
  )
}