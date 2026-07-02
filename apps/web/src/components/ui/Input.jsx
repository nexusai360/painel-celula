import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export const Input = forwardRef(function Input(
  { label, id, error, type = 'text', className = '', ...props },
  ref
) {
  const [mostrar, setMostrar] = useState(false)
  const ehSenha = type === 'password'
  const tipoFinal = ehSenha && mostrar ? 'text' : type

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-text">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={tipoFinal}
          aria-invalid={!!error}
          className={`h-12 w-full rounded-xl border bg-background px-4 text-sm text-text placeholder:text-text-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
            error ? 'border-danger' : 'border-border'
          } ${ehSenha ? 'pr-12' : ''} ${className}`}
          {...props}
        />
        {ehSenha && (
          <button
            type="button"
            onClick={() => setMostrar((m) => !m)}
            aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer"
          >
            {mostrar ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
})
