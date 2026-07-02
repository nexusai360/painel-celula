import { useEffect, useState } from 'react'
import { Megaphone, Send, Trash2, Clock } from 'lucide-react'
import { Button } from '../../components/ui/Button.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs.jsx'
import { DateTimePicker } from '../../components/ui/DateTimePicker.jsx'
import { SeletorPublico, ALVO_TODOS } from '../../components/SeletorPublico.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import {
  apiBannersAdmin, apiCriarBanner, apiExcluirBanner, apiAtualizarBanner, apiEnviarNotificacao,
} from '../../lib/api.js'

function fmt(iso) {
  try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

function BannerTab() {
  const toast = useToast()
  const [lista, setLista] = useState([])
  const [mensagem, setMensagem] = useState('')
  const [expiraEm, setExpiraEm] = useState('')
  const [alvo, setAlvo] = useState(ALVO_TODOS)
  const [salvando, setSalvando] = useState(false)

  async function carregar() { try { setLista(await apiBannersAdmin()) } catch { setLista([]) } }
  useEffect(() => { carregar() }, [])

  async function criar() {
    setSalvando(true)
    try {
      await apiCriarBanner({ mensagem, expiraEm, ...alvo })
      setMensagem(''); setExpiraEm(''); setAlvo(ALVO_TODOS)
      await carregar()
      toast.sucesso('Banner publicado.')
    } catch (e) { toast.erro(e?.response?.data?.erro || 'Não foi possível publicar.') }
    finally { setSalvando(false) }
  }
  async function excluir(id) {
    try { await apiExcluirBanner(id); setLista((l) => l.filter((b) => b.id !== id)) }
    catch { toast.erro('Não foi possível excluir.') }
  }
  async function alternar(b) {
    try { const atual = await apiAtualizarBanner(b.id, { ativo: !b.ativo }); setLista((l) => l.map((x) => (x.id === b.id ? atual : x))) }
    catch { toast.erro('Não foi possível alterar.') }
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-text-muted">Faixa fixa no topo, para o público escolhido. <span className="font-medium text-text">Só administradores</span> publicam banners.</p>

      <div className="rounded-2xl border border-border bg-card p-5 ring-1 ring-border">
        <label htmlFor="banner-msg" className="mb-1.5 block text-sm font-medium text-text">Mensagem</label>
        <textarea id="banner-msg" rows={2} value={mensagem} onChange={(e) => setMensagem(e.target.value)}
          placeholder="Ex.: Neste sábado teremos culto especial às 19h."
          className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
        <div className="mt-3 max-w-xs">
          <DateTimePicker label="Expira em" value={expiraEm} onChange={setExpiraEm} required />
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <SeletorPublico value={alvo} onChange={setAlvo} mostrarNiveis />
        </div>
        <div className="mt-5">
          <Button onClick={criar} loading={salvando} disabled={!mensagem.trim() || !expiraEm} className="w-auto px-6">
            <Megaphone className="h-4 w-4" /> Publicar banner
          </Button>
        </div>
      </div>

      {lista.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Banners</p>
          {lista.map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <span className={`h-2 w-2 shrink-0 rounded-full ${b.ativo ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text">{b.mensagem}</p>
                <p className="text-[11px] text-text-muted"><Clock className="mr-1 inline h-3 w-3" />expira {fmt(b.expiraEm)}</p>
              </div>
              <button onClick={() => alternar(b)} className="rounded-lg border border-border px-2.5 py-1 text-xs text-text-muted hover:text-text cursor-pointer">
                {b.ativo ? 'Ocultar' : 'Exibir'}
              </button>
              <button onClick={() => excluir(b.id)} aria-label="Excluir banner" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted hover:text-danger cursor-pointer">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NotificacaoTab() {
  const toast = useToast()
  const [titulo, setTitulo] = useState('')
  const [corpo, setCorpo] = useState('')
  const [alvo, setAlvo] = useState(ALVO_TODOS)
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    setEnviando(true)
    try {
      await apiEnviarNotificacao({ titulo, corpo, ...alvo })
      setTitulo(''); setCorpo(''); setAlvo(ALVO_TODOS)
      toast.sucesso('Notificação enviada.')
    } catch (e) { toast.erro(e?.response?.data?.erro || 'Não foi possível enviar.') }
    finally { setEnviando(false) }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 ring-1 ring-border">
      <p className="mb-4 text-xs text-text-muted">Chega no sino do público escolhido. Líderes enviam para as próprias células; admins, para quem quiserem.</p>
      <div className="space-y-3">
        <Input id="notif-titulo" label="Título" placeholder="Ex.: Culto especial" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <div>
          <label htmlFor="notif-corpo" className="mb-1.5 block text-sm font-medium text-text">Mensagem</label>
          <textarea id="notif-corpo" rows={3} value={corpo} onChange={(e) => setCorpo(e.target.value)} placeholder="Escreva a notificação…"
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
        </div>
      </div>
      <div className="mt-4 border-t border-border pt-4">
        <SeletorPublico value={alvo} onChange={setAlvo} mostrarNiveis />
      </div>
      <div className="mt-4">
        <Button onClick={enviar} loading={enviando} disabled={!titulo.trim() || !corpo.trim()} className="w-auto px-6"><Send className="h-4 w-4" /> Enviar</Button>
      </div>
    </div>
  )
}

export default function AdminAvisos() {
  const [aba, setAba] = useState('banner')
  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand"><Megaphone className="h-5 w-5" /></span>
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Avisos</h1>
          <p className="text-sm text-text-muted">Banner fixo no topo ou notificação no sino, para o público que você escolher.</p>
        </div>
      </div>
      <Tabs value={aba} onValueChange={setAba} className="space-y-5">
        <TabsList aria-label="Avisos">
          <TabsTrigger value="banner">Banner do topo</TabsTrigger>
          <TabsTrigger value="notificacao">Notificação</TabsTrigger>
        </TabsList>
        <TabsContent value="banner"><BannerTab /></TabsContent>
        <TabsContent value="notificacao"><NotificacaoTab /></TabsContent>
      </Tabs>
    </div>
  )
}
