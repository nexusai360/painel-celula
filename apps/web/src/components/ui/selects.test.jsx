import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Combobox } from './Combobox.jsx'
import { RoleSelect } from './RoleSelect.jsx'
import { ContextSwitcher } from './ContextSwitcher.jsx'

describe('Combobox', () => {
  it('filtra e escolhe opção', async () => {
    const onChange = vi.fn()
    render(<Combobox value="" onChange={onChange} options={['Goiânia', 'Anápolis']} aria-label="Cidade" />)
    const input = screen.getByRole('combobox')
    await userEvent.type(input, 'anap')
    await userEvent.click(screen.getByRole('option', { name: /Anápolis/ }))
    expect(onChange).toHaveBeenCalledWith('Anápolis')
  })
  it('allowCustom aceita valor livre no Enter', async () => {
    const onChange = vi.fn()
    render(<Combobox value="" onChange={onChange} options={['Goiânia']} allowCustom aria-label="Cidade" />)
    const input = screen.getByRole('combobox')
    await userEvent.type(input, 'Cidadezinha{Enter}')
    expect(onChange).toHaveBeenCalledWith('Cidadezinha')
  })
})

describe('RoleSelect', () => {
  it('readOnly/1 opção vira chip estático (sem combobox)', () => {
    render(<RoleSelect value="ADMIN" opcoes={['ADMIN']} />)
    expect(screen.getByText('Administrador')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Alterar nível de acesso' })).not.toBeInTheDocument()
  })
  it('abre lista e troca papel', async () => {
    const onChange = vi.fn()
    render(<RoleSelect value="MEMBRO" opcoes={['MEMBRO', 'LIDER', 'ADMIN']} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Alterar nível de acesso' }))
    await userEvent.click(screen.getByRole('option', { name: /Líder/ }))
    expect(onChange).toHaveBeenCalledWith('LIDER')
  })
})

describe('ContextSwitcher', () => {
  it('não renderiza sem podeAdmin', () => {
    const { container } = render(<ContextSwitcher contexto="admin" podeAdmin={false} temCelula />)
    expect(container).toBeEmptyDOMElement()
  })
  it('desabilita Minha célula sem célula', () => {
    render(<ContextSwitcher contexto="admin" podeAdmin temCelula={false} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /Minha célula/ })).toBeDisabled()
  })
})
