import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Avatar } from './ui/Avatar.jsx'
import { Button } from './ui/Button.jsx'
import { formatarDataCurta } from '../lib/datas.js'

export function TestemunhoItem({ testemunho, onConcluir }) {
  const concluido = testemunho.status === 'CONCLUIDO'
  return (
    <motion.div
      layout
      className={`flex items-center gap-3 rounded-2xl border border-border bg-card p-4 ${concluido ? 'opacity-60' : ''}`}
    >
      <Avatar src={testemunho.autor.avatar} nome={testemunho.autor.nome} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-text">{testemunho.autor.nome}</p>
        <p className="truncate text-sm text-text-muted">{testemunho.titulo}</p>
        <p className="text-xs text-text-muted">{formatarDataCurta(testemunho.criadoEm)}</p>
      </div>
      {concluido ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-3 py-1.5 text-xs font-medium text-success">
          <Check className="h-4 w-4" /> Realizado
        </span>
      ) : (
        <Button className="!w-auto px-4" onClick={() => onConcluir(testemunho)}>Realizado</Button>
      )}
    </motion.div>
  )
}
