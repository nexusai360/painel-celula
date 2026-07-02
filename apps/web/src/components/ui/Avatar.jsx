function iniciais(nome) {
  const partes = (nome || '').trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0][0].toUpperCase()
  return (partes[0][0] + partes[1][0]).toUpperCase()
}

/** Scale initials font size proportionally to avatar size. */
function tamanhoFonte(size) {
  return Math.max(12, Math.round(size * 0.375))
}

/**
 * Avatar — photo or initials fallback.
 *
 * Props:
 *  - src: string | null — data URL or remote URL
 *  - nome: string — used for initials fallback and alt text
 *  - size: number (px) — default 40; use 80–96 for the profile header
 */
export function Avatar({ src, nome, size = 40 }) {
  const style = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    fontSize: tamanhoFonte(size),
  }

  if (src) {
    return (
      <img
        src={src}
        alt={nome ? `Foto de ${nome}` : 'Avatar'}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        className="rounded-full object-cover"
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      style={style}
      className="inline-flex items-center justify-center rounded-full bg-brand text-on-brand font-semibold select-none leading-none"
    >
      {iniciais(nome)}
    </span>
  )
}
