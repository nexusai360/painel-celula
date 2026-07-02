import { useEffect, useState } from 'react'
import { Users2 } from 'lucide-react'
import { Checkbox } from './ui/Checkbox.jsx'
import { QualificacaoBadge } from './ui/RoleBadge.jsx'
import { Avatar } from './ui/Avatar.jsx'
import { TODAS_QUALIFICACOES } from '../lib/papeis.js'
import { apiListarCelulas } from '../lib/api.js'
import { nomeDiaSemana } from '../lib/datas.js'

const NIVEIS = [
  { v: 'USUARIO', label: 'Usuários' },
  { v: 'ADMIN', label: 'Administradores' },
]

// Alvo default: tudo "Todos" (equivale a "todos os usuários").
export const ALVO_TODOS = {
  celulasTodas: true, celulasAlvo: [],
  qualificacoesTodas: true, qualificacoesAlvo: [],
  niveisTodas: true, niveisAlvo: [],
}

function Secao({ titulo, children }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{titulo}</p>
      {children}
    </div>
  )
}

/**
 * Seletor de público (3 eixos combináveis): Qualificações, Células e (para admin) Níveis.
 * `value` = { celulasTodas, celulasAlvo[], qualificacoesTodas, qualificacoesAlvo[], niveisTodas, niveisAlvo[] }.
 * `mostrarNiveis` só para remetente admin.
 */
export function SeletorPublico({ value, onChange, mostrarNiveis = false }) {
  const [celulas, setCelulas] = useState([])
  useEffect(() => { apiListarCelulas().then(setCelulas).catch(() => setCelulas([])) }, [])

  const set = (patch) => onChange({ ...value, ...patch })

  // Alterna "Todas" de um eixo; desmarcar mantém array vazio (=> trava de envio).
  const setTodas = (eixo, arrKey, todas) => set({ [eixo]: todas, [arrKey]: [] })
  const toggleItem = (eixo, arrKey, item) => {
    const atual = value[arrKey] || []
    const novo = atual.includes(item) ? atual.filter((x) => x !== item) : [...atual, item]
    // marcar um item desliga o "Todas" daquele eixo
    set({ [eixo]: false, [arrKey]: novo })
  }
  const marcado = (eixo, arrKey, item) => value[eixo] || (value[arrKey] || []).includes(item)

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-surface/40 p-3">
        <Checkbox
          id="alvo-todos"
          label="Todos os usuários"
          descricao="Preenche os três eixos; depois você pode restringir."
          checked={value.celulasTodas && value.qualificacoesTodas && (!mostrarNiveis || value.niveisTodas)}
          onChange={(v) => onChange(v ? ALVO_TODOS : { ...value, celulasTodas: false, qualificacoesTodas: false, niveisTodas: false })}
        />
      </div>

      <Secao titulo="Qualificações">
        <div className="mb-2">
          <Checkbox id="q-todas" label="Todas as qualificações" checked={value.qualificacoesTodas}
            onChange={(v) => setTodas('qualificacoesTodas', 'qualificacoesAlvo', v)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {TODAS_QUALIFICACOES.map((q) => {
            const on = marcado('qualificacoesTodas', 'qualificacoesAlvo', q)
            return (
              <button key={q} type="button" onClick={() => toggleItem('qualificacoesTodas', 'qualificacoesAlvo', q)}
                className={`rounded-full transition-all ${on ? 'ring-2 ring-brand ring-offset-1 ring-offset-background' : 'opacity-55 hover:opacity-100'}`}>
                <QualificacaoBadge qualificacao={q} />
              </button>
            )
          })}
        </div>
      </Secao>

      {mostrarNiveis && (
        <Secao titulo="Nível de acesso">
          <div className="mb-2">
            <Checkbox id="n-todos" label="Todos os níveis" checked={value.niveisTodas}
              onChange={(v) => setTodas('niveisTodas', 'niveisAlvo', v)} />
          </div>
          <div className="flex flex-wrap gap-4">
            {NIVEIS.map((n) => (
              <Checkbox key={n.v} id={`n-${n.v}`} label={n.label}
                checked={marcado('niveisTodas', 'niveisAlvo', n.v)}
                onChange={() => toggleItem('niveisTodas', 'niveisAlvo', n.v)} />
            ))}
          </div>
        </Secao>
      )}

      <Secao titulo="Células">
        <div className="mb-2">
          <Checkbox id="c-todas" label="Todas as células" checked={value.celulasTodas}
            onChange={(v) => setTodas('celulasTodas', 'celulasAlvo', v)} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {celulas.map((c) => {
            const on = value.celulasAlvo?.includes(c.id) && !value.celulasTodas
            return (
              <button key={c.id} type="button" onClick={() => toggleItem('celulasTodas', 'celulasAlvo', c.id)}
                className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition-colors ${on ? 'border-brand bg-brand/5' : 'border-border hover:bg-surface'} ${value.celulasTodas ? 'opacity-60' : ''}`}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"><Users2 className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text">{c.nome}</span>
                  <span className="block truncate text-xs text-text-muted">{nomeDiaSemana(c.diaSemana)}</span>
                </span>
                <span className="flex -space-x-1.5">
                  {(c.lideres || []).slice(0, 3).map((l) => <Avatar key={l.id} nome={l.nome} src={l.avatar} size={20} />)}
                </span>
              </button>
            )
          })}
          {celulas.length === 0 && <p className="text-xs text-text-muted">Nenhuma célula.</p>}
        </div>
      </Secao>
    </div>
  )
}
