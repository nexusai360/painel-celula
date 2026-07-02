import { useEffect, useState } from 'react'
import { apiListarMembros, apiAtualizarMembro } from '../lib/api.js'
import { agruparMembros } from '../lib/membros.js'
import { MembroCard } from './MembroCard.jsx'
import { MembroEditModal } from './MembroEditModal.jsx'
import { ConfirmDialog } from './ui/ConfirmDialog.jsx'

export function MembrosPanel({ celulaId, liderId, podeGerenciar }) {
  const [membros, setMembros] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [aEditar, setAEditar] = useState(null)
  const [aInativar, setAInativar] = useState(null)
  const [inativando, setInativando] = useState(false)

  async function carregar() {
    try {
      setMembros(await apiListarMembros(celulaId))
      setErro(null)
    } catch {
      setErro('Não foi possível carregar os membros.')
    } finally {
      setCarregando(false)
    }
  }
  useEffect(() => { carregar() /* eslint-disable-next-line */ }, [celulaId])

  function aplicar(usuario) {
    setMembros((lista) => lista.map((m) => (m.id === usuario.id ? { ...m, ...usuario } : m)))
  }

  async function confirmarInativar() {
    setInativando(true)
    try {
      const upd = await apiAtualizarMembro(aInativar.id, { ativo: false })
      aplicar(upd); setAInativar(null); setErro(null)
    } catch (e) {
      setErro(e?.response?.data?.erro || 'Não foi possível inativar. Tente novamente.')
      setAInativar(null)
    } finally { setInativando(false) }
  }

  async function ativar(membro) {
    try {
      const upd = await apiAtualizarMembro(membro.id, { ativo: true })
      aplicar(upd); setErro(null)
    } catch {
      setErro('Não foi possível ativar. Tente novamente.')
    }
  }

  if (carregando) return <p className="text-sm text-text-muted">Carregando…</p>

  const { ativos, inativos } = agruparMembros(membros)
  const ordenada = [...ativos, ...inativos]

  return (
    <div>
      {erro && <p role="alert" className="mb-3 text-sm text-danger">{erro}</p>}
      {ordenada.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-text-muted">Nenhum membro nesta célula.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {ordenada.map((m) => (
            <MembroCard
              key={m.id} membro={m}
              ehLider={m.id === liderId}
              podeGerenciar={podeGerenciar}
              onEditar={setAEditar}
              onInativar={setAInativar}
              onAtivar={ativar}
            />
          ))}
        </div>
      )}

      <MembroEditModal
        membro={aEditar} open={!!aEditar}
        onSalvo={(u) => { aplicar(u); setAEditar(null) }}
        onCancelar={() => setAEditar(null)}
      />

      <ConfirmDialog
        open={!!aInativar}
        titulo="Inativar membro"
        mensagem={aInativar ? `Inativar ${aInativar.nome}? A pessoa deixa de acessar e some das listas; você pode reativá-la depois.` : ''}
        confirmarLabel="Inativar"
        carregando={inativando}
        onConfirmar={confirmarInativar}
        onCancelar={() => setAInativar(null)}
      />
    </div>
  )
}
