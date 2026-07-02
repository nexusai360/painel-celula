import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { apiListarPedidos, apiExcluirPedido, apiTestemunhar } from '../lib/api.js'
import { agruparPedidos } from '../lib/pedidos.js'
import { PedidoCard } from '../components/PedidoCard.jsx'
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx'
import { Button } from '../components/ui/Button.jsx'

export default function MeusPedidos() {
  const navigate = useNavigate()
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [aExcluir, setAExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState(null)

  async function carregar() {
    try {
      setPedidos(await apiListarPedidos())
      setErro(null)
    } catch {
      setErro('Não foi possível carregar seus pedidos.')
    } finally {
      setCarregando(false)
    }
  }
  useEffect(() => { carregar() }, [])

  async function confirmarExclusao() {
    setExcluindo(true)
    try {
      await apiExcluirPedido(aExcluir.id)
      setPedidos((lista) => lista.filter((p) => p.id !== aExcluir.id))
      setAExcluir(null)
      setErro(null)
    } catch {
      setErro('Não foi possível concluir a ação. Tente novamente.')
      setAExcluir(null)
    } finally { setExcluindo(false) }
  }

  async function testemunhar(pedido) {
    try {
      await apiTestemunhar(pedido.id)
      await carregar()
    } catch {
      setErro('Não foi possível concluir a ação. Tente novamente.')
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">Meus Pedidos</h1>
        <div className="w-auto">
          <Button className="!w-auto px-4" onClick={() => navigate('/app/pedidos/novo')}>
            <Plus className="h-4 w-4" /> Novo pedido
          </Button>
        </div>
      </div>

      {erro && <p role="alert" className="mb-3 text-sm text-danger">{erro}</p>}

      {carregando ? (
        <p className="text-sm text-text-muted">Carregando…</p>
      ) : pedidos.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-text-muted">Você ainda não tem pedidos de oração.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(() => {
            const { ativos, atendidos } = agruparPedidos(pedidos)
            return [...ativos, ...atendidos].map((p) => (
              <PedidoCard
                key={p.id} pedido={p}
                onEditar={(ped) => navigate(`/app/pedidos/${ped.id}/editar`)}
                onExcluir={(ped) => setAExcluir(ped)}
                onTestemunhar={testemunhar}
              />
            ))
          })()}
        </div>
      )}

      <ConfirmDialog
        open={!!aExcluir}
        titulo="Excluir pedido"
        mensagem="Excluir este pedido de oração? Não dá para desfazer."
        confirmarLabel="Excluir"
        carregando={excluindo}
        onConfirmar={confirmarExclusao}
        onCancelar={() => setAExcluir(null)}
      />
    </div>
  )
}
