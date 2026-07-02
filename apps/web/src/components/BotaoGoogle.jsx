import { useState } from 'react'
import { useConfig } from '../context/ConfigContext.jsx'
import { apiGoogleAuthUrl } from '../lib/api.js'

// Google "G" logo in brand colors (official SVG glyph)
function GoogleGlyph() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  )
}

export function BotaoGoogle({ contexto = 'login', qrToken, label }) {
  const { googleHabilitado } = useConfig()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  if (!googleHabilitado) return null

  const textoLabel = label || (contexto === 'conectar' ? 'Conectar Google Calendar' : 'Entrar com Google')

  async function handleClick() {
    setCarregando(true)
    setErro('')
    try {
      const { url } = await apiGoogleAuthUrl(contexto, qrToken)
      window.location.href = url
    } catch (e) {
      setErro(e?.response?.data?.erro || 'Não foi possível conectar ao Google. Tente novamente.')
      setCarregando(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-text-muted">ou</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        disabled={carregando}
        onClick={handleClick}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 text-sm font-semibold text-text transition-all duration-200 hover:border-brand-soft active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        aria-label={textoLabel}
      >
        {carregando ? (
          <svg
            aria-hidden="true"
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          <GoogleGlyph />
        )}
        {textoLabel}
      </button>

      {erro && <p role="alert" className="text-center text-xs text-danger">{erro}</p>}
    </div>
  )
}
