import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { Link2, Plus, RefreshCw, Loader2, CheckCircle2,
  AlertTriangle, X, Save, Copy, ExternalLink, Trash2, Send } from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'

export default function PortalTokensPage() {
  const [tokens, setTokens] = useState<any[]>([])
  const [centros, setCentros] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [confirmRevocar, setConfirmRevocar] = useState<string | null>(null)
  const [form, setForm] = useState({
    centro_id: '', centro_nombre: '', organismo: '',
    email_contacto: '', nombre_contacto: '', enviar_email: true
  })
  const [tokenGenerado, setTokenGenerado] = useState<{ token: string; url: string } | null>(null)

  const showMsg = (m: string, err = false) => {
    if (err) setError(m); else setMsg(m)
    setTimeout(() => { setMsg(''); setError('') }, 4000)
  }

  const cargar = async () => {
    setCargando(true)
    try {
      const [t, c] = await Promise.all([
        api.tokensCliente(),
        api.centros()
      ])
      setTokens(t.tokens || [])
      setCentros(c.centros || [])
    } catch (e) { } finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  const onCentroChange = (id: string) => {
    const c = centros.find((x: any) => x.id === id)
    setForm({ ...form, centro_id: id, centro_nombre: c?.nombre || '', organismo: c?.organismo || '' })
  }

  const handleGenerar = async () => {
    if (!form.centro_id) { showMsg('Selecciona un centro', true); return }
    setGuardando(true)
    try {
      const r = await api.generarTokenCliente(form)
      if (r.ok) {
        setTokenGenerado({ token: r.token, url: r.url })
        showMsg('✅ Token generado' + (form.enviar_email && form.email_contacto ? ' · Email enviado' : ''))
        setMostrarForm(false)
        setForm({ centro_id: '', centro_nombre: '', organismo: '', email_contacto: '', nombre_contacto: '', enviar_email: true })
        await cargar()
      } else showMsg(r.error || 'Error', true)
    } catch (e) { showMsg('Error', true) }
    finally { setGuardando(false) }
  }

  const handleRevocar = async (id: string) => {
    setGuardando(true)
    try {
      const r = await api.revocarToken(id)
      if (r.ok) { showMsg('Token revocado'); await cargar() }
    } catch (e) { }
    finally { setGuardando(false); setConfirmRevocar(null) }
  }

  const copiar = (texto: string) => {
    navigator.clipboard.writeText(texto)
    showMsg('✅ Copiado al portapapeles')
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <ConfirmModal open={!!confirmRevocar}
        titulo="¿Revocar acceso?"
        mensaje="El cliente perderá el acceso al portal inmediatamente. Podrás generar un nuevo token en cualquier momento."
        labelOk="Sí, revocar" peligroso cargando={guardando}
        onConfirm={() => confirmRevocar && handleRevocar(confirmRevocar)}
        onCancel={() => setConfirmRevocar(null)} />

      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-[#1a3c34] to-[#2d5a4e] rounded-xl shadow-lg">
            <Link2 size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Portal cliente</h1>
            <p className="text-sm text-slate-500">Accesos personalizados para organismos contratantes</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setMostrarForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1a3c34] hover:bg-[#2d5a4e] text-white text-sm font-semibold rounded-xl">
            <Plus size={15} /> Nuevo acceso
          </button>
        </div>
      </div>

      {msg && <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-emerald-800 text-sm"><CheckCircle2 size={15} />{msg}</div>}
      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-red-800 text-sm"><AlertTriangle size={15} />{error}</div>}

      {/* Token generado recientemente */}
      {tokenGenerado && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-emerald-800">🎉 Nuevo acceso generado</p>
            <button onClick={() => setTokenGenerado(null)}><X size={16} className="text-emerald-600" /></button>
          </div>
          <p className="text-xs text-slate-600 mb-2">URL de acceso para el cliente:</p>
          <div className="flex items-center gap-2 bg-white border border-emerald-200 rounded-xl px-3 py-2 mb-3">
            <p className="text-xs text-slate-700 flex-1 truncate font-mono">{tokenGenerado.url}</p>
            <button onClick={() => copiar(tokenGenerado.url)}
              className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors">
              <Copy size={13} />
            </button>
            <a href={tokenGenerado.url} target="_blank" rel="noopener noreferrer"
              className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors">
              <ExternalLink size={13} />
            </a>
          </div>
          <p className="text-xs text-emerald-700">Comparte este enlace con el organismo. No requiere contraseña.</p>
        </div>
      )}

      {/* Formulario nuevo token */}
      {mostrarForm && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-blue-800">Nuevo acceso al portal</p>
            <button onClick={() => setMostrarForm(false)}><X size={16} className="text-blue-600" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 block mb-1">Centro *</label>
              <select value={form.centro_id} onChange={e => onCentroChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="">— Seleccionar centro —</option>
                {centros.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            {form.organismo && (
              <div className="col-span-2">
                <p className="text-xs text-slate-500 bg-white px-3 py-2 rounded-xl border border-slate-200">
                  Organismo: <strong>{form.organismo}</strong>
                </p>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Nombre del contacto</label>
              <input value={form.nombre_contacto}
                onChange={e => setForm({ ...form, nombre_contacto: e.target.value })}
                placeholder="Nombre y apellidos"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Email del contacto</label>
              <input type="email" value={form.email_contacto}
                onChange={e => setForm({ ...form, email_contacto: e.target.value })}
                placeholder="correo@organismo.es"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.enviar_email}
                  onChange={e => setForm({ ...form, enviar_email: e.target.checked })}
                  className="rounded" />
                <span className="text-sm text-slate-700">
                  Enviar email automáticamente al contacto con el enlace de acceso
                </span>
              </label>
            </div>
          </div>
          <button onClick={handleGenerar} disabled={guardando}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1a3c34] text-white text-sm font-bold rounded-xl">
            {guardando ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
            Generar enlace de acceso
          </button>
        </div>
      )}

      {/* Lista tokens */}
      {cargando ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-[#1a3c34]" /></div>
      ) : tokens.length === 0 ? (
        <div className="flex flex-col items-center py-16 bg-white border border-slate-200 rounded-2xl">
          <Link2 size={36} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Sin accesos generados</p>
          <p className="text-sm text-slate-400 mt-1">Genera el primer enlace para un organismo contratante</p>
          <button onClick={() => setMostrarForm(true)}
            className="mt-4 px-5 py-2 bg-[#1a3c34] text-white text-sm font-semibold rounded-xl">
            Generar primer acceso
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tokens.map((t: any) => (
            <div key={t.id} className={`bg-white border-2 rounded-2xl p-5 ${t.activo ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-slate-900">{t.centro_nombre}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {t.activo ? 'Activo' : 'Revocado'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{t.organismo}</p>
                  {t.email && <p className="text-xs text-slate-400 mt-0.5">📧 {t.email} · {t.contacto}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                    <span>Generado: {t.creado}</span>
                    <span>Último acceso: {t.ultimo_acceso}</span>
                  </div>
                </div>
                {t.activo && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => copiar(t.url)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                      title="Copiar URL">
                      <Copy size={14} />
                    </button>
                    <a href={t.url} target="_blank" rel="noopener noreferrer"
                      className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl transition-colors"
                      title="Abrir portal">
                      <ExternalLink size={14} />
                    </a>
                    <button onClick={() => setConfirmRevocar(t.id)}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                      title="Revocar acceso">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              {t.activo && (
                <div className="mt-3 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                  <p className="text-[11px] text-slate-500 flex-1 font-mono truncate">{t.url}</p>
                  <button onClick={() => copiar(t.url)} className="text-[10px] text-slate-400 hover:text-slate-600 font-bold shrink-0">
                    Copiar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}