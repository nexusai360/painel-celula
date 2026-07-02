import { useEffect, useState } from 'react'
import { Check, Heart, X } from 'lucide-react'
import { Avatar } from './ui/Avatar.jsx'
import { Input } from './ui/Input.jsx'
import { Button } from './ui/Button.jsx'
import {
  apiConjuge, apiConvidarConjuge, apiAceitarConjuge, apiRecusarConjuge, apiRemoverConjuge
} from '../lib/api.js'

/**
 * Seção de vínculo de cônjuge (duplo opt-in). Aparece no perfil quando o estado
 * civil é casado/união estável. Sem busca aberta: resolve só pelo e-mail exato.
 */
export function ConjugeSecao() {
  const [estado, setEstado] = useState(null) // { conjuge, recebidas, enviada }
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function carregar() {
    try { setEstado(await apiConjuge()) } catch { setErro('Não foi possível carregar o vínculo.') }
  }
  useEffect(() => { carregar() }, [])

  async function convidar(e) {
    e?.preventDefault()
    if (!email.trim()) return
    setOcupado(true); setErro(''); setMsg('')
    try {
      const r = await apiConvidarConjuge(email.trim())
      setEmail('')
      setMsg(r.vinculado ? 'Cônjuge vinculado!' : 'Convite enviado. Aguardando a confirmação da outra pessoa.')
      carregar()
    } catch (e2) { setErro(e2?.response?.data?.erro || 'Não foi possível enviar o convite.') }
    finally { setOcupado(false) }
  }
  async function aceitar(id) { setOcupado(true); try { await apiAceitarConjuge(id); carregar() } finally { setOcupado(false) } }
  async function recusar(id) { setOcupado(true); try { await apiRecusarConjuge(id); carregar() } finally { setOcupado(false) } }
  async function remover() { setOcupado(true); try { await apiRemoverConjuge(); carregar() } finally { setOcupado(false) } }

  return (
    <div className="w-full rounded-xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-text">
        <Heart className="h-4 w-4 text-brand" /> Cônjuge
      </div>

      {!estado ? (
        <p className="text-sm text-text-muted">Carregando…</p>
      ) : estado.conjuge ? (
        <div className="flex items-center gap-3">
          <Avatar src={estado.conjuge.avatar} nome={estado.conjuge.nome} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text">{estado.conjuge.nome}</p>
            <p className="truncate text-xs text-text-muted">{estado.conjuge.email}</p>
          </div>
          <button type="button" onClick={remover} disabled={ocupado}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:border-danger hover:text-danger disabled:opacity-50 cursor-pointer">
            Desvincular
          </button>
        </div>
      ) : (
        <>
          {/* Convites recebidos */}
          {estado.recebidas?.length > 0 && (
            <div className="mb-3 space-y-2">
              {estado.recebidas.map((r) => (
                <div key={r.id} className="flex items-center gap-2 rounded-lg border border-brand/30 bg-brand/5 p-2">
                  <Avatar src={r.solicitante?.avatar} nome={r.solicitante?.nome} size={32} />
                  <p className="min-w-0 flex-1 truncate text-sm text-text">
                    <span className="font-semibold">{r.solicitante?.nome}</span> quer vincular como cônjuge
                  </p>
                  <button type="button" onClick={() => recusar(r.id)} disabled={ocupado} aria-label="Recusar"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted hover:border-danger hover:text-danger cursor-pointer"><X className="h-4 w-4" /></button>
                  <button type="button" onClick={() => aceitar(r.id)} disabled={ocupado} aria-label="Aceitar"
                    className="brand-grad inline-flex h-8 items-center gap-1 rounded-lg bg-brand px-2.5 text-xs font-semibold text-on-brand cursor-pointer"><Check className="h-4 w-4" /> Aceitar</button>
                </div>
              ))}
            </div>
          )}

          {estado.enviada ? (
            <p className="text-sm text-text-muted">
              Convite enviado para <span className="font-medium text-text">{estado.enviada.alvo?.nome || estado.enviada.alvo?.email}</span>. Aguardando confirmação.
            </p>
          ) : (
            <form onSubmit={convidar} className="flex items-end gap-2">
              <div className="flex-1">
                <Input id="conjuge-email" label="E-mail do seu cônjuge" type="email" placeholder="conjuge@exemplo.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button type="submit" loading={ocupado} className="w-auto px-4">Convidar</Button>
            </form>
          )}
          <p className="mt-1.5 text-xs text-text-muted">A outra pessoa precisa confirmar o vínculo.</p>
        </>
      )}

      {erro && <p className="mt-2 text-xs text-danger" role="alert">{erro}</p>}
      {msg && <p className="mt-2 text-xs text-success">{msg}</p>}
    </div>
  )
}
