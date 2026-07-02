import { useEffect, useState } from 'react'
import { Megaphone } from 'lucide-react'
import { Checkbox } from '../../components/ui/Checkbox.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Skeleton } from '../../components/ui/Estados.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { apiBannerAdmin, apiSalvarBanner } from '../../lib/api.js'

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
    </div>
  )
}
