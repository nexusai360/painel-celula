import { useEffect, useState } from 'react'
import { Megaphone, Send } from 'lucide-react'
import { Checkbox } from '../../components/ui/Checkbox.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { Skeleton } from '../../components/ui/Estados.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { ehAdmin } from '../../lib/papeis.js'
import { apiBannerAdmin, apiSalvarBanner, apiEnviarNotificacao } from '../../lib/api.js'

function EnviarNotificacao() {
  const { usuario } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ titulo: '', corpo: '', escopo: '' })
  const [enviando, setEnviando] = useState(false)

  const opcoes = []
  if (ehAdmin(usuario?.papel)) opcoes.push({ v: 'GLOBAL', label: 'Todos (aviso global)' })
  if (usuario?.celulaId) opcoes.push({ v: 'CELULA', label: 'Minha célula' })

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    try {
      await apiEnviarNotificacao({ titulo: form.titulo, corpo: form.corpo, escopo: form.escopo || opcoes[0]?.v })
      setForm({ titulo: '', corpo: '', escopo: '' })
      toast.sucesso('Notificação enviada.')
    } catch (e2) {
      toast.erro(e2?.response?.data?.erro || 'Não foi possível enviar.')
    } finally {
      setEnviando(false)
    }
  }

  if (opcoes.length === 0) return null

  return (
    <form onSubmit={enviar} className="mt-5 rounded-2xl border border-border bg-card p-5 ring-1 ring-border">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand"><Send className="h-4 w-4" /></span>
        <div>
          <h2 className="font-semibold text-text">Enviar notificação</h2>
          <p className="text-xs text-text-muted">Chega no sino de quem recebe (não é o banner do topo).</p>
        </div>
      </div>
      {opcoes.length > 1 && (
        <div className="mb-3">
          <label className="mb-1.5 block text-sm font-medium text-text">Para</label>
          <select value={form.escopo || opcoes[0].v} onChange={(e) => setForm((f) => ({ ...f, escopo: e.target.value }))}
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            {opcoes.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
          </select>
        </div>
      )}
      <div className="space-y-3">
        <Input id="notif-titulo" label="Título" placeholder="Ex.: Culto especial" value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} required />
        <div>
          <label htmlFor="notif-corpo" className="mb-1.5 block text-sm font-medium text-text">Mensagem</label>
          <textarea id="notif-corpo" rows={3} value={form.corpo} onChange={(e) => setForm((f) => ({ ...f, corpo: e.target.value }))} required
            placeholder="Escreva a notificação…"
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
        </div>
      </div>
      <div className="mt-4">
        <Button type="submit" loading={enviando} className="w-auto px-6"><Send className="h-4 w-4" /> Enviar</Button>
      </div>
    </form>
  )
}

export default function AdminAvisos() {
  const toast = useToast()
  const [rascunho, setRascunho] = useState(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    apiBannerAdmin()
      .then((b) => setRascunho({ mensagem: b?.mensagem || '', ativo: !!b?.ativo }))
      .catch(() => setRascunho({ mensagem: '', ativo: false }))
  }, [])

  async function salvar() {
    setSalvando(true)
    try {
      await apiSalvarBanner(rascunho.mensagem, rascunho.ativo)
      toast.sucesso(rascunho.ativo ? 'Aviso publicado.' : 'Aviso salvo (oculto).')
    } catch (e) {
      toast.erro(e?.response?.data?.erro || 'Não foi possível salvar o aviso.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Megaphone className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Avisos</h1>
          <p className="text-sm text-text-muted">Publique um aviso no topo da plataforma para todos.</p>
        </div>
      </div>

      {!rascunho ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5 ring-1 ring-border">
          <label htmlFor="aviso" className="mb-1.5 block text-sm font-medium text-text">
            Mensagem
          </label>
          <textarea
            id="aviso"
            value={rascunho.mensagem}
            onChange={(e) => setRascunho((r) => ({ ...r, mensagem: e.target.value }))}
            rows={3}
            placeholder="Ex.: Neste sábado teremos culto especial às 19h."
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-brand-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />

          <div className="mt-3">
            <Checkbox
              id="aviso-ativo"
              checked={rascunho.ativo}
              onChange={(v) => setRascunho((r) => ({ ...r, ativo: v }))}
              label="Exibir para todos"
              descricao="Quando desligado, o aviso fica salvo mas não aparece."
            />
          </div>

          {/* Preview */}
          {rascunho.mensagem && (
            <div className="mt-5">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">Pré-visualização</p>
              <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ${rascunho.ativo ? 'border-brand/20 bg-brand/10 text-text' : 'border-border bg-surface text-text-muted'}`}>
                <Megaphone className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                <p className="min-w-0 flex-1">{rascunho.mensagem}</p>
              </div>
            </div>
          )}

          <div className="mt-5">
            <Button onClick={salvar} loading={salvando} className="w-auto px-6">
              Salvar
            </Button>
          </div>
        </div>
      )}

      <EnviarNotificacao />
    </div>
  )
}
