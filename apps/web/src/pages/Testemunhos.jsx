import { useEffect, useState } from 'react'
import { apiListarTestemunhos, apiConcluirTestemunho } from '../lib/api.js'
import { agruparTestemunhos } from '../lib/testemunhos.js'
import { TestemunhoItem } from '../components/TestemunhoItem.jsx'

export default function Testemunhos() {
  const [lista, setLista] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    async function carregar() {
      try {
        setLista(await apiListarTestemunhos())
        setErro(null)
      } catch {
        setErro('Não foi possível carregar os testemunhos.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  async function concluir(testemunho) {
    try {
      const atualizado = await apiConcluirTestemunho(testemunho.id)
      setLista((atual) => atual.map((t) => (t.id === testemunho.id ? { ...t, ...atualizado } : t)))
      setErro(null)
    } catch {
      setErro('Não foi possível concluir a ação. Tente novamente.')
    }
  }

  const { pendentes, concluidos } = agruparTestemunhos(lista)
  const ordenada = [...pendentes, ...concluidos]

  return (
    <div>
      <h1 className="mb-5 text-xl font-semibold text-text">Testemunhos</h1>

      {erro && <p role="alert" className="mb-3 text-sm text-danger">{erro}</p>}

      {carregando ? (
        <p className="text-sm text-text-muted">Carregando…</p>
      ) : lista.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-text-muted">Nenhum testemunho ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {ordenada.map((t) => (
            <TestemunhoItem key={t.id} testemunho={t} onConcluir={concluir} />
          ))}
        </div>
      )}
    </div>
  )
}
