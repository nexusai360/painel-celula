import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoleBadge, StatusBadge } from './RoleBadge.jsx'
import { Checkbox } from './Checkbox.jsx'
import { EmptyState, ErrorState } from './Estados.jsx'
import { Users } from 'lucide-react'

describe('RoleBadge/StatusBadge', () => {
  it('renderiza papel e status com label', () => {
    render(<><RoleBadge papel="ADMIN" /><StatusBadge status="PENDENTE" /></>)
    expect(screen.getByText('Administrador')).toBeInTheDocument()
    expect(screen.getByText('Em aprovação')).toBeInTheDocument()
  })
})

describe('Checkbox', () => {
  it('associa label e alterna via clique', async () => {
    const onChange = vi.fn()
    render(<Checkbox id="cb" label="Sou casado(a)" checked={false} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText('Sou casado(a)'))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})

describe('Estados', () => {
  it('EmptyState mostra título e ação', () => {
    render(<EmptyState icon={Users} titulo="Nada aqui" subtitulo="crie algo" acao={<button>Criar</button>} />)
    expect(screen.getByText('Nada aqui')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar' })).toBeInTheDocument()
  })
  it('ErrorState chama onRetry', async () => {
    const onRetry = vi.fn()
    render(<ErrorState onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(onRetry).toHaveBeenCalled()
  })
})
