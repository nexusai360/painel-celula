import { useRef } from 'react'

const PARTICULAS = 8

export function AnimatedCheck({ marcado, disabled, onToggle }) {
  const btnRef = useRef(null)

  function handleClick() {
    if (disabled) return
    const irMarcar = !marcado
    if (irMarcar && navigator.vibrate) navigator.vibrate(12)
    onToggle?.()
  }

  return (
    <span className="animated-check-root">
      {/* Região aria-live — sempre montada para garantir anúncio */}
      <span
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {marcado ? 'Presença confirmada' : ''}
      </span>

      <button
        ref={btnRef}
        type="button"
        aria-pressed={marcado}
        disabled={disabled}
        onClick={handleClick}
        className={`animated-check-btn${marcado ? ' animated-check-btn--marcado' : ''}${disabled ? ' animated-check-btn--disabled' : ''}`}
        aria-label={marcado ? 'Presença confirmada — clique para desmarcar' : 'Marcar presença'}
      >
        {/* Overlay de círculo que cresce ao marcar */}
        <span className="animated-check-circulo" aria-hidden="true" />

        {/* Ícone SVG com check animado por stroke-dashoffset */}
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="animated-check-svg"
          aria-hidden="true"
        >
          {/* Círculo de fundo */}
          <circle
            cx="24"
            cy="24"
            r="20"
            className="animated-check-circle-bg"
          />
          {/* Check path */}
          <polyline
            points="13,25 21,33 35,17"
            className={`animated-check-polyline${marcado ? ' animated-check-polyline--marcado' : ''}`}
          />
        </svg>

        {/* Partículas — aparecem apenas ao marcar */}
        {marcado && (
          <span className="animated-check-particulas" aria-hidden="true">
            {Array.from({ length: PARTICULAS }).map((_, i) => (
              <span
                key={i}
                className="animated-check-particula"
                style={{ '--i': i }}
              />
            ))}
          </span>
        )}
      </button>
    </span>
  )
}
