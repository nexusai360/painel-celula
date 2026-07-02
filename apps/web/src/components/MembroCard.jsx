import { Pencil, Trash2, RotateCcw } from 'lucide-react'
import { Avatar } from './ui/Avatar.jsx'

export function MembroCard({ membro, ehLider, podeGerenciar, onEditar, onInativar, onAtivar }) {
  const inativo = !membro.ativo
  return (
    <div className={`flex items-center gap-3 rounded-2xl border border-border bg-card p-4 ${inativo ? 'opacity-60' : ''}`}>
      <Avatar src={membro.avatar} nome={membro.nome} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-text">{membro.nome}</p>
          {ehLider && (
            <span className="shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-medium text-brand">Líder</span>
          )}
          {inativo && (
            <span className="shrink-0 rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-medium text-danger">Inativo</span>
          )}
        </div>
        <p className="truncate text-sm text-text-muted">{membro.email}</p>
      </div>

      {podeGerenciar && (
        <div className="flex shrink-0 items-center gap-1">
          {inativo ? (
            <button
              type="button"
              onClick={() => onAtivar(membro)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-success hover:bg-surface"
            >
              <RotateCcw className="h-4 w-4" /> Ativar
            </button>
          ) : (
            <>
              <button type="button" aria-label="Editar" onClick={() => onEditar(membro)}
                className="rounded-lg p-1.5 text-text-muted hover:bg-surface hover:text-text">
                <Pencil className="h-4 w-4" />
              </button>
              <button type="button" aria-label="Excluir" onClick={() => onInativar(membro)}
                className="rounded-lg p-1.5 text-danger hover:bg-surface">
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
