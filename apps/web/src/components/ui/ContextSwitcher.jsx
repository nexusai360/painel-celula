import { Shield, Users } from 'lucide-react'

const KEY = (id) => `icelula:contexto:${id}`
export function lerContexto(id) {
  try { return localStorage.getItem(KEY(id)) } catch { return null }
}
export function salvarContexto(id, v) {
  try { localStorage.setItem(KEY(id), v) } catch { /* ignore */ }
}
export function limparContexto(id) {
  try { localStorage.removeItem(KEY(id)) } catch { /* ignore */ }
}

/**
 * Alterna Administração ↔ Minha célula. Só renderiza para ADMIN+ (podeAdmin).
 * Aba "Minha célula" desabilita sem célula. Ativo ganha acabamento cromado.
 * Em <sm mostra só ícone (não estoura o header).
 */
export function ContextSwitcher({ contexto, onChange, podeAdmin, temCelula, badge = 0, className = '' }) {
  if (!podeAdmin) return null
  const itens = [
    { id: 'admin', label: 'Administração', icon: Shield, disabled: false, badge },
    { id: 'membro', label: 'Minha célula', icon: Users, disabled: !temCelula, badge: 0 },
  ]
  return (
    <div role="group" aria-label="Trocar área" className={`inline-flex rounded-xl border border-border bg-surface p-0.5 ${className}`}>
      {itens.map((it) => {
        const ativo = contexto === it.id
        const Icon = it.icon
        return (
          <button
            key={it.id}
            type="button"
            disabled={it.disabled}
            aria-pressed={ativo}
            title={it.disabled ? 'Você não participa de uma célula' : it.label}
            onClick={() => !it.disabled && onChange?.(it.id)}
            className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              ativo ? 'chrome shadow-sm' : 'text-text-muted hover:text-text'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{it.label}</span>
            {it.badge > 0 && (
              <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white" aria-label={`${it.badge} pendentes`}>
                {it.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
