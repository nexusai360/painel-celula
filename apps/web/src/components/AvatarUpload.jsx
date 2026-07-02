import { useRef, useState } from 'react'
import { Camera, Trash2, Loader2 } from 'lucide-react'
import { Avatar } from './ui/Avatar.jsx'
import { redimensionarImagem } from '../lib/imagem.js'

const MAX_SIZE = 400 * 1024 // 400 KB — mirrors backend limit

/**
 * AvatarUpload — large avatar with photo-picker and remove actions.
 *
 * Props:
 *  - value: string | null — current avatar data URL (or null = show initials)
 *  - nome: string — name for initials fallback
 *  - onChange(dataUrl: string | null) — called after resize or on remove
 */
export function AvatarUpload({ value, nome, onChange }) {
  const inputRef = useRef(null)
  const [erro, setErro] = useState(null)
  const [carregando, setCarregando] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setErro(null)
    setCarregando(true)
    try {
      const url = await redimensionarImagem(file)
      if (url.length > MAX_SIZE) {
        setErro('Imagem muito grande')
        return
      }
      onChange(url)
    } catch {
      setErro('Imagem inválida')
    } finally {
      setCarregando(false)
      // Reset so the same file can be selected again
      e.target.value = ''
    }
  }

  function remover() {
    setErro(null)
    onChange(null)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar display — 96 px, ring on focus-area, no ring on the image itself */}
      <div className="relative">
        <div
          className="rounded-full ring-2 ring-border"
          style={{ width: 96, height: 96 }}
        >
          <Avatar src={value} nome={nome} size={96} />
        </div>

        {/* Loading overlay */}
        {carregando && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40"
            aria-hidden="true"
          >
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={carregando}
          aria-label={value ? 'Trocar foto de perfil' : 'Adicionar foto de perfil'}
          className={`inline-flex h-11 min-w-[44px] items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${
            value
              ? 'border border-border bg-card font-medium text-text hover:border-brand hover:text-brand'
              : 'brand-grad bg-brand text-on-brand shadow-sm'
          }`}
        >
          <Camera className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {value ? 'Trocar foto' : 'Adicionar foto'}
        </button>

        {value && (
          <button
            type="button"
            onClick={remover}
            disabled={carregando}
            aria-label="Remover foto de perfil"
            className="inline-flex h-11 min-w-[44px] items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-medium text-text-muted transition-colors hover:border-danger hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <Trash2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            Remover foto
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFile}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Error message */}
      {erro && (
        <p role="alert" className="text-xs text-danger">
          {erro}
        </p>
      )}
    </div>
  )
}
