import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs.jsx'
import { ToastProvider, useToast } from './Toast.jsx'

function TabsFixture() {
  const [v, setV] = useState('a')
  return (
    <Tabs value={v} onValueChange={setV}>
      <TabsList aria-label="abas">
        <TabsTrigger value="a">Pendentes</TabsTrigger>
        <TabsTrigger value="b">Todos</TabsTrigger>
      </TabsList>
      <TabsContent value="a">Painel A</TabsContent>
      <TabsContent value="b">Painel B</TabsContent>
    </Tabs>
  )
}

describe('Tabs', () => {
  it('troca de painel ao clicar e marca aria-selected', async () => {
    render(<TabsFixture />)
    expect(screen.getByText('Painel A')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Todos' }))
    expect(screen.getByText('Painel B')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Todos' })).toHaveAttribute('aria-selected', 'true')
  })
})

function ToastFixture() {
  const toast = useToast()
  return <button onClick={() => toast.sucesso('Salvo!')}>disparar</button>
}

describe('Toast', () => {
  it('mostra mensagem via useToast', async () => {
    render(<ToastProvider><ToastFixture /></ToastProvider>)
    await userEvent.click(screen.getByText('disparar'))
    expect(screen.getByRole('status')).toHaveTextContent('Salvo!')
  })
})
