import { describe, it, expect, vi, afterEach } from 'vitest'
import { useRef, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useOverlayDismiss } from '../../hooks/useOverlayDismiss.js'
import { Modal } from './Modal.jsx'
import { Popover } from './Popover.jsx'

afterEach(() => { document.body.style.overflow = '' })

function HookFixture({ open, onClose }) {
  const ref = useRef(null)
  useOverlayDismiss(open, onClose, ref)
  return <div ref={ref} tabIndex={-1}><button>dentro</button></div>
}

describe('useOverlayDismiss', () => {
  it('trava scroll quando aberto e Esc fecha', async () => {
    const onClose = vi.fn()
    render(<HookFixture open onClose={onClose} />)
    expect(document.body.style.overflow).toBe('hidden')
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})

describe('Modal', () => {
  it('renderiza título e fecha no X', async () => {
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} titulo="Nova célula"><p>corpo</p></Modal>)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Nova célula')).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Fechar'))
    expect(onClose).toHaveBeenCalled()
  })
})

function PopoverFixture() {
  const [open, setOpen] = useState(false)
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger={<button onClick={() => setOpen((o) => !o)}>abrir</button>}
    >
      <span>conteúdo popover</span>
    </Popover>
  )
}

describe('Popover', () => {
  it('abre no trigger e fecha no Esc', async () => {
    render(<PopoverFixture />)
    await userEvent.click(screen.getByText('abrir'))
    expect(screen.getByText('conteúdo popover')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByText('conteúdo popover')).not.toBeInTheDocument()
  })
})
