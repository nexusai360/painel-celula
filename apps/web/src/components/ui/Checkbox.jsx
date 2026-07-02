import { Check } from 'lucide-react'

export function Checkbox({ checked = false, onChange, label, id, descricao, disabled = false, className = '' }) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-3 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      <span className="relative mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
          className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-border bg-card transition-colors checked:border-transparent checked:brand-grad disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        <Check className="pointer-events-none absolute h-3.5 w-3.5 text-on-brand opacity-0 peer-checked:opacity-100" aria-hidden="true" />
      </span>
      {label && (
        <span className="text-sm leading-5">
          <span className="font-medium text-text">{label}</span>
          {descricao && <span className="mt-0.5 block text-xs text-text-muted">{descricao}</span>}
        </span>
      )}
    </label>
  )
}
